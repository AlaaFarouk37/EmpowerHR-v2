import { useEffect, useMemo, useState } from 'react';
import { Spinner, Btn, Badge, useToast } from '../../components/shared/index.jsx';
import { hrGetEmployees, hrFetchExternalSalaryBenchmark, hrGetDepartmentOptions } from '../../api/index.js';
import { useLanguage } from '../../context/LanguageContext';
import { FileText } from 'lucide-react';

const benchmarkKey = (title, level) =>
  `${(title || '').trim().toLowerCase()}|${(level || '').trim().toLowerCase()}`;

const formatCurrency = (value, currency = 'EGP') => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export function BenchmarkingPage() {
  const toast = useToast();
  const { t } = useLanguage();

  const [employees, setEmployees] = useState([]);
  const [deptNameById, setDeptNameById] = useState({});
  const [loading, setLoading] = useState(true);
  const [benchmarkMap, setBenchmarkMap] = useState({});
  const [benchmarkSource, setBenchmarkSource] = useState(null);
  const [benchmarking, setBenchmarking] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [filterDept, setFilterDept] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [data, depts] = await Promise.all([
          hrGetEmployees(),
          hrGetDepartmentOptions().catch(() => []),
        ]);
        if (cancelled) return;
        setEmployees(Array.isArray(data) ? data : []);
        const map = {};
        (Array.isArray(depts) ? depts : []).forEach(d => {
          const id = d?.department_id ?? d?.id;
          const name = d?.name || d?.department;
          if (id != null && name) map[String(id)] = String(name);
        });
        setDeptNameById(map);
      } catch (error) {
        if (!cancelled) toast(error.message || 'Failed to load employees', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const resolveDept = (raw) => {
    if (raw == null || raw === '') return '—';
    const key = String(raw);
    if (deptNameById[key]) return deptNameById[key];
    if (typeof raw === 'object' && raw !== null) return raw.name || raw.label || '—';
    return key;
  };

  const handleFetchBenchmark = async () => {
    setBenchmarking(true);
    try {
      const results = await hrFetchExternalSalaryBenchmark();
      const map = {};
      results.forEach((entry) => {
        map[benchmarkKey(entry.jobTitle, entry.jobLevel)] = entry;
      });
      setBenchmarkMap(map);
      setBenchmarkSource(results[0]?.source || 'External Salary Benchmark API');
      setLastFetched(new Date());
      toast(t('Benchmark salaries fetched from external source'));
    } catch (error) {
      toast(error.message || 'Failed to fetch benchmark salaries', 'error');
    } finally {
      setBenchmarking(false);
    }
  };

  const allRows = useMemo(() => employees.map((employee) => {
    const lookup = benchmarkMap[benchmarkKey(employee.jobTitle, employee.jobLevel)];
    const baseSalary = Number(employee.monthlyIncome || 0);
    const rawBenchmark = lookup?.benchmark_salary;
    const benchmark = rawBenchmark === null || rawBenchmark === undefined
      ? null
      : Number(rawBenchmark);
    let variancePct = null;
    if (benchmark !== null && baseSalary > 0) {
      variancePct = ((baseSalary - benchmark) / baseSalary) * 100;
    }
    return { employee, benchmark, baseSalary, variancePct, departmentLabel: resolveDept(employee.department) };
  }), [employees, benchmarkMap, deptNameById]);

  const departmentOptions = useMemo(
    () => Array.from(new Set(allRows.map(r => r.departmentLabel).filter(v => v && v !== '—'))).sort(),
    [allRows]
  );
  const titleOptions = useMemo(
    () => Array.from(new Set(allRows.map(r => r.employee.jobTitle).filter(Boolean))).sort(),
    [allRows]
  );
  const levelOptions = useMemo(
    () => Array.from(new Set(allRows.map(r => r.employee.jobLevel).filter(Boolean))).sort(),
    [allRows]
  );

  const rows = useMemo(() => allRows.filter(r => {
    if (filterDept && r.departmentLabel !== filterDept) return false;
    if (filterTitle && (r.employee.jobTitle || '') !== filterTitle) return false;
    if (filterLevel && (r.employee.jobLevel || '') !== filterLevel) return false;
    return true;
  }), [allRows, filterDept, filterTitle, filterLevel]);

  const summary = useMemo(() => {
    const withBenchmark = rows.filter((r) => r.benchmark !== null);
    const underpaid = withBenchmark.filter((r) => r.variancePct !== null && r.variancePct < 0).length;
    const overpaid = withBenchmark.filter((r) => r.variancePct !== null && r.variancePct > 0).length;
    return { matched: withBenchmark.length, underpaid, overpaid };
  }, [rows]);

  const filtersActive = Boolean(filterDept || filterTitle || filterLevel);
  const clearFilters = () => { setFilterDept(''); setFilterTitle(''); setFilterLevel(''); };

  const handleGenerateReport = () => {
    const dateStr = new Date().toLocaleString();
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) { toast(t('Pop-up blocked. Please allow pop-ups to generate the report.'), 'error'); return; }
    const scopeNote = [
      filterDept ? `${t('Department')}: ${filterDept}` : null,
      filterTitle ? `${t('Job Title')}: ${filterTitle}` : null,
      filterLevel ? `${t('Job Level')}: ${filterLevel}` : null,
    ].filter(Boolean).join(' · ') || t('All employees');
    const tableRows = rows.map(({ employee, benchmark, variancePct, departmentLabel }) => {
      const currency = employee.currency_preference || 'EGP';
      const base = Number(employee.monthlyIncome || 0);
      const cls = variancePct == null ? '' : variancePct > 0 ? 'pos' : variancePct < 0 ? 'neg' : '';
      const baseStr = base ? `${currency} ${base.toLocaleString()}` : '—';
      const benchStr = benchmark == null ? (hasFetched ? t('No match') : t('Not fetched')) : `EGP ${Number(benchmark).toLocaleString()}`;
      const varStr = variancePct == null ? '—' : `${variancePct > 0 ? '+' : ''}${variancePct.toFixed(1)}%`;
      return `
        <tr>
          <td><strong>${esc(employee.fullName || '—')}</strong><br/><span class="dim">${esc(employee.employeeID)}</span></td>
          <td>${esc(departmentLabel)}</td>
          <td>${esc(employee.jobTitle || '—')}</td>
          <td>${esc(employee.jobLevel || '—')}</td>
          <td>${esc(baseStr)}</td>
          <td>${esc(benchStr)}</td>
          <td class="${cls}">${esc(varStr)}</td>
        </tr>`;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>Salary Benchmarking — ${esc(dateStr)}</title>
<style>
  @page { size: A4 landscape; margin: 16mm; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1E293B; margin: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #64748B; font-size: 12px; margin-bottom: 18px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .card { border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; background: #fff; }
  .label { font-size: 10px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
  .val { font-size: 22px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid #EAECF0; text-align: left; vertical-align: top; }
  th { background: #F8FAFC; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #64748B; }
  .pos { color: #16A34A; font-weight: 800; }
  .neg { color: #E8321A; font-weight: 800; }
  .dim { color: #94A3B8; font-size: 10px; }
  .actions { display: flex; gap: 8px; margin-bottom: 14px; }
  button { padding: 8px 14px; border: 1px solid #E2E8F0; background: #fff; border-radius: 8px; font-weight: 700; cursor: pointer; }
  button.primary { background: #1E40AF; color: #fff; border-color: #1E40AF; }
  @media print { .no-print { display: none !important; } }
</style>
</head><body>
  <div class="actions no-print">
    <button class="primary" onclick="window.print()">Save / Print as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <h1>Salary Benchmarking Report</h1>
  <div class="sub">Generated ${esc(dateStr)} · ${rows.length} employees in scope · ${esc(scopeNote)}${benchmarkSource ? ` · Source: ${esc(benchmarkSource)}` : ''}</div>
  <div class="summary">
    <div class="card"><div class="label">In Scope</div><div class="val">${rows.length}</div></div>
    <div class="card"><div class="label">Matched</div><div class="val" style="color:#2563EB">${summary.matched}</div></div>
    <div class="card"><div class="label">Below Market</div><div class="val" style="color:#E8321A">${summary.underpaid}</div></div>
    <div class="card"><div class="label">Above Market</div><div class="val" style="color:#16A34A">${summary.overpaid}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Employee</th><th>Department</th><th>Job Title</th><th>Job Level</th><th>Base Salary</th><th>Benchmark</th><th>Variance</th>
    </tr></thead>
    <tbody>${tableRows || '<tr><td colspan="7" style="text-align:center; padding:24px; color:#94A3B8">No employees in scope.</td></tr>'}</tbody>
  </table>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
</body></html>`);
    win.document.close();
  };

  const hasFetched = Object.keys(benchmarkMap).length > 0;

  return (
    <div className="hr-page-shell">
      <div className="hr-page-header is-split">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{t('Salary Benchmarking')}</h2>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>
            {t('Compare each employee\'s base salary with the market benchmark fetched from an external source.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerateReport}
            disabled={loading || employees.length === 0}
            title={t('Generate a printable PDF report of the current view')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '0 18px', height: 40, borderRadius: 12,
              background: loading || employees.length === 0 ? '#F1F5F9' : '#1E293B',
              color: loading || employees.length === 0 ? '#94A3B8' : '#fff',
              border: loading || employees.length === 0 ? 'none' : '1.5px solid var(--red-600)',
              fontWeight: 800, fontSize: 13,
              cursor: loading || employees.length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: loading || employees.length === 0 ? 'none' : '0 6px 14px -4px rgba(220, 38, 38, 0.45)',
              letterSpacing: '.02em',
            }}
          >
            <FileText size={16} style={{ color: 'var(--red-600)' }} /> {t('Report')}
          </button>
          <Btn onClick={handleFetchBenchmark} disabled={benchmarking || loading}>
            {benchmarking ? t('Fetching...') : t('Fetch Benchmark Salaries')}
          </Btn>
        </div>
      </div>

      <div className="hr-surface-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>{t('Department')}</label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600 }}
            >
              <option value="">{t('All departments')}</option>
              {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>{t('Job Title')}</label>
            <select
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600 }}
            >
              <option value="">{t('All titles')}</option>
              {titleOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>{t('Job Level')}</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 12, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600 }}
            >
              <option value="">{t('All levels')}</option>
              {levelOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {filtersActive && (
            <div>
              <Btn variant="outline" onClick={clearFilters} style={{ height: 40, width: '100%' }}>{t('Clear filters')}</Btn>
            </div>
          )}
        </div>
      </div>

      <div className="hr-surface-card" style={{ padding: 18, marginBottom: 22 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid #EAECF0', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Employees')}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{employees.length}</div>
          </div>
          <div style={{ border: '1px solid #EAECF0', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Matched to Benchmark')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB' }}>{summary.matched}</div>
          </div>
          <div style={{ border: '1px solid #EAECF0', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Below Market')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#E8321A' }}>{summary.underpaid}</div>
          </div>
          <div style={{ border: '1px solid #EAECF0', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{t('Above Market')}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#16A34A' }}>{summary.overpaid}</div>
          </div>
        </div>
        {hasFetched && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge color="accent" label={t('Source: {source}').replace('{source}', benchmarkSource || '—')} />
            {lastFetched && (
              <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                {t('Last fetched')}: {lastFetched.toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spinner /></div>
      ) : employees.length === 0 ? (
        <div className="hr-soft-empty" style={{ textAlign: 'center', padding: '70px 32px' }}>
          <p style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 600 }}>{t('No employees to benchmark.')}</p>
        </div>
      ) : (
        <div className="hr-table-card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {['Employee', 'Department', 'Job Title', 'Job Level', 'Base Salary', 'Benchmark Salary', 'Variance'].map((h) => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid #EAECF0' }}>{t(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ employee, benchmark, variancePct, departmentLabel }) => {
                const currency = employee.currency_preference || 'EGP';
                const variancePositive = variancePct !== null && variancePct > 0;
                const varianceColor = variancePct === null
                  ? 'var(--gray-400)'
                  : variancePositive
                    ? '#16A34A'
                    : variancePct < 0
                      ? '#E8321A'
                      : 'var(--gray-500)';
                return (
                  <tr key={employee.employeeID} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{employee.fullName || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 2 }}>{employee.employeeID}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13.5 }}>{departmentLabel}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13.5 }}>{employee.jobTitle || '—'}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13.5 }}>{employee.jobLevel || '—'}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13.5, fontFamily: 'ui-monospace, monospace' }}>
                      {formatCurrency(employee.monthlyIncome, currency)}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13.5, fontFamily: 'ui-monospace, monospace' }}>
                      {benchmark === null ? (
                        <span style={{ color: 'var(--gray-400)' }}>{hasFetched ? t('No match') : t('Not fetched')}</span>
                      ) : (
                        formatCurrency(benchmark, 'EGP')
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13.5, fontWeight: 700, color: varianceColor }}>
                      {variancePct === null
                        ? '—'
                        : `${variancePositive ? '+' : ''}${variancePct.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BenchmarkingPage;
