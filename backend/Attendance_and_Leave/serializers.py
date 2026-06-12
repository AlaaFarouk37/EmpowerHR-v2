from rest_framework import serializers
from employee_management.models import LeaveType
from .models import (
    AttendanceRecord, LeaveRequest, TimeCorrectionRequest,
    HolidayOverride, LeaveBalance,
)


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    employeeTeam = serializers.CharField(source='employee.team', read_only=True)
    employeeDepartment = serializers.CharField(source='employee.department', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = '__all__'


class LeaveRequestSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    # leaveType is an FK to employee_management.LeaveType but the API keeps
    # exchanging the type *name* string (e.g. 'Annual') for frontend compatibility.
    leaveType = serializers.SlugRelatedField(
        slug_field='name', queryset=LeaveType.objects.all())

    class Meta:
        model = LeaveRequest
        fields = '__all__'


class AttendanceClockSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    action = serializers.ChoiceField(choices=['clock_in', 'clock_out'])
    notes = serializers.CharField(required=False, allow_blank=True)


class LeaveRequestCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    leaveType = serializers.ChoiceField(choices=[choice[0] for choice in LeaveRequest.LEAVE_TYPES])
    startDate = serializers.DateField()
    endDate = serializers.DateField()
    reason = serializers.CharField(required=False, allow_blank=True)
    document = serializers.FileField(required=False, allow_null=True)


class TimeCorrectionRequestSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    currentClockIn = serializers.DateTimeField(source='attendance.clockIn', read_only=True)
    currentClockOut = serializers.DateTimeField(source='attendance.clockOut', read_only=True)

    class Meta:
        model = TimeCorrectionRequest
        fields = [
            'correctionID', 'employeeID', 'employeeName', 'attendance', 'date',
            'currentClockIn', 'currentClockOut', 'requestedClockIn', 'requestedClockOut',
            'reason', 'status', 'reviewNote', 'reviewedBy', 'reviewedAt', 'createdAt',
        ]


class TimeCorrectionCreateSerializer(serializers.Serializer):
    attendanceID = serializers.CharField(max_length=50)
    requestedClockIn = serializers.DateTimeField(required=False, allow_null=True)
    requestedClockOut = serializers.DateTimeField(required=False, allow_null=True)
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get('requestedClockIn') and not attrs.get('requestedClockOut'):
            raise serializers.ValidationError('Provide a corrected clock in and/or clock out time.')
        return attrs


class TimeCorrectionReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'deny'])
    reviewNote = serializers.CharField(required=False, allow_blank=True)
    # Optional TL edits to the requested times before approving.
    requestedClockIn = serializers.DateTimeField(required=False, allow_null=True)
    requestedClockOut = serializers.DateTimeField(required=False, allow_null=True)


class HolidayOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HolidayOverride
        fields = '__all__'


class HolidayOverrideCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    type = serializers.ChoiceField(choices=[HolidayOverride.TYPE_ADD, HolidayOverride.TYPE_REMOVE])


class LeaveBalanceSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    remainingDays = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        fields = [
            'balanceID', 'employee', 'employeeName', 'leaveTypeName', 'leaveType',
            'year', 'entitledDays', 'usedDays', 'remainingDays', 'createdAt', 'updatedAt',
        ]

    def get_remainingDays(self, obj):
        return obj.remainingDays


class AbsenceRunSerializer(serializers.Serializer):
    startDate = serializers.DateField()
    endDate = serializers.DateField()
    employeeID = serializers.CharField(required=False, allow_blank=True, max_length=50)

    def validate(self, attrs):
        if attrs['endDate'] < attrs['startDate']:
            raise serializers.ValidationError('endDate must be on or after startDate.')
        return attrs