import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  hrGetApprovalSnapshot,
  hrGetDocuments,
  hrGetExpenses,
  hrGetLeaveRequests,
  hrGetTickets,
  hrIssueDocument,
  hrReviewExpenseClaim,
  hrReviewLeaveRequest,
  hrUpdateTicketStatus,
} from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Eye, 
  Check, 
  X, 
  Search, 
  Filter, 
  AlertCircle, 
  Users, 
  ShieldCheck, 
  Clock,
  ChevronDown,
  Activity,
  Globe,
  Layers,
  Sparkles,
  Zap,
  MoreVertical,
  CheckCircle,
  XCircle,
  SearchCode
} from 'lucide-react';

export function HRApprovalCenterPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { resolvePath } = useAuth();

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [expenseClaims, setExpenseClaims] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Approval Nodes');

  const loadData = async () => {
    setLoading(true);
    try {
      const [leaveData, expenseData, documentData, ticketData] = await Promise.all([
        hrGetLeaveRequests(),
        hrGetExpenses(),
        hrGetDocuments(),
        hrGetTickets(),
      ]);
      setLeaveRequests(Array.isArray(leaveData) ? leaveData : []);
      setExpenseClaims(Array.isArray(expenseData) ? expenseData : []);
      setDocuments(Array.isArray(documentData) ? documentData : []);
      setTickets(Array.isArray(ticketData) ? ticketData : []);
    } catch (error) {
      toast('Failed to load approval queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const unifiedQueue = useMemo(() => {
    const queue = [
      ...leaveRequests.map(r => ({ ...r, id: `LV-${r.leaveRequestID}`, type: 'Leave', from: r.employeeName, subject: r.leaveType, priority: 'Medium', date: r.startDate })),
      ...expenseClaims.map(c => ({ ...c, id: `EX-${c.claimID}`, type: 'Expense', from: c.employeeName, subject: c.title, priority: c.amount > 5000 ? 'High' : 'Low', date: '2025-02-12' })),
      ...documents.map(d => ({ ...d, id: `DOC-${d.requestID}`, type: 'Document', from: d.employeeName, subject: d.documentType, priority: 'Low', date: '2025-02-14' })),
      ...tickets.map(t => ({ ...t, id: `TKT-${t.ticketID}`, type: 'Ticket', from: t.employeeName, subject: t.subject, priority: t.priority, date: '2025-02-15' }))
    ];
    return queue.filter(item => {
      const matchesSearch = item.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.id.toLowerCase().includes(searchQuery.toLowerCase());
      const typeFilter = activeFilter === 'All Approval Nodes' ? 'All' : activeFilter;
      const matchesType = typeFilter === 'All' || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [leaveRequests, expenseClaims, documents, tickets, activeFilter, searchQuery]);

  const approvalStats = useMemo(() => {
    return [
      { label: 'Pending Nodes', value: unifiedQueue.length, icon: Layers, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Critical Anomalies', value: unifiedQueue.filter(q => q.priority === 'High' || q.priority === 'Critical').length, icon: AlertCircle, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Compliance Index', value: '98.2%', icon: ShieldCheck, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Avg Triage Time', value: '4.2h', icon: Clock, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [unifiedQueue]);

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
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING APPROVAL GRID...</div>
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
                 <ShieldCheck size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Global Approval Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit pending workforce requests, monitor compliance telemetry, and authorize strategic actions.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing Mass Authorization Protocol...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Mass Authorization')}
        </Btn>
      </div>

      {/* Approval Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {approvalStats.map(s => (
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
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Approval Nodes">{t('All Approval Nodes')}</option>
                 <option value="Leave">{t('Leave Nodes')}</option>
                 <option value="Expense">{t('Fiscal Nodes')}</option>
                 <option value="Document">{t('Asset Nodes')}</option>
                 <option value="Ticket">{t('Support Nodes')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search requests or nodes...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Global Matrix')}
           </Btn>
        </div>
      </div>

      {/* Neural Approval Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Request Node', 'Classification', 'Node Origin', 'Intensity / Value', 'Execution Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {unifiedQueue.map((item, idx) => {
              const isHighPriority = item.priority === 'High' || item.priority === 'Critical';
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isHighPriority ? 'rgba(220, 38, 38, 0.02)' : 'transparent' }} className="approval-row">
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{item.id}</div>
                     <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>NODE IDENTIFIER</div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge label={item.type.toUpperCase()} color="indigo" />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: 10, background: '#F8FAFC', 
                        display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, color: 'var(--red-600)',
                        border: '1.5px solid #F1F5F9'
                      }}>
                         {(item.from || 'U').charAt(0)}
                      </div>
                      <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700 }}>{item.from || 'Anonymous Node'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>{item.subject}</div>
                     <Badge 
                      label={item.priority.toUpperCase()} 
                      color={getPriorityColor(item.priority)} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                       <Clock size={14} style={{ color: 'var(--red-600)' }} />
                       {item.date}
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Node Intelligence"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Authorize Action" style={{ color: '#22C55E' }}><CheckCircle size={18} /></button>
                       <button className="action-btn" title="Deflect Action" style={{ color: '#EF4444' }}><XCircle size={18} /></button>
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
        .approval-row:hover { background: #FBFBFF; }
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
