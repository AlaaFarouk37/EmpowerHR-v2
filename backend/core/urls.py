from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include

from .views import SendEmailView


def root_status(_request):
    return JsonResponse(
        {
            "status": "ok",
            "message": "EmpowerHR backend is running.",

            "available_routes": [
                "/admin/",
                "/api/auth/",
                "/api/recruitment/",
                "/api/feedback/",
                "/api/attrition/",
                "/api/employee_management/",
                "/api/attendance_leave/",
                "/api/payroll/",
                "/api/onboarding/",
                "/api/send-email/",
                "/health/",
            ],
        }
    )


urlpatterns = [
    path('', root_status),
    path('health/', root_status),
    path('admin/', admin.site.urls),
    path('api/recruitment/', include('resume_pipeline.urls')),
    path('api/feedback/',    include('feedback.urls')),
    path('api/attrition/',   include('attrition.urls')),
    path('api/employee_management/', include('employee_management.urls')),
    path('api/attendance_leave/', include('Attendance_and_Leave.urls')),
    path('api/payroll/', include('payroll.urls')),
    path('api/onboarding/', include('onboarding.urls')),
    path('api/mobile/', include('mobile.urls')),
    path('api/send-email/', SendEmailView.as_view(), name='send-email'),
    path("api/auth/", include("accounts.urls"))
]
