import React, { useEffect, useId } from 'react';

export function Modal({ open, onClose, title, children, maxWidth = 520 }) {
  const titleId = useId();

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(17,19,24,.48)',
        backdropFilter: 'blur(14px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: 'rgba(255,255,255,.98)', borderRadius: 28,
          width: '100%', maxWidth,
          boxShadow: '0 28px 84px rgba(17,19,24,.16)',
          animation: 'slideUp .25s cubic-bezier(.22,.68,0,1.2)',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          border: '1px solid rgba(231,234,238,.9)',
        }}
      >
        <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 id={titleId} style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>{title}</h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            style={{
              width: 36, height: 36, border: 'none', background: 'var(--gray-100)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-xs)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gray-700)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: '18px 28px 28px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
