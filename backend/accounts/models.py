from datetime import timedelta
import random

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", "Admin")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Single auth table for all portal users.
    employee_id is auto-generated for internal employees (EMP00001, EMP00002...).
    Candidates have employee_id = null.
    """

    class Role(models.TextChoices):
        CANDIDATE    = "Candidate",   "Candidate"
        TEAM_MEMBER  = "TeamMember",  "Team Member"
        TEAM_LEADER  = "TeamLeader",  "Team Leader"
        HR_MANAGER   = "HRManager",   "HR Manager"
        ADMIN        = "Admin",       "Admin"

    class CurrencyPreference(models.TextChoices):
        EGP = "EGP", "Egyptian Pound"
        USD = "USD", "US Dollar"

    class LanguagePreference(models.TextChoices):
        EN = "en", "English"
        AR = "ar", "Arabic"

    class ThemePreference(models.TextChoices):
        COMFORT = "comfort", "Comfort"
        COMPACT = "compact", "Compact"

    employee = models.OneToOneField(
        'employee_management.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_account',
        db_column='fk_employee_id'
    )

    email       = models.EmailField(unique=True)
    full_name   = models.CharField(max_length=150, blank=True)
    role        = models.CharField(max_length=20, choices=Role.choices)

    currency_preference = models.CharField(
        max_length=3,
        choices=CurrencyPreference.choices,
        
        
        default=CurrencyPreference.EGP,
    )
    language_preference = models.CharField(
        max_length=2,
        choices=LanguagePreference.choices,
        default=LanguagePreference.EN,
    )
    theme_preference = models.CharField(
        max_length=10,
        choices=ThemePreference.choices,
        default=ThemePreference.COMFORT,
    )
    focus_mode_preference = models.BooleanField(default=False)

    is_active   = models.BooleanField(default=True)
    is_staff    = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["role"]

    class Meta:
        db_table = "auth_user"

    def __str__(self):
        return f"{self.email} ({self.role})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.role != self.Role.CANDIDATE and not self.employee_id:
            from employee_management.models import Employee, generate_employee_id
            employee = Employee.objects.create(
                employeeID=generate_employee_id(),
                fullName=self.full_name or '',
            )
            User.objects.filter(pk=self.pk).update(employee=employee)
            self.employee = employee

    @property
    def is_candidate(self):
        return self.role == self.Role.CANDIDATE

    @property
    def is_employee(self):
        return self.role != self.Role.CANDIDATE

    @property
    def employee_currency_preference(self):
        return self.currency_preference or self.CurrencyPreference.EGP


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_otps')
    code = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'auth_password_reset_otp'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} — {self.code}"

    @classmethod
    def issue_for_user(cls, user):
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        code = f"{random.randint(0, 999999):06d}"
        return cls.objects.create(
            user=user,
            code=code,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at
