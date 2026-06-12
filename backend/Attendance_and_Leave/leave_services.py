"""Leave entitlement and balance services.

Annual (paid) leave entitlement follows Egyptian Labor Law No. 14 of 2025;
balances are auto-created per employee / leave type / year and the cap is taken
from the entitlement (annual), the LeaveType max (other configured types), or
left uncapped (Unpaid).
"""
from datetime import date

from employee_management.models import LeaveType

from .holiday_service import working_days_in_range
from .models import LeaveBalance


def _age_on(birth_date, as_of):
    if not birth_date:
        return None
    return as_of.year - birth_date.year - (
        (as_of.month, as_of.day) < (birth_date.month, birth_date.day)
    )


def _months_of_service(hiring_date, as_of):
    months = (as_of.year - hiring_date.year) * 12 + (as_of.month - hiring_date.month)
    if as_of.day < hiring_date.day:
        months -= 1
    return max(months, 0)


def annual_leave_entitlement(employee, as_of=None):
    """Annual paid-leave entitlement in whole days (Egyptian Labor Law No. 14 of
    2025), from length of service (hiring_date), age and disability status.

    Tiers, first match wins:
        registered disability                       -> 45
        10+ completed years of service OR age >= 50 -> 30
        2nd year of service onward (>= 12 months)   -> 21
        1st year with >= 6 months of service        -> round(15 * months / 12),
                                                       prorated from hiring date
        less than 6 months of service               -> 0
    """
    as_of = as_of or date.today()

    if getattr(employee, 'has_disability', False):
        return 45

    hiring_date = getattr(employee, 'hiring_date', None)
    if not hiring_date:
        return 21

    months = _months_of_service(hiring_date, as_of)
    years = months // 12
    age = _age_on(getattr(employee, 'birth_date', None), as_of)

    if years >= 10 or (age is not None and age >= 50):
        return 30
    if years >= 1:
        return 21
    if months >= 6:
        return int(round(15 * months / 12))
    return 0


def resolve_leave_type(name):
    if not name:
        return None
    return LeaveType.objects.filter(name__iexact=name.strip()).first()


def entitlement_for(employee, leave_type_name, year, as_of=None):
    """Cap for an employee + leave type + year: unpaid leave -> None (uncapped),
    annual -> computed entitlement, other paid type -> max_days_per_year,
    unknown type -> None."""
    name = (leave_type_name or '').strip()
    lowered = name.lower()
    lt = resolve_leave_type(name)
    # Unpaid leave (flagged on the type, or the literal 'Unpaid') is uncapped.
    if lowered == 'unpaid' or (lt is not None and not lt.is_paid):
        return None
    if lowered == 'annual':
        ref = as_of or min(date.today(), date(year, 12, 31))
        return annual_leave_entitlement(employee, as_of=ref)
    return lt.max_days_per_year if lt else None


def get_or_create_balance(employee, leave_type_name, year, as_of=None):
    """Fetch or create the balance and refresh its cap from current entitlement."""
    balance, _ = LeaveBalance.objects.get_or_create(
        employee=employee,
        leaveTypeName=leave_type_name,
        year=year,
        defaults={'usedDays': 0, 'leaveType': resolve_leave_type(leave_type_name)},
    )
    fields = []
    cap = entitlement_for(employee, leave_type_name, year, as_of=as_of)
    if balance.entitledDays != cap:
        balance.entitledDays = cap
        fields.append('entitledDays')
    lt = resolve_leave_type(leave_type_name)
    if balance.leaveType_id != (lt.leave_type_id if lt else None):
        balance.leaveType = lt
        fields.append('leaveType')
    if fields:
        balance.save(update_fields=fields)
    return balance


def count_leave_days(start, end):
    """Whole-day units a request consumes: working days excluding weekends and
    public holidays."""
    return working_days_in_range(start, end)


def evaluate_request(employee, leave_type_name, start, end, as_of=None):
    """Return (days, balance, exceeded, message) for a prospective request."""
    days = count_leave_days(start, end)
    balance = get_or_create_balance(employee, leave_type_name, start.year, as_of=as_of)
    cap = balance.entitledDays
    if cap is None:
        return days, balance, False, (
            f'{leave_type_name} leave is uncapped. {days} working day(s) requested.'
        )
    remaining_after = cap - balance.usedDays - days
    if remaining_after < 0:
        message = (
            f'Exceeds {leave_type_name} cap: {balance.usedDays}/{cap} day(s) used, '
            f'{days} requested, only {cap - balance.usedDays} remaining.'
        )
        return days, balance, True, message
    message = (
        f'Eligible. {remaining_after} {leave_type_name} day(s) remaining after '
        f'approval ({balance.usedDays + days}/{cap} used).'
    )
    return days, balance, False, message


def can_fit(employee, leave_type_name, days, year):
    """Whether ``days`` still fit under the cap (used at approval time)."""
    balance = get_or_create_balance(employee, leave_type_name, year)
    cap = balance.entitledDays
    if cap is None:
        return True, balance
    return (balance.usedDays + days) <= cap, balance


def deduct_balance(employee, leave_type_name, days, year):
    """Add approved ``days`` to usedDays (caller guards against double-deducting
    via the leave-request status transition)."""
    balance = get_or_create_balance(employee, leave_type_name, year)
    balance.usedDays = (balance.usedDays or 0) + days
    balance.save(update_fields=['usedDays', 'updatedAt'])
    return balance
