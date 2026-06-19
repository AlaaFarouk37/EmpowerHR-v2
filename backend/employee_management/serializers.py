from rest_framework import serializers
from .models import (
    Department, Team, Job, LeaveType, Employee, EmployeeJobHistory,
    RecognitionAward, BenefitEnrollment, ExpenseClaim, DocumentRequest, SupportTicket,
    SupportTicketMessage,
    EmployeeGoal, WorkTask, WorkTaskLog, TrainingCourse, PerformanceReview, ShiftSchedule, PolicyAnnouncement
)


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['department_id', 'name']
        read_only_fields = ['department_id']


class TeamSerializer(serializers.ModelSerializer):
    leaderName = serializers.CharField(source='leader.fullName', read_only=True)

    class Meta:
        model = Team
        fields = ['team_id', 'name', 'leader', 'leaderName']
        read_only_fields = ['team_id']
        extra_kwargs = {'leader': {'required': False, 'allow_null': True}}


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ['job_id', 'title', 'level', 'base_salary', 'benchmark_salary']
        read_only_fields = ['job_id']
        # Title-only entries (blank level) and level-only entries (blank title)
        # are both valid catalog rows; base_salary defaults to 0 when omitted.
        extra_kwargs = {
            'title': {'required': False, 'allow_blank': True},
            'base_salary': {'required': False, 'default': 0},
        }


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['leave_type_id', 'name', 'max_days_per_year', 'is_paid']
        read_only_fields = ['leave_type_id']


class EmployeeSerializer(serializers.ModelSerializer):
    # Proxy properties (read-only). email/role come from user_account; jobTitle/jobLevel come from job.
    email = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    jobTitle = serializers.CharField(read_only=True)
    jobLevel = serializers.CharField(read_only=True)
    currency_preference = serializers.CharField(read_only=True)
    age = serializers.SerializerMethodField(read_only=True)
    yearsAtCompany = serializers.SerializerMethodField(read_only=True)
    numberOfDependents = serializers.IntegerField(read_only=True)
    
    def get_age(self, obj):
        return obj.age

    def get_yearsAtCompany(self, obj):
        return obj.yearsAtCompany
    class Meta:
        model = Employee
        fields = [
            'employeeID', 'fullName', 'email', 'job', 'jobTitle', 'team', 'department',
            'role', 'employeeType', 'location', 'employmentStatus', 'isDeleted',
            'age', 'yearsAtCompany', 'monthlyIncome', 'currency_preference', 'jobLevel', 'remoteWork','hiring_date', 'birth_date',
            'numberOfDependents', 'educationLevel','phoneNumber', 'has_disability', 'gender', 'maritalStatus',
            'default_clock_in', 'default_clock_out', 'contracted_hours',
        ]


class EmployeeCreateUpdateSerializer(serializers.ModelSerializer):
    # Proxy properties (read-only). To change them, use the change-role endpoint.
    email = serializers.CharField(read_only=True)
    role = serializers.CharField(read_only=True)
    jobTitle = serializers.CharField(read_only=True)
    jobLevel = serializers.CharField(read_only=True)
    currency_preference = serializers.CharField(read_only=True)

    age = serializers.SerializerMethodField(read_only=True)
    yearsAtCompany = serializers.SerializerMethodField(read_only=True)

    def get_age(self, obj):
        return obj.age

    def get_yearsAtCompany(self, obj):
        return obj.yearsAtCompany
    class Meta:
        model = Employee
        fields = [
            'employeeID', 'fullName', 'email', 'job', 'jobTitle', 'team', 'department',
            'role', 'employeeType', 'location', 'employmentStatus', 'age',
            'yearsAtCompany', 'monthlyIncome', 'currency_preference',
            'jobLevel', 'remoteWork','hiring_date', 'birth_date','numberOfDependents', 'educationLevel','phoneNumber', 'has_disability', 'gender', 'maritalStatus',
            'default_clock_in', 'default_clock_out', 'contracted_hours',
        ]
        read_only_fields = ['employeeID']


class EmployeeJobHistorySerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)

    class Meta:
        model = EmployeeJobHistory
        fields = [
            'historyID', 'employeeID', 'employeeName', 'action',
            'previousJobTitle', 'newJobTitle', 'previousRole', 'newRole',
            'previousDepartment', 'newDepartment', 'previousTeam', 'newTeam',
            'previousMonthlyIncome', 'newMonthlyIncome', 'changedBy', 'notes', 'changedAt'
        ]


class EmployeeRoleChangeSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['Promotion', 'Demotion', 'Role Change'])
    job = serializers.PrimaryKeyRelatedField(
        queryset=Job.objects.all(), required=False, allow_null=True,
    )
    role = serializers.ChoiceField(
        choices=['TeamMember', 'TeamLeader', 'HRManager', 'Admin'],
        required=False,
        allow_blank=True,
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), required=False, allow_null=True,
    )
    team = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(), required=False, allow_null=True,
    )
    monthlyIncome = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    currency_preference = serializers.CharField(max_length=3, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class EmployeeGoalSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = EmployeeGoal
        fields = [
            'goalID', 'employeeID', 'employeeName', 'department', 'team',
            'title', 'description', 'category', 'priority', 'status',
            'progress', 'dueDate', 'createdBy', 'createdByRole', 'createdAt', 'updatedAt'
        ]


class EmployeeGoalCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    title = serializers.CharField(max_length=160)
    description = serializers.CharField(required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=[choice[0] for choice in EmployeeGoal.CATEGORY_CHOICES], required=False)
    priority = serializers.ChoiceField(choices=[choice[0] for choice in EmployeeGoal.PRIORITY_CHOICES], required=False)
    status = serializers.ChoiceField(choices=[choice[0] for choice in EmployeeGoal.STATUS_CHOICES], required=False)
    progress = serializers.IntegerField(required=False, min_value=0, max_value=100)
    dueDate = serializers.DateField(required=False, allow_null=True)


class EmployeeGoalProgressSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[choice[0] for choice in EmployeeGoal.STATUS_CHOICES], required=False)
    progress = serializers.IntegerField(required=False, min_value=0, max_value=100)


class WorkTaskLogSerializer(serializers.ModelSerializer):
    durationMinutes = serializers.FloatField(source='duration_minutes', read_only=True)

    class Meta:
        model = WorkTaskLog
        fields = ['logID', 'start_time', 'end_time', 'notes', 'durationMinutes', 'createdAt']
        read_only_fields = ['logID', 'createdAt', 'durationMinutes']


class WorkTaskSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    employeeEmail = serializers.CharField(source='employee.email', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)
    contractedHours = serializers.IntegerField(source='employee.contracted_hours', read_only=True)  # ← add this
    teamLeadEmail = serializers.SerializerMethodField()
    logs = WorkTaskLogSerializer(many=True, read_only=True)

    class Meta:
        model = WorkTask
        fields = [
            'taskID', 'employeeID', 'employeeName', 'employeeEmail', 'department', 'team',
            'title', 'description', 'priority', 'status',
            'progress', 'estimatedHours', 'actualHours', 'dueDate', 'assignedBy', 'contractedHours',
            'reviewNote', 'reviewedAt',
            'teamLeadEmail',
            'start_time', 'finished_time',
            'createdAt', 'updatedAt', 'logs',
        ]

    def get_teamLeadEmail(self, obj):
        team = getattr(obj.employee, 'team', None)
        if not team:
            return ''
        leader = (
            Employee.objects
            .filter(team=team, user_account__role='TeamLeader')
            .select_related('user_account')
            .first()
        )
        if not leader:
            return ''
        return leader.email or ''


class WorkTaskCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    title = serializers.CharField(max_length=160)
    description = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(choices=[choice[0] for choice in WorkTask.PRIORITY_CHOICES], required=False)
    status = serializers.ChoiceField(choices=[choice[0] for choice in WorkTask.STATUS_CHOICES], required=False)
    progress = serializers.IntegerField(required=False, min_value=0, max_value=100)
    dueDate = serializers.DateField(required=False, allow_null=True)
    estimatedHours = serializers.IntegerField(required=False, min_value=0)


class WorkTaskProgressSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[choice[0] for choice in WorkTask.STATUS_CHOICES], required=False)
    progress = serializers.IntegerField(required=False, min_value=0, max_value=100)
    notes = serializers.CharField(required=False, allow_blank=True)


class TrainingCourseSerializer(serializers.ModelSerializer):
    assignedCount = serializers.SerializerMethodField()
    completedCount = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = TrainingCourse
        fields = [
            'courseID', 'title', 'description', 'category', 'durationHours',
            'assignedEmployeeIDs', 'assignedCount', 'completedCount', 'status',
            'progress', 'dueDate', 'createdBy', 'createdAt'
        ]

    def get_assignedCount(self, obj):
        return len(obj.assignedEmployeeIDs or [])

    def get_completedCount(self, obj):
        completion = obj.completionData or {}
        return sum(1 for item in completion.values() if item.get('status') == 'Completed')

    def get_status(self, obj):
        employee_id = self.context.get('employee_id')
        if employee_id:
            completion = (obj.completionData or {}).get(employee_id, {})
            return completion.get('status', 'Not Started')
        completion = obj.completionData or {}
        if completion and all(item.get('status') == 'Completed' for item in completion.values()):
            return 'Completed'
        return 'In Progress' if completion else 'Not Started'

    def get_progress(self, obj):
        employee_id = self.context.get('employee_id')
        if employee_id:
            completion = (obj.completionData or {}).get(employee_id, {})
            return completion.get('progress', 0)
        completion = obj.completionData or {}
        if not completion:
            return 0
        return round(sum(item.get('progress', 0) for item in completion.values()) / max(len(completion), 1))


class TrainingCourseCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=160)
    description = serializers.CharField(required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=[choice[0] for choice in TrainingCourse.CATEGORY_CHOICES], required=False)
    durationHours = serializers.IntegerField(required=False, min_value=1)
    assignedEmployeeIDs = serializers.ListField(child=serializers.CharField(max_length=50), required=False)
    dueDate = serializers.DateField(required=False, allow_null=True)


class TrainingProgressSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['Not Started', 'In Progress', 'Completed'], required=False)
    progress = serializers.IntegerField(required=False, min_value=0, max_value=100)


class PerformanceReviewSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = PerformanceReview
        fields = [
            'reviewID', 'employeeID', 'employeeName', 'department', 'team',
            'reviewPeriod', 'reviewType', 'overallRating', 'status',
            'strengths', 'improvementAreas', 'goalsSummary', 'employeeNote',
            'reviewDate', 'acknowledgedAt', 'createdBy', 'createdAt', 'updatedAt'
        ]


class PerformanceReviewCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    reviewPeriod = serializers.CharField(max_length=50)
    reviewType = serializers.ChoiceField(choices=[choice[0] for choice in PerformanceReview.REVIEW_TYPES], required=False)
    overallRating = serializers.IntegerField(min_value=1, max_value=5)
    status = serializers.ChoiceField(choices=[choice[0] for choice in PerformanceReview.STATUS_CHOICES], required=False)
    strengths = serializers.CharField(required=False, allow_blank=True)
    improvementAreas = serializers.CharField(required=False, allow_blank=True)
    goalsSummary = serializers.CharField(required=False, allow_blank=True)
    reviewDate = serializers.DateField(required=False, allow_null=True)


class PerformanceReviewAcknowledgeSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)


class ShiftScheduleSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = ShiftSchedule
        fields = [
            'scheduleID', 'employeeID', 'employeeName', 'department', 'team',
            'shiftDate', 'shiftType', 'startTime', 'endTime', 'location',
            'status', 'notes', 'employeeNote', 'acknowledgedAt', 'createdBy', 'createdAt', 'updatedAt'
        ]


class ShiftScheduleCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    shiftDate = serializers.DateField()
    shiftType = serializers.ChoiceField(choices=[choice[0] for choice in ShiftSchedule.SHIFT_TYPE_CHOICES], required=False)
    startTime = serializers.TimeField()
    endTime = serializers.TimeField()
    location = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=[choice[0] for choice in ShiftSchedule.STATUS_CHOICES], required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class ShiftScheduleAcknowledgeSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['Confirmed', 'Completed', 'Swapped'], required=False)
    note = serializers.CharField(required=False, allow_blank=True)


class PolicyAnnouncementSerializer(serializers.ModelSerializer):
    acknowledgements = serializers.SerializerMethodField()

    class Meta:
        model = PolicyAnnouncement
        fields = [
            'policyID', 'title', 'category', 'audience', 'content',
            'status', 'effectiveDate', 'acknowledgements', 'acknowledgedAt',
            'lastReminderAt', 'lastReminderNote', 'reminderCount',
            'createdBy', 'createdAt', 'updatedAt'
        ]

    def get_acknowledgements(self, obj):
        return len(obj.acknowledgedByIDs or [])


class PolicyAnnouncementCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=180)
    category = serializers.ChoiceField(choices=[choice[0] for choice in PolicyAnnouncement.CATEGORY_CHOICES], required=False)
    audience = serializers.ChoiceField(choices=[choice[0] for choice in PolicyAnnouncement.AUDIENCE_CHOICES], required=False)
    content = serializers.CharField()
    status = serializers.ChoiceField(choices=[choice[0] for choice in PolicyAnnouncement.STATUS_CHOICES], required=False)
    effectiveDate = serializers.DateField(required=False, allow_null=True)


class PolicyAnnouncementAcknowledgeSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)


class PolicyAnnouncementReminderSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True)


class RecognitionAwardSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = RecognitionAward
        fields = [
            'awardID', 'employeeID', 'employeeName', 'department', 'team',
            'title', 'category', 'message', 'points', 'recognitionDate',
            'recognizedBy', 'createdAt'
        ]


class RecognitionAwardCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    title = serializers.CharField(max_length=160)
    category = serializers.ChoiceField(choices=[choice[0] for choice in RecognitionAward.CATEGORY_CHOICES], required=False)
    message = serializers.CharField(required=False, allow_blank=True)
    points = serializers.IntegerField(required=False, min_value=0)
    recognitionDate = serializers.DateField(required=False, allow_null=True)


class BenefitEnrollmentSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = BenefitEnrollment
        fields = [
            'enrollmentID', 'employeeID', 'employeeName', 'department', 'team',
            'benefitName', 'benefitType', 'provider', 'coverageLevel', 'status',
            'monthlyCost', 'employeeContribution', 'effectiveDate', 'notes',
            'employeeNote', 'acknowledgedAt', 'createdBy', 'createdAt', 'updatedAt'
        ]


class BenefitEnrollmentCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    benefitName = serializers.CharField(max_length=160)
    benefitType = serializers.ChoiceField(choices=[choice[0] for choice in BenefitEnrollment.BENEFIT_TYPE_CHOICES], required=False)
    provider = serializers.CharField(required=False, allow_blank=True)
    coverageLevel = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=[choice[0] for choice in BenefitEnrollment.STATUS_CHOICES], required=False)
    monthlyCost = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    employeeContribution = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    effectiveDate = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class BenefitEnrollmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['Enrolled', 'Waived'], required=False)
    note = serializers.CharField(required=False, allow_blank=True)


class ExpenseClaimSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = ExpenseClaim
        fields = [
            'claimID', 'employeeID', 'employeeName', 'department', 'team',
            'title', 'category', 'amount', 'approvedAmount', 'expenseDate', 'description',
            'status', 'reviewNote', 'reviewedBy', 'reviewedAt', 'createdAt', 'updatedAt'
        ]


class ExpenseClaimCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=160)
    category = serializers.ChoiceField(choices=[choice[0] for choice in ExpenseClaim.CATEGORY_CHOICES], required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    expenseDate = serializers.DateField()
    description = serializers.CharField(required=False, allow_blank=True)


class ExpenseClaimReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['Approved', 'Rejected', 'Reimbursed'])
    note = serializers.CharField(required=False, allow_blank=True)
    approvedAmount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True, min_value=0,
    )

    def validate(self, attrs):
        if attrs.get('status') == 'Rejected' and not (attrs.get('note') or '').strip():
            raise serializers.ValidationError({'note': 'Please provide a short reason before rejecting this expense claim.'})
        return attrs


class DocumentRequestSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = DocumentRequest
        fields = [
            'requestID', 'employeeID', 'employeeName', 'department', 'team',
            'documentType', 'purpose', 'notes', 'status', 'reviewNote',
            'issuedBy', 'issuedAt', 'createdAt', 'updatedAt'
        ]


class DocumentRequestCreateSerializer(serializers.Serializer):
    documentType = serializers.ChoiceField(choices=[choice[0] for choice in DocumentRequest.DOCUMENT_TYPE_CHOICES], required=False)
    purpose = serializers.CharField(max_length=180)
    notes = serializers.CharField(required=False, allow_blank=True)


class DocumentRequestIssueSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['In Progress', 'Issued', 'Declined'])
    note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get('status') == 'Declined' and not (attrs.get('note') or '').strip():
            raise serializers.ValidationError({'note': 'Please provide a short reason before declining this document request.'})
        return attrs


class SupportTicketSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            'ticketID', 'employeeID', 'employeeName', 'department', 'team',
            'subject', 'category', 'priority', 'description', 'status',
            'resolutionNote', 'assignedTo', 'resolvedAt', 'createdAt', 'updatedAt'
        ]


class SupportTicketMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicketMessage
        fields = ['messageID', 'authorRole', 'authorName', 'body', 'isResolution', 'createdAt']


class SupportTicketDetailSerializer(SupportTicketSerializer):
    """Ticket plus its full conversation thread."""
    messages = SupportTicketMessageSerializer(many=True, read_only=True)

    class Meta(SupportTicketSerializer.Meta):
        fields = SupportTicketSerializer.Meta.fields + ['messages']


class SupportTicketCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=180)
    category = serializers.ChoiceField(choices=[choice[0] for choice in SupportTicket.CATEGORY_CHOICES], required=False)
    priority = serializers.ChoiceField(choices=[choice[0] for choice in SupportTicket.PRIORITY_CHOICES], required=False)
    description = serializers.CharField(required=False, allow_blank=True)


class SupportTicketStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['In Progress', 'Resolved', 'Closed'])
    note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get('status') in {'Resolved', 'Closed'} and not (attrs.get('note') or '').strip():
            raise serializers.ValidationError({'note': 'Please provide a short resolution note before closing this support ticket.'})
        return attrs
