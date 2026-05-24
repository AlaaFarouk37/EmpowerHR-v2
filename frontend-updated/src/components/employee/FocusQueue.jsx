import { Badge } from '../shared/index.jsx';

export function FocusQueue({ title, items, emptyText, renderItem, t }) {
  return (
    <div className="hr-table-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="hr-soft-empty" style={{ padding: '24px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)', margin: 0 }}>{emptyText}</p>
        </div>
      ) : (
        <div style={{ padding: '8px 0' }}>
          {items.map((item, index) => renderItem(item, index))}
        </div>
      )}
    </div>
  );
}
