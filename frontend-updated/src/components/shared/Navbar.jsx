import { 
  Layout, 
  BarChart, 
  Users, 
  Globe, 
  Shield, 
  Database, 
  Bell, 
  ShieldCheck, 
  Activity, 
  Copy, 
  User, 
  Zap,
  Target,
  FileText,
  Calendar,
  Settings,
  HelpCircle,
  Briefcase,
  ChevronLeft,
  Search,
  Plus,
  DollarSign,
  LogOut
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  getCandidateApplications,
  getForms,
  getJobs,
  getMyDocuments,
  getMyGoals,
  getMyOnboarding,
  getMyShifts,
  getMyTasks,
  getMyTickets,
  getMyTraining,
  getTeamGoals,
  getTeamTasks,
  hrGetDocuments,
  hrGetEmployees,
  hrGetExpenses,
  hrGetForms,
  hrGetLeaveRequests,
  hrGetPolicyCompliance,
  hrGetSubmissions,
  hrGetTickets,
} from '../../api/index.js';
import { Btn, Spinner } from './index.jsx';

const SidebarIcon = ({ name, active }) => {
  const icons = {
    Layout,
    BarChart,
    Users,
    Globe,
    Shield,
    Database,
    Bell,
    ShieldCheck,
    Activity,
    Copy,
    User,
    Zap,
    Target,
    FileText,
    Calendar,
    Settings,
    HelpCircle,
    Briefcase,
    Search,
    Plus,
    DollarSign
  };
  const Icon = icons[name] || HelpCircle;
  return <Icon size={20} style={{ color: active ? 'var(--color-primary-teal)' : 'inherit' }} />;
};

const NAV_GROUPS = {
  Admin: [
    {
      titleKey: 'nav.overview',
      items: [
        { path: '/admin/dashboard', labelKey: 'nav.dashboard', icon: 'Layout' },
        { path: '/admin/analytics', labelKey: 'nav.analytics', icon: 'BarChart' },
      ],
    },
    {
      titleKey: 'nav.administration',
      items: [
        { path: '/admin/users', labelKey: 'nav.users', icon: 'Users' },
        { path: '/admin/organization', labelKey: 'nav.orgConfig', icon: 'Globe' },
        { path: '/admin/permissions', labelKey: 'nav.permissions', icon: 'Shield' },
        { path: '/admin/data-hub', labelKey: 'nav.dataHub', icon: 'Database' },
        { path: '/admin/broadcast', labelKey: 'nav.broadcast', icon: 'Bell' },
        { path: '/hr/approvals', labelKey: 'nav.approvals', icon: 'ShieldCheck' },
        { path: '/hr/payroll', labelKey: 'nav.payroll', icon: 'Activity' },
        { path: '/hr/adjustments', labelKey: 'Commissions & Deductions', icon: 'DollarSign' },
        { path: '/hr/benefits', labelKey: 'nav.benefits', icon: 'Shield' },
        { path: '/hr/expenses', labelKey: 'nav.expenses', icon: 'Activity' },
        { path: '/hr/documents', labelKey: 'nav.documents', icon: 'Copy' },
        { path: '/hr/tickets', labelKey: 'nav.supportTickets', icon: 'Activity' },
      ],
    },
    {
      titleKey: 'nav.leadership',
      items: [
        { path: '/leader/team', labelKey: 'nav.teamHub', icon: 'Users' },
        { path: '/leader/recognition', labelKey: 'nav.recognition', icon: 'Bell' },
      ],
    },
    {
      titleKey: 'nav.governanceAndStability',
      items: [
        { path: '/admin/activity-logs', labelKey: 'nav.activityLogs', icon: 'Database' },
        { path: '/admin/intelligence', labelKey: 'nav.neuralIntelligence', icon: 'Zap' },
      ],
    },
    {
      titleKey: 'nav.account',
      items: [
        { path: '/employee/profile', labelKey: 'nav.profile', icon: 'User' },
      ],
    },
  ],
  HRManager: [
    {
      titleKey: 'nav.workforceOverview',
      items: [
        { path: '/hr/dashboard', labelKey: 'nav.dashboard', icon: 'Layout' },
        { path: '/hr/org-map', labelKey: 'nav.orgMap', icon: 'Zap' },
        { path: '/hr/employees', labelKey: 'nav.employees', icon: 'Users' },
        { path: '/hr/team', labelKey: 'nav.teamHub', icon: 'Users' },
        { path: '/hr/tickets', labelKey: 'nav.supportTickets', icon: 'Activity' },
      ],
    },
    {
      titleKey: 'nav.stabilityAndFinance',
      items: [
        { path: '/hr/attendance', labelKey: 'nav.attendance', icon: 'Activity' },
        { path: '/hr/payroll', labelKey: 'nav.payroll', icon: 'Activity' },
        { path: '/hr/adjustments', labelKey: 'Commissions & Deductions', icon: 'DollarSign' },
        { path: '/hr/benefits', labelKey: 'nav.benefits', icon: 'Shield' },
        { path: '/hr/expenses', labelKey: 'nav.expenses', icon: 'Activity' },
        { path: '/hr/approvals', labelKey: 'nav.approvals', icon: 'ShieldCheck' },
        { path: '/hr/documents', labelKey: 'nav.documents', icon: 'Copy' },
        { path: '/hr/shifts', labelKey: 'nav.shifts', icon: 'Activity' },
      ],
    },
    {
      titleKey: 'nav.talentAndGrowth',
      items: [
        { path: '/hr/reviews', labelKey: 'nav.reviews', icon: 'Bell' },
        { path: '/hr/training', labelKey: 'nav.training', icon: 'Database' },
        { path: '/hr/planning', labelKey: 'nav.workforcePlanning', icon: 'Zap' },
        { path: '/hr/succession', labelKey: 'nav.succession', icon: 'Users' },
        { path: '/hr/benchmarking', labelKey: 'nav.salaryBenchmarking', icon: 'Activity' },
        { path: '/hr/talent-matrix', labelKey: 'nav.talentMatrix', icon: 'Layout' },
        { path: '/hr/recognition', labelKey: 'nav.recognition', icon: 'Bell' },
      ],
    },
    {
      titleKey: 'nav.hiringAndEngagement',
      items: [
        { path: '/hr/jobs', labelKey: 'nav.jobs', icon: 'Copy' },
        { path: '/hr/cv-ranking', labelKey: 'nav.cvRanking', icon: 'Zap' },
        { path: '/hr/onboarding', labelKey: 'nav.onboarding', icon: 'Users' },
        { path: '/hr/attrition', labelKey: 'nav.attritionStability', icon: 'Activity' },
        { path: '/hr/forms', labelKey: 'nav.forms', icon: 'Copy' },
        { path: '/hr/submissions', labelKey: 'nav.submissions', icon: 'Copy' },
        { path: '/hr/policies', labelKey: 'nav.policies', icon: 'Shield' },
      ],
    },
  ],
  TeamMember: [
    {
      titleKey: 'nav.overview',
      items: [
        { path: '/employee/dashboard', labelKey: 'nav.dashboard', icon: 'Layout' },
      ],
    },
    {
      titleKey: 'nav.administration',
      items: [
        { path: '/employee/attendance', labelKey: 'nav.attendance', icon: 'Activity' },
        { path: '/employee/shifts', labelKey: 'nav.shifts', icon: 'Calendar' },
        { path: '/employee/leave-requests', labelKey: 'Leave Requests', icon: 'Calendar' },
        { path: '/employee/payroll', labelKey: 'nav.payroll', icon: 'Activity' },
        { path: '/employee/benefits', labelKey: 'nav.benefits', icon: 'Shield' },
        { path: '/employee/expenses', labelKey: 'nav.expenses', icon: 'Activity' },
        { path: '/employee/documents', labelKey: 'nav.documents', icon: 'Copy' },
        { path: '/employee/tickets', labelKey: 'nav.supportTickets', icon: 'Activity' },
        { path: '/employee/policies', labelKey: 'nav.policies', icon: 'Shield' },
        { path: '/employee/feedback', labelKey: 'nav.feedback', icon: 'Bell' },
        { path: '/employee/sheet', labelKey: 'Employee Sheet', icon: 'Copy' },
      ],
    },
    {
      titleKey: 'nav.growth',
      items: [
        { path: '/employee/tasks', labelKey: 'nav.tasks', icon: 'Activity' },
        { path: '/employee/goals', labelKey: 'nav.goals', icon: 'Activity' },
        { path: '/employee/training', labelKey: 'nav.training', icon: 'Activity' },
        { path: '/employee/reviews', labelKey: 'nav.reviews', icon: 'Activity' },
        { path: '/employee/career-path', labelKey: 'Career Path', icon: 'Activity' },
      ],
    },
  ],
  TeamLeader: [
    {
      titleKey: 'nav.leadershipControl',
      items: [
        { path: '/leader/dashboard', labelKey: 'nav.tacticalDashboard', icon: 'Layout' },
        { path: '/leader/team-calendar', labelKey: 'nav.operationsSchedule', icon: 'Calendar' },
        { path: '/leader/team-analytics', labelKey: 'nav.performanceIntel', icon: 'BarChart' },
        { path: '/leader/team', labelKey: 'nav.missionControl', icon: 'Target' },
      ],
    },
    {
      titleKey: 'nav.workforceOperations',
      items: [
        { path: '/leader/team-requests', labelKey: 'nav.strategicRequests', icon: 'FileText' },
        { path: '/leader/team-support', labelKey: 'nav.supportRadar', icon: 'Activity' },
        { path: '/leader/team-feedback', labelKey: 'nav.pulseSignals', icon: 'Bell' },
        { path: '/leader/team-directory', labelKey: 'nav.teamRoster', icon: 'Users' },
        { path: '/leader/recognition', labelKey: 'nav.rewardsMerit', icon: 'Zap' },
      ],
    },
    {
      titleKey: 'nav.personalWorkspace',
      items: [
        { path: '/employee/profile', labelKey: 'nav.profile', icon: 'User' },
        { path: '/leader/attendance', labelKey: 'nav.attendanceTrack', icon: 'Activity' },
        { path: '/leader/payroll', labelKey: 'nav.financialHub', icon: 'Activity' },
        { path: '/leader/documents', labelKey: 'nav.vault', icon: 'Copy' },
        { path: '/leader/tickets', labelKey: 'nav.supportTickets', icon: 'Activity' },
      ],
    },
  ],
  Candidate: [
    {
      titleKey: 'nav.career',
      items: [
        { path: '/candidate/dashboard', labelKey: 'nav.jobs', icon: 'Layout' },
        { path: '/candidate/applications', labelKey: 'nav.applications', icon: 'Copy' },
      ],
    },
  ],
};

const SEEN_NOTIFICATIONS_KEY = 'empowerhr-seen-notifications';
const FAVORITE_LINKS_KEY = 'empowerhr-favorite-links';
const RECENT_LINKS_KEY = 'empowerhr-recent-links';

function getSeenNotificationIds(user) {
  if (!user?.email) return [];
  try {
    const raw = localStorage.getItem(`${SEEN_NOTIFICATIONS_KEY}:${user.email}:${user.role}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSeenNotificationIds(user, ids) {
  if (!user?.email) return;
  localStorage.setItem(`${SEEN_NOTIFICATIONS_KEY}:${user.email}:${user.role}`, JSON.stringify(ids));
}

function getFavoritePaths(user) {
  if (!user?.email) return [];
  try {
    const raw = localStorage.getItem(`${FAVORITE_LINKS_KEY}:${user.email}:${user.role}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setFavoritePaths(user, paths) {
  if (!user?.email) return;
  localStorage.setItem(`${FAVORITE_LINKS_KEY}:${user.email}:${user.role}`, JSON.stringify(paths));
}

function getRecentPaths(user) {
  if (!user?.email) return [];
  try {
    const raw = localStorage.getItem(`${RECENT_LINKS_KEY}:${user.email}:${user.role}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setRecentPaths(user, paths) {
  if (!user?.email) return;
  localStorage.setItem(`${RECENT_LINKS_KEY}:${user.email}:${user.role}`, JSON.stringify(paths));
}

function attachReadState(items, seenIds) {
  return items.map((item) => ({
    ...item,
    read: seenIds.includes(item.id),
  }));
}

function buildEmployeeNotifications({ forms = [], tasks = [], tickets = [], documents = [] }, t) {
  const items = [];
  const pendingForms = forms.filter((form) => form?.submission?.status !== 'Completed');
  const openTasks = tasks.filter((task) => !['Done', 'Completed'].includes(task?.status));
  const openTickets = tickets.filter((ticket) => !['Resolved', 'Closed'].includes(ticket?.status));
  const documentUpdates = documents.filter((document) => ['Pending', 'In Progress', 'Issued'].includes(document?.status));

  if (pendingForms.length) {
    items.push({
      id: `feedback-${pendingForms.length}`,
      title: t('notifications.feedbackTitle'),
      message: t('notifications.feedbackMessage', { count: pendingForms.length }),
      path: '/employee/feedback',
      tone: 'accent',
      priority: 5,
      preferenceKey: 'shortlistUpdates',
    });
  }

  if (openTasks.length) {
    items.push({
      id: `tasks-${openTasks.length}`,
      title: t('notifications.tasksTitle'),
      message: t('notifications.tasksMessage', { count: openTasks.length }),
      path: '/employee/tasks',
      tone: 'orange',
      priority: 4,
      preferenceKey: 'shortlistUpdates',
    });
  }

  if (openTickets.length) {
    items.push({
      id: `support-${openTickets.length}`,
      title: t('notifications.supportTitle'),
      message: t('notifications.supportMessage', { count: openTickets.length }),
      path: '/employee/tickets',
      tone: 'red',
      priority: 3,
      preferenceKey: 'interviewReminders',
    });
  }

  if (documentUpdates.length) {
    items.push({
      id: `documents-${documentUpdates.length}`,
      title: t('notifications.documentsTitle'),
      message: t('notifications.documentsMessage', { count: documentUpdates.length }),
      path: '/employee/documents',
      tone: 'green',
      priority: 2,
      preferenceKey: 'interviewReminders',
    });
  }

  return items;
}

function buildLeaderNotifications({ forms = [], tasks = [], tickets = [], documents = [], teamGoals = [], teamTasks = [] }, t) {
  const items = buildEmployeeNotifications({ forms, tasks, tickets, documents }, t);
  const teamItems = [
    ...teamGoals.filter((goal) => goal?.status !== 'Completed'),
    ...teamTasks.filter((task) => task?.status !== 'Done'),
  ];

  if (teamItems.length) {
    items.unshift({
      id: `team-${teamItems.length}`,
      title: t('notifications.teamTitle'),
      message: t('notifications.teamMessage', { count: teamItems.length }),
      path: '/leader/team',
      tone: 'red',
      priority: 6,
      preferenceKey: 'interviewReminders',
    });
  }

  return items;
}

function buildHrNotifications({ leaveRequests = [], tickets = [], documents = [], expenses = [], jobs = [], policyCompliance = null }, t) {
  const items = [];
  const pendingLeaves = leaveRequests.filter((request) => request?.status === 'Pending');
  const openTickets = tickets.filter((ticket) => !['Resolved', 'Closed'].includes(ticket?.status));
  const pendingDocuments = documents.filter((document) => ['Pending', 'In Progress'].includes(document?.status));
  const pendingExpenses = expenses.filter((expense) => ['Pending', 'Submitted'].includes(expense?.status));
  const activeJobs = jobs.filter((job) => job?.is_active !== false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ageInDays = (value) => {
    const parsed = parsePlannerDate(value);
    if (!parsed) return 0;
    const target = new Date(parsed);
    target.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today.getTime() - target.getTime()) / 86400000));
  };
  const daysUntil = (value) => {
    const parsed = parsePlannerDate(value);
    if (!parsed) return Number.MAX_SAFE_INTEGER;
    const target = new Date(parsed);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  };
  const escalationCount =
    pendingLeaves.filter((request) => daysUntil(request?.startDate) <= 2 || ageInDays(request?.requestedAt) >= 1).length
    + pendingExpenses.filter((expense) => ageInDays(expense?.createdAt) >= 2).length
    + pendingDocuments.filter((document) => ageInDays(document?.createdAt) >= 1).length
    + openTickets.filter((ticket) => {
      const limit = { Critical: 1, High: 2, Medium: 3, Low: 5 }[ticket?.priority || 'Medium'] || 3;
      return ageInDays(ticket?.createdAt || ticket?.updatedAt) >= Math.max(1, limit - 1);
    }).length;
  const outstandingPolicyAcks = policyCompliance?.summary?.outstandingEmployees ?? 0;
  const duePolicyItems = policyCompliance?.summary?.dueThisWeekCount ?? 0;

  if (outstandingPolicyAcks) {
    items.push({
      id: `policy-compliance-${outstandingPolicyAcks}`,
      title: t('Policy Compliance'),
      message: t('There are {{count}} outstanding policy acknowledgements to follow up.', { count: outstandingPolicyAcks }),
      path: '/hr/policies',
      tone: duePolicyItems ? 'red' : 'accent',
      priority: duePolicyItems ? 8 : 4,
      preferenceKey: 'shortlistUpdates',
    });
  }

  if (escalationCount) {
    items.push({
      id: `hr-escalation-${escalationCount}`,
      title: t('Escalation Watch'),
      message: t('There are {{count}} approval items at risk or overdue.', { count: escalationCount }),
      path: '/hr/approvals',
      tone: 'red',
      priority: 7,
      preferenceKey: 'interviewReminders',
    });
  }

  if (pendingLeaves.length) {
    items.push({
      id: `leave-${pendingLeaves.length}`,
      title: t('notifications.leaveTitle'),
      message: t('notifications.leaveMessage', { count: pendingLeaves.length }),
      path: '/hr/attendance',
      tone: 'orange',
      priority: 6,
      preferenceKey: 'interviewReminders',
    });
  }

  if (pendingExpenses.length) {
    items.push({
      id: `expenses-${pendingExpenses.length}`,
      title: t('notifications.expenseTitle'),
      message: t('notifications.expenseMessage', { count: pendingExpenses.length }),
      path: '/hr/expenses',
      tone: 'accent',
      priority: 5,
      preferenceKey: 'interviewReminders',
    });
  }

  if (pendingDocuments.length) {
    items.push({
      id: `hr-documents-${pendingDocuments.length}`,
      title: t('notifications.documentsTitle'),
      message: t('notifications.documentsMessage', { count: pendingDocuments.length }),
      path: '/hr/documents',
      tone: 'green',
      priority: 4,
      preferenceKey: 'shortlistUpdates',
    });
  }

  if (openTickets.length) {
    items.push({
      id: `hr-support-${openTickets.length}`,
      title: t('notifications.supportTitle'),
      message: t('notifications.supportMessage', { count: openTickets.length }),
      path: '/hr/tickets',
      tone: 'red',
      priority: 3,
      preferenceKey: 'interviewReminders',
    });
  }

  if (activeJobs.length) {
    items.push({
      id: `hiring-${activeJobs.length}`,
      title: t('notifications.hiringTitle'),
      message: t('notifications.hiringMessage', { count: activeJobs.length }),
      path: '/hr/jobs',
      tone: 'accent',
      priority: 2,
      preferenceKey: 'newApplications',
    });
  }

  return items;
}

function buildCandidateNotifications({ jobs = [], applications = [] }, t) {
  const activeJobs = jobs.filter((job) => job?.is_active !== false);
  const shortlisted = applications.filter((application) => application?.review_stage === 'Shortlisted');
  const interviews = applications.filter((application) => application?.review_stage === 'Interview');
  const items = [];

  if (activeJobs.length) {
    items.push({
      id: `candidate-jobs-${activeJobs.length}`,
      title: t('notifications.candidateTitle'),
      message: t('notifications.candidateMessage', { count: activeJobs.length }),
      path: '/candidate/dashboard',
      tone: 'accent',
      priority: 3,
      preferenceKey: 'newApplications',
    });
  }

  if (shortlisted.length) {
    items.push({
      id: `candidate-shortlist-${shortlisted.length}`,
      title: t('notifications.shortlistTitle'),
      message: t('notifications.shortlistMessage', { count: shortlisted.length }),
      path: '/candidate/applications',
      tone: 'orange',
      priority: 5,
      preferenceKey: 'shortlistUpdates',
    });
  }

  if (interviews.length) {
    items.push({
      id: `candidate-interviews-${interviews.length}`,
      title: t('notifications.interviewTitle'),
      message: t('notifications.interviewMessage', { count: interviews.length }),
      path: '/candidate/applications',
      tone: 'red',
      priority: 6,
      preferenceKey: 'interviewReminders',
    });
  }

  return items;
}

function applyNotificationPreferences(items, preferences, t, user) {
  const prefs = {
    newApplications: true,
    shortlistUpdates: true,
    interviewReminders: true,
    weeklyDigest: false,
    ...(preferences || {}),
  };

  let filtered = items.filter((item) => prefs[item.preferenceKey || 'shortlistUpdates'] !== false);

  if (prefs.weeklyDigest && filtered.length) {
    const homePath = user?.role === 'Candidate'
      ? '/candidate/applications'
      : user?.role === 'HRManager' || user?.role === 'Admin'
        ? '/hr/dashboard'
        : '/employee/profile';

    filtered = [{
      id: `weekly-digest-${user?.role || 'user'}-${filtered.length}`,
      title: t('notifications.digestTitle'),
      message: t('notifications.digestMessage', { count: filtered.length }),
      path: homePath,
      tone: 'accent',
      priority: 7,
      preferenceKey: 'weeklyDigest',
    }, ...filtered];
  }

  return filtered;
}

function parsePlannerDate(value) {
  if (!value) return null;
  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T12:00:00` : value;
  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPlannerDateLabel(value, t) {
  const parsed = parsePlannerDate(value);
  if (!parsed) return t('planner.noDate');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parsed);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return t('planner.today');
  if (diffDays === 1) return t('planner.tomorrow');
  if (diffDays > 1) return t('planner.inDays', { count: diffDays });
  return t('planner.overdue', { count: Math.abs(diffDays) });
}

function normalizePlannerItems(items, t) {
  return items
    .filter((item) => item?.title)
    .map((item) => {
      const parsed = parsePlannerDate(item.date);
      return {
        ...item,
        sortDate: parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER,
        dateLabel: getPlannerDateLabel(item.date, t),
      };
    })
    .sort((a, b) => a.sortDate - b.sortDate)
    .slice(0, 6);
}

function buildEmployeePlanner({ shifts = [], tasks = [], goals = [], training = [], onboarding = [], tickets = [], documents = [] }, t) {
  const items = [
    ...shifts
      .filter((shift) => ['Planned', 'Confirmed'].includes(shift?.status))
      .map((shift) => ({
        id: `shift-${shift.scheduleID}`,
        title: `${t('nav.shifts')}: ${t(shift.shiftType || 'Remote')}`,
        subtitle: shift.location || t(shift.status || 'Planned'),
        date: shift.shiftDate,
        path: '/employee/shifts',
        tone: 'accent',
      })),
    ...tasks
      .filter((task) => !['Done', 'Completed'].includes(task?.status))
      .map((task) => ({
        id: `task-${task.taskID}`,
        title: task.title,
        subtitle: `${t('nav.tasks')} • ${t(task.status || 'To Do')}`,
        date: task.dueDate || task.updatedAt,
        path: '/employee/tasks',
        tone: 'orange',
      })),
    ...goals
      .filter((goal) => goal?.status !== 'Completed')
      .map((goal) => ({
        id: `goal-${goal.goalID}`,
        title: goal.title,
        subtitle: `${t('nav.goals')} • ${t(goal.status || 'In Progress')}`,
        date: goal.dueDate || goal.updatedAt,
        path: '/employee/goals',
        tone: 'green',
      })),
    ...training
      .filter((course) => course?.status !== 'Completed')
      .map((course) => ({
        id: `training-${course.courseID}`,
        title: course.title,
        subtitle: `${t('nav.training')} • ${t(course.category || 'Technical')}`,
        date: course.dueDate || course.createdAt,
        path: '/employee/training',
        tone: 'accent',
      })),
    ...onboarding
      .filter((plan) => plan?.status !== 'Completed')
      .map((plan) => ({
        id: `onboarding-${plan.planID}`,
        title: plan.title,
        subtitle: `${t('nav.onboarding')} • ${t(plan.status || 'Not Started')}`,
        date: plan.targetDate || plan.startDate || plan.updatedAt,
        path: '/employee/onboarding',
        tone: 'green',
      })),
    ...tickets
      .filter((ticket) => !['Resolved', 'Closed'].includes(ticket?.status))
      .map((ticket) => ({
        id: `ticket-${ticket.ticketID}`,
        title: ticket.subject,
        subtitle: `${t('nav.supportTickets')} • ${t(ticket.status || 'Open')}`,
        date: ticket.updatedAt || ticket.createdAt,
        path: '/employee/tickets',
        tone: 'red',
      })),
    ...documents
      .filter((document) => ['Pending', 'In Progress'].includes(document?.status))
      .map((document) => ({
        id: `document-${document.requestID}`,
        title: t(document.documentType || 'Document Type'),
        subtitle: `${t('nav.documents')} • ${t(document.status || 'Pending')}`,
        date: document.updatedAt || document.createdAt,
        path: '/employee/documents',
        tone: 'accent',
      })),
  ];

  return normalizePlannerItems(items, t);
}

function buildLeaderPlanner({ shifts = [], tasks = [], goals = [], training = [], onboarding = [], tickets = [], documents = [], teamGoals = [], teamTasks = [] }, t) {
  const personalItems = buildEmployeePlanner({ shifts, tasks, goals, training, onboarding, tickets, documents }, t);
  const teamItems = normalizePlannerItems([
    ...teamGoals
      .filter((goal) => goal?.status !== 'Completed')
      .map((goal) => ({
        id: `team-goal-${goal.goalID}`,
        title: goal.title,
        subtitle: `${goal.employeeName || goal.employeeID || t('Employee')} • ${t(goal.status || 'In Progress')}`,
        date: goal.dueDate || goal.updatedAt,
        path: '/leader/team',
        tone: 'green',
      })),
    ...teamTasks
      .filter((task) => !['Done', 'Completed'].includes(task?.status))
      .map((task) => ({
        id: `team-task-${task.taskID}`,
        title: task.title,
        subtitle: `${task.employeeName || task.employeeID || t('Employee')} • ${t(task.status || 'To Do')}`,
        date: task.dueDate || task.updatedAt,
        path: '/leader/team',
        tone: 'orange',
      })),
  ], t);

  return normalizePlannerItems([...personalItems, ...teamItems], t);
}

function buildHrPlanner({ leaveRequests = [], expenses = [], documents = [], tickets = [] }, t) {
  const items = [
    ...leaveRequests
      .filter((request) => request?.status === 'Pending')
      .map((request) => ({
        id: `leave-${request.leaveRequestID}`,
        title: request.employeeName || request.employeeID || t('Employee'),
        subtitle: `${t('Leave requests')} • ${t(request.leaveType || 'Annual')}`,
        date: request.startDate || request.createdAt,
        path: '/hr/attendance',
        tone: 'orange',
      })),
    ...expenses
      .filter((expense) => ['Pending', 'Submitted'].includes(expense?.status))
      .map((expense) => ({
        id: `expense-${expense.claimID}`,
        title: expense.title,
        subtitle: `${t('Expense claims')} • ${expense.employeeName || expense.employeeID || t('Employee')}`,
        date: expense.expenseDate || expense.updatedAt,
        path: '/hr/expenses',
        tone: 'accent',
      })),
    ...documents
      .filter((document) => ['Pending', 'In Progress'].includes(document?.status))
      .map((document) => ({
        id: `hr-document-${document.requestID}`,
        title: t(document.documentType || 'Document Type'),
        subtitle: `${t('Document Requests')} • ${document.employeeName || document.employeeID || t('Employee')}`,
        date: document.updatedAt || document.createdAt,
        path: '/hr/documents',
        tone: 'green',
      })),
    ...tickets
      .filter((ticket) => !['Resolved', 'Closed'].includes(ticket?.status))
      .map((ticket) => ({
        id: `hr-ticket-${ticket.ticketID}`,
        title: ticket.subject,
        subtitle: `${t('Support Tickets')} • ${t(ticket.priority || 'Medium')}`,
        date: ticket.updatedAt || ticket.createdAt,
        path: '/hr/tickets',
        tone: 'red',
      })),
  ];

  return normalizePlannerItems(items, t);
}

function buildCandidatePlanner({ applications = [], jobs = [] }, t) {
  const items = [
    ...applications.map((application) => ({
      id: `application-${application.id}`,
      title: application.job_title || t('Untitled'),
      subtitle: `${t('Stage:')} ${t(application.review_stage || 'Applied')}`,
      date: application.stage_updated_at || application.submitted_at,
      path: '/candidate/applications',
      tone: application.review_stage === 'Interview' ? 'orange' : application.review_stage === 'Hired' ? 'green' : 'accent',
    })),
    ...jobs
      .filter((job) => job?.is_active !== false)
      .map((job) => ({
        id: `planner-job-${job.id}`,
        title: job.title,
        subtitle: `${t('Open Positions')} • ${job.department || t('General')}`,
        date: job.created_at,
        path: '/candidate/dashboard',
        tone: 'accent',
      })),
  ];

  return normalizePlannerItems(items, t);
}

export function Navbar({ isCollapsed, onToggle }) {
  const { user, logout, notificationPreferences, canAccessPath, resolvePath } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const groups = useMemo(() => {
    if (!user) return [];
    return (NAV_GROUPS[user.role] ?? [])
      .map((group) => ({
        ...group,
        items: (group.items || [])
          .map((link) => ({ ...link, path: resolvePath(link.path) }))
          .filter((link) => canAccessPath(link.path)),
      }))
      .filter((group) => group.items.length > 0);
  }, [canAccessPath, resolvePath, user]);
  const activePath = location.pathname;
  const activeGroupTitle = groups.find((group) => group.items.some((link) => activePath === link.path))?.titleKey ?? groups[0]?.titleKey ?? '';
  const [openGroup, setOpenGroup] = useState(activeGroupTitle);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [favoritePaths, setFavoritePathsState] = useState([]);
  const [recentPaths, setRecentPathsState] = useState([]);
  const [showPlanner, setShowPlanner] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerItems, setPlannerItems] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchData, setSearchData] = useState([]);

  useEffect(() => {
    if (activeGroupTitle) setOpenGroup(activeGroupTitle);
  }, [activeGroupTitle]);

  useEffect(() => {
    if (!user) {
      setFavoritePathsState([]);
      setRecentPathsState([]);
      return;
    }
    setFavoritePathsState(getFavoritePaths(user));
    setRecentPathsState(getRecentPaths(user));
  }, [user]);

  useEffect(() => {
    if (!user || !activePath) return;
    const allowedPaths = groups.flatMap((group) => group.items.map((item) => item.path));
    if (!allowedPaths.includes(activePath)) return;

    setRecentPathsState((current) => {
      const next = [activePath, ...current.filter((item) => item !== activePath)].slice(0, 6);
      setRecentPaths(user, next);
      return next;
    });
  }, [activePath, groups, user]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setNotificationLoading(true);
    try {
      let items = [];

      if (user.role === 'Candidate') {
        const [jobs, applications] = await Promise.all([
          getJobs(),
          getCandidateApplications(user.email).catch(() => []),
        ]);
        items = buildCandidateNotifications({ jobs, applications }, t);
      } else if (user.role === 'HRManager' || user.role === 'Admin') {
        const [leaveRequests, tickets, documents, expenses, jobs, policyCompliance] = await Promise.all([
          hrGetLeaveRequests(),
          hrGetTickets(),
          hrGetDocuments(),
          hrGetExpenses(),
          getJobs(),
          hrGetPolicyCompliance().catch(() => null),
        ]);
        items = buildHrNotifications({ leaveRequests, tickets, documents, expenses, jobs, policyCompliance }, t);
      } else if (user.role === 'TeamLeader') {
        const [forms, tasks, tickets, documents, teamGoals, teamTasks] = await Promise.all([
          getForms(user.employee_id),
          getMyTasks(user.employee_id),
          getMyTickets(user.employee_id),
          getMyDocuments(user.employee_id),
          getTeamGoals(),
          getTeamTasks(),
        ]);
        items = buildLeaderNotifications({ forms, tasks, tickets, documents, teamGoals, teamTasks }, t);
      } else {
        const [forms, tasks, tickets, documents] = await Promise.all([
          getForms(user.employee_id),
          getMyTasks(user.employee_id),
          getMyTickets(user.employee_id),
          getMyDocuments(user.employee_id),
        ]);
        items = buildEmployeeNotifications({ forms, tasks, tickets, documents }, t);
      }

      const seenIds = getSeenNotificationIds(user);
      const preferredItems = applyNotificationPreferences(items, notificationPreferences, t, user);
      const rankedItems = preferredItems
        .map((item) => ({ ...item, path: resolvePath(item.path) }))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, 6);
      setNotifications(attachReadState(rankedItems, seenIds));
    } catch {
      setNotifications([]);
    } finally {
      setNotificationLoading(false);
    }
  }, [notificationPreferences, resolvePath, t, user]);

  useEffect(() => {
    if (!user) return undefined;
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 60000);
    return () => window.clearInterval(timer);
  }, [loadNotifications, user]);

  const loadPlannerData = useCallback(async () => {
    if (!user) return;

    setPlannerLoading(true);
    try {
      let items = [];

      if (user.role === 'Candidate') {
        const [applications, jobs] = await Promise.all([
          getCandidateApplications(user.email).catch(() => []),
          getJobs(),
        ]);
        items = buildCandidatePlanner({ applications, jobs }, t);
      } else if (user.role === 'HRManager' || user.role === 'Admin') {
        const [leaveRequests, expenses, documents, tickets] = await Promise.all([
          hrGetLeaveRequests(),
          hrGetExpenses(),
          hrGetDocuments(),
          hrGetTickets(),
        ]);
        items = buildHrPlanner({ leaveRequests, expenses, documents, tickets }, t);
      } else if (user.role === 'TeamLeader') {
        const [shifts, tasks, goals, training, onboarding, tickets, documents, teamGoals, teamTasks] = await Promise.all([
          getMyShifts(user.employee_id),
          getMyTasks(user.employee_id),
          getMyGoals(user.employee_id),
          getMyTraining(user.employee_id),
          getMyOnboarding(user.employee_id),
          getMyTickets(user.employee_id),
          getMyDocuments(user.employee_id),
          getTeamGoals(),
          getTeamTasks(),
        ]);
        items = buildLeaderPlanner({ shifts, tasks, goals, training, onboarding, tickets, documents, teamGoals, teamTasks }, t);
      } else {
        const [shifts, tasks, goals, training, onboarding, tickets, documents] = await Promise.all([
          getMyShifts(user.employee_id),
          getMyTasks(user.employee_id),
          getMyGoals(user.employee_id),
          getMyTraining(user.employee_id),
          getMyOnboarding(user.employee_id),
          getMyTickets(user.employee_id),
          getMyDocuments(user.employee_id),
        ]);
        items = buildEmployeePlanner({ shifts, tasks, goals, training, onboarding, tickets, documents }, t);
      }

      setPlannerItems(items.map((item) => ({ ...item, path: resolvePath(item.path) })));
    } catch {
      setPlannerItems([]);
    } finally {
      setPlannerLoading(false);
    }
  }, [resolvePath, t, user]);

  const favoriteLinks = useMemo(
    () => groups
      .flatMap((group) => group.items.map((link) => ({
        ...link,
        title: t(link.labelKey),
        groupTitle: t(group.titleKey),
      })))
      .filter((link) => favoritePaths.includes(link.path))
      .sort((a, b) => favoritePaths.indexOf(a.path) - favoritePaths.indexOf(b.path)),
    [favoritePaths, groups, t],
  );

  const recentLinks = useMemo(
    () => groups
      .flatMap((group) => group.items.map((link) => ({
        ...link,
        title: t(link.labelKey),
        groupTitle: t(group.titleKey),
      })))
      .filter((link) => recentPaths.includes(link.path))
      .sort((a, b) => recentPaths.indexOf(a.path) - recentPaths.indexOf(b.path)),
    [groups, recentPaths, t],
  );

  const pageSearchEntries = useMemo(
    () => groups.flatMap((group) => group.items.map((link) => ({
      id: `page-${link.path}`,
      title: t(link.labelKey),
      subtitle: t(group.titleKey),
      category: t('search.category.page'),
      path: link.path,
      searchText: `${t(link.labelKey)} ${t(group.titleKey)} ${link.path}`.toLowerCase(),
    }))),
    [groups, t],
  );

  const loadSearchData = useCallback(async () => {
    if (!user) return;

    setSearchLoading(true);
    try {
      let entries = [];

      if (user.role === 'Candidate') {
        const jobs = await getJobs();
        entries = jobs.map((job) => ({
          id: `job-${job.id}`,
          title: job.title,
          subtitle: job.department || t('General'),
          category: t('search.category.job'),
          path: '/candidate/dashboard',
          searchText: `${job.title} ${job.department || ''} ${job.description || ''}`.toLowerCase(),
        }));
      } else if (user.role === 'HRManager' || user.role === 'Admin') {
        const [employees, jobs, forms, submissions, tickets, documents] = await Promise.all([
          hrGetEmployees(),
          getJobs(),
          hrGetForms(),
          hrGetSubmissions(),
          hrGetTickets(),
          hrGetDocuments(),
        ]);

        entries = [
          ...employees.map((employee) => ({
            id: `employee-${employee.employeeID}`,
            title: employee.fullName || employee.email,
            subtitle: `${employee.jobTitle || t('Unassigned')} • ${employee.department || t('Department')}`,
            category: t('search.category.employee'),
            path: '/hr/employees',
            searchText: `${employee.fullName || ''} ${employee.email || ''} ${employee.jobTitle || ''} ${employee.department || ''}`.toLowerCase(),
          })),
          ...jobs.map((job) => ({
            id: `job-${job.id}`,
            title: job.title,
            subtitle: job.department || t('General'),
            category: t('search.category.job'),
            path: '/hr/jobs',
            searchText: `${job.title} ${job.department || ''} ${job.description || ''}`.toLowerCase(),
          })),
          ...forms.map((form) => ({
            id: `form-${form.formID || form.id}`,
            title: form.title,
            subtitle: form.isActive ? t('Active') : t('Inactive'),
            category: t('search.category.form'),
            path: '/hr/forms',
            searchText: `${form.title || ''} ${form.description || ''}`.toLowerCase(),
          })),
          ...submissions.map((submission) => ({
            id: `submission-${submission.submissionID}`,
            title: submission.employeeName || submission.employeeID || t('Employee'),
            subtitle: `${t('Status')}: ${t(submission.status || 'Pending')}`,
            category: t('search.category.submission'),
            path: '/hr/submissions',
            searchText: `${submission.employeeName || ''} ${submission.employeeID || ''} ${submission.status || ''}`.toLowerCase(),
          })),
          ...tickets.map((ticket) => ({
            id: `ticket-${ticket.ticketID}`,
            title: ticket.subject,
            subtitle: `${ticket.employeeName || ticket.employeeID} • ${t(ticket.status || 'Open')}`,
            category: t('search.category.ticket'),
            path: '/hr/tickets',
            searchText: `${ticket.subject || ''} ${ticket.employeeName || ''} ${ticket.description || ''}`.toLowerCase(),
          })),
          ...documents.map((document) => ({
            id: `document-${document.requestID}`,
            title: t(document.documentType || 'Document Type'),
            subtitle: `${document.employeeName || document.employeeID} • ${t(document.status || 'Pending')}`,
            category: t('search.category.document'),
            path: '/hr/documents',
            searchText: `${document.documentType || ''} ${document.employeeName || ''} ${document.purpose || ''}`.toLowerCase(),
          })),
        ];
      } else if (user.role === 'TeamLeader') {
        const [forms, tasks, tickets, documents, teamGoals, teamTasks, jobs] = await Promise.all([
          getForms(user.employee_id),
          getMyTasks(user.employee_id),
          getMyTickets(user.employee_id),
          getMyDocuments(user.employee_id),
          getTeamGoals(),
          getTeamTasks(),
          getJobs(),
        ]);

        entries = [
          ...forms.map((form) => ({
            id: `feedback-${form.formID}`,
            title: form.title,
            subtitle: t('search.category.form'),
            category: t('search.category.form'),
            path: '/employee/feedback',
            searchText: `${form.title || ''} ${form.description || ''}`.toLowerCase(),
          })),
          ...tasks.map((task) => ({
            id: `task-${task.taskID}`,
            title: task.title,
            subtitle: `${t(task.status || 'To Do')} • ${t(task.priority || 'Medium')}`,
            category: t('search.category.task'),
            path: '/employee/tasks',
            searchText: `${task.title || ''} ${task.description || ''} ${task.status || ''}`.toLowerCase(),
          })),
          ...teamGoals.map((goal) => ({
            id: `team-goal-${goal.goalID}`,
            title: goal.title,
            subtitle: `${goal.employeeName || goal.employeeID} • ${t(goal.status || 'Pending')}`,
            category: t('search.category.goal'),
            path: '/leader/team',
            searchText: `${goal.title || ''} ${goal.employeeName || ''} ${goal.description || ''}`.toLowerCase(),
          })),
          ...teamTasks.map((task) => ({
            id: `team-task-${task.taskID}`,
            title: task.title,
            subtitle: `${task.employeeName || task.employeeID} • ${t(task.status || 'Pending')}`,
            category: t('search.category.task'),
            path: '/leader/team',
            searchText: `${task.title || ''} ${task.employeeName || ''} ${task.description || ''}`.toLowerCase(),
          })),
          ...tickets.map((ticket) => ({
            id: `ticket-${ticket.ticketID}`,
            title: ticket.subject,
            subtitle: t(ticket.status || 'Open'),
            category: t('search.category.ticket'),
            path: '/employee/tickets',
            searchText: `${ticket.subject || ''} ${ticket.description || ''} ${ticket.status || ''}`.toLowerCase(),
          })),
          ...documents.map((document) => ({
            id: `document-${document.requestID}`,
            title: t(document.documentType || 'Document Type'),
            subtitle: t(document.status || 'Pending'),
            category: t('search.category.document'),
            path: '/employee/documents',
            searchText: `${document.documentType || ''} ${document.purpose || ''} ${document.status || ''}`.toLowerCase(),
          })),
          ...jobs.map((job) => ({
            id: `job-${job.id}`,
            title: job.title,
            subtitle: job.department || t('General'),
            category: t('search.category.job'),
            path: '/careers',
            searchText: `${job.title} ${job.department || ''} ${job.description || ''}`.toLowerCase(),
          })),
        ];
      } else {
        const [forms, tasks, tickets, documents, jobs] = await Promise.all([
          getForms(user.employee_id),
          getMyTasks(user.employee_id),
          getMyTickets(user.employee_id),
          getMyDocuments(user.employee_id),
          getJobs(),
        ]);

        entries = [
          ...forms.map((form) => ({
            id: `feedback-${form.formID}`,
            title: form.title,
            subtitle: t('search.category.form'),
            category: t('search.category.form'),
            path: '/employee/feedback',
            searchText: `${form.title || ''} ${form.description || ''}`.toLowerCase(),
          })),
          ...tasks.map((task) => ({
            id: `task-${task.taskID}`,
            title: task.title,
            subtitle: `${t(task.status || 'To Do')} • ${t(task.priority || 'Medium')}`,
            category: t('search.category.task'),
            path: '/employee/tasks',
            searchText: `${task.title || ''} ${task.description || ''} ${task.status || ''}`.toLowerCase(),
          })),
          ...tickets.map((ticket) => ({
            id: `ticket-${ticket.ticketID}`,
            title: ticket.subject,
            subtitle: t(ticket.status || 'Open'),
            category: t('search.category.ticket'),
            path: '/employee/tickets',
            searchText: `${ticket.subject || ''} ${ticket.description || ''} ${ticket.status || ''}`.toLowerCase(),
          })),
          ...documents.map((document) => ({
            id: `document-${document.requestID}`,
            title: t(document.documentType || 'Document Type'),
            subtitle: t(document.status || 'Pending'),
            category: t('search.category.document'),
            path: '/employee/documents',
            searchText: `${document.documentType || ''} ${document.purpose || ''} ${document.status || ''}`.toLowerCase(),
          })),
          ...jobs.map((job) => ({
            id: `job-${job.id}`,
            title: job.title,
            subtitle: job.department || t('General'),
            category: t('search.category.job'),
            path: '/careers',
            searchText: `${job.title} ${job.department || ''} ${job.description || ''}`.toLowerCase(),
          })),
        ];
      }

      setSearchData(entries.slice(0, 40).map((entry) => ({ ...entry, path: resolvePath(entry.path) })));
    } catch {
      setSearchData([]);
    } finally {
      setSearchLoading(false);
    }
  }, [groups, resolvePath, t, user]);

  const hasSearchQuery = searchQuery.trim().length >= 2;

  const filteredSearchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const combined = [...pageSearchEntries, ...searchData];

    if (!query || query.length < 2) {
      return [];
    }

    return combined.filter((item) => item.searchText.includes(query)).slice(0, 8);
  }, [pageSearchEntries, searchData, searchQuery]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    setNotifications((current) => {
      const next = current.map((item) => ({ ...item, read: true }));
      setSeenNotificationIds(user, next.map((item) => item.id));
      return next;
    });
  }, [user]);

  const handleToggleNotifications = () => {
    const next = !showNotifications;
    setShowNotifications(next);
    setShowPlanner(false);
    setShowSearch(false);
    if (next) markAllAsRead();
  };

  const handleTogglePlanner = () => {
    const next = !showPlanner;
    setShowPlanner(next);
    setShowNotifications(false);
    setShowSearch(false);
    if (next && !plannerItems.length && !plannerLoading) {
      loadPlannerData();
    }
  };

  const handleNotificationClick = (path) => {
    setShowNotifications(false);
    if (path) navigate(path);
  };

  const handleSearchFocus = () => {
    setShowSearch(true);
    setShowPlanner(false);
    setShowNotifications(false);
  };

  const handleSearchResultClick = (path) => {
    setShowSearch(false);
    setSearchQuery('');
    if (path) navigate(path);
  };

  const handleToggleFavorite = (path) => {
    if (!user) return;
    setFavoritePathsState((current) => {
      const next = current.includes(path)
        ? current.filter((item) => item !== path)
        : [path, ...current].slice(0, 6);
      setFavoritePaths(user, next);
      return next;
    });
  };

  if (!user) return null;

  const roleLabel = t(`role.${user.role}`);
  return (
    <aside className={`app-sidebar${isCollapsed ? ' collapsed' : ''}`}>
      <div className="app-sidebar-inner">
        <div className="app-sidebar-brand">
          <img src="/logo.png" alt="EmpowerHR" style={{ height: 40, width: "auto", filter: "brightness(1.5)" }} />
          <div className="app-sidebar-brand-text">{roleLabel}</div>
          <button className="app-sidebar-collapse-btn" onClick={onToggle}>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
             </svg>
          </button>
        </div>

        <div className="app-sidebar-nav-scroll">
          {groups.map((group) => (
            <section key={group.titleKey} className="app-sidebar-section">
              <h3 className="app-sidebar-section-title">{t(group.titleKey)}</h3>
              <div className="app-sidebar-items">
                {group.items.map((link) => {
                  const active = activePath === link.path;
                  return (
                    <button
                      key={link.path}
                      type="button"
                      onClick={() => navigate(link.path)}
                      className={`app-sidebar-item${active ? ' active' : ''}`}
                      title={isCollapsed ? t(link.labelKey) : ''}
                    >
                      <span className="app-sidebar-item-icon">
                        <SidebarIcon name={link.icon} active={active} />
                      </span>
                      <span className="app-sidebar-item-label">
                        {t(link.labelKey)}
                        {link.path === '/admin/intelligence' && <span className="neural-pulse-dot" style={{ marginLeft: 8, marginRight: 0, width: 6, height: 6 }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="app-sidebar-footer">
          <div 
            className="app-sidebar-user-mini" 
            onClick={() => {
              const profilePath = user.role === 'HRManager' ? '/hr/profile' : (user.role === 'Admin' ? '/admin/profile' : '/employee/profile');
              navigate(profilePath);
            }} 
            title={isCollapsed ? user.full_name : ''}
          >
            <div className="app-sidebar-user-avatar">
              {user.full_name?.charAt(0)}
            </div>
            <div className="app-sidebar-user-info">
              <div className="app-sidebar-user-name">{user.full_name}</div>
              <div className="app-sidebar-user-role">{t(`role.${user.role}`)}</div>
            </div>
          </div>
          <button type="button" className="app-sidebar-logout" onClick={logout} title={isCollapsed ? t('common.signOut') : ''}>
            <LogOut size={16} />
            <span>{t('common.signOut')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
