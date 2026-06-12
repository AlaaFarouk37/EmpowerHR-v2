"""Auto-create LeaveBalance rows for every employee for a given year.

Balances are normally created lazily (the first time an employee's balance is
viewed). This command materializes them all at once so the LeaveBalance table
has a complete row set — Annual plus every configured LeaveType per employee.

    python manage.py backfill_leave_balances            # current year
    python manage.py backfill_leave_balances --year 2026
"""
from datetime import date

from django.core.management.base import BaseCommand

from employee_management.models import Employee, LeaveType
from Attendance_and_Leave import leave_services
from Attendance_and_Leave.models import LeaveBalance, LeaveRequest


class Command(BaseCommand):
    help = "Create LeaveBalance rows for all employees for a year (Annual + configured types)."

    def add_arguments(self, parser):
        parser.add_argument('--year', type=int, default=date.today().year)

    def handle(self, *args, **options):
        year = options['year']

        # Annual (entitlement-driven) plus every configured leave type, de-duplicated.
        names, seen = [], set()
        for name in [LeaveRequest.TYPE_ANNUAL, *LeaveType.objects.values_list('name', flat=True)]:
            key = (name or '').strip().lower()
            if key and key not in seen:
                seen.add(key)
                names.append(name)

        employees = Employee.objects.filter(isDeleted=False)
        before = LeaveBalance.objects.filter(year=year).count()
        for emp in employees:
            for name in names:
                leave_services.get_or_create_balance(emp, name, year)
        after = LeaveBalance.objects.filter(year=year).count()

        self.stdout.write(self.style.SUCCESS(
            f"Year {year}: {employees.count()} employee(s) x {len(names)} type(s) "
            f"({', '.join(names)}). Balance rows: {before} -> {after} (+{after - before})."
        ))
