import { useEffect, useState } from 'react';
import { getTicketDetail, postTicketMessage, adminUpdateTicketStatus } from '../../api/index.js';
import { Modal, Btn, Badge, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { Send, ShieldCheck, User, CheckCircle2 } from 'lucide-react';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed'];

const selectStyle = {
  width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9',
  background: '#fff', padding: '0 12px', outline: 'none', fontWeight: 700, color: '#1E293B',
};

function priorityColor(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'critical':
    case 'high': return 'red';
    case 'medium': return 'orange';
    case 'low': return 'green';
    default: return 'gray';
  }
}

function statusColor(status) {
  switch (status) {
    case 'Resolved': return 'green';
    case 'Closed': return 'gray';
    case 'In Progress': return 'blue';
    default: return 'orange';
  }
}

function formatDateTime(value) {
  if (!value) return '';
  const locale = typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Date(value).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Shared support-ticket conversation. Renders the thread (initial request +
 * every reply), a composer, and — when `isAdmin` — status controls including the
 * special "Resolved" resolution note. Used by both the personal tickets page and
 * the admin tickets management page.
 */
export function TicketConversationModal({ ticketId, isAdmin = false, open, onClose, onChanged }) {
  const toast = useToast();
  const { t } = useLanguage();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const [statusDraft, setStatusDraft] = useState('Open');
  const [resolutionNote, setResolutionNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const load = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const data = await getTicketDetail(ticketId);
      setDetail(data);
      setStatusDraft(data?.status || 'Open');
      setResolutionNote('');
    } catch (error) {
      toast(error.message || t('Failed to load ticket'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && ticketId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId]);

  const isClosed = detail?.status === 'Closed';

  const handleSendReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await postTicketMessage(ticketId, reply.trim());
      setReply('');
      await load();
      onChanged?.();
    } catch (error) {
      toast(error?.response?.data?.error || error.message || t('Failed to send message'), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (statusDraft === 'Resolved' && !resolutionNote.trim()) {
      return toast(t('A resolution note is required when resolving a ticket.'), 'error');
    }
    setSavingStatus(true);
    try {
      const payload = { status: statusDraft };
      if (resolutionNote.trim()) payload.note = resolutionNote.trim();
      const updated = await adminUpdateTicketStatus(ticketId, payload);
      setDetail(updated);
      setStatusDraft(updated?.status || statusDraft);
      setResolutionNote('');
      toast(t('Ticket updated'), 'success');
      onChanged?.();
    } catch (error) {
      toast(error?.response?.data?.note || error?.response?.data?.status || error.message || t('Failed to update ticket'), 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={detail?.subject || t('Support Ticket')} maxWidth={640}>
      {loading || !detail ? (
        <div style={{ padding: 40, display: 'grid', placeItems: 'center' }}><Spinner size={40} /></div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge label={t(detail.category || 'General')} color="gray" />
            <Badge label={t(detail.priority)} color={priorityColor(detail.priority)} />
            <Badge label={t(detail.status)} color={statusColor(detail.status)} />
            {isAdmin && detail.employeeName && (
              <span style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700, marginInlineStart: 'auto' }}>
                {detail.employeeName}
              </span>
            )}
          </div>

          {/* Conversation thread */}
          <div style={{ display: 'grid', gap: 12, maxHeight: 360, overflowY: 'auto', padding: 2 }}>
            <Bubble
              side={isAdmin ? 'left' : 'right'}
              authorRole="Employee"
              authorName={detail.employeeName || t('Requester')}
              body={detail.description || t('(No description provided)')}
              at={detail.createdAt}
              label={t('Initial request')}
              t={t}
            />
            {detail.messages?.map((m) => (
              <Bubble
                key={m.messageID}
                side={(isAdmin ? m.authorRole === 'Admin' : m.authorRole === 'Employee') ? 'right' : 'left'}
                authorRole={m.authorRole}
                authorName={m.authorName}
                body={m.body}
                at={m.createdAt}
                isResolution={m.isResolution}
                t={t}
              />
            ))}
          </div>

          {/* Admin status controls */}
          {isAdmin && (
            <div style={{ background: '#F8FAFC', border: '1.5px solid #F1F5F9', borderRadius: 16, padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('Manage Status')}
              </div>
              <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} style={selectStyle}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
              </select>
              {statusDraft === 'Resolved' && (
                <Textarea
                  label={t('Resolution Note')}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder={t('Explain how the issue was resolved...')}
                  style={{ minHeight: 90 }}
                />
              )}
              <Btn onClick={handleUpdateStatus} loading={savingStatus} variant="primary" style={{ height: 44, borderRadius: 12, background: 'var(--red-600)', border: 'none', fontWeight: 900 }}>
                <CheckCircle2 size={16} style={{ marginRight: 8 }} /> {t('Update Status')}
              </Btn>
            </div>
          )}

          {/* Reply composer */}
          {isClosed ? (
            <div style={{ textAlign: 'center', padding: '14px', borderRadius: 12, background: '#F1F5F9', color: '#64748B', fontWeight: 700, fontSize: 13 }}>
              {t('This ticket is closed. The conversation has ended.')}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <Textarea
                label={isAdmin ? t('Reply to requester') : t('Add a reply')}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t('Type your message...')}
                style={{ minHeight: 80 }}
              />
              <Btn onClick={handleSendReply} loading={sending} variant="primary" disabled={!reply.trim()} style={{ height: 44, borderRadius: 12, background: '#1E293B', border: 'none', fontWeight: 900, justifySelf: 'end', padding: '0 20px' }}>
                <Send size={16} style={{ marginRight: 8 }} /> {t('Send')}
              </Btn>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Bubble({ side, authorRole, authorName, body, at, isResolution, label, t }) {
  const isRight = side === 'right';
  const isAdminAuthor = authorRole === 'Admin';
  const bg = isResolution ? '#ECFDF5' : isAdminAuthor ? 'var(--red-50)' : '#F8FAFC';
  const borderC = isResolution ? '#A7F3D0' : isAdminAuthor ? 'var(--red-100)' : '#F1F5F9';
  return (
    <div style={{ display: 'flex', justifyContent: isRight ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '82%', background: bg, border: `1px solid ${borderC}`, borderRadius: 16, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          {isAdminAuthor ? <ShieldCheck size={13} style={{ color: 'var(--red-600)' }} /> : <User size={13} style={{ color: '#94A3B8' }} />}
          <span style={{ fontSize: 12, fontWeight: 900, color: '#1E293B' }}>{authorName || t(authorRole)}</span>
          {isResolution && <Badge label={t('Resolution')} color="green" />}
          {label && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>· {label}</span>}
        </div>
        <div style={{ fontSize: 13.5, color: '#475569', fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</div>
        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginTop: 6, textAlign: 'end' }}>{formatDateTime(at)}</div>
      </div>
    </div>
  );
}
