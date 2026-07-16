from django.urls import path
from .views import CourseChatHistoryAPIView

urlpatterns = [
    path('courses/<int:course_id>/chat-history/', CourseChatHistoryAPIView.as_view(), name='course-chat-history'),
]
