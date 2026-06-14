import { api, toList } from './base';

/**
 * Workforce Command Center - Attrition & Calibration APIs
 */

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
