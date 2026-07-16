from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Category, Course, Tag, Module, Lesson, Attachment

User = get_user_model()

class CourseModelTests(TestCase):
    def setUp(self):
        # Create user with mentor role
        self.mentor = User.objects.create_user(
            username="mentor_john",
            email="john@example.com",
            password="securepassword123",
            role="mentor"
        )
        
        # Create Category
        self.category = Category.objects.create(
            name="Programming",
            slug="programming",
            description="All programming courses"
        )

    def test_course_creation_and_relationships(self):
        """Test that courses link properly to categories and mentors."""
        course = Course.objects.create(
            title="Introduction to Python",
            slug="intro-to-python",
            description="Learn basic Python",
            category=self.category,
            mentor=self.mentor,
            price=29.99,
            is_published=True
        )

        self.assertEqual(course.title, "Introduction to Python")
        self.assertEqual(course.category, self.category)
        self.assertEqual(course.mentor, self.mentor)
        self.assertEqual(course.price, 29.99)
        self.assertTrue(course.is_published)
        self.assertEqual(str(course), "Introduction to Python")

        # Test Category reverse relation
        self.assertIn(course, self.category.courses.all())
        
        # Test Mentor reverse relation
        self.assertIn(course, self.mentor.created_courses.all())

    def test_tags_relationship(self):
        """Test course many-to-many relationship with tags."""
        course = Course.objects.create(
            title="Python Advanced",
            slug="python-advanced",
            description="Learn advanced concepts",
            category=self.category,
            mentor=self.mentor,
            price=49.99
        )
        
        tag1 = Tag.objects.create(name="Python")
        tag2 = Tag.objects.create(name="Backend")
        
        course.tags.add(tag1, tag2)
        
        self.assertEqual(course.tags.count(), 2)
        self.assertIn(course, tag1.courses.all())
        self.assertIn(course, tag2.courses.all())

    def test_course_modules_and_lessons(self):
        """Test hierarchical modules and lessons relationship."""
        course = Course.objects.create(
            title="Django for Beginners",
            slug="django-beginners",
            description="Learn Django web development",
            category=self.category,
            mentor=self.mentor,
            price=19.99
        )

        module = Module.objects.create(
            course=course,
            title="Setup & Installation",
            order=1
        )

        lesson = Lesson.objects.create(
            module=module,
            title="Install Python & Django",
            content="Use pip to install django",
            video_url="https://example.com/video",
            order=1,
            duration=15
        )

        self.assertEqual(module.course, course)
        self.assertEqual(lesson.module, module)
        self.assertEqual(str(module), "Django for Beginners - Setup & Installation")
        self.assertEqual(str(lesson), "Setup & Installation - Install Python & Django")

        # Test cascade delete: deleting course should delete modules & lessons
        course.delete()
        self.assertEqual(Module.objects.count(), 0)
        self.assertEqual(Lesson.objects.count(), 0)

