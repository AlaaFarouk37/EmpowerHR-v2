from datetime import datetime, timedelta, timezone, date
from django.db.models import Count

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsHRManager, IsTeamLeader
from feedback.models import FeedbackForm, FeedbackSubmission
from .models import AttritionPrediction
from .serializers import AttritionPredictionSerializer
from employee_management.models import Employee, Department, Team, SupportTicket, WorkTask, DocumentRequest
from Attendance_and_Leave.models import LeaveRequest


def _label(value):
    """Return the .name of an FK instance (Team / Department), or '' if None."""
    return getattr(value, 'name', '') or ''


def _ai_policy_payload():
    return {
        'decisionSupportOnly': getattr(settings, 'AI_DECISION_SUPPORT_ONLY', True),
        'modelVersion': getattr(settings, 'ATTRITION_MODEL_VERSION', 'xgboost-attrition-v2-governed'),
        'governanceNotice': getattr(
            settings,
            'AI_GOVERNANCE_NOTICE',
            'AI outputs are advisory only and must be reviewed by HR before any employment decision.',
        ),
        'protectedFieldsNeutralized': ['Age', 'Gender', 'Marital Status'],
    }


def _ensure_retention_task(employee, requesting_user):
    """Create a 'Retention conversation' WorkTask for the team's leader if a High-risk
    prediction exists for `employee` and one isn't already open. Returns the WorkTask
    instance or None when no task is created."""
    if not employee or not getattr(employee, 'team', None):
        return None

    leader = (
        Employee.objects
        .filter(team=employee.team, user_account__role='TeamLeader', isDeleted=False)
        .exclude(employeeID=employee.employeeID)
        .first()
    )
    if not leader:
        return None

    description = f"Retention conversation required for {employee.fullName}"
    existing = WorkTask.objects.filter(
        employee=leader,
        description=description,
    ).exclude(status='Done').first()
    if existing:
        return existing

    hr_label = (
        getattr(requesting_user, 'full_name', '')
        or getattr(requesting_user, 'email', '')
        or 'System'
    )
    return WorkTask.objects.create(
        employee=leader,
        title=f'Retention conversation: {employee.fullName}',
        description=description,
        priority='High',
        status='To Do',
        progress=0,
        assignedBy=f'ActionPlan:{hr_label}',
    )


class RunAttritionPredictionView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    """
    POST /api/attrition/run/

    Triggered manually by the HR Manager.
    Finds the latest active FeedbackForm, fetches all completed submissions,
    runs prediction for each employee, saves and returns results.

    Optional body:
    {
        "form_id": "abc123"   // if omitted, uses the latest active form
    }
    """

    def post(self, request):
        from .predictor import predict_risk
        from django.db.models import Max

        # Backfill: ensure every employee currently flagged High-risk has an open
        # retention conversation task on their team leader. Self-healing for any
        # predictions saved before the auto-task hook existed.
        latest_ids = (
            AttritionPrediction.objects
            .values('employeeID')
            .annotate(latest=Max('predictedAt'))
            .values('employeeID', 'latest')
        )
        for entry in latest_ids:
            try:
                pred = AttritionPrediction.objects.select_related('employeeID').get(
                    employeeID_id=entry['employeeID'],
                    predictedAt=entry['latest'],
                )
                if pred.riskLevel in ('High', 'Medium') and pred.employeeID:
                    _ensure_retention_task(pred.employeeID, request.user)
            except Exception:
                pass

        # Find the form to use
        form_id = request.data.get('form_id')
        if form_id:
            try:
                form = FeedbackForm.objects.get(pk=form_id, isActive=True)
            except FeedbackForm.DoesNotExist:
                return Response({'error': 'Form not found or inactive.'},
                                status=status.HTTP_404_NOT_FOUND)
        else:
            form = FeedbackForm.objects.filter(isActive=True).order_by('-createdAt').first()
            if not form:
                return Response({'error': 'No active feedback forms found.'},
                                status=status.HTTP_404_NOT_FOUND)

        # Get all completed submissions for this form
        submissions = FeedbackSubmission.objects.filter(
            formID=form,
            status=FeedbackSubmission.STATUS_COMPLETED
        ).select_related('employeeID').prefetch_related(
            'answers__questionID'
        )

        if not submissions.exists():
            return Response(
                {'error': f'No completed submissions found for form: {form.title}'},
                status=status.HTTP_404_NOT_FOUND
            )

        results      = []
        errors       = []
        predictions  = []

        for submission in submissions:
            employee    = submission.employeeID
            answers_qs  = submission.answers.select_related('questionID').all()

            try:
                result = predict_risk(employee, answers_qs)

                # Save prediction to DB
                prediction = AttritionPrediction.objects.create(
                    employeeID_id   = employee.employeeID,
                    riskScore       = result['riskScore'],
                    riskLevel       = result['riskLevel'],
                    confidenceScore = result.get('confidenceScore', 0.0),
                    predictionSource = result.get('predictionSource', 'xgboost'),
                    modelVersion    = result.get('modelVersion', getattr(settings, 'ATTRITION_MODEL_VERSION', 'xgboost-attrition-v2-governed')),
                    reviewRequired  = result.get('reviewRequired', True),
                    feedbackFormID  = form.formID,
                )
                predictions.append(prediction)
                results.append({
                    **result,
                    'predictionID': prediction.predictionID,
                    'predictedAt':  prediction.predictedAt,
                })

                # Auto-create a retention conversation task for the TL whenever the
                # employee is flagged Medium- or High-risk (§6c).
                if result.get('riskLevel') in ('High', 'Medium'):
                    try:
                        _ensure_retention_task(employee, request.user)
                    except Exception:
                        # Failing to create the follow-up task should not block the prediction run.
                        pass

            except Exception as e:
                errors.append({
                    'employeeID': employee.employeeID,
                    'fullName':   employee.fullName,
                    'error':      str(e),
                })

        return Response({
            'formID':          form.formID,
            'formTitle':       form.title,
            'totalProcessed':  len(results),
            'totalErrors':     len(errors),
            'predictions':     results,
            'errors':          errors,
            'aiPolicy':        _ai_policy_payload(),
        }, status=status.HTTP_200_OK)


class AttritionPredictionListView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    """
    GET /api/attrition/predictions/
    Returns all predictions, optionally filtered by employee.

    GET /api/attrition/predictions/?employee_id=<id>
    GET /api/attrition/predictions/?risk_level=High
    """

    def get(self, request):
        qs = AttritionPrediction.objects.select_related('employeeID').all()

        employee_id = request.query_params.get('employee_id')
        risk_level  = request.query_params.get('risk_level')

        if employee_id:
            qs = qs.filter(employeeID_id=employee_id)
        if risk_level:
            qs = qs.filter(riskLevel=risk_level)

        serializer = AttritionPredictionSerializer(qs, many=True)
        return Response(serializer.data)


class AttritionPredictionLatestView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager | IsTeamLeader]

    """
    GET /api/attrition/predictions/latest/
    Returns the most recent prediction for every employee.
    Useful for the HR dashboard overview.
    """

    def get(self, request):
        # Get the latest prediction per employee
        from django.db.models import Max
        latest_ids = (
            AttritionPrediction.objects
            .values('employeeID')
            .annotate(latest=Max('predictedAt'))
            .values('employeeID', 'latest')
        )

        results = []
        previous_by_employee = {}
        for entry in latest_ids:
            pred = AttritionPrediction.objects.select_related('employeeID').get(
                employeeID_id=entry['employeeID'],
                predictedAt=entry['latest']
            )
            results.append(pred)
            # Escalation baseline = the employee's most recent prediction from a
            # DIFFERENT feedback form. Re-running the same form must not count as a
            # second, corroborating submission.
            previous = (
                AttritionPrediction.objects
                .filter(employeeID_id=entry['employeeID'])
                .exclude(predictionID=pred.predictionID)
                .exclude(feedbackFormID=pred.feedbackFormID)
                .order_by('-predictedAt')
                .first()
            )
            previous_by_employee[entry['employeeID']] = previous

        serializer = AttritionPredictionSerializer(results, many=True)
        data = serializer.data

        # Decorate each row with previous-form info and an escalation flag.
        # An employee is "escalated" when their current riskLevel is Medium/High AND
        # their most recent prediction from a DIFFERENT feedback form was also
        # Medium/High — i.e. two independent forms flagged them, not the same form
        # re-run. hadPreviousActionPlan is surfaced for context but no longer gates it.
        ELEVATED = (AttritionPrediction.RISK_MEDIUM, AttritionPrediction.RISK_HIGH)
        action_plans = WorkTask.objects.filter(assignedBy__startswith='ActionPlan:')
        for item, pred in zip(data, results):
            prev = previous_by_employee.get(pred.employeeID_id)
            item['previousRiskLevel'] = prev.riskLevel if prev else None
            item['previousPredictedAt'] = prev.predictedAt if prev else None
            item['previousFeedbackFormID'] = prev.feedbackFormID if prev else None

            had_previous_plan = False
            if prev:
                # Plan must have been created after the previous prediction and
                # before (or at) the current one — i.e. it belonged to the previous cycle.
                window = action_plans.filter(
                    employee_id=pred.employeeID_id,
                    createdAt__gte=prev.predictedAt,
                    createdAt__lte=pred.predictedAt,
                )
                # Also accept plans whose description references the employee (e.g. retention
                # tasks assigned to the team leader for this employee).
                window_for_team = action_plans.filter(
                    description__icontains=pred.employeeID.fullName,
                    createdAt__gte=prev.predictedAt,
                    createdAt__lte=pred.predictedAt,
                )
                had_previous_plan = window.exists() or window_for_team.exists()

            item['hadPreviousActionPlan'] = had_previous_plan
            item['escalation'] = bool(
                pred.riskLevel in ELEVATED
                and prev is not None
                and prev.riskLevel in ELEVATED
            )

        return Response(data)


class TeamAttritionLatestView(APIView):
    """GET /api/attrition/team/latest/ — the latest attrition prediction for every
    member of the requesting Team Leader's own team. Lightweight (id, name, risk
    level/score, date) and scoped to the team, for the leader dashboard card."""
    permission_classes = [IsAuthenticated, IsTeamLeader]

    def get(self, request):
        from django.db.models import Max

        leader_id = getattr(request.user, 'employee_id', None)
        employees = Employee.objects.filter(isDeleted=False, employmentStatus='Active')
        if getattr(request.user, 'role', None) == 'TeamLeader':
            leader = Employee.objects.filter(employeeID=leader_id, isDeleted=False).first()
            employees = employees.filter(team=leader.team) if (leader and leader.team_id) else employees.none()
        emp_ids = [e for e in employees.exclude(employeeID=leader_id).values_list('employeeID', flat=True)]

        latest = (
            AttritionPrediction.objects
            .filter(employeeID_id__in=emp_ids)
            .values('employeeID_id')
            .annotate(latest=Max('predictedAt'))
        )
        rows = []
        for entry in latest:
            pred = (
                AttritionPrediction.objects
                .select_related('employeeID')
                .get(employeeID_id=entry['employeeID_id'], predictedAt=entry['latest'])
            )
            rows.append({
                'employeeID': pred.employeeID_id,
                'employeeName': pred.employeeID.fullName,
                'riskLevel': pred.riskLevel,
                'riskScore': round(pred.riskScore, 4),
                'predictedAt': pred.predictedAt.isoformat(),
            })

        risk_rank = {'High': 0, 'Medium': 1, 'Low': 2}
        rows.sort(key=lambda r: (risk_rank.get(r['riskLevel'], 9), -r['riskScore']))
        return Response({
            'highRiskCount': sum(1 for r in rows if r['riskLevel'] == 'High'),
            'total': len(rows),
            'predictions': rows,
        })


class NotifyTeamLeaderOfRiskView(APIView):
    """POST /api/attrition/predictions/<predictionID>/notify-tl/ — HR manually notifies
    the team leader of an at-risk employee. Creates (or reuses) a WorkTask on the TL
    whose description contains the attrition insights."""
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, predictionID):
        try:
            pred = AttritionPrediction.objects.select_related('employeeID').get(pk=predictionID)
        except AttritionPrediction.DoesNotExist:
            return Response({'detail': 'Prediction not found.'}, status=status.HTTP_404_NOT_FOUND)

        employee = pred.employeeID
        if not employee or not getattr(employee, 'team', None):
            return Response({'detail': 'Employee has no team assigned — cannot identify a Team Leader.'}, status=status.HTTP_400_BAD_REQUEST)

        leader = (
            Employee.objects
            .filter(team=employee.team, user_account__role='TeamLeader', isDeleted=False)
            .exclude(employeeID=employee.employeeID)
            .first()
        )
        if not leader:
            return Response({'detail': f'No Team Leader found for team "{getattr(employee.team, "name", employee.team)}".'}, status=status.HTTP_404_NOT_FOUND)

        # Build a structured insights description for the TL.
        pct = round((pred.riskScore or 0) * 100) if pred.riskScore is not None else 0
        notes = (request.data or {}).get('notes') if isinstance(request.data, dict) else None
        body_lines = [
            f"Attrition Risk Insights for {employee.fullName} ({employee.employeeID}).",
            f"Current cycle: {pred.riskLevel} ({pct}%) — predicted {pred.predictedAt.strftime('%Y-%m-%d')}.",
        ]

        # Pull previous cycle for context
        previous = (
            AttritionPrediction.objects
            .filter(employeeID=employee)
            .exclude(predictionID=pred.predictionID)
            .order_by('-predictedAt')
            .first()
        )
        if previous:
            body_lines.append(f"Previous cycle: {previous.riskLevel} on {previous.predictedAt.strftime('%Y-%m-%d')}.")
            if pred.riskLevel == 'High' and previous.riskLevel == 'High':
                body_lines.append("ESCALATION: High-risk in two consecutive cycles. Consider escalating beyond a standard retention plan.")

        if notes:
            body_lines.append(f"HR note: {str(notes).strip()[:600]}")

        body_lines.append("Action requested: hold a retention conversation with this team member.")
        description = "\n".join(body_lines)

        hr_label = getattr(request.user, 'full_name', '') or getattr(request.user, 'email', '') or 'HR'

        # Reuse any open task with the same description so HR can't accidentally spam the TL.
        existing = WorkTask.objects.filter(
            employee=leader,
            description=description,
        ).exclude(status='Done').first()
        if existing:
            return Response({
                'detail': 'Team Leader was already notified — existing open task reused.',
                'taskID': existing.taskID,
                'teamLeaderID': leader.employeeID,
                'teamLeaderName': leader.fullName,
                'reused': True,
            })

        task = WorkTask.objects.create(
            employee=leader,
            title=f'Retention conversation: {employee.fullName}',
            description=description,
            priority='High',
            status='To Do',
            progress=0,
            assignedBy=f'ActionPlan:{hr_label}',
        )
        return Response({
            'detail': 'Team Leader notified.',
            'taskID': task.taskID,
            'teamLeaderID': leader.employeeID,
            'teamLeaderName': leader.fullName,
            'reused': False,
        }, status=status.HTTP_201_CREATED)


class AttritionGovernanceSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsHRManager]

    """GET /api/attrition/governance/ — production-readiness snapshot for AI predictions."""

    def get(self, request):
        from django.db.models import Max

        latest_ids = (
            AttritionPrediction.objects
            .values('employeeID')
            .annotate(latest=Max('predictedAt'))
            .values('employeeID', 'latest')
        )

        latest_predictions = []
        for entry in latest_ids:
            latest_predictions.append(
                AttritionPrediction.objects.select_related('employeeID').get(
                    employeeID_id=entry['employeeID'],
                    predictedAt=entry['latest'],
                )
            )

        serializer = AttritionPredictionSerializer(latest_predictions, many=True)
        serialized = serializer.data
        department_map = {}
        for item in serialized:
            department = item.get('department') or 'Unassigned'
            bucket = department_map.setdefault(department, {
                'department': department,
                'employees': 0,
                'highRisk': 0,
                'reviewRequired': 0,
                'lowConfidence': 0,
            })
            bucket['employees'] += 1
            if item.get('riskLevel') == 'High':
                bucket['highRisk'] += 1
            if item.get('reviewRequired'):
                bucket['reviewRequired'] += 1
            if item.get('confidenceLabel') == 'Low':
                bucket['lowConfidence'] += 1

        return Response({
            'policy': _ai_policy_payload(),
            'summary': {
                'totalEmployees': len(serialized),
                'highRisk': sum(1 for item in serialized if item.get('riskLevel') == 'High'),
                'reviewRequired': sum(1 for item in serialized if item.get('reviewRequired')),
                'lowConfidence': sum(1 for item in serialized if item.get('confidenceLabel') == 'Low'),
                'fallbackPredictions': sum(1 for item in serialized if item.get('predictionSource') != 'xgboost'),
            },
            'departmentBreakdown': sorted(department_map.values(), key=lambda item: item['department']),
        })




class HRPeopleIntelligenceView(APIView):
    """
    GET /api/feedback/hr/intelligence/
    Returns an executive people-intelligence board with trends and priority queue.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        from attrition.models import AttritionPrediction
        from attrition.serializers import AttritionPredictionSerializer

        employees_qs = Employee.objects.filter(isDeleted=False)
        employees = list(employees_qs)
        employee_ids = [employee.employeeID for employee in employees]
        employee_map = {employee.employeeID: employee for employee in employees}

        now = datetime.now()
        current_start = now - timedelta(days=30)
        previous_start = now - timedelta(days=60)

        def pct_change(current_value, previous_value):
            if previous_value == 0:
                return 100 if current_value > 0 else 0
            return round(((current_value - previous_value) / previous_value) * 100, 1)

        predictions = AttritionPrediction.objects.filter(employeeID_id__in=employee_ids).order_by('employeeID_id', '-predictedAt')
        latest_predictions = {}
        for prediction in predictions:
            if prediction.employeeID_id not in latest_predictions:
                latest_predictions[prediction.employeeID_id] = prediction

        current_predictions = AttritionPrediction.objects.filter(predictedAt__gte=current_start)
        previous_predictions = AttritionPrediction.objects.filter(predictedAt__gte=previous_start, predictedAt__lt=current_start)

        def latest_counts(queryset):
            latest = {}
            for prediction in queryset.order_by('employeeID_id', '-predictedAt'):
                if prediction.employeeID_id not in latest:
                    latest[prediction.employeeID_id] = prediction.riskLevel
            high_count = sum(1 for level in latest.values() if level == 'High')
            medium_count = sum(1 for level in latest.values() if level == 'Medium')
            return high_count, medium_count

        current_high, current_medium = latest_counts(current_predictions)
        previous_high, previous_medium = latest_counts(previous_predictions)

        pending_leave_counts = {
            row['employee_id']: row['total']
            for row in LeaveRequest.objects.filter(
                employee_id__in=employee_ids,
                status=LeaveRequest.STATUS_PENDING,
            ).values('employee_id').annotate(total=Count('leaveRequestID'))
        }
        open_ticket_counts = {
            row['employee_id']: row['total']
            for row in SupportTicket.objects.filter(
                employee_id__in=employee_ids,
                status__in=['Open', 'In Progress'],
            ).values('employee_id').annotate(total=Count('ticketID'))
        }
        blocked_task_counts = {
            row['employee_id']: row['total']
            for row in WorkTask.objects.filter(
                employee_id__in=employee_ids,
                status__in=['To Do', 'In Progress'],
            ).values('employee_id').annotate(total=Count('taskID'))
        }
        pending_document_counts = {
            row['employee_id']: row['total']
            for row in DocumentRequest.objects.filter(
                employee_id__in=employee_ids,
                status__in=['Pending', 'In Progress'],
            ).values('employee_id').annotate(total=Count('requestID'))
        }

        current_open_tickets = SupportTicket.objects.filter(createdAt__gte=current_start, status__in=['Open', 'In Progress']).count()
        previous_open_tickets = SupportTicket.objects.filter(createdAt__gte=previous_start, createdAt__lt=current_start, status__in=['Open', 'In Progress']).count()
        current_pending_leave = LeaveRequest.objects.filter(requestedAt__gte=current_start, status=LeaveRequest.STATUS_PENDING).count()
        previous_pending_leave = LeaveRequest.objects.filter(requestedAt__gte=previous_start, requestedAt__lt=current_start, status=LeaveRequest.STATUS_PENDING).count()

        priority_queue = []
        high_count = 0
        medium_count = 0

        for employee_id, employee in employee_map.items():
            prediction = latest_predictions.get(employee_id)
            risk_score = float(prediction.riskScore) if prediction else 0
            risk_level = prediction.riskLevel if prediction else 'Low'
            if risk_level == 'High':
                high_count += 1
            elif risk_level == 'Medium':
                medium_count += 1

            leave_count = pending_leave_counts.get(employee_id, 0)
            ticket_count = open_ticket_counts.get(employee_id, 0)
            task_count = blocked_task_counts.get(employee_id, 0)
            doc_count = pending_document_counts.get(employee_id, 0)

            priority_score = (
                (3 if risk_level == 'High' else 2 if risk_level == 'Medium' else 1)
                + leave_count
                + ticket_count
                + (task_count * 0.5)
                + (doc_count * 0.5)
            )

            if priority_score < 3 and risk_level == 'Low':
                continue

            serialized_prediction = AttritionPredictionSerializer(prediction).data if prediction else None
            recommended_actions = (serialized_prediction or {}).get('recommendedActions') or []
            if not recommended_actions and ticket_count:
                recommended_actions.append('Review open support blockers with IT and manager this week.')
            if not recommended_actions and leave_count:
                recommended_actions.append('Confirm leave planning and workload backfill to reduce delivery stress.')
            if not recommended_actions:
                recommended_actions.append('Schedule a proactive 1:1 check-in and monitor next cycle signals.')

            priority_queue.append({
                'employeeID': employee_id,
                'fullName': employee.fullName,
                'jobTitle': employee.jobTitle,
                'department': _label(employee.department),
                'team': _label(employee.team),
                'riskLevel': risk_level,
                'riskScore': round(risk_score, 4),
                'openTickets': ticket_count,
                'pendingLeave': leave_count,
                'blockedTasks': task_count,
                'pendingDocuments': doc_count,
                'priorityScore': round(priority_score, 2),
                'recommendedActions': recommended_actions[:3],
            })

        priority_queue.sort(key=lambda item: (item['priorityScore'], item['riskScore']), reverse=True)
        follow_up_count = len([item for item in priority_queue if item['riskLevel'] in ('High', 'Medium')])

        return Response({
            'overview': {
                'totalEmployees': len(employee_ids),
                'predictedEmployees': len(latest_predictions),
                'highRisk': high_count,
                'mediumRisk': medium_count,
                'followUpCount': follow_up_count,
                'coveragePct': round((len(latest_predictions) / max(len(employee_ids), 1)) * 100, 1),
            },
            'trends': {
                'riskPressurePct': pct_change(current_high + current_medium, previous_high + previous_medium),
                'supportLoadPct': pct_change(current_open_tickets, previous_open_tickets),
                'leavePressurePct': pct_change(current_pending_leave, previous_pending_leave),
            },
            'priorityQueue': priority_queue[:12],
        })
