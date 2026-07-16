from rest_framework import serializers
from .models import Review
from enrollments.models import Enrollment

class ReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'student', 'student_name', 'course', 'rating', 'comment', 'created_at']
        read_only_fields = ('student', 'course')

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, data):
        request = self.context.get('request')
        course = self.context.get('course') or getattr(self.instance, 'course', None)

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Must be authenticated.")
            
        if not course:
            raise serializers.ValidationError("Course context is missing.")

        # If creating a new review
        if not self.instance:
            if course.mentor == request.user:
                raise serializers.ValidationError("Mentors cannot review their own courses.")

            if not Enrollment.objects.filter(student=request.user, course=course).exists():
                raise serializers.ValidationError("You must be enrolled in this course to leave a review.")
            
            if Review.objects.filter(student=request.user, course=course).exists():
                raise serializers.ValidationError("You have already reviewed this course.")

        return data
