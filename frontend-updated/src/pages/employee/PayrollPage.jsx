import { useEffect, useMemo, useState } from 'react';
import { getMyPayroll } from '../../api/index.js';
import { Badge, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  DollarSign, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
  History
} from 'lucide-react';

const formatMoney = (value, language = 'en', currency = 'EGP') => {
  const number = Number(value || 0);
  return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: currency || 'EGP',
    minimumFractionDigits: 2,
  }).format(number);
};

export function EmployeePayrollPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t, language } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayroll = async () => {
      if (!user?.employee_id) return;
      setLoading(true);
      try {
        const data = await getMyPayroll(user.employee_id);
        setRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        toast(error.message || 'Failed to load payroll records', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadPayroll();
  }, [user?.employee_id]);

  // Records arrive sorted newest-period first. Headline the most recent payslip
  // that has actually started (period <= current month) — a pre-generated future
  // draft would otherwise show as "this month" with zero elapsed deductions.
  const currentMonthKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const latestRecord =
    records.find((r) => (r.payPeriod || '') <= currentMonthKey)
    || records[records.length - 1]
    || {};
  const otherRecords = records.filter((r) => r.payrollID !== latestRecord.payrollID).slice(0, 4);
  const currency = latestRecord.currency || 'EGP';

  const num = (v) => Number(v || 0);

  // Real payslip components from the DB record (mirrors the HR payroll detail).
  // "Bonus" maps to the commissions field, as labelled on the HR side.
  const buildBreakdown = (rec) => {
    const prorated = num(rec.proratedBaseSalary);
    const base = num(rec.baseSalary);
    const baseVal = prorated > 0 ? prorated : base;
    const isProrated = prorated > 0 && Math.abs(prorated - base) > 0.005;
    const earnings = [
      { key: 'base', label: 'Base Salary', sub: isProrated ? `Prorated · ${rec.weekdaysEmployed}/${rec.workingDays} days` : 'Full month', value: baseVal },
      { key: 'overtime', label: 'Overtime Pay', sub: `${num(rec.overtimeHours)}h × ${formatMoney(num(rec.hourlyRate), language, currency)} × 1.5`, value: num(rec.overtimePay) },
      { key: 'bonus', label: 'Bonus', sub: null, value: num(rec.commissions) },
    ];
    if (num(rec.expenseReimbursements) > 0) {
      earnings.push({ key: 'expenses', label: 'Approved Expenses', sub: null, value: num(rec.expenseReimbursements) });
    }
    const deductions = [
      { key: 'unpaid', label: 'Unpaid Leave', sub: `${num(rec.unpaidLeaveDays)} day(s) × ${formatMoney(num(rec.dailyRate), language, currency)}`, value: num(rec.unpaidLeaveDeduction) },
      { key: 'deductions', label: 'Deductions', sub: null, value: num(rec.deductions) },
    ];
    return { earnings, deductions };
  };

  // One payslip rendered as printable HTML (browser "Save as PDF").
  const payslipBody = (rec) => {
    const { earnings, deductions } = buildBreakdown(rec);
    const money = (v) => formatMoney(v, language, currency);
    const line = (c, sign) =>
      `<tr><td>${c.label}${c.sub ? `<div class="sub">${c.sub}</div>` : ''}</td>
        <td class="num ${sign === '-' ? 'neg' : 'pos'}">${sign}${money(Math.abs(c.value))}</td></tr>`;
    return `
      <section class="slip">
        <div class="head">
          <div><div class="brand">EmpowerHR</div><div class="sub">Payslip</div></div>
          <div class="period">${rec.payPeriod || '—'}<div class="sub">${rec.status || ''}${rec.paymentDate ? ` · Paid ${rec.paymentDate}` : ''}</div></div>
        </div>
        <div class="emp">
          <div><span class="sub">Employee</span><div>${rec.employeeName || ''}</div></div>
          <div><span class="sub">Employee ID</span><div>${rec.employeeID || ''}</div></div>
        </div>
        <div class="cols">
          <div><h3>Earnings</h3><table>${earnings.map((c) => line(c, '+')).join('')}</table></div>
          <div><h3>Deductions</h3><table>${deductions.map((c) => line(c, '-')).join('')}</table></div>
        </div>
        <div class="net"><span>Net Pay</span><strong>${money(rec.netPay)}</strong></div>
      </section>`;
  };

  const openPrintWindow = (title, inner) => {
    const win = window.open('', '_blank');
    if (!win) { toast('Please allow pop-ups to download payslips.', 'error'); return; }
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
      <style>
        * { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; box-sizing: border-box; }
        body { padding: 32px; color: #1E293B; }
        .slip { max-width: 720px; margin: 0 auto 28px; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E2E8F0; padding-bottom: 16px; }
        .brand { font-size: 22px; font-weight: 800; color: #DC2626; }
        .period { text-align: right; font-size: 18px; font-weight: 800; }
        .emp { display: flex; gap: 48px; margin: 18px 0 8px; font-weight: 700; }
        .sub { font-size: 11px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
        .cols { display: flex; gap: 32px; margin-top: 12px; }
        .cols > div { flex: 1; }
        h3 { font-size: 12px; text-transform: uppercase; color: #64748B; letter-spacing: .05em; margin: 0 0 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        td { padding: 8px 0; border-bottom: 1px solid #EEF1F6; vertical-align: top; }
        .num { text-align: right; font-weight: 800; white-space: nowrap; }
        .pos { color: #16A34A; } .neg { color: #DC2626; }
        td .sub { text-transform: none; letter-spacing: 0; }
        .net { display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px solid #CBD5E1; }
        .net span { font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; }
        .net strong { font-size: 22px; }
        @media print { body { padding: 0; } }
      </style></head><body>${inner}
      <script>window.onload = function(){ window.print(); }</script></body></html>`);
    win.document.close();
  };

  // Payslips can only be downloaded once HR has marked them Paid.
  const downloadPayslip = (rec) => {
    if (!rec || !rec.payrollID) { toast('No payslip to download.', 'error'); return; }
    if (rec.status !== 'Paid') { toast('This payslip can be downloaded once HR marks it as Paid.', 'info'); return; }
    openPrintWindow(`Payslip — ${rec.payPeriod || ''}`, payslipBody(rec));
  };

  const downloadAllPayslips = () => {
    const paid = records.filter((r) => r.status === 'Paid');
    if (!paid.length) { toast('No paid payslips available to download yet.', 'info'); return; }
    openPrintWindow('Payslips', paid.map(payslipBody).join('<div style="page-break-after:always"></div>'));
  };

  if (loading) return (
    <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
      <Spinner size="lg" color="var(--red-600)" />
    </div>
  );

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Payroll & Earnings</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>View your monthly compensation and download payslips</p>
          </div>
          <button className="btn-red-primary" onClick={downloadAllPayslips}>
            <Download size={18} />
            Download All Payslips
          </button>
        </div>

        {/* Main Earnings Card */}
        <div className="glass-card-employee" style={{ 
          padding: '40px', background: '#fff', borderRadius: 32, marginBottom: 32,
          display: 'grid', gridTemplateColumns: '1fr 1px 1.5fr', gap: 48, alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Monthly Net Pay</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#1E293B', letterSpacing: '-0.02em' }}>
              {formatMoney(latestRecord.netPay, language, currency)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: '#10B981', fontWeight: 800, fontSize: 14 }}>
              <TrendingUp size={16} />
              +2.5% from last month
            </div>
          </div>

          <div style={{ height: '100%', background: '#F1F5F9' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Base Salary</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1E293B' }}>{formatMoney(latestRecord.baseSalary, language, currency)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Total Allowances</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#10B981' }}>{formatMoney(latestRecord.allowances, language, currency)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Deductions</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#DC2626' }}>{formatMoney(latestRecord.deductions, language, currency)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Detailed Breakdown */}
          <div className="glass-card-employee" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <FileText size={20} color="#DC2626" />
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Salary Components</h3>
            </div>

            {(() => {
              const { earnings, deductions } = buildBreakdown(latestRecord);
              const componentRow = (comp, type) => (
                <div key={comp.key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 16, borderBottom: '1px solid #F1F5F9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    {type === 'plus' ? <ArrowUpRight size={18} color="#10B981" /> : <ArrowDownRight size={18} color="#DC2626" />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#1E293B' }}>{comp.label}</div>
                      {comp.sub && <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>{comp.sub}</div>}
                    </div>
                  </div>
                  <span style={{ fontWeight: 900, whiteSpace: 'nowrap', color: type === 'plus' ? '#1E293B' : '#DC2626' }}>
                    {type === 'minus' ? '-' : ''}{formatMoney(comp.value, language, currency)}
                  </span>
                </div>
              );
              return (
                <div style={{ display: 'grid', gap: 20 }}>
                  {earnings.map((c) => componentRow(c, 'plus'))}
                  {deductions.map((c) => componentRow(c, 'minus'))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Pay</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#1E293B' }}>{formatMoney(latestRecord.netPay, language, currency)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Payroll History Sidebar */}
          <div className="glass-card-employee" style={{ padding: 0 }}>
             <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
                <History size={20} color="#DC2626" />
                <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>Recent Payslips</h3>
             </div>
             <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {otherRecords.map((rec, i) => (
                      <div key={i} style={{ 
                        padding: '16px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                         <div>
                            <div style={{ fontWeight: 800, color: '#1E293B' }}>{rec.payPeriod}</div>
                            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{rec.paymentDate || '—'}</div>
                         </div>
                         {rec.status === 'Paid' ? (
                           <button
                             onClick={() => downloadPayslip(rec)}
                             title="Download payslip"
                             style={{
                               width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0',
                               display: 'grid', placeItems: 'center', color: '#DC2626', cursor: 'pointer'
                             }}>
                              <Download size={16} />
                           </button>
                         ) : (
                           <span title="Available once HR marks this payslip as Paid" style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                             {rec.status}
                           </span>
                         )}
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Full History Table */}
        <div className="glass-card-employee" style={{ padding: 0, marginTop: 32 }}>
           <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Complete Payroll History</h3>
           </div>
           <div style={{ padding: '16px 32px 32px' }}>
              <table className="employee-table">
                 <thead>
                    <tr>
                       <th>Period</th>
                       <th>Payment Date</th>
                       <th>Gross Pay</th>
                       <th>Deductions</th>
                       <th>Net Pay</th>
                       <th>Status</th>
                       <th></th>
                    </tr>
                 </thead>
                 <tbody>
                    {records.map((rec, i) => (
                       <tr key={i}>
                          <td style={{ fontWeight: 800 }}>{rec.payPeriod}</td>
                          <td style={{ color: '#64748B' }}>{rec.paymentDate || '—'}</td>
                          <td style={{ fontWeight: 700 }}>{formatMoney(Number(rec.baseSalary) + Number(rec.allowances), language, currency)}</td>
                          <td style={{ color: '#DC2626', fontWeight: 700 }}>-{formatMoney(rec.deductions, language, currency)}</td>
                          <td style={{ fontWeight: 900, color: '#1E293B' }}>{formatMoney(rec.netPay, language, currency)}</td>
                          <td><Badge label={rec.status} color={rec.status === 'Paid' ? 'red' : 'orange'} /></td>
                          <td style={{ textAlign: 'right' }}>
                             {rec.status === 'Paid' ? (
                               <button onClick={() => downloadPayslip(rec)} title="Download payslip" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626' }}>
                                  <Download size={18} />
                               </button>
                             ) : (
                               <span title="Available once HR marks this payslip as Paid" style={{ color: '#CBD5E1', fontWeight: 700 }}>—</span>
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
}
