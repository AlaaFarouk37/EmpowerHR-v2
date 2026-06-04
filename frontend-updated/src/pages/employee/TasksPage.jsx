import { useEffect, useMemo, useState } from 'react';
import { getMyTasks, updateMyTaskProgress, markMyTaskDone, startMyTaskLog, endMyTaskLog } from '../../api/index.js';
import { Badge, Btn, Modal, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  CheckSquare,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  ListTodo,
  Play,
  Square,
  Send,
  MessageSquare
} from 'lucide-react';

const STATUS_COLORS = {
  'To Do': 'gray',
  'In Progress': 'indigo',
  'Pending Review': 'yellow',
  Done: 'green',
  Blocked: 'red',
  Completed: 'green',
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

const getTaskTone = (task) => {
  if (task?.status === 'Blocked') return 'red';
  if (task?.status === 'Done' || task?.status === 'Completed') return 'green';
  if (task?.priority === 'High' || daysUntilDue(task?.dueDate) <= 3) return 'orange';
  return 'indigo';
};

export function EmployeeTasksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});

  const loadTasks = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyTasks(user.employee_id);
      const list = Array.isArray(data) ? data : [];
      setTasks(list);
      const nextDrafts = {};
      list.forEach((task) => {
        nextDrafts[task.taskID] = {
          status: task.status,
          progress: task.progress ?? 0,
        };
      });
      setDrafts(nextDrafts);
    } catch (error) {
      toast(error.message || 'Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user?.employee_id]);

  const isInactive = (task) => task.status === 'Done' || task.status === 'Completed' || task.status === 'Pending Review';

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'Done' || task.status === 'Completed').length;
    const highPriority = tasks.filter((task) => task.priority === 'High' && !isInactive(task)).length;
    return {
      total,
      completed,
      highPriority,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      active: tasks.filter((task) => task.status === 'In Progress').length,
    };
  }, [tasks]);

  const blockedCount = tasks.filter((task) => task.status === 'Blocked').length;
  const dueSoonCount = tasks.filter((task) => !isInactive(task) && daysUntilDue(task.dueDate) <= 3).length;
  const quickWinCount = tasks.filter((task) => !isInactive(task) && Number(task.estimatedHours || 0) > 0 && Number(task.estimatedHours || 0) <= 2).length;

  const taskFocusQueue = useMemo(() => {
    const statusRank = { Blocked: 4, 'To Do': 3, 'In Progress': 2, 'Pending Review': 0, Done: 0, Completed: 0 };
    const priorityRank = { High: 3, Medium: 2, Low: 1 };

    return [...tasks]
      .filter((task) => !isInactive(task))
      .sort((a, b) => (statusRank[b.status] || 0) - (statusRank[a.status] || 0)
        || (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0)
        || daysUntilDue(a.dueDate) - daysUntilDue(b.dueDate)
        || Number(a.progress || 0) - Number(b.progress || 0))
      .slice(0, 4);
  }, [tasks]);

  const taskPlaybook = useMemo(() => {
    const plays = [];
    if (blockedCount > 0) plays.push({ title: t('Clear Blockers First'), note: t('Blocked work needs a decision or dependency removed before progress can restart.') });
    if (dueSoonCount > 0) plays.push({ title: t('Protect Near Deadlines'), note: t('Tasks due in the next few days should get a quick update before they become overdue.') });
    if (stats.highPriority > 0) plays.push({ title: t('Focus on Impact'), note: t('High-priority tasks are the best place to spend concentrated effort this week.') });
    if (quickWinCount > 0) plays.push({ title: t('Build Momentum'), note: t('Quick wins help reduce your queue and create visible progress fast.') });

    return plays.length ? plays.slice(0, 4) : [{
      title: t('Task Flow is Steady'),
      note: t('Your current workload is balanced. Keep updating progress as you close items out!'),
    }];
  }, [blockedCount, dueSoonCount, stats.highPriority, quickWinCount, t]);

  const strongestSignal = useMemo(() => {
    if (blockedCount > 0) return t('One or more tasks are blocked right now. Removing those blockers will create the biggest progress lift.');
    if (dueSoonCount > 0) return t('A few tasks are approaching their deadlines. Focused follow-through now will protect your delivery.');
    if (stats.highPriority > 0) return t('Your high-priority work is still active, making it the best place to focus next.');
    return t('Task execution looks steady right now, with work generally moving in a healthy rhythm.');
  }, [blockedCount, dueSoonCount, stats.highPriority, t]);

  const setDraftField = (taskID, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [taskID]: {
        ...prev[taskID],
        [key]: value,
      },
    }));
  };

  const handleUpdate = async (taskID) => {
    const draft = drafts[taskID];
    if (!draft) return;
    setSavingId(taskID);
    try {
      if (draft.status === 'Done' || draft.status === 'Completed') {
        await markMyTaskDone(taskID);
        toast(t('Submitted for Team Leader review.'), 'success');
      } else {
        await updateMyTaskProgress(taskID, {
          status: draft.status,
          progress: Number(draft.progress),
        });
        toast(t('Task synced successfully'), 'success');
      }
      await loadTasks();
    } catch (error) {
      toast(error.message || 'Failed to update task', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleStart = async (taskID) => {
    setSavingId(taskID);
    try {
      await startMyTaskLog(taskID, {});
      toast(t('Started a new work session.'), 'success');
      await loadTasks();
    } catch (error) {
      toast(error?.data?.error || error.message || t('Failed to start session'), 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleEnd = async (taskID) => {
    setSavingId(taskID);
    try {
      await endMyTaskLog(taskID, {});
      toast(t('Session ended and logged.'), 'success');
      await loadTasks();
    } catch (error) {
      toast(error?.data?.error || error.message || t('Failed to end session'), 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleFinish = async (taskID) => {
    setSavingId(taskID);
    try {
      await markMyTaskDone(taskID);
      toast(t('Submitted for Team Leader review.'), 'success');
      await loadTasks();
    } catch (error) {
      toast(error.message || t('Failed to submit task'), 'error');
    } finally {
      setSavingId(null);
    }
  };

  const [notesModal, setNotesModal] = useState({ open: false, task: null });

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid #E0E7FF', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING TASKS...</div>
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
                 <CheckSquare size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{t('My Tasks')}</h1>
           </div>
           <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('Manage your daily workload, update task progress, and track your deliverables.')}</p>
        </div>
      </div>

      {/* Task Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F8FAFC', color: '#1E293B', display: 'grid', placeItems: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Active Operations')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.total - stats.completed}</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EEF2FF', color: '#4F46E5', display: 'grid', placeItems: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Network Progress')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.progress}%</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEF2F2', color: '#EF4444', display: 'grid', placeItems: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Critical Nodes')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.highPriority}</div>
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
        {/* Task Queue Ledger */}
        <div style={{ display: 'grid', gap: 24 }}>
          {tasks.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 32, padding: '60px 40px', textAlign: 'center', border: '1.5px dashed #E2E8F0' }}>
               <Sparkles size={48} style={{ color: '#E2E8F0', margin: '0 auto 16px' }} />
               <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>{t('Task List is Clear')}</div>
               <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('New tasks assigned to you will appear here.')}</div>
            </div>
          ) : (
            tasks.map((task) => {
              const draft = drafts[task.taskID] || { status: task.status, progress: task.progress ?? 0 };
              const isPendingReview = task.status === 'Pending Review';
              const isArchived = task.status === 'Done' || task.status === 'Completed';
              const isLocked = isPendingReview || isArchived;
              const hasOpenLog = Array.isArray(task.logs) && task.logs.some(l => !l.end_time);
              const hasReviewNote = Boolean(task.reviewNote && task.reviewNote.trim()) && !isPendingReview && !isArchived;
              const busy = savingId === task.taskID;

              return (
                <div key={task.taskID} style={{ background: '#fff', borderRadius: 32, border: hasReviewNote ? '2px solid #FDE68A' : '1.5px solid #F1F5F9', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', transition: 'all 0.3s', opacity: isLocked ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <Badge label={t(task.priority)} color={PRIORITY_COLORS[task.priority] || 'gray'} />
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>ID: {task.taskID}</span>
                      </div>
                      <h4 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, color: '#1E293B', textDecoration: isArchived ? 'line-through' : 'none' }}>{task.title}</h4>
                      <p style={{ fontSize: 14, color: '#475569', fontWeight: 600, lineHeight: 1.6 }}>{task.description}</p>
                    </div>
                    <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                       <Badge label={t(task.status)} color={STATUS_COLORS[task.status] || 'gray'} />
                       <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{getDueWindowLabel(task.dueDate, t)}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Sync Completion')}</span>
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
                        onChange={(e) => setDraftField(task.taskID, 'status', e.target.value)}
                        disabled={isLocked}
                        style={{ width: '100%', padding: '0 16px', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff', fontWeight: 800, color: '#1E293B', outline: 'none' }}
                      >
                        {['To Do', 'In Progress', 'Done', 'Blocked'].map((item) => (
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
                        onChange={(e) => setDraftField(task.taskID, 'progress', e.target.value)}
                        disabled={isLocked}
                        style={{ width: '100%', height: 44 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {!isLocked && (hasOpenLog ? (
                        <Btn
                          onClick={() => handleEnd(task.taskID)}
                          disabled={busy}
                          style={{ background: '#DC2626', color: '#fff', height: 44, borderRadius: 10, padding: '0 18px', fontWeight: 900, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        >
                          <Square size={14} fill="#fff" /> {busy ? t('Saving...') : t('End Progress')}
                        </Btn>
                      ) : (
                        <Btn
                          onClick={() => handleStart(task.taskID)}
                          disabled={busy}
                          style={{ background: '#059669', color: '#fff', height: 44, borderRadius: 10, padding: '0 18px', fontWeight: 900, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        >
                          <Play size={14} fill="#fff" /> {busy ? t('Saving...') : (task.start_time ? t('Log Progress') : t('Start'))}
                        </Btn>
                      ))}
                      {hasReviewNote && (
                        <Btn
                          onClick={() => setNotesModal({ open: true, task })}
                          style={{ background: '#FFFBEB', color: '#92400E', border: '1.5px solid #FDE68A', height: 44, borderRadius: 10, padding: '0 16px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        >
                          <MessageSquare size={14} /> {t('Check Notes')}
                        </Btn>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Btn
                        onClick={() => handleUpdate(task.taskID)}
                        disabled={busy || isLocked}
                        style={{ background: isLocked ? '#F1F5F9' : '#4F46E5', height: 44, borderRadius: 10, padding: '0 20px', fontWeight: 900, border: 'none', color: isLocked ? '#94A3B8' : '#fff' }}
                      >
                        {busy ? t('Syncing...') : isArchived ? t('Archived') : isPendingReview ? t('Awaiting TL review') : t('Sync Progress')}
                      </Btn>
                      <Btn
                        onClick={() => handleFinish(task.taskID)}
                        disabled={busy || isLocked || hasOpenLog}
                        title={hasOpenLog ? t('End your current session before finishing the task.') : ''}
                        style={{ background: isLocked || hasOpenLog ? '#F1F5F9' : '#111827', color: isLocked || hasOpenLog ? '#94A3B8' : '#fff', height: 44, borderRadius: 10, padding: '0 20px', fontWeight: 900, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      >
                        <Send size={14} /> {t('Finish')}
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
             {taskFocusQueue.length === 0 ? (
               <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, textAlign: 'center', padding: '20px 0' }}>{t('No immediate focus items.')}</div>
             ) : (
               <div style={{ display: 'grid', gap: 16 }}>
                 {taskFocusQueue.map(task => (
                   <div key={task.taskID} style={{ padding: '16px', borderRadius: 16, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                     <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{task.title}</div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{Number(task.progress || 0)}% {t('Complete')}</div>
                       <Badge label={t(task.status)} color={getTaskTone(task)} />
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
                <div style={{ fontSize: 14, fontWeight: 900, color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Task Playbook')}</div>
             </div>
             
             <div style={{ display: 'grid', gap: 16 }}>
                {taskPlaybook.map((play, idx) => (
                  <div key={idx} style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '1px solid #E0E7FF' }}>
                     <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>{play.title}</div>
                     <div style={{ fontSize: 13, color: '#475569', fontWeight: 600, lineHeight: 1.5 }}>{play.note}</div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <Modal
        open={notesModal.open}
        onClose={() => setNotesModal({ open: false, task: null })}
        title={notesModal.task ? `${t('Notes from your Team Leader')}: ${notesModal.task.title}` : t('Notes from your Team Leader')}
        maxWidth={520}
      >
        {notesModal.task && (
          <div style={{ display: 'grid', gap: 14, padding: 8 }}>
            <div style={{ padding: '14px 16px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, color: '#78350F', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {notesModal.task.reviewNote}
            </div>
            {notesModal.task.reviewedAt && (
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>
                {t('Returned on')} {String(notesModal.task.reviewedAt).slice(0, 16).replace('T', ' ')}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <Btn onClick={() => setNotesModal({ open: false, task: null })} style={{ height: 44, borderRadius: 12, padding: '0 20px', fontWeight: 800, background: '#111827', color: '#fff', border: 'none' }}>
                {t('Got it')}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
