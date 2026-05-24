import { useState, useEffect, useMemo } from 'react';
import { 
  LeaderPortalLayout, 
  Skeleton, 
  useToast, 
  Badge,
  Input,
  Textarea,
  Btn
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Headphones, 
  Plus, 
  Search, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  X,
  AlertTriangle,
  Zap,
  Activity,
  Filter,
  ChevronRight,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export function TeamSupportPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'create'
  const [searchQuery, setSearchQuery] = useState('');
  
  const [tickets, setTickets] = useState([
    { 
      id: 'TKT-TL-001', 
      title: 'Request for additional dev for Project X', 
      status: 'RESOLVED', 
      priority: 'HIGH', 
      desc: 'The timeline for Project X has been accelerated. We need one more frontend developer to meet the deadline.',
      type: 'Resource Allocation',
      date: '2026-02-10',
      hrResponse: 'Sarah Miller has been allocated to Project X for the next two weeks.',
      urgency: 90
    },
    { 
      id: 'TKT-TL-002', 
      title: 'IntelliJ licenses for the team', 
      status: 'IN-PROGRESS', 
      priority: 'MEDIUM', 
      desc: 'Renewal needed for 4 team members. Existing licenses expiring next week.',
      type: 'Software License',
      date: '2026-02-14',
      hrResponse: 'Purchase request is with procurement.',
      urgency: 45
    },
  ]);

  const [formData, setFormData] = useState({
    title: '',
    type: 'Resource Allocation',
    priority: 'MEDIUM',
    desc: ''
  });

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => setLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  const handleCreateRequest = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.desc) {
      toast(t('Please fill in all required tactical nodes'), 'error');
      return;
    }

    const newTicket = {
      id: `TKT-TL-00${tickets.length + 1}`,
      ...formData,
      status: 'PENDING',
      date: new Date().toISOString().slice(0, 10),
      hrResponse: 'Under review by HR node...',
      urgency: formData.priority === 'HIGH' || formData.priority === 'CRITICAL' ? 85 : 30
    };

    setTickets([newTicket, ...tickets]);
    toast(`${t('Support Request Synchronized')}: ${formData.title}`, 'success');
    setView('list');
    setFormData({ title: '', type: 'Resource Allocation', priority: 'MEDIUM', desc: '' });
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tickets, searchQuery]);

  const stats = useMemo(() => {
    return [
      { label: 'Active Requests', value: tickets.filter(t => t.status !== 'RESOLVED').length, icon: Activity, color: 'var(--red-600)' },
      { label: 'Avg Resolution', value: '4.2h', icon: Clock, color: 'var(--red-800)' },
      { label: 'Neural Urgency', value: 'High', icon: Zap, color: 'var(--pink-500)' },
      { label: 'Escalations', value: '0', icon: ShieldAlert, color: 'var(--red-600)' },
    ];
  }, [tickets]);

  if (loading || authLoading) {
    return (
      <LeaderPortalLayout>
        <div style={{ padding: 40 }}>
           <Skeleton count={1} height={60} style={{ marginBottom: 40 }} />
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
              <Skeleton count={4} height={120} />
           </div>
           <Skeleton count={5} height={100} />
        </div>
      </LeaderPortalLayout>
    );
  }

  return (
    <LeaderPortalLayout>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-50)', display: 'grid', placeItems: 'center' }}>
                 <Headphones size={20} style={{ color: 'var(--red-600)' }} />
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0 }}>Support Command</h2>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Tactical resource requests and infrastructure support triage.</p>
        </div>
        <Btn 
          onClick={() => setView(view === 'list' ? 'create' : 'list')}
          variant="primary" 
          style={{ height: 48, borderRadius: 12, padding: '0 24px', fontWeight: 800, background: 'var(--red-600)', border: 'none' }}
        >
           {view === 'list' ? <><Plus size={18} style={{ marginRight: 8 }} /> Create Request</> : <><ChevronRight size={18} style={{ marginRight: 8, transform: 'rotate(180deg)' }} /> Back to Ledger</>}
        </Btn>
      </div>

      {view === 'list' ? (
        <>
          {/* Support Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9', padding: 24 }}>
                 <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--red-50)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                    <s.icon size={18} style={{ color: s.color }} />
                 </div>
                 <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{t(s.label)}</div>
                 <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: 40 }}>
             {/* Ticket Ledger */}
             <div style={{ display: 'grid', gap: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
                   <div style={{ flex: 1, position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                      <input 
                        type="text" 
                        placeholder={t('Search tickets by ID, title, or neural content...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ 
                          width: '100%', height: 48, padding: '0 16px 0 48px', 
                          borderRadius: 14, border: '1.5px solid #F1F5F9', 
                          fontSize: 14, background: '#fff', fontWeight: 600, outline: 'none'
                        }} 
                      />
                   </div>
                   <Btn variant="secondary" style={{ height: 48, borderRadius: 14 }}>
                      <Filter size={18} />
                   </Btn>
                </div>

                <div style={{ display: 'grid', gap: 24 }}>
                   {filteredTickets.map(t => (
                     <div key={t.id} style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                           <div>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                                 <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t.title}</h3>
                                 <Badge label={t.status} color={t.status === 'RESOLVED' ? 'green' : t.status === 'PENDING' ? 'gray' : 'red'} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>
                                 <span style={{ color: 'var(--red-600)' }}>{t.id}</span>
                                 <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#CBD5E1' }} />
                                 <span>{t.type}</span>
                                 <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#CBD5E1' }} />
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Clock size={12} />
                                    {t.date}
                                 </div>
                              </div>
                           </div>
                           <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>Urgency Depth</div>
                              <div style={{ width: 80, height: 6, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden' }}>
                                 <div style={{ width: `${t.urgency}%`, height: '100%', background: t.urgency > 70 ? 'var(--red-600)' : 'var(--red-400)' }} />
                              </div>
                           </div>
                        </div>

                        <p style={{ fontSize: 15, color: '#475569', fontWeight: 600, lineHeight: 1.7, margin: '0 0 32px', padding: '20px 24px', background: '#F8FAFC', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                           "{t.desc}"
                        </p>

                        <div style={{ background: 'linear-gradient(135deg, #FDF2F2 0%, #FFF5F5 100%)', border: '1.5px solid var(--red-100)', borderRadius: 24, padding: 28, position: 'relative' }}>
                           <Sparkles size={16} style={{ position: 'absolute', right: 24, top: 24, color: 'var(--red-600)', opacity: 0.3 }} />
                           <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red-800)', marginBottom: 16 }}>
                              <MessageSquare size={16} />
                              <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Neural Response Loop</span>
                           </div>
                           <p style={{ fontSize: 14, fontWeight: 700, color: '#475569', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>"{t.hrResponse}"</p>
                        </div>
                     </div>
                   ))}

                   {filteredTickets.length === 0 && (
                     <div style={{ textAlign: 'center', padding: 80, background: '#F8FAFC', borderRadius: 28, border: '2px dashed #E2E8F0' }}>
                        <Search size={48} style={{ color: '#94A3B8', margin: '0 auto 16px' }} />
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#64748B' }}>No Tactical Requests Found</div>
                        <div style={{ fontSize: 14, color: '#94A3B8', marginTop: 4 }}>Refine your neural query to locate specific support nodes.</div>
                     </div>
                   )}
                </div>
             </div>

             {/* Sidebar: Triage Insights */}
             <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
                <div style={{ background: '#1E293B', borderRadius: 28, padding: 32, color: 'white' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                      <h4 style={{ fontSize: 11, fontWeight: 900, color: 'var(--red-500)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Triage Density</h4>
                      <Zap size={18} style={{ color: 'var(--red-600)' }} />
                   </div>
                   <div style={{ display: 'grid', gap: 20 }}>
                      {[
                        { label: 'Resource Allocation', val: 65 },
                        { label: 'Software Licensing', val: 40 },
                        { label: 'Hardware Logistics', val: 25 },
                      ].map(item => (
                        <div key={item.label}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                              <span>{item.label}</span>
                              <span style={{ color: 'var(--red-400)' }}>{item.val}%</span>
                           </div>
                           <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
                              <div style={{ width: `${item.val}%`, height: '100%', background: 'var(--red-600)' }} />
                           </div>
                        </div>
                      ))}
                   </div>
                   <div style={{ marginTop: 32, padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                         <AlertTriangle size={16} style={{ color: 'var(--red-500)' }} />
                         <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, margin: 0 }}>High volume of resource requests detected this cycle.</p>
                      </div>
                   </div>
                </div>

                <div style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32 }}>
                   <h4 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24 }}>Tactical Helpdesk</h4>
                   <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, lineHeight: 1.6, marginBottom: 24 }}>Need immediate assistance with infrastructure or policy? Connect with a neural support agent.</p>
                   <Btn variant="secondary" style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 800 }}>
                      Open Direct Comms
                   </Btn>
                </div>
             </div>
          </div>
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 48, maxWidth: 900, margin: '0 auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
           <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--red-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                 <Plus size={32} style={{ color: 'var(--red-600)' }} />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: '#1E293B', margin: 0 }}>Initialize Support Request</h3>
              <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, marginTop: 8 }}>Deploy a new tactical request to the HR infrastructure grid.</p>
           </div>
           
           <form onSubmit={handleCreateRequest} style={{ display: 'grid', gap: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                 <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#475569', marginBottom: 10 }}>Request Type *</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      style={{ width: '100%', height: 52, padding: '0 16px', borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', fontSize: 14, fontWeight: 700, outline: 'none' }}
                    >
                      <option>Resource Allocation</option>
                      <option>Software License</option>
                      <option>Hardware Request</option>
                      <option>Policy Clarification</option>
                    </select>
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#475569', marginBottom: 10 }}>Priority</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={{ width: '100%', height: 52, padding: '0 16px', borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', fontSize: 14, fontWeight: 700, outline: 'none' }}
                    >
                      <option>LOW</option>
                      <option>MEDIUM</option>
                      <option>HIGH</option>
                      <option>CRITICAL</option>
                    </select>
                 </div>
              </div>

              <Input 
                label="Tactical Subject *" 
                placeholder="Brief summary of your request" 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ height: 52, borderRadius: 14 }}
              />
              
              <Textarea 
                label="Detailed Description *" 
                placeholder="Provide deep-dive details about your resource requirement..." 
                style={{ minHeight: 180, borderRadius: 18 }} 
                value={formData.desc}
                onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 16 }}>
                 <Btn type="button" onClick={() => setView('list')} variant="secondary" style={{ height: 52, padding: '0 32px', borderRadius: 14 }}>Cancel</Btn>
                 <Btn type="submit" variant="primary" style={{ height: 52, padding: '0 40px', borderRadius: 14, background: 'var(--red-600)', border: 'none', fontWeight: 900 }}>
                    Submit to Grid
                 </Btn>
              </div>
           </form>
        </div>
      )}
    </LeaderPortalLayout>
  );
}
