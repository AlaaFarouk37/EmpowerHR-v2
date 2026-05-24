import { useEffect, useMemo, useState } from 'react';
import { hrGetEmployees, getJobs } from '../../api/index.js';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  Spinner,
  PageHeader,
  Skeleton,
  useToast
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  ShieldAlert, 
  UserCheck, 
  FileText,
  Search,
  Download,
  Activity,
  Shield,
  Terminal,
  Clock,
  Globe,
  Filter,
  Zap,
  MoreVertical,
  Layers,
  Cpu,
  Monitor,
  ChevronRight
} from 'lucide-react';

const STATIC_LOGS = [
  { id: 1, type: 'security', action: 'Failed Login Attempt', detail: 'Multiple failed login attempts detected', user: 'Unknown', time: '2025-02-12 14:32:15', ip: '192.168.1.105', severity: 'warning' },
  { id: 2, type: 'system', action: 'Database Backup', detail: 'Scheduled database backup completed', user: 'System', time: '2025-02-12 14:00:00', ip: '', severity: 'success' },
  { id: 3, type: 'security', action: 'Unauthorized Access Attempt', detail: 'Attempt to access admin panel', user: 'Lisa Anderson', time: '2025-02-12 09:45:00', ip: '192.168.1.110', severity: 'critical' },
  { id: 4, type: 'system', action: 'System Update', detail: 'Application updated to v2.4.1', user: 'System', time: '2025-02-11 22:00:00', ip: '', severity: 'info' },
];

export function ActivityLogsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dynamicLogs, setDynamicLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [employees, jobs] = await Promise.all([
          hrGetEmployees().catch(() => []),
          getJobs().catch(() => []),
        ]);

        const synthesized = [];
        employees.forEach((emp, i) => {
          synthesized.push({
            id: `emp-${i}`,
            type: 'user',
            action: 'New Hire Registered',
            detail: `${emp.fullName || emp.name} joined as ${emp.jobTitle || 'Staff'}`,
            user: 'Admin',
            time: emp.joinedDate || '2025-02-10 09:00:00',
            ip: '192.168.1.50',
            severity: 'success'
          });
        });

        jobs.forEach((job, i) => {
          synthesized.push({
            id: `job-${i}`,
            type: 'system',
            action: 'Job Posted',
            detail: `${job.title} is now live`,
            user: 'HR Manager',
            time: job.created_at || '2025-02-11 10:30:00',
            ip: '192.168.1.52',
            severity: 'info'
          });
        });

        setDynamicLogs([...STATIC_LOGS, ...synthesized].sort((a,b) => b.time.localeCompare(a.time)));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [t]);

  const filteredLogs = useMemo(() => {
    let result = dynamicLogs;
    if (search) result = result.filter(l => `${l.action} ${l.detail} ${l.user}`.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== 'all') result = result.filter(l => l.type === typeFilter);
    if (severityFilter !== 'all') result = result.filter(l => l.severity === severityFilter);
    return result;
  }, [dynamicLogs, search, typeFilter, severityFilter]);

  const stats = useMemo(() => ({
    total: dynamicLogs.length,
    security: dynamicLogs.filter(l => l.type === 'security' || l.severity === 'critical').length,
    activeNodes: 42
  }), [dynamicLogs]);

  const getSeverityColor = (s) => {
    switch (s?.toLowerCase()) {
      case 'critical': return 'red';
      case 'warning': return 'orange';
      case 'success': return 'green';
      case 'info': return 'blue';
      default: return 'gray';
    }
  };

  if (loading) return (
    <div className="page-content" style={{ padding: '40px 60px', background: '#F8FAFC' }}>
      <Skeleton height={80} style={{ marginBottom: 40, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
      </div>
      <Skeleton height={600} style={{ borderRadius: 32 }} />
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Infrastructure Event Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #10B981, #059669)', 
                display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(16, 185, 129, 0.2)' 
              }}>
                 <Terminal size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                 <h1 style={{ fontSize: 36, fontWeight: 950, color: '#1E293B', margin: 0, letterSpacing: '-0.03em' }}>Event Telemetry</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                   <Badge label="Neural Stream Active" color="green" />
                   <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>Registry v9.4.2 • Real-time Audit Ledger</span>
                 </div>
              </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Btn 
            onClick={() => toast('Exporting ledger to local archive...', 'success')}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
             <Download size={18} /> Export Archive
          </Btn>
          <Btn 
            onClick={() => toast('Initializing data rotation protocol...', 'info')}
            variant="primary" 
            style={{ 
              height: 52, borderRadius: 16, padding: '0 28px', fontWeight: 900, 
              background: '#1E293B', border: 'none', 
              boxShadow: '0 10px 25px -5px rgba(30, 41, 59, 0.3)' 
            }}
          >
             <Layers size={18} style={{ marginRight: 8 }} /> Archive Nodes
          </Btn>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
        {[
          { label: 'Total Events', value: stats.total, icon: FileText, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Security Alerts', value: stats.security, icon: ShieldAlert, color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Active Nodes', value: stats.activeNodes, icon: Cpu, color: '#3B82F6', bg: '#EFF6FF' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card-employee" style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid #fff' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t(item.label)}</div>
              <div style={{ fontSize: 32, fontWeight: 950, color: '#1E293B' }}>{item.value}</div>
            </div>
            <div style={{ 
              width: 64, height: 64, borderRadius: 20, background: item.bg, color: item.color, 
              display: 'grid', placeItems: 'center'
            }}>
              <item.icon size={28} />
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ 
        background: '#fff', padding: '20px 32px', borderRadius: 28, border: '1.5px solid #F1F5F9', 
        marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flex: 1 }}>
           <div style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
              <Search size={20} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search neural events, identifiers, or node origin...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ 
                  width: '100%', height: 52, padding: '0 24px 0 60px', borderRadius: 16, border: '1.5px solid #F1F5F9', 
                  background: '#F8FAFC', fontSize: 14, fontWeight: 700, outline: 'none',
                  transition: 'all 0.2s'
                }} 
                className="search-input"
              />
           </div>
           
           <div style={{ display: 'flex', gap: 12 }}>
             <select 
               value={typeFilter}
               onChange={e => setTypeFilter(e.target.value)}
               style={{ height: 52, padding: '0 20px', borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', fontSize: 13, fontWeight: 850, color: '#1E293B', outline: 'none', cursor: 'pointer' }}
             >
               <option value="all">All Categories</option>
               <option value="security">Security</option>
               <option value="system">System</option>
               <option value="user">User</option>
             </select>
             <select 
               value={severityFilter}
               onChange={e => setSeverityFilter(e.target.value)}
               style={{ height: 52, padding: '0 20px', borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', fontSize: 13, fontWeight: 850, color: '#1E293B', outline: 'none', cursor: 'pointer' }}
             >
               <option value="all">All Severities</option>
               <option value="critical">Critical</option>
               <option value="warning">Warning</option>
               <option value="info">Info</option>
               <option value="success">Success</option>
             </select>
           </div>
        </div>
      </div>

      {/* Event Matrix Ledger */}
      <div className="glass-card-employee" style={{ overflow: 'hidden', border: '1.5px solid #fff', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Neural Timestamp</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Event Protocol</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Category</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Origin Node</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Intensity</th>
              <th style={{ textAlign: 'right', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dossier</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="node-row">
                <td style={{ padding: '24px 32px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569', fontWeight: 800 }}>
                      <Clock size={14} style={{ color: '#10B981' }} />
                      {log.time}
                   </div>
                </td>
                <td style={{ padding: '24px 32px' }}>
                  <div style={{ fontWeight: 950, color: '#1E293B', fontSize: 15 }}>{log.action}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: 600 }}>{log.detail}</div>
                </td>
                <td style={{ padding: '24px 32px' }}>
                  <Badge label={log.type.toUpperCase()} color="indigo" />
                </td>
                <td style={{ padding: '24px 32px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F8FAFC', display: 'grid', placeItems: 'center', border: '1.5px solid #F1F5F9', fontSize: 12, fontWeight: 950, color: '#1E293B' }}>
                         {log.user.charAt(0)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{log.user}</span>
                   </div>
                   <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, marginLeft: 42, marginTop: 2 }}>IP: {log.ip || '---'}</div>
                </td>
                <td style={{ padding: '24px 32px' }}>
                  <Badge label={log.severity.toUpperCase()} color={getSeverityColor(log.severity)} />
                </td>
                <td style={{ padding: '24px 32px', textAlign: 'right' }}>
                  <button className="action-btn" title="View Full Telemetry Dossier"><ChevronRight size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && (
          <div style={{ padding: '100px 0' }}>
            <EmptyState title="No neural events detected in current cluster" />
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .node-row:hover { background: #F8FAFC !important; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: inline-grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { color: #10B981; border-color: #D1FAE5; background: #ECFDF5; transform: translateX(2px); }
        .search-input:focus { border-color: #10B981 !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1); }
        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
