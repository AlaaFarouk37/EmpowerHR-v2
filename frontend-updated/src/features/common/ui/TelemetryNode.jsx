import React from 'react';

export function TelemetryNode({ label, value, note, accent, trend, icon }) {
  return (
    <div className="hr-surface-card" style={{ padding: 20, borderRadius: 24, border: '1px solid var(--border-soft)', background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: accent || 'var(--gray-900)', letterSpacing: '-0.02em', marginBottom: 2 }}>{value}</div>
        {trend !== undefined && (
          <div style={{ fontSize: 11, fontWeight: 700, color: trend >= 0 ? 'var(--red-800)' : '#EF4444', padding: '2px 6px', background: trend >= 0 ? 'var(--red-50)' : 'var(--red-50)', borderRadius: 6 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>{note}</div>
      
      {/* Decorative Sparkline */}
      <div style={{ position: 'absolute', bottom: -5, left: 0, right: 0, height: 30, opacity: 0.15 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
           <path d={trend >= 0 ? "M0 15 Q 25 5, 50 12 T 100 5" : "M0 5 Q 25 15, 50 8 T 100 15"} fill="none" stroke={accent || 'var(--gray-900)'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

