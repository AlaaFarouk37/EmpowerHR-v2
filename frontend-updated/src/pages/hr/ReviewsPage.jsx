import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetReviews, hrCreateReview } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input, Modal, Textarea } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Activity,
  Calendar,
  Mail,
  Zap,
  Target,
  Layers,
  Globe,
  Briefcase,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Send,
  MoreVertical,
  BarChart3
} from 'lucide-react';

export function HRReviewsPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const EMPTY_REVIEW = { employeeID: '', reviewPeriod: '', reviewType: 'Annual', overallRating: 4, strengths: '', improvementAreas: '', goalsSummary: '', reviewDate: '' };
  const [createForm, setCreateForm] = useState(EMPTY_REVIEW);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await hrGetReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load performance reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, []);

  const handleCreate = async () => {
    if (!createForm.employeeID.trim()) { toast('Employee ID is required', 'error'); return; }
    if (!createForm.reviewPeriod.trim()) { toast('Review period is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...createForm, overallRating: Number(createForm.overallRating) };
      if (!payload.reviewDate) delete payload.reviewDate;
      await hrCreateReview(payload);
      toast('Review created', 'success');
      setShowCreate(false);
      setCreateForm(EMPTY_REVIEW);
      await loadReviews();
    } catch (err) {
      toast(err?.message || 'Failed to create review', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      return !searchQuery || 
        r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [reviews, searchQuery]);

  const excellenceStats = useMemo(() => {
    return [
      { label: 'Excellence Index', value: '4.2/5', icon: Star, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Cycle Momentum', value: '82%', icon: Activity, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'High Potential', value: '42', icon: Target, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Pending Triage', value: '05', icon: AlertCircle, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, []);

  const getScoreColor = (score) => {
    if (score >= 4.5) return 'var(--red-800)';
    if (score >= 3.5) return 'var(--red-600)';
    return '#64748B';
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>CALIBRATING EXCELLENCE MATRIX...</div>
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
                 <Star size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Performance Excellence Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Execute performance cycles, calibrate talent excellence, and monitor organizational growth velocity.</p>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
           <Btn variant="secondary" style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 800 }}>
              <BarChart3 size={18} style={{ marginRight: 8, color: 'var(--red-600)' }} /> {t('Strategic Insights')}
           </Btn>
           <Btn
             onClick={() => { setCreateForm(EMPTY_REVIEW); setShowCreate(true); }}
             variant="primary"
             style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
           >
              <Zap size={18} style={{ marginRight: 8 }} /> {t('Initialize Cycle')}
           </Btn>
        </div>
      </div>

      {/* Excellence Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {excellenceStats.map(s => (
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
           <Btn variant="primary" style={{ height: 44, borderRadius: 12, background: 'var(--red-600)', border: 'none', padding: '0 20px', fontWeight: 900 }}>
              {t('Q1 2025')} <ChevronDown size={14} style={{ marginLeft: 8 }} />
           </Btn>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search talent nodes by name or department...')}
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
           <Btn variant="outline" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Export Matrix')}
           </Btn>
        </div>
      </div>

      {/* Neural Performance Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Talent Node', 'Classification', 'Review Cycle', 'Excellence Rating', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredReviews.map((rev, idx) => {
              const status = Math.random() > 0.4 ? 'COMPLETED' : 'PENDING';
              const isHighPerformer = rev.overallRating >= 4.5;
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="review-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)',
                        fontSize: 16, fontWeight: 900
                      }}>
                         {(rev.employeeName || 'U').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{rev.employeeName || 'Anonymous Talent'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{rev.jobTitle || 'Unassigned Role'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                        <Briefcase size={14} style={{ color: 'var(--red-600)' }} />
                        {rev.department || 'Engineering'}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{rev.reviewPeriod}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800 }}>ANNUAL CALIBRATION</div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <div style={{ fontSize: 20, fontWeight: 900, color: getScoreColor(rev.overallRating) }}>{rev.overallRating.toFixed(1)}</div>
                       <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(s => (
                             <Star 
                               key={s} 
                               size={14} 
                               fill={s <= rev.overallRating ? getScoreColor(rev.overallRating) : 'none'} 
                               color={s <= rev.overallRating ? getScoreColor(rev.overallRating) : '#E2E8F0'} 
                             />
                          ))}
                       </div>
                       {isHighPerformer && (
                         <div style={{ padding: '4px 10px', borderRadius: 8, background: 'var(--red-600)', color: '#fff', fontSize: 9, fontWeight: 900, letterSpacing: '0.05em' }}>STAR</div>
                       )}
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={status} 
                      color={status === 'COMPLETED' ? 'green' : 'red'} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <Btn variant="primary" style={{ height: 36, background: '#EAB308', border: 'none', borderRadius: 10, fontSize: 11, fontWeight: 900 }}>Audit Review</Btn>
                       <button className="action-btn" title="Send Notification"><Mail size={18} /></button>
                       <button className="action-btn" title="Strategic Actions"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .review-row:hover { background: #FBFBFF; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('Initialize Performance Cycle')} maxWidth={620}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label={t('Employee ID')} value={createForm.employeeID} onChange={(e) => setCreateForm({ ...createForm, employeeID: e.target.value })} placeholder="EMP-001" />
            <Input label={t('Review Period')} value={createForm.reviewPeriod} onChange={(e) => setCreateForm({ ...createForm, reviewPeriod: e.target.value })} placeholder="Q1 2026" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 6 }}>{t('Review Type')}</label>
              <select value={createForm.reviewType} onChange={(e) => setCreateForm({ ...createForm, reviewType: e.target.value })} style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 12px' }}>
                <option value="Annual">Annual</option>
                <option value="Mid-Year">Mid-Year</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Probation">Probation</option>
              </select>
            </div>
            <Input label={t('Overall Rating (1-5)')} type="number" min={1} max={5} value={createForm.overallRating} onChange={(e) => setCreateForm({ ...createForm, overallRating: e.target.value })} />
            <Input label={t('Review Date')} type="date" value={createForm.reviewDate} onChange={(e) => setCreateForm({ ...createForm, reviewDate: e.target.value })} />
          </div>
          <Textarea label={t('Strengths')} value={createForm.strengths} onChange={(e) => setCreateForm({ ...createForm, strengths: e.target.value })} placeholder="Key strengths observed during this cycle..." />
          <Textarea label={t('Improvement Areas')} value={createForm.improvementAreas} onChange={(e) => setCreateForm({ ...createForm, improvementAreas: e.target.value })} placeholder="Areas of growth..." />
          <Textarea label={t('Goals Summary')} value={createForm.goalsSummary} onChange={(e) => setCreateForm({ ...createForm, goalsSummary: e.target.value })} placeholder="Goals for the next cycle..." />
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setShowCreate(false)}>{t('Cancel')}</Btn>
          <Btn onClick={handleCreate} disabled={saving}>{saving ? t('Creating...') : t('Create Review')}</Btn>
        </div>
      </Modal>
    </div>
  );
}
