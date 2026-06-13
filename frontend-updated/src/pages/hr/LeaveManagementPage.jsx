import { useEffect, useMemo, useState } from 'react';
import { hrGetManagedLeaveRequests, hrReviewLeaveRequest } from '../../api/index.js';
import { Spinner, useToast } from '../../components/shared/index.jsx';
import { LeaveReviewCard } from '../../components/shared/LeaveReviewCard.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { Plane, Check } from 'lucide-react';

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

export function HRLeaveManagementPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');

  const load = async () => {
    setLoading(true);
    try {
      const data = await hrGetManagedLeaveRequests();
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
  const tlRequests = useMemo(() => visible.filter(r => r.employeeRole === 'TeamLeader'), [visible]);
  const employeeRequests = useMemo(() => visible.filter(r => r.employeeRole !== 'TeamLeader'), [visible]);

  const renderSection = (title, list, accent) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 6, height: 22, borderRadius: 3, background: accent }} />
        <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1E293B', margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', background: '#fff', border: '1.5px solid #F1F5F9', padding: '3px 10px', borderRadius: 999 }}>{list.length}</span>
      </div>
      {list.length === 0 ? (
        <div style={{ padding: 18, background: '#fff', borderRadius: 16, border: '1.5px dashed #E2E8F0', color: '#94A3B8', fontWeight: 700, fontSize: 13 }}>
          {t('No requests in this section.')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          {list.map(req => (
            <LeaveReviewCard
              key={req.leaveRequestID}
              request={req}
              onReview={async (action, note) => {
                await hrReviewLeaveRequest(req.leaveRequestID, { action, reviewNotes: note });
                await load();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}><Spinner size={48} /></div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 12px 24px rgba(220,38,38,0.2)' }}>
          <Plane size={26} style={{ color: '#fff' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 950, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{t('Leave Management')}</h1>
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>
            {t('Review, approve or deny leave requests across the organization (including Team Leaders).')}
          </p>
        </div>
        <span style={{ marginInlineStart: 'auto', fontSize: 13, fontWeight: 900, color: '#94A3B8', background: '#fff', border: '1.5px solid #F1F5F9', padding: '8px 16px', borderRadius: 999 }}>
          {pendingCount} {t('pending')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
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
        <div style={{ maxWidth: 1000 }}>
          {renderSection(t('Team Leader Requests'), tlRequests, '#7C3AED')}
          {renderSection(t('Employee Requests'), employeeRequests, 'var(--red-600)')}
        </div>
      )}
    </div>
  );
}
