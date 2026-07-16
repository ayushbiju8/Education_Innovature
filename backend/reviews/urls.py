from django.urls import path
from .views import CourseReviewAPIView, ReviewDetailAPIView

urlpatterns = [
    path('courses/<int:pk>/reviews/', CourseReviewAPIView.as_view(), name='course-reviews'),
    path('reviews/<int:pk>/', ReviewDetailAPIView.as_view(), name='review-detail'),
]
