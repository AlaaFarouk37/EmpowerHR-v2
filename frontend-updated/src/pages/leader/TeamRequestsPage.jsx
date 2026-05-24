import { useState, useEffect } from 'react';
import { 
  LeaderPortalLayout, 
  Btn, 
  Skeleton, 
  useToast, 
  Badge 
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Plus, Send, Clock, CheckCircle2, XCircle, FileText, UserPlus, TrendingUp } from 'lucide-react';

export function TeamRequestsPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sent'); // 'sent' or 'inbox'

  const [myRequests, setMyRequests] = useState([
    { id: 1, type: 'Hiring Request', icon: UserPlus, subject: 'Additional Frontend Developer for Project Zenith', date: '2026-02-15', priority: 'High', status: 'Pending' },
    { id: 2, type: 'Promotion', icon: TrendingUp, subject: 'Senior Role Promotion - Jessica Wu', date: '2026-02-17', priority: 'High', status: 'Pending' },
  ]);

  const [teamInbox, setTeamInbox] = useState([
    { id: 101, sender: 'Alex Chen', type: 'Annual Leave', subject: 'Family vacation (3 days)', date: '2026-02-18', priority: 'Medium', status: 'Pending' },
    { id: 102, sender: 'Sarah Miller', type: 'Expense', subject: 'UI Training Course Reimbursement', date: '2026-02-19', priority: 'Low', status: 'Pending' },
  ]);

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  const handleAction = (id, action) => {
    setTeamInbox(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' } : r));
    toast(`${t('Request')} ${id} ${action === 'approve' ? t('Approved') : t('Rejected')}`, action === 'approve' ? 'success' : 'error');
  };

  if (loading || authLoading) {
    return (
      <LeaderPortalLayout>
        <Skeleton count={8} height={50} />
      </LeaderPortalLayout>
    );
  }

  const stats = [
    { label: 'Total Managed', value: teamInbox.length + myRequests.length, icon: Send, color: 'var(--red-600)', bg: 'var(--red-50)' },
    { label: 'Action Required', value: teamInbox.filter(r => r.status === 'Pending').length, icon: Clock, color: 'var(--pink-400)', bg: 'var(--pink-50)' },
    { label: 'Approved', value: teamInbox.filter(r => r.status === 'Approved').length + myRequests.filter(r => r.status === 'Approved').length, icon: CheckCircle2, color: 'var(--red-800)', bg: 'var(--red-50)' },
    { label: 'Platform Load', value: 'Optimal', icon: TrendingUp, color: 'var(--red-600)', bg: 'var(--red-50)' },
  ];

  return (
    <LeaderPortalLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
           <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: '0 0 8px' }}>Request Center</h2>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Manage team escalations and submit executive directives to HR</p>
        </div>
        <button style={{ 
          height: 48, padding: '0 24px', background: 'var(--red-600)', color: 'white', 
          border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, 
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' 
        }}>
           <Plus size={18} />
           New Direct Request
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
             <div style={{ width: 48, height: 48, borderRadius: 16, background: s.bg, display: 'grid', placeItems: 'center' }}>
                <s.icon size={20} style={{ color: s.color }} />
             </div>
             <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{t(s.label)}</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>{s.value}</div>
             </div>
          </div>
        ))}
      </div>

      {/* Modern Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
         {[
           { id: 'sent', label: 'My Requests to HR', count: myRequests.length },
           { id: 'inbox', label: 'Team Inbox', count: teamInbox.filter(r => r.status === 'Pending').length }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             style={{ 
               padding: '12px 24px', borderRadius: 12, border: 'none', 
               background: activeTab === tab.id ? 'var(--red-600)' : '#fff',
               color: activeTab === tab.id ? 'white' : '#64748B',
               fontWeight: 800, fontSize: 13, cursor: 'pointer',
               display: 'flex', alignItems: 'center', gap: 10,
               boxShadow: activeTab === tab.id ? '0 10px 20px rgba(220, 38, 38, 0.2)' : 'none',
               transition: 'all 0.3s ease'
             }}
           >
              {tab.label}
              <span style={{ 
                padding: '2px 8px', borderRadius: 6, background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                fontSize: 10, color: activeTab === tab.id ? 'white' : '#64748B'
              }}>{tab.count}</span>
           </button>
         ))}
      </div>

      {/* Requests Ledger */}
      <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', overflow: 'hidden' }}>
         <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
               <tr style={{ background: '#F8FAFC' }}>
                  {activeTab === 'inbox' && <th style={{ textAlign: 'left', padding: '16px 32px', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Sender</th>}
                  {['Type', 'Subject', 'Date', 'Priority', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '16px 32px', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>{t(h)}</th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {(activeTab === 'sent' ? myRequests : teamInbox).map((r, i) => (
                 <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                    {activeTab === 'inbox' && (
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900 }}>{r.sender[0]}</div>
                          <span style={{ fontSize: 14, fontWeight: 800 }}>{r.sender}</span>
                        </div>
                      </td>
                    )}
                    <td style={{ padding: '20px 32px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {r.icon ? <r.icon size={16} style={{ color: 'var(--red-600)' }} /> : <FileText size={16} style={{ color: 'var(--red-600)' }} />}
                          <span style={{ fontSize: 14, fontWeight: 800 }}>{r.type}</span>
                       </div>
                    </td>
                    <td style={{ padding: '20px 32px', fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{r.subject}</td>
                    <td style={{ padding: '20px 32px', fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{r.date}</td>
                    <td style={{ padding: '20px 32px' }}>
                       <Badge label={r.priority} color={r.priority === 'High' ? 'danger' : 'warning'} variant="soft" />
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                       <Badge 
                         label={r.status} 
                         color={r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'danger' : 'info'} 
                         variant="soft" 
                       />
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                       {activeTab === 'inbox' && r.status === 'Pending' ? (
                         <div style={{ display: 'flex', gap: 12 }}>
                           <button 
                             onClick={() => handleAction(r.id, 'approve')}
                             style={{ background: 'none', border: 'none', color: 'var(--red-800)', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
                           >
                             Approve
                           </button>
                           <button 
                             onClick={() => handleAction(r.id, 'reject')}
                             style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontWeight: 800, fontSize: 12 }}
                           >
                             Reject
                           </button>
                         </div>
                       ) : (
                         <button style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                            <FileText size={18} />
                         </button>
                       )}
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </LeaderPortalLayout>
  );
}
