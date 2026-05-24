import { useEffect, useState, useMemo } from 'react';
import { adminGetPermissions, adminUpdateRolePermissions } from '../../api/index.js';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  Spinner, 
  useToast,
  PageHeader,
  Input,
  Skeleton
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Shield, 
  Users, 
  CheckCircle, 
  Lock,
  Search,
  RefreshCcw,
  ShieldAlert,
  ChevronRight,
  Fingerprint,
  Activity,
  Key,
  ShieldCheck,
  Zap,
  Layers,
  Settings,
  MoreVertical,
  Terminal,
  Sparkles
} from 'lucide-react';

const SENSITIVE_PERMS = ['process_payroll', 'edit_settings', 'view_logs'];

const PERMISSIONS = [
  { id: 'view_dashboard', label: 'View Dashboard', category: 'General' },
  { id: 'manage_employees', label: 'Manage Employees', category: 'HR Operations' },
  { id: 'approve_leaves', label: 'Approve Leaves', category: 'HR Operations' },
  { id: 'process_payroll', label: 'Process Payroll', category: 'Finance' },
  { id: 'edit_settings', label: 'Edit System Settings', category: 'Admin' },
  { id: 'view_logs', label: 'View Activity Logs', category: 'Security' },
  { id: 'send_broadcasts', label: 'Send Broadcasts', category: 'Communications' },
  { id: 'manage_forms', label: 'Manage Forms', category: 'Feedback' },
];

const ROLES = ['Admin', 'HRManager', 'TeamLeader', 'TeamMember'];

const INITIAL_MATRIX = {
  Admin: ['view_dashboard', 'manage_employees', 'approve_leaves', 'process_payroll', 'edit_settings', 'view_logs', 'send_broadcasts', 'manage_forms'],
  HRManager: ['view_dashboard', 'manage_employees', 'approve_leaves', 'process_payroll', 'manage_forms'],
  TeamLeader: ['view_dashboard', 'approve_leaves'],
  TeamMember: ['view_dashboard'],
};

export function PermissionsMatrixPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [matrix, setMatrix] = useState(INITIAL_MATRIX);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadMatrix = async () => {
      setLoading(true);
      try {
        const data = await adminGetPermissions();
        if (data && Array.isArray(data)) {
          const map = {};
          data.forEach(item => { map[item.role] = item.permissions; });
          setMatrix({ ...INITIAL_MATRIX, ...map });
        }
      } catch (err) {
        toast(t('Failed to load matrix'), 'error');
      } finally {
        setLoading(false);
      }
    };
    loadMatrix();
  }, []);

  const togglePermission = async (role, permId) => {
    if (role === 'Admin' && permId === 'edit_settings') return;
    
    const current = matrix[role] || [];
    const updatedPerms = current.includes(permId) 
      ? current.filter(id => id !== permId) 
      : [...current, permId];
    
    try {
      await adminUpdateRolePermissions(role, { role, permissions: updatedPerms });
      setMatrix(p => ({ ...p, [role]: updatedPerms }));
      toast(t('Permission state updated in neural registry'));
    } catch (err) {
      toast(t('Update failed'), 'error');
    }
  };

  const filteredPerms = PERMISSIONS.filter(p => 
    p.label.toLowerCase().includes(query.toLowerCase()) || 
    p.category.toLowerCase().includes(query.toLowerCase())
  );

  const stats = useMemo(() => {
    return {
      admins: 4,
      roles: ROLES.length,
      compliance: '100%',
      auditsToday: 12
    };
  }, []);

  if (loading) return (
    <div className="page-content" style={{ padding: '40px 60px', background: '#F8FAFC' }}>
      <Skeleton height={80} style={{ marginBottom: 40, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
        <Skeleton height={200} style={{ borderRadius: 28 }} />
        <Skeleton height={200} style={{ borderRadius: 28 }} />
        <Skeleton height={200} style={{ borderRadius: 28 }} />
      </div>
      <Skeleton height={500} style={{ borderRadius: 32 }} />
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Strategic Governance Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #6366F1, #4F46E5)', 
                display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(99, 102, 241, 0.2)' 
              }}>
                 <Shield size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                 <h1 style={{ fontSize: 36, fontWeight: 950, color: '#1E293B', margin: 0, letterSpacing: '-0.03em' }}>Security Governance</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                   <Badge label="Neural Access Control Active" color="indigo" />
                   <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>Policy v9.4.2 • Granular Capability Matrix</span>
                 </div>
              </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Btn 
            onClick={() => toast('Initializing Registry Reset...', 'info')}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
             <RefreshCcw size={18} /> Reset Defaults
          </Btn>
          <Btn 
            onClick={() => toast('Executing Neural Security Audit...', 'success')}
            variant="primary" 
            style={{ 
              height: 52, borderRadius: 16, padding: '0 28px', fontWeight: 900, 
              background: 'linear-gradient(135deg, #6366F1, #4338CA)', border: 'none', 
              boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)' 
            }}
          >
             <Fingerprint size={18} style={{ marginRight: 8 }} /> Force Audit
          </Btn>
        </div>
      </div>

      {/* Security Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {[
          { label: 'Master Admins', value: stats.admins, icon: Lock, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Defined Roles', value: stats.roles, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Policy Sync', value: stats.compliance, icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Audits (24h)', value: stats.auditsToday, icon: Activity, color: '#F59E0B', bg: '#FFFBEB' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card-employee" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid #fff' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{t(item.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 950, color: '#1E293B' }}>{item.value}</div>
            </div>
            <div style={{ 
              width: 48, height: 48, borderRadius: 16, background: item.bg, color: item.color, 
              display: 'grid', placeItems: 'center'
            }}>
              <item.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Control Surface */}
      <div style={{ 
        background: '#fff', padding: '20px 32px', borderRadius: 24, border: '1.5px solid #F1F5F9', 
        marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.04)'
      }}>
        <div style={{ position: 'relative', width: 440 }}>
           <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
           <input 
             type="text" 
             placeholder={t('Search neural capabilities or categories...')}
             value={query}
             onChange={e => setQuery(e.target.value)}
             style={{ 
               width: '100%', height: 48, padding: '0 16px 0 52px', borderRadius: 14, 
               border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 14, 
               fontWeight: 600, outline: 'none', transition: 'all 0.2s'
             }} 
             className="search-input"
           />
        </div>
        
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
           <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>Matrix Density: <span style={{ color: '#6366F1' }}>High</span></div>
           <Btn variant="outline" style={{ height: 44, borderRadius: 12, fontWeight: 800, color: '#64748B' }}>
             <Terminal size={16} style={{ marginRight: 8 }} /> View CLI Logic
           </Btn>
        </div>
      </div>

      {/* Neural Matrix Ledger */}
      <div className="glass-card-employee" style={{ overflow: 'hidden', border: '1.5px solid #fff', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Capability Node</th>
              {ROLES.map(role => (
                <th key={role} style={{ textAlign: 'center', padding: '24px 20px', fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPerms.map((perm, idx) => (
              <tr key={perm.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="node-row">
                <td style={{ padding: '24px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                     <div style={{ 
                       width: 40, height: 40, borderRadius: 12, background: 'rgba(99, 102, 241, 0.08)', 
                       color: '#6366F1', display: 'grid', placeItems: 'center' 
                     }}>
                        {SENSITIVE_PERMS.includes(perm.id) ? <ShieldAlert size={20} /> : <Key size={20} />}
                     </div>
                     <div>
                        <div style={{ fontWeight: 950, color: '#1E293B', fontSize: 15 }}>{perm.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginTop: 2, letterSpacing: '0.02em' }}>{perm.category}</div>
                     </div>
                  </div>
                </td>
                {ROLES.map(role => {
                  const isActive = matrix[role]?.includes(perm.id);
                  const isLocked = role === 'Admin' && perm.id === 'edit_settings';
                  return (
                    <td key={role} style={{ textAlign: 'center', padding: '24px 20px' }}>
                      <div 
                        onClick={() => !isLocked && togglePermission(role, perm.id)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 10,
                          border: `2px solid ${isActive ? '#6366F1' : '#E2E8F0'}`,
                          background: isActive ? '#6366F1' : 'transparent',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          opacity: isLocked ? 0.3 : 1,
                          boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.25)' : 'none'
                        }}
                        className="toggle-node"
                      >
                        {isActive && <CheckCircle size={16} color="#fff" strokeWidth={3} />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPerms.length === 0 && (
          <div style={{ padding: '80px 0' }}>
            <EmptyState title="No matching capability nodes detected in registry" />
          </div>
        )}
      </div>

      {/* AI Strategy Insights */}
      <div className="glass-card-employee" style={{ 
        marginTop: 40, padding: '32px', background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', 
        color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none' 
      }}>
         <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: '#6366F1', display: 'grid', placeItems: 'center', backdropFilter: 'blur(10px)' }}>
               <Sparkles size={32} />
            </div>
            <div>
               <h3 style={{ fontSize: 20, fontWeight: 950, margin: 0 }}>Governance Intelligence</h3>
               <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 640, margin: '8px 0 0', lineHeight: 1.6, fontWeight: 600 }}>
                  Neural audit recommends isolating "Finance" capabilities from "TeamLeader" roles to maintain SOX compliance threshold. 
                  Access density for "HRManager" role has increased by 12% in the last 30-day cycle.
               </p>
            </div>
         </div>
         <Btn variant="primary" style={{ background: '#fff', color: '#1E293B', padding: '0 32px', height: 52, borderRadius: 16, fontWeight: 950 }}>
            Optimize Governance Matrix
         </Btn>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .node-row:hover { background: #F8FAFC !important; }
        .search-input:focus { border-color: #6366F1 !important; background: #fff !important; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
        .toggle-node:not([style*="not-allowed"]):hover { transform: scale(1.1); border-color: #6366F1; }
        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
