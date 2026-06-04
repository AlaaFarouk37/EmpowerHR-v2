import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamGoals, getTeamRecognition, getTeamTasks, hrGetEmployees, hrGetLeaveRequests, hrGetTickets } from '../../api/index.js';
import { Btn, Spinner, PageHeader, Badge } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { EmployeeProfilePage } from '../employee/EmployeeProfilePage';
import { TeamGoalsPage } from '../leader/TeamPage';
import { TeamRecognitionPage } from '../leader/RecognitionPage';
import { HRTeamHubPage } from './TeamHubPage';

const EMPTY_SUMMARY = {
  followUpEmployees: 0,
  pendingLeaves: 0,
  openTickets: 0,
  activeGoals: 0,
  activeTasks: 0,
  recognitionAwards: 0,
  recognizedEmployees: 0,
};

const HR_VARIANT_CONTENT = {
  team: {
    badge: 'People Operations',
    note: 'Keep employee follow-up, tasks, and service queues moving with clear ownership.',
    actions: ['Review employees', 'Watch approvals', 'Check review readiness'],
  },
  recognition: {
    badge: 'Engagement Coverage',
    note: 'Track appreciation activity and watch for people signals needing a follow-up.',
    actions: ['Review pulse', 'Check activity', 'Monitor load'],
  },
  profile: {
    badge: 'Service Delivery',
    note: 'Stay close to workforce readiness, leave pressure, and employee service signals.',
    actions: ['Monitor records', 'Clear leave queue', 'Track cases'],
  },
};

function HROwnedShell({ titleKey, variant = 'team', children }) {
  const { t } = useLanguage();
  const { resolvePath } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  useEffect(() => {
    let active = true;
    const loadSummary = async () => {
      setLoading(true);
      try {
        const [employees, leaveRequests, tickets, goals, tasks, awards] = await Promise.all([
          hrGetEmployees().catch(() => []),
          hrGetLeaveRequests().catch(() => []),
          hrGetTickets().catch(() => []),
          getTeamGoals().catch(() => []),
          getTeamTasks().catch(() => []),
          getTeamRecognition().catch(() => []),
        ]);

        if (!active) return;

        setSummary({
          followUpEmployees: (Array.isArray(employees) ? employees : []).filter(e => !e?.department || !e?.team).length,
          pendingLeaves: (Array.isArray(leaveRequests) ? leaveRequests : []).filter(item => item?.status === 'Pending').length,
          openTickets: (Array.isArray(tickets) ? tickets : []).filter(item => !['Resolved', 'Closed'].includes(item?.status)).length,
          activeGoals: (Array.isArray(goals) ? goals : []).filter(item => item?.status !== 'Completed').length,
          activeTasks: (Array.isArray(tasks) ? tasks : []).filter(item => item?.status !== 'Done').length,
          recognitionAwards: Array.isArray(awards) ? awards.length : 0,
          recognizedEmployees: new Set((Array.isArray(awards) ? awards : []).map(item => item?.employeeID).filter(Boolean)).size,
        });
      } catch {
        if (active) setSummary(EMPTY_SUMMARY);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadSummary();
    return () => { active = false; };
  }, []);

  const metrics = useMemo(() => {
    const map = {
      team: [
        { label: t('Follow-up Nodes'), value: summary.followUpEmployees, accent: 'var(--neural-red)' },
        { label: t('Task Velocity'), value: summary.activeTasks, accent: 'var(--neural-violet)' },
        { label: t('Strategic Goals'), value: summary.activeGoals, accent: 'var(--neural-blue)' },
      ],
      recognition: [
        { label: t('Appreciation Yield'), value: summary.recognitionAwards, accent: 'var(--text-primary)' },
        { label: t('Coverage Depth'), value: summary.recognizedEmployees, accent: 'var(--neural-red)' },
        { label: t('Service Pressure'), value: summary.openTickets, accent: 'var(--neural-blue)' },
      ],
      profile: [
        { label: t('Leave Liability'), value: summary.pendingLeaves, accent: 'var(--neural-red)' },
        { label: t('Registry Gaps'), value: summary.followUpEmployees, accent: 'var(--neural-blue)' },
        { label: t('Support Load'), value: summary.openTickets, accent: 'var(--neural-violet)' },
      ],
    };
    return map[variant] || map.team;
  }, [summary, t, variant]);

  const variantContent = HR_VARIANT_CONTENT[variant] || HR_VARIANT_CONTENT.team;

  return (
    <div className="neural-animate-entry" style={{ maxWidth: '100%', padding: '32px 40px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <PageHeader
        title={t(titleKey)}
        breadcrumbs={[
          { label: 'HOME', path: '#' },
          { label: 'HR', path: '#' },
          { label: variant.toUpperCase(), path: '#' }
        ]}
        actions={[
          { label: t('nav.employees'), onClick: () => navigate(resolvePath('/hr/employees')), variant: 'outline' },
          { label: t('nav.approvals'), onClick: () => navigate(resolvePath('/hr/approvals')), variant: 'primary' }
        ]}
      />

      {/* Intelligence Strip */}
      <div style={{ display: 'flex', gap: 32, marginBottom: 40, alignItems: 'center', background: 'var(--bg-secondary)', padding: '24px 32px', borderRadius: 24, border: '1.5px solid var(--border-primary)' }}>
        {metrics.map(chip => (
          <div key={chip.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{chip.label}</span>
            <span style={{ fontSize: 18, fontWeight: 950, color: chip.accent, letterSpacing: '-0.02em' }}>{chip.value}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {variantContent.actions.map(action => (
            <Badge key={action} label={t(action)} style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', fontSize: 10, fontWeight: 850, padding: '6px 12px' }} />
          ))}
        </div>
      </div>

      <div style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100 }}><Spinner /></div>
        ) : children}
      </div>
    </div>
  );
}

export function HRTeamPage() {
  return <HROwnedShell titleKey="nav.teamHub" variant="team"><HRTeamHubPage /></HROwnedShell>;
}

export function HRRecognitionPage() {
  return <HROwnedShell titleKey="nav.recognition" variant="recognition"><TeamRecognitionPage /></HROwnedShell>;
}

export function HRProfilePage() {
  return <HROwnedShell titleKey="nav.profile" variant="profile"><EmployeeProfilePage /></HROwnedShell>;
}
