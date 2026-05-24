import { useEffect, useMemo, useState } from 'react';
import { getMyTraining, updateMyTrainingProgress } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Activity, 
  Target, 
  Award,
  Play,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Compass,
  Star,
  Download
} from 'lucide-react';

export function EmployeeTrainingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadCourses = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyTraining(user.employee_id);
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCourses(); }, [user?.employee_id]);

  const activeCourses = courses.filter(c => c.status !== 'Completed');
  const completedCourses = courses.filter(c => c.status === 'Completed');

  const handleResume = async (course) => {
    if (!course?.courseID || savingId) return;
    setSavingId(course.courseID);
    try {
      await updateMyTrainingProgress(course.courseID, {
        status: 'In Progress',
        progress: Number(course.progress || 0),
      });
      toast('Course resumed', 'success');
      await loadCourses();
    } catch (err) {
      toast(err.message || 'Failed to update training progress', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}><Spinner size="lg" color="#DC2626" /></div>;

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Learning & Development</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Enhance your skills with tailored training programs</p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="glass-card-employee" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrendingUp size={20} color="#DC2626" />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{completedCourses.length} Completed</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Course Catalog */}
          <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Active Courses ({activeCourses.length})</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
              {activeCourses.length > 0 ? (
                activeCourses.map(course => (
                  <div key={course.courseID} className="glass-card-employee overflow-hidden" style={{ padding: 0 }}>
                    <div style={{ height: 160, background: '#FEF2F2', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 20, left: 20 }}>
                        <Badge label={course.category || 'General'} color="red" />
                      </div>
                      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#DC2626', opacity: 0.2 }}>
                        <BrainCircuit size={80} />
                      </div>
                    </div>
                    <div style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>{course.title}</h3>
                      <p style={{ fontSize: 14, color: '#64748B', fontWeight: 500, marginBottom: 20, lineHeight: 1.5 }}>
                        {course.description || 'Develop core competencies and advanced skills for your career path.'}
                      </p>
                      
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#94A3B8', marginBottom: 8 }}>
                          <span>PROGRESS</span>
                          <span style={{ color: '#DC2626' }}>{course.progress || 0}%</span>
                        </div>
                        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ width: `${course.progress || 0}%`, height: '100%', background: '#DC2626', borderRadius: 10 }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#94A3B8', fontSize: 13, fontWeight: 600 }}>
                          <Clock size={16} />
                          {course.durationHours}h Left
                        </div>
                        <button
                          className="btn-red-primary"
                          onClick={() => handleResume(course)}
                          disabled={savingId === course.courseID}
                          style={{ padding: '10px 20px', fontSize: 13 }}
                        >
                          {savingId === course.courseID ? 'Resuming…' : 'Resume'} <Play size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card-employee" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center' }}>
                  <Award size={48} color="#10B981" style={{ marginBottom: 20 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>All Caught Up!</h3>
                  <p style={{ color: '#64748B', fontWeight: 600 }}>You've completed all assigned courses. Check back later for new material.</p>
                </div>
              )}
            </div>
          </div>

          {/* Learning Path Sidebar */}
          <aside style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Your Statistics</h3>
              <div style={{ display: 'grid', gap: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF2F2', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
                    <Star size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>Top 5%</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>In Learning Engagement</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0F9FF', color: '#0EA5E9', display: 'grid', placeItems: 'center' }}>
                    <Award size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>12 Badges</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>Earned this semester</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Certificates</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                {completedCourses.length > 0 ? (
                  completedCourses.map(course => (
                    <div key={course.courseID} style={{ 
                      padding: '16px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ color: '#10B981' }}><CheckCircle size={18} /></div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{course.title}</span>
                      </div>
                      <button style={{ color: '#DC2626', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Download size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, textAlign: 'center' }}>No certificates earned yet.</p>
                )}
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px', background: '#1E293B', color: '#fff' }}>
              <Compass size={32} style={{ marginBottom: 20 }} />
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Next Milestones</h3>
              <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6, marginBottom: 24 }}>Complete "Leadership Fundamentals" to unlock the Senior Manager career track.</p>
              <button style={{ 
                width: '100%', padding: '14px', borderRadius: 12, background: '#DC2626', border: 'none',
                color: '#fff', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                View Career Path <ArrowRight size={18} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
