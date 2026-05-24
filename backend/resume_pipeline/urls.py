from django.urls import path
from .views import (
    JobListCreateView, JobDetailView, JobWeightsView, JobPipelineHealthView,
    SubmitResumeView, CandidateApplicationListView, JobSubmissionsView, SubmissionDetailView, SubmissionStageUpdateView, JobCVRankingView,
    SuccessionPlanListCreateView, SuccessionPlanDetailView,
    HRSuccessionWatchView, HRSuccessionPlanListCreateView,
    AtRiskEmployeeListView, EmployeeSuccessorListView,
)

urlpatterns = [
    path("jobs/", JobListCreateView.as_view()),
    path("jobs/health/", JobPipelineHealthView.as_view(), name="recruitment-job-health"),
    path("jobs/<int:pk>/", JobDetailView.as_view()),
    path("jobs/<int:pk>/weights/", JobWeightsView.as_view()),
    path("jobs/<int:pk>/submissions/", JobSubmissionsView.as_view()),
    path("jobs/<int:pk>/ranking/", JobCVRankingView.as_view()),
    path("submit/", SubmitResumeView.as_view()),
    path("applications/", CandidateApplicationListView.as_view()),
    path("submissions/<int:pk>/", SubmissionDetailView.as_view()),
    path("submissions/<int:pk>/stage/", SubmissionStageUpdateView.as_view(), name="recruitment-submission-stage"),
    path("succession-plans/", SuccessionPlanListCreateView.as_view(), name='succession-plan-list-create'),
    path("succession-plans/<str:pk>/", SuccessionPlanDetailView.as_view(), name='succession-plan-detail'),
    path("hr/succession/watch/", HRSuccessionWatchView.as_view(), name='hr-succession-watch'),
    path("hr/succession/", HRSuccessionPlanListCreateView.as_view(), name='hr-succession-list-create'),
    path("succession/at-risk/", AtRiskEmployeeListView.as_view(), name='succession-at-risk'),
    path("succession/employees/<str:employee_id>/successors/", EmployeeSuccessorListView.as_view(), name='succession-successors'),
]

