import React, { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { api } from '../../api/index.js';
import { ReportingEngine } from '../../utils/exportEngine.js';
import { 
  Activity, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  Search, 
  Eye, 
  Zap,
  Users,
  Globe,
  Layers,
  Filter,
  ChevronDown,
  SearchCode,
  MoreVertical,
  Briefcase
} from 'lucide-react';

export function HRPlanningPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPlanningData();
  }, []);

  const fetchPlanningData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/workforce/teams/').catch(() => ({ data: [] }));
      setTeams(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (err) {
      toast('Failed to load strategic telemetry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 90) return 'var(--red-600)';
    if (score >= 70) return 'var(--pink-500)';
    return '#10B981';
  };

  const strategicStats = useMemo(() => {
    return [
      { label: 'Succession Health', value: '84%', icon: Target, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Talent Bench Depth', value: '14', icon: Users, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Retention Vector', value: '92.4%', icon: TrendingUp, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Replacement Liability', value: '$240k', icon: ShieldAlert, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [teams]);

  const handleExport = () => {
    try {
      const dataToExport = [
        { name: 'Engineering', score: 94, risks: 2, positions: 3, successor: 'Alex Chen' },
        { name: 'Product', score: 78, risks: 5, positions: 1, successor: 'Sarah Miller' },
        { name: 'Sales', score: 62, risks: 12, positions: 8, successor: 'John Doe' },
        { name: 'Operations', score: 88, risks: 1, positions: 2, successor: 'Emily White' },
        { name: 'Marketing', score: 82, risks: 3, positions: 4, successor: 'Mike Ross' },
      ].filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      ReportingEngine.exportToCSV(dataToExport, 'workforce_planning_matrix');
      toast(t('Matrix exported successfully'), 'success');
    } catch (error) {
      toast(t('Failed to export matrix'), 'error');
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING ORGANIZATIONAL MATRIX...</div>
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
                 <Layers size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Workforce Planning Matrix</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit strategic succession vectors, monitor organizational health, and simulate workforce scenarios.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing Workforce Simulation...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Run Neural Simulation')}
        </Btn>
      </div>

      {/* Strategic Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {strategicStats.map(s => (
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
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Departments">{t('Global Matrix')}</option>
                 <option value="Engineering">{t('Engineering Hub')}</option>
                 <option value="Executive">{t('Executive Nodes')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search operational nodes...')}
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
           <Btn variant="outline" onClick={handleExport} style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Export Matrix')}
           </Btn>
        </div>
      </div>

      {/* Neural Planning Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Organizational Node', 'Health Vector', 'Risk Nodes', 'Open Requisitions', 'Key Successor', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Engineering', score: 94, risks: 2, positions: 3, successor: 'Alex Chen' },
              { name: 'Product', score: 78, risks: 5, positions: 1, successor: 'Sarah Miller' },
              { name: 'Sales', score: 62, risks: 12, positions: 8, successor: 'John Doe' },
              { name: 'Operations', score: 88, risks: 1, positions: 2, successor: 'Emily White' },
              { name: 'Marketing', score: 82, risks: 3, positions: 4, successor: 'Mike Ross' },
            ].filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map((dept, idx) => {
              const isCritical = dept.score < 70;
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isCritical ? 'rgba(220, 38, 38, 0.02)' : 'transparent' }} className="plan-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isCritical ? 'var(--pink-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: isCritical ? 'var(--pink-600)' : 'var(--red-600)', border: `1px solid ${isCritical ? 'var(--pink-100)' : 'var(--red-100)'}`,  
                        fontSize: 16, fontWeight: 900
                      }}>
                         {dept.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{dept.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>STRATEGIC HUB</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px', minWidth: 200 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                           <div style={{ width: `${dept.score}%`, height: '100%', background: getHealthColor(dept.score), borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: getHealthColor(dept.score), width: 40 }}>
                          {dept.score}%
                        </span>
                     </div>
                     {isCritical && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pink-600)', fontSize: 10, fontWeight: 900, marginTop: 8, letterSpacing: '0.05em' }}>
                          <ShieldAlert size={12} /> CRITICAL VECTOR
                       </div>
                     )}
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge label={`${dept.risks} AT-RISK`} color={dept.risks > 10 ? 'red' : dept.risks > 4 ? 'yellow' : 'gray'} />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 900, color: '#1E293B' }}>
                        <Briefcase size={16} style={{ color: 'var(--red-600)' }} />
                        {dept.positions}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: 10, background: '#F8FAFC', 
                        display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, color: 'var(--red-600)',
                        border: '1.5px solid #F1F5F9'
                      }}>
                         {dept.successor.charAt(0)}
                      </div>
                      <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700 }}>{dept.successor}</span>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Hub Intelligence"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Execute Tactical Simulation"><Zap size={18} /></button>
                       <button className="action-btn" title="Options"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .plan-row:hover { background: #FBFBFF; }
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
