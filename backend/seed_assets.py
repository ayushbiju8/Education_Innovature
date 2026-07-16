import os
import django
import sys

# Configure Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.files import File
from accounts.models import UserRole
from courses.models import Category, Course, Module, Lesson, Attachment

User = get_user_model()

def seed():
    print("Starting asset seeding...")

    # 1. Create or get Category
    category, _ = Category.objects.get_or_create(
        name="Computer Science",
        defaults={"slug": "computer-science", "description": "Programming, Software Engineering and more."}
    )
    print(f"Category: {category.name}")

    # 2. Create or get Mentor User
    mentor, created = User.objects.get_or_create(
        username="demo_mentor",
        defaults={
            "email": "demo_mentor@example.com",
            "first_name": "Demo",
            "last_name": "Mentor",
            "role": UserRole.MENTOR,
        }
    )
    if created:
        mentor.set_password("@Bahubali2")
        mentor.save()
    else:
        mentor.role = UserRole.MENTOR
        mentor.save()
    print(f"Mentor: {mentor.username}")

    # 3. Create or get Course
    course, _ = Course.objects.get_or_create(
        title="Interactive Media and Showcase Course",
        defaults={
            "slug": "interactive-media-showcase",
            "description": "A comprehensive test course showing off rich HTML5 video players, inline image cards, and dynamic text document notes.",
            "category": category,
            "mentor": mentor,
            "price": 19.99,
            "is_published": True
        }
    )
    print(f"Course: {course.title}")

    # 4. Create Module
    module, _ = Module.objects.get_or_create(
        course=course,
        title="Chapter 1: Rich Media Attachments Showcase",
        defaults={"order": 1}
    )
    print(f"Module: {module.title}")

    # 5. Create Lesson 1: Videos and Images
    lesson1, _ = Lesson.objects.get_or_create(
        module=module,
        title="1.1 Playing Videos and Inspecting Image Diagrams",
        defaults={
            "content": "This lesson showcases visual content: 2 videos demonstrating time rewinding and 2 system diagram images.",
            "duration": 15,
            "order": 1
        }
    )
    print(f"Lesson 1: {lesson1.title}")

    # 6. Create Lesson 2: Text notes
    lesson2, _ = Lesson.objects.get_or_create(
        module=module,
        title="1.2 Reading Text Material Documents",
        defaults={
            "content": "This lesson showcases text documents: 2 text files loaded directly via the platform attachments system.",
            "duration": 10,
            "order": 2
        }
    )
    print(f"Lesson 2: {lesson2.title}")

    # Clean existing attachments for clean run
    Attachment.objects.filter(lesson__in=[lesson1, lesson2]).delete()

    # Asset files directory mapping
    contents_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'CourseContents')
    
    media_assets = [
        ("Time Machine Rewinds Part A", "Character_with_time_machine_rewinds_202606161615.mp4", lesson1),
        ("Time Machine Rewinds Part B", "Character_with_time_machine_rewinds_202606161618.mp4", lesson1),
        ("ChatGPT Mockup UI A", "ChatGPT Image Jun 16, 2026, 03_08_33 PM.png", lesson1),
        ("ChatGPT Mockup UI B", "ChatGPT Image Jun 16, 2026, 03_12_40 PM.png", lesson1),
        ("Lecture notes Part 1", "demo_notes_1.txt", lesson2),
        ("Lecture notes Part 2", "demo_notes_2.txt", lesson2),
    ]

    for title, filename, lesson in media_assets:
        file_path = os.path.join(contents_dir, filename)
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                attachment = Attachment(lesson=lesson, title=title)
                attachment.file.save(filename, File(f), save=True)
                print(f"Uploaded attachment '{title}' ({filename}) for lesson '{lesson.title}'")
        else:
            print(f"Warning: File {file_path} not found.")

    print("Seeding completed successfully!")

if __name__ == '__main__':
    seed()
