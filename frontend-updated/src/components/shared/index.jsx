import React, { useState, useEffect, useCallback, useId } from 'react';
import { Network, Sparkles, CheckCircle2, ShieldAlert, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { hrGetEmployees } from '../../api/index.js';

// ── SPINNER ──────────────────────────────────────────────────────────────────
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

// ── TOAST ────────────────────────────────────────────────────────────────────
let toastFn = null;
export function useToast() {
  const show = useCallback((msg, type = 'success') => {
    if (toastFn) toastFn(msg, type);
  }, []);
  return show;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastFn = (msg, type) => {
      const id = Date.now();
      setToasts(t => [...t, { id, msg, type }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    };
  }, []);

  return (
    <div aria-live="polite" aria-atomic="true" style={{ position: 'fixed', bottom: 40, right: 40, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', color: 'var(--text-primary)',
          padding: '16px 24px', borderRadius: 20, fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          animation: 'toastIn .4s var(--ease-neural)',
          minWidth: 280, maxWidth: 400,
          border: '1px solid var(--border-primary)',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Progress Bar Shimmer */}
          <div style={{ 
            position: 'absolute', bottom: 0, left: 0, height: 3, 
            width: '100%', background: t.type === 'success' ? 'var(--color-primary-teal)' : 'var(--neural-red)',
            opacity: 0.6, animation: 'toastProgress 3.5s linear forwards'
          }} />

          <div style={{ 
            width: 32, height: 32, borderRadius: 10, 
            background: t.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            color: t.type === 'success' ? 'var(--color-primary-teal)' : 'var(--neural-red)',
            display: 'grid', placeItems: 'center'
          }}>
            {t.type === 'success' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.type === 'success' ? 'Neural Sync' : 'System Alert'}
            </div>
            <div>{t.msg}</div>
          </div>

          <div className="neural-pulse-dot" style={{ 
            width: 6, height: 6, marginRight: 0,
            background: t.type === 'success' ? 'var(--color-primary-teal)' : 'var(--neural-red)' 
          }} />
        </div>
      ))}
    </div>
  );
}

// ── MODAL ────────────────────────────────────────────────────────────────────
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
        position: 'fixed', inset: 0, background: 'rgba(26,26,46, 0.4)',
        backdropFilter: 'blur(8px)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        role="dialog"
        className="card"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          width: '100%', maxWidth,
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp .25s cubic-bezier(.22,.68,0,1.2)',
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          padding: 0, border: 'none'
        }}
      >
        <div style={{ padding: '24px 28px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--border-primary)' }}>
          <h3 id={titleId} style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            style={{
              width: 32, height: 32, border: 'none', background: 'var(--bg-secondary)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              color: 'var(--text-secondary)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: '28px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ── INPUT ────────────────────────────────────────────────────────────────────
export function Input({ label, id, style, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>}
      <input
        {...props}
        id={inputId}
        className="inp"
        style={style}
      />
    </div>
  );
}

export function Textarea({ label, id, style, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>}
      <textarea
        {...props}
        id={inputId}
        className="inp"
        style={{ height: 'auto', minHeight: 90, padding: '12px', ...style }}
      />
    </div>
  );
}

export function NeuralInput({ label, id, suggestion, style, onFocus, onBlur, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {suggestion && !props.value && !isFocused && (
          <div style={{ 
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, pointerEvents: 'none',
            opacity: 0.6
          }}>
            {suggestion}
          </div>
        )}
        <input
          {...props}
          id={inputId}
          className="inp"
          style={{
            borderColor: isFocused ? 'var(--color-ai-purple)' : 'var(--color-border-secondary)',
            boxShadow: isFocused ? '0 0 0 3px rgba(83, 74, 183, 0.1)' : 'none',
            paddingRight: suggestion ? 100 : 14,
            ...style,
          }}
          onFocus={e => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setIsFocused(false);
            onBlur?.(e);
          }}
        />
        {suggestion && isFocused && !props.value && (
           <div style={{ 
             position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
             display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--color-ai-purple)',
             opacity: 0.9
           }}>
             <Sparkles size={12} />
             AI SYNC
           </div>
        )}
      </div>
    </div>
  );
}

export function DatalistInput({ label, id, options = [], style, ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-list`;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>}
      <>
        <input
          {...props}
          id={inputId}
          list={listId}
          className="inp"
          style={style}
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

let employeeDirectoryCache = null;
let employeeDirectoryPromise = null;

const loadEmployeeDirectory = async () => {
  if (employeeDirectoryCache) return employeeDirectoryCache;
  if (!localStorage.getItem('access')) return [];
  
  if (!employeeDirectoryPromise) {
    employeeDirectoryPromise = hrGetEmployees()
      .then((data) => {
        employeeDirectoryCache = Array.isArray(data) ? data : [];
        return employeeDirectoryCache;
      })
      .catch(() => [])
      .finally(() => {
        employeeDirectoryPromise = null;
      });
  }
  return employeeDirectoryPromise;
};

export function EmployeeSelect({
  label,
  id,
  value,
  onChange,
  onEmployeeChange,
  multiple = false,
  placeholder = 'Select an employee',
  helperText,
  size,
  style,
  disabled = false,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [employees, setEmployees] = useState(employeeDirectoryCache || []);
  const [loading, setLoading] = useState(!employeeDirectoryCache);

  useEffect(() => {
    let active = true;

    loadEmployeeDirectory()
      .then((data) => {
        if (active) setEmployees(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const normalizedValue = multiple
    ? (Array.isArray(value)
      ? value
      : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean))
    : (value || '');

  const handleChange = (event) => {
    if (multiple) {
      const selectedValues = Array.from(event.target.selectedOptions).map((option) => option.value);
      onChange?.(selectedValues);
      onEmployeeChange?.(employees.filter((employee) => selectedValues.includes(employee.employeeID)));
      return;
    }

    const nextValue = event.target.value;
    onChange?.(nextValue);
    onEmployeeChange?.(employees.find((employee) => employee.employeeID === nextValue) || null);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label htmlFor={inputId} style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>{label}</label>}
      <select
        id={inputId}
        aria-label={label || 'Employee selector'}
        multiple={multiple}
        size={multiple ? (size || 6) : undefined}
        value={normalizedValue}
        onChange={handleChange}
        disabled={disabled || loading}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'var(--bg-primary)',
          border: '1.5px solid var(--card-border)',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'all .2s',
          boxShadow: '0 1px 2px rgba(17,19,24,.03)',
          minHeight: multiple ? 140 : 'auto',
          ...style,
        }}
      >
        {!multiple && <option value="">{loading ? 'Loading employees...' : placeholder}</option>}
        {employees.map((employee) => (
          <option key={employee.employeeID} value={employee.employeeID}>
            {employee.fullName} ({employee.employeeID}){employee.department ? ` — ${employee.department}` : ''}
          </option>
        ))}
      </select>
      {helperText ? <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gray-500)' }}>{helperText}</div> : null}
    </div>
  );
}

export function EmployeeProfileSummary({
  employee,
  t = (value) => value,
  language = 'en',
  note = 'Employee profile details were fetched for easier entry. You can still edit any field before saving.',
}) {
  if (!employee) return null;

  const preferredCurrency = employee?.currency_preference || (typeof document !== 'undefined'
    ? (document.documentElement.dataset.currencyPreference || 'EGP')
    : 'EGP');

  const formatCurrency = (value) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: preferredCurrency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

  const details = [
    ['Job Title', employee.jobTitle],
    ['Department', employee.department],
    ['Team', employee.team],
    ['Location', employee.location],
    ['Salary', employee.monthlyIncome !== null && employee.monthlyIncome !== undefined && employee.monthlyIncome !== '' ? formatCurrency(employee.monthlyIncome) : ''],
    ['Currency', employee.currency_preference],
    ['Email', employee.email],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');

  return (
    <div style={{
      marginBottom: 16,
      padding: '12px 14px',
      borderRadius: 14,
      border: '1px solid var(--card-border)',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 6 }}>
        {employee.fullName} ({employee.employeeID})
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--gray-500)', marginBottom: details.length ? 8 : 0 }}>
        {t(note)}
      </div>
      {details.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {details.map(([label, value]) => (
            <span key={`${employee.employeeID}-${label}`} style={{
              padding: '4px 8px',
              borderRadius: 999,
              fontSize: 11.5,
              background: 'var(--bg-primary)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-secondary)',
            }}>
              <strong>{t(label)}:</strong> {value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── BADGE ────────────────────────────────────────────────────────────────────
export function Badge({ label, color = 'gray' }) {
  const colorMap = {
    green: 'b-approved',
    red: 'b-rejected',
    orange: 'b-pending',
    blue: 'b-inprogress',
    gray: 'b-neutral',
    accent: 'b-resolved',
    ai: 'b-ai',
    pink: 'b-ai' // Using b-ai for now as it's likely vibrant, or I can add a new one
  };
  const className = `badge ${colorMap[color] || 'b-neutral'}`;
  return <span className={className}>{label}</span>;
}

// ── BUTTON ───────────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', className = '', icon, loading = false, ...props }) {
  const variantMap = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline-teal',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    accent: 'btn-primary' // Fallback
  };
  const sizeMap = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };
  
  const combinedClasses = `btn ${variantMap[variant] || 'btn-primary'} ${sizeMap[size]} ${className}`.trim();

  return (
    <button
      {...props}
      className={combinedClasses}
      disabled={props.disabled || loading}
    >
      {loading ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Spinner size={16} />
          {children}
        </span>
      ) : (
        <>
          {icon && <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

// ── CSS KEYFRAMES (injected once) ────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes toastIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
  @keyframes toastProgress { from { width: 100%; } to { width: 0%; } }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
`;
document.head.appendChild(style);

// ── NEURAL NODE (Enhancement 7) ──────────────────────────────────────────────
export function NeuralNode({ employee, children }) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useLanguage();

  if (!employee) return children;

  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={{ 
        display: 'inline-flex', alignItems: 'center', gap: 6, 
        color: 'var(--neural-red)', fontWeight: 800, cursor: 'pointer',
        textDecoration: 'underline', textDecorationColor: 'var(--neural-red-glow)',
        textUnderlineOffset: '4px'
      }}>
        {children || employee.fullName}
        <Network size={12} style={{ opacity: 0.6 }} />
      </span>

      {isHovered && (
        <div className="glass-morphism" style={{ 
          position: 'absolute', bottom: 'calc(100% + 12px)', left: '50%', transform: 'translateX(-50%)',
          width: 280, padding: 20, borderRadius: 24, zIndex: 3000,
          animation: 'slideUp 0.3s var(--ease-neural)',
          border: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
             <div style={{ 
               width: 48, height: 48, borderRadius: 14, background: 'var(--bg-primary)', 
               color: 'white', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900
             }}>
               {employee.fullName.charAt(0)}
             </div>
             <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>{employee.fullName}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{employee.jobTitle}</div>
             </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('Department')}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{employee.department}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('Node Stability')}</span>
                <span style={{ color: 'var(--red-800)', fontWeight: 800 }}>98.4%</span>
             </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-primary)', display: 'flex', gap: 8 }}>
             <Btn size="sm" variant="outline" style={{ flex: 1, fontSize: 10 }}>{t('Profile')}</Btn>
             <Btn size="sm" variant="primary" style={{ flex: 1, fontSize: 10 }}>{t('Message')}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ERROR BOUNDARY ───────────────────────────────────────────────────────────
export class NeuralErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Neural Error Boundary caught:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 60, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 32, border: '2px solid var(--border-primary)', margin: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 950, color: 'var(--neural-red)', marginBottom: 16 }}>Intelligence Sync Interrupted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 15, fontWeight: 850 }}>A minor data mismatch occurred while processing this node. The system is still stable.</p>
          <Btn onClick={() => this.setState({ hasError: false })} variant="primary">Attempt Re-Sync</Btn>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── EXPORTS ──────────────────────────────────────────────────────────────────
export * from './HRLayout';
export * from './PageHeader';
export * from './NeuralCommandBar';
export * from './LeaderPortalLayout';
export { Skeleton, EmptyState } from '../../features/common/ui/Feedback';

