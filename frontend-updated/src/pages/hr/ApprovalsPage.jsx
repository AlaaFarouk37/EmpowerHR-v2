import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hrGetApprovals, hrProcessApproval } from '../../api/index.js';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  useToast, 
  Spinner
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  Globe,
  ChevronDown,
  Activity,
  Layers,
  Zap,
  MoreVertical,
  SearchCode
} from 'lucide-react';

export function HRApprovalsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { resolvePath } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('All Intelligence Types');
  const [activeTab, setActiveTab] = useState('Active');

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await hrGetApprovals().catch(() => []);
      setApprovals(data || []);
    } catch (error) {
      toast(t('Failed to sync governance pipeline'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApprovals(); }, []);

  const filteredApprovals = useMemo(() => {
    return approvals.filter(a => {
      const matchesSearch = !searchQuery || [a.requesterName, a.type, a.description].some(v => String(v || '').toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = activeType === 'All Intelligence Types' || a.type === activeType;
      const matchesStatus = activeTab === 'Active' ? a.status === 'Pending' : (activeTab === 'Closed' ? a.status !== 'Pending' : true);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [approvals, searchQuery, activeType, activeTab]);

  const stats = useMemo(() => {
    return [
      { label: 'Pending Decisions', value: approvals.filter(a => a.status === 'Pending').length, icon: Layers, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Risk Density', value: '12%', icon: AlertCircle, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Decision Velocity', value: '1.4h', icon: Clock, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Governance Accuracy', value: '99.8%', icon: ShieldCheck, color: '#10B981', bg: '#ECFDF5' },
    ];
  }, [approvals]);

  const handleAction = async (id, action) => {
    try {
      await hrProcessApproval(id, { action, comment: 'Processed via Command Center' });
      toast(t(`Governance node ${action.toLowerCase()}ed`), 'success');
      loadApprovals();
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING GOVERNANCE GRID...</div>
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
                 <Shield size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Strategic Governance Intelligence</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit high-level workforce governance, calibrate risk density, and accelerate decision velocity.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing Tactical Governance Protocol...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Execute Bulk Directive')}
        </Btn>
      </div>

      {/* Governance Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {stats.map(s => (
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
           <div style={{ display: 'flex', background: '#F8FAFC', borderRadius: 12, padding: 4, border: '1.5px solid #F1F5F9' }}>
             {['Active', 'Closed'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 style={{
                   padding: '8px 24px',
                   borderRadius: 8,
                   border: 'none',
                   fontSize: 13,
                   fontWeight: 800,
                   cursor: 'pointer',
                   background: activeTab === tab ? '#fff' : 'transparent',
                   color: activeTab === tab ? 'var(--red-600)' : '#94A3B8',
                   boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                   transition: 'all 0.2s',
                 }}
               >
                 {t(tab)}
               </button>
             ))}
           </div>
           
           <div style={{ position: 'relative' }}>
              <select 
                value={activeType}
                onChange={(e) => setActiveType(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Intelligence Types">{t('All Intelligence Types')}</option>
                 <option value="Policy">{t('Policy Modifications')}</option>
                 <option value="Fiscal">{t('Fiscal Deviations')}</option>
                 <option value="Talent">{t('Talent Interventions')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search governance nodes...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: 44, padding: '0 16px 0 48px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 600, width: 280, outline: 'none' }} 
              />
           </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
           <Btn variant="secondary" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Filter size={16} style={{ marginRight: 8 }} /> {t('Neural Filters')}
           </Btn>
        </div>
      </div>

      {/* Neural Governance Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Governance Node', 'Classification', 'Intelligence Origin', 'Execution Date', 'Risk Priority', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredApprovals.map((item, idx) => {
              const isHighPriority = item.priority === 'High' || item.priority === 'Critical';
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isHighPriority && activeTab === 'Active' ? 'rgba(220, 38, 38, 0.02)' : 'transparent' }} className="gov-row">
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>{item.description || 'Governance Vector Update'}</div>
                     <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>GOV-{item.id?.substring(0, 8) || 'NODE-001'}</div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge label={item.type?.toUpperCase() || 'STRATEGIC'} color="indigo" />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ 
                        width: 32, height: 32, borderRadius: 10, background: '#F8FAFC', 
                        display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, color: 'var(--red-600)',
                        border: '1.5px solid #F1F5F9'
                      }}>
                         {(item.requesterName || 'U').charAt(0)}
                      </div>
                      <span style={{ fontSize: 13, color: '#1E293B', fontWeight: 700 }}>{item.requesterName || 'Anonymous Node'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                       <Clock size={14} style={{ color: 'var(--red-600)' }} />
                       {item.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={item.priority?.toUpperCase() || 'MEDIUM'} 
                      color={isHighPriority ? 'red' : item.priority === 'Medium' ? 'yellow' : 'green'} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       {activeTab === 'Active' ? (
                         <>
                           <button className="action-btn" title="Audit Risk Vector"><SearchCode size={18} /></button>
                           <button className="action-btn" title="Authorize Directive" style={{ color: '#22C55E' }} onClick={() => handleAction(item.id, 'Approve')}><CheckCircle size={18} /></button>
                           <button className="action-btn" title="Block Directive" style={{ color: '#EF4444' }} onClick={() => handleAction(item.id, 'Reject')}><XCircle size={18} /></button>
                         </>
                       ) : (
                         <Badge label={item.status} color={item.status === 'Approved' ? 'success' : 'danger'} />
                       )}
                       <button className="action-btn" title="Tactical Options"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredApprovals.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
             <Shield size={48} style={{ color: '#E2E8F0', margin: '0 auto 16px' }} />
             <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{t('Governance pipeline is clear.')}</div>
             <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>{t('All strategic directives have been processed.')}</div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: \`
        .gov-row:hover { background: #FBFBFF; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { border-color: var(--red-100); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      \`}} />
    </div>
  );
}
