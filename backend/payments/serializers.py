from rest_framework import serializers
from .models import Payment, Refund

class CreateOrderSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()

class VerifyPaymentSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField(max_length=255)
    razorpay_payment_id = serializers.CharField(max_length=255)
    razorpay_signature = serializers.CharField(max_length=255)

class PaymentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'course_title', 'amount', 'currency', 'status', 'created_at']

class RefundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Refund
        fields = ['id', 'amount', 'reason', 'status', 'created_at']
