from datetime import timedelta

from datetime import timedelta

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsHRManager, IsInternalEmployee
from employee_management.models import Employee
from .models import OnboardingPlan
from .serializers import (
    OnboardingPlanSerializer,
    OnboardingPlanCreateSerializer,
    OnboardingPlanProgressSerializer,
)


def _label(value):
    """Return the .name of an FK instance (Team / Department), or '' if None."""
    return getattr(value, 'name', '') or ''


def _resolve_employee(employee_id, request_user=None):
    employee = Employee.objects.filter(pk=employee_id, isDeleted=False).first()
    if employee:
        return employee

    if request_user and getattr(request_user, 'employee_id', None) == employee_id:
        return Employee.objects.create(
            employeeID=employee_id,
            fullName=getattr(request_user, 'full_name', '') or request_user.email,
            employmentStatus='Active',
        )
    return None


class EmployeeOnboardingListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        plans = OnboardingPlan.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        type_filter = request.query_params.get('plan_type')
        if type_filter:
            plans = plans.filter(planType=type_filter)

        return Response(OnboardingPlanSerializer(plans.order_by('targetDate', '-createdAt'), many=True).data)


class EmployeeOnboardingProgressView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, plan_id):
        try:
            plan = OnboardingPlan.objects.select_related('employee').get(pk=plan_id)
        except OnboardingPlan.DoesNotExist:
            return Response({'error': 'Onboarding plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        request_employee_id = getattr(request.user, 'employee_id', None)
        if plan.employee_id != request_employee_id and getattr(request.user, 'role', None) not in ('HRManager', 'Admin'):
            return Response({'error': 'You can only update your own onboarding plan.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = OnboardingPlanProgressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        plan.status = data.get('status', plan.status)
        plan.progress = data.get('progress', plan.progress)
        if 'note' in data:
            plan.employeeNote = data.get('note', plan.employeeNote)
        if plan.progress >= 100:
            plan.progress = 100
            plan.status = 'Completed'
        plan.save(update_fields=['status', 'progress', 'employeeNote', 'updatedAt'])
        return Response(OnboardingPlanSerializer(plan).data)


class HROnboardingWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        today = timezone.localdate()
        plans = list(
            OnboardingPlan.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('targetDate', '-createdAt')
        )

        def get_due_state(plan):
            if plan.status == 'Completed':
                return 'Completed'
            if plan.status == 'Blocked':
                return 'Blocked'
            if plan.targetDate:
                if plan.targetDate < today:
                    return 'Overdue'
                if plan.targetDate <= today + timedelta(days=3):
                    return 'Due Soon'
            if plan.status == 'Not Started' and plan.startDate and plan.startDate <= today:
                return 'Needs Kickoff'
            return 'On Track'

        follow_up_items = []
        enriched_plans = []
        for plan in plans:
            due_state = get_due_state(plan)
            days_to_target = (plan.targetDate - today).days if plan.targetDate else None
            item = {
                'planID': plan.planID,
                'employeeName': plan.employee.fullName,
                'employeeID': plan.employee_id,
                'planType': plan.planType,
                'title': plan.title,
                'department': _label(plan.employee.department),
                'team': _label(plan.employee.team),
                'status': plan.status,
                'progress': plan.progress,
                'targetDate': plan.targetDate.isoformat() if plan.targetDate else None,
                'dueState': due_state,
                'daysToTarget': days_to_target,
                'checklistCount': len(plan.checklistItems or []),
                'notes': plan.notes,
            }
            enriched_plans.append(item)
            if due_state in {'Blocked', 'Overdue', 'Due Soon', 'Needs Kickoff'}:
                follow_up_items.append(item)

        summary = {
            'totalPlans': len(plans),
            'onboardingCount': sum(1 for plan in plans if plan.planType == 'Onboarding'),
            'transitionCount': sum(1 for plan in plans if plan.planType == 'Transition'),
            'offboardingCount': sum(1 for plan in plans if plan.planType == 'Offboarding'),
            'overduePlans': sum(1 for item in enriched_plans if item['dueState'] == 'Overdue'),
            'blockedPlans': sum(1 for plan in plans if plan.status == 'Blocked'),
            'dueSoonPlans': sum(1 for item in enriched_plans if item['dueState'] == 'Due Soon'),
            'kickoffNeeded': sum(1 for item in enriched_plans if item['dueState'] == 'Needs Kickoff'),
            'followUpCount': len(follow_up_items),
            'averageProgress': round(sum(plan.progress for plan in plans) / len(plans), 1) if plans else 0,
        }

        plan_type_breakdown = []
        for plan_type in ['Onboarding', 'Transition', 'Offboarding']:
            type_items = [item for item in enriched_plans if item['planType'] == plan_type]
            if not type_items:
                continue
            plan_type_breakdown.append({
                'planType': plan_type,
                'totalCount': len(type_items),
                'completedCount': sum(1 for item in type_items if item['status'] == 'Completed'),
                'followUpCount': sum(1 for item in type_items if item['dueState'] in {'Blocked', 'Overdue', 'Due Soon', 'Needs Kickoff'}),
                'averageProgress': round(sum(item['progress'] for item in type_items) / len(type_items), 1),
            })

        severity_rank = {'Blocked': 0, 'Overdue': 1, 'Due Soon': 2, 'Needs Kickoff': 3, 'On Track': 4, 'Completed': 5}
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (
                severity_rank.get(item['dueState'], 9),
                item['daysToTarget'] if item['daysToTarget'] is not None else 999,
                item['progress'],
            ),
        )[:8]

        return Response({
            'summary': summary,
            'planTypeBreakdown': plan_type_breakdown,
            'followUpItems': follow_up_items,
        })


class HROnboardingPlanListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        plans = OnboardingPlan.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')
        plan_type = request.query_params.get('plan_type')
        if employee_id:
            plans = plans.filter(employee_id=employee_id)
        if status_filter:
            plans = plans.filter(status=status_filter)
        if plan_type:
            plans = plans.filter(planType=plan_type)

        return Response(OnboardingPlanSerializer(plans.order_by('targetDate', '-createdAt'), many=True).data)

    def post(self, request):
        serializer = OnboardingPlanCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        plan = OnboardingPlan.objects.create(
            employee=employee,
            planType=serializer.validated_data.get('planType', 'Onboarding'),
            title=serializer.validated_data['title'],
            status=serializer.validated_data.get('status', 'Not Started'),
            progress=serializer.validated_data.get('progress', 0),
            startDate=serializer.validated_data.get('startDate'),
            targetDate=serializer.validated_data.get('targetDate'),
            checklistItems=serializer.validated_data.get('checklistItems', []),
            notes=serializer.validated_data.get('notes', ''),
            createdBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        if plan.progress >= 100:
            plan.progress = 100
            plan.status = 'Completed'
            plan.save(update_fields=['progress', 'status'])
        return Response(OnboardingPlanSerializer(plan).data, status=status.HTTP_201_CREATED)
