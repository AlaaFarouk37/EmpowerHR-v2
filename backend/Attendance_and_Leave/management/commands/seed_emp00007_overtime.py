"""Seed AttendanceRecord (and supporting WorkTask/WorkTaskLog) data for EMP00007.

Creates ~10 attendance days mixing STANDARD, AUTO_APPROVED, and PENDING_REVIEW
overtime statuses. WorkTaskLogs are seeded on overtime days so the
attendance_time / task_time / contracted_hours_day relationship is internally
consistent with the rules in Attendance_and_Leave.views._compute_overtime.

Idempotent: re-running replaces the seeded rows for the same dates.

Usage:
    python manage.py seed_emp00007_overtime
"""

from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from Attendance_and_Leave.models import AttendanceRecord
from employee_management.models import Employee, WorkTask, WorkTaskLog


EMPLOYEE_ID = 'EMP00007'
SEED_TASK_TITLE = 'Seeded — Daily Work (overtime fixtures)'
DAILY_BASELINE = Decimal('8.00')


# Each entry: (weekdays_back, worked_hours, task_hours_or_None, expected_status)
# task_hours_or_None is None for STANDARD days (no logs needed).
SEED_PLAN = [
    (1,  Decimal('8.00'),  None,            'STANDARD'),
    (2,  Decimal('7.50'),  None,            'STANDARD'),       # short day, still no OT
    (3,  Decimal('8.00'),  None,            'STANDARD'),
    (4,  Decimal('9.50'),  Decimal('8.00'), 'AUTO_APPROVED'),  # 8/9.5 = 0.842
    (5,  Decimal('10.00'), Decimal('9.00'), 'AUTO_APPROVED'),  # 9/10  = 0.90
    (6,  Decimal('11.00'), Decimal('4.00'), 'PENDING_REVIEW'), # 4/11  = 0.36
    (7,  Decimal('8.00'),  None,            'STANDARD'),
    (8,  Decimal('9.00'),  Decimal('8.00'), 'AUTO_APPROVED'),  # 8/9   = 0.889
    (9,  Decimal('10.50'), Decimal('5.00'), 'PENDING_REVIEW'), # 5/10.5= 0.476
    (10, Decimal('8.00'),  None,            'STANDARD'),
]


def weekdays_back(today, n):
    """Return the date that is `n` weekdays before `today` (skips Sat/Sun)."""
    d = today
    remaining = n
    while remaining > 0:
        d -= timedelta(days=1)
        if d.weekday() < 5:  # Mon-Fri
            remaining -= 1
    return d


def at_local(day, hour, minute=0):
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


def hours_to_timedelta(hours):
    return timedelta(seconds=int(Decimal(hours) * Decimal(3600)))


class Command(BaseCommand):
    help = 'Seed 10 AttendanceRecord rows for EMP00007 with mixed overtime statuses.'

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            employee = Employee.objects.get(pk=EMPLOYEE_ID)
        except Employee.DoesNotExist:
            raise CommandError(
                f"Employee {EMPLOYEE_ID} not found. Create that employee first."
            )

        # Make sure the daily baseline is set so the overtime helper would also
        # produce sensible values on a real clock-out for this employee.
        if not employee.contracted_hours_day:
            employee.contracted_hours_day = DAILY_BASELINE
            employee.save(update_fields=['contracted_hours_day'])
            self.stdout.write(f"Set {EMPLOYEE_ID}.contracted_hours_day = {DAILY_BASELINE}")

        # Reuse a single seed task for all the WorkTaskLogs we create.
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
        # Wipe any prior logs on the seed task so re-runs are clean.
        WorkTaskLog.objects.filter(task=seed_task).delete()

        today = timezone.localdate()
        created_attendance = 0
        created_logs = 0

        for back, worked, task_hours, expected_status in SEED_PLAN:
            day = weekdays_back(today, back)
            clock_in = at_local(day, 9)
            clock_out = clock_in + hours_to_timedelta(worked)

            raw_overtime = max(Decimal('0'), worked - DAILY_BASELINE)
            overtime_status = AttendanceRecord.OT_STANDARD
            if raw_overtime > 0:
                # 80% gate
                if task_hours is not None and (task_hours / worked) >= Decimal('0.8'):
                    overtime_status = AttendanceRecord.OT_AUTO_APPROVED
                else:
                    overtime_status = AttendanceRecord.OT_PENDING_REVIEW

            assert overtime_status == {
                'STANDARD': AttendanceRecord.OT_STANDARD,
                'AUTO_APPROVED': AttendanceRecord.OT_AUTO_APPROVED,
                'PENDING_REVIEW': AttendanceRecord.OT_PENDING_REVIEW,
            }[expected_status], (
                f"Plan inconsistency for day -{back}: "
                f"computed {overtime_status} but expected {expected_status}"
            )

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
                    'notes': 'Seeded by seed_emp00007_overtime',
                },
            )
            created_attendance += 1

            if task_hours is not None:
                # Spread task time across two log sessions so it looks realistic.
                first_chunk = task_hours / Decimal('2')
                second_chunk = task_hours - first_chunk
                log_a_start = clock_in + timedelta(minutes=30)
                log_a_end = log_a_start + hours_to_timedelta(first_chunk)
                log_b_start = log_a_end + timedelta(hours=1)
                log_b_end = log_b_start + hours_to_timedelta(second_chunk)

                WorkTaskLog.objects.create(
                    task=seed_task, start_time=log_a_start, end_time=log_a_end,
                    notes='Morning block (seed)',
                )
                WorkTaskLog.objects.create(
                    task=seed_task, start_time=log_b_start, end_time=log_b_end,
                    notes='Afternoon block (seed)',
                )
                created_logs += 2

            self.stdout.write(
                f"  {day} ({day.strftime('%a')}): worked={worked}h "
                f"OT={raw_overtime}h status={overtime_status} "
                f"task={task_hours if task_hours is not None else '-'}h"
            )

        self.stdout.write(self.style.SUCCESS(
            f"Done. {created_attendance} attendance rows and {created_logs} "
            f"WorkTaskLog rows seeded for {EMPLOYEE_ID}."
        ))
