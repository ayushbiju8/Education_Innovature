from django.contrib import admin
from .models import Payment, Refund

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'enrollment', 'amount', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('transaction_id', 'enrollment__student__username', 'enrollment__course__title')

@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ('payment', 'amount', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('payment__transaction_id', 'reason')

