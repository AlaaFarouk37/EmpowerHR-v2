import secrets

from django.db import models


def generate_tracking_code():
    return secrets.token_hex(4).upper()


class Job(models.Model):
    """A job posting with its JD text and scoring weights."""
    title                = models.CharField(max_length=255)
    description          = models.TextField(help_text="Full job description text")
    required_skills      = models.JSONField(default=list)   # extracted from JD automatically
    min_experience_years = models.FloatField(default=0)
    required_degree      = models.CharField(max_length=20, default="Unknown")

    # User-defined weights (must sum to 1.0)
    weight_skills     = models.FloatField(default=0.40)
    weight_experience = models.FloatField(default=0.30)
    weight_education  = models.FloatField(default=0.10)
    weight_semantic   = models.FloatField(default=0.20)

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Submission(models.Model):
    """A candidate resume submitted against a Job."""

    class Status(models.TextChoices):
        PENDING    = "pending",    "Pending"
        PROCESSING = "processing", "Processing"
        DONE       = "done",       "Done"
        FAILED     = "failed",     "Failed"

    class ReviewStage(models.TextChoices):
        APPLIED = "Applied", "Applied"
        SHORTLISTED = "Shortlisted", "Shortlisted"
        INTERVIEW = "Interview", "Interview"
        HIRED = "Hired", "Hired"
        REJECTED = "Rejected", "Rejected"

    job             = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="submissions")
    candidate_name  = models.CharField(max_length=255, blank=True)
    candidate_email = models.EmailField(blank=True)
    tracking_code   = models.CharField(max_length=16, unique=True, default=generate_tracking_code, editable=False)
    resume_file     = models.FileField(upload_to="resumes/")
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    review_stage    = models.CharField(max_length=20, choices=ReviewStage.choices, default=ReviewStage.APPLIED)
    stage_notes     = models.TextField(blank=True)
    stage_updated_at = models.DateTimeField(null=True, blank=True)
    talent_pool     = models.BooleanField(default=True)
    stage_history   = models.JSONField(default=list, blank=True)
    error_message   = models.TextField(blank=True)

    # ── Extracted fields ──────────────────────────────────────────────────────
    raw_text               = models.TextField(blank=True)
    candidate_skills       = models.JSONField(default=list)
    candidate_degree       = models.CharField(max_length=20, default="Unknown")
    candidate_years_exp    = models.FloatField(default=0.0)
    exp_extraction_method  = models.CharField(max_length=50, blank=True)

    # ── Scores (0–100) ────────────────────────────────────────────────────────
    skills_score     = models.FloatField(null=True)
    experience_score = models.FloatField(null=True)
    education_score  = models.FloatField(null=True)
    semantic_score   = models.FloatField(null=True)   # stored as 0–100
    ats_score        = models.FloatField(null=True)

    submitted_at = models.DateTimeField(auto_now_add=True)
    scored_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-ats_score"]

    def __str__(self):
        return f"{self.candidate_name or 'Candidate'} → {self.job.title}"


import uuid

def gen_id():
    return uuid.uuid4().hex[:20]

class SuccessionPlan(models.Model):
    READINESS_CHOICES = [
        ('Ready Now', 'Ready Now'),
        ('6-12 Months', '6-12 Months'),
        ('1-2 Years', '1-2 Years'),
        ('Long Term', 'Long Term'),
    ]
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('On Track', 'On Track'),
        ('Acknowledged', 'Acknowledged'),
        ('Completed', 'Completed'),
        ('On Hold', 'On Hold'),
    ]
    RISK_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]

    planID              = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee            = models.ForeignKey(
                              'employee_management.Employee', on_delete=models.CASCADE,
                              db_column='employeeID', related_name='succession_plans')
    targetRole          = models.CharField(max_length=120)
    readiness           = models.CharField(max_length=20, choices=READINESS_CHOICES, default='1-2 Years')
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    retentionRisk       = models.CharField(max_length=10, choices=RISK_CHOICES, default='Low')
    developmentActions  = models.TextField(blank=True)
    notes               = models.TextField(blank=True)
    employeeNote        = models.TextField(blank=True)
    acknowledgedAt      = models.DateTimeField(null=True, blank=True)
    createdBy           = models.CharField(max_length=150, blank=True)
    createdAt           = models.DateTimeField(auto_now_add=True)
    updatedAt           = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'SuccessionPlan'
        ordering = ['-updatedAt', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} → {self.targetRole}"
