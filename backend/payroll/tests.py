from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase, TestCase, override_settings

from payroll import calculations as calc


# July 2024 is a convenient month: July 1 is a Monday and it has 23 weekdays.
JULY_2024 = '2024-07'


class WeekdayMathTests(SimpleTestCase):
    def test_weekdays_in_month_july_2024(self):
        self.assertEqual(calc.weekdays_in_month(2024, 7), 23)

    def test_weekdays_between_inclusive(self):
        # Mon Jul 1 .. Fri Jul 5: Fri is the (Egyptian) weekend -> Mon-Thu = 4
        self.assertEqual(calc.weekdays_between(date(2024, 7, 1), date(2024, 7, 5)), 4)

    def test_weekdays_between_excludes_weekends(self):
        # Fri Jul 5 .. Mon Jul 8: Fri/Sat skipped -> Sun 7 + Mon 8 = 2
        self.assertEqual(calc.weekdays_between(date(2024, 7, 5), date(2024, 7, 8)), 2)

    def test_weekdays_between_empty_range(self):
        self.assertEqual(calc.weekdays_between(date(2024, 7, 10), date(2024, 7, 9)), 0)


class EmploymentWindowTests(SimpleTestCase):
    def setUp(self):
        self.start, self.end = calc.parse_pay_period(JULY_2024)

    def test_full_month_when_no_dates(self):
        self.assertEqual(
            calc.employment_window(self.start, self.end, None, None),
            (date(2024, 7, 1), date(2024, 7, 31)),
        )

    def test_clips_to_hiring_date(self):
        window = calc.employment_window(self.start, self.end, date(2024, 7, 16), None)
        self.assertEqual(window, (date(2024, 7, 16), date(2024, 7, 31)))

    def test_clips_to_leaving_date(self):
        window = calc.employment_window(self.start, self.end, None, date(2024, 7, 15))
        self.assertEqual(window, (date(2024, 7, 1), date(2024, 7, 15)))

    def test_not_employed_returns_none(self):
        # Hired after the month ended
        self.assertIsNone(
            calc.employment_window(self.start, self.end, date(2024, 8, 1), None))


class UnpaidLeaveWeekdayTests(SimpleTestCase):
    def test_counts_weekdays_in_window(self):
        # Mon Jul 8 .. Fri Jul 12: Fri 12 is weekend -> Mon-Thu = 4
        days = calc.unpaid_leave_weekdays(
            [(date(2024, 7, 8), date(2024, 7, 12))], date(2024, 7, 1), date(2024, 7, 31))
        self.assertEqual(days, 4)

    def test_overlapping_intervals_deduped(self):
        days = calc.unpaid_leave_weekdays(
            [(date(2024, 7, 8), date(2024, 7, 12)),
             (date(2024, 7, 10), date(2024, 7, 12))],
            date(2024, 7, 1), date(2024, 7, 31))
        self.assertEqual(days, 4)

    def test_clipped_to_employment_window(self):
        # Leave covers the whole month but employee only joined Jul 16
        days = calc.unpaid_leave_weekdays(
            [(date(2024, 7, 1), date(2024, 7, 31))], date(2024, 7, 16), date(2024, 7, 31))
        self.assertEqual(days, 12)


class ComputeBreakdownTests(SimpleTestCase):
    def _compute(self, **overrides):
        params = dict(
            base_salary=23000, pay_period=JULY_2024,
            hiring_date=None, leaving_date=None,
            unpaid_days=0, manual_deductions=0,
            commissions=0, expense_reimbursements=0,
        )
        params.update(overrides)
        return calc.compute_breakdown(**params)

    def test_full_month_no_adjustments(self):
        r = self._compute()
        self.assertEqual(r['dailyRate'], Decimal('1000.0000'))
        self.assertEqual(r['proratedBaseSalary'], Decimal('23000.00'))
        self.assertEqual(r['netPay'], Decimal('23000.00'))

    def test_mid_month_joiner_proration(self):
        r = self._compute(hiring_date=date(2024, 7, 16))
        self.assertEqual(r['weekdaysEmployed'], 12)
        self.assertEqual(r['proratedBaseSalary'], Decimal('12000.00'))
        self.assertEqual(r['netPay'], Decimal('12000.00'))

    def test_mid_month_leaver_proration(self):
        r = self._compute(leaving_date=date(2024, 7, 15))
        self.assertEqual(r['weekdaysEmployed'], 11)
        self.assertEqual(r['proratedBaseSalary'], Decimal('11000.00'))

    def test_unpaid_leave_deduction(self):
        r = self._compute(unpaid_days=4)
        self.assertEqual(r['unpaidLeaveDays'], 4)
        self.assertEqual(r['unpaidLeaveDeduction'], Decimal('4000.00'))
        self.assertEqual(r['netPay'], Decimal('19000.00'))

    def test_full_formula(self):
        r = self._compute(
            manual_deductions=1000, commissions=2000, expense_reimbursements=500,
            unpaid_days=4)
        # 23000 - 4000 + 2000 - 1000 + 500
        self.assertEqual(r['netPay'], Decimal('20500.00'))

    def test_not_employed_zero_base(self):
        r = self._compute(hiring_date=date(2024, 8, 1))
        self.assertEqual(r['weekdaysEmployed'], 0)
        self.assertEqual(r['proratedBaseSalary'], Decimal('0.00'))
        self.assertEqual(r['netPay'], Decimal('0.00'))

    def test_unpaid_days_can_zero_out_pay(self):
        # Joined Jul 16 (12 working days) and absent all 12 -> net 0.
        r = self._compute(hiring_date=date(2024, 7, 16), unpaid_days=12)
        self.assertEqual(r['unpaidLeaveDays'], 12)
        self.assertEqual(r['proratedBaseSalary'], Decimal('12000.00'))
        self.assertEqual(r['unpaidLeaveDeduction'], Decimal('12000.00'))
        self.assertEqual(r['netPay'], Decimal('0.00'))

    def test_non_divisible_base_rounds_to_cents(self):
        r = self._compute(base_salary=10000)
        self.assertEqual(r['dailyRate'], Decimal('434.7826'))
        self.assertEqual(r['proratedBaseSalary'], Decimal('10000.00'))

    def test_overtime_pay_at_one_and_half_hourly(self):
        # base 23000, July 23 weekdays -> daily 1000, 8h/day -> hourly 125
        # 10 OT hours -> 125 * 10 * 1.5 = 1875
        r = self._compute(overtime_hours=10, hours_per_day=8)
        self.assertEqual(r['hourlyRate'], Decimal('125.0000'))
        self.assertEqual(r['overtimeHours'], Decimal('10.00'))
        self.assertEqual(r['overtimePay'], Decimal('1875.00'))
        self.assertEqual(r['netPay'], Decimal('24875.00'))

    def test_overtime_defaults_to_eight_hour_day(self):
        r = self._compute(overtime_hours=4)
        self.assertEqual(r['hourlyRate'], Decimal('125.0000'))
        self.assertEqual(r['overtimePay'], Decimal('750.00'))

    def test_no_overtime_leaves_net_unchanged(self):
        r = self._compute()
        self.assertEqual(r['overtimePay'], Decimal('0.00'))
        self.assertEqual(r['netPay'], Decimal('23000.00'))


@override_settings(PAYROLL_DAILY_RATE_BASIS='working_days')
class ComputePayrollDBTests(TestCase):
    """compute_payroll resolves deductible (no-show + unpaid-leave) days and pulls
    approved expenses, commissions, manual deductions and approved overtime.

    Pinned to the 'working_days' basis for clean numbers: July 2024 has 21 working
    days after the Jul 11 & 25 holidays, so a 21000 salary gives a 1000 daily rate."""

    def setUp(self):
        from datetime import datetime
        from django.utils import timezone
        from employee_management.models import Employee, LeaveType
        from Attendance_and_Leave.models import LeaveRequest, AttendanceRecord
        from payroll.models import Commission, Deduction

        unpaid = LeaveType.objects.get(name='Casual')  # Casual is the unpaid type
        annual = LeaveType.objects.get(name='Annual')

        # Hired Jul 22 -> window Jul 22..31; working days are 22, 23, 24, 28, 29,
        # 30, 31 (Jul 25 holiday; Fri/Sat weekend) = 7 days.
        self.employee = Employee.objects.create(
            employeeID='EMP-TEST-1', fullName='Test Worker',
            hiring_date=date(2024, 7, 22), employmentStatus='Active')

        def present(day):
            AttendanceRecord.objects.create(
                employee=self.employee, date=day,
                clockIn=timezone.make_aware(datetime(day.year, day.month, day.day, 9, 0)))

        present(date(2024, 7, 22))
        present(date(2024, 7, 23))
        # Jul 24 approved UNPAID leave -> deductible.
        LeaveRequest.objects.create(
            employee=self.employee, leaveType=unpaid,
            startDate=date(2024, 7, 24), endDate=date(2024, 7, 24),
            reason='x', status=LeaveRequest.STATUS_APPROVED)
        # Jul 28 approved PAID (annual) leave -> NOT deductible.
        LeaveRequest.objects.create(
            employee=self.employee, leaveType=annual,
            startDate=date(2024, 7, 28), endDate=date(2024, 7, 28),
            reason='x', status=LeaveRequest.STATUS_APPROVED)
        # Jul 29/30/31 have no record and no leave -> no-show absences.
        # Deductible working days = Jul 24 + Jul 29/30/31 = 4.

        Commission.objects.create(
            employee=self.employee, payPeriod=JULY_2024, amount=Decimal('2000'))
        Commission.objects.create(
            employee=self.employee, payPeriod=JULY_2024, amount=Decimal('500'))
        Deduction.objects.create(
            employee=self.employee, payPeriod=JULY_2024, amount=Decimal('600'),
            description='Equipment damage')
        Deduction.objects.create(
            employee=self.employee, payPeriod=JULY_2024, amount=Decimal('400'),
            description='Late penalty')

    def _make_expense(self, status, amount, approved_amount, day=22):
        from employee_management.models import ExpenseClaim
        return ExpenseClaim.objects.create(
            employee=self.employee, title='t', amount=Decimal(amount),
            approvedAmount=None if approved_amount is None else Decimal(approved_amount),
            expenseDate=date(2024, 7, day), status=status)

    def test_full_compute(self):
        self._make_expense('Approved', '1000', '800')
        self._make_expense('Rejected', '300', '300', day=23)

        r = calc.compute_payroll(self.employee, JULY_2024, base_salary=21000)

        # daily rate = 21000 / 21 working days = 1000; 7 employed working days
        # -> prorated 7000; 4 deductible days -> 4000.
        self.assertEqual(r['unpaidLeaveDays'], 4)
        self.assertEqual(r['proratedBaseSalary'], Decimal('7000.00'))
        self.assertEqual(r['unpaidLeaveDeduction'], Decimal('4000.00'))
        self.assertEqual(r['commissions'], Decimal('2500.00'))
        self.assertEqual(r['deductions'], Decimal('1000.00'))
        self.assertEqual(r['expenseReimbursements'], Decimal('800.00'))
        # 7000 - 4000 + 2500 - 1000 + 800
        self.assertEqual(r['netPay'], Decimal('5300.00'))

    def test_approved_without_approved_amount_contributes_zero(self):
        self._make_expense('Approved', '1000', None)
        r = calc.compute_payroll(self.employee, JULY_2024, base_salary=21000)
        self.assertEqual(r['expenseReimbursements'], Decimal('0.00'))

    def test_approved_overtime_adds_pay_pending_ignored(self):
        from Attendance_and_Leave.models import AttendanceRecord
        AttendanceRecord.objects.filter(
            employee=self.employee, date=date(2024, 7, 22)).update(
            overtimeHours=Decimal('6'), overtimeStatus=AttendanceRecord.OT_AUTO_APPROVED)
        AttendanceRecord.objects.filter(
            employee=self.employee, date=date(2024, 7, 23)).update(
            overtimeHours=Decimal('3'), overtimeStatus=AttendanceRecord.OT_PENDING_REVIEW)

        r = calc.compute_payroll(self.employee, JULY_2024, base_salary=21000)
        # daily 1000, hourly = 1000/8 = 125. OT 6h -> 125 * 6 * 1.5 = 1125.
        self.assertEqual(r['hourlyRate'], Decimal('125.0000'))
        self.assertEqual(r['overtimeHours'], Decimal('6.00'))
        self.assertEqual(r['overtimePay'], Decimal('1125.00'))
        # 7000 - 4000 + 2500 - 1000 + 0 + 1125
        self.assertEqual(r['netPay'], Decimal('5625.00'))


@override_settings(PAYROLL_DAILY_RATE_BASIS='working_days')
class UnpaidDaysCappedAtTodayTests(TestCase):
    def test_only_elapsed_days_count_as_unpaid(self):
        from django.utils import timezone
        from employee_management.models import Employee
        from Attendance_and_Leave.holiday_service import working_dates_in_range

        today = timezone.localdate()
        period = f'{today.year:04d}-{today.month:02d}'
        emp = Employee.objects.create(
            employeeID='EMP-TODAY', fullName='Today Worker', employmentStatus='Active')

        # No attendance this month -> every *elapsed* working day is an unpaid
        # absence, but future working days in the month must not be counted yet.
        r = calc.compute_payroll(emp, period, base_salary=21000)
        elapsed = len(working_dates_in_range(date(today.year, today.month, 1), today))
        self.assertEqual(r['unpaidLeaveDays'], elapsed)


class RunCycleTests(TestCase):
    """Bulk payroll cycle: per-employee generation helper and eligibility."""

    def test_generate_for_employee_uses_breakdown(self):
        from datetime import datetime
        from django.utils import timezone
        from employee_management.models import Employee
        from Attendance_and_Leave.models import AttendanceRecord
        from Attendance_and_Leave.holiday_service import working_dates_in_range
        from payroll.views import _generate_payroll_for_employee

        emp = Employee.objects.create(
            employeeID='EMP-RC1', fullName='Cycle One', monthlyIncome=23000)
        # Present every working day -> no absence deduction, full pay.
        for d in working_dates_in_range(date(2024, 7, 1), date(2024, 7, 31)):
            AttendanceRecord.objects.create(
                employee=emp, date=d,
                clockIn=timezone.make_aware(datetime(d.year, d.month, d.day, 9, 0)))

        record, reason = _generate_payroll_for_employee(emp, JULY_2024)
        self.assertIsNone(reason)
        self.assertEqual(record.netPay, Decimal('23000.00'))
        self.assertEqual(record.payPeriod, JULY_2024)

    def test_generate_skips_when_no_salary(self):
        from employee_management.models import Employee
        from payroll.views import _generate_payroll_for_employee

        emp = Employee.objects.create(employeeID='EMP-RC2', fullName='No Salary')
        record, reason = _generate_payroll_for_employee(emp, JULY_2024)
        self.assertIsNone(record)
        self.assertEqual(reason, 'No base salary on profile')

    def test_run_cycle_targets_active_non_candidates_only(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from accounts.models import User
        from payroll.models import PayrollRecord

        # Active team member with a salary -> should be generated.
        tm = User.objects.create_user(email='tm@x.com', password='x',
                                      role=User.Role.TEAM_MEMBER, full_name='TM')
        tm.employee.monthlyIncome = 23000
        tm.employee.save()
        # Candidate -> excluded (no employee, and role excluded).
        User.objects.create_user(email='cand@x.com', password='x',
                                 role=User.Role.CANDIDATE, full_name='Cand')
        # Inactive HR manager -> excluded.
        inactive = User.objects.create_user(email='ia@x.com', password='x',
                                            role=User.Role.HR_MANAGER, full_name='IA',
                                            is_active=False)
        inactive.employee.monthlyIncome = 10000
        inactive.employee.save()
        # Admin caller (also active, but no salary on profile -> skipped, not created).
        admin = User.objects.create_user(email='admin@x.com', password='x',
                                         role=User.Role.ADMIN, full_name='AD')

        client = APIClient()
        client.force_authenticate(user=admin)
        res = client.post(reverse('hr-payroll-run-cycle'),
                          {'payPeriod': JULY_2024}, format='json')

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['created'], 1)
        self.assertTrue(PayrollRecord.objects.filter(
            employee=tm.employee, payPeriod=JULY_2024).exists())
        self.assertFalse(PayrollRecord.objects.filter(
            employee=inactive.employee, payPeriod=JULY_2024).exists())


class PayrollEditTests(TestCase):
    def test_edit_recomputes_net_and_stamps_audit(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from accounts.models import User
        from employee_management.models import Employee
        from payroll.models import PayrollRecord

        employee = Employee.objects.create(
            employeeID='EMP-ED1', fullName='Edit Target', monthlyIncome=20000)
        record = PayrollRecord.objects.create(
            employee=employee, payPeriod=JULY_2024,
            proratedBaseSalary=Decimal('20000.00'), netPay=Decimal('20000.00'))

        admin = User.objects.create_user(email='admined@x.com', password='x',
                                         role=User.Role.ADMIN, full_name='Admin Editor')
        client = APIClient()
        client.force_authenticate(user=admin)

        res = client.post(
            reverse('hr-payroll-edit', args=[record.payrollID]),
            {'commissions': '1000.00', 'deductions': '500.00', 'editReason': 'Quarterly bonus correction'},
            format='json')

        self.assertEqual(res.status_code, 200)
        record.refresh_from_db()
        self.assertEqual(record.commissions, Decimal('1000.00'))
        self.assertEqual(record.deductions, Decimal('500.00'))
        # 20000 + 1000 - 500
        self.assertEqual(record.netPay, Decimal('20500.00'))
        self.assertEqual(record.editedBy, 'Admin Editor')
        self.assertEqual(record.editReason, 'Quarterly bonus correction')
        self.assertIsNotNone(record.editedAt)

    def test_edit_requires_reason(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        from accounts.models import User
        from employee_management.models import Employee
        from payroll.models import PayrollRecord

        employee = Employee.objects.create(
            employeeID='EMP-ED2', fullName='No Reason', monthlyIncome=20000)
        record = PayrollRecord.objects.create(
            employee=employee, payPeriod=JULY_2024, netPay=Decimal('20000.00'))

        admin = User.objects.create_user(email='admined2@x.com', password='x',
                                         role=User.Role.ADMIN, full_name='Admin Editor')
        client = APIClient()
        client.force_authenticate(user=admin)

        res = client.post(
            reverse('hr-payroll-edit', args=[record.payrollID]),
            {'commissions': '1000.00'}, format='json')
        self.assertEqual(res.status_code, 400)
