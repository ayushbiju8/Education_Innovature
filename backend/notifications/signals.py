from django.db.models.signals import post_save
from django.dispatch import receiver
from enrollments.models import Enrollment
from courses.models import Lesson, Course
from .models import Notification


def _fire_email(func, *args):
    """Call email helper safely so email errors never break the signal chain."""
    try:
        func(*args)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Email trigger failed in signal: {e}")


@receiver(post_save, sender=Enrollment)
def notify_mentor_on_enrollment(sender, instance, created, **kwargs):
    if created:
        from .email_utils import send_enrollment_email, send_mentor_enrollment_notification_email
        mentor = instance.course.mentor
        # In-app notification to mentor
        Notification.objects.create(
            user=mentor,
            title="New Student Enrolled",
            message=f"{instance.student.username} just enrolled in your course '{instance.course.title}'."
        )
        # Emails: confirmation to student + notification to mentor
        _fire_email(send_enrollment_email, instance)
        _fire_email(send_mentor_enrollment_notification_email, instance)


@receiver(post_save, sender=Lesson)
def notify_students_on_new_lesson(sender, instance, created, **kwargs):
    if created:
        from .email_utils import send_new_lesson_email
        course = instance.module.course
        enrollments = course.enrollments.select_related('student').all()
        notifications = []
        for enrollment in enrollments:
            notifications.append(Notification(
                user=enrollment.student,
                title="New Lesson Added",
                message=f"A new lesson '{instance.title}' has been added to '{course.title}'."
            ))
            # Email each enrolled student
            _fire_email(send_new_lesson_email, instance, enrollment.student)
        Notification.objects.bulk_create(notifications)


@receiver(post_save, sender=Course)
def notify_mentor_on_course_published(sender, instance, **kwargs):
    if instance.is_published:
        from .email_utils import send_course_published_email
        title = "Course Published"
        if not Notification.objects.filter(user=instance.mentor, title=title, message__contains=instance.title).exists():
            Notification.objects.create(
                user=instance.mentor,
                title=title,
                message=f"Your course '{instance.title}' is now published."
            )
            # Email the mentor
            _fire_email(send_course_published_email, instance)
