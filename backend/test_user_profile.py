import urllib.request
import json

def test_profile():
    # Login
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
    
    with urllib.request.urlopen(req) as response:
        tokens = json.loads(response.read().decode('utf-8'))
        access_token = tokens["access"]
        
    # Get profile
    profile_url = "http://127.0.0.1:8000/api/auth/profile/"
    req_profile = urllib.request.Request(
        profile_url,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    with urllib.request.urlopen(req_profile) as response:
        profile = json.loads(response.read().decode('utf-8'))
        print("Profile data:")
        for k, v in profile.items():
            print(f"  {k}: {v} (type: {type(v).__name__})")

if __name__ == '__main__':
    test_profile()
