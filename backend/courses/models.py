from django.db import models
from django.conf import settings
import os
import uuid

def attachment_upload_path(instance, filename):
    name, ext = os.path.splitext(filename)
    # Truncate base name to 50 chars, replace spaces with underscores
    short_name = name[:50].replace(' ', '_')
    unique_suffix = uuid.uuid4().hex[:8]
    return f"attachments/{short_name}_{unique_suffix}{ext}"

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Course(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='courses')
    mentor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_courses')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    courses = models.ManyToManyField(Course, related_name='tags')

    def __str__(self):
        return self.name

class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Lesson(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    video_url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=0)
    duration = models.PositiveIntegerField(help_text="Duration in minutes", default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.module.title} - {self.title}"

class Attachment(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='attachments')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to=attachment_upload_path, max_length=500)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

