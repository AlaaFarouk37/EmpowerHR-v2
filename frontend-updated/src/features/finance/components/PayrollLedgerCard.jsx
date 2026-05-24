import React from 'react';
import { Badge, Btn } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function PayrollLedgerCard({ row, onSelect, onRelease, formatMoney }) {
  const { t } = useLanguage();

  return (
    <div className="hr-surface-card" style={{ 
      padding: 24, 
      borderRadius: 28, 
      border: row.isVerified ? '2px solid var(--red-800)' : (row.isAnomaly ? '1px solid #FEE2E2' : '1px solid var(--border-soft)'), 
      background: row.isVerified ? 'var(--red-50)' : (row.isAnomaly ? '#FFFBFB' : 'var(--surface)'),
      transition: 'all 0.3s ease'
    }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
             <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--gray-100)', display: 'grid', placeItems: 'center', fontWeight: 900, color: 'var(--gray-900)' }}>{row.employeeName?.[0]}</div>
             <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--gray-900)' }}>{row.employeeName}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{row.visualId} • {row.department}</div>
             </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
             {row.isVerified && <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--red-800)', color: 'white', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>🛡️</div>}
             <Badge label={row.status} color={row.lane === 'closed' ? 'green' : (row.lane === 'draft' ? 'gray' : 'accent')} size="sm" />
          </div>
       </div>

       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 16 }}>
             <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 4 }}>{t('Base Node')}</div>
             <div style={{ fontWeight: 700, fontSize: 14 }}>{formatMoney(row.baseSalary)}</div>
          </div>
          <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 16 }}>
             <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 4 }}>{t('Allowances')}</div>
             <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--red-800)' }}>+{formatMoney(Number(row.allowances || 0) + Number(row.bonus || 0))}</div>
          </div>
       </div>

       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
          <div>
             <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{t('Net Disbursement')}</div>
             <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gray-900)' }}>{formatMoney(row.netPay)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
             <Btn variant="ghost" size="sm" onClick={() => onSelect(row)}>🔍</Btn>
             {row.lane !== 'closed' && <Btn variant="primary" size="sm" onClick={() => onRelease(row)}>✅ {t('Release')}</Btn>}
          </div>
       </div>
       
       {row.isAnomaly && (
         <div style={{ marginTop: 16, padding: '8px 12px', background: 'var(--red-50)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#991B1B' }}>{t('Audit Required: Anomaly detected in variance matrix.')}</span>
         </div>
       )}
    </div>
  );
}

