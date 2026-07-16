from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.testing import WebsocketCommunicator
from config.asgi import application
from courses.models import Course, Category
from enrollments.models import Enrollment
from chat.models import Room, Question, Answer

User = get_user_model()

class CourseChatTests(TransactionTestCase):
    def setUp(self):
        # Create users
        self.category = Category.objects.create(name="CS", slug="cs")
        self.mentor = User.objects.create_user(username="mentor1", password="password", role="mentor")
        self.student = User.objects.create_user(username="student1", password="password", role="student")
        self.unauthorized_user = User.objects.create_user(username="other1", password="password", role="student")
        
        self.course = Course.objects.create(
            title="React 101",
            slug="react-101",
            mentor=self.mentor,
            category=self.category,
            price=0,
            is_published=True
        )
        
        # Enroll student
        Enrollment.objects.create(student=self.student, course=self.course)
        
        # Generate simple-jwt tokens
        self.student_token = str(AccessToken.for_user(self.student))
        self.mentor_token = str(AccessToken.for_user(self.mentor))
        self.unauthorized_token = str(AccessToken.for_user(self.unauthorized_user))

    async def test_student_joins_room(self):
        communicator = WebsocketCommunicator(
            application, 
            f"/ws/chat/course/{self.course.id}/?token={self.student_token}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_mentor_joins_room(self):
        communicator = WebsocketCommunicator(
            application, 
            f"/ws/chat/course/{self.course.id}/?token={self.mentor_token}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        await communicator.disconnect()

    async def test_unauthorized_user_rejected(self):
        communicator = WebsocketCommunicator(
            application, 
            f"/ws/chat/course/{self.course.id}/?token={self.unauthorized_token}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertFalse(connected)

    async def test_no_token_rejected(self):
        communicator = WebsocketCommunicator(
            application, 
            f"/ws/chat/course/{self.course.id}/"
        )
        connected, subprotocol = await communicator.connect()
        self.assertFalse(connected)
