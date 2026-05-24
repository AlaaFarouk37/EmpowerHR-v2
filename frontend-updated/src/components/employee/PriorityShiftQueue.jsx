import { Badge } from '../shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';

export function PriorityShiftQueue({ shifts, getShiftWindowLabel, getShiftTone }) {
  const { t } = useLanguage();

  return (
    <div className="hr-table-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t('Priority Shift Queue')}</h3>
      </div>
      {shifts.length === 0 ? (
        <div className="hr-soft-empty" style={{ padding: '24px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, color: 'var(--gray-500)', margin: 0 }}>{t('Priority shift items will appear here as schedules are assigned.')}</p>
        </div>
      ) : (
        <div style={{ padding: '8px 0' }}>
          {shifts.map((shift) => (
            <div key={`queue-${shift.scheduleID}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #F3F4F6' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{t(shift.shiftType)} {t('Shift')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--gray-500)', marginTop: 4 }}>{shift.shiftDate} • {shift.startTime} to {shift.endTime}</div>
                <div style={{ fontSize: 11.5, color: 'var(--gray-400)', marginTop: 4 }}>{getShiftWindowLabel(shift.shiftDate, t)}</div>
              </div>
              <Badge label={t(shift.status)} color={getShiftTone(shift)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
