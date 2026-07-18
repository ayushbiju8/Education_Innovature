from django.urls import path
from .views import CourseChatHistoryAPIView, PostQuestionAPIView, PostAnswerAPIView

urlpatterns = [
    path('courses/<int:course_id>/chat-history/', CourseChatHistoryAPIView.as_view(), name='course-chat-history'),
    path('courses/<int:course_id>/chat/question/', PostQuestionAPIView.as_view(), name='post-question'),
    path('courses/<int:course_id>/chat/question/<int:question_id>/answer/', PostAnswerAPIView.as_view(), name='post-answer'),
]
