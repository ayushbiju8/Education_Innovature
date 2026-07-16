from django.contrib import admin
from .models import Certificate

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_code', 'enrollment', 'issued_at')
    search_fields = ('certificate_code', 'enrollment__student__username', 'enrollment__course__title')

