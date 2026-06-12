from django.db import models
import uuid

def gen_id():
    return uuid.uuid4().hex[:20]

class PayrollRecord(models.Model):
    STATUS_DRAFT = 'Draft'
    STATUS_PAID = 'Paid'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PAID, 'Paid'),
    ]

    payrollID   = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee    = models.ForeignKey(
                      'employee_management.Employee', on_delete=models.CASCADE,
                      db_column='employeeID', related_name='payroll_records')
    payPeriod   = models.CharField(max_length=20)
    currency    = models.CharField(
                      max_length=3,
                      choices=[('EGP', 'Egyptian Pound'), ('USD', 'US Dollar')],
                      default='EGP')
    baseSalary  = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                      help_text="Full contractual monthly base salary (before proration).")
    allowances  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions  = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                      help_text="Manual HR-entered deductions (excludes unpaid-leave deduction).")
    bonus       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    netPay      = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ── Computed payroll breakdown (see payroll/calculations.py) ──────────
    proratedBaseSalary   = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                               help_text="Base salary after mid-month join/leave proration; used in net pay.")
    dailyRate            = models.DecimalField(max_digits=12, decimal_places=4, default=0,
                               help_text="Base salary / total weekdays in the month.")
    commissions          = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                               help_text="Sum of manual HR commission entries for this employee + pay period.")
    unpaidLeaveDeduction = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                               help_text="Daily rate × counted unpaid-leave weekdays within the employment window.")
    expenseReimbursements= models.DecimalField(max_digits=10, decimal_places=2, default=0,
                               help_text="Sum of approvedAmount for HR-approved expense claims in the pay period.")
    hourlyRate           = models.DecimalField(max_digits=12, decimal_places=4, default=0,
                               help_text="Regular hourly rate = daily rate / contracted hours per day.")
    overtimeHours        = models.DecimalField(max_digits=8, decimal_places=2, default=0,
                               help_text="Approved overtime hours in the pay period.")
    overtimePay          = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                               help_text="Overtime pay = approved overtime hours × hourly rate × 1.5.")
    workingDays          = models.PositiveIntegerField(default=0,
                               help_text="Weekdays (Mon-Fri) in the pay-period month.")
    weekdaysEmployed     = models.PositiveIntegerField(default=0,
                               help_text="Weekdays in the month falling within the employment window.")
    unpaidLeaveDays      = models.PositiveIntegerField(default=0,
                               help_text="Counted unpaid-leave weekdays within the employment window.")
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    paymentDate = models.DateField(null=True, blank=True)
    notes       = models.TextField(blank=True)
    createdAt   = models.DateTimeField(auto_now_add=True)
    createdBy   = models.CharField(max_length=150, blank=True,
                      help_text="Who generated this payroll record.")
    editedAt    = models.DateTimeField(null=True, blank=True,
                      help_text="When an HR user last manually edited this record.")
    editedBy    = models.CharField(max_length=150, blank=True,
                      help_text="Who last manually edited this record.")
    editReason  = models.TextField(blank=True,
                      help_text="Note explaining the most recent manual edit.")

    class Meta:
        db_table = 'PayrollRecord'
        ordering = ['-payPeriod', '-createdAt']
        unique_together = ('employee', 'payPeriod')

    def __str__(self):
        return f"{self.employee.fullName} — {self.payPeriod}"


class Commission(models.Model):
    """A manual HR-entered commission line item for one employee in one pay
    period. Payroll sums all rows for an (employee, payPeriod) when computing
    net pay; there is no auto-calculation from other data."""

    commissionID = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee     = models.ForeignKey(
                       'employee_management.Employee', on_delete=models.CASCADE,
                       db_column='employeeID', related_name='commissions')
    payPeriod    = models.CharField(max_length=20, help_text="Pay period in 'YYYY-MM' format.")
    amount       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description  = models.CharField(max_length=255, blank=True,
                       help_text="HR note explaining why this commission was awarded.")
    createdBy    = models.CharField(max_length=150, blank=True)
    createdAt    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Commission'
        ordering = ['-payPeriod', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.payPeriod} ({self.amount})"


class Deduction(models.Model):
    """A manual HR-entered deduction line item for one employee in one pay
    period. Payroll sums all rows for an (employee, payPeriod) when computing
    net pay; this is separate from the auto-computed unpaid-leave deduction."""

    deductionID  = models.CharField(max_length=50, primary_key=True, default=gen_id)
    employee     = models.ForeignKey(
                       'employee_management.Employee', on_delete=models.CASCADE,
                       db_column='employeeID', related_name='manual_deductions')
    payPeriod    = models.CharField(max_length=20, help_text="Pay period in 'YYYY-MM' format.")
    amount       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description  = models.CharField(max_length=255, blank=True,
                       help_text="HR note explaining why this deduction was applied.")
    createdBy    = models.CharField(max_length=150, blank=True)
    createdAt    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Deduction'
        ordering = ['-payPeriod', '-createdAt']

    def __str__(self):
        return f"{self.employee.fullName} — {self.payPeriod} ({self.amount})"
