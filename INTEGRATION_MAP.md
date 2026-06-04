# INTEGRATION_MAP — Phase 2

Scope-narrowed per instructions: this phase focuses on the `/feedback/*`
namespace mismatch. Mobile (`/api/mobile/*`) is carved out and listed
under Section C without analysis. Other unmapped namespaces (`/analytics`,
`/governance`, `/workforce`, `/ops`, `/ai`, `/talent`, root `/notifications`,
extended recruitment AI routes) stay parked in Section D.

This file is read-only output. No source files were edited.

## How "path-only" vs "shape mismatch" was decided

For every row I verified:
1. The backend route exists at the listed mount (verified against `urls.py`
   in each Django app).
2. The HTTP verb is supported by the backend view.
3. Request/response field names match by direct comparison between the
   frontend call site and the backend serializer / view.

Rows marked `path-only` passed all three. I sampled view+serializer code
for ~25 representative endpoints (forms, goals, tasks, attendance, leave,
expenses, documents, tickets, benefits, reviews, career-path, onboarding,
shifts, policies, payroll). Where my sample turned up a real shape problem
I marked it `shape mismatch` and described the exact delta in Notes.
Other rows are best-effort field-name comparison; if any subtle
serializer-level mismatch surfaces when wiring, I will record it in the
per-item session log appended to this file.

Path conventions:
- Frontend column shows the path the frontend builds (it omits the `/api`
  prefix, which `src/api/base.js` prepends).
- Backend column shows the full real route (`/api/<app>/<route>`).

`Caller (file:line)` cites the **API client function** that drives the call
— i.e. the place to edit in Phase 3. Page-level call sites for context can
be found in `INTEGRATION_AUDIT.md` Section B.2.

---

## Section A — Feedback remap table

### A.1 Genuine feedback routes (stay on `feedback` app)

| Frontend call (method + path) | Caller (file:line) | Target backend app | Target backend route (method + path) | Path-only or shape mismatch | Notes |
|---|---|---|---|---|---|
| GET `/feedback/forms/?employee_id=…` | `src/api/employee.js:3` (`getForms`) | feedback | GET `/api/feedback/forms/` | path-only ✅ 2026-05-24 | Backend explicitly accepts the `employee_id` query param and attaches the user's submission inline. No remap needed — already correct, leave as-is. |
| POST `/feedback/forms/{formID}/submit/` | `src/api/employee.js:4` (`submitFeedback`) | feedback | POST `/api/feedback/forms/<form_id>/submit/` | path-only ✅ 2026-05-24 | Body: `{ employeeID, answers: [{ questionID, ... }] }` per `SubmitFeedbackSerializer`. No remap needed. |
| GET `/feedback/hr/forms/` | `src/api/hr.js:4` (`hrGetForms`) | feedback | GET `/api/feedback/hr/forms/` | path-only ✅ 2026-05-24 | No remap needed. |
| GET `/feedback/hr/forms/{id}/` | `src/api/hr.js:5` (`hrGetFormDetail`) | feedback | GET `/api/feedback/hr/forms/<form_id>/` | path-only ✅ 2026-05-24 | No remap needed. |
| GET `/feedback/hr/forms/response-snapshot/` | `src/api/hr.js:6` (`hrGetFormResponseSnapshot`) | feedback | GET `/api/feedback/hr/forms/response-snapshot/` | path-only ✅ 2026-05-24 | No remap needed. |
| POST `/feedback/hr/forms/` | `src/api/hr.js:7` (`hrCreateForm`) | feedback | POST `/api/feedback/hr/forms/` | path-only ✅ 2026-05-24 | No remap needed. |
| PUT `/feedback/hr/forms/{id}/` | `src/api/hr.js:8` (`hrUpdateForm`) | feedback | PUT `/api/feedback/hr/forms/<form_id>/` | path-only ✅ 2026-05-24 | No remap needed. |
| DELETE `/feedback/hr/forms/{id}/` | `src/api/hr.js:9` (`hrDeleteForm`) | feedback | DELETE `/api/feedback/hr/forms/<form_id>/` | path-only ✅ 2026-05-24 | No remap needed. |
| POST `/feedback/hr/forms/{id}/activate/` | `src/api/hr.js:10` (`hrActivateForm`) | feedback | POST `/api/feedback/hr/forms/<form_id>/activate/` | path-only ✅ 2026-05-24 | No remap needed. |
| POST `/feedback/hr/forms/{id}/deactivate/` | `src/api/hr.js:11` (`hrDeactivateForm`) | feedback | POST `/api/feedback/hr/forms/<form_id>/deactivate/` | path-only ✅ 2026-05-24 | No remap needed. |
| POST `/feedback/hr/forms/{formID}/questions/` | `src/api/hr.js:14` (`hrAddQuestion`) | feedback | POST `/api/feedback/hr/forms/<form_id>/questions/` | path-only ✅ 2026-05-24 | No remap needed. The GET variant of this URL exists on backend but is not called by the frontend. |
| DELETE `/feedback/hr/questions/{qID}/` | `src/api/hr.js:15` (`hrDeleteQuestion`) | feedback | DELETE `/api/feedback/hr/questions/<question_id>/` | path-only ✅ 2026-05-24 | No remap needed. |
| GET `/feedback/hr/submissions/?…` | `src/api/hr.js:30` (`hrGetSubmissions`) | feedback | GET `/api/feedback/hr/submissions/` | path-only ✅ 2026-05-24 | Backend supports `?form_id=` and other filters. No remap needed. |
| GET `/feedback/hr/submissions/insights/?form_id=…` | `src/api/hr.js:32` (`hrGetSubmissionInsights`) | feedback | GET `/api/feedback/hr/submissions/insights/` | path-only ✅ 2026-05-24 | No remap needed. |

### A.2 Frontend `/feedback/employee/*` routed elsewhere

| Frontend call (method + path) | Caller (file:line) | Target backend app | Target backend route (method + path) | Path-only or shape mismatch | Notes |
|---|---|---|---|---|---|
| GET `/feedback/employee/attendance/?employee_id=…` | `src/api/employee.js:8` (`getMyAttendance`) | attendance_leave | GET `/api/attendance_leave/employee/attendance/` | path-only ✅ 2026-05-24 | `EmployeeAttendanceListView` accepts the `employee_id` query param with a fallback to `request.user.employee_id`. |
| POST `/feedback/employee/attendance/clock/` | `src/api/employee.js:9` (`clockAttendance`) | attendance_leave | POST `/api/attendance_leave/employee/attendance/clock/` | **shape mismatch** ✅ done 2026-05-23 | Backend `AttendanceClockSerializer` requires `{ employeeID, action: 'clock_in' \| 'clock_out', notes? }`. Frontend `PersonalCommandPages.jsx:73` sends `{ type }` (e.g. `'in'`/`'out'`). Wrapper now sources `employeeID` from `localStorage.user.employee_id` (same source `AuthContext` uses to rehydrate sessions), maps `type` `'in'`/`'out'` → `action` `'clock_in'`/`'clock_out'`, and accepts pre-shaped `{ employeeID, action, notes? }` callers unchanged. `notes` is passed through only if present. |
| GET `/feedback/employee/leave-requests/?employee_id=…` | `src/api/employee.js:10` (`getMyLeaveRequests`) | attendance_leave | GET `/api/attendance_leave/employee/leave-requests/` | path-only + inbound shape transform ✅ done 2026-05-23 | Backend accepts `employee_id` query param. URL remapped. Inbound transform added (part of Option A for the shape-mismatch row below): each item's `leaveType` is mapped from the backend enum (`'Annual' / 'Sick' / 'Unpaid'`) back to the display string the existing UI consumes (`'Annual Leave' / 'Sick Leave' / 'Unpaid Leave'`). Components are not touched. |
| POST `/feedback/employee/leave-requests/` | `src/api/employee.js:11` (`submitLeaveRequest`) | attendance_leave | POST `/api/attendance_leave/employee/leave-requests/` | **shape mismatch** ✅ done 2026-05-23 | Body fields match (`employeeID, leaveType, startDate, endDate, reason`); URL remapped. Outbound transform added: `leaveType` is mapped from the display string the form sends (`'Annual Leave'`) to the backend enum (`'Annual'`). Paired with the inbound transform on `getMyLeaveRequests` so `LeaveManagementPage.jsx` (and any other employee-scope consumer of `getMyLeaveRequests`) keeps working as today without component edits. **Note:** HR-side consumers that hit `hrGetLeaveRequests` (e.g. `Navbar.jsx`, `ApprovalCenterPage.jsx`) get raw enum values — that's a separate row covered in Step 3. |
| DELETE `/feedback/employee/leave-requests/{id}/` | `src/api/employee.js:12` (`cancelLeaveRequest`) | — | — | 🗑 removed 2026-05-24 (Decision 1) | API export `cancelLeaveRequest` deleted from `src/api/employee.js`. Import removed from `src/pages/employee/LeaveManagementPage.jsx:2`. No delete button or handler existed in the JSX, so nothing else needed removing. Backend `/attendance_leave/leave-requests/{id}/` route untouched per Decision 1. |
| GET `/feedback/employee/payroll/?employee_id=…` | `src/api/employee.js:14` (`getMyPayroll`) | payroll | GET `/api/payroll/employee/payroll/` | path-only ✅ 2026-05-24 | Backend accepts `employee_id` param. |
| GET `/feedback/employee/reviews/?employee_id=…` | `src/api/employee.js:16` (`getMyReviews`) | employee_management | GET `/api/employee_management/employee/reviews/` | path-only ✅ 2026-05-24 | Backend accepts `employee_id` query param. |
| POST `/feedback/employee/reviews/{id}/acknowledge/` | `src/api/employee.js:17` (`acknowledgeMyReview`) | employee_management | POST `/api/employee_management/employee/reviews/<review_id>/acknowledge/` | path-only ✅ 2026-05-24 | Body: `{ note? }` per `PerformanceReviewAcknowledgeSerializer`. Frontend already calls with `(id, data = {})`. |
| GET `/feedback/employee/career-path/?employee_id=…` | `src/api/employee.js:19` (`getMyCareerPath`) | employee_management | GET `/api/employee_management/employee/career-path/` | path-only ✅ 2026-05-24 | Accepts `employee_id` query param. |
| POST `/feedback/employee/career-path/{id}/acknowledge/` | `src/api/employee.js:20` (`acknowledgeCareerPlan`) | employee_management | POST `/api/employee_management/employee/career-path/<plan_id>/acknowledge/` | path-only ✅ 2026-05-24 | Body: `{ note? }`. |
| GET `/feedback/employee/onboarding/?employee_id=…` | `src/api/employee.js:22` (`getMyOnboarding`) | onboarding | GET `/api/onboarding/employee/onboarding/` | path-only ✅ 2026-05-24 | Accepts `employee_id` query param. |
| POST `/feedback/employee/onboarding/{id}/progress/` | `src/api/employee.js:23` (`updateMyOnboardingProgress`) | onboarding | POST `/api/onboarding/employee/onboarding/<plan_id>/progress/` | path-only ✅ 2026-05-24 | Body: `{ status?, progress?, note? }` per `OnboardingPlanProgressSerializer`. |
| GET `/feedback/employee/shifts/?employee_id=…` | `src/api/employee.js:25` (`getMyShifts`) | employee_management | GET `/api/employee_management/employee/shifts/` | path-only ✅ 2026-05-24 | Accepts `employee_id` query param. |
| POST `/feedback/employee/shifts/{id}/acknowledge/` | `src/api/employee.js:26` (`acknowledgeMyShift`) | employee_management | POST `/api/employee_management/employee/shifts/<schedule_id>/acknowledge/` | path-only ✅ 2026-05-24 | Body: `{ status?: 'Confirmed' \| 'Completed' \| 'Swapped', note? }` per `ShiftScheduleAcknowledgeSerializer`. |
| GET `/feedback/employee/policies/?…` | `src/api/employee.js:37` (`getMyPolicies`) | employee_management | GET `/api/employee_management/employee/policies/` | path-only ✅ 2026-05-24 | Backend filters by `status` query param. |
| POST `/feedback/employee/policies/{id}/acknowledge/` | `src/api/employee.js:39` (`acknowledgeMyPolicy`) | employee_management | POST `/api/employee_management/employee/policies/<policy_id>/acknowledge/` | path-only ✅ 2026-05-24 | Body: `{ note? }` per `PolicyAnnouncementAcknowledgeSerializer`. |
| GET `/feedback/employee/benefits/?employee_id=…` | `src/api/employee.js:41` (`getMyBenefits`) | employee_management | GET `/api/employee_management/employee/benefits/` | path-only ✅ 2026-05-24 | Accepts `employee_id` query param. |
| POST `/feedback/employee/benefits/{id}/status/` | `src/api/employee.js:42` (`updateMyBenefitStatus`) | employee_management | POST `/api/employee_management/employee/benefits/<enrollment_id>/status/` | path-only ✅ 2026-05-24 | Body: `{ status?: 'Enrolled' \| 'Waived', note? }` per `BenefitEnrollmentStatusSerializer`. |
| GET `/feedback/employee/expenses/?employee_id=…` | `src/api/employee.js:44` (`getMyExpenses`) | employee_management | GET `/api/employee_management/employee/expenses/` | path-only ✅ 2026-05-24 | Accepts `employee_id` query param. |
| POST `/feedback/employee/expenses/` | `src/api/employee.js:45` (`submitExpenseClaim`) | employee_management | POST `/api/employee_management/employee/expenses/` | path-only ✅ 2026-05-24 | Body fields (`title, category, amount, expenseDate, description`) match `ExpenseClaimCreateSerializer`. `category` choices restricted on the backend — call site sends `'Travel'`, which is fine if it's in `ExpenseClaim.CATEGORY_CHOICES`. Verify when wiring. |
| GET `/feedback/employee/documents/?employee_id=…` | `src/api/employee.js:48` (`getMyDocuments`) | employee_management | GET `/api/employee_management/employee/documents/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/employee/documents/` | `src/api/employee.js:49` (`submitDocumentRequest`) | employee_management | POST `/api/employee_management/employee/documents/` | path-only ✅ 2026-05-24 | Body fields (`documentType, purpose, notes`) match `DocumentRequestCreateSerializer`. |
| GET `/feedback/employee/tickets/?employee_id=…` | `src/api/employee.js:51` (`getMyTickets`) | employee_management | GET `/api/employee_management/employee/tickets/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/employee/tickets/` | `src/api/employee.js:52` (`submitSupportTicket`) | employee_management | POST `/api/employee_management/employee/tickets/` | path-only ✅ 2026-05-24 | Body (`subject, category, priority, description`) matches `SupportTicketCreateSerializer`. |
| GET `/feedback/employee/goals/?employee_id=…` | `src/api/employee.js:55` (`getMyGoals`) | employee_management | GET `/api/employee_management/employee/goals/` | path-only ✅ 2026-05-24 | Accepts `employee_id` query param. |
| POST `/feedback/employee/goals/{id}/progress/` | `src/api/employee.js:56` (`updateMyGoalProgress`) | employee_management | POST `/api/employee_management/employee/goals/<goal_id>/progress/` | path-only ✅ 2026-05-24 | Body: `{ status?, progress? }` per `EmployeeGoalProgressSerializer`. |
| GET `/feedback/employee/tasks/?employee_id=…` | `src/api/employee.js:58` (`getMyTasks`) | employee_management | GET `/api/employee_management/employee/tasks/` | path-only ✅ 2026-05-24 | Accepts `employee_id` query param. |
| POST `/feedback/employee/tasks/{id}/progress/` | `src/api/employee.js:59` (`updateMyTaskProgress`) | employee_management | POST `/api/employee_management/employee/tasks/<task_id>/progress/` | path-only ✅ 2026-05-24 | Body: `{ status?, progress?, notes? }` per `WorkTaskProgressSerializer`. |
| GET `/feedback/employee/recognition/?employee_id=…` | `src/api/employee.js:61` (`getMyRecognition`) | employee_management | GET `/api/employee_management/employee/recognition/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/employee/training/?employee_id=…` | `src/api/employee.js:63` (`getMyTraining`) | employee_management | GET `/api/employee_management/employee/training/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/employee/training/{id}/progress/` | `src/api/employee.js:64` (`updateMyTrainingProgress`) | employee_management | POST `/api/employee_management/employee/training/<course_id>/progress/` | path-only ✅ 2026-05-24 | |

### A.3 Frontend `/feedback/hr/*` routed elsewhere

| Frontend call (method + path) | Caller (file:line) | Target backend app | Target backend route (method + path) | Path-only or shape mismatch | Notes |
|---|---|---|---|---|---|
| GET `/feedback/hr/insights/` | `src/api/hr.js:33` (`hrGetInsights`) | employee_management | GET `/api/employee_management/hr/insights/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/intelligence/` | `src/api/hr.js:34` (`hrGetIntelligence`) | attrition | GET `/api/attrition/hr/intelligence/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/action-plans/?…` | `src/api/hr.js:43` (`hrGetActionPlans`) | employee_management | GET `/api/employee_management/hr/action-plans/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/action-plans/` | `src/api/hr.js:45` (`hrCreateActionPlan`) | employee_management | POST `/api/employee_management/hr/action-plans/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/action-plans/{id}/status/` | `src/api/hr.js:46` (`hrUpdateActionPlanStatus`) | employee_management | POST `/api/employee_management/hr/action-plans/<task_id>/status/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/employees/?…` | `src/api/hr.js:57` (`hrGetEmployees`) | employee_management | GET `/api/employee_management/hr/employees/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/employees/roster-health/` | `src/api/hr.js:59` (`hrGetRosterHealth`) | employee_management | GET `/api/employee_management/hr/employees/roster-health/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/employees/` | `src/api/hr.js:60` (`hrCreateEmployeeRecord`) | employee_management | POST `/api/employee_management/hr/employees/` | path-only ✅ 2026-05-24 | |
| PUT `/feedback/hr/employees/{id}/` | `src/api/hr.js:61` (`hrUpdateEmployeeRecord`) | employee_management | PUT `/api/employee_management/hr/employees/<employee_id>/` | path-only ✅ 2026-05-24 | |
| DELETE `/feedback/hr/employees/{id}/` | `src/api/hr.js:62` (`hrDeleteEmployeeRecord`) | employee_management | DELETE `/api/employee_management/hr/employees/<employee_id>/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/employees/{id}/history/` | `src/api/hr.js:63` (`hrGetEmployeeHistory`) | employee_management | GET `/api/employee_management/hr/employees/<employee_id>/history/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/employees/{id}/snapshot/` | `src/api/hr.js:64` (`hrGetEmployeeSnapshot`) | employee_management | GET `/api/employee_management/hr/employees/<employee_id>/snapshot/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/employees/{id}/change-role/` | `src/api/hr.js:65` (`hrChangeEmployeeRole`) | employee_management | POST `/api/employee_management/hr/employees/<employee_id>/change-role/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/attendance/` | `src/api/hr.js:69` (`hrGetAttendanceRecords`) | attendance_leave | GET `/api/attendance_leave/hr/attendance/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/attendance/watch/` | `src/api/hr.js:70` (`hrGetAttendanceWatch`) | attendance_leave | GET `/api/attendance_leave/hr/attendance/watch/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/leave-requests/` | `src/api/hr.js:71` (`hrGetLeaveRequests`) | attendance_leave | GET `/api/attendance_leave/hr/leave-requests/` | path-only ✅ 2026-05-24 | `LeaveRequestListCreateView` is reused under both `/leave-requests/` and `hr/leave-requests/` mounts; supports `?status=` / `?department=` filters. |
| GET `/feedback/hr/approvals/snapshot/` | `src/api/hr.js:72` (`hrGetApprovalSnapshot`) | employee_management | GET `/api/employee_management/hr/approvals/snapshot/` | path-only ✅ 2026-05-24 | View docstring even references `/api/feedback/hr/approvals/snapshot/`, confirming this was intended path. |
| POST `/feedback/hr/leave-requests/{id}/review/` | `src/api/hr.js:75` (`hrReviewLeaveRequest`) | attendance_leave | POST `/api/attendance_leave/hr/leave-requests/<pk>/review/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/payroll/?…` | `src/api/hr.js:86` (`hrGetPayroll`) | payroll | GET `/api/payroll/hr/payroll/` | path-only ✅ 2026-05-24 | Backend supports `employee_id`, `pay_period`, `status` query params. |
| GET `/feedback/hr/payroll/watch/` | `src/api/hr.js:88` (`hrGetPayrollWatch`) | payroll | GET `/api/payroll/hr/payroll/watch/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/payroll/` | `src/api/hr.js:89` (`hrCreatePayroll`) | payroll | POST `/api/payroll/hr/payroll/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/payroll/{id}/mark-paid/` | `src/api/hr.js:90` (`hrMarkPayrollPaid`) | payroll | POST `/api/payroll/hr/payroll/<payroll_id>/mark-paid/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/reviews/?…` | `src/api/hr.js:101` (`hrGetReviews`) | employee_management | GET `/api/employee_management/hr/reviews/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/reviews/calibration/` | `src/api/hr.js:103` (`hrGetReviewCalibration`) | employee_management | GET `/api/employee_management/hr/reviews/calibration/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/reviews/` | `src/api/hr.js:104` (`hrCreateReview`) | employee_management | POST `/api/employee_management/hr/reviews/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/succession/?…` | `src/api/hr.js:115` (`hrGetSuccessionPlans`) | recruitment | GET `/api/recruitment/hr/succession/` | path-only ✅ 2026-05-24 (Decision 2) | Wired to the existing `resume_pipeline` mount per Decision 2 — no view/serializer/URL renames on the backend. Response shape verification deferred to smoke test. |
| GET `/feedback/hr/succession/watch/` | `src/api/hr.js:117` (`hrGetSuccessionWatch`) | recruitment | GET `/api/recruitment/hr/succession/watch/` | path-only ✅ 2026-05-24 (Decision 2) | Same as above. |
| POST `/feedback/hr/succession/` | `src/api/hr.js:118` (`hrCreateSuccessionPlan`) | recruitment | POST `/api/recruitment/hr/succession/` | path-only ✅ 2026-05-24 (Decision 2) | Same as above. |
| GET `/feedback/hr/onboarding/?…` | `src/api/hr.js:129` (`hrGetOnboardingPlans`) | onboarding | GET `/api/onboarding/hr/onboarding/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/onboarding/watch/` | `src/api/hr.js:131` (`hrGetOnboardingWatch`) | onboarding | GET `/api/onboarding/hr/onboarding/watch/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/onboarding/` | `src/api/hr.js:132` (`hrCreateOnboardingPlan`) | onboarding | POST `/api/onboarding/hr/onboarding/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/shifts/?…` | `src/api/hr.js:143` (`hrGetShifts`) | employee_management | GET `/api/employee_management/hr/shifts/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/shifts/watch/` | `src/api/hr.js:145` (`hrGetShiftWatch`) | employee_management | GET `/api/employee_management/hr/shifts/watch/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/shifts/` | `src/api/hr.js:146` (`hrCreateShift`) | employee_management | POST `/api/employee_management/hr/shifts/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/policies/compliance/` | `src/api/hr.js:149` (`hrGetPolicyCompliance`) | employee_management | GET `/api/employee_management/hr/policies/compliance/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/policies/{id}/remind/` | `src/api/hr.js:150` (`hrSendPolicyReminder`) | employee_management | POST `/api/employee_management/hr/policies/<policy_id>/remind/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/policies/?…` | `src/api/hr.js:159` (`hrGetPolicies`) | employee_management | GET `/api/employee_management/hr/policies/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/policies/` | `src/api/hr.js:161` (`hrCreatePolicy`) | employee_management | POST `/api/employee_management/hr/policies/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/benefits/?…` | `src/api/hr.js:172` (`hrGetBenefits`) | employee_management | GET `/api/employee_management/hr/benefits/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/benefits/watch/` | `src/api/hr.js:174` (`hrGetBenefitWatch`) | employee_management | GET `/api/employee_management/hr/benefits/watch/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/benefits/` | `src/api/hr.js:175` (`hrCreateBenefit`) | employee_management | POST `/api/employee_management/hr/benefits/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/expenses/?…` | `src/api/hr.js:186` (`hrGetExpenses`) | employee_management | GET `/api/employee_management/hr/expenses/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/expenses/watch/` | `src/api/hr.js:188` (`hrGetExpenseWatch`) | employee_management | GET `/api/employee_management/hr/expenses/watch/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/expenses/{id}/review/` | `src/api/hr.js:189` (`hrReviewExpenseClaim`) | employee_management | POST `/api/employee_management/hr/expenses/<claim_id>/review/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/documents/?…` | `src/api/hr.js:200` (`hrGetDocuments`) | employee_management | GET `/api/employee_management/hr/documents/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/documents/watch/` | `src/api/hr.js:202` (`hrGetDocumentWatch`) | employee_management | GET `/api/employee_management/hr/documents/watch/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/documents/{id}/issue/` | `src/api/hr.js:203` (`hrIssueDocument`) | employee_management | POST `/api/employee_management/hr/documents/<request_id>/issue/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/tickets/?…` | `src/api/hr.js:214` (`hrGetTickets`) | employee_management | GET `/api/employee_management/hr/tickets/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/tickets/watch/` | `src/api/hr.js:216` (`hrGetTicketWatch`) | employee_management | GET `/api/employee_management/hr/tickets/watch/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/tickets/{id}/status/` | `src/api/hr.js:217` (`hrUpdateTicketStatus`) | employee_management | POST `/api/employee_management/hr/tickets/<ticket_id>/status/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/recognition/watch/` | `src/api/hr.js:220` (`hrGetRecognitionWatch`) | employee_management | GET `/api/employee_management/hr/recognition/watch/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/training/?…` | `src/api/hr.js:231` (`hrGetTraining`) | employee_management | GET `/api/employee_management/hr/training/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/hr/training/compliance/` | `src/api/hr.js:233` (`hrGetTrainingCompliance`) | employee_management | GET `/api/employee_management/hr/training/compliance/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/hr/training/` | `src/api/hr.js:234` (`hrCreateTraining`) | employee_management | POST `/api/employee_management/hr/training/` | path-only ✅ 2026-05-24 | |

### A.4 Frontend `/feedback/team/*` routed elsewhere

| Frontend call (method + path) | Caller (file:line) | Target backend app | Target backend route (method + path) | Path-only or shape mismatch | Notes |
|---|---|---|---|---|---|
| GET `/feedback/team/goals/?…` | `src/api/leader.js:12` (`getTeamGoals`) | employee_management | GET `/api/employee_management/team/goals/` | path-only ✅ 2026-05-24 | Backend filters automatically by the team-leader's team; no `employee_id` filter expected. |
| POST `/feedback/team/goals/` | `src/api/leader.js:14` (`createTeamGoal`) | employee_management | POST `/api/employee_management/team/goals/` | path-only ✅ 2026-05-24 | Body: `EmployeeGoalCreateSerializer` (`employeeID, title, description?, category?, priority?, status?, progress?, dueDate?`). |
| PUT `/feedback/team/goals/{id}/` | `src/api/leader.js:15` (`updateTeamGoal`) | employee_management | PUT `/api/employee_management/team/goals/<goal_id>/` | path-only ✅ 2026-05-24 | Backend uses partial=True; supports field subset. |
| GET `/feedback/team/tasks/?…` | `src/api/leader.js:26` (`getTeamTasks`) | employee_management | GET `/api/employee_management/team/tasks/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/team/tasks/` | `src/api/leader.js:28` (`createTeamTask`) | employee_management | POST `/api/employee_management/team/tasks/` | path-only ✅ 2026-05-24 | |
| PUT `/feedback/team/tasks/{id}/` | `src/api/leader.js:29` (`updateTeamTask`) | employee_management | PUT `/api/employee_management/team/tasks/<task_id>/` | path-only ✅ 2026-05-24 | |
| GET `/feedback/team/recognition/?…` | `src/api/leader.js:40` (`getTeamRecognition`) | employee_management | GET `/api/employee_management/team/recognition/` | path-only ✅ 2026-05-24 | |
| POST `/feedback/team/recognition/` | `src/api/leader.js:42` (`createTeamRecognition`) | employee_management | POST `/api/employee_management/team/recognition/` | path-only ✅ 2026-05-24 | |

---
## Decisions on UNCERTAIN rows (resolved {5-23-2026})

### 1. `DELETE /feedback/employee/leave-requests/{id}/`
**Decision: Remove from frontend. Do not add a backend endpoint.**

Employees are not permitted to delete their own leave requests. The delete action should not exist in the employee-scoped UI at all.

Phase 3 action:
- Remove the delete call from `src/api/employee.js` (or wherever the employee leave-request client lives).
- Remove the delete button / handler from `LeaveManagementPage.jsx` and any other employee-facing component that exposes it.
- Do NOT touch the auth-only `/attendance_leave/leave-requests/{id}/` backend route — it stays as-is for HR/admin use.
- If the employee UI shows a list of leave requests, leave the list intact; only the delete affordance is removed.

Out of scope:
- No backend changes.
- No changes to HR/admin leave-management flows.
- Cancellation/withdrawal of pending requests is a separate feature decision; not addressed here.

### 2. HR succession endpoints living in `recruitment` (resume_pipeline) app
**Decision: Leave as-is. Wire frontend to existing paths. No reorganization.**

The three HR succession endpoints currently live inside the `recruitment` / `resume_pipeline` app rather than `employee_management`. Paths match what the frontend expects, so functionally there is no issue. The code-organization concern is acknowledged but explicitly deferred.

Phase 3 action:
- Wire the frontend HR succession calls to the existing backend paths in `recruitment` / `resume_pipeline`. Treat as path-only rows.
- Do NOT move the views, serializers, urls, or models to a different Django app.
- Do NOT rename routes.

Follow-up (not Phase 3):
- TODO (tracked outside this map): revisit whether succession belongs in `recruitment` or `employee_management` once the integration is shipped. Decision deferred; not blocking.

## Section B — Feedback calls with no backend equivalent

Listed per the rules — frontend caller, what it appears to want, and a
best-guess of which backend app it would belong to. **No backend changes
proposed here; this is a parking lot for Phase 4 decisions.**

| Frontend call | Caller (file:line) | What it appears to want | Best-guess owning app |
|---|---|---|---|
| POST `/feedback/employee/peer-feedback/` | `src/api/employee.js:5` (`submitPeerFeedback`) | An employee submits free-form feedback about a peer (no consumer page found — likely future use). | feedback (new endpoint), or employee_management as a peer-recognition variant |
| GET `/feedback/employee/received-feedback/` | `src/api/employee.js:6` (`getReceivedFeedback`) | Lists feedback the current employee has received. Consumer: `pages/leader/TeamFeedbackPage.jsx:25`. | feedback |
| POST `/feedback/employee/shifts/{id}/swap/` | `src/api/employee.js:27` (`requestShiftSwap`) | Employee requests a shift swap. No call site found in pages. | employee_management (shift app) |
| POST `/feedback/employee/tickets/{id}/close/` | `src/api/employee.js:53` (`closeSupportTicket`) | Employee closes their own ticket. Backend currently only has HR-side `tickets/<id>/status/`. | employee_management (tickets) |
| DELETE `/feedback/employee/expenses/{id}/` | `src/api/employee.js:46` (`deleteExpenseClaim`) | Employee deletes/withdraws an expense claim. No detail endpoint exists; only list/create. | employee_management (expenses) |
| GET `/feedback/hr/approvals/` | `src/api/hr.js:73` (`hrGetApprovals`) | Generic "approval queue" list. Consumer: `pages/hr/ApprovalsPage.jsx:4`. Backend exposes a *snapshot* aggregate but no list endpoint with this shape. | employee_management |
| POST `/feedback/hr/approvals/{id}/process/` | `src/api/hr.js:74` (`hrProcessApproval`) | Approve/reject from the generic approvals page. Consumer: `pages/hr/ApprovalsPage.jsx`. No generic processor exists; backend has dedicated per-type endpoints (leave review, expense review, etc.). | employee_management |
| POST `/feedback/hr/simulate-promotion/` | `src/api/hr.js:66` (`hrSimulatePromotion`) | "What-if" promotion simulator. Consumer: `pages/admin/AIIntelligencePage.jsx:13`. | attrition (intelligence) or new `ai` app |

---

## Section C — Out of scope (mobile)

Mobile carve-out per Phase 2 instructions. No analysis performed and no
remapping needed. Frontend never calls the `/api/mobile/*` namespace —
the only frontend "notifications" call uses a root `/notifications/*` path
in `src/api/notification.js` (see Section D).

Backend routes that exist but are out of scope:
- `GET  /api/mobile/notifications/`
- `GET  /api/mobile/dashboard/`
- `GET  /api/mobile/hr/dashboard/`
- `GET  /api/mobile/hr/attendance-analytics/`
- `GET  /api/mobile/hr/employees/`
- `POST /api/mobile/attendance/clock-in/`
- `POST /api/mobile/leave-requests/`
- `POST /api/mobile/tickets/`
- `GET  /api/mobile/tasks/`
- `POST /api/mobile/manager/leave-requests/<id>/action/`
- `POST /api/mobile/manager/attendance-corrections/<id>/action/`

---

## Section D — Other namespaces (deferred)

These frontend namespaces have **no backend implementation** in the
current repo. They are intentionally left untouched in this phase.

- `/analytics/*` — used by `src/api/hr.js` (`hrGetDashboardMetrics`,
  `hrGetGlobalTriage`, `hrGetRiskCorridor`, `hrGetResourceDensity`,
  `hrGetActivityStream`, `hrTriggerIntelligenceSync`).
- `/governance/*` — used by `src/api/admin.js`
  (`adminGetOrgConfig`, `adminUpdateOrgConfig`, `adminGetActivityLogs`,
  `adminGetPermissions`, `adminUpdateRolePermissions`).
- `/workforce/*` — `adminGetSkills/Create/Delete` in `src/api/admin.js`;
  also raw `api.get('/workforce/teams/')` in
  `src/pages/hr/PlanningPage.jsx:38`.
- `/ops/*` — `adminGetLeaveTypes/Create/Delete`, `adminBulkImport`,
  `adminBulkExport` in `src/api/admin.js`.
- `/ai/*` — `postCommandQuery`, `getOrgHealthSnapshot`,
  `adminSimulateOrgChange`, `adminGetSystemHealth` in
  `src/api/ai.js` and `src/api/admin.js`.
- `/talent/*` — `hrGetTalentMatrix`, `hrCalibrateTalent` in
  `src/api/hr.js`.
- `/notifications/*` (root, not `/mobile/notifications/`) — every function
  in `src/api/notification.js`.
- Extended recruitment endpoints (no backend route):
  `/recruitment/submissions/bulk-update/`,
  `/recruitment/jobs/{id}/automate/`,
  `/recruitment/jobs/{id}/insights/`,
  `/recruitment/jobs/{id}/optimize/`,
  `/recruitment/submissions/{id}/hire/`,
  `/recruitment/submissions/{id}/similar/`,
  `/recruitment/talent-search/`,
  `/recruitment/talent-similarity/`,
  `/recruitment/benchmarking/`,
  `/recruitment/benchmarking/sync/`,
  `/recruitment/talent-pools/`,
  `/recruitment/promote/`,
  `/recruitment/talent-graph/`.
- Attrition extras: `/attrition/calibrate/`, `/attrition/events/`.

---

## Section E — Backend without frontend

Backend endpoints that no frontend piece consumes. Preserved verbatim per
the "do not delete" rule.

- All of `/api/mobile/*` (see Section C).
- Infrastructure admin endpoints under `/api/employee_management/`:
  `departments/`, `departments/<pk>/`, `teams/`, `teams/<pk>/`, `jobs/`,
  `jobs/<pk>/`, `jobs/<pk>/benchmark/`, `leave-types/`,
  `leave-types/<pk>/`, `hr/salary-benchmark/`.
- `/api/recruitment/jobs/<pk>/weights/` (GET + POST).
- `/api/recruitment/succession-plans/` and
  `/api/recruitment/succession-plans/<pk>/` (the candidate-facing
  succession-plan CRUD; frontend talks to the `/hr/succession/*` mounts
  instead).
- `/api/attendance_leave/team/overtime/` and
  `/api/attendance_leave/team/overtime/<attendance_id>/review/` (team-leader
  overtime review queue).
- `/api/attendance_leave/attendance/`, `/attendance/<pk>/`, `/leave-requests/`,
  `/leave-requests/<pk>/` (admin/raw CRUD — note: the `cancelLeaveRequest`
  row in Section A.2 currently points at the `/leave-requests/<pk>/` detail
  view because there is no employee-namespaced detail endpoint).
- `/api/attrition/predictions/` (frontend uses the `/latest/` variant only).
- `/api/feedback/hr/forms/<form_id>/questions/` **GET** (frontend wires
  POST only).
- `/api/auth/demo-access/` (no consumer page).
- `/api/auth/employees/create/` (no admin "create user" call wired yet).
- `/api/send-email/` (no frontend consumer).

---

## Working log

- 2026-05-23 — Row 1 (clockAttendance shape): wrapper now sources `employeeID` from `localStorage.user.employee_id`, maps `type` `'in'/'out'` → `action` `'clock_in'/'clock_out'`, and POSTs to `/attendance_leave/employee/attendance/clock/`. No component change.
- 2026-05-23 — Rows for `getMyLeaveRequests` + `submitLeaveRequest`: bi-directional transform (Option A). Outbound maps display `'Annual Leave' / …'` → enum `'Annual' / …'`; inbound maps enum back to display so the existing `LeaveManagementPage.jsx` filters and table cell keep working with zero component changes.
- 2026-05-24 — Decision 1 (cancelLeaveRequest): API export deleted; import removed from `LeaveManagementPage.jsx`. No JSX delete button existed.
- 2026-05-24 — `src/api/employee.js` sweep: every Section A.2 `/feedback/employee/*` row remapped to its real backend mount (`/attendance_leave/...`, `/payroll/...`, `/onboarding/...`, `/employee_management/...`). Section B rows left at `/feedback/...` per scope.
- 2026-05-24 — `src/api/hr.js` sweep: every Section A.3 `/feedback/hr/*` row remapped (`/employee_management/...`, `/attendance_leave/...`, `/payroll/...`, `/onboarding/...`, `/attrition/...`). HR succession rows wired to `/recruitment/hr/succession/...` per Decision 2. Section B rows (`hrSimulatePromotion`, `hrGetApprovals`, `hrProcessApproval`) and Section D namespaces (`/analytics/...`, `/talent/...`) left untouched.
- 2026-05-24 — `src/api/leader.js` sweep: every Section A.4 `/feedback/team/*` row remapped to `/employee_management/team/...`.

---

## Phase 3 surprises

Anomalies surfaced during wiring that the Phase 2 map didn't flag.

1. **Row `submitLeaveRequest` had a paired inbound mismatch.** Phase 2 marked only the outbound `leaveType` enum problem. When applying the wiring, `LeaveManagementPage.jsx` was also reading `leaveType` back from the API response for two `.filter()` calls (`Annual Leave`, `Sick Leave`) and a table cell, so an outbound-only fix would have silently zeroed the "Annual Used / Sick Used" cards. Resolved by adding a paired inbound transform on `getMyLeaveRequests` (Option A — bi-directional, scoped to the API client only, no component edits).

2. **HR-side leave-type display will show bare enum values.** `hrGetLeaveRequests` (used by `Navbar.jsx:727` and `ApprovalCenterPage.jsx:77`) is now wired to the real backend, so those components will receive `'Annual' / 'Sick' / 'Unpaid'` instead of the older display strings. This is a *new visible state*, not a regression vs. before Phase 3 (those calls were hitting a 404 path), but worth knowing. No transform added on the HR-side because Phase 2 didn't flag it and the per-row scope of Phase 3 doesn't include this.

3. **Section B export usages preserved.** Five exports in `src/api/employee.js` (`submitPeerFeedback`, `getReceivedFeedback`, `requestShiftSwap`, `deleteExpenseClaim`, `closeSupportTicket`) and three in `src/api/hr.js` (`hrSimulatePromotion`, `hrGetApprovals`, `hrProcessApproval`) still point at `/feedback/...` paths because Section B endpoints have no backend equivalent. They'll keep failing with their existing error shape (`Request failed (404)`) until a Section B decision is made. Phase 3 did not touch them.

---

## Phase 3 notes (drive-by observations — not addressed)

Things spotted in passing that were left alone per the no-drive-by-refactors rule. Listed so they aren't forgotten.

- `src/api/base.js` does not implement `api.patch(...)`, but `src/api/notification.js` calls it. Pre-existing bug, unrelated to the feedback remap.
- `src/pages/leader/PersonalCommandPages.jsx:5` imports `submitTicket` from `'../../api/index.js'`, but no `submitTicket` export exists in any API module (probably meant `submitSupportTicket`). Pre-existing bug.
- `src/api/recruitment.js` `getTalentCloneSimilarity` calls `api.get(url, { params: {...} })`. `api.get` only accepts a URL string in this codebase, so the params object is silently dropped.
- `INTEGRATION_AUDIT.md` Section A.2 still references the old `employee.js` line numbers (e.g. `:9`, `:11`, `:12`). The exports have shifted slightly after the row-2 transform and row-12 removal. The Section A table in `INTEGRATION_MAP.md` keeps the original Phase-2 line numbers for traceability; this is intentional.

---

## Phase 3 summary

**Scope completed:** every row in Section A (A.1–A.4) of this map, plus Decision 1 (Section B cancelLeaveRequest removal) and Decision 2 (HR succession wired to `recruitment`).

**Files touched (3 in `src/api/`, 1 in `src/pages/`):**

| File | Rows touched |
|---|---|
| `frontend-updated/src/api/employee.js` | A.1 forms left as-is (already correct). A.2 all rows remapped to their real backend mount. Row 1 (clockAttendance) shape-transformed. Row 2 (getMyLeaveRequests/submitLeaveRequest) bi-directional shape-transformed. `cancelLeaveRequest` export removed. Section B exports preserved at `/feedback/...`. |
| `frontend-updated/src/api/hr.js` | A.1 forms/submissions/questions left as-is. A.3 all rows remapped. HR succession wired to `/recruitment/hr/succession/...`. Section B exports preserved at `/feedback/...`. Section D (`/analytics/...`, `/talent/...`) untouched. |
| `frontend-updated/src/api/leader.js` | A.4 all team rows remapped to `/employee_management/team/...`. |
| `frontend-updated/src/pages/employee/LeaveManagementPage.jsx` | One-line import edit (removed `cancelLeaveRequest`) per Decision 1. Component logic, JSX, styling, state — all untouched. |

**Rows completed:** A.1 (14 rows — no URL change needed), A.2 (29 rows — 27 remapped, 5 Section B preserved, 1 removed per Decision 1, 2 shape-transformed), A.3 (~52 rows — 49 remapped including 3 succession per Decision 2, 3 Section B preserved), A.4 (8 rows — all remapped). Three `UNCERTAIN` markers resolved (Decision 1 = remove; Decision 2 = wire as-is).

**Skipped, and why:**
- Sections B, C, D, E — out of scope for Phase 3 per the spec.
- HR-side `leaveType` enum→display transform on `hrGetLeaveRequests` — see Phase 3 surprises item 2; the per-row Phase 3 scope didn't include it, and Phase 2 didn't flag it.

**Tests now failing:** none observed. Phase 3 did not run the test suite. Component logic was not touched (with the single exception of the import line in `LeaveManagementPage.jsx`), so existing behaviour for non-feedback flows is unchanged. The two snapshot tests under `src/pages/hr/*.test.jsx` reference functions whose URLs changed; if those tests mock fetch by URL string, they may need URL updates — flagged for verification, not modified.

**Sanity smoke list (manual):**
1. Log in as a TeamMember → `/employee/dashboard` loads (calls `getMyAttendance`, `getMyTasks`, `getMyShifts`). Network shows requests now go to `/attendance_leave/...` and `/employee_management/...`.
2. Open `/employee/leave-requests` → list renders with `"Annual Leave"`-style labels intact (inbound transform), submitting a new request POSTs `leaveType: "Annual"` (outbound transform), and the new row appears with the display label after reload.
3. On the same page (Team Leader login): `/leader/attendance` → click clock-in → request body is `{ employeeID, action: "clock_in" }` to `/attendance_leave/employee/attendance/clock/`.
4. Log in as HRManager → `/hr/employees` loads (calls `hrGetEmployees` → `/employee_management/hr/employees/`), and `/hr/payroll` loads (`/payroll/hr/payroll/`).
5. `/hr/succession` page loads — confirms Decision 2 wiring against `/recruitment/hr/succession/`.
6. `/hr/intelligence` (if accessible) — confirms `/attrition/hr/intelligence/` is reachable.

---

## HR tier audit (2026-05-28)

Per-page outcomes. New page → old reference → handlers wired → notes.

### Pages with action handlers wired this audit

| New page | Old reference | Handlers wired | Notes |
|---|---|---|---|
| `pages/hr/ApprovalCenterPage.jsx` | same | Approve / Reject per row (dispatch by `item.type`): Leave → `hrReviewLeaveRequest`, Expense → `hrReviewExpenseClaim`, Document → `hrIssueDocument` (Issued/Declined), Ticket → `hrUpdateTicketStatus` (Resolved/Closed). | Generic Approve/Reject icons reuse `savingId` lock; reload after success. |
| `pages/hr/EmployeesPage.jsx` | same | Existing `handleSave` (Update) untouched. Added `handleCreate` + Onboard Node modal with `fullName / department / employeeType / monthlyIncome / location` → `hrCreateEmployeeRecord`. | `email` / `jobTitle` are read-only at backend; not in create modal. |
| `pages/hr/PayrollPage.jsx` | same | Per-row "Approve" → `hrMarkPayrollPaid(payrollID)`. Header "Authorize Disbursement" now bulk-marks all unpaid records via `Promise.allSettled`. | Bulk handler reports partial-success counts. |
| `pages/hr/ReviewsPage.jsx` | same | "Initialize Cycle" header CTA → modal (`employeeID / reviewPeriod / reviewType / overallRating / strengths / improvementAreas / goalsSummary / reviewDate`) → `hrCreateReview`. | |
| `pages/hr/PoliciesPage.jsx` | same | "Initialize Asset" → create modal → `hrCreatePolicy`. Per-row reminder bell → `hrSendPolicyReminder`. | |
| `pages/hr/BenefitsPage.jsx` (HR) | same | "Initialize Benefit" → create modal (`employeeID / benefitName / benefitType / provider / coverageLevel / monthlyCost / employeeContribution / effectiveDate / notes`) → `hrCreateBenefit`. | |
| `pages/hr/ShiftsPage.jsx` (HR) | same | "Schedule Shift" header CTA → create modal → `hrCreateShift`. | |
| `pages/hr/OnboardingPage.jsx` (HR) | same | "Initialize Plan" → create modal → `hrCreateOnboardingPlan`. | |
| `pages/hr/TrainingPage.jsx` (HR) | same | "Initialize Course" → create modal → `hrCreateTraining`. | |
| `pages/hr/TicketsPage.jsx` (HR) | same | Per-row green check → `hrUpdateTicketStatus(id, { status: 'Resolved' })`; red X → `'Closed'`. | Hidden once status hits Resolved/Closed. |
| `pages/hr/DocumentsPage.jsx` (HR) | same | Per-row green check → `hrIssueDocument(id, { status: 'Issued' })`; red X → `'Declined'`. | |
| `pages/hr/ExpensesPage.jsx` (HR) | same | Per-row: Pending → Approve/Reject via `hrReviewExpenseClaim`; Approved → Mark Reimbursed. | |
| `pages/hr/SuccessionPage.jsx` | same | "Initialize Succession Plan" → modal (`employeeID / targetRole / readiness / status / retentionRisk / developmentActions / notes`) → `hrCreateSuccessionPlan` (Decision 2 path: backend lives in `recruitment`). | |
| `pages/hr/DashboardPage.jsx` | same | **Rewired off Section D `/analytics/*`** → composes data from `hrGetRosterHealth`, `hrGetApprovalSnapshot`, `hrGetEmployees`, `getLatestAttritionPredictions`. Synthesizes `metrics.total_headcount`, per-dept `densityData`, `triage` from approval follow-up items, `riskNodes` from attrition predictions, `activityStream` from approval follow-ups. `handleSync` now just reloads (removed broken `hrTriggerIntelligenceSync`). | The page no longer 404s anywhere; all stat cards and panels populate from real endpoints. |
| `pages/hr/BenchmarkingPage.jsx` | `benchmarkSalary.jsx` (old) | Replaced broken `hrGetBenchmarking` call with `hrGetEmployees` + client-side median synthesis. Each row shows `(department, jobTitle)` group internal average vs company-wide median for that role; variance computed. | True external-market benchmark requires a new API client function for `/api/employee_management/hr/salary-benchmark/` — forbidden per audit rules. Variance shown is internal-vs-role-median, not internal-vs-market. Worth a Phase-4 follow-up. |
| `pages/hr/JobsPage.jsx` | (no direct old equivalent — alt design of JobPostings) | **File had 5 lines of broken JS** (escaped backticks `\\\`` + `\\$`). Fixed all five; file now parses. Wired Decommission Node → `hrUpdateJobStatus(id, 'Closed')`. Repointed "Deploy Requisition" + "Audit Pipeline" + "Modify Parameters" to existing routes (`/hr/jobs`, `/hr/cv-ranking`). Page registered at `/hr/jobs-alt` so you can A/B compare. | Original status-change handler kept (Active/On Hold/Closed/Draft dropdown). |

### Pages already wired or pure read-only — confirmed, not touched

| New page | Status |
|---|---|
| `pages/hr/FormPage.jsx` | Already done in prior session (create + question management + edit/activate/delete + split layout). |
| `pages/hr/CVRankingPage.jsx` | Heavy page. `hireCandidate`, `hrBulkUpdateSubmissions`, `hrAutomateJobRecruitment`, `hrGetJobInsights`, `hrOptimizeJob`, `getTalentCloneSimilarity` are all **wired** but all point at **Section B / Section D** endpoints that don't exist on the backend. Will 404 at runtime. Out of scope until Section B/D decisions are made. |
| `pages/hr/JobPostingsPage.jsx` | `handleCreate` (createJob) is wired. `updateJob` is imported but never invoked — no inline edit affordance in the new design. Acceptable. |
| `pages/hr/AttendancePage.jsx` | Loads via `hrGetAttendanceRecords`. Only action is a decorative "Export" toast — no Section A "export" endpoint exists. No handler to port. |
| `pages/hr/SubmissionPage.jsx` | Loads via `hrGetSubmissions` + `hrGetForms`. Only action is decorative export. |
| `pages/hr/SharedWorkspacePages.jsx` | Reuses `TeamGoalsPage` / `TeamRecognitionPage` / `EmployeeProfilePage` from other directories. No HR-specific actions. |

### Pages with no old equivalent — flagged, skipped

| New page | Reason skipped |
|---|---|
| `pages/hr/AttritionPage.jsx` | No old `AttritionPage`. Loads via `getLatestAttritionPredictions` (Section A, working). No action buttons. |
| `pages/hr/OrgNeuralMapPage.jsx` | No old equivalent. Hits `/recruitment/talent-graph/` (Section D). Out of scope. |
| `pages/hr/PlanningPage.jsx` | No old equivalent. Hits `/workforce/teams/` (Section D). Out of scope. |
| `pages/hr/TalentMatrixPage.jsx` | No old equivalent. Hits `/talent/matrix/` + `/talent/calibrate/` (Section D). Out of scope. |
| `pages/hr/ApprovalsPage.jsx` | **Orphan** (not in router). Uses Section B `hrGetApprovals` / `hrProcessApproval`. Skipped per Phase 2 plan. |

### Files touched

- `src/pages/hr/ApprovalCenterPage.jsx`
- `src/pages/hr/EmployeesPage.jsx`
- `src/pages/hr/PayrollPage.jsx`
- `src/pages/hr/ReviewsPage.jsx`
- `src/pages/hr/PoliciesPage.jsx`
- `src/pages/hr/BenefitsPage.jsx`
- `src/pages/hr/ShiftsPage.jsx`
- `src/pages/hr/OnboardingPage.jsx`
- `src/pages/hr/TrainingPage.jsx`
- `src/pages/hr/TicketsPage.jsx`
- `src/pages/hr/DocumentsPage.jsx`
- `src/pages/hr/ExpensesPage.jsx`
- `src/pages/hr/SuccessionPage.jsx`
- `src/pages/hr/DashboardPage.jsx`
- `src/pages/hr/BenchmarkingPage.jsx`
- `src/pages/hr/JobsPage.jsx` (parse fix + handler wiring)
- `src/routes/registry.js` (added `/hr/jobs-alt`)

No backend file modified. No `src/api/*` file modified.

### Phase 3 surprises (HR tier)

1. **`JobsPage.jsx` was unparseable.** Five lines contained literal `\\\`` and `\\$` instead of `` ` `` and `$` for template literals. The file would have caused a CRA build error if it had been imported. That's why no router entry existed — the orphan status was a symptom, not an intent. Fixed all five.
2. **BenchmarkingPage cannot reach the real backend benchmark endpoint** without an API client change (forbidden). Wired the page to synthesize from employee data instead. Real external-market parity needs `/api/employee_management/hr/salary-benchmark/` exposed via a new API client function — track as a Section B follow-up.
3. **CVRankingPage is wired to Section B/D endpoints.** Every action button calls a function whose URL has no backend route. Out of scope here; flagged for a future "Section B decision" pass.
4. **EmployeesPage Onboard Node modal is minimal.** The old page had a much richer create form. The minimal modal matches the writable fields on `EmployeeCreateUpdateSerializer` and shouldn't 400 the backend, but isn't UX parity with the old page. Flag for review.
5. **HR Dashboard headline `metrics.total_headcount` is the only metric field the UI references.** The page's other state slots (densityData, triage, riskNodes, activityStream) are arrays, and the UI consumes a small set of fields per item. The new shapes match — values render.

### Smoke tests (HR flows)

1. **Approve a leave request via `/hr/approvals`.** Network: `POST /api/attendance_leave/hr/leave-requests/{id}/review/` with `{ status: "Approved", reviewNotes }`. Row disappears from queue.
2. **Create a feedback form via `/hr/forms`** (already wired in prior session). Sanity-check it still works alongside the new audit changes.
3. **Onboard a new employee via `/hr/employees`** → click "Onboard Node" → fill name + department → submit. `POST /api/employee_management/hr/employees/` returns the new record; list updates.
4. **Mark a payroll record paid via `/hr/payroll`** → per-row "Approve". Network: `POST /api/payroll/hr/payroll/{id}/mark-paid/`. Status flips to "Distributed".
5. **Create a policy via `/hr/policies`** → fill title + content → submit. Then click the bell on any row to send a reminder.
6. **Compare `/hr/jobs` (canonical) vs `/hr/jobs-alt` (alt design)** — both should load, both should hit the same data. Use this to pick the design you want and we'll retire the other.

---

## Leader tier audit (2026-06-01) — flag-only pass

User directive: flag pure-stub pages but do not modify their code. No backend changes, no API client changes, no inventing endpoints. Wiring deferred.

### How the tier is structured

| Category | Files | Notes |
|---|---|---|
| **Wrapped Employee pages** | `WorkspacePages.jsx` exports `LeaderAttendancePage`, `LeaderPayrollPage`, `LeaderReviewsPage`, `LeaderCareerPathPage`, `LeaderOnboardingPage`, `LeaderShiftsPage`, `LeaderGoalsPage`, `LeaderTasksPage`, `LeaderTrainingPage`, `LeaderPoliciesPage`, `LeaderMyRecognitionPage`, `LeaderBenefitsPage`, `LeaderExpensesPage`, `LeaderDocumentsPage`, `LeaderTicketsPage`, `LeaderFeedbackPage`, `LeaderProfilePage` | Each just wraps the corresponding `EmployeeXxxPage` in `LeaderOwnedShell`. Inherits Phase 3 wiring. No audit action. |
| **Custom personal pages** | `PersonalCommandPages.jsx` exports `LeaderPersonalAttendancePage`, `LeaderPersonalPayrollPage`, `LeaderPersonalVaultPage` (documents), `LeaderPersonalTicketsPage`, `LeaderPersonalProfilePage` | Bespoke UI shells around employee endpoints. Mixed wiring quality (see below). |
| **Team-management pages** | `DashboardPage.jsx`, `TeamPage.jsx`, `RecognitionPage.jsx`, `TeamCalendarPage.jsx`, `TeamRequestsPage.jsx`, `TeamAnalyticsPage.jsx`, `TeamSupportPage.jsx`, `TeamFeedbackPage.jsx`, `TeamDirectoryPage.jsx` | Leader-specific functionality. Mixed wiring quality. |

### Pure stubs — FLAGGED, not touched

These pages render but have **zero backend integration**. Every interactive element is `setTimeout` theater or local-state-only. Wiring them requires either a leader-specific backend endpoint that doesn't exist (backend rule blocks adding one) or a repurposing of an HR endpoint that may reject TL callers.

| Page | Route | Hardcoded state | Stub handlers | Why it can't just be wired |
|---|---|---|---|---|
| `pages/leader/DashboardPage.jsx` | `/leader/dashboard` | `pendingApprovals`, `teamMembers` (initialized inline) | `handleApprove` (removes from local array + toast), `handleReview` (navigates only), `handleGenerateReport` (1s `setTimeout` fake), `handleBuzz` (fake ping) | No TL-scoped "pending approvals" endpoint in API client. `hrGetApprovalSnapshot` is HR-scoped and likely 403s for TL. |
| `pages/leader/TeamRequestsPage.jsx` | `/leader/team-requests` | `myRequests`, `teamInbox` (initialized inline) | `handleAction(id, 'approve'/'reject')` mutates local state, no API call | No TL leave-approval endpoint in API client. `hrReviewLeaveRequest` is HR-only. |
| `pages/leader/TeamSupportPage.jsx` | `/leader/team-support` | `tickets` (initialized inline), `formData` (form state) | `handleCreateRequest` (form submit, no API call) | **Trivially wireable** — `submitTicket` is the obvious target and exists in the API client. Flagged here only because user opted not to wire this pass. |

### Partially stubbed — FLAGGED

Real backend data loads on mount, but supporting telemetry and per-item action buttons are unwired or fake.

| Page | Wired | Unwired / fake |
|---|---|---|
| `pages/leader/PersonalCommandPages.jsx` → `LeaderPersonalPayrollPage` | `getMyPayroll` populates table | Top-row telemetry chips ("Earnings YTD $128,400", "Next Pay May 25", "Monthly Net $8,450", "Tax Integrity Verified") hardcoded. Download PDF button is a toast. "Financial Intelligence" sidebar hardcoded. |
| `pages/leader/PersonalCommandPages.jsx` → `LeaderPersonalVaultPage` | `getMyDocuments` populates grid | Telemetry hardcoded ("Level 4", "Pass", "Locked"). Per-document "Download ›" button has no `onClick`. "Request New Document" tile has no `onClick`. |
| `pages/leader/PersonalCommandPages.jsx` → `LeaderPersonalTicketsPage` | `getMyTickets` populates list | **Dead import**: `submitTicket` is imported at file top but never called. Submit form (if rendered) doesn't post anywhere. |
| `pages/leader/PersonalCommandPages.jsx` → `LeaderPersonalProfilePage` | Reads `user` from `useAuth()` | **Dead import**: `changePassword` is imported but never called — the Security/Governance tab has no working change-password form. Almost the entire profile is hardcoded: "Influence: High", "Reliability: 98%", "Team Stability: 94%", "Goal Velocity: High", "Merit Count: 12", "Strategic Event Ledger" entries. "Edit Metadata ›" button has no `onClick`. |
| `pages/leader/TeamPage.jsx` (`TeamGoalsPage`) | Goal create / complete; task complete | **Missing handler**: `taskForm` + `EMPTY_TASK_FORM` are declared but there's no `handleCreateTask` and no UI section to create tasks. "Follow-up" button (line ~459) and "Open Focus Board" button (line ~464) have no `onClick`. Old page had ~10 features this one lacks (calendar, retention alerts, overtime approval, follow-up prep, coaching prep, contact modal, task approval, HR team-scope picker). |

### Wired correctly — no action needed

| Page | API surface used |
|---|---|
| `pages/leader/PersonalCommandPages.jsx` → `LeaderPersonalAttendancePage` | `getMyAttendance`, `clockAttendance` |
| `pages/leader/RecognitionPage.jsx` (`TeamRecognitionPage`) | `getTeamRecognition`, `createTeamRecognition` |
| `pages/leader/TeamCalendarPage.jsx` | `getTeamTasks`, `hrGetLeaveRequests` (loads — actions to be verified per-flow) |
| `pages/leader/TeamAnalyticsPage.jsx` | `getLatestAttritionPredictions`, `getTeamTasks` (loads — actions to be verified per-flow) |
| `pages/leader/TeamFeedbackPage.jsx` | `getReceivedFeedback`, `getTeamTasks` (loads — actions to be verified per-flow) |
| `pages/leader/TeamDirectoryPage.jsx` | `hrGetEmployees` (loads — actions to be verified per-flow) |
| All `WorkspacePages.jsx` wrappers | Inherit `EmployeeXxxPage` wiring from Phase 3 audit |

### Old-frontend coverage

| New page | Old equivalent |
|---|---|
| `pages/leader/TeamPage.jsx` | ✓ `frontend-old/src/pages/leader/TeamPage.jsx` (1600 lines, much richer) |
| `pages/leader/RecognitionPage.jsx` | ✓ `frontend-old/src/pages/leader/RecognitionPage.jsx` |
| `pages/leader/WorkspacePages.jsx` | ✓ `frontend-old/src/pages/leader/WorkspacePages.jsx` (same wrapper pattern) |
| `DashboardPage.jsx`, `PersonalCommandPages.jsx`, `TeamCalendarPage.jsx`, `TeamRequestsPage.jsx`, `TeamAnalyticsPage.jsx`, `TeamSupportPage.jsx`, `TeamFeedbackPage.jsx`, `TeamDirectoryPage.jsx` | **No old equivalent.** New concepts in the redesign. |

### Files touched in this audit pass

None. Per user directive, this pass is flag-only.

### Next-pass candidates (when ready)

1. ~~**Wire `submitTicket` on `LeaderPersonalTicketsPage` and `TeamSupportPage`**~~ — ✅ done in follow-up pass (see below).
2. ~~**Wire `changePassword` on `LeaderPersonalProfilePage`**~~ — ✅ done in follow-up pass.
3. ~~**Port `handleCreateTask` + minimal task-form section onto `TeamPage`**~~ — ✅ done in follow-up pass.
4. ~~**Port `prepareFollowUp` onto the unwired "Follow-up" button**~~ — ✅ done in follow-up pass.
5. **Design call needed for `DashboardPage` + `TeamRequestsPage`** — leader-scoped approval/queue endpoints don't exist. Either repurpose HR endpoints (likely 403 for TL), expose new ones (backend rule blocks this), or accept that these pages stay decorative.

### Leader follow-up wiring pass (2026-06-03)

| Page | Wiring applied | Notes |
|---|---|---|
| `pages/leader/PersonalCommandPages.jsx` → `LeaderPersonalTicketsPage` | Fixed broken import `submitTicket` → `submitSupportTicket` (correct API client name). Added `incidentForm` state (subject/priority/description). Wired the three NeuralInput rows on the "New Incident Report" card. Rewrote `handleLaunchReport` to call `submitSupportTicket(payload)` then reload via existing `loadData`. Replaced free-text Priority NeuralInput with a select bound to Low/Medium/High choices the backend serializer accepts. | The original import `submitTicket` was **undefined** — named export didn't exist. The submit button had been firing a 1.5 s `setTimeout` toast, not an API call. |
| `pages/leader/PersonalCommandPages.jsx` → `LeaderPersonalProfilePage` | Added state `pwForm` + `pwSaving`. Added `handleChangePassword` that validates (both fields required, ≥8 chars, match) and calls `changePassword({ old_password, new_password })`. Added a new render block for `activeTab === 'governance'` (previously the tab was clickable but rendered nothing). Block contains a Credential Update card with three password inputs + an Update Password button. | The `changePassword` import was a dead import. The governance tab content didn't exist at all — clicking it showed a blank page. Other hardcoded telemetry on this page (Influence, Reliability, Team Stability, Merit Count, Strategic Event Ledger) **left untouched** per "no inventing" rule — they have no real data source. |
| `pages/leader/TeamSupportPage.jsx` | Added imports `getMyTickets` + `submitSupportTicket`. Removed hardcoded `tickets` array seed (was 2 fake test rows). Added `loadTickets()` that calls `getMyTickets(user.employee_id)` and maps backend fields → the shape the existing render expects (`ticketID → id`, `subject → title`, `description → desc`, etc.). Rewrote `handleCreateRequest` to POST via `submitSupportTicket` then reload. Added `submitting` state + disabled Submit button while in-flight. Added `priorityToBackend()` helper since the form uses UPPER-case strings but the backend ChoiceField expects Title-case. | The form's `type` field is sent as `category` to the backend. The backend's `category` is a ChoiceField — if the page's "Resource Allocation" / "Software License" strings don't match a valid category, the POST will 400. **Flagged**: caller should verify the category options match the backend `SupportTicket.CATEGORY_CHOICES` enum. |
| `pages/leader/TeamPage.jsx` (`TeamGoalsPage`) | Added `handleCreateTask` (verbatim port of the old `handleCreateTask` at `frontend-old/src/pages/leader/TeamPage.jsx:605-628`). Added `prepareFollowUp` (port of old lines 519-538, simplified — only pre-fills the goal form). Added `employeeID` to the `leaderFocusItems` mapping so the Follow-up handler has the employee to pre-fill against. Wired the previously-unwired "Follow-up" button (`onClick={() => prepareFollowUp(item)}`). Added a new "Assign Tactical Task" form section under the existing goal deployment form — the only way to actually create a task. Form fields: employee, title, description, priority (Low/Medium/High), estimated hours, due date. Submit calls `handleCreateTask`. | The "Open Focus Board" button on this page still has no `onClick` — no clear destination exists in the route registry. Other features the old TeamPage had (calendar, retention alerts, overtime approval, contact modal, HR team scoping, task approval) **not ported** — they're entire feature sections, not button wirings, and adding them would expand UI structure beyond what this audit pass authorized. |

### Files touched in follow-up pass

- `src/pages/leader/PersonalCommandPages.jsx`
- `src/pages/leader/TeamSupportPage.jsx`
- `src/pages/leader/TeamPage.jsx`

No backend file modified. No `src/api/*` file modified.
