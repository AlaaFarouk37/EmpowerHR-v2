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
  teams: { name: '', department: '' },
  jobs: { title: '', level: 1, base_salary: '' },
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
  teams: { name: 'Team Name', department: 'Department' },
  jobs: { title: 'Job Title', level: 'Level', base_salary: 'Base Salary' },
  'leave-types': { name: 'Leave Type Name', max_days_per_year: 'Max Days Per Year' },
};

const FIELD_TYPES = {
  departments: { name: 'text' },
  teams: { name: 'text', department: 'select' },
  jobs: { title: 'text', level: 'number', base_salary: 'number' },
  'leave-types': { name: 'text', max_days_per_year: 'number' },
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
  const [departments, setDepartments] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/employee_management/${tab}/`);
      setData(Array.isArray(response) ? response : response.results || []);

      if (tab === 'teams') {
        const deptResponse = await api.get('/employee_management/departments/');
        setDepartments(Array.isArray(deptResponse) ? deptResponse : deptResponse.results || []);
      }
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

  return { data, setData, loading, fetchData, departments };
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

  const { data, setData, loading, fetchData, departments } = useAdminData(activeTab);

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
    return <div className="p-8 text-red-600">You don't have permission to access this page.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Infrastructure Management</h1>
          <p className="text-gray-600">Manage organizational structure and policies</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            {TABS.map((tab) => (
              <Btn
                key={tab}
                onClick={() => handleTabChange(tab)}
                variant={activeTab === tab ? 'primary' : 'ghost'}
                className={`group relative overflow-hidden transition-all duration-300 ${
                  activeTab === tab ? 'scale-105 shadow-lg' : 'hover:scale-105'
                }`}
                style={{
                  padding: '16px 24px',
                  minWidth: '140px',
                  position: 'relative',
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{TAB_ICONS[tab]}</span>
                  <span className="font-semibold">{TAB_LABELS[tab]}</span>
                  {/* Only show count on the active tab to avoid showing stale
                      counts from a previous tab while the new tab's data is loading */}
                  {activeTab === tab && !loading && (
                    <span className="text-sm opacity-75">({data.length})</span>
                  )}
                </div>
                {activeTab === tab && (
                  <div className="absolute inset-0 bg-white opacity-10 rounded-xl"></div>
                )}
              </Btn>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-6">
          <Btn
            onClick={() => {
              setEditingId(null);
              setFormData(EMPTY_FORMS[activeTab]);
              setShowForm(true);
            }}
            variant="primary"
          >
            <span className="flex items-center space-x-2">
              <span>+</span>
              <span>Add {TAB_LABELS[activeTab].slice(0, -1)}</span>
            </span>
          </Btn>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl shadow-xl p-16 text-center border border-gray-100">
            <div className="text-8xl mb-6 opacity-75">{TAB_ICONS[activeTab]}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No {TAB_LABELS[activeTab]} Found</h3>
            <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">Get started by creating your first {TAB_LABELS[activeTab].slice(0, -1).toLowerCase()}. All your organizational data will be displayed in this beautifully formatted table.</p>
            <Btn
              onClick={() => {
                setEditingId(null);
                setFormData(EMPTY_FORMS[activeTab]);
                setShowForm(true);
              }}
              variant="primary"
              className="px-8 py-4 text-lg"
            >
              Create First {TAB_LABELS[activeTab].slice(0, -1)}
            </Btn>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50">
                  <tr className="border-b border-gray-200">
                    <th className="px-8 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider rounded-tl-2xl">Name</th>
                    {activeTab === 'teams' && <th className="px-8 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">Department</th>}
                    {activeTab === 'jobs' && (
                      <>
                        <th className="px-8 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">Level</th>
                        <th className="px-8 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">Base Salary</th>
                        <th className="px-8 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">Benchmark Salary</th>
                      </>
                    )}
                    {activeTab === 'leave-types' && <th className="px-8 py-5 text-left text-sm font-bold text-gray-800 uppercase tracking-wider">Max Days/Year</th>}
                    <th className="px-8 py-5 text-right text-sm font-bold text-gray-800 uppercase tracking-wider rounded-tr-2xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((item, index) => {
                    // FIX 3 (continued): use getItemId helper everywhere in the table too
                    const itemId = getItemId(item);

                    return (
                      <tr key={itemId} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                        <td className="px-8 py-6 text-sm font-medium text-gray-900 group-hover:text-gray-800">{item.name || item.title}</td>
                        {activeTab === 'teams' && <td className="px-8 py-6 text-sm text-gray-600 group-hover:text-gray-700">{item.department_name}</td>}
                        {activeTab === 'jobs' && (
                          <>
                            <td className="px-8 py-6 text-sm text-gray-600 group-hover:text-gray-700">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Level {item.level}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-sm text-gray-600 font-mono font-semibold text-green-700 group-hover:text-green-800">
                              EGP {item.base_salary?.toLocaleString()}
                            </td>
                            <td className="px-8 py-6 text-sm text-gray-600 font-mono font-semibold text-purple-700 group-hover:text-purple-800">
                              EGP {item.benchmark_salary?.toLocaleString()}
                            </td>
                          </>
                        )}
                        {activeTab === 'leave-types' && <td className="px-8 py-6 text-sm text-gray-600 group-hover:text-gray-700">{item.max_days_per_year} days</td>}
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end space-x-3">
                            <Btn
                              onClick={() => handleEdit(item)}
                              variant="ghost"
                              size="sm"
                              className="opacity-70 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              Edit
                            </Btn>
                            <Btn
                              onClick={() => handleDelete(itemId)}
                              variant="danger"
                              size="sm"
                              className="opacity-70 group-hover:opacity-100 transition-opacity duration-200"
                            >
                              Delete
                            </Btn>
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
        {/* FIX 2 (continued): Removed <form> wrapper. Submit is now driven by the
            Save button's onClick → handleSubmit, not form submission. This avoids
            the modal intercepting or swallowing the submit event entirely. */}
        <Modal
          open={showForm}
          onClose={() => setShowForm(false)}
          title={`${editingId ? 'Edit' : 'Add'} ${TAB_LABELS[activeTab].slice(0, -1)}`}
        >
          <div className="space-y-6">
            {Object.keys(EMPTY_FORMS[activeTab]).map((field) => {
              const type = FIELD_TYPES[activeTab][field] || 'text';
              const label = FIELD_LABELS[activeTab][field];

              return (
                <div key={field} className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">{label}</label>
                  {type === 'select' ? (
                    <select
                      value={formData[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                      required
                    >
                      <option value="">Select {label}</option>
                      {departments.map((dept) => (
                        <option key={dept.department_id} value={dept.department_id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={type}
                      value={formData[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      step={type === 'number' && (field.includes('salary') || field.includes('level')) ? '0.01' : '1'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  )}
                </div>
              );
            })}

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <Btn
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                variant="primary"
                className="flex-1"
              >
                {saving ? (
                  <span className="flex items-center space-x-2">
                    <Spinner />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span>{editingId ? 'Update' : 'Create'}</span>
                )}
              </Btn>
              <Btn
                type="button"
                onClick={() => setShowForm(false)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Btn>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default AdminManagementPage;
