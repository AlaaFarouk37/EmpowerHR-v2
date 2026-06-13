import { useEffect, useMemo, useState } from 'react';
import { hrGetAttendanceRecords, hrGetLeaveRequests, hrGetEmployees } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
import ContactEmailModal from '../../components/shared/ContactEmailModal.jsx';
import { HRAttendanceReport } from './AttendanceReportPage.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  Users,
  CalendarOff,
  Plane,
  Mail,
} from 'lucide-react';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
};

const dateOnly = (value) => String(value || '').slice(0, 10);

const LateTag = ({ minutes, t }) => (
  <span
    title={minutes ? `${minutes} ${t('min late')}` : t('Late')}
    style={{
      fontSize: 10, fontWeight: 800, color: '#fff', background: '#E8321A',
      padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase',
      letterSpacing: '.03em', whiteSpace: 'nowrap',
    }}
  >
    {t('Late')}!
  </span>
);

function HRAttendanceDayToDay() {
  const toast = useToast();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactEmail, setContactEmail] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [att, lrv, emps] = await Promise.all([
        hrGetAttendanceRecords().catch(() => []),
        hrGetLeaveRequests().catch(() => []),
        hrGetEmployees().catch(() => []),
      ]);
      setAttendance(Array.isArray(att) ? att : []);
      setLeaves(Array.isArray(lrv) ? lrv : []);
      setEmployees(Array.isArray(emps) ? emps : []);
    } catch (error) {
      toast('Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) loadData();
  }, [authLoading, user]);

  const EXCLUDED_ROLES = new Set(['HRManager', 'Admin']);

  const trackedEmployees = useMemo(
    () => employees.filter((e) => !EXCLUDED_ROLES.has(String(e.role || ''))),
    [employees]
  );

  const trackedIds = useMemo(
    () => new Set(trackedEmployees.map((e) => e.employeeID)),
    [trackedEmployees]
  );

  const employeeById = useMemo(() => {
    const map = {};
    employees.forEach((e) => { if (e?.employeeID) map[e.employeeID] = e; });
    return map;
  }, [employees]);

  const openContactFor = (id, name, subject) => {
    const emp = employeeById[id];
    setContactEmail({
      to: emp?.email || '',
      subject: subject || (name ? `Re: ${name}` : ''),
    });
  };

  const EmailIconButton = ({ to, title, onClick, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !to}
      title={to ? `${title} ${to}` : t('No email on file')}
      aria-label={title}
      style={{
        width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E5E7EB',
        background: '#fff', color: '#475569',
        display: 'grid', placeItems: 'center',
        cursor: (disabled || !to) ? 'not-allowed' : 'pointer',
        opacity: (disabled || !to) ? 0.45 : 1,
        transition: 'all 0.15s ease', padding: 0,
      }}
    >
      <Mail size={15} />
    </button>
  );

  const onLeave = useMemo(() => {
    return leaves.filter((lv) => {
      if (lv.status !== 'Approved') return false;
      const start = dateOnly(lv.startDate);
      const end = dateOnly(lv.endDate || lv.startDate);
      if (!(selectedDate >= start && selectedDate <= end)) return false;
      const id = lv.employee || lv.employeeID || lv.employee_id;
      return id == null ? true : trackedIds.has(id);
    });
  }, [leaves, selectedDate, trackedIds]);

  const attendanceForDay = useMemo(() => {
    return attendance.filter((r) => {
      if (dateOnly(r.date) !== selectedDate) return false;
      const id = r.employee || r.employeeID || r.employee_id;
      return id == null ? true : trackedIds.has(id);
    });
  }, [attendance, selectedDate, trackedIds]);

  const noShows = useMemo(() => {
    const onLeaveIds = new Set(onLeave.map((l) => l.employee || l.employeeID || l.employee_id));
    const clockedIds = new Set(attendanceForDay.map((r) => r.employee || r.employeeID || r.employee_id));
    return trackedEmployees.filter((e) => {
      if (String(e.employmentStatus || 'Active') !== 'Active') return false;
      const id = e.employeeID;
      if (onLeaveIds.has(id)) return false;
      if (clockedIds.has(id)) return false;
      return true;
    });
  }, [trackedEmployees, onLeave, attendanceForDay]);

  const sortedAttendance = useMemo(() => {
    return [...attendanceForDay].sort((a, b) => {
      const ta = a.clockIn ? new Date(a.clockIn).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.clockIn ? new Date(b.clockIn).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  }, [attendanceForDay]);

  const stats = [
    { label: t('On Leave'), value: onLeave.length, icon: Plane, accent: '#7C3AED' },
    { label: t('No Shows'), value: noShows.length, icon: CalendarOff, accent: '#E8321A' },
    { label: t('Clocked In'), value: sortedAttendance.length, icon: CheckCircle, accent: '#16A34A' },
    { label: t('Total Employees'), value: trackedEmployees.length, icon: Users, accent: '#1E293B' },
  ];

  if (loading || authLoading) {
    return (
      <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)', margin: 0 }}>
            {t('Track who is on leave, who did not show up, and live clock-in / clock-out activity.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 6 }}>
              {t('Date')}
            </label>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff' }}>
              <CalendarIcon size={16} style={{ color: 'var(--gray-500)' }} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 700, background: 'transparent' }}
              />
            </div>
          </div>
          <Btn variant="ghost" onClick={() => setSelectedDate(todayKey())} style={{ height: 40 }}>
            {t('Today')}
          </Btn>
          <Btn variant="outline" onClick={loadData} style={{ height: 40 }}>
            {t('Refresh')}
          </Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.label} className="hr-stat-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.accent}1A`, display: 'grid', placeItems: 'center', color: s.accent }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.accent }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="hr-table-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, background: '#F5F3FF' }}>
            <Plane size={16} style={{ color: '#7C3AED' }} />
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#5B21B6', margin: 0 }}>{t('On Approved Leave')}</h3>
            <Badge label={onLeave.length} color="accent" style={{ marginLeft: 'auto' }} />
          </div>
          {onLeave.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
              {t('No one is on approved leave for this date.')}
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {onLeave.map((lv) => {
                const id = lv.employee || lv.employeeID || lv.employee_id;
                const emp = employeeById[id];
                return (
                  <div key={lv.leaveRequestID} style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{lv.employeeName || emp?.fullName || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 2 }}>
                        {dateOnly(lv.startDate)} → {dateOnly(lv.endDate || lv.startDate)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Badge label={lv.leaveType || '—'} color="accent" />
                      <EmailIconButton
                        to={emp?.email}
                        title={t('Email')}
                        onClick={() => openContactFor(id, lv.employeeName || emp?.fullName, `Re: ${t('Leave')} — ${lv.leaveType || ''}`.trim())}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hr-table-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2' }}>
            <CalendarOff size={16} style={{ color: '#E8321A' }} />
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#991B1B', margin: 0 }}>{t('Did Not Show Up')}</h3>
            <Badge label={noShows.length} color="red" style={{ marginLeft: 'auto' }} />
          </div>
          {noShows.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
              {t('Everyone is accounted for. Nice.')}
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {noShows.map((emp) => (
                <div key={emp.employeeID} style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>{emp.fullName || '—'}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginTop: 2 }}>
                      {emp.jobTitle || '—'} · {emp.employeeID}
                    </div>
                  </div>
                  <EmailIconButton
                    to={emp.email}
                    title={t('Email')}
                    onClick={() => openContactFor(emp.employeeID, emp.fullName, `Re: ${t('Attendance')} — ${selectedDate}`)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hr-table-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={18} style={{ color: 'var(--red-600)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', margin: 0 }}>{t('Attendance Sheet')}</h3>
          <span style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 10 }}>{selectedDate}</span>
          <Badge label={sortedAttendance.length} color="gray" style={{ marginLeft: 'auto' }} />
        </div>

        {sortedAttendance.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
            {t('No clock-in records yet for this date.')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {[t('Employee'), t('Department'), t('Team'), t('Clock In'), t('Clock Out'), t('Worked'), t('Status'), ''].map((h, i) => (
                    <th key={`${h}-${i}`} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1.5px solid #EAECF0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAttendance.map((rec) => {
                  const out = rec.clockOut;
                  const inProgress = rec.clockIn && !out;
                  const statusColor =
                    rec.status === 'Present' ? 'green' :
                    rec.status === 'Partial' ? 'yellow' :
                    inProgress ? 'accent' : 'gray';
                  const id = rec.employee || rec.employeeID || rec.employee_id;
                  const emp = employeeById[id];
                  return (
                    <tr key={rec.attendanceID} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>{rec.employeeName || emp?.fullName || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{id || ''}</div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13 }}>{rec.employeeDepartment || '—'}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13 }}>{rec.employeeTeam || '—'}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#1E293B', fontFamily: 'ui-monospace, monospace' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          {formatTime(rec.clockIn)}
                          {rec.isLate && <LateTag minutes={rec.lateMinutes} t={t} />}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: out ? '#1E293B' : 'var(--gray-400)' }}>
                        {out ? formatTime(out) : '—'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontFamily: 'ui-monospace, monospace', color: 'var(--gray-600)' }}>
                        {rec.workedHours != null ? `${rec.workedHours}h` : '—'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <Badge label={t(rec.status || (inProgress ? 'Clocked In' : 'Present'))} color={statusColor} />
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <EmailIconButton
                          to={emp?.email}
                          title={t('Email')}
                          onClick={() => openContactFor(id, rec.employeeName || emp?.fullName, `Re: ${t('Attendance')} — ${selectedDate}`)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {contactEmail && (
        <ContactEmailModal
          to={contactEmail.to}
          subject={contactEmail.subject}
          onClose={() => setContactEmail(null)}
          onSent={() => toast(t('Email sent'), 'success')}
        />
      )}
    </div>
  );
}

export function HRAttendancePage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState('daily');

  const tabs = [
    { key: 'daily', label: t('Day-to-Day Tracking') },
    { key: 'reporting', label: t('Weekly / Monthly Reporting') },
  ];

  return (
    <div className="hr-page-shell" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, color: '#1E293B' }}>{t('Attendance')}</h2>
      <div style={{ display: 'inline-flex', background: '#F8FAFC', borderRadius: 12, padding: 4, border: '1.5px solid #F1F5F9', marginBottom: 28 }}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={{
              padding: '8px 24px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              background: tab === tb.key ? '#fff' : 'transparent',
              color: tab === tb.key ? 'var(--red-600)' : '#94A3B8',
              boxShadow: tab === tb.key ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'daily' ? <HRAttendanceDayToDay /> : <HRAttendanceReport />}
    </div>
  );
}
