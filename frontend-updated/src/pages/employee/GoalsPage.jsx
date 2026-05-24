import { useEffect, useMemo, useState } from 'react';
import { getMyGoals, updateMyGoalProgress } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Target, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  Crosshair,
  Compass
} from 'lucide-react';

const STATUS_COLORS = {
  'Not Started': 'gray',
  'In Progress': 'indigo',
  Completed: 'green',
  'On Hold': 'red',
};

const PRIORITY_COLORS = {
  High: 'red',
  Medium: 'orange',
  Low: 'gray',
};

const daysUntilDue = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
};

const getDueWindowLabel = (value, t) => {
  const days = daysUntilDue(value);
  if (!Number.isFinite(days)) return t('No due date');
  if (days < 0) return `${Math.abs(days)} ${t('days overdue')}`;
  if (days === 0) return t('Due today');
  if (days === 1) return t('Due tomorrow');
  return `${days} ${t('days left')}`;
};

const getGoalTone = (goal) => {
  if (goal?.status === 'On Hold') return 'red';
  if (goal?.status === 'Completed') return 'green';
  if (goal?.priority === 'High' || daysUntilDue(goal?.dueDate) <= 7) return 'orange';
  return 'indigo';
};

export function EmployeeGoalsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const loadGoals = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyGoals(user.employee_id);
      const list = Array.isArray(data) ? data : [];
      setGoals(list);
      const nextDrafts = {};
      list.forEach((goal) => {
        nextDrafts[goal.goalID] = { status: goal.status, progress: goal.progress ?? 0 };
      });
      setDrafts(nextDrafts);
    } catch (error) {
      toast(error.message || 'Failed to load goals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [user?.employee_id]);

  const stats = useMemo(() => ({
    total: goals.length,
    inProgress: goals.filter((goal) => goal.status === 'In Progress').length,
    completed: goals.filter((goal) => goal.status === 'Completed').length,
  }), [goals]);

  const completionMomentum = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const dueSoonCount = goals.filter((goal) => goal.status !== 'Completed' && daysUntilDue(goal.dueDate) <= 7).length;
  const blockedCount = goals.filter((goal) => goal.status === 'On Hold').length;
  const highPriorityOpenCount = goals.filter((goal) => goal.priority === 'High' && goal.status !== 'Completed').length;

  const goalFocusQueue = useMemo(() => {
    const statusRank = { 'On Hold': 4, 'Not Started': 3, 'In Progress': 2, Completed: 1 };
    const priorityRank = { High: 3, Medium: 2, Low: 1 };
    return [...goals]
      .filter((goal) => goal.status !== 'Completed')
      .sort((a, b) => (statusRank[b.status] || 0) - (statusRank[a.status] || 0)
        || (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)
        || daysUntilDue(a.dueDate) - daysUntilDue(b.dueDate)
        || Number(a.progress || 0) - Number(b.progress || 0))
      .slice(0, 4);
  }, [goals]);

  const goalPlaybook = useMemo(() => {
    const plays = [];
    if (blockedCount > 0) plays.push({ title: t('Unblock Paused Goals First'), note: t('Goals on hold usually need a quick decision or check-in to regain momentum.') });
    if (dueSoonCount > 0) plays.push({ title: t('Protect Upcoming Deadlines'), note: t('Goals due soon should get a quick progress update to keep visibility high.') });
    if (highPriorityOpenCount > 0) plays.push({ title: t('Focus on High Priority'), note: t('The highest-impact goals are the best place to focus your time today.') });
    if (completionMomentum < 60 && stats.total > 0) plays.push({ title: t('Use Quick Updates'), note: t('A small check-in helps your goal board stay visible and active.') });
    return plays.length ? plays.slice(0, 4) : [{ title: t('Goals are Moving Well'), note: t('Keep the current update rhythm. Great work on your objectives!') }];
  }, [blockedCount, completionMomentum, dueSoonCount, highPriorityOpenCount, stats.total, t]);

  const strongestSignal = blockedCount > 0
    ? t('One or more goals are on hold. Unblocking them will create the biggest momentum boost.')
    : dueSoonCount > 0
      ? t('A few goals are approaching their due dates. Ensure final progress is logged.')
      : highPriorityOpenCount > 0
        ? t('High priority goals are active. Focus your energy on these critical outcomes.')
        : t('Goal momentum looks steady right now. Continue your excellent execution pace!');

  const setDraftField = (goalID, key, value) => {
    setDrafts((prev) => ({ ...prev, [goalID]: { ...(prev[goalID] || {}), [key]: value } }));
  };

  const handleUpdate = async (goalID) => {
    const draft = drafts[goalID];
    if (!draft) return;
    setSavingId(goalID);
    try {
      await updateMyGoalProgress(goalID, { status: draft.status, progress: Number(draft.progress || 0) });
      toast('Goal sync successful', 'success');
      await loadGoals();
    } catch (error) {
      toast(error.message || 'Failed to update goal', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid #E0E7FF', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING GOALS...</div>
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
                 <Crosshair size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{t('My Objectives')}</h1>
           </div>
           <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('Track your strategic performance goals and synchronize your completion momentum.')}</p>
        </div>
      </div>

      {/* Goal Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F8FAFC', color: '#1E293B', display: 'grid', placeItems: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Active Goals')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.total - stats.completed}</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EEF2FF', color: '#4F46E5', display: 'grid', placeItems: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Momentum')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{completionMomentum}%</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEF2F2', color: '#EF4444', display: 'grid', placeItems: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('High Priority')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{highPriorityOpenCount}</div>
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
        {/* Goals Ledger */}
        <div style={{ display: 'grid', gap: 24 }}>
          {goals.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 32, padding: '60px 40px', textAlign: 'center', border: '1.5px dashed #E2E8F0' }}>
               <Sparkles size={48} style={{ color: '#E2E8F0', margin: '0 auto 16px' }} />
               <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>{t('No Goals Assigned')}</div>
               <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('Your manager can assign strategic goals here.')}</div>
            </div>
          ) : (
            goals.map((goal) => {
              const draft = drafts[goal.goalID] || { status: goal.status, progress: goal.progress ?? 0 };
              const isCompleted = goal.status === 'Completed';
              
              return (
                <div key={goal.goalID} style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', transition: 'all 0.3s', opacity: isCompleted ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <Badge label={t(goal.priority)} color={PRIORITY_COLORS[goal.priority] || 'gray'} />
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>ID: {goal.goalID}</span>
                      </div>
                      <h4 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: '#1E293B', textDecoration: isCompleted ? 'line-through' : 'none' }}>{goal.title}</h4>
                      <div style={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>
                        {t(goal.category)}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                       <Badge label={t(goal.status)} color={STATUS_COLORS[goal.status] || 'gray'} />
                       <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{getDueWindowLabel(goal.dueDate, t)}</span>
                    </div>
                  </div>

                  {goal.description && (
                    <div style={{ fontSize: 14, color: '#475569', fontWeight: 600, marginBottom: 24, lineHeight: 1.6 }}>
                      {goal.description}
                    </div>
                  )}

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Goal Momentum')}</span>
                      <strong style={{ fontSize: 14, fontWeight: 900, color: '#4F46E5' }}>{draft.progress}%</strong>
                    </div>
                    <div style={{ height: 10, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${draft.progress}%`, height: '100%', background: '#4F46E5', borderRadius: 999, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24, padding: '20px', background: '#F8FAFC', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Status')}</label>
                      <select
                        value={draft.status}
                        onChange={(e) => setDraftField(goal.goalID, 'status', e.target.value)}
                        disabled={isCompleted}
                        style={{ width: '100%', padding: '0 16px', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', fontWeight: 800, color: '#1E293B', outline: 'none' }}
                      >
                        {['Not Started', 'In Progress', 'Completed', 'On Hold'].map((item) => (
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
                        onChange={(e) => setDraftField(goal.goalID, 'progress', e.target.value)}
                        disabled={isCompleted}
                        style={{ width: '100%', height: 44 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Btn 
                      onClick={() => handleUpdate(goal.goalID)} 
                      disabled={savingId === goal.goalID || isCompleted}
                      style={{ background: isCompleted ? '#F1F5F9' : '#4F46E5', height: 48, borderRadius: 12, padding: '0 32px', fontWeight: 900, border: 'none', color: isCompleted ? '#94A3B8' : '#fff', boxShadow: isCompleted ? 'none' : '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
                    >
                      {savingId === goal.goalID ? t('Syncing...') : isCompleted ? t('Archived') : t('Sync Momentum')}
                    </Btn>
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
             <div style={{ padding: '16px', background: '#FFFBEB', borderRadius: 16, border: '1px solid #FEF3C7', marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: '#92400E', fontWeight: 600, lineHeight: 1.5 }}>{strongestSignal}</div>
             </div>

             {goalFocusQueue.length === 0 ? (
               <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, textAlign: 'center', padding: '10px 0' }}>{t('No immediate focus items.')}</div>
             ) : (
               <div style={{ display: 'grid', gap: 16 }}>
                 {goalFocusQueue.map(goal => (
                   <div key={goal.goalID} style={{ padding: '16px', borderRadius: 16, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                     <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{goal.title}</div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{Number(goal.progress || 0)}% {t('Complete')}</div>
                       <Badge label={t(goal.status)} color={getGoalTone(goal)} />
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* Supportive Playbook */}
          <div style={{ background: '#EEF2FF', borderRadius: 32, padding: '32px', border: '1.5px solid #E0E7FF', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.05)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Compass size={20} style={{ color: '#4F46E5' }} />
                <div style={{ fontSize: 14, fontWeight: 900, color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Goal Playbook')}</div>
             </div>
             
             <div style={{ display: 'grid', gap: 16 }}>
                {goalPlaybook.map((play, idx) => (
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
