from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from attrition.models import AttritionPrediction
from employee_management.models import Employee
from employee_management.models import Job as EmploymentJob
from resume_pipeline.models import Job, Submission


class SuccessionMatchingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hr_user = User.objects.create_user(
            email='succession.matching.hr@test.com',
            password='TestPass123!',
            full_name='Succession Matching HR',
            role='HRManager',
        )
        self.client.force_authenticate(user=self.hr_user)

        self.position = EmploymentJob.objects.create(title='Backend Engineer', base_salary=12000)
        self.other_position = EmploymentJob.objects.create(title='Data Analyst', base_salary=10000)

        self.at_risk = Employee.objects.create(
            employeeID='EMP66002',
            fullName='Atta Risky',
            job=self.position,
            employmentStatus='Active',
        )
        self.low_risk = Employee.objects.create(
            employeeID='EMP66003',
            fullName='Stable Steve',
            job=self.other_position,
            employmentStatus='Active',
        )
        self.medium_risk = Employee.objects.create(
            employeeID='EMP66004',
            fullName='Middling Maya',
            job=self.other_position,
            employmentStatus='Active',
        )

        AttritionPrediction.objects.create(employeeID=self.at_risk, riskScore=0.88, riskLevel='High')
        AttritionPrediction.objects.create(employeeID=self.low_risk, riskScore=0.20, riskLevel='Low')
        AttritionPrediction.objects.create(employeeID=self.medium_risk, riskScore=0.55, riskLevel='Medium')

        self.recruitment_job = Job.objects.create(
            title='Backend Engineer',
            description='Python and Django backend role.',
            required_skills=['python', 'django'],
            min_experience_years=3,
            required_degree='Bachelor',
        )
        self.other_recruitment_job = Job.objects.create(
            title='Frontend Engineer',
            description='React role.',
            required_skills=['react'],
        )

    def _make_submission(self, *, name, ats, stage='Shortlisted', talent_pool=True,
                         status=Submission.Status.DONE, job=None, submitted_days_ago=10,
                         exclude_from_pool=False):
        target_job = job or self.recruitment_job
        sub = Submission.objects.create(
            job=target_job,
            candidate_name=name,
            candidate_email=f'{name.lower().replace(" ", ".")}@test.com',
            resume_file=SimpleUploadedFile(f'{name}.txt', b'Python Django backend profile', content_type='text/plain'),
            review_stage=stage,
            talent_pool=False if exclude_from_pool else talent_pool,
            status=status,
            ats_score=ats,
            skills_score=ats,
            experience_score=ats,
            education_score=ats,
            semantic_score=ats,
        )
        if submitted_days_ago:
            Submission.objects.filter(pk=sub.pk).update(
                submitted_at=timezone.now() - timedelta(days=submitted_days_ago),
            )
            sub.refresh_from_db()
        return sub

    def test_at_risk_endpoint_returns_employees_above_threshold_in_desc_order(self):
        response = self.client.get(reverse('succession-at-risk'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['threshold'], 70.0)
        ids = [row['employeeID'] for row in response.data['results']]
        self.assertEqual(ids, ['EMP66002'])
        self.assertEqual(response.data['results'][0]['riskScorePct'], 88.0)

        response = self.client.get(reverse('succession-at-risk'), {'threshold': 30})
        self.assertEqual(response.status_code, 200)
        ids = [row['employeeID'] for row in response.data['results']]
        self.assertEqual(ids, ['EMP66002', 'EMP66004'])

    def test_successors_endpoint_applies_defaults_for_at_risk_employee(self):
        good = self._make_submission(name='Top Successor', ats=85, stage='Shortlisted')
        self._make_submission(name='Weak Successor', ats=55, stage='Shortlisted')
        self._make_submission(name='Opted Out', ats=90, stage='Shortlisted', exclude_from_pool=True)
        self._make_submission(name='Still Processing', ats=95, stage='Shortlisted', status=Submission.Status.PROCESSING)
        self._make_submission(name='Already Hired', ats=92, stage='Hired')
        self._make_submission(name='Wrong Role', ats=95, stage='Shortlisted', job=self.other_recruitment_job)
        self._make_submission(name='Stale Candidate', ats=88, stage='Shortlisted', submitted_days_ago=400)

        response = self.client.get(
            reverse('succession-successors', kwargs={'employee_id': self.at_risk.employeeID})
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['employee']['employeeID'], 'EMP66002')
        self.assertEqual(response.data['filters_applied']['job_title'], 'Backend Engineer')
        self.assertEqual(response.data['filters_applied']['min_ats_score'], 70.0)
        self.assertEqual(response.data['filters_applied']['recency_days'], 365)
        self.assertEqual(response.data['filters_applied']['limit'], 10)

        names = [row['candidate_name'] for row in response.data['results']]
        self.assertEqual(names, ['Top Successor'])
        self.assertEqual(response.data['results'][0]['submission_id'], good.pk)
        self.assertEqual(response.data['results'][0]['job']['title'], 'Backend Engineer')
        self.assertTrue(response.data['results'][0]['freshness_label'])

    def test_successors_endpoint_honors_filter_overrides(self):
        self._make_submission(name='Stale Strong', ats=92, stage='Interview', submitted_days_ago=500)
        self._make_submission(name='Fresh Applied', ats=82, stage='Applied', submitted_days_ago=10)
        self._make_submission(name='Fresh Shortlisted', ats=78, stage='Shortlisted', submitted_days_ago=20)

        response = self.client.get(
            reverse('succession-successors', kwargs={'employee_id': self.at_risk.employeeID}),
            {
                'min_ats_score': 50,
                'recency_disabled': 'true',
                'review_stages': 'Interview,Applied',
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['filters_applied']['recency_days'])
        self.assertTrue(response.data['filters_applied']['recency_disabled'])
        self.assertEqual(sorted(response.data['filters_applied']['review_stages']), ['Applied', 'Interview'])

        names = [row['candidate_name'] for row in response.data['results']]
        self.assertEqual(names, ['Stale Strong', 'Fresh Applied'])

    def test_successors_endpoint_returns_404_for_unknown_employee(self):
        response = self.client.get(
            reverse('succession-successors', kwargs={'employee_id': 'EMP99999'})
        )
        self.assertEqual(response.status_code, 404)

    def test_successors_endpoint_honors_optional_level_filter(self):
        senior_position = EmploymentJob.objects.create(title='Backend Engineer', level='Senior', base_salary=18000)
        EmploymentJob.objects.create(title='Backend Engineer', level='Junior', base_salary=8000)
        senior_job = Job.objects.create(
            title='Backend Engineer',
            level='Senior',
            description='Senior backend role.',
            required_skills=['python'],
        )
        junior_job = Job.objects.create(
            title='Backend Engineer',
            level='Junior',
            description='Junior backend role.',
            required_skills=['python'],
        )
        self._make_submission(name='Senior Match', ats=88, stage='Shortlisted', job=senior_job)
        self._make_submission(name='Junior Match', ats=82, stage='Shortlisted', job=junior_job)

        response = self.client.get(
            reverse('succession-successors', kwargs={'employee_id': self.at_risk.employeeID}),
            {'level': 'Senior'},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['filters_applied']['level'], 'Senior')
        names = [row['candidate_name'] for row in response.data['results']]
        self.assertEqual(names, ['Senior Match'])


class JobPostingCatalogValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.hr_user = User.objects.create_user(
            email='posting.hr@test.com',
            password='TestPass123!',
            full_name='Posting HR',
            role='HRManager',
        )
        self.client.force_authenticate(user=self.hr_user)
        EmploymentJob.objects.create(title='Backend Engineer', level='Senior', base_salary=18000)
        EmploymentJob.objects.create(title='Backend Engineer', level=None, base_salary=15000)

    def _payload(self, **overrides):
        base = {
            'title': 'Backend Engineer',
            'level': 'Senior',
            'description': 'Python and Django backend role.',
            'min_experience_years': 3,
            'required_degree': 'Bachelor',
            'weight_skills': 0.40,
            'weight_experience': 0.30,
            'weight_education': 0.10,
            'weight_semantic': 0.20,
        }
        base.update(overrides)
        return base

    def test_create_job_succeeds_when_title_and_level_match_catalog(self):
        response = self.client.post('/api/recruitment/jobs/', self._payload(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['title'], 'Backend Engineer')
        self.assertEqual(response.data['level'], 'Senior')
        self.assertTrue(Job.objects.filter(title='Backend Engineer', level='Senior').exists())

    def test_create_job_succeeds_when_catalog_entry_has_null_level(self):
        response = self.client.post('/api/recruitment/jobs/', self._payload(level=''), format='json')
        self.assertEqual(response.status_code, 201, response.data)

    def test_create_job_rejected_when_title_not_in_catalog(self):
        response = self.client.post('/api/recruitment/jobs/', self._payload(title='Wizard'), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('title', response.data)
        self.assertIn('catalog', str(response.data['title']).lower())

    def test_create_job_rejected_when_level_not_in_catalog_for_that_title(self):
        response = self.client.post('/api/recruitment/jobs/', self._payload(level='Principal'), format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('title', response.data)
