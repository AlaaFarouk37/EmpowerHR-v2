"""
seed_succession_demo.py
=======================
Seeds 6 talent-pool Submissions for testing the succession-matching feature:
  - 3 candidates for "Backend Engineer" (potential successors for EMP00007 Alaa Mohamed Farouk)
  - 3 candidates for "Data Engineer"

Run from the backend/ directory:
    python seed_succession_demo.py
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datetime import timedelta

from django.core.files.base import ContentFile
from django.utils import timezone

from resume_pipeline.models import Job, Submission


DEMO_TAG = '[succession-demo]'


def get_or_create_job(title, description, required_skills, min_exp, degree):
    job, created = Job.objects.get_or_create(
        title=title,
        defaults={
            'description': description,
            'required_skills': required_skills,
            'min_experience_years': min_exp,
            'required_degree': degree,
        },
    )
    if created:
        print(f'  + Created Job: {title} (id={job.id})')
    else:
        print(f'  • Found existing Job: {title} (id={job.id})')
    return job


def make_submission(job, *, name, email, ats, skills, exp, edu, sem,
                    candidate_skills, degree, years_exp, stage, submitted_days_ago, cv_text):
    existing = Submission.objects.filter(candidate_email=email, job=job).first()
    if existing:
        print(f'  • Skipped (already exists): {name} <{email}>')
        return existing

    resume_file = ContentFile(cv_text.encode('utf-8'), name=f'{name.replace(" ", "_").lower()}_cv.txt')

    sub = Submission.objects.create(
        job=job,
        candidate_name=name,
        candidate_email=email,
        resume_file=resume_file,
        status=Submission.Status.DONE,
        review_stage=stage,
        stage_notes=f'{DEMO_TAG} seeded for succession testing.',
        talent_pool=True,
        candidate_skills=candidate_skills,
        candidate_degree=degree,
        candidate_years_exp=years_exp,
        exp_extraction_method='seed',
        skills_score=skills,
        experience_score=exp,
        education_score=edu,
        semantic_score=sem,
        ats_score=ats,
        raw_text=cv_text,
    )
    sub.scored_at = timezone.now()
    sub.save(update_fields=['scored_at'])

    if submitted_days_ago:
        new_ts = timezone.now() - timedelta(days=submitted_days_ago)
        Submission.objects.filter(pk=sub.pk).update(submitted_at=new_ts, stage_updated_at=new_ts)

    print(f'  + Created Submission: {name} ats={ats} stage={stage} ({submitted_days_ago}d ago)')
    return sub


# ── Jobs ──────────────────────────────────────────────────────────────────────

print('\n=== Ensuring recruitment Jobs exist ===')

backend_job = get_or_create_job(
    title='Backend Engineer',
    description=(
        'We are hiring a Backend Engineer to design and build scalable Python/Django services, '
        'design REST APIs, work with PostgreSQL, and collaborate with frontend teams.'
    ),
    required_skills=['python', 'django', 'sql', 'rest api', 'docker'],
    min_exp=3,
    degree='Bachelor',
)

data_eng_job = get_or_create_job(
    title='Data Engineer',
    description=(
        'Seeking a Data Engineer to build ETL pipelines, manage data warehouses on AWS, '
        'write efficient SQL, and orchestrate workflows with Airflow.'
    ),
    required_skills=['python', 'sql', 'airflow', 'aws', 'etl', 'spark'],
    min_exp=3,
    degree='Bachelor',
)


# ── Candidates: Backend Engineer (succeed EMP00007 Alaa Mohamed Farouk) ──────

print('\n=== Seeding Backend Engineer candidates (succeed EMP00007 Alaa Mohamed Farouk) ===')

make_submission(
    backend_job,
    name='Omar Hassan',
    email='omar.hassan.succ@demo.test',
    ats=88.5, skills=92.0, exp=85.0, edu=100.0, sem=82.0,
    candidate_skills=['python', 'django', 'sql', 'rest api', 'docker', 'postgresql', 'redis'],
    degree='Bachelor',
    years_exp=5.5,
    stage='Shortlisted',
    submitted_days_ago=18,
    cv_text=(
        'Omar Hassan — Senior Backend Engineer\n\n'
        'EXPERIENCE\n'
        '- 5.5 years building backend services with Python and Django\n'
        '- 3 years owning REST APIs and PostgreSQL schemas\n'
        '- 2 years containerizing services with Docker and deploying to AWS\n\n'
        'SKILLS\n'
        'Python, Django, REST API design, PostgreSQL, SQL, Docker, Redis, Celery, Git\n\n'
        'EDUCATION\n'
        'Bachelor of Computer Science, Cairo University'
    ),
)

make_submission(
    backend_job,
    name='Nour El-Din Mostafa',
    email='nour.eldin.succ@demo.test',
    ats=82.0, skills=80.0, exp=90.0, edu=100.0, sem=78.0,
    candidate_skills=['python', 'django', 'sql', 'rest api', 'aws'],
    degree='Master',
    years_exp=7.0,
    stage='Interview',
    submitted_days_ago=45,
    cv_text=(
        'Nour El-Din Mostafa — Backend Engineer\n\n'
        'EXPERIENCE\n'
        '- 7 years in Python backend development\n'
        '- 4 years leading API design at a fintech startup\n'
        '- AWS Lambda, RDS, and S3 in production\n\n'
        'SKILLS\n'
        'Python, Django, Flask, REST API, SQL, AWS, PostgreSQL\n\n'
        'EDUCATION\n'
        'Master of Software Engineering, Ain Shams University'
    ),
)

make_submission(
    backend_job,
    name='Karim Adel',
    email='karim.adel.succ@demo.test',
    ats=74.5, skills=70.0, exp=80.0, edu=100.0, sem=72.0,
    candidate_skills=['python', 'django', 'sql', 'git'],
    degree='Bachelor',
    years_exp=4.0,
    stage='Applied',
    submitted_days_ago=120,
    cv_text=(
        'Karim Adel — Backend Developer\n\n'
        'EXPERIENCE\n'
        '- 4 years building web backends with Django and Flask\n'
        '- 2 years working with MySQL and PostgreSQL\n\n'
        'SKILLS\n'
        'Python, Django, Flask, SQL, MySQL, PostgreSQL, Git\n\n'
        'EDUCATION\n'
        'Bachelor of Computer Engineering, Helwan University'
    ),
)


# ── Candidates: Data Engineer ────────────────────────────────────────────────

print('\n=== Seeding Data Engineer candidates ===')

make_submission(
    data_eng_job,
    name='Mariam Saeed',
    email='mariam.saeed.succ@demo.test',
    ats=90.0, skills=95.0, exp=88.0, edu=100.0, sem=85.0,
    candidate_skills=['python', 'sql', 'airflow', 'aws', 'etl', 'spark', 'snowflake'],
    degree='Master',
    years_exp=6.0,
    stage='Shortlisted',
    submitted_days_ago=10,
    cv_text=(
        'Mariam Saeed — Senior Data Engineer\n\n'
        'EXPERIENCE\n'
        '- 6 years building ETL pipelines with Airflow and Spark\n'
        '- 4 years on AWS (S3, Glue, Redshift, EMR)\n'
        '- 3 years owning Snowflake data warehouse\n\n'
        'SKILLS\n'
        'Python, SQL, Airflow, Spark, AWS, ETL, Snowflake, dbt, Kafka\n\n'
        'EDUCATION\n'
        'Master of Data Science, AUC'
    ),
)

make_submission(
    data_eng_job,
    name='Yousef Tarek',
    email='yousef.tarek.succ@demo.test',
    ats=80.5, skills=82.0, exp=78.0, edu=100.0, sem=80.0,
    candidate_skills=['python', 'sql', 'airflow', 'etl', 'pandas'],
    degree='Bachelor',
    years_exp=4.5,
    stage='Interview',
    submitted_days_ago=60,
    cv_text=(
        'Yousef Tarek — Data Engineer\n\n'
        'EXPERIENCE\n'
        '- 4.5 years building ETL pipelines for analytics teams\n'
        '- 3 years writing complex SQL across BigQuery and PostgreSQL\n'
        '- Airflow DAG owner for a 200-job pipeline\n\n'
        'SKILLS\n'
        'Python, SQL, Airflow, ETL, Pandas, BigQuery, PostgreSQL\n\n'
        'EDUCATION\n'
        'Bachelor of Computer Science, Alexandria University'
    ),
)

make_submission(
    data_eng_job,
    name='Hana Mahmoud',
    email='hana.mahmoud.succ@demo.test',
    ats=72.5, skills=70.0, exp=75.0, edu=100.0, sem=72.0,
    candidate_skills=['python', 'sql', 'etl', 'pandas'],
    degree='Bachelor',
    years_exp=3.0,
    stage='Applied',
    submitted_days_ago=200,
    cv_text=(
        'Hana Mahmoud — Junior Data Engineer\n\n'
        'EXPERIENCE\n'
        '- 3 years in data engineering and analytics roles\n'
        '- 2 years writing SQL on PostgreSQL and MySQL\n'
        '- Built small ETL jobs in Python with Pandas\n\n'
        'SKILLS\n'
        'Python, SQL, ETL, Pandas, PostgreSQL, MySQL, Excel\n\n'
        'EDUCATION\n'
        'Bachelor of Information Systems, Mansoura University'
    ),
)


# ── Summary ──────────────────────────────────────────────────────────────────

print('\n=== Done ===')
backend_count = Submission.objects.filter(job=backend_job, talent_pool=True, status=Submission.Status.DONE).count()
data_count = Submission.objects.filter(job=data_eng_job, talent_pool=True, status=Submission.Status.DONE).count()
print(f'Talent-pool DONE submissions: Backend Engineer={backend_count}, Data Engineer={data_count}')
print('\nVerify in UI: open the Succession Planning page and click "Find successors" on Alaa Mohamed Farouk (EMP00007).')
