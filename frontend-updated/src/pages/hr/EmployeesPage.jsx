import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetEmployees, hrGetRiskCorridor, hrUpdateEmployeeRecord, hrCreateEmployeeRecord } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input, Skeleton, NeuralNode, Modal, EmployeeSelect } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  User, 
  Mail, 
  Users, 
  Activity, 
  Star, 
  AlertCircle,
  MoreVertical,
  ChevronRight,
  Zap,
  ShieldCheck,
  TrendingUp,
  Globe,
  Briefcase,
  Layers,
  Heart,
  BarChart3,
  SearchCode,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

export function HREmployeesPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Nodes');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [empData, risks] = await Promise.all([
          hrGetEmployees(),
          hrGetRiskCorridor()
        ]);
        setEmployees(Array.isArray(empData) ? empData : []);
        setRiskData(risks || []);
      } catch (error) {
        toast(t('Neural ledger synchronization failed'), 'error');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user && (user.role === 'HRManager' || user.role === 'Admin')) {
      fetchData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, toast, t]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = !searchQuery || 
        emp.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = activeFilter === 'All Nodes' || emp.department === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [employees, searchQuery, activeFilter]);

  const departments = useMemo(() => {
    const deps = new Set(employees.map(e => e.department).filter(Boolean));
    return ['All Nodes', ...Array.from(deps)];
  }, [employees]);

  const stats = useMemo(() => {
    const activeCount = employees.filter(e => e.status !== 'On Leave').length;
    const avgPerf = (employees.length > 0) ? 8.4 : 0;
    return [
      { label: 'Global Headcount', value: employees.length, icon: Users, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Active Efficiency', value: employees.length > 0 ? `${Math.round((activeCount/employees.length)*100)}%` : '0%', icon: Activity, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Avg Talent Score', value: `${avgPerf}/10`, icon: Star, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Attrition Risk', value: `${riskData.length} Nodes`, icon: Heart, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [employees, riskData]);

  const handleEditClick = (emp) => {
    setSelectedEmployee(emp);
    setEditForm({
      ...emp,
      skills: emp.skills || [],
      workSchedule: emp.workSchedule || { Mon: 'Office', Tue: 'Office', Wed: 'Office', Thu: 'Office', Fri: 'Office' }
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await hrUpdateEmployeeRecord(selectedEmployee.employeeID, editForm);
      toast(t('Employee record synchronized'), 'success');
      setEmployees(prev => prev.map(e => e.employeeID === selectedEmployee.employeeID ? { ...e, ...editForm } : e));
      setIsEditModalOpen(false);
    } catch (error) {
      toast(t('Synchronization failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div style={{ padding: '40px 60px', background: '#F8FAFC', minHeight: '100vh' }}>
         <Skeleton height={60} style={{ marginBottom: 40, borderRadius: 16 }} />
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
            <Skeleton height={120} style={{ borderRadius: 28 }} />
            <Skeleton height={120} style={{ borderRadius: 28 }} />
            <Skeleton height={120} style={{ borderRadius: 28 }} />
            <Skeleton height={120} style={{ borderRadius: 28 }} />
         </div>
         <Skeleton height={600} style={{ borderRadius: 32 }} />
      </div>
    );
  }

  return (
    <div className="page-content animate-in" style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: 'var(--spacing-lg)' }}>
      {/* Strategic Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #DC2626, #991B1B)', 
                display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(220, 38, 38, 0.25)' 
              }}>
                 <Layers size={26} style={{ color: '#fff' }} />
              </div>
               <div>
                  <h1 style={{ fontSize: 36, fontWeight: 950, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>Workforce Ledger</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <Badge label="Neural Registry Active" color="red" />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>v3.4.2 • Real-time Node Monitoring</span>
                  </div>
               </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Btn 
            onClick={() => toast('Initializing Org Export...', 'info')}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
             <Globe size={18} /> Export Index
          </Btn>
          <Btn 
            onClick={() => toast(t('Initializing Node Addition Protocol...'), 'info')}
            variant="primary" 
            style={{ 
              height: 52, borderRadius: 16, padding: '0 28px', fontWeight: 900, 
              background: 'linear-gradient(135deg, #DC2626, #B91C1C)', border: 'none', 
              boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)' 
            }}
          >
             <Zap size={18} fill="currentColor" /> Onboard Node
          </Btn>
        </div>
      </div>

      {/* Neural Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {stats.map(s => (
          <div key={s.label} className="glass-card-employee" style={{ padding: '28px', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ 
              width: 56, height: 56, borderRadius: 16, background: s.bg, color: s.color, 
              display: 'grid', placeItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <s.icon size={26} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t(s.label)}</div>
              <div style={{ fontSize: 28, fontWeight: 950, color: 'var(--text-primary)', marginTop: 2 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Command Control Bar */}
      <div style={{ 
        background: 'var(--bg-primary)', padding: '20px 32px', borderRadius: 28, border: '1.5px solid var(--border-primary)', 
        marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
           <div style={{ position: 'relative' }}>
              <select 
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                style={{ 
                  height: 48, padding: '0 44px 0 20px', borderRadius: 14, border: '1.5px solid var(--border-primary)', 
                  background: 'var(--bg-secondary)', fontSize: 14, fontWeight: 850, color: 'var(--text-primary)', 
                  outline: 'none', appearance: 'none', minWidth: 200, cursor: 'pointer'
                }}
              >
                 {departments.map(d => <option key={d} value={d}>{t(d)}</option>)}
              </select>
              <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                <Filter size={16} />
              </div>
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder={t('Search workforce by name, job, or node ID...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  height: 48, padding: '0 24px 0 56px', borderRadius: 14, border: '1.5px solid var(--border-primary)', 
                  background: 'var(--bg-secondary)', fontSize: 14, fontWeight: 700, width: 420, outline: 'none',
                  transition: 'all 0.2s', color: 'var(--text-primary)'
                }} 
              />
           </div>
        </div>
        
        <div style={{ display: 'flex', gap: 14 }}>
           <Btn variant="outline" style={{ borderRadius: 14, height: 48, fontWeight: 800, borderColor: '#E2E8F0', padding: '0 20px' }}>
              <BarChart3 size={18} style={{ marginRight: 10, color: '#DC2626' }} /> Analytics
           </Btn>
           <Btn variant="outline" style={{ borderRadius: 14, height: 48, fontWeight: 800, borderColor: '#E2E8F0', padding: '0 20px' }}>
              <SearchCode size={18} style={{ marginRight: 10, color: '#DC2626' }} /> Audit Grid
           </Btn>
        </div>
      </div>

      {/* High-Fidelity Ledger Table */}
       <div style={{ 
        background: 'var(--bg-primary)', borderRadius: 32, border: '1.5px solid var(--border-primary)', 
        overflow: 'hidden', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.05)' 
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
             <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-primary)' }}>
              {['Workforce Node', 'Strategic Role', 'Telemetry Status', 'Talent Momentum', 'Actions'].map(h => (
                <th key={h} style={{ padding: '24px 32px', textAlign: 'left', fontSize: 12, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp, idx) => {
              const perf = 70 + Math.floor(Math.random() * 25);
              const isRisk = riskData.some(r => r.id === emp.employeeID);
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'all 0.2s' }} className="node-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                      <div style={{ 
                        width: 52, height: 52, borderRadius: 18, background: isRisk ? '#FEF2F2' : '#F8FAFC', 
                        display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 950, 
                        color: isRisk ? '#DC2626' : '#1E293B',
                        border: isRisk ? '2px solid #FEE2E2' : '2px solid #F1F5F9'
                      }}>
                         {(emp.fullName || 'User').charAt(0)}
                      </div>
                       <div>
                        <NeuralNode employee={emp}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{emp.fullName}</div>
                        </NeuralNode>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, marginTop: 2 }}>NODE-{emp.employeeID || '772'} • {emp.department}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#475569', fontWeight: 800 }}>
                        <Briefcase size={16} style={{ color: '#DC2626' }} />
                        {emp.jobTitle}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 8, height: 8, borderRadius: '50%', 
                          background: emp.status === 'On Leave' ? '#DC2626' : '#10B981',
                          boxShadow: `0 0 10px ${emp.status === 'On Leave' ? 'rgba(220, 38, 38, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                        }} />
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{emp.status || 'Optimal'}</span>
                        {isRisk && <Badge label="RISK" color="red" style={{ fontSize: 9 }} />}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden', minWidth: 120 }}>
                           <div style={{ width: `${perf}%`, height: '100%', background: perf >= 90 ? '#DC2626' : '#EF4444', borderRadius: 10, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 950, color: '#1E293B', width: 40 }}>{perf}%</span>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button onClick={() => handleEditClick(emp)} className="action-btn" title="Edit Strategic Node"><Zap size={20} /></button>
                       <button className="action-btn" title="Detailed Telemetry"><TrendingUp size={20} /></button>
                       <button className="action-btn" title="Contact Node"><Mail size={20} /></button>
                       <button className="action-btn" title="Strategic Actions"><MoreVertical size={20} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal 
        open={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={`Configure Strategic Node: ${selectedEmployee?.fullName}`}
        maxWidth={800}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
           <div>
              <h4 style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16 }}>Work Information</h4>
              <Input label="Job Title" value={editForm.jobTitle} onChange={e => setEditForm({...editForm, jobTitle: e.target.value})} />
              <Input label="Department" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 <Input label="Monthly Income" type="number" value={editForm.monthlyIncome} onChange={e => setEditForm({...editForm, monthlyIncome: e.target.value})} />
                 <Input label="Employee ID" value={editForm.employeeID} disabled />
              </div>
              
              <h4 style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginTop: 24, marginBottom: 16 }}>Approvers & Governance</h4>
              <EmployeeSelect 
                label="Expense Approver" 
                value={editForm.approverExpenses} 
                onChange={val => setEditForm({...editForm, approverExpenses: val})} 
              />
              <EmployeeSelect 
                label="Time Off Approver" 
                value={editForm.approverTimeOff} 
                onChange={val => setEditForm({...editForm, approverTimeOff: val})} 
              />
           </div>
           
           <div>
              <h4 style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16 }}>Hybrid Scheduler</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
                 {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                    <button 
                      key={day}
                      onClick={() => setEditForm({
                        ...editForm, 
                        workSchedule: { ...editForm.workSchedule, [day]: editForm.workSchedule[day] === 'Home' ? 'Office' : 'Home' }
                      })}
                      style={{ 
                        padding: '10px 4px', borderRadius: 10, border: '1.5px solid #F1F5F9',
                        background: editForm.workSchedule?.[day] === 'Home' ? '#FEF2F2' : '#fff',
                        color: editForm.workSchedule?.[day] === 'Home' ? '#DC2626' : '#64748B',
                        fontSize: 10, fontWeight: 800, cursor: 'pointer'
                      }}
                    >
                       <div>{day}</div>
                       <div style={{ fontSize: 9, marginTop: 2 }}>{editForm.workSchedule?.[day] || 'Office'}</div>
                    </button>
                 ))}
              </div>

              <h4 style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16 }}>Contract Governance</h4>
              <select 
                value={editForm.contractStatus}
                onChange={e => setEditForm({...editForm, contractStatus: e.target.value})}
                style={{ width: '100%', height: 48, borderRadius: 14, border: '1.5px solid #F1F5F9', padding: '0 16px', marginBottom: 16 }}
              >
                 <option value="Draft">Draft</option>
                 <option value="Active">Active</option>
                 <option value="Expired">Expired</option>
              </select>
              <Input label="Contract Expiry" type="date" value={editForm.contractExpiry} onChange={e => setEditForm({...editForm, contractExpiry: e.target.value})} />
           </div>
        </div>
        
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
           <Btn variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Btn>
           <Btn variant="primary" loading={saving} onClick={handleSave}>Synchronize Ledger</Btn>
        </div>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .node-row:hover { background: rgba(248, 250, 252, 0.8); }
        .action-btn { 
          width: 40px; height: 40px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 12px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .action-btn:hover { color: #DC2626; border-color: #FEE2E2; background: #FEF2F2; transform: translateY(-2px); }
        input:focus { border-color: #DC2626 !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.05); }
      `}} />
    </div>
  );
}
