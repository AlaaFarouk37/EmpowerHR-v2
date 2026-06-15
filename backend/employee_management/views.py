from decimal import Decimal
from django.db.models import Avg, Count, Q
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model


from accounts.permissions import IsHRManager, IsInternalEmployee, IsTeamLeader, IsAdmin
from accounts.models import User
from .models import (
    Department, Team, Job, LeaveType, Employee, EmployeeJobHistory,
    RecognitionAward, BenefitEnrollment, ExpenseClaim, DocumentRequest, SupportTicket,
    SupportTicketMessage,
    EmployeeGoal, WorkTask, WorkTaskLog, TrainingCourse, PerformanceReview, ShiftSchedule, PolicyAnnouncement
)
from Attendance_and_Leave.models import AttendanceRecord, LeaveRequest
from Attendance_and_Leave.serializers import AttendanceRecordSerializer, LeaveRequestSerializer
from payroll.models import PayrollRecord
from payroll.serializers import PayrollRecordSerializer
from resume_pipeline.models import SuccessionPlan
from resume_pipeline.serializers import SuccessionPlanSerializer
from .serializers import (
    DepartmentSerializer, TeamSerializer, JobSerializer, LeaveTypeSerializer,
    EmployeeSerializer, EmployeeCreateUpdateSerializer, EmployeeJobHistorySerializer,
    EmployeeRoleChangeSerializer, EmployeeGoalSerializer, EmployeeGoalCreateSerializer,
    EmployeeGoalProgressSerializer, WorkTaskSerializer, WorkTaskCreateSerializer,
    WorkTaskProgressSerializer, WorkTaskLogSerializer, TrainingCourseSerializer, TrainingCourseCreateSerializer,
    TrainingProgressSerializer, PerformanceReviewSerializer, PerformanceReviewCreateSerializer,
    PerformanceReviewAcknowledgeSerializer, ShiftScheduleSerializer, ShiftScheduleCreateSerializer,
    ShiftScheduleAcknowledgeSerializer, PolicyAnnouncementSerializer, PolicyAnnouncementCreateSerializer,
    PolicyAnnouncementAcknowledgeSerializer, PolicyAnnouncementReminderSerializer,
    RecognitionAwardSerializer, RecognitionAwardCreateSerializer, BenefitEnrollmentSerializer,
    BenefitEnrollmentCreateSerializer, BenefitEnrollmentStatusSerializer, ExpenseClaimSerializer,
    ExpenseClaimCreateSerializer, ExpenseClaimReviewSerializer, DocumentRequestSerializer,
    DocumentRequestCreateSerializer, DocumentRequestIssueSerializer, SupportTicketSerializer,
    SupportTicketCreateSerializer, SupportTicketStatusSerializer,
    SupportTicketMessageSerializer, SupportTicketDetailSerializer
)


def _label(value):
    """Return the .name of an FK instance (Team / Department / Job), or '' if None."""
    return getattr(value, 'name', '') or ''


def _resolve_employee(employee_id, request_user=None):
    employee = Employee.objects.filter(pk=employee_id, isDeleted=False).first()
    if employee:
        return employee

    if request_user and getattr(request_user, 'employee_id', None) == employee_id:
        return Employee.objects.create(
            employeeID=employee_id,
            fullName=getattr(request_user, 'full_name', '') or request_user.email,
            employmentStatus='Active',
        )
    return None


def _can_manage_employee(request_user, employee):
    """HR/Admin can manage anyone; a TeamLeader can manage employees on their own team."""
    role = getattr(request_user, 'role', None)
    if role in ('HRManager', 'Admin'):
        return True
    if role == 'TeamLeader':
        leader_employee = Employee.objects.filter(
            employeeID=getattr(request_user, 'employee_id', None),
            isDeleted=False,
        ).first()
        if leader_employee and leader_employee.team_id and employee.team_id:
            return leader_employee.team_id == employee.team_id
    return False


# ============================================================================
# DEPARTMENT VIEWS
# ============================================================================

class DepartmentListCreateView(APIView):
    """
    GET  /api/employee_management/departments/        - List all departments
    POST /api/employee_management/departments/        - Create a new department (Admin only)
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]   # ✅ any logged-in user can read
        return [IsAuthenticated(), IsAdmin()]  # only admin can create

    def get(self, request):
        departments = Department.objects.all()
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = DepartmentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DepartmentDetailView(APIView):
    """
    GET    /api/employee_management/departments/<id>/  - Retrieve a department
    PUT    /api/employee_management/departments/<id>/  - Update a department (Admin only)
    DELETE /api/employee_management/departments/<id>/  - Delete a department (Admin only)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        try:
            return Department.objects.get(department_id=pk)
        except Department.DoesNotExist:
            return None

    def get(self, request, pk):
        department = self.get_object(pk)
        if not department:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DepartmentSerializer(department)
        return Response(serializer.data)

    def put(self, request, pk):
        department = self.get_object(pk)
        if not department:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DepartmentSerializer(department, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        department = self.get_object(pk)
        if not department:
            return Response({'error': 'Department not found'}, status=status.HTTP_404_NOT_FOUND)
        department.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# TEAM VIEWS
# ============================================================================

class TeamListCreateView(APIView):
    """
    GET  /api/employee_management/teams/        - List all teams
    POST /api/employee_management/teams/        - Create a new team (Admin only)
    """
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]   # ✅ any logged-in user can read
        return [IsAuthenticated(), IsAdmin()]  # only admin can create

    def get(self, request):
        teams = Team.objects.all()
        serializer = TeamSerializer(teams, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TeamSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TeamDetailView(APIView):
    """
    GET    /api/employee_management/teams/<id>/  - Retrieve a team
    PUT    /api/employee_management/teams/<id>/  - Update a team (Admin only)
    DELETE /api/employee_management/teams/<id>/  - Delete a team (Admin only)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        try:
            return Team.objects.get(team_id=pk)
        except Team.DoesNotExist:
            return None

    def get(self, request, pk):
        team = self.get_object(pk)
        if not team:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TeamSerializer(team)
        return Response(serializer.data)

    def put(self, request, pk):
        team = self.get_object(pk)
        if not team:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TeamSerializer(team, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        team = self.get_object(pk)
        if not team:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# JOB VIEWS
# ============================================================================

class JobListCreateView(APIView):
    """
    GET  /api/employee_management/jobs/        - List all jobs
    POST /api/employee_management/jobs/        - Create a new job (Admin only)
    """
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]   # ✅ any logged-in user can read
        return [IsAuthenticated(), IsAdmin()]  # only admin can create

    def get(self, request):
        jobs = Job.objects.all()
        serializer = JobSerializer(jobs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = JobSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JobDetailView(APIView):
    """
    GET    /api/employee_management/jobs/<id>/  - Retrieve a job
    PUT    /api/employee_management/jobs/<id>/  - Update a job (Admin only)
    DELETE /api/employee_management/jobs/<id>/  - Delete a job (Admin only)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        try:
            return Job.objects.get(job_id=pk)
        except Job.DoesNotExist:
            return None

    def get(self, request, pk):
        job = self.get_object(pk)
        if not job:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobSerializer(job)
        return Response(serializer.data)

    def put(self, request, pk):
        job = self.get_object(pk)
        if not job:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = JobSerializer(job, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        job = self.get_object(pk)
        if not job:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JobBenchmarkSalaryView(APIView):
    """
    POST /api/employee_management/jobs/<pk>/benchmark/
    Allows HR Manager (or Admin) to set the benchmark salary for a job role.
    Body: { "benchmark_salary": <number> }
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, pk):
        try:
            job = Job.objects.get(job_id=pk)
        except Job.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        raw = request.data.get('benchmark_salary')
        if raw is None or str(raw).strip() == '':
            return Response({'error': 'benchmark_salary is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            value = float(raw)
        except (TypeError, ValueError):
            return Response({'error': 'benchmark_salary must be a number.'}, status=status.HTTP_400_BAD_REQUEST)
        if value < 0:
            return Response({'error': 'benchmark_salary cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

        job.benchmark_salary = value
        job.save(update_fields=['benchmark_salary'])
        return Response(JobSerializer(job).data)


# ── External salary benchmark provider (api.egytech.fyi) ─────────────────────
# Calls the public EgyTech salary stats API to fetch the market median salary
# for each distinct (jobTitle, jobLevel) combo currently held by employees.
# Endpoint: GET https://api.egytech.fyi/stats?title=<api_title>&level=<api_level>

import json
import urllib.parse
import urllib.request

EGYTECH_API_BASE = 'https://api.egytech.fyi/stats'

import re

# Map free-form jobTitle text → one of the 10 EgyTech buckets the API actually
# returns data for: backend, frontend, fullstack, mobile, embedded, security,
# crm, ui_ux, testing, research. Anything else is left unmatched (api_title
# will be None) so the row shows "No match" instead of being silently
# benchmarked against the API's misleading global-aggregate fallback.
#
# Each rule is (kind, pattern, api_title). kind='word' matches as a whole token
# (so "QA" matches but "qatar" doesn't); kind='sub' is plain substring match.
# api_title=None marks an explicit non-match — used to stop generic
# fall-throughs (like 'engineer'/'developer') from claiming roles whose
# domain doesn't have a real EgyTech bucket (data, devops, ML, etc.).
# Order matters: most specific first.
_TITLE_RULES = [
    # ── Data ─────────────────────────────────────────────────────────────────
    ('sub',  'data scientist',     'data_scientist'),
    ('sub',  'data science',       'data_scientist'),
    ('sub',  'data engineer',      'data_engineer'),
    ('sub',  'data analyst',       'data_analytics'),
    ('sub',  'data analysis',      'data_analytics'),
    ('sub',  'data analytics',     'data_analytics'),
    ('sub',  'business analyst',   'data_analytics'),
    ('sub',  'bi analyst',         'data_analytics'),
    ('sub',  'business intelligence','data_analytics'),
    # ── AI / ML / Automation → ai_automation ─────────────────────────────────
    ('sub',  'machine learning',   'ai_automation'),
    ('sub',  'ml engineer',        'ai_automation'),
    ('sub',  'ai engineer',        'ai_automation'),
    ('sub',  'ai automation',      'ai_automation'),
    ('sub',  'automation engineer','ai_automation'),
    # ── DevOps / SRE / Cloud / Platform → devops_sre_platform ────────────────
    ('sub',  'devops',             'devops_sre_platform'),
    ('sub',  'site reliab',        'devops_sre_platform'),
    ('word', 'sre',                'devops_sre_platform'),
    ('sub',  'platform engineer',  'devops_sre_platform'),
    ('sub',  'cloud engineer',     'devops_sre_platform'),
    ('sub',  'infrastructure',     'devops_sre_platform'),
    ('sub',  'database admin',     'devops_sre_platform'),
    # ── Management ───────────────────────────────────────────────────────────
    ('sub',  'product manager',    'product_manager'),
    ('sub',  'product owner',      'product_owner'),
    ('sub',  'engineering manager','engineering_manager'),
    ('sub',  'engineering director','engineering_manager'),
    # Executives → 'executive'
    ('word', 'cto',                'executive'),
    ('word', 'ceo',                'executive'),
    ('word', 'cfo',                'executive'),
    ('word', 'cio',                'executive'),
    ('word', 'cpo',                'executive'),
    ('sub',  'chief executive',    'executive'),
    ('sub',  'chief technology',   'executive'),
    # Scrum → real bucket; project_manager / tech-lead / team-lead → no bucket
    ('sub',  'scrum master',       'scrum'),
    ('word', 'scrum',              'scrum'),
    ('sub',  'project manager',    'engineering_manager'),
    ('sub',  'tech lead',          'engineering_manager'),
    ('sub',  'team lead',          'engineering_manager'),
    # ── Architecture ─────────────────────────────────────────────────────────
    ('sub',  'system architect',   'system_arch'),
    ('sub',  'solutions architect','system_arch'),
    ('sub',  'software architect', 'system_arch'),
    ('sub',  'enterprise architect','system_arch'),
    # ── Support ──────────────────────────────────────────────────────────────
    ('sub',  'technical support',  'technical_support'),
    ('sub',  'tech support',       'technical_support'),
    ('sub',  'it support',         'technical_support'),
    ('sub',  'helpdesk',           'technical_support'),
    ('sub',  'help desk',          'technical_support'),
    # ── Real tech buckets ────────────────────────────────────────────────────
    ('sub',  'frontend',           'frontend'),
    ('sub',  'front end',          'frontend'),
    ('sub',  'front-end',          'frontend'),
    # Fullstack — must precede backend / engineer fall-throughs.
    ('sub',  'full stack',         'fullstack'),
    ('sub',  'fullstack',          'fullstack'),
    ('sub',  'full-stack',         'fullstack'),
    # UI / UX
    ('word', 'ui',                 'ui_ux'),
    ('word', 'ux',                 'ui_ux'),
    ('sub',  'designer',           'ui_ux'),
    # Testing / QA — EgyTech's bucket is 'testing' (not 'qa').
    ('word', 'qa',                 'testing'),
    ('sub',  'quality',            'testing'),
    ('sub',  'tester',             'testing'),
    ('sub',  'testing',            'testing'),
    ('sub',  'test engineer',      'testing'),
    ('word', 'crm',                'crm'),
    ('sub',  'security',           'security'),    # also catches 'cyber security'
    ('sub',  'mobile',             'mobile'),
    ('word', 'ios',                'mobile'),
    ('sub',  'android',            'mobile'),
    ('sub',  'embedded',           'embedded'),
    ('sub',  'hardware',           'hardware'),
    ('sub',  'research',           'research'),
    # Backend (least specific tech fall-through — keep last among real rules).
    ('sub',  'backend',            'backend'),
    ('sub',  'back end',           'backend'),
    ('sub',  'back-end',           'backend'),
    ('sub',  'software',           'backend'),
    ('sub',  'engineer',           'backend'),
    ('sub',  'developer',          'backend'),
]

_LEVEL_RULES = [
    ('sub',  'intern',        'junior'),
    ('sub',  'trainee',       'junior'),
    ('sub',  'entry',         'junior'),
    ('sub',  'junior',        'junior'),
    ('sub',  'associate',     'junior'),
    ('sub',  'senior',        'senior'),
    ('word', 'lead',          'senior'),
    ('sub',  'principal',     'senior'),
    ('word', 'staff',         'senior'),
    ('sub',  'manager',       'senior'),
    ('sub',  'director',      'senior'),
    ('word', 'head',          'senior'),
    ('sub',  'chief',         'senior'),
    ('word', 'vp',            'senior'),
    ('word', 'mid',           'mid'),
    ('sub',  'mid-level',     'mid'),
    ('sub',  'intermediate',  'mid'),
]


def _matches(haystack, kind, pattern):
    if kind == 'sub':
        return pattern in haystack
    # 'word' — match as a whole token
    return re.search(rf'\b{re.escape(pattern)}\b', haystack) is not None


# Verbatim EgyTech bucket names. The API only has distinct data for these 17
# titles — anything else silently falls back to the global aggregate
# (per-level: 856/16000 junior, 2125/27000 mid, 459/49700 senior), which would
# be misleading. Verified by probing the API directly.
_API_TITLES = {
    'backend', 'frontend', 'fullstack', 'mobile', 'embedded', 'hardware',
    'security', 'crm', 'ui_ux', 'testing', 'research', 'executive',
    'data_scientist', 'data_engineer', 'ai_automation','product_owner','research','scrum','system_arch',
    'product_manager', 'engineering_manager','data_analytics','devops_sre_platform','technical_support',
}
# Note: API expects 'junior'/'mid'/'senior' WITHOUT a '_level' suffix. Sending
# 'junior_level' etc. is silently mis-handled and returns wrong slices.
_API_LEVELS = {'junior', 'mid', 'senior'}


def _map_to_api_title(job_title):
    title = (job_title or '').strip().lower()
    if not title:
        return None
    if title in _API_TITLES:
        return title
    for kind, pattern, api_title in _TITLE_RULES:
        if _matches(title, kind, pattern):
            # api_title may be None — an explicit "no real bucket" rule that
            # blocks generic fall-throughs from claiming this title.
            return api_title
    return None


def _map_to_api_level(job_level, job_title=''):
    raw_level = (job_level or '').strip().lower()
    if raw_level in _API_LEVELS:
        return raw_level
    haystack = f'{raw_level} {(job_title or "").strip().lower()}'
    for kind, pattern, api_level in _LEVEL_RULES:
        if _matches(haystack, kind, pattern):
            return api_level
    return 'mid_level'


def _fetch_egytech_stats(api_title, api_level, cache):
    """Calls api.egytech.fyi for one (title, level) combo, with simple caching."""
    cache_key = f'{api_title}|{api_level or ""}'
    if cache_key in cache:
        return cache[cache_key]

    params = {'title': api_title}
    if api_level:
        params['level'] = api_level
    url = f'{EGYTECH_API_BASE}?{urllib.parse.urlencode(params)}'

    try:
        # api.egytech.fyi sits behind a CDN that 403s the default
        # `Python-urllib/X.Y` User-Agent, so send a browser-style UA.
        req = urllib.request.Request(url, headers={
            'accept': 'application/json',
            'user-agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0 Safari/537.36'
            ),
        })
        with urllib.request.urlopen(req, timeout=10) as response:
            payload = json.loads(response.read().decode('utf-8'))
        stats = payload.get('stats') or {}
        result = {
            'median': stats.get('median'),
            'p20': stats.get('p20Compensation'),
            'p75': stats.get('p75Compensation'),
            'p90': stats.get('p90Compensation'),
            'sample_size': stats.get('totalCount'),
            'error': None,
        }
    except Exception as exc:
        result = {
            'median': None, 'p20': None, 'p75': None, 'p90': None,
            'sample_size': None, 'error': str(exc),
        }
    cache[cache_key] = result
    return result


def _pick_benchmark(stats):
    """Pick the best representative salary from the stats payload.

    Prefer median; if missing, fall back to the midpoint of p20 and p75 (a fair
    proxy for the centre), then to whichever single percentile is available.
    Returns None only when the API returned no usable data at all.
    """
    if not stats:
        return None
    median = stats.get('median')
    if median:
        return median
    p20, p75 = stats.get('p20'), stats.get('p75')
    if p20 and p75:
        return round((p20 + p75) / 2, 2)
    return p75 or stats.get('p90') or p20 or None


class HRSalaryBenchmarkView(APIView):
    """
    GET /api/employee_management/hr/salary-benchmark/
    Calls the EgyTech salary benchmark API for every distinct (jobTitle, jobLevel)
    combo currently held by employees and returns the market median for each.
    Frontend joins this with employee base salaries to surface variance per employee.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        combos = (
            Employee.objects.filter(isDeleted=False, job__isnull=False)
            .values_list('job__title', 'job__level')
            .distinct()
        )
        cache = {}
        results = []
        for title, level in combos:
            api_title = _map_to_api_title(title)
            api_level = _map_to_api_level(level, title) if api_title else None
            stats = _fetch_egytech_stats(api_title, api_level, cache) if api_title else None

            results.append({
                'jobTitle': title or '',
                'jobLevel': level or '',
                'benchmark_salary': _pick_benchmark(stats),
                'median': stats.get('median') if stats else None,
                'p20': stats.get('p20') if stats else None,
                'p75': stats.get('p75') if stats else None,
                'p90': stats.get('p90') if stats else None,
                'sample_size': stats.get('sample_size') if stats else None,
                'currency': 'EGP',
                'source': 'api.egytech.fyi',
                'mapped_title': api_title,
                'mapped_level': api_level,
                'error': stats.get('error') if stats else 'No tech-bucket mapping for this title',
            })
        return Response(results)


# ============================================================================
# LEAVE TYPE VIEWS
# ============================================================================

class LeaveTypeListCreateView(APIView):
    """
    GET  /api/employee_management/leave-types/        - List all leave types
    POST /api/employee_management/leave-types/        - Create a new leave type (Admin only)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        leave_types = LeaveType.objects.all()
        serializer = LeaveTypeSerializer(leave_types, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = LeaveTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LeaveTypeDetailView(APIView):
    """
    GET    /api/employee_management/leave-types/<id>/  - Retrieve a leave type
    PUT    /api/employee_management/leave-types/<id>/  - Update a leave type (Admin only)
    DELETE /api/employee_management/leave-types/<id>/  - Delete a leave type (Admin only)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        try:
            return LeaveType.objects.get(leave_type_id=pk)
        except LeaveType.DoesNotExist:
            return None

    def get(self, request, pk):
        leave_type = self.get_object(pk)
        if not leave_type:
            return Response({'error': 'Leave type not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = LeaveTypeSerializer(leave_type)
        return Response(serializer.data)

    def put(self, request, pk):
        leave_type = self.get_object(pk)
        if not leave_type:
            return Response({'error': 'Leave type not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = LeaveTypeSerializer(leave_type, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        leave_type = self.get_object(pk)
        if not leave_type:
            return Response({'error': 'Leave type not found'}, status=status.HTTP_404_NOT_FOUND)
        leave_type.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# EMPLOYEE VIEWS
# ============================================================================

class HREmployeeListCreateView(APIView):
    """
    GET  /api/employee_management/hr/employees/        list/search/filter employees
    POST /api/employee_management/hr/employees/        create an employee directory record
    """
    User = get_user_model()
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated(), IsTeamLeader()]
        return [IsAuthenticated(), IsHRManager()]

    def get(self, request):
        qs = Employee.objects.filter(isDeleted=False).order_by('fullName', 'employeeID')
        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader = Employee.objects.filter(
                employeeID=getattr(request.user, 'employee_id', None),
                isDeleted=False,
            ).first()
            if not leader or not leader.team:
                return Response([])
            qs = qs.filter(team=leader.team).exclude(employeeID=leader.employeeID)

        search = (request.query_params.get('search') or '').strip()
        department = (request.query_params.get('department') or '').strip()
        role = (request.query_params.get('role') or '').strip()
        employee_type = (request.query_params.get('type') or '').strip()
        location = (request.query_params.get('location') or '').strip()
        status_filter = (request.query_params.get('status') or '').strip()

        if search:
            qs = qs.filter(
                Q(fullName__icontains=search)
                | Q(user_account__email__icontains=search)
                | Q(employeeID__icontains=search)
                | Q(job__title__icontains=search)
                | Q(department__name__icontains=search)
            )
        if department:
            qs = qs.filter(department__name__icontains=department)
        if role:
            qs = qs.filter(user_account__role__icontains=role)
        if employee_type:
            qs = qs.filter(employeeType__icontains=employee_type)
        if location:
            qs = qs.filter(location__icontains=location)
        if status_filter:
            qs = qs.filter(employmentStatus__icontains=status_filter)

        return Response(EmployeeSerializer(qs, many=True).data)

    

    def post(self, request):
        serializer = EmployeeCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        role  = request.data.get('role', User.Role.TEAM_MEMBER)
        email = request.data.get('email', '').strip().lower()
        full_name = request.data.get('fullName', '').strip()

        # Save employee first
        employee = serializer.save()

        # Create linked User with the correct role
        # (User.save() would auto-create a blank Employee — we bypass that with update())
        user = User(
            email=email,
            full_name=full_name,
            role=role,
            employee=employee,
        )
        user.set_unusable_password()
        user.save()

        # Link back to employee in case save() created a duplicate
        User.objects.filter(pk=user.pk).update(employee=employee)

        return Response(EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED)


class HREmployeeDetailView(APIView):
    """
    GET    /api/employee_management/hr/employees/<employee_id>/   retrieve employee
    PUT    /api/employee_management/hr/employees/<employee_id>/   update employee
    DELETE /api/employee_management/hr/employees/<employee_id>/   soft-delete employee
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get_object(self, employee_id):
        try:
            return Employee.objects.get(pk=employee_id, isDeleted=False)
        except Employee.DoesNotExist:
            return None

    def get(self, request, employee_id):
        employee = self.get_object(employee_id)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(EmployeeSerializer(employee).data)

    def put(self, request, employee_id):
        employee = self.get_object(employee_id)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmployeeCreateUpdateSerializer(employee, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = serializer.save()
        return Response(EmployeeSerializer(employee).data)

    def delete(self, request, employee_id):
        employee = self.get_object(employee_id)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        employee.isDeleted = True
        employee.employmentStatus = 'Archived'
        employee.save(update_fields=['isDeleted', 'employmentStatus'])
        return Response({'message': 'Employee archived successfully.'}, status=status.HTTP_200_OK)








class HREmployeeRoleChangeView(APIView):
    """
    POST /api/feedback/hr/employees/<employee_id>/change-role/
    Promote / demote an employee and automatically log the change.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, employee_id):
        try:
            employee = Employee.objects.get(pk=employee_id, isDeleted=False)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmployeeRoleChangeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        updates = {}
        user_updates = []
        user_account = getattr(employee, 'user_account', None)

        previous_job_title = employee.jobTitle
        previous_role = employee.role
        previous_department = _label(employee.department)
        previous_team = _label(employee.team)
        previous_income = employee.monthlyIncome

        new_role = data.get('role', employee.role)
        new_income = data.get('monthlyIncome', employee.monthlyIncome)
        new_currency = data.get('currency_preference', employee.currency_preference)

        if 'job' in data:
            new_job = data.get('job')
            if (new_job.pk if new_job else None) != employee.job_id:
                employee.job = new_job
                updates['job'] = new_job
        if new_role and user_account and new_role != user_account.role:
            user_account.role = new_role
            user_updates.append('role')
        if 'department' in data:
            new_department = data.get('department')
            if (new_department.pk if new_department else None) != employee.department_id:
                employee.department = new_department
                updates['department'] = new_department
        if 'team' in data:
            new_team = data.get('team')
            if (new_team.pk if new_team else None) != employee.team_id:
                employee.team = new_team
                updates['team'] = new_team
        if new_income != employee.monthlyIncome:
            employee.monthlyIncome = new_income
            updates['monthlyIncome'] = new_income
        if new_currency and user_account and new_currency != user_account.currency_preference:
            user_account.currency_preference = new_currency
            if 'currency_preference' not in user_updates:
                user_updates.append('currency_preference')

        if not updates and not user_updates:
            return Response({'error': 'No promotion/demotion changes were provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # numberOfPromotions is a read-only computed property (counts 'Promotion'
        # job-history rows), so it auto-increments when the history entry below is
        # created — no manual assignment needed.

        if updates:
            employee.save(update_fields=list(updates.keys()))
        if user_updates:
            user_account.save(update_fields=user_updates)

        history_entry = EmployeeJobHistory.objects.create(
            employee=employee,
            action=data['action'],
            previousJobTitle=previous_job_title,
            newJobTitle=employee.jobTitle,
            previousRole=previous_role,
            newRole=employee.role,
            previousDepartment=previous_department,
            newDepartment=_label(employee.department),
            previousTeam=previous_team,
            newTeam=_label(employee.team),
            previousMonthlyIncome=previous_income,
            newMonthlyIncome=employee.monthlyIncome,
            changedBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
            notes=data.get('notes', ''),
        )

        return Response({
            'message': f"{data['action']} saved and logged successfully.",
            'employee': EmployeeSerializer(employee).data,
            'history': EmployeeJobHistorySerializer(history_entry).data,
        })

class HREmployeeHistoryView(APIView):
    """
    GET /api/employee_management/hr/employees/<employee_id>/history/
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request, employee_id):
        try:
            employee = Employee.objects.get(pk=employee_id, isDeleted=False)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        history = employee.job_history.all()
        return Response(EmployeeJobHistorySerializer(history, many=True).data)


class HRRosterHealthView(APIView):
    """
    GET /api/employee_management/hr/employees/roster-health/
    Returns directory health and workforce follow-up priorities for HR.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        employees = list(Employee.objects.filter(isDeleted=False).order_by('fullName', 'employeeID'))
        employee_ids = [employee.employeeID for employee in employees]
        recent_cutoff = timezone.now() - timedelta(days=90)

        recent_history = list(
            EmployeeJobHistory.objects.select_related('employee')
            .filter(employee__isDeleted=False, changedAt__gte=recent_cutoff)
            .order_by('-changedAt')
        )
        recent_history_by_employee = {}
        for item in recent_history:
            recent_history_by_employee.setdefault(item.employee_id, []).append(item)

        latest_predictions = {}
        try:
            from attrition.models import AttritionPrediction

            for prediction in AttritionPrediction.objects.filter(employeeID_id__in=employee_ids).order_by('employeeID_id', '-predictedAt'):
                latest_predictions.setdefault(prediction.employeeID_id, prediction)
        except Exception:
            latest_predictions = {}

        department_breakdown = {}
        follow_up_items = []
        incomplete_profiles = 0
        attrition_follow_up = 0

        for employee in employees:
            department_label = _label(employee.department) or 'Unassigned'
            department_breakdown.setdefault(
                department_label,
                {
                    'department': department_label,
                    'employees': 0,
                    'followUpCount': 0,
                    'highPriorityCount': 0,
                    'incompleteProfiles': 0,
                },
            )
            department_breakdown[department_label]['employees'] += 1

            missing_fields = []
            if not (employee.jobTitle or '').strip():
                missing_fields.append('Job title missing')
            if not _label(employee.department).strip():
                missing_fields.append('Department missing')
            if not (employee.location or '').strip():
                missing_fields.append('Location missing')
            if employee.monthlyIncome in (None, ''):
                missing_fields.append('Salary missing')

            if missing_fields:
                incomplete_profiles += 1
                department_breakdown[department_label]['incompleteProfiles'] += 1

            prediction = latest_predictions.get(employee.employeeID)
            if prediction and prediction.riskLevel in ('High', 'Medium'):
                attrition_follow_up += 1

            risk_flags = []
            recommended_actions = []

            if missing_fields:
                risk_flags.append('Incomplete directory profile')
                recommended_actions.append('Complete core directory, location, and payroll fields for this employee.')
            if prediction and prediction.riskLevel in ('High', 'Medium'):
                risk_flags.append(f'{prediction.riskLevel} attrition risk')
                recommended_actions.append(
                    'Schedule a retention check-in with the manager this week.'
                    if prediction.riskLevel == 'High'
                    else 'Monitor engagement and workload signals over the next 2 weeks.'
                )
            if employee.employmentStatus == 'Probation':
                risk_flags.append('Probation review due')
                recommended_actions.append('Confirm probation goals and manager feedback are documented.')
            if employee.employmentStatus == 'On Leave':
                risk_flags.append('Leave coverage planning')
                recommended_actions.append('Review handover and return-to-work planning.')
            if recent_history_by_employee.get(employee.employeeID):
                risk_flags.append('Recent role movement')

            if not risk_flags:
                continue

            if (prediction and prediction.riskLevel == 'High') or employee.employmentStatus == 'Probation' or len(missing_fields) >= 2:
                priority = 'High'
            elif (prediction and prediction.riskLevel == 'Medium') or missing_fields or employee.employmentStatus == 'On Leave':
                priority = 'Medium'
            else:
                priority = 'Watch'

            department_breakdown[department_label]['followUpCount'] += 1
            if priority == 'High':
                department_breakdown[department_label]['highPriorityCount'] += 1

            latest_change = recent_history_by_employee.get(employee.employeeID, [None])[0]
            follow_up_items.append({
                'employeeID': employee.employeeID,
                'employeeName': employee.fullName,
                'department': _label(employee.department),
                'jobTitle': employee.jobTitle,
                'employmentStatus': employee.employmentStatus,
                'priority': priority,
                'riskLevel': prediction.riskLevel if prediction else 'Low',
                'riskScore': round(float(prediction.riskScore), 4) if prediction else 0,
                'flags': risk_flags,
                'recommendedAction': recommended_actions[0] if recommended_actions else 'Monitor this employee in the next review cycle.',
                'lastMovementAt': latest_change.changedAt if latest_change else None,
            })

        priority_order = {'High': 2, 'Medium': 1, 'Watch': 0}
        follow_up_items.sort(
            key=lambda item: (priority_order.get(item['priority'], 0), item['riskScore'], len(item['flags'])),
            reverse=True,
        )

        department_summary = sorted(
            department_breakdown.values(),
            key=lambda item: (item['highPriorityCount'], item['followUpCount'], item['employees']),
            reverse=True,
        )

        return Response({
            'summary': {
                'trackedEmployees': len(employees),
                'activeEmployees': sum(1 for employee in employees if employee.employmentStatus == 'Active'),
                'incompleteProfiles': incomplete_profiles,
                'attritionFollowUp': attrition_follow_up,
                'probationCases': sum(1 for employee in employees if employee.employmentStatus == 'Probation'),
                'recentMovements': len(recent_history),
                'followUpCount': len(follow_up_items),
            },
            'departmentBreakdown': department_summary,
            'followUpItems': follow_up_items[:8],
        })


class HREmployeeSnapshotView(APIView):
    """
    GET /api/employee_management/hr/employees/<employee_id>/snapshot/
    Returns a unified Employee 360 snapshot for HR.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request, employee_id):
        try:
            employee = Employee.objects.get(pk=employee_id, isDeleted=False)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        attendance_records = AttendanceRecord.objects.select_related('employee').filter(employee=employee).order_by('-date', '-clockIn')
        leave_requests = LeaveRequest.objects.select_related('employee').filter(employee=employee).order_by('-requestedAt')
        payroll_records = PayrollRecord.objects.select_related('employee').filter(employee=employee).order_by('-payPeriod', '-createdAt')
        goals = EmployeeGoal.objects.select_related('employee').filter(employee=employee).order_by('-updatedAt', '-createdAt')
        tasks = WorkTask.objects.select_related('employee').filter(employee=employee).order_by('-updatedAt', '-createdAt')
        reviews = PerformanceReview.objects.select_related('employee').filter(employee=employee).order_by('-reviewDate', '-createdAt')
        benefits = BenefitEnrollment.objects.select_related('employee').filter(employee=employee).order_by('-createdAt')
        expenses = ExpenseClaim.objects.select_related('employee').filter(employee=employee).order_by('-expenseDate', '-createdAt')
        documents = DocumentRequest.objects.select_related('employee').filter(employee=employee).order_by('-createdAt')
        tickets = SupportTicket.objects.select_related('employee').filter(employee=employee).order_by('-updatedAt', '-createdAt')
        history = employee.job_history.all().order_by('-changedAt')
        recognition = RecognitionAward.objects.select_related('employee').filter(employee=employee).order_by('-recognitionDate', '-createdAt')

        training_courses = [
            course for course in TrainingCourse.objects.all().order_by('dueDate', '-createdAt')
            if employee.employeeID in (course.assignedEmployeeIDs or [])
        ]

        completed_training = sum(
            1
            for course in training_courses
            if (course.completionData or {}).get(employee.employeeID, {}).get('status') == 'Completed'
        )

        attendance_completed = attendance_records.filter(status__in=[AttendanceRecord.STATUS_PRESENT, AttendanceRecord.STATUS_PARTIAL]).count()
        attendance_rate = round((attendance_completed / max(attendance_records.count(), 1)) * 100, 1) if attendance_records.exists() else 0
        latest_payroll = payroll_records.first()
        avg_review = reviews.aggregate(avg=Avg('overallRating')).get('avg') or 0

        attrition_payload = None
        try:
            from attrition.models import AttritionPrediction
            from attrition.serializers import AttritionPredictionSerializer

            latest_prediction = AttritionPrediction.objects.filter(employeeID=employee).order_by('-predictedAt').first()
            if latest_prediction:
                attrition_payload = AttritionPredictionSerializer(latest_prediction).data
        except Exception:
            attrition_payload = None

        return Response({
            'employee': EmployeeSerializer(employee).data,
            'summary': {
                'activeGoals': goals.exclude(status='Completed').count(),
                'completedGoals': goals.filter(status='Completed').count(),
                'openTasks': tasks.exclude(status__in=['Done', 'Completed']).count(),
                'completedTasks': tasks.filter(status__in=['Done', 'Completed']).count(),
                'assignedTraining': len(training_courses),
                'completedTraining': completed_training,
                'pendingLeave': leave_requests.filter(status='Pending').count(),
                'openTickets': tickets.filter(status__in=['Open', 'In Progress']).count(),
                'pendingDocuments': documents.filter(status__in=['Pending', 'In Progress']).count(),
                'pendingExpenses': expenses.filter(status='Submitted').count(),
                'recognitionCount': recognition.count(),
                'attendanceRate': attendance_rate,
                'lastAttendanceStatus': attendance_records.first().status if attendance_records.exists() else 'No Records',
                'latestNetPay': float(latest_payroll.netPay) if latest_payroll else 0.0,
                'latestPayPeriod': latest_payroll.payPeriod if latest_payroll else '',
                'averageReviewRating': round(float(avg_review), 2) if avg_review else 0,
            },
            'attrition': attrition_payload,
            'history': EmployeeJobHistorySerializer(history[:6], many=True).data,
            'attendance': AttendanceRecordSerializer(attendance_records[:5], many=True).data,
            'leaveRequests': LeaveRequestSerializer(leave_requests[:5], many=True).data,
            'payroll': PayrollRecordSerializer(payroll_records[:3], many=True).data,
            'goals': EmployeeGoalSerializer(goals[:5], many=True).data,
            'tasks': WorkTaskSerializer(tasks[:5], many=True).data,
            'training': TrainingCourseSerializer(training_courses[:5], many=True, context={'employee_id': employee.employeeID}).data,
            'reviews': PerformanceReviewSerializer(reviews[:4], many=True).data,
            'benefits': BenefitEnrollmentSerializer(benefits[:4], many=True).data,
            'expenses': ExpenseClaimSerializer(expenses[:4], many=True).data,
            'documents': DocumentRequestSerializer(documents[:4], many=True).data,
            'tickets': SupportTicketSerializer(tickets[:4], many=True).data,
        })





class EmployeeGoalListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        goals = EmployeeGoal.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        if status_filter:
            goals = goals.filter(status=status_filter)

        return Response(EmployeeGoalSerializer(goals, many=True).data)


class EmployeeGoalProgressView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, goal_id):
        try:
            goal = EmployeeGoal.objects.select_related('employee').get(pk=goal_id)
        except EmployeeGoal.DoesNotExist:
            return Response({'error': 'Goal not found.'}, status=status.HTTP_404_NOT_FOUND)

        request_employee_id = getattr(request.user, 'employee_id', None)
        if goal.employee_id != request_employee_id and getattr(request.user, 'role', None) not in ('HRManager', 'Admin'):
            return Response({'error': 'You can only update your own goals.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = EmployeeGoalProgressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        updates = {}
        if 'status' in data:
            goal.status = data['status']
            updates['status'] = data['status']
        if 'progress' in data:
            goal.progress = data['progress']
            updates['progress'] = data['progress']

        if updates:
            goal.save(update_fields=updates)

        return Response(EmployeeGoalSerializer(goal).data)


class TeamGoalListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        team = getattr(getattr(request.user, 'employee', None), 'team', None)
        if not team:
            return Response({'error': 'Team information not available.'}, status=status.HTTP_400_BAD_REQUEST)

        goals = EmployeeGoal.objects.select_related('employee').filter(
            employee__team=team, employee__isDeleted=False
        ).order_by('-createdAt')

        return Response(EmployeeGoalSerializer(goals, many=True).data)

    def post(self, request):
        team = getattr(getattr(request.user, 'employee', None), 'team', None)
        if not team:
            return Response({'error': 'Team information not available.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = EmployeeGoalCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        employee_id = data['employeeID']

        try:
            employee = Employee.objects.get(pk=employee_id, team=team, isDeleted=False)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found in your team.'}, status=status.HTTP_404_NOT_FOUND)

        goal = EmployeeGoal.objects.create(
            employee=employee,
            title=data['title'],
            description=data.get('description', ''),
            category=data.get('category'),
            priority=data.get('priority'),
            status=data.get('status', 'Not Started'),
            progress=data.get('progress', 0),
            dueDate=data.get('dueDate'),
            createdBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )

        return Response(EmployeeGoalSerializer(goal).data, status=status.HTTP_201_CREATED)


class TeamGoalDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request, goal_id):
        team = getattr(getattr(request.user, 'employee', None), 'team', None)
        if not team:
            return Response({'error': 'Team information not available.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            goal = EmployeeGoal.objects.select_related('employee').get(
                pk=goal_id, employee__team=team, employee__isDeleted=False
            )
        except EmployeeGoal.DoesNotExist:
            return Response({'error': 'Goal not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(EmployeeGoalSerializer(goal).data)

    def put(self, request, goal_id):
        team = getattr(getattr(request.user, 'employee', None), 'team', None)
        if not team:
            return Response({'error': 'Team information not available.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            goal = EmployeeGoal.objects.select_related('employee').get(
                pk=goal_id, employee__team=team, employee__isDeleted=False
            )
        except EmployeeGoal.DoesNotExist:
            return Response({'error': 'Goal not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = EmployeeGoalCreateSerializer(goal, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        updates = {}
        if 'title' in data:
            goal.title = data['title']
            updates['title'] = data['title']
        if 'description' in data:
            goal.description = data['description']
            updates['description'] = data['description']
        if 'category' in data:
            goal.category = data['category']
            updates['category'] = data['category']
        if 'priority' in data:
            goal.priority = data['priority']
            updates['priority'] = data['priority']
        if 'status' in data:
            goal.status = data['status']
            updates['status'] = data['status']
        if 'progress' in data:
            goal.progress = data['progress']
            updates['progress'] = data['progress']
        if 'dueDate' in data:
            goal.dueDate = data['dueDate']
            updates['dueDate'] = data['dueDate']

        if updates:
            goal.save(update_fields=updates)

        return Response(EmployeeGoalSerializer(goal).data)

    def delete(self, request, goal_id):
        team = getattr(getattr(request.user, 'employee', None), 'team', None)
        if not team:
            return Response({'error': 'Team information not available.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            goal = EmployeeGoal.objects.select_related('employee').get(
                pk=goal_id, employee__team=team, employee__isDeleted=False
            )
        except EmployeeGoal.DoesNotExist:
            return Response({'error': 'Goal not found.'}, status=status.HTTP_404_NOT_FOUND)

        goal.delete()
        return Response({'message': 'Goal deleted.'}, status=status.HTTP_204_NO_CONTENT)



# TASK MANAGEMENT VIEWS
# ============================================================================
class EmployeeTaskListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        tasks = WorkTask.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        if status_filter:
            tasks = tasks.filter(status=status_filter)

        return Response(WorkTaskSerializer(tasks, many=True).data)
    
class EmployeeTaskProgressView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, task_id):
        try:
            task = WorkTask.objects.select_related('employee').get(pk=task_id)
        except WorkTask.DoesNotExist:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        request_employee_id = getattr(request.user, 'employee_id', None)
        if task.employee_id != request_employee_id and getattr(request.user, 'role', None) not in ('HRManager', 'Admin'):
            return Response({'error': 'You can only update your own tasks.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = WorkTaskProgressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        task.status = data.get('status', task.status)
        task.progress = data.get('progress', task.progress)
        if task.progress >= 100:
            task.progress = 100
            task.status = 'Done'
        task.save(update_fields=['status', 'progress', 'updatedAt'])
        return Response(WorkTaskSerializer(task).data)


def _require_task_owner(request, task):
    """Only the assigned employee may drive Start / End / Done."""
    if task.employee_id != getattr(request.user, 'employee_id', None):
        return Response(
            {'error': 'Only the assigned employee can update this task.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return None


class EmployeeTaskStartView(APIView):
    """POST .../employee/tasks/<id>/start/  — open a new work session.

    Body: { progress?: int, notes?: str }
    Used for both the first 'Start' and subsequent 'Add Progress' clicks.
    Rejects if there's already an open log on this task.
    """
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, task_id):
        try:
            task = WorkTask.objects.select_related('employee').get(pk=task_id)
        except WorkTask.DoesNotExist:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        forbidden = _require_task_owner(request, task)
        if forbidden:
            return forbidden

        if task.logs.filter(end_time__isnull=True).exists():
            return Response(
                {'error': 'This task already has an open log. End the current session first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = WorkTaskProgressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        now = timezone.now()
        log = WorkTaskLog.objects.create(
            task=task,
            start_time=now,
            notes=data.get('notes', ''),
        )

        update_fields = []
        if task.start_time is None:
            task.start_time = now
            update_fields.append('start_time')
        if task.status == 'To Do':
            task.status = 'In Progress'
            update_fields.append('status')
        if 'progress' in data and data['progress'] != task.progress:
            task.progress = data['progress']
            update_fields.append('progress')
        if update_fields:
            update_fields.append('updatedAt')
            task.save(update_fields=update_fields)

        return Response(
            {
                'task': WorkTaskSerializer(task).data,
                'log': WorkTaskLogSerializer(log).data,
            },
            status=status.HTTP_201_CREATED,
        )


class EmployeeTaskEndView(APIView):
    """POST .../employee/tasks/<id>/end/  — close the most recent open log."""
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, task_id):
        try:
            task = WorkTask.objects.select_related('employee').get(pk=task_id)
        except WorkTask.DoesNotExist:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        forbidden = _require_task_owner(request, task)
        if forbidden:
            return forbidden

        open_log = task.logs.filter(end_time__isnull=True).order_by('-start_time').first()
        if not open_log:
            return Response(
                {'error': 'There is no open log to end on this task.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes_update = (request.data.get('notes') or '').strip()
        open_log.end_time = timezone.now()
        if notes_update:
            open_log.notes = (open_log.notes + '\n' + notes_update).strip() if open_log.notes else notes_update
        open_log.save(update_fields=['end_time', 'notes'])

        return Response(WorkTaskSerializer(task).data)


class EmployeeTaskDoneView(APIView):
    """POST .../employee/tasks/<id>/done/  — employee submits the task for TL review.

    Sets progress=100, status='Pending Review', and auto-closes any still-open
    log on this task. finished_time is set later when the TL approves.
    """
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, task_id):
        try:
            task = WorkTask.objects.select_related('employee').get(pk=task_id)
        except WorkTask.DoesNotExist:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        forbidden = _require_task_owner(request, task)
        if forbidden:
            return forbidden

        now = timezone.now()
        # Auto-close any still-open log
        for open_log in task.logs.filter(end_time__isnull=True):
            open_log.end_time = now
            open_log.save(update_fields=['end_time'])

        task.progress = 100
        task.status = 'Pending Review'
        task.save(update_fields=['progress', 'status', 'updatedAt'])

        return Response(WorkTaskSerializer(task).data)


class TeamTaskApproveView(APIView):
    """POST .../team/tasks/<id>/approve/  — TL validates a Pending Review task as Done."""
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def post(self, request, task_id):
        try:
            task = WorkTask.objects.select_related('employee').get(pk=task_id)
        except WorkTask.DoesNotExist:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_manage_employee(request.user, task.employee):
            return Response(
                {'error': 'You do not have permission to approve this task.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if task.status != 'Pending Review':
            return Response(
                {'error': "Only tasks in 'Pending Review' can be approved."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        approved_at = timezone.now()
        total_seconds = sum(
            (log.end_time - log.start_time).total_seconds()
            for log in task.logs.filter(end_time__isnull=False)
        )
        task.actualHours = (Decimal(total_seconds) / Decimal(3600)).quantize(Decimal('0.01'))
        task.finished_time = approved_at
        task.status = 'Done'
        task.reviewedAt = approved_at
        task.save(update_fields=['status', 'finished_time', 'actualHours', 'reviewedAt', 'updatedAt'])
        return Response(WorkTaskSerializer(task).data)


class TeamTaskReturnForChangesView(APIView):
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def post(self, request, task_id):
        try:
            task = WorkTask.objects.select_related('employee').get(pk=task_id)
        except WorkTask.DoesNotExist:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_manage_employee(request.user, task.employee):
            return Response(
                {'error': 'You do not have permission to return this task.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if task.status != 'Pending Review':
            return Response(
                {'error': "Only tasks in 'Pending Review' can be returned for changes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        note = (request.data.get('note') or '').strip() if isinstance(request.data, dict) else ''
        if not note:
            return Response(
                {'note': 'Please add a short note before sending this task back.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.status = 'In Progress'
        task.reviewNote = note
        task.reviewedAt = timezone.now()
        task.save(update_fields=['status', 'reviewNote', 'reviewedAt', 'updatedAt'])
        return Response(WorkTaskSerializer(task).data)


class TeamTaskListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        tasks = WorkTask.objects.select_related('employee').filter(employee__isDeleted=False)

        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader_employee = Employee.objects.filter(employeeID=getattr(request.user, 'employee_id', None), isDeleted=False).first()
            if leader_employee and leader_employee.team:
                tasks = tasks.filter(employee__team=leader_employee.team)
            else:
                tasks = tasks.none()

        employee_id = request.query_params.get('employee_id')
        team = request.query_params.get('team')
        status_filter = request.query_params.get('status')
        if employee_id:
            tasks = tasks.filter(employee_id=employee_id)
        if team:
            tasks = tasks.filter(employee__team__name__icontains=team)
        if status_filter:
            tasks = tasks.filter(status=status_filter)

        return Response(WorkTaskSerializer(tasks, many=True).data)

    def post(self, request):
        serializer = WorkTaskCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_manage_employee(request.user, employee):
            return Response({'error': 'You do not have permission to manage this employee.'}, status=status.HTTP_403_FORBIDDEN)

        task = WorkTask.objects.create(
            employee=employee,
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            priority=serializer.validated_data.get('priority', 'Medium'),
            status=serializer.validated_data.get('status', 'To Do'),
            progress=serializer.validated_data.get('progress', 0),
            estimatedHours=serializer.validated_data.get('estimatedHours'),
            dueDate=serializer.validated_data.get('dueDate'),
            assignedBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        if task.progress >= 100:
            task.progress = 100
            task.status = 'Done'
            task.save(update_fields=['progress', 'status'])
        return Response(WorkTaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TeamTaskDetailView(APIView):
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def put(self, request, task_id):
        try:
            task = WorkTask.objects.select_related('employee').get(pk=task_id)
        except WorkTask.DoesNotExist:
            return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not _can_manage_employee(request.user, task.employee):
            return Response({'error': 'You do not have permission to manage this employee.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = WorkTaskCreateSerializer(data={
            'employeeID': task.employee_id,
            **request.data,
        })
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        task.title = data['title']
        task.description = data.get('description', '')
        task.priority = data.get('priority', task.priority)
        task.status = data.get('status', task.status)
        task.progress = data.get('progress', task.progress)
        task.estimatedHours = data.get('estimatedHours', task.estimatedHours)
        task.dueDate = data.get('dueDate', task.dueDate)
        if task.progress >= 100:
            task.progress = 100
            task.status = 'Done'
        task.save()
        return Response(WorkTaskSerializer(task).data)
    

class EmployeeTrainingListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        courses = [
            course for course in TrainingCourse.objects.all().order_by('dueDate', '-createdAt')
            if employee_id in (course.assignedEmployeeIDs or [])
        ]
        return Response(TrainingCourseSerializer(courses, many=True, context={'employee_id': employee_id}).data)


class EmployeeTrainingProgressView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, course_id):
        try:
            course = TrainingCourse.objects.get(pk=course_id)
        except TrainingCourse.DoesNotExist:
            return Response({'error': 'Training course not found.'}, status=status.HTTP_404_NOT_FOUND)

        employee_id = getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if employee_id not in (course.assignedEmployeeIDs or []) and getattr(request.user, 'role', None) not in ('HRManager', 'Admin'):
            return Response({'error': 'This course is not assigned to you.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TrainingProgressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        completion_data = course.completionData or {}
        status_value = data.get('status', 'In Progress')
        progress_value = data.get('progress', 0)
        if status_value == 'Completed' or progress_value >= 100:
            status_value = 'Completed'
            progress_value = 100

        completion_data[employee_id] = {
            'status': status_value,
            'progress': progress_value,
            'updatedAt': timezone.now().isoformat(),
        }
        course.completionData = completion_data
        course.save(update_fields=['completionData'])
        return Response(TrainingCourseSerializer(course, context={'employee_id': employee_id}).data)


class HRTrainingListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        courses = TrainingCourse.objects.all().order_by('dueDate', '-createdAt')
        category = request.query_params.get('category')
        if category:
            courses = courses.filter(category=category)
        return Response(TrainingCourseSerializer(courses, many=True).data)

    def post(self, request):
        serializer = TrainingCourseCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        assigned_ids = serializer.validated_data.get('assignedEmployeeIDs', [])
        missing_ids = [
            employee_id for employee_id in assigned_ids
            if not Employee.objects.filter(employeeID=employee_id, isDeleted=False).exists()
        ]
        if missing_ids:
            return Response({'error': f'Employees not found: {", ".join(missing_ids)}'}, status=status.HTTP_400_BAD_REQUEST)

        course = TrainingCourse.objects.create(
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            category=serializer.validated_data.get('category', 'Technical'),
            durationHours=serializer.validated_data.get('durationHours', 1),
            assignedEmployeeIDs=assigned_ids,
            completionData={employee_id: {'status': 'Not Started', 'progress': 0} for employee_id in assigned_ids},
            dueDate=serializer.validated_data.get('dueDate'),
            createdBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        return Response(TrainingCourseSerializer(course).data, status=status.HTTP_201_CREATED)


class HRTrainingComplianceView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        courses = list(TrainingCourse.objects.all().order_by('dueDate', '-createdAt'))
        today = timezone.now().date()
        compliance_data = []

        for course in courses:
            assigned_ids = course.assignedEmployeeIDs or []
            completion_data = course.completionData or {}
            completed_count = sum(1 for employee_id in assigned_ids if completion_data.get(employee_id, {}).get('status') == 'Completed')
            pending_count = len(assigned_ids) - completed_count
            due_state = _get_training_due_state(course, pending_count, today)

            compliance_data.append({
                'courseID': course.courseID,
                'title': course.title,
                'category': course.category,
                'assignedCount': len(assigned_ids),
                'completedCount': completed_count,
                'pendingCount': pending_count,
                'dueDate': course.dueDate,
                'dueState': due_state,
                'createdAt': course.createdAt,
            })

        return Response(compliance_data)


def _get_training_due_state(course, pending_count, today):
    if pending_count <= 0:
        return 'Completed'
    if course.dueDate and course.dueDate < today:
        return 'Overdue'
    if course.dueDate and course.dueDate <= today + timedelta(days=7):
        return 'Due Soon'
    if course.dueDate:
        return 'On Track'
    return 'No Due Date'

class HRActionPlanListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        plans = WorkTask.objects.select_related('employee').filter(
            employee__isDeleted=False,
            assignedBy__startswith='ActionPlan:',
        )
        employee_id = (request.query_params.get('employee_id') or '').strip()
        status_filter = (request.query_params.get('status') or '').strip()
        priority_filter = (request.query_params.get('priority') or '').strip()
        search = (request.query_params.get('search') or '').strip()
        open_only = (request.query_params.get('open_only') or '').strip().lower()

        if employee_id:
            plans = plans.filter(employee_id=employee_id)
        if status_filter:
            plans = plans.filter(status__iexact=status_filter)
        if priority_filter:
            plans = plans.filter(priority__iexact=priority_filter)
        if search:
            plans = plans.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(employee__fullName__icontains=search)
                | Q(employee__employeeID__icontains=search)
            )
        if open_only in {'1', 'true', 'yes'}:
            plans = plans.exclude(status='Done')

        return Response(WorkTaskSerializer(plans.order_by('-createdAt', 'dueDate'), many=True).data)

    def post(self, request):
        serializer = WorkTaskCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        assigned_by = getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '')
        plan = WorkTask.objects.create(
            employee=employee,
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            priority=serializer.validated_data.get('priority', 'Medium'),
            status=serializer.validated_data.get('status', 'To Do'),
            progress=serializer.validated_data.get('progress', 0),
            estimatedHours=serializer.validated_data.get('estimatedHours'),
            dueDate=serializer.validated_data.get('dueDate'),
            assignedBy=f'ActionPlan:{assigned_by}',
        )
        if plan.progress >= 100:
            plan.progress = 100
            plan.status = 'Done'
            plan.save(update_fields=['progress', 'status'])
        return Response(WorkTaskSerializer(plan).data, status=status.HTTP_201_CREATED)


class HRActionPlanStatusView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, task_id):
        try:
            plan = WorkTask.objects.select_related('employee').get(
                pk=task_id,
                employee__isDeleted=False,
                assignedBy__startswith='ActionPlan:',
            )
        except WorkTask.DoesNotExist:
            return Response({'error': 'Action plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = WorkTaskProgressSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        next_status = data.get('status', plan.status)
        next_progress = data.get('progress', plan.progress)

        allowed_transitions = {
            'To Do': {'To Do', 'In Progress', 'Blocked', 'Done'},
            'In Progress': {'In Progress', 'Blocked', 'Done'},
            'Blocked': {'Blocked', 'In Progress', 'Done'},
            'Done': {'Done'},
        }
        if next_status not in allowed_transitions.get(plan.status, {plan.status}):
            return Response({'error': f'Invalid status transition from {plan.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)

        plan.status = next_status
        plan.progress = next_progress
        if plan.status == 'Done' or plan.progress >= 100:
            plan.status = 'Done'
            plan.progress = 100
        plan.save(update_fields=['status', 'progress', 'updatedAt'])
        return Response(WorkTaskSerializer(plan).data)


class EmployeeRecognitionListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        awards = RecognitionAward.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        category = request.query_params.get('category')
        if category:
            awards = awards.filter(category=category)

        return Response(RecognitionAwardSerializer(awards.order_by('-recognitionDate', '-createdAt'), many=True).data)


class TeamRecognitionListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        awards = RecognitionAward.objects.select_related('employee').filter(employee__isDeleted=False)

        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader_employee = Employee.objects.filter(employeeID=getattr(request.user, 'employee_id', None), isDeleted=False).first()
            if leader_employee and leader_employee.team:
                awards = awards.filter(employee__team=leader_employee.team)
            else:
                awards = awards.none()

        employee_id = request.query_params.get('employee_id')
        team = request.query_params.get('team')
        category = request.query_params.get('category')
        if employee_id:
            awards = awards.filter(employee_id=employee_id)
        if team:
            awards = awards.filter(employee__team__name__icontains=team)
        if category:
            awards = awards.filter(category=category)

        return Response(RecognitionAwardSerializer(awards.order_by('-recognitionDate', '-createdAt'), many=True).data)

    def post(self, request):
        serializer = RecognitionAwardCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_manage_employee(request.user, employee):
            return Response({'error': 'You do not have permission to manage this employee.'}, status=status.HTTP_403_FORBIDDEN)

        award = RecognitionAward.objects.create(
            employee=employee,
            title=serializer.validated_data['title'],
            category=serializer.validated_data.get('category', 'Achievement'),
            message=serializer.validated_data.get('message', ''),
            points=serializer.validated_data.get('points', 0),
            recognitionDate=serializer.validated_data.get('recognitionDate') or timezone.localdate(),
            recognizedBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        return Response(RecognitionAwardSerializer(award).data, status=status.HTTP_201_CREATED)


class HRRecognitionWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        awards = list(
            RecognitionAward.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-recognitionDate', '-createdAt')
        )
        employees = list(
            Employee.objects.filter(isDeleted=False)
            .exclude(employmentStatus='Terminated')
            .order_by('fullName')
        )

        awards_by_employee = {}
        category_map = {}
        for award in awards:
            awards_by_employee.setdefault(award.employee_id, []).append(award)
            entry = category_map.setdefault(award.category, {
                'category': award.category,
                'count': 0,
                'points': 0,
                'recentCount': 0,
                'employeeIDs': set(),
            })
            entry['count'] += 1
            entry['points'] += int(award.points or 0)
            if award.recognitionDate and award.recognitionDate >= month_start:
                entry['recentCount'] += 1
            entry['employeeIDs'].add(award.employee_id)

        follow_up_items = []
        stale_count = 0
        for employee in employees:
            employee_awards = awards_by_employee.get(employee.employeeID, [])
            if not employee_awards:
                follow_up_items.append({
                    'employeeID': employee.employeeID,
                    'employeeName': employee.fullName,
                    'department': _label(employee.department),
                    'jobTitle': employee.jobTitle,
                    'team': _label(employee.team),
                    'recognitionCount': 0,
                    'totalPoints': 0,
                    'lastRecognizedAt': None,
                    'daysSinceRecognition': None,
                    'followUpState': 'Recognition Gap',
                    'summary': 'No recognition awards are recorded for this employee yet.',
                    'path': '/hr/dashboard',
                })
                continue

            latest_award = max(
                employee_awards,
                key=lambda item: ((item.recognitionDate or today), (item.createdAt or timezone.now())),
            )
            last_date = latest_award.recognitionDate or today
            days_since = max((today - last_date).days, 0)
            total_points = sum(int(item.points or 0) for item in employee_awards)

            if days_since >= 30:
                stale_count += 1
                follow_up_items.append({
                    'employeeID': employee.employeeID,
                    'employeeName': employee.fullName,
                    'department': _label(employee.department),
                    'jobTitle': employee.jobTitle,
                    'team': _label(employee.team),
                    'recognitionCount': len(employee_awards),
                    'totalPoints': total_points,
                    'lastRecognizedAt': last_date.isoformat() if last_date else None,
                    'daysSinceRecognition': days_since,
                    'followUpState': 'Reignite Recognition' if days_since >= 45 else 'Check-In Due',
                    'summary': latest_award.message or f'Last recognition was {days_since} day(s) ago and may need a fresh check-in.',
                    'path': '/hr/dashboard',
                })

        state_rank = {
            'Recognition Gap': 0,
            'Reignite Recognition': 1,
            'Check-In Due': 2,
        }
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (
                state_rank.get(item['followUpState'], 9),
                -(item['daysSinceRecognition'] or 0),
                item['employeeName'],
            ),
        )[:8]

        category_breakdown = sorted(
            [
                {
                    'category': key,
                    'count': value['count'],
                    'points': value['points'],
                    'recentCount': value['recentCount'],
                    'employeeCount': len(value['employeeIDs']),
                }
                for key, value in category_map.items()
            ],
            key=lambda item: (-item['count'], -item['points'], item['category']),
        )

        return Response({
            'summary': {
                'totalAwards': len(awards),
                'recognizedThisMonth': sum(1 for award in awards if award.recognitionDate and award.recognitionDate >= month_start),
                'recognizedEmployees': len(awards_by_employee),
                'employeesWithoutRecognition': sum(1 for employee in employees if employee.employeeID not in awards_by_employee),
                'staleRecognitionCount': stale_count,
                'totalPoints': sum(int(award.points or 0) for award in awards),
                'followUpCount': len(follow_up_items),
            },
            'categoryBreakdown': category_breakdown,
            'followUpItems': follow_up_items,
        })


class EmployeeBenefitListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        benefits = BenefitEnrollment.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        benefit_type = request.query_params.get('benefit_type')
        if status_filter:
            benefits = benefits.filter(status=status_filter)
        if benefit_type:
            benefits = benefits.filter(benefitType=benefit_type)

        return Response(BenefitEnrollmentSerializer(benefits.order_by('-effectiveDate', '-createdAt'), many=True).data)


class EmployeeBenefitStatusView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, enrollment_id):
        try:
            benefit = BenefitEnrollment.objects.select_related('employee').get(pk=enrollment_id)
        except BenefitEnrollment.DoesNotExist:
            return Response({'error': 'Benefit enrollment not found.'}, status=status.HTTP_404_NOT_FOUND)

        request_employee_id = getattr(request.user, 'employee_id', None)
        if benefit.employee_id != request_employee_id and getattr(request.user, 'role', None) not in ('HRManager', 'Admin'):
            return Response({'error': 'You can only update your own benefits.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = BenefitEnrollmentStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        benefit.status = data.get('status', benefit.status)
        benefit.employeeNote = data.get('note', benefit.employeeNote)
        benefit.acknowledgedAt = timezone.now()
        benefit.save(update_fields=['status', 'employeeNote', 'acknowledgedAt', 'updatedAt'])
        return Response(BenefitEnrollmentSerializer(benefit).data)

class EmployeeReviewListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        reviews = PerformanceReview.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        if status_filter:
            reviews = reviews.filter(status=status_filter)

        return Response(PerformanceReviewSerializer(reviews.order_by('-reviewDate', '-createdAt'), many=True).data)
    
class EmployeeReviewAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, review_id):
        try:
            review = PerformanceReview.objects.select_related('employee').get(pk=review_id)
        except PerformanceReview.DoesNotExist:
            return Response({'error': 'Performance review not found.'}, status=status.HTTP_404_NOT_FOUND)

        request_employee_id = getattr(request.user, 'employee_id', None)
        if review.employee_id != request_employee_id and getattr(request.user, 'role', None) not in ('HRManager', 'Admin'):
            return Response({'error': 'You can only acknowledge your own reviews.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = PerformanceReviewAcknowledgeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        review.employeeNote = serializer.validated_data.get('note', review.employeeNote)
        review.status = 'Acknowledged'
        review.acknowledgedAt = timezone.now()
        review.save(update_fields=['employeeNote', 'status', 'acknowledgedAt', 'updatedAt'])
        return Response(PerformanceReviewSerializer(review).data)

class HRReviewCalibrationView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        reviews = list(
            PerformanceReview.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-reviewDate', '-createdAt')
        )
        plans = list(
            SuccessionPlan.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-updatedAt', '-createdAt')
        )

        latest_plan_by_employee = {}
        for plan in plans:
            latest_plan_by_employee.setdefault(plan.employee_id, plan)

        def get_priority(review, plan):
            if review.overallRating <= 2:
                return 'Critical'
            if review.status != 'Acknowledged' or (plan and plan.retentionRisk == 'High'):
                return 'High'
            if plan and plan.readiness == 'Ready Now' and review.overallRating >= 4:
                return 'Opportunity'
            return 'Watch'

        def get_reasons(review, plan):
            reasons = []
            if review.status != 'Acknowledged':
                reasons.append('Pending employee acknowledgement')
            if review.overallRating <= 2:
                reasons.append('Low performance rating')
            if plan and plan.retentionRisk == 'High':
                reasons.append('High retention risk for key talent')
            if plan and plan.readiness == 'Ready Now' and review.overallRating >= 4:
                reasons.append('Ready-now talent for succession planning')
            return reasons

        follow_up_items = []
        for review in reviews:
            plan = latest_plan_by_employee.get(review.employee_id)
            reasons = get_reasons(review, plan)
            if not reasons:
                continue

            priority = get_priority(review, plan)
            follow_up_items.append({
                'reviewID': review.reviewID,
                'employeeID': review.employee.employeeID,
                'employeeName': review.employee.fullName,
                'department': _label(review.employee.department),
                'team': _label(review.employee.team),
                'reviewPeriod': review.reviewPeriod,
                'reviewType': review.reviewType,
                'overallRating': review.overallRating,
                'status': review.status,
                'priority': priority,
                'retentionRisk': plan.retentionRisk if plan else 'Low',
                'readiness': plan.readiness if plan else 'Unassigned',
                'recommendedAction': reasons[0],
                'reasons': reasons,
            })

        priority_order = {'Critical': 3, 'High': 2, 'Opportunity': 1, 'Watch': 0}
        follow_up_items.sort(
            key=lambda item: (priority_order.get(item['priority'], 0), -item['overallRating'] if item['priority'] == 'Opportunity' else item['overallRating']),
            reverse=True,
        )

        rating_breakdown = [
            {'rating': rating, 'count': sum(1 for review in reviews if review.overallRating == rating)}
            for rating in range(1, 6)
        ]
        readiness_breakdown = [
            {
                'readiness': label,
                'count': sum(1 for plan in latest_plan_by_employee.values() if plan.readiness == label),
            }
            for label in ['Ready Now', '6-12 Months', '1-2 Years', 'Long Term']
        ]

        return Response({
            'summary': {
                'totalReviews': len(reviews),
                'pendingAcknowledgements': sum(1 for review in reviews if review.status != 'Acknowledged'),
                'acknowledgedCount': sum(1 for review in reviews if review.status == 'Acknowledged'),
                'lowRatingCount': sum(1 for review in reviews if review.overallRating <= 2),
                'highPerformerCount': sum(1 for review in reviews if review.overallRating >= 4),
                'readyNowCount': sum(1 for plan in latest_plan_by_employee.values() if plan.readiness == 'Ready Now'),
                'calibrationAlerts': sum(1 for item in follow_up_items if item['priority'] in ('Critical', 'High')),
            },
            'ratingBreakdown': rating_breakdown,
            'readinessBreakdown': readiness_breakdown,
            'followUpItems': follow_up_items[:8],
        })
        
class HRReviewListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        reviews = PerformanceReview.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        department = request.query_params.get('department')
        status_filter = request.query_params.get('status')
        review_type = request.query_params.get('review_type')

        if employee_id:
            reviews = reviews.filter(employee_id=employee_id)
        if department:
            reviews = reviews.filter(employee__department__icontains=department)
        if status_filter:
            reviews = reviews.filter(status=status_filter)
        if review_type:
            reviews = reviews.filter(reviewType=review_type)

        return Response(PerformanceReviewSerializer(reviews.order_by('-reviewDate', '-createdAt'), many=True).data)

    def post(self, request):
        serializer = PerformanceReviewCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        review = PerformanceReview.objects.create(
            employee=employee,
            reviewPeriod=serializer.validated_data['reviewPeriod'],
            reviewType=serializer.validated_data.get('reviewType', 'Quarterly'),
            overallRating=serializer.validated_data['overallRating'],
            status=serializer.validated_data.get('status', 'Draft'),
            strengths=serializer.validated_data.get('strengths', ''),
            improvementAreas=serializer.validated_data.get('improvementAreas', ''),
            goalsSummary=serializer.validated_data.get('goalsSummary', ''),
            reviewDate=serializer.validated_data.get('reviewDate') or timezone.localdate(),
            createdBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        return Response(PerformanceReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class TeamReviewListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def _leader_team(self, request):
        return getattr(getattr(request.user, 'employee', None), 'team', None)

    def _leader_id(self, request):
        return getattr(request.user, 'employee_id', None)

    def get(self, request):
        team = self._leader_team(request)
        if not team:
            return Response({'error': 'Team information not available.'}, status=status.HTTP_400_BAD_REQUEST)

        reviews = PerformanceReview.objects.select_related('employee').filter(
            employee__team=team, employee__isDeleted=False,
        ).exclude(employee_id=self._leader_id(request))

        status_filter = request.query_params.get('status')
        if status_filter:
            reviews = reviews.filter(status=status_filter)

        return Response(PerformanceReviewSerializer(
            reviews.order_by('-reviewDate', '-createdAt'), many=True).data)

    def post(self, request):
        team = self._leader_team(request)
        if not team:
            return Response({'error': 'Team information not available.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PerformanceReviewCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee_id = serializer.validated_data['employeeID']
        if employee_id == self._leader_id(request):
            return Response({'error': 'You cannot write a performance review for yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = Employee.objects.get(pk=employee_id, team=team, isDeleted=False)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found in your team.'}, status=status.HTTP_404_NOT_FOUND)

        review = PerformanceReview.objects.create(
            employee=employee,
            reviewPeriod=serializer.validated_data['reviewPeriod'],
            reviewType=serializer.validated_data.get('reviewType', 'Quarterly'),
            overallRating=serializer.validated_data['overallRating'],
            status=serializer.validated_data.get('status', 'Submitted'),
            strengths=serializer.validated_data.get('strengths', ''),
            improvementAreas=serializer.validated_data.get('improvementAreas', ''),
            goalsSummary=serializer.validated_data.get('goalsSummary', ''),
            reviewDate=serializer.validated_data.get('reviewDate') or timezone.localdate(),
            createdBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        return Response(PerformanceReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class EmployeeCareerPlanListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        plans = SuccessionPlan.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        if status_filter:
            plans = plans.filter(status=status_filter)

        return Response(SuccessionPlanSerializer(plans.order_by('-updatedAt', '-createdAt'), many=True).data)


class EmployeeCareerPlanAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, plan_id):
        try:
            plan = SuccessionPlan.objects.select_related('employee').get(pk=plan_id)
        except SuccessionPlan.DoesNotExist:
            return Response({'error': 'Succession plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        request_employee_id = getattr(request.user, 'employee_id', None)
        if plan.employee_id != request_employee_id and getattr(request.user, 'role', None) not in ('HRManager', 'Admin'):
            return Response({'error': 'You can only acknowledge your own career path.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = SuccessionPlanAcknowledgeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        plan.employeeNote = serializer.validated_data.get('note', plan.employeeNote)
        plan.status = 'Acknowledged'
        plan.acknowledgedAt = timezone.now()
        plan.save(update_fields=['employeeNote', 'status', 'acknowledgedAt', 'updatedAt'])
        return Response(SuccessionPlanSerializer(plan).data)


class EmployeeShiftListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        schedules = ShiftSchedule.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        if status_filter:
            schedules = schedules.filter(status=status_filter)

        return Response(ShiftScheduleSerializer(schedules.order_by('shiftDate', 'startTime'), many=True).data)


class EmployeeShiftAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, schedule_id):
        try:
            schedule = ShiftSchedule.objects.select_related('employee').get(pk=schedule_id)
        except ShiftSchedule.DoesNotExist:
            return Response({'error': 'Shift schedule not found.'}, status=status.HTTP_404_NOT_FOUND)

        request_employee_id = getattr(request.user, 'employee_id', None)
        if schedule.employee_id != request_employee_id and getattr(request.user, 'role', None) not in ('HRManager', 'Admin'):
            return Response({'error': 'You can only update your own schedule.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ShiftScheduleAcknowledgeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        schedule.status = data.get('status', schedule.status if schedule.status != 'Planned' else 'Confirmed')
        schedule.employeeNote = data.get('note', schedule.employeeNote)
        schedule.acknowledgedAt = timezone.now()
        schedule.save(update_fields=['status', 'employeeNote', 'acknowledgedAt', 'updatedAt'])
        return Response(ShiftScheduleSerializer(schedule).data)


class HRShiftWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        today = timezone.localdate()
        schedules = list(
            ShiftSchedule.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('shiftDate', 'startTime', '-createdAt')
        )

        def follow_up_state(schedule):
            if schedule.status == 'Swapped':
                return 'Swap Review'
            if schedule.status == 'Planned':
                if schedule.shiftDate <= today:
                    return 'Coverage Risk'
                if schedule.shiftDate <= today + timedelta(days=1):
                    return 'Needs Confirmation'
            if schedule.status == 'Confirmed' and schedule.shiftDate < today:
                return 'Pending Closeout'
            return schedule.status

        follow_up_items = []
        shift_type_map = {}

        for schedule in schedules:
            entry = shift_type_map.setdefault(schedule.shiftType, {
                'shiftType': schedule.shiftType,
                'count': 0,
                'plannedCount': 0,
                'confirmedCount': 0,
                'completedCount': 0,
                'swappedCount': 0,
                'followUpCount': 0,
            })
            entry['count'] += 1
            if schedule.status == 'Planned':
                entry['plannedCount'] += 1
            elif schedule.status == 'Confirmed':
                entry['confirmedCount'] += 1
            elif schedule.status == 'Completed':
                entry['completedCount'] += 1
            elif schedule.status == 'Swapped':
                entry['swappedCount'] += 1

            state = follow_up_state(schedule)
            if state in {'Coverage Risk', 'Needs Confirmation', 'Swap Review', 'Pending Closeout'}:
                days_to_shift = (schedule.shiftDate - today).days if schedule.shiftDate else None
                entry['followUpCount'] += 1
                follow_up_items.append({
                    'scheduleID': schedule.scheduleID,
                    'employeeName': schedule.employee.fullName,
                    'employeeID': schedule.employee_id,
                    'department': _label(schedule.employee.department),
                    'team': _label(schedule.employee.team),
                    'shiftDate': schedule.shiftDate.isoformat() if schedule.shiftDate else None,
                    'shiftType': schedule.shiftType,
                    'location': schedule.location,
                    'status': schedule.status,
                    'followUpState': state,
                    'daysToShift': days_to_shift,
                    'summary': schedule.employeeNote or schedule.notes or 'Shift schedule needs confirmation or coverage follow-up.',
                    'path': '/hr/shifts',
                })

        state_rank = {
            'Coverage Risk': 0,
            'Swap Review': 1,
            'Needs Confirmation': 2,
            'Pending Closeout': 3,
        }
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (
                state_rank.get(item['followUpState'], 9),
                item['daysToShift'] if item['daysToShift'] is not None else 999,
                item['employeeName'],
            ),
        )[:8]

        shift_type_breakdown = sorted(
            shift_type_map.values(),
            key=lambda item: (-item['followUpCount'], -item['plannedCount'], -item['count'], item['shiftType']),
        )

        return Response({
            'summary': {
                'totalShifts': len(schedules),
                'plannedCount': sum(1 for schedule in schedules if schedule.status == 'Planned'),
                'confirmedCount': sum(1 for schedule in schedules if schedule.status == 'Confirmed'),
                'completedCount': sum(1 for schedule in schedules if schedule.status == 'Completed'),
                'swappedCount': sum(1 for schedule in schedules if schedule.status == 'Swapped'),
                'todayCount': sum(1 for schedule in schedules if schedule.shiftDate == today),
                'coverageRiskCount': sum(1 for schedule in schedules if follow_up_state(schedule) in {'Coverage Risk', 'Swap Review'}),
                'followUpCount': len(follow_up_items),
            },
            'shiftTypeBreakdown': shift_type_breakdown,
            'followUpItems': follow_up_items,
        })


class HRShiftScheduleListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        schedules = ShiftSchedule.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        date_value = request.query_params.get('date')
        status_filter = request.query_params.get('status')
        if employee_id:
            schedules = schedules.filter(employee_id=employee_id)
        if date_value:
            schedules = schedules.filter(shiftDate=date_value)
        if status_filter:
            schedules = schedules.filter(status=status_filter)

        return Response(ShiftScheduleSerializer(schedules.order_by('shiftDate', 'startTime'), many=True).data)

    def post(self, request):
        serializer = ShiftScheduleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        if ShiftSchedule.objects.filter(
            employee=employee,
            shiftDate=serializer.validated_data['shiftDate'],
            startTime=serializer.validated_data['startTime'],
        ).exists():
            return Response({'error': 'A shift for this employee at the same start time already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        location = (serializer.validated_data.get('location') or employee.location or '').strip()

        schedule = ShiftSchedule.objects.create(
            employee=employee,
            shiftDate=serializer.validated_data['shiftDate'],
            shiftType=serializer.validated_data.get('shiftType', 'Morning'),
            startTime=serializer.validated_data['startTime'],
            endTime=serializer.validated_data['endTime'],
            location=location,
            status=serializer.validated_data.get('status', 'Planned'),
            notes=serializer.validated_data.get('notes', ''),
            createdBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        return Response(ShiftScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)


def _get_policy_audience_ids(employees, audience):
    all_employee_ids = [employee.employeeID for employee in employees]
    manager_ids = [employee.employeeID for employee in employees if employee.role in ('TeamLeader', 'HRManager', 'Admin')]
    team_leader_ids = [employee.employeeID for employee in employees if employee.role == 'TeamLeader']

    if audience == 'Managers':
        return manager_ids
    if audience == 'Team Leaders':
        return team_leader_ids
    return all_employee_ids


def _get_policy_due_state(policy, today):
    if policy.effectiveDate and policy.effectiveDate < today:
        return 'Overdue'
    if policy.effectiveDate and policy.effectiveDate <= today + timedelta(days=7):
        return 'Due This Week'
    return 'Open'


class HRPolicyComplianceView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        employees = list(Employee.objects.filter(isDeleted=False))
        today = timezone.localdate()

        tracked_policies = list(
            PolicyAnnouncement.objects.exclude(status='Draft').order_by('-effectiveDate', '-createdAt')
        )

        follow_up_items = []
        coverage_total = 0
        fully_acknowledged = 0

        for policy in tracked_policies:
            audience_ids = _get_policy_audience_ids(employees, policy.audience)
            audience_size = len(audience_ids)
            acknowledged_ids = set(policy.acknowledgedByIDs or [])
            acknowledged_count = len([item for item in audience_ids if item in acknowledged_ids])
            pending_count = max(audience_size - acknowledged_count, 0)
            coverage_rate = round((acknowledged_count / audience_size) * 100) if audience_size else 100
            coverage_total += coverage_rate

            if pending_count == 0:
                fully_acknowledged += 1
                continue

            follow_up_items.append({
                'policyID': policy.policyID,
                'title': policy.title,
                'audience': policy.audience,
                'pendingEmployees': pending_count,
                'acknowledgedEmployees': acknowledged_count,
                'audienceSize': audience_size,
                'coverageRate': coverage_rate,
                'effectiveDate': policy.effectiveDate,
                'dueState': _get_policy_due_state(policy, today),
                'reminderCount': policy.reminderCount or 0,
                'lastReminderAt': policy.lastReminderAt,
                'lastReminderNote': policy.lastReminderNote,
            })

        severity_order = {'Overdue': 2, 'Due This Week': 1, 'Open': 0}
        all_follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (severity_order.get(item['dueState'], 0), item['pendingEmployees']),
            reverse=True,
        )
        top_follow_up_items = all_follow_up_items[:6]

        audience_breakdown = []
        for audience in ['All Employees', 'Managers', 'Team Leaders']:
            audience_breakdown.append({
                'audience': audience,
                'targetEmployees': len(_get_policy_audience_ids(employees, audience)),
                'policies': sum(1 for policy in tracked_policies if policy.audience == audience),
                'outstandingEmployees': sum(item['pendingEmployees'] for item in all_follow_up_items if item['audience'] == audience),
            })

        return Response({
            'summary': {
                'publishedCount': len(tracked_policies),
                'fullyAcknowledgedCount': fully_acknowledged,
                'outstandingEmployees': sum(item['pendingEmployees'] for item in all_follow_up_items),
                'dueThisWeekCount': sum(1 for item in all_follow_up_items if item['dueState'] in ('Overdue', 'Due This Week')),
                'averageCoverageRate': round(coverage_total / len(tracked_policies)) if tracked_policies else 100,
                'recentReminderCount': sum(1 for policy in tracked_policies if policy.lastReminderAt and policy.lastReminderAt >= timezone.now() - timedelta(days=7)),
            },
            'audienceBreakdown': audience_breakdown,
            'followUpItems': top_follow_up_items,
        })


class HRPolicyReminderView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, policy_id):
        try:
            policy = PolicyAnnouncement.objects.get(pk=policy_id)
        except PolicyAnnouncement.DoesNotExist:
            return Response({'error': 'Policy announcement not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PolicyAnnouncementReminderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employees = list(Employee.objects.filter(isDeleted=False))
        audience_ids = _get_policy_audience_ids(employees, policy.audience)
        acknowledged_ids = set(policy.acknowledgedByIDs or [])
        outstanding_employee_ids = [employee_id for employee_id in audience_ids if employee_id not in acknowledged_ids]
        due_state = _get_policy_due_state(policy, timezone.localdate())
        reminder_note = serializer.validated_data.get('note', '').strip() or f'{policy.title} follow-up reminder sent from the HR compliance center.'
        reminder_history = list(policy.reminderHistory or [])
        reminded_at = timezone.now()

        reminder_history.append({
            'remindedAt': reminded_at.isoformat(),
            'remindedBy': getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
            'note': reminder_note,
            'outstandingEmployees': len(outstanding_employee_ids),
            'dueState': due_state,
        })

        policy.lastReminderAt = reminded_at
        policy.lastReminderNote = reminder_note
        policy.reminderCount = int(policy.reminderCount or 0) + 1
        policy.reminderHistory = reminder_history[-10:]
        policy.save(update_fields=['lastReminderAt', 'lastReminderNote', 'reminderCount', 'reminderHistory', 'updatedAt'])

        data = PolicyAnnouncementSerializer(policy).data
        data.update({
            'outstandingEmployees': len(outstanding_employee_ids),
            'dueState': due_state,
        })
        return Response(data)


class EmployeePolicyListView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        policies = PolicyAnnouncement.objects.all()
        status_filter = request.query_params.get('status')
        if status_filter:
            policies = policies.filter(status=status_filter)

        return Response(PolicyAnnouncementSerializer(policies, many=True).data)


class EmployeePolicyAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, policy_id):
        try:
            policy = PolicyAnnouncement.objects.get(pk=policy_id)
        except PolicyAnnouncement.DoesNotExist:
            return Response({'error': 'Policy announcement not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PolicyAnnouncementAcknowledgeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee_id = getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        acknowledged_ids = list(policy.acknowledgedByIDs or [])
        if employee_id not in acknowledged_ids:
            acknowledged_ids.append(employee_id)

        notes = dict(policy.acknowledgementNotes or {})
        notes[employee_id] = serializer.validated_data.get('note', '')

        policy.acknowledgedByIDs = acknowledged_ids
        policy.acknowledgementNotes = notes
        policy.status = 'Acknowledged' if acknowledged_ids else policy.status
        policy.acknowledgedAt = timezone.now()
        policy.save(update_fields=['acknowledgedByIDs', 'acknowledgementNotes', 'status', 'acknowledgedAt', 'updatedAt'])
        return Response(PolicyAnnouncementSerializer(policy).data)


class HRPolicyListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        policies = PolicyAnnouncement.objects.all()

        category = request.query_params.get('category')
        audience = request.query_params.get('audience')
        status_filter = request.query_params.get('status')

        if category:
            policies = policies.filter(category=category)
        if audience:
            policies = policies.filter(audience=audience)
        if status_filter:
            policies = policies.filter(status=status_filter)

        return Response(PolicyAnnouncementSerializer(policies, many=True).data)

    def post(self, request):
        serializer = PolicyAnnouncementCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        policy = PolicyAnnouncement.objects.create(
            title=serializer.validated_data['title'],
            category=serializer.validated_data.get('category', 'Policy'),
            audience=serializer.validated_data.get('audience', 'All Employees'),
            content=serializer.validated_data['content'],
            status=serializer.validated_data.get('status', 'Draft'),
            effectiveDate=serializer.validated_data.get('effectiveDate'),
            createdBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        return Response(PolicyAnnouncementSerializer(policy).data, status=status.HTTP_201_CREATED)

class HRApprovalSnapshotView(APIView):
    """
    GET /api/feedback/hr/approvals/snapshot/
    Returns queue totals plus SLA and escalation visibility for the HR approval center.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        now = timezone.now()
        today = timezone.localdate()

        pending_leaves = list(
            LeaveRequest.objects.filter(status=LeaveRequest.STATUS_PENDING).select_related('employee', 'leaveType')
        )
        pending_expenses = list(
            ExpenseClaim.objects.filter(status__in=['Pending', 'Submitted']).select_related('employee')
        )
        pending_documents = list(
            DocumentRequest.objects.filter(status__in=['Pending', 'In Progress']).select_related('employee')
        )
        open_tickets = list(
            SupportTicket.objects.filter(status__in=['Open', 'In Progress']).select_related('employee')
        )

        def age_in_days(value):
            if not value:
                return 0
            if hasattr(value, 'hour'):
                delta = now - value
            else:
                delta = today - value
            return max(delta.days, 0)

        def classify_window(waiting_days, at_risk_after, overdue_after):
            if waiting_days >= overdue_after:
                return 'Overdue'
            if waiting_days >= at_risk_after:
                return 'At Risk'
            return 'On Track'

        def classify_leave(item):
            waiting_days = age_in_days(item.requestedAt)
            if item.startDate and item.startDate <= today:
                return waiting_days, 'Overdue'
            if item.startDate and item.startDate <= today + timedelta(days=2):
                return waiting_days, 'At Risk'
            return waiting_days, classify_window(waiting_days, at_risk_after=1, overdue_after=3)

        def classify_ticket(item):
            waiting_days = age_in_days(item.createdAt or item.updatedAt)
            overdue_after = {
                'Critical': 1,
                'High': 2,
                'Medium': 3,
                'Low': 5,
            }.get(item.priority or 'Medium', 3)
            state = classify_window(waiting_days, at_risk_after=max(1, overdue_after - 1), overdue_after=overdue_after)
            return waiting_days, state

        follow_up_items = []

        def push_item(item_type, item_id, employee_name, summary, status_label, waiting_days, sla_state, path):
            if sla_state == 'On Track':
                return
            follow_up_items.append({
                'id': f'{item_type.lower().replace(" ", "-")}-{item_id}',
                'type': item_type,
                'employeeName': employee_name,
                'summary': summary,
                'status': status_label,
                'waitingDays': waiting_days,
                'slaState': sla_state,
                'path': path,
            })

        for item in pending_leaves:
            waiting_days, sla_state = classify_leave(item)
            push_item(
                'Leave Request',
                item.leaveRequestID,
                item.employee.fullName,
                item.leaveType.name,
                item.status,
                waiting_days,
                sla_state,
                '/hr/attendance',
            )

        for item in pending_expenses:
            waiting_days = age_in_days(item.createdAt)
            push_item(
                'Expense Claim',
                item.claimID,
                item.employee.fullName,
                item.title,
                item.status,
                waiting_days,
                classify_window(waiting_days, at_risk_after=2, overdue_after=4),
                '/hr/expenses',
            )

        for item in pending_documents:
            waiting_days = age_in_days(item.createdAt)
            push_item(
                'Document Request',
                item.requestID,
                item.employee.fullName,
                item.documentType,
                item.status,
                waiting_days,
                classify_window(waiting_days, at_risk_after=1, overdue_after=3),
                '/hr/documents',
            )

        for item in open_tickets:
            waiting_days, sla_state = classify_ticket(item)
            push_item(
                'Support Ticket',
                item.ticketID,
                item.employee.fullName,
                item.subject,
                item.status,
                waiting_days,
                sla_state,
                '/hr/tickets',
            )

        sorted_follow_up = sorted(
            follow_up_items,
            key=lambda item: ((item['slaState'] == 'Overdue'), item['waitingDays']),
            reverse=True,
        )[:6]

        return Response({
            'totals': {
                'totalPending': len(pending_leaves) + len(pending_expenses) + len(pending_documents) + len(open_tickets),
                'leaveApprovals': len(pending_leaves),
                'expenseReviews': len(pending_expenses),
                'documentUpdates': len(pending_documents),
                'supportFollowUp': len(open_tickets),
            },
            'slaSummary': {
                'atRiskCount': sum(1 for item in sorted_follow_up if item['slaState'] == 'At Risk'),
                'overdueCount': sum(1 for item in sorted_follow_up if item['slaState'] == 'Overdue'),
                'criticalTickets': sum(1 for item in open_tickets if item.priority == 'Critical'),
                'oldestOpenDays': max((item['waitingDays'] for item in follow_up_items), default=0),
            },
            'followUpItems': sorted_follow_up,
        })

class HRWorkforceInsightsView(APIView):
    """
    GET /api/feedback/hr/insights/
    Returns a compact workforce analytics snapshot for the HR dashboard.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        employees = Employee.objects.filter(isDeleted=False)
        attendance_records = AttendanceRecord.objects.filter(employee__isDeleted=False)
        leave_requests = LeaveRequest.objects.filter(employee__isDeleted=False)
        payroll_records = PayrollRecord.objects.filter(employee__isDeleted=False)
        tasks = WorkTask.objects.filter(employee__isDeleted=False)
        goals = EmployeeGoal.objects.filter(employee__isDeleted=False)
        reviews = PerformanceReview.objects.filter(employee__isDeleted=False)
        succession_plans = SuccessionPlan.objects.filter(employee__isDeleted=False)
        expenses = ExpenseClaim.objects.filter(employee__isDeleted=False)
        documents = DocumentRequest.objects.filter(employee__isDeleted=False)
        tickets = SupportTicket.objects.filter(employee__isDeleted=False)
        courses = list(TrainingCourse.objects.all())

        total_assignments = sum(len(course.assignedEmployeeIDs or []) for course in courses)
        completed_assignments = sum(
            1
            for course in courses
            for item in (course.completionData or {}).values()
            if item.get('status') == 'Completed'
        )
        training_completion_rate = round((completed_assignments / total_assignments) * 100) if total_assignments else 0

        department_counts = {}
        for employee in employees:
            label = _label(employee.department) or 'Unassigned'
            department_counts[label] = department_counts.get(label, 0) + 1

        readiness_counts = {}
        for plan in succession_plans:
            readiness_counts[plan.readiness] = readiness_counts.get(plan.readiness, 0) + 1

        present_count = attendance_records.filter(status=AttendanceRecord.STATUS_PRESENT).count()
        partial_count = attendance_records.filter(status=AttendanceRecord.STATUS_PARTIAL).count()
        clocked_in_count = attendance_records.filter(status=AttendanceRecord.STATUS_CLOCKED_IN).count()
        employees_with_attendance = attendance_records.values('employee').distinct().count()
        attendance_completion_rate = round((employees_with_attendance / employees.count()) * 100) if employees.exists() else 0

        total_net_pay = sum((record.netPay for record in payroll_records), Decimal('0'))
        paid_net_pay = sum((record.netPay for record in payroll_records.filter(status=PayrollRecord.STATUS_PAID)), Decimal('0'))
        pending_net_pay = sum((record.netPay for record in payroll_records.exclude(status=PayrollRecord.STATUS_PAID)), Decimal('0'))
        payroll_count = payroll_records.count()

        average_rating = reviews.aggregate(avg=Avg('overallRating')).get('avg') or 0
        average_goal_progress = goals.aggregate(avg=Avg('progress')).get('avg') or 0
        submitted_expense_amount = sum((claim.amount for claim in expenses.filter(status='Submitted')), Decimal('0'))
        approved_expense_amount = sum((claim.amount for claim in expenses.filter(status='Approved')), Decimal('0'))
        reimbursed_expense_amount = sum((claim.amount for claim in expenses.filter(status='Reimbursed')), Decimal('0'))
        open_tickets = tickets.exclude(status__in=['Resolved', 'Closed'])

        return Response({
            'totals': {
                'totalEmployees': employees.count(),
                'activeEmployees': employees.filter(employmentStatus__iexact='Active').count(),
                'attendanceLogged': attendance_records.count(),
                'pendingLeaveRequests': leave_requests.filter(status=LeaveRequest.STATUS_PENDING).count(),
                'openTasks': tasks.exclude(status='Done').count(),
                'acknowledgedReviews': reviews.filter(status='Acknowledged').count(),
                'trainingCompletionRate': training_completion_rate,
                'readyNowSuccessors': succession_plans.filter(readiness='Ready Now').count(),
            },
            'departmentBreakdown': [
                {'department': department, 'count': count}
                for department, count in sorted(department_counts.items(), key=lambda item: (-item[1], item[0]))
            ],
            'attendanceSummary': {
                'presentCount': present_count,
                'partialCount': partial_count,
                'clockedInCount': clocked_in_count,
                'completionRate': attendance_completion_rate,
            },
            'leaveSummary': {
                'pendingCount': leave_requests.filter(status=LeaveRequest.STATUS_PENDING).count(),
                'approvedCount': leave_requests.filter(status=LeaveRequest.STATUS_APPROVED).count(),
                'rejectedCount': leave_requests.filter(status=LeaveRequest.STATUS_REJECTED).count(),
            },
            'payrollSummary': {
                'recordsProcessed': payroll_count,
                'paidRecords': payroll_records.filter(status=PayrollRecord.STATUS_PAID).count(),
                'draftRecords': payroll_records.filter(status=PayrollRecord.STATUS_DRAFT).count(),
                'totalNetPay': float(total_net_pay),
                'paidNetPay': float(paid_net_pay),
                'pendingNetPay': float(pending_net_pay),
                'averageNetPay': round(float(total_net_pay / payroll_count), 2) if payroll_count else 0,
            },
            'reviewSummary': {
                'averageRating': round(float(average_rating), 1) if average_rating else 0,
                'submittedReviews': reviews.filter(status='Submitted').count(),
                'acknowledgedReviews': reviews.filter(status='Acknowledged').count(),
            },
            'goalSummary': {
                'activeGoals': goals.count(),
                'completedGoals': goals.filter(status='Completed').count(),
                'averageProgress': round(float(average_goal_progress), 1) if average_goal_progress else 0,
            },
            'trainingSummary': {
                'assignedLearners': total_assignments,
                'completedLearners': completed_assignments,
            },
            'expenseSummary': {
                'submittedCount': expenses.filter(status='Submitted').count(),
                'approvedCount': expenses.filter(status='Approved').count(),
                'rejectedCount': expenses.filter(status='Rejected').count(),
                'reimbursedCount': expenses.filter(status='Reimbursed').count(),
                'submittedAmount': float(submitted_expense_amount),
                'approvedAmount': float(approved_expense_amount),
                'reimbursedAmount': float(reimbursed_expense_amount),
            },
            'documentSummary': {
                'pendingCount': documents.filter(status='Pending').count(),
                'inProgressCount': documents.filter(status='In Progress').count(),
                'issuedCount': documents.filter(status='Issued').count(),
                'declinedCount': documents.filter(status='Declined').count(),
            },
            'ticketSummary': {
                'openCount': open_tickets.count(),
                'criticalOpenCount': open_tickets.filter(priority='Critical').count(),
                'resolvedCount': tickets.filter(status='Resolved').count(),
                'closedCount': tickets.filter(status='Closed').count(),
            },
            'successionSummary': {
                'activePlans': succession_plans.count(),
                'highRiskPlans': succession_plans.filter(retentionRisk='High').count(),
                'readySoon': succession_plans.filter(readiness__in=['Ready Now', '6-12 Months']).count(),
                'readinessBreakdown': [
                    {'label': label, 'count': count}
                    for label, count in sorted(readiness_counts.items(), key=lambda item: (-item[1], item[0]))
                ],
            },
        })            



class HRBenefitWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        today = timezone.localdate()
        benefits = list(
            BenefitEnrollment.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-effectiveDate', '-createdAt')
        )

        def due_state(item):
            if item.status != 'Pending':
                return item.status
            if item.effectiveDate:
                if item.effectiveDate < today:
                    return 'Overdue'
                if item.effectiveDate <= today + timedelta(days=7):
                    return 'Due Soon'
            return 'Pending Review'

        follow_up_items = []
        type_map = {}
        total_monthly_cost = Decimal('0')
        total_employee_contribution = Decimal('0')

        for item in benefits:
            benefit_type_entry = type_map.setdefault(item.benefitType, {
                'benefitType': item.benefitType,
                'count': 0,
                'pendingCount': 0,
                'enrolledCount': 0,
                'waivedCount': 0,
                'monthlyCost': 0.0,
            })
            benefit_type_entry['count'] += 1
            benefit_type_entry['monthlyCost'] += float(item.monthlyCost or 0)

            if item.status == 'Pending':
                benefit_type_entry['pendingCount'] += 1
            elif item.status == 'Enrolled':
                benefit_type_entry['enrolledCount'] += 1
            elif item.status == 'Waived':
                benefit_type_entry['waivedCount'] += 1

            total_monthly_cost += item.monthlyCost or Decimal('0')
            total_employee_contribution += item.employeeContribution or Decimal('0')

            item_due_state = due_state(item)
            if item_due_state in {'Overdue', 'Due Soon', 'Pending Review'}:
                days_to_effective = (item.effectiveDate - today).days if item.effectiveDate else None
                contribution_rate = 0
                if item.monthlyCost:
                    contribution_rate = round((float(item.employeeContribution or 0) / float(item.monthlyCost)) * 100)
                follow_up_items.append({
                    'enrollmentID': item.enrollmentID,
                    'employeeName': item.employee.fullName,
                    'employeeID': item.employee_id,
                    'benefitName': item.benefitName,
                    'benefitType': item.benefitType,
                    'status': item.status,
                    'dueState': item_due_state,
                    'effectiveDate': item.effectiveDate.isoformat() if item.effectiveDate else None,
                    'daysToEffective': days_to_effective,
                    'contributionRate': contribution_rate,
                    'summary': item.notes or 'Benefit enrollment is still waiting for employee confirmation.',
                    'path': '/hr/benefits',
                })

        priority_order = {'Overdue': 0, 'Due Soon': 1, 'Pending Review': 2}
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (
                priority_order.get(item['dueState'], 9),
                item['daysToEffective'] if item['daysToEffective'] is not None else 999,
                item['employeeName'],
            ),
        )[:8]

        benefit_type_breakdown = sorted(
            type_map.values(),
            key=lambda item: (-item['pendingCount'], -item['count'], item['benefitType']),
        )

        return Response({
            'summary': {
                'totalEnrollments': len(benefits),
                'pendingCount': sum(1 for item in benefits if item.status == 'Pending'),
                'enrolledCount': sum(1 for item in benefits if item.status == 'Enrolled'),
                'waivedCount': sum(1 for item in benefits if item.status == 'Waived'),
                'overdueCount': sum(1 for item in benefits if due_state(item) == 'Overdue'),
                'dueSoonCount': sum(1 for item in benefits if due_state(item) == 'Due Soon'),
                'followUpCount': len(follow_up_items),
                'totalMonthlyCost': round(float(total_monthly_cost), 2),
                'employeeContributionTotal': round(float(total_employee_contribution), 2),
            },
            'benefitTypeBreakdown': benefit_type_breakdown,
            'followUpItems': follow_up_items,
        })


class HRBenefitListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        benefits = BenefitEnrollment.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        benefit_type = request.query_params.get('benefit_type')
        status_filter = request.query_params.get('status')
        if employee_id:
            benefits = benefits.filter(employee_id=employee_id)
        if benefit_type:
            benefits = benefits.filter(benefitType=benefit_type)
        if status_filter:
            benefits = benefits.filter(status=status_filter)

        return Response(BenefitEnrollmentSerializer(benefits.order_by('-effectiveDate', '-createdAt'), many=True).data)

    def post(self, request):
        serializer = BenefitEnrollmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee = _resolve_employee(serializer.validated_data['employeeID'], request.user)
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        benefit = BenefitEnrollment.objects.create(
            employee=employee,
            benefitName=serializer.validated_data['benefitName'],
            benefitType=serializer.validated_data.get('benefitType', 'Medical'),
            provider=serializer.validated_data.get('provider', ''),
            coverageLevel=serializer.validated_data.get('coverageLevel', ''),
            status=serializer.validated_data.get('status', 'Pending'),
            monthlyCost=serializer.validated_data.get('monthlyCost', 0),
            employeeContribution=serializer.validated_data.get('employeeContribution', 0),
            effectiveDate=serializer.validated_data.get('effectiveDate'),
            notes=serializer.validated_data.get('notes', ''),
            createdBy=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
        )
        return Response(BenefitEnrollmentSerializer(benefit).data, status=status.HTTP_201_CREATED)


class EmployeeExpenseListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        claims = ExpenseClaim.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        category = request.query_params.get('category')
        if status_filter:
            claims = claims.filter(status=status_filter)
        if category:
            claims = claims.filter(category=category)

        return Response(ExpenseClaimSerializer(claims.order_by('-expenseDate', '-createdAt'), many=True).data)

    def post(self, request):
        serializer = ExpenseClaimCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee_id = getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        employee = Employee.objects.filter(employeeID=employee_id, isDeleted=False).first()
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        claim = ExpenseClaim.objects.create(
            employee=employee,
            title=serializer.validated_data['title'],
            category=serializer.validated_data.get('category', 'Other'),
            amount=serializer.validated_data['amount'],
            expenseDate=serializer.validated_data['expenseDate'],
            description=serializer.validated_data.get('description', ''),
            status='Submitted',
        )
        return Response(ExpenseClaimSerializer(claim).data, status=status.HTTP_201_CREATED)


class HRExpenseWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        today = timezone.localdate()
        claims = list(
            ExpenseClaim.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-expenseDate', '-createdAt')
        )

        def follow_up_state(claim):
            age_days = max((timezone.now() - (claim.createdAt or timezone.now())).days, 0)
            if claim.status == 'Submitted':
                if age_days >= 4:
                    return 'Overdue Review'
                if age_days >= 2:
                    return 'Needs Review'
            if claim.status == 'Approved':
                return 'Awaiting Reimbursement'
            return claim.status

        follow_up_items = []
        category_map = {}
        total_amount = Decimal('0')
        for claim in claims:
            entry = category_map.setdefault(claim.category, {
                'category': claim.category,
                'count': 0,
                'submittedCount': 0,
                'approvedCount': 0,
                'reimbursedCount': 0,
                'amount': 0.0,
            })
            entry['count'] += 1
            entry['amount'] += float(claim.amount or 0)
            total_amount += claim.amount or Decimal('0')

            if claim.status == 'Submitted':
                entry['submittedCount'] += 1
            elif claim.status == 'Approved':
                entry['approvedCount'] += 1
            elif claim.status == 'Reimbursed':
                entry['reimbursedCount'] += 1

            state = follow_up_state(claim)
            if state in {'Overdue Review', 'Needs Review', 'Awaiting Reimbursement'}:
                age_days = max((timezone.now() - (claim.createdAt or timezone.now())).days, 0)
                follow_up_items.append({
                    'claimID': claim.claimID,
                    'employeeName': claim.employee.fullName,
                    'employeeID': claim.employee_id,
                    'title': claim.title,
                    'category': claim.category,
                    'amount': round(float(claim.amount or 0), 2),
                    'status': claim.status,
                    'followUpState': state,
                    'ageDays': age_days,
                    'expenseDate': claim.expenseDate.isoformat() if claim.expenseDate else None,
                    'summary': claim.reviewNote or claim.description or 'Expense claim requires finance follow-up.',
                    'path': '/hr/expenses',
                })

        state_rank = {'Overdue Review': 0, 'Needs Review': 1, 'Awaiting Reimbursement': 2}
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (state_rank.get(item['followUpState'], 9), -item['ageDays'], -item['amount']),
        )[:8]

        category_breakdown = sorted(
            category_map.values(),
            key=lambda item: (-item['submittedCount'], -item['amount'], item['category']),
        )

        return Response({
            'summary': {
                'totalClaims': len(claims),
                'submittedCount': sum(1 for claim in claims if claim.status == 'Submitted'),
                'approvedCount': sum(1 for claim in claims if claim.status == 'Approved'),
                'reimbursedCount': sum(1 for claim in claims if claim.status == 'Reimbursed'),
                'overdueCount': sum(1 for claim in claims if follow_up_state(claim) == 'Overdue Review'),
                'followUpCount': len(follow_up_items),
                'totalAmount': round(float(total_amount), 2),
            },
            'categoryBreakdown': category_breakdown,
            'followUpItems': follow_up_items,
        })


class HRExpenseListView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        claims = ExpenseClaim.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')
        category = request.query_params.get('category')
        if employee_id:
            claims = claims.filter(employee_id=employee_id)
        if status_filter:
            claims = claims.filter(status=status_filter)
        if category:
            claims = claims.filter(category=category)

        return Response(ExpenseClaimSerializer(claims.order_by('-expenseDate', '-createdAt'), many=True).data)


class HRExpenseReviewView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, claim_id):
        try:
            claim = ExpenseClaim.objects.select_related('employee').get(pk=claim_id)
        except ExpenseClaim.DoesNotExist:
            return Response({'error': 'Expense claim not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ExpenseClaimReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        next_status = serializer.validated_data['status']
        allowed_transitions = {
            'Submitted': {'Approved', 'Rejected', 'Reimbursed'},
            'Approved': {'Approved', 'Reimbursed'},
            'Rejected': {'Rejected'},
            'Reimbursed': {'Reimbursed'},
        }
        if next_status not in allowed_transitions.get(claim.status, {claim.status}):
            return Response({'error': f'Invalid expense status transition from {claim.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)

        claim.status = next_status
        claim.reviewNote = serializer.validated_data.get('note', '')
        # Only persist approvedAmount when transitioning to Approved (or carrying through Reimbursed)
        approved_amount = serializer.validated_data.get('approvedAmount', None)
        if next_status == 'Approved' and approved_amount is not None:
            claim.approvedAmount = approved_amount
        claim.reviewedBy = getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '')
        claim.reviewedAt = timezone.now()
        claim.save(update_fields=['status', 'reviewNote', 'approvedAmount', 'reviewedBy', 'reviewedAt', 'updatedAt'])
        return Response(ExpenseClaimSerializer(claim).data)


class EmployeeDocumentListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        documents = DocumentRequest.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        if status_filter:
            documents = documents.filter(status=status_filter)

        return Response(DocumentRequestSerializer(documents.order_by('-createdAt'), many=True).data)

    def post(self, request):
        serializer = DocumentRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee_id = getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        employee = Employee.objects.filter(employeeID=employee_id, isDeleted=False).first()
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        document = DocumentRequest.objects.create(
            employee=employee,
            documentType=serializer.validated_data.get('documentType', 'Employment Letter'),
            purpose=serializer.validated_data['purpose'],
            notes=serializer.validated_data.get('notes', ''),
            status='Pending',
        )
        return Response(DocumentRequestSerializer(document).data, status=status.HTTP_201_CREATED)


class HRDocumentListView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        documents = DocumentRequest.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')
        document_type = request.query_params.get('document_type')
        if employee_id:
            documents = documents.filter(employee_id=employee_id)
        if status_filter:
            documents = documents.filter(status=status_filter)
        if document_type:
            documents = documents.filter(documentType=document_type)

        return Response(DocumentRequestSerializer(documents.order_by('-createdAt'), many=True).data)


class HRDocumentWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        now = timezone.now()
        documents = list(
            DocumentRequest.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-updatedAt', '-createdAt')
        )

        def follow_up_state(document):
            age_days = max((now - (document.createdAt or now)).days, 0)
            if document.status == 'Pending':
                if age_days >= 3:
                    return 'Overdue'
                return 'Pending Intake'
            if document.status == 'In Progress':
                if age_days >= 2:
                    return 'Awaiting Finalization'
                return 'In Progress'
            return document.status

        type_map = {}
        follow_up_items = []

        for document in documents:
            entry = type_map.setdefault(document.documentType, {
                'documentType': document.documentType,
                'count': 0,
                'pendingCount': 0,
                'inProgressCount': 0,
                'issuedCount': 0,
                'declinedCount': 0,
            })
            entry['count'] += 1
            if document.status == 'Pending':
                entry['pendingCount'] += 1
            elif document.status == 'In Progress':
                entry['inProgressCount'] += 1
            elif document.status == 'Issued':
                entry['issuedCount'] += 1
            elif document.status == 'Declined':
                entry['declinedCount'] += 1

            state = follow_up_state(document)
            if state in {'Overdue', 'Pending Intake', 'Awaiting Finalization', 'In Progress'}:
                age_days = max((now - (document.createdAt or now)).days, 0)
                follow_up_items.append({
                    'requestID': document.requestID,
                    'employeeName': document.employee.fullName,
                    'employeeID': document.employee_id,
                    'documentType': document.documentType,
                    'purpose': document.purpose,
                    'status': document.status,
                    'followUpState': state,
                    'ageDays': age_days,
                    'requestedAt': document.createdAt.isoformat() if document.createdAt else None,
                    'summary': document.reviewNote or document.notes or 'Document request is waiting for HR issuance follow-up.',
                    'path': '/hr/documents',
                })

        state_rank = {
            'Overdue': 0,
            'Awaiting Finalization': 1,
            'Pending Intake': 2,
            'In Progress': 3,
        }
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (
                state_rank.get(item['followUpState'], 9),
                -item['ageDays'],
                item['employeeName'],
            ),
        )[:8]

        document_type_breakdown = sorted(
            type_map.values(),
            key=lambda item: (-item['pendingCount'], -item['inProgressCount'], -item['count'], item['documentType']),
        )

        return Response({
            'summary': {
                'totalRequests': len(documents),
                'pendingCount': sum(1 for document in documents if document.status == 'Pending'),
                'inProgressCount': sum(1 for document in documents if document.status == 'In Progress'),
                'issuedCount': sum(1 for document in documents if document.status == 'Issued'),
                'declinedCount': sum(1 for document in documents if document.status == 'Declined'),
                'overdueCount': sum(1 for document in documents if follow_up_state(document) == 'Overdue'),
                'followUpCount': len(follow_up_items),
            },
            'documentTypeBreakdown': document_type_breakdown,
            'followUpItems': follow_up_items,
        })


class HRDocumentIssueView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, request_id):
        try:
            document = DocumentRequest.objects.select_related('employee').get(pk=request_id)
        except DocumentRequest.DoesNotExist:
            return Response({'error': 'Document request not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = DocumentRequestIssueSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        next_status = serializer.validated_data['status']
        allowed_transitions = {
            'Pending': {'In Progress', 'Issued', 'Declined'},
            'In Progress': {'In Progress', 'Issued', 'Declined'},
            'Issued': {'Issued'},
            'Declined': {'Declined'},
        }
        if next_status not in allowed_transitions.get(document.status, {document.status}):
            return Response({'error': f'Invalid document status transition from {document.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)

        document.status = next_status
        document.reviewNote = serializer.validated_data.get('note', '')
        document.issuedBy = getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '')
        if document.status == 'Issued':
            document.issuedAt = timezone.now()
        document.save(update_fields=['status', 'reviewNote', 'issuedBy', 'issuedAt', 'updatedAt'])
        return Response(DocumentRequestSerializer(document).data)        
    
class EmployeeTicketListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = request.query_params.get('employee_id') or getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        tickets = SupportTicket.objects.select_related('employee').filter(employee_id=employee_id, employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        category = request.query_params.get('category')
        if status_filter:
            tickets = tickets.filter(status=status_filter)
        if category:
            tickets = tickets.filter(category=category)

        return Response(SupportTicketSerializer(tickets.order_by('-updatedAt', '-createdAt'), many=True).data)

    def post(self, request):
        serializer = SupportTicketCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee_id = getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'employee_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        employee = Employee.objects.filter(employeeID=employee_id, isDeleted=False).first()
        if not employee:
            return Response({'error': 'Employee not found.'}, status=status.HTTP_404_NOT_FOUND)

        ticket = SupportTicket.objects.create(
            employee=employee,
            subject=serializer.validated_data['subject'],
            category=serializer.validated_data.get('category', 'General'),
            priority=serializer.validated_data.get('priority', 'Medium'),
            description=serializer.validated_data.get('description', ''),
            status='Open',
        )
        return Response(SupportTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class HRTicketListView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        tickets = SupportTicket.objects.select_related('employee').filter(employee__isDeleted=False)

        employee_id = request.query_params.get('employee_id')
        status_filter = request.query_params.get('status')
        category = request.query_params.get('category')
        if employee_id:
            tickets = tickets.filter(employee_id=employee_id)
        if status_filter:
            tickets = tickets.filter(status=status_filter)
        if category:
            tickets = tickets.filter(category=category)

        return Response(SupportTicketSerializer(tickets.order_by('-updatedAt', '-createdAt'), many=True).data)


class HRTicketWatchView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        now = timezone.now()
        tickets = list(
            SupportTicket.objects.select_related('employee')
            .filter(employee__isDeleted=False)
            .order_by('-updatedAt', '-createdAt')
        )

        def follow_up_state(ticket):
            last_touch = ticket.updatedAt or ticket.createdAt or now
            age_days = max((now - last_touch).days, 0)
            if ticket.status == 'Open':
                if ticket.priority == 'Critical' or age_days >= 3:
                    return 'Escalate Now'
                if ticket.priority == 'High' or age_days >= 1:
                    return 'Needs Assignment'
            if ticket.status == 'In Progress':
                if ticket.priority in {'Critical', 'High'} or age_days >= 2:
                    return 'Stalled Resolution'
                return 'In Progress'
            if ticket.status == 'Resolved':
                return 'Pending Closure'
            return ticket.status

        follow_up_items = []
        category_map = {}

        for ticket in tickets:
            entry = category_map.setdefault(ticket.category, {
                'category': ticket.category,
                'count': 0,
                'openCount': 0,
                'inProgressCount': 0,
                'resolvedCount': 0,
                'criticalCount': 0,
            })
            entry['count'] += 1
            if ticket.status == 'Open':
                entry['openCount'] += 1
            elif ticket.status == 'In Progress':
                entry['inProgressCount'] += 1
            elif ticket.status == 'Resolved':
                entry['resolvedCount'] += 1
            if ticket.priority == 'Critical':
                entry['criticalCount'] += 1

            state = follow_up_state(ticket)
            if state in {'Escalate Now', 'Needs Assignment', 'Stalled Resolution', 'Pending Closure'}:
                last_touch = ticket.updatedAt or ticket.createdAt or now
                age_days = max((now - last_touch).days, 0)
                follow_up_items.append({
                    'ticketID': ticket.ticketID,
                    'employeeName': ticket.employee.fullName,
                    'employeeID': ticket.employee_id,
                    'subject': ticket.subject,
                    'category': ticket.category,
                    'priority': ticket.priority,
                    'status': ticket.status,
                    'followUpState': state,
                    'ageDays': age_days,
                    'lastTouchAt': last_touch.isoformat() if last_touch else None,
                    'summary': ticket.resolutionNote or ticket.description or 'Support ticket needs an HR follow-up update.',
                    'path': '/hr/tickets',
                })

        state_rank = {
            'Escalate Now': 0,
            'Stalled Resolution': 1,
            'Needs Assignment': 2,
            'Pending Closure': 3,
        }
        follow_up_items = sorted(
            follow_up_items,
            key=lambda item: (
                state_rank.get(item['followUpState'], 9),
                -item['ageDays'],
                item['employeeName'],
            ),
        )[:8]

        category_breakdown = sorted(
            category_map.values(),
            key=lambda item: (-item['criticalCount'], -item['openCount'], -item['count'], item['category']),
        )

        return Response({
            'summary': {
                'totalTickets': len(tickets),
                'openCount': sum(1 for ticket in tickets if ticket.status == 'Open'),
                'inProgressCount': sum(1 for ticket in tickets if ticket.status == 'In Progress'),
                'resolvedCount': sum(1 for ticket in tickets if ticket.status == 'Resolved'),
                'closedCount': sum(1 for ticket in tickets if ticket.status == 'Closed'),
                'criticalCount': sum(1 for ticket in tickets if ticket.priority == 'Critical'),
                'followUpCount': len(follow_up_items),
            },
            'categoryBreakdown': category_breakdown,
            'followUpItems': follow_up_items,
        })


class HRTicketStatusView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, ticket_id):
        try:
            ticket = SupportTicket.objects.select_related('employee').get(pk=ticket_id)
        except SupportTicket.DoesNotExist:
            return Response({'error': 'Support ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SupportTicketStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        next_status = serializer.validated_data['status']
        allowed_transitions = {
            'Open': {'In Progress', 'Resolved', 'Closed'},
            'In Progress': {'In Progress', 'Resolved', 'Closed'},
            'Resolved': {'Resolved', 'Closed'},
            'Closed': {'Closed'},
        }
        if next_status not in allowed_transitions.get(ticket.status, {ticket.status}):
            return Response({'error': f'Invalid ticket status transition from {ticket.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket.status = next_status
        ticket.resolutionNote = serializer.validated_data.get('note', '')
        ticket.assignedTo = getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '')
        if ticket.status in ('Resolved', 'Closed'):
            ticket.resolvedAt = timezone.now()
        ticket.save(update_fields=['status', 'resolutionNote', 'assignedTo', 'resolvedAt', 'updatedAt'])
        return Response(SupportTicketSerializer(ticket).data)


def _can_access_ticket(request, ticket):
    """Admins can access any ticket; everyone else only their own."""
    if getattr(request.user, 'role', None) == 'Admin':
        return True
    return ticket.employee_id == getattr(request.user, 'employee_id', None)


class AdminTicketListView(APIView):
    """GET /api/employee_management/admin/tickets/ — all support tickets (Admin)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        tickets = SupportTicket.objects.select_related('employee').filter(employee__isDeleted=False)
        status_filter = request.query_params.get('status')
        category = request.query_params.get('category')
        priority = request.query_params.get('priority')
        if status_filter:
            tickets = tickets.filter(status=status_filter)
        if category:
            tickets = tickets.filter(category=category)
        if priority:
            tickets = tickets.filter(priority=priority)
        return Response(SupportTicketSerializer(tickets.order_by('-updatedAt', '-createdAt'), many=True).data)


class TicketDetailView(APIView):
    """GET /api/employee_management/tickets/<id>/ — ticket + conversation thread.
    Accessible by the ticket owner or an Admin."""
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request, ticket_id):
        ticket = (SupportTicket.objects.select_related('employee')
                  .prefetch_related('messages').filter(pk=ticket_id).first())
        if not ticket:
            return Response({'error': 'Support ticket not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_access_ticket(request, ticket):
            return Response({'error': 'You do not have access to this ticket.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(SupportTicketDetailSerializer(ticket).data)


class TicketMessageCreateView(APIView):
    """POST /api/employee_management/tickets/<id>/messages/ — add a reply to the
    conversation. Admin or the ticket owner; blocked once the ticket is Closed."""
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def post(self, request, ticket_id):
        ticket = SupportTicket.objects.select_related('employee').filter(pk=ticket_id).first()
        if not ticket:
            return Response({'error': 'Support ticket not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not _can_access_ticket(request, ticket):
            return Response({'error': 'You do not have access to this ticket.'}, status=status.HTTP_403_FORBIDDEN)
        if ticket.status == 'Closed':
            return Response({'error': 'This ticket is closed; no further replies can be added.'},
                            status=status.HTTP_400_BAD_REQUEST)

        body = (request.data.get('body') or '').strip()
        if not body:
            return Response({'body': 'Message cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        is_admin = getattr(request.user, 'role', None) == 'Admin'
        message = SupportTicketMessage.objects.create(
            ticket=ticket,
            authorRole='Admin' if is_admin else 'Employee',
            authorName=getattr(request.user, 'full_name', '') or getattr(request.user, 'email', ''),
            body=body,
            isResolution=False,
        )
        # An owner replying to a resolved ticket reopens it so the admin notices.
        if not is_admin and ticket.status == 'Resolved':
            ticket.status = 'In Progress'
            ticket.save(update_fields=['status', 'updatedAt'])
        else:
            ticket.save(update_fields=['updatedAt'])
        return Response(SupportTicketMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class AdminTicketStatusView(APIView):
    """POST /api/employee_management/admin/tickets/<id>/status/ — Admin sets any of
    the four statuses. A note is required when resolving and is stored as a
    resolution message in the thread."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, ticket_id):
        ticket = SupportTicket.objects.select_related('employee').filter(pk=ticket_id).first()
        if not ticket:
            return Response({'error': 'Support ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        valid_statuses = [choice[0] for choice in SupportTicket.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'status': f'Invalid status. Must be one of {valid_statuses}.'},
                            status=status.HTTP_400_BAD_REQUEST)

        note = (request.data.get('note') or '').strip()
        if new_status == 'Resolved' and not note:
            return Response({'note': 'A resolution note is required when resolving a ticket.'},
                            status=status.HTTP_400_BAD_REQUEST)

        ticket.status = new_status
        ticket.assignedTo = getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '')
        update_fields = ['status', 'assignedTo', 'updatedAt']
        if new_status in ('Resolved', 'Closed'):
            ticket.resolvedAt = timezone.now()
            update_fields.append('resolvedAt')
        if note and new_status == 'Resolved':
            ticket.resolutionNote = note
            update_fields.append('resolutionNote')
        ticket.save(update_fields=update_fields)

        if note:
            SupportTicketMessage.objects.create(
                ticket=ticket,
                authorRole='Admin',
                authorName=ticket.assignedTo,
                body=note,
                isResolution=(new_status == 'Resolved'),
            )

        ticket = (SupportTicket.objects.select_related('employee')
                  .prefetch_related('messages').get(pk=ticket_id))
        return Response(SupportTicketDetailSerializer(ticket).data)




class EmployeeProfileView(APIView):
    """GET /employee_management/employee/profile/ — the requesting user's own
    employee record (read-only). Available to any internal employee, so the
    profile pages can show real data without HR-level permissions."""
    permission_classes = [IsAuthenticated, IsInternalEmployee]

    def get(self, request):
        employee_id = getattr(request.user, 'employee_id', None)
        if not employee_id:
            return Response({'error': 'No employee linked to this account.'},
                            status=status.HTTP_404_NOT_FOUND)
        employee = Employee.objects.filter(employeeID=employee_id, isDeleted=False).first()
        if not employee:
            return Response({'error': 'Employee record not found.'},
                            status=status.HTTP_404_NOT_FOUND)
        data = EmployeeSerializer(employee).data
        # Resolve FK ids to human-readable names so the profile page shows real labels.
        data['departmentName'] = employee.department.name if employee.department_id else None
        data['teamName'] = employee.team.name if employee.team_id else None
        manager = employee.team.leader if (employee.team_id and employee.team.leader_id) else None
        data['managerName'] = manager.fullName if manager else None
        return Response(data)
