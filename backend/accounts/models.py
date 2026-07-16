from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class UserRole(models.TextChoices):
    STUDENT = 'student', 'Student'
    MENTOR = 'mentor', 'Mentor'
    ADMIN = 'admin', 'Admin'

class User(AbstractUser):
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.STUDENT
    )
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = UserRole.ADMIN
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class MentorApplication(models.Model):
    class ApplicationStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mentor_applications')
    bio = models.TextField()
    status = models.CharField(max_length=15, choices=ApplicationStatus.choices, default=ApplicationStatus.PENDING)
    applied_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.status == self.ApplicationStatus.APPROVED:
            self.user.role = UserRole.MENTOR
            self.user.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Mentor Application by {self.user.username} ({self.status})"


