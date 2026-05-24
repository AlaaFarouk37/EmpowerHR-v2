import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getForms, submitFeedback } from '../../api/index.js';
import { Spinner, Modal, Btn, Badge, useToast } from '../../components/shared/index.jsx';
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from '../../context/LanguageContext';
import { 
  MessageSquare, 
  Send, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  History,
  Target
} from 'lucide-react';

function RatingButtons({ question, value, onChange, disabled }) {
  const { t } = useLanguage();

  if (question.fieldType === 'score_1_4') {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {[1, 2, 3, 4].map(s => (
            <button 
              key={s} 
              disabled={disabled} 
              onClick={() => onChange(s)} 
              style={{
                flex: 1, height: 60, borderRadius: 16,
                border: `2px solid ${value === s ? '#DC2626' : '#F1F5F9'}`,
                background: value === s ? '#FEF2F2' : '#fff',
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                transition: 'all 0.2s ease',
                boxShadow: value === s ? '0 4px 12px rgba(220, 38, 38, 0.1)' : 'none',
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 900, color: value === s ? '#DC2626' : '#64748B' }}>{s}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>
          <span>Needs Improvement</span><span>Excellent</span>
        </div>
      </div>
    );
  }
  if (question.fieldType === 'boolean') {
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        {[true, false].map(v => (
          <button 
            key={String(v)} 
            disabled={disabled} 
            onClick={() => onChange(v)} 
            style={{
              flex: 1, padding: '16px', borderRadius: 16, fontWeight: 800,
              border: `2px solid ${value === v ? '#DC2626' : '#F1F5F9'}`,
              background: value === v ? '#FEF2F2' : '#fff',
              color: value === v ? '#DC2626' : '#64748B',
              cursor: disabled ? 'default' : 'pointer', 
              transition: 'all 0.2s ease',
            }}
          >
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    );
  }
  return (
    <input 
      type="text" 
      disabled={disabled}
      value={value ?? ''} 
      onChange={e => onChange(e.target.value)}
      placeholder="Type your response..."
      style={{
        width: '100%', padding: '16px 20px', background: '#F8FAFC', 
        border: '2px solid #F1F5F9', borderRadius: 16, fontSize: 15, fontWeight: 600, 
        outline: 'none', color: '#1E293B'
      }}
    />
  );
}

export function EmployeeFeedbackPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const EMPLOYEE_ID = user?.employee_id;
  const toast = useToast();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getForms(EMPLOYEE_ID);
      setForms(Array.isArray(data) ? data : []);
    } catch { toast('Failed to load feedback forms', 'error'); }
    setLoading(false);
  }, [EMPLOYEE_ID, toast]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (form) => {
    if (!form?.questions) return;
    const unanswered = form.questions.filter(q => answers[q.questionID] === undefined);
    if (unanswered.length > 0) return toast('Please complete all questions', 'error');

    setSubmitting(true);
    try {
      const payload = {
        employeeID: EMPLOYEE_ID,
        answers: form.questions.map(q => ({
          questionID: q.questionID,
          scoreValue: q.fieldType === 'score_1_4' ? answers[q.questionID] : undefined,
          booleanValue: q.fieldType === 'boolean' ? answers[q.questionID] : undefined,
          decimalValue: q.fieldType === 'decimal' ? parseFloat(answers[q.questionID]) : undefined,
        })),
      };
      await submitFeedback(form.formID, payload);
      toast('Feedback submitted successfully');
      setOpenForm(null);
      load();
    } catch (e) {
      toast('Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingForms = forms.filter(f => f.submission?.status !== 'Completed');
  const completedForms = forms.filter(f => f.submission?.status === 'Completed');

  if (loading) return <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}><Spinner size="lg" color="#DC2626" /></div>;

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Feedback & Reviews</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Help us improve by providing your honest feedback</p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="glass-card-employee" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626' }} />
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{pendingForms.length} Action Required</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Main Content Area */}
          <div style={{ display: 'grid', gap: 24 }}>
            {pendingForms.length > 0 ? (
              pendingForms.map(form => (
                <div key={form.formID} className="glass-card-employee" style={{ padding: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                    <div style={{ display: 'flex', gap: 24 }}>
                      <div style={{ width: 64, height: 64, borderRadius: 20, background: '#FEF2F2', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
                        <Target size={32} />
                      </div>
                      <div>
                        <Badge label="New Survey" color="red" />
                        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', margin: '8px 0 4px 0' }}>{form.title}</h2>
                        <p style={{ color: '#64748B', fontWeight: 500 }}>{form.description || 'Provide your insights for the current cycle.'}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 32 }}>
                    {form.questions?.map((q, i) => (
                      <div key={q.questionID}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', marginBottom: 16 }}>
                          <span style={{ color: '#DC2626', marginRight: 8 }}>{i + 1}.</span> {q.questionText}
                        </div>
                        <RatingButtons 
                          question={q} 
                          value={answers[q.questionID]} 
                          onChange={(val) => setAnswers({...answers, [q.questionID]: val})} 
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 48, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleSubmit(form)}
                      disabled={submitting}
                      className="btn-red-primary"
                      style={{ padding: '16px 40px', borderRadius: 16 }}
                    >
                      {submitting ? 'Submitting...' : 'Submit Feedback'}
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card-employee" style={{ padding: '80px', textAlign: 'center' }}>
                <CheckCircle2 size={64} color="#10B981" style={{ marginBottom: 24 }} />
                <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', marginBottom: 12 }}>You're All Caught Up!</h2>
                <p style={{ color: '#64748B', fontWeight: 600 }}>No pending feedback forms at this time. We'll notify you when a new survey is available.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <History size={20} color="#DC2626" />
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Feedback History</h3>
              </div>
              <div style={{ display: 'grid', gap: 16 }}>
                {completedForms.length > 0 ? (
                  completedForms.map(form => (
                    <div key={form.formID} style={{ padding: 16, background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                      <div style={{ fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{form.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>Submitted 2 days ago</span>
                        <Badge label="Completed" color="green" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, textAlign: 'center', margin: 0 }}>No completed reviews yet.</p>
                )}
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px', background: '#1E293B', color: '#fff' }}>
              <TrendingUp size={32} style={{ marginBottom: 20 }} />
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Feedback Impact</h3>
              <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6, marginBottom: 20 }}>Your feedback helps us shape a better workplace for everyone. Every response is carefully reviewed by our leadership team.</p>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', marginBottom: 20 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>
                Learn more about our process <ArrowRight size={16} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

