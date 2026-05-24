import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetSuccessionPlans } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  UserPlus, 
  TrendingUp, 
  Shield, 
  Activity, 
  Target, 
  Calendar,
  ChevronRight,
  Award,
  Zap,
  ShieldAlert,
  Globe,
  Layers,
  ChevronDown,
  Sparkles,
  SearchCode,
  MoreVertical,
  Users
} from 'lucide-react';

export function HRSuccessionPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Critical Roles');

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await hrGetSuccessionPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load succession data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesSearch = p.targetRole?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.currentIncumbent?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [plans, searchQuery]);

  const continuityStats = useMemo(() => {
    return [
      { label: 'Critical Node Inventory', value: plans.length, icon: Target, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Ready-Now Bench', value: plans.filter(p => p.readiness === 'Ready Now').length, icon: Award, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Pipeline Depth', value: '48', icon: TrendingUp, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'At-Risk Roles', value: '03', icon: ShieldAlert, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [plans]);

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING CONTINUITY GRID...</div>
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
                 <Shield size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Succession & Continuity Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit critical node continuity, calibrate talent bench strength, and monitor organizational risk velocity.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing Succession Protocol...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Initialize Continuity Plan')}
        </Btn>
      </div>

      {/* Continuity Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {continuityStats.map(s => (
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
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Critical Roles">{t('Global Succession Grid')}</option>
                 <option value="Executive">{t('Executive Nodes')}</option>
                 <option value="At Risk">{t('At-Risk Nodes')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search critical roles or incumbents...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Export Continuity Grid')}
           </Btn>
        </div>
      </div>

      {/* Neural Succession Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Critical Position Node', 'Current Incumbent', 'Succession Bench Depth', 'Talent Readiness', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map((plan, idx) => {
              const isAtRisk = Math.random() > 0.8;
              const isReadyNow = plan.readiness === 'Ready Now';
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isAtRisk ? 'rgba(220, 38, 38, 0.02)' : 'transparent' }} className="succession-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isAtRisk ? 'var(--red-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)'
                      }}>
                         <Target size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{plan.targetRole}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{plan.department || 'Executive Office'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: 10, background: '#F8FAFC', 
                        display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, color: 'var(--red-600)',
                        border: '1.5px solid #F1F5F9'
                      }}>
                         {(plan.currentIncumbent || 'N').charAt(0)}
                      </div>
                      <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700 }}>{plan.currentIncumbent || 'Node Active'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ 
                          width: 32, height: 32, borderRadius: '50%', background: '#F8FAFC', 
                          border: '2px solid #fff', marginLeft: i > 1 ? -12 : 0, display: 'grid', 
                          placeItems: 'center', fontSize: 11, fontWeight: 900, color: '#1E293B',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)', position: 'relative', zIndex: 4 - i
                        }}>
                          {i === 1 ? 'JD' : i === 2 ? 'AS' : 'MK'}
                        </div>
                      ))}
                      <div style={{ fontSize: 12, color: '#94A3B8', marginLeft: 12, fontWeight: 800 }}>+2 Nodes</div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={isReadyNow ? 'READY NOW' : 'PIPELINE'} 
                      color={isReadyNow ? 'green' : 'yellow'} 
                     />
                     {isAtRisk && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red-600)', fontSize: 10, fontWeight: 900, marginTop: 8, letterSpacing: '0.05em' }}>
                          <ShieldAlert size={12} /> AT-RISK NODE
                       </div>
                     )}
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Succession Vector"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Promote Successor"><Zap size={18} /></button>
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
        .succession-row:hover { background: #FBFBFF; }
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
