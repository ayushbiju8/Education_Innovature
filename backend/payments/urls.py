from django.urls import path
from .views import CreateOrderAPIView, VerifyPaymentAPIView, PaymentHistoryAPIView, RefundAPIView

urlpatterns = [
    path('payments/create-order/', CreateOrderAPIView.as_view(), name='create-order'),
    path('payments/verify/', VerifyPaymentAPIView.as_view(), name='verify-payment'),
    path('payments/history/', PaymentHistoryAPIView.as_view(), name='payment-history'),
    path('payments/<int:pk>/refund/', RefundAPIView.as_view(), name='refund-payment'),
]
