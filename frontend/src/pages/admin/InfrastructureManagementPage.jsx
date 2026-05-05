import { useEffect, useState } from 'react';
import {
  Spinner,
  Modal,
  Btn,
  Input,
  useToast,
} from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../api/index.js';

const TABS = ['departments', 'teams', 'jobs', 'leave-types'];

const EMPTY_FORMS = {
  departments: { name: '' },
  teams: { name: '' },
  jobs: { title: '', level: '', base_salary: '' },
  'leave-types': { name: '', max_days_per_year: '' },
};

const TAB_LABELS = {
  departments: 'Departments',
  teams: 'Teams',
  jobs: 'Jobs',
  'leave-types': 'Leave Types',
};

const FIELD_LABELS = {
  departments: { name: 'Department Name' },
  teams: { name: 'Team Name' },
  jobs: { title: 'Job Title', level: 'Level', base_salary: 'Base Salary' },
  'leave-types': { name: 'Leave Type Name', max_days_per_year: 'Max Days Per Year' },
};

const FIELD_TYPES = {
  departments: { name: 'text' },
  teams: { name: 'text' },
  jobs: { title: 'text', level: 'select', base_salary: 'number' },
  'leave-types': { name: 'text', max_days_per_year: 'number' },
};

const FIELD_CHOICES = {
  jobs: { level: ['Entry', 'Mid', 'Senior'] },
};

const TAB_ICONS = {
  departments: '🏢',
  teams: '👥',
  jobs: '💼',
  'leave-types': '📅',
};

const TAB_COLORS = {
  departments: 'from-blue-500 to-blue-600',
  teams: 'from-green-500 to-green-600',
  jobs: 'from-purple-500 to-purple-600',
  'leave-types': 'from-orange-500 to-orange-600',
};

// FIX 1: Explicit ID key map — replaces the broken .slice(0,-1) derivation
// "leave-types".slice(0,-1) → "leave-type" → "leave-type_id" which doesn't match
// the serializer's "leave_type_id". Same issue would arise for any hyphenated tab.
const ID_KEY_MAP = {
  departments: 'department_id',
  teams: 'team_id',
  jobs: 'job_id',
  'leave-types': 'leave_type_id',
};

function useAdminData(tab) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/employee_management/${tab}/`);
      setData(Array.isArray(response) ? response : response.results || []);
    } catch (error) {
      console.error(`Error fetching ${tab}:`, error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  return { data, setData, loading, fetchData };
}

function AdminManagementPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('departments');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORMS[activeTab]);
  const [showForm, setShowForm] = useState(false);

  const { data, setData, loading, fetchData } = useAdminData(activeTab);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setEditingId(null);
    setFormData(EMPTY_FORMS[tab]);
    setShowForm(false);
  };

  const handleInputChange = (field, value) => {
    const fieldType = FIELD_TYPES[activeTab][field];
    let processedValue = value;

    if (fieldType === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }

    setFormData({ ...formData, [field]: processedValue });
  };

  // FIX 2: handleSubmit now works both as a form onSubmit handler AND
  // as a plain onClick handler (no e.preventDefault crash when e is a MouseEvent).
  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setSaving(true);

    try {
      const endpoint = `/employee_management/${activeTab}/${editingId ? `${editingId}/` : ''}`;

      if (editingId) {
        await api.put(endpoint, formData);
      } else {
        await api.post(`/employee_management/${activeTab}/`, formData);
      }

      const message = editingId
        ? `${TAB_LABELS[activeTab]} updated successfully`
        : `${TAB_LABELS[activeTab]} created successfully`;
      toast.success(message);

      setFormData(EMPTY_FORMS[activeTab]);
      setEditingId(null);
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || `Failed to save ${TAB_LABELS[activeTab]}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${TAB_LABELS[activeTab]}?`)) return;

    try {
      await api.delete(`/employee_management/${activeTab}/${id}/`);
      toast.success(`${TAB_LABELS[activeTab]} deleted successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.message || `Failed to delete ${TAB_LABELS[activeTab]}`);
    }
  };

  const handleEdit = (item) => {
    // FIX 3: Use ID_KEY_MAP instead of the broken string derivation
    const idKey = ID_KEY_MAP[activeTab];
    const itemId = item[idKey] || item.id;

    setEditingId(itemId);
    setFormData(
      Object.keys(EMPTY_FORMS[activeTab]).reduce((acc, key) => {
        acc[key] = item[key] ?? '';
        return acc;
      }, {})
    );
    setShowForm(true);
  };

  const getItemId = (item) => {
    const idKey = ID_KEY_MAP[activeTab];
    return item[idKey] || item.id;
  };

  if (!user || user.role !== 'Admin') {
    return (
      <div className="hr-page-shell">
        <div className="hr-surface-card" style={{ padding: 24, color: 'var(--danger, #B91C1C)' }}>
          {t("You don't have permission to access this page.")}
        </div>
      </div>
    );
  }

  const singularLabel = TAB_LABELS[activeTab].slice(0, -1);
  const openCreateForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORMS[activeTab]);
    setShowForm(true);
  };

  return (
    <div className="hr-page-shell">
      <div className="hr-page-header is-split">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{t('Infrastructure Management')}</h2>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)' }}>
            {t('Manage organizational structure and policies — departments, teams, jobs, and leave types.')}
          </p>
        </div>
        <Btn variant="primary" onClick={openCreateForm}>
          + {t('Add')} {singularLabel}
        </Btn>
      </div>

      {/* Tabs */}
      <div className="hr-surface-card" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TABS.map((tab) => (
            <Btn
              key={tab}
              onClick={() => handleTabChange(tab)}
              variant={activeTab === tab ? 'primary' : 'ghost'}
              size="sm"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden>{TAB_ICONS[tab]}</span>
                <span>{TAB_LABELS[tab]}</span>
                {activeTab === tab && !loading && (
                  <span style={{ fontSize: 12, opacity: 0.75 }}>({data.length})</span>
                )}
              </span>
            </Btn>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="hr-surface-card" style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <div className="hr-soft-empty" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.7 }}>{TAB_ICONS[activeTab]}</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
            {t('No')} {TAB_LABELS[activeTab]} {t('found')}
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)', maxWidth: 420, margin: '0 auto 18px' }}>
            {t('Get started by creating your first')} {singularLabel.toLowerCase()}.
          </p>
          <Btn variant="primary" onClick={openCreateForm}>
            {t('Create first')} {singularLabel}
          </Btn>
        </div>
      ) : (
        <div className="hr-table-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>{TAB_LABELS[activeTab]}</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#F9FAFB' }}>
                <tr>
                  <th style={thStyle}>{t('Name')}</th>
                  {activeTab === 'jobs' && (
                    <>
                      <th style={thStyle}>{t('Level')}</th>
                      <th style={thStyle}>{t('Base Salary')}</th>
                    </>
                  )}
                  {activeTab === 'leave-types' && <th style={thStyle}>{t('Max Days/Year')}</th>}
                  <th style={{ ...thStyle, textAlign: 'right' }}>{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => {
                  const itemId = getItemId(item);

                  return (
                    <tr key={itemId} style={{ borderTop: '1px solid #F3F4F6' }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{item.name || item.title}</td>
                      {activeTab === 'jobs' && (
                        <>
                          <td style={tdStyle}>
                            <span style={pillStyle('blue')}>{t('Level')} {item.level}</span>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'ui-monospace, monospace', color: '#0F766E' }}>
                            EGP {item.base_salary?.toLocaleString()}
                          </td>
                        </>
                      )}
                      {activeTab === 'leave-types' && <td style={tdStyle}>{item.max_days_per_year} {t('days')}</td>}
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <Btn size="sm" variant="ghost" onClick={() => handleEdit(item)}>{t('Edit')}</Btn>
                          <Btn size="sm" variant="danger" onClick={() => handleDelete(itemId)}>{t('Delete')}</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {/* Submit is driven by the Save button's onClick → handleSubmit, not form
          submission, to avoid the modal intercepting/swallowing the submit. */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={`${editingId ? t('Edit') : t('Add')} ${singularLabel}`}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          {Object.keys(EMPTY_FORMS[activeTab]).map((field) => {
            const type = FIELD_TYPES[activeTab][field] || 'text';
            const label = FIELD_LABELS[activeTab][field];
            const choices = FIELD_CHOICES[activeTab]?.[field];

            return (
              <div key={field} style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700, #374151)' }}>{label}</label>
                {type === 'select' && choices ? (
                  <select
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: 8,
                      fontSize: 14,
                      background: 'white',
                      color: 'var(--gray-900, #111827)',
                      outline: 'none',
                    }}
                  >
                    <option value="" disabled>{t('Select...')}</option>
                    {choices.map((choice) => (
                      <option key={choice} value={choice}>{choice}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={type}
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    step={type === 'number' && field.includes('salary') ? '0.01' : '1'}
                    required
                  />
                )}
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
            <Btn type="button" onClick={handleSubmit} disabled={saving} variant="primary" style={{ flex: 1 }}>
              {saving ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Spinner />
                  <span>{t('Saving...')}</span>
                </span>
              ) : (
                <span>{editingId ? t('Update') : t('Create')}</span>
              )}
            </Btn>
            <Btn type="button" onClick={() => setShowForm(false)} variant="ghost" style={{ flex: 1 }}>
              {t('Cancel')}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const thStyle = {
  padding: '14px 20px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--gray-700, #374151)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle = {
  padding: '14px 20px',
  fontSize: 13.5,
  color: 'var(--gray-700, #374151)',
};

function pillStyle(tone) {
  const palette = {
    blue: { bg: '#DBEAFE', fg: '#1E40AF' },
  };
  const c = palette[tone] || palette.blue;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 600,
    background: c.bg,
    color: c.fg,
  };
}

export default AdminManagementPage;
