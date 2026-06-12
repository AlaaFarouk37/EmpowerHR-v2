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
    leaveType          = models.ForeignKey(
                             'employee_management.LeaveType', on_delete=models.PROTECT,
                             db_column='leave_type_id', related_name='leave_requests')
    startDate          = models.DateField()
    endDate            = models.DateField()
    daysRequested      = models.IntegerField(default=1)
    reason             = models.TextField()
    document           = models.FileField(upload_to='leave_documents/', null=True, blank=True,
                             help_text="Optional supporting document (e.g. medical note).")
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


class HolidayOverride(models.Model):
    """HR-managed adjustments to the holidays library: 'add' marks a company /
    ad-hoc day off the library doesn't know, 'remove' cancels a library day that
    doesn't apply. One override per date; 'remove' wins over the library."""
    TYPE_ADD = 'add'
    TYPE_REMOVE = 'remove'
    TYPE_CHOICES = [
        (TYPE_ADD, 'Add'),
        (TYPE_REMOVE, 'Remove'),
    ]

    overrideID = models.CharField(max_length=50, primary_key=True, default=gen_id)
    date       = models.DateField(unique=True)
    name       = models.CharField(max_length=150, blank=True)
    type       = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_ADD)
    createdBy  = models.CharField(max_length=150, blank=True)
    createdAt  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'HolidayOverride'
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} — {self.type} ({self.name})"


class LeaveBalance(models.Model):
    """Per employee / leave type / year balance. ``entitledDays`` is the cap
    (annual leave uses the Egyptian Labor Law entitlement; other types use the
    LeaveType max; None means uncapped, e.g. Unpaid). ``usedDays`` grows when a
    request is approved. Keyed by leaveTypeName so the CharField on LeaveRequest
    stays the source of truth (leaveType FK is the matching config row if any)."""
    balanceID     = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee      = models.ForeignKey(
                        'employee_management.Employee', on_delete=models.CASCADE,
                        db_column='employeeID', related_name='leave_balances')
    leaveTypeName = models.CharField(max_length=50)
    leaveType     = models.ForeignKey(
                        'employee_management.LeaveType', on_delete=models.SET_NULL,
                        null=True, blank=True, db_column='leave_type_id',
                        related_name='leave_balances')
    year          = models.PositiveIntegerField()
    entitledDays  = models.PositiveIntegerField(null=True, blank=True,
                        help_text="Max days for the year; None = uncapped (Unpaid).")
    usedDays      = models.PositiveIntegerField(default=0)
    createdAt     = models.DateTimeField(auto_now_add=True)
    updatedAt     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'LeaveBalance'
        ordering = ['-year', 'leaveTypeName']
        unique_together = ('employee', 'leaveTypeName', 'year')

    def __str__(self):
        return f"{self.employee.fullName} — {self.leaveTypeName} {self.year} ({self.usedDays}/{self.entitledDays})"

    @property
    def remainingDays(self):
        if self.entitledDays is None:
            return None
        return self.entitledDays - self.usedDays


class TimeCorrectionRequest(models.Model):
    """An employee's request to correct the clock in / clock out times on one of
    their attendance records. A Team Leader reviews it; on approval the requested
    times are written back onto the underlying AttendanceRecord."""
    STATUS_PENDING = 'Pending'
    STATUS_APPROVED = 'Approved'
    STATUS_DENIED = 'Denied'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_DENIED, 'Denied'),
    ]

    correctionID      = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee          = models.ForeignKey(
                            'employee_management.Employee', on_delete=models.CASCADE,
                            db_column='employeeID', related_name='time_correction_requests')
    attendance        = models.ForeignKey(
                            AttendanceRecord, on_delete=models.CASCADE,
                            db_column='attendanceID', related_name='correction_requests')
    date              = models.DateField()
    requestedClockIn  = models.DateTimeField(null=True, blank=True)
    requestedClockOut = models.DateTimeField(null=True, blank=True)
    reason            = models.TextField(blank=True)
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    reviewNote        = models.TextField(blank=True)
    reviewedBy        = models.CharField(max_length=150, blank=True)
    reviewedAt        = models.DateTimeField(null=True, blank=True)
    createdAt         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'TimeCorrectionRequest'
        ordering = ['-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — correction {self.date} ({self.status})"
    
    
