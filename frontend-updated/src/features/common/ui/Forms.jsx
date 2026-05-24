import React, { useId } from 'react';

export function Input({ label, id, style, onFocus, onBlur, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{label}</label>}
      <input
        {...props}
        id={inputId}
        aria-label={props['aria-label'] || label}
        style={{
          width: '100%', padding: '12px 16px',
          background: 'rgba(255,255,255,.98)', border: '1.5px solid #E7EAEE',
          borderRadius: 'var(--control-radius)', fontSize: 14, fontWeight: 500,
          color: 'var(--gray-900)', outline: 'none', transition: 'all .2s ease',
          boxShadow: 'var(--shadow-xs)',
          minHeight: 'var(--control-height)',
          ...style,
        }}
        onFocus={e => {
          onFocus?.(e);
          e.target.style.background = '#fff';
          e.target.style.borderColor = 'var(--red)';
          e.target.style.boxShadow = '0 0 0 4px rgba(232,50,26,.10)';
        }}
        onBlur={e => {
          onBlur?.(e);
          e.target.style.background = '#fff';
          e.target.style.borderColor = '#E7EAEE';
          e.target.style.boxShadow = 'var(--shadow-xs)';
        }}
      />
    </div>
  );
}

export function Textarea({ label, id, style, onFocus, onBlur, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{label}</label>}
      <textarea
        {...props}
        id={inputId}
        aria-label={props['aria-label'] || label}
        style={{
          width: '100%', padding: '12px 16px',
          background: 'rgba(255,255,255,.98)', border: '1.5px solid #E7EAEE',
          borderRadius: 'var(--control-radius)', fontSize: 14, fontWeight: 500,
          color: 'var(--gray-900)', outline: 'none', transition: 'all .2s ease',
          resize: 'vertical', minHeight: 90,
          boxShadow: 'var(--shadow-xs)',
          ...style,
        }}
        onFocus={e => {
          onFocus?.(e);
          e.target.style.background = '#fff';
          e.target.style.borderColor = 'var(--red)';
          e.target.style.boxShadow = '0 0 0 4px rgba(232,50,26,.10)';
        }}
        onBlur={e => {
          onBlur?.(e);
          e.target.style.background = '#fff';
          e.target.style.borderColor = '#E7EAEE';
          e.target.style.boxShadow = 'var(--shadow-xs)';
        }}
      />
    </div>
  );
}

export function DatalistInput({ label, id, options = [], style, onFocus, onBlur, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-list`;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{label}</label>}
      <>
        <input
          {...props}
          id={inputId}
          list={listId}
          aria-label={props['aria-label'] || label}
          style={{
            width: '100%', padding: '12px 16px',
              background: 'rgba(255,255,255,.98)', border: '1.5px solid #E7EAEE',
              borderRadius: 'var(--control-radius)', fontSize: 14, fontWeight: 500,
              color: 'var(--gray-900)', outline: 'none', transition: 'all .2s ease',
              boxShadow: 'var(--shadow-xs)',
              minHeight: 'var(--control-height)',
            ...style,
          }}
          onFocus={e => {
            onFocus?.(e);
            e.target.style.background = '#fff';
            e.target.style.borderColor = 'var(--red)';
              e.target.style.boxShadow = '0 0 0 4px rgba(232,50,26,.10)';
          }}
          onBlur={e => {
            onBlur?.(e);
            e.target.style.background = '#fff';
            e.target.style.borderColor = '#E7EAEE';
              e.target.style.boxShadow = 'var(--shadow-xs)';
          }}
        />
        <datalist id={listId}>
          {options.map((option) => (
            <option key={String(option)} value={String(option)} />
          ))}
        </datalist>
      </>
    </div>
  );
}
