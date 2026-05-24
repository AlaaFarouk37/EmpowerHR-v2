import { api } from './base';

export const postCommandQuery = (query) => api.post('/ai/command/', { query });

export const getOrgHealthSnapshot = () => api.get('/ai/health-snapshot/');
