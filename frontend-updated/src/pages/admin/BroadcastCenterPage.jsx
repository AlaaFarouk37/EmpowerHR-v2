import { useEffect, useState, useMemo } from 'react';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  Input, 
  Modal, 
  Textarea, 
  useToast,
  PageHeader,
  Skeleton
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Send, 
  Users, 
  BarChart3, 
  Radio,
  Plus,
  Trash2,
  Clock,
  Layout,
  ExternalLink,
  ChevronRight,
  Zap,
  Globe,
  Wifi,
  Signal,
  MoreVertical,
  Activity,
  Layers,
  Cpu,
  Monitor,
  Bell,
  CheckCircle2,
  X
} from 'lucide-react';

const LS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } };
const SS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function BroadcastCenterPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [messages, setMessages] = useState(() => LS('admin_broadcasts', []));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', priority: 'Normal', target: 'All Employees', isScheduled: false, scheduledAt: '' });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { SS('admin_broadcasts', messages); }, [messages]);

  const stats = useMemo(() => {
    return {
      total: messages.length,
      active: messages.filter(m => m.status === 'Sent').length,
      reach: '98.4%',
      deliveryVelocity: '0.8s'
    };
  }, [messages]);

  const handleSend = () => {
    if (!form.title.trim() || !form.content.trim()) {
      return toast(t('Please fill in both title and content'), 'error');
    }

    const newMessage = {
      id: Date.now(),
      title: form.title,
      content: form.content,
      priority: form.priority,
      target: form.target,
      sentAt: form.isScheduled ? form.scheduledAt : new Date().toISOString(),
      status: form.isScheduled ? 'Scheduled' : 'Sent',
      engagement: Math.floor(Math.random() * 40) + 60 // Mock engagement
    };

    setMessages([newMessage, ...messages]);
    setIsModalOpen(false);
    setForm({ title: '', content: '', priority: 'Normal', target: 'All Employees', isScheduled: false, scheduledAt: '' });
    toast(form.isScheduled ? t('Transmission scheduled in registry') : t('Broadcast transmitted to enterprise nodes'), 'success');
  };

  const deleteMessage = (id) => {
    setMessages(p => p.filter(m => m.id !== id));
    toast(t('Broadcast node removed'));
  };

  const getPriorityColor = (p) => {
    switch (p?.toLowerCase()) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusColor = (s) => {
    switch (s?.toLowerCase()) {
      case 'sent': return 'green';
      case 'scheduled': return 'blue';
      default: return 'gray';
    }
  };

  if (loading) return (
    <div className="page-content" style={{ padding: '40px 60px', background: 'var(--bg-secondary)' }}>
      <Skeleton height={80} style={{ marginBottom: 40, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
        <Skeleton height={140} style={{ borderRadius: 28 }} />
      </div>
      <Skeleton height={500} style={{ borderRadius: 32 }} />
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: 'var(--bg-secondary)', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Transmission Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
                display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(59, 130, 246, 0.2)' 
              }}>
                 <Wifi size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                 <h1 style={{ fontSize: 36, fontWeight: 950, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.03em' }}>Broadcast Center</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                   <Badge label="Signal Strength: Optimal" color="blue" />
                   <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>Registry v4.2.0 • High-Velocity Messaging</span>
                 </div>
              </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Btn 
            onClick={() => toast('Initializing transmission audit...', 'info')}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
             <Layout size={18} /> Transmission Logs
          </Btn>
          <Btn 
            onClick={() => setIsModalOpen(true)}
            variant="primary" 
            style={{ 
              height: 52, borderRadius: 16, padding: '0 28px', fontWeight: 900, 
              background: 'var(--text-primary)', border: 'none', color: 'var(--bg-primary)',
              boxShadow: '0 10px 25px -5px rgba(30, 41, 59, 0.3)' 
            }}
          >
             <Plus size={18} style={{ marginRight: 8 }} /> New Broadcast
          </Btn>
        </div>
      </div>

      {/* Signal Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {[
          { label: 'Total Transmissions', value: stats.total, icon: Send, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Active Signals', value: stats.active, icon: Signal, color: '#10B981', bg: '#ECFDF5' },
          { label: 'Signal Reach', value: stats.reach, icon: BarChart3, color: '#6366F1', bg: '#EEF2FF' },
          { label: 'Disbursement Velocity', value: stats.deliveryVelocity, icon: Activity, color: '#F59E0B', bg: '#FFFBEB' }
        ].map((item, idx) => (
          <div key={idx} className="glass-card-employee" style={{ padding: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{t(item.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 950, color: 'var(--text-primary)' }}>{item.value}</div>
            </div>
            <div style={{ 
              width: 48, height: 48, borderRadius: 16, background: item.bg, color: item.color, 
              display: 'grid', placeItems: 'center', opacity: 0.9
            }}>
              <item.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast Ledger Matrix */}
      <div className="glass-card-employee" style={{ overflow: 'hidden', border: '1.5px solid var(--glass-border)', background: 'var(--glass-bg)', padding: 0, backdropFilter: 'blur(10px)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(248, 250, 252, 0.05)', borderBottom: '1.5px solid var(--border-primary)' }}>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transmission Protocol</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Target Node</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Priority</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Signal Status</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Execution Time</th>
              <th style={{ textAlign: 'left', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Node Engagement</th>
              <th style={{ textAlign: 'right', padding: '24px 32px', fontSize: 11, fontWeight: 950, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ops</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(msg => (
              <tr key={msg.id} style={{ borderBottom: '1px solid var(--border-primary)', transition: 'background 0.2s' }} className="node-row">
                <td style={{ padding: '24px 32px' }}>
                  <div style={{ fontWeight: 950, color: 'var(--text-primary)', fontSize: 15 }}>{msg.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {msg.content}
                  </div>
                </td>
                <td style={{ padding: '24px 32px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
                      <Users size={14} style={{ color: '#3B82F6' }} />
                      {msg.target}
                   </div>
                </td>
                <td style={{ padding: '24px 32px' }}>
                  <Badge label={msg.priority.toUpperCase()} color={getPriorityColor(msg.priority)} />
                </td>
                <td style={{ padding: '24px 32px' }}>
                  <Badge label={msg.status.toUpperCase()} color={getStatusColor(msg.status)} variant="soft" />
                </td>
                <td style={{ padding: '24px 32px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 800 }}>
                      <Clock size={14} style={{ color: '#3B82F6' }} />
                      {new Date(msg.sentAt).toLocaleDateString()}
                   </div>
                </td>
                <td style={{ padding: '24px 32px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, height: 6, width: 80, background: 'var(--border-primary)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${msg.engagement || 0}%`, height: '100%', background: '#3B82F6', borderRadius: 10 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 950, color: 'var(--text-primary)' }}>{msg.engagement || 0}%</span>
                   </div>
                </td>
                <td style={{ padding: '24px 32px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="action-btn" title="View Engagement Dossier"><ChevronRight size={18} /></button>
                    <button onClick={() => deleteMessage(msg.id)} className="action-btn" style={{ color: '#EF4444' }} title="Remove Transmission Node"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {messages.length === 0 && (
          <div style={{ padding: '100px 0' }}>
            <EmptyState title="No active transmission nodes detected" />
          </div>
        )}
      </div>

      {/* New Broadcast Matrix Overlay */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Orchestrate New Transmission Protocol" maxWidth={800}>
        <div style={{ display: 'grid', gap: 32, padding: '20px' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Announcement Protocol Title</label>
            <input 
              placeholder="e.g. Platform Infrastructure Optimization"
              value={form.title}
              onChange={e => setForm(p => ({...p, title: e.target.value}))}
              style={{ width: '100%', height: 56, padding: '0 20px', borderRadius: 16, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 15, fontWeight: 600, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority Index</label>
              <select 
                value={form.priority}
                onChange={e => setForm(p => ({...p, priority: e.target.value}))}
                style={{ width: '100%', height: 56, padding: '0 20px', borderRadius: 16, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 14, fontWeight: 800, outline: 'none', cursor: 'pointer' }}
              >
                <option value="Normal">Normal Velocity</option>
                <option value="High">High Velocity</option>
                <option value="Critical">Critical (Force Broadcast)</option>
              </select>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Cluster</label>
              <select 
                value={form.target}
                onChange={e => setForm(p => ({...p, target: e.target.value}))}
                style={{ width: '100%', height: 56, padding: '0 20px', borderRadius: 16, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 14, fontWeight: 800, outline: 'none', cursor: 'pointer' }}
              >
                <option value="All Employees">Global Cluster (All Nodes)</option>
                <option value="Admins & Leaders">Management Layer Only</option>
                <option value="Specific Cluster">Custom Tactical Group</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transmission Payload</label>
            <textarea 
              placeholder="Enter the full operational details for transmission..."
              value={form.content}
              onChange={e => setForm(p => ({...p, content: e.target.value}))}
              style={{ width: '100%', minHeight: 180, padding: '20px', borderRadius: 20, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 15, fontWeight: 600, outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px', background: '#F8FAFC', borderRadius: 24, border: '1.5px solid #F1F5F9' }}>
             <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EEF2FF', color: '#6366F1', display: 'grid', placeItems: 'center' }}>
                <Clock size={20} />
             </div>
             <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: '#1E293B' }}>Delayed Execution Protocol</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700, marginTop: 2 }}>Synchronize transmission with a specific time-stamp.</div>
             </div>
             <input 
               type="checkbox" 
               checked={form.isScheduled}
               onChange={e => setForm(p => ({...p, isScheduled: e.target.checked}))}
               style={{ width: 24, height: 24, accentColor: '#3B82F6', cursor: 'pointer' }}
             />
          </div>

          {form.isScheduled && (
            <div className="animate-in" style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scheduled Execution Timestamp</label>
              <input 
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(p => ({...p, scheduledAt: e.target.value}))}
                style={{ width: '100%', height: 56, padding: '0 20px', borderRadius: 16, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 14, fontWeight: 800, outline: 'none' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
             <Btn variant="secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1, height: 60, borderRadius: 20, fontWeight: 850 }}>Cancel Operation</Btn>
             <Btn onClick={handleSend} style={{ flex: 1, height: 60, borderRadius: 20, background: '#1E293B', color: '#fff', border: 'none', fontWeight: 950, fontSize: 15 }}>
                {form.isScheduled ? 'Schedule Signal' : 'Transmit Signal Now'}
             </Btn>
          </div>
        </div>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .node-row:hover { background: var(--bg-secondary) !important; }
        .action-btn { 
          width: 40px; height: 40px; border: 1.5px solid var(--border-primary); background: var(--bg-primary); 
          color: var(--text-muted); border-radius: 12px; display: inline-grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
        }
        .action-btn:hover { border-color: #3B82F6; background: rgba(59, 130, 246, 0.1); transform: translateY(-2px); }
        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
