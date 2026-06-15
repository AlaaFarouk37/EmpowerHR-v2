import { api, toList } from './base';

/**
 * Workforce Command Center - Attrition & Calibration APIs
 */

// Run the attrition model over the active form's completed submissions (HR Manager).
// Omit formId to use the latest active form.
export const runAttritionPrediction = (formId) =>
  api.post('/attrition/run/', formId ? { form_id: formId } : {});

export const getLatestAttritionPredictions = async () =>
  toList(await api.get('/attrition/predictions/latest/'));

// Latest attrition prediction per member of the requesting TL's team (lightweight).
export const getTeamAttritionLatest = async () =>
  api.get('/attrition/team/latest/');

export const notifyTLOfAttritionRisk = (predictionID, notes = '') =>
  api.post(`/attrition/predictions/${predictionID}/notify-tl/`, notes ? { notes } : {});

export const calibrateTalent = (data) => 
  api.post('/attrition/calibrate/', data);

export const getAttritionGovernance = () => 
  api.get('/attrition/governance/');

export const hrGetNeuralEvents = async () => 
  toList(await api.get('/attrition/events/'));
