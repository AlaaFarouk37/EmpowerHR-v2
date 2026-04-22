from django.urls import path
from .views import (
    DepartmentListCreateView, DepartmentDetailView,
    TeamListCreateView, TeamDetailView,
    JobListCreateView, JobDetailView,
    LeaveTypeListCreateView, LeaveTypeDetailView,
)

urlpatterns = [
    # Departments
    path('departments/', DepartmentListCreateView.as_view(), name='department-list-create'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department-detail'),

    # Teams
    path('teams/', TeamListCreateView.as_view(), name='team-list-create'),
    path('teams/<int:pk>/', TeamDetailView.as_view(), name='team-detail'),

    # Jobs
    path('jobs/', JobListCreateView.as_view(), name='job-list-create'),
    path('jobs/<int:pk>/', JobDetailView.as_view(), name='job-detail'),

    # Leave Types
    path('leave-types/', LeaveTypeListCreateView.as_view(), name='leave-type-list-create'),
    path('leave-types/<int:pk>/', LeaveTypeDetailView.as_view(), name='leave-type-detail'),
]