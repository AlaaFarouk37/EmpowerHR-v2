import { useEffect, useMemo, useState } from 'react';
import { Spinner, Btn, Badge, useToast } from '../../components/shared/index.jsx';
import { hrGetEmployees, hrFetchExternalSalaryBenchmark } from '../../api/index.js';
import { useLanguage } from '../../context/LanguageContext';

const benchmarkKey = (title, level) =>
  `${(title || '').trim().toLowerCase()}|${(level || '').trim().toLowerCase()}`;

const formatCurrency = (value, currency = 'EGP') => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export function HRBenchmarkSalaryPage() {
  const toast = useToast();
  const { t } = useLanguage();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [benchmarkMap, setBenchmarkMap] = useState({});
  const [benchmarkSource, setBenchmarkSource] = useState(null);
  const [benchmarking, setBenchmarking] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await hrGetEmployees();
        if (!cancelled) setEmployees(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!cancelled) toast(error.message || 'Failed to load employees', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

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

  const rows = useMemo(() => employees.map((employee) => {
    const lookup = benchmarkMap[benchmarkKey(employee.jobTitle, employee.jobLevel)];
    const baseSalary = Number(employee.monthlyIncome || 0);
    const rawBenchmark = lookup?.benchmark_salary;
    const benchmark = rawBenchmark === null || rawBenchmark === undefined
      ? null
      : Number(rawBenchmark);
    let variancePct = null;
    if (benchmark !== null && baseSalary > 0) {
      variancePct = ((benchmark - baseSalary) / baseSalary) * 100;
    }
    return { employee, benchmark, baseSalary, variancePct };
  }), [employees, benchmarkMap]);

  const summary = useMemo(() => {
    const withBenchmark = rows.filter((r) => r.benchmark !== null);
    const underpaid = withBenchmark.filter((r) => r.variancePct !== null && r.variancePct > 0).length;
    const overpaid = withBenchmark.filter((r) => r.variancePct !== null && r.variancePct < 0).length;
    return { matched: withBenchmark.length, underpaid, overpaid };
  }, [rows]);

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
          <Btn onClick={handleFetchBenchmark} disabled={benchmarking || loading}>
            {benchmarking ? t('Fetching...') : t('Fetch Benchmark Salaries')}
          </Btn>
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
              {rows.map(({ employee, benchmark, variancePct }) => {
                const currency = employee.currency_preference || 'EGP';
                const variancePositive = variancePct !== null && variancePct > 0;
                const varianceColor = variancePct === null
                  ? 'var(--gray-400)'
                  : variancePositive
                    ? '#E8321A'
                    : variancePct < 0
                      ? '#16A34A'
                      : 'var(--gray-500)';
                return (
                  <tr key={employee.employeeID} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{employee.fullName || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 2 }}>{employee.employeeID}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13.5 }}>{employee.department || '—'}</td>
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

export default HRBenchmarkSalaryPage;
