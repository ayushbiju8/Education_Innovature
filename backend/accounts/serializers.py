from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from .models import UserRole, MentorApplication

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'phone_number', 'bio', 'avatar', 'first_name', 'last_name')
        read_only_fields = ('role',)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def validate_email(self, value):
        email = value.lower().strip()
        try:
            validate_email(email)
        except ValidationError:
            raise serializers.ValidationError("Enter a valid email address.")
            
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_username(self, value):
        if not value.isalnum():
            raise serializers.ValidationError("Username must be alphanumeric (letters and numbers only).")
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=UserRole.STUDENT  # Force student role during registration
        )
        return user

class ProfileUpdateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'email', 'phone_number', 'bio', 'avatar')

    def validate_email(self, value):
        email = value.lower().strip()
        user = self.context['request'].user
        if User.objects.filter(email=email).exclude(id=user.id).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

class MentorApplicationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = MentorApplication
        fields = ('id', 'user', 'bio', 'status', 'applied_at', 'reviewed_at')
        read_only_fields = ('status', 'applied_at', 'reviewed_at')

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Disallow if already a mentor
        if user.role == UserRole.MENTOR:
            raise serializers.ValidationError("You are already registered as a mentor.")
            
        # Check active applications
        existing_app = MentorApplication.objects.filter(
            user=user, 
            status__in=[MentorApplication.ApplicationStatus.PENDING, MentorApplication.ApplicationStatus.APPROVED]
        ).first()
        
        if existing_app:
            if existing_app.status == MentorApplication.ApplicationStatus.PENDING:
                raise serializers.ValidationError("You already have a pending mentor application.")
            else:
                raise serializers.ValidationError("Your application has already been approved.")
                
        return attrs
