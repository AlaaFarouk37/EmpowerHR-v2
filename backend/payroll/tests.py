from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase, TestCase

from payroll import calculations as calc


# July 2024 is a convenient month: July 1 is a Monday and it has 23 weekdays.
JULY_2024 = '2024-07'


class WeekdayMathTests(SimpleTestCase):
    def test_weekdays_in_month_july_2024(self):
        self.assertEqual(calc.weekdays_in_month(2024, 7), 23)

    def test_weekdays_between_inclusive(self):
        # Mon Jul 1 .. Fri Jul 5 = 5 weekdays
        self.assertEqual(calc.weekdays_between(date(2024, 7, 1), date(2024, 7, 5)), 5)

    def test_weekdays_between_excludes_weekends(self):
        # Fri Jul 5 .. Mon Jul 8 = 2 weekdays (Sat/Sun skipped)
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
        # Mon Jul 8 .. Fri Jul 12 = 5 weekdays
        days = calc.unpaid_leave_weekdays(
            [(date(2024, 7, 8), date(2024, 7, 12))], date(2024, 7, 1), date(2024, 7, 31))
        self.assertEqual(days, 5)

    def test_overlapping_intervals_deduped(self):
        days = calc.unpaid_leave_weekdays(
            [(date(2024, 7, 8), date(2024, 7, 12)),
             (date(2024, 7, 10), date(2024, 7, 12))],
            date(2024, 7, 1), date(2024, 7, 31))
        self.assertEqual(days, 5)

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
            unpaid_leave_intervals=[], manual_deductions=0,
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
        r = self._compute(unpaid_leave_intervals=[(date(2024, 7, 8), date(2024, 7, 12))])
        self.assertEqual(r['unpaidLeaveDays'], 5)
        self.assertEqual(r['unpaidLeaveDeduction'], Decimal('5000.00'))
        self.assertEqual(r['netPay'], Decimal('18000.00'))

    def test_full_formula(self):
        r = self._compute(
            manual_deductions=1000, commissions=2000, expense_reimbursements=500,
            unpaid_leave_intervals=[(date(2024, 7, 8), date(2024, 7, 12))])
        # 23000 - 5000 + 2000 - 1000 + 500
        self.assertEqual(r['netPay'], Decimal('19500.00'))

    def test_not_employed_zero_base(self):
        r = self._compute(hiring_date=date(2024, 8, 1))
        self.assertEqual(r['weekdaysEmployed'], 0)
        self.assertEqual(r['proratedBaseSalary'], Decimal('0.00'))
        self.assertEqual(r['netPay'], Decimal('0.00'))

    def test_unpaid_leave_clipped_to_window(self):
        # Joined Jul 16 and on unpaid leave the entire month -> only 12 weekdays
        r = self._compute(
            hiring_date=date(2024, 7, 16),
            unpaid_leave_intervals=[(date(2024, 7, 1), date(2024, 7, 31))])
        self.assertEqual(r['unpaidLeaveDays'], 12)
        self.assertEqual(r['proratedBaseSalary'], Decimal('12000.00'))
        self.assertEqual(r['unpaidLeaveDeduction'], Decimal('12000.00'))
        self.assertEqual(r['netPay'], Decimal('0.00'))

    def test_non_divisible_base_rounds_to_cents(self):
        r = self._compute(base_salary=10000)
        self.assertEqual(r['dailyRate'], Decimal('434.7826'))
        self.assertEqual(r['proratedBaseSalary'], Decimal('10000.00'))


class ComputePayrollDBTests(TestCase):
    """Integration test: compute_payroll pulls approved unpaid leave, approved
    expenses (by approvedAmount) and commissions from the database."""

    def setUp(self):
        from employee_management.models import Employee
        from Attendance_and_Leave.models import LeaveRequest
        from payroll.models import Commission, Deduction

        self.employee = Employee.objects.create(
            employeeID='EMP-TEST-1', fullName='Test Worker',
            employmentStatus='Active')

        # Approved unpaid leave: Mon Jul 8 .. Fri Jul 12 (5 weekdays)
        LeaveRequest.objects.create(
            employee=self.employee, leaveType=LeaveRequest.TYPE_UNPAID,
            startDate=date(2024, 7, 8), endDate=date(2024, 7, 12),
            reason='x', status=LeaveRequest.STATUS_APPROVED)
        # Paid (Annual) leave should be ignored even though approved
        LeaveRequest.objects.create(
            employee=self.employee, leaveType=LeaveRequest.TYPE_ANNUAL,
            startDate=date(2024, 7, 15), endDate=date(2024, 7, 16),
            reason='x', status=LeaveRequest.STATUS_APPROVED)
        # Pending unpaid leave should be ignored
        LeaveRequest.objects.create(
            employee=self.employee, leaveType=LeaveRequest.TYPE_UNPAID,
            startDate=date(2024, 7, 22), endDate=date(2024, 7, 23),
            reason='x', status=LeaveRequest.STATUS_PENDING)

        Commission.objects.create(
            employee=self.employee, payPeriod=JULY_2024, amount=Decimal('2000'))
        Commission.objects.create(
            employee=self.employee, payPeriod=JULY_2024, amount=Decimal('500'))

        # Two manual deduction line items -> summed to 1000
        Deduction.objects.create(
            employee=self.employee, payPeriod=JULY_2024, amount=Decimal('600'),
            description='Equipment damage')
        Deduction.objects.create(
            employee=self.employee, payPeriod=JULY_2024, amount=Decimal('400'),
            description='Late penalty')

    def _make_expense(self, status, amount, approved_amount, day=10):
        from employee_management.models import ExpenseClaim
        return ExpenseClaim.objects.create(
            employee=self.employee, title='t', amount=Decimal(amount),
            approvedAmount=None if approved_amount is None else Decimal(approved_amount),
            expenseDate=date(2024, 7, day), status=status)

    def test_full_compute(self):
        # Approved claim: claimed 1000, approved 800 -> uses 800
        self._make_expense('Approved', '1000', '800')
        # Rejected claim ignored
        self._make_expense('Rejected', '300', '300', day=11)

        r = calc.compute_payroll(self.employee, JULY_2024, base_salary=23000)

        self.assertEqual(r['unpaidLeaveDays'], 5)
        self.assertEqual(r['unpaidLeaveDeduction'], Decimal('5000.00'))
        self.assertEqual(r['commissions'], Decimal('2500.00'))
        self.assertEqual(r['deductions'], Decimal('1000.00'))
        self.assertEqual(r['expenseReimbursements'], Decimal('800.00'))
        # 23000 - 5000 + 2500 - 1000 + 800
        self.assertEqual(r['netPay'], Decimal('20300.00'))

    def test_approved_without_approved_amount_contributes_zero(self):
        self._make_expense('Approved', '1000', None)
        r = calc.compute_payroll(self.employee, JULY_2024, base_salary=23000)
        self.assertEqual(r['expenseReimbursements'], Decimal('0.00'))


class RunCycleTests(TestCase):
    """Bulk payroll cycle: per-employee generation helper and eligibility."""

    def test_generate_for_employee_uses_breakdown(self):
        from employee_management.models import Employee
        from payroll.views import _generate_payroll_for_employee

        emp = Employee.objects.create(
            employeeID='EMP-RC1', fullName='Cycle One', monthlyIncome=23000)
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
