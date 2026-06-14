from django.urls import path
from . import views

urlpatterns = [
    path('payroll/', views.PayrollRecordListCreateView.as_view(), name='payroll-list-create'),
    path('payroll/<str:pk>/', views.PayrollRecordDetailView.as_view(), name='payroll-detail'),
    path('employee/payroll/', views.EmployeePayrollListView.as_view(), name='employee-payroll-list'),
    path('hr/payroll/', views.HRPayrollListCreateView.as_view(), name='hr-payroll-list-create'),
    path('hr/payroll/watch/', views.HRPayrollWatchView.as_view(), name='hr-payroll-watch'),
    path('hr/payroll/run-cycle/', views.HRPayrollRunCycleView.as_view(), name='hr-payroll-run-cycle'),
    path('hr/payroll/signals/', views.HRPayrollPendingSignalsView.as_view(), name='hr-payroll-signals'),
    path('hr/payroll/<str:payroll_id>/mark-paid/', views.HRPayrollMarkPaidView.as_view(), name='hr-payroll-mark-paid'),
    path('hr/payroll/<str:payroll_id>/edit/', views.HRPayrollEditView.as_view(), name='hr-payroll-edit'),
    path('hr/payroll/<str:payroll_id>/recalculate/', views.HRPayrollRecalculateView.as_view(), name='hr-payroll-recalculate'),
    path('hr/commissions/', views.HRCommissionListCreateView.as_view(), name='hr-commission-list-create'),
    path('hr/commissions/<str:commission_id>/', views.HRCommissionDetailView.as_view(), name='hr-commission-detail'),
    path('hr/deductions/', views.HRDeductionListCreateView.as_view(), name='hr-deduction-list-create'),
    path('hr/deductions/<str:deduction_id>/', views.HRDeductionDetailView.as_view(), name='hr-deduction-detail'),
]