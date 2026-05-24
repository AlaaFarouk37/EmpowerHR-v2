import { api, toList } from './base';

// HR Manager -- Forms
export const hrGetForms      = async ()          => toList(await api.get('/feedback/hr/forms/'));
export const hrGetFormDetail = (id)        => api.get(`/feedback/hr/forms/${id}/`);
export const hrGetFormResponseSnapshot = () => api.get('/feedback/hr/forms/response-snapshot/');
export const hrCreateForm    = (data)      => api.post('/feedback/hr/forms/', data);
export const hrUpdateForm    = (id, data)  => api.put(`/feedback/hr/forms/${id}/`, data);
export const hrDeleteForm    = (id)        => api.delete(`/feedback/hr/forms/${id}/`);
export const hrActivateForm  = (id)        => api.post(`/feedback/hr/forms/${id}/activate/`, {});
export const hrDeactivateForm= (id)        => api.post(`/feedback/hr/forms/${id}/deactivate/`, {});

// HR Manager -- Questions
export const hrAddQuestion     = (formID, data)  => api.post(`/feedback/hr/forms/${formID}/questions/`, data);
export const hrDeleteQuestion  = (qID)           => api.delete(`/feedback/hr/questions/${qID}/`);

// HR Manager -- Submissions
export const hrGetSubmissions = async (formIDOrFilters = {}) => {
  const filters = typeof formIDOrFilters === 'object' && formIDOrFilters !== null
    ? formIDOrFilters
    : (formIDOrFilters ? { form_id: formIDOrFilters } : {});

  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/feedback/hr/submissions/${query}`));
};
export const hrGetSubmissionInsights = (formID) => api.get(`/feedback/hr/submissions/insights/${formID ? `?form_id=${encodeURIComponent(formID)}` : ''}`);
export const hrGetInsights = () => api.get('/employee_management/hr/insights/');
export const hrGetIntelligence = () => api.get('/attrition/hr/intelligence/');
export const hrGetActionPlans = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/action-plans/${query}`));
};
export const hrCreateActionPlan = (data) => api.post('/employee_management/hr/action-plans/', data);
export const hrUpdateActionPlanStatus = (id, data) => api.post(`/employee_management/hr/action-plans/${id}/status/`, data);

// HR Manager -- Employee Directory
export const hrGetEmployees = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/employees/${query}`));
};
export const hrGetRosterHealth = () => api.get('/employee_management/hr/employees/roster-health/');
export const hrCreateEmployeeRecord = (data) => api.post('/employee_management/hr/employees/', data);
export const hrUpdateEmployeeRecord = (id, data) => api.put(`/employee_management/hr/employees/${id}/`, data);
export const hrDeleteEmployeeRecord = (id) => api.delete(`/employee_management/hr/employees/${id}/`);
export const hrGetEmployeeHistory = async (id) => toList(await api.get(`/employee_management/hr/employees/${id}/history/`));
export const hrGetEmployeeSnapshot = (id) => api.get(`/employee_management/hr/employees/${id}/snapshot/`);
export const hrChangeEmployeeRole = (id, data) => api.post(`/employee_management/hr/employees/${id}/change-role/`, data);
export const hrSimulatePromotion = (data) => api.post('/feedback/hr/simulate-promotion/', data);

// Attendance & Leave
export const hrGetAttendanceRecords = async () => toList(await api.get('/attendance_leave/hr/attendance/'));
export const hrGetAttendanceWatch = () => api.get('/attendance_leave/hr/attendance/watch/');
export const hrGetLeaveRequests = async () => toList(await api.get('/attendance_leave/hr/leave-requests/'));
export const hrGetApprovalSnapshot = () => api.get('/employee_management/hr/approvals/snapshot/');
export const hrGetApprovals = async () => toList(await api.get('/feedback/hr/approvals/'));
export const hrProcessApproval = (id, data) => api.post(`/feedback/hr/approvals/${id}/process/`, data);
export const hrReviewLeaveRequest = (id, data) => api.post(`/attendance_leave/hr/leave-requests/${id}/review/`, data);

// Payroll
export const hrGetPayroll = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/payroll/hr/payroll/${query}`));
};
export const hrGetPayrollWatch = () => api.get('/payroll/hr/payroll/watch/');
export const hrCreatePayroll = (data) => api.post('/payroll/hr/payroll/', data);
export const hrMarkPayrollPaid = (id, data = {}) => api.post(`/payroll/hr/payroll/${id}/mark-paid/`, data);

// Performance Reviews
export const hrGetReviews = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/reviews/${query}`));
};
export const hrGetReviewCalibration = () => api.get('/employee_management/hr/reviews/calibration/');
export const hrCreateReview = (data) => api.post('/employee_management/hr/reviews/', data);

// Succession Planning
export const hrGetSuccessionPlans = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/recruitment/hr/succession/${query}`));
};
export const hrGetSuccessionWatch = () => api.get('/recruitment/hr/succession/watch/');
export const hrCreateSuccessionPlan = (data) => api.post('/recruitment/hr/succession/', data);

// Onboarding
export const hrGetOnboardingPlans = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/onboarding/hr/onboarding/${query}`));
};
export const hrGetOnboardingWatch = () => api.get('/onboarding/hr/onboarding/watch/');
export const hrCreateOnboardingPlan = (data) => api.post('/onboarding/hr/onboarding/', data);

// Shifts
export const hrGetShifts = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/shifts/${query}`));
};
export const hrGetShiftWatch = () => api.get('/employee_management/hr/shifts/watch/');
export const hrCreateShift = (data) => api.post('/employee_management/hr/shifts/', data);

// Policies
export const hrGetPolicyCompliance = () => api.get('/employee_management/hr/policies/compliance/');
export const hrSendPolicyReminder = (id, data = {}) => api.post(`/employee_management/hr/policies/${id}/remind/`, data);
export const hrGetPolicies = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/policies/${query}`));
};
export const hrCreatePolicy = (data) => api.post('/employee_management/hr/policies/', data);

// Benefits
export const hrGetBenefits = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/benefits/${query}`));
};
export const hrGetBenefitWatch = () => api.get('/employee_management/hr/benefits/watch/');
export const hrCreateBenefit = (data) => api.post('/employee_management/hr/benefits/', data);

// Expenses
export const hrGetExpenses = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/expenses/${query}`));
};
export const hrGetExpenseWatch = () => api.get('/employee_management/hr/expenses/watch/');
export const hrReviewExpenseClaim = (id, data) => api.post(`/employee_management/hr/expenses/${id}/review/`, data);

// Documents
export const hrGetDocuments = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/documents/${query}`));
};
export const hrGetDocumentWatch = () => api.get('/employee_management/hr/documents/watch/');
export const hrIssueDocument = (id, data) => api.post(`/employee_management/hr/documents/${id}/issue/`, data);

// Tickets
export const hrGetTickets = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/tickets/${query}`));
};
export const hrGetTicketWatch = () => api.get('/employee_management/hr/tickets/watch/');
export const hrUpdateTicketStatus = (id, data) => api.post(`/employee_management/hr/tickets/${id}/status/`, data);

// Recognition
export const hrGetRecognitionWatch = () => api.get('/employee_management/hr/recognition/watch/');

// Training
export const hrGetTraining = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/hr/training/${query}`));
};
export const hrGetTrainingCompliance = () => api.get('/employee_management/hr/training/compliance/');
export const hrCreateTraining = (data) => api.post('/employee_management/hr/training/', data);

// Talent Matrix & Calibration
export const hrGetTalentMatrix = async () => toList(await api.get('/talent/matrix/'));
export const hrCalibrateTalent = (data) => api.post('/talent/calibrate/', data);

// Analytics & Dashboard
export const hrGetDashboardMetrics = () => api.get('/analytics/dashboard/');
export const hrGetGlobalTriage = () => api.get('/analytics/global-triage/');
export const hrGetRiskCorridor = () => api.get('/analytics/risk-corridor/');
export const hrGetResourceDensity = () => api.get('/analytics/resource-density/');
export const hrGetActivityStream = () => api.get('/analytics/activity-stream/');
export const hrTriggerIntelligenceSync = () => api.post('/analytics/sync/', {});
