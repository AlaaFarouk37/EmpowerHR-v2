import { useEffect, useMemo, useState } from 'react';
import { getMyGoals, updateMyGoalProgress } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Target, TrendingUp, CheckCircle2, PauseCircle, UserCog } from 'lucide-react';

const STATUS_COLORS = {
  'Not Started': 'gray',
  'In Progress': 'indigo',
  Completed: 'green',
  'On Hold': 'orange',
};

const PRIORITY_COLORS = { High: 'red', Medium: 'orange', Low: 'gray' };

const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'On Hold'];

// Map the setter's account role to a friendly "who assigned this" label.
const SETTER_ROLE_LABELS = {
  TeamLeader: 'Team Leader',
  HRManager: 'HR',
  Admin: 'Admin',
};

const setterLabel = (goal, t) => {
  const role = SETTER_ROLE_LABELS[goal.createdByRole];
  const name = goal.createdBy;
  if (role && name) return `${t(role)} · ${name}`;
  if (role) return t(role);
  if (name) return name;
  return t('Manager');
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
      toast(error.message || t('Failed to load goals'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, [user?.employee_id]);

  const stats = useMemo(() => ({
    total: goals.length,
    inProgress: goals.filter((g) => g.status === 'In Progress').length,
    completed: goals.filter((g) => g.status === 'Completed').length,
    onHold: goals.filter((g) => g.status === 'On Hold').length,
  }), [goals]);

  const setDraftField = (goalID, key, value) => {
    setDrafts((prev) => ({ ...prev, [goalID]: { ...prev[goalID], [key]: value } }));
  };

  const handleSave = async (goalID) => {
    const draft = drafts[goalID];
    if (!draft) return;
    setSavingId(goalID);
    try {
      await updateMyGoalProgress(goalID, { status: draft.status, progress: Number(draft.progress) });
      toast(t('Goal updated'), 'success');
      await loadGoals();
    } catch (error) {
      toast(error.message || t('Failed to update goal'), 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return (
    <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
      <Spinner size={48} />
    </div>
  );

  const statCards = [
    { label: t('Total Goals'), value: stats.total, icon: Target, color: '#1E293B', bg: '#F8FAFC' },
    { label: t('In Progress'), value: stats.inProgress, icon: TrendingUp, color: '#4F46E5', bg: '#EEF2FF' },
    { label: t('Completed'), value: stats.completed, icon: CheckCircle2, color: '#059669', bg: '#ECFDF5' },
    { label: t('On Hold'), value: stats.onHold, icon: PauseCircle, color: '#EA580C', bg: '#FFF7ED' },
  ];

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: '#4F46E5', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)' }}>
          <Target size={22} style={{ color: '#fff' }} />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{t('My Goals')}</h1>
      </div>
      <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginBottom: 40 }}>
        {t('Goals assigned to you by your Team Leader and HR. Update your progress as you go.')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        {statCards.map((card) => (
          <div key={card.label} style={{ padding: 24, borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: card.bg, color: card.color, display: 'grid', placeItems: 'center' }}>
              <card.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {goals.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 32, padding: '60px 40px', textAlign: 'center', border: '1.5px dashed #E2E8F0' }}>
          <Target size={48} style={{ color: '#E2E8F0', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>{t('No goals yet')}</div>
          <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('Goals assigned to you by your Team Leader or HR will appear here.')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
          {goals.map((goal) => {
            const draft = drafts[goal.goalID] || { status: goal.status, progress: goal.progress ?? 0 };
            const busy = savingId === goal.goalID;
            return (
              <div key={goal.goalID} style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 28, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <Badge label={t(goal.status)} color={STATUS_COLORS[goal.status] || 'gray'} />
                  {goal.priority && <Badge label={t(goal.priority)} color={PRIORITY_COLORS[goal.priority] || 'gray'} />}
                  {goal.category && <Badge label={t(goal.category)} color="indigo" />}
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: '0 0 8px' }}>{goal.title}</h3>
                {goal.description && (
                  <p style={{ fontSize: 14, color: '#475569', fontWeight: 600, lineHeight: 1.6, margin: '0 0 16px' }}>{goal.description}</p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9', marginBottom: 16 }}>
                  <UserCog size={16} style={{ color: '#64748B', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Set by')}: </span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{setterLabel(goal, t)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 16 }}>
                  <span>{t('Due')}: {goal.dueDate || t('No due date')}</span>
                  <span>{t('Assigned')}: {goal.createdAt ? String(goal.createdAt).slice(0, 10) : '—'}</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Progress')}</span>
                    <strong style={{ fontSize: 14, fontWeight: 900, color: '#4F46E5' }}>{draft.progress}%</strong>
                  </div>
                  <div style={{ height: 10, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${draft.progress}%`, height: '100%', background: '#4F46E5', borderRadius: 999, transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>{t('Status')}</label>
                    <select
                      value={draft.status}
                      onChange={(e) => setDraftField(goal.goalID, 'status', e.target.value)}
                      style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', fontWeight: 800, color: '#1E293B', outline: 'none' }}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>{t('Update Progress %')}</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={draft.progress}
                      onChange={(e) => setDraftField(goal.goalID, 'progress', e.target.value)}
                      style={{ width: '100%', height: 42 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Btn
                    onClick={() => handleSave(goal.goalID)}
                    disabled={busy}
                    style={{ background: '#4F46E5', height: 42, borderRadius: 10, padding: '0 22px', fontWeight: 900, border: 'none', color: '#fff' }}
                  >
                    {busy ? t('Saving...') : t('Save Progress')}
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
