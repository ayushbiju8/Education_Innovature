from django.contrib import admin
from .models import Room, Question, Answer

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'created_at')
    search_fields = ('name', 'course__title')

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('title', 'room', 'user', 'created_at')
    list_filter = ('room__course', 'room')
    search_fields = ('title', 'content', 'user__username')

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('question', 'user', 'created_at')
    list_filter = ('question__room__course',)
    search_fields = ('content', 'user__username')

