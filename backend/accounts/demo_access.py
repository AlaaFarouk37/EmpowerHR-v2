from .models import User

DEMO_PASSWORD = 'TestPass123!'

DEMO_ACCOUNTS = [
    {
        'email': 'admin@test.com',
        'full_name': 'EmpowerHR Admin',
        'role': 'Admin',
        'homePath': '/admin/dashboard',
        'jobTitle': 'Platform Administrator',
        'department': 'Administration',
        'team': 'Core Ops',
        'location': 'Cairo',
        'accessSummary': [
            'Full system access',
            'Manage users and permissions',
            'Open every HR and leadership workspace',
        ],
    },
    {
        'email': 'hr@test.com',
        'full_name': 'Hana HR Manager',
        'role': 'HRManager',
        'homePath': '/hr/dashboard',
        'jobTitle': 'HR Manager',
        'department': 'Human Resources',
        'team': 'People Ops',
        'location': 'Cairo',
        'accessSummary': [
            'HR dashboard and approvals',
            'Employees, payroll, benefits, and documents',
            'Hiring, training, and succession boards',
        ],
    },
    {
        'email': 'leader@test.com',
        'full_name': 'Layla Team Lead',
        'role': 'TeamLeader',
        'homePath': '/leader/team',
        'jobTitle': 'Team Leader',
        'department': 'Engineering',
        'team': 'Platform Squad',
        'location': 'Alexandria',
        'accessSummary': [
            'Team hub and recognition tools',
            'Assign goals and work tasks',
            'Use the employee workspace with leader permissions',
        ],
    },
    {
        'email': 'employee@test.com',
        'full_name': 'Omar Team Member',
        'role': 'TeamMember',
        'homePath': '/employee/dashboard',
        'jobTitle': 'Software Engineer',
        'department': 'Engineering',
        'team': 'Platform Squad',
        'location': 'Cairo',
        'accessSummary': [
            'Employee dashboard and profile',
            'Attendance, payroll, tasks, and goals',
            'Benefits, tickets, documents, and feedback forms',
        ],
    },
    {
        'email': 'candidate@test.com',
        'full_name': 'Nour Candidate',
        'role': 'Candidate',
        'homePath': '/candidate/dashboard',
        'accessSummary': [
            'Browse open jobs',
            'Submit and track applications',
            'Use the candidate-only portal',
        ],
    },
]


def ensure_demo_users():
    from employee_management.models import Employee, Job, Team, Department

    synced_users = []

    for spec in DEMO_ACCOUNTS:
        email = str(spec['email']).strip().lower()
        role = spec['role']
        expected_staff = role in {'HRManager', 'Admin'}

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User(
                email=email,
                full_name=spec['full_name'],
                role=role,
                is_staff=expected_staff,
                language_preference=User.LanguagePreference.EN,
                theme_preference=User.ThemePreference.COMFORT,
                focus_mode_preference=False,
            )
            user.set_password(DEMO_PASSWORD)
            user.save()
        else:
            changed = False
            if user.email != email:
                user.email = email
                changed = True
            if user.full_name != spec['full_name']:
                user.full_name = spec['full_name']
                changed = True
            if user.role != role:
                user.role = role
                changed = True
            if user.is_staff != expected_staff:
                user.is_staff = expected_staff
                changed = True
            if user.language_preference != User.LanguagePreference.EN:
                user.language_preference = User.LanguagePreference.EN
                changed = True
            if user.theme_preference != User.ThemePreference.COMFORT:
                user.theme_preference = User.ThemePreference.COMFORT
                changed = True
            if user.focus_mode_preference:
                user.focus_mode_preference = False
                changed = True
            if role != 'Candidate' and not user.employee:
                # Force save to create employee
                user.save()
                changed = True
            if role == 'Candidate' and user.employee is not None:
                # For candidates, we might need to handle this differently
                pass
            if not user.check_password(DEMO_PASSWORD):
                user.set_password(DEMO_PASSWORD)
                changed = True
            if changed:
                user.save()

        if role != 'Candidate':
            job = None
            job_title = spec.get('jobTitle', '')
            if job_title:
                job, _ = Job.objects.get_or_create(
                    title=job_title,
                    defaults={'base_salary': 0},
                )

            department = None
            department_name = (spec.get('department') or '').strip()
            if department_name:
                department, _ = Department.objects.get_or_create(name=department_name)

            team = None
            team_name = (spec.get('team') or '').strip()
            if team_name:
                team, _ = Team.objects.get_or_create(name=team_name)

            Employee.objects.update_or_create(
                employeeID=user.employee_id,
                defaults={
                    'fullName': spec['full_name'],
                    'job': job,
                    'department': department,
                    'team': team,
                    'employeeType': 'Full-time',
                    'location': spec.get('location', ''),
                    'employmentStatus': 'Active',
                    'yearsAtCompany': 2,
                    'monthlyIncome': 12000 if role == 'TeamMember' else 18000 if role == 'TeamLeader' else 22000,
                    'performanceRating': 4,
                    'numberOfPromotions': 1 if role in {'TeamLeader', 'HRManager', 'Admin'} else 0,
                },
            )

        synced_users.append(user)

    return synced_users


def build_demo_access_payload():
    return [
        {
            'email': spec['email'],
            'password': DEMO_PASSWORD,
            'role': spec['role'],
            'fullName': spec['full_name'],
            'homePath': spec['homePath'],
            'accessSummary': spec.get('accessSummary', []),
        }
        for spec in DEMO_ACCOUNTS
    ]
