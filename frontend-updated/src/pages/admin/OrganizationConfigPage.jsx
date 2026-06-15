import { useEffect, useMemo, useState } from 'react';
import {
  hrGetPositionCatalog, hrCreatePosition, hrGetEmployees,
  hrGetDepartmentOptions, hrCreateDepartment, hrDeleteDepartment,
  hrGetTeamOptions, hrCreateTeam, hrUpdateTeam, hrDeleteTeam,
  adminGetOrgConfig, adminUpdateOrgConfig,
  adminGetLeaveTypes, adminCreateLeaveType, adminDeleteLeaveType,
  adminGetPublicHolidays, adminGetHolidayOverrides, adminCreateHolidayOverride, adminDeleteHolidayOverride
} from '../../api/index.js';
import {
  Badge,
  Btn,
  EmptyState,
  Input,
  Modal,
  useToast,
  Skeleton
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Calendar,
  Settings,
  Plus,
  Trash2,
  Pencil,
  Info,
  Globe,
  Tag,
  Users
} from 'lucide-react';

import { OrgEntityProfile } from '../../features/core/components/OrgEntityProfile';
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
    { id: 'departments', label: 'Departments', icon: <Building2 size={18} /> },
    { id: 'teams', label: 'Teams', icon: <Users size={18} /> },
    { id: 'jobs', label: 'Jobs', icon: <Briefcase size={18} /> },
    { id: 'leaveTypes', label: 'Leave Types', icon: <Calendar size={18} /> },
    { id: 'holidays', label: 'Public Holidays', icon: <Globe size={18} /> },
  ], []);
  
  const [company, setCompany] = useState({ name: '', legalName: '', address: '', phone: '', email: '', workStart: '09:00', workEnd: '17:00', workingDays: [] });
  const [security, setSecurity] = useState({ twoFactorEnabled: true, sessionTimeout: 30, notificationsEnabled: true });
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [holidayOverrides, setHolidayOverrides] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { departmentStats, teamStats } = useOrgStats(employees);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [j, e, cfg, lv, dept, tm] = await Promise.all([
          hrGetPositionCatalog().catch(() => []),
          hrGetEmployees().catch(() => []),
          adminGetOrgConfig().catch(() => ({})),
          adminGetLeaveTypes().catch(() => []),
          hrGetDepartmentOptions().catch(() => []),
          hrGetTeamOptions().catch(() => []),
        ]);

        setJobs(Array.isArray(j) ? j : []);
        setEmployees(Array.isArray(e) ? e : []);
        setDepartments(Array.isArray(dept) ? dept : []);
        setTeams(Array.isArray(tm) ? tm : []);
        
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

  // Levels = the distinct job levels in the catalog (each once, case-insensitive),
  // with how many catalog entries use them; Titles = the distinct title strings.
  const jobLevels = useMemo(() => {
    const map = {};
    jobs.forEach(j => {
      const level = (j.level || '').trim();
      if (!level) return;
      const key = level.toLowerCase();
      if (!map[key]) map[key] = { level, positionCount: 0 };
      map[key].positionCount += 1;
    });
    return Object.values(map).sort((a, b) => a.level.localeCompare(b.level));
  }, [jobs]);
  const jobTitles = useMemo(() => {
    const counts = {};
    jobs.forEach(j => {
      const title = (j.title || '').trim();
      if (title) counts[title] = (counts[title] || 0) + ((j.level || '').trim() ? 1 : 0);
    });
    return Object.entries(counts).map(([title, positionCount]) => ({ title, positionCount }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [jobs]);

  const addLevel = async () => {
    const level = (form.level || '').trim();
    if (!level) return toast(t('Level name is required'), 'error');
    if (jobLevels.some(jl => jl.level.toLowerCase() === level.toLowerCase())) {
      return toast(t('That job level already exists'), 'error');
    }
    try {
      const res = await hrCreatePosition({ title: '', level, base_salary: 0 });
      setJobs(p => [...p, res]);
      setModal(null); setForm({});
      toast(t('Job level added'));
    } catch (err) {
      toast(err?.message || t('Failed to add job level'), 'error');
    }
  };

  const addTitle = async () => {
    const title = (form.title || '').trim();
    if (!title) return toast(t('Title is required'), 'error');
    if (jobTitles.some(jt => jt.title.toLowerCase() === title.toLowerCase())) {
      return toast(t('That job title already exists'), 'error');
    }
    try {
      const res = await hrCreatePosition({ title, level: '', base_salary: 0 });
      setJobs(p => [...p, res]);
      setModal(null); setForm({});
      toast(t('Job title added'));
    } catch (err) {
      toast(err?.message || t('Failed to add job title'), 'error');
    }
  };

  const addDepartment = async () => {
    const name = (form.name || '').trim();
    if (!name) return toast(t('Department name is required'), 'error');
    if (departments.some(d => (d.name || '').toLowerCase() === name.toLowerCase())) {
      return toast(t('That department already exists'), 'error');
    }
    try {
      const res = await hrCreateDepartment({ name });
      setDepartments(p => [...p, res]);
      setModal(null); setForm({});
      toast(t('Department added'));
    } catch (err) {
      toast(err?.message || t('Failed to add department'), 'error');
    }
  };

  const deleteDepartment = async (id) => {
    try {
      await hrDeleteDepartment(id);
      setDepartments(p => p.filter(d => d.department_id !== id));
      toast(t('Department removed'));
    } catch (err) {
      toast(err?.message || t('Failed to remove department'), 'error');
    }
  };

  // Team leaders available to lead a team (employees with the TeamLeader role).
  const teamLeaders = useMemo(
    () => employees.filter(e => e.role === 'TeamLeader' && !e.isDeleted),
    [employees],
  );

  const saveTeam = async () => {
    const name = (form.name || '').trim();
    if (!name) return toast(t('Team name is required'), 'error');
    const payload = { name, leader: form.leader || null };
    try {
      if (form.team_id) {
        const res = await hrUpdateTeam(form.team_id, payload);
        setTeams(p => p.map(tm => (tm.team_id === form.team_id ? res : tm)));
        toast(t('Team updated'));
      } else {
        const res = await hrCreateTeam(payload);
        setTeams(p => [...p, res]);
        toast(t('Team added'));
      }
      setModal(null); setForm({});
    } catch (err) {
      toast(err?.message || t('Failed to save team'), 'error');
    }
  };

  const deleteTeam = async (id) => {
    try {
      await hrDeleteTeam(id);
      setTeams(p => p.filter(tm => tm.team_id !== id));
      toast(t('Team removed'));
    } catch (err) {
      toast(err?.message || t('Failed to remove team'), 'error');
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

  const reloadHolidays = async (year = holidayYear) => {
    const [hs, ov] = await Promise.all([
      adminGetPublicHolidays(year).catch(() => []),
      adminGetHolidayOverrides(year).catch(() => []),
    ]);
    setHolidays(Array.isArray(hs) ? hs : []);
    setHolidayOverrides(Array.isArray(ov) ? ov : []);
  };

  useEffect(() => {
    if (activeTab === 'holidays') reloadHolidays(holidayYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, holidayYear]);

  const addCompanyHoliday = async () => {
    if (!form.date) return toast(t('Pick a date'), 'error');
    try {
      await adminCreateHolidayOverride({ date: form.date, name: form.name || 'Company holiday', type: 'add' });
      setModal(null); setForm({});
      await reloadHolidays();
      toast(t('Holiday added'));
    } catch (err) {
      toast(err.message || t('Failed to add holiday'), 'error');
    }
  };

  // Library holiday -> create a 'remove' override; company-added -> delete its override.
  const removeHoliday = async (holiday, override) => {
    try {
      if (override && override.type === 'add') {
        await adminDeleteHolidayOverride(override.overrideID);
      } else {
        await adminCreateHolidayOverride({ date: holiday.date, name: holiday.name, type: 'remove' });
      }
      await reloadHolidays();
      toast(t('Holiday removed'));
    } catch (err) {
      toast(err.message || t('Failed to remove holiday'), 'error');
    }
  };

  const restoreHoliday = async (override) => {
    try {
      await adminDeleteHolidayOverride(override.overrideID);
      await reloadHolidays();
      toast(t('Holiday restored'));
    } catch (err) {
      toast(err.message || t('Failed to restore holiday'), 'error');
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

        {activeTab === 'departments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 950, color: '#1E293B', marginBottom: 4 }}>{t('Departments')}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{t('View, add and remove the organization’s departments.')}</p>
              </div>
              <Btn variant="primary" style={{ height: 48, borderRadius: 14, background: '#10B981', border: 'none', fontWeight: 900, padding: '0 24px' }} onClick={() => { setForm({}); setModal('department'); }}>
                <Plus size={18} style={{ marginRight: 8 }} /> {t('Add Department')}
              </Btn>
            </div>

            {departments.length === 0 ? (
              <EmptyState icon={<Building2 size={40} />} title={t('No departments yet')} subtitle={t('Add a department to organize employees across the company.')} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {departments.map(d => {
                  const count = employees.filter(e => e.department === d.department_id || e.department === d.name).length;
                  return (
                    <div key={d.department_id} className="glass-card-employee" style={{ padding: 24, border: '1.5px solid #fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Building2 size={22} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 950, fontSize: 16, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{count} {count === 1 ? t('employee') : t('employees')}</div>
                        </div>
                      </div>
                      <button className="delete-btn" onClick={() => deleteDepartment(d.department_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 8 }} title={t('Remove')}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'teams' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 950, color: '#1E293B', marginBottom: 4 }}>{t('Teams')}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{t('Create teams and assign a team leader to each.')}</p>
              </div>
              <Btn variant="primary" style={{ height: 48, borderRadius: 14, background: '#10B981', border: 'none', fontWeight: 900, padding: '0 24px' }} onClick={() => { setForm({}); setModal('team'); }}>
                <Plus size={18} style={{ marginRight: 8 }} /> {t('Add Team')}
              </Btn>
            </div>

            {teams.length === 0 ? (
              <EmptyState icon={<Users size={40} />} title={t('No teams yet')} subtitle={t('Add a team and assign a leader to organize members.')} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {teams.map(tm => {
                  const memberCount = employees.filter(e => e.team === tm.team_id || e.team === tm.name).length;
                  return (
                    <div key={tm.team_id} className="glass-card-employee" style={{ padding: 24, border: '1.5px solid #fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Users size={22} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 950, fontSize: 16, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tm.name}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>
                            {tm.leaderName ? `${t('Lead')}: ${tm.leaderName}` : t('No leader assigned')} · {memberCount} {memberCount === 1 ? t('member') : t('members')}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <button className="delete-btn" onClick={() => { setForm({ team_id: tm.team_id, name: tm.name, leader: tm.leader || '' }); setModal('team'); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 8 }} title={t('Edit')}>
                          <Pencil size={17} />
                        </button>
                        <button className="delete-btn" onClick={() => deleteTeam(tm.team_id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 8 }} title={t('Remove')}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'jobs' && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 20, fontWeight: 950, color: '#1E293B', marginBottom: 4 }}>{t('Jobs')}</h3>
              <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{t('Manage the catalog of job positions (title + level) and the distinct job titles.')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
              {/* Column 1: Job Levels (derived from the catalog — read-only) */}
              <div className="glass-card-employee" style={{ padding: 28, border: '1.5px solid #fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', display: 'grid', placeItems: 'center' }}><Briefcase size={20} /></div>
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 16, color: '#1E293B' }}>{t('Job Levels')}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{jobLevels.length} {t('levels')}</div>
                    </div>
                  </div>
                  <Btn variant="primary" title={t('Add')} style={{ height: 40, width: 40, borderRadius: 12, background: '#EF4444', border: 'none', fontWeight: 900, padding: 0, display: 'grid', placeItems: 'center' }} onClick={() => { setForm({}); setModal('level'); }}>
                    <Plus size={18} />
                  </Btn>
                </div>
                {jobLevels.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13, fontWeight: 700 }}>{t('No levels yet.')}</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {jobLevels.map(jl => (
                      <div key={jl.level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F8FAFC', borderRadius: 14, border: '1.5px solid #F1F5F9' }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: '#1E293B' }}>{jl.level}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: Job Titles */}
              <div className="glass-card-employee" style={{ padding: 28, border: '1.5px solid #fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', display: 'grid', placeItems: 'center' }}><Tag size={20} /></div>
                    <div>
                      <div style={{ fontWeight: 950, fontSize: 16, color: '#1E293B' }}>{t('Job Titles')}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>{jobTitles.length} {t('titles')}</div>
                    </div>
                  </div>
                  <Btn variant="primary" title={t('Add')} style={{ height: 40, width: 40, borderRadius: 12, background: '#EF4444', border: 'none', fontWeight: 900, padding: 0, display: 'grid', placeItems: 'center' }} onClick={() => { setForm({}); setModal('title'); }}>
                    <Plus size={18} />
                  </Btn>
                </div>
                {jobTitles.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13, fontWeight: 700 }}>{t('No job titles yet.')}</div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {jobTitles.map(jt => (
                      <div key={jt.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F8FAFC', borderRadius: 14, border: '1.5px solid #F1F5F9' }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: '#1E293B' }}>{jt.title}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

        {activeTab === 'holidays' && (() => {
          const overridesByDate = {};
          holidayOverrides.forEach(o => { overridesByDate[o.date] = o; });
          const removed = holidayOverrides.filter(o => o.type === 'remove');
          const fmt = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 950, color: '#1E293B', marginBottom: 4 }}>{t('Public Holidays')}</h3>
                  <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>{t('Egyptian national holidays from the holidays library, plus any company adjustments.')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, border: '1.5px solid #E2E8F0', padding: '6px 10px' }}>
                    <button onClick={() => setHolidayYear(y => y - 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', fontWeight: 900, fontSize: 18 }}>−</button>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#1E293B', minWidth: 48, textAlign: 'center' }}>{holidayYear}</span>
                    <button onClick={() => setHolidayYear(y => y + 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', fontWeight: 900, fontSize: 18 }}>+</button>
                  </div>
                  <Btn variant="primary" style={{ height: 48, borderRadius: 14, background: '#10B981', border: 'none', fontWeight: 900, padding: '0 24px' }} onClick={() => { setForm({}); setModal('holiday'); }}>
                    <Plus size={18} style={{ marginRight: 8 }} /> {t('Add Holiday')}
                  </Btn>
                </div>
              </div>

              {holidays.length === 0 ? (
                <EmptyState icon={<Globe size={40} />} title={t('No holidays for this year')} subtitle={t('Use Add Holiday to configure a company day off.')} />
              ) : (
                <div className="glass-card-employee" style={{ padding: 0, border: '1.5px solid #fff', overflow: 'hidden' }}>
                  {holidays.map((h, i) => {
                    const override = overridesByDate[h.date];
                    const isCompany = h.source === 'override';
                    return (
                      <div key={h.date} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 28px', borderTop: i === 0 ? 'none' : '1px solid #F1F5F9' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: isCompany ? '#8B5CF6' : '#10B981' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{h.name}</div>
                          <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>{fmt(h.date)}</div>
                        </div>
                        <Badge label={isCompany ? t('Company') : t('Official')} color={isCompany ? 'accent' : 'green'} />
                        <button className="delete-btn" onClick={() => removeHoliday(h, override)} title={t('Remove from calendar')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 8 }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {removed.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>{t('Removed official days')}</h4>
                  <div className="glass-card-employee" style={{ padding: 0, border: '1.5px solid #fff', overflow: 'hidden' }}>
                    {removed.map((o, i) => (
                      <div key={o.overrideID} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 28px', borderTop: i === 0 ? 'none' : '1px solid #F1F5F9' }}>
                        <Info size={16} color="#94A3B8" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#475569', textDecoration: 'line-through' }}>{o.name || fmt(o.date)}</div>
                          <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700 }}>{fmt(o.date)}</div>
                        </div>
                        <button onClick={() => restoreHoliday(o)} style={{ border: '1.5px solid #E2E8F0', background: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: '#10B981', fontSize: 13, fontWeight: 900 }}>
                          {t('Restore')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </div>

      {/* Modals */}
      <Modal open={modal === 'level'} onClose={() => setModal(null)} title={t('Add Job Level')}>
        <div style={{ display: 'grid', gap: 24 }}>
          <Input label={t('Level Name')} value={form.level || ''} onChange={e => setForm(p => ({...p, level: e.target.value}))} placeholder="e.g. Junior" />
          <Btn onClick={addLevel} style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 900, background: '#10B981' }}>{t('Add Level')}</Btn>
        </div>
      </Modal>

      <Modal open={modal === 'department'} onClose={() => setModal(null)} title={t('Add Department')}>
        <div style={{ display: 'grid', gap: 24 }}>
          <Input label={t('Department Name')} value={form.name || ''} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Engineering" />
          <Btn onClick={addDepartment} style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 900, background: '#10B981' }}>{t('Add Department')}</Btn>
        </div>
      </Modal>

      <Modal open={modal === 'team'} onClose={() => setModal(null)} title={form.team_id ? t('Edit Team') : t('Add Team')}>
        <div style={{ display: 'grid', gap: 24 }}>
          <Input label={t('Team Name')} value={form.name || ''} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Platform Squad" />
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>{t('Team Leader')}</label>
            <select
              value={form.leader || ''}
              onChange={e => setForm(p => ({ ...p, leader: e.target.value }))}
              style={{ width: '100%', height: 48, padding: '0 14px', borderRadius: 14, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 14, fontWeight: 700, color: '#1E293B', outline: 'none' }}
            >
              <option value="">{t('— No leader —')}</option>
              {teamLeaders.map(l => (
                <option key={l.employeeID} value={l.employeeID}>{l.fullName || l.email}</option>
              ))}
            </select>
            {teamLeaders.length === 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#94A3B8', fontWeight: 600 }}>{t('No employees with the Team Leader role yet.')}</p>
            )}
          </div>
          <Btn onClick={saveTeam} style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 900, background: '#10B981' }}>{form.team_id ? t('Save Changes') : t('Add Team')}</Btn>
        </div>
      </Modal>

      <Modal open={modal === 'title'} onClose={() => setModal(null)} title={t('Add Job Title')}>
        <div style={{ display: 'grid', gap: 24 }}>
          <Input label={t('Job Title')} value={form.title || ''} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="e.g. Software Engineer" />
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', fontWeight: 600 }}>{t('A job title with no level. Add leveled positions for it in the Job Positions column.')}</p>
          <Btn onClick={addTitle} style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 900, background: '#10B981' }}>{t('Add Title')}</Btn>
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

      <Modal open={modal === 'holiday'} onClose={() => setModal(null)} title={t('Add Public Holiday')}>
        <div style={{ display: 'grid', gap: 24 }}>
          <Input label={t('Date')} type="date" value={form.date || ''} onChange={e => setForm(p => ({...p, date: e.target.value}))} />
          <Input label={t('Holiday Name')} value={form.name || ''} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Company Foundation Day" />
          <p style={{ margin: 0, fontSize: 13, color: '#64748B', fontWeight: 600 }}>
            {t('This adds a company day off on top of the national holidays. It counts as a non-working day for leave, attendance and pay.')}
          </p>
          <Btn onClick={addCompanyHoliday} style={{ width: '100%', height: 52, borderRadius: 14, fontWeight: 900, background: '#10B981' }}>{t('Add Holiday')}</Btn>
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
