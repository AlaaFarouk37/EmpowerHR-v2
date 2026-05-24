import { useEffect, useMemo, useState } from 'react';
import { getMyDocuments, submitDocumentRequest } from '../../api/index.js';
import { Badge, Btn, Input, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileBox, 
  Briefcase,
  Layers,
  Sparkles,
  SearchCode
} from 'lucide-react';

const INITIAL_FORM = {
  documentType: 'Employment Letter',
  purpose: '',
  notes: '',
};

const STATUS_COLORS = {
  Pending: 'orange',
  'In Progress': 'indigo',
  Issued: 'green',
  Declined: 'red',
};

const daysSinceDate = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.floor((today - date) / (1000 * 60 * 60 * 24));
};

const getDocumentTone = (item) => {
  if (item?.status === 'Pending' && daysSinceDate(item?.createdAt) > 3) return 'red';
  if (item?.status === 'Issued') return 'green';
  if (item?.status === 'In Progress') return 'orange';
  return STATUS_COLORS[item?.status] || 'gray';
};

const getDocumentAgeLabel = (value, t) => {
  const days = daysSinceDate(value);
  if (!Number.isFinite(days)) return t('No date recorded');
  if (days === 0) return t('Today');
  if (days === 1) return t('1 day ago');
  return `${days} ${t('days ago')}`;
};

export function EmployeeDocumentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadDocuments = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyDocuments(user.employee_id);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || 'Failed to load document requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user?.employee_id]);

  const stats = useMemo(() => ({
    total: documents.length,
    pending: documents.filter((item) => ['Pending', 'In Progress'].includes(item.status)).length,
    issued: documents.filter((item) => item.status === 'Issued').length,
  }), [documents]);

  const inProgressCount = documents.filter((item) => item.status === 'In Progress').length;
  const declinedCount = documents.filter((item) => item.status === 'Declined').length;
  const recentRequestsCount = documents.filter((item) => daysSinceDate(item.createdAt) <= 30).length;

  const documentFocusQueue = useMemo(() => {
    const statusRank = { Pending: 4, 'In Progress': 3, Declined: 2, Issued: 1 };
    return [...documents]
      .sort((a, b) => (statusRank[b.status] || 0) - (statusRank[a.status] || 0)
        || daysSinceDate(b.createdAt) - daysSinceDate(a.createdAt)
        || String(a.documentType || '').localeCompare(String(b.documentType || '')))
      .slice(0, 4);
  }, [documents]);

  const documentPlaybook = useMemo(() => {
    const plays = [];

    if (stats.pending > 0) {
      plays.push({
        title: t('Watch open document requests'),
        note: t('Pending or in-progress requests are the clearest place to monitor fulfillment timing and follow-up.'),
      });
    }
    if (inProgressCount > 0) {
      plays.push({
        title: t('Track requests underway'),
        note: t('Requests in progress usually need less follow-up, but they are worth checking before urgent deadlines.'),
      });
    }
    if (declinedCount > 0) {
      plays.push({
        title: t('Review declined requests'),
        note: t('A declined request often just needs clearer purpose or supporting detail before resubmission.'),
      });
    }

    return plays.length ? plays.slice(0, 4) : [{
      title: t('Document flow is stable'),
      note: t('Your document-request activity is currently light. Keep using clear request notes when new needs come up.'),
    }];
  }, [declinedCount, inProgressCount, recentRequestsCount, stats.pending, t]);

  const handleSubmit = async () => {
    if (!form.purpose.trim()) {
      toast('Purpose is required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await submitDocumentRequest({
        documentType: form.documentType,
        purpose: form.purpose.trim(),
        notes: form.notes.trim(),
      });
      toast('Document request submitted', 'success');
      setForm(INITIAL_FORM);
      await loadDocuments();
    } catch (error) {
      toast(error.message || 'Failed to submit document request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid #E0E7FF', borderTopColor: '#4F46E5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING DOCUMENTS...</div>
       </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Supportive Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#4F46E5', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(79, 70, 229, 0.2)' }}>
                 <FileText size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{t('My Document Hub')}</h1>
           </div>
           <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('Request official HR letters and certificates, and track their issuance status seamlessly.')}</p>
        </div>
      </div>

      {/* Document Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F8FAFC', color: '#1E293B', display: 'grid', placeItems: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Total Requests')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.total}</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FFF7ED', color: '#EA580C', display: 'grid', placeItems: 'center' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Open Requests')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.pending}</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#ECFDF5', color: '#10B981', display: 'grid', placeItems: 'center' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Issued Documents')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.issued}</div>
          </div>
        </div>
        <div style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#FEF2F2', color: '#EF4444', display: 'grid', placeItems: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Declined')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{declinedCount}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 32 }}>
        {/* Request Form Area */}
        <div style={{ display: 'grid', gap: 24, alignContent: 'start', position: 'sticky', top: 24 }}>
          <div style={{ background: '#fff', borderRadius: 32, padding: '32px', border: '1.5px solid #F1F5F9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
               <FileBox size={20} style={{ color: '#4F46E5' }} />
               <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{t('Request New Document')}</div>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Document Type')}</label>
                <select 
                  value={form.documentType} 
                  onChange={(e) => setForm((prev) => ({ ...prev, documentType: e.target.value }))} 
                  style={{ width: '100%', padding: '0 16px', height: 48, borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontWeight: 800, color: '#1E293B', outline: 'none' }}
                >
                  {['Salary Certificate', 'Employment Letter', 'Experience Letter', 'ID Verification'].map((item) => <option key={item} value={item}>{t(item)}</option>)}
                </select>
              </div>

              <Input 
                label={t('Purpose')} 
                value={form.purpose} 
                onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))} 
                placeholder={t('E.g. Bank account update / Embassy request')} 
                style={{ height: 48, borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#F8FAFC', padding: '0 16px', fontWeight: 600 }}
              />
              
              <Textarea 
                label={t('Additional Notes')} 
                value={form.notes} 
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} 
                placeholder={t('Add any specific wording or urgency details')} 
                style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '16px', minHeight: 100, fontWeight: 600 }}
              />

              <Btn 
                onClick={handleSubmit} 
                disabled={submitting} 
                style={{ background: '#4F46E5', height: 48, borderRadius: 14, fontWeight: 900, border: 'none', color: '#fff', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)', width: '100%' }}
              >
                {submitting ? t('Submitting...') : <><Send size={18} style={{ marginRight: 8 }} /> {t('Submit Request')}</>}
              </Btn>
            </div>
          </div>

          {/* Supportive Playbook */}
          <div style={{ background: '#EEF2FF', borderRadius: 32, padding: '32px', border: '1.5px solid #E0E7FF', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.05)' }}>
             <div style={{ fontSize: 14, fontWeight: 900, color: '#3730A3', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 24 }}>{t('Document Playbook')}</div>
             <div style={{ display: 'grid', gap: 16 }}>
                {documentPlaybook.map((play, idx) => (
                  <div key={idx} style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '1px solid #E0E7FF' }}>
                     <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', marginBottom: 6 }}>{play.title}</div>
                     <div style={{ fontSize: 13, color: '#475569', fontWeight: 600, lineHeight: 1.5 }}>{play.note}</div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* My Requests Ledger */}
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
             <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B' }}>{t('Request History')}</h2>
          </div>

          {documents.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 32, padding: '60px 40px', textAlign: 'center', border: '1.5px dashed #E2E8F0' }}>
               <Sparkles size={48} style={{ color: '#E2E8F0', margin: '0 auto 16px' }} />
               <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>{t('No Documents Yet')}</div>
               <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600 }}>{t('Your requested documents will appear here.')}</div>
            </div>
          ) : (
            documents.map((item) => (
              <div key={item.requestID} style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: '24px 32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', transition: 'transform 0.2s' }} className="doc-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                     <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: '#EEF2FF', 
                        display: 'grid', placeItems: 'center', color: '#4F46E5', border: '1px solid #E0E7FF'
                      }}>
                         <Briefcase size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>{item.documentType}</div>
                        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>{getDocumentAgeLabel(item.createdAt, t)}</div>
                      </div>
                  </div>
                  <Badge label={t(item.status)} color={getDocumentTone(item)} />
                </div>
                
                <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '16px', border: '1px solid #F1F5F9', marginBottom: 16 }}>
                   <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Purpose')}</div>
                   <div style={{ fontSize: 14, color: '#1E293B', fontWeight: 600 }}>{item.purpose}</div>
                   {item.notes && (
                     <div style={{ marginTop: 12, fontSize: 13, color: '#64748B', fontWeight: 600, borderTop: '1px dashed #E2E8F0', paddingTop: 12 }}>
                        {item.notes}
                     </div>
                   )}
                </div>

                {item.reviewNote && (
                  <div style={{ background: '#FFFBEB', borderRadius: 16, padding: '16px', border: '1px solid #FEF3C7' }}>
                     <div style={{ fontSize: 11, fontWeight: 900, color: '#D97706', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>{t('HR Note')}</div>
                     <div style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>{item.reviewNote}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .doc-row:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border-color: #E0E7FF; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
