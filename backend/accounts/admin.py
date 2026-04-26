from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User


class EmployeeCreationForm(UserCreationForm):
    class Meta:
        model  = User
        # employee_id intentionally excluded — auto-generated on save
        fields = ("email", "role")


class EmployeeChangeForm(UserChangeForm):
    class Meta:
        model  = User
        fields = (
            "email",
            "role",
            "employee",
            "currency_preference",
            "language_preference",
            "theme_preference",
            "focus_mode_preference",
            "is_active",
        )


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form     = EmployeeChangeForm
    add_form = EmployeeCreationForm

    list_display  = [
        "email",
        "full_name",
        "role",
        "employee_id",
        "currency_preference",
        "language_preference",
        "theme_preference",
        "focus_mode_preference",
        "is_active",
        "created_at",
    ]
    list_filter   = ["role", "is_active"]
    search_fields = ["email", "employee__fullName", "employee__employeeID"]
    ordering      = ["-created_at"]
    readonly_fields = ("employee_id", "full_name")

    fieldsets = (
        (None,            {"fields": ("email", "password")}),
        (
            "Personal info",
            {"fields": (
                "full_name",
                "role",
                "employee",
                "employee_id",
                "currency_preference",
                "language_preference",
                "theme_preference",
                "focus_mode_preference",
            )},
        ),
        ("Permissions",   {"fields": ("is_active", "is_staff", "is_superuser")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            # employee_id is not included in the add form; it is derived from the linked Employee.
            "fields":  ("email", "role", "password1", "password2"),
        }),
    )
