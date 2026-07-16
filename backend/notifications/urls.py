from django.urls import path
from .views import NotificationListAPIView, NotificationReadAPIView

urlpatterns = [
    path('notifications/', NotificationListAPIView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', NotificationReadAPIView.as_view(), name='notification-read'),
]
