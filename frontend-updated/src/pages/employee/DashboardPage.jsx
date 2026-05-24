import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAttendance,
  getMyTasks,
  getMyShifts,
  clockAttendance,
} from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Play,
  Check,
  ChevronRight,
  ClipboardList,
  Calendar,
  RefreshCw
} from 'lucide-react';

export function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();
  const employeeID = user?.employee_id;

  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!employeeID) return;
    setLoading(true);
    try {
      const [attData, taskData, shiftData] = await Promise.all([
        getMyAttendance(employeeID).catch(() => []),
        getMyTasks(employeeID).catch(() => []),
        getMyShifts(employeeID).catch(() => []),
      ]);
      setAttendance(Array.isArray(attData) ? attData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setShifts(Array.isArray(shiftData) ? shiftData : []);
    } catch (error) {
      toast(error.message || 'Failed to load workspace.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeID]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayAttendance = attendance.find((item) => item.date === todayKey);
  const isClockedIn = todayAttendance?.clockIn && !todayAttendance?.clockOut;

  const handleClockAction = async () => {
    try {
      const type = !todayAttendance?.clockIn ? 'in' : 'out';
      await clockAttendance({ type });
      toast(`${t('Attendance synchronized')}: ${type === 'in' ? t('Clocked In') : t('Clocked Out')}`, 'success');
      await loadData();
    } catch (err) {
      toast(err.message || 'Clock action failed', 'error');
    }
  };

  // Mock data to match image exactly if needed, or use real data
  const displayTasks = useMemo(() => {
    if (tasks.length > 0) return tasks.slice(0, 3);
    return [
      { id: 1, title: 'Complete Q4 Performance Review', priority: 'HIGH', progress: 60, deadline: '17/02/2026', description: 'Prepare and submit self-assessment for quarterly review. Include key achievements and goals for next year.' },
      { id: 2, title: 'Update Project Documentation', priority: 'MEDIUM', progress: 30, deadline: '20/02/2026', description: 'Document recent changes to the authentication system and update the API reference guide.' },
      { id: 3, title: 'Code Review - Payment Module', priority: 'HIGH', progress: 0, deadline: '17/02/2026', description: 'Review pull requests for the new payment integration and ensure security standards are met.' },
    ];
  }, [tasks]);

  const deadlines = [
    { title: 'Q4 Review Submission', time: '11:59 PM', type: 'HARD' },
    { title: 'Sprint Retrospective', time: '02:00 PM', type: 'EVENT' },
    { title: 'Code Review - Payment', time: '05:00 PM', type: 'SOFT' },
  ];

  if (loading) return (
    <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
      <Spinner size="lg" color="var(--red-600)" />
    </div>
  );

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 32, maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Left Column: Attendance & Deadlines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Attendance Card */}
          <div className="glass-card-employee" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#DC2626', marginBottom: 24 }}>
              <Clock size={20} />
              <span style={{ fontWeight: 800, fontSize: 15 }}>Attendance</span>
            </div>
            
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#1E293B', letterSpacing: '-0.02em' }}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#64748B', marginTop: 4 }}>
                {time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>

            <button className="btn-red-primary" onClick={handleClockAction} style={{ width: '100%', justifyContent: 'center', padding: '18px' }}>
              <Play size={18} fill="currentColor" />
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </button>

            <button style={{ 
              marginTop: 20, background: 'none', border: 'none', color: '#64748B', 
              fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', 
              alignItems: 'center', gap: 6, margin: '20px auto 0' 
            }}>
              <RefreshCw size={14} />
              Request correction
            </button>
          </div>

          {/* Today's Deadlines */}
          <div className="glass-card-employee" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Today's Deadlines</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {deadlines.map((item, i) => (
                <div key={i} style={{ 
                  padding: '16px', background: '#F8FAFC', borderRadius: 20, 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B' }}>{item.title}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', marginTop: 2 }}>{item.time}</div>
                  </div>
                  <div className={`badge-${item.type === 'HARD' ? 'red' : item.type === 'EVENT' ? 'blue' : 'gray'}`} style={{
                    fontSize: 10, padding: '4px 8px', borderRadius: 8, background: item.type === 'HARD' ? '#FEE2E2' : '#EFF6FF', color: item.type === 'HARD' ? '#DC2626' : '#2563EB'
                  }}>
                    {item.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tasks */}
        <div className="glass-card-employee" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ClipboardList size={22} color="#DC2626" />
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>My Tasks</h3>
            </div>
            <button style={{ 
              width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E2E8F0', 
              background: '#fff', display: 'grid', placeItems: 'center', color: '#64748B', cursor: 'pointer' 
            }}>
              <Plus size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {displayTasks.map((task) => (
              <div key={task.id} style={{ paddingBottom: 24, borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>{task.title}</h4>
                    <span className="badge-red" style={{ fontSize: 9 }}>{task.priority}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 12, fontWeight: 700 }}>
                    <Clock size={14} />
                    {task.deadline}
                  </div>
                </div>
                
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 16, fontWeight: 500 }}>
                  {task.description}
                </p>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="progress-bar-red">
                    <div className="progress-bar-red-fill" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {task.progress === 0 ? (
                      <button className="btn-red-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                        <Play size={14} fill="currentColor" />
                        Start Task
                      </button>
                    ) : (
                      <>
                        <button style={{ 
                          padding: '8px 16px', borderRadius: 12, border: '1.5px solid #E2E8F0', 
                          background: '#fff', color: '#2563EB', fontSize: 12, fontWeight: 800, 
                          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' 
                        }}>
                          <Plus size={14} />
                          Update Progress
                        </button>
                        <button style={{ 
                          padding: '8px 16px', borderRadius: 12, border: 'none', 
                          background: '#22C55E', color: '#fff', fontSize: 12, fontWeight: 800, 
                          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' 
                        }}>
                          <Check size={14} />
                          Complete
                        </button>
                      </>
                    )}
                  </div>
                  <button style={{ border: 'none', background: 'none', color: '#64748B', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      
      <style>{`
        .btn-red-primary:hover { background: #B91C1C; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); }
      `}</style>
    </div>
  );
}
