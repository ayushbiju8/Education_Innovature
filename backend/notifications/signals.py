from django.db.models.signals import post_save
from django.dispatch import receiver
from enrollments.models import Enrollment
from courses.models import Lesson, Course
from .models import Notification

@receiver(post_save, sender=Enrollment)
def notify_mentor_on_enrollment(sender, instance, created, **kwargs):
    if created:
        mentor = instance.course.mentor
        Notification.objects.create(
            user=mentor,
            title="New Student Enrolled",
            message=f"{instance.student.username} just enrolled in your course '{instance.course.title}'."
        )

@receiver(post_save, sender=Lesson)
def notify_students_on_new_lesson(sender, instance, created, **kwargs):
    if created:
        course = instance.module.course
        enrollments = course.enrollments.all()
        notifications = []
        for enrollment in enrollments:
            notifications.append(Notification(
                user=enrollment.student,
                title="New Lesson Added",
                message=f"A new lesson '{instance.title}' has been added to '{course.title}'."
            ))
        Notification.objects.bulk_create(notifications)

@receiver(post_save, sender=Course)
def notify_mentor_on_course_published(sender, instance, **kwargs):
    if instance.is_published:
        title = "Course Published"
        if not Notification.objects.filter(user=instance.mentor, title=title, message__contains=instance.title).exists():
            Notification.objects.create(
                user=instance.mentor,
                title=title,
                message=f"Your course '{instance.title}' is now published."
            )
