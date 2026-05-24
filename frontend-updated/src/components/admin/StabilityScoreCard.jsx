import { useLanguage } from '../../context/LanguageContext';

export function StabilityScoreCard({ queueCount, pendingLeaveCount, orgHealth }) {
  const { t } = useLanguage();
  
  // Real AI data from Orchestrator if available, otherwise fallback to heuristic
  const stabilityIndex = orgHealth?.stability_index !== undefined ? orgHealth.stability_index * 100 : Math.max(30, 100 - (queueCount * 5) - (pendingLeaveCount * 2));
  const attritionRisk = orgHealth?.attrition_risk_avg !== undefined ? orgHealth.attrition_risk_avg * 100 : Math.min(100, pendingLeaveCount * 10);
  const operationalLoad = orgHealth?.operational_load_avg !== undefined ? orgHealth.operational_load_avg : Math.min(100, queueCount * 7);

  return (
    <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: 'radial-gradient(circle, var(--neural-pink) 0%, transparent 70%)', opacity: 0.1, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-pink)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 }}>{t('Neural Stability Engine')}</div>
      
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: 'white', letterSpacing: '-0.05em', marginBottom: 4 }}>
          {Math.round(stabilityIndex)}%
        </div>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('System Stability Score')}</div>
      </div>

      <div style={{ display: 'grid', gap: 20, marginTop: 24 }}>
        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{t('Attrition Risk')}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: attritionRisk > 25 ? 'var(--neural-red)' : 'var(--neural-pink)' }}>
              {attritionRisk > 25 ? t('ELEVATED') : t('NOMINAL')}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${attritionRisk}%`, height: '100%', background: attritionRisk > 25 ? 'var(--neural-red)' : 'var(--neural-pink)' }} />
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{t('Operational Load')}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: operationalLoad > 70 ? 'var(--neural-red)' : 'var(--neural-indigo)' }}>
              {operationalLoad > 70 ? t('HIGH') : t('LOW')}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${operationalLoad}%`, height: '100%', background: 'var(--neural-indigo)' }} />
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
          {t('Predictive logic based on queue pressure, leave velocity, and ticket resolution rates.')}
        </div>
      </div>
    </div>
  );
}
