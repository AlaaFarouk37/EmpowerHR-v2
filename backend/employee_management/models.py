from datetime import date

from django.db import models
from accounts.models import User
from django.conf import settings
from decimal import Decimal
import uuid
from django.db.models import F, ExpressionWrapper, IntegerField
from django.db.models.functions import ExtractYear, Now


class Job(models.Model):
    job_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=100)
    level = models.CharField(max_length=100, null=True, blank=True)  # free-form (Junior, Senior, Director, etc.)
    base_salary = models.DecimalField(max_digits=10, decimal_places=2)
    benchmark_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True, blank=True)

    def save(self, *args, **kwargs):
        # Set benchmark salary to 0 by default - will be updated by another process later
        if self.benchmark_salary is None:
            self.benchmark_salary = Decimal('0')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} (Level {self.level})"

def gen_id():
    return uuid.uuid4().hex[:20]
    
def generate_employee_id():
    """
    Auto-generates the next employee ID in the format EMP00001, EMP00002, etc.
    Looks at the highest existing employeeID and increments it.
    """
    last = (
        Employee.objects.filter(employeeID__startswith="EMP")
        .order_by("employeeID")
        .last()
    )
    if not last or not last.employeeID:
        return "EMP00001"
    try:
        num = int(last.employeeID.replace("EMP", ""))
        return f"EMP{num + 1:05d}"
    except ValueError:
        return "EMP00001"

class Department(models.Model):
    department_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Team(models.Model):
    team_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name



# ──────────────────────────────────────────────
# Custom QuerySet & Manager
# ──────────────────────────────────────────────

class EmployeeQuerySet(models.QuerySet):
    def with_computed_fields(self):
        today = date.today()
        return self.annotate(
            _age=ExpressionWrapper(
                today.year - ExtractYear('birth_date'),
                output_field=IntegerField()
            ),
            _years_at_company=ExpressionWrapper(
                today.year - ExtractYear('hiring_date'),
                output_field=IntegerField()
            ),
        )


class EmployeeManager(models.Manager):
    def get_queryset(self):
        return EmployeeQuerySet(self.model, using=self._db).with_computed_fields()


# ──────────────────────────────────────────────
# Employee Model
# ──────────────────────────────────────────────

class Employee(models.Model):
    """
    Employee model with all fields required by the attrition prediction model.
    """
    GENDER_CHOICES       = [('Male', 'Male'), ('Female', 'Female')]
    EDUCATION_CHOICES    = [(1, 'High School'), (2, 'Associate Degree'),
                             (3, "Bachelor's Degree"), (4, "Master's Degree"), (5, 'PhD')]
    JOB_LEVEL_CHOICES    = [(1, 'Entry'), (2, 'Mid'), (3, 'Senior')]
    COMPANY_SIZE_CHOICES = [(1, 'Small'), (2, 'Medium'), (3, 'Large')]
    MARITAL_CHOICES      = [('Single', 'Single'), ('Married', 'Married'),
                             ('Divorced', 'Divorced')]

    # ── Identity ──────────────────────────────
    employeeID         = models.CharField(max_length=50, primary_key=True, default=generate_employee_id)
    fullName           = models.CharField(max_length=150)

    # ── Relations ─────────────────────────────
    job = models.ForeignKey(
        'Job',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employees'
    )
    team = models.ForeignKey(
        'Team',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employees'
    )
    department = models.ForeignKey(
        'Department',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='employees'
    )

    # ── Employment info ───────────────────────
    employeeType       = models.CharField(max_length=30, null=True, blank=True)
    location           = models.CharField(max_length=100, null=True, blank=True)
    employmentStatus   = models.CharField(max_length=30, default='Active')
    isDeleted          = models.BooleanField(default=False)

    # ── New: Hiring & personal dates ──────────
    hiring_date        = models.DateField(null=True, blank=True)
    birth_date         = models.DateField(null=True, blank=True)

    # ── New: Personal details ─────────────────
    phoneNumber        = models.CharField(max_length=20, null=True, blank=True)
    has_disability     = models.BooleanField(default=False)

    # ── New: Work schedule ────────────────────
    default_clock_in   = models.TimeField(null=True, blank=True)
    default_clock_out  = models.TimeField(null=True, blank=True)
    contracted_hours   = models.DecimalField(max_digits=5, decimal_places=2,
                                             null=True, blank=True,
                                             help_text="Contracted weekly hours")
    contracted_hours_day = models.DecimalField(max_digits=4, decimal_places=2,
                                               null=True, blank=True,
                                               help_text="Baseline work hours required per day (used for overtime calculation)")

    # ── Attrition model fields ─────────────────
    gender             = models.CharField(max_length=10, choices=GENDER_CHOICES,
                                          null=True, blank=True)
    monthlyIncome      = models.IntegerField(null=True, blank=True)
    performanceRating  = models.IntegerField(null=True, blank=True)
    overtime           = models.BooleanField(null=True, blank=True)
    educationLevel     = models.IntegerField(choices=EDUCATION_CHOICES,
                                             null=True, blank=True)
    numberOfDependents = models.IntegerField(null=True, blank=True)
    companySize        = models.IntegerField(choices=COMPANY_SIZE_CHOICES,
                                             null=True, blank=True)
    companyTenure      = models.IntegerField(null=True, blank=True)
    remoteWork         = models.BooleanField(null=True, blank=True)
    maritalStatus      = models.CharField(max_length=20, choices=MARITAL_CHOICES,
                                          null=True, blank=True)

    # ── Custom manager ────────────────────────
    objects = EmployeeManager()

    class Meta:
        db_table = 'employee_management_employee'

    def __str__(self):
        return f"{self.fullName} ({self.employeeID})"

    # ── Computed: age & yearsAtCompany ────────
    # These are set by the manager annotation when fetched from DB.
    # The @property below is a fallback for unsaved / in-memory instances.

    @property
    def age(self):
        annotated = self.__dict__.get('_age')
        if annotated is not None:
            return annotated
        if not self.birth_date:
            return None
        today = date.today()
        return today.year - self.birth_date.year - (
            (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
        )

    @property
    def yearsAtCompany(self):
        annotated = self.__dict__.get('_years_at_company')
        if annotated is not None:
            return annotated
        if not self.hiring_date:
            return None
        today = date.today()
        return today.year - self.hiring_date.year - (
            (today.month, today.day) < (self.hiring_date.month, self.hiring_date.day)
        )

    # ── Delegated to related User account ─────
    @property
    def email(self):
        user = getattr(self, 'user_account', None)
        return user.email if user else ''

    @property
    def role(self):
        user = getattr(self, 'user_account', None)
        return user.role if user else ''

    @property
    def currency_preference(self):
        user = getattr(self, 'user_account', None)
        return user.currency_preference if user else 'EGP'

    @property
    def jobTitle(self):
        return self.job.title if self.job_id else ''

    @property
    def jobLevel(self):
        return self.job.level if self.job_id else None

    @property
    def numberOfPromotions(self):
        return self.job_history.filter(action='Promotion').count()
    
    # Snake_case aliases (legacy callers)
    job_title = jobTitle
    job_level = jobLevel




class EmployeeJobHistory(models.Model):
    ACTION_CHOICES = [
        ('Promotion', 'Promotion'),
        ('Demotion', 'Demotion'),
        ('Role Change', 'Role Change'),
    ]

    historyID            = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee             = models.ForeignKey(
                               Employee, on_delete=models.CASCADE,
                               db_column='employeeID', related_name='job_history')
    action               = models.CharField(max_length=20, choices=ACTION_CHOICES)
    previousJobTitle     = models.CharField(max_length=100, blank=True)
    newJobTitle          = models.CharField(max_length=100, blank=True)
    previousRole         = models.CharField(max_length=50, blank=True)
    newRole              = models.CharField(max_length=50, blank=True)
    previousDepartment   = models.CharField(max_length=100, blank=True)
    newDepartment        = models.CharField(max_length=100, blank=True)
    previousTeam         = models.CharField(max_length=100, blank=True)
    newTeam              = models.CharField(max_length=100, blank=True)
    previousMonthlyIncome= models.IntegerField(null=True, blank=True)
    newMonthlyIncome     = models.IntegerField(null=True, blank=True)
    changedBy            = models.CharField(max_length=150, blank=True)
    notes                = models.TextField(blank=True)
    changedAt            = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'EmployeeJobHistory'
        ordering = ['-changedAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.action}"


# --- INFRASTRUCTURE TABLES (Admin Only) ---




class LeaveType(models.Model):
    leave_type_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50) # e.g. Sick, Annual, Casual
    max_days_per_year = models.PositiveIntegerField()

    def __str__(self):
        return self.name


class RecognitionAward(models.Model):
    CATEGORY_CHOICES = [
        ('Achievement', 'Achievement'),
        ('Appreciation', 'Appreciation'),
        ('Innovation', 'Innovation'),
        ('Teamwork', 'Teamwork'),
        ('Leadership', 'Leadership'),
    ]

    awardID          = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee         = models.ForeignKey(
                         Employee, on_delete=models.CASCADE,
                         db_column='employeeID', related_name='recognition_awards')
    title            = models.CharField(max_length=160)
    category         = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='Achievement')
    message          = models.TextField(blank=True)
    points           = models.PositiveIntegerField(default=0)
    recognitionDate  = models.DateField()
    recognizedBy     = models.CharField(max_length=150, blank=True)
    createdAt        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'RecognitionAward'
        ordering = ['-recognitionDate', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.title}"


class BenefitEnrollment(models.Model):
    BENEFIT_TYPE_CHOICES = [
        ('Medical', 'Medical'),
        ('Dental', 'Dental'),
        ('Retirement', 'Retirement'),
        ('Transportation', 'Transportation'),
        ('Wellness', 'Wellness'),
    ]
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Enrolled', 'Enrolled'),
        ('Waived', 'Waived'),
    ]

    enrollmentID         = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee             = models.ForeignKey(
                               Employee, on_delete=models.CASCADE,
                               db_column='employeeID', related_name='benefit_enrollments')
    benefitName          = models.CharField(max_length=160)
    benefitType          = models.CharField(max_length=30, choices=BENEFIT_TYPE_CHOICES, default='Medical')
    provider             = models.CharField(max_length=120, blank=True)
    coverageLevel        = models.CharField(max_length=50, blank=True)
    status               = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    monthlyCost          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employeeContribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    effectiveDate        = models.DateField(null=True, blank=True)
    notes                = models.TextField(blank=True)
    employeeNote         = models.TextField(blank=True)
    acknowledgedAt       = models.DateTimeField(null=True, blank=True)
    createdBy            = models.CharField(max_length=150, blank=True)
    createdAt            = models.DateTimeField(auto_now_add=True)
    updatedAt            = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'BenefitEnrollment'
        ordering = ['-effectiveDate', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.benefitName}"


class ExpenseClaim(models.Model):
    CATEGORY_CHOICES = [
        ('Travel', 'Travel'),
        ('Meals', 'Meals'),
        ('Supplies', 'Supplies'),
        ('Training', 'Training'),
        ('Other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('Submitted', 'Submitted'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Reimbursed', 'Reimbursed'),
    ]

    claimID      = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee     = models.ForeignKey(
                     Employee, on_delete=models.CASCADE,
                     db_column='employeeID', related_name='expense_claims')
    title        = models.CharField(max_length=160)
    category     = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='Other')
    amount       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expenseDate  = models.DateField()
    description  = models.TextField(blank=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Submitted')
    reviewNote   = models.TextField(blank=True)
    reviewedBy   = models.CharField(max_length=150, blank=True)
    reviewedAt   = models.DateTimeField(null=True, blank=True)
    createdAt    = models.DateTimeField(auto_now_add=True)
    updatedAt    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ExpenseClaim'
        ordering = ['-expenseDate', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.title}"


class DocumentRequest(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('Salary Certificate', 'Salary Certificate'),
        ('Employment Letter', 'Employment Letter'),
        ('Experience Letter', 'Experience Letter'),
        ('ID Verification', 'ID Verification'),
    ]
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Issued', 'Issued'),
        ('Declined', 'Declined'),
    ]

    requestID    = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee     = models.ForeignKey(
                     Employee, on_delete=models.CASCADE,
                     db_column='employeeID', related_name='document_requests')
    documentType = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES, default='Employment Letter')
    purpose      = models.CharField(max_length=180)
    notes        = models.TextField(blank=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    reviewNote   = models.TextField(blank=True)
    issuedBy     = models.CharField(max_length=150, blank=True)
    issuedAt     = models.DateTimeField(null=True, blank=True)
    createdAt    = models.DateTimeField(auto_now_add=True)
    updatedAt    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'DocumentRequest'
        ordering = ['-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.documentType}"


class SupportTicket(models.Model):
    CATEGORY_CHOICES = [
        ('IT', 'IT'),
        ('Payroll', 'Payroll'),
        ('Benefits', 'Benefits'),
        ('Policy', 'Policy'),
        ('General', 'General'),
    ]
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]

    ticketID        = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee        = models.ForeignKey(
                          Employee, on_delete=models.CASCADE,
                          db_column='employeeID', related_name='support_tickets')
    subject         = models.CharField(max_length=180)
    category        = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='General')
    priority        = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    description     = models.TextField(blank=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    resolutionNote  = models.TextField(blank=True)
    assignedTo      = models.CharField(max_length=150, blank=True)
    resolvedAt      = models.DateTimeField(null=True, blank=True)
    createdAt       = models.DateTimeField(auto_now_add=True)
    updatedAt       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'SupportTicket'
        ordering = ['-updatedAt', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.subject}"


class EmployeeGoal(models.Model):
    CATEGORY_CHOICES = [
        ('Performance', 'Performance'),
        ('Development', 'Development'),
        ('Leadership', 'Leadership'),
        ('Attendance', 'Attendance'),
    ]
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]
    STATUS_CHOICES = [
        ('Not Started', 'Not Started'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('On Hold', 'On Hold'),
    ]

    goalID       = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee     = models.ForeignKey(
                       Employee, on_delete=models.CASCADE,
                       db_column='employeeID', related_name='goals')
    title        = models.CharField(max_length=160)
    description  = models.TextField(blank=True)
    category     = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='Performance')
    priority     = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Not Started')
    progress     = models.PositiveIntegerField(default=0)
    dueDate      = models.DateField(null=True, blank=True)
    createdBy    = models.CharField(max_length=150, blank=True)
    createdAt    = models.DateTimeField(auto_now_add=True)
    updatedAt    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'EmployeeGoal'
        ordering = ['dueDate', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.title}"


class WorkTask(models.Model):
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]
    STATUS_CHOICES = [
        ('To Do', 'To Do'),
        ('In Progress', 'In Progress'),
        ('Pending Review', 'Pending Review'),
        ('Done', 'Done'),
        ('Blocked', 'Blocked'),
    ]

    taskID          = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee        = models.ForeignKey(
                         Employee, on_delete=models.CASCADE,
                         db_column='employeeID', related_name='tasks')
    title           = models.CharField(max_length=160)
    description     = models.TextField(blank=True)
    priority        = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='To Do')
    progress        = models.PositiveIntegerField(default=0)
    estimatedHours  = models.PositiveIntegerField(null=True, blank=True)
    dueDate         = models.DateField(null=True, blank=True)
    assignedBy      = models.CharField(max_length=150, blank=True)
    start_time      = models.DateTimeField(null=True, blank=True)
    finished_time   = models.DateTimeField(null=True, blank=True)
    createdAt       = models.DateTimeField(auto_now_add=True)
    updatedAt       = models.DateTimeField(auto_now=True)
    actualHours     = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'WorkTask'
        ordering = ['dueDate', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.title}"


class WorkTaskLog(models.Model):
    """One time-tracking session on a WorkTask. The employee opens a log
    via Start / Add Progress and closes it via End Progress."""
    logID       = models.CharField(max_length=50, primary_key=True, default=gen_id)
    task        = models.ForeignKey(
                      WorkTask, on_delete=models.CASCADE,
                      related_name='logs')
    start_time  = models.DateTimeField()
    end_time    = models.DateTimeField(null=True, blank=True)
    notes       = models.TextField(blank=True)
    createdAt   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'WorkTaskLog'
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.task.title} log {self.logID} ({self.start_time})"

    @property
    def duration_minutes(self):
        if not self.end_time:
            return None
        return round((self.end_time - self.start_time).total_seconds() / 60, 2)


class TrainingCourse(models.Model):
    CATEGORY_CHOICES = [
        ('Technical', 'Technical'),
        ('Compliance', 'Compliance'),
        ('Leadership', 'Leadership'),
        ('Soft Skills', 'Soft Skills'),
    ]

    courseID             = models.CharField(max_length=50, primary_key=True, default=gen_id)
    title                = models.CharField(max_length=160)
    description          = models.TextField(blank=True)
    category             = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='Technical')
    durationHours        = models.PositiveIntegerField(default=1)
    assignedEmployeeIDs  = models.JSONField(default=list, blank=True)
    completionData       = models.JSONField(default=dict, blank=True)
    dueDate              = models.DateField(null=True, blank=True)
    createdBy            = models.CharField(max_length=150, blank=True)
    createdAt            = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'TrainingCourse'
        ordering = ['dueDate', '-createdAt']

    def __str__(self):
        return self.title


class PerformanceReview(models.Model):
    REVIEW_TYPES = [
        ('Quarterly', 'Quarterly'),
        ('Annual', 'Annual'),
        ('Probation', 'Probation'),
        ('Spot', 'Spot'),
    ]
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Submitted', 'Submitted'),
        ('Acknowledged', 'Acknowledged'),
    ]

    reviewID          = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee          = models.ForeignKey(
                            Employee, on_delete=models.CASCADE,
                            db_column='employeeID', related_name='performance_reviews')
    reviewPeriod      = models.CharField(max_length=50)
    reviewType        = models.CharField(max_length=20, choices=REVIEW_TYPES, default='Quarterly')
    overallRating     = models.PositiveIntegerField(default=3)
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    strengths         = models.TextField(blank=True)
    improvementAreas  = models.TextField(blank=True)
    goalsSummary      = models.TextField(blank=True)
    employeeNote      = models.TextField(blank=True)
    reviewDate        = models.DateField(null=True, blank=True)
    acknowledgedAt    = models.DateTimeField(null=True, blank=True)
    createdBy         = models.CharField(max_length=150, blank=True)
    createdAt         = models.DateTimeField(auto_now_add=True)
    updatedAt         = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'PerformanceReview'
        ordering = ['-reviewDate', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.reviewPeriod}"


class ShiftSchedule(models.Model):
    SHIFT_TYPE_CHOICES = [
        ('Morning', 'Morning'),
        ('Evening', 'Evening'),
        ('Night', 'Night'),
        ('Remote', 'Remote'),
        ('Flexible', 'Flexible'),
    ]
    STATUS_CHOICES = [
        ('Planned', 'Planned'),
        ('Confirmed', 'Confirmed'),
        ('Completed', 'Completed'),
        ('Swapped', 'Swapped'),
    ]

    scheduleID      = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee        = models.ForeignKey(
                        Employee, on_delete=models.CASCADE,
                        db_column='employeeID', related_name='shift_schedules')
    shiftDate       = models.DateField()
    shiftType       = models.CharField(max_length=20, choices=SHIFT_TYPE_CHOICES, default='Morning')
    startTime       = models.TimeField()
    endTime         = models.TimeField()
    location        = models.CharField(max_length=120, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planned')
    notes           = models.TextField(blank=True)
    employeeNote    = models.TextField(blank=True)
    acknowledgedAt  = models.DateTimeField(null=True, blank=True)
    createdBy       = models.CharField(max_length=150, blank=True)
    createdAt       = models.DateTimeField(auto_now_add=True)
    updatedAt       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ShiftSchedule'
        ordering = ['shiftDate', 'startTime', '-createdAt']
        unique_together = ('employee', 'shiftDate', 'startTime')

    def __str__(self):
        return f"{self.employee.fullName} — {self.shiftDate} {self.shiftType}"


class PolicyAnnouncement(models.Model):
    CATEGORY_CHOICES = [
        ('Policy', 'Policy'),
        ('Announcement', 'Announcement'),
    ]
    AUDIENCE_CHOICES = [
        ('All Employees', 'All Employees'),
        ('Managers', 'Managers'),
        ('Team Leaders', 'Team Leaders'),
    ]
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Published', 'Published'),
        ('Acknowledged', 'Acknowledged'),
    ]

    policyID         = models.CharField(max_length=50, primary_key=True, default=gen_id)
    title            = models.CharField(max_length=180)
    category         = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='Policy')
    audience         = models.CharField(max_length=30, choices=AUDIENCE_CHOICES, default='All Employees')
    content          = models.TextField()
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    effectiveDate    = models.DateField(null=True, blank=True)
    acknowledgedByIDs = models.JSONField(default=list, blank=True)
    acknowledgementNotes = models.JSONField(default=dict, blank=True)
    acknowledgedAt   = models.DateTimeField(null=True, blank=True)
    lastReminderAt   = models.DateTimeField(null=True, blank=True)
    lastReminderNote = models.TextField(blank=True)
    reminderCount    = models.PositiveIntegerField(default=0)
    reminderHistory  = models.JSONField(default=list, blank=True)
    createdBy        = models.CharField(max_length=150, blank=True)
    createdAt        = models.DateTimeField(auto_now_add=True)
    updatedAt        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'PolicyAnnouncement'
        ordering = ['-effectiveDate', '-createdAt']

    def __str__(self):
        return self.title
#     last_name = models.CharField(max_length=50)
#     birthdate = models.DateField(null=True, blank=True)
#     gender = models.CharField(max_length=20)
#     marital_status = models.CharField(max_length=30)
#     number_of_dependents = models.PositiveIntegerField(default=0)
#     has_disability = models.BooleanField(default=False)
#     Location = models.CharField(max_length=100)
#     department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True)
#     team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True)
#     job = models.ForeignKey(Job, on_delete=models.SET_NULL, null=True)
#     education_level = models.CharField(max_length=100) # High School, Bachelor's, Master's, PhD

#     # Employment Data
#     employment_type = models.CharField(max_length=50) # Full-time, Part-time
#     hire_date = models.DateField(null=True, blank=True)
#     years_at_company = models.PositiveIntegerField(default=0)
#     number_of_promotions = models.PositiveIntegerField(default=0)
#     monthly_income = models.DecimalField(max_digits=10, decimal_places=2)
#     PhoneNumber = models.CharField(max_length=20, null=True, blank=True)
    
#     # Scheduling
#     default_clock_in = models.TimeField(null=True, blank=True)
#     default_clock_out = models.TimeField(null=True, blank=True)
#     contracted_hours = models.PositiveIntegerField(default=40)
    
#     def __str__(self):
#         return f"{self.first_name} {self.last_name}"    
        
# class LeaveEntitlement(models.Model):
#     leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
#     employee_profile = models.ForeignKey(
#         User, 
#         on_delete=models.CASCADE, 
#         related_name='leave_entitlements'
#     )
#     used_days = models.PositiveIntegerField(default=0)
#     remaining_days = models.PositiveIntegerField(default=0)
#     max_days_per_year = models.PositiveIntegerField()
#     status = models.CharField(max_length=20, default='Active')

#     def save(self, *args, **kwargs):
#         # Automatically calculate remaining days before saving
#         self.remaining_days = self.max_days_per_year - self.used_days
#         super().save(*args, **kwargs)

#     def __str__(self):
#         return f"{self.employee.full_name} - {self.leave_type.name}"    
    
