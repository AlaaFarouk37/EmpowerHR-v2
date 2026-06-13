import { useState } from 'react';
import { Btn, Badge, Textarea, useToast } from './index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { Check, X, User, Paperclip, CalendarDays } from 'lucide-react';

const STATUS_COLOR = { Pending: 'orange', Approved: 'red', Rejected: 'gray' };

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Small remaining/entitled ring for an employee's balance in that leave type.
function BalanceRing({ balance }) {
  const entitled = balance?.entitledDays;
  const used = balance?.usedDays || 0;
  const uncapped = entitled === null || entitled === undefined;
  const remaining = uncapped ? null : entitled - used;
  const pct = !uncapped && entitled > 0 ? Math.max(0, Math.min(100, (remaining / entitled) * 100)) : 100;
  const color = !uncapped && remaining <= 0 ? '#DC2626' : '#16A34A';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="16" fill="none" stroke="#F1F5F9" strokeWidth="3.5" />
          <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="3.5"
            strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 900, color: '#1E293B' }}>
          {uncapped ? '∞' : remaining}
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
        {uncapped ? 'left' : `of ${entitled}`}
      </div>
    </div>
  );
}

/**
 * Shared leave-request review card (balance ring, document, approve/deny + note).
 * Used by the TL "Team Leave Requests" page and the HR "Leave Management" page.
 *
 * Props:
 *   request  — the leave request (with optional `balance` + `document`).
 *   onReview — async (action: 'approve'|'reject', note: string) => void.
 *              Should perform the review API call and reload; it may throw on failure.
 */
export function LeaveReviewCard({ request, onReview }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const isPending = request.status === 'Pending';

  const review = async (action) => {
    setBusy(true);
    try {
      await onReview(action, note.trim());
      toast(action === 'approve' ? t('Leave request approved.') : t('Leave request denied.'), 'success');
    } catch (error) {
      toast(error.message || t('Failed to review request'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #F1F5F9', padding: 24 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Employee + balance */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 90 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', border: '1px solid var(--red-100)' }}>
            <User size={20} />
          </div>
          <BalanceRing balance={request.balance} />
        </div>

        {/* Details */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{request.employeeName}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red-600)', marginTop: 2 }}>{request.leaveType}</div>
            </div>
            <Badge label={t(request.status)} color={STATUS_COLOR[request.status] || 'gray'} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 800, color: '#475569' }}>
              <CalendarDays size={15} color="#94A3B8" />
              {fmtDate(request.startDate)} → {fmtDate(request.endDate)}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#475569' }}>
              {request.daysRequested} {t('working day(s)')}
            </div>
          </div>

          {request.reason && (
            <div style={{ fontSize: 13.5, color: '#64748B', fontWeight: 600, lineHeight: 1.6, marginBottom: 14, background: '#F8FAFC', borderRadius: 12, padding: '12px 14px', border: '1px solid #F1F5F9' }}>
              <strong style={{ color: '#1E293B' }}>{t('Reason')}:</strong> {request.reason}
            </div>
          )}

          {request.document && (
            <a href={request.document} target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', marginBottom: 14,
              borderRadius: 10, border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB',
              fontSize: 13, fontWeight: 800, textDecoration: 'none',
            }}>
              <Paperclip size={15} /> {t('View attached document')}
            </a>
          )}

          {isPending ? (
            <>
              <Textarea
                label={t('Note (sent with approval / denial)')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('Add a note for the employee...')}
                style={{ minHeight: 70 }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <Btn onClick={() => review('reject')} loading={busy} variant="ghost" style={{ flex: 1 }}>
                  <X size={16} style={{ marginRight: 8 }} /> {t('Deny')}
                </Btn>
                <Btn onClick={() => review('approve')} loading={busy} style={{ flex: 1, background: '#16A34A', border: 'none', fontWeight: 900 }}>
                  <Check size={16} style={{ marginRight: 8 }} /> {t('Approve')}
                </Btn>
              </div>
            </>
          ) : (
            (request.reviewedBy || request.reviewNotes) && (
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, borderTop: '1px dashed #E2E8F0', paddingTop: 12, marginTop: 4 }}>
                {request.reviewedBy && <div><strong style={{ color: '#1E293B' }}>{t('Reviewed by')}:</strong> {request.reviewedBy}</div>}
                {request.reviewNotes && <div style={{ marginTop: 4 }}><strong style={{ color: '#1E293B' }}>{t('Note')}:</strong> {request.reviewNotes}</div>}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
