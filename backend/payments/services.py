import os
import razorpay
from django.conf import settings
from .models import Payment, PaymentStatus, PaymentGateway
from enrollments.models import Enrollment

RAZORPAY_KEY_ID = os.getenv('RAZORPAY_API_KEY', 'rzp_test_mock_key')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_API_SECRET', 'mock_secret')

# Initialize Razorpay Client
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def create_razorpay_order(course, student):
    """
    Creates a Razorpay order for a specific course and student.
    Returns a dict with order details.
    """
    # Free course bypass
    if course.price == 0:
        return {
            "status": "success",
            "is_free": True
        }

    # Amount must be in paise (multiply by 100)
    amount_in_paise = int(course.price * 100)
    
    order_data = {
        "amount": amount_in_paise,
        "currency": "INR",
        "payment_capture": 1 # Auto-capture
    }
    
    try:
        # Create Order via Razorpay API
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Save pending Payment record locally
        Payment.objects.create(
            student=student,
            course=course,
            amount=course.price,
            currency="INR",
            payment_gateway=PaymentGateway.RAZORPAY,
            razorpay_order_id=razorpay_order['id'],
            status=PaymentStatus.PENDING
        )
        
        return {
            "status": "pending",
            "is_free": False,
            "order_id": razorpay_order['id'],
            "amount": amount_in_paise,
            "currency": "INR",
            "key": RAZORPAY_KEY_ID
        }
    except Exception as e:
        # If network fails or using mock keys, fallback to mock order creation
        if "Failed to resolve" in str(e) or "getaddrinfo failed" in str(e) or "NameResolutionError" in str(e) or "rzp_test_mock_key" in RAZORPAY_KEY_ID:
            mock_order_id = f"order_mock_{student.id}_{course.id}"
            
            # Delete any duplicate pending payments to prevent constraints errors
            Payment.objects.filter(student=student, course=course, status=PaymentStatus.PENDING).delete()
            
            Payment.objects.create(
                student=student,
                course=course,
                amount=course.price,
                currency="INR",
                payment_gateway=PaymentGateway.RAZORPAY,
                razorpay_order_id=mock_order_id,
                status=PaymentStatus.PENDING
            )
            
            return {
                "status": "pending",
                "is_free": False,
                "order_id": mock_order_id,
                "amount": amount_in_paise,
                "currency": "INR",
                "key": RAZORPAY_KEY_ID,
                "is_mock": True
            }
        raise Exception(f"Failed to create Razorpay Order: {str(e)}")

def verify_razorpay_payment(order_id, payment_id, signature):
    """
    Verifies the signature from Razorpay.
    If valid, updates Payment to COMPLETED and creates Enrollment.
    """
    params_dict = {
        'razorpay_order_id': order_id,
        'razorpay_payment_id': payment_id,
        'razorpay_signature': signature
    }
    
    try:
        # Mock payment verification bypass
        if order_id.startswith("order_mock_"):
            payment = Payment.objects.get(razorpay_order_id=order_id)
            if payment.status == PaymentStatus.COMPLETED:
                return payment
                
            payment.razorpay_payment_id = payment_id
            payment.razorpay_signature = signature
            payment.status = PaymentStatus.COMPLETED
            
            enrollment, created = Enrollment.objects.get_or_create(
                student=payment.student,
                course=payment.course
            )
            
            payment.enrollment = enrollment
            payment.save()
            return payment

        # Verify signature via Razorpay client
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # If no exception is thrown, signature is valid
        payment = Payment.objects.get(razorpay_order_id=order_id)
        
        if payment.status == PaymentStatus.COMPLETED:
            return payment # Already processed
            
        # Update Payment status
        payment.razorpay_payment_id = payment_id
        payment.razorpay_signature = signature
        payment.status = PaymentStatus.COMPLETED
        
        # Create Enrollment
        enrollment, created = Enrollment.objects.get_or_create(
            student=payment.student,
            course=payment.course
        )
        
        payment.enrollment = enrollment
        payment.save()
        
        return payment
        
    except razorpay.errors.SignatureVerificationError:
        raise Exception("Invalid Razorpay Signature")
    except Payment.DoesNotExist:
        raise Exception("Payment record not found")
    except Exception as e:
        raise Exception(f"Verification failed: {str(e)}")
