import React from 'react';
import { Badge, Btn, Input } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function OrgEntityProfile({ company, setCompany, onSave, departmentStats, teamStats, employeeCount }) {
  const { t } = useLanguage();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
      <div>
        <div className="hr-surface-card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏢</div>
            <div>
              <strong style={{ fontSize: 18, color: 'var(--text-primary)' }}>{t('Entity Profile')}</strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('Global corporate identification and branding')}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Input label={t('Entity Name')} value={company.name} onChange={e => setCompany(p => ({...p, name: e.target.value}))} />
            <Input label={t('Legal Registration')} value={company.legalName} onChange={e => setCompany(p => ({...p, legalName: e.target.value}))} />
          </div>
          <div style={{ marginTop: 16 }}>
            <Input label={t('HQ Address')} value={company.address} onChange={e => setCompany(p => ({...p, address: e.target.value}))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
            <Input label={t('Primary Contact')} value={company.phone} onChange={e => setCompany(p => ({...p, phone: e.target.value}))} />
            <Input label={t('Corporate Domain')} value={company.email} onChange={e => setCompany(p => ({...p, email: e.target.value}))} />
          </div>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
             <Btn onClick={onSave}>{t('Update Identity')}</Btn>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 20 }}>
        <div className="hr-surface-card" style={{ padding: 24, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>{t('Workforce Snapshot')}</div>
          <div style={{ display: 'grid', gap: 14 }}>
             {[
               { label: t('Total Managed'), value: employeeCount, icon: '👥' },
               { label: t('Departments'), value: departmentStats.length, icon: '🏗️' },
               { label: t('Active Units'), value: teamStats.length, icon: '📦' },
             ].map(s => (
               <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-primary)' }}>
                  <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>{s.icon} {s.label}</span>
                  <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{s.value}</strong>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
