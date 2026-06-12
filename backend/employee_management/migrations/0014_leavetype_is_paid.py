from django.db import migrations, models


def flag_unpaid_types(apps, schema_editor):
    """Existing seeded types default to paid; flag any 'unpaid' type as unpaid."""
    LeaveType = apps.get_model('employee_management', 'LeaveType')
    LeaveType.objects.filter(name__iexact='unpaid').update(is_paid=False)


class Migration(migrations.Migration):

    dependencies = [
        ('employee_management', '0013_supportticketmessage'),
        # Run after the leave-type seed so the seeded 'Unpaid' row gets flagged.
        ('Attendance_and_Leave', '0006_leaverequest_leavetype_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='leavetype',
            name='is_paid',
            field=models.BooleanField(
                default=True,
                help_text='Paid leave is capped (by entitlement / max days); unpaid '
                          'leave is uncapped and drives the unpaid-salary deduction.'),
        ),
        migrations.RunPython(flag_unpaid_types, migrations.RunPython.noop),
    ]
