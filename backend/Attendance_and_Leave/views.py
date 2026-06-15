from decimal import Decimal

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db.models import Q
from accounts.permissions import IsHRManager, IsInternalEmployee, IsTeamLeader
from employee_management.models import Employee, WorkTaskLog, LeaveType
from .models import (
    AttendanceRecord, LeaveRequest, TimeCorrectionRequest, HolidayOverride, LeaveBalance,
)
from .serializers import (
    AttendanceRecordSerializer, LeaveRequestSerializer, AttendanceClockSerializer, LeaveRequestCreateSerializer,
    TimeCorrectionRequestSerializer, TimeCorrectionCreateSerializer, TimeCorrectionReviewSerializer,
    HolidayOverrideSerializer, HolidayOverrideCreateSerializer, LeaveBalanceSerializer, AbsenceRunSerializer,
)
from . import leave_services, holiday_service, absence_service, capacity, reporting_service


def _compute_overtime(record):
    """Populate record.overtimeHours and record.overtimeStatus for TeamMembers.

    Rules (TeamMembers only):
      raw_overtime = max(0, attendance_time - contracted_hours_day)
      AUTO_APPROVED if raw_overtime > 0 and task_time/attendance_time >= 0.8
      PENDING_REVIEW if raw_overtime > 0 but the 80% gate fails
      STANDARD otherwise
    Non-TeamMembers and records missing the inputs are left as STANDARD/0.
    """
    record.overtimeHours = Decimal('0.00')
    record.overtimeStatus = AttendanceRecord.OT_STANDARD

    employee = record.employee
    try:
        user_account = employee.user_account
    except Employee.user_account.RelatedObjectDoesNotExist:
        user_account = None
    if not user_account or user_account.role != 'TeamMember':
        return

    attendance_time = record.workedHours
    daily_baseline = employee.contracted_hours_day
    if attendance_time is None or daily_baseline is None:
        return

    raw_overtime = attendance_time - daily_baseline
    if raw_overtime <= 0:
        return

    task_seconds = sum(
        (log.end_time - log.start_time).total_seconds()
        for log in WorkTaskLog.objects.filter(
            task__employee=employee,
            start_time__date=record.date,
            end_time__isnull=False,
        )
    )
    task_time = Decimal(task_seconds) / Decimal(3600)

    record.overtimeHours = raw_overtime.quantize(Decimal('0.01'))
    if attendance_time > 0 and (task_time / attendance_time) >= Decimal('0.8'):
        record.overtimeStatus = AttendanceRecord.OT_AUTO_APPROVED
    else:
        record.overtimeStatus = AttendanceRecord.OT_PENDING_REVIEW





def _label(value):
    """Return the .name of an FK instance (Team / Department), or '' if None."""
    return getattr(value, 'name', '') or ''


def _can_manage_employee(request_user, employee):
    if getattr(request_user, 'role', None) in ('HRManager', 'Admin'):
        return True

    if getattr(request_user, 'role', None) == 'TeamLeader':
        leader_employee = Employee.objects.filter(
            employeeID=getattr(request_user, 'employee_id', None),
            isDeleted=False,
        ).first()
        if leader_employee and leader_employee.team and employee.team:
            return leader_employee.team == employee.team
    return False


def _can_review_leave(request_user, employee):
    """Who may approve/reject a leave request (Admin is not concerned with leaves):
      * HR Manager -> anyone (Team Leaders' own requests route here).
      * Team Leader -> their own team members, but NOT other Team Leaders.
    """
    role = getattr(request_user, 'role', None)
    if role == 'HRManager':
        return True
    if role == 'TeamLeader':
        if getattr(employee, 'role', None) == 'TeamLeader':
            return False
        leader = Employee.objects.filter(
            employeeID=getattr(request_user, 'employee_id', None), isDeleted=False,
        ).first()
        return bool(leader and leader.team_id and employee.team_id
                    and leader.team_id == employee.team_id)
    return False


class AttendanceRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return AttendanceRecord.objects.all()
        elif user.role == 'hr_manager':
            return AttendanceRecord.objects.all()
        else:
            return AttendanceRecord.objects.filter(employee_id=user.employee_id)

    def perform_create(self, serializer):
        serializer.save()


class AttendanceRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return AttendanceRecord.objects.all()
        elif user.role == 'hr_manager':
            return AttendanceRecord.objects.all()
        else:
            return AttendanceRecord.objects.filter(employee_id=user.employee_id)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_in_view(request):
    user = request.user
    today = timezone.now().date()

    # Check if already clocked in today
    existing = AttendanceRecord.objects.filter(
        employee_id=user.employee_id,
        date=today
    ).first()

    if existing and existing.clockIn:
        return Response({'error': 'Already clocked in today'}, status=status.HTTP_400_BAD_REQUEST)

    if existing:
        existing.clockIn = timezone.now()
        existing.status = AttendanceRecord.STATUS_CLOCKED_IN
        existing.save()
        serializer = AttendanceRecordSerializer(existing)
        return Response(serializer.data)

    # Create new record
    if not user.employee_id:
        return Response({'error': 'No employee record linked to this account.'}, status=status.HTTP_400_BAD_REQUEST)
    employee = user.employee
    record = AttendanceRecord.objects.create(
        employee=employee,
        date=today,
        clockIn=timezone.now(),
        status=AttendanceRecord.STATUS_CLOCKED_IN
    )
    serializer = AttendanceRecordSerializer(record)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_out_view(request):
    user = request.user
    today = timezone.now().date()

    record = AttendanceRecord.objects.filter(
        employee_id=user.employee_id,
        date=today
    ).first()

    if not record or not record.clockIn:
        return Response({'error': 'Not clocked in today'}, status=status.HTTP_400_BAD_REQUEST)

    if record.clockOut:
        return Response({'error': 'Already clocked out today'}, status=status.HTTP_400_BAD_REQUEST)

    record.clockOut = timezone.now()
    if record.clockIn and record.clockOut:
        duration = record.clockOut - record.clockIn
        record.workedHours = Decimal(duration.total_seconds() / 3600).quantize(Decimal('0.01'))
        record.status = AttendanceRecord.STATUS_PRESENT
    _compute_overtime(record)
    record.save()

    serializer = AttendanceRecordSerializer(record)
    return Response(serializer.data)


class LeaveRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # HR/Admin see all requests; everyone else sees only their own.
        if getattr(user, 'role', None) in ('Admin', 'HRManager'):
            return LeaveRequest.objects.all()
        return LeaveRequest.objects.filter(employee_id=user.employee_id)

    def perform_create(self, serializer):
        serializer.save()


class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) in ('Admin', 'HRManager'):
            return LeaveRequest.objects.all()
        return LeaveRequest.objects.filter(employee_id=user.employee_id)


def _approve_leave(leave_request, reviewer):
    """Approve a leave request and deduct its days from the balance, once.

    Returns (ok, error_message). Deduction only happens on a Pending->Approved
    transition, and is blocked if it would exceed the leave type's cap."""
    if leave_request.status == LeaveRequest.STATUS_APPROVED:
        return True, None  # already approved; don't deduct again

    days = leave_request.daysRequested or 0
    year = leave_request.startDate.year
    leave_type_name = leave_request.leaveType.name
    fits, _balance = leave_services.can_fit(
        leave_request.employee, leave_type_name, days, year)
    if not fits:
        return False, f'Approving exceeds the {leave_type_name} leave cap for {year}.'

    leave_request.status = LeaveRequest.STATUS_APPROVED
    leave_request.reviewedBy = getattr(reviewer, 'full_name', '') or reviewer.email
    leave_request.reviewedAt = timezone.now()
    leave_request.save()
    leave_services.deduct_balance(leave_request.employee, leave_type_name, days, year)
    return True, None


@api_view(['POST'])
@permission_classes([IsTeamLeader])
def approve_leave_request(request, pk):
    leave_request = LeaveRequest.objects.select_related('employee').filter(pk=pk).first()
    if not leave_request:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)
    if not _can_review_leave(request.user, leave_request.employee):
        return Response({'error': 'You do not have permission to review this leave request.'},
                        status=status.HTTP_403_FORBIDDEN)

    ok, error = _approve_leave(leave_request, request.user)
    if not ok:
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
    return Response(LeaveRequestSerializer(leave_request).data)


@api_view(['POST'])
@permission_classes([IsTeamLeader])
def reject_leave_request(request, pk):
    leave_request = LeaveRequest.objects.select_related('employee').filter(pk=pk).first()
    if not leave_request:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)
    if not _can_review_leave(request.user, leave_request.employee):
        return Response({'error': 'You do not have permission to review this leave request.'},
                        status=status.HTTP_403_FORBIDDEN)

    leave_request.status = LeaveRequest.STATUS_REJECTED
    leave_request.reviewedBy = getattr(request.user, 'full_name', '') or request.user.email
    leave_request.reviewedAt = timezone.now()
    leave_request.reviewNotes = request.data.get('reviewNotes', '')
    leave_request.save()

    return Response(LeaveRequestSerializer(leave_request).data)


@api_view(['POST'])
@permission_classes([IsTeamLeader])
def review_leave_request(request, pk):
    """Unified review endpoint. Body: {action: 'approve'|'reject', reviewNotes?: ''}."""
    action = (request.data.get('action') or '').strip().lower()
    if action not in ('approve', 'reject'):
        return Response(
            {'error': "action must be 'approve' or 'reject'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    leave_request = LeaveRequest.objects.select_related('employee').filter(pk=pk).first()
    if not leave_request:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)
    if not _can_review_leave(request.user, leave_request.employee):
        return Response({'error': 'You do not have permission to review this leave request.'},
                        status=status.HTTP_403_FORBIDDEN)

    if action == 'approve':
        ok, error = _approve_leave(leave_request, request.user)
        if not ok:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        leave_request.reviewNotes = request.data.get('reviewNotes', '')
        leave_request.save(update_fields=['reviewNotes'])
    else:
        leave_request.status = LeaveRequest.STATUS_REJECTED
        leave_request.reviewedBy = getattr(request.user, 'full_name', '') or request.user.email
        leave_request.reviewedAt = timezone.now()
        leave_request.reviewNotes = request.data.get('reviewNotes', '')
        leave_request.save()

    return Response(LeaveRequestSerializer(leave_request).data)


def _resolve_employee(employee_id, request_user=None):
    employee = Employee.objects.filter(pk=employee_id, isDeleted=False).first()
    if employee:
        return employee

    if request_user and getattr(request_user, 'employee_id', None) == employee_id:
        return Employee.objects.create(
            employeeID=employee_id,
            fullName=getattr(request_user, 'full_name', request_user.email),
            email=request_user.email,
            role=getattr(request_user, 'role', 'TeamMember'),
            employmentStatus='Active',
        )
    return None


class EmployeeAttendanceListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        records = AttendanceRecord.objects.select_related('employee').filter(employee_id=employee_id).order_by('-date')
        return Response(AttendanceRecordSerializer(records, many=True).data)


class EmployeeAttendanceClockView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request):
        from .serializers import AttendanceClockSerializer  # Import here to avoid circular import
        serializer = AttendanceClockSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        action = serializer.validated_data['action']
        notes = serializer.validated_data.get('notes', '')
        now = timezone.now()
        today = timezone.localdate()

        record, _ = AttendanceRecord.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={'status': AttendanceRecord.STATUS_CLOCKED_IN}
        )

        if action == 'clock_in':
            if record.clockIn:
                return Response({'error': 'Already clocked in today.'}, status=status.HTTP_400_BAD_REQUEST)
            record.clockIn = now
            record.status = AttendanceRecord.STATUS_PRESENT
            record.notes = (record.notes or '') + f'\nClock in: {notes}'.strip()
            record.save()
            return Response(AttendanceRecordSerializer(record).data)

        elif action == 'clock_out':
            if not record.clockIn:
                return Response({'error': 'Not clocked in today.'}, status=status.HTTP_400_BAD_REQUEST)
            if record.clockOut:
                return Response({'error': 'Already clocked out today.'}, status=status.HTTP_400_BAD_REQUEST)
            record.clockOut = now
            if record.clockIn:
                duration = record.clockOut - record.clockIn
                record.workedHours = Decimal(duration.total_seconds() / 3600).quantize(Decimal('0.01'))
            record.notes = (record.notes or '') + f'\nClock out: {notes}'.strip()
            _compute_overtime(record)
            record.save()
            return Response(AttendanceRecordSerializer(record).data)

        return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)


class TeamOvertimeReviewListView(APIView):
    """GET /attendance_leave/team/overtime/  — pending OT records the TL can review.

    Each record is augmented with `taskTimeHours` (the sum of that day's
    WorkTaskLog durations), so the TL can see exactly how far below the 80%
    gate the employee landed.
    """
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        records = (
            AttendanceRecord.objects
            .select_related('employee')
            .filter(
                overtimeStatus=AttendanceRecord.OT_PENDING_REVIEW,
                employee__isDeleted=False,
            )
            .order_by('-date')
        )

        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader_employee = Employee.objects.filter(
                employeeID=getattr(request.user, 'employee_id', None),
                isDeleted=False,
            ).first()
            if leader_employee and leader_employee.team_id:
                records = records.filter(employee__team=leader_employee.team)
            else:
                records = records.none()

        records = list(records)
        payload = AttendanceRecordSerializer(records, many=True).data
        for record, item in zip(records, payload):
            task_seconds = sum(
                (log.end_time - log.start_time).total_seconds()
                for log in WorkTaskLog.objects.filter(
                    task__employee=record.employee,
                    start_time__date=record.date,
                    end_time__isnull=False,
                )
            )
            item['taskTimeHours'] = float(
                (Decimal(task_seconds) / Decimal(3600)).quantize(Decimal('0.01'))
            )
        return Response(payload)


class TeamOvertimeReviewActionView(APIView):
    """POST /attendance_leave/team/overtime/<attendanceID>/review/

    Body: {"action": "approve" | "reject", "reviewNote"?: ""}

    Approve flips overtimeStatus to AUTO_APPROVED; reject flips it to REJECTED.
    Either way the reviewer + timestamp + note are recorded.
    """
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def post(self, request, attendance_id):
        try:
            record = AttendanceRecord.objects.select_related('employee').get(pk=attendance_id)
        except AttendanceRecord.DoesNotExist:
            return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_manage_employee(request.user, record.employee):
            return Response(
                {'error': 'You do not have permission to review this overtime.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if record.overtimeStatus != AttendanceRecord.OT_PENDING_REVIEW:
            return Response(
                {'error': "Only overtime in 'PENDING_REVIEW' can be reviewed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action = (request.data.get('action') or '').strip().lower()
        if action not in ('approve', 'reject'):
            return Response(
                {'error': "action must be 'approve' or 'reject'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record.overtimeStatus = (
            AttendanceRecord.OT_AUTO_APPROVED if action == 'approve'
            else AttendanceRecord.OT_REJECTED
        )
        record.overtimeReviewedBy = (
            getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '')
        )
        record.overtimeReviewedAt = timezone.now()
        record.overtimeReviewNote = request.data.get('reviewNote', '') or ''
        record.save(update_fields=[
            'overtimeStatus', 'overtimeReviewedBy', 'overtimeReviewedAt', 'overtimeReviewNote',
        ])

        return Response(AttendanceRecordSerializer(record).data)


def _apply_times_to_record(record, clock_in, clock_out):
    """Write corrected clock in/out onto an AttendanceRecord and recompute
    worked hours, status and overtime."""
    record.clockIn = clock_in
    record.clockOut = clock_out
    if clock_in and clock_out and clock_out > clock_in:
        duration = clock_out - clock_in
        record.workedHours = Decimal(duration.total_seconds() / 3600).quantize(Decimal('0.01'))
        record.status = AttendanceRecord.STATUS_PRESENT
    elif clock_in:
        record.workedHours = None
        record.status = AttendanceRecord.STATUS_CLOCKED_IN
    _compute_overtime(record)
    record.save()


class EmployeeTimeCorrectionListCreateView(APIView):
    """GET/POST /attendance_leave/employee/time-corrections/ — an employee's own
    time-correction requests."""
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        qs = TimeCorrectionRequest.objects.select_related('employee', 'attendance').filter(employee_id=employee_id)
        return Response(TimeCorrectionRequestSerializer(qs, many=True).data)

    def post(self, request):
        serializer = TimeCorrectionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee_id = getattr(request.user, 'employee_id', None)
        record = AttendanceRecord.objects.select_related('employee').filter(
            pk=serializer.validated_data['attendanceID']).first()
        if not record:
            return Response({'error': 'Attendance record not found.'}, status=status.HTTP_404_NOT_FOUND)
        if record.employee_id != employee_id:
            return Response({'error': 'You can only request corrections for your own attendance.'},
                            status=status.HTTP_403_FORBIDDEN)
        # One correction request per attendance record: a pending one is awaiting
        # review, an approved one already fixed the day, and a denied one is final.
        existing = TimeCorrectionRequest.objects.filter(attendance=record).order_by('-createdAt').first()
        if existing:
            if existing.status == TimeCorrectionRequest.STATUS_PENDING:
                msg = 'A correction request for this day is already pending review.'
            elif existing.status == TimeCorrectionRequest.STATUS_DENIED:
                msg = 'A correction request for this day was denied; no further requests are allowed.'
            else:
                msg = 'This day was already corrected and cannot be requested again.'
            return Response({'error': msg}, status=status.HTTP_400_BAD_REQUEST)

        req = TimeCorrectionRequest.objects.create(
            employee=record.employee,
            attendance=record,
            date=record.date,
            requestedClockIn=serializer.validated_data.get('requestedClockIn'),
            requestedClockOut=serializer.validated_data.get('requestedClockOut'),
            reason=serializer.validated_data.get('reason', ''),
        )
        return Response(TimeCorrectionRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class TeamTimeCorrectionListView(APIView):
    """GET /attendance_leave/team/time-corrections/ — pending correction requests
    the Team Leader can review (scoped to their team)."""
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        qs = TimeCorrectionRequest.objects.select_related('employee', 'attendance').filter(
            status=TimeCorrectionRequest.STATUS_PENDING, employee__isDeleted=False)

        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader_employee = Employee.objects.filter(
                employeeID=getattr(request.user, 'employee_id', None), isDeleted=False).first()
            if leader_employee and leader_employee.team_id:
                qs = qs.filter(employee__team=leader_employee.team)
            else:
                qs = qs.none()

        return Response(TimeCorrectionRequestSerializer(qs.order_by('-createdAt'), many=True).data)


class TeamTimeCorrectionReviewView(APIView):
    """POST /attendance_leave/team/time-corrections/<id>/review/
    Body: {action: 'approve'|'deny', reviewNote?, requestedClockIn?, requestedClockOut?}.
    The TL may edit the requested times before approving; approval writes them onto
    the employee's AttendanceRecord."""
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def post(self, request, correction_id):
        req = TimeCorrectionRequest.objects.select_related('employee', 'attendance').filter(pk=correction_id).first()
        if not req:
            return Response({'error': 'Correction request not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_manage_employee(request.user, req.employee):
            return Response({'error': 'You do not have permission to review this request.'},
                            status=status.HTTP_403_FORBIDDEN)
        if req.status != TimeCorrectionRequest.STATUS_PENDING:
            return Response({'error': 'Only pending requests can be reviewed.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = TimeCorrectionReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        action = data['action']

        # Optional TL edits to the requested times before approval.
        if 'requestedClockIn' in data:
            req.requestedClockIn = data.get('requestedClockIn')
        if 'requestedClockOut' in data:
            req.requestedClockOut = data.get('requestedClockOut')

        req.reviewNote = data.get('reviewNote', '')
        req.reviewedBy = getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '')
        req.reviewedAt = timezone.now()

        if action == 'approve':
            req.status = TimeCorrectionRequest.STATUS_APPROVED
            _apply_times_to_record(req.attendance, req.requestedClockIn, req.requestedClockOut)
        else:
            req.status = TimeCorrectionRequest.STATUS_DENIED

        req.save()
        return Response(TimeCorrectionRequestSerializer(req).data)


class HRAttendanceWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        today = timezone.localdate()
        attendance_records = list(
            AttendanceRecord.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-date', '-clockIn')
        )
        leave_requests = list(
            LeaveRequest.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-requestedAt')
        )

        department_map = {}
        follow_up_items = []

        for record in attendance_records:
            department = _label(record.employee.department) or 'Unassigned'
            entry = department_map.setdefault(department, {
                'department': department,
                'attendanceCount': 0,
                'clockedInCount': 0,
                'partialCount': 0,
                'pendingLeaveCount': 0,
            })
            entry['attendanceCount'] += 1
            if record.status == AttendanceRecord.STATUS_CLOCKED_IN:
                entry['clockedInCount'] += 1
                follow_up_items.append({
                    'type': 'attendance',
                    'attendanceID': record.attendanceID,
                    'employeeName': record.employee.fullName,
                    'employeeID': record.employee_id,
                    'department': department,
                    'status': record.status,
                    'followUpState': 'Open Shift',
                    'date': record.date.isoformat() if record.date else None,
                    'summary': record.notes or 'Employee is still clocked in and may need attendance closeout.',
                    'path': '/hr/attendance',
                })
            elif record.status == AttendanceRecord.STATUS_PARTIAL:
                entry['partialCount'] += 1
                follow_up_items.append({
                    'type': 'attendance',
                    'attendanceID': record.attendanceID,
                    'employeeName': record.employee.fullName,
                    'employeeID': record.employee_id,
                    'department': department,
                    'status': record.status,
                    'followUpState': 'Partial Day',
                    'date': record.date.isoformat() if record.date else None,
                    'summary': record.notes or 'Attendance record shows a partial day and may need manager follow-up.',
                    'path': '/hr/attendance',
                })

        for request_item in leave_requests:
            department = _label(request_item.employee.department) or 'Unassigned'
            entry = department_map.setdefault(department, {
                'department': department,
                'attendanceCount': 0,
                'clockedInCount': 0,
                'partialCount': 0,
                'pendingLeaveCount': 0,
            })
            if request_item.status == LeaveRequest.STATUS_PENDING:
                entry['pendingLeaveCount'] += 1
                follow_up_items.append({
                    'type': 'leave',
                    'leaveRequestID': request_item.leaveRequestID,
                    'employeeName': request_item.employee.fullName,
                    'employeeID': request_item.employee_id,
                    'department': department,
                    'status': request_item.status,
                    'followUpState': 'Leave Approval Pending',
                    'date': request_item.startDate.isoformat() if request_item.startDate else None,
                    'summary': request_item.reason or request_item.eligibilityMessage or 'Leave request is waiting for HR review.',
                    'path': '/hr/attendance',
                })

        state_rank = {
            'Open Shift': 0,
            'Leave Approval Pending': 1,
            'Partial Day': 2,
        }
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (
                state_rank.get(item['followUpState'], 9),
                item.get('date') or '',
                item['employeeName'],
            ),
        )[:10]

        department_breakdown = sorted(
            department_map.values(),
            key=lambda item: (-item['pendingLeaveCount'], -item['clockedInCount'], -item['partialCount'], item['department']),
        )

        return Response({
            'summary': {
                'attendanceToday': sum(1 for record in attendance_records if record.date == today),
                'clockedInCount': sum(1 for record in attendance_records if record.status == AttendanceRecord.STATUS_CLOCKED_IN),
                'partialCount': sum(1 for record in attendance_records if record.status == AttendanceRecord.STATUS_PARTIAL),
                'pendingLeaveCount': sum(1 for request_item in leave_requests if request_item.status == LeaveRequest.STATUS_PENDING),
                'approvedLeaveCount': sum(1 for request_item in leave_requests if request_item.status == LeaveRequest.STATUS_APPROVED),
                'followUpCount': len(follow_up_items),
            },
            'departmentBreakdown': department_breakdown,
            'followUpItems': follow_up_items,
        })


class HRAttendanceListView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        records = AttendanceRecord.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        department = request.query_params.get('department')
        date_value = request.query_params.get('date')

        if employee_id:
            records = records.filter(employee_id=employee_id)
        if department:
            records = records.filter(employee__department__name__icontains=department)
        if date_value:
            records = records.filter(date=date_value)

        return Response(AttendanceRecordSerializer(records.order_by('-date', '-clockIn'), many=True).data)


class HRAttendanceReportView(APIView):
    """GET /hr/attendance/report/?range=week|month&date=YYYY-MM-DD — per-employee
    and org-wide attendance analytics (late, no-shows, leave days, punctuality)
    for the week/month containing ``date`` (defaults to today)."""
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        range_kind = (request.query_params.get('range') or 'month').strip().lower()
        if range_kind not in ('week', 'month'):
            return Response({'error': "range must be 'week' or 'month'."},
                            status=status.HTTP_400_BAD_REQUEST)

        date_value = request.query_params.get('date')
        if date_value:
            anchor = parse_date(date_value)
            if not anchor:
                return Response({'error': 'date must be in YYYY-MM-DD format.'},
                                status=status.HTTP_400_BAD_REQUEST)
        else:
            anchor = timezone.localdate()

        return Response(reporting_service.build_report(range_kind, anchor))


class EmployeeLeaveRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        leave_requests = LeaveRequest.objects.select_related('employee', 'leaveType').filter(employee_id=employee_id)
        return Response(LeaveRequestSerializer(leave_requests, many=True, context={'request': request}).data)

    def post(self, request):
        serializer = LeaveRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        start_date = serializer.validated_data['startDate']
        end_date = serializer.validated_data['endDate']
        leave_type = serializer.validated_data['leaveType']

        leave_type_obj = leave_services.resolve_leave_type(leave_type)
        if not leave_type_obj:
            return Response({'error': f"Leave type '{leave_type}' is not configured."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Casual is not filed by employees — it's the label for no-show absence days,
        # detected from attendance and drawn from Annual automatically.
        if leave_type_obj.deducts_from_annual:
            return Response(
                {'error': f"{leave_type_obj.name} leave is tracked automatically from "
                          f"absences and cannot be requested."},
                status=status.HTTP_400_BAD_REQUEST)

        # Gender restriction (Maternity/Paternity) and once-per-employment (Hajj).
        eligible, eligibility_error = leave_services.check_eligibility(employee, leave_type_obj)
        if not eligible:
            return Response({'error': eligibility_error}, status=status.HTTP_400_BAD_REQUEST)

        overlap_exists = LeaveRequest.objects.filter(
            employee=employee,
            status__in=[LeaveRequest.STATUS_PENDING, LeaveRequest.STATUS_APPROVED],
            startDate__lte=end_date,
            endDate__gte=start_date,
        ).exists()
        if overlap_exists:
            return Response({'error': 'This leave request overlaps with an existing request.'}, status=status.HTTP_400_BAD_REQUEST)

        # Whole-day units exclude weekends and public holidays, and the cap comes
        # from the leave entitlement / balance (annual uses Egyptian Labor Law).
        days_requested, _balance, exceeded, eligibility_message = leave_services.evaluate_request(
            employee, leave_type, start_date, end_date)
        if days_requested <= 0:
            return Response(
                {'error': 'The requested period falls entirely on weekends/public holidays.'},
                status=status.HTTP_400_BAD_REQUEST)
        if exceeded:
            return Response({'error': eligibility_message}, status=status.HTTP_400_BAD_REQUEST)

        leave_request = LeaveRequest.objects.create(
            employee=employee,
            leaveType=leave_type_obj,
            startDate=start_date,
            endDate=end_date,
            daysRequested=days_requested,
            reason=serializer.validated_data.get('reason', ''),
            document=serializer.validated_data.get('document'),
            eligibilityMessage=eligibility_message,
        )
        return Response(LeaveRequestSerializer(leave_request, context={'request': request}).data,
                        status=status.HTTP_201_CREATED)


# ─── Leave balances ──────────────────────────────────────────────────────────

def _ensure_balances(employee, year):
    """Auto-create the employee's balances for the year: annual (computed
    entitlement) plus every configured LeaveType the employee can hold a balance
    for (skips Casual, which draws from Annual, gender-ineligible types, and
    once-used Hajj)."""
    leave_services.get_or_create_balance(employee, LeaveRequest.TYPE_ANNUAL, year)
    for leave_type in LeaveType.objects.all():
        if leave_services.should_have_balance(employee, leave_type):
            leave_services.get_or_create_balance(employee, leave_type.name, year)


def _balances_payload(employee, year):
    """Serialized balances for one employee + year, plus synthetic read-only rows
    for the types that draw from Annual (e.g. Casual): these stay selectable as
    leave types and report the shared Annual balance, but aren't stored separately."""
    _ensure_balances(employee, year)
    balances = list(LeaveBalance.objects.filter(employee=employee, year=year))
    data = LeaveBalanceSerializer(balances, many=True).data

    annual_data = next(
        (d for d in data if d['leaveTypeName'] == LeaveRequest.TYPE_ANNUAL), None)
    if annual_data is not None:
        # No-shows (no clock-in, no approved leave) are unpaid and also consumed
        # from the Annual pool, so they reduce the Annual + Casual remaining shown.
        no_show = leave_services.annual_extra_consumed(employee, year)
        annual_data['noShowDays'] = no_show
        if annual_data['entitledDays'] is not None:
            annual_data['remainingDays'] = (
                annual_data['entitledDays'] - annual_data['usedDays'] - no_show)
        for lt in LeaveType.objects.filter(deducts_from_annual=True):
            gender = (lt.restricted_to_gender or '').strip()
            if gender and (employee.gender or '') != gender:
                continue
            # Casual has no balance of its own: it's the label for no-show absence
            # days, capped at its own max (7) but still draining Annual past 7. It is
            # reported as a used/cap allowance and is NOT requestable.
            cap = lt.max_days_per_year
            synthetic = dict(annual_data)
            synthetic.update({
                'balanceID': f'annual-{lt.name.lower()}-{year}',
                'leaveTypeName': lt.name,
                'leaveType': lt.leave_type_id,
                'entitledDays': cap,
                'usedDays': min(no_show, cap) if cap is not None else no_show,
                'remainingDays': max(cap - no_show, 0) if cap is not None else None,
                'noShowDays': no_show,
                'drawsFromAnnual': True,
                'requestable': False,
            })
            data.append(synthetic)
    return data


class EmployeeLeaveBalanceView(APIView):
    """GET /employee/leave-balances/?year= — the caller's own balances."""
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        employee = Employee.objects.filter(pk=employee_id, isDeleted=False).first()
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        year = int(request.query_params.get('year') or timezone.localdate().year)
        return Response(_balances_payload(employee, year))


class HRLeaveBalanceView(APIView):
    """GET /hr/leave-balances/?employee_id=&year= — HR view of any employee's
    balances."""
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        year = int(request.query_params.get('year') or timezone.localdate().year)
        employee_id = request.query_params.get('employee_id')
        if employee_id:
            employee = Employee.objects.filter(pk=employee_id, isDeleted=False).first()
            if not employee:
                return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(_balances_payload(employee, year))

        balances = LeaveBalance.objects.select_related('employee').filter(
            year=year, employee__isDeleted=False)
        return Response(LeaveBalanceSerializer(balances, many=True).data)


# ─── Public holidays (HR config) ─────────────────────────────────────────────

class HRHolidayCalendarView(APIView):
    """GET /hr/holidays/?year= — effective Egyptian holidays (library combined
    with overrides) for the year."""
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        year = int(request.query_params.get('year') or timezone.localdate().year)
        return Response(holiday_service.effective_holidays_for_year(year))


class PublicHolidayListView(APIView):
    """GET /holidays/?year= — effective public holidays for the year, readable by
    any internal employee (used by the team calendars and leave pages)."""
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        year = int(request.query_params.get('year') or timezone.localdate().year)
        return Response(holiday_service.effective_holidays_for_year(year))


class HRHolidayOverrideListCreateView(APIView):
    """GET/POST /hr/holiday-overrides/ — HR add/remove adjustments on top of the
    holidays library."""
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        overrides = HolidayOverride.objects.all()
        year = request.query_params.get('year')
        if year:
            overrides = overrides.filter(date__year=year)
        return Response(HolidayOverrideSerializer(overrides, many=True).data)

    def post(self, request):
        serializer = HolidayOverrideCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        override, _ = HolidayOverride.objects.update_or_create(
            date=serializer.validated_data['date'],
            defaults={
                'name': serializer.validated_data.get('name', ''),
                'type': serializer.validated_data['type'],
                'createdBy': getattr(request.user, 'full_name', '') or request.user.email,
            },
        )
        return Response(HolidayOverrideSerializer(override).data, status=status.HTTP_201_CREATED)


class HRHolidayOverrideDetailView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def delete(self, request, override_id):
        override = HolidayOverride.objects.filter(pk=override_id).first()
        if not override:
            return Response({'error': 'Holiday override not found.'}, status=status.HTTP_404_NOT_FOUND)
        override.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Team-leader leave-request review ────────────────────────────────────────

class TeamLeaveRequestListView(APIView):
    """GET /attendance_leave/team/leave-requests/?status= — leave requests from
    the Team Leader's own team members (a TL's own request routes to HR, so it's
    excluded here). Each item carries the employee's balance for that leave type
    so the UI can show a remaining-days circle."""
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        qs = LeaveRequest.objects.select_related(
            'employee', 'leaveType', 'employee__user_account').filter(
            employee__isDeleted=False)

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader = Employee.objects.filter(
                employeeID=getattr(request.user, 'employee_id', None), isDeleted=False).first()
            if leader and leader.team_id:
                qs = qs.filter(employee__team=leader.team).exclude(employee_id=leader.employeeID)
            else:
                qs = qs.none()

        requests = list(qs.order_by('-requestedAt'))
        payload = LeaveRequestSerializer(requests, many=True, context={'request': request}).data
        for req_obj, item in zip(requests, payload):
            balance = leave_services.get_or_create_balance(
                req_obj.employee, req_obj.leaveType.name, req_obj.startDate.year)
            item['balance'] = {
                'entitledDays': balance.entitledDays,
                'usedDays': balance.usedDays,
                'remainingDays': balance.remainingDays,
            }
            item['employeeRole'] = req_obj.employee.role
        return Response(payload)


class TeamWeeklyCapacityView(APIView):
    """GET /attendance_leave/team/weekly-capacity/?team= — per-employee available
    work hours this week (weekly contracted hours minus public-holiday and
    approved-leave hours). HR/Admin see all active employees; a Team Leader sees
    their own team. Used as the denominator for the utilization rate."""
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone

        employees = Employee.objects.filter(isDeleted=False, employmentStatus='Active')

        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader = Employee.objects.filter(
                employeeID=getattr(request.user, 'employee_id', None), isDeleted=False).first()
            employees = employees.filter(team=leader.team) if (leader and leader.team_id) else employees.none()

        team = request.query_params.get('team')
        if team:
            employees = employees.filter(team__name__iexact=team)

        # weekOffset: 0 = current work week, +1 = next, -1 = previous (clamped).
        try:
            week_offset = int(request.query_params.get('weekOffset') or 0)
        except (TypeError, ValueError):
            week_offset = 0
        week_offset = max(-8, min(8, week_offset))
        reference = timezone.localdate() + timedelta(days=7 * week_offset)

        meta, rows = capacity.weekly_capacity(employees, reference=reference)
        return Response({**meta, 'weekOffset': week_offset, 'employees': rows})


class TeamPresenceTodayView(APIView):
    """GET /attendance_leave/team/presence/ — today's presence snapshot for the
    Team Leader's own team: who has clocked in (present), who is on approved
    leave today, and who is absent (no clock-in and not on leave). The leader's
    own record is excluded — this is about their team members."""
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        from django.utils import timezone
        today = timezone.localdate()

        employees = Employee.objects.filter(isDeleted=False, employmentStatus='Active')
        leader_id = getattr(request.user, 'employee_id', None)
        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader = Employee.objects.filter(employeeID=leader_id, isDeleted=False).first()
            employees = employees.filter(team=leader.team) if (leader and leader.team_id) else employees.none()
        employees = [e for e in employees if e.employeeID != leader_id]
        emp_ids = [e.employeeID for e in employees]

        present_ids = set(
            AttendanceRecord.objects.filter(
                employee_id__in=emp_ids, date=today, clockIn__isnull=False,
            ).values_list('employee_id', flat=True)
        )
        on_leave_ids = set(
            LeaveRequest.objects.filter(
                employee_id__in=emp_ids, status=LeaveRequest.STATUS_APPROVED,
                startDate__lte=today, endDate__gte=today,
            ).values_list('employee_id', flat=True)
        )

        present, on_leave, absent = [], [], []
        for emp in employees:
            entry = {'employeeID': emp.employeeID, 'employeeName': emp.fullName}
            if emp.employeeID in present_ids:
                present.append(entry)
            elif emp.employeeID in on_leave_ids:
                on_leave.append(entry)
            else:
                absent.append(entry)

        return Response({
            'date': today.isoformat(),
            'total': len(employees),
            'presentCount': len(present),
            'onLeaveCount': len(on_leave),
            'absentCount': len(absent),
            'present': present,
            'onLeave': on_leave,
            'absent': absent,
        })
