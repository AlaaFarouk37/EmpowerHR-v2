from django.conf import settings
from rest_framework import serializers
from .models import Job, Submission, SuccessionPlan


class JobSerializer(serializers.ModelSerializer):
    submission_count = serializers.IntegerField(source="submission_count_annotated", read_only=True)
    interviewer_name = serializers.SerializerMethodField()
    interviewer_role = serializers.CharField(source="interviewer.role", read_only=True)

    def get_interviewer_name(self, obj):
        if not obj.interviewer_id:
            return ""
        return obj.interviewer.full_name or obj.interviewer.email

    class Meta:
        model  = Job
        fields = [
            "id", "title", "level", "description", "required_skills",
            "min_experience_years", "required_degree",
            "vacancies", "interviewer", "interviewer_name", "interviewer_role",
            "pipeline_stages",
            "weight_skills", "weight_experience", "weight_education", "weight_semantic",
            "is_active", "created_at", "submission_count",
        ]
        read_only_fields = ["created_at", "required_skills"]

    def validate_pipeline_stages(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("pipeline_stages must be a list of stage names.")
        cleaned = []
        seen = set()
        for raw in value:
            name = str(raw or "").strip()
            if not name:
                continue
            if len(name) > 50:
                raise serializers.ValidationError(f"Stage name '{name[:20]}…' is too long (max 50 chars).")
            if name.lower() in ("applied", "rejected"):
                raise serializers.ValidationError(f"'{name}' is a reserved system stage and cannot be added explicitly.")
            key = name.lower()
            if key in seen:
                raise serializers.ValidationError(f"Duplicate stage '{name}'.")
            seen.add(key)
            cleaned.append(name)
        return cleaned

    def validate(self, data):
        ws = data.get("weight_skills",     self.instance.weight_skills     if self.instance else 0.40)
        we = data.get("weight_experience", self.instance.weight_experience if self.instance else 0.30)
        wu = data.get("weight_education",  self.instance.weight_education  if self.instance else 0.10)
        wm = data.get("weight_semantic",   self.instance.weight_semantic   if self.instance else 0.20)
        total = round(ws + we + wu + wm, 10)
        if abs(total - 1.0) > 0.001:
            raise serializers.ValidationError(f"Weights must sum to 1.0. Got: {total:.3f}")

        # Enforce that (title, level) exists in the position catalog so job postings
        # always reference a real Employee position. HR picks from the dropdown
        # sourced from /api/employee_management/jobs/.
        from employee_management.models import Job as EmploymentJob

        raw_title = data.get("title", self.instance.title if self.instance else "")
        title = (raw_title or "").strip()
        raw_level = data.get("level", self.instance.level if self.instance else None)
        level = (raw_level or "").strip() or None

        if not title:
            raise serializers.ValidationError({"title": "Job title is required."})

        catalog = EmploymentJob.objects.filter(title__iexact=title)
        catalog = catalog.filter(level__iexact=level) if level else catalog.filter(level__isnull=True)
        if not catalog.exists():
            raise serializers.ValidationError({
                "title": (
                    f"Position '{title}' with level '{level or '(none)'}' is not in the position catalog. "
                    "Pick an existing position or have an admin add it first."
                )
            })

        # Interviewer must be an HR Manager or Team Leader (or null).
        interviewer = data.get("interviewer", self.instance.interviewer if self.instance else None)
        if interviewer is not None and interviewer.role not in {"HRManager", "TeamLeader"}:
            raise serializers.ValidationError({
                "interviewer": "Interviewer must be an HR Manager or Team Leader."
            })

        return data


class SubmissionSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    resume_file = serializers.FileField(read_only=True)
    resume_filename = serializers.SerializerMethodField()
    decisionSupportOnly = serializers.SerializerMethodField()
    recommendationNotice = serializers.SerializerMethodField()
    processingMode = serializers.SerializerMethodField()

    def get_resume_filename(self, obj):
        if not obj.resume_file:
            return ""
        return obj.resume_file.name.split("/")[-1]

    def get_decisionSupportOnly(self, obj):
        return getattr(settings, 'AI_DECISION_SUPPORT_ONLY', True)

    def get_recommendationNotice(self, obj):
        return getattr(
            settings,
            'AI_GOVERNANCE_NOTICE',
            'AI outputs are advisory only and must be reviewed by HR before any employment decision.',
        )

    def get_processingMode(self, obj):
        return 'async' if obj.status in {Submission.Status.PENDING, Submission.Status.PROCESSING} and getattr(settings, 'AI_PIPELINE_ASYNC', False) else 'sync'

    class Meta:
        model  = Submission
        fields = [
            "id", "job", "job_title",
            "candidate_name", "candidate_email", "tracking_code",
            "resume_file", "resume_filename",
            "status", "review_stage", "stage_notes", "stage_updated_at", "talent_pool", "stage_history", "error_message",
            "candidate_skills", "candidate_degree", "candidate_years_exp",
            "skills_score", "experience_score", "education_score",
            "semantic_score", "ats_score",
            "submitted_at", "scored_at",
            "decisionSupportOnly", "recommendationNotice", "processingMode",
        ]
        read_only_fields = [
            "tracking_code", "status", "review_stage", "stage_notes", "stage_updated_at", "talent_pool", "stage_history", "error_message",
            "candidate_skills", "candidate_degree", "candidate_years_exp",
            "skills_score", "experience_score", "education_score",
            "semantic_score", "ats_score",
            "submitted_at", "scored_at",
        ]


class SubmissionUploadSerializer(serializers.ModelSerializer):
    """Used only for the upload endpoint — accepts the file."""
    class Meta:
        model  = Submission
        fields = ["job", "candidate_name", "candidate_email", "resume_file"]

    def validate_resume_file(self, value):
        allowed_extensions = (".pdf", ".txt")
        if not value.name.lower().endswith(allowed_extensions):
            raise serializers.ValidationError("Only PDF or TXT files are accepted.")
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File too large (max 10 MB).")
        return value


class SubmissionStageUpdateSerializer(serializers.Serializer):
    review_stage = serializers.CharField(max_length=50)
    stage_notes = serializers.CharField(required=False, allow_blank=True)
    talent_pool = serializers.BooleanField(required=False)

    def validate_review_stage(self, value):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Stage name is required.")
        return cleaned


class SuccessionPlanSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)

    class Meta:
        model = SuccessionPlan
        fields = '__all__'


class SuccessionPlanCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    targetRole = serializers.CharField(max_length=100)
    readiness = serializers.ChoiceField(
        choices=[choice[0] for choice in SuccessionPlan.READINESS_CHOICES],
        required=False,
    )
    status = serializers.ChoiceField(
        choices=[choice[0] for choice in SuccessionPlan.STATUS_CHOICES],
        required=False,
    )
    retentionRisk = serializers.ChoiceField(
        choices=[choice[0] for choice in SuccessionPlan.RISK_CHOICES],
        required=False,
    )
    developmentActions = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
