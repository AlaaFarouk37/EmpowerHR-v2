import { useState, useEffect } from 'react';
import { LeaderPortalLayout, Skeleton, useToast } from '../../components/shared/index.jsx';
import {
  getMyAttendance, clockAttendance, getTeamPresenceToday,
  getTeamLeaveRequests, getTeamPendingOvertime, getTeamTimeCorrections,
  getTeamAttritionLatest
} from '../../api/index.js';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

// ISO datetime → short readable time (e.g. "15:45"), or em dash.
function toTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function LeaderDashboardPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [presence, setPresence] = useState(null);
  const [approvals, setApprovals] = useState({ leave: [], overtime: [], corrections: [] });
  const [attrition, setAttrition] = useState(null);
  const [expanded, setExpanded] = useState(null); // 'presence' | 'approvals' | 'stability' | null

  const loadData = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const [att, presenceData, leave, overtime, corrections, attritionData] = await Promise.all([
        getMyAttendance(user?.employee_id).catch(() => []),
        getTeamPresenceToday().catch(() => null),
        getTeamLeaveRequests('Pending').catch(() => []),
        getTeamPendingOvertime().catch(() => []),
        getTeamTimeCorrections().catch(() => []),
        getTeamAttritionLatest().catch(() => null),
      ]);
      setAttendance(Array.isArray(att) ? att : []);
      setPresence(presenceData);
      setApprovals({
        leave: Array.isArray(leave) ? leave : [],
        overtime: Array.isArray(overtime) ? overtime : [],
        corrections: Array.isArray(corrections) ? corrections : [],
      });
      setAttrition(attritionData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user?.employee_id]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRecord = attendance.find(r => r.date === todayKey);

  const handleClockAction = async () => {
    try {
      const type = !todayRecord?.clockIn ? 'in' : 'out';
      await clockAttendance({ type });
      toast(`${t('Attendance synchronized')}: ${type === 'in' ? t('Clocked In') : t('Clocked Out')}`, 'success');
      await loadData();
    } catch (err) {
      toast(err.message || 'Clock action failed', 'error');
    }
  };

  if (loading) {
    return (
      <LeaderPortalLayout>
        <Skeleton count={4} height={40} />
      </LeaderPortalLayout>
    );
  }

  const approvalsTotal = approvals.leave.length + approvals.overtime.length + approvals.corrections.length;
  const approvalRows = [
    { label: 'Team Leave Requests', count: approvals.leave.length, path: '/leader/leave-requests' },
    { label: 'Pending Overtime Reviews', count: approvals.overtime.length, path: '/leader/overtime-reviews' },
    { label: 'Attendance Corrections', count: approvals.corrections.length, path: '/leader/attendance-corrections' },
  ];

  const cards = [
    { key: 'presence', label: 'Team Presence', value: presence ? `${presence.presentCount}/${presence.total}` : '—', sub: 'On Duty Today', color: 'var(--red-800)', bg: 'var(--red-50)', icon: Users, expandable: true },
    { key: 'approvals', label: 'Pending Approvals', value: approvalsTotal, sub: 'Action Required', color: 'var(--red-600)', bg: 'var(--red-50)', icon: Clock, expandable: true },
    { key: 'stability', label: 'Team Stability', value: attrition ? attrition.highRiskCount : '—', sub: 'High Retention Risk', color: 'var(--red-800)', bg: 'var(--red-50)', icon: AlertTriangle, expandable: true },
  ];

  const riskColor = (level) => (level === 'High' ? 'var(--red-600)' : level === 'Medium' ? '#F59E0B' : '#10B981');

  const presenceGroup = (title, members, color, emptyText) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '.05em' }}>{t(title)}</span>
        <span style={{ fontSize: 13, fontWeight: 900, color }}>{members.length}</span>
      </div>
      {members.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {members.map(m => (
            <div key={m.employeeID} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fff', border: '1px solid #F1F5F9', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, color }}>
                {(m.employeeName || '?').charAt(0)}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B' }}>{m.employeeName || m.employeeID}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{t(emptyText)}</div>
      )}
    </div>
  );

  return (
    <LeaderPortalLayout>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {cards.map(s => {
          const isOpen = expanded === s.key;
          return (
            <div
              key={s.key}
              onClick={s.expandable ? () => setExpanded(isOpen ? null : s.key) : undefined}
              style={{ background: '#fff', borderRadius: 24, border: isOpen ? '1.5px solid var(--red-200)' : '1.5px solid #F1F5F9', padding: 24, cursor: s.expandable ? 'pointer' : 'default' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {t(s.label)}
                {s.expandable && <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Team Presence detail */}
      {expanded === 'presence' && presence && (
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: '0 0 20px' }}>
            {t('Team Presence')} — {presence.presentCount}/{presence.total} {t('on duty')}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {presenceGroup('Present', presence.present, '#10B981', 'No one has clocked in yet.')}
            {presenceGroup('Absent today', presence.absent, 'var(--red-600)', 'Everyone showed up.')}
            {presenceGroup('On leave', presence.onLeave, '#F59E0B', 'No one is on leave today.')}
          </div>
        </div>
      )}

      {/* Pending Approvals detail */}
      {expanded === 'approvals' && (
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: '0 0 20px' }}>
            {t('Pending Approvals')} — {approvalsTotal} {t('awaiting you')}
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {approvalRows.map(row => (
              <div
                key={row.label}
                onClick={() => navigate(row.path)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 14, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{t(row.label)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ minWidth: 28, height: 28, padding: '0 8px', borderRadius: 999, background: row.count ? 'var(--red-600)' : '#E2E8F0', color: row.count ? '#fff' : '#94A3B8', fontSize: 13, fontWeight: 900, display: 'grid', placeItems: 'center' }}>{row.count}</span>
                  <ChevronRight size={18} color="#94A3B8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Stability detail — latest attrition risk per team member */}
      {expanded === 'stability' && (
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: '0 0 20px' }}>
            {t('Team Stability')} — {attrition?.highRiskCount || 0} {t('at high retention risk')}
          </h3>
          {attrition?.predictions?.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {attrition.predictions.map(p => (
                <div key={p.employeeID} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: '#fff', border: '1px solid #F1F5F9', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, color: riskColor(p.riskLevel), flexShrink: 0 }}>
                      {(p.employeeName || '?').charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.employeeName || p.employeeID}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{new Date(p.predictedAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#1E293B' }}>{Math.round((p.riskScore || 0) * 100)}%</span>
                    <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 900, color: '#fff', background: riskColor(p.riskLevel) }}>{t(p.riskLevel)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{t('No attrition predictions yet for your team.')}</div>
          )}
        </div>
      )}

      {/* Clock In / Out Terminal */}
      <div style={{ marginTop: 32, background: '#1E293B', borderRadius: 32, padding: 60, color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'var(--red-600)', opacity: 0.1, filter: 'blur(60px)' }} />

        <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 20, letterSpacing: '0.1em' }}>System Node Time</div>
        <div style={{ fontSize: 72, fontWeight: 900, marginBottom: 12, fontFamily: 'monospace' }}>
          {currentTime.toLocaleTimeString([], { hour12: false })}
        </div>
        <div style={{ fontSize: 18, color: '#94A3B8', fontWeight: 600, marginBottom: 48 }}>{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          {!todayRecord?.clockIn ? (
            <button
              onClick={handleClockAction}
              style={{ height: 64, padding: '0 48px', borderRadius: 16, background: 'var(--red-600)', color: 'white', border: 'none', fontSize: 18, fontWeight: 900, cursor: 'pointer' }}
            >
              Clock In
            </button>
          ) : (
            <button
              onClick={handleClockAction}
              style={{ height: 64, padding: '0 48px', borderRadius: 16, background: 'none', border: '2px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 18, fontWeight: 900, cursor: 'pointer' }}
            >
              Clock Out
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 24, marginTop: 60, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { label: 'Start Time', value: toTime(todayRecord?.clockIn) },
            { label: 'End Time', value: toTime(todayRecord?.clockOut) },
            { label: 'System Load', value: 'Steady' }
          ].map(i => (
            <div key={i.label} style={{ padding: 24, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{i.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{i.value}</div>
            </div>
          ))}
        </div>
      </div>
    </LeaderPortalLayout>
  );
}
