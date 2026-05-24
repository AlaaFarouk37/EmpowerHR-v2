import { useCallback, useEffect, useMemo, useState } from 'react';
import { hrGetAtRiskEmployees, hrGetSuccessors } from '../../api/index.js';
import { Badge, Btn, Input, Spinner, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';

const DEFAULT_THRESHOLD = 70;
const DEFAULT_MIN_ATS = 70;
const DEFAULT_RECENCY_DAYS = 365;
const DEFAULT_LIMIT = 10;
const REVIEW_STAGE_OPTIONS = ['Applied', 'Shortlisted', 'Interview', 'Rejected'];

const RISK_COLOR = (level) => {
  if (level === 'High') return 'red';
  if (level === 'Medium') return 'orange';
  return 'green';
};

const STAGE_COLOR = (stage) => {
  if (stage === 'Interview') return 'accent';
  if (stage === 'Shortlisted') return 'yellow';
  if (stage === 'Rejected') return 'red';
  return 'gray';
};

const FIT_COLOR = (score) => {
  if (score >= 85) return 'green';
  if (score >= 70) return 'accent';
  if (score >= 50) return 'yellow';
  return 'gray';
};

const formatScore = (value) => (value === null || value === undefined ? '—' : Number(value).toFixed(1));

const defaultFiltersFor = (employee) => ({
  job_title: employee?.jobTitle || '',
  level: '',
  min_ats_score: DEFAULT_MIN_ATS,
  recency_days: DEFAULT_RECENCY_DAYS,
  recency_disabled: false,
  review_stages: [],
  limit: DEFAULT_LIMIT,
});

export function HRSuccessionPage() {
  const toast = useToast();
  const { t, language } = useLanguage();

  const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_THRESHOLD));
  const [appliedThreshold, setAppliedThreshold] = useState(DEFAULT_THRESHOLD);
  const [atRisk, setAtRisk] = useState([]);
  const [loadingAtRisk, setLoadingAtRisk] = useState(true);

  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
  // { [employeeID]: { filters, draftFilters, results, filtersApplied, loading, error } }
  const [successorsState, setSuccessorsState] = useState({});

  const loadAtRisk = useCallback(async (threshold) => {
    setLoadingAtRisk(true);
    try {
      const data = await hrGetAtRiskEmployees(threshold);
      setAtRisk(Array.isArray(data?.results) ? data.results : []);
    } catch (error) {
      toast(error.message || 'Failed to load at-risk employees', 'error');
      setAtRisk([]);
    } finally {
      setLoadingAtRisk(false);
    }
  }, [toast]);

  useEffect(() => { loadAtRisk(appliedThreshold); }, [loadAtRisk, appliedThreshold]);

  const handleApplyThreshold = () => {
    const parsed = Number(thresholdInput);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast('Threshold must be a number between 0 and 100.', 'error');
      return;
    }
    setAppliedThreshold(parsed);
  };

  const loadSuccessors = async (employee, filters) => {
    setSuccessorsState((prev) => ({
      ...prev,
      [employee.employeeID]: {
        ...(prev[employee.employeeID] || {}),
        filters,
        draftFilters: filters,
        loading: true,
        error: null,
      },
    }));
    try {
      const payload = {
        job_title: filters.job_title,
        level: filters.level,
        min_ats_score: filters.min_ats_score,
        recency_days: filters.recency_days,
        recency_disabled: filters.recency_disabled ? 'true' : '',
        review_stages: (filters.review_stages || []).join(','),
        limit: filters.limit,
      };
      const data = await hrGetSuccessors(employee.employeeID, payload);
      setSuccessorsState((prev) => ({
        ...prev,
        [employee.employeeID]: {
          filters,
          draftFilters: filters,
          results: data?.results || [],
          filtersApplied: data?.filters_applied || {},
          loading: false,
          error: null,
        },
      }));
    } catch (error) {
      toast(error.message || 'Failed to load successors', 'error');
      setSuccessorsState((prev) => ({
        ...prev,
        [employee.employeeID]: {
          ...(prev[employee.employeeID] || {}),
          loading: false,
          error: error.message || 'Failed to load successors',
        },
      }));
    }
  };

  const handleFindSuccessors = (employee) => {
    if (expandedEmployeeId === employee.employeeID) {
      setExpandedEmployeeId(null);
      return;
    }
    setExpandedEmployeeId(employee.employeeID);
    const cached = successorsState[employee.employeeID];
    if (!cached || !cached.results) {
      loadSuccessors(employee, defaultFiltersFor(employee));
    }
  };

  const updateDraftFilter = (employeeId, key, value) => {
    setSuccessorsState((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        draftFilters: {
          ...(prev[employeeId]?.draftFilters || defaultFiltersFor({ employeeID: employeeId })),
          [key]: value,
        },
      },
    }));
  };

  const toggleReviewStage = (employeeId, stage) => {
    setSuccessorsState((prev) => {
      const draft = prev[employeeId]?.draftFilters || defaultFiltersFor({ employeeID: employeeId });
      const stages = draft.review_stages || [];
      const next = stages.includes(stage) ? stages.filter((s) => s !== stage) : [...stages, stage];
      return {
        ...prev,
        [employeeId]: {
          ...(prev[employeeId] || {}),
          draftFilters: { ...draft, review_stages: next },
        },
      };
    });
  };

  const applyDraftFilters = (employee) => {
    const draft = successorsState[employee.employeeID]?.draftFilters || defaultFiltersFor(employee);
    loadSuccessors(employee, draft);
  };

  const resetFilters = (employee) => {
    loadSuccessors(employee, defaultFiltersFor(employee));
  };

  const summary = useMemo(() => {
    const high = atRisk.filter((row) => row.riskLevel === 'High').length;
    const medium = atRisk.filter((row) => row.riskLevel === 'Medium').length;
    return { total: atRisk.length, high, medium };
  }, [atRisk]);

  return (
    <div className="hr-page-shell" style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 80px' }}>
      <div className="hr-page-header is-split" style={{ marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
            {language === 'ar' ? 'تخطيط الإحلال الوظيفي' : 'Succession Planning'}
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>
            {language === 'ar'
              ? 'استعرض الموظفين المعرضين لخطر الاحتفاظ وحدد أفضل المرشحين البديلين من مخزون المواهب الحالي.'
              : 'Surface employees at risk of leaving and rank potential successors from the existing scored talent pool.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'At-Risk Employees', value: summary.total, accent: '#111827' },
          { label: 'High Risk', value: summary.high, accent: '#E8321A' },
          { label: 'Medium Risk', value: summary.medium, accent: '#F59E0B' },
          { label: 'Risk Threshold', value: `${appliedThreshold}+`, accent: '#2563EB' },
        ].map((card) => (
          <div key={card.label} className="hr-stat-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>{t(card.label)}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: card.accent }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="hr-surface-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 220 }}>
            <Input
              label={t('Risk threshold (0–100)')}
              type="number"
              min={0}
              max={100}
              step={1}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
            />
          </div>
          <Btn onClick={handleApplyThreshold}>{t('Apply')}</Btn>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginLeft: 'auto' }}>
            {t('Showing employees with latest attrition risk at or above this score, ranked by risk descending.')}
          </div>
        </div>
      </div>

      <div className="hr-table-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('At-Risk Employees')}</h3>
        </div>

        {loadingAtRisk ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
        ) : atRisk.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--gray-500)' }}>
            {t('No employees currently above this risk threshold.')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {['Employee', 'Role', 'Department', 'Risk', 'Actions'].map((head) => (
                    <th key={head} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: 'var(--gray-500)' }}>
                      {t(head)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {atRisk.map((row) => {
                  const isExpanded = expandedEmployeeId === row.employeeID;
                  const state = successorsState[row.employeeID] || {};
                  const draft = state.draftFilters || defaultFiltersFor(row);
                  return (
                    <ExpandableRow
                      key={row.employeeID}
                      row={row}
                      isExpanded={isExpanded}
                      onToggle={() => handleFindSuccessors(row)}
                      state={state}
                      draft={draft}
                      onDraftChange={(key, value) => updateDraftFilter(row.employeeID, key, value)}
                      onToggleStage={(stage) => toggleReviewStage(row.employeeID, stage)}
                      onApply={() => applyDraftFilters(row)}
                      onReset={() => resetFilters(row)}
                      t={t}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpandableRow({ row, isExpanded, onToggle, state, draft, onDraftChange, onToggleStage, onApply, onReset, t }) {
  return (
    <>
      <tr>
        <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
          <div style={{ fontWeight: 700 }}>{row.fullName}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{row.employeeID}</div>
        </td>
        <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>{row.jobTitle || '—'}</td>
        <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
          <div>{row.department || '—'}</div>
          {row.team ? <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{row.team}</div> : null}
        </td>
        <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
          <Badge label={`${row.riskScorePct}% · ${t(row.riskLevel)}`} color={RISK_COLOR(row.riskLevel)} />
        </td>
        <td style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
          <Btn size="sm" variant={isExpanded ? 'outline' : 'primary'} onClick={onToggle}>
            {isExpanded ? t('Hide successors') : t('Find successors')}
          </Btn>
        </td>
      </tr>
      {isExpanded ? (
        <tr>
          <td colSpan={5} style={{ background: '#F8FAFC', padding: 20, borderTop: '1px solid #F3F4F6' }}>
            <SuccessorsPanel
              row={row}
              state={state}
              draft={draft}
              onDraftChange={onDraftChange}
              onToggleStage={onToggleStage}
              onApply={onApply}
              onReset={onReset}
              t={t}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function SuccessorsPanel({ row, state, draft, onDraftChange, onToggleStage, onApply, onReset, t }) {
  const applied = state.filtersApplied || {};
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="hr-surface-card" style={{ padding: 16, background: '#fff' }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 12 }}>
          {t('Filters')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          <Input
            label={t('Job title')}
            value={draft.job_title || ''}
            onChange={(e) => onDraftChange('job_title', e.target.value)}
            placeholder={row.jobTitle || ''}
          />
          <Input
            label={t('Level (optional)')}
            value={draft.level || ''}
            onChange={(e) => onDraftChange('level', e.target.value)}
            placeholder={t('e.g. Senior')}
          />
          <Input
            label={t('Minimum ATS score')}
            type="number"
            min={0}
            max={100}
            value={draft.min_ats_score ?? ''}
            onChange={(e) => onDraftChange('min_ats_score', e.target.value)}
          />
          <Input
            label={t('Recency (days)')}
            type="number"
            min={1}
            value={draft.recency_disabled ? '' : (draft.recency_days ?? '')}
            disabled={draft.recency_disabled}
            onChange={(e) => onDraftChange('recency_days', e.target.value)}
          />
          <Input
            label={t('Limit')}
            type="number"
            min={1}
            max={100}
            value={draft.limit ?? DEFAULT_LIMIT}
            onChange={(e) => onDraftChange('limit', e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>
            <input
              type="checkbox"
              checked={!!draft.recency_disabled}
              onChange={(e) => onDraftChange('recency_disabled', e.target.checked)}
            />
            {t('Include older candidates (disable recency filter)')}
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', marginRight: 4 }}>
            {t('Review stages')}:
          </span>
          {REVIEW_STAGE_OPTIONS.map((stage) => {
            const active = (draft.review_stages || []).includes(stage);
            return (
              <button
                type="button"
                key={stage}
                onClick={() => onToggleStage(stage)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: active ? '1px solid #1E40AF' : '1px solid var(--gray-200)',
                  background: active ? '#DBEAFE' : '#fff',
                  color: active ? '#1E40AF' : 'var(--gray-700)',
                }}
              >
                {t(stage)}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn size="sm" onClick={onApply}>{t('Apply filters')}</Btn>
          <Btn size="sm" variant="outline" onClick={onReset}>{t('Reset to defaults')}</Btn>
        </div>
      </div>

      {state.loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}><Spinner /></div>
      ) : state.error ? (
        <div style={{ padding: 16, color: 'var(--red)', background: 'var(--red-light)', borderRadius: 12 }}>
          {state.error}
        </div>
      ) : (
        <SuccessorsTable results={state.results || []} applied={applied} t={t} />
      )}
    </div>
  );
}

function SuccessorsTable({ results, applied, t }) {
  if (!results.length) {
    return (
      <div style={{ padding: 16, color: 'var(--gray-500)', background: '#fff', borderRadius: 12 }}>
        {t('No successor candidates match these filters.')}
      </div>
    );
  }

  return (
    <div className="hr-table-card" style={{ background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #F3F4F6', fontSize: 12, color: 'var(--gray-500)' }}>
        {t('Showing')} {results.length} {t('candidates')} · {t('min ATS')}: {applied.min_ats_score ?? '—'} ·{' '}
        {applied.recency_disabled ? t('recency disabled') : `${applied.recency_days ?? '—'} ${t('days recency')}`}
        {applied.level ? ` · ${t('level')}: ${applied.level}` : ''}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              {['Candidate', 'ATS', 'Skills', 'Experience', 'Education', 'Semantic', 'Applied for', 'Stage', 'Submitted', 'Resume'].map((head) => (
                <th key={head} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, color: 'var(--gray-500)' }}>
                  {t(head)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.submission_id}>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ fontWeight: 700 }}>{row.candidate_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{row.candidate_email || row.tracking_code}</div>
                </td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>
                  <Badge label={formatScore(row.ats_score)} color={FIT_COLOR(row.ats_score || 0)} />
                </td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>{formatScore(row.skills_score)}</td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>{formatScore(row.experience_score)}</td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>{formatScore(row.education_score)}</td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>{formatScore(row.semantic_score)}</td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>{row.job?.title || '—'}</td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>
                  <Badge label={t(row.review_stage)} color={STAGE_COLOR(row.review_stage)} />
                </td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6', fontSize: 12, color: 'var(--gray-700)' }}>
                  {row.freshness_label || '—'}
                </td>
                <td style={{ padding: '12px 14px', borderTop: '1px solid #F3F4F6' }}>
                  {row.resume_file_url ? (
                    <a href={row.resume_file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>
                      {t('View')}
                    </a>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
