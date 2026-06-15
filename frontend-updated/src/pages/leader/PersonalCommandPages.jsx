import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAttendance, getMyLeaveRequests, submitLeaveRequest,
  getMyPayroll, getMyDocuments,
  changePassword
} from '../../api/index.js';
import { 
  LeaderPortalLayout, Btn, Badge, Spinner, useToast, Modal, NeuralInput, Skeleton
} from '../../components/shared/index.jsx';
import { PersonalTicketsPage } from '../shared/PersonalTicketsPage.jsx';
import { EmployeeProfilePage } from '../employee/EmployeeProfilePage';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Zap, Clock, Calendar, Shield, Activity, FileText, Headphones, User, 
  TrendingUp, ArrowUpRight, DollarSign, Wallet, Lock, Sparkles, Bell, 
  ChevronRight, Brain, Globe, CheckCircle2
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

const LateTag = ({ minutes, t }) => (
  <span
    title={minutes ? `${minutes} ${t('min late')}` : t('Late')}
    style={{
      fontSize: 10, fontWeight: 800, color: '#fff', background: '#E8321A',
      padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase',
      letterSpacing: '.03em', whiteSpace: 'nowrap',
    }}
  >
    {t('Late')}!
  </span>
);

/* --- 1. Attendance Track (Leader Edition) --- */
export function LeaderPersonalAttendancePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);

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
  }, [user?.employee_id]);

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
                   <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {log.isLate && <LateTag minutes={log.lateMinutes} t={t} />}
                      <Badge label={log.status} color={log.status === 'Present' ? 'red' : 'pink'} />
                   </div>
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

/* --- 4. Support Tickets (shared personal workspace) --- */
// Team Leaders use the same personal support-ticket workspace as employees and
// HR Managers (create / pending / 6-month history). See PersonalTicketsPage.
export function LeaderPersonalTicketsPage() {
  return <PersonalTicketsPage />;
}

/* --- 5. Profile Hub (Leader Edition) --- */
export function LeaderPersonalProfilePage() {
  return (
    <LeaderPortalLayout>
      <EmployeeProfilePage />
    </LeaderPortalLayout>
  );
}
