"""Seed AttendanceRecord (and supporting WorkTask/WorkTaskLog) overtime data for
one employee across a specific month, so payroll can be tested for that period.

Mixes STANDARD, AUTO_APPROVED and PENDING_REVIEW overtime on the first weekdays
of the month. AUTO_APPROVED overtime is what payroll pays (1.5x hourly);
PENDING_REVIEW rows let a Team Leader test the approval flow.

Idempotent: re-running replaces the seeded rows for the same dates.

Usage:
    python manage.py seed_month_overtime
    python manage.py seed_month_overtime --employee EMP00007 --month 2026-05
"""

import calendar
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from Attendance_and_Leave.models import AttendanceRecord
from employee_management.models import Employee, WorkTask, WorkTaskLog


DEFAULT_EMPLOYEE_ID = 'EMP00007'
DEFAULT_MONTH = '2026-05'
SEED_TASK_TITLE = 'Seeded — Daily Work (overtime fixtures)'

SEED_PLAN = [
    (Decimal('9.50'), Decimal('8.00')),
    (Decimal('10.00'), Decimal('9.00')),
    (Decimal('8.00'), None),
    (Decimal('11.00'), Decimal('4.00')),
    (Decimal('9.00'), Decimal('8.00')),
    (Decimal('8.00'), None),
    (Decimal('10.50'), Decimal('5.00')),
    (Decimal('9.00'), Decimal('8.00')),
]


def first_weekdays_of_month(year, month, count):
    last_day = calendar.monthrange(year, month)[1]
    days = []
    for day in range(1, last_day + 1):
        d = date(year, month, day)
        if d.weekday() < 5:
            days.append(d)
        if len(days) >= count:
            break
    return days


def at_local(day, hour, minute=0):
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


def hours_to_timedelta(hours):
    return timedelta(seconds=int(Decimal(hours) * Decimal(3600)))


class Command(BaseCommand):
    help = 'Seed AttendanceRecord overtime rows for an employee for a given month.'

    def add_arguments(self, parser):
        parser.add_argument('--employee', default=DEFAULT_EMPLOYEE_ID)
        parser.add_argument('--month', default=DEFAULT_MONTH, help="Month in 'YYYY-MM' format.")

    @transaction.atomic
    def handle(self, *args, **options):
        employee_id = options['employee']
        month_str = options['month']
        try:
            year, month = (int(part) for part in month_str.split('-'))
            date(year, month, 1)
        except (ValueError, TypeError):
            raise CommandError("--month must be in 'YYYY-MM' format.")

        try:
            employee = Employee.objects.get(pk=employee_id)
        except Employee.DoesNotExist:
            raise CommandError(f"Employee {employee_id} not found.")

        daily_baseline = employee.contracted_hours_day or Decimal('8.00')
        if not employee.contracted_hours_day:
            employee.contracted_hours_day = daily_baseline
            employee.save(update_fields=['contracted_hours_day'])
            self.stdout.write(f"Set {employee_id}.contracted_hours_day = {daily_baseline}")

        seed_task, _ = WorkTask.objects.get_or_create(
            employee=employee,
            title=SEED_TASK_TITLE,
            defaults={
                'description': 'Synthetic task that holds time logs for the seeded overtime days.',
                'priority': 'Medium',
                'status': 'In Progress',
                'progress': 50,
                'estimatedHours': 40,
            },
        )

        days = first_weekdays_of_month(year, month, len(SEED_PLAN))
        WorkTaskLog.objects.filter(
            task=seed_task,
            start_time__date__gte=date(year, month, 1),
            start_time__date__lte=date(year, month, calendar.monthrange(year, month)[1]),
        ).delete()

        created_attendance = 0
        created_logs = 0
        approved_ot = Decimal('0')

        for day, (worked, task_hours) in zip(days, SEED_PLAN):
            clock_in = at_local(day, 9)
            clock_out = clock_in + hours_to_timedelta(worked)

            raw_overtime = max(Decimal('0'), worked - daily_baseline)
            overtime_status = AttendanceRecord.OT_STANDARD
            if raw_overtime > 0:
                if task_hours is not None and (task_hours / worked) >= Decimal('0.8'):
                    overtime_status = AttendanceRecord.OT_AUTO_APPROVED
                    approved_ot += raw_overtime
                else:
                    overtime_status = AttendanceRecord.OT_PENDING_REVIEW

            AttendanceRecord.objects.update_or_create(
                employee=employee,
                date=day,
                defaults={
                    'clockIn': clock_in,
                    'clockOut': clock_out,
                    'workedHours': worked.quantize(Decimal('0.01')),
                    'overtimeHours': raw_overtime.quantize(Decimal('0.01')),
                    'overtimeStatus': overtime_status,
                    'status': AttendanceRecord.STATUS_PRESENT,
                    'notes': 'Seeded by seed_month_overtime',
                },
            )
            created_attendance += 1

            if task_hours is not None:
                first_chunk = task_hours / Decimal('2')
                second_chunk = task_hours - first_chunk
                log_a_start = clock_in + timedelta(minutes=30)
                log_a_end = log_a_start + hours_to_timedelta(first_chunk)
                log_b_start = log_a_end + timedelta(hours=1)
                log_b_end = log_b_start + hours_to_timedelta(second_chunk)
                WorkTaskLog.objects.create(
                    task=seed_task, start_time=log_a_start, end_time=log_a_end,
                    notes='Morning block (seed)')
                WorkTaskLog.objects.create(
                    task=seed_task, start_time=log_b_start, end_time=log_b_end,
                    notes='Afternoon block (seed)')
                created_logs += 2

            self.stdout.write(
                f"  {day} ({day.strftime('%a')}): worked={worked}h "
                f"OT={raw_overtime}h status={overtime_status}")

        self.stdout.write(self.style.SUCCESS(
            f"Done. {created_attendance} attendance rows and {created_logs} logs seeded "
            f"for {employee_id} ({employee.fullName}) in {month_str}. "
            f"Approved (payable) overtime = {approved_ot}h."))
