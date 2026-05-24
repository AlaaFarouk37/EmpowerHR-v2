import { api } from './base';

// Organization & System Configuration
export const adminGetOrgConfig = () => api.get('/governance/organization/current/');
export const adminUpdateOrgConfig = (data) => api.put('/governance/organization/current/', data);

// Skills Catalog
export const adminGetSkills = () => api.get('/workforce/skills/');
export const adminCreateSkill = (data) => api.post('/workforce/skills/', data);
export const adminDeleteSkill = (id) => api.delete(`/workforce/skills/${id}/`);

// Leave Policies
export const adminGetLeaveTypes = () => api.get('/ops/leave-types/');
export const adminCreateLeaveType = (data) => api.post('/ops/leave-types/', data);
export const adminDeleteLeaveType = (id) => api.delete(`/ops/leave-types/${id}/`);

// Governance & Stability
export const adminGetSystemHealth = () => api.get('/ai/health-snapshot/');
export const adminGetActivityLogs = () => api.get('/governance/activity-logs/');
export const adminGetPermissions = () => api.get('/governance/permissions/'); // Stub if needed
export const adminUpdateRolePermissions = (role, data) => api.put(`/governance/permissions/${role}/`, data);

// Data Hub
export const adminBulkImport = (type, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.postForm(`/ops/bulk-import/?type=${type}`, formData); // Adjust if needed
};
export const adminBulkExport = (type) => api.get(`/ops/bulk-export/?type=${type}`);
export const adminSimulateOrgChange = (data) => api.post('/ai/simulate-change/', data);
