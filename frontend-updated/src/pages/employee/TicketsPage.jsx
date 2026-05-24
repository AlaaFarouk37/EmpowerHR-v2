import { useEffect, useMemo, useState } from 'react';
import { getMyTickets, submitSupportTicket } from '../../api/index.js';
import { Badge, Btn, Input, Spinner, Textarea, useToast, Modal } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Headset, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  LifeBuoy, 
  MessageSquare,
  Search,
  Plus,
  ArrowRight,
  Filter
} from 'lucide-react';

const INITIAL_FORM = {
  subject: '',
  category: 'General',
  priority: 'Medium',
  description: '',
};

export function EmployeeTicketsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadTickets = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyTickets(user.employee_id);
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || 'Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, [user?.employee_id]);

  const handleSubmit = async () => {
    if (!form.subject.trim()) return toast('Subject is required', 'error');
    setSubmitting(true);
    try {
      await submitSupportTicket(form);
      toast('Ticket created successfully', 'success');
      setForm(INITIAL_FORM);
      setIsModalOpen(false);
      loadTickets();
    } catch (error) {
      toast(error.message || 'Failed to create ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeTickets = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status));
  const closedTickets = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status));

  if (loading) return <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}><Spinner size="lg" color="#DC2626" /></div>;

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Support & Help</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Get assistance for technical or workplace issues</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-red-primary">
            <Plus size={18} />
            Create New Ticket
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Active Tickets */}
          <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Active Tickets ({activeTickets.length})</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="glass-card-employee" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Filter size={14} />
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Filter</span>
                </div>
              </div>
            </div>

            {activeTickets.length > 0 ? (
              activeTickets.map(item => (
                <div key={item.ticketID} className="glass-card-employee" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F8FAFC', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>{item.subject}</h3>
                        <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>{item.category} • Updated 2 hours ago</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Badge label={item.priority} color={item.priority === 'Critical' ? 'red' : 'orange'} />
                      <Badge label={item.status} color="red" />
                    </div>
                  </div>
                  <p style={{ color: '#64748B', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>{item.description}</p>
                  
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748B', fontSize: 13, fontWeight: 600 }}>
                        <Clock size={16} />
                        Expected resolution: Today
                     </div>
                     <button style={{ border: 'none', background: 'none', color: '#DC2626', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                        View Conversation <ArrowRight size={16} />
                     </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card-employee" style={{ padding: '60px', textAlign: 'center' }}>
                <CheckCircle size={48} color="#10B981" style={{ marginBottom: 20 }} />
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>No Active Tickets</h3>
                <p style={{ color: '#64748B', fontWeight: 600 }}>Need help? Create a ticket and we'll get back to you shortly.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Support Categories</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { label: 'IT & Hardware', icon: <Headset size={18} />, count: 12 },
                  { label: 'Payroll & Benefits', icon: <LifeBuoy size={18} />, count: 5 },
                  { label: 'Policy & Legal', icon: <Search size={18} />, count: 8 },
                ].map((cat, i) => (
                  <div key={i} style={{ 
                    padding: '16px', background: '#F8FAFC', borderRadius: 16, border: '1px solid #F1F5F9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ color: '#DC2626' }}>{cat.icon}</div>
                      <span style={{ fontWeight: 800, color: '#1E293B' }}>{cat.label}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8' }}>{cat.count} FAQs</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px', background: '#DC2626', color: '#fff' }}>
              <AlertCircle size={32} style={{ marginBottom: 20 }} />
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>Urgent Assistance?</h3>
              <p style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6, marginBottom: 24 }}>For immediate workplace safety concerns or critical IT outages, please use our internal emergency hotline.</p>
              <button style={{ 
                width: '100%', padding: '14px', borderRadius: 12, background: '#fff', border: 'none',
                color: '#DC2626', fontWeight: 900, cursor: 'pointer'
              }}>
                Call Support Now
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Create Ticket Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Support Ticket">
        <div style={{ display: 'grid', gap: 24 }}>
          <Input 
            label="Subject" 
            value={form.subject} 
            onChange={e => setForm({...form, subject: e.target.value})} 
            placeholder="What do you need help with?" 
            style={{ height: 48, borderRadius: 14 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ width: '100%', height: 48, borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', padding: '0 12px', outline: 'none', fontWeight: 700 }}>
                {['General', 'IT', 'Payroll', 'Benefits', 'Policy'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={{ width: '100%', height: 48, borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', padding: '0 12px', outline: 'none', fontWeight: 700 }}>
                {['Low', 'Medium', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <Textarea 
            label="Description" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            placeholder="Please provide as much detail as possible..."
            style={{ minHeight: 120, borderRadius: 14 }}
          />
          <Btn onClick={handleSubmit} loading={submitting} className="btn-red-primary" style={{ height: 48, borderRadius: 14 }}>
            Submit Support Request
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
