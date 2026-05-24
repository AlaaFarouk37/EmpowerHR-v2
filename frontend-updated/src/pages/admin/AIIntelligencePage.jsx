import { useState, useEffect, useMemo } from 'react';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  Skeleton, 
  useToast, 
  EmployeeSelect, 
  Input,
  PageHeader
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { hrSimulatePromotion } from '../../api/index.js';
import { logAIEvent, getAIHistory, AI_EVENT_TYPES } from '../../utils/telemetry.js';
import { 
  Cpu, 
  Activity, 
  Zap, 
  Shield, 
  TrendingUp, 
  AlertCircle,
  RefreshCcw,
  Search,
  ChevronRight,
  BrainCircuit,
  Lock,
  UserCheck
} from 'lucide-react';

export function AIIntelligencePage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulation State
  const [simData, setSimData] = useState({ employeeID: '', targetRole: '', targetSalary: '' });
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const load = () => {
      setHistory(getAIHistory());
      setLoading(false);
    };

    load();
    window.addEventListener('ai_telemetry_update', load);
    return () => window.removeEventListener('ai_telemetry_update', load);
  }, []);

  const handleSimulate = async () => {
    if (!simData.employeeID || !simData.targetRole) {
      toast(t('Please select an employee and target role'), 'error');
      return;
    }
    setSimulating(true);
    try {
      const res = await hrSimulatePromotion(simData);
      setSimResult(res);
      logAIEvent(AI_EVENT_TYPES.PROMOTION_SIMULATION, {
        employee: res.employee_name,
        target_role: simData.targetRole,
        stability_impact: res.risk_delta
      });
      toast(t('Simulation complete'), 'success');
    } catch (err) {
      toast(t('Simulation failed'), 'error');
    } finally {
      setSimulating(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const last24h = history.filter(e => (now - new Date(e.timestamp)) < 86400000);
    const advisories = [];
    
    // Pattern logic (simplified for UI)
    if (history.length > 50) advisories.push({ type: 'INFO', title: 'High Volume Activity', note: 'Unusually high telemetry volume detected.' });

    return {
      totalEvents: history.length,
      highImpact: history.filter(e => [AI_EVENT_TYPES.SYSTEM_LOCKDOWN, AI_EVENT_TYPES.GOVERNANCE_OVERRIDE].includes(e.type)).length,
      activeAdvisories: advisories.length,
      stabilityScore: 98,
      advisories
    };
  }, [history]);

  if (loading) return (
    <div className="page-content">
      <Skeleton height={80} style={{ marginBottom: 40 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
      <Skeleton height={400} />
    </div>
  );

  return (
    <div className="page-content animate-in">
      <PageHeader 
        title="AI Intelligence Center"
        subtitle="Real-time governance telemetry and predictive system stability analysis"
        actions={[
          { label: 'Neural Reset', icon: <RefreshCcw size={16} />, variant: 'outline' },
          { label: 'Export Analytics', variant: 'primary' }
        ]}
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        {[
          { label: 'Stability Index', value: `${stats.stabilityScore}%`, icon: <Activity size={24} />, color: 'var(--red-800)' },
          { label: 'Governance Events', value: stats.totalEvents, icon: <Shield size={24} />, color: 'var(--color-primary-teal)' },
          { label: 'Active Advisories', value: stats.activeAdvisories, icon: <BrainCircuit size={24} />, color: 'var(--pink-400)' }
        ].map((item, idx) => (
          <div key={idx} className="card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{t(item.label)}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
              <div style={{ fontSize: 12, color: item.color, fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center' }}>
                <span className="neural-pulse-dot" style={{ background: item.color, animation: 'neural-pulse 2s infinite' }} />
                <span className="neural-active-text">{t('Neural Pulse: Stable')}</span>
              </div>
            </div>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${item.color}15`, color: item.color, display: 'grid', placeItems: 'center' }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        {/* Left: Telemetry Feed */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Neural Telemetry Stream</h3>
            <Badge label="Live Feed" color="info" variant="soft" />
          </div>
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {history.length === 0 ? (
              <EmptyState title="No telemetry data available" />
            ) : history.map(event => (
              <div key={event.id} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-primary)' }} className="hover-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{(event.type || 'SYSTEM_EVENT').replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(event.timestamp).toLocaleTimeString()}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Initiated by: {event.user}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {event.metadata && Object.entries(event.metadata).map(([k, v]) => (
                    <Badge key={k} label={`${k}: ${v}`} variant="soft" size="xs" color="gray" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Simulator & Advisor */}
        <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap size={18} color="var(--color-primary-teal)" />
              Promotion Simulator
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Model organizational changes and predict stability impact before execution.
            </p>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <EmployeeSelect 
                label="Target Employee"
                value={simData.employeeID}
                onChange={val => setSimData(p => ({ ...p, employeeID: val }))}
              />
              <Input 
                label="Target Role"
                placeholder="e.g. Senior Manager"
                value={simData.targetRole}
                onChange={e => setSimData(p => ({ ...p, targetRole: e.target.value }))}
              />
              <Btn 
                variant="primary" 
                style={{ width: '100%', marginTop: 8 }}
                onClick={handleSimulate}
                disabled={simulating}
              >
                {simulating ? 'Processing Neural Model...' : 'Simulate Stability Impact'}
              </Btn>
            </div>

            {simResult && (
              <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Stability Index</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red-800)' }}>{(simResult.predicted_stability * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${simResult.predicted_stability * 100}%`, height: '100%', background: 'var(--red-800)' }} />
                </div>
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <strong>Neural Recommendation:</strong> {simResult.recommendation}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24, background: 'var(--color-primary-teal)', color: '#fff' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <BrainCircuit size={18} />
              Neural Advisor
            </h3>
            <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
              The system has detected no immediate governance overrides. Current workforce liquidity is optimal. AI suggests reviewing "Projected Burn" in the analytics terminal for Q3 planning.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .hover-row:hover {
          background: var(--bg-secondary);
        }
      `}</style>
    </div>
  );
}

