import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrGetBenchmarking } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast, Input } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Target, 
  Calendar,
  ChevronRight,
  Zap,
  Globe,
  DollarSign,
  Settings,
  Award,
  Layers,
  ChevronDown,
  Sparkles,
  SearchCode,
  MoreVertical,
  ShieldAlert
} from 'lucide-react';

export function BenchmarkingPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCluster, setActiveCluster] = useState('All Global Nodes');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await hrGetBenchmarking();
      setBenchmarks(Array.isArray(data?.benchmarks) ? data.benchmarks : []);
    } catch (error) {
      toast('Failed to load benchmarking data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredBenchmarks = useMemo(() => {
    return benchmarks.filter(b => {
      const matchesSearch = b.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [benchmarks, searchQuery]);

  const benchStats = useMemo(() => {
    return [
      { label: 'Market Parity Index', value: '88.4%', icon: Globe, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Fiscal Deviation', value: '-4.2%', icon: DollarSign, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Attrition Calibration', value: '12%', icon: Activity, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Internal Excellence', value: '74', icon: Award, color: '#10B981', bg: '#ECFDF5' },
    ];
  }, [benchmarks]);

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING GLOBAL BENCHMARKS...</div>
       </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Strategic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}>
                 <Target size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Global Benchmarking Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Calibrate organizational performance, audit market parity vectors, and monitor fiscal deviation.</p>
        </div>

        <Btn 
          onClick={() => toast(t('Initializing Global Sync...'), 'info')}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Zap size={18} style={{ marginRight: 8 }} /> {t('Initialize Market Sync')}
        </Btn>
      </div>

      {/* Benchmarking Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {benchStats.map(s => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(s.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 24, border: '1.5px solid #F1F5F9', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
           <div style={{ position: 'relative' }}>
              <select 
                value={activeCluster}
                onChange={(e) => setActiveCluster(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 200 }}
              >
                 <option value="All Global Nodes">{t('All Global Nodes')}</option>
                 <option value="Engineering">{t('Engineering Hub')}</option>
                 <option value="Executive">{t('Executive Board')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search organizational nodes...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: 44, padding: '0 16px 0 48px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 600, width: 320, outline: 'none' }} 
              />
           </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
           <Btn variant="secondary" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Filter size={16} style={{ marginRight: 8 }} /> {t('Neural Filters')}
           </Btn>
           <Btn variant="outline" style={{ borderRadius: 12, height: 44, fontWeight: 800 }}>
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Global Parity Matrix')}
           </Btn>
        </div>
      </div>

      {/* Neural Benchmarking Ledger */}
      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Organizational Node', 'Market Parity', 'Internal Excellence', 'Fiscal Deviation', 'Tactics'].map(h => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBenchmarks.map((bench, idx) => {
              const delta = Math.abs(bench.variance || 0);
              const isNegative = (bench.variance || 0) < 0;
              const isCritical = isNegative && delta > 15;
              
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: isCritical ? 'rgba(220, 38, 38, 0.02)' : 'transparent' }} className="bench-row">
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 14, background: isCritical ? 'var(--pink-50)' : 'var(--red-50)', 
                        display: 'grid', placeItems: 'center', color: isCritical ? 'var(--pink-600)' : 'var(--red-600)', border: `1px solid ${isCritical ? 'var(--pink-100)' : 'var(--red-100)'}`,  
                        fontSize: 16, fontWeight: 900
                      }}>
                         {(bench.department || 'E').charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{bench.department || 'Strategic Hub'}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{bench.jobTitle || 'Core Node'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>
                        $\${((bench.marketMedian || 0) / 1000).toFixed(1)}k
                     </div>
                     <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: 4 }}>Global Benchmark</div>
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                     <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--red-600)' }}>
                        $\${((bench.internalAvg || 0) / 1000).toFixed(1)}k
                     </div>
                     <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: 4 }}>Internal Vector</div>
                  </td>
                  <td style={{ padding: '24px 32px', minWidth: 200 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                           <div style={{ width: `${Math.min(delta * 4, 100)}%`, height: '100%', background: isNegative ? 'var(--pink-600)' : 'var(--red-600)', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 900, color: isNegative ? 'var(--pink-600)' : 'var(--red-600)', width: 40 }}>
                          {isNegative ? '-' : '+'}{delta}%
                        </span>
                     </div>
                     {isCritical && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pink-600)', fontSize: 10, fontWeight: 900, marginTop: 8, letterSpacing: '0.05em' }}>
                          <ShieldAlert size={12} /> CRITICAL DEVIATION
                       </div>
                     )}
                  </td>
                  <td style={{ padding: '24px 32px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                       <button className="action-btn" title="Audit Fiscal Vector"><SearchCode size={18} /></button>
                       <button className="action-btn" title="Execute Calibration"><Settings size={18} /></button>
                       <button className="action-btn" title="Tactical Options"><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .bench-row:hover { background: #FBFBFF; }
        .action-btn { 
          width: 36px; height: 36px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 10px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
