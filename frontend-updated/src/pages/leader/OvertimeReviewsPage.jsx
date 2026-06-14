import { useCallback, useEffect, useState } from 'react';
import { LeaderPortalLayout, Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { getTeamPendingOvertime, reviewTeamOvertime } from '../../api/index.js';

export function LeaderOvertimeReviewsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeamPendingOvertime();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error?.message || t('Failed to load overtime reviews'), 'error');
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (record, action) => {
    if (savingId) return;
    setSavingId(record.attendanceID);
    try {
      await reviewTeamOvertime(record.attendanceID, { action });
      toast(action === 'approve' ? t('Overtime approved') : t('Overtime rejected'), 'success');
      await load();
    } catch (error) {
      toast(error?.message || t('Failed to review overtime'), 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <LeaderPortalLayout>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: '0 0 8px' }}>{t('Overtime Reviews')}</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, maxWidth: 720 }}>
          {t('Overtime hours that did not meet the 80% task-time threshold. Approve to count them as paid overtime (1.5× hourly rate in payroll), or reject to discard.')}
        </p>
      </div>

      <div className="card" style={{ padding: '20px 22px', borderRadius: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#B54708', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('Pending Overtime Reviews')}
          </div>
          <Badge label={`${records.length} ${t('open')}`} color={records.length ? 'orange' : 'green'} />
        </div>

        {loading ? (
          <div style={{ padding: '24px', display: 'grid', placeItems: 'center' }}><Spinner size={28} /></div>
        ) : records.length === 0 ? (
          <div className="hr-soft-empty" style={{ padding: '18px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 12.5, color: 'var(--gray-500)', fontWeight: 600, margin: 0 }}>
              {t('No overtime is awaiting your review.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {records.map((record) => {
              const ratioRaw = Number(record.workedHours) > 0 && record.taskTimeHours != null
                ? (Number(record.taskTimeHours) / Number(record.workedHours)) * 100
                : null;
              const isSaving = savingId === record.attendanceID;
              return (
                <div key={record.attendanceID} style={{ border: '1px solid #FDE68A', borderRadius: 14, padding: '14px 15px', background: '#FFFBEB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--gray-900)' }}>
                        {record.employeeName || record.employeeID}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                        {record.employeeTeam || '—'} • {record.date}
                      </div>
                    </div>
                    <Badge label={t('Pending Review')} color="orange" />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    <Badge label={`${t('Worked')}: ${record.workedHours ?? '—'}h`} color="gray" />
                    <Badge label={`${t('Overtime')}: +${record.overtimeHours ?? '—'}h`} color="accent" />
                    {ratioRaw !== null ? (
                      <Badge label={`${t('Task time')}: ${ratioRaw.toFixed(0)}%`} color={ratioRaw >= 80 ? 'green' : 'red'} />
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <Btn size="sm" variant="primary" disabled={isSaving} onClick={() => handleReview(record, 'approve')}
                      style={{ flex: 1, background: '#16A34A', border: 'none', color: '#fff' }}>
                      {isSaving ? t('Saving...') : t('Approve')}
                    </Btn>
                    <Btn size="sm" variant="primary" disabled={isSaving} onClick={() => handleReview(record, 'reject')}
                      style={{ flex: 1, background: '#DC2626', border: 'none', color: '#fff' }}>
                      {isSaving ? t('Saving...') : t('Reject')}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LeaderPortalLayout>
  );
}
