import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetTraining, hrCreateTraining } from '../../api/index.js';
import { ReportingEngine } from '../../utils/exportEngine.js';
import { Badge, Btn, Spinner, useToast, Input, Modal, Textarea } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  BookOpen, 
  UserPlus, 
  CheckCircle, 
  TrendingUp, 
  Activity, 
  Target, 
  Calendar,
  ChevronRight,
  Zap,
  Award,
  Globe,
  Briefcase,
  Layers,
  Sparkles,
  ChevronDown,
  Brain,
  ShieldCheck,
  SearchCode,
  MoreVertical
} from 'lucide-react';

export function HRTrainingPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const EMPTY_COURSE = { title: '', description: '', category: 'Technical', durationHours: '', dueDate: '' };
  const [createForm, setCreateForm] = useState(EMPTY_COURSE);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await hrGetTraining();
      setCourses(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load training data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCourses(); }, []);

  const handleCreate = async () => {
    if (!createForm.title.trim()) { toast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...createForm };
      if (createForm.durationHours) payload.durationHours = Number(createForm.durationHours);
      else delete payload.durationHours;
      if (!payload.dueDate) delete payload.dueDate;
      await hrCreateTraining(payload);
      toast('Training course created', 'success');
      setShowCreate(false);
      setCreateForm(EMPTY_COURSE);
      await loadCourses();
    } catch (err) {
      toast(err?.message || 'Failed to create training course', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesSearch = c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.courseID?.toString().includes(searchQuery);
      const matchesCategory = activeCategory === 'All Categories' || c.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [courses, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    const cats = new Set(courses.map(c => c.category).filter(Boolean));
    return ['All Categories', ...Array.from(cats)];
  }, [courses]);

  const trainingStats = useMemo(() => {
    const totalLearners = courses.reduce((acc, c) => acc + (c.assignedCount || 0), 0);
    return [
      { label: 'Active Mastery Assets', value: courses.length, icon: BookOpen, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Global Talent Reach', value: totalLearners, icon: Globe, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Mastery Velocity', value: '78.2%', icon: Activity, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Calculated ROI', value: '+$12.4k', icon: TrendingUp, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [courses]);

  const handleExport = () => {
    try {
      const dataToExport = filteredCourses.map(course => ({
        CourseID: course.courseID,
        Title: course.title,
        Category: course.category,
        DurationHours: course.durationHours,
        AssignedCount: course.assignedCount,
        CompletedCount: course.completedCount,
        ProgressPercent: Math.round((course.completedCount / course.assignedCount) * 100 || 0),
        Status: course.status || 'LIVE NODE'
      }));
      
      ReportingEngine.exportToCSV(dataToExport, 'training_curriculum');
      toast(t('Curriculum exported successfully'), 'success');
    } catch (error) {
      toast(t('Failed to export curriculum'), 'error');
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING MASTERY GRID...</div>
       </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Strategic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}>
                 <Brain size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Talent Development Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Execute organizational development cycles, audit mastery telemetry, and monitor skill acquisition velocity.</p>
        </div>

        <Btn 
          onClick={() => { setCreateForm(EMPTY_COURSE); setShowCreate(true); }}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Initialize Mastery Asset')}
        </Btn>
      </div>

      {/* Mastery Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {trainingStats.map(s => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(s.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 24, border: '1.5px solid #F1F5F9', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
           <div style={{ position: 'relative' }}>
              <select 
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 {categories.map(c => <option key={c} value={c}>{t(c)}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search mastery assets...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: 44, padding: '0 16px 0 48px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 600, width: 320, outline: 'none' }} 
              />
           </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
           <Btn variant="secondary" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Filter size={16} style={{ marginRight: 8 }} /> {t('Neural Filters')}
           </Btn>
           <Btn variant="outline" onClick={handleExport} style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Export Curriculum')}
           </Btn>
        </div>
      </div>

      {/* Neural Asset Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Mastery Asset', 'Classification', 'Node Participation', 'Mastery Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((course, idx) => {
              const progress = Math.round((course.completedCount / course.assignedCount) * 100 || 0);
              const isHighMastery = progress > 80;
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="course-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)'
                      }}>
                         <BookOpen size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{course.title}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{course.durationHours} Hours • ASSET-{course.courseID}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge label={course.category} color="indigo" />
                  </td>
                  <td style={{ padding: '24px 32px', minWidth: 200 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                           <div style={{ width: `${progress}%`, height: '100%', background: isHighMastery ? 'var(--red-600)' : 'var(--red-400)', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: isHighMastery ? 'var(--red-800)' : '#1E293B', width: 40 }}>{progress}%</span>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={course.status || 'LIVE NODE'} 
                      color={course.status === 'Closed' ? 'red' : 'green'} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Performance"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Enroll Talent Node"><UserPlus size={18} /></button>
                       <button className="action-btn" title="Issue Certification"><Award size={18} /></button>
                       <button className="action-btn" title="Options"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .course-row:hover { background: #FBFBFF; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('Initialize Training Course')} maxWidth={620}>
        <div style={{ display: 'grid', gap: 14 }}>
          <Input label={t('Course Title')} value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. Leadership Fundamentals" />
          <Textarea label={t('Description')} value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>{t('Category')}</label>
              <select value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 12px' }}>
                <option value="Technical">Technical</option>
                <option value="Leadership">Leadership</option>
                <option value="Compliance">Compliance</option>
                <option value="Soft Skills">Soft Skills</option>
                <option value="Onboarding">Onboarding</option>
              </select>
            </div>
            <Input label={t('Duration (hours)')} type="number" min={1} value={createForm.durationHours} onChange={(e) => setCreateForm({ ...createForm, durationHours: e.target.value })} />
            <Input label={t('Due Date')} type="date" value={createForm.dueDate} onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })} />
          </div>
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowCreate(false)}>{t('Cancel')}</Btn>
          <Btn onClick={handleCreate} disabled={saving}>{saving ? t('Creating...') : t('Create Course')}</Btn>
        </div>
      </Modal>
    </div>
  );
}
