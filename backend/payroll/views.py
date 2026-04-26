from decimal import Decimal
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsHRManager, IsInternalEmployee, IsAdmin
from employee_management.models import Employee
from .models import PayrollRecord
from .serializers import PayrollRecordSerializer, PayrollRecordCreateSerializer, PayrollMarkPaidSerializer


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


def _calculate_net_pay(base_salary, allowances, deductions, bonus):
    return base_salary + allowances - deductions + bonus


class PayrollRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = PayrollRecordSerializer
    permission_classes = [IsHRManager | IsAdmin]

    def get_queryset(self):
        return PayrollRecord.objects.all()

    def perform_create(self, serializer):
        serializer.save()


class PayrollRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PayrollRecordSerializer
    permission_classes = [IsHRManager | IsAdmin]

    def get_queryset(self):
        return PayrollRecord.objects.all()


class EmployeePayrollListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        records = PayrollRecord.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        if status_filter:
            records = records.filter(status=status_filter)

        return Response(PayrollRecordSerializer(records.order_by('-payPeriod', '-createdAt'), many=True).data)


class HRPayrollWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        now = timezone.now()
        records = list(
            PayrollRecord.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-payPeriod', '-createdAt')
        )

        def follow_up_state(record):
            age_days = max((now - (record.createdAt or now)).days, 0)
            if record.status != PayrollRecord.STATUS_PAID:
                if age_days >= 4:
                    return 'Overdue Release'
                return 'Ready to Release'
            if record.status == PayrollRecord.STATUS_PAID and not record.paymentDate:
                return 'Payment Date Missing'
            return record.status

        follow_up_items = []
        department_map = {}
        total_net_pay = Decimal('0')
        paid_amount = Decimal('0')
        pending_amount = Decimal('0')

        for record in records:
            department = _label(record.employee.department) or 'Unassigned'
            entry = department_map.setdefault(department, {
                'department': department,
                'count': 0,
                'draftCount': 0,
                'paidCount': 0,
                'netPayTotal': 0.0,
                'pendingAmount': 0.0,
            })
            entry['count'] += 1
            entry['netPayTotal'] += float(record.netPay or 0)
            total_net_pay += record.netPay or Decimal('0')

            if record.status == PayrollRecord.STATUS_PAID:
                entry['paidCount'] += 1
                paid_amount += record.netPay or Decimal('0')
            else:
                entry['draftCount'] += 1
                pending_amount += record.netPay or Decimal('0')
                entry['pendingAmount'] += float(record.netPay or 0)

            state = follow_up_state(record)
            if state in {'Overdue Release', 'Ready to Release', 'Payment Date Missing'}:
                age_days = max((now - (record.createdAt or now)).days, 0)
                follow_up_items.append({
                    'payrollID': record.payrollID,
                    'employeeName': record.employee.fullName,
                    'employeeID': record.employee_id,
                    'department': department,
                    'payPeriod': record.payPeriod,
                    'currency': record.currency or record.employee.currency_preference,
                    'status': record.status,
                    'followUpState': state,
                    'ageDays': age_days,
                    'netPay': round(float(record.netPay or 0), 2),
                    'paymentDate': record.paymentDate.isoformat() if record.paymentDate else None,
                    'summary': record.notes or 'Payroll record is waiting for release or payment confirmation.',
                    'path': '/hr/payroll',
                })

        state_rank = {
            'Overdue Release': 0,
            'Payment Date Missing': 1,
            'Ready to Release': 2,
        }
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (
                state_rank.get(item['followUpState'], 9),
                -item['ageDays'],
                item['employeeName'],
            ),
        )[:8]

        department_breakdown = sorted(
            department_map.values(),
            key=lambda item: (-item['draftCount'], -item['pendingAmount'], item['department']),
        )

        return Response({
            'summary': {
                'totalRecords': len(records),
                'draftCount': sum(1 for record in records if record.status != PayrollRecord.STATUS_PAID),
                'paidCount': sum(1 for record in records if record.status == PayrollRecord.STATUS_PAID),
                'overdueCount': sum(1 for record in records if follow_up_state(record) == 'Overdue Release'),
                'followUpCount': len(follow_up_items),
                'totalNetPay': round(float(total_net_pay), 2),
                'paidAmount': round(float(paid_amount), 2),
                'pendingAmount': round(float(pending_amount), 2),
            },
            'departmentBreakdown': department_breakdown,
            'followUpItems': follow_up_items,
        })


class HRPayrollListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        records = PayrollRecord.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        pay_period = request.query_params.get('pay_period')
        status_filter = request.query_params.get('status')

        if employee_id:
            records = records.filter(employee_id=employee_id)
        if pay_period:
            records = records.filter(payPeriod=pay_period)
        if status_filter:
            records = records.filter(status=status_filter)

        return Response(PayrollRecordSerializer(records.order_by('-payPeriod', '-createdAt'), many=True).data)

    def post(self, request):
        serializer = PayrollRecordCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        pay_period = serializer.validated_data['payPeriod']
        if PayrollRecord.objects.filter(employee=employee, payPeriod=pay_period).exists():
            return Response({'error': 'Payroll record for this employee and pay period already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        base_salary = serializer.validated_data.get('baseSalary')
        if base_salary is None:
            if employee.monthlyIncome is None:
                return Response({'error': 'Base salary is required or missing from the employee profile.'}, status=status.HTTP_400_BAD_REQUEST)
            base_salary = Decimal(str(employee.monthlyIncome)).quantize(Decimal('0.01'))

        allowances = serializer.validated_data.get('allowances', Decimal('0.00'))
        deductions = serializer.validated_data.get('deductions', Decimal('0.00'))
        bonus = serializer.validated_data.get('bonus', Decimal('0.00'))
        currency = serializer.validated_data.get('currency') or employee.currency_preference or 'EGP'

        user_account = getattr(employee, 'user_account', None)
        if user_account and currency != user_account.currency_preference:
            user_account.currency_preference = currency
            user_account.save(update_fields=['currency_preference'])

        payroll = PayrollRecord.objects.create(
            employee=employee,
            payPeriod=pay_period,
            currency=currency,
            baseSalary=base_salary,
            allowances=allowances,
            deductions=deductions,
            bonus=bonus,
            netPay=_calculate_net_pay(base_salary, allowances, deductions, bonus),
            notes=serializer.validated_data.get('notes', ''),
        )
        return Response(PayrollRecordSerializer(payroll).data, status=status.HTTP_201_CREATED)


class HRPayrollMarkPaidView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, payroll_id):
        try:
            payroll = PayrollRecord.objects.select_related('employee').get(pk=payroll_id)
        except PayrollRecord.DoesNotExist:
            return Response({'error': 'Payroll record not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PayrollMarkPaidSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        payroll.status = PayrollRecord.STATUS_PAID
        payroll.paymentDate = serializer.validated_data.get('paymentDate') or timezone.localdate()
        payroll.save(update_fields=['status', 'paymentDate'])
        return Response(PayrollRecordSerializer(payroll).data)
