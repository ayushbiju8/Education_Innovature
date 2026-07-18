from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from courses.models import Course
from enrollments.models import Enrollment
from notifications.models import Notification
from .models import Room, Question, Answer
from .serializers import QuestionSerializer


def _get_authorized_room(user, course_id):
    """Returns the chat Room if the user is authorized, else None."""
    course = get_object_or_404(Course, id=course_id)
    is_authorized = False
    if user.is_superuser or getattr(user, 'role', '') == 'admin':
        is_authorized = True
    elif getattr(user, 'role', '') == 'mentor' and course.mentor == user:
        is_authorized = True
    elif Enrollment.objects.filter(student=user, course=course).exists():
        is_authorized = True

    if not is_authorized:
        return None, None
    room, _ = Room.objects.get_or_create(course=course, defaults={'name': f"chat_room_{course_id}"})
    return room, course


class CourseChatHistoryAPIView(APIView):
    """GET all questions (with answers) for a course chat room.
    Supports ?since=<iso8601> for incremental polling."""
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        room, course = _get_authorized_room(request.user, course_id)
        if room is None:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        qs = Question.objects.filter(room=room).order_by('created_at')

        since = request.query_params.get('since')
        if since:
            try:
                from django.utils.dateparse import parse_datetime
                since_dt = parse_datetime(since)
                if since_dt:
                    qs = qs.filter(created_at__gt=since_dt)
            except Exception:
                pass

        serializer = QuestionSerializer(qs, many=True)
        return Response(serializer.data)


class PostQuestionAPIView(APIView):
    """POST a new question to a course chat room."""
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        room, course = _get_authorized_room(request.user, course_id)
        if room is None:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({"detail": "Content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        question = Question.objects.create(
            room=room,
            user=request.user,
            title=content[:50],
            content=content,
        )
        serializer = QuestionSerializer(question)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostAnswerAPIView(APIView):
    """POST a reply/answer to a specific question."""
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id, question_id):
        room, course = _get_authorized_room(request.user, course_id)
        if room is None:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        question = get_object_or_404(Question, id=question_id, room=room)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({"detail": "Content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        answer = Answer.objects.create(
            question=question,
            user=request.user,
            content=content,
        )

        # Notify the question author
        if question.user != request.user:
            try:
                Notification.objects.create(
                    user=question.user,
                    title="New Reply in Discussion",
                    message=f"{request.user.username} replied to your question: '{question.content[:40]}...'"
                )
            except Exception:
                pass

        from .serializers import AnswerSerializer
        serializer = AnswerSerializer(answer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
