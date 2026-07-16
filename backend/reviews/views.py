from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, BasePermission, SAFE_METHODS
from django.shortcuts import get_object_or_404
from .models import Review
from .serializers import ReviewSerializer
from courses.models import Course
from accounts.models import UserRole

class IsReviewOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
            
        if getattr(request.user, 'role', '') == UserRole.ADMIN or request.user.is_staff:
            return True
            
        return obj.student == request.user

class CourseReviewAPIView(APIView):
    """
    GET /api/courses/{id}/reviews/
    POST /api/courses/{id}/reviews/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        reviews = Review.objects.filter(course=course).order_by('-created_at')
        serializer = ReviewSerializer(reviews, many=True)
        return Response(serializer.data)

    def post(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        serializer = ReviewSerializer(data=request.data, context={'request': request, 'course': course})
        
        if serializer.is_valid():
            serializer.save(student=request.user, course=course)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ReviewDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    PUT /api/reviews/{id}/
    DELETE /api/reviews/{id}/
    """
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated, IsReviewOwnerOrAdmin]
