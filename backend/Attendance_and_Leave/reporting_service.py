"""Per-employee and org-wide attendance analytics for HR reporting.

Aggregates AttendanceRecord / LeaveRequest data over a chosen week or month,
reusing the working-day rules in holiday_service (Egyptian Fri/Sat weekend +
effective public holidays) and the lateness rule in serializers.late_minutes.

A 'no-show' is a working day with no attendance record on which the employee is
not on approved leave; this mirrors absence_service. Future working days in the
period are never counted as no-shows.
"""
from __future__ import annotations

import calendar
from datetime import timedelta

from django.utils import timezone

from employee_management.models import Employee
from .holiday_service import working_dates_in_range
from .models import AttendanceRecord, LeaveRequest
from .serializers import late_minutes, LATE_GRACE_MINUTES


def _is_late(record):
    minutes = late_minutes(record)
    return minutes is not None and minutes > LATE_GRACE_MINUTES


def _week_bounds(anchor):
    """Egyptian work week is Sun→Thu, so anchor the 7-day window on the Sunday
    on/before the given date (Sun..Sat)."""
    days_since_sunday = (anchor.weekday() + 1) % 7  # weekday(): Mon=0 .. Sun=6
    start = anchor - timedelta(days=days_since_sunday)
    return start, start + timedelta(days=6)


def _month_bounds(anchor):
    last = calendar.monthrange(anchor.year, anchor.month)[1]
    return anchor.replace(day=1), anchor.replace(day=last)


def resolve_period(range_kind, anchor):
    return _week_bounds(anchor) if range_kind == 'week' else _month_bounds(anchor)


def _rate(numerator, denominator):
    return round(numerator / denominator * 100, 1) if denominator else None


def build_report(range_kind, anchor):
    start, end = resolve_period(range_kind, anchor)
    work_dates = working_dates_in_range(start, end)
    work_date_set = set(work_dates)
    today = timezone.localdate()
    # No-shows only make sense for days that have already happened.
    countable_noshow_dates = [d for d in work_dates if d <= today]

    employees = list(
        Employee.objects.filter(isDeleted=False, employmentStatus='Active')
        .exclude(user_account__role__in=['Admin', 'HRManager'])
        .select_related('team', 'department')
    )
    emp_ids = [e.employeeID for e in employees]

    records_by_emp = {}
    for record in AttendanceRecord.objects.filter(
        employee_id__in=emp_ids, date__gte=start, date__lte=end,
    ):
        records_by_emp.setdefault(record.employee_id, []).append(record)

    leaves_by_emp = {}
    for emp_id, leave_start, leave_end in LeaveRequest.objects.filter(
        employee_id__in=emp_ids, status=LeaveRequest.STATUS_APPROVED,
        startDate__lte=end, endDate__gte=start,
    ).values_list('employee_id', 'startDate', 'endDate'):
        leaves_by_emp.setdefault(emp_id, []).append((leave_start, leave_end))

    rows = []
    total_late = total_noshow = total_attended = on_leave_employees = 0

    for emp in employees:
        # late_minutes reads emp.default_clock_in; reuse the prefetched instance.
        records = records_by_emp.get(emp.employeeID, [])
        for record in records:
            record.employee = emp

        present_dates = {r.date for r in records if r.clockIn}
        attended = len(present_dates)
        late = sum(1 for r in records if r.clockIn and _is_late(r))

        on_leave_dates = set()
        for leave_start, leave_end in leaves_by_emp.get(emp.employeeID, []):
            on_leave_dates.update(d for d in work_date_set if leave_start <= d <= leave_end)
        leave_days = len(on_leave_dates)

        no_shows = sum(
            1 for d in countable_noshow_dates
            if d not in present_dates and d not in on_leave_dates
        )

        rows.append({
            'employeeID': emp.employeeID,
            'employeeName': emp.fullName,
            'department': getattr(emp.department, 'name', '') or '',
            'team': getattr(emp.team, 'name', '') or '',
            'lateCount': late,
            'noShowCount': no_shows,
            'leaveDays': leave_days,
            'attendedDays': attended,
            'punctualityRate': _rate(attended - late, attended),
        })

        total_late += late
        total_noshow += no_shows
        total_attended += attended
        if leave_days:
            on_leave_employees += 1

    rows.sort(key=lambda x: (-x['lateCount'], -x['noShowCount'], x['employeeName']))

    return {
        'range': range_kind,
        'periodStart': start.isoformat(),
        'periodEnd': end.isoformat(),
        'workingDays': len(work_dates),
        'summary': {
            'employeeCount': len(employees),
            'onLeaveEmployeeCount': on_leave_employees,
            'totalLateInstances': total_late,
            'totalNoShows': total_noshow,
            'totalAttendedDays': total_attended,
            'overallPunctualityRate': _rate(total_attended - total_late, total_attended),
        },
        'employees': rows,
    }
