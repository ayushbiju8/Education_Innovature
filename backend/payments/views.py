from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Payment, Refund
from .serializers import CreateOrderSerializer, VerifyPaymentSerializer, PaymentSerializer, RefundSerializer
from .services import create_razorpay_order, verify_razorpay_payment
from courses.models import Course
from enrollments.models import Enrollment
from accounts.permissions import IsStudent

class CreateOrderAPIView(APIView):
    """
    POST /api/payments/create-order/
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if serializer.is_valid():
            course_id = serializer.validated_data['course_id']
            course = get_object_or_404(Course, pk=course_id, is_published=True)
            
            if Enrollment.objects.filter(student=request.user, course=course).exists():
                return Response({"detail": "Already enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                order_details = create_razorpay_order(course, request.user)
                if order_details.get('is_free'):
                    # Immediately enroll since it's free
                    Enrollment.objects.create(student=request.user, course=course)
                    return Response(order_details, status=status.HTTP_201_CREATED)
                    
                return Response(order_details, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyPaymentAPIView(APIView):
    """
    POST /api/payments/verify/
    """
    permission_classes = [IsAuthenticated, IsStudent]

    def post(self, request):
        serializer = VerifyPaymentSerializer(data=request.data)
        if serializer.is_valid():
            try:
                payment = verify_razorpay_payment(
                    order_id=serializer.validated_data['razorpay_order_id'],
                    payment_id=serializer.validated_data['razorpay_payment_id'],
                    signature=serializer.validated_data['razorpay_signature']
                )
                return Response({"detail": "Payment verified and enrollment created."}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PaymentHistoryAPIView(generics.ListAPIView):
    """
    GET /api/payments/history/
    """
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return Payment.objects.filter(student=self.request.user, status='completed').order_by('-created_at')

class RefundAPIView(APIView):
    """
    POST /api/payments/{id}/refund/
    Admin only
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if getattr(request.user, 'role', '') != 'admin' and not request.user.is_staff:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
            
        payment = get_object_or_404(Payment, pk=pk)
        
        if hasattr(payment, 'refund'):
            return Response({"detail": "Refund already processed."}, status=status.HTTP_400_BAD_REQUEST)
            
        Refund.objects.create(payment=payment, amount=payment.amount, reason="Admin requested refund", status="completed")
        payment.status = 'refunded'
        payment.save()
        
        return Response({"detail": "Refund processed."}, status=status.HTTP_200_OK)
