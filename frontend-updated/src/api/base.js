
const RAW_API_BASE = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_BASE || 'http://127.0.0.1:8000';
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/$/, '');
const BASE = NORMALIZED_API_BASE.endsWith('/api') ? NORMALIZED_API_BASE : `${NORMALIZED_API_BASE}/api`;

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const authHeaders = () => {
  const token = localStorage.getItem('access');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const toList = (payload) => {
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
      headers: {
        'Content-Type': 'application/json',
      },
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
    headers: {
      ...(localStorage.getItem('access') ? { Authorization: `Bearer ${localStorage.getItem('access')}` } : {}),
    },
    body: formData,
  }),
};
