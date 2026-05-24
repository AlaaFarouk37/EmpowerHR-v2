import { useEffect, useMemo, useState } from 'react';
import {
  createTeamGoal,
  getTeamGoals,
  updateTeamGoal,
  createTeamTask,
  getTeamTasks,
  updateTeamTask,
} from '../../api/index.js';
import { Badge, Btn, EmployeeSelect, Input, LeaderPortalLayout, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Target, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Activity,
  Briefcase,
  Plus
} from 'lucide-react';

const EMPTY_GOAL_FORM = {
  employeeID: '',
  title: '',
  description: '',
  category: 'Performance',
  priority: 'Medium',
  status: 'Not Started',
  progress: 0,
  dueDate: '',
};

const EMPTY_TASK_FORM = {
  employeeID: '',
  title: '',
  description: '',
  priority: 'Medium',
  status: 'To Do',
  progress: 0,
  estimatedHours: 1,
  dueDate: '',
};

const GOAL_STATUS_COLORS = {
  'Not Started': 'gray',
  'In Progress': 'orange',
  Completed: 'green',
  'On Hold': 'red',
};

const TASK_STATUS_COLORS = {
  'To Do': 'gray',
  'In Progress': 'orange',
  Done: 'green',
  Blocked: 'red',
};

const PRIORITY_COLORS = {
  Low: 'gray',
  Medium: 'accent',
  High: 'red',
};

export function TeamGoalsPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [savingGoalId, setSavingGoalId] = useState(null);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusFilter, setFocusFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalData, taskData] = await Promise.all([getTeamGoals(), getTeamTasks()]);
      setGoals(Array.isArray(goalData) ? goalData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
    } catch (error) {
      toast(error.message || 'Failed to load team workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const weekAheadKey = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const stats = useMemo(() => ({
    totalGoals: goals.length,
    openTasks: tasks.filter((task) => task.status !== 'Done').length,
    inProgress: goals.filter((goal) => goal.status === 'In Progress').length + tasks.filter((task) => task.status === 'In Progress').length,
    completed: goals.filter((goal) => goal.status === 'Completed').length + tasks.filter((task) => task.status === 'Done').length,
    overdueItems:
      goals.filter((goal) => goal.status !== 'Completed' && goal.dueDate && goal.dueDate < todayKey).length +
      tasks.filter((task) => task.status !== 'Done' && task.dueDate && task.dueDate < todayKey).length,
    blockedItems:
      goals.filter((goal) => goal.status === 'On Hold').length +
      tasks.filter((task) => task.status === 'Blocked').length,
    highPriority:
      goals.filter((goal) => goal.priority === 'High' && goal.status !== 'Completed').length +
      tasks.filter((task) => task.priority === 'High' && task.status !== 'Done').length,
  }), [goals, tasks, todayKey]);

  const filteredGoals = useMemo(
    () => goals.filter((goal) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = !normalizedSearch || [goal.title, goal.employeeName, goal.employeeID].some(v => String(v).toLowerCase().includes(normalizedSearch));
      const matchesFocus = focusFilter === 'all' || (focusFilter === 'overdue' && goal.dueDate < todayKey && goal.status !== 'Completed');
      return matchesSearch && matchesFocus;
    }),
    [goals, searchTerm, focusFilter, todayKey]
  );

  const filteredTasks = useMemo(
    () => tasks.filter((task) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = !normalizedSearch || [task.title, task.employeeName, task.employeeID].some(v => String(v).toLowerCase().includes(normalizedSearch));
      const matchesFocus = focusFilter === 'all' || (focusFilter === 'overdue' && task.dueDate < todayKey && task.status !== 'Done');
      return matchesSearch && matchesFocus;
    }),
    [tasks, searchTerm, focusFilter, todayKey]
  );

  const leaderFocusItems = useMemo(() => {
    const goalItems = goals
      .filter((goal) => goal.status !== 'Completed')
      .map((goal) => ({
        id: `goal-${goal.goalID}`,
        kind: 'goal',
        title: goal.title,
        employeeName: goal.employeeName || goal.employeeID,
        dueDate: goal.dueDate,
        priority: goal.priority,
        overdue: Boolean(goal.dueDate) && goal.dueDate < todayKey
      }));

    const taskItems = tasks
      .filter((task) => task.status !== 'Done')
      .map((task) => ({
        id: `task-${task.taskID}`,
        kind: 'task',
        title: task.title,
        employeeName: task.employeeName || task.employeeID,
        dueDate: task.dueDate,
        priority: task.priority,
        overdue: Boolean(task.dueDate) && task.dueDate < todayKey
      }));

    return [...goalItems, ...taskItems].slice(0, 5);
  }, [goals, tasks, todayKey]);

  const coachingRows = useMemo(() => {
    // Derived coaching triage
    const triage = new Map();
    [...goals, ...tasks].forEach(item => {
      if (item.status === 'Completed' || item.status === 'Done') return;
      const key = item.employeeID || item.employeeName;
      const current = triage.get(key) || { name: key, open: 0, overdue: 0, progress: 0, count: 0 };
      current.open += 1;
      if (item.dueDate < todayKey) current.overdue += 1;
      current.progress += Number(item.progress || 0);
      current.count += 1;
      triage.set(key, current);
    });
    return Array.from(triage.values()).map(r => ({
      ...r,
      avgProgress: Math.round(r.progress / r.count),
      status: r.overdue > 0 ? 'Action Required' : 'On Track'
    })).sort((a, b) => b.overdue - a.overdue).slice(0, 5);
  }, [goals, tasks, todayKey]);

  const handleCreateGoal = async () => {
    if (!goalForm.employeeID.trim() || !goalForm.title.trim()) {
      toast('Employee ID and goal title are required.', 'error');
      return;
    }
    setGoalSubmitting(true);
    try {
      await createTeamGoal(goalForm);
      toast('Goal successfully deployed to the neural grid');
      setGoalForm(EMPTY_GOAL_FORM);
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to deploy goal', 'error');
    } finally {
      setGoalSubmitting(false);
    }
  };

  const handleCompleteGoal = async (goal) => {
    setSavingGoalId(goal.goalID);
    try {
      await updateTeamGoal(goal.goalID, { ...goal, status: 'Completed', progress: 100 });
      toast('Goal finalized successfully');
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to update goal', 'error');
    } finally {
      setSavingGoalId(null);
    }
  };

  const handleCompleteTask = async (task) => {
    setSavingTaskId(task.taskID);
    try {
      await updateTeamTask(task.taskID, { ...task, status: 'Done', progress: 100 });
      toast('Task solved successfully');
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to update task', 'error');
    } finally {
      setSavingTaskId(null);
    }
  };

  if (loading || authLoading) {
    return (
      <LeaderPortalLayout>
        <div style={{ padding: 60, textAlign: 'center' }}><Spinner /></div>
      </LeaderPortalLayout>
    );
  }

  return (
    <LeaderPortalLayout>
      <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 40, alignItems: 'start' }}>
        {/* Left Pane: Velocity Command */}
        <div style={{ display: 'grid', gap: 40 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                 <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0 }}>Strategic Velocity Hub</h2>
                 <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>Command and control center for team deliverables and strategic alignment.</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                 <Badge label={t('Live Updates')} color="red" />
              </div>
           </div>

           {/* Telemetry Chips */}
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
             {[
               { label: t('Strategic Goals'), value: stats.totalGoals, icon: Target, color: '#1E293B', bg: '#F8FAFC' },
               { label: t('Open Tasks'), value: stats.openTasks, icon: Zap, color: 'var(--red-600)', bg: 'var(--red-50)' },
               { label: t('Overdue Nodes'), value: stats.overdueItems, icon: AlertCircle, color: 'var(--red-800)', bg: 'var(--red-50)' },
               { label: t('Velocity Score'), value: '94%', icon: Activity, color: 'var(--pink-500)', bg: 'var(--pink-50)' },
             ].map((card) => (
               <div key={card.label} style={{ background: card.bg, borderRadius: 24, padding: 24, border: '1.5px solid #F1F5F9' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1px solid #E2E8F0', display: 'grid', placeItems: 'center' }}>
                       <card.icon size={16} style={{ color: card.color }} />
                    </div>
                 </div>
                 <div style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</div>
                 <div style={{ fontSize: 24, fontWeight: 900, color: card.color, marginTop: 4 }}>{card.value}</div>
               </div>
             ))}
           </div>

           {/* Goal Tracker */}
           <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
             <div style={{ padding: '24px 32px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
               <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target size={18} style={{ color: 'var(--red-600)' }} />
                  {t('Strategic Goal Ledger')}
               </h3>
               <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Filter goals..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 12, fontWeight: 600, outline: 'none' }}
                  />
               </div>
             </div>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ borderBottom: '1.5px solid #F1F5F9' }}>
                   {['Node', 'Objective', 'Deadline', 'Progress', 'Action'].map((h) => (
                     <th key={h} style={{ textAlign: 'left', padding: '16px 32px', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>{t(h)}</th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {filteredGoals.map((goal) => (
                   <tr key={goal.goalID} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                     <td style={{ padding: '20px 32px' }}>
                       <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>{goal.employeeName || goal.employeeID}</div>
                     </td>
                     <td style={{ padding: '20px 32px' }}>
                       <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>{goal.title}</div>
                       <Badge label={t(goal.category)} style={{ background: '#F1F5F9', border: 'none', color: '#64748B', fontSize: 9, marginTop: 6 }} />
                     </td>
                     <td style={{ padding: '20px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: goal.dueDate < todayKey ? 'var(--red-600)' : '#64748B', fontSize: 13, fontWeight: 700 }}>
                           <Clock size={14} />
                           {goal.dueDate || '—'}
                        </div>
                     </td>
                     <td style={{ padding: '20px 32px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div style={{ width: 80, height: 6, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
                           <div style={{ width: `${goal.progress}%`, height: '100%', background: 'var(--red-600)' }} />
                         </div>
                         <span style={{ fontSize: 12, fontWeight: 900, color: '#1E293B' }}>{goal.progress}%</span>
                       </div>
                     </td>
                     <td style={{ padding: '20px 32px' }}>
                       {goal.status !== 'Completed' && (
                         <Btn size="sm" variant="ghost" onClick={() => handleCompleteGoal(goal)} style={{ fontWeight: 800, fontSize: 11 }}>{t('Finalize')}</Btn>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {/* Task Velocity Ledger */}
           <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden' }}>
             <div style={{ padding: '24px 32px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
               <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Zap size={18} style={{ color: 'var(--red-600)' }} />
                  {t('Task Velocity Ledger')}
               </h3>
               <Badge label={`${filteredTasks.length} ${t('Active')}`} color="accent" />
             </div>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ borderBottom: '1.5px solid #F1F5F9' }}>
                   {['Node', 'Tactical Task', 'Priority', 'Status', 'Action'].map((h) => (
                     <th key={h} style={{ textAlign: 'left', padding: '16px 32px', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>{t(h)}</th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {filteredTasks.map((task) => (
                   <tr key={task.taskID} style={{ borderBottom: '1px solid #F1F5F9' }}>
                     <td style={{ padding: '20px 32px' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>{task.employeeName || task.employeeID}</div>
                     </td>
                     <td style={{ padding: '20px 32px' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B' }}>{task.title}</div>
                     </td>
                     <td style={{ padding: '20px 32px' }}>
                        <Badge label={t(task.priority)} color={task.priority === 'High' ? 'red' : 'accent'} style={{ fontSize: 10 }} />
                     </td>
                     <td style={{ padding: '20px 32px' }}>
                        <Badge label={t(task.status)} color={task.status === 'Blocked' ? 'red' : 'gray'} style={{ fontSize: 10 }} />
                     </td>
                     <td style={{ padding: '20px 32px' }}>
                       {task.status !== 'Done' && (
                         <Btn size="sm" variant="ghost" onClick={() => handleCompleteTask(task)} style={{ fontWeight: 800, fontSize: 11 }}>{t('Solve')}</Btn>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>

           {/* Deployment Form */}
           <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                 <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-50)', display: 'grid', placeItems: 'center' }}>
                    <Plus size={20} style={{ color: 'var(--red-600)' }} />
                 </div>
                 <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>Initialize Strategic Asset</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                 <EmployeeSelect label={t('Select Node')} value={goalForm.employeeID} onChange={(v) => setGoalForm(f => ({ ...f, employeeID: v }))} />
                 <Input label={t('Asset Title')} value={goalForm.title} onChange={(e) => setGoalForm(f => ({ ...f, title: e.target.value }))} style={{ height: 52, borderRadius: 12 }} />
              </div>
              <Textarea label={t('Operational Context')} value={goalForm.description} onChange={(e) => setGoalForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: 100, borderRadius: 16 }} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
                 <Btn onClick={handleCreateGoal} style={{ height: 52, padding: '0 40px', background: '#111827', color: 'white', borderRadius: 14, fontWeight: 900, border: 'none' }}>
                    Deploy Strategic Asset
                 </Btn>
              </div>
           </div>
        </div>

        {/* Right Pane: Leadership Intelligence */}
        <div style={{ display: 'grid', gap: 32, position: 'sticky', top: 24 }}>
          {/* Coaching Intelligence */}
          <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: 32, padding: 32, color: 'white', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
               <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Coaching Intelligence</div>
               <Activity size={18} style={{ color: 'var(--red-600)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
               {[
                 { label: 'Coach Ready', val: coachingRows.length, icon: Users, color: 'var(--red-500)' },
                 { label: 'Avg Progress', val: `${stats.totalGoals ? Math.round((stats.completed/stats.totalGoals)*100) : 0}%`, icon: TrendingUp, color: 'var(--red-400)' },
               ].map(c => (
                 <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>{c.val}</div>
                 </div>
               ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16 }}>Triage Queue</div>
            <div style={{ display: 'grid', gap: 12 }}>
               {coachingRows.map(row => (
                 <div key={row.name} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                       <span style={{ fontWeight: 800, fontSize: 14 }}>{row.name}</span>
                       <Badge label={row.status} color={row.status === 'Action Required' ? 'red' : 'gray'} style={{ fontSize: 9 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
                       <span>{row.open} Active Items</span>
                       <span>{row.avgProgress}% Efficient</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* High Priority Focus */}
          <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>High Priority Focus</h4>
                <ShieldAlert size={18} style={{ color: 'var(--red-600)' }} />
             </div>
             <div style={{ display: 'grid', gap: 16 }}>
                {leaderFocusItems.map(item => (
                  <div key={item.id} style={{ padding: 20, background: '#F8FAFC', borderRadius: 24, border: '1px solid #F1F5F9' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B', lineHeight: 1.4 }}>{item.title}</div>
                        <Badge label={t(item.kind)} color={item.kind === 'goal' ? 'indigo' : 'accent'} style={{ fontSize: 9 }} />
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                        <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>{item.employeeName}</span>
                        <Btn size="sm" variant="ghost" style={{ fontSize: 10, fontWeight: 900 }}>{t('Follow-up')}</Btn>
                     </div>
                  </div>
                ))}
             </div>
             <Btn variant="secondary" style={{ width: '100%', marginTop: 24, height: 44, borderRadius: 12, fontSize: 12 }}>
                Open Focus Board
             </Btn>
          </div>
        </div>
      </div>
    </LeaderPortalLayout>
  );
}
