from django.db import models
import uuid

from employee_management.models import Employee

def gen_id():
    return uuid.uuid4().hex[:20]

class AttendanceRecord(models.Model):
    STATUS_CLOCKED_IN = 'Clocked In'
    STATUS_PRESENT = 'Present'
    STATUS_PARTIAL = 'Partial'
    STATUS_CHOICES = [
        (STATUS_CLOCKED_IN, 'Clocked In'),
        (STATUS_PRESENT, 'Present'),
        (STATUS_PARTIAL, 'Partial'),
    ]

    OT_STANDARD = 'STANDARD'
    OT_AUTO_APPROVED = 'AUTO_APPROVED'
    OT_PENDING_REVIEW = 'PENDING_REVIEW'
    OT_REJECTED = 'REJECTED'
    OVERTIME_STATUS_CHOICES = [
        (OT_STANDARD, 'Standard'),
        (OT_AUTO_APPROVED, 'Auto-Approved'),
        (OT_PENDING_REVIEW, 'Pending Review'),
        (OT_REJECTED, 'Rejected'),
    ]

    attendanceID         = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee             = models.ForeignKey(
                               'employee_management.Employee', on_delete=models.CASCADE,
                               db_column='employeeID', related_name='attendance_records')
    date                 = models.DateField()
    clockIn              = models.DateTimeField(null=True, blank=True)
    clockOut             = models.DateTimeField(null=True, blank=True)
    workedHours          = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    overtimeHours        = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    overtimeStatus       = models.CharField(max_length=20, choices=OVERTIME_STATUS_CHOICES,
                                            default=OT_STANDARD)
    overtimeReviewedBy   = models.CharField(max_length=150, blank=True)
    overtimeReviewedAt   = models.DateTimeField(null=True, blank=True)
    overtimeReviewNote   = models.TextField(blank=True)
    status               = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_CLOCKED_IN)
    notes                = models.TextField(blank=True)
    createdAt            = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'AttendanceRecord'
        ordering = ['-date', '-clockIn']
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.fullName} — {self.date}"


class LeaveRequest(models.Model):
    TYPE_ANNUAL = 'Annual'
    TYPE_SICK = 'Sick'
    TYPE_UNPAID = 'Unpaid'
    TYPE_CASUAL = 'Casual'
    LEAVE_TYPES = [
        (TYPE_ANNUAL, 'Annual'),
        (TYPE_SICK, 'Sick'),
        (TYPE_UNPAID, 'Unpaid'),
        (TYPE_CASUAL, 'Casual'),
    ]

    STATUS_PENDING = 'Pending'
    STATUS_APPROVED = 'Approved'
    STATUS_REJECTED = 'Rejected'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    ]

    leaveRequestID     = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee           = models.ForeignKey(
                             'employee_management.Employee', on_delete=models.CASCADE,
                             db_column='employeeID', related_name='leave_requests')
    leaveType          = models.CharField(max_length=20, choices=LEAVE_TYPES)
    startDate          = models.DateField()
    endDate            = models.DateField()
    daysRequested      = models.IntegerField(default=1)
    reason             = models.TextField()
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    eligibilityMessage = models.CharField(max_length=255, blank=True)
    reviewNotes        = models.TextField(blank=True)
    reviewedBy         = models.CharField(max_length=150, blank=True)
    reviewedAt         = models.DateTimeField(null=True, blank=True)
    requestedAt        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'LeaveRequest'
        ordering = ['-requestedAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.leaveType} ({self.status})"
    
    
