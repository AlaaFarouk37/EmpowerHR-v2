import { useEffect, useMemo, useState } from 'react';
import { getTeamLeaveRequests, reviewTeamLeaveRequest } from '../../api/index.js';
import { LeaderPortalLayout, Spinner, useToast } from '../../components/shared/index.jsx';
import { LeaveReviewCard } from '../../components/shared/LeaveReviewCard.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { Plane, Check } from 'lucide-react';

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

export function LeaderTeamLeavePage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTeamLeaveRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || t('Failed to load leave requests'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(
    () => (filter === 'All' ? requests : requests.filter(r => r.status === filter)),
    [requests, filter],
  );
  const pendingCount = useMemo(() => requests.filter(r => r.status === 'Pending').length, [requests]);

  if (loading) {
    return <LeaderPortalLayout><div style={{ height: '50vh', display: 'grid', placeItems: 'center' }}><Spinner size={48} /></div></LeaderPortalLayout>;
  }

  return (
    <LeaderPortalLayout>
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center' }}>
          <Plane size={24} style={{ color: '#fff' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Team Leave Requests')}</h2>
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, margin: '4px 0 0' }}>
            {t('Review, approve or deny leave requests from your team members.')}
          </p>
        </div>
        <span style={{ marginInlineStart: 'auto', fontSize: 13, fontWeight: 900, color: '#94A3B8', background: '#F1F5F9', padding: '6px 14px', borderRadius: 999 }}>
          {pendingCount} {t('pending')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 999, border: '1.5px solid',
            borderColor: filter === f ? 'var(--red-600)' : '#E2E8F0',
            background: filter === f ? 'var(--red-600)' : '#fff',
            color: filter === f ? '#fff' : '#64748B', fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>
            {t(f)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: 56, textAlign: 'center', background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9' }}>
          <Check size={44} color="#10B981" style={{ marginBottom: 16 }} />
          <p style={{ color: '#64748B', fontWeight: 700, margin: 0 }}>{t('No leave requests to show.')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          {visible.map(req => (
            <LeaveReviewCard
              key={req.leaveRequestID}
              request={req}
              onReview={async (action, note) => {
                await reviewTeamLeaveRequest(req.leaveRequestID, { action, reviewNotes: note });
                await load();
              }}
            />
          ))}
        </div>
      )}
    </LeaderPortalLayout>
  );
}
