from rest_framework import serializers
from employee_management.models import Employee
from .models import PayrollRecord, Commission, Deduction
from accounts.models import User


class PayrollRecordSerializer(serializers.ModelSerializer):
    employeeID = serializers.CharField(source='employee.employeeID', read_only=True)
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)

    class Meta:
        model = PayrollRecord
        fields = '__all__'


class PayrollRecordCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    payPeriod = serializers.RegexField(regex=r'^\d{4}-\d{2}$', max_length=20)
    currency = serializers.ChoiceField(
        choices=[choice[0] for choice in User.CurrencyPreference.choices],
        required=False,
    )
    baseSalary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    # Commissions, manual deductions, unpaid-leave deduction and approved expense
    # reimbursements are all computed server-side (aggregated from their own
    # records), not passed in here.
    notes = serializers.CharField(required=False, allow_blank=True)


class PayrollMarkPaidSerializer(serializers.Serializer):
    paymentDate = serializers.DateField(required=False)


class PayrollRecordEditSerializer(serializers.Serializer):
    editReason = serializers.CharField()
    # Base salary is sourced from the employee profile and is intentionally not
    # editable here (prevents manual corruption of the prorated base).
    commissions = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    unpaidLeaveDeduction = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    deductions = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    expenseReimbursements = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    overtimePay = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_editReason(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('An edit reason is required.')
        return value.strip()


class CommissionSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)

    class Meta:
        model = Commission
        fields = '__all__'


class CommissionCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    payPeriod = serializers.RegexField(regex=r'^\d{4}-\d{2}$', max_length=20)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True)


class DeductionSerializer(serializers.ModelSerializer):
    employeeName = serializers.CharField(source='employee.fullName', read_only=True)

    class Meta:
        model = Deduction
        fields = '__all__'


class DeductionCreateSerializer(serializers.Serializer):
    employeeID = serializers.CharField(max_length=50)
    payPeriod = serializers.RegexField(regex=r'^\d{4}-\d{2}$', max_length=20)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True)