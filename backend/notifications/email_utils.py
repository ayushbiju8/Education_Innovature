import threading
import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

logger = logging.getLogger(__name__)


def _send_async(subject, text_body, html_body, to_emails):
    """Send email in a background thread so it never blocks request handling."""
    def _send():
        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Innovature LMS <noreply@innovature.com>')
            msg = EmailMultiAlternatives(subject, text_body, from_email, to_emails)
            msg.attach_alternative(html_body, "text/html")
            msg.send(fail_silently=False)
            logger.info(f"Email sent: '{subject}' → {to_emails}")
        except Exception as e:
            logger.error(f"Email sending failed: '{subject}' → {to_emails}: {e}")

    t = threading.Thread(target=_send, daemon=True)
    t.start()


def _base_template(title, preview_text, body_html):
    """Wrap content in a consistent, branded HTML email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#0d0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#6366f1,#3b82f6);border-radius:12px;padding:10px 24px;">
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:1px;">Innovature LMS</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:linear-gradient(145deg,#161b2e,#1e2440);border:1px solid rgba(255,255,255,0.06);border-radius:20px;padding:36px 32px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 16px;">{preview_text}</p>
      <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 24px;line-height:1.3;">{title}</h1>
      {body_html}
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#475569;font-size:12px;margin:0;">
        You received this email because you have an account on Innovature LMS.<br>
        © 2026 Innovature Learning Management System. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>"""


def _btn(text, url):
    return f"""<div style="text-align:center;margin:28px 0 0;">
      <a href="{url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#3b82f6);color:#fff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:15px;letter-spacing:0.3px;">{text}</a>
    </div>"""


def _info_row(label, value):
    return f"""<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="color:#64748b;font-size:13px;">{label}</span>
      <span style="color:#e2e8f0;font-size:13px;font-weight:600;">{value}</span>
    </div>"""


SITE_URL = "https://education-innovature.vercel.app"


# ---------------------------------------------------------------------------
# 1. Welcome Email — sent when a new user registers
# ---------------------------------------------------------------------------
def send_welcome_email(user):
    if not user.email:
        return
    subject = "Welcome to Innovature LMS! 🎓"
    body_html = f"""
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">{user.get_full_name() or user.username}</strong>,<br><br>
      We're thrilled to have you join <strong style="color:#6366f1;">Innovature LMS</strong>!
      Your account is ready and you can start exploring courses right now.
    </p>
    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px 20px;margin:20px 0;">
      {_info_row("Username", user.username)}
      {_info_row("Role", user.get_role_display())}
      {_info_row("Email", user.email)}
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:20px 0 0;">
      Browse hundreds of expert-led courses and start building your skills today.
    </p>
    {_btn("Browse Courses", f"{SITE_URL}/")}
    """
    text = f"Welcome to Innovature LMS, {user.username}! Your account is ready. Visit {SITE_URL}"
    html = _base_template("Welcome to Innovature LMS! 🎓", "Your learning journey starts now.", body_html)
    _send_async(subject, text, html, [user.email])


# ---------------------------------------------------------------------------
# 2. Enrollment Confirmation — sent to student when they enroll
# ---------------------------------------------------------------------------
def send_enrollment_email(enrollment):
    student = enrollment.student
    course = enrollment.course
    if not student.email:
        return
    subject = f"You're enrolled in \"{course.title}\"!"
    body_html = f"""
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">{student.get_full_name() or student.username}</strong>,<br><br>
      Great news! You are now enrolled in the course below.
      Start learning at your own pace and track your progress as you go.
    </p>
    <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:16px 20px;margin:20px 0;">
      {_info_row("Course", course.title)}
      {_info_row("Category", course.category.name if course.category else "—")}
      {_info_row("Instructor", course.mentor.get_full_name() or course.mentor.username)}
      {_info_row("Price Paid", f"${course.price}")}
    </div>
    {_btn("Go to My Course", f"{SITE_URL}/courses/{course.id}")}
    """
    text = f"Hi {student.username}, you have enrolled in '{course.title}'. Visit {SITE_URL}/courses/{course.id}"
    html = _base_template(f"Enrolled in \"{course.title}\"! 🚀", "Your enrollment is confirmed.", body_html)
    _send_async(subject, text, html, [student.email])


# ---------------------------------------------------------------------------
# 3. Mentor Notification — sent to mentor when a student enrolls
# ---------------------------------------------------------------------------
def send_mentor_enrollment_notification_email(enrollment):
    mentor = enrollment.course.mentor
    student = enrollment.student
    course = enrollment.course
    if not mentor.email:
        return
    subject = f"New student enrolled in \"{course.title}\""
    body_html = f"""
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">{mentor.get_full_name() or mentor.username}</strong>,<br><br>
      A new student has just enrolled in your course. Keep up the great work! 🎉
    </p>
    <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px 20px;margin:20px 0;">
      {_info_row("Student", student.get_full_name() or student.username)}
      {_info_row("Course", course.title)}
      {_info_row("Enrolled At", enrollment.enrolled_at.strftime('%d %b %Y, %I:%M %p'))}
    </div>
    {_btn("View My Course", f"{SITE_URL}/courses/{course.id}")}
    """
    text = f"Hi {mentor.username}, {student.username} just enrolled in '{course.title}'."
    html = _base_template("New Student Enrolled! 🎉", "Your course is growing.", body_html)
    _send_async(subject, text, html, [mentor.email])


# ---------------------------------------------------------------------------
# 4. New Lesson Available — sent to enrolled students when mentor adds a lesson
# ---------------------------------------------------------------------------
def send_new_lesson_email(lesson, student):
    course = lesson.module.course
    if not student.email:
        return
    subject = f"New lesson added to \"{course.title}\""
    body_html = f"""
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">{student.get_full_name() or student.username}</strong>,<br><br>
      Your instructor just published a new lesson. Jump in and keep the momentum going!
    </p>
    <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:16px 20px;margin:20px 0;">
      {_info_row("Lesson", lesson.title)}
      {_info_row("Module", lesson.module.title)}
      {_info_row("Course", course.title)}
    </div>
    {_btn("Start Lesson", f"{SITE_URL}/courses/{course.id}")}
    """
    text = f"Hi {student.username}, a new lesson '{lesson.title}' was added to '{course.title}'."
    html = _base_template("New Lesson Available! 📚", "New content is waiting for you.", body_html)
    _send_async(subject, text, html, [student.email])


# ---------------------------------------------------------------------------
# 5. Course Published — sent to mentor when their course goes live
# ---------------------------------------------------------------------------
def send_course_published_email(course):
    mentor = course.mentor
    if not mentor.email:
        return
    subject = f"Your course \"{course.title}\" is now live!"
    body_html = f"""
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">{mentor.get_full_name() or mentor.username}</strong>,<br><br>
      Congratulations! 🎊 Your course is published and students can now find and enroll in it.
    </p>
    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px 20px;margin:20px 0;">
      {_info_row("Course", course.title)}
      {_info_row("Category", course.category.name if course.category else "—")}
      {_info_row("Price", f"${course.price}")}
    </div>
    <p style="color:#94a3b8;font-size:13px;margin:20px 0 0;">
      Share your course link with your network to get your first students!
    </p>
    {_btn("View Published Course", f"{SITE_URL}/courses/{course.id}")}
    """
    text = f"Hi {mentor.username}, your course '{course.title}' is now published. Visit {SITE_URL}/courses/{course.id}"
    html = _base_template("Your Course is Live! 🎊", "Students can now discover and enroll.", body_html)
    _send_async(subject, text, html, [mentor.email])


# ---------------------------------------------------------------------------
# 6. Quiz Passed — sent to student when they pass an assessment
# ---------------------------------------------------------------------------
def send_quiz_passed_email(attempt):
    student = attempt.student
    quiz = attempt.quiz
    lesson = quiz.lesson
    course = lesson.module.course
    if not student.email:
        return
    score_pct = int(attempt.score)
    subject = f"Assessment Passed: \"{quiz.title}\" — {score_pct}%"
    body_html = f"""
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">{student.get_full_name() or student.username}</strong>,<br><br>
      You passed the assessment! Outstanding work. 🏆
    </p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;width:80px;height:80px;line-height:80px;">
        <span style="color:#fff;font-size:28px;font-weight:700;">{score_pct}%</span>
      </div>
    </div>
    <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px 20px;margin:20px 0;">
      {_info_row("Assessment", quiz.title)}
      {_info_row("Your Score", f"{score_pct}%")}
      {_info_row("Passing Score", f"{int(quiz.passing_score)}%")}
      {_info_row("Lesson", lesson.title)}
      {_info_row("Course", course.title)}
    </div>
    {_btn("Continue Learning", f"{SITE_URL}/courses/{course.id}")}
    """
    text = f"Hi {student.username}, you passed '{quiz.title}' with {score_pct}%! Keep going."
    html = _base_template("Assessment Passed! 🏆", f"You scored {score_pct}% — great work!", body_html)
    _send_async(subject, text, html, [student.email])


# ---------------------------------------------------------------------------
# 7. Mentor Application Status — sent when admin approves/rejects application
# ---------------------------------------------------------------------------
def send_mentor_application_status_email(application):
    user = application.user
    if not user.email:
        return
    status = application.status
    if status == 'approved':
        subject = "Mentor Application Approved! 🎓"
        badge_color = "#10b981"
        status_label = "Approved ✅"
        message = "Congratulations! Your application to become a mentor on Innovature LMS has been approved. You can now create and publish courses for students worldwide."
        cta_text = "Start Creating Courses"
        cta_url = f"{SITE_URL}/"
    elif status == 'rejected':
        subject = "Mentor Application Update"
        badge_color = "#ef4444"
        status_label = "Not Approved ❌"
        message = "Thank you for your interest in becoming a mentor on Innovature LMS. Unfortunately, your application was not approved at this time. You are welcome to reapply in the future."
        cta_text = "Visit Platform"
        cta_url = f"{SITE_URL}/"
    else:
        return

    body_html = f"""
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">{user.get_full_name() or user.username}</strong>,
    </p>
    <div style="text-align:center;margin:20px 0;">
      <span style="display:inline-block;background:{badge_color};color:#fff;padding:6px 20px;border-radius:20px;font-size:13px;font-weight:700;">{status_label}</span>
    </div>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px;">{message}</p>
    {_btn(cta_text, cta_url)}
    """
    text = f"Hi {user.username}, your mentor application status: {status}."
    html = _base_template(subject, "Update on your mentor application.", body_html)
    _send_async(subject, text, html, [user.email])
