import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import UserRole
from courses.models import Course, Category, Module, Lesson

User = get_user_model()

def main():
    output = []
    
    # 1. Admin Account
    admin = User.objects.filter(is_superuser=True).first()
    if not admin:
        admin = User.objects.create_superuser('admin', 'admin@example.com', '@Bahubali2')
        admin.role = UserRole.ADMIN
        admin.save()
        output.append("Admin Account Created:")
    else:
        output.append("Admin Account Exists:")
    
    output.append(f"Username: {admin.username}")
    output.append("Password: @Bahubali2 (assuming default from postman if already existed)\n")

    # 2. Category
    category, _ = Category.objects.get_or_create(
        name="Web Development", 
        slug="web-development", 
        defaults={"description": "Learn to build websites."}
    )

    # 3. Mentor Accounts and Courses
    mentors = list(User.objects.filter(role=UserRole.MENTOR))
    
    if len(mentors) < 2:
        output.append("Creating Mentor Accounts...")
        mentor1 = User.objects.create_user(username='mentor_john', email='john@example.com', password='password123', role=UserRole.MENTOR, first_name='John', last_name='Doe')
        mentor2 = User.objects.create_user(username='mentor_jane', email='jane@example.com', password='password123', role=UserRole.MENTOR, first_name='Jane', last_name='Smith')
        mentors.extend([mentor1, mentor2])
    
    for i, mentor in enumerate(mentors[:2]):
        output.append(f"Mentor {i+1}:")
        output.append(f"Username: {mentor.username}")
        output.append(f"Password: password123 (if newly created, else unknown)\n")
        
        # Check if mentor has courses
        if not Course.objects.filter(mentor=mentor).exists():
            course = Course.objects.create(
                title=f"Course by {mentor.first_name}",
                slug=f"course-by-{mentor.username}",
                description="An amazing course.",
                category=category,
                mentor=mentor,
                price=49.99,
                is_published=True
            )
            mod = Module.objects.create(course=course, title="Getting Started", order=1)
            Lesson.objects.create(module=mod, title="Introduction", content="Welcome to the course!", order=1)
            output.append(f"  -> Created Course: '{course.title}' with 1 Module and 1 Lesson.\n")
        else:
            courses = Course.objects.filter(mentor=mentor)
            output.append(f"  -> Has {courses.count()} existing courses.\n")

    # Save to file
    with open('demo_users.txt', 'w') as f:
        f.write("\n".join(output))
    
    print("Demo data processed successfully.")

if __name__ == '__main__':
    main()
