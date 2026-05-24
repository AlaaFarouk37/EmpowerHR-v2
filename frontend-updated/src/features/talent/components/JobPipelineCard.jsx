import React from 'react';
import { Btn, BadgeIndicator } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export function JobPipelineCard({ job, onEdit }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { resolvePath } = useAuth();

  return (
    <div className="hr-surface-card" style={{ padding: 24, borderRadius: 28, border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
             <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 4 }}>{job.department || t('Engineering')}</div>
             <h3 style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.02em' }}>{job.title}</h3>
          </div>
          <BadgeIndicator color={job.status === 'active' ? 'success' : (job.status === 'draft' ? 'warning' : 'gray')} text={t(job.status || 'Active')} />
       </div>
       
       <div style={{ flex: 1, marginBottom: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{job.description}</p>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 16 }}>
             <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{t('Submissions')}</div>
             <div style={{ fontSize: 16, fontWeight: 800 }}>{job.submission_count || 0}</div>
          </div>
          <div style={{ padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 16 }}>
             <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{t('Min Exp')}</div>
             <div style={{ fontSize: 16, fontWeight: 800 }}>{job.min_experience_years || 0}y</div>
          </div>
       </div>

       <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="primary" style={{ flex: 1, height: 44, borderRadius: 12, background: 'var(--gray-900)', color: 'white' }} onClick={() => navigate(resolvePath(`/hr/cv-ranking?job=${job.id}`))}>{t('View Pipeline')}</Btn>
          <Btn variant="outline" style={{ height: 44, width: 44, borderRadius: 12, padding: 0 }} onClick={() => onEdit(job)}>⚙️</Btn>
       </div>
    </div>
  );
}
