import { Badge } from '../shared/index.jsx';

export function PressureMapCard({ title, items, emptyText, renderItem, t }) {
  return (
    <div className="hr-surface-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      {items.length === 0 ? (
        <div className="hr-soft-empty" style={{ padding: '24px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)', margin: 0 }}>{emptyText}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      )}
    </div>
  );
}
