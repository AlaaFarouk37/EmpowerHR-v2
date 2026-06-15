import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword, getMyProfile } from '../../api/index.js';
import { Btn, Modal, Input, useToast } from "../../components/shared/index.jsx";
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Shield,
  Activity,
  Lock,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  Building,
  Edit2,
  Users,
  FileText
} from 'lucide-react';

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/* --- Odoo-Inspired Smart Action Button --- */
const SmartButton = ({ icon: Icon, label, value, subValue, color = "#DC2626", onClick }) => (
  <button
    onClick={onClick}
    className="glass-card-employee"
    style={{
      display: 'flex', flex: 1, minWidth: 160, padding: '16px 20px',
      gap: 16, alignItems: 'center', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1.5px solid transparent', textAlign: 'left', background: 'rgba(255,255,255,0.8)'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div style={{
      width: 48, height: 48, borderRadius: 14, background: `${color}10`, color: color,
      display: 'grid', placeItems: 'center', flexShrink: 0
    }}>
      <Icon size={22} />
    </div>
    <div style={{ overflow: 'hidden' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4, whiteSpace: 'nowrap' }}>{label}</div>
      {subValue && <div style={{ fontSize: 10, color: color, fontWeight: 700, marginTop: 2 }}>{subValue}</div>}
    </div>
  </button>
);

const ProfileHeader = ({ user, details }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ height: 200, background: 'linear-gradient(135deg, #1E293B, #0F172A)', borderRadius: '32px 32px 0 0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'radial-gradient(circle at 20% 50%, #DC2626 0%, transparent 50%)' }} />
      <div style={{ position: 'absolute', bottom: -60, left: 40, display: 'flex', alignItems: 'flex-end', gap: 24, zIndex: 10 }}>
        <div style={{
          width: 140, height: 140, borderRadius: 32, background: '#fff', padding: 4,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', position: 'relative'
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: 28,
            background: 'linear-gradient(135deg, #F1F5F9, #E2E8F0)',
            display: 'grid', placeItems: 'center', fontSize: 48, fontWeight: 900, color: '#94A3B8'
          }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{user?.full_name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: 16, color: '#64748B', fontWeight: 600 }}>{details?.jobTitle || user?.role}</span>
            {details?.departmentName && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#CBD5E1' }} />}
            {details?.departmentName && <span style={{ fontSize: 16, color: '#64748B', fontWeight: 600 }}>{details.departmentName}</span>}
          </div>
        </div>
      </div>
    </div>
    <div style={{ height: 80 }} />

    {/* Smart Buttons Row — real employee data */}
    <div style={{ display: 'flex', gap: 20, marginTop: 20, overflowX: 'auto', paddingBottom: 10 }}>
       <SmartButton
         icon={Calendar}
         label="At Company"
         value={details?.yearsAtCompany != null ? `${details.yearsAtCompany} yrs` : '—'}
         subValue={details?.hiring_date ? `Since ${fmtDate(details.hiring_date)}` : null}
         color="#2563EB"
       />
       <SmartButton
         icon={Briefcase}
         label="Employment Type"
         value={details?.employeeType || '—'}
         subValue={details?.jobLevel ? `Level: ${details.jobLevel}` : null}
         color="#059669"
       />
       <SmartButton
         icon={Building}
         label="Work Location"
         value={details?.location || '—'}
         subValue={details?.remoteWork ? 'Remote' : 'On-site'}
         color="#7C3AED"
       />
       <SmartButton
         icon={Activity}
         label="Status"
         value={details?.employmentStatus || '—'}
         color="#EA580C"
       />
    </div>
  </div>
);

const OrgChartSection = ({ user, details }) => (
  <div className="glass-card-employee" style={{ padding: '32px' }}>
    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Users size={20} color="#DC2626" />
      Organization Chart
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      {/* Manager (team leader) */}
      {details?.managerName && (
        <>
          <div style={{ padding: '12px 24px', borderRadius: 16, background: '#F8FAFC', border: '1.5px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Manager</div>
            <div style={{ fontWeight: 800, color: '#1E293B' }}>{details.managerName}</div>
          </div>
          <div style={{ width: 2, height: 20, background: '#E2E8F0' }} />
        </>
      )}

      {/* Self */}
      <div style={{ padding: '16px 32px', borderRadius: 20, background: '#DC2626', color: '#fff', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.2)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase' }}>You</div>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{user?.full_name}</div>
        {details?.teamName && <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, marginTop: 2 }}>{details.teamName}</div>}
      </div>
    </div>
  </div>
);

const PulseRequestButton = ({ icon: Icon, label, onClick, color = "#DC2626" }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px',
      borderRadius: 20, background: '#fff', border: '1.5px solid #F1F5F9', cursor: 'pointer', transition: 'all 0.2s ease',
      outline: 'none'
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}05`; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#F1F5F9'; e.currentTarget.style.background = '#fff'; }}
  >
    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}10`, color: color, display: 'grid', placeItems: 'center' }}>
      <Icon size={20} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 800, color: '#1E293B' }}>{label}</span>
  </button>
);

const InfoCard = ({ title, items, icon: Icon, onEdit }) => (
  <div className="glass-card-employee" style={{ padding: '32px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF2F2', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
          <Icon size={20} />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>{title}</h3>
      </div>
      {onEdit && (
        <button onClick={onEdit} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}>
          <Edit2 size={18} />
        </button>
      )}
    </div>
    <div style={{ display: 'grid', gap: 20 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ color: '#94A3B8' }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', marginTop: 2 }}>{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export function EmployeeProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [profile, setProfile] = useState(null);
  const details = profile || {};

  const [activeTab, setActiveTab] = useState('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old_password: "", new_password: "", confirm_password: "" });

  useEffect(() => {
    getMyProfile().then(setProfile).catch(() => {});
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) return showToast("Passwords don't match", "error");
    setLoading(true);
    try {
      await changePassword({ old_password: passwordForm.old_password, new_password: passwordForm.new_password });
      showToast("Password updated", "success");
      setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      showToast(err.message || "Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <ProfileHeader user={user} details={details} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 32, borderBottom: '1.5px solid #E2E8F0', marginBottom: 32 }}>
          {[
            { id: 'profile', label: 'Personal Details', icon: <User size={18} /> },
            { id: 'security', label: 'Security & Privacy', icon: <Shield size={18} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 0', background: 'none', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #DC2626' : '2px solid transparent',
                color: activeTab === tab.id ? '#DC2626' : '#64748B',
                fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                transition: 'all 0.2s ease', outline: 'none'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 400px', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
               <InfoCard
                 title="Personal Information"
                 icon={User}
                 onEdit={() => setIsEditModalOpen(true)}
                 items={[
                   { label: 'Full Name', value: user?.full_name || '—', icon: <User size={18} /> },
                   { label: 'Email Address', value: user?.email || '—', icon: <Mail size={18} /> },
                   { label: 'Phone Number', value: details?.phoneNumber || '—', icon: <Phone size={18} /> },
                   { label: 'Date of Birth', value: fmtDate(details?.birth_date) || '—', icon: <Calendar size={18} /> },
                   { label: 'Gender', value: details?.gender || '—', icon: <User size={18} /> },
                   { label: 'Marital Status', value: details?.maritalStatus || '—', icon: <Users size={18} /> },
                 ]}
               />

               <div className="glass-card-employee" style={{ padding: '32px' }}>
                 <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                   <Shield size={20} color="#DC2626" />
                   Quick Pulse Actions
                 </h3>
                 <div style={{ display: 'flex', gap: 16 }}>
                    <PulseRequestButton icon={Activity} label="Appraisal" color="#8B5CF6" onClick={() => navigate('/employee/reviews')} />
                    <PulseRequestButton icon={Calendar} label="Time Off" color="#2563EB" onClick={() => navigate('/employee/leave-requests')} />
                    <PulseRequestButton icon={FileText} label="Sign Doc" color="#059669" onClick={() => navigate('/employee/documents')} />
                 </div>
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
               <InfoCard
                 title="Work Information"
                 icon={Briefcase}
                 items={[
                   { label: 'Employee ID', value: user?.employee_id || details?.employeeID || '—', icon: <Activity size={18} /> },
                   { label: 'Job Title', value: details?.jobTitle || '—', icon: <Briefcase size={18} /> },
                   { label: 'Department', value: details?.departmentName || '—', icon: <Building size={18} /> },
                   { label: 'Team', value: details?.teamName || '—', icon: <Users size={18} /> },
                   { label: 'Work Location', value: details?.location || '—', icon: <MapPin size={18} /> },
                   { label: 'Joined Date', value: fmtDate(details?.hiring_date) || '—', icon: <Calendar size={18} /> },
                   { label: 'Employment Type', value: details?.employeeType || '—', icon: <Activity size={18} /> },
                 ]}
               />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <OrgChartSection user={user} details={details} />
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ maxWidth: 600 }}>
             <div className="glass-card-employee" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                  <Lock size={20} color="#DC2626" />
                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>Change Password</h3>
                </div>
                <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: 20 }}>
                   <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Current Password</label>
                      <Input type="password" value={passwordForm.old_password} onChange={e => setPasswordForm({...passwordForm, old_password: e.target.value})} required style={{ height: 48, borderRadius: 14 }} />
                   </div>
                   <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>New Password</label>
                      <Input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} required style={{ height: 48, borderRadius: 14 }} />
                   </div>
                   <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Confirm New Password</label>
                      <Input type="password" value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} required style={{ height: 48, borderRadius: 14 }} />
                   </div>
                   <Btn type="submit" loading={loading} style={{ background: '#DC2626', height: 48, borderRadius: 14, fontWeight: 900, border: 'none', color: '#fff', marginTop: 8 }}>
                     Update Password
                   </Btn>
                </form>
             </div>
          </div>
        )}
      </div>

      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile Details">
         <div style={{ display: 'grid', gap: 20 }}>
            <div>
               <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Full Name</label>
               <Input defaultValue={user?.full_name} style={{ height: 48, borderRadius: 14 }} />
            </div>
            <div>
               <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Phone Number</label>
               <Input defaultValue={details?.phoneNumber || ''} style={{ height: 48, borderRadius: 14 }} />
            </div>
            <Btn style={{ background: '#DC2626', color: '#fff', height: 48, borderRadius: 14, fontWeight: 800 }} onClick={() => setIsEditModalOpen(false)}>Save Changes</Btn>
         </div>
      </Modal>
    </div>
  );
}
