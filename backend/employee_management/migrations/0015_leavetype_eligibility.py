from django.db import migrations, models


# Canonical leave-type catalogue. Annual's real cap is the Labor-Law entitlement
# (max_days_per_year is only a placeholder for it); Casual draws from Annual;
# Maternity/Paternity are gender-restricted; Hajj is once per employment.
LEAVE_TYPE_SPEC = [
    # name,        max_days, is_paid, gender,   deducts_from_annual, once_per_employment
    ('Annual',     21,  True,  '',       False, False),
    ('Sick',       180, True,  '',       False, False),
    ('Casual',     7,   True,  '',       True,  False),
    ('Maternity',  120, True,  'Female', False, False),
    ('Paternity',  1,   True,  'Male',   False, False),
    ('Hajj',       30,  True,  '',       False, True),
    ('Unpaid',     0,   False, '',       False, False),
]


def seed_leave_types(apps, schema_editor):
    LeaveType = apps.get_model('employee_management', 'LeaveType')
    for name, max_days, is_paid, gender, deducts, once in LEAVE_TYPE_SPEC:
        LeaveType.objects.update_or_create(
            name=name,
            defaults={
                'max_days_per_year': max_days,
                'is_paid': is_paid,
                'restricted_to_gender': gender,
                'deducts_from_annual': deducts,
                'once_per_employment': once,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ('employee_management', '0014_leavetype_is_paid'),
    ]

    operations = [
        migrations.AddField(
            model_name='leavetype',
            name='restricted_to_gender',
            field=models.CharField(
                blank=True, max_length=10,
                choices=[('Male', 'Male'), ('Female', 'Female')],
                help_text="If set, only employees of this gender may take the leave "
                          "(e.g. Maternity -> Female, Paternity -> Male). Blank = anyone."),
        ),
        migrations.AddField(
            model_name='leavetype',
            name='deducts_from_annual',
            field=models.BooleanField(
                default=False,
                help_text="When true, requests draw down the employee's Annual balance "
                          "instead of having a separate balance (e.g. Casual leave)."),
        ),
        migrations.AddField(
            model_name='leavetype',
            name='once_per_employment',
            field=models.BooleanField(
                default=False,
                help_text="When true, the leave may be taken only once during the "
                          "employee's time at the company (e.g. Hajj)."),
        ),
        migrations.RunPython(seed_leave_types, migrations.RunPython.noop),
    ]
