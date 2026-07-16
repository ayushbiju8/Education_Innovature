Admin Account
Username: admin
Password: @Bahubali2
Mentor Account 1
Username: mentor_john
Password: password123
Details: Successfully created a demo course titled "Course by John" containing 1 Module and 1 Lesson.
Mentor Account 2
Username: mentor_jane
Password: password123
Details: Successfully created a demo course titled "Course by Jane" containing 1 Module and 1 Lesson



# Innovature E-Learning Platform Backend

This is the Django-based REST API backend for the Innovature E-Learning platform. It features PostgreSQL integration, JWT authentication, CORS configuration, and a fully designed modular database schema.

---

## Step 1: Backend Foundation & Database Schema Setup

In this step, we built the core backend configuration and mapped out the database schema across 8 modular Django apps.

### What We Created

1. **Core Settings & Security**
   - Configured environment variable support (`python-dotenv`) using [.env](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/.env) to protect secrets.
   - Set up **Django REST Framework (DRF)** using **SimpleJWT** for token-based authentication by default.
   - Configured **CORS headers** (`django-cors-headers`) to allow requests from frontend development servers (running on ports `3000` or `5173`).
   - Connected the system to a local **PostgreSQL** database named `innovature_db`.

2. **Accounts & Custom User Model (`accounts/`)**
   - Designed a custom [User](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/accounts/models.py#L9) model supporting three roles: `Student`, `Mentor`, and `Admin`.
   - Added user profile fields: `phone_number`, `bio`, and `avatar` (which automatically utilizes `Pillow` for image validation).
   - Superusers are automatically assigned the `Admin` role upon creation.

3. **Courses Catalog Schema (`courses/`)**
   - [Category](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/courses/models.py#L4): Organizes courses under subjects.
   - [Course](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/courses/models.py#L14): Central content entity linked to a Mentor and a Category. Includes price and publish toggles.
   - [Module](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/courses/models.py#L33) & [Lesson](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/courses/models.py#L43): Creates hierarchical chapters and pages.
   - [Attachment](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/courses/models.py#L55) & [Tag](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/courses/models.py#L26): Handles lesson material files and course taxonomies.

4. **Student Progress & Life-Cycle Schema**
   - [Enrollment](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/enrollments/models.py#L5) (`enrollments/`): Maps a Student to a Course with unique guards to prevent double-enrollment.
   - [LessonProgress](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/enrollments/models.py#L16) (`enrollments/`): Tracks completion of lessons.
   - [Certificate](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/certificates/models.py#L4) (`certificates/`): Generates completion records once courses are fully consumed.

5. **Ecosystem & Financials Schema**
   - [Payment](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/payments/models.py#L10) & [Refund](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/payments/models.py#L19) (`payments/`): Logs purchases and audit records with cascade protections.
   - [Review](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/reviews/models.py#L6) & [ReportAbuse](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/reviews/models.py#L17) (`reviews/`): Enables course rating constraints (1-5 stars) and moderation flows.
   - [Room](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/chat/models.py#L5), [Question](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/chat/models.py#L12), & [Answer](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/chat/models.py#L21) (`chat/`): Course Q&A rooms and discussions.
   - [Notification](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/notifications/models.py#L4) (`notifications/`): System-wide user alerts.

6. **Admin Dashboard Registration**
   - Registered all models in their respective `admin.py` files with tailored list filters, search capabilities, and editable fields for clean back-office moderation.

7. **Database Migrations & Tests**
   - Migrated all structures cleanly into PostgreSQL.
   - Added unit test cases for user roles, course hierarchies, and enrollment constraints (resulting in **10 tests successfully passing**).

---

## Step 2: Accounts App (Authentication & Roles Flow)

In this step, we implemented the REST API endpoints for user authentication, profile updates, and the admin-approved student-to-mentor role progression.

### What We Created

1. **Authentication API Endpoints**
   - `POST /api/auth/register/`: Registers a user. Includes strict validation rules:
     - **Username**: Must be alphanumeric and unique.
     - **Email**: Must be a valid, unique email address.
     - **Password**: Must be at least 8 characters long.
     - **Role**: Automatically defaults to `student` (payload requests for `mentor` or `admin` are discarded to prevent self-elevation).
   - `POST /api/auth/login/`: Validates credentials and returns JWT access and refresh tokens.
   - `POST /api/auth/refresh/`: Yields a new JWT access token using a valid refresh token.
   - `POST /api/auth/logout/`: Securely invalidates sessions by blacklisting the active refresh token.
   - `GET /api/auth/profile/` & `PUT /api/auth/profile/`: Retrieves and partially updates profile information (first/last names, email, phone number, bio, avatar) for authenticated users.

2. **Mentor Application Progression Flow**
   - **Student Application**: Authenticated students submit a bio explaining their qualifications via `POST /api/auth/mentor-apply/` to create a `MentorApplication` with status `pending`.
   - **Admin Management**: Admins can inspect active applications via `GET /api/auth/admin/mentor-applications/` and approve/reject them via `POST /api/auth/admin/mentor-applications/<pk>/decide/` (with body `{"status": "approved"}`).
   - **Automatic Upgrades**: When an application is approved, the custom model's `save()` handler automatically upgrades the associated user's role from `student` to `mentor`.

3. **Custom Permissions & Authorization**
   - Implemented reusable permissions inside [permissions.py](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/accounts/permissions.py) to guard views:
     - `IsStudent`: Allows access only to authenticated students.
     - `IsMentor`: Allows access only to authenticated mentors.
     - `IsAdmin`: Allows access only to authenticated admin users (or superusers).

4. **Error Logging & Diagnostics**
   - Configured robust Python `logging` inside `views.py` and `serializers.py` to write clean diagnostic records (success audits, invalid parameters warnings, error logs) to monitor backend activity.

5. **Unit Tests Expansion**
   - Wrote REST API integration test cases in [tests.py](file:///c:/Users/hp/Desktop/InnovatureFinalProject/backend/accounts/tests.py) checking token delivery, registration constraints, profile updates, and role promotions, raising the passing test suite to **16 unit tests**.

6. **Postman Collection Integration**
   - Created [innovature_auth_postman_collection.json](file:///c:/Users/hp/Desktop/InnovatureFinalProject/innovature_auth_postman_collection.json) containing 10 pre-configured requests (Registration, Login, Profile GET/PUT, Mentor Application, Admin List/Approval, Token Refresh, and Logout).
   - Configured scripts to automatically capture JWT keys and authenticate subsequently, streamlining manual validation.

---

## Step 3: Course Management (Sprint 2)

In this step, we built the core CRUD operations for mentors and admins to create and manage courses.

### What We Created

1. **Course Structure API Endpoints**
   - **Categories & Tags**: `GET /api/categories/`, `POST /api/categories/`, etc. (Admin only for modifications).
   - **Courses**: `GET /api/courses/`, `POST /api/courses/`. Mentors can create courses, update their own courses, and delete them.
   - **Modules & Lessons**: Hierarchical course structures with endpoints like `POST /api/courses/{id}/modules/` and `POST /api/modules/{id}/lessons/`.
   - **Attachments**: `POST /api/lessons/{id}/attachments/`. We utilize DRF's `MultiPartParser` and `FormParser` to allow file uploads (PDFs, Videos, etc.) directly into the lesson resources.

2. **Object-Level Permissions**
   - Implemented `IsCourseOwnerOrAdmin` custom permission. This ensures that while any student can *view* published course details, only the **exact Mentor** who created the course is allowed to add modules, edit lessons, or attach files to it.

---

## Step 4: Learning Management System (Sprint 3)

In this step, we built the student-facing side of the platform, locking down course progression, enforcing data integrity, and computing user progress.

### What We Created

1. **Hardened Validation**
   - Modified `courses/serializers.py` to enforce strict business rules: Module titles cannot be empty, Lesson content is required, and Order indexes must be uniquely sequenced per parent.
   - Added file validation for attachments enforcing a **50MB limit** and restricting uploads to `.mp4, .pdf, .doc, .docx, .zip` formats.

2. **Enrollment System**
   - **Endpoints**: `POST /api/courses/{id}/enroll/`, `GET /api/my-courses/`, and `DELETE /api/enrollments/{id}/`.
   - **Security**: Bound to the `IsStudent` permission. Additional logic guarantees that a student cannot enroll in an unpublished course, nor can they enroll in the same course twice.

3. **Progress Tracking**
   - **Endpoint**: `POST /api/lessons/{id}/complete/` marks a lesson as completed for the authenticated student, strictly ensuring they are actively enrolled in the parent course.
   - **Endpoint**: `GET /api/courses/{id}/progress/` computes real-time course metrics, returning JSON payloads containing `completed_lessons`, `total_lessons`, and the percentage of `progress`.

4. **Postman & Demo Automation**
   - Added exhaustive test cases for the entire LMS to the `innovature_auth_postman_collection.json` file.
   - Built a Python script (`create_demo_data.py`) to auto-provision Admin and Mentor roles, prepopulating the database with active dummy courses and structured lesson materials for rapid frontend testing.

---

## Step 5: Engagement, Notifications, and Search (Sprints 4-7)

We added robust engagement and utility features to flesh out the learning experience.

1. **Reviews System (Sprint 4)**
   - Only enrolled students can review a course. Mentors cannot review their own. Ratings are constrained to 1-5.
   - Endpoints: `POST /api/courses/{id}/reviews/`, `PUT /api/reviews/{id}/`, etc.

2. **Notifications (Sprint 5)**
   - Used Django Signals (`post_save`) to automate database alerts for new enrollments (mentor gets notified), new lessons (students get notified), and course publishing.

3. **Certificates (Sprint 6)**
   - Integrated into the `MarkLessonCompleteAPIView`. The exact moment a student hits 100% completion on a course, the system automatically mints a unique `Certificate` record containing an issue date and a verifiable ID.

4. **Search & Filtering (Sprint 7)**
   - Deployed `django-filter` natively into `CourseViewSet`.
   - Allows powerful queries via URL parameters like `?search=react`, `?price__lt=50`, `?category=1`, and `?ordering=-price`.

---

## Step 6: Razorpay Payment Integration (Sprint 8)

We pivoted to an Indian production-grade architecture using **Razorpay** to support UPI, Cards, and NetBanking.

1. **Architecture & Service Layer**
   - Built a dedicated `payments/services.py` layer to fully encapsulate the Razorpay SDK.
   - Modified the `Payment` model to link directly to `student` and `course` (supporting a "Pending" state securely before enrollment is confirmed).

2. **Endpoints & Flow**
   - **`POST /api/payments/create-order/`**: Safely generates a unique Razorpay Order ID. Includes a complete bypass for "Free" courses, granting instant enrollment without triggering the payment gateway.
   - **`POST /api/payments/verify/`**: The frontend sends back the `razorpay_signature`. The backend cryptographically verifies the signature, and if authentic, transitions the payment to `Completed` and spins up the student's `Enrollment`.
   - **`GET /api/payments/history/`**: Provides the student a complete list of their purchase receipts.
   - **`POST /api/payments/{id}/refund/`**: Admin capability for reversing transactions.

---
### How to Run and Test Locally

#### 1. Setup Environment
Navigate to the backend directory and activate the virtual environment:
```powershell
cd backend
.venv\Scripts\Activate.ps1
```

#### 2. Run the Development Server
```bash
python manage.py runserver
```
*Access endpoints at `http://127.0.0.1:8000/`. Django Admin is available at `http://127.0.0.1:8000/admin/` (Login with Username: `admin`, Password: `@Bahubali2`).*

#### 3. Run the Test Suite
```bash
python manage.py test
```
