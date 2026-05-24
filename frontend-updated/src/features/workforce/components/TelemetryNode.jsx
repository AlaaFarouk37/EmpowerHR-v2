import React from 'react';

export function TelemetryNode({ label, value, note, accent }) {
  return (
    <div className="hr-surface-card" style={{ padding: 20, borderRadius: 24, border: '1px solid var(--border-soft)', background: 'var(--surface)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: accent || 'var(--gray-900)', letterSpacing: '-0.02em', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>{note}</div>
    </div>
  );
}
