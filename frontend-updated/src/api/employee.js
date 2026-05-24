import { api, toList } from './base';

export const getForms           = async (employeeID) => toList(await api.get(`/feedback/forms/?employee_id=${employeeID}`));
export const submitFeedback     = (formID, data) => api.post(`/feedback/forms/${formID}/submit/`, data);
export const submitPeerFeedback = (data) => api.post('/feedback/employee/peer-feedback/', data);
export const getReceivedFeedback = async (employeeID) => toList(await api.get(`/feedback/employee/received-feedback/?employee_id=${employeeID}`));

export const getMyAttendance = async (employeeID) => toList(await api.get(`/attendance_leave/employee/attendance/?employee_id=${employeeID}`));
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
export const submitLeaveRequest = (data) => {
  const leaveType = LEAVE_TYPE_DISPLAY_TO_ENUM[data?.leaveType] || data?.leaveType;
  return api.post('/attendance_leave/employee/leave-requests/', { ...data, leaveType });
};

export const getMyPayroll = async (employeeID) => toList(await api.get(`/payroll/employee/payroll/${employeeID ? `?employee_id=${employeeID}` : ''}`));

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

export const getMyGoals = async (employeeID) => toList(await api.get(`/employee_management/employee/goals/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyGoalProgress = (id, data) => api.post(`/employee_management/employee/goals/${id}/progress/`, data);

export const getMyTasks = async (employeeID) => toList(await api.get(`/employee_management/employee/tasks/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyTaskProgress = (id, data) => api.post(`/employee_management/employee/tasks/${id}/progress/`, data);

export const getMyRecognition = async (employeeID) => toList(await api.get(`/employee_management/employee/recognition/${employeeID ? `?employee_id=${employeeID}` : ''}`));

export const getMyTraining = async (employeeID) => toList(await api.get(`/employee_management/employee/training/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyTrainingProgress = (id, data) => api.post(`/employee_management/employee/training/${id}/progress/`, data);
