import { useEffect, useMemo, useState } from 'react';
import { getMyBenefits, updateMyBenefitStatus } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Heart, 
  ShieldCheck, 
  Eye, 
  Activity, 
  Zap, 
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';

export function EmployeeBenefitsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadBenefits = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyBenefits(user.employee_id);
      setBenefits(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load benefits', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBenefits(); }, [user?.employee_id]);

  const activeBenefits = benefits.filter(b => b.status === 'Enrolled');
  const pendingBenefits = benefits.filter(b => b.status === 'Pending');

  const handleEnroll = async (enrollmentID) => {
    if (!enrollmentID || savingId) return;
    setSavingId(enrollmentID);
    try {
      await updateMyBenefitStatus(enrollmentID, { status: 'Enrolled' });
      toast('Enrolled', 'success');
      await loadBenefits();
    } catch (err) {
      toast(err.message || 'Failed to update benefit status', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}><Spinner size="lg" color="#DC2626" /></div>;

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Benefits & Wellness</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Manage your health, dental, and corporate benefit plans</p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="glass-card-employee" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <ShieldCheck size={20} color="#DC2626" />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{activeBenefits.length} Active Plans</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Benefits Grid */}
          <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Current Coverage</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 }}>
              {activeBenefits.length > 0 ? (
                activeBenefits.map(item => (
                  <div key={item.enrollmentID} className="glass-card-employee" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF2F2', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
                          {item.benefitType?.includes('Health') ? <Heart size={28} /> : 
                           item.benefitType?.includes('Dental') ? <Activity size={28} /> : 
                           item.benefitType?.includes('Vision') ? <Eye size={28} /> : <Zap size={28} />}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>{item.benefitName}</h3>
                          <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>{item.provider || 'Corporate Provider'}</div>
                        </div>
                      </div>
                      <Badge label="Active" color="green" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                      <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>MONTHLY COST</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>${item.employeeContribution || 0}</div>
                      </div>
                      <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>COVERAGE</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>{item.coverageLevel || 'Standard'}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Info size={16} />
                          Effective until: Dec 2026
                       </div>
                       <button style={{ border: 'none', background: 'none', color: '#DC2626', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                          View Details <ChevronRight size={16} />
                       </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card-employee" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center' }}>
                  <ShieldCheck size={48} color="#94A3B8" style={{ marginBottom: 20 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>No Active Plans</h3>
                  <p style={{ color: '#64748B', fontWeight: 600 }}>Enroll in a benefit plan during the next open enrollment period.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Pending Actions</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                {pendingBenefits.length > 0 ? (
                  pendingBenefits.map(item => (
                    <div key={item.enrollmentID} style={{ 
                      padding: '16px', background: '#FEF2F2', borderRadius: 16, border: '1px solid #FEE2E2',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{item.benefitName}</div>
                        <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, marginTop: 2 }}>Requires Enrollment</div>
                      </div>
                      <button
                        className="btn-red-primary"
                        onClick={() => handleEnroll(item.enrollmentID)}
                        disabled={savingId === item.enrollmentID}
                        style={{ padding: '8px 12px', fontSize: 12 }}
                      >
                        {savingId === item.enrollmentID ? 'Enrolling…' : 'Enroll'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <CheckCircle2 size={32} color="#10B981" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, margin: 0 }}>Everything is set!</p>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Wellness Programs</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  { title: 'Mental Health Support', icon: <Activity size={18} /> },
                  { title: 'Gym Membership', icon: <Zap size={18} /> },
                ].map((prog, i) => (
                  <div key={i} style={{ 
                    padding: '16px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ color: '#DC2626' }}>{prog.icon}</div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{prog.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px', background: '#1E293B', color: '#fff' }}>
              <Clock size={32} style={{ marginBottom: 20 }} />
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Open Enrollment</h3>
              <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6, marginBottom: 24 }}>Annual open enrollment starts in October. Prepare your selections early!</p>
              <button style={{ 
                width: '100%', padding: '14px', borderRadius: 12, background: '#DC2626', border: 'none',
                color: '#fff', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                Schedule Review <ArrowRight size={18} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

