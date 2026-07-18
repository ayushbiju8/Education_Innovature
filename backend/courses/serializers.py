import os
from rest_framework import serializers
from .models import Category, Course, Tag, Module, Lesson, Attachment, Quiz, QuizQuestion, QuizChoice, QuizAttempt

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

class QuizChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizChoice
        fields = ['id', 'text', 'is_correct']

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Security: Strip is_correct if user is a student
        request = self.context.get('request')
        if request and not (request.user.is_superuser or getattr(request.user, 'role', '') in ['admin', 'mentor']):
            rep.pop('is_correct', None)
        return rep

class QuizQuestionSerializer(serializers.ModelSerializer):
    choices = QuizChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ['id', 'text', 'order', 'choices']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'lesson', 'title', 'description', 'passing_score', 'questions']

class QuizAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ['id', 'student', 'student_name', 'quiz', 'score', 'passed', 'attempted_at']

class LessonSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    quiz = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Lesson
        fields = '__all__'
        read_only_fields = ('module',)

    def get_quiz(self, obj):
        try:
            q = obj.quiz
            return {
                'id': q.id,
                'title': q.title,
                'passing_score': q.passing_score,
                'question_count': q.questions.count()
            }
        except Exception:
            return None

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
