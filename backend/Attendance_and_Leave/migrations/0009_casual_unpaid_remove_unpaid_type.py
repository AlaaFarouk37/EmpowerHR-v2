from django.db import migrations


def casual_becomes_the_unpaid_type(apps, schema_editor):
    """Casual is the unpaid leave: it draws from the Annual balance and is unpaid
    (no pay for those days), unlike approved Annual leave which is paid. The old
    uncapped standalone 'Unpaid' type is retired — any request/balance on it moves
    to Casual."""
    LeaveType = apps.get_model('employee_management', 'LeaveType')
    LeaveRequest = apps.get_model('Attendance_and_Leave', 'LeaveRequest')
    LeaveBalance = apps.get_model('Attendance_and_Leave', 'LeaveBalance')

    casual = LeaveType.objects.filter(name__iexact='Casual').first()
    if casual:
        casual.is_paid = False
        casual.deducts_from_annual = True
        casual.save(update_fields=['is_paid', 'deducts_from_annual'])

    unpaid = LeaveType.objects.filter(name__iexact='Unpaid').first()
    if not unpaid:
        return

    if casual:
        LeaveRequest.objects.filter(leaveType=unpaid).update(leaveType=casual)
    LeaveBalance.objects.filter(leaveTypeName__iexact='Unpaid').delete()
    # Safe to delete now that nothing references it (FK was PROTECT).
    if not LeaveRequest.objects.filter(leaveType=unpaid).exists():
        unpaid.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('Attendance_and_Leave', '0008_drop_annual_funded_balances'),
        ('employee_management', '0015_leavetype_eligibility'),
    ]

    operations = [
        migrations.RunPython(casual_becomes_the_unpaid_type, migrations.RunPython.noop),
    ]
