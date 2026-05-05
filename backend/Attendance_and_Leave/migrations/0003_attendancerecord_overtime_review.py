from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Attendance_and_Leave', '0002_attendancerecord_overtime'),
    ]

    operations = [
        migrations.AlterField(
            model_name='attendancerecord',
            name='overtimeStatus',
            field=models.CharField(
                choices=[
                    ('STANDARD', 'Standard'),
                    ('AUTO_APPROVED', 'Auto-Approved'),
                    ('PENDING_REVIEW', 'Pending Review'),
                    ('REJECTED', 'Rejected'),
                ],
                default='STANDARD',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='overtimeReviewedBy',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='overtimeReviewedAt',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='attendancerecord',
            name='overtimeReviewNote',
            field=models.TextField(blank=True),
        ),
    ]
