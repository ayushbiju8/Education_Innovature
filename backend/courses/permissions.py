from rest_framework.permissions import BasePermission, SAFE_METHODS
from accounts.models import UserRole

class IsAdminOrReadOnly(BasePermission):
    """
    Allows read-only access to anyone, but write access only to admins.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == UserRole.ADMIN or request.user.is_staff or request.user.is_superuser)
        )

class IsMentorOrAdmin(BasePermission):
    """
    Allows access to mentors and admins. Used for creating courses.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role in [UserRole.MENTOR, UserRole.ADMIN] or request.user.is_staff or request.user.is_superuser)
        )

class IsCourseOwnerOrAdmin(BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an attribute `mentor` (Course), `course` (Module),
    `module` (Lesson), or `lesson` (Attachment).
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in SAFE_METHODS:
            return True

        is_admin = bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == UserRole.ADMIN or request.user.is_staff or request.user.is_superuser)
        )
        if is_admin:
            return True

        # Check ownership depending on the model
        if hasattr(obj, 'mentor'):  # Course
            return obj.mentor == request.user
        elif hasattr(obj, 'course'): # Module
            return obj.course.mentor == request.user
        elif hasattr(obj, 'module'): # Lesson
            return obj.module.course.mentor == request.user
        elif hasattr(obj, 'lesson'): # Attachment
            return obj.lesson.module.course.mentor == request.user
            
        return False
