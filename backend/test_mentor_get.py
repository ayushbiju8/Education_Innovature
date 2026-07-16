import os
import django
import sys

# Configure Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from courses.models import Course
from django.db.models import Q

User = get_user_model()

def test():
    # Let's see all users
    print("Users:")
    for u in User.objects.all():
        print(f"- {u.username} (role: {u.role}, staff: {u.is_staff})")

    # Let's get demo_mentor
    mentor = User.objects.filter(username="demo_mentor").first()
    if mentor:
        print(f"\nChecking for mentor: {mentor.username}")
        print(f"Is authenticated: True")
        print(f"Role: {mentor.role}")
        
        # Run query
        qs = Course.objects.filter(Q(is_published=True) | Q(mentor=mentor))
        print(f"Total courses for mentor query: {qs.count()}")
        for c in qs:
            print(f"- {c.title} (published: {c.is_published}, mentor: {c.mentor.username})")
            
        # Let's check direct list API behavior
        from rest_framework.test import APIRequestFactory, force_authenticate
        from courses.views import CourseViewSet
        
        factory = APIRequestFactory()
        request = factory.get('/api/courses/')
        force_authenticate(request, user=mentor)
        
        view = CourseViewSet.as_view({'get': 'list'})
        response = view(request)
        print(f"\nAPI Response status code: {response.status_code}")
        print(f"API Response data: {response.data}")
    else:
        print("demo_mentor not found.")

if __name__ == '__main__':
    test()
