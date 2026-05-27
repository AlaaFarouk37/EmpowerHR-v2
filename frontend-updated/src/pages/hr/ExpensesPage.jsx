import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetExpenses, hrReviewExpenseClaim } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
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

  const handleReview = async (claim, status) => {
    if (!claim?.claimID || savingId === claim.claimID) return;
    setSavingId(claim.claimID);
    try {
      await hrReviewExpenseClaim(claim.claimID, { status, note: '' });
      toast(`Claim → ${status}`, 'success');
      await loadClaims();
    } catch (err) {
      toast(err?.message || 'Failed to update expense claim', 'error');
    } finally {
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
    return [
      { label: 'Pending Triage', value: claims.filter(c => c.status === 'Pending').length, icon: AlertCircle, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Total Fiscal Load', value: `$${totalAmount.toLocaleString()}`, icon: DollarSign, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Approval Velocity', value: '88.4%', icon: Activity, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Rejection Index', value: '04', icon: XCircle, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
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
                 <option value="Pending">{t('Pending Triage')}</option>
                 <option value="Approved">{t('Authorized Claims')}</option>
                 <option value="Rejected">{t('Deflected Claims')}</option>
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
              const status = claim.status || 'Pending';
              const isApproved = status === 'Approved';
              const isRejected = status === 'Rejected';
              
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
                      color={isApproved ? 'green' : isRejected ? 'red' : 'yellow'} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       {!isApproved && !isRejected ? (
                         <>
                           <button
                             className="action-btn"
                             title="Authorize Claim"
                             style={{ color: '#22C55E' }}
                             disabled={savingId === claim.claimID}
                             onClick={() => handleReview(claim, 'Approved')}
                           >
                             <CheckCircle size={18} />
                           </button>
                           <button
                             className="action-btn"
                             title="Deflect Claim"
                             style={{ color: '#EF4444' }}
                             disabled={savingId === claim.claimID}
                             onClick={() => handleReview(claim, 'Rejected')}
                           >
                             <XCircle size={18} />
                           </button>
                         </>
                       ) : isApproved ? (
                         <button
                           className="action-btn"
                           title="Mark Reimbursed"
                           style={{ color: '#0EA5E9' }}
                           disabled={savingId === claim.claimID}
                           onClick={() => handleReview(claim, 'Reimbursed')}
                         >
                           <CheckCircle size={18} />
                         </button>
                       ) : (
                         <button className="action-btn" title="Audit Fiscal Entry"><SearchCode size={18} /></button>
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
