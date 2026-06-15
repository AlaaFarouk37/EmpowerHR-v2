import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getJobs,
  getTeamGoals,
  getTeamTasks,
  hrGetEmployees,
  hrGetExpenses,
  hrGetForms,
  hrGetLeaveRequests,
  hrGetShifts,
  hrGetTickets,
} from '../../api/index.js';
import { 
  Btn, 
  Spinner,
  PageHeader,
  Badge,
  Skeleton
} from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Users, 
  ShieldCheck, 
  Zap, 
  Activity,
  ArrowUpRight,
  LayoutDashboard,
  ClipboardCheck,
  Briefcase
} from 'lucide-react';

import { EmployeeProfilePage } from '../employee/EmployeeProfilePage';
import { HRApprovalCenterPage } from '../hr/ApprovalCenterPage';
import { HRAttendancePage } from '../hr/AttendancePage';
import { HRBenefitsPage } from '../hr/BenefitsPage';
import { HRCVRankingPage } from '../hr/CVRankingPage';
import { HRDocumentsPage } from '../hr/DocumentsPage';
import { HREmployeesPage } from '../hr/EmployeesPage';
import { HRExpensesPage } from '../hr/ExpensesPage';
import { HRFormsPage } from '../hr/FormPage';
import { HRJobPostingsPage } from '../hr/JobPostingsPage';
import { HROnboardingPage } from '../hr/OnboardingPage';
import { HRPayrollPage } from '../hr/PayrollPage';
import { HRPoliciesPage } from '../hr/PoliciesPage';
import { HRReviewsPage } from '../hr/ReviewsPage';
import { HRShiftsPage } from '../hr/ShiftsPage';
import { HRSubmissionPage } from '../hr/SubmissionPage';
import { HRSuccessionPage } from '../hr/SuccessionPage';
import { AdminTicketsManagementPage } from './TicketsManagementPage';
import { HRTrainingPage } from '../hr/TrainingPage';
import { TeamGoalsPage } from '../leader/TeamPage';
import { TeamRecognitionPage } from '../leader/RecognitionPage';

const EMPTY_SUMMARY = {
  managedPeople: 0,
  activeRoles: 0,
  admins: 0,
  leaders: 0,
  pendingActions: 0,
  openServiceQueues: 0,
  activeForms: 0,
  openJobs: 0,
  leadershipItems: 0,
  liveWorkspaces: 5,
};

const ADMIN_VARIANT_CONTENT = {
  governance: {
    badge: 'Governance Mode',
    note: 'Validate route ownership, permissions, and workspace readiness from one place.',
    actions: ['Review access coverage', 'Check queue pressure', 'Keep role routes aligned'],
    icon: <ShieldCheck size={20} />
  },
  users: {
    badge: 'Access Oversight',
    note: 'Keep role ownership clear while monitoring who can reach each workspace.',
    actions: ['Audit admins and leaders', 'Review employee coverage', 'Confirm shared access'],
    icon: <Users size={20} />
  },
  approvals: {
    badge: 'Queue Command',
    note: 'Prioritize service pressure before approvals, expenses, or support queues stall.',
    actions: ['Clear pending actions', 'Watch service backlogs', 'Unblock high-priority items'],
    icon: <ClipboardCheck size={20} />
  },
  talent: {
    badge: 'Talent Oversight',
    note: 'Monitor reviews, learning, and succession from an executive governance lens.',
    actions: ['Review readiness signals', 'Check training pressure', 'Track talent follow-up'],
    icon: <Activity size={20} />
  },
  hiring: {
    badge: 'Hiring Command',
    note: 'Keep recruiting flow, submissions, and forms aligned with admin oversight.',
    actions: ['Review live openings', 'Check candidate flow', 'Validate form readiness'],
    icon: <Briefcase size={20} />
  },
  leadership: {
    badge: 'Leadership Alignment',
    note: 'Track team execution and recognition activity without leaving the admin workspace.',
    actions: ['Review team load', 'Check recognition momentum', 'Escalate blockers early'],
    icon: <Zap size={20} />
  },
  services: {
    badge: 'Service Reliability',
    note: 'Keep payroll, benefits, documents, and support operations moving cleanly.',
    actions: ['Watch operational queues', 'Confirm service owners', 'Resolve aging requests'],
    icon: <Activity size={20} />
  },
};

function AdminOwnedShell({ titleKey, subtitleKey, variant = 'governance', children }) {
  const { t } = useLanguage();
  const { user, loading: authLoading, resolvePath } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  useEffect(() => {
    if (authLoading || !user) return;
    
    let active = true;

    const loadSummary = async () => {
      setLoading(true);
      try {
        const [employees, jobs, forms, leaveRequests, expenses, tickets, teamGoals, teamTasks] = await Promise.all([
          hrGetEmployees().catch(() => []),
          getJobs().catch(() => []),
          hrGetForms().catch(() => []),
          hrGetLeaveRequests().catch(() => []),
          hrGetExpenses().catch(() => []),
          hrGetTickets().catch(() => []),
          getTeamGoals().catch(() => []),
          getTeamTasks().catch(() => []),
        ]);

        if (!active) return;

        const roleCounts = (Array.isArray(employees) ? employees : []).reduce((acc, employee) => {
          const role = employee?.role || 'TeamMember';
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        }, {});

        const pendingLeaves = (Array.isArray(leaveRequests) ? leaveRequests : []).filter((item) => item?.status === 'Pending').length;
        const activeExpenses = (Array.isArray(expenses) ? expenses : []).filter((item) => ['Pending', 'Submitted'].includes(item?.status)).length;
        const openTickets = (Array.isArray(tickets) ? tickets : []).filter((item) => !['Resolved', 'Closed'].includes(item?.status)).length;
        const leadershipItems = (Array.isArray(teamGoals) ? teamGoals : []).filter((item) => item?.status !== 'Completed').length
          + (Array.isArray(teamTasks) ? teamTasks : []).filter((item) => item?.status !== 'Done').length;

        setSummary({
          managedPeople: Array.isArray(employees) ? employees.length : 0,
          activeRoles: Object.keys(roleCounts).length,
          admins: roleCounts.Admin || 0,
          leaders: roleCounts.TeamLeader || 0,
          pendingActions: pendingLeaves + activeExpenses + openTickets,
          openServiceQueues: activeExpenses + openTickets,
          activeForms: (Array.isArray(forms) ? forms : []).filter((item) => item?.isActive).length,
          openJobs: (Array.isArray(jobs) ? jobs : []).filter((job) => job?.is_active !== false).length,
          leadershipItems,
          liveWorkspaces: 5,
        });
      } catch {
        if (active) setSummary(EMPTY_SUMMARY);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSummary();
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const metrics = useMemo(() => {
    const map = {
      governance: [
        { label: 'Managed People', value: summary.managedPeople, icon: <Users size={18} /> },
        { label: 'Role Coverage', value: summary.activeRoles, icon: <ShieldCheck size={18} /> },
        { label: 'Live Workspaces', value: summary.liveWorkspaces, icon: <LayoutDashboard size={18} /> },
      ],
      users: [
        { label: 'Managed People', value: summary.managedPeople, icon: <Users size={18} /> },
        { label: 'Role Coverage', value: summary.activeRoles, icon: <ShieldCheck size={18} /> },
        { label: 'Shared Access', value: summary.admins + summary.leaders, icon: <Zap size={18} /> },
      ],
      approvals: [
        { label: 'Pending Actions', value: summary.pendingActions, icon: <ClipboardCheck size={18} /> },
        { label: 'Service Queues', value: summary.openServiceQueues, icon: <Activity size={18} /> },
        { label: 'Active Forms', value: summary.activeForms, icon: <LayoutDashboard size={18} /> },
      ],
    };

    return map[variant] || map.governance;
  }, [summary, variant]);

  const quickLinks = useMemo(() => {
    const map = {
      governance: [
        { label: 'Dashboard', path: '/admin/dashboard' },
        { label: 'Users', path: '/admin/users' },
        { label: 'Approvals', path: '/admin/approvals' },
      ],
      users: [
        { label: 'Employee Hub', path: '/admin/employees' },
        { label: 'Profile Viewer', path: '/admin/profile' },
        { label: 'Approvals', path: '/admin/approvals' },
      ],
      approvals: [
        { label: 'Decision Center', path: '/admin/approvals' },
        { label: 'Expenses', path: '/admin/expenses' },
        { label: 'Support', path: '/admin/tickets' },
      ],
    };

    return map[variant] || map.governance;
  }, [variant]);

  const pressureScore = useMemo(() => {
    const total = summary.pendingActions + summary.openServiceQueues + (summary.openJobs * 2);
    return Math.min(Math.round((total / 50) * 100), 100);
  }, [summary]);

  const pressureColor = pressureScore > 75 ? '#EF4444' : pressureScore > 40 ? 'var(--pink-400)' : 'var(--color-primary-teal)';

  const variantContent = ADMIN_VARIANT_CONTENT[variant] || ADMIN_VARIANT_CONTENT.governance;

  return (
    <div className="page-content animate-in">
      <PageHeader 
        title={t(titleKey)}
        subtitle={t(subtitleKey)}
        actions={quickLinks.map(link => ({
          label: t(link.label),
          onClick: () => navigate(resolvePath(link.path)),
          variant: 'outline'
        }))}
      />

      {/* Tactical Overview Panel */}
      <div className="card" style={{ padding: 24, marginBottom: 32, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-primary-teal-tint)', color: 'var(--color-primary-teal)', display: 'grid', placeItems: 'center' }}>
              {variantContent.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary-teal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Administrative Intelligence</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t(variantContent.badge)}</div>
            </div>
          </div>
          <Badge label="Operational" color="success" variant="soft" />
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ padding: 20, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 16 }}>
                 <div style={{ color: 'var(--text-muted)' }}>{m.icon}</div>
                 <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{t(m.label)}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{m.value}</div>
                 </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
           <div style={{ padding: 20, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-primary)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Operational Pressure</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: pressureColor }}>{pressureScore}%</div>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ 
                  width: `${pressureScore}%`, 
                  height: '100%', 
                  background: pressureColor, 
                  boxShadow: `0 0 10px ${pressureColor}40`,
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>
                {pressureScore > 75 ? 'CRITICAL_LATENCY_DETECTED' : pressureScore > 40 ? 'SYSTEM_PRESSURE_INCREASING' : 'OPTIMAL_OPERATIONAL_FLOW'}
              </div>
           </div>
           <div style={{ padding: 20, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>Executive Checklist</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                 {variantContent.actions.map(action => (
                   <Badge key={action} label={t(action)} variant="soft" color="info" size="sm" />
                 ))}
              </div>
           </div>
        </div>
        
        <div style={{ marginTop: 16, padding: '12px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 12, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 10 }}>
           <Activity size={14} style={{ opacity: 0.6 }} />
           <span>{t(variantContent.note)}</span>
        </div>
      </div>

      {/* Children Content (The Wrapped Page) */}
      <div className="admin-child-content">
        {children}
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  return <AdminOwnedShell titleKey="nav.users" subtitleKey="Oversee users, access coverage, and operational readiness across the platform." variant="users"><HREmployeesPage /></AdminOwnedShell>;
}

export function AdminEmployeesPage() {
  return <AdminOwnedShell titleKey="nav.employees" subtitleKey="Oversee users, access coverage, and operational readiness across the platform." variant="users"><HREmployeesPage /></AdminOwnedShell>;
}

export function AdminApprovalsPage() {
  return <AdminOwnedShell titleKey="nav.approvals" subtitleKey="Open Service Queues" variant="approvals"><HRApprovalCenterPage /></AdminOwnedShell>;
}

export function AdminAttendancePage() {
  return <AdminOwnedShell titleKey="nav.attendance" subtitleKey="System Activity" variant="approvals"><HRAttendancePage /></AdminOwnedShell>;
}

export function AdminPayrollPage() {
  return <AdminOwnedShell titleKey="nav.payroll" subtitleKey="System Activity" variant="services"><HRPayrollPage /></AdminOwnedShell>;
}

export function AdminReviewsPage() {
  return <AdminOwnedShell titleKey="nav.reviews" subtitleKey="Access & Governance Board" variant="talent"><HRReviewsPage /></AdminOwnedShell>;
}

export function AdminSuccessionPage() {
  return <AdminOwnedShell titleKey="nav.succession" subtitleKey="Role Coverage" variant="talent"><HRSuccessionPage /></AdminOwnedShell>;
}

export function AdminOnboardingPage() {
  return <AdminOwnedShell titleKey="nav.onboarding" subtitleKey="System Activity" variant="services"><HROnboardingPage /></AdminOwnedShell>;
}

export function AdminShiftsPage() {
  return <AdminOwnedShell titleKey="nav.shifts" subtitleKey="System Activity" variant="services"><HRShiftsPage /></AdminOwnedShell>;
}

export function AdminPoliciesPage() {
  return <AdminOwnedShell titleKey="nav.policies" subtitleKey="Access & Governance Board" variant="governance"><HRPoliciesPage /></AdminOwnedShell>;
}

export function AdminBenefitsPage() {
  return <AdminOwnedShell titleKey="nav.benefits" subtitleKey="Open Service Queues" variant="services"><HRBenefitsPage /></AdminOwnedShell>;
}

export function AdminExpensesPage() {
  return <AdminOwnedShell titleKey="nav.expenses" subtitleKey="Open Service Queues" variant="services"><HRExpensesPage /></AdminOwnedShell>;
}

export function AdminDocumentsPage() {
  return <AdminOwnedShell titleKey="nav.documents" subtitleKey="Open Service Queues" variant="services"><HRDocumentsPage /></AdminOwnedShell>;
}

export function AdminTicketsPage() {
  // No AdminOwnedShell chrome here — page starts directly at the ticket status cards + table.
  return <div className="page-content animate-in"><AdminTicketsManagementPage /></div>;
}

export function AdminTrainingPage() {
  return <AdminOwnedShell titleKey="nav.training" subtitleKey="Role Coverage" variant="talent"><HRTrainingPage /></AdminOwnedShell>;
}

export function AdminFormsPage() {
  return <AdminOwnedShell titleKey="nav.forms" subtitleKey="System Activity" variant="hiring"><HRFormsPage /></AdminOwnedShell>;
}

export function AdminSubmissionsPage() {
  return <AdminOwnedShell titleKey="nav.submissions" subtitleKey="System Activity" variant="hiring"><HRSubmissionPage /></AdminOwnedShell>;
}

export function AdminJobsPage() {
  return <AdminOwnedShell titleKey="nav.jobs" subtitleKey="Candidate Experience" variant="hiring"><HRJobPostingsPage /></AdminOwnedShell>;
}

export function AdminCVRankingPage() {
  return <AdminOwnedShell titleKey="nav.cvRanking" subtitleKey="Candidate Experience" variant="hiring"><HRCVRankingPage /></AdminOwnedShell>;
}

export function AdminTeamPage() {
  return <AdminOwnedShell titleKey="nav.teamHub" subtitleKey="Leadership Workspace" variant="leadership"><TeamGoalsPage /></AdminOwnedShell>;
}

export function AdminRecognitionPage() {
  return <AdminOwnedShell titleKey="nav.recognition" subtitleKey="Leadership Workspace" variant="leadership"><TeamRecognitionPage /></AdminOwnedShell>;
}

export function AdminProfilePage() {
  return <AdminOwnedShell titleKey="nav.profile" subtitleKey="Access & Governance Board" variant="governance"><EmployeeProfilePage /></AdminOwnedShell>;
}

