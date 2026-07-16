from rest_framework import serializers
from .models import Question, Answer

class AnswerSerializer(serializers.ModelSerializer):
    sender = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'sender', 'content', 'created_at']

class QuestionSerializer(serializers.ModelSerializer):
    sender = serializers.CharField(source='user.username', read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'sender', 'title', 'content', 'answers', 'created_at']
