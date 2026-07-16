from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from courses.models import Course
from enrollments.models import Enrollment
from .models import Room, Question
from .serializers import QuestionSerializer

class CourseChatHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        
        # Check permissions: Admin, Course Mentor, or Enrolled Student
        is_authorized = False
        if request.user.is_superuser or getattr(request.user, 'role', '') == 'admin':
            is_authorized = True
        elif getattr(request.user, 'role', '') == 'mentor' and course.mentor == request.user:
            is_authorized = True
        elif Enrollment.objects.filter(student=request.user, course=course).exists():
            is_authorized = True
            
        if not is_authorized:
            return Response({"detail": "Not authorized to access this discussion room."}, status=status.HTTP_403_FORBIDDEN)
            
        # Ensure room exists
        room, _ = Room.objects.get_or_create(course=course, defaults={'name': f"chat_room_{course_id}"})
        
        # Fetch questions
        questions = Question.objects.filter(room=room).order_by('created_at')
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)
