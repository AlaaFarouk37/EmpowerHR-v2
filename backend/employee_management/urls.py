from django.urls import path
from .views import (
    # Infrastructure (admin)
    DepartmentListCreateView, DepartmentDetailView,
    TeamListCreateView, TeamDetailView,
    JobListCreateView, JobDetailView, JobBenchmarkSalaryView,
    HRSalaryBenchmarkView,
    LeaveTypeListCreateView, LeaveTypeDetailView,
    # HR — Employee directory
    HREmployeeListCreateView, HREmployeeDetailView, HREmployeeHistoryView,
    HRRosterHealthView, HREmployeeSnapshotView, HREmployeeRoleChangeView,
    # HR — Cross-cutting dashboards
    HRApprovalSnapshotView, HRWorkforceInsightsView,
    # Goals
    EmployeeGoalListView, EmployeeGoalProgressView, TeamGoalListCreateView, TeamGoalDetailView,
    # Tasks
    EmployeeTaskListView, EmployeeTaskProgressView, EmployeeTaskStartView,
    EmployeeTaskEndView, EmployeeTaskDoneView,
    TeamTaskListCreateView, TeamTaskDetailView, TeamTaskApproveView, TeamTaskReturnForChangesView,
    # Action plans
    HRActionPlanListCreateView, HRActionPlanStatusView,
    # Recognition
    EmployeeRecognitionListView, TeamRecognitionListCreateView, HRRecognitionWatchView,
    # Benefits
    EmployeeBenefitListView, EmployeeBenefitStatusView,
    HRBenefitWatchView, HRBenefitListCreateView,
    # Reviews
    EmployeeReviewListView, EmployeeReviewAcknowledgeView,
    HRReviewCalibrationView, HRReviewListCreateView,
    # Career path
    EmployeeCareerPlanListView, EmployeeCareerPlanAcknowledgeView,
    # Shifts
    EmployeeShiftListView, EmployeeShiftAcknowledgeView,
    HRShiftWatchView, HRShiftScheduleListCreateView,
    # Policies & announcements
    HRPolicyComplianceView, HRPolicyReminderView, HRPolicyListCreateView,
    EmployeePolicyListView, EmployeePolicyAcknowledgeView,
    # Training
    EmployeeTrainingListView, EmployeeTrainingProgressView,
    HRTrainingListCreateView, HRTrainingComplianceView,
    # Expenses
    EmployeeExpenseListCreateView,
    HRExpenseListView, HRExpenseWatchView, HRExpenseReviewView,
    # Documents
    EmployeeDocumentListCreateView,
    HRDocumentListView, HRDocumentWatchView, HRDocumentIssueView,
    # Tickets
    EmployeeTicketListCreateView,
    HRTicketListView, HRTicketWatchView, HRTicketStatusView,
)

urlpatterns = [
    # ─── Infrastructure (admin) ──────────────────────────────────────────────
    path('departments/', DepartmentListCreateView.as_view(), name='department-list-create'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department-detail'),
    path('teams/', TeamListCreateView.as_view(), name='team-list-create'),
    path('teams/<int:pk>/', TeamDetailView.as_view(), name='team-detail'),
    path('jobs/', JobListCreateView.as_view(), name='job-list-create'),
    path('jobs/<int:pk>/', JobDetailView.as_view(), name='job-detail'),
    path('jobs/<int:pk>/benchmark/', JobBenchmarkSalaryView.as_view(), name='job-benchmark-salary'),
    path('leave-types/', LeaveTypeListCreateView.as_view(), name='leave-type-list-create'),
    path('leave-types/<int:pk>/', LeaveTypeDetailView.as_view(), name='leave-type-detail'),

    # ─── HR — Employee directory ─────────────────────────────────────────────
    path('hr/employees/', HREmployeeListCreateView.as_view(), name='hr-employee-list-create'),
    path('hr/employees/roster-health/', HRRosterHealthView.as_view(), name='hr-roster-health'),
    path('hr/employees/<str:employee_id>/', HREmployeeDetailView.as_view(), name='hr-employee-detail'),
    path('hr/employees/<str:employee_id>/history/', HREmployeeHistoryView.as_view(), name='hr-employee-history'),
    path('hr/employees/<str:employee_id>/snapshot/', HREmployeeSnapshotView.as_view(), name='hr-employee-snapshot'),
    path('hr/employees/<str:employee_id>/change-role/', HREmployeeRoleChangeView.as_view(), name='hr-employee-role-change'),

    # ─── Salary benchmark (external source) ──────────────────────────────────
    path('hr/salary-benchmark/', HRSalaryBenchmarkView.as_view(), name='hr-salary-benchmark'),

    # ─── HR — Cross-cutting dashboards ───────────────────────────────────────
    path('hr/approvals/snapshot/', HRApprovalSnapshotView.as_view(), name='hr-approval-snapshot'),
    path('hr/insights/', HRWorkforceInsightsView.as_view(), name='hr-workforce-insights'),

    # ─── Goals ───────────────────────────────────────────────────────────────
    path('employee/goals/', EmployeeGoalListView.as_view(), name='employee-goal-list'),
    path('employee/goals/<str:goal_id>/progress/', EmployeeGoalProgressView.as_view(), name='employee-goal-progress'),
    path('team/goals/', TeamGoalListCreateView.as_view(), name='team-goal-list-create'),
    path('team/goals/<str:goal_id>/', TeamGoalDetailView.as_view(), name='team-goal-detail'),

    # ─── Tasks ───────────────────────────────────────────────────────────────
    path('employee/tasks/', EmployeeTaskListView.as_view(), name='employee-task-list'),
    path('employee/tasks/<str:task_id>/progress/', EmployeeTaskProgressView.as_view(), name='employee-task-progress'),
    path('employee/tasks/<str:task_id>/start/', EmployeeTaskStartView.as_view(), name='employee-task-start'),
    path('employee/tasks/<str:task_id>/end/', EmployeeTaskEndView.as_view(), name='employee-task-end'),
    path('employee/tasks/<str:task_id>/done/', EmployeeTaskDoneView.as_view(), name='employee-task-done'),
    path('team/tasks/', TeamTaskListCreateView.as_view(), name='team-task-list-create'),
    path('team/tasks/<str:task_id>/', TeamTaskDetailView.as_view(), name='team-task-detail'),
    path('team/tasks/<str:task_id>/approve/', TeamTaskApproveView.as_view(), name='team-task-approve'),
    path('team/tasks/<str:task_id>/return/', TeamTaskReturnForChangesView.as_view(), name='team-task-return'),

    # ─── Action plans (HR) ───────────────────────────────────────────────────
    path('hr/action-plans/', HRActionPlanListCreateView.as_view(), name='hr-action-plan-list-create'),
    path('hr/action-plans/<str:task_id>/status/', HRActionPlanStatusView.as_view(), name='hr-action-plan-status'),

    # ─── Recognition ─────────────────────────────────────────────────────────
    path('employee/recognition/', EmployeeRecognitionListView.as_view(), name='employee-recognition-list'),
    path('team/recognition/', TeamRecognitionListCreateView.as_view(), name='team-recognition-list-create'),
    path('hr/recognition/watch/', HRRecognitionWatchView.as_view(), name='hr-recognition-watch'),

    # ─── Benefits ────────────────────────────────────────────────────────────
    path('employee/benefits/', EmployeeBenefitListView.as_view(), name='employee-benefit-list'),
    path('employee/benefits/<str:enrollment_id>/status/', EmployeeBenefitStatusView.as_view(), name='employee-benefit-status'),
    path('hr/benefits/', HRBenefitListCreateView.as_view(), name='hr-benefit-list-create'),
    path('hr/benefits/watch/', HRBenefitWatchView.as_view(), name='hr-benefit-watch'),

    # ─── Reviews ─────────────────────────────────────────────────────────────
    path('employee/reviews/', EmployeeReviewListView.as_view(), name='employee-review-list'),
    path('employee/reviews/<str:review_id>/acknowledge/', EmployeeReviewAcknowledgeView.as_view(), name='employee-review-acknowledge'),
    path('hr/reviews/', HRReviewListCreateView.as_view(), name='hr-review-list-create'),
    path('hr/reviews/calibration/', HRReviewCalibrationView.as_view(), name='hr-review-calibration'),

    # ─── Career path ─────────────────────────────────────────────────────────
    path('employee/career-path/', EmployeeCareerPlanListView.as_view(), name='employee-career-list'),
    path('employee/career-path/<str:plan_id>/acknowledge/', EmployeeCareerPlanAcknowledgeView.as_view(), name='employee-career-acknowledge'),

    # ─── Shifts ──────────────────────────────────────────────────────────────
    path('employee/shifts/', EmployeeShiftListView.as_view(), name='employee-shift-list'),
    path('employee/shifts/<str:schedule_id>/acknowledge/', EmployeeShiftAcknowledgeView.as_view(), name='employee-shift-acknowledge'),
    path('hr/shifts/', HRShiftScheduleListCreateView.as_view(), name='hr-shift-list-create'),
    path('hr/shifts/watch/', HRShiftWatchView.as_view(), name='hr-shift-watch'),

    # ─── Policies & announcements ────────────────────────────────────────────
    path('employee/policies/', EmployeePolicyListView.as_view(), name='employee-policy-list'),
    path('employee/policies/<str:policy_id>/acknowledge/', EmployeePolicyAcknowledgeView.as_view(), name='employee-policy-acknowledge'),
    path('hr/policies/', HRPolicyListCreateView.as_view(), name='hr-policy-list-create'),
    path('hr/policies/compliance/', HRPolicyComplianceView.as_view(), name='hr-policy-compliance'),
    path('hr/policies/<str:policy_id>/remind/', HRPolicyReminderView.as_view(), name='hr-policy-remind'),

    # ─── Training ────────────────────────────────────────────────────────────
    path('employee/training/', EmployeeTrainingListView.as_view(), name='employee-training-list'),
    path('employee/training/<str:course_id>/progress/', EmployeeTrainingProgressView.as_view(), name='employee-training-progress'),
    path('hr/training/', HRTrainingListCreateView.as_view(), name='hr-training-list-create'),
    path('hr/training/compliance/', HRTrainingComplianceView.as_view(), name='hr-training-compliance'),

    # ─── Expenses ────────────────────────────────────────────────────────────
    path('employee/expenses/', EmployeeExpenseListCreateView.as_view(), name='employee-expense-list-create'),
    path('hr/expenses/', HRExpenseListView.as_view(), name='hr-expense-list'),
    path('hr/expenses/watch/', HRExpenseWatchView.as_view(), name='hr-expense-watch'),
    path('hr/expenses/<str:claim_id>/review/', HRExpenseReviewView.as_view(), name='hr-expense-review'),

    # ─── Documents ───────────────────────────────────────────────────────────
    path('employee/documents/', EmployeeDocumentListCreateView.as_view(), name='employee-document-list-create'),
    path('hr/documents/', HRDocumentListView.as_view(), name='hr-document-list'),
    path('hr/documents/watch/', HRDocumentWatchView.as_view(), name='hr-document-watch'),
    path('hr/documents/<str:request_id>/issue/', HRDocumentIssueView.as_view(), name='hr-document-issue'),

    # ─── Tickets ─────────────────────────────────────────────────────────────
    path('employee/tickets/', EmployeeTicketListCreateView.as_view(), name='employee-ticket-list-create'),
    path('hr/tickets/', HRTicketListView.as_view(), name='hr-ticket-list'),
    path('hr/tickets/watch/', HRTicketWatchView.as_view(), name='hr-ticket-watch'),
    path('hr/tickets/<str:ticket_id>/status/', HRTicketStatusView.as_view(), name='hr-ticket-status'),
]
