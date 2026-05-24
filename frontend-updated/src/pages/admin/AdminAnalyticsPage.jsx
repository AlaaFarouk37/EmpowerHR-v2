import { useEffect, useMemo, useState, memo, useCallback } from 'react';
import { hrGetEmployees, hrGetLeaveRequests, hrGetExpenses, hrGetTickets, hrGetDocuments } from '../../api/index.js';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  Spinner,
  PageHeader,
  Skeleton
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  TrendingUp, 
  UserPlus, 
  Heart, 
  PieChart,
  BarChart3,
  Calendar,
  Filter,
  Download,
  Users,
  Briefcase,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Sparkles,
  Search,
  Brain,
  Zap
} from 'lucide-react';

/* --- Neural Line Chart (Memoized) --- */
const NeuralLineChart = memo(({ data, color = 'var(--color-primary-teal)' }) => {
  const points = useMemo(() => 
    data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d / Math.max(...data)) * 80}`).join(' '),
    [data]
  );
  
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible', contain: 'content' }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path 
        d={`M 0 100 L ${points} L 100 100 Z`} 
        fill="url(#lineGrad)" 
        style={{ transition: 'd 0.6s var(--ease-neural)' }}
      />
      <polyline 
        points={points} 
        fill="none" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        style={{ transition: 'points 0.6s var(--ease-neural)' }}
      />
      {data.map((d, i) => (
        <circle 
          key={i} 
          cx={(i / (data.length - 1)) * 100} 
          cy={100 - (d / Math.max(...data)) * 80} 
          r="1.5" 
          fill={color} 
          style={{ transition: 'all 0.4s var(--ease-neural)' }}
        />
      ))}
    </svg>
  );
});

/* --- Neural Bar Chart (Memoized) --- */
const NeuralBarChart = memo(({ data, color = 'var(--color-primary-teal)' }) => {
  const max = useMemo(() => Math.max(...data), [data]);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', gap: 12, padding: '20px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: '100%', height: `${(d / max) * 100}%`, background: color, 
            borderRadius: '6px 6px 0 0', opacity: 0.8, transition: 'height 0.6s var(--ease-neural)',
            willChange: 'height'
          }} />
          <div style={{ fontSize: 10, marginTop: 8, fontWeight: 700, color: 'var(--text-muted)' }}>M{i+1}</div>
        </div>
      ))}
    </div>
  );
});

const MOCK_TRENDS = [
  { month: 'Jan', headcount: 42, activity: 850 },
  { month: 'Feb', headcount: 45, activity: 920 },
  { month: 'Mar', headcount: 48, activity: 1100 },
  { month: 'Apr', headcount: 52, activity: 1050 },
  { month: 'May', headcount: 55, activity: 1250 },
  { month: 'Jun', headcount: 60, activity: 1400 },
];

export function AdminAnalyticsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    employees: [],
    leaves: [],
    expenses: [],
    tickets: [],
    documents: [],
  });
  const [neuralQuery, setNeuralQuery] = useState('');
  const [activeChart, setActiveChart] = useState('growth'); // 'growth', 'comparison', 'engagement'
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [employees, leaves, expenses, tickets, documents] = await Promise.all([
          hrGetEmployees().catch(() => []),
          hrGetLeaveRequests().catch(() => []),
          hrGetExpenses().catch(() => []),
          hrGetTickets().catch(() => []),
          hrGetDocuments().catch(() => []),
        ]);
        setData({ employees, leaves, expenses, tickets, documents });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleNeuralQuery = async (e) => {
    if (e) e.preventDefault();
    if (!neuralQuery.trim()) return;

    setIsProcessing(true);
    setAiInsight(null);

    // Simulate Neural Engine Processing
    setTimeout(() => {
      const q = neuralQuery.toLowerCase();
      if (q.includes('compare') || q.includes('bar') || q.includes('department')) {
        setActiveChart('comparison');
        setAiInsight('Neural analysis complete. Comparison view identifies "Engineering" as the high-load sector this month.');
      } else if (q.includes('engagement') || q.includes('pie') || q.includes('satisfaction')) {
        setActiveChart('engagement');
        setAiInsight('Customer satisfaction delta is +0.4x. Retention strategies are yielding optimal results.');
      } else {
        setActiveChart('growth');
        setAiInsight('Headcount velocity is stable. Predictive modeling suggests no attrition risk for the next quarter.');
      }
      setIsProcessing(false);
      setNeuralQuery('');
    }, 1200);
  };

  const distribution = useMemo(() => {
    const total = data.leaves.length + data.expenses.length + data.tickets.length + data.documents.length || 1;
    return [
      { label: 'Leave Requests', count: data.leaves.length, color: 'var(--pink-400)' },
      { label: 'Expense Claims', count: data.expenses.length, color: 'var(--red-800)' },
      { label: 'Support Tickets', count: data.tickets.length, color: '#EF4444' },
      { label: 'Document Issuance', count: data.documents.length, color: 'var(--red-600)' },
    ].map(item => ({ ...item, percentage: Math.round((item.count / total) * 100) }));
  }, [data]);

  if (loading) return (
    <div className="page-content">
      <Skeleton height={80} style={{ marginBottom: 40 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
      <Skeleton height={400} />
    </div>
  );

  return (
    <div className="page-content animate-in">
      <PageHeader 
        title="Workforce Intelligence"
        subtitle="Advanced enterprise-wide analytics and predictive workforce modeling"
        actions={[
          { label: 'Filter Range', icon: <Filter size={16} />, variant: 'outline' },
          { label: 'Export Data', icon: <Download size={16} />, variant: 'primary' }
        ]}
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        {[
          { label: 'Workforce Growth', value: '+14.2%', icon: <UserPlus size={24} />, color: 'var(--color-primary-teal)', trend: 'up' },
          { label: 'Retention Rate', value: '96.8%', icon: <Target size={24} />, color: 'var(--red-800)', trend: 'up' },
          { label: 'Avg Satisfaction', value: '4.8/5', icon: <Heart size={24} />, color: '#EF4444', trend: 'up' }
        ].map((item, idx) => (
          <div key={idx} className="card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>{t(item.label)}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, fontWeight: 600, color: item.trend === 'up' ? 'var(--red-800)' : '#EF4444' }}>
                {item.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{item.trend === 'up' ? 'Above target' : 'Needs review'}</span>
              </div>
            </div>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${item.color}15`, color: item.color, display: 'grid', placeItems: 'center' }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Main Analytics Engine */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--color-primary-teal)', color: 'white', display: 'grid', placeItems: 'center' }}>
                <Brain size={18} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Neural Analytics Engine</h3>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge label={activeChart.toUpperCase()} variant="soft" color="info" />
            </div>
          </div>

          {/* Query Bar */}
          <form onSubmit={handleNeuralQuery} style={{ position: 'relative', marginBottom: 24 }}>
             <input 
               type="text"
               value={neuralQuery}
               onChange={e => setNeuralQuery(e.target.value)}
               placeholder="Query Neural Analytics (e.g. 'Compare departments', 'Show attrition')..."
               style={{ 
                 width: '100%', padding: '14px 48px', borderRadius: 14, 
                 border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)',
                 fontSize: 14, fontWeight: 600, outline: 'none'
               }}
             />
             <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                {isProcessing ? <Zap size={18} className="animate-pulse" style={{ color: 'var(--color-primary-teal)' }} /> : <Search size={18} />}
             </div>
             <button type="submit" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'var(--color-primary-teal)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                {isProcessing ? 'Thinking...' : 'Query'}
             </button>
          </form>
          
          <div style={{ height: 260, background: 'var(--bg-secondary)', borderRadius: 20, padding: '40px 30px', position: 'relative', border: '1px solid var(--border-primary)' }}>
             {activeChart === 'growth' && <NeuralLineChart data={[40, 35, 55, 45, 70, 65, 85, 80, 100]} />}
             {activeChart === 'comparison' && <NeuralBarChart data={[60, 80, 45, 90, 70, 100]} color="var(--pink-400)" />}
             {activeChart === 'engagement' && <NeuralLineChart data={[80, 85, 75, 90, 95, 100]} color="var(--red-600)" />}
             
             <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '0 30px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 800 }}>
                <span>Q1</span><span>Q2</span><span>Q3</span><span>Q4</span>
             </div>
          </div>

          {aiInsight && (
            <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--color-primary-teal-tint)', borderRadius: 12, border: '1px solid var(--color-primary-teal-soft)', display: 'flex', gap: 12, alignItems: 'center', animation: 'slide-up 0.4s' }}>
               <Sparkles size={18} style={{ color: 'var(--color-primary-teal)', flexShrink: 0 }} />
               <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{aiInsight}</p>
            </div>
          )}
        </div>

        {/* Departmental Distribution */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Activity Distribution</h3>
          <div style={{ display: 'grid', gap: 20 }}>
            {distribution.map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ color: 'var(--text-primary)' }}>{item.percentage}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${item.percentage}%`, height: '100%', background: item.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: 20, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Intelligence Summary</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
               Enterprise cognitive load is centered on **Support Tickets**, indicating a potential need for improved onboarding documentation or AI-assisted resolution tools.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Employees', value: data.employees.length, icon: <Users size={18} /> },
          { label: 'Active Projects', value: 24, icon: <Briefcase size={18} /> },
          { label: 'Pending Audits', value: 2, icon: <ShieldAlert size={18} /> },
          { label: 'Open Positions', value: 8, icon: <Target size={18} /> }
        ].map((item, idx) => (
          <div key={idx} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: 'var(--color-primary-teal)' }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

