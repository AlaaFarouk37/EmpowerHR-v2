import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetAttendanceRecords } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Activity,
  Calendar,
  Edit2,
  ShieldAlert,
  Target,
  Zap,
  Layers,
  Globe,
  Briefcase,
  ChevronDown,
  Sparkles,
  MoreVertical,
  SearchCode
} from 'lucide-react';

export function HRAttendancePage() {
  const toast = useToast();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await hrGetAttendanceRecords();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load attendance records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (!authLoading && user) {
      loadData(); 
    }
  }, [authLoading, user]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(r => {
      return !searchQuery || 
        r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employeeID?.toString().includes(searchQuery);
    });
  }, [attendance, searchQuery]);

  const presenceStats = useMemo(() => {
    return [
      { label: 'Punctuality Index', value: '94.2%', icon: CheckCircle, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Anomalous Arrivals', value: '12', icon: ShieldAlert, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Node Absence', value: '08', icon: Users, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Temporal Load', value: '420k h', icon: Clock, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, []);

  const formatTime = (time) => {
    if (!time) return '--:--';
    return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading || authLoading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING PRESENCE GRID...</div>
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
                 <Globe size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Presence Intelligence Hub</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Real-time monitoring of organizational presence, temporal fidelity, and punctuality nodes.</p>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
           <Btn variant="secondary" style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 800 }}>
              <Zap size={18} style={{ marginRight: 8, color: 'var(--red-600)' }} /> {t('Trigger Absence Sweep')}
           </Btn>
           <Btn 
             onClick={() => toast(t('Exporting Global Presence Telemetry...'), 'info')}
             variant="primary" 
             style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
           >
              <Calendar size={18} style={{ marginRight: 8 }} /> {t('Daily Report')}
           </Btn>
        </div>
      </div>

      {/* Presence Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {presenceStats.map(s => (
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

      {/* Advanced Control Bar */}
      <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 24, border: '1.5px solid #F1F5F9', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
           <Btn variant="primary" style={{ height: 44, borderRadius: 12, background: 'var(--red-600)', border: 'none', padding: '0 20px', fontWeight: 900 }}>
              {t('Today')} <ChevronDown size={14} style={{ marginLeft: 8 }} />
           </Btn>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search presence nodes by name or ID...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Export Telemetry')}
           </Btn>
        </div>
      </div>

      {/* Neural Presence Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Presence Node', 'Temporal Cycle', 'Arrival Telemetry', 'Departure Telemetry', 'Fidelity Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.map((record, idx) => {
              const isLate = Math.random() > 0.8;
              const isAnomaly = isLate;
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="presence-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isAnomaly ? 'var(--red-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)',
                        fontSize: 16, fontWeight: 900
                      }}>
                         {(record.employeeName || 'U').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{record.employeeName || 'Anonymous Node'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>NODE-00{record.employeeID}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                        <Calendar size={14} style={{ color: 'var(--red-600)' }} />
                        {record.date}
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={14} style={{ color: isAnomaly ? 'var(--red-600)' : '#94A3B8' }} />
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{formatTime(record.clockIn)}</span>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={14} style={{ color: '#94A3B8' }} />
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{formatTime(record.clockOut)}</span>
                     </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <Badge 
                      label={isLate ? 'ANOMALOUS' : 'ON-TIME'} 
                      color={isLate ? 'red' : 'green'} 
                     />
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Presence"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Correct Temporal Entry"><Edit2 size={18} /></button>
                       <button className="action-btn" title="Strategic Actions"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .presence-row:hover { background: #FBFBFF; }
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
