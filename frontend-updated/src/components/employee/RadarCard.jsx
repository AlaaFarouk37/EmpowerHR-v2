import { Spinner } from '../shared/index.jsx';

export function RadarCard({ title, subtitle, items, strongestSignal, strongestSignalTitle, loading, t }) {
  return (
    <div className="hr-surface-card profile-card-modern" style={{ padding: 24, borderRadius: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h3>
      {subtitle && <p className="profile-card-subtitle" style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 20 }}>{subtitle}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 14 }}>
        {items.map((item) => (
          <div key={item.label} style={{ border: '1px solid var(--border-primary)', borderRadius: 16, padding: '14px 14px', background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: item.accent }}>{loading ? '—' : item.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>{item.note}</div>
          </div>
        ))}
      </div>

      {strongestSignal && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 14, border: '1px solid #FDE68A', background: 'var(--pink-50)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#B45309', marginBottom: 6 }}>{strongestSignalTitle || t('Strongest signal')}</div>
          <div style={{ fontSize: 13.5, color: '#92400E' }}>{loading ? t('Loading...') : strongestSignal}</div>
        </div>
      )}
    </div>
  );
}

