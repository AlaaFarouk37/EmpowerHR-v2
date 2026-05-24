from decimal import Decimal

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q
from accounts.permissions import IsHRManager, IsAdmin, IsInternalEmployee, IsTeamLeader
from employee_management.models import Employee, WorkTaskLog
from .models import AttendanceRecord, LeaveRequest
from .serializers import AttendanceRecordSerializer, LeaveRequestSerializer, AttendanceClockSerializer, LeaveRequestCreateSerializer


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
        if user.role == 'admin':
            return LeaveRequest.objects.all()
        elif user.role == 'hr_manager':
            return LeaveRequest.objects.all()
        else:
            return LeaveRequest.objects.filter(employee_id=user.employee_id)

    def perform_create(self, serializer):
        serializer.save()


class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return LeaveRequest.objects.all()
        elif user.role == 'hr_manager':
            return LeaveRequest.objects.all()
        else:
            return LeaveRequest.objects.filter(employee_id=user.employee_id)


@api_view(['POST'])
@permission_classes([IsHRManager | IsAdmin])
def approve_leave_request(request, pk):
    try:
        leave_request = LeaveRequest.objects.get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)

    leave_request.status = LeaveRequest.STATUS_APPROVED
    leave_request.reviewedBy = request.user.email
    leave_request.reviewedAt = timezone.now()
    leave_request.save()

    serializer = LeaveRequestSerializer(leave_request)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsHRManager | IsAdmin])
def reject_leave_request(request, pk):
    try:
        leave_request = LeaveRequest.objects.get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)

    leave_request.status = LeaveRequest.STATUS_REJECTED
    leave_request.reviewedBy = request.user.email
    leave_request.reviewedAt = timezone.now()
    leave_request.reviewNotes = request.data.get('reviewNotes', '')
    leave_request.save()

    serializer = LeaveRequestSerializer(leave_request)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsHRManager | IsAdmin])
def review_leave_request(request, pk):
    """Unified review endpoint. Body: {action: 'approve'|'reject', reviewNotes?: ''}."""
    action = (request.data.get('action') or '').strip().lower()
    if action not in ('approve', 'reject'):
        return Response(
            {'error': "action must be 'approve' or 'reject'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        leave_request = LeaveRequest.objects.get(pk=pk)
    except LeaveRequest.DoesNotExist:
        return Response({'error': 'Leave request not found'}, status=status.HTTP_404_NOT_FOUND)

    leave_request.status = LeaveRequest.STATUS_APPROVED if action == 'approve' else LeaveRequest.STATUS_REJECTED
    leave_request.reviewedBy = request.user.email
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


class EmployeeLeaveRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        leave_requests = LeaveRequest.objects.select_related('employee').filter(employee_id=employee_id)
        return Response(LeaveRequestSerializer(leave_requests, many=True).data)

    def post(self, request):
        serializer = LeaveRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        start_date = serializer.validated_data['startDate']
        end_date = serializer.validated_data['endDate']
        days_requested = (end_date - start_date).days + 1

        overlap_exists = LeaveRequest.objects.filter(
            employee=employee,
            status__in=[LeaveRequest.STATUS_PENDING, LeaveRequest.STATUS_APPROVED],
            startDate__lte=end_date,
            endDate__gte=start_date,
        ).exists()
        if overlap_exists:
            return Response({'error': 'This leave request overlaps with an existing request.'}, status=status.HTTP_400_BAD_REQUEST)

        leave_type = serializer.validated_data['leaveType']
        eligibility_message = 'Eligible for review.'
        if leave_type == LeaveRequest.TYPE_ANNUAL:
            approved_days = sum(
                item.daysRequested for item in LeaveRequest.objects.filter(
                    employee=employee,
                    leaveType=LeaveRequest.TYPE_ANNUAL,
                    status=LeaveRequest.STATUS_APPROVED,
                    startDate__year=start_date.year,
                )
            )
            if approved_days + days_requested > 21:
                return Response(
                    {'error': 'Annual leave eligibility exceeded the 21-day allowance.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            eligibility_message = f'Eligible. {21 - (approved_days + days_requested)} annual leave day(s) remaining after approval.'

        leave_request = LeaveRequest.objects.create(
            employee=employee,
            leaveType=leave_type,
            startDate=start_date,
            endDate=end_date,
            daysRequested=days_requested,
            reason=serializer.validated_data['reason'],
            eligibilityMessage=eligibility_message,
        )
        return Response(LeaveRequestSerializer(leave_request).data, status=status.HTTP_201_CREATED)
    
class HRLeaveRequestListView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        leave_requests = LeaveRequest.objects.select_related('employee').filter(employee__isDeleted=False)

        status_filter = request.query_params.get('status')
        department = request.query_params.get('department')
        if status_filter:
            leave_requests = leave_requests.filter(status=status_filter)
        if department:
            leave_requests = leave_requests.filter(employee__department__name__icontains=department)

        return Response(LeaveRequestSerializer(leave_requests, many=True).data)


class HRLeaveReviewView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, leave_request_id):
        try:
            leave_request = LeaveRequest.objects.select_related('employee').get(pk=leave_request_id)
        except LeaveRequest.DoesNotExist:
            return Response({'error': 'Leave request not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = LeaveReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if leave_request.status != LeaveRequest.STATUS_PENDING:
            return Response({'error': 'Only pending leave requests can be reviewed.'}, status=status.HTTP_400_BAD_REQUEST)

        leave_request.status = serializer.validated_data['status']
        leave_request.reviewNotes = serializer.validated_data.get('reviewNotes', '')
        leave_request.reviewedBy = getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '')
        leave_request.reviewedAt = timezone.now()
        leave_request.save(update_fields=['status', 'reviewNotes', 'reviewedBy', 'reviewedAt'])

        return Response(LeaveRequestSerializer(leave_request).data)    
