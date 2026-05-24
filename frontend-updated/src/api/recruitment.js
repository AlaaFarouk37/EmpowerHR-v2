import { api, toList } from './base';

// Recruitment (Jobs & CV Ranking)
export const hrGetJobs           = async ()        => toList(await api.get('/recruitment/jobs/'));
export const getJobs             = hrGetJobs;
export const hrGetJobsWatch      = ()              => api.get('/recruitment/jobs/health/');
export const hrUpdateJobStatus   = (id, status)    => api.put(`/recruitment/jobs/${id}/`, { status });
export const hrGetJobPipelineHealth = () => api.get('/recruitment/jobs/health/');
export const createJob         = (data)    => api.post('/recruitment/jobs/', data);
export const updateJob         = (id, data)=> api.put(`/recruitment/jobs/${id}/`, data);
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
export const hrBulkUpdateSubmissions = (data) => api.post('/recruitment/submissions/bulk-update/', data);
export const submitResume      = (formData)    => api.postForm('/recruitment/submit/', formData);
export const getJobRanking     = async (jobId)   => toList(await api.get(`/recruitment/jobs/${jobId}/ranking/`));
export const uploadAndRankCVs  = async (jobId, formData) => toList(await api.postForm(`/recruitment/jobs/${jobId}/ranking/`, formData));
export const getSimilarCandidates = async (id) => toList(await api.get(`/recruitment/submissions/${id}/similar/`));
export const talentSearch = async (query) => toList(await api.post('/recruitment/talent-search/', { query }));
export const hrAutomateJobRecruitment = (jobId, protocol) => api.post(`/recruitment/jobs/${jobId}/automate/`, { protocol });
export const hireCandidate = (id) => api.post(`/recruitment/submissions/${id}/hire/`, {});
export const hrGetJobInsights = (jobId) => api.get(`/recruitment/jobs/${jobId}/insights/`);
export const hrOptimizeJob = (jobId, updates) => api.post(`/recruitment/jobs/${jobId}/optimize/`, { updates });
export const getTalentCloneSimilarity = (jobId, sourceId, sourceType) => api.get(`/recruitment/talent-similarity/`, { params: { job_id: jobId, source_id: sourceId, source_type: sourceType } });

// Attrition
export const runPrediction     = (formID)  => api.post('/attrition/run/', formID ? { form_id: formID } : {});
export const getPredictions    = async ()        => toList(await api.get('/attrition/predictions/latest/'));

// Benchmarking
export const hrGetBenchmarking  = async () => await api.get('/recruitment/benchmarking/');
export const hrRunSalarySync    = () => api.post('/recruitment/benchmarking/sync/', {});
export const hrGetTalentPools   = async () => toList(await api.get('/recruitment/talent-pools/'));
export const hrPromoteEmployee  = (employeeID, roleID) => api.post('/recruitment/promote/', { employee_id: employeeID, role_id: roleID });
export const hrGetTalentGraph   = async () => await api.get('/recruitment/talent-graph/');

