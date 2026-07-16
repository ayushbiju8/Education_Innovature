from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from courses.models import Course

class Review(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.username}'s review on {self.course.title} ({self.rating}*)"

class ReportAbuse(models.Model):
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reported_abuses')
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='abuse_reports', null=True, blank=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='abuse_reports', null=True, blank=True)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Reported Abuses"

    def __str__(self):
        return f"Report by {self.reporter.username} at {self.created_at}"

