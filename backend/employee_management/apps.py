from django.apps import AppConfig


class EmployeeManagementConfig(AppConfig):
    name = 'employee_management'

    def ready(self):
        from . import signals  # noqa: F401  (registers leave-balance sync signals)
