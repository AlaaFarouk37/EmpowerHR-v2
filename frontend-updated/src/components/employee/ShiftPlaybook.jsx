import { useLanguage } from '../../context/LanguageContext';

export function ShiftPlaybook({ plays }) {
  const { t } = useLanguage();

  return (
    <div className="hr-surface-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 10 }}>{t('Shift Playbook')}</div>
      <div style={{ display: 'grid', gap: 10 }}>
        {plays.map((item) => (
          <div key={item.title} style={{ border: '1px solid var(--border-primary)', borderRadius: 14, padding: '12px 14px', background: 'var(--bg-surface)' }}>
            <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{item.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 6 }}>{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
