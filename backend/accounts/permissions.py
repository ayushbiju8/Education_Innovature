from rest_framework.permissions import BasePermission
from .models import UserRole

class IsStudent(BasePermission):
    """
    Allows access only to users with the 'student' role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.STUDENT)

class IsMentor(BasePermission):
    """
    Allows access only to users with the 'mentor' role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.MENTOR)

class IsAdmin(BasePermission):
    """
    Allows access only to users with the 'admin' role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == UserRole.ADMIN or request.user.is_staff or request.user.is_superuser)
        )
