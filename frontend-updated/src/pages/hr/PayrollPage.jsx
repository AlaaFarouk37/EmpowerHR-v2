import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetPayroll, hrMarkPayrollPaid } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
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
  Globe,
  Briefcase,
  Layers,
  Sparkles,
  ChevronDown,
  ShieldAlert,
  Target,
  Activity
} from 'lucide-react';

export function HRPayrollPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDept, setActiveDept] = useState('All Departments');
  const [savingId, setSavingId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const data = await hrGetPayroll();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load payroll data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayroll(); }, []);

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

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.employeeID?.toString().includes(searchQuery);
      const matchesDept = activeDept === 'All Departments' || r.department === activeDept;
      return matchesSearch && matchesDept;
    });
  }, [records, searchQuery, activeDept]);

  const departments = useMemo(() => {
    const deps = new Set(records.map(r => r.department).filter(Boolean));
    return ['All Departments', ...Array.from(deps)];
  }, [records]);

  const financialStats = useMemo(() => {
    const total = records.reduce((acc, r) => acc + (r.netPay || 0), 0);
    return [
      { label: 'Cycle Total', value: `EGP ${total.toLocaleString()}`, icon: DollarSign, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Distribution Velocity', value: '78%', icon: Activity, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Compliance Index', value: '99.2%', icon: ShieldCheck, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Critical Overdue', value: '02', icon: ShieldAlert, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [records]);

  const formatMoney = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(val);
  };

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
           <Btn variant="secondary" style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 800 }}>
              <ShieldCheck size={18} style={{ marginRight: 8 }} /> {t('Audit Cycle')}
           </Btn>
           <Btn
             onClick={handleAuthorizeDisbursement}
             loading={bulkSaving}
             variant="primary"
             style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
           >
              <Zap size={18} style={{ marginRight: 8 }} /> {t('Authorize Disbursement')}
           </Btn>
        </div>
      </div>

      {/* Financial Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {financialStats.map(s => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
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
           <Btn variant="secondary" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Filter size={16} style={{ marginRight: 8 }} /> {t('Neural Filters')}
           </Btn>
           <Btn variant="outline" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Export Financials')}
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
                     <div style={{ display: 'grid', gap: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{formatMoney(item.baseSalary)} <span style={{ fontSize: 10, color: '#94A3B8' }}>(Base)</span></div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--red-600)' }}>-{formatMoney(item.deductions || 250)} <span style={{ fontSize: 9, opacity: 0.6 }}>(Deductions)</span></div>
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
                       <button className="action-btn" title="Audit History"><Clock size={16} /></button>
                       <button className="action-btn" title="Strategic Actions"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
