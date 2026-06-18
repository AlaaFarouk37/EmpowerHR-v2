from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Category(models.TextChoices):
        APPROVAL = 'approval', 'Approval'
        PAYROLL = 'payroll', 'Payroll'
        SYSTEM = 'system', 'System'
        AI = 'ai', 'AI'
        GENERAL = 'general', 'General'

    class Level(models.TextChoices):
        INFO = 'info', 'Info'
        SUCCESS = 'success', 'Success'
        WARNING = 'warning', 'Warning'
        DANGER = 'danger', 'Danger'
        GENERAL = 'general', 'General'

    recipient  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    title      = models.CharField(max_length=200)
    message    = models.TextField(blank=True)
    category   = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    level      = models.CharField(max_length=20, choices=Level.choices, default=Level.INFO)
    link       = models.CharField(max_length=300, blank=True)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['recipient', 'is_read'])]

    def __str__(self):
        return f"{self.recipient_id}: {self.title}"
