from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employee_management', '0008_worktask_actualhours'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='contracted_hours_day',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Baseline work hours required per day (used for overtime calculation)',
                max_digits=4,
                null=True,
            ),
        ),
    ]
