import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLatestAttritionPredictions } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  Shield, 
  Users, 
  TrendingDown, 
  AlertCircle, 
  Activity,
  ArrowUpRight,
  Zap,
  Globe,
  Layers,
  ChevronDown,
  Sparkles,
  ShieldAlert,
  SearchCode,
  MoreVertical,
  Briefcase
} from 'lucide-react';

export function AttritionPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCluster, setActiveCluster] = useState('All Intelligence Clusters');

  const loadData = async () => {
    setLoading(true);
    try {
      const predData = await getLatestAttritionPredictions();
      setPredictions(Array.isArray(predData) ? predData : []);
    } catch (error) {
      toast('Failed to load attrition intelligence', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredPredictions = useMemo(() => {
    return predictions.filter(p => {
      const matchesSearch = p.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.employeeRole?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [predictions, searchQuery]);

  const riskStats = useMemo(() => {
    return [
      { label: 'Workforce Nodes', value: '1.2k', icon: Users, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Attrition Velocity', value: '12%', icon: TrendingDown, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Stability Index', value: '8.4', icon: Activity, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'High-Risk Anomalies', value: predictions.filter(p => p.attritionRisk === 'High').length, icon: ShieldAlert, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [predictions]);

  const getRiskColor = (score) => {
    if (score >= 80) return 'var(--pink-600)';
    if (score >= 50) return 'var(--red-500)';
    return '#10B981';
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING RISK INTELLIGENCE...</div>
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
                 <Activity size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Predictive Attrition Intelligence</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit predictive stability vectors, monitor risk corridors, and manage tactical retention protocols.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Generating Strategic Risk Report...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Export Intelligence')}
        </Btn>
      </div>

      {/* Intelligence Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {riskStats.map(s => (
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
                value={activeCluster}
                onChange={(e) => setActiveCluster(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Intelligence Clusters">{t('All Intelligence Clusters')}</option>
                 <option value="High Risk">{t('Critical Risk Nodes')}</option>
                 <option value="Medium Risk">{t('Elevated Risk Nodes')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search workforce nodes or roles...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Global Stability')}
           </Btn>
        </div>
      </div>

      {/* Neural Risk Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Workforce Node', 'Classification', 'Attrition Risk Vector', 'Risk Severity', 'Telemetry Factors', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPredictions.map((emp, idx) => {
              const riskPercentage = Math.round(emp.riskScore * 100);
              const isHighRisk = emp.attritionRisk === 'High';
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isHighRisk ? 'rgba(220, 38, 38, 0.02)' : 'transparent' }} className="risk-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isHighRisk ? 'var(--pink-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: isHighRisk ? 'var(--pink-600)' : 'var(--red-600)', border: `1px solid ${isHighRisk ? 'var(--pink-100)' : 'var(--red-100)'}`,
                        fontSize: 16, fontWeight: 900
                      }}>
                         {(emp.employeeName || 'U').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{emp.employeeName}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{emp.employeeRole}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                        <Briefcase size={14} style={{ color: 'var(--red-600)' }} />
                        {emp.department || 'Strategic Hub'}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px', minWidth: 200 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                           <div style={{ width: `${riskPercentage}%`, height: '100%', background: getRiskColor(riskPercentage), borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: getRiskColor(riskPercentage), width: 40 }}>{riskPercentage}%</span>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={emp.attritionRisk.toUpperCase()} 
                      color={isHighRisk ? 'red' : emp.attritionRisk === 'Medium' ? 'yellow' : 'green'} 
                     />
                     {isHighRisk && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pink-600)', fontSize: 10, fontWeight: 900, marginTop: 8, letterSpacing: '0.05em' }}>
                          <ShieldAlert size={12} /> CRITICAL ANOMALY
                       </div>
                     )}
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Badge label="Market Comp" variant="soft" color="gray" />
                        <Badge label="Flight Risk" variant="soft" color="gray" />
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Risk Vector"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Execute Retention Protocol"><Shield size={18} /></button>
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
        .risk-row:hover { background: #FBFBFF; }
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
