import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAttendance,
  getMyTasks,
  getMyShifts,
  getMyLeaveRequests,
  getMyExpenses,
  getMyTimeCorrections,
  getMyTickets,
  clockAttendance,
} from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Clock,
  CheckCircle2,
  Play,
  Calendar,
  RefreshCw,
  Plane,
  Receipt,
  Edit3,
  LifeBuoy,
  TrendingUp
} from 'lucide-react';

// "Within 2 weeks" = the request's own date is no more than 14 days away from
// today (in either direction). Filtering on the request's displayed date — not
// the auto createdAt — so seeded rows whose period is weeks old drop off.
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const isRecent = (value) => {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && Math.abs(Date.now() - d.getTime()) <= TWO_WEEKS_MS;
};

const statusColor = (status) => ({
  Approved: 'green', Reimbursed: 'green', Resolved: 'green', Closed: 'green',
  Pending: 'orange', Submitted: 'orange', Open: 'orange',
  'In Progress': 'blue',
  Rejected: 'red', Denied: 'red',
}[status] || 'gray');

const OT_LABEL = { AUTO_APPROVED: 'Approved', PENDING_REVIEW: 'Pending', REJECTED: 'Rejected' };
const OT_COLOR = { AUTO_APPROVED: 'green', PENDING_REVIEW: 'orange', REJECTED: 'red' };

const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';

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
  const [leaves, setLeaves] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    if (!employeeID) return;
    setLoading(true);
    try {
      const [attData, taskData, shiftData, leaveData, expenseData, correctionData, ticketData] = await Promise.all([
        getMyAttendance(employeeID).catch(() => []),
        getMyTasks(employeeID).catch(() => []),
        getMyShifts(employeeID).catch(() => []),
        getMyLeaveRequests(employeeID).catch(() => []),
        getMyExpenses(employeeID).catch(() => []),
        getMyTimeCorrections(employeeID).catch(() => []),
        getMyTickets(employeeID).catch(() => []),
      ]);
      setAttendance(Array.isArray(attData) ? attData : []);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setShifts(Array.isArray(shiftData) ? shiftData : []);
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      setExpenses(Array.isArray(expenseData) ? expenseData : []);
      setCorrections(Array.isArray(correctionData) ? correctionData : []);
      setTickets(Array.isArray(ticketData) ? ticketData : []);
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

  // Today's deadlines = tasks due today that aren't already done.
  const todaysDeadlines = useMemo(
    () => tasks.filter((task) => task.dueDate === todayKey && task.status !== 'Done'),
    [tasks, todayKey],
  );

  // Quick updates: requests from the last 2 weeks, with their current state.
  const quickGroups = useMemo(() => [
    {
      key: 'leave', title: 'Leave Requests', icon: Plane, path: '/employee/leave-requests',
      items: leaves.filter((l) => isRecent(l.requestedAt)).map((l) => ({
        id: l.leaveRequestID,
        primary: l.leaveType,
        secondary: `${l.startDate} → ${l.endDate}`,
        statusLabel: l.status,
        statusColor: statusColor(l.status),
      })),
    },
    {
      key: 'expense', title: 'Expense Claims', icon: Receipt, path: '/employee/expenses',
      items: expenses.filter((e) => isRecent(e.createdAt)).map((e) => ({
        id: e.claimID,
        primary: e.title,
        secondary: `$${Number(e.amount).toLocaleString()} • ${e.category}`,
        statusLabel: e.status,
        statusColor: statusColor(e.status),
      })),
    },
    {
      key: 'correction', title: 'Time Corrections', icon: Edit3, path: '/employee/attendance',
      items: corrections.filter((c) => isRecent(c.createdAt)).map((c) => ({
        id: c.correctionID,
        primary: `Correction • ${shortDate(c.date)}`,
        secondary: c.reason || 'Attendance time correction',
        statusLabel: c.status,
        statusColor: statusColor(c.status),
      })),
    },
    {
      key: 'ticket', title: 'Support Tickets', icon: LifeBuoy, path: '/employee/tickets',
      items: tickets.filter((tk) => isRecent(tk.createdAt)).map((tk) => ({
        id: tk.ticketID,
        primary: tk.subject,
        secondary: `${tk.category} • ${tk.priority}`,
        statusLabel: tk.status,
        statusColor: statusColor(tk.status),
      })),
    },
    {
      key: 'overtime', title: 'Overtime Approvals', icon: TrendingUp, path: '/employee/attendance',
      items: attendance
        .filter((a) => Number(a.overtimeHours) > 0 && a.overtimeStatus !== 'STANDARD' && isRecent(a.createdAt))
        .map((a) => ({
          id: a.attendanceID,
          primary: `${a.overtimeHours}h overtime`,
          secondary: shortDate(a.date),
          statusLabel: OT_LABEL[a.overtimeStatus] || a.overtimeStatus,
          statusColor: OT_COLOR[a.overtimeStatus] || 'gray',
        })),
    },
  ], [leaves, expenses, corrections, tickets, attendance]);

  if (loading) return (
    <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
      <Spinner size="lg" color="var(--red-600)" />
    </div>
  );

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 32, maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Left Column: Attendance */}
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
        </div>

        {/* Right Column: Today's Deadlines */}
        <div className="glass-card-employee" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calendar size={22} color="#DC2626" />
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Today's Deadlines</h3>
            </div>
            <button
              onClick={() => navigate('/employee/tasks')}
              style={{
                padding: '8px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0',
                background: '#fff', color: '#64748B', fontSize: 12, fontWeight: 800, cursor: 'pointer'
              }}
            >
              View all tasks
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {todaysDeadlines.length > 0 ? todaysDeadlines.map((task) => (
              <div
                key={task.taskID}
                onClick={() => navigate('/employee/tasks')}
                style={{ paddingBottom: 20, borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</h4>
                    <Badge label={task.priority} color={task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'orange' : 'gray'} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    <Clock size={14} />
                    Due today
                  </div>
                </div>

                {task.description && (
                  <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 16, fontWeight: 500 }}>
                    {task.description}
                  </p>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: '#1E293B', marginBottom: 8 }}>
                    <span>{task.status}</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="progress-bar-red">
                    <div className="progress-bar-red-fill" style={{ width: `${task.progress}%` }} />
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <CheckCircle2 size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
                <h4 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: '0 0 4px' }}>Nothing due today</h4>
                <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, margin: 0 }}>You have no task deadlines for today.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Quick Updates: recent requests (last 2 weeks) and their current state */}
      <div style={{ maxWidth: 1400, margin: '40px auto 0' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>Quick Updates</h2>
          <p style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Requests from the last 2 weeks and where they stand.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {quickGroups.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.key} className="glass-card-employee" style={{ padding: '24px' }}>
                <div
                  onClick={() => navigate(group.path)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={18} color="#DC2626" />
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{group.title}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', background: '#F1F5F9', padding: '2px 8px', borderRadius: 8 }}>
                    {group.items.length}
                  </span>
                </div>
                {group.items.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {group.items.slice(0, 4).map((item) => (
                      <div key={item.id} style={{
                        padding: '12px 14px', background: '#F8FAFC', borderRadius: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.primary}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.secondary}</div>
                        </div>
                        <Badge label={item.statusLabel} color={item.statusColor} />
                      </div>
                    ))}
                    {group.items.length > 4 && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textAlign: 'center', paddingTop: 4 }}>
                        +{group.items.length - 4} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#94A3B8', fontSize: 13, fontWeight: 700 }}>
                    Nothing in the last 2 weeks.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .btn-red-primary:hover { background: #B91C1C; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); }
      `}</style>
    </div>
  );
}
