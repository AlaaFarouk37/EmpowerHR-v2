import React from 'react';

export function Button({ children, variant = 'primary', size = 'md', ...props }) {
  const base = {
    border: '1px solid transparent',
    borderRadius: 'var(--control-radius)',
    fontWeight: 700,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    fontSize: size === 'sm' ? 12 : 14,
    minHeight: size === 'sm' ? 36 : 'var(--control-height)',
    padding: size === 'sm' ? '7px 14px' : '10px 22px',
    opacity: props.disabled ? 0.65 : 1,
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, var(--red) 0%, #CC2915 100%)',
      color: '#fff',
      boxShadow: 'var(--shadow-red)',
      border: '1px solid transparent',
    },
    ghost: {
      background: 'var(--bg-surface)',
      color: 'var(--gray-700)',
      border: '1px solid var(--border-soft)',
      boxShadow: 'var(--shadow-xs)',
    },
    danger: {
      background: '#FFF5F3',
      color: 'var(--red)',
      border: '1px solid #FAD7D1',
      boxShadow: 'var(--shadow-xs)',
    },
    accent: {
      background: 'linear-gradient(135deg, #F9EDEB 0%, #FFF7F5 100%)',
      color: '#8B4A42',
      border: '1px solid #EED3CE',
      boxShadow: 'var(--shadow-xs)',
    },
    outline: {
      background: 'var(--bg-surface)',
      color: 'var(--red)',
      border: '1px solid #F2B6AA',
      boxShadow: 'var(--shadow-xs)',
    },
  };

  const visualStyle = variants[variant] || variants.primary;

  return (
    <button
      {...props}
      style={{ ...base, ...visualStyle, ...props.style }}
      onMouseEnter={(e) => {
        if (props.disabled) return;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = variant === 'primary'
          ? '0 12px 24px rgba(232,50,26,.24)'
          : 'var(--shadow-sm)';
        if (variant === 'primary') e.currentTarget.style.background = 'linear-gradient(135deg, #F03D26 0%, #D92D17 100%)';
        if (variant === 'ghost' || variant === 'outline') e.currentTarget.style.borderColor = '#D0D5DD';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = visualStyle.boxShadow || 'none';
        e.currentTarget.style.background = visualStyle.background || '#fff';
        const borderColor = visualStyle.border?.match(/#(?:[0-9a-fA-F]{3}){1,2}/)?.[0] || 'transparent';
        e.currentTarget.style.borderColor = borderColor;
      }}
      onMouseDown={(e) => {
        if (props.disabled) return;
        e.currentTarget.style.transform = 'translateY(0) scale(0.96)';
      }}
      onMouseUp={(e) => {
        if (props.disabled) return;
        e.currentTarget.style.transform = 'translateY(-2px) scale(1)';
      }}
    >
      {children}
    </button>
  );
}

// Keep alias for compatibility
export { Button as Btn };
