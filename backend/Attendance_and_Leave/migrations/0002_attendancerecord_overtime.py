from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Attendance_and_Leave', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendancerecord',
            name='overtimeHours',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='overtimeStatus',
            field=models.CharField(
                choices=[
                    ('STANDARD', 'Standard'),
                    ('AUTO_APPROVED', 'Auto-Approved'),
                    ('PENDING_REVIEW', 'Pending Review'),
                ],
                default='STANDARD',
                max_length=20,
            ),
        ),
    ]
