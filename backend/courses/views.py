from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Category, Course, Tag, Module, Lesson, Attachment, Quiz, QuizQuestion, QuizChoice, QuizAttempt
from .serializers import (
    CategorySerializer, CourseSerializer, CourseListSerializer, 
    TagSerializer, ModuleSerializer, LessonSerializer, AttachmentSerializer,
    QuizSerializer, QuizAttemptSerializer
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

    def filter_queryset(self, queryset):
        search_query = self.request.query_params.get('search', '')
        tag_id = self.request.query_params.get('tag', None)
        min_price = self.request.query_params.get('min_price', None)
        max_price = self.request.query_params.get('max_price', None)
        category_id = self.request.query_params.get('category', None)

        if self.action == 'list' and (search_query or tag_id or min_price or max_price or category_id):
            from .search import SearchBackend
            deep_search = self.request.query_params.get('deep_search', 'false').lower() == 'true'

            queryset = SearchBackend.search_courses(
                queryset=queryset,
                query_str=search_query,
                deep_search=deep_search,
                category_id=category_id,
                tag_id=tag_id,
                min_price=min_price,
                max_price=max_price
            )

            ordering_filter = filters.OrderingFilter()
            queryset = ordering_filter.filter_queryset(self.request, queryset, self)
            return queryset

        return super().filter_queryset(queryset)

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

    @action(detail=True, methods=['get'], url_path='quiz')
    def get_quiz(self, request, pk=None):
        lesson = self.get_object()
        try:
            quiz = lesson.quiz
            serializer = QuizSerializer(quiz, context={'request': request})
            return Response(serializer.data)
        except Exception:
            return Response({"detail": "No quiz exists for this lesson."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='quiz/manage')
    def manage_quiz(self, request, pk=None):
        lesson = self.get_object()
        user = request.user
        course = lesson.module.course
        if not (user.is_superuser or user.is_staff or getattr(user, 'role', '') == 'admin' or course.mentor == user):
            return Response({"detail": "You do not have permission to manage this quiz."}, status=status.HTTP_403_FORBIDDEN)

        title = request.data.get('title', 'Quiz').strip()
        description = request.data.get('description', '').strip()
        passing_score = int(request.data.get('passing_score', 60))
        questions_data = request.data.get('questions', [])

        from django.db import transaction
        try:
            with transaction.atomic():
                quiz, _ = Quiz.objects.get_or_create(lesson=lesson, defaults={'title': title, 'passing_score': passing_score})
                quiz.title = title
                quiz.description = description
                quiz.passing_score = passing_score
                quiz.save()

                # Clear existing questions and choices (full rebuild)
                quiz.questions.all().delete()

                for idx, q_data in enumerate(questions_data):
                    q_text = q_data.get('text', '').strip()
                    if not q_text:
                        continue
                    question = QuizQuestion.objects.create(
                        quiz=quiz,
                        text=q_text,
                        order=q_data.get('order', idx)
                    )
                    choices_data = q_data.get('choices', [])
                    for c_data in choices_data:
                        c_text = c_data.get('text', '').strip()
                        if not c_text:
                            continue
                        QuizChoice.objects.create(
                            question=question,
                            text=c_text,
                            is_correct=bool(c_data.get('is_correct', False))
                        )
                
                serializer = QuizSerializer(quiz, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Failed to save quiz: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='quiz/submit')
    def submit_quiz(self, request, pk=None):
        lesson = self.get_object()
        try:
            quiz = lesson.quiz
        except Exception:
            return Response({"detail": "This lesson does not have a quiz."}, status=status.HTTP_404_NOT_FOUND)

        from enrollments.models import Enrollment, LessonProgress
        from certificates.models import Certificate
        from django.utils import timezone
        import uuid

        try:
            enrollment = Enrollment.objects.get(student=request.user, course=lesson.module.course)
        except Enrollment.DoesNotExist:
            return Response({"detail": "You must be enrolled in this course to take the quiz."}, status=status.HTTP_403_FORBIDDEN)

        answers_data = request.data.get('answers', [])
        questions = quiz.questions.all()
        total_questions = questions.count()
        if total_questions == 0:
            return Response({"detail": "This quiz has no questions."}, status=status.HTTP_400_BAD_REQUEST)

        correct_count = 0
        graded_details = []

        for q in questions:
            correct_choice = q.choices.filter(is_correct=True).first()
            student_choice_id = None
            for ans in answers_data:
                if int(ans.get('question_id')) == q.id:
                    student_choice_id = int(ans.get('choice_id'))
                    break
            
            is_correct = (correct_choice is not None and student_choice_id == correct_choice.id)
            if is_correct:
                correct_count += 1
                
            graded_details.append({
                "question_id": q.id,
                "selected_choice_id": student_choice_id,
                "correct_choice_id": correct_choice.id if correct_choice else None,
                "is_correct": is_correct
            })

        score = (correct_count / total_questions) * 100
        passed = score >= quiz.passing_score

        attempt = QuizAttempt.objects.create(
            student=request.user,
            quiz=quiz,
            score=score,
            passed=passed
        )

        if passed:
            progress_rec, created = LessonProgress.objects.get_or_create(
                enrollment=enrollment,
                lesson=lesson,
                defaults={'is_completed': True, 'completed_at': timezone.now()}
            )
            if not created and not progress_rec.is_completed:
                progress_rec.is_completed = True
                progress_rec.completed_at = timezone.now()
                progress_rec.save()

            total_lessons = Lesson.objects.filter(module__course=lesson.module.course).count()
            completed_lessons = LessonProgress.objects.filter(enrollment=enrollment, is_completed=True).count()
            if total_lessons > 0 and completed_lessons == total_lessons:
                if not hasattr(enrollment, 'certificate'):
                    Certificate.objects.create(
                        enrollment=enrollment,
                        certificate_code=str(uuid.uuid4())
                    )

        return Response({
            "attempt_id": attempt.id,
            "score": score,
            "passed": passed,
            "passing_score": quiz.passing_score,
            "correct_count": correct_count,
            "total_questions": total_questions,
            "graded_details": graded_details
        }, status=status.HTTP_200_OK)

class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [IsCourseOwnerOrAdmin]
    parser_classes = [MultiPartParser, FormParser]
