from django.urls import path
from .consumers import CourseChatConsumer

websocket_urlpatterns = [
    path('ws/chat/course/<int:course_id>/', CourseChatConsumer.as_asgi()),
]
