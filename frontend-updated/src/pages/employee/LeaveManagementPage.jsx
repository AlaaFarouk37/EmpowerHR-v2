import { useState, useMemo, useEffect } from 'react';
import { getMyLeaveRequests, submitLeaveRequest } from '../../api/index.js';
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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    leaveType: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const loadData = async () => {
    if (!employeeID) return;
    setLoading(true);
    try {
      const data = await getMyLeaveRequests(employeeID);
      setLeaves(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || 'Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [employeeID]);

  const balances = useMemo(() => {
    const annualUsed = (leaves || []).filter(l => l.leaveType === 'Annual Leave' && l.status === 'Approved').reduce((sum, l) => sum + (l.daysRequested || 0), 0);
    const sickUsed = (leaves || []).filter(l => l.leaveType === 'Sick Leave' && l.status === 'Approved').reduce((sum, l) => sum + (l.daysRequested || 0), 0);
    return [
      { label: 'Annual Leave', used: annualUsed, total: 21, color: '#DC2626', bgColor: '#FEF2F2' },
      { label: 'Sick Leave', used: sickUsed, total: 10, color: '#EA580C', bgColor: '#FFF7ED' },
      { label: 'Unpaid Leave', used: 0, total: 5, color: '#2563EB', bgColor: '#EFF6FF' },
    ];
  }, [leaves]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate || !formData.reason) return toast(t('Please fill all required fields'), 'error');
    setIsSubmitting(true);
    try {
      await submitLeaveRequest({ ...formData, employeeID });
      toast(t('Leave request submitted'), 'success');
      setIsModalOpen(false);
      setFormData({ leaveType: 'Annual Leave', startDate: '', endDate: '', reason: '' });
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
          {balances.map(b => (
            <div key={b.label} className="glass-card-employee" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#F1F5F9" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke={b.color} strokeWidth="3.5" 
                    strokeDasharray={`${((b.total - b.used) / b.total) * 100}, 100`} 
                    strokeLinecap="round" 
                  />
                </svg>
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 900, color: '#1E293B'
                }}>
                  {b.total - b.used}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{b.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', marginTop: 2 }}>{b.total - b.used} / {b.total} <span style={{ fontSize: 12, color: '#94A3B8' }}>Days</span></div>
              </div>
            </div>
          ))}
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
                {[
                  { name: 'Eid Al-Fitr', date: '31 Mar', days: 3 },
                  { name: 'Sham El-Nessim', date: '20 Apr', days: 1 },
                  { name: 'Labour Day', date: '01 May', days: 1 },
                ].map(h => (
                  <div key={h.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: 16, background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{h.name}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{h.date} 2026</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '4px 8px', borderRadius: 8 }}>
                      {h.days}d
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px', background: '#DC2626', color: '#fff' }}>
               <h3 style={{ fontSize: 16, fontWeight: 900, margin: '0 0 12px 0' }}>Policy Update</h3>
               <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, lineHeight: 1.6 }}>
                 Starting next month, all leave requests must be submitted at least 72 hours before the start date.
               </p>
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
                   <option value="Annual Leave">Annual Leave</option>
                   <option value="Sick Leave">Sick Leave</option>
                   <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
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
             <Btn type="submit" loading={isSubmitting} style={{ background: '#DC2626', height: 48, borderRadius: 14, fontWeight: 900, border: 'none', color: '#fff', width: '100%' }}>
               Submit Request
             </Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}
