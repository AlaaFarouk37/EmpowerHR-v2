"""Payroll calculation helpers for EmpowerHR.

Net pay formula (monthly pay period):

    net = proratedBase
          - unpaidLeaveDeduction
          + commissions
          - deductions (manual HR)
          + approvedExpenseReimbursements

Where:
    dailyRate        = baseSalary / weekdays_in_month
    proratedBase     = dailyRate * weekdaysEmployed   (employment window clipped to the month)
    unpaidLeaveDed   = dailyRate * unpaid-leave weekdays falling within the employment window

"Working days" are the Egyptian work week Sun-Thu; the Fri/Sat weekend is excluded,
and (in the DB-aware path) public holidays are excluded too via the combined helper.

The date-math functions in this module are pure (no DB access) so they can be
unit-tested directly. ``compute_payroll`` is the thin DB-aware entry point.
"""

from __future__ import annotations

import calendar
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

CENTS = Decimal('0.01')
_ONE_DAY = timedelta(days=1)
DEFAULT_HOURS_PER_DAY = Decimal('8')
OVERTIME_MULTIPLIER = Decimal('1.5')

# Egyptian work week is Sun–Thu, so the weekend is Fri(4)+Sat(5). Mirrors
# Attendance_and_Leave.holiday_service.WEEKEND_DAYS (kept local so this pure
# module doesn't import the holidays library).
WEEKEND_DAYS = (4, 5)


def _money(value) -> Decimal:
    """Quantize to 2 decimal places using banker-friendly half-up rounding."""
    return Decimal(value).quantize(CENTS, rounding=ROUND_HALF_UP)


def parse_pay_period(pay_period: str):
    """'YYYY-MM' -> (period_start, period_end) as the first/last day of month."""
    year, month = (int(part) for part in pay_period.split('-'))
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def weekdays_between(start: date, end: date, holidays=None) -> int:
    """Count working days in the inclusive range [start, end], excluding the
    Fri/Sat weekend and any dates in ``holidays`` (public holidays).

    Returns 0 if the range is empty (end < start)."""
    if end < start:
        return 0
    holidays = holidays or ()
    count = 0
    current = start
    while current <= end:
        if current.weekday() not in WEEKEND_DAYS and current not in holidays:
            count += 1
        current += _ONE_DAY
    return count


def weekdays_in_month(year: int, month: int, holidays=None) -> int:
    last_day = calendar.monthrange(year, month)[1]
    return weekdays_between(date(year, month, 1), date(year, month, last_day), holidays)


def employment_window(period_start: date, period_end: date,
                      hiring_date=None, leaving_date=None):
    """Intersect the pay-period month with the employee's employment window.

    Returns (window_start, window_end), or None if the employee was not
    employed at all during the month (joined after it ended, or left before it
    began)."""
    window_start = period_start
    window_end = period_end
    if hiring_date and hiring_date > window_start:
        window_start = hiring_date
    if leaving_date and leaving_date < window_end:
        window_end = leaving_date
    if window_end < window_start:
        return None
    return window_start, window_end


def unpaid_leave_weekdays(intervals, window_start: date, window_end: date, holidays=None) -> int:
    """Count unique working days covered by any unpaid-leave interval, clipped
    to the employment window. Excludes the Fri/Sat weekend and any ``holidays``
    so a public holiday inside an unpaid-leave span is never deducted.

    ``intervals`` is an iterable of (start_date, end_date) pairs. Overlapping
    intervals are de-duplicated so a day is never counted twice."""
    holidays = holidays or ()
    counted = set()
    for start, end in intervals:
        clip_start = max(start, window_start)
        clip_end = min(end, window_end)
        current = clip_start
        while current <= clip_end:
            if current.weekday() not in WEEKEND_DAYS and current not in holidays:
                counted.add(current)
            current += _ONE_DAY
    return len(counted)


DAILY_RATE_BASIS_WORKING = 'working_days'
DAILY_RATE_BASIS_CALENDAR = 'calendar_days'
DAILY_RATE_BASIS_FIXED_30 = 'fixed_30'


def _rate_divisor(basis, year, month, holidays=None):
    """Days the full monthly salary is spread across, per the configured basis."""
    if basis == DAILY_RATE_BASIS_CALENDAR:
        return calendar.monthrange(year, month)[1]
    if basis == DAILY_RATE_BASIS_FIXED_30:
        return 30
    return weekdays_in_month(year, month, holidays)


def _employed_days(basis, window_start, window_end, holidays=None):
    """Days inside the employment window, counted on the same basis as the divisor."""
    if basis in (DAILY_RATE_BASIS_CALENDAR, DAILY_RATE_BASIS_FIXED_30):
        return (window_end - window_start).days + 1
    return weekdays_between(window_start, window_end, holidays)


def compute_breakdown(base_salary, pay_period, hiring_date, leaving_date,
                      unpaid_days, manual_deductions, commissions,
                      expense_reimbursements, overtime_hours=0, hours_per_day=None,
                      holidays=None, daily_rate_basis=DAILY_RATE_BASIS_WORKING):
    """Pure computation of the full payroll breakdown.

    ``unpaid_days`` is the count of deductible no-show / unpaid-leave WORKING days
    in the period, already clipped to the employment window by the caller.

    ``daily_rate_basis`` controls the daily-rate divisor and the proration
    day-count: 'working_days' (Sun–Thu, holiday-aware), 'calendar_days' (all days
    in the month) or 'fixed_30'. The unpaid-day count is always working-day based
    regardless of basis — weekends and holidays are never absences.

    All monetary inputs may be int/float/Decimal/str; outputs are Decimal
    quantized to cents (except day counts, ints, and the rates kept at 4 dp).
    """
    base_salary = Decimal(str(base_salary or 0))
    manual_deductions = _money(manual_deductions or 0)
    commissions = _money(commissions or 0)
    expense_reimbursements = _money(expense_reimbursements or 0)
    unpaid_days = int(unpaid_days or 0)

    period_start, period_end = parse_pay_period(pay_period)
    divisor = _rate_divisor(daily_rate_basis, period_start.year, period_start.month, holidays)

    daily_rate = (base_salary / Decimal(divisor)) if divisor else Decimal('0')
    daily_rate_q = daily_rate.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)

    window = employment_window(period_start, period_end, hiring_date, leaving_date)
    if window is None:
        employed_days = 0
        unpaid_days = 0
    else:
        employed_days = _employed_days(daily_rate_basis, window[0], window[1], holidays)

    prorated_base = _money(daily_rate * Decimal(employed_days))
    unpaid_leave_deduction = _money(daily_rate * Decimal(unpaid_days))

    hpd = Decimal(str(hours_per_day)) if hours_per_day else Decimal('0')
    if hpd <= 0:
        hpd = DEFAULT_HOURS_PER_DAY
    hourly_rate = (daily_rate / hpd) if daily_rate else Decimal('0')
    hourly_rate_q = hourly_rate.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
    overtime_hours_d = Decimal(str(overtime_hours or 0))
    overtime_pay = _money(hourly_rate * overtime_hours_d * OVERTIME_MULTIPLIER)

    net_pay = _money(
        prorated_base
        - unpaid_leave_deduction
        + commissions
        - manual_deductions
        + expense_reimbursements
        + overtime_pay
    )

    return {
        'baseSalary': _money(base_salary),
        'workingDays': divisor,
        'weekdaysEmployed': employed_days,
        'unpaidLeaveDays': unpaid_days,
        'dailyRate': daily_rate_q,
        'proratedBaseSalary': prorated_base,
        'unpaidLeaveDeduction': unpaid_leave_deduction,
        'commissions': commissions,
        'deductions': manual_deductions,
        'expenseReimbursements': expense_reimbursements,
        'hourlyRate': hourly_rate_q,
        'overtimeHours': overtime_hours_d.quantize(CENTS, rounding=ROUND_HALF_UP),
        'overtimePay': overtime_pay,
        'netPay': net_pay,
    }


# ── DB-aware entry point ──────────────────────────────────────────────────

def gather_approved_expense_total(employee, period_start, period_end):
    """Sum approvedAmount for HR-approved expense claims whose expenseDate falls
    within the pay period. Always uses approvedAmount (never the claimed amount).
    Claims approved but missing an approvedAmount contribute 0."""
    from employee_management.models import ExpenseClaim

    total = Decimal('0')
    claims = ExpenseClaim.objects.filter(
        employee=employee,
        status='Approved',
        expenseDate__gte=period_start,
        expenseDate__lte=period_end,
    ).values_list('approvedAmount', flat=True)
    for approved_amount in claims:
        if approved_amount is not None:
            total += approved_amount
    return _money(total)


def gather_commission_total(employee, pay_period):
    """Sum all manual Commission entries for the (employee, pay_period)."""
    from django.db.models import Sum
    from .models import Commission

    total = (
        Commission.objects.filter(employee=employee, payPeriod=pay_period)
        .aggregate(total=Sum('amount'))['total']
    )
    return _money(total or 0)


def gather_deduction_total(employee, pay_period):
    """Sum all manual Deduction entries for the (employee, pay_period). This is
    the HR-entered deduction total; it excludes the auto-computed unpaid-leave
    deduction."""
    from django.db.models import Sum
    from .models import Deduction

    total = (
        Deduction.objects.filter(employee=employee, payPeriod=pay_period)
        .aggregate(total=Sum('amount'))['total']
    )
    return _money(total or 0)


def gather_approved_overtime_hours(employee, period_start, period_end):
    """Sum overtimeHours for attendance records in the period whose overtime is
    approved (AUTO_APPROVED — set either by the auto 80% gate or by a Team
    Leader approving a PENDING_REVIEW record)."""
    from django.db.models import Sum
    from Attendance_and_Leave.models import AttendanceRecord

    total = (
        AttendanceRecord.objects.filter(
            employee=employee,
            overtimeStatus=AttendanceRecord.OT_AUTO_APPROVED,
            date__gte=period_start,
            date__lte=period_end,
        ).aggregate(total=Sum('overtimeHours'))['total']
    )
    return Decimal(str(total)) if total is not None else Decimal('0')


def compute_payroll(employee, pay_period, base_salary):
    """DB-aware orchestration: resolves deductible (no-show + unpaid-leave) days
    and pulls approved expenses, commissions, manual deductions and approved
    overtime, then returns the full breakdown dict (see compute_breakdown). The
    daily-rate basis comes from settings.PAYROLL_DAILY_RATE_BASIS."""
    from django.conf import settings
    from django.utils import timezone
    from Attendance_and_Leave.holiday_service import holiday_dates_in_range
    from Attendance_and_Leave import absence_service

    period_start, period_end = parse_pay_period(pay_period)
    holidays = holiday_dates_in_range(period_start, period_end)
    basis = getattr(settings, 'PAYROLL_DAILY_RATE_BASIS', DAILY_RATE_BASIS_WORKING)

    # Only days that have actually elapsed (today or earlier) can be unpaid —
    # future working days in the current month aren't deductions yet, so the
    # absence count is capped at today even though proration covers the period.
    window = employment_window(period_start, period_end,
                               employee.hiring_date, employee.leaving_date)
    unpaid_days = 0
    if window:
        absence_end = min(window[1], timezone.localdate())
        if absence_end >= window[0]:
            unpaid_days = absence_service.count_deductible_days(employee, window[0], absence_end)

    return compute_breakdown(
        base_salary=base_salary,
        pay_period=pay_period,
        hiring_date=employee.hiring_date,
        leaving_date=employee.leaving_date,
        unpaid_days=unpaid_days,
        manual_deductions=gather_deduction_total(employee, pay_period),
        commissions=gather_commission_total(employee, pay_period),
        expense_reimbursements=gather_approved_expense_total(employee, period_start, period_end),
        overtime_hours=gather_approved_overtime_hours(employee, period_start, period_end),
        hours_per_day=employee.contracted_hours_day,
        holidays=holidays,
        daily_rate_basis=basis,
    )
