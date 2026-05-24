import { useNavigate } from 'react-router-dom';
import { Badge } from '../shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';

export function ServiceLaneGrid({ services }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="hr-panel-grid" style={{ gridTemplateColumns: '1fr', gap: 32, marginBottom: 32 }}>
      <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-violet)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>{t('Active Service Lanes')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {services.map((service) => (
            <button
              key={service.key}
              onClick={() => navigate(service.path)}
              style={{ textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 15, color: service.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{service.label}</div>
                <Badge label={String(service.value)} color="accent" />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{service.note}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
