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
