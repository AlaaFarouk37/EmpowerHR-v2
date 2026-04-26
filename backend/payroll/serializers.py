from rest_framework import serializers
from employee_management.models import Employee
from .models import PayrollRecord
from accounts.models import User


class PayrollRecordSerializer(serializers.ModelSerializer):
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
    allowances = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    deductions = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    bonus = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    notes = serializers.CharField(required=False, allow_blank=True)


class PayrollMarkPaidSerializer(serializers.Serializer):
    paymentDate = serializers.DateField(required=False)