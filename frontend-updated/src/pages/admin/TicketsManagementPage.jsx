import { useEffect, useMemo, useState } from 'react';
import { adminGetTickets } from '../../api/index.js';
import { Badge, Spinner, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { TicketConversationModal } from '../shared/TicketConversationModal.jsx';
import { Search, Ticket, MessageSquare, LifeBuoy, Clock, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_FILTERS = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'];

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
  if (!value) return '—';
  const locale = typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Date(value).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Admin support-ticket management. Lists every ticket; clicking one opens the
 * conversation thread where the admin can reply and change status (Resolved
 * requires a resolution note). Closing a ticket ends the conversation.
 */
export function AdminTicketsManagementPage() {
  const toast = useToast();
  const { t } = useLanguage();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await adminGetTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || t('Failed to load support tickets'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const stats = useMemo(() => ([
    { label: t('Open'), value: tickets.filter((x) => x.status === 'Open').length, icon: LifeBuoy, color: 'var(--red-600)' },
    { label: t('In Progress'), value: tickets.filter((x) => x.status === 'In Progress').length, icon: Clock, color: '#2563EB' },
    { label: t('Resolved'), value: tickets.filter((x) => x.status === 'Resolved').length, icon: CheckCircle2, color: '#16A34A' },
    { label: t('Closed'), value: tickets.filter((x) => x.status === 'Closed').length, icon: XCircle, color: '#64748B' },
  ]), [tickets, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((x) => {
      const matchesStatus = statusFilter === 'All' || x.status === statusFilter;
      const matchesSearch = !q
        || x.subject?.toLowerCase().includes(q)
        || x.employeeName?.toLowerCase().includes(q)
        || x.ticketID?.toString().toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [tickets, search, statusFilter]);

  if (loading) return <div style={{ height: '60vh', display: 'grid', placeItems: 'center' }}><Spinner size={48} /></div>;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: 20, borderRadius: 20, background: '#fff', border: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F8FAFC', color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                height: 40, padding: '0 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 800,
                border: '1.5px solid ' + (statusFilter === s ? 'var(--red-600)' : '#F1F5F9'),
                background: statusFilter === s ? 'var(--red-600)' : '#fff',
                color: statusFilter === s ? '#fff' : '#475569',
              }}
            >
              {t(s)}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder={t('Search subject, employee or ID...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: 40, padding: '0 14px 0 44px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#fff', fontSize: 13, fontWeight: 600, width: 320, outline: 'none' }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Subject', 'Employee', 'Category', 'Priority', 'Status', 'Last Update', ''].map((h, i) => (
                <th key={i} style={{ padding: '16px 24px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h ? t(h) : ''}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontWeight: 700 }}>{t('No tickets match your filters.')}</td></tr>
            ) : filtered.map((ticket) => (
              <tr
                key={ticket.ticketID}
                onClick={() => setSelectedId(ticket.ticketID)}
                className="admin-ticket-row"
                style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
              >
                <td style={{ padding: '18px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', border: '1px solid var(--red-100)' }}>
                      <Ticket size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{ticket.subject}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>NODE-{ticket.ticketID?.toString().slice(0, 8)}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '18px 24px', fontSize: 13, fontWeight: 700, color: '#475569' }}>{ticket.employeeName || '—'}</td>
                <td style={{ padding: '18px 24px', fontSize: 13, fontWeight: 700, color: '#475569' }}>{t(ticket.category || 'General')}</td>
                <td style={{ padding: '18px 24px' }}><Badge label={t(ticket.priority)} color={priorityColor(ticket.priority)} /></td>
                <td style={{ padding: '18px 24px' }}><Badge label={t(ticket.status)} color={statusColor(ticket.status)} /></td>
                <td style={{ padding: '18px 24px', fontSize: 12.5, fontWeight: 600, color: '#94A3B8' }}>{formatDateTime(ticket.updatedAt)}</td>
                <td style={{ padding: '18px 24px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--red-600)', fontWeight: 800, fontSize: 13 }}>
                    <MessageSquare size={16} /> {t('Open')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TicketConversationModal
        open={!!selectedId}
        ticketId={selectedId}
        isAdmin
        onClose={() => setSelectedId(null)}
        onChanged={loadTickets}
      />

      <style dangerouslySetInnerHTML={{ __html: `.admin-ticket-row:hover { background: #FBFBFF; }` }} />
    </div>
  );
}
