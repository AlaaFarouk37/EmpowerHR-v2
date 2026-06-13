import { useEffect, useState } from 'react';
import { hrGetAttendanceReport } from '../../api/index.js';
import { Spinner, Btn, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import {
  ChevronLeft, ChevronRight, Plane, AlarmClock, CalendarOff, Target, Users, CalendarDays, FileText,
} from 'lucide-react';

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatPeriod = (mode, start, end) => {
  if (!start || !end) return '—';
  const s = new Date(start);
  const e = new Date(end);
  if (mode === 'month') {
    return s.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  const sameMonth = s.getMonth() === e.getMonth();
  const startLabel = s.toLocaleDateString(undefined, { day: 'numeric', ...(sameMonth ? {} : { month: 'short' }) });
  const endLabel = e.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
};

const punctColor = (v) =>
  v == null ? '#94A3B8' : v >= 90 ? '#16A34A' : v >= 75 ? '#D97706' : '#E8321A';

export function HRAttendanceReport() {
  const { t } = useLanguage();
  const toast = useToast();

  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(toISO(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const report = await hrGetAttendanceReport({ range: mode, date: anchor });
      setData(report);
    } catch (error) {
      toast(error.message || t('Failed to load attendance report'), 'error');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [mode, anchor]);

  const shift = (dir) => {
    const d = new Date(anchor);
    if (mode === 'week') {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
    }
    setAnchor(toISO(d));
  };

  const handleExport = () => {
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) {
      toast(t('Allow pop-ups to export the report as PDF.'), 'error');
      return;
    }
    win.document.open();
    win.document.write(buildReportHTML(data, mode));
    win.document.close();
    win.focus();
    // Let the new document lay out before opening the print / save-as-PDF dialog.
    setTimeout(() => win.print(), 300);
  };

  const summary = data?.summary;
  const employees = data?.employees || [];

  const stats = [
    { label: t('On Leave'), value: summary?.onLeaveEmployeeCount ?? 0, icon: Plane, grad: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)', glow: 'rgba(219,39,119,0.35)' },
    { label: t('Late Instances'), value: summary?.totalLateInstances ?? 0, icon: AlarmClock, grad: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)', glow: 'rgba(225,29,72,0.35)' },
    { label: t('No-Shows'), value: summary?.totalNoShows ?? 0, icon: CalendarOff, grad: 'linear-gradient(135deg, #FDA4AF 0%, #F43F5E 100%)', glow: 'rgba(244,63,94,0.32)' },
    {
      label: t('Punctuality'),
      value: summary?.overallPunctualityRate == null ? '—' : `${summary.overallPunctualityRate}%`,
      icon: Target,
      grad: 'linear-gradient(135deg, #C084FC 0%, #7C3AED 100%)',
      glow: 'rgba(124,58,237,0.34)',
    },
    { label: t('Employees'), value: summary?.employeeCount ?? 0, icon: Users, grad: 'linear-gradient(135deg, #F9A8D4 0%, #EC4899 100%)', glow: 'rgba(236,72,153,0.32)' },
  ];

  return (
    <div>
      {/* Control bar: range toggle + period selector */}
      <div style={{ background: '#fff', padding: '14px 20px', borderRadius: 16, border: '1.5px solid #F1F5F9', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', background: '#F8FAFC', borderRadius: 12, padding: 4, border: '1.5px solid #F1F5F9' }}>
          {[{ key: 'week', label: t('Weekly') }, { key: 'month', label: t('Monthly') }].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                padding: '8px 24px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                background: mode === m.key ? '#fff' : 'transparent',
                color: mode === m.key ? 'var(--red-600)' : '#94A3B8',
                boxShadow: mode === m.key ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => shift(-1)} aria-label={t('Previous')} style={navBtnStyle}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ minWidth: 180, textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#1E293B' }}>
            {formatPeriod(mode, data?.periodStart, data?.periodEnd)}
          </div>
          <button onClick={() => shift(1)} aria-label={t('Next')} style={navBtnStyle}>
            <ChevronRight size={18} />
          </button>
          <Btn variant="ghost" onClick={() => setAnchor(toISO(new Date()))} style={{ height: 40 }}>
            {mode === 'week' ? t('This Week') : t('This Month')}
          </Btn>
          <button
            onClick={handleExport}
            disabled={!data || loading}
            title={t('Export this report as PDF')}
            style={{
              height: 40, padding: '0 18px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
              color: '#fff', fontWeight: 800, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 18px -8px rgba(219,39,119,0.6)',
              cursor: (!data || loading) ? 'not-allowed' : 'pointer',
              opacity: (!data || loading) ? 0.5 : 1,
            }}
          >
            <FileText size={16} /> {t('Report')}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ height: '40vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  position: 'relative', overflow: 'hidden',
                  padding: '20px 22px', borderRadius: 22,
                  background: s.grad, color: '#fff',
                  boxShadow: `0 12px 26px -10px ${s.glow}`,
                }}
              >
                <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.16)' }} />
                <div style={{ position: 'absolute', bottom: -40, right: 18, width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                <div style={{ position: 'relative', width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.22)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                  <s.icon size={21} />
                </div>
                <div style={{ position: 'relative', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', opacity: 0.92 }}>{s.label}</div>
                <div style={{ position: 'relative', fontSize: 30, fontWeight: 900, marginTop: 2 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="hr-table-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={18} style={{ color: 'var(--red-600)' }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', margin: 0 }}>{t('Per-Employee Breakdown')}</h3>
              {data?.workingDays != null && (
                <span style={{
                  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)',
                  color: '#BE185D', border: '1.5px solid #F9A8D4',
                  padding: '7px 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '.03em',
                }}>
                  <CalendarDays size={15} />
                  <span style={{ fontSize: 16, fontWeight: 900 }}>{data.workingDays}</span>
                  {mode === 'week' ? t('working days this week') : t('working days this month')}
                </span>
              )}
            </div>

            {employees.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
                {t('No employees to report for this period.')}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {[t('Employee'), t('Department'), t('Team'), t('Late'), t('No-Shows'), t('Leave Days'), t('Attended'), t('Punctuality')].map((h, i) => (
                        <th key={`${h}-${i}`} style={{ padding: '12px 20px', textAlign: i >= 3 ? 'center' : 'left', fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1.5px solid #EAECF0' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((r) => (
                      <tr key={r.employeeID} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E293B' }}>{r.employeeName || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{r.employeeID}</div>
                        </td>
                        <td style={{ padding: '14px 20px', fontSize: 13 }}>{r.department || '—'}</td>
                        <td style={{ padding: '14px 20px', fontSize: 13 }}>{r.team || '—'}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: r.lateCount ? '#E8321A' : '#94A3B8' }}>{r.lateCount}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: r.noShowCount ? '#B45309' : '#94A3B8' }}>{r.noShowCount}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: r.leaveDays ? '#7C3AED' : '#94A3B8' }}>{r.leaveDays}</td>
                        <td style={{ padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#475569' }}>{r.attendedDays}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: punctColor(r.punctualityRate) }}>
                              {r.punctualityRate == null ? '—' : `${r.punctualityRate}%`}
                            </span>
                            <div style={{ width: 80, height: 5, background: '#EEF2F6', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${r.punctualityRate ?? 0}%`, height: '100%', background: punctColor(r.punctualityRate) }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const navBtnStyle = {
  width: 40, height: 40, borderRadius: 12, border: '1.5px solid #E2E8F0', background: '#fff',
  color: '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer',
};

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Build a standalone, print-ready HTML document for the current report so the
// browser's "Save as PDF" produces a clean, paginated file (no extra deps).
const buildReportHTML = (data, mode) => {
  const generatedAt = new Date().toLocaleString();
  const periodLabel = formatPeriod(mode, data.periodStart, data.periodEnd);
  const rangeLabel = mode === 'week' ? 'Weekly' : 'Monthly';
  const wdLabel = mode === 'week' ? 'working days this week' : 'working days this month';
  const s = data.summary || {};

  const cards = [
    { l: 'On Leave', v: s.onLeaveEmployeeCount ?? 0, c: '#DB2777' },
    { l: 'Late Instances', v: s.totalLateInstances ?? 0, c: '#E11D48' },
    { l: 'No-Shows', v: s.totalNoShows ?? 0, c: '#F43F5E' },
    { l: 'Punctuality', v: s.overallPunctualityRate == null ? '—' : `${s.overallPunctualityRate}%`, c: '#7C3AED' },
    { l: 'Employees', v: s.employeeCount ?? 0, c: '#EC4899' },
  ];
  const cardHtml = cards
    .map((c) => `<div class="card" style="background:${c.c}"><div class="cl">${c.l}</div><div class="cv">${c.v}</div></div>`)
    .join('');

  const rows = (data.employees || []).length
    ? data.employees.map((r) => `
        <tr>
          <td><strong>${escapeHtml(r.employeeName)}</strong><div class="muted">${escapeHtml(r.employeeID)}</div></td>
          <td>${escapeHtml(r.department) || '—'}</td>
          <td>${escapeHtml(r.team) || '—'}</td>
          <td class="num">${r.lateCount}</td>
          <td class="num">${r.noShowCount}</td>
          <td class="num">${r.leaveDays}</td>
          <td class="num">${r.attendedDays}</td>
          <td class="num">${r.punctualityRate == null ? '—' : `${r.punctualityRate}%`}</td>
        </tr>`).join('')
    : '<tr><td colspan="8" style="text-align:center;color:#94A3B8;padding:24px">No employees to report for this period.</td></tr>';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Attendance Report — ${escapeHtml(periodLabel)} (${escapeHtml(generatedAt)})</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1E293B; margin: 0; padding: 32px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 3px solid #EC4899; padding-bottom: 16px; margin-bottom: 20px; }
  h1 { font-size: 22px; margin: 0 0 6px; color: #BE185D; }
  .sub { font-size: 12px; color: #64748B; font-weight: 600; }
  .ts { text-align: right; font-size: 11px; color: #64748B; line-height: 1.6; white-space: nowrap; }
  .wd { display: inline-block; margin: 0 0 20px; background: #FCE7F3; color: #BE185D; border: 1.5px solid #F9A8D4; padding: 7px 16px; border-radius: 999px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
  .cards { display: flex; gap: 12px; margin-bottom: 24px; }
  .card { flex: 1; border-radius: 14px; padding: 14px 16px; color: #fff; }
  .cl { font-size: 10px; text-transform: uppercase; opacity: .92; font-weight: 700; letter-spacing: .04em; }
  .cv { font-size: 26px; font-weight: 900; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { text-align: left; background: #FDF2F8; color: #9D174D; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 2px solid #FBCFE8; }
  th.num, td.num { text-align: center; }
  td { padding: 9px 12px; border-bottom: 1px solid #F1F5F9; }
  td.num { font-weight: 700; }
  .muted { color: #94A3B8; font-size: 10px; }
  @page { margin: 14mm; }
</style></head>
<body>
  <div class="head">
    <div>
      <h1>Attendance Report</h1>
      <div class="sub">${rangeLabel} · ${escapeHtml(periodLabel)}</div>
    </div>
    <div class="ts">Generated<br>${escapeHtml(generatedAt)}</div>
  </div>
  <div class="wd">${data.workingDays ?? 0} ${wdLabel}</div>
  <div class="cards">${cardHtml}</div>
  <table>
    <thead><tr>
      <th>Employee</th><th>Department</th><th>Team</th>
      <th class="num">Late</th><th class="num">No-Shows</th><th class="num">Leave Days</th>
      <th class="num">Attended</th><th class="num">Punctuality</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
};
