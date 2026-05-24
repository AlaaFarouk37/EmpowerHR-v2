import { Badge } from '../shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';

export function GovernanceRadar({ items }) {
  const { t } = useLanguage();

  return (
    <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-pink)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('Platform Governance Radar')}</div>
        <Badge label={`${t('Watch items')} ${items.length}`} color="red" />
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        {items.map((item) => (
          <div key={item.title} className="workspace-action-card" style={{ background: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong style={{ fontSize: 15, fontWeight: 700 }}>{item.title}</strong>
              <Badge label={item.state} color={item.state === t('High') ? 'red' : 'gray'} />
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
