import urllib.request
import urllib.error
import json

def test_api():
    print("Testing HTTP request to backend using urllib...")
    
    # 1. Login as mentor
    login_url = "http://127.0.0.1:8000/api/auth/login/"
    payload = {
        "username": "demo_mentor",
        "password": "@Bahubali2"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        login_url, 
        data=data, 
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            tokens = json.loads(res_body)
            access_token = tokens["access"]
            print("Obtained JWT access token successfully.")
    except urllib.error.URLError as e:
        print(f"Connection or HTTP error during login: {e}")
        return
    except Exception as e:
        print(f"Unexpected error: {e}")
        return

    # 2. Fetch courses
    courses_url = "http://127.0.0.1:8000/api/courses/"
    req_courses = urllib.request.Request(
        courses_url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req_courses) as response:
            res_body = response.read().decode('utf-8')
            print(f"Courses Response Status: {response.status}")
            print(f"Courses Response Data: {res_body[:500]}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error during course fetch: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == '__main__':
    test_api()
