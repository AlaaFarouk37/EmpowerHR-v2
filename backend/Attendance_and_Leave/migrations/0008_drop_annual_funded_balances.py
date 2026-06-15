from django.db import migrations


def fold_into_annual(apps, schema_editor):
    """Casual (and any other ``deducts_from_annual`` type) no longer has its own
    balance — it draws from Annual. Move any recorded usedDays into the matching
    Annual balance, then drop the now-orphaned rows so they stop surfacing in the
    leave-balance views."""
    LeaveType = apps.get_model('employee_management', 'LeaveType')
    LeaveBalance = apps.get_model('Attendance_and_Leave', 'LeaveBalance')

    funded_names = {
        n.lower() for n in
        LeaveType.objects.filter(deducts_from_annual=True).values_list('name', flat=True)
    }
    if not funded_names:
        return

    for bal in LeaveBalance.objects.all():
        if bal.leaveTypeName.lower() not in funded_names:
            continue
        if bal.usedDays:
            annual, _ = LeaveBalance.objects.get_or_create(
                employee_id=bal.employee_id, leaveTypeName='Annual', year=bal.year,
                defaults={'usedDays': 0},
            )
            annual.usedDays = (annual.usedDays or 0) + bal.usedDays
            annual.save(update_fields=['usedDays'])
        bal.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('Attendance_and_Leave', '0007_leaverequest_document'),
        ('employee_management', '0015_leavetype_eligibility'),
    ]

    operations = [
        migrations.RunPython(fold_into_annual, migrations.RunPython.noop),
    ]
