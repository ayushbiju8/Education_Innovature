from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings

User = settings.AUTH_USER_MODEL


def _fire_email(func, *args):
    try:
        func(*args)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Email trigger failed in accounts signal: {e}")


@receiver(post_save, sender=User)
def send_welcome_on_registration(sender, instance, created, **kwargs):
    """Send a welcome email when a brand new user account is created."""
    if created and instance.email:
        from notifications.email_utils import send_welcome_email
        _fire_email(send_welcome_email, instance)


@receiver(post_save, sender='accounts.MentorApplication')
def send_mentor_application_update(sender, instance, **kwargs):
    """Email applicant whenever their mentor application status changes."""
    if instance.status in ('approved', 'rejected'):
        from notifications.email_utils import send_mentor_application_status_email
        _fire_email(send_mentor_application_status_email, instance)
