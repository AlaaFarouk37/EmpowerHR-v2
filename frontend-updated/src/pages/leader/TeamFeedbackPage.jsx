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
  MessageSquare, 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  ChevronRight, 
  BarChart2,
  Heart,
  Zap,
  Target,
  Brain
} from 'lucide-react';
import { getReceivedFeedback } from '../../api/employee';
import { getTeamTasks } from '../../api/leader';

export function TeamFeedbackPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState({
    items: [],
    stats: []
  });
  const [selectedSentiment, setSelectedSentiment] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetching collective feedback and tasks to derive momentum
        const [tasks] = await Promise.all([
          getTeamTasks()
        ]);

        // Mocking live feedback stream for now as we don't have a direct getTeamFeedback
        const items = [
          { name: 'Alex Chen', type: 'Peer Review', text: 'Alex consistently delivers high-quality code and provides excellent mentorship to junior devs.', date: 'Feb 15, 2026', sentiment: 'Positive', avatar: 'AC', impact: 'High' },
          { name: 'Sarah Miller', type: 'Performance Review', text: 'Excellent progress on UI redesign projects. Sarah has shown great initiative in streamlining the component library.', date: 'Feb 12, 2026', sentiment: 'Positive', avatar: 'SM', impact: 'Medium' },
          { name: 'Jordan Smith', type: 'Monthly Sync', text: 'Jordan needs to focus more on documentation and testing coverage in the upcoming sprint.', date: 'Feb 10, 2026', sentiment: 'Critical', avatar: 'JS', impact: 'High' },
        ];

        const stats = [
          { label: 'Overall Sentiment', value: '88%', icon: Heart, trend: '+12%', color: 'var(--red-800)', bg: 'var(--red-50)' },
          { label: 'Feedback Velocity', value: items.length * 4, icon: Zap, sub: 'per month', color: 'var(--red-600)', bg: 'var(--red-50)' },
          { label: 'Recognition Density', value: '94%', icon: Sparkles, trend: 'Optimal', color: 'var(--pink-600)', bg: 'var(--pink-50)' },
          { label: 'Alignment Score', value: '82%', icon: Target, trend: '+5%', color: 'var(--pink-400)', bg: 'var(--pink-50)' },
        ];

        setFeedbackData({ items, stats });
      } catch (error) {
        console.error('Error fetching feedback:', error);
        toast(t('Failed to synchronize feedback ecosystem'), 'error');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, t, toast]);

  const filteredItems = useMemo(() => {
    if (selectedSentiment === 'All') return feedbackData.items;
    return feedbackData.items.filter(i => i.sentiment === selectedSentiment);
  }, [feedbackData.items, selectedSentiment]);

  if (loading || authLoading) {
    return (
      <LeaderPortalLayout>
        <div style={{ padding: 40 }}>
           <Skeleton count={1} height={60} style={{ marginBottom: 40 }} />
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
              <Skeleton count={4} height={140} />
           </div>
           <Skeleton count={5} height={100} />
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
                 <MessageSquare size={20} style={{ color: 'var(--red-600)' }} />
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0 }}>Team Feedback Ecosystem</h2>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Continuous sentiment monitoring and performance coaching loops.</p>
        </div>
        <Btn 
          onClick={() => toast(t('Initializing 360-degree feedback protocol...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 12, padding: '0 24px', fontWeight: 800, background: 'var(--red-600)', border: 'none' }}
        >
           <Sparkles size={18} style={{ marginRight: 8 }} /> {t('Request 360 Review')}
        </Btn>
      </div>

      {/* Intelligence Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        {feedbackData.stats.map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24, transition: 'all 0.2s' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'grid', placeItems: 'center' }}>
                   <s.icon size={20} style={{ color: s.color }} />
                </div>
                {s.trend && <Badge label={s.trend} color={s.trend.startsWith('+') ? 'red' : 'gray'} style={{ fontSize: 10 }} />}
             </div>
             <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>{t(s.label)}</div>
             <div style={{ fontSize: 28, fontWeight: 900, color: '#1E293B' }}>{s.value} <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{s.sub}</span></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 40 }}>
         {/* Feedback Stream */}
         <div style={{ display: 'grid', gap: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Recent Neural Feedback</h3>
               <div style={{ display: 'flex', gap: 8 }}>
                  {['All', 'Positive', 'Critical'].map(filter => (
                    <button 
                      key={filter}
                      onClick={() => setSelectedSentiment(filter)}
                      style={{ 
                        padding: '6px 14px', borderRadius: 10, border: '1px solid #F1F5F9', 
                        background: selectedSentiment === filter ? '#1E293B' : '#fff',
                        color: selectedSentiment === filter ? '#fff' : '#64748B',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                       {filter}
                    </button>
                  ))}
               </div>
            </div>

            <div style={{ display: 'grid', gap: 24 }}>
               {filteredItems.map((item, i) => (
                 <div key={i} style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                       <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <div style={{ 
                            width: 52, height: 52, borderRadius: 16, background: 'var(--red-50)', 
                            display: 'grid', placeItems: 'center', fontWeight: 900, color: 'var(--red-600)',
                            border: '1px solid var(--red-100)'
                          }}>
                             {item.avatar}
                          </div>
                          <div>
                             <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{item.name}</div>
                             <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{item.type} • {item.date}</div>
                          </div>
                       </div>
                       <div style={{ display: 'flex', gap: 8 }}>
                          <Badge label={item.impact + ' Impact'} color="indigo" />
                          <Badge label={item.sentiment} color={item.sentiment === 'Positive' ? 'red' : 'pink'} />
                       </div>
                    </div>
                    <div style={{ 
                      background: '#F8FAFC', borderRadius: 20, padding: 24, 
                      fontSize: 15, color: '#475569', fontWeight: 600, lineHeight: 1.7, 
                      fontStyle: 'italic', border: '1px solid #F1F5F9', marginBottom: 24,
                      position: 'relative'
                    }}>
                       <Sparkles size={16} style={{ position: 'absolute', right: 20, top: 20, opacity: 0.2, color: 'var(--red-600)' }} />
                       "{item.text}"
                    </div>
                     <div style={{ display: 'flex', gap: 12 }}>
                        <Btn variant="primary" style={{ flex: 1, height: 44, borderRadius: 12, background: '#1E293B', border: 'none' }}>{t('Plan Strategic Action')}</Btn>
                        <Btn variant="secondary" style={{ flex: 1, height: 44, borderRadius: 12 }}>{t('Acknowledge')}</Btn>
                     </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Sidebar: Pulse & Insights */}
         <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            {/* AI Team Pulse */}
            <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: 28, padding: 32, color: 'white', border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Team Morale Pulse</div>
                   <Brain size={18} style={{ color: 'var(--red-500)' }} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, marginBottom: 24 }}>
                   {[35, 55, 40, 95, 70, 85, 80].map((h, i) => (
                     <div key={i} style={{ flex: 1, background: i === 3 ? 'var(--red-600)' : 'rgba(255,255,255,0.1)', height: `${h}%`, borderRadius: 6, position: 'relative' }}>
                        {i === 3 && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'var(--red-400)', boxShadow: '0 0 8px var(--red-400)' }} />}
                     </div>
                   ))}
                </div>

                <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
                   <span style={{ color: '#fff', fontWeight: 800 }}>88.4% Positive Momentum.</span> {t('Recognition signals are strong following the latest delivery cycle. Alignment with strategic goals has improved.')}
                </p>
            </div>

            {/* Strategic Action Triage */}
            <div style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32 }}>
               <h4 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target size={18} style={{ color: 'var(--red-600)' }} />
                  Strategic Actions
               </h4>
               <div style={{ display: 'grid', gap: 16 }}>
                  {[
                    { label: 'Documentation Sprint', member: 'Alex Chen', status: 'Blocked', color: 'pink' },
                    { label: 'UI Library Streamlining', member: 'Sarah Miller', status: 'Active', color: 'red' },
                    { label: 'Testing Coverage Audit', member: 'Jordan Smith', status: 'Pending', color: 'gray' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: 16, background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                       <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{item.label}</div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{item.member}</span>
                          <Badge label={item.status} color={item.color} style={{ fontSize: 9 }} />
                       </div>
                    </div>
                  ))}
               </div>
               <Btn variant="secondary" style={{ width: '100%', marginTop: 24, height: 40, borderRadius: 10, fontSize: 12 }}>{t('View Action Board')} <ChevronRight size={14} style={{ marginLeft: 6 }} /></Btn>
            </div>
         </div>
      </div>
    </LeaderPortalLayout>
  );
}
