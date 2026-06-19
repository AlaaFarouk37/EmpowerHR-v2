# Generated for EmployeeGoal.createdByRole

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employee_management', '0016_team_leader'),
    ]

    operations = [
        migrations.AddField(
            model_name='employeegoal',
            name='createdByRole',
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
