from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin
from .models import Department, Team, Job, LeaveType
from .serializers import DepartmentSerializer, TeamSerializer, JobSerializer, LeaveTypeSerializer


# ============================================================================
# DEPARTMENT VIEWS
# ============================================================================

class DepartmentListCreateView(APIView):
    """
    GET  /api/employee_management/departments/        - List all departments
    POST /api/employee_management/departments/        - Create a new department (Admin only)
    """
    permission_classes = [IsAuthenticated, IsAdmin]

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
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        teams = Team.objects.select_related('department')
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
            return Team.objects.select_related('department').get(team_id=pk)
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
    permission_classes = [IsAuthenticated, IsAdmin]

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
