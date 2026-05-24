import React, { useState, useEffect, useCallback } from 'react';
import { Btn } from '../../../components/shared/index.jsx';

export function Spinner({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size,
      border: '3px solid var(--color-primary-teal-tint)',
      borderTopColor: 'var(--color-primary-teal)',
      borderRadius: '50%',
      animation: 'spin .75s linear infinite',
      margin: '0 auto',
    }} />
  );
}

export function Skeleton({ className = '', width, height, radius = 8, style, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`ui-skeleton ${className}`.trim()}
      style={{ 
        width: width || '100%', 
        height: height || '20px', 
        borderRadius: radius, 
        ...style 
      }}
      {...props}
    />
  );
}

export function EmptyState({ title, description, action, icon = '📋', className = '', style }) {
  return (
    <div className={`card ${className}`.trim()} style={{ textAlign: 'center', padding: '40px 24px', border: 'none', background: 'transparent', ...style }}>
      <div style={{ fontSize: 40, marginBottom: 16, display: 'block' }}>{icon}</div>
      {title && <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>}
      {description && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>{description}</div>}
      {action || null}
    </div>
  );
}

let toastFn = null;
export function useToast() {
  const show = useCallback((msg, type = 'success') => {
    if (toastFn) toastFn(msg, type);
  }, []);
  return show;
}

export function GlobalToast() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    toastFn = (msg, type = 'success') => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    };
    return () => { toastFn = null; };
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} className="card" style={{
          background: 'var(--text-primary)',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: 'var(--border-radius-lg)',
          fontWeight: 600,
          fontSize: 14,
          boxShadow: 'var(--shadow-lg)',
          borderLeft: `4px solid ${t.type === 'error' ? 'var(--color-danger)' : 'var(--color-primary-teal)'}`,
          animation: 'toastIn 0.3s cubic-bezier(.22,.68,0,1.2) forwards',
          borderTop: 'none', borderRight: 'none', borderBottom: 'none'
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
