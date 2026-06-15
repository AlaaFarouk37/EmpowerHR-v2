import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLatestAttritionPredictions, notifyTLOfAttritionRisk, runAttritionPrediction } from '../../api/index.js';
import { Badge, Btn, Modal, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Filter,
  Shield,
  Users, 
  TrendingDown, 
  AlertCircle, 
  Activity,
  ArrowUpRight,
  Zap,
  Globe,
  Layers,
  Sparkles,
  ShieldAlert,
  SearchCode,
  MoreVertical,
  Briefcase,
  Send
} from 'lucide-react';

export function AttritionPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);
  const [running, setRunning] = useState(false);

  const handleNotifyTL = async (emp) => {
    const predId = emp?.predictionID || emp?.id;
    if (!predId) {
      toast(t('Cannot identify this prediction.'), 'error');
      return;
    }
    setNotifyingId(predId);
    try {
      const res = await notifyTLOfAttritionRisk(predId);
      const name = res?.teamLeaderName ? ` (${res.teamLeaderName})` : '';
      toast(res?.reused ? `${t('TL already notified')}${name}` : `${t('Team Leader notified')}${name}`, 'success');
    } catch (e) {
      toast(e?.data?.detail || e?.message || t('Failed to notify Team Leader'), 'error');
    } finally {
      setNotifyingId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const predData = await getLatestAttritionPredictions();
      setPredictions(Array.isArray(predData) ? predData : []);
    } catch (error) {
      toast('Failed to load attrition intelligence', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Run the attrition model over the active form's completed submissions, then refresh.
  const runPredictions = async () => {
    setRunning(true);
    try {
      const res = await runAttritionPrediction();
      const processed = res?.totalProcessed ?? 0;
      const errs = res?.totalErrors ?? 0;
      toast(
        `Predictions run on "${res?.formTitle || 'active form'}": ${processed} employee(s) scored${errs ? `, ${errs} error(s)` : ''}.`,
        'success',
      );
      await loadData();
    } catch (e) {
      toast(e?.data?.error || e?.response?.data?.error || e?.message || t('Failed to run predictions'), 'error');
    } finally {
      setRunning(false);
    }
  };

  const filteredPredictions = predictions;

  const riskStats = useMemo(() => {
    const lvl = (p) => p.riskLevel || p.attritionRisk;
    const mediumCount = predictions.filter(p => lvl(p) === 'Medium').length;
    const highCount = predictions.filter(p => lvl(p) === 'High').length;
    const escalateCount = predictions.filter(p => lvl(p) === 'High' && p.previousRiskLevel === 'High').length;
    return [
      { label: 'Medium Risk',  value: mediumCount,   icon: Activity,    color: '#B54708',         bg: '#FFF7ED' },
      { label: 'High Risk',    value: highCount,     icon: ShieldAlert, color: 'var(--red-600)',  bg: 'var(--red-50)' },
      { label: 'Escalate',     value: escalateCount, icon: ShieldAlert, color: '#92400E',         bg: '#FEF3C7' },
    ];
  }, [predictions]);

  const getRiskColor = (score) => {
    if (score >= 80) return 'var(--pink-600)';
    if (score >= 50) return 'var(--red-500)';
    return '#10B981';
  };

  // Open a printable report in a new window. User saves as PDF from the browser's print dialog.
  const handleGenerateReport = () => {
    const rows = filteredPredictions
      .slice()
      .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0));
    const dateStr = new Date().toLocaleString();
    const total = predictions.length;
    const mediumCount = predictions.filter(p => (p.riskLevel || p.attritionRisk) === 'Medium').length;
    const highCount = predictions.filter(p => (p.riskLevel || p.attritionRisk) === 'High').length;
    const escalateCount = predictions.filter(p => (p.riskLevel || p.attritionRisk) === 'High' && p.previousRiskLevel === 'High').length;
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast(t('Pop-up blocked. Please allow pop-ups to generate the report.'), 'error');
      return;
    }
    const tableRows = rows.map(p => {
      const score = Number(p.riskScore ?? 0);
      const pct = Math.round(score > 1 ? score : score * 100);
      const lvl = p.riskLevel || p.attritionRisk || '—';
      const escalate = lvl === 'High' && p.previousRiskLevel === 'High' ? 'YES' : '';
      return `
        <tr>
          <td>${esc(p.employeeName || p.fullName || p.employeeID)}</td>
          <td>${esc(p.jobTitle || p.employeeRole || '—')}</td>
          <td>${esc(p.department || '—')}</td>
          <td class="lvl lvl-${esc(lvl).toLowerCase()}">${esc(lvl)}</td>
          <td>${pct}%</td>
          <td>${esc(p.previousRiskLevel || '—')}</td>
          <td class="${escalate ? 'esc' : ''}">${escalate}</td>
        </tr>
      `;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8" />
  <title>Attrition Risk Report — ${esc(dateStr)}</title>
  <style>
    @page { size: A4 landscape; margin: 18mm; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1E293B; margin: 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .sub { color: #64748B; font-size: 12px; margin-bottom: 18px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
    .card { border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; background: #fff; }
    .card .label { font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
    .card .val { font-size: 22px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #EAECF0; text-align: left; vertical-align: top; }
    th { background: #F8FAFC; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #64748B; }
    .lvl-high { color: #B42318; font-weight: 700; }
    .lvl-medium { color: #B54708; font-weight: 700; }
    .lvl-low { color: #027A48; font-weight: 700; }
    .esc { background: #FEF3C7; color: #78350F; font-weight: 800; }
    .footer { margin-top: 18px; font-size: 11px; color: #94A3B8; }
    @media print { .no-print { display: none !important; } }
    .actions { display: flex; gap: 8px; margin-bottom: 14px; }
    button { padding: 8px 14px; border: 1px solid #E2E8F0; background: #fff; border-radius: 8px; font-weight: 700; cursor: pointer; }
    button.primary { background: #DC2626; color: #fff; border-color: #DC2626; }
  </style>
</head><body>
  <div class="actions no-print">
    <button class="primary" onclick="window.print()">Save / Print as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>

  <h1>Attrition Risk Report</h1>
  <div class="sub">Generated ${esc(dateStr)} · ${total} predictions in scope</div>

  <div class="summary">
    <div class="card"><div class="label">Total</div><div class="val">${total}</div></div>
    <div class="card"><div class="label">Medium Risk</div><div class="val" style="color:#B54708">${mediumCount}</div></div>
    <div class="card"><div class="label">High Risk</div><div class="val" style="color:#B42318">${highCount}</div></div>
    <div class="card"><div class="label">Escalate</div><div class="val" style="color:#92400E">${escalateCount}</div></div>
  </div>

  <table>
    <thead><tr>
      <th>Employee</th><th>Role</th><th>Department</th><th>Current Level</th><th>Score</th><th>Previous Level</th><th>Escalate</th>
    </tr></thead>
    <tbody>${tableRows || '<tr><td colspan="7" style="text-align:center; padding:24px; color:#94A3B8">No predictions in scope.</td></tr>'}</tbody>
  </table>

  <div class="footer">
    Escalate = current cycle High AND previous cycle High. Action plan / governance details available in the on-screen modal.
  </div>
  <script>
    // Try auto-printing once the page is fully laid out.
    window.addEventListener('load', () => { setTimeout(() => window.print(), 250); });
  </script>
</body></html>`);
    win.document.close();
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING RISK INTELLIGENCE...</div>
       </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Strategic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}>
                 <Activity size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Predictive Attrition Intelligence</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit predictive stability vectors, monitor risk corridors, and manage tactical retention protocols.</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Btn
            onClick={runPredictions}
            disabled={running}
            variant="primary"
            style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
          >
             <Activity size={18} style={{ marginRight: 8 }} /> {running ? t('Running Predictions...') : t('Run Predictions')}
          </Btn>
          <Btn
            onClick={handleGenerateReport}
            variant="outline"
            style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900 }}
          >
             <Zap size={18} style={{ marginRight: 8 }} /> {t('Report')}
          </Btn>
        </div>
      </div>

      {/* Intelligence Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
        {riskStats.map(s => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(s.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Neural Risk Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Workforce Node', 'Classification', 'Attrition Risk Vector', 'Risk Severity', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPredictions.map((emp, idx) => {
              const rawScore = Number(emp.riskScore ?? 0);
              // Backend stores 0-1 fractions; legacy data may already be 0-100.
              const riskPercentage = Math.round(rawScore > 1 ? rawScore : rawScore * 100);
              const riskLevel = emp.riskLevel || emp.attritionRisk || 'Unknown';
              const isHighRisk = riskLevel === 'High';
              const previousLevel = emp.previousRiskLevel || null;
              const needsEscalation = isHighRisk && previousLevel === 'High';

              return (
                <tr
                  key={idx}
                  onClick={() => setSelectedPrediction(emp)}
                  style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isHighRisk ? 'rgba(220, 38, 38, 0.02)' : 'transparent', cursor: 'pointer' }}
                  className="risk-row"
                >
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isHighRisk ? 'var(--pink-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: isHighRisk ? 'var(--pink-600)' : 'var(--red-600)', border: `1px solid ${isHighRisk ? 'var(--pink-100)' : 'var(--red-100)'}`,
                        fontSize: 16, fontWeight: 900
                      }}>
                         {(emp.employeeName || 'U').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{emp.employeeName}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{emp.jobTitle || emp.employeeRole || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                        <Briefcase size={14} style={{ color: 'var(--red-600)' }} />
                        {emp.department || 'Strategic Hub'}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px', minWidth: 200 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                           <div style={{ width: `${riskPercentage}%`, height: '100%', background: getRiskColor(riskPercentage), borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: getRiskColor(riskPercentage), width: 40 }}>{riskPercentage}%</span>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge
                      label={riskLevel.toUpperCase()}
                      color={isHighRisk ? 'red' : riskLevel === 'Medium' ? 'yellow' : 'green'}
                     />
                     {needsEscalation && (
                       <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E', fontSize: 10, fontWeight: 900, marginTop: 8, letterSpacing: '0.05em' }}
                            title={t('High risk for two consecutive cycles — escalate beyond a standard retention plan.')}
                       >
                          <ShieldAlert size={12} /> {t('ESCALATE')}
                       </div>
                     )}
                     {isHighRisk && !needsEscalation && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pink-600)', fontSize: 10, fontWeight: 900, marginTop: 8, letterSpacing: '0.05em' }}>
                          <ShieldAlert size={12} /> CRITICAL ANOMALY
                       </div>
                     )}
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }} onClick={(e) => e.stopPropagation()}>
                       <button className="action-btn" title={t('View Insights')} onClick={() => setSelectedPrediction(emp)}><SearchCode size={18} /></button>
                       <button
                         className="notify-btn"
                         title={t('Send the attrition insights to this employee\'s Team Leader as a follow-up task')}
                         disabled={notifyingId === (emp.predictionID || emp.id)}
                         onClick={() => handleNotifyTL(emp)}
                       >
                         <Send size={14} style={{ marginRight: 6 }} />
                         {notifyingId === (emp.predictionID || emp.id) ? t('Sending...') : t('Notify TL')}
                       </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Attrition Insights modal — ported from frontend-old/src/pages/hr/DashboardPage.jsx */}
      <Modal
        open={Boolean(selectedPrediction)}
        onClose={() => setSelectedPrediction(null)}
        title={selectedPrediction
          ? `${selectedPrediction.fullName || selectedPrediction.employeeName || selectedPrediction.employeeID} — ${t('Attrition Insights')}`
          : t('Attrition Insights')}
        maxWidth={680}
      >
        {selectedPrediction && (() => {
          const p = selectedPrediction;
          const rawScore = Number(p.riskScore ?? 0);
          const pct = Math.round(rawScore > 1 ? rawScore : rawScore * 100);
          const lvl = p.riskLevel || p.attritionRisk || 'Unknown';
          const levelColor = lvl === 'High' ? '#B42318' : lvl === 'Medium' ? '#B54708' : '#027A48';
          const levelBg = lvl === 'High' ? '#FFF1F3' : lvl === 'Medium' ? '#FFF7ED' : '#ECFDF3';
          const drivers = Array.isArray(p.riskDrivers) ? p.riskDrivers : [];
          const points = Array.isArray(p.mainRiskPoints) ? p.mainRiskPoints : [];
          const hrPlan = Array.isArray(p.hrActionPlan) ? p.hrActionPlan : (Array.isArray(p.recommendedActions) ? p.recommendedActions : []);
          const adminPlan = Array.isArray(p.adminActionPlan) ? p.adminActionPlan : [];

          return (
            <div style={{ padding: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1E293B' }}>{p.fullName || p.employeeName || p.employeeID}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {p.jobTitle || p.employeeRole || '—'} · {p.department || '—'} · {p.team || '—'}
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: levelBg, color: levelColor }}>
                  {lvl} · {pct}%
                </span>
              </div>

              {p.escalation && (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A', color: '#78350F', fontSize: 12.5, lineHeight: 1.5 }}>
                  <strong style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{t('Escalation needed')}:</strong>{' '}
                  {t('This employee was High-risk in the previous cycle and a follow-up plan was created — they remain High-risk now. Consider escalating beyond a standard retention plan.')}
                </div>
              )}
              {p.previousRiskLevel && (
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                  {t('Previous cycle')}: <strong>{p.previousRiskLevel}</strong>
                  {p.hadPreviousActionPlan ? ` · ${t('follow-up plan was created')}` : ''}
                </div>
              )}

              <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#475569', lineHeight: 1.55 }}>
                {p.explanationSummary || t('AI summary unavailable for this prediction.')}
              </p>
              {p.feedbackSummary && (
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>{p.feedbackSummary}</div>
              )}

              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8, letterSpacing: '.05em' }}>{t('Key Drivers')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {drivers.length ? drivers.slice(0, 5).map((driver, index) => {
                  const driverColor = driver?.severity === 'high' ? '#B42318' : driver?.severity === 'medium' ? '#B54708' : '#027A48';
                  const driverBg = driver?.severity === 'high' ? '#FFF1F3' : driver?.severity === 'medium' ? '#FFF7ED' : '#ECFDF3';
                  return (
                    <span key={`${driver?.title || 'driver'}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: driverBg, color: driverColor, fontSize: 12, fontWeight: 700 }}>
                      {driver?.title || '—'}
                    </span>
                  );
                }) : (
                  <span style={{ fontSize: 12.5, color: '#94A3B8' }}>{t('No strong drivers available for this prediction yet.')}</span>
                )}
              </div>

              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8, letterSpacing: '.05em' }}>{t('Main Risk Points')}</div>
              <ul style={{ margin: '0 0 14px', paddingInlineStart: 18, display: 'grid', gap: 6, color: '#475569', fontSize: 13 }}>
                {points.length ? points.slice(0, 5).map((point, index) => (
                  <li key={`${point}-${index}`}>{point}</li>
                )) : (
                  <li>{t('No strong drivers available for this prediction yet.')}</li>
                )}
              </ul>

              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8, letterSpacing: '.05em' }}>{t('HR Action Plan')}</div>
              <ul style={{ margin: '0 0 14px', paddingInlineStart: 18, display: 'grid', gap: 6, color: '#475569', fontSize: 13 }}>
                {hrPlan.length ? hrPlan.slice(0, 5).map((action, index) => (
                  <li key={`hr-${action}-${index}`}>{action}</li>
                )) : (
                  <li>{t('No recommended actions generated yet.')}</li>
                )}
              </ul>

              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 8, letterSpacing: '.05em' }}>{t('Admin Action Plan')}</div>
              <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 6, color: '#475569', fontSize: 13 }}>
                {adminPlan.length ? adminPlan.slice(0, 5).map((action, index) => (
                  <li key={`admin-${action}-${index}`}>{action}</li>
                )) : (
                  <li>{t('No recommended actions generated yet.')}</li>
                )}
              </ul>

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
                <Btn variant="ghost" onClick={() => setSelectedPrediction(null)} style={{ height: 44, padding: '0 24px', borderRadius: 12, fontWeight: 800 }}>{t('Close')}</Btn>
              </div>
            </div>
          );
        })()}
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .risk-row:hover { background: #FBFBFF; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        .notify-btn {
          height: 36px; padding: 0 14px; border: 1.5px solid var(--red-600); background: var(--red-600);
          color: #fff; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 12px; font-weight: 800; transition: all 0.2s;
        }
        .notify-btn:hover:not(:disabled) { background: var(--red-700, #B91C1C); }
        .notify-btn:disabled { opacity: 0.6; cursor: wait; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
