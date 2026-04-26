from rest_framework import serializers
from .models import AttendanceRecord, LeaveRequest


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = '__all__'


class LeaveRequestSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)

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