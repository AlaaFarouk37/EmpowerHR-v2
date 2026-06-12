"""HR-triggered absence detection and unpaid-leave salary deduction.

For a date range it finds working days (excluding weekends and public holidays)
on which an employee has no AttendanceRecord and is not on approved leave,
treats each as an unpaid-leave day, and records a payroll Deduction:

    one_day_pay = monthlyIncome / working_days_in_month(month)

where working days exclude weekends and public holidays. Idempotent: every
created Deduction is tagged ``[auto-absence:YYYY-MM-DD]`` so re-running the same
range never double-counts a day.
"""
from decimal import Decimal, ROUND_HALF_UP

from payroll.models import Deduction

from .holiday_service import working_dates_in_range, working_days_in_month
from .models import AttendanceRecord, LeaveRequest

CENTS = Decimal('0.01')


def _absence_tag(day):
    return f'[auto-absence:{day.isoformat()}]'


def _day_pay(monthly_income, year, month):
    working = working_days_in_month(year, month)
    if not working or not monthly_income:
        return Decimal('0.00')
    return (Decimal(monthly_income) / Decimal(working)).quantize(CENTS, rounding=ROUND_HALF_UP)


def detect_and_deduct(employee, start, end, created_by=''):
    """Run absence detection + deduction for one employee. Returns a summary."""
    work_dates = working_dates_in_range(start, end)

    present = set(
        AttendanceRecord.objects.filter(
            employee=employee, date__gte=start, date__lte=end,
        ).values_list('date', flat=True)
    )

    approved_leaves = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequest.STATUS_APPROVED,
        startDate__lte=end,
        endDate__gte=start,
    ).values_list('startDate', 'endDate')
    on_leave = set()
    for leave_start, leave_end in approved_leaves:
        on_leave.update(d for d in work_dates if leave_start <= d <= leave_end)

    created, skipped = 0, 0
    deducted_total = Decimal('0.00')
    absence_days = []
    for d in work_dates:
        if d in present or d in on_leave:
            continue
        absence_days.append(d)
        pay_period = f'{d.year:04d}-{d.month:02d}'
        tag = _absence_tag(d)
        if Deduction.objects.filter(
            employee=employee, payPeriod=pay_period, description__contains=tag,
        ).exists():
            skipped += 1
            continue
        amount = _day_pay(employee.monthlyIncome, d.year, d.month)
        Deduction.objects.create(
            employee=employee,
            payPeriod=pay_period,
            amount=amount,
            description=f'Unpaid absence {d.isoformat()} {tag}',
            createdBy=created_by,
        )
        created += 1
        deducted_total += amount

    return {
        'employeeID': employee.employeeID,
        'employeeName': employee.fullName,
        'absenceDayCount': len(absence_days),
        'absenceDays': [d.isoformat() for d in absence_days],
        'deductionsCreated': created,
        'deductionsSkipped': skipped,
        'amountDeducted': str(deducted_total),
    }
