from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, TagViewSet, CourseViewSet, 
    ModuleViewSet, LessonViewSet, AttachmentViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'tags', TagViewSet)
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'modules', ModuleViewSet)
router.register(r'lessons', LessonViewSet)
router.register(r'attachments', AttachmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
