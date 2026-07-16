import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from courses.views import CourseViewSet
from courses.permissions import IsCourseOwnerOrAdmin

User = get_user_model()

def test():
    mentor = User.objects.filter(username="demo_mentor").first()
    factory = APIRequestFactory()
    request = factory.get('/api/courses/')
    force_authenticate(request, user=mentor)
    
    view = CourseViewSet()
    view.action = 'list'
    
    perm = IsCourseOwnerOrAdmin()
    
    print(f"IsCourseOwnerOrAdmin has_permission on list: {perm.has_permission(request, view)}")
    
if __name__ == '__main__':
    test()
