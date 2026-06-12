"""Tests for the Leave Management feature: Egyptian Labor Law entitlement,
holiday-aware working-day counting, balances, approval routing (TL/HR), and
HR-triggered absence detection + deduction.

Date facts used (verified against the holidays library):
  * 2026 Egyptian weekday holidays incl. Jan 7 (Coptic Christmas, Wed),
    Jun 18 (Thu).
  * Mar 8 2026 is a Sunday; Mar 8–12 (Sun–Thu) is a clean 5-working-day week.
  * Egyptian weekend is Fri+Sat.
  * working_days_in_month(2026, 6) = 21 (30 days − 8 weekend − Jun 18 holiday).
"""
from datetime import date
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import User
from employee_management.models import Employee, LeaveType, Team
from payroll.models import Deduction

from . import holiday_service as hs
from . import leave_services as ls
from . import absence_service as ab
from .models import AttendanceRecord, HolidayOverride, LeaveBalance, LeaveRequest


def _emp(**kwargs):
    kwargs.setdefault('fullName', 'Test Emp')
    return Employee.objects.create(**kwargs)


# ── Entitlement (Egyptian Labor Law No. 14 of 2025) ──────────────────────────

class EntitlementTests(TestCase):
    AS_OF = date(2026, 6, 12)

    def ent(self, **kw):
        return ls.annual_leave_entitlement(_emp(**kw), as_of=self.AS_OF)

    def test_disability_overrides_everything(self):
        # Disabled, hired yesterday -> still 45.
        self.assertEqual(self.ent(hiring_date=date(2026, 6, 1), has_disability=True), 45)

    def test_ten_plus_years(self):
        self.assertEqual(self.ent(hiring_date=date(2010, 1, 1)), 30)

    def test_exactly_ten_years_is_thirty(self):
        self.assertEqual(self.ent(hiring_date=date(2016, 6, 12)), 30)

    def test_just_under_ten_years_is_twentyone(self):
        self.assertEqual(self.ent(hiring_date=date(2016, 6, 13)), 21)

    def test_age_fifty_gives_thirty(self):
        # 2nd-year service but age exactly 50 -> 30.
        self.assertEqual(self.ent(hiring_date=date(2024, 1, 1), birth_date=date(1976, 6, 12)), 30)

    def test_age_fortynine_stays_twentyone(self):
        self.assertEqual(self.ent(hiring_date=date(2024, 1, 1), birth_date=date(1976, 6, 13)), 21)

    def test_second_year_is_twentyone(self):
        self.assertEqual(self.ent(hiring_date=date(2025, 1, 1)), 21)

    def test_first_year_six_months_prorated(self):
        # Hired exactly 6 months ago -> round(15 * 6 / 12) = 8.
        self.assertEqual(self.ent(hiring_date=date(2025, 12, 12)), 8)

    def test_first_year_eleven_months_prorated(self):
        # round(15 * 11 / 12) = round(13.75) = 14.
        self.assertEqual(self.ent(hiring_date=date(2025, 7, 12)), 14)

    def test_under_six_months_is_zero(self):
        self.assertEqual(self.ent(hiring_date=date(2026, 4, 1)), 0)

    def test_missing_hiring_date_defaults_to_full(self):
        self.assertEqual(self.ent(hiring_date=None), 21)


# ── Holiday service / working-day counting ───────────────────────────────────

class HolidayServiceTests(TestCase):
    def test_weekend_is_friday_saturday(self):
        self.assertTrue(hs.is_weekend(date(2026, 3, 13)))   # Fri
        self.assertTrue(hs.is_weekend(date(2026, 3, 14)))   # Sat
        self.assertFalse(hs.is_weekend(date(2026, 3, 8)))   # Sun
        self.assertFalse(hs.is_weekend(date(2026, 3, 12)))  # Thu

    def test_library_holiday_detected(self):
        self.assertTrue(hs.is_public_holiday(date(2026, 1, 7)))   # Coptic Christmas
        self.assertFalse(hs.is_public_holiday(date(2026, 3, 10)))

    def test_working_days_clean_week(self):
        # Sun Mar 8 .. Sat Mar 14 -> Sun-Thu = 5 working days.
        self.assertEqual(hs.working_days_in_range(date(2026, 3, 8), date(2026, 3, 14)), 5)

    def test_working_days_excludes_weekday_holiday(self):
        # Jan 5 (Mon) .. Jan 9 (Fri): Mon,Tue,[Wed7 holiday],Thu,[Fri wknd] = 3.
        self.assertEqual(hs.working_days_in_range(date(2026, 1, 5), date(2026, 1, 9)), 3)

    def test_empty_range_is_zero(self):
        self.assertEqual(hs.working_days_in_range(date(2026, 3, 12), date(2026, 3, 8)), 0)

    def test_working_days_in_month(self):
        # June 2026: 30 days - 8 weekend - 1 weekday holiday (Jun 18) = 21.
        self.assertEqual(hs.working_days_in_month(2026, 6), 21)

    def test_override_remove_cancels_library_holiday(self):
        HolidayOverride.objects.create(date=date(2026, 1, 7), type=HolidayOverride.TYPE_REMOVE)
        self.assertFalse(hs.is_public_holiday(date(2026, 1, 7)))
        # Jan 5..9 now 4 working days (Wed 7 restored).
        self.assertEqual(hs.working_days_in_range(date(2026, 1, 5), date(2026, 1, 9)), 4)

    def test_override_add_injects_company_day(self):
        HolidayOverride.objects.create(date=date(2026, 3, 10), name='Company Day',
                                       type=HolidayOverride.TYPE_ADD)
        self.assertTrue(hs.is_public_holiday(date(2026, 3, 10)))
        self.assertEqual(hs.working_days_in_range(date(2026, 3, 8), date(2026, 3, 14)), 4)

    def test_effective_holidays_for_year_reflects_overrides(self):
        HolidayOverride.objects.create(date=date(2026, 1, 7), type=HolidayOverride.TYPE_REMOVE)
        HolidayOverride.objects.create(date=date(2026, 3, 10), name='Founders Day',
                                       type=HolidayOverride.TYPE_ADD)
        dates = {item['date'] for item in hs.effective_holidays_for_year(2026)}
        self.assertNotIn('2026-01-07', dates)
        self.assertIn('2026-03-10', dates)
        self.assertIn('2026-06-18', dates)  # untouched library day


# ── Balance services ─────────────────────────────────────────────────────────

class BalanceServiceTests(TestCase):
    def setUp(self):
        self.emp = _emp(employeeID='EMP-BAL', hiring_date=date(2020, 1, 1))

    def test_balance_autocreated_with_entitlement_cap(self):
        bal = ls.get_or_create_balance(self.emp, 'Annual', 2026)
        self.assertEqual(bal.entitledDays, 21)
        self.assertEqual(bal.usedDays, 0)

    def test_unpaid_is_uncapped(self):
        bal = ls.get_or_create_balance(self.emp, 'Unpaid', 2026)
        self.assertIsNone(bal.entitledDays)

    def test_other_type_uses_leavetype_max(self):
        bal = ls.get_or_create_balance(self.emp, 'Casual', 2026)
        self.assertEqual(bal.entitledDays, 7)

    def test_evaluate_counts_working_days(self):
        days, _bal, exceeded, _msg = ls.evaluate_request(
            self.emp, 'Annual', date(2026, 3, 8), date(2026, 3, 14))
        self.assertEqual(days, 5)
        self.assertFalse(exceeded)

    def test_evaluate_flags_cap_exceeded(self):
        # Casual cap 7; Mar 8..19 = 10 working days.
        days, _bal, exceeded, _msg = ls.evaluate_request(
            self.emp, 'Casual', date(2026, 3, 8), date(2026, 3, 19))
        self.assertEqual(days, 10)
        self.assertTrue(exceeded)

    def test_unpaid_never_exceeds(self):
        _days, _bal, exceeded, _msg = ls.evaluate_request(
            self.emp, 'Unpaid', date(2026, 3, 8), date(2026, 3, 31))
        self.assertFalse(exceeded)

    def test_deduct_balance_increments_used(self):
        ls.deduct_balance(self.emp, 'Annual', 5, 2026)
        ls.deduct_balance(self.emp, 'Annual', 3, 2026)
        bal = LeaveBalance.objects.get(employee=self.emp, leaveTypeName='Annual', year=2026)
        self.assertEqual(bal.usedDays, 8)

    def test_can_fit_respects_cap(self):
        ls.deduct_balance(self.emp, 'Casual', 5, 2026)
        fits, _ = ls.can_fit(self.emp, 'Casual', 2, 2026)
        self.assertTrue(fits)
        fits, _ = ls.can_fit(self.emp, 'Casual', 3, 2026)
        self.assertFalse(fits)


# ── Leave request API: creation + approval routing ───────────────────────────

class LeaveRequestApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.team_a = Team.objects.create(name='Alpha')
        self.team_b = Team.objects.create(name='Beta')

        self.member = self._user('member@x.com', User.Role.TEAM_MEMBER, self.team_a)
        self.leader = self._user('leadA@x.com', User.Role.TEAM_LEADER, self.team_a)
        self.leader_b = self._user('leadB@x.com', User.Role.TEAM_LEADER, self.team_b)
        self.hr = self._user('hr@x.com', User.Role.HR_MANAGER, None)
        self.admin = self._user('admin@x.com', User.Role.ADMIN, None)

    def _user(self, email, role, team):
        user = User.objects.create_user(email=email, password='x', role=role, full_name=email)
        emp = user.employee
        emp.hiring_date = date(2020, 1, 1)
        emp.team = team
        emp.save()
        return user

    def _create_request(self, applicant, leave_type, start, end):
        self.client.force_authenticate(user=applicant)
        return self.client.post(reverse('employee-leave-request-list-create'), {
            'employeeID': applicant.employee_id,
            'leaveType': leave_type,
            'startDate': start.isoformat(),
            'endDate': end.isoformat(),
            'reason': 'test',
        }, format='json')

    def test_create_counts_working_days(self):
        res = self._create_request(self.member, 'Annual', date(2026, 3, 8), date(2026, 3, 14))
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['daysRequested'], 5)
        self.assertEqual(res.data['leaveType'], 'Annual')  # name string, not FK id

    def test_create_rejects_all_weekend_period(self):
        res = self._create_request(self.member, 'Annual', date(2026, 3, 13), date(2026, 3, 14))
        self.assertEqual(res.status_code, 400)

    def test_create_rejects_overlap(self):
        self._create_request(self.member, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        res = self._create_request(self.member, 'Annual', date(2026, 3, 10), date(2026, 3, 14))
        self.assertEqual(res.status_code, 400)

    def test_create_blocks_when_cap_exceeded(self):
        # Casual cap 7; 10 working days requested.
        res = self._create_request(self.member, 'Casual', date(2026, 3, 8), date(2026, 3, 19))
        self.assertEqual(res.status_code, 400)

    def test_leader_approves_team_member_and_deducts(self):
        created = self._create_request(self.member, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        pk = created.data['leaveRequestID']

        self.client.force_authenticate(user=self.leader)
        res = self.client.post(reverse('approve-leave-request', args=[pk]))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], LeaveRequest.STATUS_APPROVED)

        bal = LeaveBalance.objects.get(employee=self.member.employee, leaveTypeName='Annual', year=2026)
        self.assertEqual(bal.usedDays, 5)

    def test_leader_cannot_approve_other_team(self):
        created = self._create_request(self.member, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        pk = created.data['leaveRequestID']
        self.client.force_authenticate(user=self.leader_b)
        res = self.client.post(reverse('approve-leave-request', args=[pk]))
        self.assertEqual(res.status_code, 403)

    def test_leader_request_not_approvable_by_other_leader_only_hr(self):
        # A Team Leader's own request must route to HR, not a peer TL.
        created = self._create_request(self.leader, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        pk = created.data['leaveRequestID']

        self.client.force_authenticate(user=self.leader_b)
        self.assertEqual(self.client.post(reverse('approve-leave-request', args=[pk])).status_code, 403)

        self.client.force_authenticate(user=self.hr)
        res = self.client.post(reverse('hr-leave-request-review', args=[pk]), {'action': 'approve'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], LeaveRequest.STATUS_APPROVED)

    def test_admin_cannot_review_leave(self):
        created = self._create_request(self.member, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        pk = created.data['leaveRequestID']
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(reverse('approve-leave-request', args=[pk]))
        self.assertEqual(res.status_code, 403)

    def test_double_approval_does_not_double_deduct(self):
        created = self._create_request(self.member, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        pk = created.data['leaveRequestID']
        self.client.force_authenticate(user=self.leader)
        self.client.post(reverse('approve-leave-request', args=[pk]))
        self.client.post(reverse('approve-leave-request', args=[pk]))
        bal = LeaveBalance.objects.get(employee=self.member.employee, leaveTypeName='Annual', year=2026)
        self.assertEqual(bal.usedDays, 5)

    def test_reject_does_not_deduct(self):
        created = self._create_request(self.member, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        pk = created.data['leaveRequestID']
        self.client.force_authenticate(user=self.leader)
        res = self.client.post(reverse('reject-leave-request', args=[pk]), {'reviewNotes': 'no'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], LeaveRequest.STATUS_REJECTED)
        self.assertFalse(LeaveBalance.objects.filter(
            employee=self.member.employee, leaveTypeName='Annual', usedDays__gt=0).exists())

    def test_balance_endpoint_autocreates_for_all_types(self):
        self.client.force_authenticate(user=self.member)
        res = self.client.get(reverse('employee-leave-balances'), {'year': 2026})
        self.assertEqual(res.status_code, 200)
        names = {row['leaveTypeName'] for row in res.data}
        self.assertTrue({'Annual', 'Sick', 'Casual', 'Unpaid'}.issubset(names))

    def test_create_with_supporting_document(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.client.force_authenticate(user=self.member)
        doc = SimpleUploadedFile('note.pdf', b'%PDF-1.4 test', content_type='application/pdf')
        res = self.client.post(reverse('employee-leave-request-list-create'), {
            'employeeID': self.member.employee_id,
            'leaveType': 'Sick',
            'startDate': '2026-03-08',
            'endDate': '2026-03-12',
            'reason': 'flu',
            'document': doc,
        }, format='multipart')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['document'])
        lr = LeaveRequest.objects.get(pk=res.data['leaveRequestID'])
        self.assertTrue(lr.document.name.endswith('.pdf'))

    def test_team_list_scopes_to_team_and_carries_balance(self):
        created = self._create_request(self.member, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        pk = created.data['leaveRequestID']

        self.client.force_authenticate(user=self.leader)
        res = self.client.get(reverse('team-leave-request-list'))
        self.assertEqual(res.status_code, 200)
        ids = {r['leaveRequestID'] for r in res.data}
        self.assertIn(pk, ids)
        row = next(r for r in res.data if r['leaveRequestID'] == pk)
        self.assertIn('balance', row)
        self.assertEqual(row['balance']['entitledDays'], 21)

        # A leader from another team sees nothing of this team's requests.
        self.client.force_authenticate(user=self.leader_b)
        res_b = self.client.get(reverse('team-leave-request-list'))
        self.assertNotIn(pk, {r['leaveRequestID'] for r in res_b.data})

    def test_team_list_excludes_leaders_own_request(self):
        created = self._create_request(self.leader, 'Annual', date(2026, 3, 8), date(2026, 3, 12))
        pk = created.data['leaveRequestID']
        self.client.force_authenticate(user=self.leader)
        res = self.client.get(reverse('team-leave-request-list'))
        self.assertNotIn(pk, {r['leaveRequestID'] for r in res.data})


# ── Absence detection + deduction ────────────────────────────────────────────

class AbsenceServiceTests(TestCase):
    def setUp(self):
        self.emp = _emp(employeeID='EMP-ABS', monthlyIncome=21000,
                        hiring_date=date(2020, 1, 1), employmentStatus='Active')

    def test_detects_noshow_excluding_weekend_holiday_present_and_leave(self):
        # Window Jun 15 (Mon) .. Jun 21 (Sun) 2026. Working days: 15,16,17,21
        # (Jun 18 Thu is a holiday; Fri 19 / Sat 20 weekend).
        AttendanceRecord.objects.create(employee=self.emp, date=date(2026, 6, 15))  # present
        annual = LeaveType.objects.get(name='Annual')
        LeaveRequest.objects.create(
            employee=self.emp, leaveType=annual, startDate=date(2026, 6, 16),
            endDate=date(2026, 6, 16), daysRequested=1, reason='x',
            status=LeaveRequest.STATUS_APPROVED)

        summary = ab.detect_and_deduct(self.emp, date(2026, 6, 15), date(2026, 6, 21), created_by='hr')
        # Absences = Jun 17 and Jun 21 (15 present, 16 on leave).
        self.assertEqual(summary['absenceDayCount'], 2)
        self.assertEqual(summary['deductionsCreated'], 2)
        # Day pay = 21000 / working_days_in_month(2026,6)=21 -> 1000.
        self.assertEqual(Deduction.objects.filter(employee=self.emp).count(), 2)
        self.assertEqual(Deduction.objects.first().amount, Decimal('1000.00'))

    def test_idempotent_rerun(self):
        first = ab.detect_and_deduct(self.emp, date(2026, 6, 15), date(2026, 6, 21))
        second = ab.detect_and_deduct(self.emp, date(2026, 6, 15), date(2026, 6, 21))
        self.assertEqual(first['deductionsCreated'], 4)  # 15,16,17,21 all no-show
        self.assertEqual(second['deductionsCreated'], 0)
        self.assertEqual(second['deductionsSkipped'], 4)
        self.assertEqual(Deduction.objects.filter(employee=self.emp).count(), 4)

    def test_zero_income_creates_zero_deduction(self):
        self.emp.monthlyIncome = None
        self.emp.save()
        ab.detect_and_deduct(self.emp, date(2026, 3, 9), date(2026, 3, 9))
        self.assertEqual(Deduction.objects.get(employee=self.emp).amount, Decimal('0.00'))


# ── HR API: holiday overrides + absence run ──────────────────────────────────

class HRApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hr = User.objects.create_user(email='hr2@x.com', password='x',
                                            role=User.Role.HR_MANAGER, full_name='HR')
        self.member = User.objects.create_user(email='m2@x.com', password='x',
                                                role=User.Role.TEAM_MEMBER, full_name='M')
        emp = self.member.employee
        emp.monthlyIncome = 21000
        emp.employmentStatus = 'Active'
        emp.save()

    def test_member_forbidden_from_holiday_overrides(self):
        self.client.force_authenticate(user=self.member)
        self.assertEqual(self.client.get(reverse('hr-holiday-override-list-create')).status_code, 403)

    def test_override_create_update_and_delete(self):
        self.client.force_authenticate(user=self.hr)
        res = self.client.post(reverse('hr-holiday-override-list-create'),
                               {'date': '2026-03-10', 'name': 'Founders', 'type': 'add'}, format='json')
        self.assertEqual(res.status_code, 201)
        override_id = res.data['overrideID']
        # update_or_create: same date again updates rather than duplicates.
        self.client.post(reverse('hr-holiday-override-list-create'),
                         {'date': '2026-03-10', 'name': 'Founders Day', 'type': 'remove'}, format='json')
        self.assertEqual(HolidayOverride.objects.filter(date=date(2026, 3, 10)).count(), 1)

        res = self.client.delete(reverse('hr-holiday-override-detail', args=[override_id]))
        self.assertEqual(res.status_code, 204)

    def test_holiday_calendar_reflects_override(self):
        self.client.force_authenticate(user=self.hr)
        self.client.post(reverse('hr-holiday-override-list-create'),
                         {'date': '2026-01-07', 'type': 'remove'}, format='json')
        res = self.client.get(reverse('hr-holiday-calendar'), {'year': 2026})
        dates = {item['date'] for item in res.data}
        self.assertNotIn('2026-01-07', dates)

    def test_absence_run_endpoint_idempotent(self):
        self.client.force_authenticate(user=self.hr)
        payload = {'startDate': '2026-06-15', 'endDate': '2026-06-21', 'employeeID': self.member.employee_id}
        first = self.client.post(reverse('hr-absence-run'), payload, format='json')
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data['deductionsCreated'], 4)
        second = self.client.post(reverse('hr-absence-run'), payload, format='json')
        self.assertEqual(second.data['deductionsCreated'], 0)
        self.assertEqual(second.data['deductionsSkipped'], 4)
