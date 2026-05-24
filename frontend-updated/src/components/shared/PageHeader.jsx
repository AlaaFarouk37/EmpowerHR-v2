import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Btn, Badge } from './index.jsx';

export function PageHeader({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  actions = [], 
  pills = [],
  className = '' 
}) {
  const { t } = useLanguage();

  return (
    <div className={`hr-page-header ${className}`} style={{ marginBottom: 24 }}>
      {breadcrumbs.length > 0 && (
        <nav className="hr-breadcrumbs" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.label}>
              {i > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/</span>}
              <Link 
                to={crumb.path} 
                style={{ 
                  textDecoration: 'none', 
                  fontSize: 12, 
                  fontWeight: 500, 
                  color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {t(crumb.label)}
              </Link>
            </React.Fragment>
          ))}
        </nav>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t(title)}</h1>
            <div style={{ display: 'flex', gap: 6 }}>
              {pills.map((pill, i) => (
                <Badge key={i} color={pill.color} label={t(pill.label)} />
              ))}
            </div>
          </div>
          {subtitle && <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{t(subtitle)}</p>}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {actions.map((action, i) => (
            <Btn 
              key={i} 
              variant={action.variant || 'outline'} 
              size={action.size || 'md'}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon && <span style={{ marginRight: 6 }}>{action.icon}</span>}
              {t(action.label)}
            </Btn>
          ))}
        </div>
      </div>
    </div>
  );
}
