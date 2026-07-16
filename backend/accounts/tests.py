# pyrefly: ignore [missing-import]
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from .models import UserRole, MentorApplication

User = get_user_model()

class UserModelTests(TestCase):
    def test_create_user_default_role(self):
        """Creating a normal user defaults to the student role."""
        user = User.objects.create_user(
            username="student1",
            email="student1@example.com",
            password="testpassword123"
        )
        self.assertEqual(user.role, UserRole.STUDENT)
        self.assertEqual(str(user), "student1 (Student)")

    def test_create_user_mentor_role(self):
        """Creating a user with mentor role sets it correctly."""
        user = User.objects.create_user(
            username="mentor1",
            email="mentor1@example.com",
            password="testpassword123",
            role=UserRole.MENTOR
        )
        self.assertEqual(user.role, UserRole.MENTOR)
        self.assertEqual(str(user), "mentor1 (Mentor)")

    def test_create_user_admin_role(self):
        """Creating a user with admin role sets it correctly."""
        user = User.objects.create_user(
            username="admin1",
            email="admin1@example.com",
            password="testpassword123",
            role=UserRole.ADMIN
        )
        self.assertEqual(user.role, UserRole.ADMIN)
        self.assertEqual(str(user), "admin1 (Admin)")

    def test_create_superuser_gets_admin_role(self):
        """Creating a superuser automatically assigns the admin role."""
        superuser = User.objects.create_superuser(
            username="superadmin",
            email="superadmin@example.com",
            password="testpassword123"
        )
        self.assertEqual(superuser.role, UserRole.ADMIN)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_staff)


class AuthAPITests(APITestCase):
    def setUp(self):
        # Create standard student
        self.student = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="alicepassword123",
            role=UserRole.STUDENT
        )
        # Create admin user
        self.admin_user = User.objects.create_superuser(
            username="sysadmin",
            email="admin@example.com",
            password="adminpassword123"
        )
        
        # URL paths
        self.register_url = reverse('auth_register')
        self.login_url = reverse('token_obtain_pair')
        self.profile_url = reverse('auth_profile')
        self.logout_url = reverse('auth_logout')
        self.mentor_apply_url = reverse('mentor_apply')
        self.admin_list_applications_url = reverse('admin_mentor_applications_list')

    def test_registration_success(self):
        data = {
            "username": "bob",
            "email": "bob@example.com",
            "password": "bobpassword123"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['username'], 'bob')
        self.assertEqual(response.data['role'], 'student')  # Must default to student

    def test_registration_password_length_failure(self):
        data = {
            "username": "bob",
            "email": "bob@example.com",
            "password": "short"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)

    def test_registration_duplicate_email(self):
        data = {
            "username": "newbob",
            "email": "alice@example.com", # already exists
            "password": "bobpassword123"
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)

    def test_login_and_token_receipt(self):
        data = {
            "username": "alice",
            "password": "alicepassword123"
        }
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_profile_retrieval_and_update(self):
        self.client.force_authenticate(user=self.student)
        
        # Get profile
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'alice')

        # Update profile
        update_data = {
            "bio": "New profile biography",
            "phone_number": "1234567890"
        }
        response = self.client.put(self.profile_url, update_data)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['bio'], 'New profile biography')
        self.assertEqual(response.data['phone_number'], '1234567890')

    def test_mentor_application_lifecycle_and_promotion(self):
        # Alice applies for mentor
        self.client.force_authenticate(user=self.student)
        
        apply_data = {"bio": "I have 5 years of Python experience"}
        response = self.client.post(self.mentor_apply_url, apply_data)
        self.assertEqual(response.status_code, 201)
        
        application_id = response.data['id']
        self.assertEqual(response.data['status'], 'pending')
        
        # Sysadmin logs in and lists applications
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.admin_list_applications_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

        # Sysadmin approves application
        decide_url = reverse('admin_mentor_application_decide', kwargs={'pk': application_id})
        response = self.client.post(decide_url, {"status": "approved"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'approved')
        
        # Check that Alice is now upgraded to Mentor role
        self.student.refresh_from_db()
        self.assertEqual(self.student.role, UserRole.MENTOR)


