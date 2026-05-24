import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetPolicies } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  FileText, 
  Edit3, 
  Activity, 
  Target, 
  Calendar,
  ChevronRight,
  Zap,
  Briefcase,
  AlertCircle,
  TrendingUp,
  BookOpen,
  Globe,
  Layers,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  SearchCode,
  MoreVertical,
  History
} from 'lucide-react';

export function HRPoliciesPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Policies');

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await hrGetPolicies();
      setPolicies(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load policy data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPolicies(); }, []);

  const filteredPolicies = useMemo(() => {
    return policies.filter(p => {
      const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.policyID?.toString().includes(searchQuery);
      const matchesCategory = activeCategory === 'All Policies' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [policies, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    const cats = new Set(policies.map(p => p.category).filter(Boolean));
    return ['All Policies', ...Array.from(cats)];
  }, [policies]);

  const governanceStats = useMemo(() => {
    return [
      { label: 'Regulatory Assets', value: policies.length, icon: FileText, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Active Coverage', value: policies.filter(p => p.status === 'Published').length, icon: ShieldCheck, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Cycle Updates', value: '06', icon: Activity, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Compliance Index', value: '92.4%', icon: Target, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [policies]);

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING GOVERNANCE GRID...</div>
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
                 <ShieldCheck size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Policy & Regulatory Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit organizational regulatory assets, monitor compliance telemetry, and manage policy distribution.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing New Regulatory Asset...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Initialize Asset')}
        </Btn>
      </div>

      {/* Governance Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {governanceStats.map(s => (
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
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search regulatory assets...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Global Compliance')}
           </Btn>
        </div>
      </div>

      {/* Neural Regulatory Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Regulatory Asset', 'Classification', 'Cycle Velocity', 'Effective Deployment', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPolicies.map((policy, idx) => {
              const version = `v2.${Math.floor(Math.random() * 9 + 1)}`;
              const isPublished = policy.status !== 'Draft';
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="regulatory-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)'
                      }}>
                         <FileText size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{policy.title}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>ASSET-{policy.policyID}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge label={policy.category || 'Regulatory'} color="indigo" />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, color: '#1E293B' }}>
                        <History size={14} style={{ color: 'var(--red-600)' }} /> {version}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{policy.effectiveDate || '2026-01-01'}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>GLOBAL DEPLOYMENT</div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={policy.status || 'PUBLISHED'} 
                      color={policy.status === 'Draft' ? 'red' : 'green'} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Regulatory Asset"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Modify Parameters"><Edit3 size={18} /></button>
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
        .regulatory-row:hover { background: #FBFBFF; }
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
