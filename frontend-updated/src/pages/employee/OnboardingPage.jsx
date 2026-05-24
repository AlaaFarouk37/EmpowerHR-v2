import { useEffect, useMemo, useState } from 'react';
import { getMyOnboarding, updateMyOnboardingProgress } from '../../api/index.js';
import { Badge, Btn, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Rocket, 
  Target, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  TrendingUp, 
  Zap, 
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  BookOpen
} from 'lucide-react';

const STATUS_COLORS = {
  'Not Started': 'gray',
  'In Progress': 'indigo',
  Completed: 'green',
  Blocked: 'red',
};

const daysUntilDate = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
};

const getTargetWindowLabel = (value, t) => {
  const days = daysUntilDate(value);
  if (!Number.isFinite(days)) return t('No target date');
  if (days < 0) return `${Math.abs(days)} ${t('days overdue')}`;
  if (days === 0) return t('Due today');
  if (days === 1) return t('Due tomorrow');
  return `${days} ${t('days left')}`;
};

const getOnboardingTone = (plan) => {
  const days = daysUntilDate(plan?.targetDate);
  if (plan?.status === 'Blocked') return 'red';
  if (plan?.status === 'Completed') return 'green';
  if (Number.isFinite(days) && days < 0) return 'red';
  if (plan?.status === 'In Progress' && days <= 3) return 'orange';
  if (plan?.status === 'Not Started' && days <= 7) return 'yellow';
  return STATUS_COLORS[plan?.status] || 'gray';
};

export function EmployeeOnboardingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const loadPlans = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyOnboarding(user.employee_id);
      const list = Array.isArray(data) ? data : [];
      setPlans(list);
      const nextDrafts = {};
      list.forEach((plan) => {
        nextDrafts[plan.planID] = {
          status: plan.status || 'Not Started',
          progress: plan.progress ?? 0,
          note: plan.employeeNote || '',
        };
      });
      setDrafts(nextDrafts);
    } catch (error) {
      toast(error.message || 'Failed to load onboarding plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [user?.employee_id]);

  const stats = useMemo(() => ({
    total: plans.length,
    active: plans.filter((plan) => plan.status === 'In Progress').length,
    completed: plans.filter((plan) => plan.status === 'Completed').length,
  }), [plans]);

  const blockedCount = plans.filter((plan) => plan.status === 'Blocked').length;
  const notStartedCount = plans.filter((plan) => plan.status === 'Not Started').length;
  const dueSoonCount = plans.filter((plan) => plan.status !== 'Completed' && Number.isFinite(daysUntilDate(plan.targetDate)) && daysUntilDate(plan.targetDate) <= 7).length;
  const readyToCloseCount = plans.filter((plan) => plan.status !== 'Completed' && Number(plan.progress || 0) >= 75).length;
  const averageProgress = plans.length
    ? Math.round(plans.reduce((sum, plan) => sum + Number(plan.progress || 0), 0) / plans.length)
    : 0;

  const onboardingFocusQueue = useMemo(() => {
    const statusRank = { Blocked: 4, 'Not Started': 3, 'In Progress': 2, Completed: 1 };
    return [...plans]
      .sort((a, b) => (statusRank[b.status] || 0) - (statusRank[a.status] || 0)
        || Number(a.progress || 0) - Number(b.progress || 0)
        || daysUntilDate(a.targetDate) - daysUntilDate(b.targetDate)
        || String(a.title || '').localeCompare(String(b.title || '')))
      .slice(0, 4);
  }, [plans]);

  const onboardingPlaybook = useMemo(() => {
    const plays = [];

    if (blockedCount > 0) {
      plays.push({
        title: t('Clear Blockers First'),
        note: t('Blocked plans are the fastest place to regain momentum because one update can unlock multiple checklist steps.'),
      });
    }
    if (dueSoonCount > 0) {
      plays.push({
        title: t('Protect Next Milestones'),
        note: t('Plans nearing their target date should get a quick review so onboarding or transition tasks do not slip.'),
      });
    }
    if (notStartedCount > 0) {
      plays.push({
        title: t('Kick Off Untouched Plans'),
        note: t('Not-started plans usually need a clear first action, owner, or check-in to move forward.'),
      });
    }
    if (readyToCloseCount > 0) {
      plays.push({
        title: t('Finish Nearly Complete Plans'),
        note: t('High-progress plans are quick wins that can close out transition work and reduce visible load.'),
      });
    }

    return plays.length ? plays.slice(0, 4) : [{
      title: t('Transition Flow Is Steady'),
      note: t('Your onboarding and transition plans appear stable right now. Keep sharing clear progress notes with your manager.'),
    }];
  }, [blockedCount, dueSoonCount, notStartedCount, readyToCloseCount, t]);

  const setDraftField = (planID, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [planID]: {
        ...(prev[planID] || {}),
        [key]: value,
      },
    }));
  };

  const handleUpdate = async (planID) => {
    const draft = drafts[planID];
    if (!draft) return;

    setSavingId(planID);
    try {
      await updateMyOnboardingProgress(planID, {
        status: draft.status,
        progress: Number(draft.progress || 0),
        note: draft.note || '',
      });
      toast('Plan progress synced successfully', 'success');
      await loadPlans();
    } catch (error) {
      toast(error.message || 'Failed to update onboarding plan', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid #E0E7FF', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING YOUR ROADMAP...</div>
       </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Supportive Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#4F46E5', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)' }}>
                 <Rocket size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{t('My Growth & Transition')}</h1>
           </div>
           <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('Track your onboarding, development, and transition roadmaps. Update your progress as you achieve milestones.')}</p>
        </div>
      </div>

      {/* Wellness & Progress Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F8FAFC', color: '#1E293B', display: 'grid', placeItems: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Active Plans')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.active}</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EEF2FF', color: '#4F46E5', display: 'grid', placeItems: 'center' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Avg Progress')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{averageProgress}%</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#ECFDF5', color: '#10B981', display: 'grid', placeItems: 'center' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Completed')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.completed}</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FFF7ED', color: '#EA580C', display: 'grid', placeItems: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Due Soon')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{dueSoonCount}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32 }}>
        {/* Main Growth Ledger */}
        <div style={{ display: 'grid', gap: 24 }}>
          {plans.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 32, padding: '60px 40px', textAlign: 'center', border: '1.5px dashed #E2E8F0' }}>
               <Sparkles size={48} style={{ color: '#E2E8F0', margin: '0 auto 16px' }} />
               <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>{t('Your Roadmap is Clear')}</div>
               <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('HR or your manager will assign transition and onboarding plans here.')}</div>
            </div>
          ) : (
            plans.map((plan) => {
              const draft = drafts[plan.planID] || { status: plan.status, progress: plan.progress ?? 0, note: plan.employeeNote || '' };
              const isCompleted = draft.status === 'Completed';
              
              return (
                <div key={plan.planID} style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', transition: 'all 0.3s', opacity: isCompleted ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ 
                        width: 48, height: 48, borderRadius: 14, background: isCompleted ? '#ECFDF5' : '#EEF2FF', 
                        display: 'grid', placeItems: 'center', color: isCompleted ? '#10B981' : '#4F46E5', border: `1px solid ${isCompleted ? '#D1FAE5' : '#E0E7FF'}`
                      }}>
                         <BookOpen size={22} />
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>{plan.title}</div>
                        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>
                          {t(plan.planType)} • {t('Target')}: {plan.targetDate || '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Badge label={getTargetWindowLabel(plan.targetDate, t)} color={getOnboardingTone(plan)} />
                    </div>
                  </div>

                  {Array.isArray(plan.checklistItems) && plan.checklistItems.length > 0 && (
                    <div style={{ marginBottom: 24, background: '#F8FAFC', padding: '20px', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>{t('Milestone Checklist')}</div>
                      <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, fontWeight: 600, display: 'grid', gap: 8 }}>
                        {plan.checklistItems.map((item, index) => <li key={`${plan.planID}-${index}`}>{item}</li>)}
                      </ul>
                    </div>
                  )}

                  {plan.notes && (
                    <div style={{ fontSize: 14, color: '#475569', fontWeight: 600, marginBottom: 24, lineHeight: 1.6 }}>
                      {plan.notes}
                    </div>
                  )}

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Completion Status')}</span>
                      <strong style={{ fontSize: 14, fontWeight: 900, color: '#4F46E5' }}>{draft.progress}%</strong>
                    </div>
                    <div style={{ height: 10, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${draft.progress}%`, height: '100%', background: '#4F46E5', borderRadius: 999, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24, padding: '20px', background: '#F8FAFC', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Current Status')}</label>
                      <select
                        value={draft.status}
                        onChange={(e) => setDraftField(plan.planID, 'status', e.target.value)}
                        style={{ width: '100%', padding: '0 16px', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', fontWeight: 800, color: '#1E293B', outline: 'none' }}
                      >
                        {['Not Started', 'In Progress', 'Completed', 'Blocked'].map((item) => (
                          <option key={item} value={item}>{t(item)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Update Progress %')}</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={draft.progress}
                        onChange={(e) => setDraftField(plan.planID, 'progress', e.target.value)}
                        style={{ width: '100%', height: 44 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 16 }}>
                    <Textarea
                      value={draft.note}
                      onChange={(e) => setDraftField(plan.planID, 'note', e.target.value)}
                      placeholder={t('Share blockers, accomplishments, or notes with your manager...')}
                      style={{ background: '#F8FAFC', border: '1.5px solid #F1F5F9', borderRadius: 16, padding: '16px', minHeight: 100, fontWeight: 600, color: '#1E293B', resize: 'vertical', width: '100%', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Btn 
                        onClick={() => handleUpdate(plan.planID)} 
                        disabled={savingId === plan.planID}
                        style={{ background: '#4F46E5', height: 48, borderRadius: 12, padding: '0 32px', fontWeight: 900, border: 'none', color: '#fff', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
                      >
                        {savingId === plan.planID ? t('Syncing...') : t('Sync Progress')}
                      </Btn>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar: Growth Playbook & Priority Queue */}
        <div style={{ display: 'grid', gap: 24, alignContent: 'start', position: 'sticky', top: 24 }}>
          {/* Priority Queue */}
          <div style={{ background: '#fff', borderRadius: 32, padding: '32px', border: '1.5px solid #F1F5F9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
             <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 24 }}>{t('Focus Queue')}</div>
             {onboardingFocusQueue.length === 0 ? (
               <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, textAlign: 'center', padding: '20px 0' }}>{t('No immediate focus items.')}</div>
             ) : (
               <div style={{ display: 'grid', gap: 16 }}>
                 {onboardingFocusQueue.map(plan => (
                   <div key={plan.planID} style={{ padding: '16px', borderRadius: 16, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                     <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{plan.title}</div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{Number(plan.progress || 0)}% {t('Complete')}</div>
                       <Badge label={t(plan.status)} color={getOnboardingTone(plan)} />
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* Supportive Playbook */}
          <div style={{ background: '#EEF2FF', borderRadius: 32, padding: '32px', border: '1.5px solid #E0E7FF', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.05)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Target size={20} style={{ color: '#4F46E5' }} />
                <div style={{ fontSize: 14, fontWeight: 900, color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Growth Playbook')}</div>
             </div>
             
             <div style={{ display: 'grid', gap: 16 }}>
                {onboardingPlaybook.map((play, idx) => (
                  <div key={idx} style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '1px solid #E0E7FF' }}>
                     <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>{play.title}</div>
                     <div style={{ fontSize: 13, color: '#475569', fontWeight: 600, lineHeight: 1.5 }}>{play.note}</div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
