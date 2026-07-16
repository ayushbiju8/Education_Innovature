from django.contrib import admin
from .models import Enrollment, LessonProgress

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'enrolled_at', 'is_active')
    list_filter = ('is_active', 'course')
    search_fields = ('student__username', 'student__email', 'course__title')

@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'lesson', 'is_completed', 'completed_at')
    list_filter = ('is_completed', 'lesson__module__course')
    search_fields = ('enrollment__student__username', 'lesson__title')

