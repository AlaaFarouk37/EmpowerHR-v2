import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetPayroll, hrMarkPayrollPaid, hrCreatePayroll, hrRunPayrollCycle, hrEditPayroll, hrGetPayrollSignals } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input, Modal, Textarea, EmployeeSelect } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  Check,
  MoreVertical,
  ArrowUpRight,
  Zap,
  FileText,
  Briefcase,
  Layers,
  Sparkles,
  ChevronDown,
  ShieldAlert,
  Target,
  Activity,
  Edit3,
  ClipboardCheck
} from 'lucide-react';

const defaultPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function HRPayrollPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDept, setActiveDept] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Approved' | 'Unapproved'
  const [savingId, setSavingId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ employeeID: '', payPeriod: defaultPeriod(), baseSalary: '', notes: '' });
  const [cycleOpen, setCycleOpen] = useState(false);
  const [cycleRunning, setCycleRunning] = useState(false);
  const [cyclePeriod, setCyclePeriod] = useState(defaultPeriod());
  const [viewPeriod, setViewPeriod] = useState('');
  const [signals, setSignals] = useState({ pendingOvertimeCount: 0, pendingExpenseCount: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const loadSignals = async (period = viewPeriod) => {
    try {
      const data = await hrGetPayrollSignals(period || undefined);
      setSignals({
        pendingOvertimeCount: data?.pendingOvertimeCount ?? 0,
        pendingExpenseCount: data?.pendingExpenseCount ?? 0,
      });
    } catch (error) {
      setSignals({ pendingOvertimeCount: 0, pendingExpenseCount: 0 });
    }
  };

  useEffect(() => { loadSignals(viewPeriod); }, [viewPeriod]);

  const loadPayroll = async (period = viewPeriod) => {
    setLoading(true);
    try {
      const data = await hrGetPayroll(period ? { pay_period: period } : {});
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load payroll data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayroll(viewPeriod); }, [viewPeriod]);

  const handleMarkPaid = async (record) => {
    if (!record?.payrollID || savingId === record.payrollID) return;
    setSavingId(record.payrollID);
    try {
      await hrMarkPayrollPaid(record.payrollID);
      toast(`${record.employeeName}: payroll marked paid`, 'success');
      await loadPayroll();
    } catch (err) {
      toast(err?.message || 'Failed to mark payroll as paid', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleAuthorizeDisbursement = async () => {
    const unpaid = records.filter((r) => r.status !== 'Paid' && r.payrollID);
    if (!unpaid.length) {
      toast(t('No unpaid records to authorize.'), 'info');
      return;
    }
    if (!window.confirm(`Mark ${unpaid.length} unpaid record(s) as Paid?`)) return;
    setBulkSaving(true);
    try {
      const results = await Promise.allSettled(unpaid.map((r) => hrMarkPayrollPaid(r.payrollID)));
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - ok;
      toast(fail ? `Authorized ${ok} of ${results.length} (${fail} failed)` : `Authorized ${ok} records`, fail ? 'error' : 'success');
      await loadPayroll();
    } finally {
      setBulkSaving(false);
    }
  };

  const openGenerate = () => {
    setGenForm({ employeeID: '', payPeriod: defaultPeriod(), baseSalary: '', notes: '' });
    setGenOpen(true);
  };

  const handleGenerate = async () => {
    if (!genForm.employeeID) { toast(t('Please select an employee'), 'error'); return; }
    if (!/^\d{4}-\d{2}$/.test(genForm.payPeriod)) { toast(t('Pay period must be in YYYY-MM format'), 'error'); return; }

    const payload = {
      employeeID: genForm.employeeID,
      payPeriod: genForm.payPeriod,
      notes: genForm.notes?.trim() || '',
    };
    // baseSalary is optional — the backend falls back to the employee's profile salary.
    if (String(genForm.baseSalary).trim() !== '') {
      const base = Number(genForm.baseSalary);
      if (!Number.isFinite(base) || base < 0) { toast(t('Enter a valid base salary'), 'error'); return; }
      payload.baseSalary = base;
    }

    setGenerating(true);
    try {
      await hrCreatePayroll(payload);
      toast(t('Payroll generated. Commissions, deductions, unpaid leave and approved expenses were applied.'), 'success');
      setGenOpen(false);
      await loadPayroll();
    } catch (err) {
      toast(err?.message || t('Failed to generate payroll'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const openEdit = (record) => {
    setEditForm({
      payrollID: record.payrollID,
      employeeName: record.employeeName,
      proratedBaseSalary: record.proratedBaseSalary ?? record.baseSalary ?? 0,
      commissions: record.commissions ?? 0,
      unpaidLeaveDeduction: record.unpaidLeaveDeduction ?? 0,
      deductions: record.deductions ?? 0,
      expenseReimbursements: record.expenseReimbursements ?? 0,
      overtimePay: record.overtimePay ?? 0,
      notes: record.notes ?? '',
      editReason: '',
    });
    setEditOpen(true);
  };

  const editNetPreview = useMemo(() => {
    if (!editForm) return 0;
    const n = (v) => Number(v || 0);
    return n(editForm.proratedBaseSalary) - n(editForm.unpaidLeaveDeduction) + n(editForm.commissions)
      - n(editForm.deductions) + n(editForm.expenseReimbursements) + n(editForm.overtimePay);
  }, [editForm]);

  const handleSaveEdit = async () => {
    if (!editForm) return;
    if (!editForm.editReason.trim()) { toast(t('Please add a note explaining the edit'), 'error'); return; }
    const payload = {
      editReason: editForm.editReason.trim(),
      proratedBaseSalary: Number(editForm.proratedBaseSalary || 0),
      commissions: Number(editForm.commissions || 0),
      unpaidLeaveDeduction: Number(editForm.unpaidLeaveDeduction || 0),
      deductions: Number(editForm.deductions || 0),
      expenseReimbursements: Number(editForm.expenseReimbursements || 0),
      overtimePay: Number(editForm.overtimePay || 0),
      notes: editForm.notes || '',
    };
    setEditing(true);
    try {
      await hrEditPayroll(editForm.payrollID, payload);
      toast(t('Payroll record updated'), 'success');
      setEditOpen(false);
      await loadPayroll();
    } catch (err) {
      toast(err?.message || t('Failed to update payroll record'), 'error');
    } finally {
      setEditing(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.employeeID?.toString().includes(searchQuery);
      const matchesDept = activeDept === 'All Departments' || r.department === activeDept;
      const isApproved = r.status === 'Paid';
      const matchesStatus = statusFilter === 'All'
        || (statusFilter === 'Approved' && isApproved)
        || (statusFilter === 'Unapproved' && !isApproved);
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [records, searchQuery, activeDept, statusFilter]);

  const cycleFilter = () => {
    setStatusFilter((prev) => (prev === 'All' ? 'Approved' : prev === 'Approved' ? 'Unapproved' : 'All'));
  };

  const handleRunCycle = async () => {
    if (!/^\d{4}-\d{2}$/.test(cyclePeriod)) { toast(t('Pay period must be in YYYY-MM format'), 'error'); return; }
    setCycleRunning(true);
    try {
      const res = await hrRunPayrollCycle({ payPeriod: cyclePeriod });
      const created = res?.created ?? 0;
      const skipped = res?.skippedCount ?? 0;
      const failed = res?.failedCount ?? 0;
      toast(
        t(`Payroll cycle for ${cyclePeriod}: ${created} created, ${skipped} skipped, ${failed} failed.`),
        failed ? 'error' : 'success',
      );
      setCycleOpen(false);
      if (viewPeriod === cyclePeriod) {
        await loadPayroll(cyclePeriod);
      } else {
        setViewPeriod(cyclePeriod);
      }
    } catch (err) {
      toast(err?.message || t('Failed to run payroll cycle'), 'error');
    } finally {
      setCycleRunning(false);
    }
  };

  const handleReport = () => {
    const rows = filteredRecords;
    if (!rows.length) { toast(t('Nothing to report for the current filters.'), 'info'); return; }

    const win = window.open('', '_blank');
    if (!win) { toast(t('Please allow pop-ups to generate the report.'), 'error'); return; }

    const generatedAt = new Date().toLocaleString();
    const money = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(Number(v || 0));
    const totalNet = rows.reduce((acc, r) => acc + Number(r.netPay || 0), 0);
    const scopeLabel = statusFilter === 'All' ? 'All payslips' : `${statusFilter} payslips`;
    const deptLabel = activeDept === 'All Departments' ? 'All departments' : activeDept;

    const bodyRows = rows.map((r) => `
      <tr>
        <td>${r.employeeName || ''}<div class="sub">${r.employeeID || ''}</div></td>
        <td>${r.department || '—'}</td>
        <td>${r.payPeriod || '—'}</td>
        <td class="num">${money(r.proratedBaseSalary || r.baseSalary)}</td>
        <td class="num pos">${money(r.commissions)}</td>
        <td class="num neg">${money(r.unpaidLeaveDeduction)}</td>
        <td class="num neg">${money(r.deductions)}</td>
        <td class="num pos">${money(r.expenseReimbursements)}</td>
        <td class="num pos">${money(r.overtimePay)}</td>
        <td class="num bold">${money(r.netPay)}</td>
        <td>${r.status === 'Paid' ? 'Approved' : 'Unapproved'}</td>
      </tr>`).join('');

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <title>Payroll Report — ${generatedAt}</title>
      <style>
        * { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
        body { padding: 32px; color: #1E293B; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { color: #64748B; font-size: 12px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
        th { background: #F8FAFC; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; color: #64748B; }
        .num { text-align: right; }
        .bold { font-weight: 800; }
        .pos { color: #16A34A; }
        .neg { color: #DC2626; }
        .sub { font-size: 10px; color: #94A3B8; }
        tfoot td { font-weight: 800; border-top: 2px solid #CBD5E1; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Payroll Report</h1>
      <div class="meta">Generated: ${generatedAt}</div>
      <div class="meta">Scope: ${scopeLabel} · ${deptLabel} · ${rows.length} record(s)</div>
      <table>
        <thead><tr>
          <th>Employee</th><th>Department</th><th>Pay Period</th>
          <th class="num">Base</th><th class="num">Commissions</th><th class="num">Unpaid Leave</th>
          <th class="num">Deductions</th><th class="num">Reimbursements</th><th class="num">Overtime</th><th class="num">Net Pay</th><th>Status</th>
        </tr></thead>
        <tbody>${bodyRows}</tbody>
        <tfoot><tr><td colspan="9">Total Net Pay</td><td class="num">${money(totalNet)}</td><td></td></tr></tfoot>
      </table>
      <script>window.onload = function(){ window.print(); }</script>
      </body></html>`);
    win.document.close();
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(Number(val || 0));
  };

  const departments = useMemo(() => {
    const deps = new Set(records.map(r => r.department).filter(Boolean));
    return ['All Departments', ...Array.from(deps)];
  }, [records]);

  const financialStats = useMemo(() => {
    const total = records.reduce((acc, r) => acc + Number(r.netPay || 0), 0);
    return [
      { label: 'Cycle Total', value: formatMoney(total), icon: DollarSign, color: '#1E293B', bg: '#F8FAFC' },
    ];
  }, [records]);

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>CALIBRATING PAYROLL CYCLE...</div>
       </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Strategic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}>
                 <DollarSign size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Financial Command Center</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Execute global payroll cycles, audit financial telemetry, and monitor distribution velocity.</p>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
           <Btn onClick={openGenerate} variant="secondary" style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 800 }}>
              <DollarSign size={18} style={{ marginRight: 8 }} /> {t('Add Payroll Record')}
           </Btn>
           <Btn onClick={() => { setCyclePeriod(defaultPeriod()); setCycleOpen(true); }} variant="secondary" style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 800 }}>
              <Activity size={18} style={{ marginRight: 8 }} /> {t('Start Payroll Cycle')}
           </Btn>
           <Btn
             onClick={handleAuthorizeDisbursement}
             loading={bulkSaving}
             variant="primary"
             style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
           >
              <Zap size={18} style={{ marginRight: 8 }} /> {t('Approve All Records')}
           </Btn>
        </div>
      </div>

      {(signals.pendingOvertimeCount > 0 || signals.pendingExpenseCount > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          {signals.pendingOvertimeCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 14, background: '#FFFBEB', border: '1.5px solid #FDE68A', color: '#92400E', fontWeight: 700, fontSize: 13 }}>
              <Clock size={18} />
              {t(`${signals.pendingOvertimeCount} overtime ${signals.pendingOvertimeCount === 1 ? 'request is' : 'requests are'} awaiting Team Leader approval${viewPeriod ? ` for ${viewPeriod}` : ''}.`)}
            </div>
          )}
          {signals.pendingExpenseCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 14, background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E40AF', fontWeight: 700, fontSize: 13, cursor: 'pointer' }} onClick={() => navigate('/hr/expenses')}>
              <ClipboardCheck size={18} />
              {t(`${signals.pendingExpenseCount} expense ${signals.pendingExpenseCount === 1 ? 'claim is' : 'claims are'} waiting for your approval${viewPeriod ? ` for ${viewPeriod}` : ''}.`)}
            </div>
          )}
        </div>
      )}

      {/* Financial Telemetry Strip */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 48 }}>
        {financialStats.map(s => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20, minWidth: 320 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(s.label)}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 24, border: '1.5px solid #F1F5F9', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="month"
                value={viewPeriod}
                onChange={(e) => setViewPeriod(e.target.value)}
                title={t('Filter payroll by month')}
                style={{ height: 44, padding: '0 14px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none' }}
              />
              {viewPeriod && (
                <Btn onClick={() => setViewPeriod('')} variant="ghost" style={{ height: 44, borderRadius: 12, fontWeight: 800 }}>
                  {t('All months')}
                </Btn>
              )}
           </div>

           <div style={{ position: 'relative' }}>
              <select
                value={activeDept}
                onChange={(e) => setActiveDept(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 {departments.map(d => <option key={d} value={d}>{t(d)}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>

           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search organizational nodes...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: 44, padding: '0 16px 0 48px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 600, width: 320, outline: 'none' }} 
              />
           </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
           <Btn onClick={cycleFilter} variant="secondary" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Filter size={16} style={{ marginRight: 8 }} /> {t('Filter')}: {t(statusFilter)}
           </Btn>
           <Btn onClick={handleReport} variant="outline" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <FileText size={16} style={{ marginRight: 8 }} /> {t('Report')}
           </Btn>
        </div>
      </div>

      {/* Neural Payroll Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Workforce Node', 'Department', 'Financial Metrics', 'Net Distribution', 'Cycle Progress', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((item, idx) => {
              const isPaid = item.status === 'Paid';
              const progress = isPaid ? 100 : 40;
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="payroll-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isPaid ? 'var(--red-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)',
                        fontSize: 16, fontWeight: 900
                      }}>
                         {item.employeeName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{item.employeeName}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>NODE-00{item.employeeID}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                        <Briefcase size={14} style={{ color: 'var(--red-600)' }} />
                        {item.department}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'grid', gap: 3 }}>
                        {(() => {
                          const num = (v) => Number(v || 0);
                          const prorated = num(item.proratedBaseSalary);
                          const base = num(item.baseSalary);
                          const isProrated = prorated > 0 && Math.abs(prorated - base) > 0.005;
                          const add = { fontSize: 11, fontWeight: 800, color: '#16A34A' };
                          const sub = { fontSize: 11, fontWeight: 800, color: 'var(--red-600)' };
                          const muted = { fontSize: 9, opacity: 0.6 };
                          return (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>
                                {formatMoney(isProrated ? prorated : base)} <span style={{ fontSize: 10, color: '#94A3B8' }}>{isProrated ? `(Prorated · ${item.weekdaysEmployed}/${item.workingDays}d)` : '(Base)'}</span>
                              </div>
                              {num(item.commissions) > 0 && (
                                <div style={add}>+{formatMoney(item.commissions)} <span style={muted}>(Commissions)</span></div>
                              )}
                              {num(item.unpaidLeaveDeduction) > 0 && (
                                <div style={sub}>-{formatMoney(item.unpaidLeaveDeduction)} <span style={muted}>(Unpaid leave · {item.unpaidLeaveDays}d)</span></div>
                              )}
                              {num(item.deductions) > 0 && (
                                <div style={sub}>-{formatMoney(item.deductions)} <span style={muted}>(Deductions)</span></div>
                              )}
                              {num(item.expenseReimbursements) > 0 && (
                                <div style={add}>+{formatMoney(item.expenseReimbursements)} <span style={muted}>(Approved Expenses)</span></div>
                              )}
                              {num(item.overtimePay) > 0 && (
                                <div style={add}>+{formatMoney(item.overtimePay)} <span style={muted}>(Overtime · {item.overtimeHours}h)</span></div>
                              )}
                            </>
                          );
                        })()}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{formatMoney(item.netPay)}</div>
                     <div style={{ fontSize: 9, color: 'var(--red-800)', fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>Authorized</div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden', minWidth: 100 }}>
                           <div style={{ width: `${progress}%`, height: '100%', background: isPaid ? 'var(--red-600)' : 'var(--red-400)', borderRadius: 10 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#1E293B' }}>{progress}%</span>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       {!isPaid ? (
                         <Btn
                           variant="primary"
                           onClick={() => handleMarkPaid(item)}
                           loading={savingId === item.payrollID}
                           style={{ height: 36, background: 'var(--red-600)', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 900 }}
                         >
                           Approve
                         </Btn>
                       ) : (
                         <Badge label="Distributed" color="green" />
                       )}
                       <button className="action-btn" title={t('Edit payroll record')} onClick={() => openEdit(item)}><Edit3 size={16} /></button>
                       {item.editedBy ? (
                         <button className="action-btn" title={`${t('Edited by')} ${item.editedBy}${item.editReason ? ` — ${item.editReason}` : ''}`}><Clock size={16} /></button>
                       ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={genOpen} onClose={() => setGenOpen(false)} title={t('Add Payroll Record')}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 16 }}>
          {t('Net pay is computed automatically: base salary (prorated for mid-month joiners/leavers) − unpaid leave − deductions + commissions + approved expense reimbursements for the selected period.')}
        </p>
        <EmployeeSelect
          label={t('Employee')}
          value={genForm.employeeID}
          onChange={(val) => setGenForm((f) => ({ ...f, employeeID: val }))}
        />
        <Input
          label={t('Pay Period (YYYY-MM)')}
          type="month"
          value={genForm.payPeriod}
          onChange={(e) => setGenForm((f) => ({ ...f, payPeriod: e.target.value }))}
        />
        <Input
          label={t('Base Salary (optional — defaults to employee profile)')}
          type="number"
          min="0"
          step="0.01"
          placeholder={t('Use profile salary')}
          value={genForm.baseSalary}
          onChange={(e) => setGenForm((f) => ({ ...f, baseSalary: e.target.value }))}
        />
        <Textarea
          label={t('Notes (optional)')}
          value={genForm.notes}
          onChange={(e) => setGenForm((f) => ({ ...f, notes: e.target.value }))}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => setGenOpen(false)}>{t('Cancel')}</Btn>
          <Btn variant="primary" loading={generating} onClick={handleGenerate} style={{ background: 'var(--red-600)', border: 'none' }}>
            {t('Generate')}
          </Btn>
        </div>
      </Modal>

      <Modal open={cycleOpen} onClose={() => setCycleOpen(false)} title={t('Start Payroll Cycle')}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 16 }}>
          {t('This generates a payslip for every active employee (all roles except candidates) who does not already have one for the selected period. Employees already processed for this period are skipped.')}
        </p>
        <Input
          label={t('Pay Period (YYYY-MM)')}
          type="month"
          value={cyclePeriod}
          onChange={(e) => setCyclePeriod(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => setCycleOpen(false)}>{t('Cancel')}</Btn>
          <Btn variant="primary" loading={cycleRunning} onClick={handleRunCycle} style={{ background: 'var(--red-600)', border: 'none' }}>
            {t('Run Cycle')}
          </Btn>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={editForm ? `${t('Edit Payroll')} — ${editForm.employeeName || ''}` : t('Edit Payroll')} maxWidth={620}>
        {editForm && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input label={t('Base (Prorated)')} type="number" step="0.01" value={editForm.proratedBaseSalary} onChange={(e) => setEditForm((f) => ({ ...f, proratedBaseSalary: e.target.value }))} />
              <Input label={t('Commissions')} type="number" step="0.01" value={editForm.commissions} onChange={(e) => setEditForm((f) => ({ ...f, commissions: e.target.value }))} />
              <Input label={t('Unpaid Leave Deduction')} type="number" step="0.01" value={editForm.unpaidLeaveDeduction} onChange={(e) => setEditForm((f) => ({ ...f, unpaidLeaveDeduction: e.target.value }))} />
              <Input label={t('Deductions')} type="number" step="0.01" value={editForm.deductions} onChange={(e) => setEditForm((f) => ({ ...f, deductions: e.target.value }))} />
              <Input label={t('Approved Expenses')} type="number" step="0.01" value={editForm.expenseReimbursements} onChange={(e) => setEditForm((f) => ({ ...f, expenseReimbursements: e.target.value }))} />
              <Input label={t('Overtime Pay')} type="number" step="0.01" value={editForm.overtimePay} onChange={(e) => setEditForm((f) => ({ ...f, overtimePay: e.target.value }))} />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: '#F8FAFC', border: '1.5px solid #F1F5F9', margin: '4px 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>{t('New Net Pay')}</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>{formatMoney(editNetPreview)}</span>
            </div>
            <Textarea label={t('Notes')} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            <Textarea label={t('Edit Reason (required)')} placeholder={t('Why are you making this change?')} value={editForm.editReason} onChange={(e) => setEditForm((f) => ({ ...f, editReason: e.target.value }))} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setEditOpen(false)}>{t('Cancel')}</Btn>
              <Btn variant="primary" loading={editing} onClick={handleSaveEdit} style={{ background: 'var(--red-600)', border: 'none' }}>{t('Save Changes')}</Btn>
            </div>
          </>
        )}
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .payroll-row:hover { background: #FBFBFF; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
