import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  hrGetRosterHealth,
  hrGetApprovalSnapshot,
  hrGetEmployees,
  getLatestAttritionPredictions,
} from '../../api/index.js';
import { 
  Spinner, 
  Btn, 
  Badge, 
  useToast, 
} from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  Activity, 
  Zap,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert,
  MessageSquare,
  BarChart3,
  Layers,
  History,
  RefreshCcw,
  Bot,
  FileText,
  Loader2,
  Brain,
  Target,
  Sparkles,
  Globe,
  Heart
} from 'lucide-react';

export function HRDashboardPage() {
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [triage, setTriage] = useState([]);
  const [riskNodes, setRiskNodes] = useState([]);
  const [densityData, setDensityData] = useState([]);
  const [activityStream, setActivityStream] = useState([]);

  const loadDashboard = (isSync = false) => {
    if (!isSync) setLoading(false);
    setSyncing(isSync);

    // Headline metrics + density + triage are composed from roster health,
    // approval snapshot, and employee directory (all Section A endpoints).
    Promise.all([
      hrGetRosterHealth().catch(() => ({})),
      hrGetApprovalSnapshot().catch(() => ({})),
      hrGetEmployees().catch(() => []),
    ]).then(([roster, approvals, employees]) => {
      const list = Array.isArray(employees) ? employees : [];
      const followUps = approvals?.followUpItems || [];
      const summary = approvals?.summary || {};

      setMetrics({
        total_headcount: roster?.totalEmployees ?? roster?.activeHeadcount ?? list.length,
      });

      setTriage(followUps.slice(0, 5).map((item, i) => ({
        id: item.id || `triage-${i}`,
        type: (item.type || 'workflow').toLowerCase(),
        severity: item.riskLevel === 'High' || item.priority === 'High' ? 'critical' : 'warning',
        title: item.title || item.subject || item.recommendedAction || 'Workforce signal',
        summary: item.recommendedAction || item.summary || `${item.pendingResponses ?? ''} pending • ${item.completionRate ?? ''}%`,
        path: item.path || '/hr/approvals',
      })));

      setActivityStream(followUps.slice(0, 8).map((item, i) => ({
        id: item.id || `event-${i}`,
        severity: item.riskLevel === 'High' ? 'high' : 'medium',
        description: item.title || item.recommendedAction || item.subject || 'Workforce update',
        timestamp: item.createdAt || item.updatedAt || new Date().toISOString(),
        type: item.type || 'workforce',
      })));

      // Synthesize a per-department density view from the roster.
      const byDept = {};
      list.forEach(emp => {
        const d = emp.department || 'Unassigned';
        if (!byDept[d]) byDept[d] = { department: d, headcount: 0, active_shifts: 0 };
        byDept[d].headcount += 1;
        if (emp.employmentStatus !== 'On Leave') byDept[d].active_shifts += 1;
      });
      const maxHeadcount = Math.max(...Object.values(byDept).map(d => d.headcount), 1);
      const density = Object.values(byDept).map(d => ({
        ...d,
        density_index: d.headcount / maxHeadcount,
        status: d.headcount / maxHeadcount > 0.85 ? 'overloaded' : 'balanced',
      })).sort((a, b) => b.density_index - a.density_index);
      setDensityData(density);

      // Acknowledge the bulk-pending counter so a "live" hint can still render.
      if (summary.totalPending !== undefined) {
        setMetrics(prev => ({ ...prev, totalPending: summary.totalPending }));
      }

      setSyncing(false);
    }).catch(() => {
      setSyncing(false);
    });

    // Risk-corridor list comes from the attrition predictions endpoint.
    getLatestAttritionPredictions()
      .then(d => setRiskNodes(
        (Array.isArray(d) ? d : []).slice(0, 6).map((p, i) => ({
          id: p.id || p.employee_id || `risk-${i}`,
          fullName: p.fullName || p.employee_name || p.employeeID || 'Workforce node',
          riskScore: p.riskScore != null ? p.riskScore : (p.attrition_probability ?? 0.4),
          department: p.department || '—',
          jobTitle: p.jobTitle || p.role || '—',
        }))
      ))
      .catch(() => setRiskNodes([]));
  };

  useEffect(() => { 
    if (!authLoading && user) {
      loadDashboard(); 
    }
  }, [authLoading, user]);

  const handleSync = () => {
    toast('Refreshing workforce intelligence...', 'info');
    loadDashboard(true);
  };

  // Contextual Neural Actions Logic
  const neuralAction = useMemo(() => {
    if (triage.length > 5) return { label: 'Bulk Resolve Triage', icon: <Zap size={18} />, color: 'var(--red-800)', path: '/hr/approvals' };
    if (riskNodes.length > 2) return { label: 'Initiate Retention Sweep', icon: <ShieldAlert size={18} />, color: '#7C3AED', path: '/hr/attrition' };
    if (densityData.some(d => d.status === 'overloaded')) return { label: 'Rebalance Dept Load', icon: <RefreshCcw size={18} />, color: '#2563EB', path: '/hr/shifts' };
    return { label: 'Intelligence Sync', icon: <Bot size={18} />, color: '#111827', path: 'sync' };
  }, [triage, riskNodes, densityData]);

  const handleDownloadBrief = () => {
    const originalTitle = document.title;
    document.title = `EmpowerHR_Neural_Brief_${new Date().toISOString().split('T')[0]}`;
    window.print();
    document.title = originalTitle;
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
           <div style={{ position: 'absolute', width: '100%', height: '100%', border: '4px solid var(--red-100)', borderRadius: '50%' }} />
           <div style={{ position: 'absolute', width: '100%', height: '100%', border: '4px solid var(--red-600)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
           <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <Brain size={32} style={{ color: 'var(--red-600)' }} />
           </div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', letterSpacing: '0.05em' }}>SYNCHRONIZING NEURAL HUB...</div>
        <div style={{ marginTop: 8, fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>Mapping Workforce Nodes & Stability Pulsars</div>
      </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Strategic Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}>
               <Globe size={22} style={{ color: '#fff' }} />
            </div>
            <div>
               <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Workforce Intelligence Center</h1>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <Badge label={syncing ? "Calibrating..." : "System Equilibrium"} color={syncing ? "orange" : "red"} style={{ fontSize: 10, padding: '2px 8px' }} />
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>Neural Network v3.0.4 • Global Telemetry Active</span>
               </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <button 
            onClick={handleDownloadBrief}
            style={{ 
              height: 48, padding: '0 24px', background: '#fff', border: '1.5px solid #E2E8F0', 
              borderRadius: 14, fontWeight: 800, fontSize: 14, color: '#64748B',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <FileText size={18} /> Neural Brief
          </button>
          
          <button 
            disabled={syncing}
            onClick={neuralAction.path === 'sync' ? handleSync : () => navigate(neuralAction.path)}
            style={{ 
              height: 48, padding: '0 24px', background: neuralAction.color, border: 'none', 
              borderRadius: 14, fontWeight: 900, fontSize: 14, color: '#fff',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              boxShadow: `0 10px 20px -5px ${neuralAction.color}40`, transition: 'all 0.3s'
            }}
          >
             {syncing ? <Loader2 size={18} className="animate-spin" /> : neuralAction.icon} 
             {syncing ? 'Recalibrating...' : neuralAction.label}
          </button>
        </div>
      </div>

      {/* Neural Telemetry Core */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {[
          { label: 'Global Headcount', value: metrics?.total_headcount ?? '...', icon: Users, color: '#1E293B', bg: '#fff' },
          { label: 'Operational Load', value: densityData.length === 0 ? '...' : (densityData.filter(d => d.status === 'overloaded').length > 0 ? 'Critical' : 'Optimal'), icon: Activity, color: 'var(--red-600)', bg: '#fff' },
          { label: 'Neural Stability', value: riskNodes.length === 0 ? '...' : `${100 - (riskNodes.length * 2)}%`, icon: Heart, color: 'var(--red-800)', bg: '#fff' },
          { label: 'Event Frequency', value: activityStream.length === 0 ? '...' : `${activityStream.length} h/p`, icon: History, color: '#7C3AED', bg: '#fff' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '24px', borderRadius: 28, background: stat.bg, border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-50)', display: 'grid', placeItems: 'center' }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
               </div>
               <Badge label="Live" color="red" style={{ fontSize: 9 }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#1E293B', marginTop: 4 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40 }}>
        {/* Central Intelligence Column */}
        <div style={{ display: 'grid', gap: 40, alignContent: 'start' }}>
          {/* Neural Department Heatmap */}
          <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
               <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Neural Load Heatmap</h2>
               <div style={{ display: 'flex', gap: 8 }}>
                  <Badge label="Density Index" color="indigo" />
               </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
               {densityData.map((dept) => (
                 <div key={dept.department}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                     <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{dept.department}</span>
                     <span style={{ fontSize: 12, fontWeight: 900, color: dept.status === 'overloaded' ? 'var(--red-600)' : '#2563EB' }}>
                        {Math.round(dept.density_index * 100)}%
                     </span>
                   </div>
                   <div style={{ height: 8, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
                     <div style={{ width: `${Math.min(dept.density_index * 100, 100)}%`, height: '100%', background: dept.status === 'overloaded' ? 'var(--red-600)' : 'var(--red-400)', transition: '1s width ease' }} />
                   </div>
                   <div style={{ marginTop: 10, fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{dept.active_shifts} Active Shifts</span>
                      <span>{dept.headcount} Nodes</span>
                   </div>
                 </div>
               ))}
               {densityData.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontWeight: 600 }}>Loading density clusters...</div>
               )}
            </div>
          </div>

          {/* Operational Triage Ledger */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
               <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Strategic Triage Ledger</h2>
               <Badge label={`${triage.length} Conflicts`} color={triage.length > 0 ? 'red' : 'green'} />
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              {triage.length === 0 ? (
                <div style={{ padding: 80, textAlign: 'center', borderRadius: 32, border: '2px dashed #E2E8F0', background: '#fff' }}>
                  <CheckCircle size={48} style={{ color: 'var(--red-600)', margin: '0 auto 16px', opacity: 0.3 }} />
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>System Equilibrium Achieved</div>
                  <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6, fontWeight: 600 }}>All workforce nodes are operating within optimal parameters.</p>
                </div>
              ) : triage.map((item) => (
                <div key={item.id} onClick={() => navigate(item.path)} style={{ padding: '24px 32px', borderRadius: 28, border: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                   <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 16, background: item.severity === 'critical' ? 'var(--red-50)' : 'var(--pink-50)', color: item.severity === 'critical' ? 'var(--red-600)' : '#D97706', display: 'grid', placeItems: 'center' }}>
                        {item.type === 'logistics' ? <Clock size={22} /> : <AlertTriangle size={22} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>{item.title}</div>
                        <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{item.summary}</div>
                      </div>
                   </div>
                   <button style={{ height: 40, padding: '0 16px', borderRadius: 10, background: 'var(--red-50)', border: 'none', color: 'var(--red-600)', fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>Resolve Node</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Neural Intelligence Sidebar */}
        <div style={{ display: 'grid', gap: 40, alignContent: 'start' }}>
           {/* Stability Pulse Analysis */}
           <div style={{ background: '#111827', borderRadius: 32, padding: 32, color: '#fff', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>Neural Stability Pulse</h2>
                <ShieldAlert size={20} style={{ color: 'var(--red-600)' }} />
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                {riskNodes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontWeight: 600 }}>No risk nodes detected.</div>
                ) : riskNodes.map((node) => (
                  <div key={node.id} style={{ padding: '20px', borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'var(--red-600)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{node.fullName}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--red-500)' }}>{Math.round(node.riskScore * 100)}%</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginBottom: 16 }}>{node.department} • {node.jobTitle}</div>
                    <Btn variant="primary" style={{ width: '100%', height: 36, background: '#fff', color: '#111827', borderRadius: 10, fontSize: 11, fontWeight: 900, border: 'none' }}>
                       Initiate Retention Protocol
                    </Btn>
                  </div>
                ))}
              </div>
           </div>

           {/* Pulse Heartbeat */}
           <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>Intelligence Heartbeat</h2>
                <Activity size={18} style={{ color: 'var(--red-600)' }} />
              </div>
              <div style={{ display: 'grid', gap: 24, maxHeight: 400, overflowY: 'auto' }}>
                {activityStream.length === 0 ? (
                   <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontWeight: 600 }}>Loading heartbeat...</div>
                ) : activityStream.map((event) => (
                  <div key={event.id} style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: event.severity === 'high' ? 'var(--red-600)' : 'var(--red-400)', marginTop: 6, flexShrink: 0, boxShadow: '0 0 8px rgba(220, 38, 38, 0.3)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 4, lineHeight: 1.4 }}>{event.description}</div>
                      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {event.type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           {/* Strategic Map Shortcut */}
           <div style={{ background: 'linear-gradient(135deg, #111827 0%, #0F172A 100%)', padding: 32, borderRadius: 32, color: '#fff', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <TrendingUp size={28} style={{ color: 'var(--red-500)' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Strategic Org Map</h3>
              <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 28, lineHeight: 1.6 }}>High-fidelity workforce distribution and talent density mapping.</p>
              <Btn onClick={() => navigate('/hr/org-map')} style={{ width: '100%', height: 48, background: '#fff', color: '#111827', borderRadius: 14, fontWeight: 900, fontSize: 14, border: 'none' }}>
                 Enter Neural Projection
              </Btn>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}
