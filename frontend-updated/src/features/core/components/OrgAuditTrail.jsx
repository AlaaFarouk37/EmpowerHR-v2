import React from 'react';
import { Badge, Btn } from '../../../components/shared';
import { useLanguage } from '../../../context/LanguageContext';

export function OrgAuditTrail({ logs = [] }) {
  const { t } = useLanguage();

  return (
    <div style={{ marginTop: 24 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
         <h3 style={{ fontSize: 16, fontWeight: 800 }}>{t('Infrastructure Audit Trail')}</h3>
         <Btn variant="outline" size="sm" onClick={() => {}}>{t('Download Logs')}</Btn>
       </div>
       <div className="hr-surface-card" style={{ padding: 0, overflow: 'hidden' }}>
         {logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>{t('No system logs available.')}</div>
         ) : logs.map((log, i) => (
            <div key={log.logID} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: i < logs.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
               <div style={{ 
                 width: 36, height: 36, borderRadius: '50%', 
                 background: log.status === 'Success' ? 'var(--red-50)' : 'var(--red-50)', 
                 color: log.status === 'Success' ? '#16A34A' : '#EF4444', 
                 display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 
               }}>
                 {log.status === 'Success' ? '✓' : '⚠'}
               </div>
               <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{log.action}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{t('By')} {log.actor} • {new Date(log.timestamp).toLocaleString()}</div>
                  {log.details && <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>{log.details}</div>}
               </div>
               <Badge label={log.status} color={log.status === 'Success' ? 'green' : 'red'} size="sm" />
            </div>
         ))}
       </div>
    </div>
  );
}

