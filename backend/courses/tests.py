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
        
        tag1, _ = Tag.objects.get_or_create(name="Python")
        tag2, _ = Tag.objects.get_or_create(name="Backend")
        
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


from rest_framework.test import APITestCase
from django.urls import reverse

class CourseSearchAndFilterTests(APITestCase):
    def setUp(self):
        self.mentor = User.objects.create_user(
            username="mentor_jack",
            email="jack@example.com",
            role="mentor",
            password="password123"
        )
        self.category_py = Category.objects.create(name="Python Dev", slug="py-dev")
        self.category_js = Category.objects.create(name="JS Dev", slug="js-dev")
        
        self.tag_back = Tag.objects.create(name="Backend")
        self.tag_front = Tag.objects.create(name="Frontend")
        
        # Course 1 (Python, Backend, $50)
        self.c1 = Course.objects.create(
            title="Mastering Django",
            slug="mastering-django",
            description="Build robust web backends",
            category=self.category_py,
            mentor=self.mentor,
            price=50.00,
            is_published=True
        )
        self.c1.tags.add(self.tag_back)
        
        # Course 2 (JS, Frontend, $20)
        self.c2 = Course.objects.create(
            title="React Basics",
            slug="react-basics",
            description="Create interactive frontends",
            category=self.category_js,
            mentor=self.mentor,
            price=20.00,
            is_published=True
        )
        self.c2.tags.add(self.tag_front)
        
        # Lesson content for Deep Search on Course 1
        self.m1 = Module.objects.create(course=self.c1, title="DB Tuning", order=1)
        self.l1 = Lesson.objects.create(
            module=self.m1, 
            title="Advanced indexing query optimization", 
            content="Use select_related to speed up queries",
            order=1
        )
        
    def test_filter_by_category(self):
        url = reverse('course-list')
        res = self.client.get(url, {'category': self.category_py.id})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.c1.id)

    def test_filter_by_tag(self):
        url = reverse('course-list')
        res = self.client.get(url, {'tag': self.tag_back.id})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.c1.id)

    def test_filter_by_price_range(self):
        url = reverse('course-list')
        # Min price $30 should return Course 1 ($50) only
        res = self.client.get(url, {'min_price': 30.00})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.c1.id)
        
        # Max price $25 should return Course 2 ($20) only
        res = self.client.get(url, {'max_price': 25.00})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.c2.id)

    def test_search_by_title_and_description(self):
        url = reverse('course-list')
        # Searching "React" should match React Basics
        res = self.client.get(url, {'search': 'React'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.c2.id)

        # Searching "backends" should match Mastering Django (description)
        res = self.client.get(url, {'search': 'backends'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.c1.id)

    def test_deep_search_lesson_content(self):
        url = reverse('course-list')
        # Title/description only search for "select_related" should not match anything by default
        res = self.client.get(url, {'search': 'select_related'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

        # Deep search=true should match "select_related" inside lesson content and return Course 1
        res = self.client.get(url, {'search': 'select_related', 'deep_search': 'true'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['id'], self.c1.id)


