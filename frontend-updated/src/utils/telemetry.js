/**
 * EmpowerHR AI Telemetry Engine
 * Tracks governance events for intelligence analysis and audit trails.
 */

const STORAGE_KEY = 'empower_ai_telemetry';

export const AI_EVENT_TYPES = {
  GOVERNANCE_OVERRIDE: 'GOVERNANCE_OVERRIDE',
  ANOMALY_RESOLUTION: 'ANOMALY_RESOLUTION',
  MASTER_SIGN_OFF: 'MASTER_SIGN_OFF',
  IDENTITY_MIRROR: 'IDENTITY_MIRROR',
  SYSTEM_LOCKDOWN: 'SYSTEM_LOCKDOWN',
  POLICY_CHANGE: 'POLICY_CHANGE',
  DATA_VALIDATION: 'DATA_VALIDATION',
  PROMOTION_SIMULATION: 'PROMOTION_SIMULATION',
};

export const logAIEvent = (type, metadata = {}) => {
  const event = {
    id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    type,
    timestamp: new Date().toISOString(),
    user: JSON.parse(localStorage.getItem('user'))?.full_name || 'Administrator',
    metadata,
  };

  const currentLog = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const updatedLog = [event, ...currentLog].slice(0, 500); // Keep last 500 events
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLog));
  
  // Dispatch event for reactive UI components
  window.dispatchEvent(new CustomEvent('ai_telemetry_update', { detail: event }));
  
  console.log(`[AI Telemetry] Event Logged: ${type}`, event);
  return event;
};

const sanitizeEvent = (event) => {
  if (!event || typeof event !== 'object') return null;
  return {
    id: event.id || `EVT-FIXED-${Math.random().toString(36).substr(2, 9)}`,
    type: event.type || 'SYSTEM_EVENT',
    timestamp: event.timestamp || new Date().toISOString(),
    user: event.user || 'System Entity',
    metadata: event.metadata && typeof event.metadata === 'object' ? event.metadata : {},
  };
};

export const getAIHistory = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(sanitizeEvent).filter(Boolean) : [];
  } catch (e) {
    console.error('[AI Telemetry] Data Corruption Detected. Resetting log.');
    return [];
  }
};

export const clearAIHistory = () => {
  localStorage.setItem(STORAGE_KEY, '[]');
};
