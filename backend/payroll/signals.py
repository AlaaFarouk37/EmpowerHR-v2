"""Recompute draft payslips whenever a payroll component changes.

Net pay is derived from several sources — manual deductions, commissions
(bonuses), approved/unpaid leave, attendance & approved overtime, and approved
expense reimbursements. A change to any of them (add, edit or delete, from any
code path) re-runs the affected month's draft payslip(s) so the figure stays
current without waiting for an HR page load.

Only draft payslips are touched: Paid records are frozen, and manually-edited
records are left alone so deliberate HR overrides aren't clobbered (HR
recalculates those explicitly).
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Commission, Deduction, PayrollRecord
from Attendance_and_Leave.models import LeaveRequest, AttendanceRecord
from employee_management.models import ExpenseClaim


def _period(d):
    """Date -> 'YYYY-MM' pay period, or None."""
    return f'{d.year:04d}-{d.month:02d}' if d else None


def _months_between(start, end):
    """Set of 'YYYY-MM' periods a date range spans (a leave can cross months)."""
    if not start or not end or end < start:
        return set()
    months, y, m = set(), start.year, start.month
    while (y, m) <= (end.year, end.month):
        months.add(f'{y:04d}-{m:02d}')
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return months


def _resync(employee_id, periods):
    periods = {p for p in periods if p}
    if not employee_id or not periods:
        return
    # Lazy import: keeps the views module (and its DRF stack) out of app-load.
    from .views import _recalc_if_changed
    records = (
        PayrollRecord.objects
        .filter(employee_id=employee_id, payPeriod__in=periods)
        .exclude(status=PayrollRecord.STATUS_PAID)
    )
    for record in records:
        if record.editedAt:  # respect deliberate manual HR overrides
            continue
        _recalc_if_changed(record)


@receiver(post_save, sender=Commission)
@receiver(post_delete, sender=Commission)
@receiver(post_save, sender=Deduction)
@receiver(post_delete, sender=Deduction)
def _on_adjustment_change(sender, instance, **kwargs):
    _resync(instance.employee_id, {instance.payPeriod})


@receiver(post_save, sender=LeaveRequest)
@receiver(post_delete, sender=LeaveRequest)
def _on_leave_change(sender, instance, **kwargs):
    _resync(instance.employee_id, _months_between(instance.startDate, instance.endDate))


@receiver(post_save, sender=AttendanceRecord)
@receiver(post_delete, sender=AttendanceRecord)
def _on_attendance_change(sender, instance, **kwargs):
    _resync(instance.employee_id, {_period(instance.date)})


@receiver(post_save, sender=ExpenseClaim)
@receiver(post_delete, sender=ExpenseClaim)
def _on_expense_change(sender, instance, **kwargs):
    _resync(instance.employee_id, {_period(instance.expenseDate)})
