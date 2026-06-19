import { useEffect, useMemo, useState } from 'react';
import { getTeamGoals, getTeamTasks, hrGetTeamOptions, hrGetEmployees, hrGetWeeklyCapacity, getPublicHolidays, createTeamGoal, createTeamTask, updateTeamTask, approveTeamTask, returnTeamTaskWithNotes } from '../../api/index.js';
import { Badge, Btn, Input, Modal, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import ContactEmailModal from '../../components/shared/ContactEmailModal.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Calendar as CalendarIcon, Target, Zap, ChevronLeft, ChevronRight, Activity, Clock, Plus, Mail, CheckCircle2, MessageSquare } from 'lucide-react';

const STANDARD_WEEKLY_HOURS = 40;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const toDayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const weekNavBtn = { height: 32, minWidth: 32, borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', display: 'grid', placeItems: 'center' };
const fmtShort = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '');

export function HRTeamHubPage({ showTeamFilter = true } = {}) {
  const { t } = useLanguage();
  const toast = useToast();
  const { user } = useAuth();
  const isTL = user?.role === 'TeamLeader';
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [capacityByEmp, setCapacityByEmp] = useState({});
  const [capacityMeta, setCapacityMeta] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [holidaysByDate, setHolidaysByDate] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [calendarCursor, setCalendarCursor] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(toDayKey(new Date()));

  // Create-modal state — Goal
  const EMPTY_GOAL = { employeeID: '', title: '', description: '', category: 'Performance', priority: 'Medium', status: 'Not Started', progress: 0, dueDate: '' };
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [goalSaving, setGoalSaving] = useState(false);

  // Create-modal state — Task
  const EMPTY_TASK = { employeeID: '', title: '', description: '', priority: 'Medium', status: 'To Do', progress: 0, estimatedHours: 1, dueDate: '' };
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [taskSaving, setTaskSaving] = useState(false);

  // Edit-task state — a Team Leader editing a task they created.
  const [editTask, setEditTask] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Review / contact state (ported from frontend-old/src/pages/leader/TeamPage.jsx)
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [contactEmail, setContactEmail] = useState(null);
  const [noteModal, setNoteModal] = useState({ open: false, task: null, note: '' });

  // Convenience helper to open the create-task modal pre-filled with a due date.
  const openTaskModalForDate = (isoDate) => {
    setTaskForm({ ...EMPTY_TASK, employeeID: selectedMember || '', dueDate: isoDate || '' });
    setTaskModalOpen(true);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [goalData, taskData, teamData, employeeData] = await Promise.all([
          getTeamGoals().catch(() => []),
          getTeamTasks().catch(() => []),
          hrGetTeamOptions().catch(() => []),
          hrGetEmployees().catch(() => []),
        ]);
        if (!active) return;
        setGoals(Array.isArray(goalData) ? goalData : []);
        setTasks(Array.isArray(taskData) ? taskData : []);
        setTeams(Array.isArray(teamData) ? teamData : []);
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
      } catch (error) {
        if (active) toast(error?.message || t('Failed to load team hub'), 'error');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [t, toast]);

  // Weekly capacity is fetched separately so the week selector can re-query it
  // without reloading the whole page.
  useEffect(() => {
    let active = true;
    hrGetWeeklyCapacity(weekOffset).then(data => {
      if (!active) return;
      const map = {};
      (data?.employees || []).forEach(r => { map[r.employeeID] = r; });
      setCapacityByEmp(map);
      setCapacityMeta(data ? { weekStart: data.weekStart, weekEnd: data.weekEnd, holidayDays: data.holidayDays } : null);
    }).catch(() => {});
    return () => { active = false; };
  }, [weekOffset]);

  // Public holidays for the displayed calendar year (faded on the calendar grid).
  useEffect(() => {
    let active = true;
    getPublicHolidays(calendarCursor.getFullYear()).then(list => {
      if (!active) return;
      const map = {};
      (list || []).forEach(h => { map[h.date] = h.name; });
      setHolidaysByDate(map);
    }).catch(() => {});
    return () => { active = false; };
  }, [calendarCursor]);

  // Lightweight reloader for after create. Doesn't touch loading flag (modal stays open through any error).
  const reloadGoalsTasks = async () => {
    try {
      const [g, tk] = await Promise.all([getTeamGoals().catch(() => []), getTeamTasks().catch(() => [])]);
      setGoals(Array.isArray(g) ? g : []);
      setTasks(Array.isArray(tk) ? tk : []);
    } catch { /* ignore */ }
  };

  // Goal create — ported from frontend-old/src/pages/leader/TeamPage.jsx handleCreateGoal
  const handleCreateGoal = async () => {
    if (!goalForm.employeeID || !goalForm.title.trim()) {
      toast(t('Employee and goal title are required.'), 'error');
      return;
    }
    setGoalSaving(true);
    try {
      await createTeamGoal({
        ...goalForm,
        employeeID: String(goalForm.employeeID).trim(),
        progress: Number(goalForm.progress || 0),
      });
      toast(t('Goal created for team member'));
      setGoalForm(EMPTY_GOAL);
      setGoalModalOpen(false);
      await reloadGoalsTasks();
    } catch (e) {
      toast(e?.response?.data?.detail || e?.message || t('Failed to create team goal'), 'error');
    } finally {
      setGoalSaving(false);
    }
  };

  // Mark as Reviewed — TL finalizes a Pending Review task. Ported from frontend-old handleApproveTask.
  const handleApproveTask = async (task) => {
    if (!task?.taskID) return;
    setSavingTaskId(task.taskID);
    try {
      await approveTeamTask(task.taskID);
      toast(t('Task reviewed and marked Done.'), 'success');
      await reloadGoalsTasks();
    } catch (e) {
      toast(e?.message || t('Failed to review task'), 'error');
    } finally {
      setSavingTaskId(null);
    }
  };

  // Open the email modal pre-filled with the team member's address + a Re: <task title> subject.
  // Ported from frontend-old openContactModal.
  const submitReturnWithNotes = async () => {
    const { task, note } = noteModal;
    if (!task?.taskID) return;
    if (!note.trim()) { toast(t('Please add a short note before sending this task back.'), 'error'); return; }
    setSavingTaskId(task.taskID);
    try {
      await returnTeamTaskWithNotes(task.taskID, note.trim());
      toast(t('Sent back to the team member with your notes.'), 'success');
      setNoteModal({ open: false, task: null, note: '' });
      await reloadGoalsTasks();
    } catch (e) {
      toast(e?.data?.note?.[0] || e?.message || t('Failed to send notes'), 'error');
    } finally {
      setSavingTaskId(null);
    }
  };

  const openContactModalForTask = (task) => {
    const taskTitle = task?.title || '';
    const memberEmail = task?.employeeEmail || '';
    setContactEmail({
      to: memberEmail,
      subject: taskTitle ? `Re: ${taskTitle}` : '',
    });
  };

  // Task create — ported from frontend-old handleCreateTask
  const handleCreateTask = async () => {
    if (!taskForm.employeeID || !taskForm.title.trim() || !Number(taskForm.estimatedHours)) {
      toast(t('Employee, title, and estimated hours are required.'), 'error');
      return;
    }
    setTaskSaving(true);
    try {
      await createTeamTask({
        ...taskForm,
        employeeID: String(taskForm.employeeID).trim(),
        progress: Number(taskForm.progress || 0),
        estimatedHours: Number(taskForm.estimatedHours),
      });
      toast(t('Task assigned to team member'));
      setTaskForm(EMPTY_TASK);
      setTaskModalOpen(false);
      await reloadGoalsTasks();
    } catch (e) {
      toast(e?.response?.data?.detail || e?.message || t('Failed to assign task'), 'error');
    } finally {
      setTaskSaving(false);
    }
  };

  // A TL may edit only tasks they themselves created and assigned (assignedBy = them).
  const canEditTask = (task) => isTL && !!task?.assignedBy && (task.assignedBy === user?.full_name || task.assignedBy === user?.email);

  const openEditTask = (task) => {
    if (!canEditTask(task)) return;
    setEditTask(task);
    setEditForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'Medium',
      status: task.status || 'To Do',
      estimatedHours: task.estimatedHours ?? 1,
      dueDate: task.dueDate || '',
      progress: task.progress ?? 0,
    });
  };

  const handleUpdateTask = async () => {
    if (!editTask || !editForm) return;
    if (!editForm.title.trim() || !Number(editForm.estimatedHours)) {
      toast(t('Title and estimated hours are required.'), 'error');
      return;
    }
    setEditSaving(true);
    try {
      await updateTeamTask(editTask.taskID, {
        title: editForm.title.trim(),
        description: editForm.description,
        priority: editForm.priority,
        status: editForm.status,
        progress: Number(editForm.progress || 0),
        estimatedHours: Math.round(Number(editForm.estimatedHours)),
        dueDate: editForm.dueDate || null,
      });
      toast(t('Task updated'));
      setEditTask(null);
      setEditForm(null);
      await reloadGoalsTasks();
    } catch (e) {
      toast(e?.response?.data?.detail || e?.message || t('Failed to update task'), 'error');
    } finally {
      setEditSaving(false);
    }
  };

  // Team_id ↔ name. Goals/tasks serialize the team as a name string, not an id.
  const teamOptions = useMemo(() => (
    teams
      .map(team => ({ id: team?.team_id ?? team?.id, name: team?.name || team?.teamName }))
      .filter(t => t.id != null && t.name)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
  ), [teams]);

  const selectedTeamName = useMemo(() => {
    if (!selectedTeam) return '';
    const match = teamOptions.find(t => String(t.id) === String(selectedTeam));
    return match?.name || String(selectedTeam);
  }, [selectedTeam, teamOptions]);

  // Members visible for the member filter (everyone if no team picked; restricted otherwise)
  const memberOptions = useMemo(() => {
    const pool = selectedTeam
      ? employees.filter(e => String(e?.team) === String(selectedTeamName) || String(e?.team) === String(selectedTeam))
      : employees;
    return pool
      .filter(e => e?.employeeID || e?.fullName)
      .map(e => ({ id: e.employeeID, name: e.fullName || e.employeeID, team: e.team }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [employees, selectedTeam, selectedTeamName]);

  const matchesTeam = (item) => {
    if (!selectedTeam) return true;
    return String(item?.team || '') === String(selectedTeamName);
  };

  const matchesMember = (item) => {
    if (!selectedMember) return true;
    return String(item?.employeeID || '') === String(selectedMember);
  };

  const scopedGoals = useMemo(() => goals.filter(g => matchesTeam(g) && matchesMember(g)), [goals, selectedTeam, selectedMember, selectedTeamName]);
  const scopedTasks = useMemo(() => tasks.filter(tk => matchesTeam(tk) && matchesMember(tk)), [tasks, selectedTeam, selectedMember, selectedTeamName]);
  const pendingReviewTasks = useMemo(() => scopedTasks.filter(tk => tk.status === 'Pending Review'), [scopedTasks]);
  const otherTasks = useMemo(() => scopedTasks.filter(tk => tk.status !== 'Pending Review'), [scopedTasks]);

  // Per-member utilization cards. Build from scoped tasks so they reflect filters.
  const memberUtilization = useMemo(() => {
    // Team leaders are not tracked as utilization cards (a TL leads the team,
    // and shouldn't see their own card). Also drop the logged-in user's own card.
    const leaderIds = new Set((employees || []).filter(e => e?.role === 'TeamLeader').map(e => String(e.employeeID)));
    const selfId = String(user?.employee_id || '');
    // Utilization is week-scoped: only tasks whose due date falls inside the
    // selected week — the same range the capacity denominator is fetched for —
    // count toward a member's used hours. Tasks without a due date, or due
    // outside the week, are ignored. Falls back to all tasks until the week
    // range is known (capacity still loading / unavailable).
    const weekStart = capacityMeta?.weekStart;
    const weekEnd = capacityMeta?.weekEnd;
    const inSelectedWeek = (due) => {
      if (!weekStart || !weekEnd) return true;
      if (!due) return false;
      const key = String(due).slice(0, 10);
      return key >= weekStart && key <= weekEnd;
    };
    const today = new Date().toISOString().slice(0, 10);
    const byEmp = {};
    scopedTasks.forEach(task => {
      const id = task?.employeeID;
      if (!id || !inSelectedWeek(task.dueDate)) return;
      if (!byEmp[id]) {
        byEmp[id] = {
          employeeID: id,
          employeeName: task.employeeName || id,
          team: task.team || '—',
          estimatedHours: 0,
          contractedHours: Number(task.contractedHours ?? STANDARD_WEEKLY_HOURS),
          openTasks: 0,
          overdueTasks: 0,
          completedTasks: 0,
        };
      }
      byEmp[id].estimatedHours += Number(task.estimatedHours || 0);
      if (task.status === 'Done') byEmp[id].completedTasks += 1;
      else {
        byEmp[id].openTasks += 1;
        if (task.dueDate && task.dueDate < today) byEmp[id].overdueTasks += 1;
      }
    });
    // Also surface members from the team that have zero tasks so they're not invisible.
    memberOptions.forEach(m => {
      if (!byEmp[m.id]) {
        byEmp[m.id] = {
          employeeID: m.id,
          employeeName: m.name,
          team: m.team || '—',
          estimatedHours: 0,
          contractedHours: STANDARD_WEEKLY_HOURS,
          openTasks: 0,
          overdueTasks: 0,
          completedTasks: 0,
        };
      }
    });
    return Object.values(byEmp).map(emp => {
      // Capacity = contracted weekly hours minus public holidays + approved leave
      // this week (from the backend). Falls back to contracted hours if absent.
      const cap = capacityByEmp[emp.employeeID];
      const availableHours = cap ? cap.availableHours : emp.contractedHours;
      const unavailable = availableHours <= 0;  // fully consumed by holidays/leave this week
      return {
        ...emp,
        availableHours,
        holidayDays: cap ? cap.holidayDays : 0,
        leaveDays: cap ? cap.leaveDays : 0,
        unavailable,
        utilizationRate: unavailable ? (emp.estimatedHours > 0 ? 100 : 0)
          : Math.round((emp.estimatedHours / availableHours) * 100),
      };
    })
    .filter(emp => {
      const id = String(emp.employeeID);
      return !leaderIds.has(id) && id !== selfId;
    })
    .sort((a, b) => b.utilizationRate - a.utilizationRate);
  }, [scopedTasks, memberOptions, capacityByEmp, capacityMeta, employees, user]);

  // Calendar — month grid with task counts per day
  const monthGrid = useMemo(() => {
    const first = startOfMonth(calendarCursor);
    const last = endOfMonth(calendarCursor);
    const leadingBlanks = first.getDay();
    const days = [];
    for (let i = 0; i < leadingBlanks; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calendarCursor]);

  const tasksByDay = useMemo(() => {
    const map = {};
    scopedTasks.forEach(tk => {
      if (!tk?.dueDate) return;
      const key = String(tk.dueDate).slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(tk);
    });
    return map;
  }, [scopedTasks]);

  const selectedDayTasks = tasksByDay[selectedDay] || [];

  const monthLabel = calendarCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Headline stats
  const stats = useMemo(() => ({
    activeGoals: scopedGoals.filter(g => g.status !== 'Completed').length,
    openTasks: scopedTasks.filter(tk => tk.status !== 'Done').length,
    overdue: scopedTasks.filter(tk => tk.status !== 'Done' && tk.dueDate && tk.dueDate < new Date().toISOString().slice(0, 10)).length,
    completed: scopedTasks.filter(tk => tk.status === 'Done').length,
  }), [scopedGoals, scopedTasks]);

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'grid', placeItems: 'center' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      {/* ─── Filter Row ─── */}
      <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24, display: 'grid', gridTemplateColumns: showTeamFilter ? '1fr 1fr auto' : '1fr auto', gap: 20, alignItems: 'end' }}>
        {showTeamFilter && (
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>{t('Team Filter')}</label>
            <select
              value={selectedTeam}
              onChange={(e) => { setSelectedTeam(e.target.value); setSelectedMember(''); }}
              style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 14px', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer' }}
            >
              <option value="">{t('All teams')}</option>
              {teamOptions.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>{t('Member Filter')}</label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            disabled={memberOptions.length === 0}
            style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 14px', fontSize: 13, fontWeight: 700, outline: 'none', cursor: memberOptions.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            <option value="">{t('All members')}</option>
            {memberOptions.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {((showTeamFilter && selectedTeam) || selectedMember) && (
          <Btn variant="ghost" onClick={() => { if (showTeamFilter) setSelectedTeam(''); setSelectedMember(''); }} style={{ height: 44, borderRadius: 12, fontWeight: 800 }}>
            {t('Clear filters')}
          </Btn>
        )}
      </div>

      {/* ─── Headline Stats ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: t('Active Goals'), value: stats.activeGoals, icon: Target, accent: '#1E293B', bg: '#F8FAFC' },
          { label: t('Open Tasks'), value: stats.openTasks, icon: Zap, accent: 'var(--red-600)', bg: 'var(--red-50)' },
          { label: t('Overdue'), value: stats.overdue, icon: Activity, accent: 'var(--red-800)', bg: 'var(--red-50)' },
          { label: t('Completed'), value: stats.completed, icon: Clock, accent: '#059669', bg: '#ECFDF5' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: 20, padding: 20, border: '1.5px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', color: card.accent }}>
                <card.icon size={18} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>{card.label}</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: card.accent }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* ─── Per-Member Utilization Cards ─── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <Users size={20} style={{ color: 'var(--red-600)' }} />
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Utilization by Member')}</h3>
          {selectedTeam && <Badge label={selectedTeamName} color="accent" />}
          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setWeekOffset(o => Math.max(-8, o - 1))} title={t('Previous week')} style={weekNavBtn}><ChevronLeft size={16} /></button>
            <div style={{ textAlign: 'center', minWidth: 132 }}>
              <div style={{ fontSize: 12.5, fontWeight: 900, color: '#1E293B' }}>
                {weekOffset === 0 ? t('This week') : weekOffset === 1 ? t('Next week') : weekOffset === -1 ? t('Last week') : `${weekOffset > 0 ? '+' : ''}${weekOffset} ${t('weeks')}`}
              </div>
              {capacityMeta && (
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>
                  {fmtShort(capacityMeta.weekStart)} – {fmtShort(capacityMeta.weekEnd)}{capacityMeta.holidayDays ? ` • ${capacityMeta.holidayDays} ${t('holiday')}` : ''}
                </div>
              )}
            </div>
            <button onClick={() => setWeekOffset(o => Math.min(8, o + 1))} title={t('Next week')} style={weekNavBtn}><ChevronRight size={16} /></button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} style={{ ...weekNavBtn, width: 'auto', minWidth: 0, padding: '0 10px', fontSize: 12, fontWeight: 800 }}>{t('This week')}</button>
            )}
          </div>
        </div>
        {memberUtilization.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F8FAFC', borderRadius: 20, border: '1.5px dashed #E2E8F0', color: '#94A3B8' }}>
            {showTeamFilter
              ? (selectedTeam ? t('No members in this team yet.') : t('Pick a team to see per-member utilization.'))
              : t('No members on your team yet.')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {memberUtilization.map(emp => {
              const color = emp.unavailable ? '#94A3B8'
                : emp.utilizationRate > 100 ? 'var(--red-600)'
                : emp.utilizationRate >= 70 ? '#10B981'
                : emp.utilizationRate > 0 ? '#F59E0B'
                : '#94A3B8';
              return (
                <div key={emp.employeeID} style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #F1F5F9', padding: 20, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.employeeName}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginTop: 2 }}>{emp.team}</div>
                    </div>
                    {emp.unavailable
                      ? <div style={{ fontSize: 13, fontWeight: 900, color: '#94A3B8', flexShrink: 0, textTransform: 'uppercase' }} title={t('No available hours this week (holiday/leave)')}>{t('On leave')}</div>
                      : <div style={{ fontSize: 22, fontWeight: 900, color, flexShrink: 0 }}>{emp.utilizationRate}%</div>}
                  </div>
                  <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
                    <div style={{ width: emp.unavailable ? '100%' : `${Math.min(100, emp.utilizationRate)}%`, height: '100%', background: color, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11, fontWeight: 700, color: '#64748B' }}>
                    <div title={(emp.holidayDays || emp.leaveDays) ? t('Capacity reduced by holidays/leave this week') : ''}>
                      <div style={{ color: '#94A3B8', fontSize: 9, textTransform: 'uppercase', marginBottom: 2 }}>{t('Used / Avail')}</div>
                      <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 800 }}>
                        {emp.estimatedHours.toFixed(1)} / {Number(emp.availableHours || 0).toFixed(0)}h
                        {(emp.holidayDays || emp.leaveDays) ? <span style={{ color: '#F59E0B', marginLeft: 4 }}>•</span> : null}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: 9, textTransform: 'uppercase', marginBottom: 2 }}>{t('Open')}</div>
                      <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 800 }}>{emp.openTasks}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: 9, textTransform: 'uppercase', marginBottom: 2 }}>{t('Overdue')}</div>
                      <div style={{ color: emp.overdueTasks > 0 ? 'var(--red-600)' : '#1E293B', fontSize: 13, fontWeight: 800 }}>{emp.overdueTasks}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Calendar + day-detail ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 24, alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CalendarIcon size={18} style={{ color: 'var(--red-600)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Task Calendar')}</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1))}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #F1F5F9', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#64748B' }}
              >
                <ChevronLeft size={16} />
              </button>
              <div style={{ minWidth: 140, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{monthLabel}</div>
              <button
                onClick={() => setCalendarCursor(new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1))}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #F1F5F9', background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#64748B' }}
              >
                <ChevronRight size={16} />
              </button>
              <Btn size="sm" variant="ghost" onClick={() => { const today = new Date(); setCalendarCursor(startOfMonth(today)); setSelectedDay(toDayKey(today)); }} style={{ fontSize: 11, fontWeight: 800 }}>
                {t('Today')}
              </Btn>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEKDAYS.map(w => (
              <div key={w} style={{ padding: '8px 4px', fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '.05em' }}>{w}</div>
            ))}
            {monthGrid.map((day, idx) => {
              if (!day) return <div key={`blank-${idx}`} style={{ minHeight: 70 }} />;
              const key = toDayKey(day);
              const dayTasks = tasksByDay[key] || [];
              const isSelected = key === selectedDay;
              const isToday = key === toDayKey(new Date());
              const hasOverdue = dayTasks.some(tk => tk.status !== 'Done' && key < toDayKey(new Date()));
              const isWeekend = day.getDay() === 5 || day.getDay() === 6;  // Fri/Sat
              const holidayName = holidaysByDate[key];
              const isHoliday = !!holidayName;
              const faded = isWeekend || isHoliday;
              const bg = isSelected ? 'var(--red-50)'
                : isHoliday ? '#FFF4E6'      // faded amber — public holiday
                : isWeekend ? '#EDF0F4'      // faded grey — weekend
                : '#F8FAFC';
              const numColor = isSelected ? 'var(--red-600)' : isToday ? '#4338CA' : faded ? '#9AA4B2' : '#1E293B';
              return (
                <button
                  key={key}
                  title={holidayName || (isWeekend ? t('Weekend') : '')}
                  onClick={() => { setSelectedDay(key); openTaskModalForDate(key); }}
                  style={{
                    minHeight: 70,
                    background: bg,
                    border: isSelected ? '1.5px solid var(--red-600)'
                      : isToday ? '1.5px solid #C7D2FE'
                      : isHoliday ? '1.5px solid #FCD9A8'
                      : '1.5px solid #F1F5F9',
                    borderRadius: 10,
                    padding: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: numColor, marginBottom: 'auto' }}>
                    {day.getDate()}
                  </div>
                  {isHoliday && (
                    <div style={{
                      fontSize: 8.5,
                      lineHeight: 1.15,
                      fontWeight: 800,
                      color: '#D97706',
                      marginTop: 4,
                      width: '100%',
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {holidayName}
                    </div>
                  )}
                  {dayTasks.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: hasOverdue ? 'var(--red-600)' : 'var(--red-400)' }} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#64748B' }}>{dayTasks.length}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#EDF0F4', border: '1px solid #E2E8F0' }} /> {t('Weekend')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: '#FFF4E6', border: '1px solid #FCD9A8' }} /> {t('Public holiday')}
            </span>
          </div>
        </div>

        {/* Day detail */}
        <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24, alignSelf: 'start' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{t('Selected day')}</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 16 }}>{selectedDay}</div>
          {selectedDayTasks.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', background: '#F8FAFC', borderRadius: 14, color: '#94A3B8', fontSize: 12, fontWeight: 600 }}>
              {t('No tasks due on this day.')}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {selectedDayTasks.map(tk => (
                <div
                  key={tk.taskID}
                  onClick={() => openEditTask(tk)}
                  title={canEditTask(tk) ? t('Edit task') : undefined}
                  style={{ padding: 12, background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9', cursor: canEditTask(tk) ? 'pointer' : 'default' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{tk.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 8 }}>{tk.employeeName || tk.employeeID}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge label={tk.status} color={tk.status === 'Done' ? 'green' : tk.status === 'Blocked' ? 'red' : 'gray'} />
                    {tk.priority && <Badge label={tk.priority} color={tk.priority === 'High' ? 'red' : 'gray'} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Goals + Tasks + Pending Review tables ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={16} style={{ color: 'var(--red-600)' }} />
            <h4 style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Goals')}</h4>
            <Badge label={scopedGoals.length} color="gray" style={{ marginLeft: 'auto' }} />
            <button
              onClick={() => { setGoalForm({ ...EMPTY_GOAL, employeeID: selectedMember || '' }); setGoalModalOpen(true); }}
              title={t('Assign new goal')}
              aria-label={t('Assign new goal')}
              style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid var(--red-100)', background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {scopedGoals.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>{t('No goals in scope.')}</div>
            ) : scopedGoals.map(goal => (
              <div key={goal.goalID} style={{ padding: '14px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{goal.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginTop: 2 }}>{goal.employeeName || goal.employeeID} · {goal.team || '—'}</div>
                </div>
                <Badge label={goal.status} color={goal.status === 'Completed' ? 'green' : goal.status === 'On Hold' ? 'red' : 'gray'} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={16} style={{ color: 'var(--red-600)' }} />
            <h4 style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Tasks')}</h4>
            <Badge label={otherTasks.length} color="gray" style={{ marginLeft: 'auto' }} />
            <button
              onClick={() => { setTaskForm({ ...EMPTY_TASK, employeeID: selectedMember || '' }); setTaskModalOpen(true); }}
              title={t('Assign new task')}
              aria-label={t('Assign new task')}
              style={{ width: 32, height: 32, borderRadius: 10, border: '1.5px solid var(--red-100)', background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <Plus size={16} />
            </button>
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {otherTasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>{t('No tasks in scope.')}</div>
            ) : otherTasks.map(tk => {
              const isDone = tk.status === 'Done';
              return (
                <div
                  key={tk.taskID}
                  onClick={() => openEditTask(tk)}
                  title={canEditTask(tk) ? t('Edit task') : undefined}
                  style={{ padding: '14px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', cursor: canEditTask(tk) ? 'pointer' : 'default' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{tk.title}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginTop: 2 }}>{tk.employeeName || tk.employeeID} · {tk.dueDate || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Badge label={tk.status} color={isDone ? 'green' : tk.status === 'Blocked' ? 'red' : 'gray'} />
                    <button
                      onClick={(e) => { e.stopPropagation(); openContactModalForTask(tk); }}
                      disabled={!tk.employeeEmail}
                      title={tk.employeeEmail ? `${t('Email')} ${tk.employeeEmail}` : t('No email on file')}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: '1.5px solid #F1F5F9',
                        background: '#fff', color: '#64748B',
                        display: 'grid', placeItems: 'center',
                        cursor: tk.employeeEmail ? 'pointer' : 'not-allowed',
                        opacity: tk.employeeEmail ? 1 : 0.5,
                      }}
                    >
                      <Mail size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Pending Review Tasks (TL must finalize) ─── */}
        <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #FDE68A', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 10, background: '#FFFBEB' }}>
            <CheckCircle2 size={16} style={{ color: '#92400E' }} />
            <h4 style={{ fontSize: 14, fontWeight: 900, color: '#78350F', margin: 0 }}>{t('Pending Review')}</h4>
            <Badge label={pendingReviewTasks.length} color={pendingReviewTasks.length > 0 ? 'yellow' : 'gray'} style={{ marginLeft: 'auto' }} />
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {pendingReviewTasks.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>{t('Nothing awaiting your review.')}</div>
            ) : pendingReviewTasks.map(tk => (
              <div
                key={tk.taskID}
                onClick={() => openEditTask(tk)}
                title={canEditTask(tk) ? t('Edit task') : undefined}
                style={{ padding: '14px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', cursor: canEditTask(tk) ? 'pointer' : 'default' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{tk.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginTop: 2 }}>{tk.employeeName || tk.employeeID} · {tk.dueDate || '—'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {isTL ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApproveTask(tk); }}
                        disabled={savingTaskId === tk.taskID}
                        title={t('Mark as Reviewed')}
                        style={{
                          height: 30, padding: '0 10px', borderRadius: 8, border: 'none',
                          background: 'var(--red-600)', color: '#fff', fontSize: 11, fontWeight: 800,
                          cursor: savingTaskId === tk.taskID ? 'wait' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          opacity: savingTaskId === tk.taskID ? 0.6 : 1,
                        }}
                      >
                        <CheckCircle2 size={12} /> {savingTaskId === tk.taskID ? t('Saving...') : t('Mark as Reviewed')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setNoteModal({ open: true, task: tk, note: '' }); }}
                        disabled={savingTaskId === tk.taskID}
                        title={t('Send back with notes for changes')}
                        style={{
                          height: 30, padding: '0 10px', borderRadius: 8,
                          background: '#fff', color: '#92400E', border: '1.5px solid #FDE68A',
                          fontSize: 11, fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        <MessageSquare size={12} /> {t('Give Notes')}
                      </button>
                    </>
                  ) : (
                    <Badge label={tk.status} color="yellow" />
                  )}
                  <button
                    onClick={() => openContactModalForTask(tk)}
                    disabled={!tk.employeeEmail}
                    title={tk.employeeEmail ? `${t('Email')} ${tk.employeeEmail}` : t('No email on file')}
                    style={{
                      width: 30, height: 30, borderRadius: 8, border: '1.5px solid #F1F5F9',
                      background: '#fff', color: '#64748B',
                      display: 'grid', placeItems: 'center',
                      cursor: tk.employeeEmail ? 'pointer' : 'not-allowed',
                      opacity: tk.employeeEmail ? 1 : 0.5,
                    }}
                  >
                    <Mail size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Create Goal Modal ─── */}
      <Modal
        open={goalModalOpen}
        onClose={() => { setGoalModalOpen(false); setGoalForm(EMPTY_GOAL); }}
        title={t('Assign New Goal')}
        maxWidth={560}
      >
        <div style={{ display: 'grid', gap: 14, padding: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Employee')}</label>
            <select
              value={goalForm.employeeID}
              onChange={(e) => setGoalForm((prev) => ({ ...prev, employeeID: e.target.value }))}
              style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', background: '#fff' }}
            >
              <option value="">{t('Select an employee')}</option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.team ? ` — ${m.team}` : ''}</option>
              ))}
            </select>
          </div>
          <Input
            label={t('Goal Title')}
            value={goalForm.title}
            onChange={(e) => setGoalForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder={t('Improve dashboard performance')}
          />
          <Textarea
            label={t('Description')}
            value={goalForm.description}
            onChange={(e) => setGoalForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t('Add details or milestones')}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Category')}</label>
              <select
                value={goalForm.category}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, category: e.target.value }))}
                style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', background: '#fff' }}
              >
                {['Performance', 'Development', 'Leadership', 'Attendance'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Priority')}</label>
              <select
                value={goalForm.priority}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, priority: e.target.value }))}
                style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', background: '#fff' }}
              >
                {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <Input
            label={t('Due Date')}
            type="date"
            value={goalForm.dueDate}
            onChange={(e) => setGoalForm((prev) => ({ ...prev, dueDate: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => { setGoalModalOpen(false); setGoalForm(EMPTY_GOAL); }} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 800 }}>{t('Cancel')}</Btn>
            <Btn onClick={handleCreateGoal} disabled={goalSaving} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 900, background: 'var(--red-600)', border: 'none' }}>
              {goalSaving ? t('Saving...') : t('Assign Goal')}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ─── Create Task Modal ─── */}
      <Modal
        open={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setTaskForm(EMPTY_TASK); }}
        title={t('Assign New Task')}
        maxWidth={560}
      >
        <div style={{ display: 'grid', gap: 14, padding: 8 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Employee')}</label>
            <select
              value={taskForm.employeeID}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, employeeID: e.target.value }))}
              style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', background: '#fff' }}
            >
              <option value="">{t('Select an employee')}</option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.team ? ` — ${m.team}` : ''}</option>
              ))}
            </select>
          </div>
          <Input
            label={t('Task Title')}
            value={taskForm.title}
            onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder={t('Prepare release checklist')}
          />
          <Textarea
            label={t('Description')}
            value={taskForm.description}
            onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t('Describe the work item and deliverables')}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Priority')}</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', background: '#fff' }}
              >
                {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Input
              label={t('Est. Hours')}
              type="number"
              min="0"
              step="0.5"
              value={taskForm.estimatedHours}
              onChange={(e) => setTaskForm((prev) => ({ ...prev, estimatedHours: e.target.value === '' ? '' : Number(e.target.value) }))}
            />
          </div>
          <Input
            label={t('Due Date')}
            type="date"
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => { setTaskModalOpen(false); setTaskForm(EMPTY_TASK); }} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 800 }}>{t('Cancel')}</Btn>
            <Btn onClick={handleCreateTask} disabled={taskSaving} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 900, background: 'var(--red-600)', border: 'none' }}>
              {taskSaving ? t('Saving...') : t('Assign Task')}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ─── Edit Task Modal (TL editing a task they created) ─── */}
      <Modal
        open={!!editTask}
        onClose={() => { setEditTask(null); setEditForm(null); }}
        title={editTask ? `${t('Edit Task')}: ${editTask.title}` : t('Edit Task')}
        maxWidth={560}
      >
        {editForm && (
          <div style={{ display: 'grid', gap: 14, padding: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
              {t('Assigned to')}: <strong style={{ color: '#1E293B' }}>{editTask?.employeeName || editTask?.employeeID}</strong>
            </div>
            <Input
              label={t('Task Title')}
              value={editForm.title}
              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <Textarea
              label={t('Description')}
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Priority')}</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}
                  style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', background: '#fff' }}
                >
                  {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Status')}</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', background: '#fff' }}
                >
                  {['To Do', 'In Progress', 'Pending Review', 'Done', 'Blocked'].map(s => <option key={s} value={s}>{t(s)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label={t('Est. Hours')}
                type="number"
                min="0"
                step="1"
                value={editForm.estimatedHours}
                onChange={(e) => setEditForm((prev) => ({ ...prev, estimatedHours: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
              <Input
                label={t('Progress %')}
                type="number"
                min="0"
                max="100"
                step="5"
                value={editForm.progress}
                onChange={(e) => setEditForm((prev) => ({ ...prev, progress: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
            </div>
            <Input
              label={t('Due Date')}
              type="date"
              value={editForm.dueDate}
              onChange={(e) => setEditForm((prev) => ({ ...prev, dueDate: e.target.value }))}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => { setEditTask(null); setEditForm(null); }} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 800 }}>{t('Cancel')}</Btn>
              <Btn onClick={handleUpdateTask} disabled={editSaving} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 900, background: 'var(--red-600)', border: 'none' }}>
                {editSaving ? t('Saving...') : t('Save Changes')}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Contact via email Modal ─── */}
      {contactEmail && (
        <ContactEmailModal
          to={contactEmail.to}
          subject={contactEmail.subject}
          onClose={() => setContactEmail(null)}
          onSent={() => toast(t('Email sent'), 'success')}
        />
      )}

      <Modal
        open={noteModal.open}
        onClose={() => setNoteModal({ open: false, task: null, note: '' })}
        title={noteModal.task ? `${t('Send back with notes')}: ${noteModal.task.title}` : t('Send back with notes')}
        maxWidth={520}
      >
        {noteModal.task && (
          <div style={{ display: 'grid', gap: 14, padding: 8 }}>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {t('Write the changes you want. The task will return to')} <strong>In Progress</strong>{t(' and the team member can keep working on it. They will see your note.')}
            </div>
            <Textarea
              autoFocus
              value={noteModal.note}
              onChange={(e) => setNoteModal(p => ({ ...p, note: e.target.value }))}
              placeholder={t('e.g. Please tighten the conclusion section and re-check the citations.')}
              style={{ minHeight: 120 }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <Btn variant="ghost" onClick={() => setNoteModal({ open: false, task: null, note: '' })} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 800 }}>{t('Cancel')}</Btn>
              <Btn onClick={submitReturnWithNotes} disabled={savingTaskId === noteModal.task.taskID} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 900, background: '#92400E', color: '#fff', border: 'none' }}>
                {savingTaskId === noteModal.task.taskID ? t('Sending...') : t('Send Notes')}
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
