import { api, toList } from './base';

// Goals & Team Development
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
// TL approves a Pending Review task — backend moves it to Done.
export const approveTeamTask = (id) => api.post(`/employee_management/team/tasks/${id}/approve/`, {});
export const returnTeamTaskWithNotes = (id, note) => api.post(`/employee_management/team/tasks/${id}/return/`, { note });

// Recognition & Rewards
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

// Today's team presence snapshot (present / on leave / absent) for the TL's team.
export const getTeamPresenceToday = async () => api.get('/attendance_leave/team/presence/');

export const getTeamPendingOvertime = async () => toList(await api.get('/attendance_leave/team/overtime/'));
export const reviewTeamOvertime = (attendanceID, data) => api.post(`/attendance_leave/team/overtime/${attendanceID}/review/`, data);

export const getTeamTimeCorrections = async () => toList(await api.get('/attendance_leave/team/time-corrections/'));
export const reviewTimeCorrection = (correctionID, data) => api.post(`/attendance_leave/team/time-corrections/${correctionID}/review/`, data);

// Leave requests from the leader's team members (their own route to HR).
export const getTeamLeaveRequests = async (status) =>
  toList(await api.get(`/attendance_leave/team/leave-requests/${status ? `?status=${status}` : ''}`));
// Body: { action: 'approve' | 'reject', reviewNotes?: '' }.
export const reviewTeamLeaveRequest = (leaveRequestID, data) =>
  api.post(`/attendance_leave/team/leave-requests/${leaveRequestID}/review/`, data);

export const getTeamReviews = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value).trim());
    }
  });
  const query = params.toString() ? `?${params.toString()}` : '';
  return toList(await api.get(`/employee_management/team/reviews/${query}`));
};
export const createTeamReview = (data) => api.post('/employee_management/team/reviews/', data);
