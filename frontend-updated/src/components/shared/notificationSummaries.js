import {
  getForms, getMyTasks, getMyTickets, getMyDocuments,
  getTeamGoals, getTeamTasks,
  hrGetLeaveRequests, hrGetExpenses, hrGetDocuments, hrGetTickets, getJobs,
  getCandidateApplications,
} from '../../api/index.js';

// Aggregate "you still have N pending X" nudges, merged into the bell alongside
// the real per-event backend notifications. Each is shaped for NotificationCenter
// and flagged { summary: true, is_read: true } so it never affects the unread
// badge and can't be deleted. Links are generic; the caller resolves them per role.
const item = (id, title, message, link, level = 'info', category = 'general') =>
  ({ id, summary: true, is_read: true, category, level, title, message, link });

const isOpenTask = (tk) => !['Done', 'Completed'].includes(tk?.status);
const isOpenTicket = (tc) => !['Resolved', 'Closed'].includes(tc?.status);

function employeeSummaries({ forms, tasks, tickets, documents }, t) {
  const items = [];
  const pendingForms = forms.filter((f) => f?.submission?.status !== 'Completed');
  const openTasks = tasks.filter(isOpenTask);
  const openTickets = tickets.filter(isOpenTicket);
  const docUpdates = documents.filter((d) => ['Pending', 'In Progress', 'Issued'].includes(d?.status));

  if (openTasks.length) items.push(item('sum-tasks', t('notifications.tasksTitle'), t('notifications.tasksMessage', { count: openTasks.length }), '/employee/tasks', 'warning', 'system'));
  if (pendingForms.length) items.push(item('sum-forms', t('notifications.feedbackTitle'), t('notifications.feedbackMessage', { count: pendingForms.length }), '/employee/feedback', 'info'));
  if (openTickets.length) items.push(item('sum-tickets', t('notifications.supportTitle'), t('notifications.supportMessage', { count: openTickets.length }), '/employee/tickets', 'danger'));
  if (docUpdates.length) items.push(item('sum-docs', t('notifications.documentsTitle'), t('notifications.documentsMessage', { count: docUpdates.length }), '/employee/documents', 'success'));
  return items;
}

async function fetchEmployee(user, t) {
  const [forms, tasks, tickets, documents] = await Promise.all([
    getForms(user.employee_id).catch(() => []),
    getMyTasks(user.employee_id).catch(() => []),
    getMyTickets(user.employee_id).catch(() => []),
    getMyDocuments(user.employee_id).catch(() => []),
  ]);
  return employeeSummaries({ forms, tasks, tickets, documents }, t);
}

async function fetchLeader(user, t) {
  const [base, teamGoals, teamTasks] = await Promise.all([
    fetchEmployee(user, t),
    getTeamGoals().catch(() => []),
    getTeamTasks().catch(() => []),
  ]);
  const teamItems = [
    ...teamGoals.filter((g) => g?.status !== 'Completed'),
    ...teamTasks.filter((tk) => tk?.status !== 'Done'),
  ];
  if (teamItems.length) {
    base.unshift(item('sum-team', t('notifications.teamTitle'), t('notifications.teamMessage', { count: teamItems.length }), '/leader/team', 'danger', 'system'));
  }
  return base;
}

async function fetchHr(t) {
  const [leaveRequests, expenses, documents, tickets, jobs] = await Promise.all([
    hrGetLeaveRequests().catch(() => []),
    hrGetExpenses().catch(() => []),
    hrGetDocuments().catch(() => []),
    hrGetTickets().catch(() => []),
    getJobs().catch(() => []),
  ]);
  const items = [];
  const pendingLeaves = leaveRequests.filter((r) => r?.status === 'Pending');
  const pendingExpenses = expenses.filter((e) => ['Pending', 'Submitted'].includes(e?.status));
  const pendingDocs = documents.filter((d) => ['Pending', 'In Progress'].includes(d?.status));
  const openTickets = tickets.filter(isOpenTicket);
  const activeJobs = jobs.filter((j) => j?.is_active !== false);

  if (pendingLeaves.length) items.push(item('sum-leave', t('notifications.leaveTitle'), t('notifications.leaveMessage', { count: pendingLeaves.length }), '/hr/leave-management', 'warning', 'approval'));
  if (pendingExpenses.length) items.push(item('sum-expenses', t('notifications.expenseTitle'), t('notifications.expenseMessage', { count: pendingExpenses.length }), '/hr/expenses', 'info', 'approval'));
  if (pendingDocs.length) items.push(item('sum-hr-docs', t('notifications.documentsTitle'), t('notifications.documentsMessage', { count: pendingDocs.length }), '/hr/documents', 'success'));
  if (openTickets.length) items.push(item('sum-hr-tickets', t('notifications.supportTitle'), t('notifications.supportMessage', { count: openTickets.length }), '/hr/tickets', 'danger'));
  if (activeJobs.length) items.push(item('sum-hiring', t('notifications.hiringTitle'), t('notifications.hiringMessage', { count: activeJobs.length }), '/hr/jobs', 'info'));
  return items;
}

async function fetchCandidate(user, t) {
  const [jobs, applications] = await Promise.all([
    getJobs().catch(() => []),
    getCandidateApplications(user.email).catch(() => []),
  ]);
  const items = [];
  const activeJobs = jobs.filter((j) => j?.is_active !== false);
  const shortlisted = applications.filter((a) => a?.review_stage === 'Shortlisted');
  const interviews = applications.filter((a) => a?.review_stage === 'Interview');
  if (activeJobs.length) items.push(item('sum-cand-jobs', t('notifications.candidateTitle'), t('notifications.candidateMessage', { count: activeJobs.length }), '/candidate/dashboard', 'info'));
  if (shortlisted.length) items.push(item('sum-cand-shortlist', t('notifications.shortlistTitle'), t('notifications.shortlistMessage', { count: shortlisted.length }), '/candidate/applications', 'warning'));
  if (interviews.length) items.push(item('sum-cand-interviews', t('notifications.interviewTitle'), t('notifications.interviewMessage', { count: interviews.length }), '/candidate/applications', 'danger'));
  return items;
}

// Role-aware aggregate summaries for the notification bell. Always resolves to an
// array (never throws) so a summary failure can't break the bell.
export async function fetchSummaryNotifications(user, t) {
  if (!user?.role) return [];
  try {
    if (user.role === 'Candidate') return await fetchCandidate(user, t);
    if (user.role === 'HRManager' || user.role === 'Admin') return await fetchHr(t);
    if (user.role === 'TeamLeader') return await fetchLeader(user, t);
    return await fetchEmployee(user, t);
  } catch {
    return [];
  }
}
