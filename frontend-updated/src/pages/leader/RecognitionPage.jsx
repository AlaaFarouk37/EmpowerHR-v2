import { useState, useEffect, useMemo } from 'react';
import { 
  LeaderPortalLayout, 
  Skeleton, 
  useToast, 
  Badge,
  Btn,
  EmployeeSelect,
  Input,
  Textarea
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, 
  Trophy, 
  Star, 
  Users, 
  TrendingUp, 
  Search, 
  Send, 
  ShieldCheck,
  Gift,
  Award,
  Zap,
  Activity,
  Brain
} from 'lucide-react';
import { getTeamRecognition, createTeamRecognition } from '../../api/leader';

export function TeamRecognitionPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board'); // 'board' or 'give'
  const [awards, setAwards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    employee_id: '',
    title: '',
    points: 50,
    category: 'Achievement',
    date: new Date().toISOString().slice(0, 10),
    message: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getTeamRecognition();
      setAwards(data || []);
    } catch (error) {
      console.error('Error fetching recognition:', error);
      toast(t('Failed to sync recognition assets'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.title || !formData.message) {
      toast(t('Please fill in all required neural nodes'), 'error');
      return;
    }

    try {
      await createTeamRecognition(formData);
      toast(`${t('Recognition Deployed Successfully')}`, 'success');
      setView('board');
      setFormData({
        employee_id: '',
        title: '',
        points: 50,
        category: 'Achievement',
        date: new Date().toISOString().slice(0, 10),
        message: ''
      });
      fetchData();
    } catch (error) {
      toast(t('Failed to deploy recognition'), 'error');
    }
  };

  const filteredAwards = useMemo(() => {
    return awards.filter(a => 
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [awards, searchTerm]);

  const stats = useMemo(() => {
    const totalPoints = awards.reduce((acc, a) => acc + Number(a.points || 0), 0);
    return [
      { label: 'Awards Deployed', value: awards.length, icon: Trophy, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Neural Points', value: totalPoints.toLocaleString(), icon: Zap, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Innovation Depth', value: '92%', icon: Brain, color: 'var(--pink-500)', bg: 'var(--pink-50)' },
      { label: 'Team Momentum', value: '+14%', icon: Activity, color: 'var(--red-600)', bg: 'var(--red-50)' },
    ];
  }, [awards]);

  if (loading || authLoading) {
    return (
      <LeaderPortalLayout>
        <div style={{ padding: 40 }}>
           <Skeleton count={1} height={60} style={{ marginBottom: 40 }} />
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
              <Skeleton count={4} height={120} />
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
                 <Trophy size={20} style={{ color: 'var(--red-600)' }} />
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0 }}>Team Recognition</h2>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Amplify excellence and reward high-impact contributions.</p>
        </div>
        <Btn 
          onClick={() => setView(view === 'board' ? 'give' : 'board')}
          variant="primary" 
          style={{ height: 48, borderRadius: 12, padding: '0 24px', fontWeight: 800, background: 'var(--red-600)', border: 'none' }}
        >
           {view === 'board' ? <><Sparkles size={18} style={{ marginRight: 8 }} /> Give Recognition</> : <><Users size={18} style={{ marginRight: 8 }} /> Back to Board</>}
        </Btn>
      </div>

      {view === 'board' ? (
        <>
          {/* Recognition Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24, transition: 'all 0.2s' }}>
                 <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                    <s.icon size={20} style={{ color: s.color }} />
                 </div>
                 <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{t(s.label)}</div>
                 <div style={{ fontSize: 24, fontWeight: 900 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 40 }}>
             {/* Appreciation Feed */}
             <div style={{ display: 'grid', gap: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Neural Appreciation Wall</h3>
                   <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input 
                        type="text" 
                        placeholder="Search by member or title..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ height: 40, padding: '0 12px 0 36px', borderRadius: 10, border: '1.5px solid #F1F5F9', fontSize: 13, fontWeight: 600, width: 240, outline: 'none' }} 
                      />
                   </div>
                </div>

                <div style={{ display: 'grid', gap: 24 }}>
                   {filteredAwards.length > 0 ? filteredAwards.map((a) => (
                     <div key={a.id} style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', right: -10, top: -10, opacity: 0.05 }}>
                           <Award size={120} style={{ color: 'var(--red-600)' }} />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, position: 'relative', zIndex: 1 }}>
                           <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                              <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--red-50)', display: 'grid', placeItems: 'center', fontWeight: 900, color: 'var(--red-600)', border: '1px solid var(--red-100)' }}>
                                 {a.employee_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                              </div>
                              <div>
                                 <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{a.employee_name}</div>
                                 <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{a.date}</div>
                              </div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              <Badge label={a.category} color="red" />
                              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--red-600)', marginTop: 8 }}>+{a.points} Pts</div>
                           </div>
                        </div>

                        <div style={{ position: 'relative', zIndex: 1 }}>
                           <h4 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Star size={18} fill="var(--red-600)" style={{ color: 'var(--red-600)' }} />
                              {a.title}
                           </h4>
                           <p style={{ fontSize: 14, color: '#475569', fontWeight: 600, lineHeight: 1.7, margin: 0, padding: '16px 20px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                              "{a.message || t('No description provided.')}"
                           </p>
                        </div>
                     </div>
                   )) : (
                     <div style={{ textAlign: 'center', padding: 60, background: '#F8FAFC', borderRadius: 28, border: '2px dashed #E2E8F0' }}>
                        <Gift size={48} style={{ color: '#94A3B8', margin: '0 auto 16px' }} />
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#64748B' }}>No recognition assets found.</div>
                        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Be the first to celebrate a team milestone!</div>
                     </div>
                   )}
                </div>
             </div>

             {/* Sidebar: Leaderboard & Playbook */}
             <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
                <div style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32 }}>
                   <h4 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Star size={18} style={{ color: 'var(--red-600)' }} />
                      Appreciation Spotlight
                   </h4>
                   <div style={{ display: 'grid', gap: 20 }}>
                      {awards.slice(0, 5).map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                           <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1E293B', color: 'white', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900 }}>
                              {a.employee_name?.charAt(0) || '?'}
                           </div>
                           <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{a.employee_name}</div>
                              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>{a.points} Pts accumulated</div>
                           </div>
                           <Badge label={`#${i+1}`} color="gray" />
                        </div>
                      ))}
                   </div>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: 28, padding: 32, color: 'white' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                      <h4 style={{ fontSize: 11, fontWeight: 900, color: 'var(--red-500)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Recognition Playbook</h4>
                      <Activity size={18} style={{ color: 'var(--red-600)' }} />
                   </div>
                   <div style={{ display: 'grid', gap: 24 }}>
                      {[
                        { t: 'Innovation Boost', n: 'Reward nodes showing high neural momentum in creative projects.', icon: Sparkles },
                        { t: 'Stability Check', n: 'Target nodes with low recognition depth in the last 60 days.', icon: ShieldCheck }
                      ].map((play, i) => (
                        <div key={i} style={{ borderLeft: '3px solid var(--red-600)', paddingLeft: 20 }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <play.icon size={14} style={{ color: 'var(--red-400)' }} />
                              <div style={{ fontSize: 14, fontWeight: 800 }}>{play.t}</div>
                           </div>
                           <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6, fontWeight: 500 }}>{play.n}</div>
                        </div>
                      ))}
                   </div>
                   <Btn variant="secondary" style={{ width: '100%', marginTop: 32, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                      {t('Analyze Gaps')}
                   </Btn>
                </div>
             </div>
          </div>
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 48, maxWidth: 900, margin: '0 auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
           <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--red-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                 <Sparkles size={32} style={{ color: 'var(--red-600)' }} />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', margin: 0 }}>Deploy Recognition Asset</h3>
              <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, marginTop: 8 }}>Formalize team achievements in the neural ledger.</p>
           </div>
           
           <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
                 <EmployeeSelect 
                   label="Select Team Member *" 
                   value={formData.employee_id} 
                   onChange={(v) => setFormData({ ...formData, employee_id: v })} 
                 />
                 <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#475569', marginBottom: 10 }}>Recognition Date</label>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      style={{ width: '100%', height: 52, padding: '0 16px', borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', fontSize: 14, fontWeight: 700, outline: 'none' }}
                    />
                 </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32 }}>
                 <Input 
                   label="Award Title *" 
                   placeholder="e.g., Sprint Excellence" 
                   value={formData.title}
                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                   style={{ height: 52, borderRadius: 14 }}
                 />
                 <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#475569', marginBottom: 10 }}>Points Allocation</label>
                    <div style={{ position: 'relative' }}>
                       <Zap size={16} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--red-500)' }} />
                       <input 
                         type="number" 
                         value={formData.points}
                         onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                         style={{ width: '100%', height: 52, padding: '0 16px', borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', fontSize: 14, fontWeight: 700, outline: 'none' }}
                       />
                    </div>
                 </div>
              </div>

              <div>
                 <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#475569', marginBottom: 10 }}>Category</label>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {['Achievement', 'Innovation', 'Teamwork', 'Leadership'].map(cat => (
                      <button 
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        style={{ 
                          height: 48, borderRadius: 12, border: '1.5px solid #F1F5F9', 
                          background: formData.category === cat ? '#1E293B' : '#fff',
                          color: formData.category === cat ? '#fff' : '#64748B',
                          fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                         {cat}
                      </button>
                    ))}
                 </div>
              </div>

              <Textarea 
                label="Appreciation Message *" 
                placeholder="Describe the neural impact this member had on the project trajectory..." 
                style={{ minHeight: 160, borderRadius: 18 }} 
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 16 }}>
                 <button type="button" onClick={() => setView('board')} style={{ height: 52, padding: '0 32px', borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', color: '#64748B' }}>Cancel</button>
                 <button type="submit" style={{ height: 52, padding: '0 40px', borderRadius: 14, border: 'none', background: 'var(--red-600)', color: 'white', fontWeight: 900, fontSize: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}>
                    <Send size={18} />
                    Deploy Recognition
                 </button>
              </div>
           </form>
        </div>
      )}
    </LeaderPortalLayout>
  );
}
