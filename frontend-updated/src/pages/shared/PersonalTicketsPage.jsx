import { useEffect, useMemo, useState } from 'react';
import { getMyTickets, submitSupportTicket } from '../../api/index.js';
import { Badge, Btn, Input, Spinner, Textarea, useToast, Modal } from '../../components/shared/index.jsx';
import { TicketConversationModal } from './TicketConversationModal.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LifeBuoy,
  Plus,
  Ticket,
  Clock,
  CheckCircle,
  History as HistoryIcon,
  MessageSquare,
  Tag,
} from 'lucide-react';

const INITIAL_FORM = {
  subject: '',
  category: 'General',
  priority: 'Medium',
  description: '',
};

const CATEGORY_OPTIONS = ['General', 'IT', 'Payroll', 'Benefits', 'Policy'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const CLOSED_STATUSES = ['Resolved', 'Closed'];

const selectStyle = {
  width: '100%', height: 48, borderRadius: 14, border: '1.5px solid #F1F5F9',
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
    default: return 'orange'; // Open
  }
}

function formatDate(value) {
  if (!value) return '—';
  const locale = typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Date(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Shared support-ticket workspace used identically by Employee, Team Leader and
 * HR Manager (each is an internal employee). Lets the signed-in user open a new
 * SupportTicket, see their pending tickets, and review the last 6 months of history.
 */
export function PersonalTicketsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedId, setSelectedId] = useState(null);

  const loadTickets = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyTickets(user.employee_id);
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || t('Failed to load tickets'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, [user?.employee_id]);

  const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async () => {
    if (!form.subject.trim()) return toast(t('Subject is required'), 'error');
    setSubmitting(true);
    try {
      await submitSupportTicket({
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
      });
      toast(t('Ticket created successfully'), 'success');
      setForm(INITIAL_FORM);
      setIsModalOpen(false);
      await loadTickets();
    } catch (error) {
      toast(error?.response?.data?.subject?.[0] || error.message || t('Failed to create ticket'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const { pending, history } = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const pendingList = [];
    const historyList = [];
    for (const ticket of tickets) {
      if (!CLOSED_STATUSES.includes(ticket.status)) {
        pendingList.push(ticket);
      } else if (new Date(ticket.updatedAt || ticket.createdAt) >= sixMonthsAgo) {
        historyList.push(ticket);
      }
    }
    return { pending: pendingList, history: historyList };
  }, [tickets]);

  if (loading) {
    return <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}><Spinner size={48} /></div>;
  }

  return (
    <div className="page-content animate-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220,38,38,0.2)' }}>
            <LifeBuoy size={24} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Support Tickets')}</h1>
            <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>{t('Raise a request and track your support tickets in one place.')}</p>
          </div>
        </div>
        <Btn onClick={() => setIsModalOpen(true)} variant="primary" style={{ height: 48, borderRadius: 14, padding: '0 22px', fontWeight: 900, background: 'var(--red-600)', border: 'none' }}>
          <Plus size={18} style={{ marginRight: 8 }} /> {t('Create New Ticket')}
        </Btn>
      </div>

      {/* Pending */}
      <Section
        icon={<Clock size={18} />}
        title={t('Pending Tickets')}
        count={pending.length}
        emptyIcon={<CheckCircle size={44} color="#10B981" />}
        emptyText={t('No pending tickets. Need help? Create a ticket and we will get back to you.')}
        tickets={pending}
        onSelect={setSelectedId}
        t={t}
      />

      {/* History */}
      <div style={{ marginTop: 40 }}>
        <Section
          icon={<HistoryIcon size={18} />}
          title={t('History · Last 6 Months')}
          count={history.length}
          emptyIcon={<HistoryIcon size={44} color="#94A3B8" />}
          emptyText={t('No resolved or closed tickets in the last 6 months.')}
          tickets={history}
          onSelect={setSelectedId}
          t={t}
        />
      </div>

      {/* Create Ticket Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('Create New Support Ticket')}>
        <div style={{ display: 'grid', gap: 20 }}>
          <Input
            label={t('Subject')}
            value={form.subject}
            onChange={setField('subject')}
            placeholder={t('What do you need help with?')}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>{t('Category')}</label>
              <select value={form.category} onChange={setField('category')} style={selectStyle}>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{t(c)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>{t('Priority')}</label>
              <select value={form.priority} onChange={setField('priority')} style={selectStyle}>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{t(p)}</option>)}
              </select>
            </div>
          </div>
          <Textarea
            label={t('Description')}
            value={form.description}
            onChange={setField('description')}
            placeholder={t('Please provide as much detail as possible...')}
            style={{ minHeight: 120 }}
          />
          <Btn onClick={handleSubmit} loading={submitting} variant="primary" style={{ height: 48, borderRadius: 14, background: 'var(--red-600)', border: 'none', fontWeight: 900 }}>
            {t('Submit Support Request')}
          </Btn>
        </div>
      </Modal>

      {/* Conversation thread */}
      <TicketConversationModal
        open={!!selectedId}
        ticketId={selectedId}
        isAdmin={false}
        onClose={() => setSelectedId(null)}
        onChanged={loadTickets}
      />
    </div>
  );
}

function Section({ icon, title, count, tickets, emptyIcon, emptyText, onSelect, t }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ color: 'var(--red-600)' }}>{icon}</span>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>{title}</h2>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#94A3B8', background: '#F1F5F9', padding: '2px 10px', borderRadius: 999 }}>{count}</span>
      </div>

      {tickets.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9' }}>
          <div style={{ marginBottom: 16 }}>{emptyIcon}</div>
          <p style={{ color: '#64748B', fontWeight: 600, margin: 0 }}>{emptyText}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {tickets.map((ticket) => <TicketCard key={ticket.ticketID} ticket={ticket} onSelect={onSelect} t={t} />)}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, onSelect, t }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(ticket.ticketID)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(ticket.ticketID); } }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red-200, #FECACA)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#F1F5F9'; e.currentTarget.style.transform = 'translateY(0)'; }}
      style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #F1F5F9', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 14, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', flexShrink: 0, border: '1px solid var(--red-100)' }}>
            <Ticket size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>{ticket.subject}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94A3B8', fontWeight: 700, marginTop: 4 }}>
              <Tag size={13} style={{ color: 'var(--red-600)' }} />
              {t(ticket.category || 'General')}
              <span>•</span>
              <span>NODE-{ticket.ticketID?.toString().slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Badge label={t(ticket.priority)} color={priorityColor(ticket.priority)} />
          <Badge label={t(ticket.status)} color={statusColor(ticket.status)} />
        </div>
      </div>

      {ticket.description && (
        <p style={{ color: '#64748B', fontWeight: 500, lineHeight: 1.6, margin: '0 0 14px' }}>{ticket.description}</p>
      )}

      {ticket.resolutionNote && (
        <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{t('Resolution Note')}</div>
          <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>{ticket.resolutionNote}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 14, borderTop: '1px solid #F1F5F9', fontSize: 12.5, color: '#94A3B8', fontWeight: 700 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={14} /> {t('Opened')} {formatDate(ticket.createdAt)}
        </span>
        <span>
          {CLOSED_STATUSES.includes(ticket.status)
            ? `${t('Closed')} ${formatDate(ticket.resolvedAt || ticket.updatedAt)}`
            : `${t('Updated')} ${formatDate(ticket.updatedAt)}`}
        </span>
      </div>
    </div>
  );
}
