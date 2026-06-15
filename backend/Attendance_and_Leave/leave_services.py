"""Leave entitlement and balance services.

Annual (paid) leave entitlement follows Egyptian Labor Law No. 14 of 2025;
balances are auto-created per employee / leave type / year and the cap is taken
from the entitlement (annual), the LeaveType max (other configured types), or
left uncapped (Unpaid).
"""
from datetime import date

from employee_management.models import LeaveType

from .holiday_service import working_days_in_range
from .models import LeaveBalance, LeaveRequest

ANNUAL = 'Annual'


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


def effective_balance_name(leave_type_name):
    """The balance a request actually draws from: ``Annual`` for types flagged
    ``deducts_from_annual`` (e.g. Casual), otherwise the type's own name."""
    lt = resolve_leave_type(leave_type_name)
    return ANNUAL if (lt is not None and lt.deducts_from_annual) else leave_type_name


def _lifetime_consumed(employee, leave_type_obj):
    """Whether a once-per-employment leave type has already been taken (approved)."""
    return LeaveRequest.objects.filter(
        employee=employee, leaveType=leave_type_obj,
        status=LeaveRequest.STATUS_APPROVED,
    ).exists()


def should_have_balance(employee, leave_type_obj):
    """Whether to materialize a per-year balance row for this employee + type.
    Skips Annual-funded types (Casual), gender-ineligible types, and
    once-per-employment types the employee has already used."""
    if leave_type_obj is None or leave_type_obj.deducts_from_annual:
        return False
    gender = (leave_type_obj.restricted_to_gender or '').strip()
    if gender and (getattr(employee, 'gender', '') or '') != gender:
        return False
    if leave_type_obj.once_per_employment and _lifetime_consumed(employee, leave_type_obj):
        return False
    return True


def check_eligibility(employee, leave_type_obj):
    """Gate a request on non-balance rules — gender restriction and the
    once-per-employment lifetime limit. Returns (ok, message)."""
    if leave_type_obj is None:
        return False, 'Leave type is not configured.'
    gender = (leave_type_obj.restricted_to_gender or '').strip()
    if gender and (getattr(employee, 'gender', '') or '') != gender:
        return False, f'{leave_type_obj.name} leave is only available to {gender} employees.'
    if leave_type_obj.once_per_employment:
        prior = LeaveRequest.objects.filter(
            employee=employee, leaveType=leave_type_obj,
            status__in=[LeaveRequest.STATUS_PENDING, LeaveRequest.STATUS_APPROVED],
        ).first()
        if prior:
            return False, (
                f'{leave_type_obj.name} leave can be taken only once during your '
                f'employment; you already have a {prior.status.lower()} '
                f'{leave_type_obj.name} request.'
            )
    return True, ''


def entitlement_for(employee, leave_type_name, year, as_of=None):
    """Cap for an employee + leave type + year: an unpaid standalone type ->
    None (uncapped), annual -> computed entitlement, other paid type ->
    max_days_per_year, unknown type -> None. Casual is unpaid but draws from
    Annual, so it is NOT uncapped here (it is routed to the Annual balance)."""
    name = (leave_type_name or '').strip()
    lowered = name.lower()
    lt = resolve_leave_type(name)
    # An unpaid type that has its own balance is uncapped; one that draws from
    # Annual (Casual) is capped by the Annual entitlement instead.
    if lt is not None and not lt.is_paid and not lt.deducts_from_annual:
        return None
    if lowered == 'annual':
        ref = as_of or min(date.today(), date(year, 12, 31))
        return annual_leave_entitlement(employee, as_of=ref)
    return lt.max_days_per_year if lt else None


def annual_extra_consumed(employee, year, as_of=None):
    """No-show days (no clock-in and no approved leave) charged against the Annual
    pool, counted year-to-date. An unsubmitted absence is unpaid *and* burns the
    Annual balance — treated like an involuntary Casual day."""
    from . import absence_service
    as_of = as_of or date.today()
    start = date(year, 1, 1)
    end = min(date(year, 12, 31), as_of)
    if end < start:
        return 0
    return absence_service.count_no_show_days(employee, start, end)


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
    """Return (days, balance, exceeded, message) for a prospective request.
    Types flagged ``deducts_from_annual`` (Casual) are checked against, and the
    message refers to, the Annual balance."""
    days = count_leave_days(start, end)
    balance_name = effective_balance_name(leave_type_name)
    balance = get_or_create_balance(employee, balance_name, start.year, as_of=as_of)
    prefix = (f'{leave_type_name} leave draws from your Annual balance. '
              if balance_name != leave_type_name else '')
    cap = balance.entitledDays
    if cap is None:
        return days, balance, False, (
            f'{leave_type_name} leave is uncapped. {days} working day(s) requested.'
        )
    remaining_after = cap - balance.usedDays - days
    if remaining_after < 0:
        message = (
            f'{prefix}Exceeds {balance_name} cap: {balance.usedDays}/{cap} day(s) used, '
            f'{days} requested, only {cap - balance.usedDays} remaining.'
        )
        return days, balance, True, message
    message = (
        f'{prefix}Eligible. {remaining_after} {balance_name} day(s) remaining after '
        f'approval ({balance.usedDays + days}/{cap} used).'
    )
    return days, balance, False, message


def can_fit(employee, leave_type_name, days, year):
    """Whether ``days`` still fit under the cap (used at approval time)."""
    balance = get_or_create_balance(employee, effective_balance_name(leave_type_name), year)
    cap = balance.entitledDays
    if cap is None:
        return True, balance
    return (balance.usedDays + days) <= cap, balance


def deduct_balance(employee, leave_type_name, days, year):
    """Add approved ``days`` to usedDays (caller guards against double-deducting
    via the leave-request status transition). Casual deducts from Annual."""
    balance = get_or_create_balance(employee, effective_balance_name(leave_type_name), year)
    balance.usedDays = (balance.usedDays or 0) + days
    balance.save(update_fields=['usedDays', 'updatedAt'])
    return balance
