from django.urls import path
from .views import (
    EnrollAPIView,
    MyCoursesAPIView,
    EnrollmentDeleteAPIView,
    MarkLessonCompleteAPIView,
    MyProgressAPIView
)

urlpatterns = [
    path('courses/<int:pk>/enroll/', EnrollAPIView.as_view(), name='enroll'),
    path('my-courses/', MyCoursesAPIView.as_view(), name='my-courses'),
    path('enrollments/<int:pk>/', EnrollmentDeleteAPIView.as_view(), name='enrollment-delete'),
    path('lessons/<int:pk>/complete/', MarkLessonCompleteAPIView.as_view(), name='lesson-complete'),
    path('courses/<int:pk>/progress/', MyProgressAPIView.as_view(), name='course-progress'),
]
