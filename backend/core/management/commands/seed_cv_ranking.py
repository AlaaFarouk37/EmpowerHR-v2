"""
seed_cv_ranking — Django management command.
Clears resume_pipeline data and seeds 5 realistic job postings
plus 17+ scored CV submissions so the CV Ranking page has test data.

    python manage.py seed_cv_ranking
"""
import random
import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from resume_pipeline.models import Job, Submission


JOBS = [
    {
        "title": "Senior Backend Engineer",
        "level": "Senior",
        "description": (
            "We are looking for a Senior Backend Engineer to design, build and maintain "
            "high-performance REST APIs and microservices. You will work with Python, Django, "
            "PostgreSQL, Redis, Docker and Kubernetes. Experience with cloud platforms (AWS/GCP) "
            "and CI/CD pipelines is required. You will mentor junior engineers and lead technical "
            "design discussions."
        ),
        "required_skills": ["Python", "Django", "PostgreSQL", "Redis", "Docker", "Kubernetes",
                             "REST API", "CI/CD", "AWS", "Microservices"],
        "min_experience_years": 5,
        "required_degree": "Bachelor",
        "weight_skills": 0.40,
        "weight_experience": 0.30,
        "weight_education": 0.10,
        "weight_semantic": 0.20,
    },
    {
        "title": "Frontend React Developer",
        "level": "Mid",
        "description": (
            "Join our product team to build stunning, responsive user interfaces using React, "
            "TypeScript and Next.js. You will collaborate closely with UX designers to translate "
            "Figma designs into pixel-perfect components, optimise performance and write "
            "comprehensive unit and integration tests. Familiarity with GraphQL and REST APIs is a plus."
        ),
        "required_skills": ["React", "TypeScript", "Next.js", "CSS", "HTML", "GraphQL",
                             "Jest", "Figma", "REST API", "Git"],
        "min_experience_years": 3,
        "required_degree": "Bachelor",
        "weight_skills": 0.45,
        "weight_experience": 0.25,
        "weight_education": 0.10,
        "weight_semantic": 0.20,
    },
    {
        "title": "Data Scientist",
        "level": "Senior",
        "description": (
            "We need a Data Scientist to develop predictive models, run A/B tests and extract "
            "insights from large datasets. You will use Python, scikit-learn, TensorFlow and SQL "
            "to build and deploy ML models. Experience with MLOps, model monitoring and data "
            "pipelines (Airflow / Spark) is highly desirable."
        ),
        "required_skills": ["Python", "Machine Learning", "scikit-learn", "TensorFlow",
                             "SQL", "Pandas", "Statistics", "MLOps", "Airflow", "Data Visualization"],
        "min_experience_years": 4,
        "required_degree": "Master",
        "weight_skills": 0.35,
        "weight_experience": 0.30,
        "weight_education": 0.15,
        "weight_semantic": 0.20,
    },
    {
        "title": "DevOps / Cloud Engineer",
        "level": "Mid",
        "description": (
            "Help us scale our cloud infrastructure on AWS. You will manage Kubernetes clusters, "
            "write Terraform modules, build CI/CD pipelines with GitHub Actions, and implement "
            "monitoring with Prometheus and Grafana. Strong Linux and scripting skills required."
        ),
        "required_skills": ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD",
                             "Linux", "Python", "Prometheus", "Grafana", "GitHub Actions"],
        "min_experience_years": 3,
        "required_degree": "Bachelor",
        "weight_skills": 0.40,
        "weight_experience": 0.35,
        "weight_education": 0.05,
        "weight_semantic": 0.20,
    },
    {
        "title": "HR Business Partner",
        "level": "Senior",
        "description": (
            "Partner with business leaders to drive people strategy, talent acquisition, employee "
            "engagement and performance management. You will manage end-to-end recruitment, run "
            "competency-based interviews, oversee onboarding and design L&D programmes. "
            "CIPD qualification or equivalent preferred."
        ),
        "required_skills": ["Recruitment", "Talent Acquisition", "Employee Engagement",
                             "Performance Management", "Onboarding", "L&D",
                             "HRIS", "Communication", "Leadership", "Employment Law"],
        "min_experience_years": 6,
        "required_degree": "Bachelor",
        "weight_skills": 0.35,
        "weight_experience": 0.35,
        "weight_education": 0.10,
        "weight_semantic": 0.20,
    },
]

# (name, email, degree, years_exp, skills, resume_text)
CANDIDATES = [
    ("Amr Khalil", "amr.khalil@gmail.com", "Master", 7,
     ["Python", "Django", "PostgreSQL", "Redis", "Docker", "AWS", "REST API", "CI/CD", "Kubernetes", "Microservices"],
     "Senior backend developer with 7 years building Python/Django REST APIs deployed on AWS EKS. "
     "Led migration from monolith to microservices architecture. Built CI/CD pipelines with GitHub Actions. "
     "Experienced with Redis caching and PostgreSQL query optimisation. Mentored 4 junior engineers."),

    ("Sara El-Masry", "sara.masry@outlook.com", "Bachelor", 5,
     ["Python", "Django", "PostgreSQL", "Docker", "REST API", "AWS", "CI/CD", "Redis"],
     "Backend engineer with 5 years experience in Python and Django. Developed and maintained "
     "REST APIs serving 2M daily requests. Implemented Docker-based deployment workflows. "
     "Worked with PostgreSQL and Redis for high-availability caching."),

    ("Youssef Nabil", "y.nabil@dev.io", "Bachelor", 3,
     ["Python", "Django", "PostgreSQL", "Docker", "REST API"],
     "Three years as a backend developer primarily with Python/Django. Built REST APIs for e-commerce "
     "and fintech projects. Used Docker for local development. Currently learning Kubernetes and AWS."),

    ("Nourhan Gamal", "nourhan.g@techco.com", "PhD", 9,
     ["Python", "Django", "PostgreSQL", "Redis", "Docker", "Kubernetes", "AWS", "Microservices", "REST API", "CI/CD"],
     "Principal software architect with 9 years designing distributed systems. Led microservices platform "
     "processing 10M events per day. Deep expertise in Python, Django, Kubernetes and AWS."),

    ("Karim Diab", "karim.d@freelance.com", "Associate", 2,
     ["Python", "REST API", "Docker"],
     "Junior backend developer with 2 years freelance experience. Built REST APIs in Python/Flask. "
     "Uses Docker for containerisation. Learning Django and PostgreSQL."),

    ("Mona Hassan", "mona.h@uxstudio.io", "Bachelor", 4,
     ["React", "TypeScript", "Next.js", "CSS", "HTML", "Jest", "Figma", "Git", "REST API"],
     "Frontend developer with 4 years building React applications. Delivered a Next.js platform "
     "with 500K monthly users. Expert in TypeScript, CSS-in-JS and responsive design."),

    ("Hana Sabry", "hana.s@webworks.eg", "Bachelor", 6,
     ["React", "TypeScript", "Next.js", "GraphQL", "CSS", "HTML", "Jest", "Figma", "REST API", "Git"],
     "Senior frontend engineer with 6 years. Led frontend architecture for a SaaS dashboard used by 50K businesses. "
     "Expert in React, TypeScript and Next.js. Designed component libraries and design systems."),

    ("Tarek Sami", "tarek.sami@react.dev", "High School", 2,
     ["React", "CSS", "HTML", "JavaScript", "Git"],
     "Self-taught developer with 2 years building React websites. Learning TypeScript and Next.js. "
     "Completed 3 online bootcamps. Fast learner with strong motivation."),

    ("Layla Mostafa", "layla.m@datascience.ai", "PhD", 8,
     ["Python", "Machine Learning", "scikit-learn", "TensorFlow", "SQL", "Pandas", "Statistics", "MLOps", "Airflow", "Data Visualization"],
     "Lead data scientist with 8 years and a PhD in applied statistics. Developed churn prediction "
     "model improving retention by 18%. Built ML pipelines with Airflow and MLflow."),

    ("Ahmed Fawzy", "ahmed.fawzy@ml.eg", "Master", 5,
     ["Python", "Machine Learning", "scikit-learn", "SQL", "Pandas", "Statistics", "Data Visualization"],
     "Data scientist with 5 years in predictive analytics and A/B testing. "
     "Developed customer segmentation models using scikit-learn. Created Tableau dashboards."),

    ("Rana Adel", "rana.adel@analytics.co", "Bachelor", 2,
     ["Python", "SQL", "Pandas", "Statistics"],
     "Junior analyst with 2 years in data analysis using Python and SQL. "
     "Learning machine learning through online courses."),

    ("Omar Hisham", "omar.h@cloud.ops", "Bachelor", 4,
     ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD", "Linux", "Python", "Prometheus", "Grafana", "GitHub Actions"],
     "DevOps engineer with 4 years managing cloud infrastructure on AWS. Deployed Kubernetes clusters using EKS. "
     "Wrote Terraform modules. Built CI/CD pipelines with GitHub Actions."),

    ("Dina Ramzy", "dina.r@infra.io", "Bachelor", 6,
     ["AWS", "Kubernetes", "Terraform", "Docker", "CI/CD", "Linux", "Python", "Prometheus", "Grafana", "GitHub Actions"],
     "Senior cloud engineer with 6 years. Architected multi-region AWS setup achieving 99.99% uptime. "
     "Led Kubernetes migration for 40+ microservices. AWS Solutions Architect Professional."),

    ("Sherif Galal", "sherif.g@sysadmin.net", "Associate", 3,
     ["Linux", "Docker", "AWS", "CI/CD", "Python"],
     "Systems administrator transitioning to DevOps. 3 years Linux administration. "
     "Learning Kubernetes and Terraform."),

    ("Yasmine Khalaf", "yas.khalaf@hrpro.co", "Master", 8,
     ["Recruitment", "Talent Acquisition", "Employee Engagement", "Performance Management",
      "Onboarding", "L&D", "HRIS", "Communication", "Leadership", "Employment Law"],
     "Senior HRBP with 8 years partnering with tech and sales leadership. "
     "Led talent acquisition reducing time-to-hire by 30%. CIPD Level 7 qualified."),

    ("Heba Nasser", "heba.n@people.eg", "Bachelor", 5,
     ["Recruitment", "Employee Engagement", "Performance Management", "Onboarding", "Communication", "HRIS"],
     "HR professional with 5 years in generalist roles. Managed full-cycle recruitment for 50+ roles. "
     "Designed onboarding journey reducing 90-day attrition by 15%."),

    ("Mariam Saad", "mariam.s@recruit.net", "Bachelor", 2,
     ["Recruitment", "Talent Acquisition", "Communication"],
     "HR coordinator with 2 years in recruitment. Sourced candidates via LinkedIn and job boards. "
     "Eager to grow into an HRBP role."),
]

# candidate_idx → list of job indices they apply to
CANDIDATE_JOB_MAP = {
    0: [0, 1, 2],  # Amr applies to Backend, Frontend, DS (versatile)
    1: [0], 2: [0], 3: [0], 4: [0],
    5: [1], 6: [1], 7: [1],
    8: [2], 9: [2], 10: [2],
    11: [3], 12: [3], 13: [3],
    14: [4], 15: [4], 16: [4],
}

STAGES = ["Applied", "Shortlisted", "Interview", "Applied", "Applied",
          "Shortlisted", "Rejected", "Applied", "Applied", "Shortlisted",
          "Interview", "Applied", "Shortlisted", "Applied", "Applied",
          "Shortlisted", "Applied"]

DEGREE_SCORE = {
    "Unknown": 0, "High School": 30, "Associate": 50,
    "Bachelor": 75, "Master": 90, "PhD": 100,
}


class Command(BaseCommand):
    help = "Seed resume_pipeline Jobs and Submissions for CV Ranking page testing."

    def handle(self, *args, **options):
        random.seed(42)
        now = timezone.now()

        # ── 1. Wipe ──────────────────────────────────────────────────────
        Submission.objects.all().delete()
        Job.objects.all().delete()
        self.stdout.write("Existing resume_pipeline data cleared.")

        # ── 2. Create jobs ───────────────────────────────────────────────
        jobs = []
        for jd in JOBS:
            j = Job.objects.create(
                title=jd["title"],
                level=jd["level"],
                description=jd["description"],
                required_skills=jd["required_skills"],
                min_experience_years=jd["min_experience_years"],
                required_degree=jd["required_degree"],
                weight_skills=jd["weight_skills"],
                weight_experience=jd["weight_experience"],
                weight_education=jd["weight_education"],
                weight_semantic=jd["weight_semantic"],
                vacancies=random.randint(1, 3),
                is_active=True,
            )
            jobs.append(j)
            self.stdout.write(f"  Created job: {j.title} (id={j.id})")

        self.stdout.write(f"\n{len(jobs)} jobs created.\n")

        # ── 3. Create submissions ────────────────────────────────────────
        subs_created = 0

        for cand_idx, (name, email, degree, years_exp, skills, resume_text) in enumerate(CANDIDATES):
            job_indices = CANDIDATE_JOB_MAP.get(cand_idx, [cand_idx % len(jobs)])
            stage = STAGES[cand_idx % len(STAGES)]

            for job_idx in job_indices:
                job = jobs[job_idx]
                req = set(s.lower() for s in job.required_skills)
                cand_set = set(s.lower() for s in skills)
                matched = req & cand_set
                missing = req - cand_set
                skill_pct = round((len(matched) / len(req)) * 100, 1) if req else 0.0

                exp_score = min(100, (years_exp / max(job.min_experience_years, 1)) * 80 + random.uniform(5, 15))
                edu_score = DEGREE_SCORE.get(degree, 60)
                semantic_score = round(skill_pct * 0.6 + exp_score * 0.4 + random.uniform(-8, 8), 1)

                ats_score = round(
                    skill_pct * job.weight_skills
                    + min(100, exp_score) * job.weight_experience
                    + edu_score * job.weight_education
                    + semantic_score * job.weight_semantic,
                    1,
                )
                ats_score = max(0.0, min(100.0, ats_score))

                ranking_result = {
                    "submission_id": None,
                    "candidate_name": name,
                    "candidate_email": email,
                    "candidate_degree": degree,
                    "candidate_years_exp": years_exp,
                    "final_score": ats_score,
                    "ats_score": ats_score,
                    "skill_match_pct": skill_pct,
                    "experience_fit_pct": round(min(100, exp_score), 1),
                    "education_fit": edu_score,
                    "semantic_score": semantic_score,
                    "matched_skills": sorted(s.title() for s in matched),
                    "missing_skills": sorted(s.title() for s in missing),
                    "extra_skills": [],
                    "required_skills": list(job.required_skills),
                    "candidate_skills": skills,
                    "semantic_analysis": (
                        f"{name} demonstrates "
                        f"{'strong' if skill_pct >= 70 else 'moderate' if skill_pct >= 45 else 'partial'} "
                        f"alignment with the {job.title} role. "
                        f"With {years_exp} years of experience and a {degree} degree, this candidate covers "
                        f"{len(matched)}/{len(req)} required skills. "
                        f"{'Recommended for shortlisting.' if ats_score >= 70 else 'May benefit from a screening call.' if ats_score >= 50 else 'Significant skill gaps identified.'}"
                    ),
                    "decision_factors": {
                        "strengths": [
                            f"Covers {len(matched)} of {len(req)} required skills",
                            f"{years_exp} years of relevant experience",
                            f"{degree} qualification",
                        ] if ats_score >= 60 else [f"{years_exp} years of experience"],
                        "watchouts": (
                            [f"Missing: {', '.join(sorted(missing)[:3])}"] if missing else ["No significant gaps"]
                        ) + (["Below minimum seniority"] if years_exp < job.min_experience_years else []),
                    },
                    "score_breakdown": {
                        "semantic_alignment": semantic_score,
                        "skill_coverage": skill_pct,
                        "experience_fit": round(min(100, exp_score), 1),
                        "education_fit": edu_score,
                        "concept_coverage": round(skill_pct * 0.85, 1),
                        "job_weighted_fit": ats_score,
                        "insight_blend_fit": round(ats_score * 0.95 + random.uniform(-2, 2), 1),
                        "historical_strength": round(random.uniform(40, 85), 1),
                        "lexical_alignment": round(skill_pct * 0.7, 1),
                    },
                    "confidence_score": round(70 + (skill_pct / 100) * 25 + random.uniform(-5, 5), 1),
                    "historical_strength_score": round(random.uniform(40, 85), 1),
                    "evidence": [
                        f"Candidate listed {len(matched)} matching skills from job requirements.",
                        f"Resume confirms {years_exp} years of professional experience.",
                        f"{degree} degree verified from resume.",
                    ],
                    "profile_meta": {
                        "seniority_tier": (
                            "Expert / Lead" if years_exp >= 8 else
                            "Senior" if years_exp >= 4 else
                            "Mid" if years_exp >= 2 else "Junior"
                        ),
                        "industry_focus": random.choice(["Cloud/SaaS", "FinTech", "Data/AI", "Generalist", "E-commerce"]),
                        "fraud_detection": {
                            "is_padding_risk": skill_pct > 90 and years_exp < 2,
                            "context_free_skills": [],
                            "padding_ratio": 0.0 if years_exp >= 2 else round(random.uniform(0, 0.3), 2),
                        },
                    },
                    "cultural_traits": {
                        "ambition": min(95, 55 + years_exp * 3 + random.randint(-5, 10)),
                        "teamwork": min(95, 60 + random.randint(0, 25)),
                        "analytical": min(95, 55 + len(matched) * 3 + random.randint(-5, 10)),
                    },
                    "adaptive_weights": {
                        "semantic": job.weight_semantic,
                        "tfidf": 0.15,
                        "skills": job.weight_skills,
                    },
                    "job_weights": {
                        "skills": job.weight_skills,
                        "experience": job.weight_experience,
                        "education": job.weight_education,
                        "semantic": job.weight_semantic,
                    },
                    "score_contributions": {
                        "skills": round(skill_pct * job.weight_skills, 2),
                        "experience": round(min(100, exp_score) * job.weight_experience, 2),
                        "education": round(edu_score * job.weight_education, 2),
                        "semantic": round(semantic_score * job.weight_semantic, 2),
                    },
                }

                days_ago = random.randint(1, 45)
                sub = Submission.objects.create(
                    job=job,
                    candidate_name=name,
                    candidate_email=email,
                    candidate_degree=degree,
                    candidate_years_exp=years_exp,
                    candidate_skills=skills,
                    raw_text=resume_text,
                    status=Submission.Status.DONE,
                    review_stage=stage,
                    skills_score=skill_pct,
                    experience_score=round(min(100, exp_score), 1),
                    education_score=edu_score,
                    semantic_score=semantic_score,
                    ats_score=ats_score,
                    ranking_result=ranking_result,
                    talent_pool=ats_score >= 60,
                    scored_at=now - datetime.timedelta(days=days_ago - 1),
                )
                # Backfill the real submission id
                ranking_result["submission_id"] = sub.id
                Submission.objects.filter(pk=sub.id).update(ranking_result=ranking_result)

                subs_created += 1

        self.stdout.write(f"[DONE] {subs_created} submissions created across {len(jobs)} jobs.\n")
        self.stdout.write("Job summary:")
        for j in jobs:
            count = Submission.objects.filter(job=j).count()
            self.stdout.write(f"  [{j.id}] {j.title} -> {count} applicants")

        self.stdout.write(self.style.SUCCESS("CV Ranking seed complete! Open the CV Ranking page and select a job to test."))
