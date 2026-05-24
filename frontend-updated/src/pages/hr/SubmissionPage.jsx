import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetSubmissions, hrGetForms } from '../../api/index.js';
import { Spinner, Badge, Btn, useToast, Input } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  MessageSquare, 
  Smile, 
  Frown, 
  Meh,
  Activity,
  Calendar,
  AlertCircle,
  Globe,
  Layers,
  ChevronDown,
  Sparkles,
  SearchCode,
  MoreVertical,
  Zap,
  TrendingUp
} from 'lucide-react';

export function HRSubmissionPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [submissions, setSubmissions] = useState([]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSentiment, setActiveSentiment] = useState('All Sentiments');

  const loadData = async () => {
    setLoading(true);
    try {
      const formsData = await hrGetForms();
      const firstFormId = formsData?.[0]?.formID;
      if (firstFormId) {
        const subsData = await hrGetSubmissions(firstFormId);
        setSubmissions(Array.isArray(subsData) ? subsData : []);
      }
      setForms(formsData || []);
    } catch { toast('Failed to load submissions', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const getSentimentScore = (sub, idx) => {
    // Deterministic pseudo-random sentiment for demo based on index
    const pseudoScore = ((idx * 7) % 5) + 1;
    return pseudoScore;
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub, idx) => {
      const matchesSearch = sub.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            sub.employeeID?.toString().includes(searchQuery);
      
      const score = getSentimentScore(sub, idx);
      const sentimentLabel = score >= 3.5 ? 'Positive' : score >= 2.5 ? 'Neutral' : 'Negative';
      const matchesSentiment = activeSentiment === 'All Sentiments' || sentimentLabel === activeSentiment;
      
      return matchesSearch && matchesSentiment;
    });
  }, [submissions, searchQuery, activeSentiment]);

  const getSentimentColor = (score) => {
    if (score >= 3.5) return 'var(--red-600)';
    if (score >= 2.5) return '#F59E0B';
    return 'var(--pink-600)';
  };

  const submissionStats = useMemo(() => {
    return [
      { label: 'Total Payloads', value: submissions.length || 0, icon: MessageSquare, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Global Sentiment', value: '4.2/5', icon: Smile, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Critical Feedback', value: '14', icon: AlertCircle, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
      { label: 'Resolved Vectors', value: '840', icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
    ];
  }, [submissions]);

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING SENTIMENT GRID...</div>
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
                 <MessageSquare size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Submission Intelligence</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit raw form payloads, map organizational sentiment vectors, and resolve critical feedback.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing Intelligence Export...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Export Payloads')}
        </Btn>
      </div>

      {/* Sentiment Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {submissionStats.map(s => (
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
                value={activeSentiment}
                onChange={(e) => setActiveSentiment(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Sentiments">{t('All Intelligence Vectors')}</option>
                 <option value="Positive">{t('Positive Resonance')}</option>
                 <option value="Neutral">{t('Neutral Stability')}</option>
                 <option value="Negative">{t('Critical Anomalies')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search organizational payloads...')}
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
              <TrendingUp size={16} style={{ marginRight: 8 }} /> {t('Sentiment Trends')}
           </Btn>
        </div>
      </div>

      {/* Neural Submission Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Talent Node', 'Intelligence Source', 'Execution Date', 'Sentiment Vector', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map((sub, idx) => {
              const score = getSentimentScore(sub, idx);
              const isNegative = score < 2.5;
              const isPositive = score >= 3.5;
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isNegative ? 'rgba(219, 39, 119, 0.02)' : 'transparent' }} className="sub-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: 10, background: '#F8FAFC', 
                        display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, color: 'var(--red-600)',
                        border: '1.5px solid #F1F5F9'
                      }}>
                         {(sub.employeeName || 'A').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{sub.employeeName || 'Anonymous Node'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>ID: {sub.employeeID || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>Performance Calibration</div>
                     <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>STRATEGIC FORM</div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                       <Calendar size={14} style={{ color: 'var(--red-600)' }} />
                       {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '2025-03-12'}
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px', minWidth: 200 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                           <div style={{ width: `${(score / 5) * 100}%`, height: '100%', background: getSentimentColor(score), borderRadius: 4 }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 44, color: getSentimentColor(score) }}>
                           {isPositive ? <Smile size={16} /> : isNegative ? <Frown size={16} /> : <Meh size={16} />}
                        </div>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Raw Payload"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Resolve Flag" style={{ color: '#10B981' }}><CheckCircle size={18} /></button>
                       <button className="action-btn" title="Tactical Options"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredSubmissions.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
             <MessageSquare size={48} style={{ color: '#E2E8F0', margin: '0 auto 16px' }} />
             <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{t('No intelligence payloads found.')}</div>
             <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>{t('Adjust your filters or deploy a new intelligence node.')}</div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sub-row:hover { background: #FBFBFF; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
