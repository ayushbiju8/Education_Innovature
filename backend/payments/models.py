from django.db import models
from django.conf import settings
from enrollments.models import Enrollment
from courses.models import Course

class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    REFUNDED = 'refunded', 'Refunded'

class PaymentGateway(models.TextChoices):
    RAZORPAY = 'razorpay', 'Razorpay'

class Payment(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='payments', null=True)
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name='payments', null=True)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    
    payment_gateway = models.CharField(max_length=20, choices=PaymentGateway.choices, default=PaymentGateway.RAZORPAY)
    razorpay_order_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=255, null=True, blank=True)
    
    # Keeping transaction_id for generic reference (optional, could map to razorpay_payment_id)
    transaction_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    
    status = models.CharField(max_length=15, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.razorpay_order_id or self.transaction_id} - {self.status}"

class Refund(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.PROTECT, related_name='refund')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=15, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Refund for {self.payment.id} - {self.status}"
