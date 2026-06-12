import { useEffect, useState } from 'react';
import { getTeamTimeCorrections, reviewTimeCorrection } from '../../api/index.js';
import { LeaderPortalLayout, Btn, Badge, Spinner, Input, Textarea, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { Clock, Check, X, CalendarClock, User } from 'lucide-react';

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function LeaderAttendanceCorrectionsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTeamTimeCorrections();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error.message || t('Failed to load correction requests'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <LeaderPortalLayout><div style={{ height: '50vh', display: 'grid', placeItems: 'center' }}><Spinner size={48} /></div></LeaderPortalLayout>;
  }

  return (
    <LeaderPortalLayout>
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center' }}>
          <CalendarClock size={24} style={{ color: '#fff' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('Attendance Corrections')}</h2>
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, margin: '4px 0 0' }}>
            {t('Review, edit, approve or deny time-correction requests from your team.')}
          </p>
        </div>
        <span style={{ marginInlineStart: 'auto', fontSize: 13, fontWeight: 900, color: '#94A3B8', background: '#F1F5F9', padding: '6px 14px', borderRadius: 999 }}>
          {requests.length} {t('pending')}
        </span>
      </div>

      {requests.length === 0 ? (
        <div style={{ padding: 56, textAlign: 'center', background: '#fff', borderRadius: 24, border: '1.5px solid #F1F5F9' }}>
          <Check size={44} color="#10B981" style={{ marginBottom: 16 }} />
          <p style={{ color: '#64748B', fontWeight: 700, margin: 0 }}>{t('No pending correction requests.')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 18 }}>
          {requests.map((req) => <CorrectionCard key={req.correctionID} request={req} onReviewed={load} t={t} toast={toast} />)}
        </div>
      )}
    </LeaderPortalLayout>
  );
}

function CorrectionCard({ request, onReviewed, t, toast }) {
  const [clockIn, setClockIn] = useState(toLocalInput(request.requestedClockIn));
  const [clockOut, setClockOut] = useState(toLocalInput(request.requestedClockOut));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const review = async (action) => {
    if (action === 'approve' && !clockIn && !clockOut) {
      return toast(t('Set a clock in and/or clock out time before approving.'), 'error');
    }
    setBusy(true);
    try {
      const payload = { action, reviewNote: note.trim() };
      if (action === 'approve') {
        payload.requestedClockIn = clockIn ? new Date(clockIn).toISOString() : null;
        payload.requestedClockOut = clockOut ? new Date(clockOut).toISOString() : null;
      }
      await reviewTimeCorrection(request.correctionID, payload);
      toast(action === 'approve' ? t('Correction approved and applied.') : t('Correction denied.'), 'success');
      onReviewed?.();
    } catch (error) {
      toast(error?.response?.data?.error || error.message || t('Failed to review request'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const dateLabel = new Date(request.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #F1F5F9', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', border: '1px solid var(--red-100)' }}>
            <User size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{request.employeeName}</div>
            <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700 }}>{dateLabel}</div>
          </div>
        </div>
        <Badge label={t('Pending')} color="orange" />
      </div>

      {/* Current vs requested */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 14px', border: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 10.5, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>{t('Current')}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 800, color: '#475569' }}>
            <span><Clock size={13} style={{ verticalAlign: -2 }} /> {t('In')} {toTime(request.currentClockIn)}</span>
            <span>{t('Out')} {toTime(request.currentClockOut)}</span>
          </div>
        </div>
        <div style={{ background: '#FEF2F2', borderRadius: 12, padding: '12px 14px', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: 10.5, fontWeight: 900, color: '#DC2626', textTransform: 'uppercase', marginBottom: 6 }}>{t('Requested')}</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 800, color: '#991B1B' }}>
            <span><Clock size={13} style={{ verticalAlign: -2 }} /> {t('In')} {toTime(request.requestedClockIn)}</span>
            <span>{t('Out')} {toTime(request.requestedClockOut)}</span>
          </div>
        </div>
      </div>

      {request.reason && (
        <div style={{ fontSize: 13.5, color: '#64748B', fontWeight: 600, lineHeight: 1.6, marginBottom: 16 }}>
          <strong style={{ color: '#1E293B' }}>{t('Reason')}:</strong> {request.reason}
        </div>
      )}

      {/* Editable times (TL may adjust before approving) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Input label={t('Apply Clock In')} type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
        <Input label={t('Apply Clock Out')} type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
      </div>
      <Textarea label={t('Review Note (optional)')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Add a note for the employee...')} style={{ minHeight: 70 }} />

      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
        <Btn onClick={() => review('deny')} loading={busy} variant="ghost" style={{ flex: 1 }}>
          <X size={16} style={{ marginRight: 8 }} /> {t('Deny')}
        </Btn>
        <Btn onClick={() => review('approve')} loading={busy} style={{ flex: 1, background: '#16A34A', border: 'none', fontWeight: 900 }}>
          <Check size={16} style={{ marginRight: 8 }} /> {t('Approve & Apply')}
        </Btn>
      </div>
    </div>
  );
}
