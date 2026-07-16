from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from courses.models import Category, Course, Module, Lesson
from .models import Enrollment, LessonProgress

User = get_user_model()

class EnrollmentModelTests(TestCase):
    def setUp(self):
        # Create users
        self.mentor = User.objects.create_user(
            username="mentor1",
            email="mentor1@example.com",
            password="password123",
            role="mentor"
        )
        self.student = User.objects.create_user(
            username="student_alice",
            email="alice@example.com",
            password="password123",
            role="student"
        )
        
        # Create Course
        category = Category.objects.create(name="Tech", slug="tech")
        self.course = Course.objects.create(
            title="Intro to Tech",
            slug="intro-to-tech",
            description="Brief introduction",
            category=category,
            mentor=self.mentor,
            price=9.99
        )

    def test_enrollment_creation(self):
        """Test basic enrollment creation."""
        enrollment = Enrollment.objects.create(
            student=self.student,
            course=self.course
        )
        self.assertEqual(enrollment.student, self.student)
        self.assertEqual(enrollment.course, self.course)
        self.assertTrue(enrollment.is_active)
        self.assertEqual(str(enrollment), "student_alice enrolled in Intro to Tech")

    def test_duplicate_enrollment_integrity(self):
        """Test unique constraint on student and course."""
        Enrollment.objects.create(student=self.student, course=self.course)
        
        with self.assertRaises(IntegrityError):
            Enrollment.objects.create(student=self.student, course=self.course)

    def test_lesson_progress_tracking(self):
        """Test tracking progress of lessons in an enrollment."""
        enrollment = Enrollment.objects.create(student=self.student, course=self.course)
        
        module = Module.objects.create(course=self.course, title="Module 1")
        lesson = Lesson.objects.create(module=module, title="Lesson 1")
        
        progress = LessonProgress.objects.create(
            enrollment=enrollment,
            lesson=lesson,
            is_completed=True
        )
        
        self.assertEqual(progress.enrollment, enrollment)
        self.assertEqual(progress.lesson, lesson)
        self.assertTrue(progress.is_completed)
        self.assertEqual(str(progress), "student_alice - Lesson 1 (Completed)")

