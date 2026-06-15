import { useState, useMemo, useEffect } from 'react';
import { getMyLeaveRequests, submitLeaveRequest, getMyLeaveBalances, getPublicHolidays } from '../../api/index.js';
import { Badge, Btn, Modal, Input, Textarea, useToast, Spinner } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, 
  Send, 
  Plus,
  ArrowRight,
  Sparkles,
  Plane,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function EmployeeLeaveManagementPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const toast = useToast();
  const employeeID = user?.employee_id;

  const [leaves, setLeaves] = useState([]);
  const [balanceRows, setBalanceRows] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [documentFile, setDocumentFile] = useState(null);

  const loadData = async () => {
    if (!employeeID) return;
    setLoading(true);
    try {
      const [data, bal] = await Promise.all([
        getMyLeaveRequests(employeeID).catch(() => []),
        getMyLeaveBalances(employeeID, new Date().getFullYear()).catch(() => []),
      ]);
      setLeaves(Array.isArray(data) ? data : []);
      setBalanceRows(Array.isArray(bal) ? bal : []);
    } catch (error) {
      toast(error.message || 'Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [employeeID]);

  // Public holidays for this year + next, so there's always something upcoming.
  useEffect(() => {
    const year = new Date().getFullYear();
    Promise.all([getPublicHolidays(year), getPublicHolidays(year + 1)])
      .then(([a, b]) => setHolidays([...(a || []), ...(b || [])]))
      .catch(() => setHolidays([]));
  }, []);

  // Only holidays dated after today, soonest first.
  const upcomingHolidays = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return holidays
      .filter((h) => h.date > todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [holidays]);

  const formatHolidayDate = (s) => {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const PALETTE = ['#DC2626', '#EA580C', '#2563EB', '#7C3AED', '#0891B2'];

  // Requestable types only — Casual draws from Annual and is logged from absences,
  // so it is not something an employee files.
  const leaveTypeOptions = useMemo(
    () => balanceRows.filter(b => !b.drawsFromAnnual).map(b => b.leaveTypeName),
    [balanceRows],
  );

  // Default the dropdown to the first available type once balances load.
  useEffect(() => {
    if (!formData.leaveType && leaveTypeOptions.length) {
      setFormData(f => ({ ...f, leaveType: leaveTypeOptions[0] }));
    }
  }, [leaveTypeOptions]);

  const balances = useMemo(() => balanceRows.map((b, i) => ({
    label: b.leaveTypeName,
    used: b.usedDays || 0,
    total: b.entitledDays,             // null => uncapped (e.g. Unpaid)
    remaining: b.remainingDays,        // null => uncapped
    drawsFromAnnual: !!b.drawsFromAnnual,
    color: PALETTE[i % PALETTE.length],
  })), [balanceRows]);

  const selectedBalance = useMemo(
    () => balances.find(b => b.label === formData.leaveType),
    [balances, formData.leaveType],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.leaveType || !formData.startDate || !formData.endDate || !formData.reason) {
      return toast(t('Please fill all required fields'), 'error');
    }
    setIsSubmitting(true);
    try {
      await submitLeaveRequest({ ...formData, employeeID, document: documentFile });
      toast(t('Leave request submitted'), 'success');
      setIsModalOpen(false);
      setFormData({ leaveType: leaveTypeOptions[0] || '', startDate: '', endDate: '', reason: '' });
      setDocumentFile(null);
      loadData();
    } catch (error) { toast(error.message, 'error'); }
    finally { setIsSubmitting(false); }
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
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Leave Management</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Manage your time off requests and view your balances</p>
          </div>
          <button className="btn-red-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Request Time Off
          </button>
        </div>

        {/* Balance Progress Rings */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(balances.length, 1)}, 1fr)`, gap: 24, marginBottom: 32 }}>
          {balances.map(b => {
            const capped = b.total !== null && b.total !== undefined;
            const fromAnnual = b.drawsFromAnnual;
            // Casual shows days *used* against its 7-day cap (it has no balance of its
            // own — absences drain Annual). Other types show days *remaining*, which
            // for Annual already reflects no-show absences.
            const headline = fromAnnual ? b.used : b.remaining;
            const pct = capped && b.total > 0
              ? Math.max(0, Math.min(100, (headline / b.total) * 100))
              : 100;
            return (
              <div key={b.label} className="glass-card-employee" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#F1F5F9" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke={b.color} strokeWidth="3.5"
                      strokeDasharray={`${pct}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 900, color: '#1E293B'
                  }}>
                    {capped ? headline : '∞'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{b.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', marginTop: 2 }}>
                    {capped
                      ? (fromAnnual
                          ? <>{b.used} / {b.total} <span style={{ fontSize: 12, color: '#94A3B8' }}>used</span></>
                          : <>{b.remaining} / {b.total} <span style={{ fontSize: 12, color: '#94A3B8' }}>Days</span></>)
                      : <>{b.used} <span style={{ fontSize: 12, color: '#94A3B8' }}>used (uncapped)</span></>}
                  </div>
                  {fromAnnual && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginTop: 2 }}>Absence days — drawn from Annual (unpaid)</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Requests History */}
          <div className="glass-card-employee" style={{ padding: 0 }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Clock size={20} color="#DC2626" />
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Recent Requests</h3>
            </div>
            
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {leaves.length > 0 ? leaves.map(row => (
                  <div key={row.id} style={{ 
                    padding: '20px', background: '#F8FAFC', borderRadius: 20, border: '1px solid #F1F5F9', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '1px solid #E2E8F0', display: 'grid', placeItems: 'center', color: '#DC2626' }}>
                        <Plane size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, color: '#1E293B', fontSize: 16 }}>{row.leaveType}</div>
                        <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {row.startDate} <ArrowRight size={12} /> {row.endDate}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>{row.daysRequested}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Days</div>
                      </div>
                      <Badge 
                        label={row.status} 
                        color={row.status === 'Approved' ? 'red' : row.status === 'Pending' ? 'orange' : 'gray'} 
                      />
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '48px 0' }}>
                    <Sparkles size={48} style={{ color: '#E2E8F0', marginBottom: 16 }} />
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#64748B' }}>No leave history found</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Upcoming Holidays */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Calendar size={20} color="#DC2626" />
                <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>Upcoming Holidays</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {upcomingHolidays.length > 0 ? upcomingHolidays.map(h => (
                  <div key={h.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px', borderRadius: 16, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{formatHolidayDate(h.date)}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>
                    No upcoming holidays.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Modal open={isModalOpen} title="Request Time Off" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
             <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Leave Type</label>
                <select
                   style={{ width: '100%', padding: '0 16px', height: 48, borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontWeight: 800, color: '#1E293B', outline: 'none' }}
                   value={formData.leaveType}
                   onChange={e => setFormData({...formData, leaveType: e.target.value})}
                >
                   {leaveTypeOptions.map(name => (
                     <option key={name} value={name}>{name}</option>
                   ))}
                </select>
                {selectedBalance && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: selectedBalance.total !== null && (selectedBalance.total - selectedBalance.used) <= 0 ? '#DC2626' : '#64748B', marginTop: 6 }}>
                    {selectedBalance.total === null || selectedBalance.total === undefined
                      ? t('Uncapped leave type.')
                      : `${Math.max(0, selectedBalance.total - selectedBalance.used)} ${t('day(s) remaining this year.')}`}
                  </div>
                )}
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                   <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Start Date</label>
                   <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} style={{ height: 48, borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#F8FAFC', padding: '0 16px', fontWeight: 600 }} />
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>End Date</label>
                   <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} style={{ height: 48, borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#F8FAFC', padding: '0 16px', fontWeight: 600 }} />
                </div>
             </div>
             <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Reason</label>
                <Textarea value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Provide context for your manager..." style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '16px', minHeight: 100, fontWeight: 600 }} />
             </div>
             <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>{t('Supporting Document')} <span style={{ textTransform: 'none', color: '#CBD5E1' }}>({t('optional')})</span></label>
                <input
                   type="file"
                   accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                   onChange={e => setDocumentFile(e.target.files?.[0] || null)}
                   style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1.5px dashed #E2E8F0', background: '#F8FAFC', fontWeight: 600, color: '#475569' }}
                />
                {documentFile && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginTop: 6 }}>{documentFile.name}</div>
                )}
             </div>
             <Btn type="submit" loading={isSubmitting} style={{ background: '#DC2626', height: 48, borderRadius: 14, fontWeight: 900, border: 'none', color: '#fff', width: '100%' }}>
               Submit Request
             </Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}
