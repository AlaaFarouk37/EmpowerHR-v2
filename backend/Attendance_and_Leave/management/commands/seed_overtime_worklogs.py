"""Backfill WorkTaskLog rows so AUTO_APPROVED overtime records actually satisfy
the auto-approval gate in Attendance_and_Leave.views._compute_overtime:

    AUTO_APPROVED requires  sum(task_log_hours on record.date) / workedHours >= 0.8

Some AttendanceRecords were seeded as AUTO_APPROVED without any backing logs, so
the gate would not reproduce that status. This command finds every AUTO_APPROVED
record that was auto-approved (no manual TL review) and whose task-log coverage
is below the 0.8 gate, then seeds logs on a per-employee seed task to push
coverage to TARGET_RATIO. Records approved by a Team Leader (overtimeReviewedBy
set) are left alone — manual approval legitimately bypasses the gate.

Idempotent: prior logs this command created (matched by note marker + date) are
removed before reseeding, and already-compliant records are skipped.

Usage:
    python manage.py seed_overtime_worklogs
    python manage.py seed_overtime_worklogs --created 2026-06-14
    python manage.py seed_overtime_worklogs --employee EMP00007 --dry-run
"""

from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from Attendance_and_Leave.models import AttendanceRecord
from employee_management.models import Employee, WorkTask, WorkTaskLog

GATE = Decimal('0.8')
TARGET_RATIO = Decimal('0.85')          # comfortably above the 0.8 gate
SEED_TASK_TITLE = 'Seeded — Daily Work (overtime fixtures)'
LOG_MARKER = '[ot-worklog-backfill]'


def hours_to_timedelta(hours):
    return timedelta(seconds=int(Decimal(hours) * Decimal(3600)))


def coverage_hours(employee, day):
    """Task-log hours on `day` exactly as the auto-approval gate counts them."""
    seconds = sum(
        (log.end_time - log.start_time).total_seconds()
        for log in WorkTaskLog.objects.filter(
            task__employee=employee,
            start_time__date=day,
            end_time__isnull=False,
        )
    )
    return Decimal(seconds) / Decimal(3600)


class Command(BaseCommand):
    help = 'Seed WorkTaskLogs backing AUTO_APPROVED overtime so the 0.8 gate holds.'

    def add_arguments(self, parser):
        parser.add_argument('--employee', default=None, help='Limit to one employeeID.')
        parser.add_argument('--created', default=None,
                            help="Limit to records created on a date (YYYY-MM-DD).")
        parser.add_argument('--dry-run', action='store_true',
                            help='Report what would change without writing.')

    @transaction.atomic
    def handle(self, *args, **options):
        records = (AttendanceRecord.objects
                   .select_related('employee')
                   .filter(overtimeStatus=AttendanceRecord.OT_AUTO_APPROVED,
                           overtimeReviewedBy=''))      # auto-gate only, skip TL-approved
        if options['employee']:
            records = records.filter(employee_id=options['employee'])
        if options['created']:
            records = records.filter(createdAt__date=options['created'])

        seeded = skipped_ok = skipped_role = 0
        for record in records.order_by('employee_id', 'date'):
            worked = record.workedHours
            if not worked or worked <= 0:
                continue

            # Mirror the gate's role check: overtime auto-approval only applies to
            # TeamMembers with a contracted daily baseline. Backing logs onto a
            # TeamLeader/HR record would never reproduce AUTO_APPROVED.
            employee = record.employee
            try:
                role = employee.user_account.role
            except Employee.user_account.RelatedObjectDoesNotExist:
                role = None
            if role != 'TeamMember' or employee.contracted_hours_day is None:
                self.stdout.write(
                    f"  skip  {record.employee_id} {record.date}: role={role} "
                    f"baseline={employee.contracted_hours_day} — gate excludes it")
                skipped_role += 1
                continue

            have = coverage_hours(record.employee, record.date)
            need = (worked * GATE).quantize(Decimal('0.01'))
            if have >= need:
                self.stdout.write(
                    f"  ok    {record.employee_id} {record.date}: "
                    f"have={have.quantize(Decimal('0.01'))}h >= need={need}h")
                skipped_ok += 1
                continue

            target = (worked * TARGET_RATIO).quantize(Decimal('0.01'))
            anchor = record.clockIn or timezone.make_aware(
                datetime.combine(record.date, time(9, 0)))

            line = (f"  seed  {record.employee_id} {record.date}: worked={worked}h "
                    f"have={have.quantize(Decimal('0.01'))}h -> logging {target}h "
                    f"(ratio {(target / worked).quantize(Decimal('0.001'))})")
            if options['dry_run']:
                self.stdout.write(line + "  [dry-run]")
                seeded += 1
                continue

            seed_task, _ = WorkTask.objects.get_or_create(
                employee=record.employee,
                title=SEED_TASK_TITLE,
                defaults={
                    'description': 'Synthetic task holding time logs that back '
                                   'auto-approved overtime.',
                    'priority': 'Medium', 'status': 'In Progress',
                    'progress': 50, 'estimatedHours': 40,
                },
            )
            WorkTaskLog.objects.filter(
                task=seed_task, start_time__date=record.date,
                notes__contains=LOG_MARKER,
            ).delete()

            first = (target / Decimal('2')).quantize(Decimal('0.01'))
            second = target - first
            a_start = anchor + timedelta(minutes=15)
            a_end = a_start + hours_to_timedelta(first)
            b_start = a_end + timedelta(minutes=30)
            b_end = b_start + hours_to_timedelta(second)
            WorkTaskLog.objects.create(task=seed_task, start_time=a_start,
                end_time=a_end, notes=f'Morning block {LOG_MARKER}')
            WorkTaskLog.objects.create(task=seed_task, start_time=b_start,
                end_time=b_end, notes=f'Afternoon block {LOG_MARKER}')

            after = coverage_hours(record.employee, record.date)
            assert after >= need, f"backfill fell short: {after} < {need}"
            self.stdout.write(line)
            seeded += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. seeded={seeded} already-compliant={skipped_ok} "
            f"role-excluded={skipped_role} (TL-approved excluded by query)."))
