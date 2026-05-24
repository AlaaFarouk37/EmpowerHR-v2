import { api } from './base';

export const loginUser           = (data) => api.post('/auth/login/', data);
export const logoutUser          = (refresh) => api.post('/auth/logout/', { refresh });
export const getMe               = () => api.get('/auth/me/');
export const updateMyPreferences = (data) => api.put('/auth/me/', data);
export const registerCandidate   = (data) => api.post('/auth/candidate/register/', data);
export const changePassword      = (data) => api.post('/auth/change-password/', data);
export const requestPasswordResetOtp = (data) => api.post('/auth/password-reset/request/', data);
export const confirmPasswordReset = (data) => api.post('/auth/password-reset/confirm/', data);
