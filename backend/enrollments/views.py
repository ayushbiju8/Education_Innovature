from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Enrollment, LessonProgress
from .serializers import EnrollmentSerializer, LessonProgressSerializer
from courses.models import Course, Lesson
from accounts.permissions import IsStudent
from certificates.models import Certificate
import uuid

class EnrollAPIView(APIView):
    """
    POST /api/courses/{id}/enroll/
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        
        serializer = EnrollmentSerializer(data={'course': course.id}, context={'request': request})
        if serializer.is_valid():
            serializer.save(student=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MyCoursesAPIView(generics.ListAPIView):
    """
    GET /api/my-courses/
    """
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return Enrollment.objects.filter(student=self.request.user)

class EnrollmentDeleteAPIView(generics.DestroyAPIView):
    """
    DELETE /api/enrollments/{id}/
    """
    queryset = Enrollment.objects.all()
    permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') == 'admin' or user.is_staff:
            return Enrollment.objects.all()
        return Enrollment.objects.filter(student=user)

class MarkLessonCompleteAPIView(APIView):
    """
    POST /api/lessons/{id}/complete/
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request, pk):
        lesson = get_object_or_404(Lesson, pk=pk)
        
        serializer = LessonProgressSerializer(data={'is_completed': True}, context={'request': request, 'lesson': lesson})
        if serializer.is_valid():
            enrollment = Enrollment.objects.get(student=request.user, course=lesson.module.course)
            serializer.save(enrollment=enrollment, lesson=lesson, completed_at=timezone.now())
            
            # Check for 100% completion
            total_lessons = Lesson.objects.filter(module__course=lesson.module.course).count()
            completed_lessons = LessonProgress.objects.filter(enrollment=enrollment, is_completed=True).count()
            if total_lessons > 0 and completed_lessons == total_lessons:
                if not hasattr(enrollment, 'certificate'):
                    Certificate.objects.create(
                        enrollment=enrollment,
                        certificate_code=str(uuid.uuid4())
                    )
                    
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MyProgressAPIView(APIView):
    """
    GET /api/courses/{id}/progress/
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def get(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        
        enrollment = Enrollment.objects.filter(student=request.user, course=course).first()
        if not enrollment:
            return Response({"detail": "Not enrolled in this course."}, status=status.HTTP_403_FORBIDDEN)
            
        total_lessons = Lesson.objects.filter(module__course=course).count()
        completed_lessons_qs = LessonProgress.objects.filter(enrollment=enrollment, is_completed=True)
        completed_lessons = completed_lessons_qs.count()
        completed_lesson_ids = list(completed_lessons_qs.values_list('lesson_id', flat=True))
        
        progress = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        
        cert_data = None
        if hasattr(enrollment, 'certificate'):
            cert_data = {
                "certificate_code": enrollment.certificate.certificate_code,
                "issued_at": enrollment.certificate.issued_at
            }
        
        return Response({
            "course": course.title,
            "completed_lessons": completed_lessons,
            "completed_lesson_ids": completed_lesson_ids,
            "total_lessons": total_lessons,
            "progress": round(progress, 2),
            "certificate": cert_data
        })
