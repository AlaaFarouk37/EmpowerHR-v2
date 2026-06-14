import { useEffect, useMemo, useState } from 'react';
import { getMyExpenses, submitExpenseClaim } from '../../api/index.js';
import { Badge, Btn, Input, Spinner, Textarea, useToast, Modal } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Receipt,
  Wallet, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Filter,
  Search,
  ChevronRight,
  FileText
} from 'lucide-react';

const INITIAL_FORM = {
  title: '',
  category: 'Travel',
  amount: '',
  expenseDate: '',
  description: '',
};

export function EmployeeExpensesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [claims, setClaims] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadClaims = async () => {
    if (!user?.employee_id) return;
    setLoading(true);
    try {
      const data = await getMyExpenses(user.employee_id);
      setClaims(Array.isArray(data) ? data : []);
    } catch (error) {
      toast('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClaims(); }, [user?.employee_id]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.amount) return toast('Required fields missing', 'error');
    setSubmitting(true);
    try {
      await submitExpenseClaim(form);
      toast('Expense submitted', 'success');
      setForm(INITIAL_FORM);
      setIsModalOpen(false);
      loadClaims();
    } catch (error) {
      toast('Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPending = claims.filter(c => c.status === 'Submitted').reduce((sum, c) => sum + Number(c.amount), 0);

  const now = new Date();
  const processedThisMonth = claims.filter(c => {
    if (!c.reviewedAt || !['Approved', 'Rejected', 'Reimbursed'].includes(c.status)) return false;
    const reviewed = new Date(c.reviewedAt);
    return reviewed.getFullYear() === now.getFullYear() && reviewed.getMonth() === now.getMonth();
  }).length;

  if (loading) return <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}><Spinner size="lg" color="#DC2626" /></div>;

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>Expenses & Claims</h1>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>Track and manage your work-related reimbursements</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-red-primary">
            <Plus size={18} />
            New Expense Claim
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          {/* Claims Ledger */}
          <div style={{ display: 'grid', gap: 24, alignContent: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: 0 }}>Recent Claims ({claims.length})</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="glass-card-employee" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Filter size={14} />
                  <span style={{ fontSize: 12, fontWeight: 800 }}>Filter</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {claims.length > 0 ? (
                claims.map(item => (
                  <div key={item.claimID} className="glass-card-employee" style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F8FAFC', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
                          <Receipt size={22} />
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 4 }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>
                            {item.category} • {item.expenseDate}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>${Number(item.amount).toLocaleString()}</div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8' }}>AMOUNT</div>
                        </div>
                        <Badge label={item.status} color={item.status === 'Approved' ? 'green' : item.status === 'Submitted' ? 'orange' : 'red'} />
                        <ChevronRight size={20} color="#CBD5E1" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-card-employee" style={{ padding: '60px', textAlign: 'center' }}>
                  <FileText size={48} color="#94A3B8" style={{ marginBottom: 20 }} />
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>No Claims Yet</h3>
                  <p style={{ color: '#64748B', fontWeight: 600 }}>Submit your first expense claim using the button above.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Reimbursement Summary</h3>
              <div style={{ display: 'grid', gap: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF2F2', color: '#DC2626', display: 'grid', placeItems: 'center' }}>
                    <Wallet size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>${totalPending.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>Pending Reimbursement</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0F9FF', color: '#0EA5E9', display: 'grid', placeItems: 'center' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>{processedThisMonth} {processedThisMonth === 1 ? 'Claim' : 'Claims'}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>Processed this month</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card-employee" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', marginBottom: 24 }}>Expense Guidelines</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  'Travel mileage rate: $0.65/mile',
                  'Meal cap: $50/day per person',
                  'Submit receipts within 30 days',
                ].map((rule, i) => (
                  <div key={i} style={{ 
                    padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9',
                    fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', gap: 12
                  }}>
                    <div style={{ color: '#DC2626' }}>•</div>
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* New Claim Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Submit New Expense Claim">
        <div style={{ display: 'grid', gap: 24 }}>
          <Input 
            label="Expense Title" 
            value={form.title} 
            onChange={e => setForm({...form, title: e.target.value})} 
            placeholder="e.g., Client Lunch at Bistro" 
            style={{ height: 48, borderRadius: 14 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={{ width: '100%', height: 48, borderRadius: 14, border: '1.5px solid #F1F5F9', background: '#fff', padding: '0 12px', outline: 'none', fontWeight: 700 }}>
                {['Travel', 'Meals', 'Supplies', 'Training', 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Input 
              label="Amount ($)" 
              type="number"
              value={form.amount} 
              onChange={e => setForm({...form, amount: e.target.value})} 
              placeholder="0.00" 
              style={{ height: 48, borderRadius: 14 }}
            />
          </div>
          <Input 
            label="Date of Expense" 
            type="date"
            value={form.expenseDate} 
            onChange={e => setForm({...form, expenseDate: e.target.value})} 
            style={{ height: 48, borderRadius: 14 }}
          />
          <Textarea 
            label="Description & Purpose" 
            value={form.description} 
            onChange={e => setForm({...form, description: e.target.value})} 
            placeholder="Please explain the business purpose of this expense..."
            style={{ minHeight: 100, borderRadius: 14 }}
          />
          <Btn onClick={handleSubmit} loading={submitting} className="btn-red-primary" style={{ height: 48, borderRadius: 14 }}>
            Submit Claim for Approval
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
