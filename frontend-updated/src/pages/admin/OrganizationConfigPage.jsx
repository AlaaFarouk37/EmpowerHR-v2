import { useEffect, useMemo, useState } from 'react';
import { 
  getJobs, hrGetEmployees, 
  adminGetOrgConfig, adminUpdateOrgConfig, 
  adminGetSkills, adminCreateSkill, adminDeleteSkill, 
  adminGetLeaveTypes, adminCreateLeaveType, adminDeleteLeaveType,
  adminGetSystemHealth
} from '../../api/index.js';
import { 
  Badge, 
  Btn, 
  EmptyState, 
  Input, 
  Modal, 
  Spinner, 
  Textarea, 
  useToast,
  PageHeader,
  Skeleton
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  Briefcase, 
  Target, 
  Calendar, 
  GitBranch, 
  ShieldCheck, 
  Database, 
  Settings, 
  History,
  Plus,
  Trash2,
  ChevronRight,
  Info,
  Globe,
  Zap,
  Activity,
  Layers,
  Cpu,
  Monitor
} from 'lucide-react';

import { OrgEntityProfile } from '../../features/core/components/OrgEntityProfile';
import { OrgGovernanceMatrix } from '../../features/core/components/OrgGovernanceMatrix';
import { useOrgStats } from '../../features/core/hooks/useOrgStats';

export function OrganizationConfigPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'company';
  
  const setTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };
  
  const tabs = useMemo(() => [
    { id: 'company', label: 'Company Info', icon: <Building2 size={18} /> },
    { id: 'jobs', label: 'Jobs', icon: <Briefcase size={18} /> },
    { id: 'skills', label: 'Skills', icon: <Target size={18} /> },
    { id: 'leaveTypes', label: 'Leave Types', icon: <Calendar size={18} /> },
    { id: 'hierarchy', label: 'Hierarchy', icon: <GitBranch size={18} /> },
    { id: 'governance', label: 'Governance', icon: <ShieldCheck size={18} /> },
  ], []);
  
  const [company, setCompany] = useState({ name: '', legalName: '', address: '', phone: '', email: '', workStart: '09:00', workEnd: '17:00', workingDays: [] });
  const [security, setSecurity] = useState({ twoFactorEnabled: true, sessionTimeout: 30, notificationsEnabled: true });
  const [skills, setSkills] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { departmentStats, teamStats } = useOrgStats(employees);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [j, e, cfg, sk, lv] = await Promise.all([
          getJobs().catch(() => []),
          hrGetEmployees().catch(() => []),
          adminGetOrgConfig().catch(() => ({})),
          adminGetSkills().catch(() => []),
          adminGetLeaveTypes().catch(() => []),
        ]);
        
        setJobs(Array.isArray(j) ? j : []);
        setEmployees(Array.isArray(e) ? e : []);
        
        if (cfg) {
          setCompany({
            name: cfg.name || '',
            legalName: cfg.legalName || '',
            address: cfg.address || '',
            phone: cfg.phone || '',
            email: cfg.email || '',
            workStart: cfg.workStart || '09:00',
            workEnd: cfg.workEnd || '17:00',
            workingDays: cfg.workingDays || []
          });
          setSecurity({
            twoFactorEnabled: cfg.twoFactorEnabled ?? true,
            sessionTimeout: cfg.sessionTimeout || 30,
            notificationsEnabled: cfg.notificationsEnabled ?? true
          });
        }
        
        setSkills(Array.isArray(sk) ? sk : []);
        setLeaveTypes(Array.isArray(lv) ? lv : []);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSaveCompany = async () => {
    try {
      const data = { ...company, ...security };
      await adminUpdateOrgConfig(data);
      toast(t('Organization configuration updated'), 'success');
    } catch (err) {
      toast(t('Failed to save configuration'), 'error');
    }
  };

  const addSkill = async () => {
    if (!form.name?.trim()) return;
    try {
      const res = await adminCreateSkill({ name: form.name, category: form.category || 'Technical', description: form.description || '' });
      setSkills(p => [...p, res]);
      setModal(null);
      setForm({});
      toast(t('Skill added to catalog'));
    } catch (err) {
      toast(t('Failed to add skill'), 'error');
    }
  };

  const deleteSkill = async (id) => {
    try {
      await adminDeleteSkill(id);
      setSkills(p => p.filter(s => s.skillID !== id));
      toast(t('Skill removed'));
    } catch (err) {
      toast(t('Failed to remove skill'), 'error');
    }
  };

  const addLeaveType = async () => {
    const name = (form.name || '').trim();
    if (!name) return toast(t('Leave name is required'), 'error');
    const isPaid = form.isPaid !== false; // default paid
    try {
      const res = await adminCreateLeaveType({
        name,
        max_days_per_year: isPaid ? Number(form.maxDays || 0) : 0,
        is_paid: isPaid,
      });
      setLeaveTypes(p => [...p, res]);
      setModal(null);
      setForm({});
      toast(t('Leave type created'));
    } catch (err) {
      toast(err.message || t('Failed to create leave type'), 'error');
    }
  };

  const deleteLeaveType = async (id) => {
    try {
      await adminDeleteLeaveType(id);
      setLeaveTypes(p => p.filter(lt => lt.leave_type_id !== id));
      toast(t('Leave type removed'));
    } catch (err) {
      toast(err.message || t('Failed to remove leave type'), 'error');
    }
  };

  if (loading) return (
    <div className="page-content" style={{ padding: '40px 60px', background: '#F8FAFC' }}>
      <Skeleton height={80} style={{ marginBottom: 40, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
        <Skeleton height={200} style={{ borderRadius: 28 }} />
        <Skeleton height={200} style={{ borderRadius: 28 }} />
        <Skeleton height={200} style={{ borderRadius: 28 }} />
      </div>
      <Skeleton height={400} style={{ borderRadius: 32 }} />
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      {/* Strategic Command Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #10B981, #059669)', 
                display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(16, 185, 129, 0.2)' 
              }}>
                 <Settings size={26} style={{ color: '#fff' }} />
              </div>
              <div>
                 <h1 style={{ fontSize: 36, fontWeight: 950, color: '#1E293B', margin: 0, letterSpacing: '-0.03em' }}>Core Org Parameters</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                   <Badge label="Enterprise Config Active" color="green" />
                   <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>Registry v2.8.0 • System-wide Governance Control</span>
                 </div>
              </div>
           </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Btn 
            onClick={() => toast('Exporting Config Metadata...', 'info')}
            variant="outline" 
            style={{ height: 52, borderRadius: 16, padding: '0 24px', fontWeight: 800, color: '#64748B', borderColor: '#E2E8F0' }}
          >
             <Database size={18} /> Export Index
          </Btn>
          <Btn 
            onClick={handleSaveCompany}
            variant="primary" 
            style={{ 
              height: 52, borderRadius: 16, padding: '0 28px', fontWeight: 900, 
              background: 'linear-gradient(135deg, #10B981, #047857)', border: 'none', 
              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' 
            }}
          >
             Commit Configuration
          </Btn>
        </div>
      </div>

      {/* Strategic Tabs Navigation */}
      <div style={{ 
        display: 'flex', gap: 8, marginBottom: 40, background: '#fff', 
        padding: '8px', borderRadius: 20, border: '1.5px solid #F1F5F9',
        boxShadow: '0 10px 20px -10px rgba(0,0,0,0.04)', overflowX: 'auto', whiteSpace: 'nowrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 24px',
              border: 'none',
              borderRadius: 14,
              background: activeTab === tab.id ? 'rgba(16, 185, 129, 0.08)' : 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 850,
              color: activeTab === tab.id ? '#10B981' : '#64748B',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative'
            }}
          >
            {tab.icon}
            {t(tab.label)}
            {activeTab === tab.id && (
              <div style={{ 
                position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                width: 4, height: 4, borderRadius: '50%', background: '#10B981' 
              }} />
            )}
          </button>
        ))}
      </div>

      <div className="animate-in" key={activeTab}>
        {activeTab === 'company' && (
          <OrgEntityProfile 
            company={company} 
            setCompany={setCompany} 
            onSave={handleSaveCompany} 
            departmentStats={departmentStats} 
            teamStats={teamStats} 
            employeeCount={employees.length} 
          />
        )}

        {activeTab === 'jobs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 950, color: '#1E293B', marginBottom: 4 }}>{t('Node Classifications')}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{t('Define live job positions and fiscal benchmarks.')}</p>
              </div>
              <Btn 
                variant="outline" 
                style={{ borderRadius: 14, height: 48, fontWeight: 800, borderColor: '#E2E8F0', padding: '0 20px' }}
                onClick={() => window.location.href='/hr/jobs'}
              >
                <Monitor size={18} style={{ marginRight: 10, color: '#10B981' }} /> {t('Strategic Job Board')}
              </Btn>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
              {jobs.map(job => (
                <div key={job.jobID} className="glass-card-employee" style={{ padding: 28, border: '1.5px solid #fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 18, color: '#1E293B', letterSpacing: '-0.01em' }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: 4 }}>{job.department}</div>
                    </div>
                    <Badge label={job.is_active !== false ? 'Active' : 'Archived'} color={job.is_active !== false ? 'green' : 'gray'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#F8FAFC', padding: 20, borderRadius: 18, border: '1.5px solid #F1F5F9' }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Floor Limit')}</div>
                      <div style={{ fontSize: 18, fontWeight: 950, color: '#1E293B' }}>${job.baseSalary || '0'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Ceiling Limit')}</div>
                      <div style={{ fontSize: 18, fontWeight: 950, color: '#10B981' }}>${job.salaryCap || '0'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 950, color: '#1E293B', marginBottom: 4 }}>{t('Competency Index')}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{t('Maintain high-fidelity organizational skill matrices.')}</p>
              </div>
              <Btn 
                variant="primary" 
                style={{ height: 48, borderRadius: 14, background: '#10B981', border: 'none', fontWeight: 900, padding: '0 24px' }}
                onClick={() => setModal('skill')}
              >
                <Plus size={18} style={{ marginRight: 8 }} /> {t('Register Skill')}
              </Btn>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {skills.map(skill => (
                <div key={skill.skillID} className="glass-card-employee" style={{ padding: 28, border: '1.5px solid #fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', display: 'grid', placeItems: 'center' }}>
                       <Target size={22} />
                    </div>
                    <button onClick={() => deleteSkill(skill.skillID)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: 8, transition: 'all 0.2s' }} className="delete-btn">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950, fontSize: 17, color: '#1E293B' }}>{skill.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: 4 }}>{skill.category}</div>
                  </div>
                  <p style={{ fontSize: 13, color: '#64748B', fontWeight: 600, lineHeight: 1.6, marginTop: 16 }}>{skill.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'leaveTypes' && (
          <div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 950, color: '#1E293B', marginBottom: 4 }}>{t('Absence Governance')}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{t('Configure global leave parameters and accrual logic.')}</p>
              </div>
              <Btn
                variant="primary"
                style={{ height: 48, borderRadius: 14, background: '#10B981', border: 'none', fontWeight: 900, padding: '0 24px' }}
                onClick={() => { setForm({ isPaid: true }); setModal('leave'); }}
              >
                <Plus size={18} style={{ marginRight: 8 }} /> {t('Add Leave Type')}
              </Btn>
            </div>

            {leaveTypes.length === 0 ? (
              <EmptyState icon={<Calendar size={40} />} title={t('No leave types yet')} subtitle={t('Add a leave type to define how time off is tracked across the organization.')} />
            ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
              {leaveTypes.map(lt => (
                <div key={lt.leave_type_id} className="glass-card-employee" style={{ padding: 32, border: '1.5px solid #fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: lt.is_paid ? '#10B981' : '#94A3B8', boxShadow: `0 0 10px ${lt.is_paid ? '#10B98180' : '#94A3B880'}` }} />
                      <div style={{ fontWeight: 950, fontSize: 18, color: '#1E293B' }}>{lt.name}</div>
                    </div>
                    <button className="delete-btn" onClick={() => deleteLeaveType(lt.leave_type_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 6 }} title={t('Remove')}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                     <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 14, border: '1.5px solid #F1F5F9' }}>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase' }}>{t('Max Days / Year')}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', marginTop: 4 }}>{lt.is_paid ? lt.max_days_per_year : t('Uncapped')}</div>
                     </div>
                     <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 14, border: '1.5px solid #F1F5F9' }}>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase' }}>{t('Type')}</div>
                        <div style={{ marginTop: 6 }}><Badge label={lt.is_paid ? t('Paid') : t('Unpaid')} color={lt.is_paid ? 'green' : 'gray'} /></div>
                     </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {activeTab === 'hierarchy' && (
          <div className="glass-card-employee" style={{ padding: 60, textAlign: 'center', border: '1.5px solid #fff' }}>
             <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div style={{ 
                  width: 80, height: 80, borderRadius: 24, background: '#F8FAFC', 
                  display: 'grid', placeItems: 'center', margin: '0 auto 32px', border: '1.5px solid #F1F5F9'
                }}>
                   <GitBranch size={40} style={{ color: '#10B981', opacity: 0.3 }} />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 950, color: '#1E293B', marginBottom: 16 }}>{t('Node Topology Explorer')}</h3>
                <p style={{ color: '#64748B', lineHeight: 1.7, marginBottom: 40, fontSize: 15, fontWeight: 600 }}>
                  {t('Visualize and manage strategic reporting lines and workforce cluster distribution.')}
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, textAlign: 'left' }}>
                   <div style={{ background: '#F8FAFC', padding: 28, borderRadius: 24, border: '1.5px solid #F1F5F9' }}>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Operational Depts')}</div>
                      <div style={{ fontSize: 32, fontWeight: 950, color: '#1E293B', marginTop: 8 }}>{departmentStats.length}</div>
                      <div style={{ fontSize: 11, color: '#10B981', fontWeight: 800, marginTop: 4 }}>High Density</div>
                   </div>
                   <div style={{ background: '#F8FAFC', padding: 28, borderRadius: 24, border: '1.5px solid #F1F5F9' }}>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Tactical Teams')}</div>
                      <div style={{ fontSize: 32, fontWeight: 950, color: '#1E293B', marginTop: 8 }}>{teamStats.length}</div>
                      <div style={{ fontSize: 11, color: '#10B981', fontWeight: 800, marginTop: 4 }}>Sync Active</div>
                   </div>
                </div>
                <Btn variant="primary" style={{ marginTop: 40, height: 52, borderRadius: 16, padding: '0 32px', fontWeight: 900, background: '#10B981' }}>
                   Launch Neural Map Explorer
                </Btn>
             </div>
          </div>
        )}

        {activeTab === 'governance' && <OrgGovernanceMatrix />}
      </div>

      {/* Modals */}
      <Modal open={modal === 'skill'} onClose={() => setModal(null)} title={t('Register Master Competency')}>
        <div style={{ display: 'grid', gap: 24 }}>
          <Input label={t('Competency Identifier')} value={form.name || ''} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
          <Input label={t('Index Category')} value={form.category || ''} onChange={e => setForm(p => ({...p, category: e.target.value}))} placeholder="e.g. Strategic Analysis" />
          <Textarea label={t('Execution Definition')} value={form.description || ''} onChange={e => setForm(p => ({...p, description: e.target.value}))} />
          <Btn onClick={addSkill} style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 900, background: '#10B981' }}>{t('Commit to Registry')}</Btn>
        </div>
      </Modal>

      <Modal open={modal === 'leave'} onClose={() => setModal(null)} title={t('Add Leave Type')}>
        <div style={{ display: 'grid', gap: 24 }}>
          <Input label={t('Leave Name')} value={form.name || ''} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Bereavement" />
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>{t('Compensation')}</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ k: true, label: t('Paid') }, { k: false, label: t('Unpaid') }].map(opt => (
                <button key={String(opt.k)} type="button" onClick={() => setForm(p => ({ ...p, isPaid: opt.k }))} style={{
                  flex: 1, height: 48, borderRadius: 14, fontWeight: 900, cursor: 'pointer',
                  border: '1.5px solid', borderColor: (form.isPaid !== false) === opt.k ? '#10B981' : '#E2E8F0',
                  background: (form.isPaid !== false) === opt.k ? '#10B981' : '#fff',
                  color: (form.isPaid !== false) === opt.k ? '#fff' : '#64748B',
                }}>{opt.label}</button>
              ))}
            </div>
          </div>
          {form.isPaid !== false && (
            <Input label={t('Max Days / Year')} type="number" min="0" value={form.maxDays || ''} onChange={e => setForm(p => ({...p, maxDays: e.target.value}))} placeholder="e.g. 14" />
          )}
          {form.isPaid === false && (
            <p style={{ margin: 0, fontSize: 13, color: '#64748B', fontWeight: 600 }}>
              {t('Unpaid leave is uncapped and triggers a salary deduction for the days taken.')}
            </p>
          )}
          <Btn onClick={addLeaveType} style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 900, background: '#10B981' }}>{t('Create Leave Type')}</Btn>
        </div>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .delete-btn:hover { color: #DC2626 !important; background: #FEF2F2 !important; border-radius: 8px; }
        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
