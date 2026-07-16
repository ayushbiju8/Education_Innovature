from rest_framework import serializers
from .models import Enrollment, LessonProgress
from courses.models import Course, Lesson

class EnrollmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.title', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'course_name', 'enrolled_at', 'is_active']
        read_only_fields = ('student', 'enrolled_at', 'is_active')

    def validate_course(self, value):
        if not value.is_published:
            raise serializers.ValidationError("Cannot enroll in an unpublished course.")
            
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if Enrollment.objects.filter(student=request.user, course=value).exists():
                raise serializers.ValidationError("You are already enrolled in this course.")
        return value


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ['id', 'enrollment', 'lesson', 'is_completed', 'completed_at']
        read_only_fields = ('enrollment', 'lesson', 'completed_at')

    def validate(self, data):
        # We need to validate that the student is enrolled in the course this lesson belongs to,
        # and that the lesson isn't already completed.
        request = self.context.get('request')
        lesson = self.context.get('lesson')
        
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Must be authenticated.")
            
        if not lesson:
            raise serializers.ValidationError("Lesson context is missing.")
            
        # Check enrollment
        enrollment = Enrollment.objects.filter(student=request.user, course=lesson.module.course).first()
        if not enrollment:
            raise serializers.ValidationError("You are not enrolled in the course containing this lesson.")
            
        # Check if already completed
        if LessonProgress.objects.filter(enrollment=enrollment, lesson=lesson, is_completed=True).exists():
            raise serializers.ValidationError("You have already completed this lesson.")
            
        return data
