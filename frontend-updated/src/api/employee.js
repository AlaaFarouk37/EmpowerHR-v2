import { api, toList } from './base';

export const getForms           = async (employeeID) => toList(await api.get(`/feedback/forms/?employee_id=${employeeID}`));
export const submitFeedback     = (formID, data) => api.post(`/feedback/forms/${formID}/submit/`, data);
export const submitPeerFeedback = (data) => api.post('/feedback/employee/peer-feedback/', data);
export const getReceivedFeedback = async (employeeID) => toList(await api.get(`/feedback/employee/received-feedback/?employee_id=${employeeID}`));

export const getMyAttendance = async (employeeID) => toList(await api.get(`/attendance_leave/employee/attendance/?employee_id=${employeeID}`));
export const getMyTimeCorrections = async (employeeID) => toList(await api.get(`/attendance_leave/employee/time-corrections/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const submitTimeCorrection = (data) => api.post('/attendance_leave/employee/time-corrections/', data);
export const clockAttendance = (data = {}) => {
  const TYPE_TO_ACTION = { in: 'clock_in', out: 'clock_out' };

  let employeeID = data.employeeID;
  if (!employeeID) {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || 'null');
      employeeID = stored?.employee_id || null;
    } catch {
      employeeID = null;
    }
  }

  const action = data.action || TYPE_TO_ACTION[data.type] || data.type;

  const body = { employeeID, action };
  if (data.notes !== undefined) body.notes = data.notes;

  return api.post('/attendance_leave/employee/attendance/clock/', body);
};
const LEAVE_TYPE_DISPLAY_TO_ENUM = { 'Annual Leave': 'Annual', 'Sick Leave': 'Sick', 'Unpaid Leave': 'Unpaid' };
const LEAVE_TYPE_ENUM_TO_DISPLAY = { Annual: 'Annual Leave', Sick: 'Sick Leave', Unpaid: 'Unpaid Leave' };
export const getMyLeaveRequests = async (employeeID) => {
  const items = toList(await api.get(`/attendance_leave/employee/leave-requests/?employee_id=${employeeID}`));
  return items.map((item) => ({ ...item, leaveType: LEAVE_TYPE_ENUM_TO_DISPLAY[item?.leaveType] || item?.leaveType }));
};
// Per-type balances (also the source of truth for the leave-type dropdown).
export const getMyLeaveBalances = async (employeeID, year) =>
  toList(await api.get(`/attendance_leave/employee/leave-balances/?employee_id=${employeeID}${year ? `&year=${year}` : ''}`));
export const submitLeaveRequest = (data) => {
  const leaveType = LEAVE_TYPE_DISPLAY_TO_ENUM[data?.leaveType] || data?.leaveType;
  const { document, ...rest } = data;
  // Send multipart only when a supporting document is attached.
  if (document) {
    const form = new FormData();
    Object.entries({ ...rest, leaveType }).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v);
    });
    form.append('document', document);
    return api.postForm('/attendance_leave/employee/leave-requests/', form);
  }
  return api.post('/attendance_leave/employee/leave-requests/', { ...rest, leaveType });
};

export const getMyPayroll = async (employeeID) => toList(await api.get(`/payroll/employee/payroll/${employeeID ? `?employee_id=${employeeID}` : ''}`));

// The requesting user's own employee record (real profile data, any internal role).
export const getMyProfile = async () => api.get('/employee_management/employee/profile/');
// Self-service update of editable personal fields (fullName, phoneNumber).
export const updateMyProfile = (data) => api.patch('/employee_management/employee/profile/', data);

export const getMyReviews = async (employeeID) => toList(await api.get(`/employee_management/employee/reviews/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const acknowledgeMyReview = (id, data = {}) => api.post(`/employee_management/employee/reviews/${id}/acknowledge/`, data);

export const getMyCareerPath = async (employeeID) => toList(await api.get(`/employee_management/employee/career-path/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const acknowledgeCareerPlan = (id, data = {}) => api.post(`/employee_management/employee/career-path/${id}/acknowledge/`, data);

export const getMyOnboarding = async (employeeID) => toList(await api.get(`/onboarding/employee/onboarding/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyOnboardingProgress = (id, data) => api.post(`/onboarding/employee/onboarding/${id}/progress/`, data);

export const getMyShifts = async (employeeID) => toList(await api.get(`/employee_management/employee/shifts/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const acknowledgeMyShift = (id, data = {}) => api.post(`/employee_management/employee/shifts/${id}/acknowledge/`, data);
export const requestShiftSwap = (id, data) => api.post(`/feedback/employee/shifts/${id}/swap/`, data);

export const getMyPolicies = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/employee/policies/${query}`));
};
export const acknowledgeMyPolicy = (id, data = {}) => api.post(`/employee_management/employee/policies/${id}/acknowledge/`, data);

export const getMyBenefits = async (employeeID) => toList(await api.get(`/employee_management/employee/benefits/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyBenefitStatus = (id, data) => api.post(`/employee_management/employee/benefits/${id}/status/`, data);

export const getMyExpenses = async (employeeID) => toList(await api.get(`/employee_management/employee/expenses/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const submitExpenseClaim = (data) => api.post('/employee_management/employee/expenses/', data);
export const deleteExpenseClaim = (id) => api.delete(`/feedback/employee/expenses/${id}/`);

export const getMyDocuments = async (employeeID) => toList(await api.get(`/employee_management/employee/documents/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const submitDocumentRequest = (data) => api.post('/employee_management/employee/documents/', data);

export const getMyTickets = async (employeeID) => toList(await api.get(`/employee_management/employee/tickets/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const submitSupportTicket = (data) => api.post('/employee_management/employee/tickets/', data);
export const closeSupportTicket = (id) => api.post(`/feedback/employee/tickets/${id}/close/`, {});

// Ticket conversation thread (ticket owner or Admin)
export const getTicketDetail = (id) => api.get(`/employee_management/tickets/${id}/`);
export const postTicketMessage = (id, body) => api.post(`/employee_management/tickets/${id}/messages/`, { body });

export const getMyGoals = async (employeeID) => toList(await api.get(`/employee_management/employee/goals/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyGoalProgress = (id, data) => api.post(`/employee_management/employee/goals/${id}/progress/`, data);

export const getMyTasks = async (employeeID) => toList(await api.get(`/employee_management/employee/tasks/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyTaskProgress = (id, data) => api.post(`/employee_management/employee/tasks/${id}/progress/`, data);
export const markMyTaskDone = (id) => api.post(`/employee_management/employee/tasks/${id}/done/`, {});
export const startMyTaskLog = (id, data = {}) => api.post(`/employee_management/employee/tasks/${id}/start/`, data);
export const endMyTaskLog = (id, data = {}) => api.post(`/employee_management/employee/tasks/${id}/end/`, data);

export const getMyRecognition = async (employeeID) => toList(await api.get(`/employee_management/employee/recognition/${employeeID ? `?employee_id=${employeeID}` : ''}`));

export const getMyTraining = async (employeeID) => toList(await api.get(`/employee_management/employee/training/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyTrainingProgress = (id, data) => api.post(`/employee_management/employee/training/${id}/progress/`, data);
