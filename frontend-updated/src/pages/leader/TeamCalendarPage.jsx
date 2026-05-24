import { useState, useEffect, useMemo } from 'react';
import { 
  LeaderPortalLayout, 
  Skeleton, 
  useToast, 
  Badge,
  Btn
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Activity,
  Layers
} from 'lucide-react';
import { getTeamTasks } from '../../api/leader';
import { hrGetLeaveRequests } from '../../api/hr';

export function TeamCalendarPage() {
  const { t } = useLanguage();
  const toast = useToast();
  
  // State
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, tasks, leave

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasksData, leaveData] = await Promise.all([
          getTeamTasks(),
          hrGetLeaveRequests()
        ]);
        setTasks(tasksData || []);
        setLeaveRequests(leaveData || []);
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        toast(t('Failed to sync team schedule'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t, toast]);

  // Calendar Logic
  const monthName = useMemo(() => {
    return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Padding for first week
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      const d = new Date(year, month, -i);
      days.unshift({ date: d, isCurrentMonth: false });
    }
    
    // Days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Padding for last week
    const endPadding = 42 - days.length; // 6 weeks total
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Event Mapping
  const getEventsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTasks = tasks.filter(task => {
      const taskDate = task.due_date || task.created_at; // Fallback to created_at
      return taskDate && taskDate.startsWith(dateStr);
    });

    const dayLeaves = leaveRequests.filter(leave => {
      // Basic overlap check
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const current = new Date(date);
      current.setHours(0,0,0,0);
      return current >= start && current <= end;
    });

    return { tasks: dayTasks, leaves: dayLeaves };
  };

  const handleEventClick = (event, type) => {
    setSelectedEvent({ ...event, type });
    setShowModal(true);
  };

  const [quickAddDate, setQuickAddDate] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleDoubleClick = (date) => {
    setQuickAddDate(date);
    setShowQuickAdd(true);
  };

  const getWorkloadColor = (totalEvents) => {
    if (totalEvents === 0) return 'transparent';
    if (totalEvents === 1) return 'rgba(239, 68, 68, 0.02)';
    if (totalEvents === 2) return 'rgba(239, 68, 68, 0.05)';
    if (totalEvents >= 3) return 'rgba(239, 68, 68, 0.08)';
    return 'transparent';
  };

  if (loading) {
    return (
      <LeaderPortalLayout>
        <div style={{ padding: 40 }}>
          <Skeleton count={1} height={60} style={{ marginBottom: 20 }} />
          <Skeleton count={5} height={100} />
        </div>
      </LeaderPortalLayout>
    );
  }

  const conflictCount = daysInMonth.filter(d => getEventsForDay(d.date).tasks.length + getEventsForDay(d.date).leaves.length > 4).length;

  return (
    <LeaderPortalLayout>
      <div style={{ padding: '0 0 40px' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-50)', display: 'grid', placeItems: 'center' }}>
                <CalendarIcon size={20} style={{ color: 'var(--red-600)' }} />
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Team Workload</h2>
            </div>
            <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Tactical overview of tasks, leaves, and team availability.</p>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="secondary" onClick={handleToday} style={{ fontWeight: 800 }}>{t('Today')}</Btn>
            <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 12, padding: 4 }}>
              <button 
                onClick={handlePrevMonth}
                style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <ChevronLeft size={18} />
              </button>
              <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', fontWeight: 800, fontSize: 14, minWidth: 150, justifyContent: 'center' }}>
                {monthName}
              </div>
              <button 
                onClick={handleNextMonth}
                style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <Btn variant="primary" style={{ background: 'var(--red-600)', border: 'none', fontWeight: 800 }}>
              <Plus size={18} style={{ marginRight: 8 }} /> Quick Add
            </Btn>
          </div>
        </div>

        {/* Schedule Intelligence Banner */}
        <div style={{ background: 'linear-gradient(90deg, #1E293B 0%, #334155 100%)', borderRadius: 20, padding: '20px 24px', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center' }}>
              <Activity size={20} style={{ color: 'var(--red-400)' }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 }}>Schedule Intelligence</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {conflictCount > 0 
                  ? `${conflictCount} ${t('potential delivery conflicts detected in this cycle.')}`
                  : t('Team availability is optimal. No scheduling risks identified.')}
              </div>
            </div>
          </div>
          <Badge label="AI Risk Analysis" color={conflictCount > 0 ? 'red' : 'green'} />
        </div>

        {/* Filters & Stats */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          <div style={{ flex: 1, display: 'flex', gap: 12 }}>
            <button 
              onClick={() => setFilterType('all')}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #F1F5F9', background: filterType === 'all' ? '#1E293B' : '#fff', color: filterType === 'all' ? '#fff' : '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              All Events
            </button>
            <button 
              onClick={() => setFilterType('tasks')}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #F1F5F9', background: filterType === 'tasks' ? '#1E293B' : '#fff', color: filterType === 'tasks' ? '#fff' : '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Tasks Only
            </button>
            <button 
              onClick={() => setFilterType('leave')}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #F1F5F9', background: filterType === 'leave' ? '#1E293B' : '#fff', color: filterType === 'leave' ? '#fff' : '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Leaves Only
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red-500)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{tasks.length} Tasks</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pink-500)' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{leaveRequests.length} Leave Requests</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          {/* Days Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(140px, auto)' }}>
            {daysInMonth.map((dayObj, idx) => {
              const { tasks: dayTasks, leaves: dayLeaves } = getEventsForDay(dayObj.date);
              const totalEvents = dayTasks.length + dayLeaves.length;
              const isToday = dayObj.date.toDateString() === new Date().toDateString();
              const hasConflict = totalEvents > 4;
              
              return (
                <div 
                  key={idx} 
                  onDoubleClick={() => handleDoubleClick(dayObj.date)}
                  style={{ 
                    padding: 12, 
                    borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #F1F5F9', 
                    borderBottom: idx >= 35 ? 'none' : '1px solid #F1F5F9',
                    background: dayObj.isCurrentMonth ? getWorkloadColor(totalEvents) : '#FBFDFF',
                    opacity: dayObj.isCurrentMonth ? 1 : 0.4,
                    minHeight: 140,
                    transition: 'all 0.2s',
                    position: 'relative',
                    cursor: 'cell'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ 
                      fontSize: 14, 
                      fontWeight: 800, 
                      color: isToday ? 'var(--red-600)' : (dayObj.isCurrentMonth ? '#1E293B' : '#94A3B8'),
                      width: 28,
                      height: 28,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      background: isToday ? 'var(--red-50)' : 'transparent'
                    }}>
                      {dayObj.date.getDate()}
                    </span>
                    {hasConflict && (
                      <div title="High Workload Conflict" style={{ color: 'var(--red-600)', display: 'flex', alignItems: 'center' }}>
                        <AlertCircle size={14} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(filterType === 'all' || filterType === 'tasks') && dayTasks.slice(0, 3).map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => handleEventClick(task, 'task')}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: 6, 
                          background: 'rgba(239, 68, 68, 0.08)', 
                          borderLeft: '3px solid var(--red-500)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--red-700)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {task.title || task.name || 'Untitled Task'}
                      </div>
                    ))}

                    {(filterType === 'all' || filterType === 'leave') && dayLeaves.slice(0, 2).map(leave => (
                      <div 
                        key={leave.id} 
                        onClick={() => handleEventClick(leave, 'leave')}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: 6, 
                          background: 'rgba(236, 72, 153, 0.08)', 
                          borderLeft: '3px solid var(--pink-500)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--pink-700)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {leave.employee_name || 'Leave Request'}
                      </div>
                    ))}

                    {(dayTasks.length > 3 || dayLeaves.length > 2) && (
                      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textAlign: 'center', marginTop: 4 }}>
                        + {dayTasks.length + dayLeaves.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 500, padding: 32, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <Badge 
                label={selectedEvent.type === 'task' ? 'Task Detail' : 'Leave Request'} 
                color={selectedEvent.type === 'task' ? 'red' : 'pink'} 
              />
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>

            <h3 style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', marginBottom: 16 }}>
              {selectedEvent.title || selectedEvent.employee_name || 'Untitled Event'}
            </h3>

            <div style={{ display: 'grid', gap: 20, marginBottom: 32 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9', display: 'grid', placeItems: 'center', color: '#64748B' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Schedule</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {selectedEvent.start_date || selectedEvent.due_date} {selectedEvent.end_date ? ` - ${selectedEvent.end_date}` : ''}
                  </div>
                </div>
              </div>

              {selectedEvent.type === 'task' ? (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9', display: 'grid', placeItems: 'center', color: '#64748B' }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Status</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedEvent.status || 'Pending'}</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9', display: 'grid', placeItems: 'center', color: '#64748B' }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Leave Type</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedEvent.leave_type || 'Annual Leave'}</div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Btn variant="primary" style={{ flex: 1, background: '#1E293B', border: 'none' }} onClick={() => setShowModal(false)}>Close</Btn>
              <Btn variant="secondary" style={{ flex: 1 }}>Edit Details</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 450, padding: 32, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>Quick Task Add</h3>
              <button onClick={() => setShowQuickAdd(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const title = e.target.elements.taskTitle.value;
              if (!title) return;
              
              toast(t('Syncing task with neural grid...'), 'info');
              try {
                await import('../../api/leader').then(api => api.createTeamTask({
                  title,
                  due_date: quickAddDate.toISOString().split('T')[0],
                  status: 'Pending'
                }));
                toast(t('Task synchronized successfully'), 'success');
                // Refresh data
                const tasksData = await getTeamTasks();
                setTasks(tasksData || []);
                setShowQuickAdd(false);
              } catch (err) {
                toast(t('Failed to sync task'), 'error');
              }
            }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Selected Date</div>
                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9', fontWeight: 700 }}>
                  {quickAddDate?.toLocaleDateString('default', { dateStyle: 'long' })}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Task Title</div>
                <input 
                  name="taskTitle"
                  type="text" 
                  placeholder="What needs to be done?"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', fontSize: 14, fontWeight: 600, outline: 'none' }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Btn type="submit" variant="primary" style={{ flex: 1, background: 'var(--red-600)', border: 'none' }}>
                  Create Task
                </Btn>
                <Btn type="button" variant="secondary" style={{ flex: 1 }} onClick={() => setShowQuickAdd(false)}>Cancel</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </LeaderPortalLayout>
  );
}
