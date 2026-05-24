import { useState, useEffect } from 'react';
import { 
  LeaderPortalLayout, 
  Skeleton, 
  useToast, 
  Badge,
  Btn
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Zap, TrendingUp, Users, Clock, CheckCircle2, ChevronRight, Sparkles, Send, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NeuralTeamMap } from '../../components/leader/NeuralTeamMap';

export function LeaderDashboardPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 1, name: 'Alex Chen', type: 'Annual Leave', duration: '3 Days' },
    { id: 2, name: 'Sarah Miller', type: 'Expense Claim', duration: '$450.00' }
  ]);

  const handleApprove = (id, name) => {
    setPendingApprovals(prev => prev.filter(a => a.id !== id));
    toast(`${t('Approval Synchronized')}: ${name}`, 'success');
  };

  const handleReview = (id, name) => {
    toast(`${t('Opening Review Matrix')}: ${name}`, 'info');
    // In a real app, this would navigate to the detail page
    navigate('/leader/team-requests');
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    toast(t('Analyzing team telemetry...'), 'info');
    setTimeout(() => {
      setIsGenerating(false);
      toast(t('Team Report Generated Successfully'), 'success');
    }, 2000);
  };

  const handleBuzz = (name) => {
    toast(`${t('Pinging')} ${name}...`, 'info');
    setTimeout(() => {
      toast(`${t('Buzz sent to')} ${name}`, 'success');
    }, 1000);
  };

  const teamMembers = [
    { id: 1, name: 'Alex Chen', role: 'Senior Developer', status: 'Active', perf: 95, avatar: 'AC' },
    { id: 2, name: 'Sarah Miller', role: 'UI Designer', status: 'In Meeting', perf: 92, avatar: 'SM' },
    { id: 3, name: 'Jordan Smith', role: 'Project Manager', status: 'On Leave', perf: 88, avatar: 'JS' },
  ];

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  if (loading) {
    return (
      <LeaderPortalLayout>
        <Skeleton count={10} height={40} />
      </LeaderPortalLayout>
    );
  }

  return (
    <LeaderPortalLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
           <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: '0 0 8px' }}>Command Dashboard</h2>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Welcome back, {user?.full_name?.split(' ')[0] || 'Leader'}. Here's your team's tactical status.</p>
        </div>
        <Btn 
          onClick={handleGenerateReport}
          loading={isGenerating}
          variant="primary" 
          style={{ background: 'var(--red-600)', border: 'none', height: 48, borderRadius: 12, padding: '0 24px', fontWeight: 800 }}
        >
           Generate Team Report
        </Btn>
      </div>

      {/* Predictive Analytics Banner */}
      <div style={{ background: 'linear-gradient(90deg, #1E293B 0%, #334155 100%)', borderRadius: 24, padding: '20px 32px', marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
         <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center' }}>
               <Brain size={24} style={{ color: 'var(--pink-400)' }} />
            </div>
            <div>
               <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>Predictive Intelligence</div>
               <div style={{ fontSize: 15, fontWeight: 700 }}>{t('Project Zenith delivery risk is LOW for this sprint cycle.')}</div>
            </div>
         </div>
         <Badge label="AI Insight" color="pink" />
      </div>

      {/* High-Level Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
         {[
           { label: 'Team Presence', value: '6/8', sub: 'On Duty Today', color: 'var(--red-800)', bg: 'var(--red-50)', icon: Users },
           { label: 'Pending Approvals', value: pendingApprovals.length, sub: 'Action Required', color: 'var(--red-600)', bg: 'var(--red-50)', icon: Clock },
           { label: 'Sprint Progress', value: '78%', sub: 'Project Zenith', color: 'var(--red-600)', bg: 'var(--red-50)', icon: Zap },
           { label: 'Team Stability', value: '94%', sub: 'High Retention', color: 'var(--pink-600)', bg: 'var(--pink-50)', icon: TrendingUp },
         ].map(s => (
           <div key={s.label} style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                 <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{t(s.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>{s.sub}</div>
           </div>
         ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 40 }}>
         {/* Left Side: Team Radar */}
         <div style={{ display: 'grid', gap: 32 }}>
            <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 32 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Team Tactical Radar</h3>
                  <button onClick={() => navigate('/leader/team-directory')} style={{ background: 'none', border: 'none', color: 'var(--red-600)', fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                     View All <ChevronRight size={16} />
                  </button>
               </div>
               
                <div style={{ display: 'grid', gap: 20 }}>
                  {teamMembers.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                       <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, color: 'var(--red-600)', border: '1px solid #F1F5F9' }}>{m.avatar}</div>
                          <div>
                             <div style={{ fontSize: 14, fontWeight: 900 }}>{m.name}</div>
                             <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{m.role} • {m.status}</div>
                          </div>
                       </div>
                       <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                          <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--red-800)' }}>{m.perf}%</div>
                             <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>{t('Performance')}</div>
                          </div>
                          <button 
                            onClick={() => handleBuzz(m.name)}
                            title={t('Buzz member')}
                            style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: '1.5px solid #F1F5F9', color: 'var(--red-600)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                          >
                             <Send size={14} />
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <NeuralTeamMap members={teamMembers} />
         </div>

         {/* Right Side: Approvals & Recognition */}
         <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div style={{ background: '#1E293B', borderRadius: 24, padding: 32, color: 'white' }}>
               <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Clock size={18} style={{ color: 'var(--red-600)' }} />
                  Pending Sign-offs
               </h3>
               <div style={{ display: 'grid', gap: 16 }}>
                  {pendingApprovals.length > 0 ? pendingApprovals.map((app) => (
                    <div key={app.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
                       <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{app.name}</div>
                       <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 16 }}>{app.type} • {app.duration}</div>
                       <div style={{ display: 'flex', gap: 10 }}>
                          <button 
                            onClick={() => handleApprove(app.id, app.name)}
                            style={{ flex: 1, height: 36, borderRadius: 8, background: 'var(--red-600)', border: 'none', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleReview(app.id, app.name)}
                            style={{ flex: 1, height: 36, borderRadius: 8, background: 'none', border: '1.5px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
                          >
                            Review
                          </button>
                       </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#94A3B8' }}>
                      <CheckCircle2 size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Queue Clear</div>
                      <div style={{ fontSize: 12 }}>No pending tactical sign-offs.</div>
                    </div>
                  )}
               </div>
               <button onClick={() => navigate('/leader/team-requests')} style={{ width: '100%', marginTop: 24, background: 'none', border: 'none', color: '#94A3B8', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  Open Request Center →
               </button>
            </div>

            <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 32 }}>
               <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>Team Recognition</h3>
               <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, lineHeight: 1.6, marginBottom: 24 }}>Reward high-performing standardized skill growth and momentum.</p>
               <button onClick={() => navigate('/leader/recognition')} style={{ width: '100%', height: 48, borderRadius: 12, background: 'none', border: '1.5px solid #F1F5F9', color: '#1E293B', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <Sparkles size={18} style={{ color: 'var(--pink-400)' }} />
                  Give Shout-out
               </button>
            </div>
         </div>
      </div>
    </LeaderPortalLayout>
  );
}

