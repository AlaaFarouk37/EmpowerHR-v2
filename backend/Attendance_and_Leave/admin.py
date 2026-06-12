from django.contrib import admin

from .models import (
    AttendanceRecord, LeaveRequest, LeaveBalance, HolidayOverride, TimeCorrectionRequest,
)


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leaveTypeName', 'year', 'entitledDays', 'usedDays', 'remainingDays')
    list_filter = ('year', 'leaveTypeName')
    search_fields = ('employee__employeeID', 'employee__fullName', 'leaveTypeName')

    def remainingDays(self, obj):
        return obj.remainingDays
    remainingDays.short_description = 'Remaining'


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leaveType', 'startDate', 'endDate', 'daysRequested', 'status', 'requestedAt')
    list_filter = ('status', 'leaveType')
    search_fields = ('employee__employeeID', 'employee__fullName')


@admin.register(HolidayOverride)
class HolidayOverrideAdmin(admin.ModelAdmin):
    list_display = ('date', 'name', 'type', 'createdBy', 'createdAt')
    list_filter = ('type',)
    search_fields = ('name',)


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'clockIn', 'clockOut', 'workedHours', 'status', 'overtimeStatus')
    list_filter = ('status', 'overtimeStatus')
    search_fields = ('employee__employeeID', 'employee__fullName')


@admin.register(TimeCorrectionRequest)
class TimeCorrectionRequestAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'status', 'reviewedBy', 'createdAt')
    list_filter = ('status',)
    search_fields = ('employee__employeeID', 'employee__fullName')
