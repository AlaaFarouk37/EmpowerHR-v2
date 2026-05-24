import { useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  adminGetTeams,
  approveTeamTask,
  createTeamGoal,
  createTeamTask,
  getPredictions,
  getTeamGoals,
  getTeamPendingOvertime,
  getTeamTasks,
  hrGetEmployees,
  reviewTeamOvertime,
  updateTeamGoal,
  updateTeamTask,
} from '../../api/index.js';
import { Badge, Btn, EmployeeSelect, Input, Modal, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import ContactEmailModal from '../../components/shared/ContactEmailModal.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const STANDARD_PERIOD_HOURS = 40; // weekly contracted baseline used for utilization estimates

const isRetentionConversationTask = (task) => {
  if (!task) return false;
  const description = String(task.description || '').toLowerCase();
  const title = String(task.title || '').toLowerCase();
  const assignedBy = String(task.assignedBy || '').toLowerCase();
  return (
    description.startsWith('retention conversation') ||
    title.includes('retention conversation') ||
    assignedBy.startsWith('actionplan:')
  );
};

const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

const PRIORITY_EVENT_COLOR = {
  High: '#E8321A',
  Medium: '#175CD3',
  Low: '#0F766E',
};

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
  const { user } = useAuth();
  const isHRRole = user?.role === 'HRManager' || user?.role === 'Admin';
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [employeesById, setEmployeesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [savingGoalId, setSavingGoalId] = useState(null);
  const [savingTaskId, setSavingTaskId] = useState(null);
  const [pendingOvertime, setPendingOvertime] = useState([]);
  const [savingOvertimeId, setSavingOvertimeId] = useState(null);
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL_FORM);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [focusFilter, setFocusFilter] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [goalFormTeam, setGoalFormTeam] = useState('');
  const [taskFormTeam, setTaskFormTeam] = useState('');
  const [contactEmail, setContactEmail] = useState(null);

  const isTeamMemberRole = user?.role === 'TeamMember';

  const openContactModal = (task) => {
    const taskTitle = task?.title || '';
    const memberEmail = task?.employeeEmail || '';
    const tlEmail = isTeamMemberRole ? (task?.assignedByEmail || '') : '';
    setContactEmail({
      to: isTeamMemberRole ? tlEmail : memberEmail,
      subject: taskTitle ? `Re: ${taskTitle}` : '',
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalData, taskData, predictionData, teamData, employeeData, overtimeData] = await Promise.all([
        getTeamGoals(),
        getTeamTasks(),
        getPredictions().catch(() => []),
        adminGetTeams().catch(() => []),
        isHRRole ? hrGetEmployees().catch(() => []) : Promise.resolve([]),
        getTeamPendingOvertime().catch(() => []),
      ]);
      setGoals(Array.isArray(goalData) ? goalData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setPredictions(Array.isArray(predictionData) ? predictionData : []);
      setTeams(Array.isArray(teamData) ? teamData : []);
      setPendingOvertime(Array.isArray(overtimeData) ? overtimeData : []);
      const employeeMap = {};
      (Array.isArray(employeeData) ? employeeData : []).forEach((employee) => {
        if (employee?.employeeID) employeeMap[employee.employeeID] = employee;
      });
      setEmployeesById(employeeMap);
    } catch (error) {
      toast(error.message || 'Failed to load team workspace', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isHRRole]);

  // When HR picks a team at the page level, default the assign forms to that team.
  useEffect(() => {
    if (selectedTeam) {
      setGoalFormTeam(selectedTeam);
      setTaskFormTeam(selectedTeam);
    }
  }, [selectedTeam]);

  // HR users must select a team before any data is rendered (§4).
  const requiresTeamSelection = isHRRole && !selectedTeam;

  // Teams come from /teams/ as { team_id, name }. Employees serialize team as team_id (int),
  // while goals/tasks serialize team as the team name string. We canonicalize on team_id
  // and translate to name when matching goal/task rows.
  const teamOptions = useMemo(() => {
    const fromApi = (Array.isArray(teams) ? teams : [])
      .map((team) => ({
        id: team?.team_id ?? team?.id ?? team?.teamID,
        name: team?.name || team?.teamName,
      }))
      .filter((entry) => entry.id != null && entry.name);
    if (fromApi.length) {
      return fromApi
        .filter((entry, index, all) => all.findIndex((other) => String(other.id) === String(entry.id)) === index)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }
    // Fallback: teams discovered in goal/task data when the teams API isn't reachable.
    const discoveredNames = new Set();
    [...goals, ...tasks].forEach((item) => {
      if (item?.team) discoveredNames.add(item.team);
    });
    return Array.from(discoveredNames).sort().map((name) => ({ id: name, name }));
  }, [teams, goals, tasks]);

  const teamNameById = useMemo(() => {
    const map = {};
    teamOptions.forEach((entry) => { map[String(entry.id)] = entry.name; });
    return map;
  }, [teamOptions]);

  const matchesSelectedTeam = (item) => {
    if (!selectedTeam) return true;
    const expectedName = teamNameById[String(selectedTeam)] ?? String(selectedTeam);
    return String(item?.team || '') === String(expectedName);
  };

  const scopedGoals = useMemo(
    () => (selectedTeam ? goals.filter(matchesSelectedTeam) : goals),
    [goals, selectedTeam],
  );
  const scopedTasks = useMemo(
    () => (selectedTeam ? tasks.filter(matchesSelectedTeam) : tasks),
    [tasks, selectedTeam],
  );
  const scopedPendingOvertime = useMemo(() => {
    if (!selectedTeam) return pendingOvertime;
    const expectedName = teamNameById[String(selectedTeam)] ?? String(selectedTeam);
    return pendingOvertime.filter((record) => String(record?.employeeTeam || '') === String(expectedName));
  }, [pendingOvertime, selectedTeam, teamNameById]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const weekAheadKey = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const stats = useMemo(() => ({
    totalGoals: scopedGoals.length,
    openTasks: scopedTasks.filter((task) => task.status !== 'Done').length,
    inProgress: scopedGoals.filter((goal) => goal.status === 'In Progress').length + scopedTasks.filter((task) => task.status === 'In Progress').length,
    completed: scopedGoals.filter((goal) => goal.status === 'Completed').length + scopedTasks.filter((task) => task.status === 'Done').length,
    overdueItems:
      scopedGoals.filter((goal) => goal.status !== 'Completed' && goal.dueDate && goal.dueDate < todayKey).length +
      scopedTasks.filter((task) => task.status !== 'Done' && task.dueDate && task.dueDate < todayKey).length,
    blockedItems:
      scopedGoals.filter((goal) => goal.status === 'On Hold').length +
      scopedTasks.filter((task) => task.status === 'Blocked').length,
    highPriority:
      scopedGoals.filter((goal) => goal.priority === 'High' && goal.status !== 'Completed').length +
      scopedTasks.filter((task) => task.priority === 'High' && task.status !== 'Done').length,
  }), [scopedGoals, scopedTasks, todayKey]);

  // Workforce metrics (§3): utilization, performance, completed tasks for the active scope.
  const workforceMetrics = useMemo(() => {
  // Group estimated hours and contracted hours by employee.
  // The leader's own tasks are excluded so utilization reflects team members only.
  const ownEmployeeId = user?.employee_id ? String(user.employee_id) : '';
  const byEmployee = {};
  scopedTasks.forEach((task) => {
    const id = task.employeeID;
    if (!id) return;
    if (ownEmployeeId && String(id) === ownEmployeeId) return;
    if (!byEmployee[id]) {
      byEmployee[id] = {
        employeeID: id,
        employeeName: task.employeeName ?? id,
        estimatedHours: 0,
        contractedHours: Number(task.contractedHours ?? STANDARD_PERIOD_HOURS),
      };
    }
    byEmployee[id].estimatedHours += Number(task.estimatedHours || 0);
  });

  const employeeUtilization = Object.values(byEmployee).map((emp) => ({
    ...emp,
    utilizationRate: emp.contractedHours > 0
      ? Math.round((emp.estimatedHours / emp.contractedHours) * 100)
      : 0,
  }));

  const avgUtilization = employeeUtilization.length > 0
    ? Math.round(
        employeeUtilization.reduce((sum, e) => sum + e.utilizationRate, 0) / employeeUtilization.length
      )
    : 0;

  // Performance rate (unchanged)
  const completedTasks = scopedTasks.filter((t) => t.status === 'Done');
  const tasksWithDueDate = completedTasks.filter((t) => t.dueDate);
  const onTimeCompletions = tasksWithDueDate.filter((task) => {
    const ref = task.finished_time || task.updatedAt;
    if (!ref) return true;
    return String(ref).slice(0, 10) <= String(task.dueDate);
  }).length;
  const performanceRate = tasksWithDueDate.length > 0
    ? Math.round((onTimeCompletions / tasksWithDueDate.length) * 100)
    : 0;

  return {
    employeeUtilization,  // per-employee breakdown for the UI
    avgUtilization,       // summary card number
    performanceRate,
    completedCount: completedTasks.length,
  };
}, [scopedTasks, user?.employee_id]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const matchesSearch = (item) => {
    if (!normalizedSearch) return true;
    return [item.title, item.employeeName, item.employeeID, item.team, item.category, item.priority]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  };

  const matchesFocus = (item, kind) => {
    if (focusFilter === 'all') return true;
    const isOverdue = Boolean(item.dueDate) && item.dueDate < todayKey && !['Completed', 'Done'].includes(item.status);
    if (focusFilter === 'overdue') return isOverdue;
    if (focusFilter === 'priority') return item.priority === 'High';
    if (focusFilter === 'blocked') return kind === 'goal' ? item.status === 'On Hold' : item.status === 'Blocked';
    return true;
  };

  const filteredGoals = useMemo(
    () => scopedGoals.filter((goal) => matchesSearch(goal) && matchesFocus(goal, 'goal')),
    [scopedGoals, normalizedSearch, focusFilter, todayKey],
  );

  const filteredTasks = useMemo(
    () => scopedTasks.filter((task) => matchesSearch(task) && matchesFocus(task, 'task')),
    [scopedTasks, normalizedSearch, focusFilter, todayKey],
  );

  const leaderFocusItems = useMemo(() => {
    const goalItems = scopedGoals
      .filter((goal) => goal.status !== 'Completed')
      .map((goal) => {
        const overdue = Boolean(goal.dueDate) && goal.dueDate < todayKey;
        const isBlocked = goal.status === 'On Hold';
        const score = (overdue ? 4 : 0) + (goal.priority === 'High' ? 2 : 0) + (isBlocked ? 2 : 0) + (goal.status === 'In Progress' ? 1 : 0);
        return {
          id: `goal-${goal.goalID}`,
          kind: 'goal',
          title: goal.title,
          employeeID: goal.employeeID,
          employeeName: goal.employeeName,
          team: goal.team,
          dueDate: goal.dueDate,
          status: goal.status,
          priority: goal.priority,
          overdue,
          score,
          source: goal,
        };
      });

    const taskItems = scopedTasks
      .filter((task) => task.status !== 'Done')
      .map((task) => {
        const overdue = Boolean(task.dueDate) && task.dueDate < todayKey;
        const isBlocked = task.status === 'Blocked';
        const score = (overdue ? 4 : 0) + (task.priority === 'High' ? 2 : 0) + (isBlocked ? 3 : 0) + (task.status === 'In Progress' ? 1 : 0);
        return {
          id: `task-${task.taskID}`,
          kind: 'task',
          title: task.title,
          employeeID: task.employeeID,
          employeeName: task.employeeName,
          team: task.team,
          dueDate: task.dueDate,
          status: task.status,
          priority: task.priority,
          overdue,
          score,
          source: task,
        };
      });

    return [...goalItems, ...taskItems]
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [scopedGoals, scopedTasks, todayKey]);

  const coachingRows = useMemo(() => {
    const rows = new Map();

    const register = (item, kind) => {
      const isDone = kind === 'goal' ? item.status === 'Completed' : item.status === 'Done';
      if (isDone) return;

      const key = item.employeeID || item.employeeName || `${kind}-${item.title}`;
      const current = rows.get(key) || {
        key,
        employeeID: item.employeeID,
        employeeName: item.employeeName || item.employeeID || '—',
        team: item.team,
        openGoals: 0,
        openTasks: 0,
        overdueItems: 0,
        blockedItems: 0,
        highPriorityItems: 0,
        dueThisWeek: 0,
        totalProgress: 0,
        progressCount: 0,
      };

      if (kind === 'goal') current.openGoals += 1;
      else current.openTasks += 1;

      const dueDate = String(item.dueDate || '');
      const isOverdue = Boolean(dueDate) && dueDate < todayKey;
      const isDueThisWeek = Boolean(dueDate) && dueDate >= todayKey && dueDate <= weekAheadKey;
      const isBlocked = kind === 'goal' ? item.status === 'On Hold' : item.status === 'Blocked';

      if (isOverdue) current.overdueItems += 1;
      if (isDueThisWeek) current.dueThisWeek += 1;
      if (isBlocked) current.blockedItems += 1;
      if (item.priority === 'High') current.highPriorityItems += 1;

      current.totalProgress += Number(item.progress || 0);
      current.progressCount += 1;
      rows.set(key, current);
    };

    scopedGoals.forEach((goal) => register(goal, 'goal'));
    scopedTasks.forEach((task) => register(task, 'task'));

    return Array.from(rows.values())
      .map((row) => {
        const averageProgress = row.progressCount ? Math.round(row.totalProgress / row.progressCount) : 0;
        const focusScore = (row.overdueItems * 3) + (row.blockedItems * 3) + (row.highPriorityItems * 2) + (row.dueThisWeek ? 1 : 0);
        return {
          ...row,
          averageProgress,
          focusScore,
          openItems: row.openGoals + row.openTasks,
          nextStep: row.blockedItems > 0
            ? t('Unblock work')
            : row.overdueItems > 0
              ? t('Replan deadlines')
              : row.highPriorityItems > 1
                ? t('Review priorities')
                : t('Coach this week'),
        };
      })
      .sort((a, b) => b.focusScore - a.focusScore || b.openItems - a.openItems)
      .slice(0, 6);
  }, [scopedGoals, scopedTasks, todayKey, weekAheadKey, t]);

  const teamCoachingSnapshot = useMemo(() => {
    const uniqueMembers = new Set();
    const progressValues = [];

    scopedGoals.forEach((goal) => {
      if (goal.employeeID || goal.employeeName) uniqueMembers.add(goal.employeeID || goal.employeeName);
      if (goal.status !== 'Completed') progressValues.push(Number(goal.progress || 0));
    });

    scopedTasks.forEach((task) => {
      if (task.employeeID || task.employeeName) uniqueMembers.add(task.employeeID || task.employeeName);
      if (task.status !== 'Done') progressValues.push(Number(task.progress || 0));
    });

    const dueThisWeek = scopedGoals.filter((goal) => goal.status !== 'Completed' && goal.dueDate && goal.dueDate >= todayKey && goal.dueDate <= weekAheadKey).length
      + scopedTasks.filter((task) => task.status !== 'Done' && task.dueDate && task.dueDate >= todayKey && task.dueDate <= weekAheadKey).length;

    const averageCompletion = progressValues.length
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : 0;

    return {
      contributors: uniqueMembers.size,
      coachReady: coachingRows.filter((row) => row.focusScore >= 4).length,
      atRiskDelivery: stats.overdueItems + stats.blockedItems,
      dueThisWeek,
      averageCompletion,
    };
  }, [scopedGoals, scopedTasks, coachingRows, stats.overdueItems, stats.blockedItems, todayKey, weekAheadKey]);

  // Retention alerts (§6) — derived from attrition predictions, not goal/task data.
  const retentionAlerts = useMemo(() => {
    const highRisk = (Array.isArray(predictions) ? predictions : []).filter((p) => p?.riskLevel === 'High' || p?.riskLevel === 'Medium');
    const knownEmployees = isHRRole ? employeesById : null;

    return highRisk
      .filter((prediction) => {
        if (!selectedTeam) return true;
        const expectedName = teamNameById[String(selectedTeam)] ?? String(selectedTeam);
        const team = prediction?.team || prediction?.department || knownEmployees?.[prediction?.employeeID]?.team;
        return String(team || '') === String(expectedName);
      })
      .map((prediction) => {
        const employeeName = prediction.employeeName
          || prediction.fullName
          || knownEmployees?.[prediction.employeeID]?.fullName
          || prediction.employeeID
          || '—';
        const employeeID = prediction.employeeID || prediction.employee_id;
        // The retention task is assigned to the *team leader*, not the high-risk TM,
        // so we match by the TM's name embedded in the task description.
        const matchingTask = scopedTasks.find((task) => (
          isRetentionConversationTask(task)
          && employeeName
          && String(task.description || '').includes(String(employeeName))
        ));
        const resolved = Boolean(matchingTask && matchingTask.status === 'Done');
        return {
          key: `retention-${employeeID || employeeName}`,
          employeeID,
          employeeName,
          team: prediction.team || prediction.department || knownEmployees?.[employeeID]?.team || '—',
          riskLevel: prediction.riskLevel || 'High',
          riskScore: typeof prediction.riskScore === 'number'
            ? prediction.riskScore
            : Number(prediction.score || prediction.probability || 0),
          matchingTask,
          resolved,
        };
      })
      // Hide alerts whose retention conversation task has been completed (§6c).
      .filter((alert) => !alert.resolved);
  }, [predictions, scopedTasks, selectedTeam, isHRRole, employeesById, teamNameById]);

  const prepareFollowUp = (item) => {
    if (item.kind === 'goal') {
      setGoalForm((prev) => ({
        ...prev,
        employeeID: item.employeeID || prev.employeeID,
        title: prev.title || `${t('Follow-up')}: ${item.title}`.slice(0, 160),
        priority: item.priority || prev.priority,
      }));
      toast(t('Goal form prepared for quick follow-up.'));
      return;
    }

    setTaskForm((prev) => ({
      ...prev,
      employeeID: item.employeeID || prev.employeeID,
      title: prev.title || `${t('Follow-up')}: ${item.title}`.slice(0, 160),
      priority: item.priority || prev.priority,
    }));
    toast(t('Task form prepared for quick follow-up.'));
  };

  const prepareCoachingFollowUp = (row) => {
    const name = row.employeeName || row.employeeID || '—';

    setGoalForm((prev) => ({
      ...prev,
      employeeID: row.employeeID || prev.employeeID,
      title: prev.title || `${t('Follow-up')}: ${name}`.slice(0, 160),
      priority: row.highPriorityItems > 0 ? 'High' : prev.priority,
    }));

    setTaskForm((prev) => ({
      ...prev,
      employeeID: row.employeeID || prev.employeeID,
      title: prev.title || `${t('Follow-up')}: ${name}`.slice(0, 160),
      priority: row.overdueItems > 0 || row.blockedItems > 0 ? 'High' : prev.priority,
    }));

    toast(t('Prepared coaching follow-up for this team member.'));
  };

  const handleCreateGoal = async () => {
    if (!goalForm.employeeID.trim() || !goalForm.title.trim()) {
      toast('Employee ID and goal title are required.', 'error');
      return;
    }

    setGoalSubmitting(true);
    try {
      await createTeamGoal({
        ...goalForm,
        employeeID: goalForm.employeeID.trim(),
        progress: Number(goalForm.progress || 0),
      });
      toast('Goal created for team member');
      setGoalForm(EMPTY_GOAL_FORM);
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to create team goal', 'error');
    } finally {
      setGoalSubmitting(false);
    }
  };

  const handleCompleteGoal = async (goal) => {
    setSavingGoalId(goal.goalID);
    try {
      await updateTeamGoal(goal.goalID, {
        employeeID: goal.employeeID,
        title: goal.title,
        description: goal.description || '',
        category: goal.category,
        priority: goal.priority,
        status: 'Completed',
        progress: 100,
        dueDate: goal.dueDate,
      });
      toast('Goal marked as completed');
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to update goal', 'error');
    } finally {
      setSavingGoalId(null);
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.employeeID.trim() || !taskForm.title.trim() || !Number(taskForm.estimatedHours)) {
      toast('Employee, title, and estimated hours are required.', 'error');
      return;
    }

    setTaskSubmitting(true);
    try {
      await createTeamTask({
        ...taskForm,
        employeeID: taskForm.employeeID.trim(),
        progress: Number(taskForm.progress || 0),
        estimatedHours: Number(taskForm.estimatedHours),
      });
      console.log('estimatedHours raw:', taskForm.estimatedHours, typeof taskForm.estimatedHours);
      toast('Task assigned to team member');
      setTaskForm(EMPTY_TASK_FORM);
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to assign task', 'error');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleCompleteTask = async (task) => {
    setSavingTaskId(task.taskID);
    try {
      await updateTeamTask(task.taskID, {
        employeeID: task.employeeID,
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: 'Done',
        progress: 100,
        estimatedHours: task.estimatedHours,
        dueDate: task.dueDate,
      });
      toast('Task marked as done');
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to update task', 'error');
    } finally {
      setSavingTaskId(null);
    }
  };

  const calendarEvents = useMemo(() => (
    (Array.isArray(scopedTasks) ? scopedTasks : [])
      .filter((task) => task?.dueDate)
      .map((task) => {
        const date = new Date(`${task.dueDate}T12:00:00`);
        return {
          id: task.taskID,
          title: `${task.title} — ${task.employeeName || task.employeeID}`,
          start: date,
          end: date,
          allDay: true,
          resource: task,
        };
      })
  ), [scopedTasks]);

  const handleCalendarSlot = (slotInfo) => {
    const day = slotInfo?.start ? new Date(slotInfo.start) : new Date();
    const iso = day.toISOString().slice(0, 10);
    setCalendarSelectedDate(iso);
    setTaskForm({ ...EMPTY_TASK_FORM, dueDate: iso });
    setCalendarModalOpen(true);
  };

  const handleCreateTaskFromCalendar = async () => {
    await handleCreateTask();
    if (!taskForm.employeeID.trim() || !taskForm.title.trim()) return;
    setCalendarModalOpen(false);
  };

  const handleResolveRetention = async (alert) => {
    if (!alert?.matchingTask) {
      toast(t('No retention conversation task is linked to this employee yet.'), 'error');
      return;
    }
    const task = alert.matchingTask;
    setSavingTaskId(task.taskID);
    try {
      await updateTeamTask(task.taskID, {
        employeeID: task.employeeID,
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: 'Done',
        progress: 100,
        estimatedHours: task.estimatedHours,
        dueDate: task.dueDate,
      });
      toast(t('Retention conversation marked as resolved.'));
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to resolve retention conversation', 'error');
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleApproveTask = async (task) => {
    setSavingTaskId(task.taskID);
    try {
      await approveTeamTask(task.taskID);
      toast('Task approved');
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to approve task', 'error');
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleOvertimeReview = async (record, action) => {
    setSavingOvertimeId(record.attendanceID);
    try {
      await reviewTeamOvertime(record.attendanceID, { action });
      toast(action === 'approve' ? t('Overtime approved') : t('Overtime rejected'));
      await loadData();
    } catch (error) {
      toast(error.message || 'Failed to review overtime', 'error');
    } finally {
      setSavingOvertimeId(null);
    }
  };

  const teamFilterRow = isHRRole ? (
    <div className="hr-surface-card" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 220 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Team Filter')}</label>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #E5E7EB' }}
        >
          <option value="">{t('Select a team')}</option>
          {teamOptions.map((team) => (
            <option key={`page-team-${team.id}`} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>
      {selectedTeam ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge label={`${t('Team')}: ${teamNameById[String(selectedTeam)] || selectedTeam}`} color="accent" />
          <Btn size="sm" variant="ghost" onClick={() => setSelectedTeam('')}>{t('Clear filter')}</Btn>
        </div>
      ) : null}
    </div>
  ) : null;

  if (requiresTeamSelection) {
    return (
      <div className="hr-page-shell" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>
        <div className="hr-page-header is-split" style={{ marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{t('Team Hub')}</h2>
            <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>
              {t('Manage team goals and day-to-day work tasks from one place.')}
            </p>
          </div>
        </div>
        {teamFilterRow}
        <div className="hr-soft-empty" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 6 }}>
            {t('Select a team to view Team Hub')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0 }}>
            {t('Pick a team above to load metrics, tasks, goals, coaching, and retention alerts.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-page-shell" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>
      <div className="hr-page-header is-split" style={{ marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{t('Team Hub')}</h2>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>
            {t('Manage team goals and day-to-day work tasks from one place.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn variant="ghost" onClick={loadData}>{t('Refresh Workspace')}</Btn>
        </div>
      </div>

      {teamFilterRow}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            {
              label: t('Utilization Rate'),
              value: `${workforceMetrics.avgUtilization}%`,
              accent: workforceMetrics.avgUtilization > 100 ? '#E8321A'
                : workforceMetrics.avgUtilization >= 70 ? '#10B981'
                : '#F59E0B',
              note: t('Estimated logged effort vs. contracted hours per employee.'),
              breakdown: workforceMetrics.employeeUtilization,
            },
            {
              label: t('Performance Rate'),
              value: `${workforceMetrics.performanceRate}%`,
              accent: workforceMetrics.performanceRate >= 75 ? '#10B981' : workforceMetrics.performanceRate >= 45 ? '#F59E0B' : '#E8321A',
              note: t('Share of completed tasks finished on or before their due date.'),
            },
            {
              label: t('Completed Tasks'),
              value: workforceMetrics.completedCount,
              accent: '#175CD3',
              note: t('Total tasks marked Done in the active scope.'),
            },
          ].map((card) => (
            <div key={card.label} className="hr-stat-card" style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: card.accent }}>{card.value}</div>
              <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 6 }}>{card.note}</div>
              {card.breakdown?.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid #F3F4F6', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {card.breakdown
                    .sort((a, b) => b.utilizationRate - a.utilizationRate)
                    .map((emp) => (
                      <div key={emp.employeeID} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                        <span style={{ color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
                          {emp.employeeName}
                        </span>
                        <strong style={{
                          color: emp.utilizationRate > 100 ? '#E8321A'
                            : emp.utilizationRate >= 70 ? '#10B981'
                            : '#F59E0B',
                        }}>
                          {emp.utilizationRate}%
                        </strong>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: t('Total Goals'), value: stats.totalGoals, accent: '#111827' },
          { label: t('Open Tasks'), value: stats.openTasks, accent: '#E8321A' },
          { label: t('Overdue Items'), value: stats.overdueItems, accent: '#B42318' },
          { label: t('High Priority'), value: stats.highPriority, accent: '#B54708' },
          { label: t('Blocked Items'), value: stats.blockedItems, accent: '#7C2D12' },
          { label: t('Completed'), value: stats.completed, accent: '#10B981' },
        ].map((card) => (
          <div key={card.label} className="hr-stat-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: card.accent }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="hr-surface-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>{t('Team Coaching Snapshot')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('Keep delivery healthy, balance workload, and spot coaching needs across the team.')}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: t('Active Contributors'), value: teamCoachingSnapshot.contributors, accent: '#111827' },
            { label: t('Coach-ready employees'), value: teamCoachingSnapshot.coachReady, accent: '#E8321A' },
            { label: t('At-risk delivery'), value: teamCoachingSnapshot.atRiskDelivery, accent: '#B42318' },
            { label: t('Due this week'), value: teamCoachingSnapshot.dueThisWeek, accent: '#B54708' },
            { label: t('Average completion'), value: `${teamCoachingSnapshot.averageCompletion}%`, accent: '#10B981' },
          ].map((card) => (
            <div key={card.label} style={{ border: '1px solid #EAECF0', borderRadius: 14, padding: '14px 15px', background: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: card.accent }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--gray-900)', marginBottom: 4 }}>{t('Workload Balance')}</div>
            <p style={{ fontSize: 12.5, color: 'var(--gray-500)', marginBottom: 12 }}>{t('See which team members are overloaded, blocked, or ready for a quick coaching check-in.')}</p>

            {coachingRows.length === 0 ? (
              <div className="hr-soft-empty" style={{ padding: '18px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600 }}>{t('No coaching nudges are needed right now.')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {coachingRows.map((row) => (
                  <div key={row.key} style={{ border: '1px solid #EAECF0', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--gray-900)' }}>{row.employeeName || row.employeeID || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{row.team || '—'} • {row.openItems} {t('open items')}</div>
                      </div>
                      <Badge label={row.nextStep} color={row.blockedItems > 0 || row.overdueItems > 0 ? 'red' : 'orange'} />
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      {row.highPriorityItems ? <Badge label={`${row.highPriorityItems} ${t('High Priority')}`} color="accent" /> : null}
                      {row.overdueItems ? <Badge label={`${row.overdueItems} ${t('Overdue')}`} color="red" /> : null}
                      {row.blockedItems ? <Badge label={`${row.blockedItems} ${t('Blocked')}`} color="red" /> : null}
                      {row.dueThisWeek ? <Badge label={`${row.dueThisWeek} ${t('Due this week')}`} color="orange" /> : null}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--gray-500)' }}>
                        <span>{t('Average completion')}</span>
                        <strong style={{ color: 'var(--gray-700)' }}>{row.averageProgress}%</strong>
                      </div>
                      <div style={{ height: 8, background: '#F2F4F7', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(row.averageProgress, 100))}%`,
                            height: '100%',
                            background: row.averageProgress >= 75 ? '#12B76A' : row.averageProgress >= 45 ? '#F79009' : '#F04438',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--gray-900)', marginBottom: 4 }}>{t('Coaching Queue')}</div>
            <p style={{ fontSize: 12.5, color: 'var(--gray-500)', marginBottom: 12 }}>{t('Priority employees to check in with this week based on workload and blocker signals.')}</p>

            {coachingRows.length === 0 ? (
              <div className="hr-soft-empty" style={{ padding: '18px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600 }}>{t('No coaching nudges are needed right now.')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {coachingRows.slice(0, 4).map((row) => (
                  <div key={`queue-${row.key}`} style={{ border: '1px solid #EAECF0', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--gray-900)' }}>{row.employeeName || row.employeeID || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{row.team || '—'} • {row.openItems} {t('open items')}</div>
                      </div>
                      <Badge label={row.nextStep} color={row.blockedItems > 0 || row.overdueItems > 0 ? 'red' : 'orange'} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      <Badge label={`${t('Average completion')}: ${row.averageProgress}%`} color="gray" />
                      {row.highPriorityItems ? <Badge label={`${row.highPriorityItems} ${t('High Priority')}`} color="accent" /> : null}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Btn size="sm" variant="ghost" onClick={() => prepareCoachingFollowUp(row)}>{t('Prepare 1:1')}</Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hr-surface-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>{t('Leadership Focus Board')}</div>
            <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('Spot urgent team work, clear blockers, and prepare follow-up actions faster.')}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('Search employee, title, or priority')}
              style={{ minWidth: 240, padding: '10px 12px', borderRadius: 10, border: '1px solid #D0D5DD', outline: 'none' }}
            />
            <select
              value={focusFilter}
              onChange={(e) => setFocusFilter(e.target.value)}
              style={{ minWidth: 160, padding: '10px 12px', borderRadius: 10, border: '1px solid #D0D5DD', outline: 'none' }}
            >
              <option value="all">{t('All Focus')}</option>
              <option value="overdue">{t('Overdue')}</option>
              <option value="priority">{t('High Priority')}</option>
              <option value="blocked">{t('Blocked')}</option>
            </select>
          </div>
        </div>

        {/* Retention Alerts (§6) — non-dismissible, lives only on Leadership Focus Board */}
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#B42318', textTransform: 'uppercase', marginBottom: 4 }}>{t('Retention Alerts')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>
                {t('High-risk employees flagged for a retention conversation. Alerts persist until the assigned conversation is marked done.')}
              </div>
            </div>
            <Badge
              label={`${retentionAlerts.filter((alert) => !alert.resolved).length} ${t('open')}`}
              color={retentionAlerts.some((alert) => !alert.resolved) ? 'red' : 'green'}
            />
          </div>

          {retentionAlerts.length === 0 ? (
            <div className="hr-soft-empty" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600, margin: 0 }}>
                {t('No high-risk retention alerts in the active scope.')}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {retentionAlerts.map((alert) => (
                <div
                  key={alert.key}
                  style={{
                    border: alert.resolved ? '1px solid #D1FAE5' : '1px solid #FECACA',
                    borderRadius: 14,
                    padding: '14px 15px',
                    background: alert.resolved ? '#F0FDF4' : '#FFF1F0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--gray-900)' }}>
                        {alert.employeeName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                        {alert.team || '—'} • {alert.employeeID || '—'}
                      </div>
                    </div>
                    <Badge
                      label={alert.resolved ? t('Resolved') : t('Active')}
                      color={alert.resolved ? 'green' : 'red'}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    <Badge label={`${t('Risk')}: ${t(alert.riskLevel || 'High')}`} color={alert.riskLevel === 'Medium' ? 'orange' : 'red'} />
                    {Number.isFinite(alert.riskScore) && alert.riskScore > 0 ? (
                      <Badge label={`${t('Score')}: ${Math.round(alert.riskScore * 100) / 100}`} color="orange" />
                    ) : null}
                    {alert.matchingTask ? (
                      <Badge label={`${t('Conversation')}: ${t(alert.matchingTask.status)}`} color={alert.resolved ? 'green' : 'accent'} />
                    ) : (
                      <Badge label={t('Conversation: Not yet assigned')} color="gray" />
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-700)', marginTop: 10 }}>
                    {alert.resolved
                      ? t('The retention conversation has been completed and is kept here as a resolved log.')
                      : t('Hold a retention conversation with this employee. The alert remains visible until the conversation task is marked done.')}
                  </div>
                  {/* Actions: TL only — HR/Admin views are read-only (§6, §6c) */}
                  {!alert.resolved && user?.role === 'TeamLeader' && alert.matchingTask ? (
                    <div style={{ marginTop: 12 }}>
                      <Btn
                        size="sm"
                        variant="primary"
                        disabled={savingTaskId === alert.matchingTask.taskID}
                        onClick={() => handleResolveRetention(alert)}
                      >
                        {savingTaskId === alert.matchingTask.taskID
                          ? t('Saving...')
                          : t('Mark conversation done')}
                      </Btn>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Overtime Reviews — TLs approve/reject overtime that failed the 80% gate */}
        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#B54708', textTransform: 'uppercase', marginBottom: 4 }}>{t('Pending Overtime Reviews')}</div>
              <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>
                {t('Overtime hours that did not meet the 80% task-time threshold. Approve to count them as paid overtime, or reject to discard.')}
              </div>
            </div>
            <Badge
              label={`${scopedPendingOvertime.length} ${t('open')}`}
              color={scopedPendingOvertime.length ? 'yellow' : 'green'}
            />
          </div>

          {scopedPendingOvertime.length === 0 ? (
            <div className="hr-soft-empty" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600, margin: 0 }}>
                {t('No overtime is awaiting your review.')}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {scopedPendingOvertime.map((record) => {
                const ratioRaw = Number(record.workedHours) > 0 && record.taskTimeHours != null
                  ? (Number(record.taskTimeHours) / Number(record.workedHours)) * 100
                  : null;
                const isSaving = savingOvertimeId === record.attendanceID;
                return (
                  <div
                    key={record.attendanceID}
                    style={{
                      border: '1px solid #FDE68A',
                      borderRadius: 14,
                      padding: '14px 15px',
                      background: '#FFFBEB',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--gray-900)' }}>
                          {record.employeeName || record.employeeID}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                          {record.employeeTeam || '—'} • {record.date}
                        </div>
                      </div>
                      <Badge label={t('Pending Review')} color="yellow" />
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      <Badge label={`${t('Worked')}: ${record.workedHours ?? '—'}h`} color="gray" />
                      <Badge label={`${t('Overtime')}: +${record.overtimeHours ?? '—'}h`} color="accent" />
                      {ratioRaw !== null ? (
                        <Badge label={`${t('Task time')}: ${ratioRaw.toFixed(0)}%`} color={ratioRaw >= 80 ? 'green' : 'red'} />
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                      <Btn
                        size="sm"
                        variant="primary"
                        disabled={isSaving}
                        onClick={() => handleOvertimeReview(record, 'approve')}
                      >
                        {isSaving ? t('Saving...') : t('Approve')}
                      </Btn>
                      <Btn
                        size="sm"
                        variant="ghost"
                        disabled={isSaving}
                        onClick={() => handleOvertimeReview(record, 'reject')}
                      >
                        {isSaving ? t('Saving...') : t('Reject')}
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {leaderFocusItems.length === 0 ? (
          <div className="hr-soft-empty" style={{ padding: '18px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600 }}>{t('No urgent team items need attention right now.')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {leaderFocusItems.map((item) => (
              <div key={item.id} style={{ border: '1px solid #EAECF0', borderRadius: 14, padding: '14px 15px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--gray-900)' }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{item.employeeName || item.employeeID || '—'} • {item.team || '—'}</div>
                  </div>
                  <Badge label={t(item.kind === 'goal' ? 'Goal' : 'Task')} color={item.kind === 'goal' ? 'green' : 'blue'} />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <Badge label={t(item.status || (item.kind === 'goal' ? 'Not Started' : 'To Do'))} color={item.kind === 'goal' ? (GOAL_STATUS_COLORS[item.status] || 'gray') : (TASK_STATUS_COLORS[item.status] || 'gray')} />
                  <Badge label={t(item.priority || 'Medium')} color={PRIORITY_COLORS[item.priority] || 'accent'} />
                  {item.dueDate ? <Badge label={`${t('Due')} ${item.dueDate}`} color={item.overdue ? 'red' : 'gray'} /> : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  <Btn size="sm" variant="ghost" onClick={() => prepareFollowUp(item)}>{t('Prepare Follow-up')}</Btn>
                  {item.kind === 'goal' ? (
                    <Btn
                      size="sm"
                      variant="outline"
                      disabled={savingGoalId === item.source.goalID}
                      onClick={() => handleCompleteGoal(item.source)}
                    >
                      {savingGoalId === item.source.goalID ? t('Saving...') : t('Mark Complete')}
                    </Btn>
                  ) : item.source.status === 'Pending Review' ? (
                    <Btn
                      size="sm"
                      variant="primary"
                      disabled={savingTaskId === item.source.taskID}
                      onClick={() => handleApproveTask(item.source)}
                    >
                      {savingTaskId === item.source.taskID ? t('Saving...') : t('Approve')}
                    </Btn>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start', marginBottom: 20 }}>
        <div className="hr-surface-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{t('Assign New Goal')}</h3>
          {isHRRole && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Team')}</label>
              <select
                value={goalFormTeam}
                onChange={(e) => {
                  setGoalFormTeam(e.target.value);
                  setGoalForm((prev) => ({ ...prev, employeeID: '' }));
                }}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E7EAEE', borderRadius: 14, fontSize: 14, fontWeight: 500, background: '#fff' }}
              >
                <option value="">{teamOptions.length ? t('All teams') : t('No teams available')}</option>
                {teamOptions.map((team) => (
                  <option key={`goal-team-${team.id}`} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          )}
          <EmployeeSelect label={t('Employee')} value={goalForm.employeeID} onChange={(value) => setGoalForm((prev) => ({ ...prev, employeeID: value }))} placeholder={t('Select an employee')} teamFilter={isHRRole ? goalFormTeam : ''} />
          <Input label={t('Goal Title')} value={goalForm.title} onChange={(e) => setGoalForm((prev) => ({ ...prev, title: e.target.value }))} placeholder={t('Improve dashboard performance')} />
          <Textarea label={t('Description')} value={goalForm.description} onChange={(e) => setGoalForm((prev) => ({ ...prev, description: e.target.value }))} placeholder={t('Add details or milestones')} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Category')}</label>
              <select value={goalForm.category} onChange={(e) => setGoalForm((prev) => ({ ...prev, category: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                {['Performance', 'Development', 'Leadership', 'Attendance'].map((item) => <option key={item} value={item}>{t(item)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Priority')}</label>
              <select value={goalForm.priority} onChange={(e) => setGoalForm((prev) => ({ ...prev, priority: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                {['Low', 'Medium', 'High'].map((item) => <option key={item} value={item}>{t(item)}</option>)}
              </select>
            </div>
          </div>

          <Input label={t('Due Date')} type="date" value={goalForm.dueDate} onChange={(e) => setGoalForm((prev) => ({ ...prev, dueDate: e.target.value }))} />

          <Btn onClick={handleCreateGoal} disabled={goalSubmitting} style={{ width: '100%' }}>
            {goalSubmitting ? t('Saving...') : t('Assign Goal')}
          </Btn>
        </div>

        <div className="hr-table-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('Team Goal Tracker')}</h3>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{filteredGoals.length} {t('shown')}</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
          ) : goals.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--gray-500)' }}>{t('No team goals created yet.')}</div>
          ) : filteredGoals.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--gray-500)' }}>{t('No goals match the current leadership filter.')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    {['Employee', 'Goal', 'Due', 'Status', 'Progress', 'Action'].map((head) => (
                      <th key={head} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--gray-500)' }}>{t(head)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredGoals.map((goal) => (
                    <tr key={goal.goalID}>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 700 }}>{goal.employeeName || goal.employeeID}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{goal.team || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 700 }}>{goal.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t(goal.category)} • {t(goal.priority)}</div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Badge label={t(goal.priority || 'Medium')} color={PRIORITY_COLORS[goal.priority] || 'accent'} />
                          {goal.dueDate && goal.dueDate < todayKey && goal.status !== 'Completed' ? <Badge label={t('Overdue')} color="red" /> : null}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>{goal.dueDate || '—'}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}><Badge label={t(goal.status)} color={GOAL_STATUS_COLORS[goal.status] || 'gray'} /></td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6', fontWeight: 700 }}>{goal.progress}%</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
                        {goal.status !== 'Completed' ? (
                          <Btn size="sm" onClick={() => handleCompleteGoal(goal)} disabled={savingGoalId === goal.goalID}>
                            {savingGoalId === goal.goalID ? t('Saving...') : t('Mark Complete')}
                          </Btn>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t('Done')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
        <div className="hr-surface-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{t('Assign New Task')}</h3>
          {isHRRole && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Team')}</label>
              <select
                value={taskFormTeam}
                onChange={(e) => {
                  setTaskFormTeam(e.target.value);
                  setTaskForm((prev) => ({ ...prev, employeeID: '' }));
                }}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E7EAEE', borderRadius: 14, fontSize: 14, fontWeight: 500, background: '#fff' }}
              >
                <option value="">{teamOptions.length ? t('All teams') : t('No teams available')}</option>
                {teamOptions.map((team) => (
                  <option key={`task-team-${team.id}`} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          )}
          <EmployeeSelect label={t('Employee')} value={taskForm.employeeID} onChange={(value) => setTaskForm((prev) => ({ ...prev, employeeID: value }))} placeholder={t('Select an employee')} teamFilter={isHRRole ? taskFormTeam : ''} />
          <Input label={t('Task Title')} value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} placeholder={t('Prepare release checklist')} />
          <Textarea label={t('Description')} value={taskForm.description} onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))} placeholder={t('Describe the work item and deliverables')} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Priority')}</label>
              <select value={taskForm.priority} onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                {['Low', 'Medium', 'High'].map((item) => <option key={item} value={item}>{t(item)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Est. Hours')}</label>
              <input type="number" min="0" value={taskForm.estimatedHours} onChange={(e) => setTaskForm((prev) => ({ ...prev, estimatedHours: e.target.value === '' ? '' : Number(e.target.value) }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #E5E7EB' }} />
            </div>
          </div>

          <Input label={t('Due Date')} type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))} />

          <Btn onClick={handleCreateTask} disabled={taskSubmitting} style={{ width: '100%' }}>
            {taskSubmitting ? t('Saving...') : t('Assign Task')}
          </Btn>
        </div>

        <div className="hr-table-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('Team Task Tracker')}</h3>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{filteredTasks.length} {t('shown')}</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
          ) : tasks.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--gray-500)' }}>{t('No tasks assigned yet')}</div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--gray-500)' }}>{t('No tasks match the current leadership filter.')}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    {['Employee', 'Task', 'Due', 'Status', 'Progress', 'Action'].map((head) => (
                      <th key={head} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--gray-500)' }}>{t(head)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.taskID}>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 700 }}>{task.employeeName || task.employeeID}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{task.team || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 700 }}>{task.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                          {t(task.priority)} • {t('Est.')} {task.estimatedHours ?? '—'} {t('hrs')}
                          {task.status === 'Done' && (
                            <> • {t('Actual')} {task.actualHours ?? '—'} {t('hrs')}</>
                          )}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Badge label={t(task.priority || 'Medium')} color={PRIORITY_COLORS[task.priority] || 'accent'} />
                          {task.dueDate && task.dueDate < todayKey && task.status !== 'Done' ? <Badge label={t('Overdue')} color="red" /> : null}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>{task.dueDate || '—'}</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}><Badge label={t(task.status)} color={TASK_STATUS_COLORS[task.status] || 'gray'} /></td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6', fontWeight: 700 }}>{task.progress}%</td>
                      <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {task.status === 'Pending Review' ? (
                            <Btn size="sm" variant="primary" onClick={() => handleApproveTask(task)} disabled={savingTaskId === task.taskID}>
                              {savingTaskId === task.taskID ? t('Saving...') : t('Approve')}
                            </Btn>
                          ) : task.status === 'Done' ? (
                            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t('Done')}</span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{t('Awaiting employee')}</span>
                          )}
                          <Btn
                            size="sm"
                            variant="danger"
                            onClick={() => openContactModal(task)}
                            aria-label={t('Contact via email')}
                            title={t('Contact via email')}
                            style={{ padding: '7px 10px' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Team Task Calendar ──────────────────────────────────────────── */}
      <div className="hr-surface-card" style={{ padding: 20, marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{t('Team Task Calendar')}</h3>
            <p style={{ fontSize: 12.5, color: 'var(--gray-500)', margin: 0 }}>
              {t('Tasks are placed on their due date. Click any day to assign a new task with that deadline.')}
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{calendarEvents.length} {t('scheduled')}</span>
        </div>
        <div style={{ height: 560 }}>
          <Calendar
            localizer={calendarLocalizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            views={['month']}
            defaultView="month"
            popup
            selectable
            longPressThreshold={1}
            onSelectSlot={handleCalendarSlot}
            onSelectEvent={(event) => {
              const task = event?.resource;
              if (task) {
                setSearchTerm(task.title);
                setFocusFilter('all');
              }
            }}
            eventPropGetter={(event) => ({
              style: {
                background: PRIORITY_EVENT_COLOR[event?.resource?.priority] || '#475467',
                borderRadius: 6,
                border: 'none',
                color: '#fff',
                fontSize: 11.5,
                padding: '2px 6px',
              },
            })}
          />
        </div>
      </div>

      <Modal
        open={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        title={`${t('Assign Task')} — ${calendarSelectedDate || ''}`}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {isHRRole && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Team')}</label>
              <select
                value={taskFormTeam}
                onChange={(e) => {
                  setTaskFormTeam(e.target.value);
                  setTaskForm((prev) => ({ ...prev, employeeID: '' }));
                }}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E7EAEE', borderRadius: 14, fontSize: 14, fontWeight: 500, background: '#fff' }}
              >
                <option value="">{teamOptions.length ? t('All teams') : t('No teams available')}</option>
                {teamOptions.map((team) => (
                  <option key={`calendar-team-${team.id}`} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          )}
          <EmployeeSelect
            label={t('Employee')}
            value={taskForm.employeeID}
            onChange={(value) => setTaskForm((prev) => ({ ...prev, employeeID: value }))}
            placeholder={t('Select an employee')}
            teamFilter={isHRRole ? taskFormTeam : ''}
          />
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
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Priority')}</label>
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #E5E7EB' }}
              >
                {['Low', 'Medium', 'High'].map((item) => <option key={item} value={item}>{t(item)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Est. Hours')}</label>
              <input
                type="number"
                min="0"
                value={taskForm.estimatedHours}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, estimatedHours: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid #E5E7EB' }}
              />
            </div>
          </div>
          <Input
            label={t('Due Date')}
            type="date"
            value={taskForm.dueDate}
            onChange={(e) => setTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
          />
          <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
            <Btn variant="primary" onClick={handleCreateTaskFromCalendar} disabled={taskSubmitting} style={{ flex: 1 }}>
              {taskSubmitting ? t('Saving...') : t('Assign Task')}
            </Btn>
            <Btn variant="ghost" onClick={() => setCalendarModalOpen(false)} style={{ flex: 1 }}>
              {t('Cancel')}
            </Btn>
          </div>
          {(taskForm.employeeID && taskForm.title) ? (
            <Btn
              variant="danger"
              onClick={() => {
                const member = employeesById?.[taskForm.employeeID];
                openContactModal({
                  title: taskForm.title,
                  employeeEmail: member?.email || '',
                });
              }}
              aria-label={t('Contact via email')}
              title={t('Contact via email')}
              style={{ alignSelf: 'flex-end', padding: '10px 14px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </Btn>
          ) : null}
        </div>
      </Modal>

      {contactEmail ? (
        <ContactEmailModal
          to={contactEmail.to}
          subject={contactEmail.subject}
          onClose={() => setContactEmail(null)}
          onSent={() => toast.success(t('Email sent'))}
        />
      ) : null}
    </div>
  );
}
