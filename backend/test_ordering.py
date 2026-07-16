import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

def test():
    mentor = User.objects.filter(username="demo_mentor").first()
    client = APIClient()
    client.force_authenticate(user=mentor)
    
    # Test ordering
    res = client.get('/api/courses/', {'ordering': '-created_at'}, HTTP_HOST='127.0.0.1')
    print(f"Ordering response status: {res.status_code}")
    print(f"Ordering response courses count: {len(res.data) if res.status_code == 200 else 'Error: ' + str(res.data)}")

if __name__ == '__main__':
    test()
