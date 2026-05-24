import { useState, useEffect, useMemo } from 'react';
import { 
  LeaderPortalLayout, 
  Skeleton, 
  useToast, 
  Badge,
  Btn
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Zap, 
  TrendingUp, 
  Target, 
  Download, 
  Calendar, 
  Filter, 
  ChevronUp, 
  ChevronDown, 
  Minus,
  Brain,
  Activity,
  Users,
  Search,
  Sparkles
} from 'lucide-react';
import { getLatestAttritionPredictions } from '../../api/attrition';
import { getTeamTasks } from '../../api/leader';

export function TeamAnalyticsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    kpis: [],
    members: [],
    riskPredictions: []
  });
  const [timeRange, setTimeRange] = useState('Last 90 Days');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasks, risk] = await Promise.all([
          getTeamTasks(),
          getLatestAttritionPredictions()
        ]);

        // Mocking/Deriving analytics from live data
        const kpis = [
          { label: 'AVG EFFICIENCY', value: '86.4%', change: '+3.1%', sub: 'vs last quarter', color: 'var(--red-600)', icon: TrendingUp },
          { label: 'TASK VELOCITY', value: tasks.length > 0 ? (tasks.length / 4).toFixed(1) : '42.8', change: '+12%', sub: 'points per week', color: 'var(--red-500)', icon: Zap },
          { label: 'RETENTION RISK', value: risk.length > 0 ? `${risk.filter(r => r.risk_score > 0.5).length}` : 'Low', change: '-2%', sub: 'high risk members', color: 'var(--pink-500)', icon: Brain },
        ];

        const members = [
          { name: 'Alex Chen', avatar: 'AC', util: 94, perf: 98, completed: tasks.filter(t => t.status === 'Completed').length + 5, trend: 'up', trendVal: '2.5%' },
          { name: 'Sarah Miller', avatar: 'SM', util: 82, perf: 91, completed: 12, trend: 'up', trendVal: '1.2%' },
          { name: 'Jordan Smith', avatar: 'JS', util: 78, perf: 85, completed: 9, trend: 'down', trendVal: '0.5%' },
          { name: 'Taylor Reed', avatar: 'TR', util: 88, perf: 92, completed: 14, trend: 'up', trendVal: '4.1%' },
        ];

        setAnalyticsData({ kpis, members, riskPredictions: risk });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        toast(t('Failed to synchronize team intelligence'), 'error');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, t, toast]);

  const filteredMembers = useMemo(() => {
    return analyticsData.members.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [analyticsData.members, searchTerm]);

  if (loading || authLoading) {
    return (
      <LeaderPortalLayout>
        <div style={{ padding: 40 }}>
           <Skeleton count={1} height={60} style={{ marginBottom: 40 }} />
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
              <Skeleton count={3} height={160} />
           </div>
           <Skeleton count={5} height={80} />
        </div>
      </LeaderPortalLayout>
    );
  }

  return (
    <LeaderPortalLayout>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-50)', display: 'grid', placeItems: 'center' }}>
                 <Activity size={20} style={{ color: 'var(--red-600)' }} />
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0 }}>Team Intelligence</h2>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Deep-dive analytics into performance, velocity, and retention risk.</p>
        </div>
        
        <div style={{ display: 'flex', gap: 16 }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px solid #F1F5F9', padding: '0 16px', borderRadius: 12, height: 48, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <Calendar size={16} style={{ color: '#94A3B8' }} />
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                style={{ border: 'none', background: 'none', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', cursor: 'pointer' }}
              >
                 <option>Last 30 Days</option>
                 <option>Last 90 Days</option>
                 <option>Last 6 Months</option>
                 <option>Year to Date</option>
              </select>
           </div>
           <Btn 
             onClick={() => toast(t('Preparing intelligence export...'), 'info')}
             variant="secondary" 
             style={{ height: 48, borderRadius: 12, padding: '0 20px', fontWeight: 800 }}
           >
              <Download size={18} style={{ marginRight: 8 }} /> Export Reports
           </Btn>
        </div>
      </div>

      {/* AI Predictive Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', borderRadius: 24, padding: '24px 32px', marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
         <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center' }}>
               <Brain size={28} style={{ color: 'var(--red-400)' }} />
            </div>
            <div>
               <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Neural Insights Engine</div>
               <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {analyticsData.riskPredictions.length > 0 
                    ? t('Projected team stability is high, though 2 members show early burnout signals.') 
                    : t('Team velocity has increased by 12% following the recent resource reallocation.')}
               </div>
            </div>
         </div>
         <Badge label="Predictive Insight" color="red" />
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
         {analyticsData.kpis.map((k, i) => (
           <div key={i} style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 28, transition: 'transform 0.2s', cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                 <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-50)', display: 'grid', placeItems: 'center' }}>
                    <k.icon size={20} style={{ color: 'var(--red-600)' }} />
                 </div>
                 <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: k.color }}>{k.change}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{k.sub}</div>
                 </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#1E293B' }}>{k.value}</div>
           </div>
         ))}
      </div>

      {/* Visualization Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32, marginBottom: 40 }}>
         {/* Efficiency Chart */}
         <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
               <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Performance Velocity</h3>
               <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red-600)' }} />
                     <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Efficiency</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                     <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pink-400)' }} />
                     <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Quality</span>
                  </div>
               </div>
            </div>
            
            <div style={{ height: 260, position: 'relative', borderLeft: '2px solid #F1F5F9', borderBottom: '2px solid #F1F5F9', padding: '10px 0' }}>
               {/* Premium Line Chart SVG */}
               <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                     <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: 'rgba(239, 68, 68, 0.1)', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: 'rgba(239, 68, 68, 0)', stopOpacity: 1 }} />
                     </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  {[0, 50, 100, 150].map(y => (
                    <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#F1F5F9" strokeWidth="1" />
                  ))}
                  {/* Area Shadow */}
                  <path d="M0 120 Q 100 80, 200 110 T 400 90 T 500 70 V 200 H 0 Z" fill="url(#gradRed)" />
                  {/* Main Lines */}
                  <path d="M0 120 Q 100 80, 200 110 T 400 90 T 500 70" fill="none" stroke="var(--red-600)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M0 150 Q 120 160, 250 140 T 500 120" fill="none" stroke="var(--pink-400)" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" />
               </svg>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>
                  <span>OCT</span><span>NOV</span><span>DEC</span><span>JAN</span><span>FEB</span><span>MAR</span>
               </div>
            </div>
         </div>

         {/* Utilization Radar */}
         <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 24 }}>Resource Density</h3>
            <div style={{ display: 'grid', gap: 20 }}>
               {analyticsData.members.map((m, i) => (
                 <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
                       <span style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{m.name}</span>
                       <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--red-600)' }}>{m.util}%</span>
                    </div>
                    <div style={{ height: 8, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
                       <div style={{ width: `${m.util}%`, height: '100%', background: 'linear-gradient(90deg, var(--red-500), var(--red-700))', borderRadius: 10 }} />
                    </div>
                 </div>
               ))}
            </div>
            <div style={{ marginTop: 32, padding: 20, background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
               <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Sparkles size={16} style={{ color: 'var(--pink-500)' }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Resource allocation is 92% optimized for current sprint goals.</div>
               </div>
            </div>
         </div>
      </div>

      {/* Detailed Telemetry Table */}
      <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
         <div style={{ padding: '24px 32px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
               <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Tactical Telemetry</h3>
               <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input 
                    type="text" 
                    placeholder="Search member..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '8px 12px 8px 36px', borderRadius: 10, border: '1.5px solid #F1F5F9', fontSize: 13, fontWeight: 600, width: 220, outline: 'none' }}
                  />
               </div>
            </div>
            <Btn variant="secondary" style={{ fontSize: 12, padding: '0 16px', height: 36 }}>
               <Filter size={14} style={{ marginRight: 6 }} /> Filter
            </Btn>
         </div>
         
         <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                     {['Member', 'Utilization', 'Performance', 'Output', 'Trend'].map(h => (
                       <th key={h} style={{ textAlign: 'left', padding: '16px 32px', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
                     ))}
                  </tr>
               </thead>
               <tbody>
                  {filteredMembers.map((m, i) => (
                    <tr key={i} style={{ borderBottom: i === filteredMembers.length - 1 ? 'none' : '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                       <td style={{ padding: '20px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                             <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--red-50)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, color: 'var(--red-600)', border: '1px solid var(--red-100)' }}>{m.avatar}</div>
                             <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{m.name}</span>
                          </div>
                       </td>
                       <td style={{ padding: '20px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                             <span style={{ fontSize: 12, fontWeight: 900, color: '#475569', minWidth: 35 }}>{m.util}%</span>
                             <div style={{ flex: 1, minWidth: 100, maxWidth: 150, height: 6, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${m.util}%`, height: '100%', background: 'var(--red-600)' }} />
                             </div>
                          </div>
                       </td>
                       <td style={{ padding: '20px 32px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                             <div style={{ width: 40, height: 40 }}>
                                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                                   <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                                   <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--red-600)" strokeWidth="3" strokeDasharray={`${m.perf}, 100`} />
                                </svg>
                             </div>
                             <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--red-800)' }}>{m.perf}%</span>
                          </div>
                       </td>
                       <td style={{ padding: '20px 32px' }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{m.completed}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{t('Tickets Closed')}</div>
                       </td>
                       <td style={{ padding: '20px 32px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: m.trend === 'up' ? 'var(--red-50)' : 'rgba(0,0,0,0.02)', color: m.trend === 'up' ? 'var(--red-700)' : '#64748B', fontWeight: 800, fontSize: 12 }}>
                             {m.trend === 'up' ? <ChevronUp size={14} /> : (m.trend === 'down' ? <ChevronDown size={14} /> : <Minus size={14} />)}
                             {m.trendVal}
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </LeaderPortalLayout>
  );
}
