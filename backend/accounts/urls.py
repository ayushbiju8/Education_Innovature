from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterAPIView,
    LogoutAPIView,
    ProfileAPIView,
    MentorApplyAPIView,
    AdminMentorApplicationListView,
    AdminMentorApplicationDecideView
)

urlpatterns = [
    path('register/', RegisterAPIView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutAPIView.as_view(), name='auth_logout'),
    path('profile/', ProfileAPIView.as_view(), name='auth_profile'),
    path('mentor-apply/', MentorApplyAPIView.as_view(), name='mentor_apply'),
    path('admin/mentor-applications/', AdminMentorApplicationListView.as_view(), name='admin_mentor_applications_list'),
    path('admin/mentor-applications/<int:pk>/decide/', AdminMentorApplicationDecideView.as_view(), name='admin_mentor_application_decide'),
]
