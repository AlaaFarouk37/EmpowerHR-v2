import { useEffect, useMemo, useState } from 'react';
import {
  getMyAttendance,
  clockAttendance,
} from '../../api/index.js';
import { Spinner, Btn, Badge, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Clock, 
  Calendar, 
  Activity, 
  Plus,
  ArrowUpRight,
  TrendingUp,
  History,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';

const STATUS_COLORS = {
  Present: 'red',
  Absent: 'gray',
  Late: 'orange',
  'On Leave': 'blue',
  'Clocked In': 'red',
};

export function EmployeeAttendancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const employeeID = user?.employee_id;

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadData = async () => {
    if (!employeeID) return;
    setLoading(true);
    try {
      const data = await getMyAttendance(employeeID).catch(() => []);
      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || 'Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [employeeID]);

  const stats = useMemo(() => {
    const totalHours = attendance.reduce((acc, curr) => acc + (parseFloat(curr.workedHours) || 0), 0);
    const overtime = attendance.reduce((acc, curr) => acc + (parseFloat(curr.overtime) || 0), 0);
    return {
      totalHours: totalHours.toFixed(1),
      overtime: overtime.toFixed(1),
      daysPresent: attendance.filter(r => r.status === 'Present' || r.status === 'Late').length,
    };
  }, [attendance]);

  if (loading) return (
    <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
      <Spinner size="lg" color="var(--red-600)" />
    </div>
  );

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Time Sheet')}</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>{t('Manage your working hours and attendance logs')}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ 
              padding: '10px 20px', borderRadius: 12, border: '1.5px solid #E2E8F0', 
              background: '#fff', color: '#1E293B', fontSize: 14, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'
            }}>
              <Download size={18} />
              {t('Export PDF')}
            </button>
            <button className="btn-red-primary" style={{ padding: '10px 20px', borderRadius: 12, background: '#DC2626', color: '#fff', border: 'none', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Plus size={18} />
              {t('Clock Correction')}
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
          <div className="glass-card-employee" style={{ padding: '24px', background: '#fff', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 20, border: '1px solid #F1F5F9' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FEF2F2', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Current Week')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{t('12 Feb - 18 Feb')}</div>
            </div>
          </div>
          <div className="glass-card-employee" style={{ padding: '24px', background: '#fff', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 20, border: '1px solid #F1F5F9' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#EFF6FF', color: '#2563EB', display: 'grid', placeItems: 'center' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Total Hours')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.totalHours}h</div>
            </div>
          </div>
          <div className="glass-card-employee" style={{ padding: '24px', background: '#fff', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 20, border: '1px solid #F1F5F9' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#ECFDF5', color: '#10B981', display: 'grid', placeItems: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Overtime')}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stats.overtime}h</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Attendance Table */}
          <div className="glass-card-employee" style={{ padding: 0, background: '#fff', borderRadius: 24, border: '1px solid #F1F5F9' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <History size={20} color="#DC2626" />
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Attendance Log')}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><ChevronLeft size={20}/></button>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{t('February 2026')}</span>
                <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><ChevronRight size={20}/></button>
              </div>
            </div>
            
            <div style={{ padding: '16px 32px 32px' }}>
              <table className="employee-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94A3B8', fontSize: 12, fontWeight: 800, textAlign: 'left' }}>
                    <th style={{ padding: '12px 0' }}>{t('Date')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Clock In')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Clock Out')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Total Hours')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Overtime')}</th>
                    <th style={{ padding: '12px 0' }}>{t('Status')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ fontWeight: 800 }}>{new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>{new Date(row.date).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                      </td>
                      <td style={{ padding: '16px 0' }}>{row.clockIn || '—'}</td>
                      <td style={{ padding: '16px 0' }}>{row.clockOut || '—'}</td>
                      <td style={{ padding: '16px 0' }}>{row.workedHours || '0'}h</td>
                      <td style={{ padding: '16px 0' }}>
                        <span style={{ color: row.overtime > 0 ? '#10B981' : '#94A3B8', fontWeight: 700 }}>
                          {row.overtime > 0 ? `+${row.overtime}h` : '0h'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 0' }}>
                        <Badge label={t(row.status)} color={STATUS_COLORS[row.status] || 'gray'} />
                      </td>
                      <td style={{ padding: '16px 0', textAlign: 'right' }}>
                        <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Sidebar: Time Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="glass-card-employee" style={{ padding: '32px', background: '#fff', borderRadius: 24, border: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>{t('Time Distribution')}</h3>
              
              {/* Circular Progress Mockup */}
              <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 32px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#DC2626" strokeWidth="3" strokeDasharray="75, 100" strokeLinecap="round" />
                </svg>
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
                }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#1E293B' }}>75%</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>{t('Efficiency')}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#DC2626' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>{t('Working Hours')}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>32h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563EB' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>{t('Overtime')}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>4.5h</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F1F5F9' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>{t('Breaks')}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>3.2h</span>
                </div>
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px', background: '#DC2626', borderRadius: 24, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <ArrowUpRight size={24} />
                <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0 }}>{t('Weekly Goal')}</h3>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 20 }}>
                {t('You have completed 80% of your weekly hour goal. Keep it up!')}
              </p>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '80%', height: '100%', background: '#fff', borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
