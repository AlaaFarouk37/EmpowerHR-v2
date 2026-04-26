
const RAW_API_BASE = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/$/, '');
const BASE = NORMALIZED_API_BASE.endsWith('/api') ? NORMALIZED_API_BASE : `${NORMALIZED_API_BASE}/api`;

const authHeaders = () => {
  const token = localStorage.getItem('access');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const toList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const clearSession = () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  localStorage.removeItem('user');
};

const parseJsonSafe = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const refreshAccessToken = async () => {
  const refresh = localStorage.getItem('refresh');
  if (!refresh) return false;

  try {
    const response = await fetch(`${BASE}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok || !data?.access) {
      clearSession();
      return false;
    }

    localStorage.setItem('access', data.access);
    if (data.refresh) localStorage.setItem('refresh', data.refresh);
    return true;
  } catch {
    clearSession();
    return false;
  }
};

const request = async (url, options = {}, canRetry = true) => {
  const response = await fetch(`${BASE}${url}`, options);

  if (response.status === 401 && canRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retriedOptions = {
        ...options,
        headers: {
          ...(options.headers || {}),
          ...authHeaders(),
        },
      };
      return request(url, retriedOptions, false);
    }
  }

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const message = data?.detail || data?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  get:    (url)       => request(url, { headers: authHeaders() }),
  post:   (url, data) => request(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }),
  put:    (url, data) => request(url, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }),
  delete: (url)       => request(url, { method: 'DELETE', headers: authHeaders() }),
  postForm: (url, formData) => request(url, {
    method: 'POST',
    headers: localStorage.getItem('access') ? { Authorization: `Bearer ${localStorage.getItem('access')}` } : {},
    body: formData,
  }),
};

// Employee
export const getForms        = async (employeeID) => toList(await api.get(`/feedback/forms/?employee_id=${employeeID}`));
export const getFormDetail   = (formID, employeeID) => api.get(`/feedback/forms/${formID}/?employee_id=${employeeID}`);
export const submitFeedback  = (formID, data) => api.post(`/feedback/forms/${formID}/submit/`, data);

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
export const hrGetQuestions    = async (formID)        => toList(await api.get(`/feedback/hr/forms/${formID}/questions/`));
export const hrAddQuestion     = (formID, data)  => api.post(`/feedback/hr/forms/${formID}/questions/`, data);
export const hrUpdateQuestion  = (qID, data)     => api.put(`/feedback/hr/questions/${qID}/`, data);
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

// Attendance & Leave
export const getMyAttendance = async (employeeID) => toList(await api.get(`/attendance_leave/employee/attendance/?employee_id=${employeeID}`));
export const clockAttendance = (data) => api.post('/attendance_leave/employee/attendance/clock/', data);
export const getMyLeaveRequests = async (employeeID) => toList(await api.get(`/attendance_leave/employee/leave-requests/?employee_id=${employeeID}`));
export const submitLeaveRequest = (data) => api.post('/attendance_leave/employee/leave-requests/', data);
export const hrGetAttendanceRecords = async () => toList(await api.get('/attendance_leave/hr/attendance/'));
export const hrGetAttendanceWatch = () => api.get('/attendance_leave/hr/attendance/watch/');
export const hrGetLeaveRequests = async () => toList(await api.get('/attendance_leave/hr/leave-requests/'));
export const hrGetApprovalSnapshot = () => api.get('/employee_management/hr/approvals/snapshot/');
export const hrReviewLeaveRequest = (id, data) => api.post(`/attendance_leave/hr/leave-requests/${id}/review/`, data);

// Payroll
export const getMyPayroll = async (employeeID) => toList(await api.get(`/payroll/employee/payroll/${employeeID ? `?employee_id=${employeeID}` : ''}`));
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
export const getMyReviews = async (employeeID) => toList(await api.get(`/employee_management/employee/reviews/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const acknowledgeMyReview = (id, data = {}) => api.post(`/employee_management/employee/reviews/${id}/acknowledge/`, data);
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

// Career Path & Succession Planning
export const getMyCareerPath = async (employeeID) => toList(await api.get(`/employee_management/employee/career-path/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const acknowledgeCareerPlan = (id, data = {}) => api.post(`/employee_management/employee/career-path/${id}/acknowledge/`, data);
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

// Onboarding & Transition
export const getMyOnboarding = async (employeeID) => toList(await api.get(`/onboarding/employee/onboarding/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyOnboardingProgress = (id, data) => api.post(`/onboarding/employee/onboarding/${id}/progress/`, data);
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

// Shift Scheduling
export const getMyShifts = async (employeeID) => toList(await api.get(`/employee_management/employee/shifts/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const acknowledgeMyShift = (id, data = {}) => api.post(`/employee_management/employee/shifts/${id}/acknowledge/`, data);
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

// Policy Announcements
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

// Benefits & Enrollment
export const getMyBenefits = async (employeeID) => toList(await api.get(`/employee_management/employee/benefits/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyBenefitStatus = (id, data) => api.post(`/employee_management/employee/benefits/${id}/status/`, data);
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

// Expense Claims & Reimbursements
export const getMyExpenses = async (employeeID) => toList(await api.get(`/employee_management/employee/expenses/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const submitExpenseClaim = (data) => api.post('/employee_management/employee/expenses/', data);
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

// Document Requests
export const getMyDocuments = async (employeeID) => toList(await api.get(`/employee_management/employee/documents/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const submitDocumentRequest = (data) => api.post('/employee_management/employee/documents/', data);
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

// Helpdesk Tickets
export const getMyTickets = async (employeeID) => toList(await api.get(`/employee_management/employee/tickets/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const submitSupportTicket = (data) => api.post('/employee_management/employee/tickets/', data);
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

// Goals & Team Development
export const getMyGoals = async (employeeID) => toList(await api.get(`/employee_management/employee/goals/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyGoalProgress = (id, data) => api.post(`/employee_management/employee/goals/${id}/progress/`, data);
export const getTeamGoals = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/team/goals/${query}`));
};
export const createTeamGoal = (data) => api.post('/employee_management/team/goals/', data);
export const updateTeamGoal = (id, data) => api.put(`/employee_management/team/goals/${id}/`, data);

// Task Tracking
export const getMyTasks = async (employeeID) => toList(await api.get(`/employee_management/employee/tasks/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyTaskProgress = (id, data) => api.post(`/employee_management/employee/tasks/${id}/progress/`, data);
export const startMyTask = (id, data = {}) => api.post(`/employee_management/employee/tasks/${id}/start/`, data);
export const endMyTask = (id, data = {}) => api.post(`/employee_management/employee/tasks/${id}/end/`, data);
export const markMyTaskDone = (id, data = {}) => api.post(`/employee_management/employee/tasks/${id}/done/`, data);
export const approveTeamTask = (id) => api.post(`/employee_management/team/tasks/${id}/approve/`, {});
export const getTeamTasks = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/team/tasks/${query}`));
};
export const createTeamTask = (data) => api.post('/employee_management/team/tasks/', data);
export const updateTeamTask = (id, data) => api.put(`/employee_management/team/tasks/${id}/`, data);

// Recognition & Rewards
export const getMyRecognition = async (employeeID) => toList(await api.get(`/employee_management/employee/recognition/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const hrGetRecognitionWatch = () => api.get('/employee_management/hr/recognition/watch/');
export const getTeamRecognition = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/team/recognition/${query}`));
};
export const createTeamRecognition = (data) => api.post('/employee_management/team/recognition/', data);

// Training & Learning
export const getMyTraining = async (employeeID) => toList(await api.get(`/employee_management/employee/training/${employeeID ? `?employee_id=${employeeID}` : ''}`));
export const updateMyTrainingProgress = (id, data) => api.post(`/employee_management/employee/training/${id}/progress/`, data);
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

// Recruitment (Jobs & CV Ranking)
export const getJobs           = async ()        => toList(await api.get('/recruitment/jobs/'));
export const hrGetJobPipelineHealth = () => api.get('/recruitment/jobs/health/');
export const createJob         = (data)    => api.post('/recruitment/jobs/', data);
export const updateJob         = (id, data)=> api.put(`/recruitment/jobs/${id}/`, data);
export const updateJobWeights  = (id, data)=> api.put(`/recruitment/jobs/${id}/weights/`, data);
export const getJobSubmissions = async (jobId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.reviewStage) params.append('review_stage', String(filters.reviewStage).trim());
  if (filters.includeHired !== undefined && filters.includeHired !== null) {
    params.append('include_hired', filters.includeHired ? '1' : '0');
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/recruitment/jobs/${jobId}/submissions/${query}`));
};
export const getCandidateApplications = async (filters = {}) => {
  const normalized = typeof filters === 'string' ? { email: filters } : (filters || {});
  const params = new URLSearchParams();
  if (normalized.email) params.append('email', String(normalized.email).trim());
  if (normalized.trackingCode) params.append('tracking_code', String(normalized.trackingCode).trim());
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/recruitment/applications/${query}`));
};
export const updateSubmissionStage = (id, data) => api.post(`/recruitment/submissions/${id}/stage/`, data);
export const deleteSubmission  = (id)      => api.delete(`/recruitment/submissions/${id}/`);
export const submitResume      = (formData)    => api.postForm('/recruitment/submit/', formData);
export const getJobRanking     = async (jobId)   => toList(await api.get(`/recruitment/jobs/${jobId}/ranking/`));
export const uploadAndRankCVs  = async (jobId, formData) => toList(await api.postForm(`/recruitment/jobs/${jobId}/ranking/`, formData));

// Attrition
export const runPrediction     = (formID)  => api.post('/attrition/run/', formID ? { form_id: formID } : {});
export const getPredictions    = async ()        => toList(await api.get('/attrition/predictions/latest/'));

// Employee Management (Departments, Teams, Jobs, Leave Types)
// Departments
export const adminGetDepartments = async () => toList(await api.get('/employee_management/departments/'));
export const adminCreateDepartment = (data) => api.post('/employee_management/departments/', data);
export const adminUpdateDepartment = (id, data) => api.put(`/employee_management/departments/${id}/`, data);
export const adminDeleteDepartment = (id) => api.delete(`/employee_management/departments/${id}/`);

// Teams
export const adminGetTeams = async () => toList(await api.get('/employee_management/teams/'));
export const adminCreateTeam = (data) => api.post('/employee_management/teams/', data);
export const adminUpdateTeam = (id, data) => api.put(`/employee_management/teams/${id}/`, data);
export const adminDeleteTeam = (id) => api.delete(`/employee_management/teams/${id}/`);

// Jobs
export const adminGetJobs = async () => toList(await api.get('/employee_management/jobs/'));
export const adminCreateJob = (data) => api.post('/employee_management/jobs/', data);
export const adminUpdateJob = (id, data) => api.put(`/employee_management/jobs/${id}/`, data);
export const adminDeleteJob = (id) => api.delete(`/employee_management/jobs/${id}/`);

// Leave Types
export const adminGetLeaveTypes = async () => toList(await api.get('/employee_management/leave-types/'));
export const adminCreateLeaveType = (data) => api.post('/employee_management/leave-types/', data);
export const adminUpdateLeaveType = (id, data) => api.put(`/employee_management/leave-types/${id}/`, data);
export const adminDeleteLeaveType = (id) => api.delete(`/employee_management/leave-types/${id}/`);

// Auth
export const loginUser           = (data) => api.post('/auth/login/', data);
export const logoutUser          = (refresh) => api.post('/auth/logout/', { refresh });
export const refreshToken        = (refresh) => api.post('/auth/token/refresh/', { refresh });
export const getMe               = () => api.get('/auth/me/');
export const updateMyPreferences = (data) => api.put('/auth/me/', data);
export const registerCandidate   = (data) => api.post('/auth/candidate/register/', data);
export const changePassword      = (data) => api.post('/auth/change-password/', data);
export const requestPasswordResetOtp = (data) => api.post('/auth/password-reset/request/', data);
export const confirmPasswordReset = (data) => api.post('/auth/password-reset/confirm/', data);
export const getDemoAccess = () => api.get('/auth/demo-access/');