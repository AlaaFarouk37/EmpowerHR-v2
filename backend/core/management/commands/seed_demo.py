"""Idempotent demo seed for an EmpowerHR walkthrough.

Builds a self-contained, deterministic org (5 departments / 5 teams, 5 team
leaders, 20 members, 1 admin, 1 HR manager) plus attendance, leave, tasks and
time-correction fixtures, then prints a verification summary whose every number
is read back from the DB so it doubles as a check that the *services* — not this
script — classified late / absent / overtime / utilization / leave-balance.

All seeded users live under the ``@empowerhr.demo`` domain; the wipe is scoped to
that set (and the curated department/team names) so it never touches superusers
or the existing ``@test.com`` demo accounts. Safe to re-run; one transaction.

    python manage.py seed_demo

See the NOTES block printed at the end (and the PR message) for where the real
service logic diverged from the original brief — chiefly: the field is
``has_disability`` (not ``is_disable``) and ``default_clock_in`` (not
``default_clock_in_time``); "TaskWork" is ``WorkTaskLog``; AttendanceRecord
stores no late/absent status (services derive it); and there is no backend
utilization-rate function (capacity is only the denominator).
"""
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from math import gcd

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from employee_management.models import (
    Department, Team, Employee, Job, WorkTask, WorkTaskLog, LeaveType, PerformanceReview,
    ExpenseClaim,
)
from payroll.models import Commission, Deduction
from Attendance_and_Leave.models import (
    AttendanceRecord, LeaveRequest, TimeCorrectionRequest, LeaveBalance,
)
from Attendance_and_Leave import (
    leave_services, capacity, reporting_service, absence_service, holiday_service,
)
from Attendance_and_Leave.views import _compute_overtime


SEED_DOMAIN = '@empowerhr.demo'
PASSWORD = 'DemoPass123!'
YEAR = 2026
WINDOW_START = date(YEAR, 4, 1)
WINDOW_END = date(YEAR, 6, 21)          # hard cap for anything that "already happened"

DEPARTMENTS = [
    'Software Engineering', 'People Operations', 'Finance & Accounting',
    'Sales', 'Customer Success',
]
# (team name, leader full name) parallel to DEPARTMENTS
TEAMS = [
    ('Platform Engineering', 'Omar El-Sayed'),
    ('People Experience',     'Mona Fahmy'),
    ('Revenue Finance',       'Tarek Saleh'),
    ('Account Executives',    'Dina Habib'),
    ('Support Heroes',        'Hossam Nasser'),
]
# Job title + level are assigned ONLY from existing rows in employee_management_job.
# That catalog holds engineering/product/support roles (no Finance/Sales/HR/CS
# titles), so non-tech teams map to the nearest real title. Every catalog title
# exists at all standard levels, so (title, level) lookups below always resolve.
TEAM_JOB_TITLES = [
    ['Backend Engineer', 'Frontend Engineer', 'Full-stack Engineer', 'QA / SDET Engineer'],
    ['Scrum Master', 'Product Owner', 'Product Manager', 'Data Analytics'],
    ['Data Analytics', 'Data Engineer', 'Data Scientist', 'Systems Architect'],
    ['CRM Developer', 'Product Manager', 'Product Owner', 'Technical Support'],
    ['Technical Support', 'QA / SDET Engineer', 'Mobile Development Engineer', 'Security/Network Engineer'],
]
TL_JOB_TITLES = [
    'Engineering Manager', 'Scrum Master', 'Data Analytics', 'Product Manager', 'Technical Support',
]
TL_LEVEL = 'Team Lead'
ADMIN_JOB = ('Executive (C-level, director, etc.)', 'Director')
HR_JOB = ('Product Owner', 'Manager')
# Per-member job level (idx 0-19), graded by tenure/seniority.
MEMBER_LEVELS = [
    'Senior', 'Mid-level', 'Junior', 'Mid-level',
    'Senior', 'Mid-level', 'Junior', 'Mid-level',
    'Principal', 'Intern', 'Senior', 'Junior',
    'Mid-level', 'Senior', 'Staff', 'Junior',
    'Mid-level', 'Intern', 'Senior', 'Mid-level',
]

# 20 members: (full name, gender). Four per team, in team order.
MEMBERS = [
    ('Ahmed Sobhy', 'Male'),   ('Sara Kamal', 'Female'), ('Youssef Adel', 'Male'),  ('Nourhan Gamal', 'Female'),
    ('Khaled Ibrahim', 'Male'),('Salma Hassan', 'Female'),('Mahmoud Farid', 'Male'), ('Rana Magdy', 'Female'),
    ('Amr Zaki', 'Male'),      ('Heba Sami', 'Female'),  ('Tamer Lotfy', 'Male'),   ('Mariam Adel', 'Female'),
    ('Hany Wagdy', 'Male'),    ('Nada Sherif', 'Female'),('Sherif Galal', 'Male'),  ('Aya Mostafa', 'Female'),
    ('Mostafa Hamed', 'Male'), ('Reem Fathy', 'Female'), ('Karim Diab', 'Male'),    ('Layla Samir', 'Female'),
]

# hiring tenure per member index, in days before "today"
FRESH, SIX_MONTHS, ONE_YEAR, TEN_YEARS = 15, 200, 430, 3870
TENURE = {
    0: ONE_YEAR, 1: ONE_YEAR, 2: SIX_MONTHS, 3: ONE_YEAR, 4: ONE_YEAR,
    5: ONE_YEAR, 6: SIX_MONTHS, 7: ONE_YEAR, 8: TEN_YEARS, 9: FRESH,
    10: ONE_YEAR, 11: SIX_MONTHS, 12: ONE_YEAR, 13: ONE_YEAR, 14: TEN_YEARS,
    15: SIX_MONTHS, 16: ONE_YEAR, 17: FRESH, 18: ONE_YEAR, 19: ONE_YEAR,
}
DISABLED_IDX = {4, 12}          # has_disability=True  (drives the 45-day leave tier)
SENIOR_AGE_IDX = {8, 14}        # age >= 50 (also drives the 30-day tier)

LEAVE_ZERO_IDX = 0              # member driven to exactly 0 Annual balance
AUTO_OT_IDX = 1                # the single auto-approved overtime member

# Per-member utilization target (logged/available). 0-3 over, 4-11 normal, 12-19 under.
UTIL_FACTORS = [
    1.10, 1.18, 1.25, 1.32,
    0.74, 0.80, 0.85, 0.90, 0.95, 0.98, 0.82, 0.88,
    0.40, 0.50, 0.58, 0.62, 0.45, 0.55, 0.30, 0.66,
]

# Concrete task titles per team (index parallel to TEAMS). Pools are large enough
# that each team's tasks stay distinct given the per-member counts below.
TASK_TITLES = {
    0: ['Ship attendance export API', 'Refactor leave-balance service',
        'Fix flaky CI pipeline', 'Migrate auth tokens to rotating keys',
        'Add rate limiting to public endpoints', 'Optimize payroll query performance',
        'Write integration tests for overtime flow', 'Upgrade Django to LTS',
        'Build holiday-calendar admin UI', 'Instrument API latency dashboards',
        'Resolve timezone bug in clock-in', 'Document deployment runbook',
        'Add audit logging to admin actions', 'Implement SSO with SAML',
        'Reduce dashboard bundle size', 'Set up blue-green deployments',
        'Patch dependency CVEs', 'Add pagination to employee list'],
    1: ['Onboard Q2 hires', 'Update PTO policy doc', 'Run engagement pulse survey',
        'Revise employee handbook', 'Coordinate benefits open enrollment',
        'Schedule manager training', 'Audit job descriptions',
        'Plan team offsite logistics', 'Refresh onboarding checklist',
        'Review exit-interview trends', 'Roll out recognition program', 'Update org chart',
        'Draft remote-work policy', 'Launch quarterly OKR cycle', 'Organize wellness week',
        'Update compensation bands', 'Run D&I workshop', 'Digitize personnel files'],
    2: ['Close April books', 'Automate payroll reconciliation', 'Prepare Q2 budget forecast',
        'Review vendor invoices', 'File quarterly VAT return', 'Reconcile expense claims',
        'Build cash-flow report', 'Audit commission payouts', 'Update depreciation schedule',
        'Draft cost-savings proposal', 'Validate benefits deductions', 'Refresh financial dashboard',
        'Forecast Q3 headcount cost', 'Set up automated invoicing', 'Review tax compliance',
        'Build expense-policy dashboard', 'Reconcile bank statements', 'Prepare board finance pack'],
    3: ['Build Q2 enterprise pipeline', 'Renew key accounts', 'Prepare RFP for Acme Corp',
        'Run product demo for prospects', 'Update CRM opportunity stages',
        'Negotiate annual contract renewal', 'Build territory plan',
        'Follow up on stalled deals', 'Draft pricing proposal', 'Host customer webinar',
        'Qualify inbound leads', 'Prepare quarterly QBR deck', 'Map competitive landscape',
        'Launch referral program', 'Clean up CRM duplicate records',
        'Prepare end-of-quarter forecast', 'Onboard new SDR', 'Run win/loss analysis'],
    4: ['Reduce ticket backlog', 'Write CS playbook', 'Launch in-app help center',
        'Triage escalated incidents', 'Improve onboarding NPS',
        'Update macro response templates', 'Run customer health review',
        'Resolve billing disputes', 'Build self-service FAQ', 'Train new support agents',
        'Analyze churn-risk accounts', 'Refresh SLA policy', 'Build onboarding journey',
        'Set up CSAT survey automation', 'Create escalation runbook', 'Review top-account QBRs',
        'Reduce first-response time', 'Document common workarounds'],
}
# Uneven task load per member, but never below 12 (so no member looks idle). Capped
# at the 18-title pool so a member's tasks stay distinct.
MEMBER_TASK_COUNTS = [
    14, 12, 16, 13,  15, 12, 17, 13,  18, 12, 14, 13,  16, 12, 15, 13,  17, 12, 14, 16,
]


def email_for(full_name):
    return full_name.lower().replace(' ', '.').replace('-', '') + SEED_DOMAIN


def at_local(day, hour, minute=0):
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


def hours(n):
    return timedelta(seconds=int(Decimal(str(n)) * 3600))


def find_range(start, n):
    """Smallest end date so working_days_in_range(start, end) == n (holiday-aware)."""
    seen, current = 0, start
    while True:
        if not holiday_service.is_non_working_day(current):
            seen += 1
            if seen >= n:
                return current
        current += timedelta(days=1)


class Command(BaseCommand):
    help = 'Seed a deterministic, idempotent EmpowerHR demo dataset (see module docstring).'

    @transaction.atomic
    def handle(self, *args, **options):
        self.today = timezone.localdate()
        self.notes = []
        self._wipe()
        self._leave_types()
        self._org()
        self._attendance()          # builds normal + overtime + suspicious records
        self._tasks_and_logs()      # task history + utilization-week logs + auto-OT logs
        self._finalize_overtime()   # run the real _compute_overtime on OT records
        self._leave()               # drive one member to 0, plus the failing case
        self._corrections()         # 5 corrections on the suspicious records
        self._reviews()             # each TL reviews each of their members >= twice
        self._finance()             # 5 expense claims, 5 commissions, 5 deductions
        self._summary()

    # ─── wipe (scoped to the seeded set) ──────────────────────────────────────
    def _wipe(self):
        users = User.objects.filter(email__endswith=SEED_DOMAIN)
        emp_ids = list(users.exclude(employee__isnull=True)
                       .values_list('employee_id', flat=True))
        # also catch any orphan employees from a half-run, by curated team/dept name
        emp_ids += list(Employee.objects.filter(team__name__in=[t[0] for t in TEAMS])
                        .values_list('employeeID', flat=True))
        emp_ids += list(Employee.objects.filter(department__name__in=DEPARTMENTS)
                        .values_list('employeeID', flat=True))
        emp_ids = list(set(emp_ids))

        WorkTaskLog.objects.filter(task__employee_id__in=emp_ids).delete()
        WorkTask.objects.filter(employee_id__in=emp_ids).delete()
        PerformanceReview.objects.filter(employee_id__in=emp_ids).delete()
        ExpenseClaim.objects.filter(employee_id__in=emp_ids).delete()
        Commission.objects.filter(employee_id__in=emp_ids).delete()
        Deduction.objects.filter(employee_id__in=emp_ids).delete()
        TimeCorrectionRequest.objects.filter(employee_id__in=emp_ids).delete()
        AttendanceRecord.objects.filter(employee_id__in=emp_ids).delete()
        LeaveRequest.objects.filter(employee_id__in=emp_ids).delete()
        LeaveBalance.objects.filter(employee_id__in=emp_ids).delete()
        Employee.objects.filter(pk__in=emp_ids).delete()
        Team.objects.filter(name__in=[t[0] for t in TEAMS]).delete()
        Department.objects.filter(name__in=DEPARTMENTS).delete()
        users.delete()

    # ─── leave types (shared config; created, never wiped) ────────────────────
    def _leave_types(self):
        specs = [
            ('Annual', 21, True, '', False, False),
            ('Sick', 15, True, '', False, False),
            ('Casual', 7, False, '', True, False),
            ('Maternity', 90, True, 'Female', False, False),
            ('Paternity', 3, True, 'Male', False, False),
            ('Hajj', 30, True, '', False, True),
        ]
        for name, mx, paid, gender, from_annual, once in specs:
            LeaveType.objects.update_or_create(
                name=name,
                defaults={'max_days_per_year': mx, 'is_paid': paid,
                          'restricted_to_gender': gender,
                          'deducts_from_annual': from_annual,
                          'once_per_employment': once},
            )

    # ─── org structure ────────────────────────────────────────────────────────
    def _job(self, title, level):
        """An existing employee_management_job row (never created here)."""
        return (Job.objects.filter(title=title, level=level).first()
                or Job.objects.filter(title=title).first())

    def _make_user_employee(self, full_name, role, gender, dept, team,
                            hiring_date=None, has_disability=False,
                            birth_date=None, job=None, is_staff=False,
                            monthly=12000):
        emp = Employee.objects.create(
            fullName=full_name, department=dept, team=team,
            job=job,
            employeeType='Full-time', location='Cairo', employmentStatus='Active',
            isDeleted=False, hiring_date=hiring_date, birth_date=birth_date,
            has_disability=has_disability, gender=gender,
            default_clock_in=time(9, 0), default_clock_out=time(17, 0),
            contracted_hours=Decimal('40.00'), contracted_hours_day=Decimal('8.00'),
            monthlyIncome=monthly, performanceRating=4,
        )
        User.objects.create_user(
            email=email_for(full_name), password=PASSWORD, full_name=full_name,
            role=role, employee=emp, is_staff=is_staff,
        )
        return emp

    def _org(self):
        self.departments = [Department.objects.create(name=n) for n in DEPARTMENTS]
        self.teams = [Team.objects.create(name=n) for n, _ in TEAMS]

        self.admin = self._make_user_employee(
            'Karim Mansour', User.Role.ADMIN, 'Male', self.departments[1], None,
            hiring_date=self.today - timedelta(days=TEN_YEARS),
            birth_date=date(1985, 3, 4), job=self._job(*ADMIN_JOB),
            is_staff=True, monthly=30000)
        self.hr = self._make_user_employee(
            'Yasmin Abdelrahman', User.Role.HR_MANAGER, 'Female', self.departments[1], None,
            hiring_date=self.today - timedelta(days=ONE_YEAR + 800),
            birth_date=date(1988, 7, 19), job=self._job(*HR_JOB),
            is_staff=True, monthly=26000)

        # team leaders (one per team) — real catalog title at the 'Team Lead' level
        self.leaders = []
        for i, (team_name, leader_name) in enumerate(TEAMS):
            tl = self._make_user_employee(
                leader_name, User.Role.TEAM_LEADER, 'Male' if i % 2 else 'Female',
                self.departments[i], self.teams[i],
                hiring_date=self.today - timedelta(days=TEN_YEARS - 200),
                birth_date=date(1986, 1, 10),
                job=self._job(TL_JOB_TITLES[i], TL_LEVEL), monthly=20000)
            self.teams[i].leader = tl
            self.teams[i].save(update_fields=['leader'])
            self.leaders.append(tl)

        # 20 members, 4 per team — real catalog title + tenure-graded level
        self.members = []
        for idx, (name, gender) in enumerate(MEMBERS):
            team_i = idx // 4
            birth = date(1973, 5, 6) if idx in SENIOR_AGE_IDX else date(1995, 6, 1)
            emp = self._make_user_employee(
                name, User.Role.TEAM_MEMBER, gender,
                self.departments[team_i], self.teams[team_i],
                hiring_date=self.today - timedelta(days=TENURE[idx]),
                has_disability=idx in DISABLED_IDX, birth_date=birth,
                job=self._job(TEAM_JOB_TITLES[team_i][idx % 4], MEMBER_LEVELS[idx]),
                monthly=14000)
            self.members.append(emp)

    # ─── attendance (Apr–Jun, cap 6/21) ───────────────────────────────────────
    def _attendance(self):
        all_work_dates = holiday_service.working_dates_in_range(WINDOW_START, WINDOW_END)
        april = [d for d in all_work_dates if d.month == 4]
        may = [d for d in all_work_dates if d.month == 5]
        june_early = [d for d in all_work_dates if d.month == 6 and d.day <= 13]

        # (member_idx, date, worked_hours)  — deliberate overtime / suspicious cells
        self.auto_ot_cell = (AUTO_OT_IDX, may[2], Decimal('10.00'))
        self.ot_cells = [
            self.auto_ot_cell,
            (2, april[5], Decimal('10.50')),    # pending OT
            (10, may[5], Decimal('9.75')),      # pending OT
        ]
        self.suspicious_cells = [
            (3, april[8], Decimal('13.00')),
            (4, may[8], Decimal('13.50')),
            (5, june_early[1], Decimal('12.50')),
            (6, may[12], Decimal('14.00')),
            (7, april[12], Decimal('12.75')),
        ]
        special = {(i, d): h for i, d, h in self.ot_cells + self.suspicious_cells}
        self.ot_record_keys = set(special.keys())

        normal_records = []
        self.ot_records = []           # (record, employee) for later _compute_overtime
        for idx, emp in enumerate(self.members):
            hire = emp.hiring_date
            dates = [d for d in all_work_dates if d >= hire]
            for di, d in enumerate(dates):
                key = (idx, d)
                forced = key in special
                # ~20% no-show (skip) unless this cell is a deliberate OT record
                if not forced and (di + idx) % 5 == 0:
                    continue
                if forced:
                    worked = special[key]
                    clock_in = at_local(d, 9, 0)
                    clock_out = clock_in + hours(worked)
                    rec = AttendanceRecord(
                        employee=emp, date=d, clockIn=clock_in, clockOut=clock_out,
                        workedHours=worked, overtimeHours=Decimal('0.00'),
                        overtimeStatus=AttendanceRecord.OT_STANDARD,
                        status=AttendanceRecord.STATUS_PRESENT,
                        notes='Seeded overtime fixture')
                    rec.createdAt = clock_out
                    rec.save()
                    self.ot_records.append(rec)
                    continue
                late = (di + idx) % 2 == 0
                clock_in = at_local(d, 9, 40) if late else at_local(d, 9, 0)
                clock_out = clock_in + hours(8)         # exactly baseline -> no OT
                rec = AttendanceRecord(
                    employee=emp, date=d, clockIn=clock_in, clockOut=clock_out,
                    workedHours=Decimal('8.00'), overtimeHours=Decimal('0.00'),
                    overtimeStatus=AttendanceRecord.OT_STANDARD,
                    status=AttendanceRecord.STATUS_PRESENT,
                    notes='')
                rec.createdAt = clock_out
                normal_records.append(rec)

        AttendanceRecord.objects.bulk_create(normal_records, batch_size=500)
        AttendanceRecord.objects.bulk_update(normal_records, ['createdAt'], batch_size=500)

    # ─── tasks (>=12/member, one due this week), history & auto-OT logs ───────
    def _tasks_and_logs(self):
        self.tasks_by_member = {}
        new_logs = []
        statuses = ['In Progress', 'To Do', 'Pending Review', 'Done', 'Blocked']
        priorities = ['High', 'Medium', 'Low']
        ests = [8, 12, 16, 20, 24, 40]

        # Each member gets ONE "anchor" task due in the current work week with a
        # tuned estimatedHours, so the live "Utilization by Member" widget (which
        # sums estimatedHours of tasks DUE in the viewed week / capacity) shows
        # everyone busy and bucketed over/normal/under — no idle members. Every
        # other task's due date is kept OUT of this week so only anchors drive it.
        cw_start, cw_end = capacity.current_work_week()
        anchor_due = cw_end
        while holiday_service.is_non_working_day(anchor_due) and anchor_due > cw_start:
            anchor_due -= timedelta(days=1)

        plan = []                       # spread (non-anchor) tasks
        anchors = {}                    # idx -> (team_i, title)
        for idx in range(len(self.members)):
            team_i = idx // 4
            pool = TASK_TITLES[team_i]
            off = (idx * 5) % len(pool)
            spread = MEMBER_TASK_COUNTS[idx] - 1
            for j in range(spread):
                plan.append((idx, team_i, pool[(off + j) % len(pool)]))
            anchors[idx] = (team_i, pool[(off + spread) % len(pool)])

        total = len(plan)
        span = (date(YEAR, 6, 19) - WINDOW_START).days
        stride = next(s for s in (17, 19, 23, 29, 31, 37, 41) if gcd(s, total) == 1)

        def task_created(k):
            d = WINDOW_START + timedelta(days=round((k * stride % total) * span / (total - 1)))
            while holiday_service.is_non_working_day(d):
                d += timedelta(days=1)
            return d

        made_by_member = {i: [] for i in range(len(self.members))}
        for k, (idx, team_i, title) in enumerate(plan):
            st = statuses[k % len(statuses)]
            created = task_created(k)
            due = created + timedelta(days=5 + (k % 6))          # 5–10 days after creation
            if cw_start <= due <= cw_end:                        # keep the week clean for anchors
                due = cw_end + timedelta(days=2)
            task = WorkTask.objects.create(
                employee=self.members[idx], title=title,
                description=f'{title} - tracked deliverable.',
                priority=priorities[k % len(priorities)], status=st,
                progress=100 if st == 'Done' else (k * 15) % 95 + 5,
                estimatedHours=ests[k % len(ests)], dueDate=due,
                assignedBy=self.leaders[team_i].fullName)
            WorkTask.objects.filter(pk=task.pk).update(createdAt=at_local(created, 8 + (k % 8)))
            made_by_member[idx].append((task, created))

        # one anchor task per member: due this week, estimatedHours tuned to bucket
        for idx, (team_i, title) in anchors.items():
            _, rows = capacity.weekly_capacity([self.members[idx]])
            available = rows[0]['availableHours'] or 40.0
            created = anchor_due - timedelta(days=8)
            while holiday_service.is_non_working_day(created):
                created -= timedelta(days=1)
            task = WorkTask.objects.create(
                employee=self.members[idx], title=title,
                description=f'{title} - current sprint commitment.',
                priority='High', status='In Progress', progress=40,
                estimatedHours=max(1, round(available * UTIL_FACTORS[idx])),
                dueDate=anchor_due, assignedBy=self.leaders[team_i].fullName)
            WorkTask.objects.filter(pk=task.pk).update(createdAt=at_local(created, 9))
            made_by_member[idx].append((task, created))

        # earliest-created task per member holds the history / auto-OT logs
        for idx, made in made_by_member.items():
            made.sort(key=lambda m: m[1])
            self.tasks_by_member[idx] = made[0][0]
            h_day = made[0][1] + timedelta(days=3)
            while holiday_service.is_non_working_day(h_day):
                h_day += timedelta(days=1)
            if h_day <= WINDOW_END and (idx, h_day) not in self.ot_record_keys:
                h_start = at_local(h_day, 10)
                new_logs.append(WorkTaskLog(task=made[0][0], start_time=h_start,
                                            end_time=h_start + hours(3), notes='Task work block'))

        # Back EVERY overtime record with WorkTaskLogs on its own date so the TL
        # review screen shows a clean task-time %, never 0%. The fraction is of the
        # worked hours: < 0.8 keeps the record PENDING_REVIEW, the one >= 0.8 day is
        # the single AUTO_APPROVED one (matches views._compute_overtime exactly).
        ot_log_plan = list(zip(self.ot_cells, (0.85, 0.55, 0.50))) + \
            list(zip(self.suspicious_cells, (0.54, 0.60, 0.48, 0.64, 0.52)))
        for (idx, d, worked), frac in ot_log_plan:
            task = self.tasks_by_member[idx]
            total = float(worked) * frac
            first = round(total / 2, 2)
            s1 = at_local(d, 9, 0)
            e1 = s1 + hours(first)
            s2 = e1 + timedelta(minutes=30)
            new_logs.append(WorkTaskLog(task=task, start_time=s1, end_time=e1, notes='OT task block (am)'))
            new_logs.append(WorkTaskLog(task=task, start_time=s2,
                                        end_time=s2 + hours(round(total - first, 2)),
                                        notes='OT task block (pm)'))

        WorkTaskLog.objects.bulk_create(new_logs, batch_size=500)
        for log in new_logs:
            log.createdAt = log.start_time
        WorkTaskLog.objects.bulk_update(new_logs, ['createdAt'], batch_size=500)

    def _finalize_overtime(self):
        for rec in self.ot_records:
            _compute_overtime(rec)          # the real service decides AUTO vs PENDING
            rec.save(update_fields=['overtimeHours', 'overtimeStatus'])

    # ─── leave: drive one member to exactly 0 Annual, plus the failing case ───
    def _leave(self):
        annual = LeaveType.objects.get(name='Annual')
        member = self.members[LEAVE_ZERO_IDX]
        entitlement = leave_services.annual_leave_entitlement(member, as_of=self.today)

        # split the entitlement into ~3 chunks, one per month
        parts = [entitlement // 3 + (1 if i < entitlement % 3 else 0) for i in range(3)]
        anchors = [date(YEAR, 4, 6), date(YEAR, 5, 4), date(YEAR, 6, 1)]
        self.leave_member = member
        self.leave_member_leavedays = set()
        created = []
        for part, anchor in zip(parts, anchors):
            if part <= 0:
                continue
            end = find_range(anchor, part)
            days = leave_services.count_leave_days(anchor, end)
            lr = LeaveRequest.objects.create(
                employee=member, leaveType=annual, startDate=anchor, endDate=end,
                daysRequested=days, status=LeaveRequest.STATUS_APPROVED,
                reason='Approved annual leave (demo).',
                reviewedBy=self.hr.fullName, reviewedAt=at_local(anchor, 8))
            leave_services.deduct_balance(member, 'Annual', days, YEAR)
            created.append((lr.pk, anchor))
            self.leave_member_leavedays.update(
                d for d in holiday_service.working_dates_in_range(anchor, end))

        # over-cap check — evaluated by the real service for the summary only; the
        # exceeding request is intentionally NOT persisted (removed per request).
        fstart = date(YEAR, 6, 22)
        fend = find_range(fstart, 3)
        _days, _bal, exceeded, message = leave_services.evaluate_request(
            member, 'Annual', fstart, fend, as_of=self.today)
        self.leave_exceeded = (exceeded, message)

        # a couple of extra leave requests across other members, for spread/realism
        sick = LeaveType.objects.get(name='Sick')
        other = self.members[13]
        s_start, s_end = date(YEAR, 5, 11), date(YEAR, 5, 13)
        s_days = leave_services.count_leave_days(s_start, s_end)
        LeaveRequest.objects.create(
            employee=other, leaveType=sick, startDate=s_start, endDate=s_end,
            daysRequested=s_days, status=LeaveRequest.STATUS_APPROVED,
            reason='Flu (demo).', reviewedBy=self.hr.fullName,
            reviewedAt=at_local(s_start, 8))
        leave_services.deduct_balance(other, 'Sick', s_days, YEAR)
        LeaveRequest.objects.create(
            employee=self.members[16], leaveType=LeaveType.objects.get(name='Annual'),
            startDate=date(YEAR, 6, 8), endDate=date(YEAR, 6, 10), daysRequested=3,
            status=LeaveRequest.STATUS_PENDING, reason='Long weekend (demo).')

        # backdate requestedAt (auto_now_add) to the leave window
        for pk, anchor in created:
            LeaveRequest.objects.filter(pk=pk).update(requestedAt=at_local(anchor, 8))

    # ─── time corrections on the 5 suspicious (>12h) records ──────────────────
    def _corrections(self):
        suspicious = list(
            AttendanceRecord.objects.filter(
                employee__in=self.members, workedHours__gt=12).order_by('date'))
        statuses = [TimeCorrectionRequest.STATUS_PENDING,
                    TimeCorrectionRequest.STATUS_PENDING,
                    TimeCorrectionRequest.STATUS_APPROVED,
                    TimeCorrectionRequest.STATUS_DENIED,
                    TimeCorrectionRequest.STATUS_PENDING]
        for rec, st in zip(suspicious, statuses):
            reviewed = st != TimeCorrectionRequest.STATUS_PENDING
            tc = TimeCorrectionRequest.objects.create(
                employee=rec.employee, attendance=rec, date=rec.date,
                requestedClockIn=rec.clockIn,
                requestedClockOut=rec.clockIn + hours(8),
                reason='Forgot to clock out; system logged an inflated shift.',
                status=st,
                reviewNote='Adjusted to standard 8h.' if reviewed else '',
                reviewedBy=self.leaders[0].fullName if reviewed else '',
                reviewedAt=at_local(rec.date, 18) if reviewed else None)
            TimeCorrectionRequest.objects.filter(pk=tc.pk).update(
                createdAt=at_local(rec.date, 19))
        self.notes.append(
            'Approved/Denied corrections set their status directly; the seed does '
            'NOT replay the approval write-back, so the >12h fixtures stay intact.')

    # ─── performance reviews (each TL reviews each member >= twice) ───────────
    def _reviews(self):
        all_dates = holiday_service.working_dates_in_range(WINDOW_START, WINDOW_END)
        april = [d for d in all_dates if d.month == 4]
        may_june = [d for d in all_dates if d.month in (5, 6)]
        june = [d for d in all_dates if d.month == 6]

        strengths = [
            'Consistently ships high-quality work ahead of deadlines.',
            'Strong collaborator who unblocks teammates quickly.',
            'Owns the on-call rotation and incident response well.',
            'Clear written communication in design docs and reviews.',
            'Mentors junior teammates effectively.',
            'Proactively surfaces risks before they become blockers.',
        ]
        improvements = [
            'Could delegate more instead of taking on every task.',
            'Estimates run optimistic; pad for unknowns.',
            'Document decisions sooner for the wider team.',
            'Engage stakeholders earlier on scope changes.',
            'Tighten test coverage on edge cases.',
            'Speak up more in cross-team planning.',
        ]
        goals = [
            'Lead one cross-team initiative next quarter.',
            'Reduce mean time-to-resolution by 20%.',
            'Complete the advanced certification track.',
            'Own the quarterly roadmap for one product area.',
            'Improve code-review turnaround to under a day.',
            'Run two knowledge-sharing sessions.',
        ]

        created = []
        for idx, emp in enumerate(self.members):
            tl = self.leaders[idx // 4]
            # (period, type, status, reviewDate) — two per member, plus a 3rd Spot
            # review for one member per team to show "at least" twice.
            plan = [
                ('Q1 2026', 'Quarterly', 'Acknowledged', april[(idx * 2) % len(april)]),
                ('Q2 2026', 'Quarterly',
                 'Submitted' if idx % 3 else 'Draft', may_june[(idx * 3) % len(may_june)]),
            ]
            if idx % 4 == 0:
                plan.append(('Q2 2026', 'Spot', 'Submitted', june[idx % len(june)]))

            for n, (period, rtype, st, rdate) in enumerate(plan):
                ack_at, note = None, ''
                if st == 'Acknowledged':
                    ack_at = at_local(min(rdate + timedelta(days=5), WINDOW_END), 11)
                    note = 'Thanks for the feedback - aligned on the goals.'
                review = PerformanceReview.objects.create(
                    employee=emp, reviewPeriod=period, reviewType=rtype,
                    overallRating=(idx * 2 + n * 3) % 4 + 2,   # 2..5
                    status=st,
                    strengths=strengths[(idx + n) % len(strengths)],
                    improvementAreas=improvements[(idx + n) % len(improvements)],
                    goalsSummary=goals[(idx + n) % len(goals)],
                    employeeNote=note, reviewDate=rdate, acknowledgedAt=ack_at,
                    createdBy=tl.fullName)
                created.append((review.pk, rdate))

        for pk, rdate in created:
            PerformanceReview.objects.filter(pk=pk).update(createdAt=at_local(rdate, 16))
        self.notes.append(
            'PerformanceReview has no reviewer FK; the reviewing TL is stored in '
            'createdBy (matches the TeamReviewListCreateView create path).')

    # ─── finance line items: 5 expense claims, 5 commissions, 5 deductions ────
    def _finance(self):
        hr, m = self.hr.fullName, self.members

        # (idx, title, category, amount, status, approvedAmount, expenseDate)
        expenses = [
            (0,  'Client visit flights',      'Travel',   '4200', 'Approved',   '4200', date(YEAR, 4, 9)),
            (5,  'Team offsite lunch',        'Meals',    '850',  'Reimbursed', '850',  date(YEAR, 5, 14)),
            (8,  'Cloud conference ticket',   'Training', '3000', 'Submitted',  None,   date(YEAR, 6, 3)),
            (13, 'Office supplies restock',   'Supplies', '620',  'Approved',   '600',  date(YEAR, 5, 5)),
            (16, 'Taxi to client site',       'Travel',   '300',  'Rejected',   None,   date(YEAR, 4, 22)),
        ]
        for idx, title, cat, amt, st, appr, d in expenses:
            reviewed = st in ('Approved', 'Reimbursed', 'Rejected')
            note = ('Approved as claimed.' if st in ('Approved', 'Reimbursed')
                    else 'Outside travel policy.' if st == 'Rejected' else '')
            e = ExpenseClaim.objects.create(
                employee=m[idx], title=title, category=cat, amount=Decimal(amt),
                approvedAmount=Decimal(appr) if appr else None, expenseDate=d,
                description=f'{title} (demo).', status=st, reviewNote=note,
                reviewedBy=hr if reviewed else '',
                reviewedAt=at_local(d + timedelta(days=3), 12) if reviewed else None)
            ExpenseClaim.objects.filter(pk=e.pk).update(createdAt=at_local(d, 9))

        # (idx, payPeriod, amount, description) — commissions skew to the Sales team
        commissions = [
            (12, '2026-05', '5000', 'Q2 deal - Acme renewal'),
            (13, '2026-06', '7500', 'New logo - Globex'),
            (14, '2026-04', '3200', 'Upsell - Initech expansion'),
            (15, '2026-05', '1500', 'Lead referral bonus'),
            (0,  '2026-06', '2000', 'Spot bonus - platform launch'),
        ]
        deductions = [
            (0,  '2026-04', '1500', 'Salary advance repayment'),
            (4,  '2026-05', '200',  'Lost access badge replacement'),
            (8,  '2026-06', '800',  'Equipment damage'),
            (16, '2026-05', '300',  'Late-arrival penalty'),
            (2,  '2026-04', '1000', 'Training bond installment'),
        ]
        for model, plan in ((Commission, commissions), (Deduction, deductions)):
            for idx, period, amt, desc in plan:
                row = model.objects.create(
                    employee=m[idx], payPeriod=period, amount=Decimal(amt),
                    description=desc, createdBy=hr)
                y, mo = (int(p) for p in period.split('-'))
                model.objects.filter(pk=row.pk).update(createdAt=at_local(date(y, mo, 5), 10))

    # ─── verification summary (every number read back from the DB) ────────────
    def w(self, line=''):
        self.stdout.write(line)

    def _table(self, headers, rows, widths):
        fmt = '  '.join('{:<%d}' % w for w in widths)
        self.w(fmt.format(*headers))
        self.w(fmt.format(*['-' * w for w in widths]))
        for r in rows:
            self.w(fmt.format(*[str(c) for c in r]))

    def _summary(self):
        emp_ids = [m.employeeID for m in self.members] + \
                  [l.employeeID for l in self.leaders] + \
                  [self.admin.employeeID, self.hr.employeeID]
        seeded_emps = Employee.objects.filter(pk__in=emp_ids)

        self.w('\n' + '=' * 72)
        self.w('  EMPOWERHR DEMO SEED - VERIFICATION SUMMARY')
        self.w('=' * 72)

        # counts
        self.w('\n[1] RECORD COUNTS (read back from DB)')
        counts = [
            ('auth_user', User.objects.filter(email__endswith=SEED_DOMAIN).count()),
            ('Employee', seeded_emps.count()),
            ('Department', Department.objects.filter(name__in=DEPARTMENTS).count()),
            ('Team', Team.objects.filter(name__in=[t[0] for t in TEAMS]).count()),
            ('LeaveRequest', LeaveRequest.objects.filter(employee__in=seeded_emps).count()),
            ('AttendanceRecord', AttendanceRecord.objects.filter(employee__in=seeded_emps).count()),
            ('WorkTask', WorkTask.objects.filter(employee__in=seeded_emps).count()),
            ('WorkTaskLog', WorkTaskLog.objects.filter(task__employee__in=seeded_emps).count()),
            ('TimeCorrectionRequest', TimeCorrectionRequest.objects.filter(employee__in=seeded_emps).count()),
            ('PerformanceReview', PerformanceReview.objects.filter(employee__in=seeded_emps).count()),
            ('ExpenseClaim', ExpenseClaim.objects.filter(employee__in=seeded_emps).count()),
            ('Commission', Commission.objects.filter(employee__in=seeded_emps).count()),
            ('Deduction', Deduction.objects.filter(employee__in=seeded_emps).count()),
        ]
        self._table(['Model', 'Count'], counts, [24, 8])

        # org breakdown
        self.w('\n[2] ORG BREAKDOWN')
        rows = []
        for i, (team_name, _) in enumerate(TEAMS):
            team = Team.objects.get(name=team_name)
            members = Employee.objects.filter(team=team).exclude(pk=team.leader_id)
            disabled = [m.fullName for m in members if m.has_disability]
            rows.append([team_name, team.leader.fullName, members.count(),
                         ', '.join(disabled) or '-'])
        self._table(['Team', 'Team Leader', 'Members', 'has_disability=True'],
                    rows, [22, 18, 8, 26])

        # attendance breakdown (derived by the services, not stored)
        self.w('\n[3] ATTENDANCE BREAKDOWN (late/absent derived by the services)')
        records = list(AttendanceRecord.objects.filter(employee__in=self.members)
                       .select_related('employee'))
        late = sum(1 for r in records if reporting_service._is_late(r))
        present = sum(1 for r in records if r.clockIn)
        on_time = present - late
        absent_end = min(WINDOW_END, self.today)
        absent = sum(absence_service.count_no_show_days(m, WINDOW_START, absent_end)
                     for m in self.members)
        suspicious = AttendanceRecord.objects.filter(
            employee__in=self.members, workedHours__gt=12).count()
        ot = AttendanceRecord.objects.filter(employee__in=self.members)
        auto = ot.filter(overtimeStatus=AttendanceRecord.OT_AUTO_APPROVED).count()
        pending = ot.filter(overtimeStatus=AttendanceRecord.OT_PENDING_REVIEW).count()
        self._table(['Metric', 'Value'], [
            ('Attendance records', len(records)),
            ('On-time clock-ins', on_time),
            ('Late clock-ins (>15m)', late),
            (f'No-show days (..{absent_end})', absent),
            ('Suspicious (>12h worked)', suspicious),
            ('OT auto-approved', auto),
            ('OT pending TL review', pending),
        ], [30, 8])

        # leave
        self.w('\n[4] LEAVE - member driven to 0 Annual balance')
        bal = LeaveBalance.objects.get(
            employee=self.leave_member, leaveTypeName='Annual', year=YEAR)
        self._table(['Employee', 'Entitled', 'Used', 'Remaining'], [
            (self.leave_member.fullName, bal.entitledDays, bal.usedDays, bal.remainingDays)],
            [22, 10, 6, 10])
        exceeded, message = self.leave_exceeded
        self.w(f'    Over-cap check (not persisted) -> exceeded={exceeded}')
        self.w(f'      "{message}"')

        # utilization — same formula as the live "Utilization by Member" widget:
        # sum of estimatedHours of tasks DUE in the current week / capacity.
        cw_start, cw_end = capacity.current_work_week()
        self.w(f'\n[5] UTILIZATION - est. hours of tasks due {cw_start}..{cw_end} '
               '/ capacity (live-widget formula)')
        buckets = {'over': [], 'normal': [], 'under': []}
        idle = []
        for emp in self.members:
            _, rows = capacity.weekly_capacity([emp])
            available = rows[0]['availableHours'] or 0.0
            est = sum(v or 0 for v in WorkTask.objects.filter(
                employee=emp, dueDate__gte=cw_start, dueDate__lte=cw_end
            ).values_list('estimatedHours', flat=True))
            rate = round(est / available * 100, 1) if available else 0.0
            if est == 0:
                idle.append(emp.fullName)
            label = 'over' if rate > 100 else ('under' if rate < 70 else 'normal')
            buckets[label].append((emp.fullName, est, available, rate))
        for label in ('over', 'normal', 'under'):
            self.w(f'  -- {label.upper()} ({len(buckets[label])})')
            self._table(['Employee', 'Due-week est h', 'Avail h', 'Util %'],
                        buckets[label], [20, 14, 9, 8])
        self.w(f'  Idle members this week (0 tasks due): {len(idle)}')

        # performance reviews — confirm each TL reviewed each member >= twice
        self.w('\n[6] PERFORMANCE REVIEWS (reviewer = createdBy)')
        rows, overall_min = [], None
        for i, tl in enumerate(self.leaders):
            team_members = self.members[i * 4:(i + 1) * 4]
            counts = [PerformanceReview.objects.filter(
                employee=m, createdBy=tl.fullName).count() for m in team_members]
            least = min(counts)
            overall_min = least if overall_min is None else min(overall_min, least)
            rows.append((tl.fullName, len(team_members), sum(counts), least))
        self._table(['Team Leader', 'Members', 'Reviews', 'Min/member'], rows, [18, 8, 8, 11])
        self.w(f'  Min reviews per member across all teams: {overall_min} (>= 2 required)')
        status_mix = {s: PerformanceReview.objects.filter(
            employee__in=self.members, status=s).count()
            for s in ('Draft', 'Submitted', 'Acknowledged')}
        self.w(f'  Status mix: {status_mix}')

        # finance line items
        self.w('\n[7] FINANCE LINE ITEMS')
        exp = ExpenseClaim.objects.filter(employee__in=self.members)
        exp_mix = {s: exp.filter(status=s).count()
                   for s in ('Submitted', 'Approved', 'Reimbursed', 'Rejected')}
        com = Commission.objects.filter(employee__in=self.members)
        ded = Deduction.objects.filter(employee__in=self.members)
        com_total = sum(c.amount for c in com)
        ded_total = sum(d.amount for d in ded)
        self._table(['Type', 'Count', 'Detail'], [
            ('ExpenseClaim', exp.count(), str(exp_mix)),
            ('Commission', com.count(), f'total {com_total:g} across {com.values("payPeriod").distinct().count()} periods'),
            ('Deduction', ded.count(), f'total {ded_total:g} across {ded.values("payPeriod").distinct().count()} periods'),
        ], [14, 6, 48])

        # credentials
        self.w('\n[8] CREDENTIALS (all seeded users share one password)')
        sample_tl = self.leaders[0]
        sample_member = self.members[0]
        creds = [
            ('Admin', self.admin.email, PASSWORD),
            ('HR Manager', self.hr.email, PASSWORD),
            ('Team Leader (sample)', sample_tl.email, PASSWORD),
            ('Team Member (sample)', sample_member.email, PASSWORD),
        ]
        self._table(['Role', 'Email', 'Password'], creds, [22, 34, 14])

        self.w('\n[9] NOTES / DIVERGENCES FROM THE BRIEF')
        base_notes = [
            "Field is Employee.has_disability (not is_disable); it also drives the "
            "45-day Annual tier, so disabled members show 45 entitled days.",
            "Field is default_clock_in (not default_clock_in_time).",
            "'TaskWork' == WorkTaskLog; delete order WorkTaskLog -> WorkTask.",
            "AttendanceRecord stores NO late/absent status - late is "
            "serializers.late_minutes (>15m grace) and absent is a no-show in "
            "absence_service; both are derived above, not seeded.",
            "Utilization uses the live widget's formula (no backend rate exists): "
            "sum of estimatedHours of tasks DUE in the viewed week / capacity "
            "availableHours. Idle members happen when nothing is due that week, so "
            "every member here gets >=12 tasks incl. one tuned anchor due in the "
            "current week; over/normal/under come from those anchors.",
            "Job title + level are taken ONLY from existing employee_management_job "
            "rows (no rows created). That catalog has no Finance/Sales/HR/CS titles, "
            "so those teams map to the nearest engineering/product/support title "
            "(e.g. HR Manager -> Product Owner/Manager, CS -> Technical Support).",
            "Auto-approved OT verified via the real views._compute_overtime.",
            "WorkTask.createdAt is scattered across Apr-Jun with dueDate 5-10 days "
            "later (non-anchor tasks kept out of the current week); other "
            "createdAt/requestedAt (auto_now_add) were backdated too.",
            "Failing leave request & many forward-looking dueDates are future-dated.",
        ]
        for n in base_notes + self.notes:
            self.w(f'  - {n}')
        self.w('\n' + '=' * 72)
        self.w(self.style.SUCCESS('  Seed complete.'))
        self.w('=' * 72 + '\n')
