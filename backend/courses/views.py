from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Category, Course, Tag, Module, Lesson, Attachment
from .serializers import (
    CategorySerializer, CourseSerializer, CourseListSerializer, 
    TagSerializer, ModuleSerializer, LessonSerializer, AttachmentSerializer
)
from .permissions import IsAdminOrReadOnly, IsMentorOrAdmin, IsCourseOwnerOrAdmin

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAdminOrReadOnly]

class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsCourseOwnerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'mentor', 'price', 'is_published']
    search_fields = ['title']
    ordering_fields = ['created_at', 'price']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Course.objects.filter(is_published=True)
        
        if getattr(user, 'role', '') == 'admin' or user.is_staff or user.is_superuser:
            return Course.objects.all()
        elif getattr(user, 'role', '') == 'mentor':
            return Course.objects.filter(Q(is_published=True) | Q(mentor=user))
        
        return Course.objects.filter(is_published=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return CourseListSerializer
        return CourseSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsMentorOrAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(mentor=self.request.user)
        
    @action(detail=True, methods=['get', 'post'], url_path='modules')
    def manage_modules(self, request, pk=None):
        course = self.get_object()
        if request.method == 'GET':
            modules = course.modules.all()
            serializer = ModuleSerializer(modules, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            serializer = ModuleSerializer(data=request.data, context={'course': course})
            if serializer.is_valid():
                serializer.save(course=course)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer
    permission_classes = [IsCourseOwnerOrAdmin]
    
    @action(detail=True, methods=['get', 'post'], url_path='lessons')
    def manage_lessons(self, request, pk=None):
        module = self.get_object()
        if request.method == 'GET':
            lessons = module.lessons.all()
            serializer = LessonSerializer(lessons, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            serializer = LessonSerializer(data=request.data, context={'module': module})
            if serializer.is_valid():
                serializer.save(module=module)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LessonViewSet(viewsets.ModelViewSet):
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsCourseOwnerOrAdmin]
    
    @action(detail=True, methods=['get', 'post'], url_path='attachments', parser_classes=[MultiPartParser, FormParser])
    def manage_attachments(self, request, pk=None):
        lesson = self.get_object()
        if request.method == 'GET':
            attachments = lesson.attachments.all()
            serializer = AttachmentSerializer(attachments, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            serializer = AttachmentSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(lesson=lesson)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [IsCourseOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser]
