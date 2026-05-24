import { 
  Layout, 
  Calendar, 
  Activity, 
  Shield, 
  Briefcase, 
  User, 
  MessageSquare, 
  Headphones,
  Bell,
  RefreshCw,
  LogOut,
  ChevronDown,
  Heart,
  Award,
  BookOpen,
  DollarSign,
  Layout as DashboardIcon
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export function EmployeeHeader() {
  const { user, logout, portalView, setPortalView } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/employee/dashboard', label: 'My Day', icon: DashboardIcon },
    { path: '/employee/shifts', label: 'Calendar', icon: Calendar },
    { path: '/employee/attendance', label: 'Time', icon: Activity },
    { path: '/employee/leave-requests', label: 'Leave', icon: Briefcase },
    { path: '/employee/benefits', label: 'Benefits', icon: Heart },
    { path: '/employee/payroll', label: 'Payroll', icon: Shield },
    { path: '/employee/training', label: 'Training', icon: BookOpen },
    { path: '/employee/recognition', label: 'Rewards', icon: Award },
    { path: '/employee/expenses', label: 'Expenses', icon: DollarSign },
    { path: '/employee/feedback', label: 'Feedback', icon: MessageSquare },
    { path: '/employee/tickets', label: 'Support', icon: Headphones },
  ];

  const activePath = location.pathname;

  const handleSwitchView = () => {
    const nextView = portalView === 'manager' ? 'employee' : 'manager';
    setPortalView(nextView);
    if (nextView === 'manager') {
      const home = user.role === 'HRManager' ? '/hr/dashboard' : user.role === 'Admin' ? '/admin/dashboard' : '/leader/dashboard';
      navigate(home);
    } else {
      navigate('/employee/dashboard');
    }
  };

  return (
    <header className="employee-header" style={{
      background: '#fff',
      borderBottom: '1px solid #F1F5F9',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      width: '100%'
    }}>
      {/* Top Bar */}
      <div style={{
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #F8FAFC'
      }}>
        {/* Left: Role Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: '#DC2626', color: '#fff',
            display: 'grid', placeItems: 'center'
          }}>
            <User size={24} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', lineHeight: 1.2 }}>{t(`role.${user.role}`)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Employee Portal</div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {user.role !== 'TeamMember' && (
            <button 
              onClick={handleSwitchView}
              style={{
                padding: '10px 20px',
                borderRadius: 99,
                border: '1.5px solid #FEE2E2',
                background: '#FEF2F2',
                color: '#DC2626',
                fontSize: 13,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
            >
              <RefreshCw size={16} />
              Switch to {portalView === 'manager' ? 'Employee' : 'Manager'} View
            </button>
          )}

          <div style={{ position: 'relative', cursor: 'pointer', color: '#64748B' }}>
            <Bell size={22} />
            <div style={{
              position: 'absolute', top: -2, right: -2, width: 8, height: 8,
              borderRadius: '50%', background: '#DC2626', border: '2px solid #fff'
            }} />
          </div>

          <div 
            onClick={() => navigate('/employee/profile')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{user.full_name}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{user.jobTitle || 'Senior Developer'}</div>
            </div>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#F472B6', color: '#fff',
              display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 900
            }}>
              {user.full_name?.charAt(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Nav Bar */}
      <nav style={{
        padding: '0 40px',
        display: 'flex',
        gap: 20,
        overflowX: 'auto',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none'
      }}>
        {navItems.map(item => {
          const isActive = activePath.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: '20px 0',
                border: 'none',
                background: 'none',
                color: isActive ? '#DC2626' : '#64748B',
                fontSize: 14,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                position: 'relative',
                transition: 'color 0.2s'
              }}
            >
              <item.icon size={18} />
              {item.label}
              {isActive && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                  background: '#DC2626', borderRadius: '3px 3px 0 0'
                }} />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
