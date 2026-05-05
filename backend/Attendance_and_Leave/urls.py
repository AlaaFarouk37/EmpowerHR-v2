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

    # ─── Team-leader overtime review ─────────────────────────────────────────
    path('team/overtime/', views.TeamOvertimeReviewListView.as_view(), name='team-overtime-review-list'),
    path('team/overtime/<str:attendance_id>/review/', views.TeamOvertimeReviewActionView.as_view(), name='team-overtime-review-action'),

    # ─── HR oversight ────────────────────────────────────────────────────────
    path('hr/attendance/', views.HRAttendanceListView.as_view(), name='hr-attendance-list'),
    path('hr/attendance/watch/', views.HRAttendanceWatchView.as_view(), name='hr-attendance-watch'),
    path('hr/leave-requests/', views.LeaveRequestListCreateView.as_view(), name='hr-leave-request-list'),
    path('hr/leave-requests/<str:pk>/review/', views.review_leave_request, name='hr-leave-request-review'),
]
