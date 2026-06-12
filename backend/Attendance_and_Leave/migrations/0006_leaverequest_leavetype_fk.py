import django.db.models.deletion
from django.db import migrations, models


# Nominal seed caps. Annual's real cap comes from the Labor-Law entitlement
# function (this value is only a placeholder); Unpaid is uncapped (0). HR can
# edit any of these in the Leave Types admin UI.
SEED_LEAVE_TYPES = [
    ('Annual', 21),
    ('Sick', 90),
    ('Casual', 7),
    ('Unpaid', 0),
]


def seed_leave_types(apps, schema_editor):
    LeaveType = apps.get_model('employee_management', 'LeaveType')
    for name, max_days in SEED_LEAVE_TYPES:
        LeaveType.objects.get_or_create(
            name=name, defaults={'max_days_per_year': max_days})


def populate_fk(apps, schema_editor):
    LeaveRequest = apps.get_model('Attendance_and_Leave', 'LeaveRequest')
    LeaveType = apps.get_model('employee_management', 'LeaveType')
    by_name = {lt.name.lower(): lt for lt in LeaveType.objects.all()}
    for req in LeaveRequest.objects.all():
        lt = by_name.get((req.leaveType or '').strip().lower())
        if lt is None:
            lt, _ = LeaveType.objects.get_or_create(
                name=req.leaveType or 'Unpaid', defaults={'max_days_per_year': 0})
            by_name[lt.name.lower()] = lt
        req.leaveTypeRef = lt
        req.save(update_fields=['leaveTypeRef'])


def reverse_populate(apps, schema_editor):
    LeaveRequest = apps.get_model('Attendance_and_Leave', 'LeaveRequest')
    for req in LeaveRequest.objects.all():
        req.leaveType = req.leaveTypeRef.name if req.leaveTypeRef_id else 'Annual'
        req.save(update_fields=['leaveType'])


class Migration(migrations.Migration):

    dependencies = [
        ('employee_management', '0001_initial'),
        ('Attendance_and_Leave', '0005_holidayoverride_leavebalance'),
    ]

    operations = [
        migrations.RunPython(seed_leave_types, migrations.RunPython.noop),
        migrations.AddField(
            model_name='leaverequest',
            name='leaveTypeRef',
            field=models.ForeignKey(
                null=True, blank=True, db_column='leave_type_id',
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='leave_requests', to='employee_management.leavetype'),
        ),
        migrations.RunPython(populate_fk, reverse_populate),
        migrations.RemoveField(model_name='leaverequest', name='leaveType'),
        migrations.RenameField(
            model_name='leaverequest', old_name='leaveTypeRef', new_name='leaveType'),
        migrations.AlterField(
            model_name='leaverequest',
            name='leaveType',
            field=models.ForeignKey(
                db_column='leave_type_id',
                on_delete=django.db.models.deletion.PROTECT,
                related_name='leave_requests', to='employee_management.leavetype'),
        ),
    ]
