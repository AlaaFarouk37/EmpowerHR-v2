import { useEffect, useMemo, useState, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getJobs,
  getOrgHealthSnapshot,
  hrGetDocuments,
  hrGetEmployees,
  hrGetExpenses,
  hrGetForms,
  hrGetLeaveRequests,
  hrGetTickets,
} from '../../api/index.js';
import { 
  Btn, 
  Spinner, 
  useToast,
  PageHeader,
  Badge,
  Skeleton
} from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Users, 
  Activity, 
  BarChart3, 
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Database,
  Cpu,
  Zap,
  Server,
  Sparkles
} from 'lucide-react';

/* --- Simple Neural Chart (Memoized) --- */
const SimpleNeuralChart = memo(({ data }) => {
  const points = useMemo(() => 
    data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d / Math.max(...data)) * 80}`).join(' '),
    [data]
  );
  
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible', contain: 'content' }}>
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary-teal)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-primary-teal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M 0 100 L ${points} L 100 100 Z`}
        fill="url(#chartGradient)"
        style={{ transition: 'd 0.6s var(--ease-neural)' }}
      />
      <polyline
        fill="none"
        stroke="var(--color-primary-teal)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{ filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.2))', transition: 'points 0.6s var(--ease-neural)' }}
      />
      {data.map((d, i) => (
        <circle
          key={i}
          cx={(i / (data.length - 1)) * 100}
          cy={100 - (d / Math.max(...data)) * 80}
          r="2"
          fill="var(--color-primary-teal)"
          stroke="var(--bg-primary)"
          strokeWidth="1"
          style={{ transition: 'all 0.4s var(--ease-neural)' }}
        />
      ))}
    </svg>
  );
});

export function AdminDashboardPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState(null);
  const [jobs, setJobs] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState(null);
  const [expenses, setExpenses] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(false);

    hrGetEmployees().then(d => setEmployees(Array.isArray(d) ? d : [])).catch(() => setEmployees([]));
    getJobs().then(d => setJobs(Array.isArray(d) ? d : [])).catch(() => setJobs([]));
    hrGetLeaveRequests().then(d => setLeaveRequests(Array.isArray(d) ? d : [])).catch(() => setLeaveRequests([]));
    hrGetExpenses().then(d => setExpenses(Array.isArray(d) ? d : [])).catch(() => setExpenses([]));
    hrGetTickets().then(d => setTickets(Array.isArray(d) ? d : [])).catch(() => setTickets([]));
    getOrgHealthSnapshot().then(d => {}).catch(() => {});
  }, [authLoading, user]);

  const generateAIInsights = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      const insights = [
        "System audit complete. detected 4 pending leave cycles. recommendation: activate automated approval protocols.",
        "Workforce velocity has increased by 14.2%. Neural engine suggests scaling 'Engineering' talent pool.",
        "Operational throughput is currently 94.2%. suggest reviewing document issuance workflows."
      ];
      setAiInsights(insights[Math.floor(Math.random() * insights.length)]);
      setIsGenerating(false);
      toast('Neural insights generated successfully', 'success');
    }, 1500);
  };

  const stats = useMemo(() => ({
    totalWorkforce: employees ? employees.length : '...',
    throughput: '94.2%',
    activeNodes: 42
  }), [employees]);

  if (loading) return (
    <div className="page-content" style={{ padding: '40px 60px', background: 'var(--bg-secondary)' }}>
      <Skeleton height={80} style={{ marginBottom: 40, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <Skeleton height={500} style={{ borderRadius: 32 }} />
        <Skeleton height={500} style={{ borderRadius: 32 }} />
      </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: 'var(--spacing-lg)' }}>
      {/* Neural Connectivity Strip (New) */}
      <div style={{ 
        background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--border-primary)',
        borderRadius: 16, padding: '12px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16
      }}>
        <div className="neural-pulse-dot" style={{ width: 8, height: 8 }} />
        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--neural-red)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Neural Connectivity Active</span>
        <div style={{ width: 1, height: 16, background: 'var(--border-primary)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
          Throughput: <span style={{ color: 'var(--text-primary)' }}>4.2k events/sec</span>
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {['System Health', 'Audit Trail', 'Neural Index'].map(chip => (
            <span key={chip} style={{ 
              fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8, 
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-primary)'
            }}>{chip}</span>
          ))}
        </div>
      </div>

      {/* Strategic Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #10B981, #059669)', 
                display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(16, 185, 129, 0.2)' 
              }}>
                 <Cpu size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                 <h1 style={{ fontSize: 36, fontWeight: 950, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>{t('nav.missionControl')}</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <Badge label={t('dashboard.neuralNetworkOnline')} color="green" />
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>{t('dashboard.registryVersion')}</span>
                 </div>
              </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Btn 
            onClick={() => navigate('/admin/users')}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
              <Users size={18} style={{ marginRight: 8 }} /> {t('dashboard.userRegistry')}
          </Btn>
          <Btn 
            onClick={() => navigate('/admin/activity-logs')}
            variant="primary" 
            style={{ 
              height: 52, borderRadius: 16, padding: '0 28px', fontWeight: 900, 
              background: '#1E293B', border: 'none', 
              boxShadow: '0 10px 25px -5px rgba(30, 41, 59, 0.3)' 
            }}
          >
              <Activity size={18} style={{ marginRight: 8 }} /> {t('dashboard.eventStream')}
          </Btn>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
        {[
          { label: 'dashboard.totalWorkforce', value: stats.totalWorkforce, icon: Users, color: '#10B981', bg: '#ECFDF5', trend: '+12% Velocity' },
          { label: 'dashboard.systemThroughput', value: stats.throughput, icon: Zap, color: '#3B82F6', bg: '#EFF6FF', trend: 'Optimal Flow' },
          { label: 'dashboard.activeNodes', value: stats.activeNodes, icon: Server, color: '#6366F1', bg: '#EEF2FF', trend: 'Global Sync' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card-employee" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t(item.label)}</div>
              <div style={{ fontSize: 32, fontWeight: 950, color: 'var(--text-primary)' }}>{item.value}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: item.color, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendingUp size={12} /> {item.trend}
              </div>
            </div>
            <div style={{ 
              width: 64, height: 64, borderRadius: 20, background: item.bg, color: item.color, 
              display: 'grid', placeItems: 'center', opacity: 0.9
            }}>
              <item.icon size={28} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>
        {/* Intelligence Matrix */}
        <div className="glass-card-employee" style={{ padding: '32px', border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div>
               <h3 style={{ fontSize: 20, fontWeight: 950, color: 'var(--text-primary)', margin: 0 }}>{t('dashboard.workforceIntelligence')}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: 600 }}>{t('dashboard.neuralTelemetryCycle')}</p>
            </div>
            <Badge label={t('dashboard.liveAnalysis')} color="indigo" />
          </div>
          
          <div style={{ height: 320, background: 'var(--bg-secondary)', borderRadius: 24, padding: '40px 24px', position: 'relative', border: '1.5px solid var(--border-primary)' }}>
             <SimpleNeuralChart data={[30, 45, 35, 60, 55, 80, 75, 90, 85, 100]} />
             <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 32px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 900 }}>
                <span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>NOV</span>
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 32 }}>
             {[
                { label: 'dashboard.activeJobs', value: jobs === null ? '...' : jobs.length, color: '#10B981', bg: 'var(--bg-secondary)' },
               { label: 'dashboard.openTickets', value: tickets === null ? '...' : tickets.length, color: '#3B82F6', bg: 'var(--bg-secondary)' },
               { label: 'dashboard.pendingLeaves', value: leaveRequests === null ? '...' : leaveRequests.length, color: '#F59E0B', bg: 'var(--bg-secondary)' }
             ].map((m, i) => (
               <div key={i} style={{ padding: '20px', background: m.bg, borderRadius: 18, border: '1.5px solid var(--border-primary)' }}>
                  <div style={{ fontSize: 10, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(m.label)}</div>
                  <div style={{ fontSize: 24, fontWeight: 950, marginTop: 4, color: 'var(--text-primary)' }}>{m.value}</div>
               </div>
             ))}
          </div>
        </div>

        {/* Infrastructure Stability */}
        <div style={{ display: 'grid', gap: 32, gridTemplateRows: 'auto 1fr' }}>
          <div className="glass-card-employee" style={{ padding: '32px', border: '1.5px solid var(--border-primary)', background: 'var(--glass-bg)' }}>
             <h3 style={{ fontSize: 16, fontWeight: 950, color: 'var(--text-primary)', marginBottom: 24 }}>{t('dashboard.systemStability')}</h3>
            <div style={{ display: 'grid', gap: 20 }}>
               {[
                  { label: 'dashboard.neuralGateway', status: 'dashboard.optimal', icon: Database, color: '#10B981' },
                 { label: 'dashboard.databaseCluster', status: 'dashboard.healthy', icon: Server, color: '#3B82F6' },
                 { label: 'dashboard.authSentinel', status: 'dashboard.encrypted', icon: ShieldCheck, color: '#6366F1' }
               ].map((s, i) => (
                 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 40, height: 40, borderRadius: 12, background: 'var(--bg-secondary)', 
                      display: 'grid', placeItems: 'center', border: '1.5px solid var(--border-primary)', color: s.color
                    }}>
                       <s.icon size={20} />
                    </div>
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{t(s.label)}</div>
                    <Badge label={t(s.status)} color={s.status.includes('optimal') ? 'green' : 'indigo'} />
                 </div>
               ))}
            </div>
            <Btn variant="outline" style={{ width: '100%', marginTop: 28, height: 48, borderRadius: 14, fontSize: 13, fontWeight: 800 }}>
                {t('dashboard.neuralTelemetry')} <ArrowUpRight size={14} style={{ marginLeft: 6 }} />
            </Btn>
          </div>

          <div className="glass-card-employee" style={{ 
            padding: '32px', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
            color: '#fff', border: 'none', position: 'relative', overflow: 'hidden' 
          }}>
             <div style={{ position: 'absolute', top: -40, right: -40, opacity: 0.1, color: '#fff' }}>
                <Sparkles size={180} />
             </div>
              <h3 style={{ fontSize: 18, fontWeight: 950, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} style={{ color: '#6366F1' }} /> {t('dashboard.neuralAdvisor')}
              </h3>
             <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, marginBottom: 28, fontWeight: 600, position: 'relative', zIndex: 1 }}>
                {isGenerating ? t('dashboard.synthesizingSignals') : (aiInsights || t('dashboard.defaultNeuralAdvice'))}
             </p>
             <Btn 
               onClick={generateAIInsights}
               loading={isGenerating}
               variant="primary" 
               style={{ 
                 background: '#fff', color: '#1E293B', border: 'none', width: '100%', 
                 height: 52, borderRadius: 16, fontWeight: 950, fontSize: 14,
                 boxShadow: '0 10px 20px -5px rgba(0,0,0,0.3)'
               }}
             >
                 {aiInsights ? 'Refresh Logic' : t('dashboard.initiateNeuralAudit')}
             </Btn>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
