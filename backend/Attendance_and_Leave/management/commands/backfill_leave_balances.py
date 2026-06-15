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

        leave_types = list(LeaveType.objects.all())
        employees = Employee.objects.filter(isDeleted=False)
        before = LeaveBalance.objects.filter(year=year).count()
        for emp in employees:
            # Annual (entitlement-driven) is always materialized; the rest are
            # filtered by should_have_balance (skips Casual/gender/once-used).
            leave_services.get_or_create_balance(emp, LeaveRequest.TYPE_ANNUAL, year)
            for lt in leave_types:
                if leave_services.should_have_balance(emp, lt):
                    leave_services.get_or_create_balance(emp, lt.name, year)
        after = LeaveBalance.objects.filter(year=year).count()

        self.stdout.write(self.style.SUCCESS(
            f"Year {year}: {employees.count()} employee(s) x {len(leave_types)} configured "
            f"type(s). Balance rows: {before} -> {after} (+{after - before})."
        ))
