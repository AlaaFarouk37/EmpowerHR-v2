import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hrGetJobs, createJob, updateJob, hrGetPositionCatalog, hrGetDepartmentOptions, hrGetTeamOptions, hrGetEmployees, hrGetInterviewers, getJobSubmissions, updateSubmissionStage, hrCreateEmployeeRecord } from '../../api/index.js';
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
  CheckCircle,
  Plus,
  ShieldAlert,
  Layers,
  FileText,
  Star,
  XCircle,
  Edit2,
  Eye,
  EyeOff
} from 'lucide-react';

export function HRJobsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { resolvePath } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [positionCatalog, setPositionCatalog] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('All Pipeline States');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: '', level: '', description: '',
    min_experience_years: 0, required_degree: 'Bachelor',
    vacancies: 1, interviewer: '',
    pipeline_stages: [],
    weight_skills: 0.40, weight_experience: 0.30,
    weight_education: 0.10, weight_semantic: 0.20,
  };

  const DEFAULT_PIPELINE_STAGES = ['Shortlisted', 'Interview', 'Hired'];
  const APPLIED_STAGE = 'Applied';
  const REJECTED_STAGE = 'Rejected';
  const [form, setForm] = useState(emptyForm);

  // Kanban state
  const [showKanban, setShowKanban] = useState(false);
  const [kanbanJob, setKanbanJob] = useState(null);
  const [kanbanCandidates, setKanbanCandidates] = useState([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [movingId, setMovingId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [notePrompt, setNotePrompt] = useState({ open: false, candidateId: null, targetStage: null, note: '' });
  const [newStageDraft, setNewStageDraft] = useState('');

  // Add-Employee modal state
  const [empModal, setEmpModal] = useState({ open: false, candidate: null });
  const EMPTY_EMPLOYEE = {
    fullName: '', email: '',
    role: 'TeamMember', employeeType: 'Full-time', employmentStatus: 'Active',
    job: '', department: '', team: '', location: '',
    monthlyIncome: '', currency_preference: 'EGP',
    birth_date: '', hiring_date: new Date().toISOString().slice(0, 10),
    educationLevel: '', numberOfDependents: '',
    default_clock_in: '', default_clock_out: '', contracted_hours: '',
    phoneNumber: '', gender: '', maritalStatus: '', has_disability: false,
  };
  const [empForm, setEmpForm] = useState(EMPTY_EMPLOYEE);
  const [empSaving, setEmpSaving] = useState(false);
  const [empPendingTitle, setEmpPendingTitle] = useState('');
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);

  const ROLE_OPTIONS = ['TeamMember', 'TeamLeader', 'HRManager', 'Admin'];
  const TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Intern'];
  const STATUS_OPTIONS = ['Active', 'Probation', 'On Leave'];
  const CURRENCY_OPTIONS = ['EGP', 'USD'];

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [data, catalog, interviewerList, depts, teams, employees] = await Promise.all([
        hrGetJobs(),
        hrGetPositionCatalog().catch(() => []),
        hrGetInterviewers().catch(() => []),
        hrGetDepartmentOptions().catch(() => []),
        hrGetTeamOptions().catch(() => []),
        hrGetEmployees().catch(() => []),
      ]);
      setJobs(data || []);
      setPositionCatalog(Array.isArray(catalog) ? catalog : []);
      setInterviewers(Array.isArray(interviewerList) ? interviewerList : []);
      setDepartmentOptions(Array.isArray(depts) ? depts : []);
      setTeamOptions(Array.isArray(teams) ? teams : []);
      const locs = Array.isArray(employees)
        ? [...new Set(employees.map(e => e?.location).filter(Boolean))].sort()
        : [];
      setLocationOptions(locs);
    } catch (error) {
      toast(t('Failed to load talent pipelines'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const weightsValid = () => {
    const total = +form.weight_skills + +form.weight_experience + +form.weight_education + +form.weight_semantic;
    return Math.abs(total - 1.0) < 0.001;
  };

  const weightTotal = (
    +form.weight_skills + +form.weight_experience + +form.weight_education + +form.weight_semantic
  ).toFixed(2);

  const positionKey = (title, level) => `${(title || '').trim().toLowerCase()}|${(level || '').trim().toLowerCase()}`;
  const selectedPositionKey = positionKey(form.title, form.level);
  const handlePositionChange = (e) => {
    const key = e.target.value;
    const match = positionCatalog.find(p => positionKey(p.title, p.level) === key);
    setForm(f => ({ ...f, title: match ? match.title : '', level: match ? (match.level || '') : '' }));
  };
  const existsInCatalog = positionCatalog.some(p => positionKey(p.title, p.level) === selectedPositionKey);
  const showLegacyOption = !!form.title && !existsInCatalog;

  const DEGREES = ['Unknown', 'High School', 'Associate', 'Bachelor', 'Master', 'PhD'];

  const buildJobPayload = () => ({
    ...form,
    vacancies: Math.max(1, Number(form.vacancies) || 1),
    interviewer: form.interviewer === '' || form.interviewer == null ? null : Number(form.interviewer),
    pipeline_stages: Array.isArray(form.pipeline_stages) ? form.pipeline_stages : [],
  });

  const handleCreate = async () => {
    if (!form.title.trim()) { toast(t('Position is required'), 'error'); return; }
    if (!form.description.trim()) { toast(t('Description is required'), 'error'); return; }
    if (!weightsValid()) { toast(t('Weights must sum to 1.0'), 'error'); return; }
    setSaving(true);
    try {
      const res = await createJob(buildJobPayload());
      if (res?.id) {
        toast(t('Job posting created'), 'success');
        setShowCreate(false);
        setForm(emptyForm);
        loadJobs();
      } else {
        toast(res?.title?.[0] || res?.detail || t('Failed to create job'), 'error');
      }
    } catch (e) {
      toast(e?.response?.data?.title?.[0] || e?.message || t('Failed to create job'), 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    if (!form.title.trim()) { toast(t('Position is required'), 'error'); return; }
    if (!form.description.trim()) { toast(t('Description is required'), 'error'); return; }
    if (!weightsValid()) { toast(t('Weights must sum to 1.0'), 'error'); return; }
    setSaving(true);
    try {
      const res = await updateJob(selected.id, buildJobPayload());
      if (res?.id) {
        toast(t('Job updated'), 'success');
        setShowEdit(false);
        setSelected(null);
        loadJobs();
      } else {
        toast(res?.title?.[0] || res?.detail || t('Failed to update job'), 'error');
      }
    } catch (e) {
      toast(e?.response?.data?.title?.[0] || e?.message || t('Failed to update job'), 'error');
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (job, nextActive) => {
    try {
      await updateJob(job.id, {
        title: job.title, level: job.level || '', description: job.description,
        min_experience_years: job.min_experience_years,
        required_degree: job.required_degree,
        vacancies: job.vacancies ?? 1,
        interviewer: job.interviewer ?? null,
        pipeline_stages: Array.isArray(job.pipeline_stages) ? job.pipeline_stages : [],
        weight_skills: job.weight_skills, weight_experience: job.weight_experience,
        weight_education: job.weight_education, weight_semantic: job.weight_semantic,
        is_active: nextActive,
      });
      toast(nextActive ? t('Job activated') : t('Job decommissioned'), 'success');
      setSelected(null);
      loadJobs();
    } catch (e) {
      toast(e?.message || t('Failed to update job'), 'error');
    }
  };

  const openEditDirect = (job) => {
    if (!job) return;
    setSelected(job);
    setForm({
      title: job.title || '',
      level: job.level || '',
      description: job.description || '',
      min_experience_years: job.min_experience_years ?? 0,
      required_degree: job.required_degree || 'Bachelor',
      vacancies: job.vacancies ?? 1,
      interviewer: job.interviewer ?? '',
      pipeline_stages: Array.isArray(job.pipeline_stages) ? job.pipeline_stages : [],
      weight_skills: job.weight_skills ?? 0.40,
      weight_experience: job.weight_experience ?? 0.30,
      weight_education: job.weight_education ?? 0.10,
      weight_semantic: job.weight_semantic ?? 0.20,
    });
    setShowEdit(true);
  };

  // ── Kanban handlers ────────────────────────────────────────────────────────
  const stageVisualFor = (name, isFinal, isRejected) => {
    if (isRejected) return { icon: XCircle, bg: '#FEF2F2', accent: '#DC2626' };
    if (isFinal)    return { icon: CheckCircle, bg: '#ECFDF5', accent: '#059669' };
    // Cycle a few defaults so custom stages don't all look the same
    const palette = [
      { icon: Users, bg: '#F9FAFB', accent: '#64748B' },
      { icon: Star,  bg: '#EFF6FF', accent: '#2563EB' },
      { icon: Clock, bg: '#F5F3FF', accent: '#7C3AED' },
      { icon: Activity, bg: '#FFFBEB', accent: '#D97706' },
      { icon: Target, bg: '#F0FDF4', accent: '#16A34A' },
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };

  const stagesForJob = (job) => {
    const middle = Array.isArray(job?.pipeline_stages) && job.pipeline_stages.length
      ? job.pipeline_stages
      : DEFAULT_PIPELINE_STAGES;
    const cols = [];
    // Permanent first system column
    cols.push({
      key: APPLIED_STAGE,
      label: APPLIED_STAGE,
      isFinal: false,
      isApplied: true,
      ...stageVisualFor(APPLIED_STAGE, false, false),
    });
    // HR-defined middle stages; the last one is the "final" forward stage
    middle.forEach((name, idx) => {
      const isFinal = idx === middle.length - 1;
      cols.push({
        key: name,
        label: name,
        isFinal,
        ...stageVisualFor(name, isFinal, false),
      });
    });
    // Permanent last system column
    cols.push({
      key: REJECTED_STAGE,
      label: REJECTED_STAGE,
      isFinal: false,
      isRejected: true,
      ...stageVisualFor(REJECTED_STAGE, false, true),
    });
    return cols;
  };

  const openKanban = async (job) => {
    setKanbanJob(job);
    setShowKanban(true);
    setKanbanLoading(true);
    try {
      const subs = await getJobSubmissions(job.id, { includeHired: true });
      setKanbanCandidates(Array.isArray(subs) ? subs : []);
    } catch (e) {
      toast(t('Failed to load candidates'), 'error');
      setKanbanCandidates([]);
    } finally {
      setKanbanLoading(false);
    }
  };

  const persistStageMove = async (candidateId, targetStage, note = '') => {
    const previous = kanbanCandidates.find(c => c.id === candidateId);
    if (!previous) return;
    setMovingId(candidateId);
    // Optimistic
    setKanbanCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, review_stage: targetStage } : c));
    try {
      const payload = { review_stage: targetStage };
      if (note) payload.stage_notes = note;
      await updateSubmissionStage(candidateId, payload);
      toast(`${t('Moved to')} ${targetStage}`, 'success');
    } catch (e) {
      // Rollback
      setKanbanCandidates(prev => prev.map(c => c.id === candidateId ? previous : c));
      const msg = e?.response?.data?.stage_notes?.[0] || e?.response?.data?.detail || e?.message || t('Failed to update stage');
      toast(msg, 'error');
    } finally {
      setMovingId(null);
    }
  };

  const handleStageDrop = (candidateId, targetStage) => {
    setOverColumn(null);
    const card = kanbanCandidates.find(c => c.id === candidateId);
    if (!card || card.review_stage === targetStage) return;
    const cols = stagesForJob(kanbanJob);
    const middleCols = cols.filter(c => !c.isRejected && !c.isApplied);
    const finalKey = middleCols.length ? middleCols[middleCols.length - 1].key : null;
    if (targetStage === REJECTED_STAGE || (finalKey && targetStage === finalKey)) {
      setNotePrompt({ open: true, candidateId, targetStage, note: '' });
      return;
    }
    persistStageMove(candidateId, targetStage);
  };

  const openAddEmployee = (candidate) => {
    setEmpForm({
      ...EMPTY_EMPLOYEE,
      fullName: candidate?.candidate_name || '',
      email: candidate?.candidate_email || '',
    });
    setEmpModal({ open: true, candidate });
  };

  const submitAddEmployee = async () => {
    if (!empForm.fullName.trim()) { toast(t('Full name is required'), 'error'); return; }
    if (!empForm.email.trim()) { toast(t('Email is required'), 'error'); return; }
    setEmpSaving(true);
    try {
      const payload = {
        ...empForm,
        fullName: empForm.fullName.trim(),
        email: empForm.email.trim().toLowerCase(),
        monthlyIncome: empForm.monthlyIncome === '' ? null : Number(empForm.monthlyIncome),
        numberOfDependents: empForm.numberOfDependents === '' ? null : Number(empForm.numberOfDependents),
        contracted_hours: empForm.contracted_hours === '' ? null : Number(empForm.contracted_hours),
        educationLevel: empForm.educationLevel === '' ? null : Number(empForm.educationLevel),
        birth_date: empForm.birth_date || null,
        hiring_date: empForm.hiring_date || null,
        default_clock_in: empForm.default_clock_in || null,
        default_clock_out: empForm.default_clock_out || null,
        job: empForm.job === '' ? null : empForm.job,
        team: empForm.team === '' ? null : empForm.team,
        department: empForm.department === '' ? null : empForm.department,
        phoneNumber: empForm.phoneNumber || null,
        gender: empForm.gender || null,
        maritalStatus: empForm.maritalStatus || null,
        location: empForm.location || null,
      };
      await hrCreateEmployeeRecord(payload);
      toast(t('Employee record created'), 'success');
      setEmpModal({ open: false, candidate: null });
      setEmpForm(EMPTY_EMPLOYEE);
      setEmpPendingTitle('');
    } catch (e) {
      toast(e?.response?.data?.detail || e?.message || t('Failed to create employee'), 'error');
    } finally {
      setEmpSaving(false);
    }
  };

  const confirmNotePrompt = async () => {
    const { candidateId, targetStage, note } = notePrompt;
    if (!note.trim()) { toast(t('Please add a short hiring note before finalizing this stage.'), 'error'); return; }
    setNotePrompt({ open: false, candidateId: null, targetStage: null, note: '' });
    await persistStageMove(candidateId, targetStage, note.trim());
  };

  const deriveStatus = (j) => {
    if (j?.status) return j.status;
    if (typeof j?.is_active === 'boolean') return j.is_active ? 'Active' : 'Closed';
    return 'Unknown';
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const matchesSearch = !searchQuery || [j.title, j.level, j.department, j.location].some(v => String(v || '').toLowerCase().includes(searchQuery.toLowerCase()));
      const mappedStatus = activeStatus === 'All Pipeline States' ? 'All' :
                          activeStatus === 'Active Requisitions' ? 'Active' :
                          activeStatus === 'Closed Nodes' ? 'Closed' : 'Draft';
      const matchesStatus = mappedStatus === 'All' || deriveStatus(j) === mappedStatus;
      const matchesActiveOnly = !activeOnly || deriveStatus(j) === 'Active';
      return matchesSearch && matchesStatus && matchesActiveOnly;
    });
  }, [jobs, searchQuery, activeStatus, activeOnly]);

  const pipelineStats = useMemo(() => {
    return [
      { label: 'Active Requisitions', value: jobs.filter(j => deriveStatus(j) === 'Active').length, icon: Briefcase, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'Shortlisted Talent', value: jobs.reduce((sum, j) => sum + (j.submission_count || j.shortlistedCount || 0), 0), icon: Users, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Pipeline Velocity', value: '4.2d', icon: Clock, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Total Deployments', value: jobs.length, icon: Layers, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [jobs]);


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
          onClick={() => { setForm(emptyForm); setShowCreate(true); }}
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

           <button
              onClick={() => setActiveOnly(v => !v)}
              title={activeOnly ? t('Showing active job postings only') : t('Show only active job postings')}
              style={{
                height: 44, padding: '0 16px', borderRadius: 12, cursor: 'pointer',
                border: activeOnly ? '1.5px solid var(--red-600)' : '1.5px solid #F1F5F9',
                background: activeOnly ? 'var(--red-50)' : '#F8FAFC',
                color: activeOnly ? 'var(--red-600)' : '#64748B',
                fontSize: 13, fontWeight: 800,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
           >
              {activeOnly ? <Eye size={16} /> : <EyeOff size={16} />}
              {t('Active only')}
           </button>
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
          const status = deriveStatus(job);
          const isActive = status === 'Active';
          const jobKey = job.jobID ?? job.id;
          return (
            <div key={jobKey} style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: '32px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }} className="job-card">
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: isActive ? 'var(--red-600)' : '#E2E8F0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 14, background: isActive ? 'var(--red-50)' : '#F8FAFC', 
                    display: 'grid', placeItems: 'center', color: isActive ? 'var(--red-600)' : '#94A3B8', border: `1px solid ${isActive ? 'var(--red-100)' : '#F1F5F9'}`
                  }}>
                     <Briefcase size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{job.title}</h3>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 800 }}>REQ-{jobKey} • {job.level || job.department || '—'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => openEditDirect(job)}
                    className="job-card-icon"
                    title={t('Edit posting')}
                    aria-label={t('Edit posting')}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(job, !isActive)}
                    className="job-card-icon"
                    title={isActive ? t('Deactivate (hide from public)') : t('Activate (make public)')}
                    aria-label={isActive ? t('Deactivate (hide from public)') : t('Activate (make public)')}
                    style={isActive ? undefined : { color: '#94A3B8' }}
                  >
                    {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <Badge label={status.toUpperCase()} color={isActive ? 'green' : 'gray'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94A3B8', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Users size={14} /> Talent Pool
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{job.submission_count ?? job.applicantsCount ?? 0}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#94A3B8', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <Activity size={14} /> Min EXP
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{job.min_experience_years != null ? `${job.min_experience_years}y` : (job.minExperience || '—')}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Btn style={{ flex: 1, height: 48, borderRadius: 12, background: 'var(--red-600)', border: 'none', fontWeight: 900 }} onClick={() => openKanban(job)}>
                   Audit Pipeline
                </Btn>
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

      {/* Create & Edit modals share the same form body */}
      {(showCreate || showEdit) && (() => {
        const isEdit = showEdit;
        const onClose = () => { isEdit ? setShowEdit(false) : setShowCreate(false); };
        const onSubmit = isEdit ? handleUpdate : handleCreate;
        const labelStyle = { display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' };
        const inputStyle = { width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#fff', padding: '0 14px', fontSize: 13, fontWeight: 600, outline: 'none' };
        return (
          <Modal open={true} onClose={onClose} title={t(isEdit ? 'Edit Job Posting' : 'Create Job Posting')} maxWidth={640}>
            <div style={{ display: 'grid', gap: 16, padding: 8 }}>
              <div>
                <label style={labelStyle}>{t('Position')} *</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={selectedPositionKey === '|' ? '' : selectedPositionKey}
                  onChange={handlePositionChange}
                >
                  <option value="">— {t('Select a position')} —</option>
                  {showLegacyOption && (
                    <option value={selectedPositionKey} disabled>
                      {form.title}{form.level ? ` — ${form.level}` : ''} ({t('not in catalog')})
                    </option>
                  )}
                  {positionCatalog.map(p => {
                    const k = positionKey(p.title, p.level);
                    return (
                      <option key={k} value={k}>
                        {p.title}{p.level ? ` — ${p.level}` : ''}
                      </option>
                    );
                  })}
                </select>
                <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 6 }}>
                  {t('Only positions from the catalog can be posted. Ask an admin to add a new one if it\'s missing.')}
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t('Job Description')} *</label>
                <textarea
                  style={{ ...inputStyle, height: 'auto', minHeight: 120, padding: '12px 14px', resize: 'vertical' }}
                  placeholder={t('Full job description — skills, responsibilities, requirements...')}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t('Min. Experience (years)')}</label>
                  <input
                    type="number" min="0" step="0.5"
                    style={inputStyle}
                    value={form.min_experience_years}
                    onChange={e => setForm(f => ({ ...f, min_experience_years: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('Required Degree')}</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.required_degree}
                    onChange={e => setForm(f => ({ ...f, required_degree: e.target.value }))}
                  >
                    {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t('Target Hires')}</label>
                  <input
                    type="number" min="1" step="1"
                    style={inputStyle}
                    value={form.vacancies}
                    onChange={e => setForm(f => ({ ...f, vacancies: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t('Assigned Interviewer')}</label>
                  <select
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    value={form.interviewer ?? ''}
                    onChange={e => setForm(f => ({ ...f, interviewer: e.target.value }))}
                  >
                    <option value="">— {t('Unassigned')} —</option>
                    {interviewers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} ({u.role === 'HRManager' ? 'HR Manager' : 'Team Leader'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: 8 }}>{t('Pipeline Stages')}</label>
                <div style={{ fontSize: 11.5, color: '#94A3B8', marginBottom: 10 }}>
                  {t('Middle hiring stages for this role. "Applied" (where new candidates land) and "Rejected" are system columns that are always shown — you only define what sits between them. Leave empty to use the default progression.')}
                </div>
                {(form.pipeline_stages || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', marginBottom: 8 }}>
                    {t('Kanban will show')}: {APPLIED_STAGE} → {DEFAULT_PIPELINE_STAGES.join(' → ')} → {REJECTED_STAGE}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {form.pipeline_stages.map((stage, idx) => {
                      const isLast = idx === form.pipeline_stages.length - 1;
                      return (
                        <div key={`${stage}-${idx}`} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '6px 8px 6px 12px', borderRadius: 10,
                          background: isLast ? '#ECFDF5' : 'var(--red-50)',
                          color: isLast ? '#059669' : 'var(--red-600)',
                          fontSize: 12, fontWeight: 800,
                          border: `1px solid ${isLast ? '#A7F3D0' : 'var(--red-100)'}`,
                        }}>
                          <span>{idx + 1}. {stage}</span>
                          {isLast && <span style={{ fontSize: 10, opacity: 0.7 }}>({t('final')})</span>}
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, pipeline_stages: f.pipeline_stages.filter((_, i) => i !== idx) }))}
                            title={t('Remove stage')}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                          >×</button>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => setForm(f => {
                                const next = [...f.pipeline_stages];
                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                return { ...f, pipeline_stages: next };
                              })}
                              title={t('Move left')}
                              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}
                            >◀</button>
                          )}
                          {!isLast && (
                            <button
                              type="button"
                              onClick={() => setForm(f => {
                                const next = [...f.pipeline_stages];
                                [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                return { ...f, pipeline_stages: next };
                              })}
                              title={t('Move right')}
                              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}
                            >▶</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={newStageDraft}
                    onChange={e => setNewStageDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const name = newStageDraft.trim();
                        if (!name) return;
                        if (name.toLowerCase() === 'rejected' || name.toLowerCase() === 'applied') { toast(t('"Applied" and "Rejected" are system stages and cannot be added.'), 'error'); return; }
                        if ((form.pipeline_stages || []).some(s => s.toLowerCase() === name.toLowerCase())) { toast(t('Stage already exists.'), 'error'); return; }
                        setForm(f => ({ ...f, pipeline_stages: [...(f.pipeline_stages || []), name] }));
                        setNewStageDraft('');
                      }
                    }}
                    placeholder={t('e.g. Phone Screen')}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      const name = newStageDraft.trim();
                      if (!name) return;
                      if (name.toLowerCase() === 'rejected' || name.toLowerCase() === 'applied') { toast(t('"Applied" and "Rejected" are system stages and cannot be added.'), 'error'); return; }
                      if ((form.pipeline_stages || []).some(s => s.toLowerCase() === name.toLowerCase())) { toast(t('Stage already exists.'), 'error'); return; }
                      setForm(f => ({ ...f, pipeline_stages: [...(f.pipeline_stages || []), name] }));
                      setNewStageDraft('');
                    }}
                    style={{ height: 44, padding: '0 16px', borderRadius: 12, fontWeight: 800 }}
                  >
                    <Plus size={14} style={{ marginRight: 4 }} /> {t('Add')}
                  </Btn>
                  {(form.pipeline_stages || []).length > 0 && (
                    <Btn
                      variant="ghost"
                      onClick={() => setForm(f => ({ ...f, pipeline_stages: [] }))}
                      style={{ height: 44, padding: '0 12px', borderRadius: 12, fontWeight: 700, color: '#94A3B8' }}
                      title={t('Reset to default stages')}
                    >
                      {t('Reset')}
                    </Btn>
                  )}
                </div>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: 10 }}>{t('Scoring Weights (must sum to 1.0)')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {[
                    { k: 'weight_skills', label: t('Skills') },
                    { k: 'weight_experience', label: t('Experience') },
                    { k: 'weight_education', label: t('Education') },
                    { k: 'weight_semantic', label: t('Semantic') },
                  ].map(w => (
                    <div key={w.k}>
                      <label style={{ ...labelStyle, fontSize: 10, marginBottom: 4 }}>{w.label}</label>
                      <input
                        type="number" step="0.05" min="0" max="1"
                        style={inputStyle}
                        value={form[w.k]}
                        onChange={e => setForm(f => ({ ...f, [w.k]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: weightsValid() ? '#22C55E' : 'var(--red-600)', marginTop: 6, fontWeight: 700 }}>
                  {t('Total')}: {weightTotal}{weightsValid() ? ' ✓' : ` — ${t('must equal 1.0')}`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <Btn variant="ghost" onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 12, fontWeight: 800 }}>{t('Cancel')}</Btn>
                <Btn
                  onClick={onSubmit}
                  disabled={saving}
                  style={{ flex: 1, height: 48, borderRadius: 12, fontWeight: 900, background: 'var(--red-600)', border: 'none' }}
                >
                  {saving ? t('Saving...') : (isEdit ? t('Save Changes') : t('Create Posting'))}
                </Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Kanban — Audit Pipeline */}
      <Modal open={showKanban} onClose={() => setShowKanban(false)} title={kanbanJob ? `${t('Pipeline')}: ${kanbanJob.title}` : t('Pipeline')} maxWidth={1400}>
        {kanbanLoading ? (
          <div style={{ padding: 60, display: 'grid', placeItems: 'center' }}><Spinner /></div>
        ) : kanbanCandidates.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
            <FileText size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
            <div style={{ fontWeight: 800, color: '#1E293B', marginBottom: 4 }}>{t('No applicants yet')}</div>
            <div style={{ fontSize: 13 }}>{t('Once candidates submit to this role they will appear here.')}</div>
          </div>
        ) : (() => {
          const stages = stagesForJob(kanbanJob);
          const middleStages = stages.filter(s => !s.isRejected && !s.isApplied);
          const firstForward = APPLIED_STAGE;
          const finalStageKey = middleStages.length ? middleStages[middleStages.length - 1].key : null;
          return (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(180px, 1fr))`, gap: 14, padding: 8, overflowX: 'auto' }}>
            {stages.map(stage => {
              const Icon = stage.icon;
              const stageCandidates = kanbanCandidates.filter(c => {
                const cur = c.review_stage || firstForward;
                // If a candidate's stage isn't in this job's pipeline (HR removed/renamed it),
                // surface them in the first forward column so they don't disappear.
                const knownStage = stages.some(s => s.key === cur);
                return knownStage ? cur === stage.key : stage.key === firstForward;
              });
              const isOver = overColumn === stage.key;
              const isFinalCol = stage.key === finalStageKey;
              return (
                <div
                  key={stage.key}
                  onDragOver={(e) => { e.preventDefault(); if (overColumn !== stage.key) setOverColumn(stage.key); }}
                  onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setOverColumn(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = Number(e.dataTransfer.getData('text/plain'));
                    if (Number.isFinite(id)) handleStageDrop(id, stage.key);
                  }}
                  style={{
                    background: stage.bg,
                    borderRadius: 16,
                    padding: 14,
                    minHeight: 460,
                    border: isOver ? `2px dashed ${stage.accent}` : '2px solid transparent',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Icon size={16} style={{ color: stage.accent }} />
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#1E293B' }}>{t(stage.label)}</span>
                    <Badge label={stageCandidates.length} color="gray" style={{ marginLeft: 'auto' }} />
                  </div>
                  {stageCandidates.map(c => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(c.id)); e.dataTransfer.effectAllowed = 'move'; }}
                      style={{
                        padding: 12,
                        background: 'white',
                        borderRadius: 12,
                        border: '1px solid #EAECF0',
                        marginBottom: 8,
                        cursor: movingId === c.id ? 'wait' : 'grab',
                        opacity: movingId === c.id ? 0.5 : 1,
                        boxShadow: '0 1px 3px rgba(16, 24, 40, 0.08)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1E293B' }}>
                        {c.candidate_name || `${t('Submission')} ${c.id}`}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.candidate_email || '—'}
                        </span>
                        {c.ats_score != null && (
                          <span style={{ fontWeight: 800, color: stage.accent, flexShrink: 0 }}>
                            {Math.round(c.ats_score)}%
                          </span>
                        )}
                      </div>
                      {isFinalCol && (
                        <button
                          onClick={() => openAddEmployee(c)}
                          style={{
                            marginTop: 10, width: '100%', padding: '8px 10px',
                            background: stage.accent, color: '#fff', border: 'none',
                            borderRadius: 8, fontSize: 11, fontWeight: 900,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                          title={t('Promote this candidate to an Employee record')}
                        >
                          <Plus size={12} /> {t('Add Employee in System')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          );
        })()}
      </Modal>

      {/* Stage note prompt — required for Rejected/Hired */}
      <Modal
        open={notePrompt.open}
        onClose={() => setNotePrompt({ open: false, candidateId: null, targetStage: null, note: '' })}
        title={notePrompt.targetStage ? `${t('Move to')} ${notePrompt.targetStage}` : t('Stage note')}
        maxWidth={480}
      >
        <div style={{ display: 'grid', gap: 16, padding: 8 }}>
          <div style={{ fontSize: 13, color: '#64748B' }}>
            {t('Please add a short hiring note before finalizing this stage.')}
          </div>
          <textarea
            autoFocus
            value={notePrompt.note}
            onChange={(e) => setNotePrompt(p => ({ ...p, note: e.target.value }))}
            placeholder={t('e.g. Offer extended after final round') }
            style={{ width: '100%', minHeight: 110, padding: 12, borderRadius: 12, border: '1.5px solid #F1F5F9', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="ghost" onClick={() => setNotePrompt({ open: false, candidateId: null, targetStage: null, note: '' })} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 800 }}>{t('Cancel')}</Btn>
            <Btn onClick={confirmNotePrompt} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 900, background: 'var(--red-600)', border: 'none' }}>{t('Confirm Move')}</Btn>
          </div>
        </div>
      </Modal>

      {/* Add Employee in System — full port of frontend-old EmployeesPage create modal */}
      <Modal
        open={empModal.open}
        onClose={() => { setEmpModal({ open: false, candidate: null }); setEmpForm(EMPTY_EMPLOYEE); setEmpPendingTitle(''); }}
        title={t('Add Employee Record')}
        maxWidth={760}
      >
        {(() => {
          const fieldLabel = { display: 'block', fontSize: 12, fontWeight: 800, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' };
          const fieldInput = { width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #E2E8F0', padding: '0 14px', fontSize: 13, fontWeight: 600, outline: 'none', background: '#fff' };
          const sectionHead = { fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 };
          // Job title/level cascading picker (mirrors old JobTitleLevelPicker)
          const savedJob = positionCatalog.find(p => String(p.job_id ?? p.id) === String(empForm.job)) || null;
          const selectedTitle = savedJob?.title || empPendingTitle || '';
          const selectedLevel = savedJob?.level || '';
          const titles = [...new Set(positionCatalog.map(p => p.title).filter(Boolean))].sort();
          const levelsForTitle = positionCatalog.filter(p => p.title === selectedTitle).map(p => p.level || '').filter((v, i, a) => a.indexOf(v) === i);

          const onTitle = (v) => {
            setEmpPendingTitle(v);
            if (!v) { setEmpForm(f => ({ ...f, job: '' })); return; }
            const matching = positionCatalog.filter(p => p.title === v);
            setEmpForm(f => ({ ...f, job: matching.length === 1 ? (matching[0].job_id ?? matching[0].id) : '' }));
          };
          const onLevel = (v) => {
            const p = positionCatalog.find(p => p.title === selectedTitle && (p.level || '') === v);
            setEmpForm(f => ({ ...f, job: p ? (p.job_id ?? p.id) : '' }));
          };

          return (
            <div style={{ display: 'grid', gap: 14, padding: 8 }}>
              <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: -4 }}>
                {empModal.candidate
                  ? `${t('Promoting candidate')}: ${empModal.candidate.candidate_name || empModal.candidate.candidate_email || ''}`
                  : ''}
              </div>

              {/* Identity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={fieldLabel}>{t('Full Name')} *</label>
                  <input value={empForm.fullName} onChange={e => setEmpForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Salma Mostafa" style={fieldInput} />
                </div>
                <div>
                  <label style={fieldLabel}>{t('Email')} *</label>
                  <input type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} placeholder="employee@company.com" style={fieldInput} />
                </div>
              </div>

              {/* Job title + level cascade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={fieldLabel}>{t('Job Title')}</label>
                  <select value={selectedTitle} onChange={e => onTitle(e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }}>
                    <option value="">{t('Select a job title')}</option>
                    {titles.map(title => <option key={title} value={title}>{title}</option>)}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>{t('Job Level')}</label>
                  <select value={selectedLevel} onChange={e => onLevel(e.target.value)} disabled={!selectedTitle} style={{ ...fieldInput, cursor: selectedTitle ? 'pointer' : 'not-allowed', background: selectedTitle ? '#fff' : '#F8FAFC' }}>
                    <option value="">{t('Select a job level')}</option>
                    {levelsForTitle.map(lv => <option key={lv || '__none'} value={lv}>{lv || t('— none —')}</option>)}
                  </select>
                </div>
              </div>

              {/* Department + Team (FK) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={fieldLabel}>{t('Department')}</label>
                  <select value={empForm.department} onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                    <option value="">{t('Select a department')}</option>
                    {departmentOptions.map(d => (
                      <option key={d.department_id ?? d.id} value={d.department_id ?? d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>{t('Team')}</label>
                  <select value={empForm.team} onChange={e => setEmpForm(f => ({ ...f, team: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                    <option value="">{t('Select a team')}</option>
                    {teamOptions.map(tm => (
                      <option key={tm.team_id ?? tm.id} value={tm.team_id ?? tm.id}>{tm.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location with datalist */}
              <div>
                <label style={fieldLabel}>{t('Location')}</label>
                <input list="emp-location-options" value={empForm.location} onChange={e => setEmpForm(f => ({ ...f, location: e.target.value }))} placeholder="Select or type a location" style={fieldInput} />
                <datalist id="emp-location-options">
                  {locationOptions.map(loc => <option key={loc} value={loc} />)}
                </datalist>
              </div>

              {/* Education + dependents */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={fieldLabel}>{t('Education Level')}</label>
                  <select value={empForm.educationLevel} onChange={e => setEmpForm(f => ({ ...f, educationLevel: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                    <option value="">{t('Select education level')}</option>
                    <option value={1}>{t('High School')}</option>
                    <option value={2}>{t('Associate Degree')}</option>
                    <option value={3}>{t("Bachelor's Degree")}</option>
                    <option value={4}>{t("Master's Degree")}</option>
                    <option value={5}>{t('PhD')}</option>
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>{t('Number of Dependents')}</label>
                  <input type="number" min="0" value={empForm.numberOfDependents} onChange={e => setEmpForm(f => ({ ...f, numberOfDependents: e.target.value }))} placeholder="e.g. 2" style={fieldInput} />
                </div>
              </div>

              {/* Role / Type / Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={fieldLabel}>{t('Role')}</label>
                  <select value={empForm.role} onChange={e => setEmpForm(f => ({ ...f, role: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                    {ROLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>{t('Employee Type')}</label>
                  <select value={empForm.employeeType} onChange={e => setEmpForm(f => ({ ...f, employeeType: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                    {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>{t('Status')}</label>
                  <select value={empForm.employmentStatus} onChange={e => setEmpForm(f => ({ ...f, employmentStatus: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                    {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Dates + money + currency */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={fieldLabel}>{t('Birth Date')}</label>
                  <input type="date" value={empForm.birth_date} onChange={e => setEmpForm(f => ({ ...f, birth_date: e.target.value }))} style={fieldInput} />
                </div>
                <div>
                  <label style={fieldLabel}>{t('Hiring Date')}</label>
                  <input type="date" value={empForm.hiring_date} onChange={e => setEmpForm(f => ({ ...f, hiring_date: e.target.value }))} style={fieldInput} />
                </div>
                <div>
                  <label style={fieldLabel}>{t('Monthly Income')}</label>
                  <input type="number" min="0" step="0.01" value={empForm.monthlyIncome} onChange={e => setEmpForm(f => ({ ...f, monthlyIncome: e.target.value }))} placeholder="0" style={fieldInput} />
                </div>
                <div>
                  <label style={fieldLabel}>{t('Currency')}</label>
                  <select value={empForm.currency_preference} onChange={e => setEmpForm(f => ({ ...f, currency_preference: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                    {CURRENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Work Schedule */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, marginTop: 4 }}>
                <div style={sectionHead}>{t('Work Schedule')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={fieldLabel}>{t('Default Clock In')}</label>
                    <input type="time" value={empForm.default_clock_in} onChange={e => setEmpForm(f => ({ ...f, default_clock_in: e.target.value }))} style={fieldInput} />
                  </div>
                  <div>
                    <label style={fieldLabel}>{t('Default Clock Out')}</label>
                    <input type="time" value={empForm.default_clock_out} onChange={e => setEmpForm(f => ({ ...f, default_clock_out: e.target.value }))} style={fieldInput} />
                  </div>
                  <div>
                    <label style={fieldLabel}>{t('Contracted Hours / Week')}</label>
                    <input type="number" min="0" max="168" value={empForm.contracted_hours} onChange={e => setEmpForm(f => ({ ...f, contracted_hours: e.target.value }))} placeholder="e.g. 40" style={fieldInput} />
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, marginTop: 4 }}>
                <div style={sectionHead}>{t('Personal Details')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={fieldLabel}>{t('Phone Number')}</label>
                    <input type="tel" value={empForm.phoneNumber} onChange={e => setEmpForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="+20 100 000 0000" style={fieldInput} />
                  </div>
                  <div>
                    <label style={fieldLabel}>{t('Gender')}</label>
                    <select value={empForm.gender} onChange={e => setEmpForm(f => ({ ...f, gender: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                      <option value="">{t('Select gender')}</option>
                      <option value="Male">{t('Male')}</option>
                      <option value="Female">{t('Female')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabel}>{t('Marital Status')}</label>
                    <select value={empForm.maritalStatus} onChange={e => setEmpForm(f => ({ ...f, maritalStatus: e.target.value }))} style={{ ...fieldInput, cursor: 'pointer' }}>
                      <option value="">{t('Select status')}</option>
                      <option value="Single">{t('Single')}</option>
                      <option value="Married">{t('Married')}</option>
                      <option value="Divorced">{t('Divorced')}</option>
                    </select>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', marginTop: 12 }}>
                  <input type="checkbox" checked={empForm.has_disability} onChange={e => setEmpForm(f => ({ ...f, has_disability: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  {t('Has Disability')}
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <Btn variant="ghost" onClick={() => { setEmpModal({ open: false, candidate: null }); setEmpForm(EMPTY_EMPLOYEE); setEmpPendingTitle(''); }} style={{ flex: 1, height: 48, borderRadius: 12, fontWeight: 800 }}>{t('Cancel')}</Btn>
                <Btn onClick={submitAddEmployee} disabled={empSaving} style={{ flex: 1, height: 48, borderRadius: 12, fontWeight: 900, background: 'var(--red-600)', border: 'none' }}>
                  {empSaving ? t('Creating...') : t('Create Employee')}
                </Btn>
              </div>
            </div>
          );
        })()}
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .job-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); border-color: var(--red-100); }
        .action-btn-large {
          width: 48px; height: 48px; border: 1.5px solid #F1F5F9; background: #fff;
          color: #94A3B8; border-radius: 12px; display: grid; placeItems: center;
          cursor: pointer; transition: all 0.2s;
        }
        .action-btn-large:hover { color: var(--red-600); border-color: var(--red-100); background: var(--red-50); }
        .job-card-icon {
          width: 32px; height: 32px; border: 1.5px solid #F1F5F9; background: #fff;
          color: #64748B; border-radius: 10px; display: grid; placeItems: center;
          cursor: pointer; transition: all 0.15s; padding: 0;
        }
        .job-card-icon:hover { color: var(--red-600); border-color: var(--red-200); background: var(--red-50); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
