import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetOnboardingPlans } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  UserPlus,
  Activity,
  Calendar,
  Edit2,
  TrendingUp,
  Maximize2,
  Rocket,
  ShieldAlert,
  Zap,
  Globe,
  Layers,
  ChevronDown,
  Sparkles,
  SearchCode,
  MoreVertical,
  Briefcase
} from 'lucide-react';

export function HROnboardingPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('All Statuses');

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await hrGetOnboardingPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load onboarding plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesSearch = p.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.employeeID?.toString().includes(searchQuery);
      return matchesSearch;
    });
  }, [plans, searchQuery]);

  const integrationStats = useMemo(() => {
    return [
      { label: 'Active Integrations', value: plans.length, icon: Rocket, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Completion Velocity', value: '86.4%', icon: Activity, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Avg Time-to-Productivity', value: '14.2d', icon: Clock, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Delayed Nodes', value: '04', icon: ShieldAlert, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [plans]);

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING INTEGRATION GRID...</div>
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
                 <Rocket size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Workforce Integration Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit new hire integration, monitor time-to-productivity, and manage lifecycle deployment plans.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing Integration Protocol...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Deploy Integration Plan')}
        </Btn>
      </div>

      {/* Integration Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {integrationStats.map(s => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(s.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 24, border: '1.5px solid #F1F5F9', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
           <div style={{ position: 'relative' }}>
              <select 
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Statuses">{t('All Integration States')}</option>
                 <option value="On Track">{t('Optimal Velocity')}</option>
                 <option value="Delayed">{t('Delayed Nodes')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search integration nodes...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Global Cohorts')}
           </Btn>
        </div>
      </div>

      {/* Neural Integration Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Integration Node', 'Target Role', 'Lifecycle Start', 'Integration Velocity', 'Health Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map((plan, idx) => {
              const isDelayed = Math.random() > 0.8;
              const progressColor = isDelayed ? 'var(--pink-500)' : 'var(--red-600)';
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isDelayed ? 'rgba(220, 38, 38, 0.02)' : 'transparent' }} className="integration-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isDelayed ? 'var(--pink-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: isDelayed ? 'var(--pink-600)' : 'var(--red-600)', border: `1px solid ${isDelayed ? 'var(--pink-100)' : 'var(--red-100)'}`,
                        fontSize: 16, fontWeight: 900
                      }}>
                         {(plan.employeeName || 'U').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{plan.employeeName}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>NODE-{plan.employeeID}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                        <Briefcase size={14} style={{ color: 'var(--red-600)' }} />
                        {plan.role || 'Strategic Hire'}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, color: '#1E293B' }}>
                       <Calendar size={14} style={{ color: 'var(--red-600)' }} />
                       {plan.startDate || '2025-03-24'}
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px', minWidth: 200 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                           <div style={{ width: `${plan.progress}%`, height: '100%', background: progressColor, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: progressColor, width: 40 }}>{plan.progress}%</span>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={isDelayed ? 'ANOMALY DETECTED' : 'OPTIMAL VELOCITY'} 
                      color={isDelayed ? 'red' : 'green'} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Integration Matrix"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Modify Deployment Roadmaps"><Edit2 size={18} /></button>
                       <button className="action-btn" title="Tactical Options"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .integration-row:hover { background: #FBFBFF; }
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
