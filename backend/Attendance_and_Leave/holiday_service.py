"""Effective public-holiday and working-day helpers.

Egyptian national holidays come from the open-source ``holidays`` library
(computed on the fly, no network/API key). HolidayOverride rows layer
company-specific adjustments on top:

    effective_holiday(d) = (library_holiday(d) OR override 'add')
                           AND NOT override 'remove'

Egyptian weekend is Friday + Saturday (``WEEKEND_DAYS``). All weekend/holiday
exclusion goes through this module so nothing else touches the library directly.
"""
from __future__ import annotations

import calendar
from datetime import date, timedelta

import holidays as _holidays_lib

# date.weekday(): Mon=0 .. Sun=6 -> Egyptian weekend is Fri(4) + Sat(5).
WEEKEND_DAYS = (4, 5)

_ONE_DAY = timedelta(days=1)
_eg_cache: dict[int, object] = {}


def _egypt(year: int):
    cal = _eg_cache.get(year)
    if cal is None:
        cal = _holidays_lib.Egypt(years=year)
        _eg_cache[year] = cal
    return cal


def is_weekend(d: date) -> bool:
    return d.weekday() in WEEKEND_DAYS


def is_public_holiday(d: date) -> bool:
    """Effective holiday check for one date; a 'remove' override wins over the library."""
    from .models import HolidayOverride

    override = (
        HolidayOverride.objects.filter(date=d).values_list('type', flat=True).first()
    )
    if override == HolidayOverride.TYPE_REMOVE:
        return False
    if override == HolidayOverride.TYPE_ADD:
        return True
    return d in _egypt(d.year)


def is_non_working_day(d: date) -> bool:
    return is_weekend(d) or is_public_holiday(d)


def _effective_holidays(start: date, end: date) -> set:
    from .models import HolidayOverride

    overrides = {
        row.date: row.type
        for row in HolidayOverride.objects.filter(date__gte=start, date__lte=end)
    }
    out = set()
    current = start
    while current <= end:
        ov = overrides.get(current)
        if ov == HolidayOverride.TYPE_REMOVE:
            holiday = False
        elif ov == HolidayOverride.TYPE_ADD:
            holiday = True
        else:
            holiday = current in _egypt(current.year)
        if holiday:
            out.add(current)
        current += _ONE_DAY
    return out


def working_dates_in_range(start: date, end: date) -> list:
    if end < start:
        return []
    holidays_set = _effective_holidays(start, end)
    out = []
    current = start
    while current <= end:
        if current.weekday() not in WEEKEND_DAYS and current not in holidays_set:
            out.append(current)
        current += _ONE_DAY
    return out


def working_days_in_range(start: date, end: date) -> int:
    return len(working_dates_in_range(start, end))


def working_days_in_month(year: int, month: int) -> int:
    last_day = calendar.monthrange(year, month)[1]
    return working_days_in_range(date(year, month, 1), date(year, month, last_day))


def holiday_dates_in_range(start: date, end: date) -> set:
    """Set of effective public-holiday dates in the inclusive range (library
    combined with overrides). Used by payroll to exclude holidays from its
    day-count math."""
    return _effective_holidays(start, end)


def effective_holidays_for_year(year: int) -> list:
    from .models import HolidayOverride

    start, end = date(year, 1, 1), date(year, 12, 31)
    overrides = {
        row.date: row
        for row in HolidayOverride.objects.filter(date__gte=start, date__lte=end)
    }

    effective: dict[date, dict] = {}
    for d, name in _egypt(year).items():
        effective[d] = {'name': name, 'source': 'library'}
    for d, row in overrides.items():
        if row.type == HolidayOverride.TYPE_REMOVE:
            effective.pop(d, None)
        else:
            effective[d] = {'name': row.name or 'Company holiday', 'source': 'override'}

    return [
        {'date': d.isoformat(), 'name': info['name'], 'source': info['source']}
        for d, info in sorted(effective.items())
    ]
