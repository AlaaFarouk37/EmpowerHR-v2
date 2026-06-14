from django.db import migrations


def delete_auto_absence_deductions(apps, schema_editor):
    """Absence deductions are no longer materialized as Deduction rows — they're
    computed at payroll-run time from the resolved no-show / unpaid-leave day
    count. Remove the legacy auto-created rows so they don't double-count."""
    Deduction = apps.get_model('payroll', 'Deduction')
    Deduction.objects.filter(description__contains='[auto-absence:').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0005_payrollrecord_createdby_payrollrecord_editreason_and_more'),
    ]

    operations = [
        migrations.RunPython(delete_auto_absence_deductions, migrations.RunPython.noop),
    ]
