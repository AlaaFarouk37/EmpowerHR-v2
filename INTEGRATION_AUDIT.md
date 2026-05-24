# INTEGRATION_AUDIT — Phase 1 inventory

This is a read-only inventory of every backend endpoint and every frontend
piece that fetches/submits data. Produced before any wiring. Do not act on
the discrepancies surfaced here yet — that is the job of Phase 2
(`INTEGRATION_MAP.md`).

- Backend root (Django): `backend/`
- Frontend root (rebuilt, React + CRA): `frontend-updated/`
- Backend mount: `core/urls.py` routes each Django app under `/api/<app>/`.
- Frontend base URL is built in `src/api/base.js`:
  `RAW_API_BASE = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000'`
  and `/api` is appended if missing. So every path the frontend uses below
  is implicitly prefixed with `/api`.
- JWT-based auth. Global default permission is `IsAuthenticated`.
  Custom permissions seen in views: `IsAdmin`, `IsHRManager`, `IsTeamLeader`,
  `IsInternalEmployee`, `AllowAny`.
- Token storage on frontend: `localStorage` keys `access`, `refresh`, `user`.
  Automatic 401 → refresh → retry handled in `src/api/base.js`.

The two README-style API references in this repo
(`API_DOCUMENTATION.md`, `API_ALL_ENDPOINTS.md`) are out of date — they list
only ~50 routes while the actual backend exposes ~150. The inventory below
is taken from `urls.py` directly (the authoritative source).

---

## Part A — Backend inventory

All paths are absolute (start with `/api/...`). Method = the HTTP verb(s) the
view answers. Auth = the permission class on that view. "View" = the
class/function in `views.py` for that app.

### A.1 `accounts/` — Authentication & users
Source: `backend/accounts/urls.py`, `backend/accounts/views.py`

| Method | Path | View | Auth | Notes |
|---|---|---|---|---|
| POST | `/api/auth/login/` | `LoginView` (`TokenObtainPairView` + custom serializer) | AllowAny | Returns `access`, `refresh`, plus claims: `role`, `full_name`, `employee_id`, `currency_preference`, `employee_currency_preference`, `language_preference`, `theme_preference`, `focus_mode_preference`. |
| POST | `/api/auth/logout/` | `LogoutView` | IsAuthenticated | Body: `{ refresh }`. Blacklists token. |
| POST | `/api/auth/token/refresh/` | `TokenRefreshView` (simplejwt) | AllowAny | Body: `{ refresh }`; returns `{ access, refresh? }`. |
| GET / PATCH / PUT | `/api/auth/me/` | `MeView` | IsAuthenticated | `UserMeSerializer` fields: `id, email, full_name, role, employee_id, created_at, currency_preference, employee_currency_preference, language_preference, theme_preference, focus_mode_preference`. PATCH/PUT updates the writable subset (preferences). `currency_preference` writes restricted to HRManager/Admin. |
| POST | `/api/auth/change-password/` | `ChangePasswordView` | IsAuthenticated | Body: `{ old_password, new_password }`. |
| POST | `/api/auth/candidate/register/` | `CandidateRegisterView` | AllowAny | Body: `{ email, full_name, password }`. |
| POST | `/api/auth/password-reset/request/` | `RequestPasswordResetOTPView` | AllowAny | Body includes email. Returns generic message. |
| POST | `/api/auth/password-reset/confirm/` | `ConfirmPasswordResetOTPView` | AllowAny | Body: email + OTP + new password. |
| GET | `/api/auth/demo-access/` | `DemoAccessView` | AllowAny | Ensures demo users exist; returns demo creds per role. |
| POST | `/api/auth/employees/create/` | `CreateEmployeeView` | IsAuthenticated, IsAdmin | Body: `{ email, full_name, role, password }`. Role ∈ `TeamMember/TeamLeader/HRManager/Admin`. |

### A.2 `feedback/` — Surveys
Source: `backend/feedback/urls.py`, `backend/feedback/views.py`

| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/feedback/hr/forms/` | `HRFormListCreateView` | IsAuthenticated, IsHRManager |
| GET | `/api/feedback/hr/forms/response-snapshot/` | `HRFormResponseSnapshotView` | IsAuthenticated, IsHRManager |
| GET / PUT / DELETE | `/api/feedback/hr/forms/<form_id>/` | `HRFormDetailView` | IsAuthenticated, IsHRManager |
| GET / POST | `/api/feedback/hr/forms/<form_id>/questions/` | `HRQuestionListCreateView` | IsAuthenticated, IsHRManager |
| POST | `/api/feedback/hr/forms/<form_id>/<action>/` (`activate`/`deactivate`) | `HRFormActivateView` | IsAuthenticated, IsHRManager |
| PUT / DELETE | `/api/feedback/hr/questions/<question_id>/` | `HRQuestionDetailView` | IsAuthenticated, IsHRManager |
| GET | `/api/feedback/hr/submissions/insights/` | `HRSubmissionInsightsView` | IsAuthenticated, IsHRManager |
| GET | `/api/feedback/hr/submissions/` (`?form_id=`) | `HRSubmissionsView` | IsAuthenticated, IsHRManager |
| GET | `/api/feedback/forms/` | `FeedbackFormListView` | IsAuthenticated |
| GET | `/api/feedback/forms/<form_id>/` | `FeedbackFormDetailView` | IsAuthenticated |
| POST | `/api/feedback/forms/<form_id>/submit/` | `FeedbackSubmitView` | IsAuthenticated |

Notes — the older docs also mention `hr/insights/`, `hr/intelligence/`,
and `hr/approvals/snapshot/` under `/api/feedback/...`. Those routes are
**not** in `feedback/urls.py`. `hr/intelligence/` actually lives in the
attrition app (see A.3), `hr/insights/` lives in employee_management
(see A.4), `hr/approvals/snapshot/` lives in employee_management.

### A.3 `attrition/` — Attrition predictor + people intelligence
Source: `backend/attrition/urls.py`, `backend/attrition/views.py`

| Method | Path | View | Auth |
|---|---|---|---|
| POST | `/api/attrition/run/` | `RunAttritionPredictionView` | IsAuthenticated, IsHRManager |
| GET | `/api/attrition/predictions/` | `AttritionPredictionListView` | IsAuthenticated, IsHRManager |
| GET | `/api/attrition/predictions/latest/` | `AttritionPredictionLatestView` | IsAuthenticated, IsHRManager &#124; IsTeamLeader |
| GET | `/api/attrition/governance/` | `AttritionGovernanceSummaryView` | IsAuthenticated, IsHRManager |
| GET | `/api/attrition/hr/intelligence/` | `HRPeopleIntelligenceView` | IsAuthenticated, IsHRManager |

### A.4 `employee_management/` — Largest app: directory, goals, tasks, recognition, benefits, reviews, shifts, policies, training, expenses, documents, tickets, action plans
Source: `backend/employee_management/urls.py`, `backend/employee_management/views.py`

#### Infrastructure (admin)
| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/employee_management/departments/` | `DepartmentListCreateView` | IsAuthenticated, IsAdmin |
| GET / PUT / DELETE | `/api/employee_management/departments/<int:pk>/` | `DepartmentDetailView` | IsAuthenticated, IsAdmin |
| GET / POST | `/api/employee_management/teams/` | `TeamListCreateView` | IsAuthenticated, IsAdmin |
| GET / PUT / DELETE | `/api/employee_management/teams/<int:pk>/` | `TeamDetailView` | IsAuthenticated, IsAdmin |
| GET / POST | `/api/employee_management/jobs/` | `JobListCreateView` | IsAuthenticated, IsAdmin |
| GET / PUT / DELETE | `/api/employee_management/jobs/<int:pk>/` | `JobDetailView` | IsAuthenticated, IsAdmin |
| GET | `/api/employee_management/jobs/<int:pk>/benchmark/` | `JobBenchmarkSalaryView` | (see views.py) |
| GET / POST | `/api/employee_management/leave-types/` | `LeaveTypeListCreateView` | IsAuthenticated, IsAdmin |
| GET / PUT / DELETE | `/api/employee_management/leave-types/<int:pk>/` | `LeaveTypeDetailView` | IsAuthenticated, IsAdmin |

#### HR — Employee directory and cross-cutting dashboards
| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/employee_management/hr/employees/` | `HREmployeeListCreateView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/employees/roster-health/` | `HRRosterHealthView` | IsAuthenticated, IsHRManager |
| GET / PUT / DELETE | `/api/employee_management/hr/employees/<str:employee_id>/` | `HREmployeeDetailView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/employees/<str:employee_id>/history/` | `HREmployeeHistoryView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/employees/<str:employee_id>/snapshot/` | `HREmployeeSnapshotView` | IsAuthenticated, IsHRManager |
| POST | `/api/employee_management/hr/employees/<str:employee_id>/change-role/` | `HREmployeeRoleChangeView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/salary-benchmark/` | `HRSalaryBenchmarkView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/approvals/snapshot/` | `HRApprovalSnapshotView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/insights/` | `HRWorkforceInsightsView` | IsAuthenticated, IsHRManager |

#### Goals
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/goals/` | `EmployeeGoalListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/goals/<str:goal_id>/progress/` | `EmployeeGoalProgressView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/employee_management/team/goals/` | `TeamGoalListCreateView` | IsAuthenticated, IsTeamLeader |
| GET / PUT / DELETE | `/api/employee_management/team/goals/<str:goal_id>/` | `TeamGoalDetailView` | IsAuthenticated, IsTeamLeader |

#### Tasks
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/tasks/` | `EmployeeTaskListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/tasks/<str:task_id>/progress/` | `EmployeeTaskProgressView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/tasks/<str:task_id>/start/` | `EmployeeTaskStartView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/tasks/<str:task_id>/end/` | `EmployeeTaskEndView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/tasks/<str:task_id>/done/` | `EmployeeTaskDoneView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/employee_management/team/tasks/` | `TeamTaskListCreateView` | IsAuthenticated, IsTeamLeader |
| GET / PUT / DELETE | `/api/employee_management/team/tasks/<str:task_id>/` | `TeamTaskDetailView` | IsAuthenticated, IsTeamLeader |
| POST | `/api/employee_management/team/tasks/<str:task_id>/approve/` | `TeamTaskApproveView` | IsAuthenticated, IsTeamLeader |

#### HR Action plans
| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/employee_management/hr/action-plans/` | `HRActionPlanListCreateView` | IsAuthenticated, IsHRManager |
| POST | `/api/employee_management/hr/action-plans/<str:task_id>/status/` | `HRActionPlanStatusView` | IsAuthenticated, IsHRManager |

#### Recognition
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/recognition/` | `EmployeeRecognitionListView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/employee_management/team/recognition/` | `TeamRecognitionListCreateView` | IsAuthenticated, IsTeamLeader |
| GET | `/api/employee_management/hr/recognition/watch/` | `HRRecognitionWatchView` | IsAuthenticated, IsHRManager |

#### Benefits
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/benefits/` | `EmployeeBenefitListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/benefits/<str:enrollment_id>/status/` | `EmployeeBenefitStatusView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/employee_management/hr/benefits/` | `HRBenefitListCreateView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/benefits/watch/` | `HRBenefitWatchView` | IsAuthenticated, IsHRManager |

#### Reviews
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/reviews/` | `EmployeeReviewListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/reviews/<str:review_id>/acknowledge/` | `EmployeeReviewAcknowledgeView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/employee_management/hr/reviews/` | `HRReviewListCreateView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/reviews/calibration/` | `HRReviewCalibrationView` | IsAuthenticated, IsHRManager |

#### Career path
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/career-path/` | `EmployeeCareerPlanListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/career-path/<str:plan_id>/acknowledge/` | `EmployeeCareerPlanAcknowledgeView` | IsAuthenticated, IsInternalEmployee |

#### Shifts
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/shifts/` | `EmployeeShiftListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/shifts/<str:schedule_id>/acknowledge/` | `EmployeeShiftAcknowledgeView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/employee_management/hr/shifts/` | `HRShiftScheduleListCreateView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/shifts/watch/` | `HRShiftWatchView` | IsAuthenticated, IsHRManager |

#### Policies & announcements
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/policies/` | `EmployeePolicyListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/policies/<str:policy_id>/acknowledge/` | `EmployeePolicyAcknowledgeView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/employee_management/hr/policies/` | `HRPolicyListCreateView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/policies/compliance/` | `HRPolicyComplianceView` | IsAuthenticated, IsHRManager |
| POST | `/api/employee_management/hr/policies/<str:policy_id>/remind/` | `HRPolicyReminderView` | IsAuthenticated, IsHRManager |

#### Training
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/employee_management/employee/training/` | `EmployeeTrainingListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/employee_management/employee/training/<str:course_id>/progress/` | `EmployeeTrainingProgressView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/employee_management/hr/training/` | `HRTrainingListCreateView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/training/compliance/` | `HRTrainingComplianceView` | IsAuthenticated, IsHRManager |

#### Expenses
| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/employee_management/employee/expenses/` | `EmployeeExpenseListCreateView` | IsAuthenticated, IsInternalEmployee |
| GET | `/api/employee_management/hr/expenses/` | `HRExpenseListView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/expenses/watch/` | `HRExpenseWatchView` | IsAuthenticated, IsHRManager |
| POST | `/api/employee_management/hr/expenses/<str:claim_id>/review/` | `HRExpenseReviewView` | IsAuthenticated, IsHRManager |

#### Documents
| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/employee_management/employee/documents/` | `EmployeeDocumentListCreateView` | IsAuthenticated, IsInternalEmployee |
| GET | `/api/employee_management/hr/documents/` | `HRDocumentListView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/documents/watch/` | `HRDocumentWatchView` | IsAuthenticated, IsHRManager |
| POST | `/api/employee_management/hr/documents/<str:request_id>/issue/` | `HRDocumentIssueView` | IsAuthenticated, IsHRManager |

#### Tickets
| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/employee_management/employee/tickets/` | `EmployeeTicketListCreateView` | IsAuthenticated, IsInternalEmployee |
| GET | `/api/employee_management/hr/tickets/` | `HRTicketListView` | IsAuthenticated, IsHRManager |
| GET | `/api/employee_management/hr/tickets/watch/` | `HRTicketWatchView` | IsAuthenticated, IsHRManager |
| POST | `/api/employee_management/hr/tickets/<str:ticket_id>/status/` | `HRTicketStatusView` | IsAuthenticated, IsHRManager |

### A.5 `Attendance_and_Leave/`
Source: `backend/Attendance_and_Leave/urls.py`, `backend/Attendance_and_Leave/views.py`

| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/attendance_leave/attendance/` | `AttendanceRecordListCreateView` | IsAuthenticated |
| POST | `/api/attendance_leave/attendance/clock-in/` | `clock_in_view` | IsAuthenticated |
| POST | `/api/attendance_leave/attendance/clock-out/` | `clock_out_view` | IsAuthenticated |
| GET / PUT / DELETE | `/api/attendance_leave/attendance/<str:pk>/` | `AttendanceRecordDetailView` | IsAuthenticated |
| GET / POST | `/api/attendance_leave/leave-requests/` | `LeaveRequestListCreateView` | IsAuthenticated |
| GET / PUT / DELETE | `/api/attendance_leave/leave-requests/<str:pk>/` | `LeaveRequestDetailView` | IsAuthenticated |
| POST | `/api/attendance_leave/leave-requests/<str:pk>/approve/` | `approve_leave_request` | IsHRManager &#124; IsAdmin |
| POST | `/api/attendance_leave/leave-requests/<str:pk>/reject/` | `reject_leave_request` | IsHRManager &#124; IsAdmin |
| GET | `/api/attendance_leave/employee/attendance/` | `EmployeeAttendanceListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/attendance_leave/employee/attendance/clock/` | `EmployeeAttendanceClockView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/attendance_leave/employee/leave-requests/` | `EmployeeLeaveRequestListCreateView` | IsAuthenticated, IsInternalEmployee |
| GET | `/api/attendance_leave/team/overtime/` | `TeamOvertimeReviewListView` | IsAuthenticated, IsTeamLeader |
| POST | `/api/attendance_leave/team/overtime/<str:attendance_id>/review/` | `TeamOvertimeReviewActionView` | IsAuthenticated, IsTeamLeader |
| GET | `/api/attendance_leave/hr/attendance/` | `HRAttendanceListView` | IsAuthenticated, IsHRManager |
| GET | `/api/attendance_leave/hr/attendance/watch/` | `HRAttendanceWatchView` | IsAuthenticated, IsHRManager |
| GET / POST | `/api/attendance_leave/hr/leave-requests/` | `LeaveRequestListCreateView` | IsAuthenticated, IsHRManager |
| POST | `/api/attendance_leave/hr/leave-requests/<str:pk>/review/` | `review_leave_request` | IsAuthenticated, IsHRManager |

### A.6 `payroll/`
Source: `backend/payroll/urls.py`, `backend/payroll/views.py`

| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/payroll/payroll/` | `PayrollRecordListCreateView` | IsHRManager &#124; IsAdmin |
| GET / PUT / DELETE | `/api/payroll/payroll/<str:pk>/` | `PayrollRecordDetailView` | IsHRManager &#124; IsAdmin |
| GET | `/api/payroll/employee/payroll/` | `EmployeePayrollListView` | IsAuthenticated, IsInternalEmployee |
| GET / POST | `/api/payroll/hr/payroll/` | `HRPayrollListCreateView` | IsAuthenticated, IsHRManager |
| GET | `/api/payroll/hr/payroll/watch/` | `HRPayrollWatchView` | IsAuthenticated, IsHRManager |
| POST | `/api/payroll/hr/payroll/<str:payroll_id>/mark-paid/` | `HRPayrollMarkPaidView` | IsAuthenticated, IsHRManager |

### A.7 `onboarding/`
Source: `backend/onboarding/urls.py`, `backend/onboarding/views.py`

| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/api/onboarding/employee/onboarding/` | `EmployeeOnboardingListView` | IsAuthenticated, IsInternalEmployee |
| POST | `/api/onboarding/employee/onboarding/<str:plan_id>/progress/` | `EmployeeOnboardingProgressView` | IsAuthenticated, IsInternalEmployee |
| GET | `/api/onboarding/hr/onboarding/watch/` | `HROnboardingWatchView` | IsAuthenticated, IsHRManager |
| GET / POST | `/api/onboarding/hr/onboarding/` | `HROnboardingPlanListCreateView` | IsAuthenticated, IsHRManager |

### A.8 `resume_pipeline/` — Recruitment
Source: `backend/resume_pipeline/urls.py`, `backend/resume_pipeline/views.py`

| Method | Path | View | Auth |
|---|---|---|---|
| GET / POST | `/api/recruitment/jobs/` | `JobListCreateView` | Mixed (public list, auth for create — see view) |
| GET | `/api/recruitment/jobs/health/` | `JobPipelineHealthView` | IsHRManager |
| GET / PUT / DELETE | `/api/recruitment/jobs/<int:pk>/` | `JobDetailView` | (see view) |
| GET / POST | `/api/recruitment/jobs/<int:pk>/weights/` | `JobWeightsView` | IsHRManager |
| GET | `/api/recruitment/jobs/<int:pk>/submissions/` | `JobSubmissionsView` | IsHRManager |
| GET / POST | `/api/recruitment/jobs/<int:pk>/ranking/` | `JobCVRankingView` | IsHRManager |
| POST | `/api/recruitment/submit/` | `SubmitResumeView` | AllowAny (multipart upload) |
| GET | `/api/recruitment/applications/` | `CandidateApplicationListView` | AllowAny |
| GET / PATCH | `/api/recruitment/submissions/<int:pk>/` | `SubmissionDetailView` | IsHRManager (or candidate-of-record — see view) |
| POST / PATCH | `/api/recruitment/submissions/<int:pk>/stage/` | `SubmissionStageUpdateView` | IsHRManager |
| GET / POST | `/api/recruitment/succession-plans/` | `SuccessionPlanListCreateView` | (see view) |
| GET / PUT / DELETE | `/api/recruitment/succession-plans/<str:pk>/` | `SuccessionPlanDetailView` | (see view) |
| GET | `/api/recruitment/hr/succession/watch/` | `HRSuccessionWatchView` | IsHRManager |
| GET / POST | `/api/recruitment/hr/succession/` | `HRSuccessionPlanListCreateView` | IsHRManager |

### A.9 `mobile/`
Source: `backend/mobile/urls.py`, `backend/mobile/views.py` (all IsAuthenticated)

| Method | Path | View |
|---|---|---|
| GET | `/api/mobile/notifications/` | `NotificationListView` |
| GET | `/api/mobile/dashboard/` | `MobileDashboardView` |
| GET | `/api/mobile/hr/dashboard/` | `HRDashboardView` |
| GET | `/api/mobile/hr/attendance-analytics/` | `HRAttendanceAnalyticsView` |
| GET | `/api/mobile/hr/employees/` | `HREmployeeListView` |
| POST | `/api/mobile/attendance/clock-in/` | `AttendanceClockInView` |
| POST | `/api/mobile/leave-requests/` | `LeaveRequestView` |
| POST | `/api/mobile/tickets/` | `TicketView` |
| GET | `/api/mobile/tasks/` | `TaskListView` |
| POST | `/api/mobile/manager/leave-requests/<int:id>/action/` | `ManagerLeaveActionView` |
| POST | `/api/mobile/manager/attendance-corrections/<int:id>/action/` | `ManagerAttendanceCorrectionActionView` |

### A.10 Root / misc
| Method | Path | View | Auth |
|---|---|---|---|
| GET | `/` and `/health/` | `root_status` | AllowAny — returns status JSON. |
| POST | `/api/send-email/` | `SendEmailView` (in `core/views.py`) | IsAuthenticated |
| (admin UI) | `/admin/` | Django admin | Staff only |

---

## Part B — Frontend inventory

The frontend funnels all backend calls through `src/api/*.js`. That layer
is the canonical list of what the frontend *tries* to call. Pages and
hooks then import named functions from `src/api/index.js`. Below I list
every function exported by each API module (= every URL the frontend will
hit), then map pages/hooks to the API functions they use.

### B.1 API service modules (`src/api/`)

`base.js` — request helper. Exposes `api.get/post/put/delete/postForm` and
adds an `Authorization: Bearer <access>` header from `localStorage.access`,
plus a random `X-Request-Id`. **Note:** there is no `api.patch` method,
even though `notification.js` and a handful of others call `api.patch(...)`.
That's an existing frontend bug independent of integration; flag, do not fix
unless asked.

#### `auth.js`
| Function | Method | Path |
|---|---|---|
| `loginUser(data)` | POST | `/auth/login/` |
| `logoutUser(refresh)` | POST | `/auth/logout/` (body `{ refresh }`) |
| `getMe()` | GET | `/auth/me/` |
| `updateMyPreferences(data)` | PUT | `/auth/me/` |
| `registerCandidate(data)` | POST | `/auth/candidate/register/` |
| `changePassword(data)` | POST | `/auth/change-password/` |
| `requestPasswordResetOtp(data)` | POST | `/auth/password-reset/request/` |
| `confirmPasswordReset(data)` | POST | `/auth/password-reset/confirm/` |

#### `employee.js` — every path is `/feedback/employee/...` on the frontend (see "key mismatch" note below)
| Function | Method | Path the frontend calls |
|---|---|---|
| `getForms(employeeID)` | GET | `/feedback/forms/?employee_id=…` |
| `submitFeedback(formID, data)` | POST | `/feedback/forms/{formID}/submit/` |
| `submitPeerFeedback(data)` | POST | `/feedback/employee/peer-feedback/` |
| `getReceivedFeedback(employeeID)` | GET | `/feedback/employee/received-feedback/?employee_id=…` |
| `getMyAttendance(employeeID)` | GET | `/feedback/employee/attendance/?employee_id=…` |
| `clockAttendance(data)` | POST | `/feedback/employee/attendance/clock/` |
| `getMyLeaveRequests(employeeID)` | GET | `/feedback/employee/leave-requests/?employee_id=…` |
| `submitLeaveRequest(data)` | POST | `/feedback/employee/leave-requests/` |
| `cancelLeaveRequest(id)` | DELETE | `/feedback/employee/leave-requests/{id}/` |
| `getMyPayroll(employeeID)` | GET | `/feedback/employee/payroll/?employee_id=…` |
| `getMyReviews(employeeID)` | GET | `/feedback/employee/reviews/?employee_id=…` |
| `acknowledgeMyReview(id, data?)` | POST | `/feedback/employee/reviews/{id}/acknowledge/` |
| `getMyCareerPath(employeeID)` | GET | `/feedback/employee/career-path/?employee_id=…` |
| `acknowledgeCareerPlan(id, data?)` | POST | `/feedback/employee/career-path/{id}/acknowledge/` |
| `getMyOnboarding(employeeID)` | GET | `/feedback/employee/onboarding/?employee_id=…` |
| `updateMyOnboardingProgress(id, data)` | POST | `/feedback/employee/onboarding/{id}/progress/` |
| `getMyShifts(employeeID)` | GET | `/feedback/employee/shifts/?employee_id=…` |
| `acknowledgeMyShift(id, data?)` | POST | `/feedback/employee/shifts/{id}/acknowledge/` |
| `requestShiftSwap(id, data)` | POST | `/feedback/employee/shifts/{id}/swap/` |
| `getMyPolicies(filters)` | GET | `/feedback/employee/policies/?…` |
| `acknowledgeMyPolicy(id, data?)` | POST | `/feedback/employee/policies/{id}/acknowledge/` |
| `getMyBenefits(employeeID)` | GET | `/feedback/employee/benefits/?employee_id=…` |
| `updateMyBenefitStatus(id, data)` | POST | `/feedback/employee/benefits/{id}/status/` |
| `getMyExpenses(employeeID)` | GET | `/feedback/employee/expenses/?employee_id=…` |
| `submitExpenseClaim(data)` | POST | `/feedback/employee/expenses/` |
| `deleteExpenseClaim(id)` | DELETE | `/feedback/employee/expenses/{id}/` |
| `getMyDocuments(employeeID)` | GET | `/feedback/employee/documents/?employee_id=…` |
| `submitDocumentRequest(data)` | POST | `/feedback/employee/documents/` |
| `getMyTickets(employeeID)` | GET | `/feedback/employee/tickets/?employee_id=…` |
| `submitSupportTicket(data)` | POST | `/feedback/employee/tickets/` |
| `closeSupportTicket(id)` | POST | `/feedback/employee/tickets/{id}/close/` |
| `getMyGoals(employeeID)` | GET | `/feedback/employee/goals/?employee_id=…` |
| `updateMyGoalProgress(id, data)` | POST | `/feedback/employee/goals/{id}/progress/` |
| `getMyTasks(employeeID)` | GET | `/feedback/employee/tasks/?employee_id=…` |
| `updateMyTaskProgress(id, data)` | POST | `/feedback/employee/tasks/{id}/progress/` |
| `getMyRecognition(employeeID)` | GET | `/feedback/employee/recognition/?employee_id=…` |
| `getMyTraining(employeeID)` | GET | `/feedback/employee/training/?employee_id=…` |
| `updateMyTrainingProgress(id, data)` | POST | `/feedback/employee/training/{id}/progress/` |

#### `hr.js` — every path is `/feedback/hr/...` on the frontend
| Function | Method | Path the frontend calls |
|---|---|---|
| `hrGetForms()` | GET | `/feedback/hr/forms/` |
| `hrGetFormDetail(id)` | GET | `/feedback/hr/forms/{id}/` |
| `hrGetFormResponseSnapshot()` | GET | `/feedback/hr/forms/response-snapshot/` |
| `hrCreateForm(data)` | POST | `/feedback/hr/forms/` |
| `hrUpdateForm(id, data)` | PUT | `/feedback/hr/forms/{id}/` |
| `hrDeleteForm(id)` | DELETE | `/feedback/hr/forms/{id}/` |
| `hrActivateForm(id)` | POST | `/feedback/hr/forms/{id}/activate/` |
| `hrDeactivateForm(id)` | POST | `/feedback/hr/forms/{id}/deactivate/` |
| `hrAddQuestion(formID, data)` | POST | `/feedback/hr/forms/{formID}/questions/` |
| `hrDeleteQuestion(qID)` | DELETE | `/feedback/hr/questions/{qID}/` |
| `hrGetSubmissions(filters)` | GET | `/feedback/hr/submissions/?…` |
| `hrGetSubmissionInsights(formID)` | GET | `/feedback/hr/submissions/insights/?form_id=…` |
| `hrGetInsights()` | GET | `/feedback/hr/insights/` |
| `hrGetIntelligence()` | GET | `/feedback/hr/intelligence/` |
| `hrGetActionPlans(filters)` | GET | `/feedback/hr/action-plans/?…` |
| `hrCreateActionPlan(data)` | POST | `/feedback/hr/action-plans/` |
| `hrUpdateActionPlanStatus(id, data)` | POST | `/feedback/hr/action-plans/{id}/status/` |
| `hrGetEmployees(filters)` | GET | `/feedback/hr/employees/?…` |
| `hrGetRosterHealth()` | GET | `/feedback/hr/employees/roster-health/` |
| `hrCreateEmployeeRecord(data)` | POST | `/feedback/hr/employees/` |
| `hrUpdateEmployeeRecord(id, data)` | PUT | `/feedback/hr/employees/{id}/` |
| `hrDeleteEmployeeRecord(id)` | DELETE | `/feedback/hr/employees/{id}/` |
| `hrGetEmployeeHistory(id)` | GET | `/feedback/hr/employees/{id}/history/` |
| `hrGetEmployeeSnapshot(id)` | GET | `/feedback/hr/employees/{id}/snapshot/` |
| `hrChangeEmployeeRole(id, data)` | POST | `/feedback/hr/employees/{id}/change-role/` |
| `hrSimulatePromotion(data)` | POST | `/feedback/hr/simulate-promotion/` |
| `hrGetAttendanceRecords()` | GET | `/feedback/hr/attendance/` |
| `hrGetAttendanceWatch()` | GET | `/feedback/hr/attendance/watch/` |
| `hrGetLeaveRequests()` | GET | `/feedback/hr/leave-requests/` |
| `hrGetApprovalSnapshot()` | GET | `/feedback/hr/approvals/snapshot/` |
| `hrGetApprovals()` | GET | `/feedback/hr/approvals/` |
| `hrProcessApproval(id, data)` | POST | `/feedback/hr/approvals/{id}/process/` |
| `hrReviewLeaveRequest(id, data)` | POST | `/feedback/hr/leave-requests/{id}/review/` |
| `hrGetPayroll(filters)` | GET | `/feedback/hr/payroll/?…` |
| `hrGetPayrollWatch()` | GET | `/feedback/hr/payroll/watch/` |
| `hrCreatePayroll(data)` | POST | `/feedback/hr/payroll/` |
| `hrMarkPayrollPaid(id, data?)` | POST | `/feedback/hr/payroll/{id}/mark-paid/` |
| `hrGetReviews(filters)` | GET | `/feedback/hr/reviews/?…` |
| `hrGetReviewCalibration()` | GET | `/feedback/hr/reviews/calibration/` |
| `hrCreateReview(data)` | POST | `/feedback/hr/reviews/` |
| `hrGetSuccessionPlans(filters)` | GET | `/feedback/hr/succession/?…` |
| `hrGetSuccessionWatch()` | GET | `/feedback/hr/succession/watch/` |
| `hrCreateSuccessionPlan(data)` | POST | `/feedback/hr/succession/` |
| `hrGetOnboardingPlans(filters)` | GET | `/feedback/hr/onboarding/?…` |
| `hrGetOnboardingWatch()` | GET | `/feedback/hr/onboarding/watch/` |
| `hrCreateOnboardingPlan(data)` | POST | `/feedback/hr/onboarding/` |
| `hrGetShifts(filters)` | GET | `/feedback/hr/shifts/?…` |
| `hrGetShiftWatch()` | GET | `/feedback/hr/shifts/watch/` |
| `hrCreateShift(data)` | POST | `/feedback/hr/shifts/` |
| `hrGetPolicyCompliance()` | GET | `/feedback/hr/policies/compliance/` |
| `hrSendPolicyReminder(id, data?)` | POST | `/feedback/hr/policies/{id}/remind/` |
| `hrGetPolicies(filters)` | GET | `/feedback/hr/policies/?…` |
| `hrCreatePolicy(data)` | POST | `/feedback/hr/policies/` |
| `hrGetBenefits(filters)` | GET | `/feedback/hr/benefits/?…` |
| `hrGetBenefitWatch()` | GET | `/feedback/hr/benefits/watch/` |
| `hrCreateBenefit(data)` | POST | `/feedback/hr/benefits/` |
| `hrGetExpenses(filters)` | GET | `/feedback/hr/expenses/?…` |
| `hrGetExpenseWatch()` | GET | `/feedback/hr/expenses/watch/` |
| `hrReviewExpenseClaim(id, data)` | POST | `/feedback/hr/expenses/{id}/review/` |
| `hrGetDocuments(filters)` | GET | `/feedback/hr/documents/?…` |
| `hrGetDocumentWatch()` | GET | `/feedback/hr/documents/watch/` |
| `hrIssueDocument(id, data)` | POST | `/feedback/hr/documents/{id}/issue/` |
| `hrGetTickets(filters)` | GET | `/feedback/hr/tickets/?…` |
| `hrGetTicketWatch()` | GET | `/feedback/hr/tickets/watch/` |
| `hrUpdateTicketStatus(id, data)` | POST | `/feedback/hr/tickets/{id}/status/` |
| `hrGetRecognitionWatch()` | GET | `/feedback/hr/recognition/watch/` |
| `hrGetTraining(filters)` | GET | `/feedback/hr/training/?…` |
| `hrGetTrainingCompliance()` | GET | `/feedback/hr/training/compliance/` |
| `hrCreateTraining(data)` | POST | `/feedback/hr/training/` |
| `hrGetTalentMatrix()` | GET | `/talent/matrix/` |
| `hrCalibrateTalent(data)` | POST | `/talent/calibrate/` |
| `hrGetDashboardMetrics()` | GET | `/analytics/dashboard/` |
| `hrGetGlobalTriage()` | GET | `/analytics/global-triage/` |
| `hrGetRiskCorridor()` | GET | `/analytics/risk-corridor/` |
| `hrGetResourceDensity()` | GET | `/analytics/resource-density/` |
| `hrGetActivityStream()` | GET | `/analytics/activity-stream/` |
| `hrTriggerIntelligenceSync()` | POST | `/analytics/sync/` |

#### `leader.js`
| Function | Method | Path the frontend calls |
|---|---|---|
| `getTeamGoals(filters)` | GET | `/feedback/team/goals/?…` |
| `createTeamGoal(data)` | POST | `/feedback/team/goals/` |
| `updateTeamGoal(id, data)` | PUT | `/feedback/team/goals/{id}/` |
| `getTeamTasks(filters)` | GET | `/feedback/team/tasks/?…` |
| `createTeamTask(data)` | POST | `/feedback/team/tasks/` |
| `updateTeamTask(id, data)` | PUT | `/feedback/team/tasks/{id}/` |
| `getTeamRecognition(filters)` | GET | `/feedback/team/recognition/?…` |
| `createTeamRecognition(data)` | POST | `/feedback/team/recognition/` |

#### `admin.js`
| Function | Method | Path the frontend calls |
|---|---|---|
| `adminGetOrgConfig()` | GET | `/governance/organization/current/` |
| `adminUpdateOrgConfig(data)` | PUT | `/governance/organization/current/` |
| `adminGetSkills()` | GET | `/workforce/skills/` |
| `adminCreateSkill(data)` | POST | `/workforce/skills/` |
| `adminDeleteSkill(id)` | DELETE | `/workforce/skills/{id}/` |
| `adminGetLeaveTypes()` | GET | `/ops/leave-types/` |
| `adminCreateLeaveType(data)` | POST | `/ops/leave-types/` |
| `adminDeleteLeaveType(id)` | DELETE | `/ops/leave-types/{id}/` |
| `adminGetSystemHealth()` | GET | `/ai/health-snapshot/` |
| `adminGetActivityLogs()` | GET | `/governance/activity-logs/` |
| `adminGetPermissions()` | GET | `/governance/permissions/` |
| `adminUpdateRolePermissions(role, data)` | PUT | `/governance/permissions/{role}/` |
| `adminBulkImport(type, file)` | POST (multipart) | `/ops/bulk-import/?type=…` |
| `adminBulkExport(type)` | GET | `/ops/bulk-export/?type=…` |
| `adminSimulateOrgChange(data)` | POST | `/ai/simulate-change/` |

#### `ai.js`
| Function | Method | Path |
|---|---|---|
| `postCommandQuery(query)` | POST | `/ai/command/` |
| `getOrgHealthSnapshot()` | GET | `/ai/health-snapshot/` |

#### `attrition.js`
| Function | Method | Path |
|---|---|---|
| `getLatestAttritionPredictions()` | GET | `/attrition/predictions/latest/` |
| `calibrateTalent(data)` | POST | `/attrition/calibrate/` |
| `getAttritionGovernance()` | GET | `/attrition/governance/` |
| `hrGetNeuralEvents()` | GET | `/attrition/events/` |

#### `notification.js`
| Function | Method | Path |
|---|---|---|
| `getNotifications()` | GET | `/notifications/` |
| `getUnreadCount()` | GET | `/notifications/unread-count/` |
| `markNotificationRead(id)` | **api.patch** (does not exist) | `/notifications/{id}/` |
| `markAllNotificationsRead()` | POST | `/notifications/mark-all-read/` |
| `deleteNotification(id)` | DELETE | `/notifications/{id}/` |

#### `recruitment.js`
| Function | Method | Path |
|---|---|---|
| `hrGetJobs()` / `getJobs()` | GET | `/recruitment/jobs/` |
| `hrGetJobsWatch()` / `hrGetJobPipelineHealth()` | GET | `/recruitment/jobs/health/` |
| `hrUpdateJobStatus(id, status)` | PUT | `/recruitment/jobs/{id}/` |
| `createJob(data)` | POST | `/recruitment/jobs/` |
| `updateJob(id, data)` | PUT | `/recruitment/jobs/{id}/` |
| `getJobSubmissions(jobId, filters)` | GET | `/recruitment/jobs/{jobId}/submissions/?…` |
| `getCandidateApplications(filters)` | GET | `/recruitment/applications/?…` |
| `updateSubmissionStage(id, data)` | POST | `/recruitment/submissions/{id}/stage/` |
| `hrBulkUpdateSubmissions(data)` | POST | `/recruitment/submissions/bulk-update/` |
| `submitResume(formData)` | POST (multipart) | `/recruitment/submit/` |
| `getJobRanking(jobId)` | GET | `/recruitment/jobs/{jobId}/ranking/` |
| `uploadAndRankCVs(jobId, formData)` | POST (multipart) | `/recruitment/jobs/{jobId}/ranking/` |
| `getSimilarCandidates(id)` | GET | `/recruitment/submissions/{id}/similar/` |
| `talentSearch(query)` | POST | `/recruitment/talent-search/` |
| `hrAutomateJobRecruitment(jobId, protocol)` | POST | `/recruitment/jobs/{jobId}/automate/` |
| `hireCandidate(id)` | POST | `/recruitment/submissions/{id}/hire/` |
| `hrGetJobInsights(jobId)` | GET | `/recruitment/jobs/{jobId}/insights/` |
| `hrOptimizeJob(jobId, updates)` | POST | `/recruitment/jobs/{jobId}/optimize/` |
| `getTalentCloneSimilarity(...)` | GET | `/recruitment/talent-similarity/` (note: the call passes `{ params: {...} }` which `api.get` ignores — looks like a leftover from an axios-style API) |
| `runPrediction(formID?)` | POST | `/attrition/run/` |
| `getPredictions()` | GET | `/attrition/predictions/latest/` |
| `hrGetBenchmarking()` | GET | `/recruitment/benchmarking/` |
| `hrRunSalarySync()` | POST | `/recruitment/benchmarking/sync/` |
| `hrGetTalentPools()` | GET | `/recruitment/talent-pools/` |
| `hrPromoteEmployee(employeeID, roleID)` | POST | `/recruitment/promote/` |
| `hrGetTalentGraph()` | GET | `/recruitment/talent-graph/` |

### B.2 Pages and the API functions they call

Routes & roles come from `src/routes/registry.js`.

#### Public / auth pages
| Page (route) | API functions used |
|---|---|
| `LandingPage` (`/`) | (none) |
| `EmployeeLogin` (`/login`) | `confirmPasswordReset`, `requestPasswordResetOtp` (login itself goes through `AuthContext` → `loginUser`) |
| `CandidateLogin` (`/candidate/login`) | `confirmPasswordReset`, `registerCandidate`, `requestPasswordResetOtp` |
| `Unauthorized` (`/unauthorized`) | (none) |
| `EmployeeCareersPage` (`/careers`) — **candidate-facing** | `getCandidateApplications`, `getJobs`, `submitResume` |

#### `AuthContext` (`src/context/AuthContext.jsx`)
Calls `getMe`, `loginUser`, `logoutUser`, `updateMyPreferences`. Stores
`access`, `refresh`, `user` in `localStorage`. Exposes `user`, `login`,
`logout`, etc. to the tree.

#### Shared components
| Component | API functions used |
|---|---|
| `components/shared/Navbar.jsx` (global search) | `getCandidateApplications`, `getForms`, `getJobs`, `getMyDocuments`, `getMyGoals`, `getMyOnboarding`, `getMyShifts`, `getMyTasks`, `getMyTickets`, `getMyTraining`, `getTeamGoals`, `getTeamTasks`, `hrGetDocuments`, `hrGetEmployees`, `hrGetExpenses`, `hrGetForms`, `hrGetLeaveRequests`, `hrGetPolicyCompliance`, `hrGetSubmissions`, `hrGetTickets` |
| `components/shared/NotificationCenter.jsx` | `getNotifications`, `getUnreadCount`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification` |
| `components/shared/NeuralCommandBar.jsx` | `postCommandQuery`, `hrGetEmployees`, `talentSearch` |
| `components/shared/CommandSearch.jsx` | `postCommandQuery` |
| `components/shared/index.jsx` | `hrGetEmployees` |
| `features/common/ui/Selectors.jsx` | `hrGetEmployees` |
| `features/core/components/OrgGovernanceMatrix.jsx` | `adminGetPermissions`, `adminUpdateRolePermissions` |
| `features/finance/hooks/usePayroll.js` | `hrGetPayroll`, `hrGetPayrollWatch` |
| `features/finance/hooks/useMyPayroll.js` | `getMyPayroll` |
| `features/ops/hooks/useOperations.js` | `hrGetAttendanceRecords`, `hrGetAttendanceWatch`, `hrGetLeaveRequests` |
| `features/talent/hooks/useTalentPipelines.js` | `getJobs`, `hrGetJobPipelineHealth` |

#### Candidate pages
| Page (route, roles) | API functions used |
|---|---|
| `CandidateDashboardPage` (`/candidate/dashboard`, Candidate) | (re-uses workspace data — see `pages/candidate/WorkspacePage.jsx`) |
| `CandidateApplicationsPage` (`/candidate/applications`, Candidate) | same file |

#### Employee pages (role `TeamMember`)
| Page | API functions used |
|---|---|
| `EmployeeDashboardPage` (`/employee/dashboard`) | `getMyAttendance`, `getMyTasks`, `getMyShifts` |
| `WorkloadCalendarPage` (`/employee/calendar`) | `getMyShifts`, `getMyTasks`, `getMyLeaveRequests` |
| `EmployeeAttendancePage` (`/employee/attendance`) | `getMyAttendance`, `clockAttendance` |
| `EmployeeLeaveManagementPage` (`/employee/leave-requests`) | `getMyLeaveRequests`, `submitLeaveRequest`, `cancelLeaveRequest` |
| `EmployeePayrollPage` (`/employee/payroll`) | `getMyPayroll` |
| `EmployeeReviewsPage` (`/employee/reviews`) | `acknowledgeMyReview`, `getMyReviews` |
| `EmployeeCareerPathPage` (`/employee/career-path`) | `acknowledgeCareerPlan`, `getMyCareerPath` |
| `EmployeeOnboardingPage` (`/employee/onboarding`) | `getMyOnboarding`, `updateMyOnboardingProgress` |
| `EmployeeShiftsPage` (`/employee/shifts`) | `acknowledgeMyShift`, `getMyShifts` |
| `EmployeeGoalsPage` (`/employee/goals`) | `getMyGoals`, `updateMyGoalProgress` |
| `EmployeeTasksPage` (`/employee/tasks`) | `getMyTasks`, `updateMyTaskProgress` |
| `EmployeeTrainingPage` (`/employee/training`) | `getMyTraining`, `updateMyTrainingProgress` |
| `EmployeePoliciesPage` (`/employee/policies`) | `acknowledgeMyPolicy`, `getMyPolicies` |
| `EmployeeRecognitionPage` (`/employee/recognition`) | `getMyRecognition` |
| `EmployeeBenefitsPage` (`/employee/benefits`) | `getMyBenefits`, `updateMyBenefitStatus` |
| `EmployeeExpensesPage` (`/employee/expenses`) | `getMyExpenses`, `submitExpenseClaim` |
| `EmployeeDocumentsPage` (`/employee/documents`) | `getMyDocuments`, `submitDocumentRequest` |
| `EmployeeTicketsPage` (`/employee/tickets`) | `getMyTickets`, `submitSupportTicket` |
| `EmployeeFeedbackPage` (`/employee/feedback`) | `getForms`, `submitFeedback` |
| `EmployeeSheetPage` (`/employee/sheet`) | `getMyAttendance`, `getMyLeaveRequests`, `getMyPayroll` |
| `EmployeeProfilePage` (`/employee/profile`) | `changePassword` |

#### HR pages (role `HRManager`)
| Page | API functions used |
|---|---|
| `HRDashboardPage` (`/hr/dashboard`) | `hrGetDashboardMetrics`, `hrGetGlobalTriage`, `hrGetRosterHealth`, `hrGetRiskCorridor`, `hrGetResourceDensity`, `hrGetActivityStream`, `hrTriggerIntelligenceSync` |
| `HRApprovalCenterPage` (`/hr/approvals`) | `hrGetApprovalSnapshot`, `hrGetDocuments`, `hrGetExpenses`, `hrGetLeaveRequests`, `hrGetTickets`, `hrIssueDocument`, `hrReviewExpenseClaim`, `hrReviewLeaveRequest`, `hrUpdateTicketStatus` |
| `HRApprovalsPage` (not in registry but file present) | `hrGetApprovals`, `hrProcessApproval` |
| `HROrgNeuralMapPage` (`/hr/org-map`) | `hrGetTalentGraph` |
| `HREmployeesPage` (`/hr/employees`) | `hrGetEmployees`, `hrGetRiskCorridor`, `hrUpdateEmployeeRecord`, `hrCreateEmployeeRecord` |
| `AttritionPage` (`/hr/attrition`) | `getLatestAttritionPredictions` |
| `BenchmarkingPage` (`/hr/benchmarking`) | `hrGetBenchmarking` |
| `TalentMatrixPage` (`/hr/talent-matrix`) | `hrGetTalentMatrix`, `hrCalibrateTalent` |
| `HRAttendancePage` (`/hr/attendance`) | `hrGetAttendanceRecords` |
| `HRPayrollPage` (`/hr/payroll`) | `hrGetPayroll`, `hrMarkPayrollPaid` |
| `HRReviewsPage` (`/hr/reviews`) | `hrGetReviews` |
| `HRSuccessionPage` (`/hr/succession`) | `hrGetSuccessionPlans` |
| `HROnboardingPage` (`/hr/onboarding`) | `hrGetOnboardingPlans` |
| `HRShiftsPage` (`/hr/shifts`) | `hrGetShifts`, `hrGetEmployees` |
| `HRPoliciesPage` (`/hr/policies`) | `hrGetPolicies` |
| `HRBenefitsPage` (`/hr/benefits`) | `hrGetBenefits` |
| `HRExpensesPage` (`/hr/expenses`) | `hrGetExpenses` |
| `HRDocumentsPage` (`/hr/documents`) | `hrGetDocuments` |
| `HRPlanningPage` (`/hr/planning`) | raw `api.get('/workforce/teams/')` |
| `HRTicketsPage` (`/hr/tickets`) | `hrGetTickets` |
| `HRTrainingPage` (`/hr/training`) | `hrGetTraining` |
| `HRFormsPage` (`/hr/forms`) | `hrGetForms` |
| `HRSubmissionPage` (`/hr/submissions`) | `hrGetSubmissions`, `hrGetForms` |
| `HRJobPostingsPage` (`/hr/jobs`) | `getJobs`, `createJob`, `updateJob` |
| `HRJobsPage` (file present, not in registry) | `hrGetJobs`, `hrUpdateJobStatus` |
| `HRCVRankingPage` (`/hr/cv-ranking`) | `getJobs`, `getJobRanking`, `hrBulkUpdateSubmissions`, `hrAutomateJobRecruitment`, `hireCandidate`, `hrGetJobInsights`, `hrOptimizeJob`, `getTalentCloneSimilarity` |
| `HRTeamPage` / `HRRecognitionPage` / `HRProfilePage` (`/hr/team`, `/hr/recognition`, `/hr/profile`) — all in `SharedWorkspacePages.jsx` | `getTeamGoals`, `getTeamRecognition`, `getTeamTasks`, `hrGetEmployees`, `hrGetLeaveRequests`, `hrGetTickets` |

#### Leader pages (role `TeamLeader`)
| Page | API functions used |
|---|---|
| `LeaderDashboardPage` (`/leader/dashboard`) | (re-uses workspace files; see below) |
| `WorkspacePages.jsx` (Leader personal Goals/Tasks/Tickets, etc.) | `getMyGoals`, `getMyTasks`, `getMyTickets`, `getTeamGoals`, `getTeamRecognition`, `getTeamTasks` |
| `PersonalCommandPages.jsx` (`/leader/attendance`, `/leader/payroll`, `/leader/documents`, `/leader/tickets`, `/leader/profile`) | `getMyAttendance`, `clockAttendance`, `getMyLeaveRequests`, `submitLeaveRequest`, `getMyPayroll`, `getMyDocuments`, `getMyTickets`, **`submitTicket`** (not exported anywhere — likely intended to be `submitSupportTicket`), `changePassword` |
| `TeamCalendarPage` (`/leader/team-calendar`) | `getTeamTasks`, `hrGetLeaveRequests` |
| `TeamRequestsPage` (`/leader/team-requests`) | (file imports from `'../api'`; verify in Phase 2) |
| `TeamAnalyticsPage` (`/leader/team-analytics`) | `getLatestAttritionPredictions`, `getTeamTasks` |
| `TeamSupportPage` (`/leader/team-support`) | (file imports from `'../api'`; verify in Phase 2) |
| `TeamFeedbackPage` (`/leader/team-feedback`) | `getReceivedFeedback`, `getTeamTasks` |
| `TeamDirectoryPage` (`/leader/team-directory`) | `hrGetEmployees` |
| `TeamGoalsPage` / `TeamPage.jsx` (`/leader/team`) | `createTeamGoal`, `getTeamGoals`, `updateTeamGoal`, `createTeamTask`, `getTeamTasks`, `updateTeamTask` |
| `TeamRecognitionPage` (`/leader/recognition`) | `getTeamRecognition`, `createTeamRecognition` |

#### Admin pages (role `Admin`)
| Page | API functions used |
|---|---|
| `AdminDashboardPage` (`/admin/dashboard`) | `getJobs`, `getOrgHealthSnapshot`, `hrGetDocuments`, `hrGetEmployees`, `hrGetExpenses`, `hrGetForms`, `hrGetLeaveRequests`, `hrGetTickets` |
| `AIIntelligencePage` (`/admin/intelligence`) | `hrSimulatePromotion` |
| `OperationsPages.jsx` (Admin users, employees, approvals, attendance, etc. — most `/admin/*` routes) | `getJobs`, `getTeamGoals`, `getTeamTasks`, `hrGetEmployees`, `hrGetExpenses`, `hrGetForms`, `hrGetLeaveRequests`, `hrGetShifts`, `hrGetTickets` |
| `OrganizationConfigPage` (`/admin/organization`) | `getJobs`, `hrGetEmployees`, `adminGetOrgConfig`, `adminUpdateOrgConfig`, `adminGetSkills`, `adminCreateSkill`, `adminDeleteSkill`, `adminGetLeaveTypes`, `adminCreateLeaveType`, `adminDeleteLeaveType`, `adminGetSystemHealth` |
| `ActivityLogsPage` (`/admin/activity-logs`) | `hrGetEmployees`, `getJobs` |
| `AdminAnalyticsPage` (`/admin/analytics`) | `hrGetEmployees`, `hrGetLeaveRequests`, `hrGetExpenses`, `hrGetTickets`, `hrGetDocuments` |
| `BroadcastCenterPage` (`/admin/broadcast`) | (imports from `'../api'`; verify in Phase 2) |
| `PermissionsMatrixPage` (`/admin/permissions`) | `adminGetPermissions`, `adminUpdateRolePermissions` |
| `BulkDataHub` (`/admin/data-hub`) | (uses `adminBulkImport`/`adminBulkExport`) |
| `SystemHealthPage` (`/admin/system-health`) | `adminGetSystemHealth` |

### B.3 Key cross-cutting observations (not yet decisions — for Phase 2)

1. **Namespace mismatch.** The frontend calls `/feedback/employee/...`,
   `/feedback/hr/...` and `/feedback/team/...` for almost every domain,
   but the backend places `employee/`, `hr/`, `team/` routes under
   *different* Django apps:

   - `/feedback/employee/tasks/` → backend has it under `/api/employee_management/employee/tasks/`
   - `/feedback/employee/payroll/` → backend has it under `/api/payroll/employee/payroll/`
   - `/feedback/employee/attendance/` → backend has it under `/api/attendance_leave/employee/attendance/`
   - `/feedback/employee/onboarding/` → backend has it under `/api/onboarding/employee/onboarding/`
   - `/feedback/hr/employees/` → `/api/employee_management/hr/employees/`
   - `/feedback/hr/payroll/` → `/api/payroll/hr/payroll/`
   - `/feedback/hr/attendance/` → `/api/attendance_leave/hr/attendance/`
   - `/feedback/hr/onboarding/` → `/api/onboarding/hr/onboarding/` (note: backend path is `hr/onboarding/`, not `hr/onboarding-plans/`)
   - `/feedback/hr/insights/` → `/api/employee_management/hr/insights/`
   - `/feedback/hr/intelligence/` → `/api/attrition/hr/intelligence/`
   - `/feedback/hr/approvals/snapshot/` → `/api/employee_management/hr/approvals/snapshot/`

   *Only the actual feedback-app routes (forms, submissions, questions) live
   under `/feedback/`.* Everything else the frontend prefixes with
   `/feedback/` is misrouted.

2. **Verb mismatches.**
   - Frontend uses POST for `/employee/.../progress/`, `/employee/.../acknowledge/`, etc. Backend matches (these views are CreateAPIView-style POSTs).
   - Frontend uses POST for `/employee/benefits/{id}/status/`; backend matches.
   - Frontend uses POST for `/recruitment/submissions/{id}/stage/`; **backend uses PATCH** (see `SubmissionStageUpdateView`). Verify in Phase 2.
   - Frontend `updateMyPreferences` is PUT to `/auth/me/`; backend `MeView` aliases PUT to PATCH, so this works.

3. **Frontend-only namespaces (no backend implementation found):**
   - `/analytics/*` (dashboard, global-triage, risk-corridor, resource-density, activity-stream, sync)
   - `/governance/*` (organization/current, activity-logs, permissions)
   - `/workforce/skills/`, `/workforce/teams/`
   - `/ops/leave-types/`, `/ops/bulk-import/`, `/ops/bulk-export/`
   - `/ai/command/`, `/ai/health-snapshot/`, `/ai/simulate-change/`
   - `/talent/matrix/`, `/talent/calibrate/`
   - `/notifications/...` at root (backend equivalent lives at `/mobile/notifications/`)
   - Several recruitment extras: `/recruitment/submissions/bulk-update/`, `/recruitment/jobs/{id}/automate/`, `/recruitment/jobs/{id}/insights/`, `/recruitment/jobs/{id}/optimize/`, `/recruitment/submissions/{id}/hire/`, `/recruitment/submissions/{id}/similar/`, `/recruitment/talent-search/`, `/recruitment/talent-similarity/`, `/recruitment/benchmarking/`, `/recruitment/benchmarking/sync/`, `/recruitment/talent-pools/`, `/recruitment/promote/`, `/recruitment/talent-graph/`
   - `/feedback/employee/peer-feedback/`, `/feedback/employee/received-feedback/`
   - `/feedback/employee/shifts/{id}/swap/`
   - `/feedback/employee/tickets/{id}/close/`
   - `/feedback/hr/approvals/` (list), `/feedback/hr/approvals/{id}/process/`
   - `/feedback/hr/simulate-promotion/`
   - `/attrition/calibrate/`, `/attrition/events/`

4. **Backend endpoints with no frontend consumer (preliminary — verify in Phase 2):**
   - All of `/api/mobile/*` (frontend talks to `/notifications/` at root, not `/mobile/notifications/`).
   - Infrastructure admin endpoints under `/api/employee_management/` (`departments/`, `teams/`, `jobs/`, `leave-types/`, `jobs/{id}/benchmark/`, `hr/salary-benchmark/`).
   - `/api/recruitment/jobs/{id}/weights/`, `/api/recruitment/succession-plans/...`, `/api/recruitment/hr/succession/...` (frontend uses `hrGetSuccessionPlans` → `/feedback/hr/succession/` instead).
   - `/api/attendance_leave/team/overtime/*` (the Team Leader overtime review queue — frontend does not call this).
   - `/api/attrition/predictions/` (frontend uses `/latest/` only).
   - `/api/auth/demo-access/`, `/api/auth/employees/create/` (no admin page calls them yet).
   - `/api/send-email/` (no frontend consumer found).
   - `/api/feedback/hr/forms/{form_id}/questions/` GET (only POST is wired).

5. **Frontend bugs/oddities (existing, independent of integration):**
   - `notification.js` calls `api.patch(...)` but `base.js` does not define `patch`. Will fail at runtime.
   - `PersonalCommandPages.jsx` imports `submitTicket` from `'../../api/index.js'`; no such export exists (probably meant `submitSupportTicket`).
   - `recruitment.js` `getTalentCloneSimilarity` calls `api.get('/recruitment/talent-similarity/', { params: {...} })`. `api.get` only takes a URL — the params object is dropped. Looks like axios-style code mixed in.
   - `EmployeesPage.jsx` imports `hrGetRiskCorridor` from `api/index.js` — re-exported via `hr.js`, OK.

6. **Auth flow assumptions to verify:**
   - Login response is expected to carry `role` and `employee_id`. Backend serializer (`CustomTokenObtainPairSerializer`) provides them. Good.
   - The frontend stores `user` in localStorage but the login payload doesn't have a `user` object — `AuthContext` likely constructs one from claims. Worth a quick read in Phase 2 before wiring is finalized.

---

End of Phase 1 inventory. Next step is Phase 2 — `INTEGRATION_MAP.md` — and
nothing should be modified in either tree until you sign off on the map.
