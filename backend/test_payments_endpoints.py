import os
import django
import sys
import json
import urllib.request
import urllib.error

# Configure Django to retrieve / create user
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import UserRole
User = get_user_model()

def prepare_user():
    user, created = User.objects.get_or_create(
        username="test_student",
        defaults={
            "email": "test_student@example.com",
            "role": UserRole.STUDENT
        }
    )
    user.set_password("password123")
    user.role = UserRole.STUDENT
    user.save()
    print(f"Ensured user 'test_student' is configured in DB (created: {created}).")

def test_payments():
    prepare_user()
    print("Testing payments backend endpoints...")
    
    # 1. Login
    login_url = "http://127.0.0.1:8000/api/auth/login/"
    payload = {
        "username": "test_student",
        "password": "password123"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        login_url, 
        data=data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            tokens = json.loads(response.read().decode('utf-8'))
            access_token = tokens["access"]
            print("Logged in successfully.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    # 2. Get course ID 3 (Interactive Media and Showcase Course) which is published
    course_id = 3
    
    # 3. Create Order
    create_order_url = "http://127.0.0.1:8000/api/payments/create-order/"
    order_payload = {
        "course_id": course_id
    }
    order_data = json.dumps(order_payload).encode('utf-8')
    req_order = urllib.request.Request(
        create_order_url,
        data=order_data,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    )
    
    try:
        with urllib.request.urlopen(req_order) as response:
            res_body = response.read().decode('utf-8')
            order_info = json.loads(res_body)
            print("Create Order Response:")
            for k, v in order_info.items():
                print(f"  {k}: {v}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error creating order: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error creating order: {e}")

    # 4. Fetch Payments History
    history_url = "http://127.0.0.1:8000/api/payments/history/"
    req_history = urllib.request.Request(
        history_url,
        headers={
            "Authorization": f"Bearer {access_token}"
        }
    )
    try:
        with urllib.request.urlopen(req_history) as response:
            res_body = response.read().decode('utf-8')
            history_info = json.loads(res_body)
            print(f"\nPayments History Count: {len(history_info)}")
            print(f"Payments History Response: {history_info}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error reading history: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error reading history: {e}")

if __name__ == '__main__':
    test_payments()
