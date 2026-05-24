import React from 'react';

export function Badge({ label, color }) {
  const colors = {
    green:  { bg: 'var(--success-bg)', text: 'var(--success)' },
    red:    { bg: 'var(--danger-bg)', text: 'var(--danger)' },
    orange: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
    yellow: { bg: 'var(--neural-orange-soft)', text: 'var(--neural-orange)' },
    blue:   { bg: 'var(--info-bg)', text: 'var(--info)' },
    slate:  { bg: 'var(--bg-surface)', text: 'var(--text-secondary)' },
    gray:   { bg: 'var(--bg-surface)', text: 'var(--text-muted)' },
    accent: { bg: 'var(--neural-violet-soft)', text: 'var(--neural-violet)' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      padding: '6px 12px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 900,
      background: c.bg,
      color: c.text,
      display: 'inline-block',
      border: '1px solid var(--border-primary)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      boxShadow: 'var(--shadow-xs)',
      transition: 'all 0.15s ease',
    }}>{label}</span>
  );
}

export function BadgeIndicator({ color = 'gray', text }) {
  const colors = {
    success: 'var(--neural-green)',
    error: 'var(--neural-red)',
    warning: 'var(--neural-orange)',
    info: 'var(--neural-blue)',
    purple: 'var(--neural-violet)',
    gray: 'var(--text-muted)'
  };
  const dotColor = colors[color] || colors.gray;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
      {text}
    </div>
  );
}
