import React, { useEffect, useState } from 'react';
import { adminGetPermissions, adminUpdateRolePermissions } from '../../../api';
import { Badge, Btn, useToast, Skeleton } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function OrgGovernanceMatrix() {
  const { t } = useLanguage();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [matrix, setMatrix] = useState({});
  const [roles, setRoles] = useState(['TeamMember', 'TeamLeader', 'HRManager', 'Candidate']);
  const [selectedRole, setSelectedRole] = useState('TeamMember');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPermissions = async () => {
      setLoading(true);
      try {
        const data = await adminGetPermissions();
        setMatrix(data || {});
      } catch (error) {
        toast(t('Failed to load governance matrix'), 'error');
      } finally {
        setLoading(false);
      }
    };
    loadPermissions();
  }, []);

  const handleTogglePermission = (permission) => {
    const currentPermissions = matrix[selectedRole] || [];
    const nextPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setMatrix(prev => ({
      ...prev,
      [selectedRole]: nextPermissions
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminUpdateRolePermissions(selectedRole, { permissions: matrix[selectedRole] });
      toast(t('Governance matrix synchronized successfully'), 'success');
    } catch (error) {
      toast(t('Failed to sync permissions'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton height={400} />;

  // Group permissions by domain for better UI
  const groups = {
    'Workforce': ['employee.profile.manage', 'hr.employees.manage', 'hr.succession.manage', 'hr.onboarding.manage'],
    'Presence': ['employee.attendance.manage', 'hr.attendance.oversight', 'hr.shifts.manage'],
    'Finance': ['employee.payroll.view', 'hr.payroll.manage', 'employee.expenses.manage', 'hr.expenses.manage', 'employee.benefits.manage', 'hr.benefits.manage'],
    'Talent': ['hr.jobs.manage', 'hr.cvRanking.manage', 'candidate.jobs.browse', 'candidate.applications.track'],
    'Ops': ['hr.approvals.manage', 'hr.forms.manage', 'hr.submissions.manage', 'hr.tickets.manage', 'hr.documents.manage'],
    'Core': ['employee.dashboard.view', 'hr.dashboard.view', 'leader.workspace.access', 'hr.workspace.access']
  };

  return (
    <div className="hr-surface-card" style={{ padding: 32, borderRadius: 28, border: '1px solid var(--border-soft)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h3 style={{ fontSize: 20, fontWeight: 900 }}>{t('Governance Control Matrix')}</h3>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginTop: 4 }}>{t('Enforce multi-role permissions and system access nodes.')}</p>
        </div>
        <Btn variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? t('Syncing...') : t('Apply Governance Policy')}
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {roles.map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              style={{
                padding: '14px 20px',
                borderRadius: 14,
                border: 'none',
                textAlign: 'left',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                background: selectedRole === role ? 'var(--gray-900)' : 'var(--gray-50)',
                color: selectedRole === role ? 'white' : 'var(--gray-500)',
                transition: 'all 0.2s'
              }}
            >
              {t(role)}
            </button>
          ))}
          <div style={{ marginTop: 24, padding: 20, background: '#F0F9FF', borderRadius: 16, border: '1px solid #BAE6FD' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', marginBottom: 8 }}>{t('Node Access')}</div>
            <div style={{ fontSize: 13, color: '#0C4A6E', lineHeight: 1.5 }}>
              {t('Admins have implicit "*" root access and cannot be modified.')}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 32 }}>
          {Object.entries(groups).map(([groupName, permissions]) => (
            <div key={groupName}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, borderBottom: '1px solid var(--border-soft)', paddingBottom: 8 }}>
                {t(groupName)}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {permissions.map(perm => {
                  const isChecked = (matrix[selectedRole] || []).includes(perm);
                  return (
                    <div 
                      key={perm} 
                      onClick={() => handleTogglePermission(perm)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: isChecked ? 'var(--gray-50)' : 'transparent', 
                        borderRadius: 12, border: '1px solid', borderColor: isChecked ? 'var(--gray-200)' : 'transparent',
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ 
                        width: 20, height: 20, borderRadius: 6, border: '2px solid', 
                        borderColor: isChecked ? 'var(--gray-900)' : 'var(--gray-300)',
                        background: isChecked ? 'var(--gray-900)' : 'transparent',
                        display: 'grid', placeItems: 'center', transition: 'all 0.2s'
                      }}>
                        {isChecked && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: isChecked ? 700 : 500, color: isChecked ? 'var(--gray-900)' : 'var(--gray-500)' }}>
                        {t(perm.split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
