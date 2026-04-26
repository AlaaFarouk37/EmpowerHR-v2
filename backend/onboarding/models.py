import uuid
from django.db import models

from employee_management.models import Employee


def gen_id():
    return uuid.uuid4().hex[:20]


class OnboardingPlan(models.Model):
    PLAN_TYPE_CHOICES = [
        ('Onboarding', 'Onboarding'),
        ('Offboarding', 'Offboarding'),
        ('Transition', 'Transition'),
    ]
    STATUS_CHOICES = [
        ('Not Started', 'Not Started'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Blocked', 'Blocked'),
    ]

    planID          = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee        = models.ForeignKey(
                        Employee, on_delete=models.CASCADE,
                        db_column='employeeID', related_name='onboarding_plans')
    planType        = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default='Onboarding')
    title           = models.CharField(max_length=160)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Not Started')
    progress        = models.PositiveIntegerField(default=0)
    startDate       = models.DateField(null=True, blank=True)
    targetDate      = models.DateField(null=True, blank=True)
    checklistItems  = models.JSONField(default=list, blank=True)
    notes           = models.TextField(blank=True)
    employeeNote    = models.TextField(blank=True)
    createdBy       = models.CharField(max_length=150, blank=True)
    createdAt       = models.DateTimeField(auto_now_add=True)
    updatedAt       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'OnboardingPlan'
        ordering = ['targetDate', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.title}"
