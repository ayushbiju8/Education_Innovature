import os
from rest_framework import serializers
from .models import Category, Course, Tag, Module, Lesson, Attachment

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = '__all__'
        read_only_fields = ('lesson',)
        
    def validate_file(self, value):
        allowed_extensions = ['.mp4', '.pdf', '.doc', '.docx', '.zip', '.png', '.jpg', '.jpeg', '.txt']
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in allowed_extensions:
            raise serializers.ValidationError(f"Unsupported file extension. Allowed extensions are: {', '.join(allowed_extensions)}")
            
        max_size = 50 * 1024 * 1024 # 50 MB
        if value.size > max_size:
            raise serializers.ValidationError(f"File size must be under {max_size / (1024 * 1024)} MB.")
            
        return value

class LessonSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Lesson
        fields = '__all__'
        read_only_fields = ('module',)

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Lesson content cannot be empty.")
        return value
        
    def validate(self, data):
        module = self.context.get('module') or getattr(self.instance, 'module', None)
        order = data.get('order', getattr(self.instance, 'order', None))
        
        if module is not None and order is not None:
            qs = Lesson.objects.filter(module=module, order=order)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"order": "This order number already exists in this module."})
        return data

class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = '__all__'
        read_only_fields = ('course',)
        
    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Module title cannot be empty.")
        return value

    def validate(self, data):
        course = self.context.get('course') or getattr(self.instance, 'course', None)
        order = data.get('order', getattr(self.instance, 'order', None))
        
        if course is not None and order is not None:
            qs = Module.objects.filter(course=course, order=order)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"order": "This order number already exists in this course."})
        return data

class CourseListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    mentor_name = serializers.CharField(source='mentor.get_full_name', read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'slug', 'description', 'category', 'category_name', 'mentor', 'mentor_name', 'price', 'is_published', 'created_at', 'updated_at']
        read_only_fields = ('mentor', 'created_at', 'updated_at')

class CourseSerializer(serializers.ModelSerializer):
    modules = ModuleSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = '__all__'
        read_only_fields = ('mentor', 'created_at', 'updated_at')
