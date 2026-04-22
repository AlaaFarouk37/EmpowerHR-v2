from django.urls import path

from .views import (
    EmployeeOnboardingListView,
    EmployeeOnboardingProgressView,
    HROnboardingWatchView,
    HROnboardingPlanListCreateView,
)

urlpatterns = [
    path('employee/onboarding/', EmployeeOnboardingListView.as_view(), name='employee-onboarding-list'),
    path('employee/onboarding/<str:plan_id>/progress/', EmployeeOnboardingProgressView.as_view(), name='employee-onboarding-progress'),
    path('hr/onboarding/watch/', HROnboardingWatchView.as_view(), name='hr-onboarding-watch'),
    path('hr/onboarding/', HROnboardingPlanListCreateView.as_view(), name='hr-onboarding-list-create'),
]
