from django.contrib import admin
from .models import Review, ReportAbuse

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'rating', 'created_at')
    list_filter = ('rating', 'course')
    search_fields = ('student__username', 'course__title', 'comment')

@admin.register(ReportAbuse)
class ReportAbuseAdmin(admin.ModelAdmin):
    list_display = ('reporter', 'review', 'course', 'created_at')
    list_filter = ('course',)
    search_fields = ('reporter__username', 'reason')

