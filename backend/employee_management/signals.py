"""Keep leave balances in sync with employment data.

Annual leave entitlement is derived from hiring_date (length of service), age
(the 50+ tier) and registered disability, so when any of those change we
recompute the employee's Annual balance cap for every year that already has a
balance row (plus the current year). Other leave types' caps don't depend on
these, so they're left untouched.
"""
from datetime import date

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .models import Employee

# Employee fields the Annual entitlement depends on.
_ENTITLEMENT_FIELDS = ('hiring_date', 'birth_date', 'has_disability')


@receiver(pre_save, sender=Employee)
def _stash_entitlement_change(sender, instance, **kwargs):
    """Flag whether any entitlement-driving field is changing, for post_save."""
    if not instance.pk:
        instance._entitlement_changed = False
        return
    old = sender.objects.filter(pk=instance.pk).values(*_ENTITLEMENT_FIELDS).first()
    instance._entitlement_changed = bool(old) and any(
        old[f] != getattr(instance, f) for f in _ENTITLEMENT_FIELDS
    )


@receiver(post_save, sender=Employee)
def _resync_annual_balances(sender, instance, created, **kwargs):
    if not (created or getattr(instance, '_entitlement_changed', False)):
        return
    # Lazy import: leave_services imports models, so importing at module load
    # would create an app-initialization cycle.
    from Attendance_and_Leave import leave_services
    from Attendance_and_Leave.models import LeaveBalance

    years = set(
        LeaveBalance.objects.filter(employee=instance, leaveTypeName__iexact='Annual')
        .values_list('year', flat=True)
    )
    years.add(date.today().year)
    for year in years:
        leave_services.get_or_create_balance(instance, 'Annual', year)
