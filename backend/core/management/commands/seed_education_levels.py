"""Seed demo data for employees: education levels and support tickets.

1. educationLevel — one of EDUCATION_CHOICES (1=High School .. 5=PhD) and one of
   the attrition model's 22 features; many seeded employees have it left null,
   which forces the predictor to default it to 0 (out of the trained 1-5 range).
2. Support tickets — one SupportTicket per employee, each with two
   SupportTicketMessages (an employee question and an admin reply).

Assignment is a weighted, deterministic random draw keyed off the RNG --seed and
the employee ordering, so re-running produces the same result.

By default employees that already have an educationLevel / a support ticket are
left untouched; pass --overwrite to reassign education and recreate tickets.

Usage:
    python manage.py seed_education_levels
    python manage.py seed_education_levels --overwrite
    python manage.py seed_education_levels --seed 7 --include-deleted
"""

import random
from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from employee_management.models import Employee, SupportTicket, SupportTicketMessage

# (educationLevel value, relative weight) — a realistic workforce skew.
EDUCATION_WEIGHTS = [
    (1, 10),   # High School
    (2, 15),   # Associate Degree
    (3, 45),   # Bachelor's Degree
    (4, 25),   # Master's Degree
    (5, 5),    # PhD
]
LABELS = dict(Employee.EDUCATION_CHOICES)

SUPPORT_ADMIN_NAME = 'HR Manager'
STATUS_WEIGHTS = [('Open', 25), ('In Progress', 25), ('Resolved', 35), ('Closed', 15)]
PRIORITY_POOL = ['Low', 'Medium', 'Medium', 'High', 'Critical']

# (category, subject, description, employee message, admin reply)
TICKET_SCENARIOS = [
    ('IT', 'Cannot access company VPN',
     'Unable to connect to the VPN from home since this morning.',
     'The VPN client keeps timing out whenever I work remotely. Could you take a look?',
     'We reset your VPN profile and pushed a fresh config — please reconnect and let us know.'),
    ('Payroll', 'Overtime hours missing from last payslip',
     'Approved overtime for last month does not appear on my payslip.',
     'I worked approved overtime last month but it was not included in my latest pay. Can you check?',
     'We reviewed your attendance records; the correction will appear on your next payslip.'),
    ('Benefits', 'Question about health insurance coverage',
     'Need clarification on what the current health plan covers.',
     'Does my current plan cover dental and vision, or do I enroll for those separately?',
     'Your plan covers dental; vision is a separate add-on available during open enrollment.'),
    ('Policy', 'Clarification on remote work policy',
     'Unsure how many remote days per week are allowed for my role.',
     'Could you clarify how many days a week I am allowed to work remotely under the current policy?',
     'Your role allows up to two remote days per week with manager approval — please coordinate with your lead.'),
    ('General', 'Request for a standing desk',
     'Requesting an ergonomic standing desk for my workstation.',
     'I have had some back discomfort and would like to request a standing desk if possible.',
     'Your request has been logged with facilities; a standing desk will be arranged within two weeks.'),
    ('IT', 'New laptop request',
     'Current laptop is slow and affecting daily work.',
     'My laptop has become very slow and frequently freezes. Can I get a replacement or upgrade?',
     'An upgraded laptop has been approved; IT will contact you to schedule the handover.'),
    ('Payroll', 'Update bank account details',
     'Recently changed banks and need to update payroll details.',
     'I switched banks and need to update the account my salary is deposited into.',
     'Your new bank details have been updated and take effect from the next payroll cycle.'),
    ('Benefits', 'Add a dependent to my benefits',
     'Would like to add a new dependent to benefits enrollment.',
     'I recently had a child and would like to add them as a dependent on my benefits.',
     'Congratulations! We have added your dependent; updated benefit documents will be emailed to you.'),
]


class Command(BaseCommand):
    help = "Seed educationLevel for all employees (weighted, deterministic)."

    def add_arguments(self, parser):
        parser.add_argument('--overwrite', action='store_true',
                            help='Reassign employees that already have an educationLevel.')
        parser.add_argument('--include-deleted', action='store_true',
                            help='Also seed soft-deleted employees.')
        parser.add_argument('--seed', type=int, default=42,
                            help='RNG seed for reproducible assignment (default 42).')

    @transaction.atomic
    def handle(self, *args, **options):
        rng = random.Random(options['seed'])
        levels = [lvl for lvl, _ in EDUCATION_WEIGHTS]
        weights = [w for _, w in EDUCATION_WEIGHTS]

        qs = Employee.objects.all()
        if not options['include_deleted']:
            qs = qs.filter(isDeleted=False)
        employees = list(qs.order_by('employeeID'))

        to_update = []
        skipped = 0
        for emp in employees:
            if emp.educationLevel is not None and not options['overwrite']:
                skipped += 1
                continue
            emp.educationLevel = rng.choices(levels, weights=weights, k=1)[0]
            to_update.append(emp)

        Employee.objects.bulk_update(to_update, ['educationLevel'])

        dist = Counter(LABELS[e.educationLevel] for e in to_update)
        self.stdout.write(self.style.SUCCESS(
            f"educationLevel: updated {len(to_update)}, skipped {skipped} already set "
            f"(of {len(employees)} total)."))
        for lvl, _ in EDUCATION_WEIGHTS:
            label = LABELS[lvl]
            self.stdout.write(f"  {lvl} {label:<18}: {dist.get(label, 0)}")

        self._seed_support_tickets(employees, rng, options['overwrite'])

    def _seed_support_tickets(self, employees, rng, overwrite):
        status_choices = [s for s, _ in STATUS_WEIGHTS]
        status_weights = [w for _, w in STATUS_WEIGHTS]
        has_ticket = set(SupportTicket.objects.values_list('employee_id', flat=True))

        tickets = 0
        messages = 0
        skipped = 0
        status_dist = Counter()
        for emp in employees:
            if emp.employeeID in has_ticket:
                if not overwrite:
                    skipped += 1
                    continue
                emp.support_tickets.all().delete()  # messages cascade

            category, subject, description, emp_msg, admin_msg = rng.choice(TICKET_SCENARIOS)
            ticket_status = rng.choices(status_choices, weights=status_weights, k=1)[0]
            resolved = ticket_status in ('Resolved', 'Closed')

            ticket = SupportTicket.objects.create(
                employee=emp,
                subject=subject,
                category=category,
                priority=rng.choice(PRIORITY_POOL),
                description=description,
                status=ticket_status,
                assignedTo=SUPPORT_ADMIN_NAME if ticket_status != 'Open' else '',
                resolutionNote=admin_msg if resolved else '',
                resolvedAt=timezone.now() if resolved else None,
            )
            SupportTicketMessage.objects.create(
                ticket=ticket, authorRole='Employee', authorName=emp.fullName, body=emp_msg)
            SupportTicketMessage.objects.create(
                ticket=ticket, authorRole='Admin', authorName=SUPPORT_ADMIN_NAME,
                body=admin_msg, isResolution=resolved)
            tickets += 1
            messages += 2
            status_dist[ticket_status] += 1

        self.stdout.write(self.style.SUCCESS(
            f"support tickets: created {tickets} ticket(s) + {messages} message(s); "
            f"skipped {skipped} employee(s) that already had tickets."))
        for status, _ in STATUS_WEIGHTS:
            self.stdout.write(f"  {status:<12}: {status_dist.get(status, 0)}")
