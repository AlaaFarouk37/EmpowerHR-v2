import { useEffect, useMemo, useState } from 'react';
import { getMyRecognition } from '../../api/index.js';
import { Badge, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Trophy, 
  Award, 
  Star, 
  Heart, 
  Users, 
  Zap,
  Gift,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  Share2
} from 'lucide-react';

export function EmployeeRecognitionPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAwards = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyRecognition(user.employee_id);
      setAwards(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load recognition', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAwards(); }, [user?.employee_id]);

  const totalPoints = awards.reduce((sum, item) => sum + Number(item.points || 0), 0);

  if (loading) return <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}><Spinner size="lg" color="#DC2626" /></div>;

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Recognition & Rewards</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Celebrating your impact and achievements within the team</p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="glass-card-employee" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrendingUp size={20} color="#DC2626" />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{totalPoints} Points Available</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Kudos Wall */}
          <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Kudos Feed</h2>
            </div>

            <div style={{ display: 'grid', gap: 24 }}>
              {awards.length > 0 ? (
                awards.map(award => (
                  <div key={award.awardID} className="glass-card-employee" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FEF2F2', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
                          {award.category === 'Leadership' ? <Trophy size={20} /> :
                           award.category === 'Innovation' ? <Zap size={20} /> :
                           award.category === 'Teamwork' ? <Users size={20} /> : <Star size={20} />}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>{award.title}</h3>
                          <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>
                            Recognized by <span style={{ color: '#1E293B' }}>{award.recognizedBy || 'Team Lead'}</span> • {award.recognitionDate}
                          </div>
                        </div>
                      </div>
                      <Badge label={`+${award.points || 0} Points`} color="red" />
                    </div>
                    
                    <p style={{ fontSize: 15, color: '#475569', fontWeight: 500, lineHeight: 1.6, margin: '0 0 24px 0' }}>
                      {award.message || 'Exemplary work and commitment to excellence in the current project phase.'}
                    </p>

                    <div style={{ display: 'flex', gap: 24, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        <ThumbsUp size={16} /> 12 Likes
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        <MessageSquare size={16} /> 4 Comments
                      </button>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}>
                        <Share2 size={16} /> Share
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card-employee" style={{ padding: '60px', textAlign: 'center' }}>
                  <Award size={48} color="#94A3B8" style={{ marginBottom: 20 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>No Awards Yet</h3>
                  <p style={{ color: '#64748B', fontWeight: 600 }}>Your achievements and recognition from peers will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Reward Points</h3>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#DC2626', marginBottom: 8 }}>{totalPoints}</div>
                <div style={{ fontSize: 14, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>REDEEMABLE POINTS</div>
              </div>
              <button className="btn-red-primary" style={{ width: '100%', padding: '14px' }}>
                Redeem Rewards <Gift size={18} style={{ marginLeft: 8 }} />
              </button>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Badge Collection</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { icon: <Zap size={20} />, label: 'Fast Learner' },
                  { icon: <Heart size={20} />, label: 'Team Player' },
                  { icon: <Award size={20} />, label: 'Top Performer' },
                ].map((badge, i) => (
                  <div key={i} style={{ 
                    aspectRatio: '1', borderRadius: 16, background: '#F8FAFC', border: '1px solid #F1F5F9',
                    display: 'grid', placeItems: 'center', color: '#DC2626'
                  }}>
                    {badge.icon}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px', background: '#1E293B', color: '#fff' }}>
              <Trophy size={32} style={{ marginBottom: 20 }} />
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Quarterly Spotlight</h3>
              <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6, marginBottom: 24 }}>Nominate a colleague for the "Empower Hero" award and earn 50 bonus points.</p>
              <button style={{ 
                width: '100%', padding: '14px', borderRadius: 12, background: '#DC2626', border: 'none',
                color: '#fff', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                Nominate Now <ArrowRight size={18} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

