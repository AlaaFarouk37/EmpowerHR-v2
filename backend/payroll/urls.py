from django.urls import path
from . import views

urlpatterns = [
    path('payroll/', views.PayrollRecordListCreateView.as_view(), name='payroll-list-create'),
    path('payroll/<str:pk>/', views.PayrollRecordDetailView.as_view(), name='payroll-detail'),
    path('employee/payroll/', views.EmployeePayrollListView.as_view(), name='employee-payroll-list'),
    path('hr/payroll/', views.HRPayrollListCreateView.as_view(), name='hr-payroll-list-create'),
    path('hr/payroll/watch/', views.HRPayrollWatchView.as_view(), name='hr-payroll-watch'),
    path('hr/payroll/<str:payroll_id>/mark-paid/', views.HRPayrollMarkPaidView.as_view(), name='hr-payroll-mark-paid'),
]