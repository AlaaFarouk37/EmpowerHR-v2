import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetTickets, hrUpdateTicketStatus } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  UserPlus,
  Activity,
  Calendar,
  MoreVertical,
  LifeBuoy,
  ShieldAlert,
  Zap,
  Layers,
  ChevronDown,
  Globe,
  Sparkles,
  SearchCode,
  Tag,
  XCircle
} from 'lucide-react';

export function HRTicketsPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePriority, setActivePriority] = useState('All Priorities');
  const [savingId, setSavingId] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await hrGetTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load support tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const handleUpdateStatus = async (ticket, status) => {
    if (!ticket?.ticketID || savingId === ticket.ticketID) return;
    setSavingId(ticket.ticketID);
    try {
      await hrUpdateTicketStatus(ticket.ticketID, { status, note: '' });
      toast(`Ticket "${ticket.subject}" → ${status}`, 'success');
      await loadTickets();
    } catch (err) {
      toast(err?.message || 'Failed to update ticket', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.ticketID?.toString().includes(searchQuery);
      const matchesPriority = activePriority === 'All Priorities' || t.priority === activePriority;
      return matchesSearch && matchesPriority;
    });
  }, [tickets, searchQuery, activePriority]);

  const priorities = useMemo(() => {
    const prs = new Set(tickets.map(t => t.priority).filter(Boolean));
    return ['All Priorities', ...Array.from(prs)];
  }, [tickets]);

  const supportStats = useMemo(() => {
    return [
      { label: 'Active Support Nodes', value: tickets.filter(t => t.status !== 'Resolved').length, icon: LifeBuoy, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Resolution Velocity', value: '94.2%', icon: CheckCircle, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Temporal Response', value: '1.2h', icon: Clock, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'SLA Anomalies', value: '02', icon: ShieldAlert, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [tickets]);

  const getPriorityColor = (p) => {
    switch (p?.toLowerCase()) {
      case 'critical':
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING SUPPORT GRID...</div>
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
                 <LifeBuoy size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Employee Support Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Manage organizational support nodes, audit service level agreements, and monitor resolution velocity.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing Support Protocol...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Initialize Support Node')}
        </Btn>
      </div>

      {/* Support Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {supportStats.map(s => (
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
                value={activePriority}
                onChange={(e) => setActivePriority(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 {priorities.map(p => <option key={p} value={p}>{t(p)}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search support nodes or identifiers...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Global Triage')}
           </Btn>
        </div>
      </div>

      {/* Neural Support Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Support Identifier', 'Classification', 'Intensity Level', 'Status', 'Triage Agent', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket, idx) => {
              const isCritical = ticket.priority === 'Critical' || ticket.priority === 'High';
              const isResolved = ticket.status === 'Resolved';
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isCritical && !isResolved ? 'rgba(220, 38, 38, 0.02)' : 'transparent' }} className="support-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isCritical ? 'var(--red-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)'
                      }}>
                         <Ticket size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{ticket.subject}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>NODE-{ticket.ticketID}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                        <Tag size={14} style={{ color: 'var(--red-600)' }} />
                        {ticket.category || 'General Support'}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={ticket.priority.toUpperCase()} 
                      color={getPriorityColor(ticket.priority)} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={ticket.status.toUpperCase()} 
                      color={isResolved ? 'green' : 'yellow'} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: 10, background: '#F8FAFC', 
                        display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, color: 'var(--red-600)',
                        border: '1.5px solid #F1F5F9'
                      }}>
                         {(ticket.assignedTo || 'U').charAt(0)}
                      </div>
                      <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700 }}>{ticket.assignedTo || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Triage Vector"><SearchCode size={18} /></button>
                       {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                         <button
                           className="action-btn"
                           title="Mark Resolved"
                           style={{ color: '#22C55E' }}
                           disabled={savingId === ticket.ticketID}
                           onClick={() => handleUpdateStatus(ticket, 'Resolved')}
                         >
                           <CheckCircle size={18} />
                         </button>
                       )}
                       {ticket.status !== 'Closed' && (
                         <button
                           className="action-btn"
                           title="Close Ticket"
                           style={{ color: '#EF4444' }}
                           disabled={savingId === ticket.ticketID}
                           onClick={() => handleUpdateStatus(ticket, 'Closed')}
                         >
                           <XCircle size={18} />
                         </button>
                       )}
                       <button className="action-btn" title="Tactical Options"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .support-row:hover { background: #FBFBFF; }
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
