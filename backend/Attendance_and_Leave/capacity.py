"""Weekly available-capacity for the utilization rate.

Available hours = weekly contracted hours minus the hours lost to public
holidays and approved leave that fall in the current Egyptian work week
(Sunday–Thursday). Weekends are already outside the contracted week.

    hours_per_day      = contracted_hours_day, else contracted_hours / 5, else 8
    contracted_week    = contracted_hours, else hours_per_day * 5
    lost_hours         = (holiday work-days + approved-leave work-days) * hours_per_day
    available_hours    = max(0, contracted_week - lost_hours)
"""
from datetime import timedelta

from django.utils import timezone

from . import holiday_service
from .models import LeaveRequest

STANDARD_WORK_DAYS = 5          # Sun–Thu
DEFAULT_HOURS_PER_DAY = 8.0


def current_work_week(reference=None):
    """(week_start, work_end) for the Sun–Thu work week containing ``reference``."""
    ref = reference or timezone.localdate()
    week_start = ref - timedelta(days=(ref.weekday() + 1) % 7)  # Sunday on/before ref
    return week_start, week_start + timedelta(days=4)           # Thursday


def _hours_per_day(employee):
    if employee.contracted_hours_day:
        return float(employee.contracted_hours_day)
    if employee.contracted_hours:
        return float(employee.contracted_hours) / STANDARD_WORK_DAYS
    return DEFAULT_HOURS_PER_DAY


def _contracted_week(employee, hours_per_day):
    if employee.contracted_hours:
        return float(employee.contracted_hours)
    return hours_per_day * STANDARD_WORK_DAYS


def weekly_capacity(employees, reference=None):
    """Per-employee available hours this work week. Returns (meta, rows)."""
    week_start, work_end = current_work_week(reference)
    working_dates = set(holiday_service.working_dates_in_range(week_start, work_end))
    holiday_days = STANDARD_WORK_DAYS - len(working_dates)

    employees = list(employees)
    emp_ids = [e.employeeID for e in employees]

    # Approved leave (any type — an absence reduces availability) overlapping the week.
    leave_days_by_emp = {}
    for eid, start, end in LeaveRequest.objects.filter(
        employee_id__in=emp_ids,
        status=LeaveRequest.STATUS_APPROVED,
        startDate__lte=work_end,
        endDate__gte=week_start,
    ).values_list('employee_id', 'startDate', 'endDate'):
        bucket = leave_days_by_emp.setdefault(eid, set())
        bucket.update(d for d in working_dates if start <= d <= end)

    rows = []
    for emp in employees:
        hpd = _hours_per_day(emp)
        contracted = _contracted_week(emp, hpd)
        leave_days = len(leave_days_by_emp.get(emp.employeeID, ()))
        lost = (holiday_days + leave_days) * hpd
        available = max(0.0, contracted - lost)
        rows.append({
            'employeeID': emp.employeeID,
            'employeeName': emp.fullName,
            'contractedHoursWeek': round(contracted, 2),
            'hoursPerDay': round(hpd, 2),
            'holidayDays': holiday_days,
            'leaveDays': leave_days,
            'availableHours': round(available, 2),
        })

    meta = {
        'weekStart': week_start.isoformat(),
        'weekEnd': work_end.isoformat(),
        'holidayDays': holiday_days,
    }
    return meta, rows
