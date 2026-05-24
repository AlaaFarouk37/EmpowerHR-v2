import { useEffect, useMemo, useState } from 'react';
import { acknowledgeCareerPlan, getMyCareerPath } from '../../api/index.js';
import { Badge, Btn, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const STATUS_COLORS = {
  Active: 'orange',
  'On Track': 'blue',
  Acknowledged: 'green',
  Completed: 'green',
  'On Hold': 'red',
};

const RISK_COLORS = {
  Low: 'green',
  Medium: 'orange',
  High: 'red',
};

const READINESS_RANK = {
  'Ready Now': 4,
  '6-12 Months': 3,
  '12+ Months': 2,
  Future: 1,
};

const getCareerTone = (plan) => {
  if (plan?.retentionRisk === 'High' || plan?.status === 'On Hold') return 'red';
  if (plan?.status === 'Acknowledged' || plan?.status === 'Completed') return 'green';
  if (['Ready Now', '6-12 Months'].includes(plan?.readiness)) return 'orange';
  return 'accent';
};

export function EmployeeCareerPathPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [notes, setNotes] = useState({});

  const loadPlans = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyCareerPath(user.employee_id);
      const list = Array.isArray(data) ? data : [];
      setPlans(list);
      const nextNotes = {};
      list.forEach((plan) => {
        nextNotes[plan.planID] = plan.employeeNote || '';
      });
      setNotes(nextNotes);
    } catch (error) {
      toast(error.message || 'Failed to load career telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [user?.employee_id]);

  const stats = useMemo(() => ({
    total: plans.length,
    readySoon: plans.filter((plan) => ['Ready Now', '6-12 Months'].includes(plan.readiness)).length,
    acknowledged: plans.filter((plan) => plan.status === 'Acknowledged').length,
  }), [plans]);

  const highRiskCount = plans.filter((plan) => plan.retentionRisk === 'High').length;
  const pendingAckCount = plans.filter((plan) => plan.status !== 'Acknowledged').length;
  const readyNowCount = plans.filter((plan) => plan.readiness === 'Ready Now').length;
  const actionPlanCount = plans.filter((plan) => String(plan.developmentActions || '').trim()).length;

  const growthFocusQueue = useMemo(() => {
    const statusRank = { 'On Hold': 4, Active: 3, 'On Track': 2, Acknowledged: 1, Completed: 1 };
    const riskRank = { High: 3, Medium: 2, Low: 1 };

    return [...plans]
      .sort((a, b) => (riskRank[b.retentionRisk] || 0) - (riskRank[a.retentionRisk] || 0)
        || (statusRank[b.status] || 0) - (statusRank[a.status] || 0)
        || (READINESS_RANK[b.readiness] || 0) - (READINESS_RANK[a.readiness] || 0)
        || String(a.targetRole || '').localeCompare(String(b.targetRole || '')))
      .slice(0, 4);
  }, [plans]);

  const readinessPressureMap = useMemo(() => {
    const grouped = plans.reduce((acc, plan) => {
      const key = plan.readiness || 'Future';
      if (!acc[key]) {
        acc[key] = { readiness: key, count: 0, highRiskCount: 0, acknowledgedCount: 0 };
      }
      acc[key].count += 1;
      if (plan.retentionRisk === 'High') acc[key].highRiskCount += 1;
      if (plan.status === 'Acknowledged') acc[key].acknowledgedCount += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => (READINESS_RANK[b.readiness] || 0) - (READINESS_RANK[a.readiness] || 0)
        || b.highRiskCount - a.highRiskCount
        || b.count - a.count)
      .slice(0, 4);
  }, [plans]);

  const careerPlaybook = useMemo(() => {
    const plays = [];

    if (pendingAckCount > 0) {
      plays.push({
        title: t('Acknowledge shared growth vectors'),
        note: t('Closing the loop on new career paths ensures development sequences stay active and visible.'),
      });
    }
    if (highRiskCount > 0) {
      plays.push({
        title: t('Mitigate retention risk signals'),
        note: t('High-risk trajectories deserve immediate synchronization to align growth goals with support systems.'),
      });
    }
    if (readyNowCount > 0) {
      plays.push({
        title: t('Activate ready-now progression'),
        note: t('Near-ready roles represent the most optimized path for immediate development-to-impact conversion.'),
      });
    }
    return plays.length ? plays.slice(0, 4) : [{
      title: t('Growth trajectory nominal'),
      note: t('Your career roadmap is currently optimized. Continue following the established development cadence.'),
    }];
  }, [highRiskCount, pendingAckCount, readyNowCount, t]);

  const strongestSignal = highRiskCount > 0
    ? t('Critical retention risk detected in one or more trajectories. Immediate synchronization is recommended.')
    : pendingAckCount > 0
      ? t('Awaiting employee acknowledgment for new growth vectors. Quick review will restore roadmap momentum.')
      : readyNowCount > 0
        ? t('High-readiness growth paths detected. Optimal moment to execute pending development actions.')
        : t('Career progression outlook remains steady. No major pressure signals detected in the growth network.');

  const handleAcknowledge = async (planID) => {
    setSavingId(planID);
    try {
      await acknowledgeCareerPlan(planID, { note: notes[planID] || '' });
      toast('Career trajectory acknowledged');
      await loadPlans();
    } catch (error) {
      toast(error.message || 'Failed to sync acknowledgment', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="hr-page-shell" style={{ background: 'var(--neural-black)', minHeight: '100vh', color: 'white', padding: '40px 32px' }}>
      <div className="hr-page-header" style={{ marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 32 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, fontFamily: 'var(--serif)', letterSpacing: '-0.02em' }}>{t('Growth Roadmap')}</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          {t('Review your developmental trajectory, readiness telemetry, and growth milestones.')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 40 }}>
        {[
          { label: t('Growth Plans'), value: stats.total, accent: 'white' },
          { label: t('Ready Nodes'), value: stats.readySoon, accent: 'var(--neural-red)' },
          { label: t('Synced'), value: stats.acknowledged, accent: 'var(--neural-violet)' },
        ].map((card) => (
          <div key={card.label} className="glass-card" style={{ padding: '24px 32px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>{card.label}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: card.accent, letterSpacing: '-0.03em' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="hr-panel-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 32, marginBottom: 40 }}>
        <div style={{ display: 'grid', gap: 24 }}>
          <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-pink)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>{t('Career Momentum Radar')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[
                { label: t('Awaiting Sync'), value: pendingAckCount, color: 'var(--neural-red)', note: t('Trajectories waiting for acknowledgment.') },
                { label: t('Retention Risk'), value: highRiskCount, color: 'var(--neural-pink)', note: t('Elevated risk levels needing attention.') },
                { label: t('Peak Readiness'), value: readyNowCount, color: 'var(--neural-violet)', note: t('Nodes optimized for near-term growth.') },
                { label: t('Action Density'), value: actionPlanCount, color: 'white', note: t('Concrete developmental steps defined.') },
              ].map((item) => (
                <div key={item.label} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>{item.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.4 }}>{item.note}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, borderRadius: 16, border: '1px solid rgba(219, 39, 119, 0.2)', background: 'rgba(219, 39, 119, 0.05)', padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--neural-pink)', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Trajectory Signal')}</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: 500, lineHeight: 1.5 }}>{strongestSignal}</div>
            </div>
          </div>

          <div className="hr-table-card glass-card" style={{ overflow: 'hidden', borderRadius: 24 }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>{t('Growth Focus Queue')}</h3>
            </div>
            {growthFocusQueue.length === 0 ? (
              <div className="hr-soft-empty" style={{ padding: 48, textAlign: 'center' }}>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.3)', margin: 0, fontWeight: 500 }}>{t('No priority growth nodes awaiting follow-up.')}</p>
              </div>
            ) : (
              <div style={{ padding: 12 }}>
                {growthFocusQueue.map((plan) => (
                  <div key={`queue-${plan.planID}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: '16px 20px', borderRadius: 16 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{plan.targetRole}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                        {t('Readiness')}: {t(plan.readiness)} • {t('Risk')}: {t(plan.retentionRisk)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--neural-pink)', fontWeight: 600, marginTop: 4 }}>{plan.createdBy || t('Internal HR Network')}</div>
                    </div>
                    <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                      <Badge label={t(plan.status)} color={getCareerTone(plan)} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase' }}>{t(plan.readiness || 'Future')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-violet)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>{t('Progression Playbook')}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {careerPlaybook.map((item) => (
                <div key={item.title} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontWeight: 800, color: 'white', fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.5 }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-indigo)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>{t('Readiness Pressure')}</div>
            {readinessPressureMap.length === 0 ? (
              <div className="hr-soft-empty" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{t('No readiness patterns detected.')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {readinessPressureMap.map((item) => (
                  <div key={item.readiness} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{t(item.readiness)}</div>
                      <Badge label={`${item.count} ${t('plans')}`} color={item.highRiskCount > 0 ? 'orange' : 'accent'} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{t('High Risk')}</div>
                        <div style={{ fontWeight: 900, color: 'var(--neural-red)', fontSize: 16 }}>{item.highRiskCount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{t('Synced')}</div>
                        <div style={{ fontWeight: 900, color: 'var(--neural-pink)', fontSize: 16 }}>{item.acknowledgedCount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spinner /></div>
      ) : plans.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 80, borderRadius: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 8 }}>{t('No growth plans assigned')}</p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{t('Your developmental trajectory will appear once shared by HR.')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {plans.map((plan) => (
            <div key={plan.planID} className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, fontFamily: 'var(--serif)' }}>{plan.targetRole}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                    {t('Readiness')}: {t(plan.readiness)} • {t('Vector shared by')} {plan.createdBy || t('Internal Network')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Badge label={t(plan.status)} color={STATUS_COLORS[plan.status] || 'gray'} />
                  <Badge label={`${t('Risk')}: ${t(plan.retentionRisk)}`} color={RISK_COLORS[plan.retentionRisk] || 'gray'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>{t('Developmental Directives')}</div>
                  <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{plan.developmentActions || t('No specific directives defined.')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>{t('Strategic HR Context')}</div>
                  <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{plan.notes || t('No supplemental context shared.')}</div>
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <Textarea
                  label={t('Employee Acknowledgment Node')}
                  value={notes[plan.planID] || ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [plan.planID]: e.target.value }))}
                  placeholder={t('Add strategic acknowledgment or progression feedback...')}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 16 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                  {plan.acknowledgedAt 
                    ? `${t('Synced at')} ${new Date(plan.acknowledgedAt).toLocaleString()}` 
                    : t('Awaiting employee synchronization')}
                </div>
                <Btn
                  onClick={() => handleAcknowledge(plan.planID)}
                  disabled={savingId === plan.planID || plan.status === 'Acknowledged'}
                  style={{ 
                    background: plan.status === 'Acknowledged' ? 'rgba(255,255,255,0.05)' : 'var(--neural-gradient)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0 40px', 
                    height: '52px', 
                    fontWeight: 900, 
                    borderRadius: 14,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {plan.status === 'Acknowledged' ? t('Synced') : savingId === plan.planID ? t('Syncing...') : t('Acknowledge Vector')}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
