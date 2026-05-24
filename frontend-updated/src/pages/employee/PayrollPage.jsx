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

  const latestRecord = records[0] || {};
  const currency = latestRecord.currency || 'EGP';

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
          <button className="btn-red-primary">
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

            <div style={{ display: 'grid', gap: 20 }}>
              {[
                { label: 'Basic Salary', value: latestRecord.baseSalary, type: 'plus' },
                { label: 'Housing Allowance', value: (latestRecord.allowances || 0) * 0.6, type: 'plus' },
                { label: 'Transport Allowance', value: (latestRecord.allowances || 0) * 0.4, type: 'plus' },
                { label: 'Income Tax', value: (latestRecord.deductions || 0) * 0.7, type: 'minus' },
                { label: 'Social Security', value: (latestRecord.deductions || 0) * 0.3, type: 'minus' },
              ].map((comp, i) => (
                <div key={i} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingBottom: 16, borderBottom: '1px solid #F1F5F9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {comp.type === 'plus' ? <ArrowUpRight size={18} color="#10B981" /> : <ArrowDownRight size={18} color="#DC2626" />}
                    <span style={{ fontWeight: 800, color: '#1E293B' }}>{comp.label}</span>
                  </div>
                  <span style={{ 
                    fontWeight: 900, 
                    color: comp.type === 'plus' ? '#1E293B' : '#DC2626' 
                  }}>
                    {comp.type === 'minus' ? '-' : ''}{formatMoney(comp.value, language, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payroll History Sidebar */}
          <div className="glass-card-employee" style={{ padding: 0 }}>
             <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
                <History size={20} color="#DC2626" />
                <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>Recent Payslips</h3>
             </div>
             <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   {records.slice(1, 5).map((rec, i) => (
                      <div key={i} style={{ 
                        padding: '16px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                         <div>
                            <div style={{ fontWeight: 800, color: '#1E293B' }}>{rec.payPeriod}</div>
                            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{rec.paymentDate || '—'}</div>
                         </div>
                         <button style={{ 
                           width: 36, height: 36, borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0',
                           display: 'grid', placeItems: 'center', color: '#DC2626', cursor: 'pointer'
                         }}>
                            <Download size={16} />
                         </button>
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
                             <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626' }}>
                                <Download size={18} />
                             </button>
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
