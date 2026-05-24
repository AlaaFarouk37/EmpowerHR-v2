import { useLanguage } from '../../context/LanguageContext';

export function ShiftRadar({ plannedCount, swappedCount, todayShiftCount, dueSoonCount, strongestSignal }) {
  const { t } = useLanguage();

  return (
    <div className="hr-surface-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 10 }}>{t('Shift Coverage Radar')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
        {[
          { label: t('Planned'), value: plannedCount, color: '#E8321A', note: t('Shifts still waiting for employee confirmation or final status.') },
          { label: t('Swapped'), value: swappedCount, color: 'var(--red-800)', note: t('Schedule changes that may need coverage review or extra follow-up.') },
          { label: t('Today'), value: todayShiftCount, color: '#175CD3', note: t('Shifts happening today that are most relevant for live coordination.') },
          { label: t('Due Soon'), value: dueSoonCount, color: '#027A48', note: t('Upcoming shifts in the next two days that deserve early attention.') },
        ].map((item) => (
          <div key={item.label} style={{ border: '1px solid var(--border-primary)', borderRadius: 14, padding: '12px 12px', background: 'var(--bg-surface)' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 23, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>{item.note}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, borderRadius: 14, border: '1px solid #FDE68A', background: 'var(--pink-50)', padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#B45309', marginBottom: 6 }}>{t('Strongest signal')}</div>
        <div style={{ fontSize: 13.5, color: '#92400E' }}>{strongestSignal}</div>
      </div>
    </div>
  );
}

