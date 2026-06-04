import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, Modal, Btn, Badge, useToast, Input, Textarea } from '../../components/shared/index.jsx';
import { getJobs, createJob, updateJob, hrGetPositionCatalog } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  DollarSign, 
  Briefcase, 
  Users, 
  Star, 
  Activity,
  Edit2,
  MoreVertical,
  RefreshCcw,
  Sparkles,
  Target,
  Zap,
  Globe,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';

export function HRJobPostingsPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const { resolvePath } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Active');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [positionCatalog, setPositionCatalog] = useState([]);
  const [newForm, setNewForm] = useState({
    title: '',
    level: '',
    department: '',
    employment_type: 'Full-time',
    vacancies: 1,
    description: '',
    hiring_workflow: ['Applied', 'Shortlisted', 'Interview', 'Technical Test', 'Offer', 'Hired']
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [jobData, catalogData] = await Promise.all([
        getJobs(),
        hrGetPositionCatalog().catch(() => []),
      ]);
      setJobs(Array.isArray(jobData) ? jobData : []);
      setPositionCatalog(Array.isArray(catalogData) ? catalogData : []);
    } catch { toast('Failed to load job postings', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const titleOptions = useMemo(() => {
    const seen = new Set();
    return positionCatalog
      .map(p => (p?.title || '').trim())
      .filter(t => t && !seen.has(t) && seen.add(t));
  }, [positionCatalog]);

  const levelOptions = useMemo(() => {
    if (!newForm.title) return [];
    const seen = new Set();
    return positionCatalog
      .filter(p => (p?.title || '').trim().toLowerCase() === newForm.title.trim().toLowerCase())
      .map(p => (p?.level || '').trim())
      .filter(l => !seen.has(l) && seen.add(l));
  }, [positionCatalog, newForm.title]);

  const handleCreate = async () => {
    if (!newForm.title || !newForm.description) {
      return toast('Please fill in required fields', 'error');
    }
    setSaving(true);
    try {
      const payload = {
        title: newForm.title,
        level: newForm.level || null,
        description: newForm.description,
      };
      await createJob(payload);
      toast('Requisition initialized successfully', 'success');
      setShowCreate(false);
      setNewForm({
        title: '',
        level: '',
        department: '',
        employment_type: 'Full-time',
        vacancies: 1,
        description: '',
        hiring_workflow: ['Applied', 'Shortlisted', 'Interview', 'Technical Test', 'Offer', 'Hired']
      });
      load();
    } catch (err) {
      const msg = err?.response?.data?.title?.[0] || err?.message || 'Failed to initialize requisition';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const TABS = ['Active', 'Drafts', 'Closed', 'Archived'];

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeTab === 'Drafts') return matchesSearch && job.title.includes('Marketing'); 
      if (activeTab === 'Closed') return matchesSearch && !job.is_published;
      if (activeTab === 'Archived') return job.status === 'archived';
      return matchesSearch && job.is_published;
    });
  }, [jobs, activeTab, searchQuery]);

  const acquisitionStats = useMemo(() => {
    return [
      { label: 'Open Requisitions', value: jobs.filter(j => j.is_published).length, icon: Target, color: 'var(--red-600)' },
      { label: 'Total Applications', value: jobs.reduce((acc, j) => acc + (j.submission_count || 0), 0), icon: Users, color: 'var(--red-800)' },
      { label: 'Avg Time-to-Fill', value: '18d', icon: Clock, color: 'var(--pink-500)' },
      { label: 'Offer Acceptance', value: '92%', icon: ShieldCheck, color: 'var(--red-600)' },
    ];
  }, [jobs]);

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
       <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>INITIALIZING ACQUISITION GRID...</div>
       </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}>
                 <Briefcase size={22} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>Talent Acquisition Command</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Manage organizational recruitment pipelines and high-fidelity job postings.</p>
        </div>

        <Btn 
          onClick={() => setShowCreate(true)}
          variant="primary" 
          style={{ height: 48, borderRadius: 14, padding: '0 24px', fontWeight: 900, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}
        >
           <Plus size={18} style={{ marginRight: 8 }} /> {t('Initialize New Posting')}
        </Btn>
      </div>

      {/* Acquisition Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {acquisitionStats.map(s => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--red-50)', color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(s.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Command Filter Bar */}
      <div style={{ background: '#fff', padding: '0 32px', borderRadius: 28, border: '1.5px solid #F1F5F9', marginBottom: 40, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 40 }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '24px 0',
                  background: 'none',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 800,
                  color: activeTab === tab ? 'var(--red-600)' : '#64748B',
                  borderBottom: activeTab === tab ? '3.5px solid var(--red-600)' : '3.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                {tab}
                <Badge 
                  label={tab === 'Active' ? jobs.filter(j => j.is_published).length : 0} 
                  color={activeTab === tab ? 'red' : 'gray'} 
                  style={{ fontSize: 10 }}
                />
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
             <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input 
                  type="text" 
                  placeholder={t('Search requisitions...')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ 
                    height: 44, padding: '0 16px 0 48px', 
                    borderRadius: 12, border: '1.5px solid #F1F5F9', 
                    fontSize: 13, background: '#F8FAFC', width: 280, outline: 'none', fontWeight: 600
                  }} 
                />
             </div>
             <Btn variant="secondary" style={{ borderRadius: 12, height: 44 }}><Filter size={18} /></Btn>
          </div>
        </div>
      </div>

      {/* Requisition Grid */}
      {filteredJobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '120px 0', background: '#fff', borderRadius: 32, border: '2px dashed #F1F5F9' }}>
           <Globe size={64} style={{ color: '#94A3B8', margin: '0 auto 24px', opacity: 0.2 }} />
           <div style={{ fontSize: 20, fontWeight: 900, color: '#64748B' }}>No Requisitions Found</div>
           <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 8 }}>Refine your search or initialize a new requisition node.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
          {filteredJobs.map(job => (
            <div key={job.id} style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', transition: 'all 0.3s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }} className="job-card">
              <div style={{ padding: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>{job.title}</h3>
                      <Badge 
                        label={activeTab === 'Drafts' ? 'DRAFT' : activeTab.toUpperCase()} 
                        color={activeTab === 'Active' ? 'green' : activeTab === 'Drafts' ? 'gray' : 'red'} 
                      />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>JP-00{job.id} • POSTED {new Date().toISOString().slice(0, 10)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--red-50)', color: 'var(--red-600)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Users size={18} /></button>
                    <button style={{ width: 40, height: 40, borderRadius: 10, background: '#F8FAFC', color: '#64748B', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Edit2 size={18} /></button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                   <div style={{ display: 'grid', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#64748B', fontWeight: 700 }}>
                         <Briefcase size={16} style={{ color: 'var(--red-600)' }} /> {job.department || 'General'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#64748B', fontWeight: 700 }}>
                         <MapPin size={16} style={{ color: 'var(--red-600)' }} /> {job.vacancies || 1} Vacancies
                      </div>
                   </div>
                   <div style={{ display: 'grid', gap: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#64748B', fontWeight: 700 }}>
                         <Clock size={16} style={{ color: 'var(--red-600)' }} /> {job.employment_type || 'Full Time'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#64748B', fontWeight: 700 }}>
                         <DollarSign size={16} style={{ color: 'var(--red-600)' }} /> $120k - $160k
                      </div>
                   </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                   {['React', 'Node.js', 'System Architecture'].map(tag => (
                      <span key={tag} style={{ padding: '6px 14px', background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 10, fontSize: 12, fontWeight: 800 }}>{tag}</span>
                   ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0 0', borderTop: '1.5px solid #F1F5F9' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, color: '#1E293B' }}>
                         <Users size={16} style={{ color: 'var(--red-600)' }} /> {job.submission_count || 0} Nodes
                      </div>
                      <div style={{ width: 1.5, height: 16, background: '#F1F5F9' }} />
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>Candidate Velocity: High</div>
                   </div>
                   <Btn variant="ghost" style={{ fontSize: 12, fontWeight: 900, color: 'var(--red-600)' }}>
                      View Pipeline <ChevronRight size={14} style={{ marginLeft: 4 }} />
                   </Btn>
                </div>
              </div>

              {/* Tactical Action Strip */}
              <div style={{ display: 'flex' }}>
                 {activeTab === 'Active' && (
                   <button style={{ flex: 1, height: 56, background: '#1E293B', color: '#fff', border: 'none', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <Zap size={16} style={{ color: '#EAB308' }} /> Synchronize Pipeline
                   </button>
                 )}
                 {activeTab === 'Drafts' && (
                   <button style={{ flex: 1, height: 56, background: 'var(--red-600)', color: '#fff', border: 'none', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <Send size={16} /> Deploy Requisition
                   </button>
                 )}
                 {activeTab === 'Closed' && (
                   <button style={{ flex: 1, height: 56, background: '#F1F5F9', color: '#64748B', border: 'none', fontWeight: 900, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <RefreshCcw size={16} /> Reactivate Node
                   </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Protocol Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Initialize Requisition Protocol" maxWidth={800}>
         <div style={{ display: 'grid', gap: 24, padding: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
               <div>
                  <label style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Position Title</label>
                  <select
                    value={newForm.title}
                    onChange={e => setNewForm({...newForm, title: e.target.value, level: ''})}
                    style={{ width: '100%', height: 52, borderRadius: 12, border: '1.5px solid #F1F5F9', padding: '0 16px', fontSize: 13, fontWeight: 600, background: '#fff' }}
                  >
                     <option value="">{titleOptions.length ? 'Select a position…' : 'No positions in catalog'}</option>
                     {titleOptions.map(t => (
                       <option key={t} value={t}>{t}</option>
                     ))}
                  </select>
               </div>
               <div>
                  <label style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Job Level</label>
                  <select
                    value={newForm.level}
                    onChange={e => setNewForm({...newForm, level: e.target.value})}
                    disabled={!newForm.title}
                    style={{ width: '100%', height: 52, borderRadius: 12, border: '1.5px solid #F1F5F9', padding: '0 16px', fontSize: 13, fontWeight: 600, background: newForm.title ? '#fff' : '#F8FAFC' }}
                  >
                     <option value="">{newForm.title ? (levelOptions.length ? 'Select a level…' : '(no level)') : 'Pick a title first'}</option>
                     {levelOptions.filter(l => l).map(l => (
                       <option key={l} value={l}>{l}</option>
                     ))}
                  </select>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
               <div>
                  <label style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Employment Type</label>
                  <select 
                    value={newForm.employment_type}
                    onChange={e => setNewForm({...newForm, employment_type: e.target.value})}
                    style={{ width: '100%', height: 52, borderRadius: 12, border: '1.5px solid #F1F5F9', padding: '0 16px', fontSize: 13, fontWeight: 600 }}
                  >
                     <option value="Full-time">Full-time</option>
                     <option value="Part-time">Part-time</option>
                     <option value="Contract">Contract</option>
                     <option value="Freelance">Freelance</option>
                  </select>
               </div>
               <Input 
                 label="Target Vacancies" 
                 type="number" 
                 value={newForm.vacancies}
                 onChange={e => setNewForm({...newForm, vacancies: parseInt(e.target.value)})}
                 style={{ height: 52, borderRadius: 12 }} 
               />
            </div>

            <Textarea 
              label="Operational Requirements" 
              placeholder="Define the core tactical requirements..." 
              value={newForm.description}
              onChange={e => setNewForm({...newForm, description: e.target.value})}
              style={{ minHeight: 180, borderRadius: 16 }} 
            />

            <div>
               <label style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16, display: 'block' }}>Hiring Workflow Stages</label>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {newForm.hiring_workflow.map((stage, idx) => (
                    <div key={idx} style={{ padding: '8px 16px', background: 'var(--red-50)', color: 'var(--red-600)', borderRadius: 10, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                       {stage}
                       <button 
                         onClick={() => setNewForm({...newForm, hiring_workflow: newForm.hiring_workflow.filter((_, i) => i !== idx)})}
                         style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 14, fontWeight: 900 }}
                       >×</button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const name = prompt('Enter stage name:');
                      if (name) setNewForm({...newForm, hiring_workflow: [...newForm.hiring_workflow, name]});
                    }}
                    style={{ padding: '8px 16px', border: '1.5px dashed var(--red-200)', background: 'none', color: 'var(--red-600)', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                  >+ Add Stage</button>
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12 }}>
               <Btn variant="secondary" onClick={() => setShowCreate(false)} style={{ height: 52, padding: '0 32px', borderRadius: 14 }}>Cancel</Btn>
               <Btn 
                 variant="primary" 
                 loading={saving}
                 style={{ height: 52, padding: '0 40px', background: 'var(--red-600)', border: 'none', fontWeight: 900 }} 
                 onClick={handleCreate}
               >Initialize Requisition</Btn>
            </div>
         </div>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .job-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: var(--red-200); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
