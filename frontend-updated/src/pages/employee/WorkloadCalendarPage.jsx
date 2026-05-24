import { useState, useMemo, useEffect } from 'react';
import { getMyShifts, getMyTasks, getMyLeaveRequests } from '../../api/index.js';
import { Badge, Btn, Skeleton, useToast } from '../../components/shared/index.jsx';
import { BadgeIndicator } from "../../features/common/ui/Badge.jsx";
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export function WorkloadCalendarPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const toast = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const loadCalendarData = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const [shifts, tasks, leaves] = await Promise.all([
        getMyShifts(user.employee_id),
        getMyTasks(user.employee_id),
        getMyLeaveRequests(user.employee_id)
      ]);

      const unifiedEvents = {};

      if (Array.isArray(shifts)) {
        shifts.forEach(shift => {
          const dateKey = new Date(shift.startTime || shift.date).toDateString();
          if (!unifiedEvents[dateKey]) unifiedEvents[dateKey] = [];
          unifiedEvents[dateKey].push({
            id: `shift-${shift.shiftID}`,
            title: shift.shiftType || t('Regular Shift'),
            type: 'SHIFT',
            color: '#0EA5E9',
            time: shift.startTime ? new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          });
        });
      }

      if (Array.isArray(tasks)) {
        tasks.forEach(task => {
          if (!task.dueDate) return;
          const dateKey = new Date(task.dueDate).toDateString();
          if (!unifiedEvents[dateKey]) unifiedEvents[dateKey] = [];
          unifiedEvents[dateKey].push({
            id: `task-${task.taskID}`,
            title: task.taskName || task.title,
            type: 'TASK',
            color: 'var(--red)',
            status: task.status,
          });
        });
      }

      if (Array.isArray(leaves)) {
        leaves.forEach(leave => {
          if (leave.status !== 'Approved') return;
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toDateString();
            if (!unifiedEvents[dateKey]) unifiedEvents[dateKey] = [];
            unifiedEvents[dateKey].push({
              id: `leave-${leave.leaveID}`,
              title: leave.leaveType,
              type: 'LEAVE',
              color: 'var(--pink-400)',
            });
          }
        });
      }

      setEvents(unifiedEvents);
    } catch (error) {
      toast(t('Failed to sync calendar'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCalendarData(); }, [user?.employee_id]);

  const calendarMatrix = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    let startDay = firstDayOfMonth.getDay() - 1;
    if (startDay === -1) startDay = 6;
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, month: 'prev', date: new Date(year, month - 1, prevMonthLastDay - i) });
    }
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({ day: i, month: 'current', date: new Date(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: 'next', date: new Date(year, month + 1, i) });
    }
    return days;
  }, [currentDate]);

  const workloadStats = useMemo(() => {
    const allEvents = Object.values(events).flat();
    const tasks = allEvents.filter(e => e.type === 'TASK');
    const shifts = allEvents.filter(e => e.type === 'SHIFT');
    const focusScore = Math.min(10, (tasks.length * 0.5 + shifts.length * 0.2 + 5)).toFixed(1);
    return [
      { label: t('Focus Score'), value: focusScore, note: t('Density Index'), color: 'var(--red)' },
      { label: t('Shift Coverage'), value: shifts.length, note: t('Active sessions'), color: '#0EA5E9' },
      { label: t('Pending Tasks'), value: tasks.length, note: t('Awaiting action'), color: 'var(--pink-400)' },
    ];
  }, [events, t]);

  const [isHeatmapMode, setIsHeatmapMode] = useState(false);

  const monthYearLabel = currentDate.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });

  if (loading && Object.keys(events).length === 0) return <div className="hr-page-shell"><Skeleton height={200} /><div style={{marginTop:32}}><Skeleton height={500} /></div></div>;

  return (
    <div className="hr-page-shell" style={{ background: 'var(--neural-black)', minHeight: '100vh', color: 'white', padding: '40px 32px' }}>
      <header className="command-header" style={{ marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 32 }}>
        <div className="command-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="command-breadcrumbs" style={{ display: 'flex', gap: 12, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
            <span>{t('Home')}</span>
            <span style={{ color: 'var(--neural-pink)' }}>/</span>
            <span>{t('Operations')}</span>
            <span style={{ color: 'var(--neural-pink)' }}>/</span>
            <span style={{ color: 'white' }}>{t('Load')}</span>
          </div>
          <div className="command-date" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        </div>

        <div className="command-title-stack">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Badge label={t('Cognitive Intelligence')} color="accent" size="sm" />
            <BadgeIndicator color="success" text={t('Pulse: Online')} />
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 12, fontFamily: 'var(--serif)', letterSpacing: '-0.02em' }}>{t('Cognitive Load Monitor')}</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, maxWidth: 800, lineHeight: 1.6, fontWeight: 500 }}>{t('Mapping workforce density, task saturation, and burnout risk vectors across your personal operational timeline.')}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: t('Cognitive Load'), value: `${(workloadStats[0].value * 10).toFixed(0)}%`, accent: workloadStats[0].value > 7 ? 'var(--neural-red)' : 'var(--neural-pink)' },
              { label: t('Focus Hours'), value: '4.2h', accent: 'white' },
              { label: t('Saturation'), value: '0.64', accent: 'var(--neural-violet)' },
              { label: t('Stability'), value: 'Nominal', accent: 'var(--neural-indigo)' },
            ].map((pill) => (
              <div key={pill.label} className="glass-card" style={{ padding: '8px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{pill.label}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: pill.accent }}>{pill.value}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="ghost" onClick={loadCalendarData} style={{ color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>{t('Resync Matrix')}</Btn>
            <Btn style={{ background: 'var(--neural-gradient)', color: 'white', border: 'none', padding: '0 24px', fontWeight: 800, borderRadius: 12 }}>{t('Analyze Density')}</Btn>
          </div>
        </div>
      </header>

      {/* Burnout Alert Node */}
      {workloadStats[0].value > 8 && (
        <div className="glass-card" style={{ marginBottom: 40, padding: '24px 40px', borderRadius: 24, border: '1px solid rgba(220, 38, 38, 0.3)', background: 'rgba(220, 38, 38, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <div>
                 <div style={{ fontWeight: 900, color: 'var(--neural-red)', fontSize: 18, marginBottom: 4 }}>{t('Critical Cognitive Load Detected')}</div>
                 <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{t('Task density has exceeded safety thresholds. Tactical delegation or schedule optimization recommended.')}</div>
              </div>
           </div>
           <Btn style={{ background: 'var(--neural-red)', color: 'white', borderRadius: 14, border: 'none', padding: '12px 32px', fontWeight: 800 }}>{t('Mitigate Risk')}</Btn>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40 }}>
        <main className="hr-surface-card glass-card" style={{ padding: 0, borderRadius: 32, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding: '32px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--serif)' }}>{monthYearLabel}</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Btn variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()-1)))} style={{ color: 'white' }}>{'<'}</Btn>
              <Btn variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}>{t('Today')}</Btn>
              <Btn variant="ghost" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth()+1)))} style={{ color: 'white' }}>{'>'}</Btn>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {weekDays.map(day => (
              <div key={day} style={{ padding: '16px', textAlign: 'center', fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{t(day)}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(140px, auto)' }}>
            {calendarMatrix.map((item, idx) => {
              const dateKey = item.date.toDateString();
              const dayEvents = events[dateKey] || [];
              const isToday = dateKey === new Date().toDateString();
              const isSelected = selectedDate?.toDateString() === dateKey;
              const density = dayEvents.length;

              // Heatmap Color Logic
              let heatmapColor = isHeatmapMode ? 'transparent' : 'transparent';
              if (isHeatmapMode) {
                if (density === 0) heatmapColor = 'rgba(255,255,255,0.01)';
                else if (density <= 2) heatmapColor = 'rgba(219, 39, 119, 0.1)'; // Pink Tint
                else if (density <= 4) heatmapColor = 'rgba(219, 39, 119, 0.2)'; // Pinker
                else heatmapColor = 'rgba(220, 38, 38, 0.2)'; // Red Warning
              }

              return (
                <div key={idx} 
                  onClick={() => setSelectedDate(item.date)}
                  style={{ 
                    padding: 16, 
                    borderRight: '1px solid rgba(255,255,255,0.03)', 
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: isSelected ? 'rgba(219, 39, 119, 0.05)' : (isHeatmapMode ? heatmapColor : (item.month === 'current' ? 'transparent' : 'rgba(255,255,255,0.01)')),
                    opacity: item.month === 'current' ? 1 : 0.3,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 900, color: isToday ? 'var(--neural-red)' : 'rgba(255,255,255,0.4)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                    {item.day}
                    {isToday && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--neural-red)', boxShadow: '0 0 10px var(--neural-red)' }} />}
                  </div>
                  
                  {!isHeatmapMode ? (
                    <div style={{ display: 'grid', gap: 6, position: 'relative', zIndex: 2 }}>
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} style={{ 
                          fontSize: 10, 
                          fontWeight: 800, 
                          padding: '6px 10px', 
                          borderRadius: 8, 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.05)', 
                          borderLeft: `3px solid ${e.color === '#0EA5E9' ? 'var(--neural-pink)' : (e.color === 'var(--red)' ? 'var(--neural-red)' : 'var(--neural-violet)')}`,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: 'rgba(255,255,255,0.8)'
                        }}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 800, paddingLeft: 4 }}>+ {dayEvents.length - 3} {t('more')}</div>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', position: 'relative', zIndex: 2 }}>
                       {density > 0 && (
                         <>
                            <div style={{ fontSize: 24, fontWeight: 900, color: density > 4 ? 'var(--neural-red)' : 'var(--neural-pink)' }}>{density}</div>
                            <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Nodes')}</div>
                         </>
                       )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        <aside style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
           {selectedDate && (
             <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24, fontFamily: 'var(--serif)' }}>{selectedDate.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h4>
                <div style={{ display: 'grid', gap: 16 }}>
                   {events[selectedDate.toDateString()]?.map(e => (
                      <div key={e.id} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                         <div style={{ width: 4, height: 32, background: e.color === '#0EA5E9' ? 'var(--neural-pink)' : (e.color === 'var(--red)' ? 'var(--neural-red)' : 'var(--neural-violet)'), borderRadius: 2 }} />
                         <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>{e.title}</div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 4 }}>{e.type} {e.time && `• ${e.time}`}</div>
                         </div>
                      </div>
                   )) || <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: 32, fontWeight: 500 }}>{t('No events recorded.')}</div>}
                </div>
             </div>
           )}

           <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', color: 'var(--neural-violet)', letterSpacing: '0.1em', marginBottom: 24 }}>{t('Neural Stability')}</div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: 32, fontWeight: 400 }}>
                {t('AI predicts optimal performance windows based on your task density. Consider scheduling high-focus work for the upcoming green blocks.')}
              </p>
              <Btn style={{ width: '100%', background: 'var(--neural-gradient)', color: 'white', border: 'none', height: '48px', borderRadius: '14px', fontWeight: 800 }}>{t('Optimise Strategy')}</Btn>
           </div>

           <div className="glass-card" style={{ padding: 32, borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 20 }}>{t('Density Legend')}</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { label: t('Shifts'), color: 'var(--neural-pink)' },
                  { label: t('Tasks'), color: 'var(--neural-red)' },
                  { label: t('Leaves'), color: 'var(--neural-violet)' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}

