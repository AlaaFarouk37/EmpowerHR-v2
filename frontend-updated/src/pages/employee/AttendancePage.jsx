import { useEffect, useMemo, useState } from 'react';
import {
  getMyAttendance,
  getMyTimeCorrections,
  getMyLeaveRequests,
  getPublicHolidays,
  submitTimeCorrection,
} from '../../api/index.js';
import { Spinner, Btn, Badge, Input, Textarea, Modal, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Clock,
  Calendar,
  TrendingUp,
  History,
  Edit3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');

// Local date → 'YYYY-MM-DD' (matches the backend's date strings without TZ drift).
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// 'YYYY-MM-DD' → local Date (avoids the UTC parse that `new Date(str)` does).
const parseYMD = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ISO datetime → value for <input type="datetime-local"> (local time).
function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ISO datetime → short readable time, or em dash.
function toTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLORS = {
  Present: 'red',
  Partial: 'orange',
  Late: 'orange',
  'On Leave': 'blue',
  'Clocked In': 'red',
};

// Display for every non-present day kind in the log.
const KIND_BADGE = {
  weekend: { label: 'Weekend', color: 'gray' },
  holiday: { label: 'Holiday', color: 'blue' },
  leave: { label: 'On Leave', color: 'blue' },
  absent: { label: 'Absent', color: 'red' },
  today: { label: 'Today', color: 'gray' },
  upcoming: { label: '—', color: 'gray' },
};

export function EmployeeAttendancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const employeeID = user?.employee_id;

  const [attendance, setAttendance] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  // First day of the month currently shown in the log / stats.
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Time-correction modal state
  const EMPTY_CORRECTION = { clockIn: '', clockOut: '', reason: '' };
  const [correctionRecord, setCorrectionRecord] = useState(null);
  const [correctionForm, setCorrectionForm] = useState(EMPTY_CORRECTION);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  const loadData = async () => {
    if (!employeeID) return;
    setLoading(true);
    try {
      const [data, corr, leaveData] = await Promise.all([
        getMyAttendance(employeeID).catch(() => []),
        getMyTimeCorrections(employeeID).catch(() => []),
        getMyLeaveRequests(employeeID).catch(() => []),
      ]);
      setAttendance(Array.isArray(data) ? data : []);
      setCorrections(Array.isArray(corr) ? corr : []);
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
    } catch (error) {
      toast(error.message || 'Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [employeeID]);

  // Holidays are per-year; refetch when the viewed month's year changes.
  useEffect(() => {
    getPublicHolidays(selectedMonth.getFullYear())
      .then((data) => setHolidays(Array.isArray(data) ? data : []))
      .catch(() => setHolidays([]));
  }, [selectedMonth]);

  // attendanceID → latest correction request (for the "pending" badge).
  const correctionByRecord = useMemo(() => {
    const map = {};
    for (const c of corrections) {
      if (!map[c.attendance]) map[c.attendance] = c;
    }
    return map;
  }, [corrections]);

  const attByDate = useMemo(() => {
    const map = {};
    for (const r of attendance) map[r.date] = r;
    return map;
  }, [attendance]);

  // date key → leave type name, for every day covered by an approved leave.
  const leaveByDate = useMemo(() => {
    const map = {};
    for (const lv of leaves) {
      if (lv.status !== 'Approved') continue;
      let cur = parseYMD(lv.startDate);
      const end = parseYMD(lv.endDate);
      while (cur <= end) {
        map[toKey(cur)] = lv.leaveType;
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      }
    }
    return map;
  }, [leaves]);

  const holidayByDate = useMemo(() => {
    const map = {};
    for (const h of holidays) map[h.date] = h.name;
    return map;
  }, [holidays]);

  const monthDays = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => new Date(year, month, i + 1));
  }, [selectedMonth]);

  // One row per calendar day of the month, resolved to present / leave /
  // weekend / holiday / absent — mirrors the backend's workday resolution.
  const { rows, dist } = useMemo(() => {
    const todayKey = toKey(new Date());
    const built = monthDays.map((d) => {
      const key = toKey(d);
      const record = attByDate[key];
      const day = d.getDay(); // 0 Sun .. 6 Sat — Egyptian weekend is Fri(5)+Sat(6).
      const isWeekend = day === 5 || day === 6;
      const holidayName = holidayByDate[key];
      const leaveType = leaveByDate[key];
      let kind;
      if (record) kind = 'present';
      else if (isWeekend) kind = 'weekend';
      else if (holidayName) kind = 'holiday';
      else if (leaveType) kind = 'leave';
      else if (key < todayKey) kind = 'absent';
      else if (key === todayKey) kind = 'today';
      else kind = 'upcoming';
      return { d, key, record, kind, holidayName, leaveType };
    });
    const dist = { present: 0, leave: 0, absent: 0 };
    for (const r of built) {
      if (r.kind === 'present') dist.present += 1;
      else if (r.kind === 'leave') dist.leave += 1;
      else if (r.kind === 'absent') dist.absent += 1;
    }
    // Ascending: day 1 → end of month.
    return { rows: built, dist };
  }, [monthDays, attByDate, holidayByDate, leaveByDate]);

  // Hours totals for the selected month (real, from the logs).
  const monthTotals = useMemo(() => {
    const ym = `${selectedMonth.getFullYear()}-${pad(selectedMonth.getMonth() + 1)}`;
    const recs = attendance.filter((r) => String(r.date || '').slice(0, 7) === ym);
    const totalHours = recs.reduce((acc, r) => acc + (parseFloat(r.workedHours) || 0), 0);
    const overtime = recs.reduce((acc, r) => acc + (parseFloat(r.overtimeHours) || 0), 0);
    return { totalHours, overtime, regular: Math.max(0, totalHours - overtime) };
  }, [attendance, selectedMonth]);

  // Current (real) week range for the header card.
  const currentWeek = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // back to Monday
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `${fmt(start)} - ${fmt(end)}`;
  }, []);

  const monthLabel = selectedMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const shiftMonth = (delta) =>
    setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const attendedDays = dist.present + dist.absent;
  const attendanceRate = attendedDays ? Math.round((dist.present / attendedDays) * 100) : 0;
  const totalHoursLogged = monthTotals.totalHours || 0;
  const regularPct = totalHoursLogged ? Math.round((monthTotals.regular / totalHoursLogged) * 100) : 0;

  const openCorrection = (record) => {
    setCorrectionRecord(record);
    setCorrectionForm({
      clockIn: toLocalInput(record.clockIn),
      clockOut: toLocalInput(record.clockOut),
      reason: '',
    });
  };

  const submitCorrection = async () => {
    if (!correctionRecord) return;
    if (!correctionForm.clockIn && !correctionForm.clockOut) {
      return toast(t('Enter a corrected clock in and/or clock out time.'), 'error');
    }
    setSubmittingCorrection(true);
    try {
      await submitTimeCorrection({
        attendanceID: correctionRecord.attendanceID,
        requestedClockIn: correctionForm.clockIn ? new Date(correctionForm.clockIn).toISOString() : null,
        requestedClockOut: correctionForm.clockOut ? new Date(correctionForm.clockOut).toISOString() : null,
        reason: correctionForm.reason.trim(),
      });
      toast(t('Correction request submitted for review.'), 'success');
      setCorrectionRecord(null);
      await loadData();
    } catch (error) {
      toast(error?.response?.data?.error || error.message || t('Failed to submit correction request'), 'error');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  if (loading) return (
    <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
      <Spinner size={48} />
    </div>
  );

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Time Sheet')}</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>{t('Manage your working hours and attendance logs')}</p>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
          <div className="glass-card-employee" style={{ padding: '24px', background: '#fff', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 20, border: '1px solid #F1F5F9' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF2F2', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Current Week')}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1E293B' }}>{currentWeek}</div>
            </div>
          </div>
          <div className="glass-card-employee" style={{ padding: '24px', background: '#fff', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 20, border: '1px solid #F1F5F9' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EFF6FF', color: '#2563EB', display: 'grid', placeItems: 'center' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Total Hours')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{monthTotals.totalHours.toFixed(1)}h</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{monthLabel}</div>
            </div>
          </div>
          <div className="glass-card-employee" style={{ padding: '24px', background: '#fff', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 20, border: '1px solid #F1F5F9' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#ECFDF5', color: '#10B981', display: 'grid', placeItems: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Overtime Hours')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{monthTotals.overtime.toFixed(1)}h</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{monthLabel}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Attendance Table */}
          <div className="glass-card-employee" style={{ padding: 0, background: '#fff', borderRadius: 24, border: '1px solid #F1F5F9' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <History size={20} color="#DC2626" />
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Attendance Log')}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={() => shiftMonth(-1)} aria-label={t('Previous month')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><ChevronLeft size={20} /></button>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', minWidth: 120, textAlign: 'center' }}>{monthLabel}</span>
                <button onClick={() => shiftMonth(1)} aria-label={t('Next month')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><ChevronRight size={20} /></button>
              </div>
            </div>

            <div style={{ padding: '16px 32px 32px' }}>
              <table className="employee-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94A3B8', fontSize: 12, fontWeight: 800, textAlign: 'left' }}>
                    <th style={{ padding: '12px 0' }}>{t('Date')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Clock In')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Clock Out')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Total Hours')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Overtime')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Status')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const { d, record, kind } = row;
                    const muted = kind === 'weekend' || kind === 'upcoming';
                    const badge = kind === 'present'
                      ? { label: t(record.status), color: STATUS_COLORS[record.status] || 'gray' }
                      : KIND_BADGE[kind];
                    const subtitle = row.holidayName
                      ? row.holidayName
                      : (kind === 'leave' ? row.leaveType : d.toLocaleDateString('en-GB', { weekday: 'long' }));
                    return (
                      <tr key={row.key} style={{ borderTop: '1px solid #F1F5F9', opacity: muted ? 0.55 : 1 }}>
                        <td style={{ padding: '16px 0' }}>
                          <div style={{ fontWeight: 800 }}>{d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>{subtitle}</div>
                        </td>
                        <td style={{ padding: '16px 0' }}>{record ? toTime(record.clockIn) : '—'}</td>
                        <td style={{ padding: '16px 0' }}>{record ? toTime(record.clockOut) : '—'}</td>
                        <td style={{ padding: '16px 0' }}>{record ? `${record.workedHours || '0'}h` : '—'}</td>
                        <td style={{ padding: '16px 0' }}>
                          {record && Number(record.overtimeHours) > 0
                            ? <span style={{ color: '#10B981', fontWeight: 700 }}>+{record.overtimeHours}h</span>
                            : <span style={{ color: '#94A3B8', fontWeight: 700 }}>{record ? '0h' : '—'}</span>}
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          <Badge label={badge.label} color={badge.color} />
                        </td>
                        <td style={{ padding: '16px 0', textAlign: 'right' }}>
                          {record && (() => {
                            const correction = correctionByRecord[record.attendanceID];
                            const corrStatus = correction?.status;
                            if (corrStatus === 'Pending') return <Badge label={t('Correction pending')} color="orange" />;
                            if (corrStatus === 'Approved') return <Badge label={t('Correction approved')} color="red" />;
                            if (corrStatus === 'Denied') return (
                              <span title={correction?.reviewNote || t('Correction request was denied.')}>
                                <Badge label={t('Correction denied')} color="gray" />
                              </span>
                            );
                            return (
                              <button
                                onClick={() => openCorrection(record)}
                                title={t('Request Time Correction')}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                                  borderRadius: 10, border: '1.5px solid #FECACA', background: '#FEF2F2',
                                  color: '#DC2626', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                                }}
                              >
                                <Edit3 size={14} /> {t('Request Correction')}
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="glass-card-employee" style={{ padding: '32px', background: '#fff', borderRadius: 24, border: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>{t('Time Distribution')}</h3>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginBottom: 24 }}>{monthLabel}</div>

              {/* Attendance-rate ring (present vs. days that have passed) */}
              <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 32px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#DC2626" strokeWidth="3" strokeDasharray={`${attendanceRate}, 100`} strokeLinecap="round" />
                </svg>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#1E293B' }}>{attendanceRate}%</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>{t('Attendance')}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  { label: t('Present'), value: `${dist.present} ${t('days')}`, color: '#DC2626' },
                  { label: t('On Leave'), value: `${dist.leave} ${t('days')}`, color: '#2563EB' },
                  { label: t('Absent'), value: `${dist.absent} ${t('days')}`, color: '#94A3B8' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hours logged this month (real) */}
            <div className="glass-card-employee" style={{ padding: '32px', background: '#DC2626', borderRadius: 24, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <Clock size={24} />
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{t('Hours Logged')}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 32, fontWeight: 900 }}>{monthTotals.totalHours.toFixed(1)}h</span>
                <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{t('this month')}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 20 }}>
                {monthTotals.regular.toFixed(1)}h {t('regular')} · {monthTotals.overtime.toFixed(1)}h {t('overtime')}
              </p>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${regularPct}%`, height: '100%', background: '#fff', borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Time Correction modal */}
      <Modal
        open={!!correctionRecord}
        onClose={() => setCorrectionRecord(null)}
        title={correctionRecord ? `${t('Request Time Correction')} — ${new Date(correctionRecord.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
      >
        <div style={{ display: 'grid', gap: 18 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', fontWeight: 600 }}>
            {t('Enter your actual clock in / clock out times. Your team leader will review the request.')}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label={t('Actual Clock In')}
              type="datetime-local"
              value={correctionForm.clockIn}
              onChange={(e) => setCorrectionForm((f) => ({ ...f, clockIn: e.target.value }))}
            />
            <Input
              label={t('Actual Clock Out')}
              type="datetime-local"
              value={correctionForm.clockOut}
              onChange={(e) => setCorrectionForm((f) => ({ ...f, clockOut: e.target.value }))}
            />
          </div>
          <Textarea
            label={t('Reason')}
            value={correctionForm.reason}
            onChange={(e) => setCorrectionForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder={t('Why does this record need correcting?')}
            style={{ minHeight: 90 }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="ghost" onClick={() => setCorrectionRecord(null)} style={{ flex: 1 }}>{t('Cancel')}</Btn>
            <Btn onClick={submitCorrection} loading={submittingCorrection} style={{ flex: 1, background: '#DC2626', border: 'none', fontWeight: 900 }}>
              {t('Submit Request')}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
