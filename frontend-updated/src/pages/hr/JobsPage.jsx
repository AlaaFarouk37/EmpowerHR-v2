import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hrGetJobs, hrUpdateJobStatus } from '../../api/index.js';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  Modal, 
  useToast, 
  Spinner
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Filter, 
  Briefcase, 
  Users, 
  Clock, 
  Activity, 
  Target, 
  Zap, 
  Globe, 
  ChevronDown, 
  SearchCode, 
  MoreVertical, 
  CheckCircle,
  Plus,
  ShieldAlert,
  Layers,
  FileText
} from 'lucide-react';

export function HRJobsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { resolvePath } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('All Pipeline States');
  const [selected, setSelected] = useState(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await hrGetJobs();
      setJobs(data || []);
    } catch (error) {
      toast(t('Failed to load talent pipelines'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchesSearch = !searchQuery || [j.title, j.department, j.location].some(v => String(v || '').toLowerCase().includes(searchQuery.toLowerCase()));
      const mappedStatus = activeStatus === 'All Pipeline States' ? 'All' : 
                          activeStatus === 'Active Requisitions' ? 'Active' :
                          activeStatus === 'Closed Nodes' ? 'Closed' : 'Draft';
      const matchesStatus = mappedStatus === 'All' || j.status === mappedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, activeStatus]);

  const pipelineStats = useMemo(() => {
    return [
      { label: 'Active Requisitions', value: jobs.filter(j => j.status === 'Active').length, icon: Briefcase, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Shortlisted Talent', value: jobs.reduce((sum, j) => sum + (j.shortlistedCount || 1), 0), icon: Users, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Pipeline Velocity', value: '4.2d', icon: Clock, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Total Deployments', value: jobs.length, icon: Layers, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [jobs]);

  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await hrUpdateJobStatus(jobId, newStatus);
      toast(t('Pipeline status synchronized'), 'success');
      loadJobs();
      setSelected(null);
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>SYNCHRONIZING ACQUISITION GRID...</div>
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
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Global Acquisition Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Audit talent funnels, monitor pipeline velocity, and deploy strategic requisitions.</p>
        </div>

        <Btn 
          onClick={() => navigate(resolvePath('/hr/jobs/create'))}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Plus size={18} style={{ marginRight: 8 }} /> {t('Deploy Requisition')}
        </Btn>
      </div>

      {/* Acquisition Telemetry Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {pipelineStats.map(s => (
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
                value={activeStatus}
                onChange={(e) => setActiveStatus(e.target.value)}
                style={{ height: 44, padding: '0 40px 0 16px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 800, color: '#1E293B', outline: 'none', appearance: 'none', minWidth: 220 }}
              >
                 <option value="All Pipeline States">{t('All Pipeline States')}</option>
                 <option value="Active Requisitions">{t('Active Requisitions')}</option>
                 <option value="Closed Nodes">{t('Closed Nodes')}</option>
                 <option value="Draft Status">{t('Draft Status')}</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
           </div>
           
           <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input 
                type="text" 
                placeholder={t('Search talent requisitions...')}
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
              <Globe size={16} style={{ marginRight: 8 }} /> {t('Global Cohorts')}
           </Btn>
        </div>
      </div>

      {/* Neural Jobs Ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 24 }}>
        {filteredJobs.map((job) => {
          const isActive = job.status === 'Active';
          return (
            <div key={job.jobID} style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }} className="job-card">
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: isActive ? 'var(--red-600)' : '#E2E8F0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 14, background: isActive ? 'var(--red-50)' : '#F8FAFC', 
                    display: 'grid', placeItems: 'center', color: isActive ? 'var(--red-600)' : '#94A3B8', border: \`1px solid \${isActive ? 'var(--red-100)' : '#F1F5F9'}\`
                  }}>
                     <Briefcase size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{job.title}</h3>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 800 }}>REQ-{job.jobID} • {job.department}</div>
                  </div>
                </div>
                <Badge label={job.status.toUpperCase()} color={isActive ? 'green' : 'gray'} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94A3B8', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Users size={14} /> Talent Pool
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{job.applicantsCount || 0}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94A3B8', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Activity size={14} /> Min EXP
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{job.minExperience || '3y'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Btn style={{ flex: 1, height: 48, borderRadius: 12, background: 'var(--red-600)', border: 'none', fontWeight: 900 }} onClick={() => navigate(resolvePath(\`/hr/jobs/\${job.jobID}\`))}>
                   Audit Pipeline
                </Btn>
                <button 
                  onClick={() => setSelected(job)}
                  className="action-btn-large" 
                  title="Pipeline Calibration"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredJobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 32, border: '1.5px dashed #E2E8F0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F8FAFC', color: '#94A3B8', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
            <FileText size={32} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>No Pipelines Active</h3>
          <p style={{ color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>Adjust your filters or deploy a new requisition node.</p>
        </div>
      )}

      {/* Calibration Modal */}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={t('Pipeline Calibration')} maxWidth={480}>
         {selected && (
           <div style={{ display: 'grid', gap: 24, padding: 8 }}>
              <div>
                 <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>{t('Node Status')}</label>
                 <div style={{ position: 'relative' }}>
                   <select 
                     value={selected.status} 
                     onChange={e => handleStatusChange(selected.jobID, e.target.value)}
                     style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 40px 0 16px', fontWeight: 900, color: '#1E293B', outline: 'none', fontSize: 14, appearance: 'none' }}
                   >
                      <option value="Active">{t('Active Requisition')}</option>
                      <option value="On Hold">{t('Suspended')}</option>
                      <option value="Closed">{t('Decommissioned')}</option>
                      <option value="Draft">{t('Draft Node')}</option>
                   </select>
                   <ChevronDown size={16} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                 </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                 <Btn style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 900, background: '#1E293B', border: 'none' }} onClick={() => navigate(resolvePath(\`/hr/jobs/edit/\${selected.jobID}\`))}>
                    Modify Parameters
                 </Btn>
                 <Btn variant="outline" style={{ width: '100%', height: 48, borderRadius: 12, fontWeight: 900, color: 'var(--red-600)', borderColor: 'var(--red-100)', background: 'var(--red-50)' }}>
                    Decommission Node
                 </Btn>
              </div>
           </div>
         )}
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: \`
        .job-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: var(--red-100); }
        .action-btn-large { 
          width: 48px; height: 48px; border: 1.5px solid #F1F5F9; background: #fff; 
          color: #94A3B8; border-radius: 12px; display: grid; placeItems: center; 
          cursor: pointer; transition: all 0.2s; 
        }
        .action-btn-large:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      \`}} />
    </div>
  );
}
