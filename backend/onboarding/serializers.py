from rest_framework import serializers

from .models import OnboardingPlan


class OnboardingPlanSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)
    department = serializers.CharField(source='employee.department', read_only=True)
    team = serializers.CharField(source='employee.team', read_only=True)

    class Meta:
        model = OnboardingPlan
        fields = [
            'planID', 'employeeID', 'employeeName', 'department', 'team',
            'planType', 'title', 'status', 'progress', 'startDate', 'targetDate',
            'checklistItems', 'notes', 'employeeNote', 'createdBy', 'createdAt', 'updatedAt'
        ]


class OnboardingPlanCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    planType = serializers.ChoiceField(choices=[choice[0] for choice in OnboardingPlan.PLAN_TYPE_CHOICES], required=False)
    title = serializers.CharField(max_length=160)
    status = serializers.ChoiceField(choices=[choice[0] for choice in OnboardingPlan.STATUS_CHOICES], required=False)
    progress = serializers.IntegerField(required=False, min_value=0, max_value=100)
    startDate = serializers.DateField(required=False, allow_null=True)
    targetDate = serializers.DateField(required=False, allow_null=True)
    checklistItems = serializers.ListField(child=serializers.CharField(), required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class OnboardingPlanProgressSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[choice[0] for choice in OnboardingPlan.STATUS_CHOICES], required=False)
    progress = serializers.IntegerField(required=False, min_value=0, max_value=100)
    note = serializers.CharField(required=False, allow_blank=True)
