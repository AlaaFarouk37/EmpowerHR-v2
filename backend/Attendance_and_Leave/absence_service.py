"""Workday status resolution for payroll.

For a date range and an employee, every working day (weekends and public
holidays excluded) resolves to one of:

    present        – an attendance record with a clock-in exists that day
    paid_leave     – approved leave covers the day, leaveType.is_paid is True
    unpaid_leave   – approved leave covers the day, leaveType.is_paid is False
    unpaid_absence – no clock-in and no approved leave (a true no-show)

``unpaid_leave`` and ``unpaid_absence`` are the deductible days. This module is
the attendance/leave source of truth the payroll engine reads; it performs no
money math and writes nothing — the deduction is computed at payroll-run time
from the deductible-day count (see payroll/calculations.py).
"""
from .holiday_service import working_dates_in_range
from .models import AttendanceRecord, LeaveRequest

PRESENT = 'present'
PAID_LEAVE = 'paid_leave'            # approved leave on a paid type (is_paid=True)
UNPAID_LEAVE = 'unpaid_leave'        # approved leave on an unpaid type (is_paid=False) — deductible
UNPAID_ABSENCE = 'unpaid_absence'    # no-show with no approved leave — deductible

DEDUCTIBLE_STATUSES = (UNPAID_LEAVE, UNPAID_ABSENCE)


def resolve_workday_statuses(employee, start, end):
    """Resolve every working day in [start, end] to a status. Returns
    {date: status} for working days only (weekends/holidays are excluded).

    Both unpaid_leave and unpaid_absence reduce pay (see DEDUCTIBLE_STATUSES).
    """
    work_dates = working_dates_in_range(start, end)

    present = set(
        AttendanceRecord.objects.filter(
            employee=employee, date__gte=start, date__lte=end, clockIn__isnull=False,
        ).values_list('date', flat=True)
    )

    paid_leave_days, unpaid_leave_days = set(), set()
    for leave_start, leave_end, is_paid in LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequest.STATUS_APPROVED,
        startDate__lte=end,
        endDate__gte=start,
    ).values_list('startDate', 'endDate', 'leaveType__is_paid'):
        target = paid_leave_days if is_paid else unpaid_leave_days
        target.update(d for d in work_dates if leave_start <= d <= leave_end)

    statuses = {}
    for d in work_dates:
        if d in present:
            statuses[d] = PRESENT
        elif d in paid_leave_days:
            statuses[d] = PAID_LEAVE
        elif d in unpaid_leave_days:
            statuses[d] = UNPAID_LEAVE
        else:
            statuses[d] = UNPAID_ABSENCE
    return statuses


def count_deductible_days(employee, start, end):
    """Working days that reduce pay: approved unpaid-type leave + true no-shows."""
    return sum(
        1 for status in resolve_workday_statuses(employee, start, end).values()
        if status in DEDUCTIBLE_STATUSES
    )
