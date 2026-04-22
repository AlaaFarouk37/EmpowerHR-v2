from rest_framework import serializers
from .models import Department, Team, Job, LeaveType


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['department_id', 'name']
        read_only_fields = ['department_id']


class TeamSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Team
        fields = ['team_id', 'name', 'department', 'department_name']
        read_only_fields = ['team_id']


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = ['job_id', 'title', 'level', 'base_salary', 'benchmark_salary']
        read_only_fields = ['job_id', 'benchmark_salary']


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['leave_type_id', 'name', 'max_days_per_year']
        read_only_fields = ['leave_type_id']
