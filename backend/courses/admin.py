from django.contrib import admin
from .models import Category, Course, Tag, Module, Lesson, Attachment

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'category', 'mentor', 'price', 'is_published', 'created_at')
    list_filter = ('is_published', 'category', 'mentor')
    search_fields = ('title', 'description')
    prepopulated_fields = {'slug': ('title',)}

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'order')
    list_filter = ('course',)
    ordering = ('course', 'order')

@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ('title', 'module', 'order', 'duration')
    list_filter = ('module__course', 'module')
    ordering = ('module', 'order')

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'lesson', 'uploaded_at')
    list_filter = ('lesson__module__course',)

