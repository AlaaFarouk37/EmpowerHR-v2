import { useState, useEffect, useMemo } from 'react';
import { adminGetSystemHealth } from '../../api/index.js';
import { 
  Badge, 
  Btn, 
  Spinner, 
  useToast,
  PageHeader,
  Skeleton
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Activity, 
  Server, 
  Zap, 
  Cpu,
  ShieldCheck,
  RefreshCcw,
  Database,
  Cloud,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  Monitor,
  HardDrive,
  Network,
  Lock,
  Globe
} from 'lucide-react';

export function SystemHealthPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [maintenanceMode, setMaintenanceMode] = useState(() => !!localStorage.getItem('system_maintenance'));
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const data = await adminGetSystemHealth();
        setStats(data);
        setHistory(prev => {
           const newHistory = [...prev, { 
             time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
             latency: data.latency, 
             cpu: data.cpuUsage, 
             mem: data.memoryUsage 
           }];
           return newHistory.slice(-10);
        });
        setLoading(false);
      } catch (err) {
        toast(t('Failed to fetch system health'), 'error');
      }
    };
    loadHealth();
    const interval = setInterval(loadHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleMaintenance = () => {
    const newState = !maintenanceMode;
    setMaintenanceMode(newState);
    localStorage.setItem('system_maintenance', newState ? 'true' : '');
    window.dispatchEvent(new Event('storage'));
    toast(newState ? t('Maintenance Mode Activated') : t('Maintenance Mode Deactivated'), 'warning');
  };

  const getStatusColor = (s) => {
    switch (s?.toLowerCase()) {
      case 'healthy':
      case 'online':
      case 'optimal': return 'green';
      case 'slow':
      case 'degraded': return 'orange';
      case 'critical':
      case 'offline': return 'red';
      default: return 'gray';
    }
  };

  const healthChecks = [
    { check: 'API Gateway', service: 'Edge-01', status: 'Healthy', latency: '24ms', region: 'Global' },
    { check: 'Database Cluster', service: 'PostgreSQL-DB', status: 'Healthy', latency: '8ms', region: 'US-East' },
    { check: 'Storage Engine', service: 'S3-Hub', status: 'Healthy', latency: '112ms', region: 'EU-West' },
    { check: 'AI Analytics', service: 'CV-Worker', status: 'Degraded', latency: '840ms', region: 'Multi' },
    { check: 'Identity Provider', service: 'Auth-SSO', status: 'Healthy', latency: '42ms', region: 'Primary' },
  ];

  if (loading) return (
    <div className="page-content" style={{ padding: '40px 60px', background: '#F8FAFC' }}>
      <Skeleton height={80} style={{ marginBottom: 40, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        <Skeleton height={500} style={{ borderRadius: 32 }} />
        <Skeleton height={500} style={{ borderRadius: 32 }} />
      </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Infrastructure Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #10B981, #059669)', 
                display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(16, 185, 129, 0.2)' 
              }}>
                 <Activity size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                 <h1 style={{ fontSize: 36, fontWeight: 950, color: '#1E293B', margin: 0, letterSpacing: '-0.03em' }}>System Mission Control</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                   <Badge label="Core Systems Operational" color="green" />
                   <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>Telemetry Stream v4.2.0 • Real-time Infrastructure Monitoring</span>
                 </div>
              </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Btn 
            onClick={() => toast('Initializing Global Security Scan...', 'info')}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
             <ShieldCheck size={18} /> Security Scan
          </Btn>
          <Btn 
            onClick={toggleMaintenance}
            variant={maintenanceMode ? 'primary' : 'outline'} 
            style={{ 
              height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 900, 
              background: maintenanceMode ? '#DC2626' : '#fff',
              color: maintenanceMode ? '#fff' : '#1E293B',
              border: maintenanceMode ? 'none' : '1.5px solid #E2E8F0',
              boxShadow: maintenanceMode ? '0 10px 25px -5px rgba(220, 38, 38, 0.4)' : 'none'
            }}
          >
             <Zap size={18} fill={maintenanceMode ? "currentColor" : "none"} /> {maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
          </Btn>
        </div>
      </div>

      {maintenanceMode && (
        <div style={{ 
          background: 'linear-gradient(90deg, #FEF2F2 0%, #fff 100%)', 
          borderLeft: '4px solid #DC2626', borderRadius: 12, padding: '20px 32px', 
          marginBottom: 32, display: 'flex', alignItems: 'center', gap: 20,
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.05)'
        }}>
           <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEE2E2', display: 'grid', placeItems: 'center' }}>
              <Lock size={20} color="#DC2626" />
           </div>
           <div>
              <div style={{ fontSize: 15, color: '#991B1B', fontWeight: 900 }}>Maintenance Mode Active</div>
              <div style={{ fontSize: 13, color: '#B91C1C', fontWeight: 600, opacity: 0.8 }}>Non-admin users are currently blocked from modifying system parameters.</div>
           </div>
        </div>
      )}

      {/* Real-time Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
        {[
          { label: 'Platform Uptime', value: '99.982%', icon: Globe, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Neural Processing Load', value: `${stats?.cpuUsage || 12}%`, icon: Cpu, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Global Error Rate', value: '0.002%', icon: Zap, color: '#F59E0B', bg: '#FFFBEB' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card-employee" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t(item.label)}</div>
              <div style={{ fontSize: 32, fontWeight: 950, color: '#1E293B', letterSpacing: '-0.02em' }}>{item.value}</div>
              <div style={{ fontSize: 12, color: item.color, fontWeight: 800, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={12} /> Live Telemetry
              </div>
            </div>
            <div style={{ 
              width: 64, height: 64, borderRadius: 20, background: item.bg, color: item.color, 
              display: 'grid', placeItems: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <item.icon size={28} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>
        {/* Central Infrastructure Grid */}
        <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
           <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Monitor size={18} style={{ color: '#10B981' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Service Health Ledger</h3>
                </div>
                <Btn variant="ghost" size="sm" style={{ fontWeight: 800, color: '#64748B' }}>
                   <RefreshCcw size={14} style={{ marginRight: 8 }} /> Recalibrate Sensors
                </Btn>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fff', borderBottom: '1.5px solid #F1F5F9' }}>
                    {['Check Node', 'Service Identifier', 'Status', 'Latency'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '20px 32px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {healthChecks.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'all 0.2s' }} className="node-row">
                      <td style={{ padding: '20px 32px', fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{item.check}</td>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B', fontWeight: 700 }}>
                           <HardDrive size={14} style={{ color: '#10B981' }} /> {item.service}
                        </div>
                      </td>
                      <td style={{ padding: '20px 32px' }}>
                        <Badge label={item.status} color={getStatusColor(item.status)} style={{ fontWeight: 900, fontSize: 10, padding: '4px 10px' }} />
                      </td>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 950, color: parseInt(item.latency) > 500 ? '#DC2626' : '#1E293B' }}>
                           <Network size={14} /> {item.latency}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>

        {/* Tactical Infrastructure Sidebar */}
        <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
          <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: '32px', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Layers size={18} style={{ color: '#10B981' }} /> Infrastructure Modules
            </h3>
            <div style={{ display: 'grid', gap: 16 }}>
              {[
                { name: 'Identity Index', status: 'Online', icon: <Lock size={18} />, load: 'Optimized' },
                { name: 'Neural Compute Cluster', status: 'Online', icon: <Cpu size={18} />, load: 'High-Demand' },
                { name: 'Global Database', status: 'Online', icon: <Database size={18} />, load: 'Syncing' },
                { name: 'Asset Object Hub', status: 'Online', icon: <Cloud size={18} />, load: 'Balanced' },
              ].map((service, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', gap: 16, padding: '20px', 
                  background: '#F8FAFC', borderRadius: 20, border: '1.5px solid #F1F5F9',
                  transition: 'all 0.2s'
                }} className="node-row">
                  <div style={{ 
                    width: 44, height: 44, borderRadius: 12, background: '#fff', 
                    border: '1.5px solid #F1F5F9', display: 'grid', placeItems: 'center', color: '#10B981',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                  }}>
                    {service.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{service.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: 2 }}>{service.load}</div>
                  </div>
                  <Badge label={service.status} color="green" size="sm" style={{ fontWeight: 900, fontSize: 9 }} />
                </div>
              ))}
            </div>
            <Btn variant="ghost" style={{ width: '100%', marginTop: 24, fontSize: 14, fontWeight: 800, color: '#10B981' }}>
               Full System Diagnostics <ExternalLink size={16} style={{ marginLeft: 8 }} />
            </Btn>
          </div>

          <div style={{ 
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
            borderRadius: 32, padding: '32px', color: '#fff', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden'
          }}>
             <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                <Activity size={160} />
             </div>
             <h3 style={{ fontSize: 20, fontWeight: 950, marginBottom: 12, position: 'relative' }}>Tactical Readiness</h3>
             <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, lineHeight: 1.6, marginBottom: 28, position: 'relative' }}>
                All systems currently operating within nominal parameters. Workforce throughput is optimal.
             </p>
             <button style={{ 
               width: '100%', height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.1)', 
               border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 900, 
               fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(10px)',
               transition: 'all 0.2s'
             }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
                Infrastructure Logs →
             </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .node-row:hover { background: rgba(248, 250, 252, 1); transform: translateY(-2px); }
        .node-row { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
      `}} />
    </div>
  );
}

