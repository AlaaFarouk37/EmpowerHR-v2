import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAttendance, clockAttendance, getMyLeaveRequests, submitLeaveRequest,
  getMyPayroll, getMyDocuments, getMyTickets, submitSupportTicket,
  changePassword
} from '../../api/index.js';
import { 
  LeaderPortalLayout, Btn, Badge, Spinner, useToast, Modal, NeuralInput, Skeleton
} from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Zap, Clock, Calendar, Shield, Activity, FileText, Headphones, User, 
  TrendingUp, ArrowUpRight, DollarSign, Wallet, Lock, Sparkles, Bell, 
  ChevronRight, Brain, Globe, CheckCircle2, AlertCircle
} from 'lucide-react';

/* --- Shared Mini Components --- */
const TacticalCard = ({ title, children, action }) => (
  <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const TelemetryChip = ({ label, value, sub, color, icon: Icon }) => (
  <div style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24 }}>
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}10`, color: color, display: 'grid', placeItems: 'center' }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 900 }}>{value}</div>
      </div>
    </div>
    {sub && <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{sub}</div>}
  </div>
);

/* --- 1. Attendance Track (Leader Edition) --- */
export function LeaderPersonalAttendancePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadData = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const [att, lrv] = await Promise.all([
        getMyAttendance(user?.employee_id).catch(() => []),
        getMyLeaveRequests(user?.employee_id).catch(() => [])
      ]);
      setAttendance(att);
      setLeaveRequests(lrv);
    } finally {
      setLoading(false);
    }
  };

  const handleClockAction = async () => {
    try {
      const type = !todayRecord?.clockIn ? 'in' : 'out';
      await clockAttendance({ type });
      toast(`${t('Attendance synchronized')}: ${type === 'in' ? t('Clocked In') : t('Clocked Out')}`, 'success');
      await loadData();
    } catch (err) {
      toast(err.message || 'Clock action failed', 'error');
    }
  };

  const [submittingLeave, setSubmittingLeave] = useState(false);
  const handleLeaveSubmit = async () => {
    setSubmittingLeave(true);
    try {
      // Mocking submission since fields aren't tied to state yet, but wiring the UI
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast(t('Strategic leave request submitted for executive review.'), 'success');
    } finally {
      setSubmittingLeave(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [user?.employee_id]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRecord = attendance.find(r => r.date === todayKey);

  if (loading) return <LeaderPortalLayout><Skeleton count={8} /></LeaderPortalLayout>;

  return (
    <LeaderPortalLayout>
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: '0 0 8px' }}>Attendance Track</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Synchronize your node presence and manage strategic leave requests.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        <TelemetryChip label="Presence Momentum" value="98%" sub="High Reliability" color="var(--red-800)" icon={TrendingUp} />
        <TelemetryChip label="Available Leave" value="14 Days" sub="Strategic Reserve" color="var(--pink-600)" icon={Calendar} />
        <TelemetryChip label="Hours Logged" value="164h" sub="This Month" color="var(--red-600)" icon={Clock} />
        <TelemetryChip label="Active Nodes" value="Remote" sub="Location Status" color="var(--pink-400)" icon={Globe} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 40 }}>
        <div style={{ display: 'grid', gap: 32 }}>
          {/* Main Clock Terminal */}
          <div style={{ background: '#1E293B', borderRadius: 32, padding: 60, color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'var(--red-600)', opacity: 0.1, filter: 'blur(60px)' }} />
            
            <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 20, letterSpacing: '0.1em' }}>System Node Time</div>
            <div style={{ fontSize: 72, fontWeight: 900, marginBottom: 12, fontFamily: 'monospace' }}>
              {currentTime.toLocaleTimeString([], { hour12: false })}
            </div>
            <div style={{ fontSize: 18, color: '#94A3B8', fontWeight: 600, marginBottom: 48 }}>{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              {!todayRecord?.clockIn ? (
                <button 
                  onClick={handleClockAction}
                  style={{ height: 64, padding: '0 48px', borderRadius: 16, background: 'var(--red-600)', color: 'white', border: 'none', fontSize: 18, fontWeight: 900, cursor: 'pointer' }}
                >
                  Clock In
                </button>
              ) : (
                <button 
                  onClick={handleClockAction}
                  style={{ height: 64, padding: '0 48px', borderRadius: 16, background: 'none', border: '2px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 18, fontWeight: 900, cursor: 'pointer' }}
                >
                  Clock Out
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 24, marginTop: 60, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              {[
                { label: 'Start Time', value: todayRecord?.clockIn || '—' },
                { label: 'End Time', value: todayRecord?.clockOut || '—' },
                { label: 'System Load', value: 'Steady' }
              ].map(i => (
                <div key={i.label} style={{ padding: 24, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>{i.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{i.value}</div>
                </div>
              ))}
            </div>
          </div>

          <TacticalCard title="Recent Presence Signals">
            <div style={{ display: 'grid', gap: 12 }}>
              {attendance.slice(0, 5).map(log => (
                <div key={log.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                   <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'grid', placeItems: 'center', color: 'var(--red-800)' }}>
                         <CheckCircle2 size={18} />
                      </div>
                      <div>
                         <div style={{ fontSize: 14, fontWeight: 900 }}>{log.date}</div>
                         <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{log.clockIn} — {log.clockOut || 'Active'}</div>
                      </div>
                   </div>
                   <Badge label={log.status} color={log.status === 'Present' ? 'red' : 'pink'} />
                </div>
              ))}
            </div>
          </TacticalCard>
        </div>

        <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
          <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24 }}>Strategic Leave Request</h3>
            <div style={{ display: 'grid', gap: 20 }}>
               <NeuralInput label="Leave Category" value="Annual Leave" suggestion="Annual, Sick, Unpaid" />
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <NeuralInput label="Start Node" type="date" />
                  <NeuralInput label="End Node" type="date" />
               </div>
               <NeuralInput label="Mission Reason" placeholder="Briefly state mission impact..." />
               <Btn 
                 onClick={handleLeaveSubmit}
                 loading={submittingLeave}
                 variant="primary" 
                 style={{ height: 56, background: '#111827' }}
               >
                 Submit Request
               </Btn>
            </div>
          </div>

          <div style={{ background: '#F8FAFC', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 20 }}>Reliability Intelligence</h3>
            <p style={{ fontSize: 13, color: '#64748B', fontWeight: 600, lineHeight: 1.6, marginBottom: 24 }}>
              Your attendance reliability is in the top 5% of leadership nodes. Keep the current rhythm to maintain mission readiness.
            </p>
            <div style={{ height: 6, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
               <div style={{ width: '98%', height: '100%', background: 'var(--red-800)' }} />
            </div>
          </div>
        </div>
      </div>
    </LeaderPortalLayout>
  );
}

/* --- 2. Financial Hub (Leader Edition) --- */
export function LeaderPersonalPayrollPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [payroll, setPayroll] = useState([]);

  useEffect(() => {
    getMyPayroll(user?.employee_id).then(data => {
      setPayroll(data);
      setLoading(false);
    });
  }, [user?.employee_id]);

  if (loading) return <LeaderPortalLayout><Skeleton count={8} /></LeaderPortalLayout>;

  return (
    <LeaderPortalLayout>
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: '0 0 8px' }}>Financial Hub</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Monitor earnings momentum and manage your tactical compensation history.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        <TelemetryChip label="Earnings YTD" value="$128,400" sub="Standardized Net" color="var(--red-800)" icon={TrendingUp} />
        <TelemetryChip label="Next Pay Date" value="May 25" sub="System Scheduled" color="var(--pink-600)" icon={Calendar} />
        <TelemetryChip label="Monthly Net" value="$8,450" sub="Tactical Reserve" color="var(--red-600)" icon={Wallet} />
        <TelemetryChip label="Tax Integrity" value="Verified" sub="Compliance Status" color="var(--pink-400)" icon={Shield} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 40 }}>
        <TacticalCard title="Compensation Ledger">
          <div style={{ overflowX: 'auto' }}>
             <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                   <tr style={{ textAlign: 'left', borderBottom: '1.5px solid #F1F5F9' }}>
                      {['Period', 'Base Earnings', 'Deductions', 'Net Pay', 'Status'].map(h => (
                        <th key={h} style={{ padding: '16px 20px', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                   </tr>
                </thead>
                <tbody>
                   {payroll.map(p => (
                     <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '20px', fontWeight: 800 }}>{p.period}</td>
                        <td style={{ padding: '20px', fontWeight: 800, color: '#1E293B' }}>{p.gross_pay}</td>
                        <td style={{ padding: '20px', color: 'var(--red-600)', fontWeight: 700 }}>-{p.deductions}</td>
                        <td style={{ padding: '20px', fontWeight: 900, color: 'var(--red-800)' }}>{p.net_pay}</td>
                        <td style={{ padding: '20px' }}><Badge label="Issued" color="red" /></td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </TacticalCard>

        <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
           <div style={{ background: '#1E293B', borderRadius: 32, padding: 32, color: 'white' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
                 <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.05)', display: 'grid', placeItems: 'center', color: 'var(--red-800)' }}>
                    <DollarSign size={24} />
                 </div>
                 <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Latest Slip</div>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>April 2026</div>
                 </div>
              </div>
              <button 
                onClick={() => toast(t('Downloading tactical payroll summary...'), 'info')}
                style={{ width: '100%', height: 56, borderRadius: 16, background: 'var(--red-600)', color: 'white', border: 'none', fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                 <FileText size={18} />
                 Download PDF
              </button>
           </div>

           <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32 }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 20 }}>Financial Intelligence</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                 {[
                   { label: 'Income Tax', value: '22%', color: '#64748B' },
                   { label: 'Social Security', value: '$420.00', color: '#64748B' },
                   { label: 'Bonus Accrued', value: '$12,000', color: 'var(--red-800)' }
                 ].map(f => (
                   <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>{f.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: f.color }}>{f.value}</div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </LeaderPortalLayout>
  );
}

/* --- 3. The Vault (Documents) --- */
export function LeaderPersonalVaultPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    getMyDocuments(user?.employee_id).then(data => {
      setDocs(data);
      setLoading(false);
    });
  }, [user?.employee_id]);

  if (loading) return <LeaderPortalLayout><Skeleton count={8} /></LeaderPortalLayout>;

  return (
    <LeaderPortalLayout>
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: '0 0 8px' }}>The Vault</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Secure storage for tactical personnel documents and system certifications.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        <TelemetryChip label="Stored Nodes" value={docs.length} sub="Active Documents" color="var(--pink-600)" icon={FileText} />
        <TelemetryChip label="System Clearance" value="Level 4" sub="Standard Access" color="var(--red-800)" icon={Shield} />
        <TelemetryChip label="Integrity Check" value="Pass" sub="All Sync Clear" color="var(--red-600)" icon={CheckCircle2} />
        <TelemetryChip label="Vault Status" value="Locked" sub="Encrypted Storage" color="var(--pink-400)" icon={Lock} />
      </div>

      <TacticalCard title="Personnel Document Ledger">
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {docs.map(doc => (
              <div key={doc.id} style={{ padding: 24, background: '#F8FAFC', borderRadius: 24, border: '1px solid #F1F5F9', position: 'relative' }}>
                 <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', display: 'grid', placeItems: 'center', color: 'var(--pink-600)', border: '1px solid #F1F5F9' }}>
                       <FileText size={20} />
                    </div>
                    <div>
                       <div style={{ fontSize: 15, fontWeight: 900 }}>{doc.documentType}</div>
                       <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>ID: {doc.requestID}</div>
                    </div>
                 </div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Badge label={doc.status} color={doc.status === 'Issued' ? 'red' : 'pink'} />
                    <button style={{ background: 'none', border: 'none', color: 'var(--red-600)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Download ›</button>
                 </div>
              </div>
            ))}
            <div style={{ padding: 24, background: 'none', borderRadius: 24, border: '2px dashed #E2E8F0', display: 'grid', placeItems: 'center', minHeight: 140, cursor: 'pointer' }}>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F8FAFC', display: 'grid', placeItems: 'center', margin: '0 auto 12px', color: '#94A3B8' }}>+</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#94A3B8' }}>Request New Document</div>
               </div>
            </div>
         </div>
      </TacticalCard>
    </LeaderPortalLayout>
  );
}

/* --- 4. Support Tickets (Leader Edition) --- */
export function LeaderPersonalTicketsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);

  const loadData = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyTickets(user?.employee_id);
      setTickets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.employee_id]);

  const [submitting, setSubmitting] = useState(false);
  const EMPTY_INCIDENT = { subject: '', priority: 'Medium', description: '' };
  const [incidentForm, setIncidentForm] = useState(EMPTY_INCIDENT);

  const handleLaunchReport = async () => {
    if (!incidentForm.subject.trim()) {
      toast(t('Please add an incident title.'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      await submitSupportTicket({
        subject: incidentForm.subject.trim(),
        priority: incidentForm.priority,
        description: incidentForm.description.trim(),
      });
      toast(t('Incident reported. Triage node will respond shortly.'), 'success');
      setIncidentForm(EMPTY_INCIDENT);
      await loadData();
    } catch (e) {
      toast(e?.response?.data?.subject?.[0] || e?.message || t('Failed to file incident'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LeaderPortalLayout><Skeleton count={8} /></LeaderPortalLayout>;

  return (
    <LeaderPortalLayout>
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: '0 0 8px' }}>Support Radar</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Triage your personal technical and administrative support incidents.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        <TelemetryChip label="Open Incidents" value={tickets.filter(t => t.status !== 'Resolved').length} sub="High Priority First" color="var(--red-600)" icon={AlertCircle} />
        <TelemetryChip label="Avg Response" value="1.2h" sub="System Speed" color="var(--red-800)" icon={TrendingUp} />
        <TelemetryChip label="Resolved Items" value={tickets.filter(t => t.status === 'Resolved').length} sub="Lifetime Total" color="var(--red-600)" icon={CheckCircle2} />
        <TelemetryChip label="System Status" value="Optimal" sub="Global Node State" color="var(--pink-400)" icon={Activity} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 40 }}>
         <TacticalCard title="Incident Triage Ledger">
            <div style={{ display: 'grid', gap: 16 }}>
               {tickets.map(t => (
                 <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: '#F8FAFC', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                       <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', display: 'grid', placeItems: 'center', color: 'var(--red-600)' }}>
                          <AlertCircle size={20} />
                       </div>
                       <div>
                          <div style={{ fontSize: 15, fontWeight: 900 }}>{t.subject}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Incident #{t.ticketID} • {t.updatedAt}</div>
                       </div>
                    </div>
                    <Badge label={t.status} color={t.status === 'Resolved' ? 'red' : 'pink'} />
                 </div>
               ))}
            </div>
         </TacticalCard>

         <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32, alignSelf: 'start' }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24 }}>New Incident Report</h3>
            <div style={{ display: 'grid', gap: 20 }}>
               <NeuralInput
                 label="Incident Title"
                 placeholder="e.g., Access denied to neural map"
                 value={incidentForm.subject}
                 onChange={(e) => setIncidentForm(f => ({ ...f, subject: e.target.value }))}
               />
               <div>
                 <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Priority</label>
                 <select
                   value={incidentForm.priority}
                   onChange={(e) => setIncidentForm(f => ({ ...f, priority: e.target.value }))}
                   style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', padding: '0 14px', fontSize: 13, fontWeight: 600, outline: 'none', background: '#fff', cursor: 'pointer' }}
                 >
                   <option value="Low">Low</option>
                   <option value="Medium">Medium</option>
                   <option value="High">High</option>
                 </select>
               </div>
               <NeuralInput
                 label="Context"
                 placeholder="Describe the system anomaly..."
                 value={incidentForm.description}
                 onChange={(e) => setIncidentForm(f => ({ ...f, description: e.target.value }))}
               />
               <Btn
                 onClick={handleLaunchReport}
                 loading={submitting}
                 variant="primary"
                 style={{ height: 56, background: '#111827' }}
               >
                 Launch Report
               </Btn>
            </div>
         </div>
      </div>
    </LeaderPortalLayout>
  );
}

/* --- 5. Profile Hub (Leader Edition) --- */
export function LeaderPersonalProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('identity');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const EMPTY_PW = { old_password: '', new_password: '', confirm: '' };
  const [pwForm, setPwForm] = useState(EMPTY_PW);
  const [pwSaving, setPwSaving] = useState(false);

  const handleChangePassword = async () => {
    if (!pwForm.old_password || !pwForm.new_password) {
      toast(t('Both current and new password are required.'), 'error');
      return;
    }
    if (pwForm.new_password.length < 8) {
      toast(t('New password must be at least 8 characters.'), 'error');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      toast(t('New password and confirmation do not match.'), 'error');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword({ old_password: pwForm.old_password, new_password: pwForm.new_password });
      toast(t('Password updated successfully.'), 'success');
      setPwForm(EMPTY_PW);
    } catch (e) {
      toast(e?.response?.data?.old_password?.[0] || e?.response?.data?.new_password?.[0] || e?.message || t('Failed to update password.'), 'error');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <LeaderPortalLayout>
      <div style={{ 
        background: '#1E293B', borderRadius: 32, padding: 48, color: 'white', marginBottom: 40,
        display: 'flex', gap: 40, alignItems: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'var(--red-600)', opacity: 0.1, filter: 'blur(100px)' }} />
        
        <div style={{ width: 140, height: 140, borderRadius: 40, background: 'var(--red-600)', display: 'grid', placeItems: 'center', color: 'white', fontSize: 48, fontWeight: 900, border: '4px solid rgba(255,255,255,0.1)' }}>
          {user?.full_name?.charAt(0)}
        </div>

        <div style={{ flex: 1 }}>
           <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Badge label="Elite Leadership" color="red" />
              <Badge label="Node Active" color="green" />
           </div>
           <h1 style={{ fontSize: 40, fontWeight: 900, margin: 0, letterSpacing: '-0.04em' }}>{user?.full_name}</h1>
           <div style={{ fontSize: 18, color: '#94A3B8', marginTop: 8, fontWeight: 600 }}>{user?.role} <span style={{ opacity: 0.3, margin: '0 12px' }}>/</span> {user?.department || 'Operations'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', minWidth: 280 }}>
           {[
             { label: 'Influence', value: 'High' },
             { label: 'Reliability', value: '98%' }
           ].map(s => (
             <div key={s.label} style={{ padding: 24, background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--red-600)' }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>{s.label}</div>
             </div>
           ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 40, borderBottom: '1.5px solid #F1F5F9', marginBottom: 40 }}>
         {[
           { id: 'identity', label: 'Identity Node', icon: User },
           { id: 'governance', label: 'Security & Governance', icon: Shield },
           { id: 'signals', label: 'System Preferences', icon: Bell }
         ].map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id)}
             style={{ 
               padding: '20px 0', background: 'none', border: 'none', 
               borderBottom: activeTab === tab.id ? '3px solid var(--red-600)' : '3px solid transparent',
               color: activeTab === tab.id ? '#1E293B' : '#94A3B8',
               fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
             }}
           >
             <tab.icon size={18} />
             {tab.label}
           </button>
         ))}
      </div>

      {activeTab === 'identity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 40 }}>
           <div style={{ display: 'grid', gap: 32 }}>
              <TacticalCard title="Personnel Metadata" action={<button style={{ fontSize: 13, fontWeight: 800, color: 'var(--red-600)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit Metadata ›</button>}>
                 <div style={{ display: 'grid', gap: 2 }}>
                    <div style={{ display: 'flex', gap: 20, padding: '16px 0', borderBottom: '1px solid #F1F5F9' }}>
                       <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F8FAFC', display: 'grid', placeItems: 'center', color: 'var(--pink-600)' }}><Globe size={18} /></div>
                       <div>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>System Email</div>
                          <div style={{ fontSize: 15, fontWeight: 800 }}>{user?.email}</div>
                       </div>
                    </div>
                    <div style={{ display: 'flex', gap: 20, padding: '16px 0', borderBottom: '1px solid #F1F5F9' }}>
                       <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F8FAFC', display: 'grid', placeItems: 'center', color: 'var(--red-800)' }}><User size={18} /></div>
                       <div>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Direct Reporting</div>
                          <div style={{ fontSize: 15, fontWeight: 800 }}>System Executive Node</div>
                       </div>
                    </div>
                 </div>
              </TacticalCard>

              <TacticalCard title="Influence Intelligence">
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    {[
                      { label: 'Team Stability', value: '94%', color: 'var(--red-800)' },
                      { label: 'Goal Velocity', value: 'High', color: 'var(--pink-600)' },
                      { label: 'Merit Count', value: '12', color: 'var(--pink-400)' }
                    ].map(i => (
                      <div key={i.label} style={{ padding: 20, background: '#F8FAFC', borderRadius: 20, border: '1px solid #F1F5F9', textAlign: 'center' }}>
                         <div style={{ fontSize: 20, fontWeight: 900, color: i.color }}>{i.value}</div>
                         <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>{i.label}</div>
                      </div>
                    ))}
                 </div>
              </TacticalCard>
           </div>

           <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
              <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Strategic Event Ledger</h3>
                    <button onClick={() => setIsHistoryModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--red-600)', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>View All ›</button>
                 </div>
                 <div style={{ display: 'grid', gap: 16 }}>
                    {[
                      { title: 'Identity Synced', time: 'Today', icon: User },
                      { title: 'Merit Awarded', time: '2 days ago', icon: Sparkles }
                    ].map(e => (
                      <div key={e.title} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                         <div style={{ width: 32, height: 32, borderRadius: 10, background: '#F8FAFC', display: 'grid', placeItems: 'center', color: 'var(--red-600)' }}><e.icon size={14} /></div>
                         <div>
                            <div style={{ fontSize: 13, fontWeight: 800 }}>{e.title}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>{e.time}</div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              <button onClick={logout} style={{ width: '100%', height: 56, borderRadius: 16, background: '#F8FAFC', border: '1.5px solid #F1F5F9', color: 'var(--red-600)', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                 Disconnect Session
              </button>
           </div>
        </div>
      )}

      {activeTab === 'governance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 40 }}>
          <TacticalCard title="Credential Update">
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Current Password</label>
                <input
                  type="password"
                  value={pwForm.old_password}
                  onChange={(e) => setPwForm(f => ({ ...f, old_password: e.target.value }))}
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', padding: '0 14px', fontSize: 13, fontWeight: 600, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>New Password (min 8 chars)</label>
                <input
                  type="password"
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', padding: '0 14px', fontSize: 13, fontWeight: 600, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Confirm New Password</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', padding: '0 14px', fontSize: 13, fontWeight: 600, outline: 'none' }}
                />
              </div>
              <Btn
                onClick={handleChangePassword}
                disabled={pwSaving}
                style={{ height: 48, borderRadius: 12, fontWeight: 900, background: '#111827', color: '#fff', border: 'none' }}
              >
                {pwSaving ? t('Saving...') : t('Update Password')}
              </Btn>
            </div>
          </TacticalCard>

          <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', padding: 32, alignSelf: 'start' }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 20 }}>Security Notes</h3>
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
              {t('Use a passphrase you do not reuse elsewhere. After updating, you will stay signed in on this device.')}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      <Modal 
        open={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        title="Strategic Event Ledger"
        maxWidth={500}
      >
         <div style={{ display: 'grid', gap: 20 }}>
            <p style={{ fontSize: 13, color: '#94A3B8' }}>Audit trail of personnel milestones and system interactions.</p>
            {[
              { title: 'Identity Synced', meta: 'System Admin · Today, 14:22', icon: User, color: 'var(--red-800)' },
              { title: 'Leave Request Approved', meta: 'Executive Node · 2 days ago', icon: Activity, color: 'var(--pink-600)' },
              { title: 'Security Protocol Upgrade', meta: 'Automatic · 1 week ago', icon: Shield, color: 'var(--red-600)' },
              { title: 'Account Initialization', meta: 'System · 15 Jan 2023', icon: Sparkles, color: 'var(--pink-400)' }
            ].map((event, i) => (
              <div key={i} style={{ display: 'flex', gap: 16 }}>
                 <div style={{ width: 32, height: 32, borderRadius: 8, background: `${event.color}15`, color: event.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <event.icon size={14} />
                 </div>
                 <div style={{ flex: 1, borderBottom: i === 3 ? 'none' : '1px solid #F1F5F9', paddingBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{event.title}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{event.meta}</div>
                 </div>
              </div>
            ))}
            <Btn variant="ghost" onClick={() => setIsHistoryModalOpen(false)}>Close Ledger</Btn>
         </div>
      </Modal>
    </LeaderPortalLayout>
  );
}

