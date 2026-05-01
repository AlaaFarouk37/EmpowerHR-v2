from decimal import Decimal
from django.db.models import Avg, Count, Q
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsHRManager, IsInternalEmployee, IsTeamLeader
from employee_management.models import Employee
from .models import (FeedbackForm, FeedbackQuestion,
                     FeedbackSubmission, FeedbackAnswer, AdminUser)
from .serializers import (
    FeedbackFormListSerializer,
    FeedbackFormDetailSerializer,
    FeedbackFormCreateUpdateSerializer,
    FeedbackQuestionCreateSerializer,
    FeedbackSubmissionSerializer,
    SubmitFeedbackSerializer,
)


# ---------------------------------------------------------------------------
# HR Manager -- Form Management
# ---------------------------------------------------------------------------

class HRFormListCreateView(APIView):
    """
    GET  /api/feedback/hr/forms/        list ALL forms (active and inactive)
    POST /api/feedback/hr/forms/        create a new form
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        forms = FeedbackForm.objects.prefetch_related(
            'questions', 'submissions').order_by('-createdAt')
        return Response(FeedbackFormListSerializer(forms, many=True).data)

    def post(self, request):
        serializer = FeedbackFormCreateUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        form = serializer.save()
        return Response(
            FeedbackFormDetailSerializer(form).data,
            status=status.HTTP_201_CREATED
        )


class HRFormDetailView(APIView):
    """
    GET    /api/feedback/hr/forms/<form_id>/   get form with questions
    PUT    /api/feedback/hr/forms/<form_id>/   update form title/description
    DELETE /api/feedback/hr/forms/<form_id>/   delete form
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get_form(self, form_id):
        try:
            return FeedbackForm.objects.prefetch_related('questions').get(pk=form_id)
        except FeedbackForm.DoesNotExist:
            return None

    def get(self, request, form_id):
        form = self.get_form(form_id)
        if not form:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(FeedbackFormDetailSerializer(form).data)

    def put(self, request, form_id):
        form = self.get_form(form_id)
        if not form:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FeedbackFormCreateUpdateSerializer(form, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        form = serializer.save()
        return Response(FeedbackFormDetailSerializer(form).data)

    def delete(self, request, form_id):
        form = self.get_form(form_id)
        if not form:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)
        form.delete()
        return Response({'message': 'Form deleted.'}, status=status.HTTP_204_NO_CONTENT)


class HRFormActivateView(APIView):
    """
    POST /api/feedback/hr/forms/<form_id>/activate/
    Activates this form and deactivates all others.
    POST /api/feedback/hr/forms/<form_id>/deactivate/
    Deactivates this form.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def post(self, request, form_id, action):
        try:
            form = FeedbackForm.objects.get(pk=form_id)
        except FeedbackForm.DoesNotExist:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'activate':
            form.isActive = True
            form.save()   # triggers save() which deactivates all others
            return Response({'message': f'Form "{form.title}" is now active.'})
        elif action == 'deactivate':
            form.isActive = False
            form.save(update_fields=['isActive'])
            return Response({'message': f'Form "{form.title}" has been deactivated.'})
        else:
            return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# HR Manager -- Question Management
# ---------------------------------------------------------------------------

class HRQuestionListCreateView(APIView):
    """
    GET  /api/feedback/hr/forms/<form_id>/questions/    list questions
    POST /api/feedback/hr/forms/<form_id>/questions/    add a question
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get_form(self, form_id):
        try:
            return FeedbackForm.objects.get(pk=form_id)
        except FeedbackForm.DoesNotExist:
            return None

    def get(self, request, form_id):
        form = self.get_form(form_id)
        if not form:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)
        questions = form.questions.all()
        return Response(FeedbackQuestionCreateSerializer(questions, many=True).data)

    def post(self, request, form_id):
        form = self.get_form(form_id)
        if not form:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FeedbackQuestionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        question = serializer.save(formID=form)
        return Response(
            FeedbackQuestionCreateSerializer(question).data,
            status=status.HTTP_201_CREATED
        )


class HRQuestionDetailView(APIView):
    """
    PUT    /api/feedback/hr/questions/<question_id>/   update question
    DELETE /api/feedback/hr/questions/<question_id>/   delete question
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get_question(self, question_id):
        try:
            return FeedbackQuestion.objects.get(pk=question_id)
        except FeedbackQuestion.DoesNotExist:
            return None

    def put(self, request, question_id):
        question = self.get_question(question_id)
        if not question:
            return Response({'error': 'Question not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FeedbackQuestionCreateSerializer(
            question, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        question = serializer.save()
        return Response(FeedbackQuestionCreateSerializer(question).data)

    def delete(self, request, question_id):
        question = self.get_question(question_id)
        if not question:
            return Response({'error': 'Question not found.'}, status=status.HTTP_404_NOT_FOUND)
        question.delete()
        return Response({'message': 'Question deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# HR Manager -- Approval snapshot and submissions
# ---------------------------------------------------------------------------



class HRSubmissionsView(APIView):
    """
    GET /api/feedback/hr/submissions/               all submissions across all forms
    GET /api/feedback/hr/submissions/?form_id=<id>  filter by form
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        qs = FeedbackSubmission.objects.select_related(
            'employeeID', 'formID'
        ).prefetch_related('answers__questionID').order_by('-submittedAt')

        form_id = request.query_params.get('form_id')
        status_filter = (request.query_params.get('status') or '').strip()
        search = (request.query_params.get('search') or '').strip()

        if form_id:
            qs = qs.filter(formID_id=form_id)
        if status_filter:
            qs = qs.filter(status__iexact=status_filter)
        if search:
            qs = qs.filter(
                Q(employeeID__fullName__icontains=search)
                | Q(employeeID__employeeID__icontains=search)
                | Q(employeeID__email__icontains=search)
            )

        return Response(FeedbackSubmissionSerializer(qs, many=True).data)


class HRSubmissionInsightsView(APIView):
    """
    GET /api/feedback/hr/submissions/insights/?form_id=<id>
    Returns question-level response insights and follow-up priorities for HR.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        form_id = (request.query_params.get('form_id') or '').strip()
        forms_qs = FeedbackForm.objects.prefetch_related('questions').order_by('-createdAt')
        submissions_qs = FeedbackSubmission.objects.select_related(
            'employeeID', 'formID'
        ).prefetch_related('answers__questionID').order_by('-submittedAt')

        if form_id:
            forms_qs = forms_qs.filter(pk=form_id)
            submissions_qs = submissions_qs.filter(formID_id=form_id)

        forms = list(forms_qs)
        if form_id and not forms:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        submissions = list(submissions_qs)
        total_submissions = len(submissions)
        completed_submissions = sum(
            1 for submission in submissions if submission.status == FeedbackSubmission.STATUS_COMPLETED
        )
        pending_submissions = max(total_submissions - completed_submissions, 0)

        question_stats = {}
        for form in forms:
            for question in form.questions.all():
                question_stats[question.questionID] = {
                    'questionID': question.questionID,
                    'questionText': question.questionText,
                    'fieldType': question.fieldType,
                    'formTitle': form.title,
                    'responseCount': 0,
                    'scoreValues': [],
                    'decimalValues': [],
                    'yesCount': 0,
                    'noCount': 0,
                }

        score_values = []
        for submission in submissions:
            for answer in submission.answers.all():
                entry = question_stats.setdefault(
                    answer.questionID_id,
                    {
                        'questionID': answer.questionID_id,
                        'questionText': answer.questionID.questionText,
                        'fieldType': answer.questionID.fieldType,
                        'formTitle': submission.formID.title,
                        'responseCount': 0,
                        'scoreValues': [],
                        'decimalValues': [],
                        'yesCount': 0,
                        'noCount': 0,
                    },
                )
                entry['responseCount'] += 1
                if answer.scoreValue is not None:
                    entry['scoreValues'].append(answer.scoreValue)
                    score_values.append(answer.scoreValue)
                if answer.decimalValue is not None:
                    entry['decimalValues'].append(float(answer.decimalValue))
                if answer.booleanValue is True:
                    entry['yesCount'] += 1
                elif answer.booleanValue is False:
                    entry['noCount'] += 1

        question_insights = []
        follow_up_items = []
        for entry in question_stats.values():
            expected_responses = max(completed_submissions, 1)
            response_rate = round((entry['responseCount'] / expected_responses) * 100) if completed_submissions else 0
            insight = {
                'questionID': entry['questionID'],
                'questionText': entry['questionText'],
                'fieldType': entry['fieldType'],
                'formTitle': entry['formTitle'],
                'responseCount': entry['responseCount'],
                'responseRate': response_rate,
            }

            priority = None
            metric = ''
            issue = ''
            recommended_action = ''

            if entry['fieldType'] == 'score_1_4':
                average_score = round(sum(entry['scoreValues']) / len(entry['scoreValues']), 2) if entry['scoreValues'] else 0
                insight['averageScore'] = average_score
                if entry['scoreValues'] and average_score <= 2:
                    priority = 'High'
                    issue = 'Low score trend'
                    metric = f'Average score {average_score}/4'
                    recommended_action = 'Review the manager and team context behind this low-scoring feedback.'
                elif entry['scoreValues'] and average_score < 3:
                    priority = 'Medium'
                    issue = 'Score trend to monitor'
                    metric = f'Average score {average_score}/4'
                    recommended_action = 'Check for emerging sentiment risks before the next review cycle.'
            elif entry['fieldType'] == 'boolean':
                total_boolean = entry['yesCount'] + entry['noCount']
                yes_rate = round((entry['yesCount'] / max(total_boolean, 1)) * 100) if total_boolean else 0
                insight['yesRate'] = yes_rate
                if total_boolean and yes_rate < 60:
                    priority = 'High' if yes_rate < 50 else 'Medium'
                    issue = 'Negative yes/no sentiment'
                    metric = f'Yes rate {yes_rate}%'
                    recommended_action = 'Follow up on blockers raised by employees and confirm support needs.'
            else:
                average_value = round(sum(entry['decimalValues']) / len(entry['decimalValues']), 2) if entry['decimalValues'] else 0
                insight['averageValue'] = average_value
                if entry['decimalValues'] and average_value < 2:
                    priority = 'Medium'
                    issue = 'Low numeric feedback signal'
                    metric = f'Average value {average_value}'
                    recommended_action = 'Review the numeric trend and compare it with prior submissions.'

            if response_rate < 70 and not priority:
                priority = 'Medium'
                issue = 'Low response coverage'
                metric = f'Response rate {response_rate}%'
                recommended_action = 'Drive additional responses so HR can trust the reporting trend.'

            question_insights.append(insight)

            if priority:
                follow_up_items.append({
                    'questionID': entry['questionID'],
                    'questionText': entry['questionText'],
                    'formTitle': entry['formTitle'],
                    'priority': priority,
                    'issue': issue,
                    'metric': metric,
                    'recommendedAction': recommended_action,
                })

        priority_order = {'High': 2, 'Medium': 1, 'Watch': 0}
        follow_up_items.sort(key=lambda item: priority_order.get(item['priority'], 0), reverse=True)
        question_insights.sort(key=lambda item: (item.get('responseRate', 0), item.get('averageScore', 5)))

        return Response({
            'summary': {
                'totalSubmissions': total_submissions,
                'completedSubmissions': completed_submissions,
                'pendingSubmissions': pending_submissions,
                'completionRate': round((completed_submissions / max(total_submissions, 1)) * 100) if total_submissions else 0,
                'averageScore': round(sum(score_values) / len(score_values), 2) if score_values else 0,
                'highPriorityItems': sum(1 for item in follow_up_items if item['priority'] == 'High'),
            },
            'questionInsights': question_insights,
            'followUpItems': follow_up_items[:8],
        })


class HRFormResponseSnapshotView(APIView):
    """
    GET /api/feedback/hr/forms/response-snapshot/
    Returns response-health visibility for HR survey follow-up.
    """
    permission_classes = [IsAuthenticated, IsHRManager]

    def get(self, request):
        forms = list(
            FeedbackForm.objects.prefetch_related('questions', 'submissions__employeeID').order_by('-createdAt')
        )

        follow_up_items = []
        completion_total = 0
        low_coverage_forms = 0
        zero_response_forms = 0
        pending_responses = 0

        for form in forms:
            submissions = list(form.submissions.all())
            total_submissions = len(submissions)
            completed_submissions = sum(
                1 for submission in submissions if submission.status == FeedbackSubmission.STATUS_COMPLETED
            )
            pending_submissions = max(total_submissions - completed_submissions, 0)
            pending_responses += pending_submissions

            completion_rate = round((completed_submissions / max(total_submissions, 1)) * 100) if total_submissions else 0
            completion_total += completion_rate

            if total_submissions == 0:
                zero_response_forms += 1
            if total_submissions == 0 or completion_rate < 80:
                low_coverage_forms += 1

            if total_submissions == 0:
                risk_level = 'High'
                recommended_action = 'Launch the survey and ask managers to drive first responses.'
            elif pending_submissions >= 2 or completion_rate < 50:
                risk_level = 'High'
                recommended_action = 'Send follow-up reminders and review blockers with the responsible team.'
            elif pending_submissions > 0 or completion_rate < 80:
                risk_level = 'Medium'
                recommended_action = 'Nudge remaining employees before the reporting deadline.'
            else:
                risk_level = 'On Track'
                recommended_action = 'No immediate action required.'

            if risk_level == 'On Track':
                continue

            latest_submission = max(
                (submission.submittedAt for submission in submissions if submission.submittedAt),
                default=None,
            )
            follow_up_items.append({
                'formID': form.formID,
                'title': form.title,
                'status': 'Live' if form.isActive else 'Inactive',
                'questionCount': form.questions.count(),
                'submissionCount': total_submissions,
                'completedSubmissions': completed_submissions,
                'pendingResponses': pending_submissions,
                'completionRate': completion_rate,
                'riskLevel': risk_level,
                'recommendedAction': recommended_action,
                'lastSubmittedAt': latest_submission,
            })

        risk_order = {'High': 2, 'Medium': 1, 'On Track': 0}
        follow_up_items.sort(
            key=lambda item: (risk_order.get(item['riskLevel'], 0), item['pendingResponses'], -item['completionRate']),
            reverse=True,
        )

        return Response({
            'summary': {
                'trackedForms': len(forms),
                'liveForms': sum(1 for form in forms if form.isActive),
                'pendingResponses': pending_responses,
                'lowCoverageForms': low_coverage_forms,
                'zeroResponseForms': zero_response_forms,
                'averageCompletionRate': round(completion_total / len(forms)) if forms else 0,
            },
            'followUpItems': follow_up_items[:8],
        })



# ---------------------------------------------------------------------------
# Employee -- Form Access
# ---------------------------------------------------------------------------

class FeedbackFormListView(APIView):
    """
    GET /api/feedback/forms/
    Employee sees only the active form.
    """

    def get(self, request):
        forms = FeedbackForm.objects.prefetch_related('questions').filter(isActive=True)
        employee_id = request.query_params.get('employee_id')
        result = []
        for form in forms:
            data = FeedbackFormDetailSerializer(form).data
            if employee_id:
                try:
                    sub = FeedbackSubmission.objects.prefetch_related(
                        'answers').get(formID=form, employeeID_id=employee_id)
                    data['submission'] = FeedbackSubmissionSerializer(sub).data
                except FeedbackSubmission.DoesNotExist:
                    data['submission'] = None
            result.append(data)
        return Response(result)


class FeedbackFormDetailView(APIView):
    """
    GET /api/feedback/forms/<form_id>/?employee_id=<id>
    """

    def get(self, request, form_id):
        try:
            form = FeedbackForm.objects.prefetch_related('questions').get(pk=form_id)
        except FeedbackForm.DoesNotExist:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = FeedbackFormDetailSerializer(form).data
        employee_id = request.query_params.get('employee_id')
        if employee_id:
            try:
                sub = FeedbackSubmission.objects.prefetch_related(
                    'answers').get(formID=form, employeeID_id=employee_id)
                data['submission'] = FeedbackSubmissionSerializer(sub).data
            except FeedbackSubmission.DoesNotExist:
                data['submission'] = None
        return Response(data)


class FeedbackSubmitView(APIView):
    """
    POST /api/feedback/forms/<form_id>/submit/
    """

    def post(self, request, form_id):
        try:
            form = FeedbackForm.objects.prefetch_related('questions').get(pk=form_id)
        except FeedbackForm.DoesNotExist:
            return Response({'error': 'Form not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SubmitFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        employee_id = serializer.validated_data['employeeID']
        answers     = serializer.validated_data['answers']

        if not Employee.objects.filter(pk=employee_id).exists():
            return Response({'error': f'Employee {employee_id} not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        valid_question_ids = set(form.questions.values_list('questionID', flat=True))
        submitted_ids      = set(a['questionID'] for a in answers)
        invalid            = submitted_ids - valid_question_ids
        if invalid:
            return Response({'error': f'Invalid question IDs: {invalid}'},
                            status=status.HTTP_400_BAD_REQUEST)
        if submitted_ids != valid_question_ids:
            missing = valid_question_ids - submitted_ids
            return Response({'error': f'Missing answers for: {missing}'},
                            status=status.HTTP_400_BAD_REQUEST)

        submission, _ = FeedbackSubmission.objects.get_or_create(
            formID=form, employeeID_id=employee_id)

        for a in answers:
            FeedbackAnswer.objects.update_or_create(
                submissionID=submission,
                questionID_id=a['questionID'],
                defaults={
                    'scoreValue':   a.get('scoreValue'),
                    'booleanValue': a.get('booleanValue'),
                    'decimalValue': a.get('decimalValue'),
                }
            )

        submission.status      = FeedbackSubmission.STATUS_COMPLETED
        submission.submittedAt = timezone.now()
        submission.save(update_fields=['status', 'submittedAt'])

        return Response(FeedbackSubmissionSerializer(submission).data,
                        status=status.HTTP_201_CREATED)
