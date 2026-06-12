import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  hrGetEmployees,
  hrGetRosterHealth,
  hrCreateEmployeeRecord,
  hrUpdateEmployeeRecord,
  hrDeleteEmployeeRecord,
  hrGetEmployeeHistory,
  hrGetEmployeeSnapshot,
  hrChangeEmployeeRole,
  getPredictions,
} from '../../api/index.js';
import { Spinner, Modal, Btn, Badge, DatalistInput, Input, Textarea, useToast } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Pencil, Archive, History } from 'lucide-react';

const EMPTY_FORM = {
    fullName:         '',
    email:            '',
    role:             'TeamMember',
    employeeType:     '',
    location:         '',
    employmentStatus: 'Active',
    job:              '',
    department:       '',
    team:             '',
    monthlyIncome:    '',
    birth_date:       '',
    hiring_date:      '',
    performanceRating:  '',
    numberOfPromotions: '',
    remoteWork:       false,
    currency_preference: 'EGP',
    numberOfDependents: '',
    educationLevel: '',
    phoneNumber: '',
    has_disability: false,
    gender: '',
    maritalStatus: '',
    default_clock_in: '',
    default_clock_out: '',
    contracted_hours: '',
};

const EMPTY_ROLE_CHANGE = {
  action: 'Promotion',
  jobTitle: '',
  job: '',
  role: 'TeamMember',
  department: '',
  team: '',
  monthlyIncome: '',
  currency_preference: 'EGP',
  notes: '',
};

const ROLE_OPTIONS = ['TeamMember', 'TeamLeader', 'HRManager', 'Admin'];
const TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Intern'];
const STATUS_OPTIONS = ['Active', 'Probation', 'On Leave'];
const ACTION_OPTIONS = ['Promotion', 'Demotion', 'Role Change'];
const CURRENCY_OPTIONS = ['EGP', 'USD'];
const EMPTY_ROSTER_HEALTH = { summary: {}, departmentBreakdown: [], followUpItems: [] };

const selectStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'var(--gray-100)',
  border: '2px solid transparent',
  borderRadius: 14,
  fontSize: 14,
  fontWeight: 500,
  color: 'var(--gray-900)',
  outline: 'none',
};

function uniqueValues(items, key) {
  return [...new Set(items.map(item => item?.[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function JobTitleLevelPicker({ jobs, value, onChange, t, selectStyle, disabled = false }) {
  const jobsArr = Array.isArray(jobs) ? jobs : [];
  const savedJob = jobsArr.find(j => String(j.job_id) === String(value)) || null;

  // Local title sticks even when no job_id is locked in yet (i.e. user picked
  // a title that has multiple levels and is still choosing the level).
  const [pendingTitle, setPendingTitle] = useState(savedJob?.title || '');

  // Sync from outside when the saved job_id changes (modal open/edit/reset).
  useEffect(() => {
    setPendingTitle(savedJob?.title || '');
  }, [savedJob?.title]);

  const selectedTitle = savedJob?.title || pendingTitle || '';
  const selectedLevel = savedJob?.level || '';

  const titles = [...new Set(jobsArr.map(j => j.title).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b)));

  const levelsForTitle = jobsArr
    .filter(j => j.title === selectedTitle)
    .map(j => j.level || '')
    .filter((v, i, a) => a.indexOf(v) === i);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setPendingTitle(newTitle);
    if (!newTitle) { onChange(''); return; }
    const matching = jobsArr.filter(j => j.title === newTitle);
    if (matching.length === 1) onChange(matching[0].job_id);
    else onChange('');
  };

  const handleLevelChange = (e) => {
    const newLevel = e.target.value;
    const job = jobsArr.find(
      j => j.title === selectedTitle && (j.level || '') === newLevel,
    );
    onChange(job ? job.job_id : '');
  };

  return (
    <>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
          {t('Job Title')}
        </label>
        <select value={selectedTitle} onChange={handleTitleChange} style={selectStyle} disabled={disabled}>
          <option value="">{t('Select a job title')}</option>
          {titles.map(title => (
            <option key={title} value={title}>{title}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
          {t('Job Level')}
        </label>
        <select
          value={selectedLevel}
          onChange={handleLevelChange}
          style={selectStyle}
          disabled={disabled || !selectedTitle}
        >
          <option value="">{t('Select a job level')}</option>
          {levelsForTitle.map(level => (
            <option key={level || '__none'} value={level}>{level || t('— none —')}</option>
          ))}
        </select>
      </div>
    </>
  );
}

function formatMoney(value, currency = 'EGP') {
  if (value === null || value === undefined || value === '') return '—';
  const locale = typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'EGP',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function downloadTextFile(filename, content, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function HREmployeesPage() {
  const toast = useToast();
  const { t, language } = useLanguage();
  const { user, resolvePath } = useAuth();
  const navigate = useNavigate();
  const isAdminView = user?.role === 'Admin';

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [rosterHealth, setRosterHealth] = useState(EMPTY_ROSTER_HEALTH);
  const [employeeRisks, setEmployeeRisks] = useState({});
  const [filters, setFilters] = useState({ search: '', department: '', role: '', type: '', location: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [roleChange, setRoleChange] = useState(EMPTY_ROLE_CHANGE);
  const [teamOptions, setTeamOptions]           = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [jobOptions, setJobOptions]             = useState([]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const [data, latestPredictions, rosterData] = await Promise.all([
        hrGetEmployees(),
        getPredictions().catch(() => []),
        hrGetRosterHealth().catch(() => EMPTY_ROSTER_HEALTH),
      ]);
      setEmployees(Array.isArray(data) ? data : []);
      setRosterHealth(rosterData && typeof rosterData === 'object' ? rosterData : EMPTY_ROSTER_HEALTH);
      setEmployeeRisks(
        (Array.isArray(latestPredictions) ? latestPredictions : []).reduce((acc, item) => {
          if (item?.employeeID) acc[item.employeeID] = item;
          return acc;
        }, {})
      );
    } catch (error) {
      toast(error.message || 'Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    const fetchOptions = async () => {
      try {
        const [teams, departments, jobs] = await Promise.all([
          api.get('/employee_management/teams/'),
          api.get('/employee_management/departments/'),
          api.get('/employee_management/jobs/'),
        ]);
        const toArray = (payload) => Array.isArray(payload) ? payload : (payload?.results || []);
        setTeamOptions(toArray(teams));
        setDepartmentOptions(toArray(departments));
        setJobOptions(toArray(jobs));
      } catch (error) {
        toast(error.message || 'Failed to load job/department/team options', 'error');
      }
    };
    fetchOptions();
  }, []);

  const filteredEmployees = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch = !search || [
        employee.fullName,
        employee.email,
        employee.jobTitle,
        employee.department,
        employee.employeeID,
      ].some(value => String(value || '').toLowerCase().includes(search));

      const matchesDepartment = !filters.department || (employee.department || '') === filters.department;
      const matchesRole = !filters.role || (employee.role || '') === filters.role;
      const matchesType = !filters.type || (employee.employeeType || '') === filters.type;
      const matchesLocation = !filters.location || (employee.location || '') === filters.location;

      return matchesSearch && matchesDepartment && matchesRole && matchesType && matchesLocation;
    });
  }, [employees, filters]);

  const departments = useMemo(() => uniqueValues(employees, 'department'), [employees]);
  const jobTitles = useMemo(() => uniqueValues(employees, 'jobTitle'), [employees]);
  const teams = useMemo(() => uniqueValues(employees, 'team'), [employees]);
  const roles = useMemo(() => uniqueValues(employees, 'role'), [employees]);
  const locations = useMemo(() => uniqueValues(employees, 'location'), [employees]);
  const activeCount = employees.filter(employee => employee.employmentStatus === 'Active').length;
  const promotionCount = employees.reduce((sum, employee) => sum + (employee.numberOfPromotions || 0), 0);
  const followUpCount = Object.values(employeeRisks).filter((item) => ['High', 'Medium'].includes(item?.riskLevel)).length;
  const rosterSummary = rosterHealth?.summary || {};
  const dataQuality = useMemo(() => {
    const salaryMapped = employees.filter((employee) => employee.monthlyIncome !== null && employee.monthlyIncome !== undefined && employee.monthlyIncome !== '').length;
    const locationMapped = employees.filter((employee) => String(employee.location || '').trim() !== '').length;
    const departmentMapped = employees.filter((employee) => String(employee.department || '').trim() !== '').length;
    const totalChecks = employees.length * 3;
    const completedChecks = salaryMapped + locationMapped + departmentMapped;
    return {
      salaryMapped,
      locationMapped,
      departmentMapped,
      probationCount: employees.filter((employee) => employee.employmentStatus === 'Probation').length,
      onLeaveCount: employees.filter((employee) => employee.employmentStatus === 'On Leave').length,
      coveragePct: totalChecks ? Math.round((completedChecks / totalChecks) * 100) : 0,
    };
  }, [employees]);
  const employeePulseCards = useMemo(() => ([
    {
      label: t('Roster Size'),
      value: employees.length,
      note: t('Employees currently managed inside the directory workspace.'),
      accent: '#111827',
    },
    {
      label: t('Active Roster'),
      value: activeCount,
      note: t('People currently active across departments and teams.'),
      accent: '#22C55E',
    },
    {
      label: t('Follow-Up Watch'),
      value: rosterSummary.followUpCount ?? followUpCount,
      note: t('Profiles or risk flags that may need HR attention.'),
      accent: '#F59E0B',
    },
    {
      label: t('Profile Completeness'),
      value: `${dataQuality.coveragePct}%`,
      note: t('Directory quality across salary, department, and location fields.'),
      accent: dataQuality.coveragePct >= 80 ? '#16A34A' : '#E8321A',
    },
  ]), [activeCount, dataQuality.coveragePct, employees.length, followUpCount, rosterSummary.followUpCount, t]);
  const rosterFollowUpItems = rosterHealth?.followUpItems || [];
  const departmentPressureMap = rosterHealth?.departmentBreakdown || [];
  const highPriorityRosterItems = rosterFollowUpItems.filter((item) => item.priority === 'High').length;
  const spotlightQueue = useMemo(() => (
    [...rosterFollowUpItems]
      .sort((a, b) => {
        const priorityScore = { High: 3, Medium: 2, Watch: 1 };
        return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0)
          || Number(b.riskScore || 0) - Number(a.riskScore || 0)
          || (b.flags?.length || 0) - (a.flags?.length || 0);
      })
      .slice(0, 4)
  ), [rosterFollowUpItems]);
  const workforcePlaybook = useMemo(() => {
    const plays = [];

    if ((rosterSummary.incompleteProfiles ?? 0) > 0) {
      plays.push({
        title: t('Close profile gaps'),
        note: t('Complete missing location, department, title, and payroll fields so HR decisions rely on cleaner records.'),
      });
    }
    if ((rosterSummary.attritionFollowUp ?? followUpCount) > 0) {
      plays.push({
        title: t('Check retention-sensitive cases'),
        note: t('Review employees with medium or high attrition watch signals before the next manager or talent review.'),
      });
    }
    if (dataQuality.probationCount > 0 || dataQuality.onLeaveCount > 0) {
      plays.push({
        title: t('Review transition planning'),
        note: t('Probation and leave cases often need clearer goals, handover coverage, or return-to-work planning.'),
      });
    }
    if (!plays.length) {
      plays.push({
        title: t('Maintain workforce hygiene'),
        note: t('The directory looks healthy right now, so keep the same audit rhythm and spot-check follow-up process.'),
      });
    }

    return plays.slice(0, 3);
  }, [dataQuality.onLeaveCount, dataQuality.probationCount, followUpCount, rosterSummary.attritionFollowUp, rosterSummary.incompleteProfiles, t]);
  const formatDate = (value) => (value ? new Date(value).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '—');
  const formatDateTime = (value) => (value ? new Date(value).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') : '—');
  const riskColor = (level) => {
    if (level === 'High') return 'red';
    if (level === 'Medium') return 'orange';
    if (level === 'Low') return 'green';
    return 'gray';
  };

  const setField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const setRoleChangeField = (key) => (event) => {
    setRoleChange((prev) => ({ ...prev, [key]: event.target.value }));
  };

  // Distinct job titles (each title shown only once) from the jobs table.
  const jobTitleOptions = useMemo(() => {
    const seen = new Set();
    const titles = [];
    for (const j of jobOptions) {
      if (j.title && !seen.has(j.title)) {
        seen.add(j.title);
        titles.push(j.title);
      }
    }
    return titles;
  }, [jobOptions]);

  // Levels available for the currently selected job title. Each option resolves
  // to a specific job row (job_id), since a (title, level) pair is one job.
  const jobLevelOptions = useMemo(
    () => jobOptions.filter((j) => j.title === roleChange.jobTitle),
    [jobOptions, roleChange.jobTitle],
  );

  // Picking a title resets the level/job; if the title has a single level, auto-select it.
  const handleJobTitleChange = (event) => {
    const title = event.target.value;
    const matches = jobOptions.filter((j) => j.title === title);
    setRoleChange((prev) => ({
      ...prev,
      jobTitle: title,
      job: matches.length === 1 ? matches[0].job_id : '',
    }));
  };

  const normalizePayload = () => ({
    ...form,
    fullName: form.fullName.trim(),
    email: form.email.trim().toLowerCase(),
    monthlyIncome: form.monthlyIncome === '' ? null : Number(form.monthlyIncome),
    birth_date: form.birth_date || null,
    hiring_date: form.hiring_date || null,
    job:         form.job         || null,   // FK id
    team:        form.team        || null,   // FK id
    department:  form.department  || null,   // FK id
    numberOfDependents: form.numberOfDependents === '' ? null : Number(form.numberOfDependents),
    educationLevel: form.educationLevel || null,
  });

  const resetForm = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (employee) => {
    setSelected(employee);
    setForm({
      ...EMPTY_FORM,
      ...employee,
      monthlyIncome: employee.monthlyIncome ?? '',
      yearsAtCompany: employee.yearsAtCompany ?? '',
    });
    setShowEdit(true);
  };

  const openRoleChangeModal = (employee) => {
    setSelected(employee);
    setRoleChange({
      action: 'Promotion',
      jobTitle: employee.jobTitle ?? '',
      job: employee.job ?? '',
      role: employee.role || 'TeamMember',
      department: employee.department ?? '',
      team: employee.team ?? '',
      monthlyIncome: employee.monthlyIncome ?? '',
      currency_preference: employee.currency_preference || 'EGP',
      notes: '',
    });
    setShowRoleChange(true);
  };

  const openHistoryModal = async (employee) => {
    setSelected(employee);
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const data = await hrGetEmployeeHistory(employee.employeeID);
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || 'Failed to load job history', 'error');
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openSnapshotModal = async (employee) => {
    setSelected(employee);
    setShowSnapshot(true);
    setSnapshot(null);
    setSnapshotLoading(true);
    try {
      const data = await hrGetEmployeeSnapshot(employee.employeeID);
      setSnapshot(data || null);
    } catch (error) {
      toast(error.message || 'Failed to load employee 360 view', 'error');
      setSnapshot(null);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleCreate = async () => {
    const payload = normalizePayload();
    if (!payload.fullName || !payload.email) {
      toast('Full name and email are required', 'error');
      return;
    }

    setSaving(true);
    try {
      await hrCreateEmployeeRecord(payload);
      toast('Employee record created');
      setShowCreate(false);
      resetForm();
      await loadEmployees();
    } catch (error) {
      toast(error.message || 'Failed to create employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    const payload = normalizePayload();
    if (!selected?.employeeID) return;
    if (!payload.fullName || !payload.email) {
      toast('Full name and email are required', 'error');
      return;
    }

    setSaving(true);
    try {
      await hrUpdateEmployeeRecord(selected.employeeID, payload);
      toast('Employee record updated');
      setShowEdit(false);
      resetForm();
      await loadEmployees();
    } catch (error) {
      toast(error.message || 'Failed to update employee', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selected?.employeeID) return;

    setSaving(true);
    try {
      await hrChangeEmployeeRole(selected.employeeID, {
        ...roleChange,
        monthlyIncome: roleChange.monthlyIncome === '' ? null : Number(roleChange.monthlyIncome),
        job:           roleChange.job === ''           ? null : Number(roleChange.job),
        department:    roleChange.department === ''    ? null : Number(roleChange.department),
        team:          roleChange.team === ''          ? null : Number(roleChange.team),
      });
      toast(`${roleChange.action} saved and logged`);
      setShowRoleChange(false);
      await loadEmployees();
      if (selected) {
        await openHistoryModal({ ...selected, ...roleChange, monthlyIncome: roleChange.monthlyIncome });
      }
    } catch (error) {
      toast(error.message || 'Failed to save promotion / demotion', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (employee) => {
    if (!window.confirm(`Archive ${employee.fullName}?`)) return;
    try {
      await hrDeleteEmployeeRecord(employee.employeeID);
      toast('Employee archived');
      await loadEmployees();
    } catch (error) {
      toast(error.message || 'Failed to archive employee', 'error');
    }
  };

  const handleExportEmployees = () => {
    const rows = [
      ['Employee ID', 'Full Name', 'Email', 'Job Title', 'Department', 'Team', 'Role', 'Type', 'Location', 'Status', 'Monthly Income', 'Currency', 'Attrition Risk'],
      ...filteredEmployees.map((employee) => [
        employee.employeeID || '',
        employee.fullName || '',
        employee.email || '',
        employee.jobTitle || '',
        employee.department || '',
        employee.team || '',
        employee.role || '',
        employee.employeeType || '',
        employee.location || '',
        employee.employmentStatus || '',
        employee.monthlyIncome ?? '',
        employee.currency_preference || 'EGP',
        employeeRisks[employee.employeeID]?.riskLevel || '',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadTextFile(`employees-directory-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast(t('Employee directory exported.'));
  };

  const handleExportRosterHealth = () => {
    const rows = [
      ['Employee', 'Department', 'Status', 'Priority', 'Risk Level', 'Flags', 'Recommended Action'],
      ...(rosterHealth?.followUpItems || []).map((item) => [
        item.employeeName || '',
        item.department || '',
        item.employmentStatus || '',
        item.priority || '',
        item.riskLevel || '',
        (item.flags || []).join(' | '),
        item.recommendedAction || '',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadTextFile(`roster-health-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast(t('Roster health exported.'));
  };

  const statusColor = (status) => {
    if (status === 'Active') return 'green';
    if (status === 'On Leave') return 'orange';
    if (status === 'Probation') return 'accent';
    return 'gray';
  };

  return (
    <div className="hr-page-shell" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{t('page.employees.title')}</h2>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>
            {t('page.employees.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn onClick={() => { resetForm(); setShowCreate(true); }}>
            <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {t('Add Employee')}
          </Btn>
        </div>
      </div>


      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spinner /></div>
      ) : employees.length === 0 ? (
        <div className="hr-soft-empty" style={{ textAlign: 'center', padding: '70px 32px' }}>
          <p style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 600, marginBottom: 6 }}>{t('No employee records yet.')}</p>
          <p style={{ fontSize: 12, color: 'var(--gray-300)' }}>{t('Create a new record to get started.')}</p>
        </div>
      ) : (
        <div className="hr-table-card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {['Employee', 'Role', 'Department', 'Type', 'Location', 'Status', ''].map((heading) => (
                  <th key={heading} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid #EAECF0' }}>
                    {t(heading)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const employeeRisk = employeeRisks[employee.employeeID];
                return (
                <tr key={employee.employeeID} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{employee.fullName}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>{employee.email}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 2 }}>{employee.employeeID}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{employee.jobTitle || '—'}</div>
                    <div style={{ marginTop: 6 }}><Badge label={employee.role ? t(`role.${employee.role}`) : t('Unassigned')} color="accent" /></div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13.5 }}>{employee.department || '—'}</td>
                  <td style={{ padding: '16px 20px' }}><Badge label={employee.employeeType ? t(employee.employeeType) : '—'} color="gray" /></td>
                  <td style={{ padding: '16px 20px', fontSize: 13.5 }}>{employee.location || '—'}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                      <Badge label={employee.employmentStatus ? t(employee.employmentStatus) : t('Unknown')} color={statusColor(employee.employmentStatus)} />
                      {employeeRisk && (
                        <Badge label={`${t('Attrition Risk')}: ${t(employeeRisk.riskLevel)}`} color={riskColor(employeeRisk.riskLevel)} />
                      )}
                      <span style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>{t('Salary')}: {formatMoney(employee.monthlyIncome, employee.currency_preference)}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>{t('layout.currency')}: {employee.currency_preference || 'EGP'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Btn size="sm" variant="outline" onClick={() => openSnapshotModal(employee)}>{t('360 View')}</Btn>
                      <Btn size="sm" variant="accent" onClick={() => openRoleChangeModal(employee)}>{t('Promote / Demote')}</Btn>
                      <button
                        type="button"
                        onClick={() => openEdit(employee)}
                        title={t('Edit')}
                        aria-label={t('Edit')}
                        className="emp-icon-btn emp-icon-btn-edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openHistoryModal(employee)}
                        title={t('History')}
                        aria-label={t('History')}
                        className="emp-icon-btn emp-icon-btn-history"
                      >
                        <History size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(employee)}
                        title={t('Archive')}
                        aria-label={t('Archive')}
                        className="emp-icon-btn emp-icon-btn-archive"
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetForm(); }} title={t('Add Employee Record')} maxWidth={720}>
        <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label={t('Full Name *')} value={form.fullName} onChange={setField('fullName')} placeholder="e.g. Salma Mostafa" />
        <Input label={t('Email *')} type="email" value={form.email} onChange={setField('email')} placeholder="employee@company.com" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <JobTitleLevelPicker
          jobs={jobOptions}
          value={form.job}
          onChange={(jobId) => setField('job')({ target: { value: jobId } })}
          t={t}
          selectStyle={selectStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Department — dropdown from Department table */}
        <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
                {t('Department')}
            </label>
            <select value={form.department} onChange={setField('department')} style={selectStyle}>
                <option value="">{t('Select a department')}</option>
                {departmentOptions.map(d => (
                    <option key={d.department_id} value={d.department_id}>{d.name}</option>
                ))}
            </select>
        </div>

        {/* Team — dropdown from Team table */}
        <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
                {t('Team')}
            </label>
            <select value={form.team} onChange={setField('team')} style={selectStyle}>
                <option value="">{t('Select a team')}</option>
                {teamOptions.map(t => (
                    <option key={t.team_id} value={t.team_id}>{t.name}</option>
                ))}
            </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <DatalistInput label={t('Location')} value={form.location} options={locations} onChange={setField('location')} placeholder="Select or type a location" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
          {t('Education Level')}
        </label>
        <select value={form.educationLevel} onChange={setField('educationLevel')} style={selectStyle}>
          <option value="">{t('Select education level')}</option>
          <option value={1}>{t('High School')}</option>
          <option value={2}>{t('Associate Degree')}</option>
          <option value={3}>{t("Bachelor's Degree")}</option>
          <option value={4}>{t("Master's Degree")}</option>
          <option value={5}>{t('PhD')}</option>
        </select>
      </div>
      <Input
        label={t('Number of Dependents')}
        type="number"
        value={form.numberOfDependents}
        onChange={setField('numberOfDependents')}
        placeholder="e.g. 2"
      />
  </div>            
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Role')}</label>
          <select value={form.role} onChange={setField('role')} style={selectStyle}>
            {ROLE_OPTIONS.map(option => <option key={option} value={option}>{t(`role.${option}`)}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Employee Type')}</label>
          <select value={form.employeeType} onChange={setField('employeeType')} style={selectStyle}>
            {TYPE_OPTIONS.map(option => <option key={option} value={option}>{t(option)}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Status')}</label>
          <select value={form.employmentStatus} onChange={setField('employmentStatus')} style={selectStyle}>
            {STATUS_OPTIONS.map(option => <option key={option} value={option}>{t(option)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Input label={t('Birth Date')} type="date" value={form.birth_date} onChange={setField('birth_date')} />
        <Input label={t('Hiring Date')} type="date" value={form.hiring_date} onChange={setField('hiring_date')} />
        <Input label={t('Monthly Income')} type="number" min="0" value={form.monthlyIncome} onChange={setField('monthlyIncome')} placeholder="0" />
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('layout.currency')}</label>
          <select value={form.currency_preference} onChange={setField('currency_preference')} style={selectStyle}>
            {CURRENCY_OPTIONS.map(option => <option key={option} value={option}>{t(`currency.${option}`)}</option>)}
          </select>
        </div>
      </div>
    </div>
    {/* ── Work Schedule & Personal Details ── */}
<div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16, marginTop: 4 }}>
  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 12 }}>
    {t('Work Schedule')}
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
    <Input
      label={t('Default Clock In')}
      type="time"
      value={form.default_clock_in}
      onChange={setField('default_clock_in')}
    />
    <Input
      label={t('Default Clock Out')}
      type="time"
      value={form.default_clock_out}
      onChange={setField('default_clock_out')}
    />
    <Input
      label={t('Contracted Hours / Week')}
      type="number"
      min="0"
      max="168"
      value={form.contracted_hours}
      onChange={setField('contracted_hours')}
      placeholder="e.g. 40"
    />
  </div>
</div>

<div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16, marginTop: 4 }}>
  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 12 }}>
    {t('Personal Details')}
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
    <Input
      label={t('Phone Number')}
      type="tel"
      value={form.phoneNumber}
      onChange={setField('phoneNumber')}
      placeholder="+20 100 000 0000"
    />
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
        {t('Gender')}
      </label>
      <select value={form.gender} onChange={setField('gender')} style={selectStyle}>
        <option value="">{t('Select gender')}</option>
        <option value="Male">{t('Male')}</option>
        <option value="Female">{t('Female')}</option>
      </select>
    </div>
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
        {t('Marital Status')}
      </label>
      <select value={form.maritalStatus} onChange={setField('maritalStatus')} style={selectStyle}>
        <option value="">{t('Select status')}</option>
        <option value="Single">{t('Single')}</option>
        <option value="Married">{t('Married')}</option>
        <option value="Divorced">{t('Divorced')}</option>
      </select>
    </div>
  </div>
  <div style={{ marginTop: 12 }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
      <input
        type="checkbox"
        checked={form.has_disability}
        onChange={(e) => setField('has_disability')({ target: { value: e.target.checked } })}
        style={{ width: 16, height: 16, cursor: 'pointer' }}
      />
      {t('Has Disability')}
    </label>
  </div>
</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => { setShowCreate(false); resetForm(); }} style={{ flex: 1 }}>{t('Cancel')}</Btn>
          <Btn onClick={handleCreate} style={{ flex: 1 }} disabled={saving}>{saving ? t('Saving...') : t('Create Employee')}</Btn>
        </div>
      </Modal>

    <Modal open={showEdit} onClose={() => { setShowEdit(false); resetForm(); }} title={t('Edit Employee Record')} maxWidth={720}>
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label={t('Full Name *')} value={form.fullName} onChange={setField('fullName')} placeholder="e.g. Salma Mostafa" />
          <Input label={t('Email *')} type="email" value={form.email} onChange={setField('email')} placeholder="employee@company.com" />
        </div>

        <div style={{ opacity: 0.55, pointerEvents: 'none' }} aria-disabled="true">
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 10, fontStyle: 'italic' }}>
            {t('Edit job related fields via Promote/Demote.')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <JobTitleLevelPicker
              jobs={jobOptions}
              value={form.job}
              onChange={(jobId) => setField('job')({ target: { value: jobId } })}
              t={t}
              selectStyle={selectStyle}
              disabled
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
                {t('Department')}
              </label>
              <select value={form.department} onChange={setField('department')} style={selectStyle} disabled>
                <option value="">{t('Select a department')}</option>
                {departmentOptions.map(d => (
                  <option key={d.department_id} value={d.department_id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
                {t('Team')}
              </label>
              <select value={form.team} onChange={setField('team')} style={selectStyle} disabled>
                <option value="">{t('Select a team')}</option>
                {teamOptions.map(t => (
                  <option key={t.team_id} value={t.team_id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <DatalistInput label={t('Location')} value={form.location} options={locations} onChange={setField('location')} placeholder="Select or type a location" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
              {t('Education Level')}
            </label>
            <select value={form.educationLevel} onChange={setField('educationLevel')} style={selectStyle}>
              <option value="">{t('Select education level')}</option>
              <option value={1}>{t('High School')}</option>
              <option value={2}>{t('Associate Degree')}</option>
              <option value={3}>{t("Bachelor's Degree")}</option>
              <option value={4}>{t("Master's Degree")}</option>
              <option value={5}>{t('PhD')}</option>
            </select>
          </div>
          <Input
            label={t('Number of Dependents')}
            type="number"
            value={form.numberOfDependents}
            onChange={setField('numberOfDependents')}
            placeholder="e.g. 2"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ opacity: 0.55, pointerEvents: 'none' }} aria-disabled="true">
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Role')}</label>
            <select value={form.role} onChange={setField('role')} style={selectStyle} disabled>
              {ROLE_OPTIONS.map(option => <option key={option} value={option}>{t(`role.${option}`)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Employee Type')}</label>
            <select value={form.employeeType} onChange={setField('employeeType')} style={selectStyle}>
              {TYPE_OPTIONS.map(option => <option key={option} value={option}>{t(option)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Status')}</label>
            <select value={form.employmentStatus} onChange={setField('employmentStatus')} style={selectStyle}>
              {STATUS_OPTIONS.map(option => <option key={option} value={option}>{t(option)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Input label={t('Birth Date')} type="date" value={form.birth_date} onChange={setField('birth_date')} />
          <Input label={t('Hiring Date')} type="date" value={form.hiring_date} onChange={setField('hiring_date')} />
          <Input label={t('Monthly Income')} type="number" min="0" value={form.monthlyIncome} onChange={setField('monthlyIncome')} placeholder="0" />
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('layout.currency')}</label>
            <select value={form.currency_preference} onChange={setField('currency_preference')} style={selectStyle}>
              {CURRENCY_OPTIONS.map(option => <option key={option} value={option}>{t(`currency.${option}`)}</option>)}
            </select>
          </div>
        </div>
      </div>
      {/* ── Work Schedule & Personal Details ── */}
<div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16, marginTop: 4 }}>
  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 12 }}>
    {t('Work Schedule')}
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
    <Input
      label={t('Default Clock In')}
      type="time"
      value={form.default_clock_in}
      onChange={setField('default_clock_in')}
    />
    <Input
      label={t('Default Clock Out')}
      type="time"
      value={form.default_clock_out}
      onChange={setField('default_clock_out')}
    />
    <Input
      label={t('Contracted Hours / Week')}
      type="number"
      min="0"
      max="168"
      value={form.contracted_hours}
      onChange={setField('contracted_hours')}
      placeholder="e.g. 40"
    />
  </div>
</div>

<div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16, marginTop: 4 }}>
  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 12 }}>
    {t('Personal Details')}
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
    <Input
      label={t('Phone Number')}
      type="tel"
      value={form.phoneNumber}
      onChange={setField('phoneNumber')}
      placeholder="+20 100 000 0000"
    />
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
        {t('Gender')}
      </label>
      <select value={form.gender} onChange={setField('gender')} style={selectStyle}>
        <option value="">{t('Select gender')}</option>
        <option value="Male">{t('Male')}</option>
        <option value="Female">{t('Female')}</option>
      </select>
    </div>
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
        {t('Marital Status')}
      </label>
      <select value={form.maritalStatus} onChange={setField('maritalStatus')} style={selectStyle}>
        <option value="">{t('Select status')}</option>
        <option value="Single">{t('Single')}</option>
        <option value="Married">{t('Married')}</option>
        <option value="Divorced">{t('Divorced')}</option>
      </select>
    </div>
  </div>
  <div style={{ marginTop: 12 }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
      <input
        type="checkbox"
        checked={form.has_disability}
        onChange={(e) => setField('has_disability')({ target: { value: e.target.checked } })}
        style={{ width: 16, height: 16, cursor: 'pointer' }}
      />
      {t('Has Disability')}
    </label>
  </div>
</div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Btn variant="ghost" onClick={() => { setShowEdit(false); resetForm(); }} style={{ flex: 1 }}>{t('Cancel')}</Btn>
        <Btn onClick={handleUpdate} style={{ flex: 1 }} disabled={saving}>{saving ? t('Saving...') : t('Save Changes')}</Btn>
      </div>
    </Modal>
      <Modal open={showRoleChange} onClose={() => setShowRoleChange(false)} title={`${t('Promote / Demote')} — ${selected?.fullName || ''}`} maxWidth={760}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Change Type')}</label>
            <select value={roleChange.action} onChange={setRoleChangeField('action')} style={selectStyle}>
              {ACTION_OPTIONS.map(option => <option key={option} value={option}>{t(option)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('New Role')}</label>
            <select value={roleChange.role} onChange={setRoleChangeField('role')} style={selectStyle}>
              {ROLE_OPTIONS.map(option => <option key={option} value={option}>{t(`role.${option}`)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('New Job Title')}</label>
            <select value={roleChange.jobTitle} onChange={handleJobTitleChange} style={selectStyle}>
              <option value="">{t('Select a job')}</option>
              {jobTitleOptions.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('New Job Level')}</label>
            <select value={roleChange.job} onChange={setRoleChangeField('job')} style={selectStyle} disabled={!roleChange.jobTitle}>
              <option value="">{t('Select a level')}</option>
              {jobLevelOptions.map(j => (
                <option key={j.job_id} value={j.job_id}>{j.level || t('Standard')}</option>
              ))}
            </select>
          </div>
          <Input label={t('New Monthly Income')} type="number" min="0" value={roleChange.monthlyIncome} onChange={setRoleChangeField('monthlyIncome')} placeholder="e.g. 18000" />
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('layout.currency')}</label>
            <select value={roleChange.currency_preference} onChange={setRoleChangeField('currency_preference')} style={selectStyle}>
              {CURRENCY_OPTIONS.map(option => <option key={option} value={option}>{t(`currency.${option}`)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Department')}</label>
            <select value={roleChange.department} onChange={setRoleChangeField('department')} style={selectStyle}>
              <option value="">{t('Select a department')}</option>
              {departmentOptions.map(d => (
                <option key={d.department_id} value={d.department_id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{t('Team')}</label>
            <select value={roleChange.team} onChange={setRoleChangeField('team')} style={selectStyle}>
              <option value="">{t('Select a team')}</option>
              {teamOptions.map(tm => (
                <option key={tm.team_id} value={tm.team_id}>{tm.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Textarea label={t('Notes')} value={roleChange.notes} onChange={setRoleChangeField('notes')} placeholder={t('Reason for promotion / demotion')} />

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <Btn variant="ghost" onClick={() => setShowRoleChange(false)} style={{ flex: 1 }}>{t('Cancel')}</Btn>
          <Btn onClick={handleRoleChange} style={{ flex: 1 }} disabled={saving}>{saving ? t('Saving...') : t('Save & Log Change')}</Btn>
        </div>
      </Modal>

      <Modal open={showHistory} onClose={() => setShowHistory(false)} title={`${t('Job History')} — ${selected?.fullName || ''}`} maxWidth={760}>
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
        ) : historyItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--gray-500)' }}>
            {t('No promotion or demotion history has been logged yet.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historyItems.map((item) => (
              <div key={item.historyID} style={{ background: 'var(--gray-50)', borderRadius: 16, padding: '16px 18px', border: '1px solid #EAECF0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge label={t(item.action)} color={item.action === 'Promotion' ? 'green' : item.action === 'Demotion' ? 'orange' : 'accent'} />
                    <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(item.changedAt).toLocaleString()}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t('By')} {item.changedBy || t('HR Manager')}</span>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--gray-700)', lineHeight: 1.6 }}>
                  <div><strong>Title:</strong> {item.previousJobTitle || '—'} → {item.newJobTitle || '—'}</div>
                  <div><strong>Role:</strong> {item.previousRole || '—'} → {item.newRole || '—'}</div>
                  <div><strong>Department:</strong> {item.previousDepartment || '—'} → {item.newDepartment || '—'}</div>
                  <div><strong>Team:</strong> {item.previousTeam || '—'} → {item.newTeam || '—'}</div>
                  <div><strong>Salary:</strong> {formatMoney(item.previousMonthlyIncome, selected?.currency_preference)} → {formatMoney(item.newMonthlyIncome, selected?.currency_preference)}</div>
                </div>
                {item.notes && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--gray-600)' }}>
                    <strong>Notes:</strong> {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={showSnapshot}
        onClose={() => { setShowSnapshot(false); setSnapshot(null); }}
        title={`${t('Employee 360 View')} — ${selected?.fullName || ''}`}
        maxWidth={1080}
      >
        {snapshotLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}><Spinner /></div>
        ) : !snapshot ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--gray-500)' }}>
            {t('No employee snapshot available right now.')}
          </div>
        ) : (
          <>
            <div className="hr-surface-card" style={{ padding: 18, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{snapshot.employee.fullName}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 4 }}>
                    {snapshot.employee.jobTitle || '—'} • {snapshot.employee.department || '—'} • {snapshot.employee.team || '—'}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 4 }}>
                    {snapshot.employee.email} • {snapshot.employee.employeeID}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <Badge label={snapshot.employee.employmentStatus ? t(snapshot.employee.employmentStatus) : t('Unknown')} color={statusColor(snapshot.employee.employmentStatus)} />
                  <Badge label={snapshot.attrition?.riskLevel ? `${t('Attrition Risk')}: ${t(snapshot.attrition.riskLevel)}` : t('Prediction pending')} color={riskColor(snapshot.attrition?.riskLevel)} />
                </div>
              </div>
            </div>

            <div className="hr-stats-grid" style={{ marginBottom: 18 }}>
              {[
                { label: 'Years at Company', value: snapshot.employee.yearsAtCompany ?? '—' },
                { label: 'Average Rating', value: snapshot.summary?.averageReviewRating ?? 0, color: '#7C3AED' },
                { label: 'Attendance Completion', value: `${snapshot.summary?.attendanceRate ?? 0}%`, color: '#2563EB' },
                { label: 'Latest Payroll', value: formatMoney(snapshot.summary?.latestNetPay ?? 0), color: '#10B981' },
              ].map((card) => (
                <div key={card.label} className="hr-stat-card" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>{t(card.label)}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: card.color || 'var(--gray-900)' }}>{card.value}</div>
                </div>
              ))}
            </div>

            <div className="hr-panel-grid" style={{ gridTemplateColumns: '1.1fr .9fr', marginBottom: 18 }}>
              <div className="hr-surface-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 10 }}>{t('Work Snapshot')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><strong>{snapshot.summary?.activeGoals ?? 0}</strong><div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('Active Goals')}</div></div>
                  <div><strong>{snapshot.summary?.openTasks ?? 0}</strong><div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('Open Tasks')}</div></div>
                  <div><strong>{snapshot.summary?.assignedTraining ?? 0}</strong><div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('Assigned Training')}</div></div>
                  <div><strong>{snapshot.summary?.completedTraining ?? 0}</strong><div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('Completed Training')}</div></div>
                </div>
              </div>

              <div className="hr-surface-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 10 }}>{t('AI Retention Outlook')}</div>
                {snapshot.attrition ? (
                  <>
                    <p style={{ margin: '0 0 8px', fontSize: 13.5, color: 'var(--gray-700)', lineHeight: 1.6 }}>{t(snapshot.attrition.explanationSummary || '')}</p>
                    <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--gray-500)', lineHeight: 1.5 }}>{t(snapshot.attrition.feedbackSummary || '')}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      {(snapshot.attrition.riskDrivers || []).slice(0, 3).map((driver, index) => (
                        <Badge key={`${driver.title}-${index}`} label={t(driver.title)} color={riskColor(driver.severity === 'high' ? 'High' : driver.severity === 'medium' ? 'Medium' : 'Low')} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 6 }}>{t('Main Risk Points')}</div>
                    <ul style={{ margin: '0 0 12px', paddingInlineStart: 18, display: 'grid', gap: 6, fontSize: 13, color: 'var(--gray-700)' }}>
                      {(snapshot.attrition.mainRiskPoints || []).slice(0, 3).map((point, index) => <li key={`${point}-${index}`}>{t(point)}</li>)}
                    </ul>
                    <div className="hr-panel-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 6 }}>{t('HR Action Plan')}</div>
                        <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--gray-700)' }}>
                          {(snapshot.attrition.hrActionPlan || snapshot.attrition.recommendedActions || []).slice(0, 3).map((action, index) => <li key={`hr-${action}-${index}`}>{t(action)}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 6 }}>{t('Admin Action Plan')}</div>
                        <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--gray-700)' }}>
                          {(snapshot.attrition.adminActionPlan || []).slice(0, 3).map((action, index) => <li key={`admin-${action}-${index}`}>{t(action)}</li>)}
                        </ul>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--gray-500)' }}>{t('No attrition prediction has been run for this employee yet.')}</p>
                )}
              </div>
            </div>

            <div className="hr-panel-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 18 }}>
              <div className="hr-surface-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 10 }}>{t('People Operations')}</div>
                <div style={{ display: 'grid', gap: 8, fontSize: 13.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('Pending Leave')}</span><strong>{snapshot.summary?.pendingLeave ?? 0}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('Open Tickets')}</span><strong>{snapshot.summary?.openTickets ?? 0}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('Pending Documents')}</span><strong>{snapshot.summary?.pendingDocuments ?? 0}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('Pending Expenses')}</span><strong>{snapshot.summary?.pendingExpenses ?? 0}</strong></div>
                </div>
              </div>

              <div className="hr-surface-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 10 }}>{t('Recent Goals')}</div>
                {(snapshot.goals || []).length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {snapshot.goals.slice(0, 3).map((goal) => (
                      <div key={goal.goalID} style={{ paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{goal.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t(goal.status || 'In Progress')} • {goal.progress ?? 0}%</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('No recent goals found.')}</div>}
              </div>

              <div className="hr-surface-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 10 }}>{t('Recent Tasks')}</div>
                {(snapshot.tasks || []).length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {snapshot.tasks.slice(0, 3).map((task) => (
                      <div key={task.taskID} style={{ paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{task.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t(task.status || 'To Do')} • {task.progress ?? 0}%</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('No recent tasks found.')}</div>}
              </div>
            </div>

            <div className="hr-panel-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 18 }}>
              <div className="hr-surface-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 10 }}>{t('Recent Reviews')}</div>
                {(snapshot.reviews || []).length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {snapshot.reviews.slice(0, 3).map((review) => (
                      <div key={review.reviewID} style={{ paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{review.reviewPeriod}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{t(review.status || 'Submitted')} • {review.overallRating}/5</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('No recent reviews found.')}</div>}
              </div>

              <div className="hr-surface-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 10 }}>{t('Payroll Snapshot')}</div>
                {(snapshot.payroll || []).length ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {snapshot.payroll.slice(0, 3).map((record) => (
                      <div key={record.payrollID} style={{ paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{record.payPeriod}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{formatMoney(record.netPay)} • {t(record.status || 'Draft')}</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('No payroll records found yet.')}</div>}
              </div>
            </div>

            <div className="hr-surface-card" style={{ padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 10 }}>{t('History Timeline')}</div>
              {(snapshot.history || []).length ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {snapshot.history.slice(0, 4).map((item) => (
                    <div key={item.historyID} style={{ paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <strong>{t(item.action)}</strong>
                        <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{formatDateTime(item.changedAt)}</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--gray-600)', marginTop: 4 }}>{item.previousJobTitle || '—'} → {item.newJobTitle || '—'}</div>
                      {item.notes ? <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 4 }}>{item.notes}</div> : null}
                    </div>
                  ))}
                </div>
              ) : <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{t('No history entries logged yet.')}</div>}
            </div>
          </>
        )}
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .emp-icon-btn {
          width: 32px; height: 32px; border-radius: 8px;
          display: inline-grid; place-items: center;
          background: #fff; border: 1.5px solid #E5E7EB;
          color: #475569; cursor: pointer; transition: all 0.15s ease;
          padding: 0;
        }
        .emp-icon-btn:hover { transform: translateY(-1px); }
        .emp-icon-btn-edit:hover    { color: #2563EB; border-color: #BFDBFE; background: #EFF6FF; }
        .emp-icon-btn-history:hover { color: #7C3AED; border-color: #DDD6FE; background: #F5F3FF; }
        .emp-icon-btn-archive:hover { color: #B42318; border-color: #FECACA; background: #FEF2F2; }
      `}} />
    </div>
  );
}
