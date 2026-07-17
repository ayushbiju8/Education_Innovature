from django.db import migrations

def seed_categories_and_tags(apps, schema_editor):
    Category = apps.get_model('courses', 'Category')
    Tag = apps.get_model('courses', 'Tag')

    # Seed default categories
    default_categories = [
        {"name": "Development", "slug": "development", "description": "Programming, software engineering, and web development courses."},
        {"name": "Design", "slug": "design", "description": "UI/UX design, graphic design, and artistic fundamentals."},
        {"name": "Business", "slug": "business", "description": "Finance, management, entrepreneurship, and marketing."},
        {"name": "Data Science", "slug": "data-science", "description": "Machine learning, statistics, python scripting, and databases."},
    ]
    for cat in default_categories:
        Category.objects.get_or_create(slug=cat["slug"], defaults=cat)

    # Seed default tags
    default_tags = ["React", "JavaScript", "Python", "Django", "CSS", "SQL", "Machine Learning"]
    for tag_name in default_tags:
        Tag.objects.get_or_create(name=tag_name)

def rollback_seed(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('courses', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_categories_and_tags, rollback_seed),
    ]
