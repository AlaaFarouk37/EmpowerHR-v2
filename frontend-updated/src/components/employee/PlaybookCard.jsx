export function PlaybookCard({ title, plays, t }) {
  return (
    <div className="hr-surface-card profile-card-modern" style={{ padding: 24, borderRadius: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 16 }}>{title || t('Action Playbook')}</div>
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
