from django.urls import path
from . import views

urlpatterns = [
    # ─── Admin/raw CRUD ──────────────────────────────────────────────────────
    path('attendance/', views.AttendanceRecordListCreateView.as_view(), name='attendance-list-create'),
    path('attendance/clock-in/', views.clock_in_view, name='clock-in'),
    path('attendance/clock-out/', views.clock_out_view, name='clock-out'),
    path('attendance/<str:pk>/', views.AttendanceRecordDetailView.as_view(), name='attendance-detail'),
    path('leave-requests/', views.LeaveRequestListCreateView.as_view(), name='leave-request-list-create'),
    path('leave-requests/<str:pk>/', views.LeaveRequestDetailView.as_view(), name='leave-request-detail'),
    path('leave-requests/<str:pk>/approve/', views.approve_leave_request, name='approve-leave-request'),
    path('leave-requests/<str:pk>/reject/', views.reject_leave_request, name='reject-leave-request'),

    # ─── Employee self-service ───────────────────────────────────────────────
    path('employee/attendance/', views.EmployeeAttendanceListView.as_view(), name='employee-attendance-list'),
    path('employee/attendance/clock/', views.EmployeeAttendanceClockView.as_view(), name='employee-attendance-clock'),
    path('employee/leave-requests/', views.EmployeeLeaveRequestListCreateView.as_view(), name='employee-leave-request-list-create'),
    path('employee/leave-balances/', views.EmployeeLeaveBalanceView.as_view(), name='employee-leave-balances'),
    path('employee/time-corrections/', views.EmployeeTimeCorrectionListCreateView.as_view(), name='employee-time-correction-list-create'),

    # ─── Team-leader overtime review ─────────────────────────────────────────
    path('team/overtime/', views.TeamOvertimeReviewListView.as_view(), name='team-overtime-review-list'),
    path('team/overtime/<str:attendance_id>/review/', views.TeamOvertimeReviewActionView.as_view(), name='team-overtime-review-action'),

    # ─── Team-leader time-correction review ──────────────────────────────────
    path('team/time-corrections/', views.TeamTimeCorrectionListView.as_view(), name='team-time-correction-list'),
    path('team/time-corrections/<str:correction_id>/review/', views.TeamTimeCorrectionReviewView.as_view(), name='team-time-correction-review'),

    # ─── Team-leader leave-request review ────────────────────────────────────
    path('team/leave-requests/', views.TeamLeaveRequestListView.as_view(), name='team-leave-request-list'),
    path('team/leave-requests/<str:pk>/review/', views.review_leave_request, name='team-leave-request-review'),

    # ─── Team utilization capacity (holiday/leave-aware) ─────────────────────
    path('team/weekly-capacity/', views.TeamWeeklyCapacityView.as_view(), name='team-weekly-capacity'),

    # ─── Public holidays (read-only, any internal employee) ──────────────────
    path('holidays/', views.PublicHolidayListView.as_view(), name='public-holidays'),

    # ─── HR oversight ────────────────────────────────────────────────────────
    path('hr/attendance/', views.HRAttendanceListView.as_view(), name='hr-attendance-list'),
    path('hr/attendance/watch/', views.HRAttendanceWatchView.as_view(), name='hr-attendance-watch'),
    path('hr/leave-requests/', views.LeaveRequestListCreateView.as_view(), name='hr-leave-request-list'),
    path('hr/leave-requests/<str:pk>/review/', views.review_leave_request, name='hr-leave-request-review'),
    path('hr/leave-balances/', views.HRLeaveBalanceView.as_view(), name='hr-leave-balances'),

    # ─── Public holidays (HR config) ─────────────────────────────────────────
    path('hr/holidays/', views.HRHolidayCalendarView.as_view(), name='hr-holiday-calendar'),
    path('hr/holiday-overrides/', views.HRHolidayOverrideListCreateView.as_view(), name='hr-holiday-override-list-create'),
    path('hr/holiday-overrides/<str:override_id>/', views.HRHolidayOverrideDetailView.as_view(), name='hr-holiday-override-detail'),

    # ─── Absence detection + deduction (HR-triggered) ────────────────────────
    path('hr/absence-run/', views.HRAbsenceRunView.as_view(), name='hr-absence-run'),
]
