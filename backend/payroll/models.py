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
    baseSalary  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    allowances  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bonus       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    netPay      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    paymentDate = models.DateField(null=True, blank=True)
    notes       = models.TextField(blank=True)
    createdAt   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'PayrollRecord'
        ordering = ['-payPeriod', '-createdAt']
        unique_together = ('employee', 'payPeriod')

    def __str__(self):
        return f"{self.employee.fullName} — {self.payPeriod}"
