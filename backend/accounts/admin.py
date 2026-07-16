from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, MentorApplication

class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Information', {'fields': ('role', 'phone_number', 'bio', 'avatar')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profile Information', {
            'classes': ('wide',),
            'fields': ('role', 'phone_number', 'bio', 'avatar'),
        }),
    )
    list_display = ['username', 'email', 'role', 'phone_number', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active']
    search_fields = ['username', 'email', 'phone_number']
    ordering = ['username']

admin.site.register(User, CustomUserAdmin)

@admin.register(MentorApplication)
class MentorApplicationAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'applied_at', 'reviewed_at')
    list_filter = ('status', 'applied_at')
    search_fields = ('user__username', 'user__email', 'bio')
    ordering = ('-applied_at',)


