import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LeaderPortalLayout, Badge, Btn, Spinner, useToast, Input, Textarea, Modal, EmployeeSelect,
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { getTeamReviews, createTeamReview } from '../../api/index.js';
import { Star, Plus, Briefcase, Calendar } from 'lucide-react';

const EMPTY = { employeeID: '', reviewPeriod: '', reviewType: 'Quarterly', overallRating: 4, strengths: '', improvementAreas: '', goalsSummary: '', reviewDate: '' };

const STATUS_COLORS = { Acknowledged: 'green', Submitted: 'blue', Draft: 'gray' };

export function TeamReviewsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeamReviews();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      toast(error?.message || t('Failed to load team reviews'), 'error');
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.employeeID) { toast(t('Please select a team member'), 'error'); return; }
    if (!form.reviewPeriod.trim()) { toast(t('Review period is required'), 'error'); return; }
    const rating = Number(form.overallRating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { toast(t('Rating must be 1-5'), 'error'); return; }

    const payload = { ...form, overallRating: rating };
    if (!payload.reviewDate) delete payload.reviewDate;
    setSaving(true);
    try {
      await createTeamReview(payload);
      toast(t('Review submitted'), 'success');
      setOpen(false);
      setForm(EMPTY);
      await load();
    } catch (error) {
      toast(error?.message || t('Failed to submit review'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((acc, r) => acc + Number(r.overallRating || 0), 0) / reviews.length;
  }, [reviews]);

  if (loading) return (
    <LeaderPortalLayout>
      <div style={{ height: '60vh', display: 'grid', placeItems: 'center' }}><Spinner size={40} /></div>
    </LeaderPortalLayout>
  );

  return (
    <LeaderPortalLayout>
      <div className="page-content animate-in" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--red-600)', display: 'grid', placeItems: 'center' }}>
                <Star size={20} style={{ color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{t('Team Performance Reviews')}</h1>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--gray-500)', margin: 0 }}>
              {t('Give performance reviews to your team members. Reviews appear in HR insights and in each member’s profile.')}
            </p>
          </div>
          <Btn variant="primary" onClick={() => { setForm(EMPTY); setOpen(true); }} style={{ height: 44, borderRadius: 12, fontWeight: 800, background: 'var(--red-600)', border: 'none' }}>
            <Plus size={18} style={{ marginRight: 8 }} /> {t('Give Review')}
          </Btn>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div className="card" style={{ padding: '16px 20px', borderRadius: 16, minWidth: 180 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase' }}>{t('Total Reviews')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)' }}>{reviews.length}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px', borderRadius: 16, minWidth: 180 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--gray-500)', textTransform: 'uppercase' }}>{t('Average Rating')}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--red-600)' }}>{avgRating ? avgRating.toFixed(1) : '—'}<span style={{ fontSize: 13, color: 'var(--gray-400)' }}> / 5</span></div>
          </div>
        </div>

        <div className="card" style={{ borderRadius: 18, overflow: 'hidden', padding: 0 }}>
          {reviews.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--gray-500)', fontWeight: 600 }}>
              {t('No reviews yet. Use “Give Review” to evaluate a team member.')}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1.5px solid var(--border-primary)' }}>
                  {['Member', 'Period', 'Type', 'Rating', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => (
                  <tr key={rev.reviewID} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{rev.employeeName || rev.employeeID}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <Briefcase size={12} /> {rev.team || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>
                        <Calendar size={13} style={{ color: 'var(--gray-400)' }} /> {rev.reviewPeriod}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--gray-700)', fontWeight: 700 }}>{t(rev.reviewType)}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--red-600)' }}>{Number(rev.overallRating).toFixed(1)}</span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={13} fill={s <= rev.overallRating ? 'var(--red-600)' : 'none'} color={s <= rev.overallRating ? 'var(--red-600)' : '#E2E8F0'} />
                          ))}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge label={t(rev.status)} color={STATUS_COLORS[rev.status] || 'gray'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t('Give Performance Review')} maxWidth={620}>
        <EmployeeSelect
          label={t('Team Member')}
          value={form.employeeID}
          onChange={(val) => setForm((f) => ({ ...f, employeeID: val }))}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label={t('Review Period')} value={form.reviewPeriod} placeholder="Q2 2026" onChange={(e) => setForm((f) => ({ ...f, reviewPeriod: e.target.value }))} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('Review Type')}</label>
            <select value={form.reviewType} onChange={(e) => setForm((f) => ({ ...f, reviewType: e.target.value }))} className="inp">
              <option value="Quarterly">{t('Quarterly')}</option>
              <option value="Annual">{t('Annual')}</option>
              <option value="Probation">{t('Probation')}</option>
              <option value="Spot">{t('Spot')}</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input label={t('Overall Rating (1-5)')} type="number" min={1} max={5} value={form.overallRating} onChange={(e) => setForm((f) => ({ ...f, overallRating: e.target.value }))} />
          <Input label={t('Review Date')} type="date" value={form.reviewDate} onChange={(e) => setForm((f) => ({ ...f, reviewDate: e.target.value }))} />
        </div>
        <Textarea label={t('Strengths')} value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} />
        <Textarea label={t('Improvement Areas')} value={form.improvementAreas} onChange={(e) => setForm((f) => ({ ...f, improvementAreas: e.target.value }))} />
        <Textarea label={t('Goals Summary')} value={form.goalsSummary} onChange={(e) => setForm((f) => ({ ...f, goalsSummary: e.target.value }))} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => setOpen(false)}>{t('Cancel')}</Btn>
          <Btn variant="primary" loading={saving} onClick={handleCreate} style={{ background: 'var(--red-600)', border: 'none' }}>{t('Submit Review')}</Btn>
        </div>
      </Modal>
    </LeaderPortalLayout>
  );
}
