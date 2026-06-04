import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetExpenses, hrReviewExpenseClaim } from '../../api/index.js';
import { Badge, Btn, Modal, Spinner, useToast, Input, Textarea } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Activity, 
  Target, 
  Calendar,
  ChevronRight,
  Zap,
  Briefcase,
  AlertCircle,
  Globe,
  Layers,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  SearchCode,
  MoreVertical,
  History,
  CreditCard,
  PieChart
} from 'lucide-react';

export function HRExpensesPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('All Statuses');
  const [savingId, setSavingId] = useState(null);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await hrGetExpenses();
      setClaims(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load expense data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClaims(); }, []);

  // Approve / Reject modal state
  const [reviewModal, setReviewModal] = useState({ open: false, claim: null, action: null });
  const [reviewForm, setReviewForm] = useState({ note: '', approvedAmount: '' });
  const [reviewSaving, setReviewSaving] = useState(false);

  const openApproveModal = (claim) => {
    setReviewForm({ note: '', approvedAmount: String(claim.amount ?? '') });
    setReviewModal({ open: true, claim, action: 'Approved' });
  };
  const openRejectModal = (claim) => {
    setReviewForm({ note: '', approvedAmount: '' });
    setReviewModal({ open: true, claim, action: 'Rejected' });
  };
  const closeReviewModal = () => {
    setReviewModal({ open: false, claim: null, action: null });
    setReviewForm({ note: '', approvedAmount: '' });
  };

  const submitReview = async () => {
    const { claim, action } = reviewModal;
    if (!claim?.claimID) return;
    if (action === 'Rejected' && !reviewForm.note.trim()) {
      toast(t('Please provide a short reason before rejecting this expense claim.'), 'error');
      return;
    }
    if (action === 'Approved') {
      const n = Number(reviewForm.approvedAmount);
      if (!Number.isFinite(n) || n < 0) {
        toast(t('Approved amount must be a non-negative number.'), 'error');
        return;
      }
    }
    setReviewSaving(true);
    setSavingId(claim.claimID);
    try {
      const payload = { status: action, note: reviewForm.note.trim() };
      if (action === 'Approved') payload.approvedAmount = Number(reviewForm.approvedAmount);
      await hrReviewExpenseClaim(claim.claimID, payload);
      toast(action === 'Approved' ? t('Claim approved') : t('Claim rejected'), 'success');
      closeReviewModal();
      await loadClaims();
    } catch (err) {
      const detail = err?.response?.data?.note?.[0]
        || err?.response?.data?.approvedAmount?.[0]
        || err?.response?.data?.error
        || err?.message
        || t('Failed to update expense claim');
      toast(detail, 'error');
    } finally {
      setReviewSaving(false);
      setSavingId(null);
    }
  };

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const matchesSearch = c.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.employeeID?.toString().includes(searchQuery);
      const matchesStatus = activeStatus === 'All Statuses' || c.status === activeStatus;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchQuery, activeStatus]);

  const fiscalStats = useMemo(() => {
    const totalAmount = claims.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
    const pendingCount = claims.filter(c => c.status === 'Submitted' || c.status === 'Pending').length;
    const approvedCount = claims.filter(c => c.status === 'Approved' || c.status === 'Reimbursed').length;
    const rejectedCount = claims.filter(c => c.status === 'Rejected').length;
    const totalReviewed = approvedCount + rejectedCount;
    const approvalRate = totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 0;
    return [
      { label: 'Pending Triage', value: pendingCount, icon: AlertCircle, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Total Fiscal Load', value: `$${totalAmount.toLocaleString()}`, icon: DollarSign, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Approval Velocity', value: `${approvalRate}%`, icon: Activity, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Rejection Index', value: rejectedCount, icon: XCircle, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [claims]);

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING FISCAL GRID...</div>
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
                 <CreditCard size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Global Expense & Fiscal Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit organizational fiscal claims, monitor reimbursement telemetry, and manage policy-aligned expenditures.</p>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
           <Btn variant="secondary" style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 800 }}>
              <PieChart size={18} style={{ marginRight: 8, color: 'var(--red-600)' }} /> {t('Fiscal Analysis')}
           </Btn>
           <Btn 
             onClick={() => toast(t('Exporting Fiscal Ledger...'), 'info')}
             variant="primary" 
             style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
           >
              <Zap size={18} style={{ marginRight: 8 }} /> {t('Export Ledger')}
           </Btn>
        </div>
      </div>

      {/* Fiscal Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {fiscalStats.map(s => (
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
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Statuses">{t('All Fiscal States')}</option>
                 <option value="Submitted">{t('Pending Triage')}</option>
                 <option value="Approved">{t('Authorized Claims')}</option>
                 <option value="Rejected">{t('Deflected Claims')}</option>
                 <option value="Reimbursed">{t('Reimbursed')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search fiscal nodes or categories...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Global Ledger')}
           </Btn>
        </div>
      </div>

      {/* Neural Fiscal Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Fiscal Node', 'Classification', 'Claim Intensity', 'Execution Date', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClaims.map((claim, idx) => {
              const status = claim.status || 'Submitted';
              const isPending = status === 'Submitted' || status === 'Pending';
              const isApproved = status === 'Approved';
              const isRejected = status === 'Rejected';
              const isReimbursed = status === 'Reimbursed';

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="fiscal-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)',
                        fontSize: 16, fontWeight: 900
                      }}>
                         {(claim.employeeName || 'U').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{claim.employeeName || 'Anonymous Node'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>NODE-00{claim.employeeID || 'TEMP'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge label={claim.category || 'OPERATIONAL'} color="indigo" />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--red-600)' }}>
                        ${parseFloat(claim.amount || 0).toLocaleString()}
                     </div>
                     <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>Fiscal Payload</div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                       <Calendar size={14} style={{ color: 'var(--red-600)' }} />
                       {new Date(claim.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge
                      label={status.toUpperCase()}
                      color={isApproved ? 'green' : isRejected ? 'red' : isReimbursed ? 'indigo' : 'yellow'}
                     />
                     {isApproved && claim.approvedAmount != null && (
                       <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 6 }}>
                         {t('Approved')}: ${parseFloat(claim.approvedAmount).toLocaleString()}
                       </div>
                     )}
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       {isPending ? (
                         <>
                           <button
                             className="action-btn"
                             title={t('Approve Claim')}
                             style={{ color: '#22C55E' }}
                             disabled={savingId === claim.claimID}
                             onClick={() => openApproveModal(claim)}
                           >
                             <CheckCircle size={18} />
                           </button>
                           <button
                             className="action-btn"
                             title={t('Reject Claim')}
                             style={{ color: '#EF4444' }}
                             disabled={savingId === claim.claimID}
                             onClick={() => openRejectModal(claim)}
                           >
                             <XCircle size={18} />
                           </button>
                         </>
                       ) : (
                         <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>
                           {claim.reviewedBy ? `${t('Reviewed by')} ${claim.reviewedBy}` : t('Reviewed')}
                         </span>
                       )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Approve / Reject Modal */}
      <Modal
        open={reviewModal.open}
        onClose={closeReviewModal}
        title={reviewModal.action === 'Approved' ? t('Approve Expense Claim') : reviewModal.action === 'Rejected' ? t('Reject Expense Claim') : t('Review Claim')}
        maxWidth={520}
      >
        {reviewModal.claim && (
          <div style={{ display: 'grid', gap: 16, padding: 8 }}>
            <div style={{ padding: 14, background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Claim')}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{reviewModal.claim.title || reviewModal.claim.category}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                {reviewModal.claim.employeeName || reviewModal.claim.employeeID} · {t('Claimed')}: ${parseFloat(reviewModal.claim.amount || 0).toLocaleString()}
              </div>
            </div>

            {reviewModal.action === 'Approved' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>{t('Approved Amount')} *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reviewForm.approvedAmount}
                  onChange={(e) => setReviewForm(f => ({ ...f, approvedAmount: e.target.value }))}
                  placeholder="0.00"
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', padding: '0 14px', fontSize: 13, fontWeight: 600, outline: 'none' }}
                />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                  {t('Pre-filled with claimed amount. Adjust if approving a different figure (e.g. capped by policy).')}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>
                {reviewModal.action === 'Rejected' ? `${t('Reason')} *` : t('Note (optional)')}
              </label>
              <Textarea
                value={reviewForm.note}
                onChange={(e) => setReviewForm(f => ({ ...f, note: e.target.value }))}
                placeholder={reviewModal.action === 'Rejected' ? t('e.g. Missing receipt; resubmit with supporting documentation.') : t('Optional context for the employee.')}
                style={{ minHeight: 100, borderRadius: 12 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <Btn variant="ghost" onClick={closeReviewModal} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 800 }}>{t('Cancel')}</Btn>
              <Btn
                onClick={submitReview}
                disabled={reviewSaving}
                style={{
                  flex: 1, height: 44, borderRadius: 12, fontWeight: 900, border: 'none',
                  background: reviewModal.action === 'Approved' ? '#22C55E' : 'var(--red-600)',
                  color: '#fff',
                }}
              >
                {reviewSaving ? t('Saving...') : reviewModal.action === 'Approved' ? t('Confirm Approval') : t('Confirm Rejection')}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .fiscal-row:hover { background: #FBFBFF; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { border-color: var(--red-100); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
