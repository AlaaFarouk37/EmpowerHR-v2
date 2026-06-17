"""Seed the full employee_management_job catalog.

23 job titles x 16 levels (368 rows) + 12 standalone null-level titles = 380 rows.
Idempotent: existing rows are reused via get_or_create and never duplicated. Run
standalone, or reuse seed_job_catalog() from another command (seed_demo does).

    python manage.py seed_jobs
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from employee_management.models import Job

LEVELS = [
    'C-Level', 'Director', 'Group Product Manager', 'Head of Products', 'Intern',
    'Junior', 'Manager', 'Mid-level', 'Principal', 'Senior', 'Senior Manager',
    'Senior Principal', 'Senior Staff', 'Staff', 'Team Lead', 'VP',
]
TITLES = [
    'AI & Automation Engineer', 'Backend Engineer', 'CRM Developer', 'Data Analytics',
    'Data Engineer', 'Data Scientist', 'DevOps / SRE / Platform',
    'Embedded Systems Engineer', 'Engineering Manager',
    'Executive (C-level, director, etc.)', 'Frontend Engineer', 'Full-stack Engineer',
    'Hardware Engineer (Semiconductors, Digital Design, Electronics, etc)',
    'Mobile Development Engineer', 'Product Manager', 'Product Owner',
    'QA / SDET Engineer', 'R&D Engineer (Computer Vision, NLP, etc.)', 'Scrum Master',
    'Security/Network Engineer', 'Systems Architect', 'Technical Support',
    'UI/UX Designer/Engineer',
]
STANDALONE = [
    'Account Executive', 'Customer Success Engineer', 'Customer Success Lead',
    'Engineering Team Lead', 'Finance Team Lead', 'Financial Analyst', 'HR Manager',
    'People Ops Lead', 'People Ops Specialist', 'Platform Administrator',
    'Sales Team Lead', 'Software Engineer',
]


def seed_job_catalog():
    """Create the catalog rows (idempotent). Returns the total Job count."""
    zero = {'base_salary': Decimal('0'), 'benchmark_salary': Decimal('0')}
    for title in TITLES:
        for level in LEVELS:
            Job.objects.get_or_create(title=title, level=level, defaults=zero)
    for title in STANDALONE:
        Job.objects.get_or_create(title=title, level=None, defaults=zero)
    return Job.objects.count()


class Command(BaseCommand):
    help = 'Seed the full employee_management_job catalog (idempotent).'

    @transaction.atomic
    def handle(self, *args, **options):
        total = seed_job_catalog()
        self.stdout.write(self.style.SUCCESS(
            f'Job catalog ready: {total} rows '
            f'({len(TITLES)} titles x {len(LEVELS)} levels + {len(STANDALONE)} standalone).'))
