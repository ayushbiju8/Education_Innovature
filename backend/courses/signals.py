import threading
from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from .models import Course, Module, Lesson
from .search import SearchBackend


def index_in_background(course):
    SearchBackend.index_course(course)


def _fire_email(func, *args):
    try:
        func(*args)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Email trigger failed in courses signal: {e}")


@receiver(post_save, sender=Course)
def update_course_index(sender, instance, **kwargs):
    t = threading.Thread(target=index_in_background, args=(instance,))
    t.daemon = True
    t.start()


@receiver(post_delete, sender=Course)
def delete_course_index(sender, instance, **kwargs):
    t = threading.Thread(target=SearchBackend.delete_course, args=(instance.id,))
    t.daemon = True
    t.start()


@receiver(m2m_changed, sender=Course.tags.through)
def update_course_tags_index(sender, instance, action, **kwargs):
    if action in ['post_add', 'post_remove', 'post_clear']:
        t = threading.Thread(target=index_in_background, args=(instance,))
        t.daemon = True
        t.start()


@receiver(post_save, sender=Module)
def update_module_course_index(sender, instance, **kwargs):
    if instance.course:
        t = threading.Thread(target=index_in_background, args=(instance.course,))
        t.daemon = True
        t.start()


@receiver(post_save, sender=Lesson)
def update_lesson_course_index(sender, instance, **kwargs):
    if instance.module and instance.module.course:
        t = threading.Thread(target=index_in_background, args=(instance.module.course,))
        t.daemon = True
        t.start()


@receiver(post_save, sender='courses.QuizAttempt')
def notify_student_quiz_passed(sender, instance, created, **kwargs):
    """Send an email when a student passes a quiz assessment."""
    if created and instance.passed:
        from notifications.email_utils import send_quiz_passed_email
        _fire_email(send_quiz_passed_email, instance)
