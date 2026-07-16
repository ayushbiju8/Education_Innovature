import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from urllib.parse import parse_qs

class CourseChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.course_id = self.scope['url_route']['kwargs']['course_id']
        self.room_group_name = f'chat_course_{self.course_id}'

        # 1. Parse JWT token from query string
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if not token:
            await self.close()
            return

        # 2. Get User from token
        self.user = await self.get_user_from_token(token)
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        # 3. Check authorization (is mentor, admin, or enrolled student) and room existence
        self.room = await self.check_authorization(self.user, self.course_id)
        if not self.room:
            await self.close()
            return

        # 4. Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except Exception:
            return

        msg_type = data.get('type')
        content = data.get('content', '').strip()

        if not content:
            return

        if msg_type == 'question':
            # Save to database
            question = await self.save_question(self.room, self.user, content)
            if question:
                # Broadcast question message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message_payload': {
                            'type': 'question',
                            'id': question.id,
                            'sender': self.user.username,
                            'content': question.content,
                            'timestamp': question.created_at.isoformat()
                        }
                    }
                )

        elif msg_type == 'answer':
            question_id = data.get('question_id')
            if not question_id:
                return
            
            # Save to database and trigger notification
            result = await self.save_answer(question_id, self.user, content)
            answer, question = result
            if answer:
                # Broadcast answer message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message_payload': {
                            'type': 'answer',
                            'id': answer.id,
                            'question_id': question.id,
                            'sender': self.user.username,
                            'content': answer.content,
                            'timestamp': answer.created_at.isoformat()
                        }
                    }
                )

    # Receive message from room group
    async def chat_message(self, event):
        message_payload = event['message_payload']

        # Send message to WebSocket
        await self.send(text_data=json.dumps(message_payload))

    # Helper Database Access Methods
    @database_sync_to_async
    def get_user_from_token(self, token_str):
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from django.contrib.auth import get_user_model
            access_token = AccessToken(token_str)
            user_id = access_token['user_id']
            User = get_user_model()
            return User.objects.get(id=user_id)
        except Exception:
            return None

    @database_sync_to_async
    def check_authorization(self, user, course_id):
        from courses.models import Course
        from enrollments.models import Enrollment
        from chat.models import Room
        try:
            course = Course.objects.get(id=course_id)
            # Check permissions: Admin, Course Mentor, or Enrolled Student
            is_authorized = False
            if user.is_superuser or getattr(user, 'role', '') == 'admin':
                is_authorized = True
            elif getattr(user, 'role', '') == 'mentor' and course.mentor == user:
                is_authorized = True
            elif Enrollment.objects.filter(student=user, course=course).exists():
                is_authorized = True

            if is_authorized:
                # Ensure chat room exists
                room, _ = Room.objects.get_or_create(course=course, defaults={'name': f"chat_room_{course_id}"})
                return room
            return None
        except Exception:
            return None

    @database_sync_to_async
    def save_question(self, room, user, content):
        from chat.models import Question
        try:
            return Question.objects.create(
                room=room,
                user=user,
                title=content[:50] or "Question",
                content=content
            )
        except Exception as e:
            print(f"Error saving question: {e}")
            return None

    @database_sync_to_async
    def save_answer(self, question_id, user, content):
        from chat.models import Question, Answer
        from notifications.models import Notification
        try:
            question = Question.objects.get(id=question_id)
            answer = Answer.objects.create(
                question=question,
                user=user,
                content=content
            )
            # Notify the question author
            if question.user != user:
                Notification.objects.create(
                    user=question.user,
                    title="New Reply in Discussion",
                    message=f"{user.username} replied to your question: '{question.content[:40]}...'"
                )
            return answer, question
        except Exception as e:
            print(f"Error saving answer: {e}")
            return None, None
