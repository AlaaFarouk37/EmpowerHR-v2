import { useEffect, useState } from 'react';
import { getMyReviews } from '../../api/index.js';
import { Badge, Spinner } from '../../components/shared/index.jsx';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ClipboardList, MessageSquare } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function EmployeeReviewsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.employee_id) return;
      setLoading(true);
      try {
        const data = await getMyReviews(user.employee_id);
        const list = Array.isArray(data) ? data : [];
        // Only reviews the team leader has actually shared (hide unfinished drafts).
        setReviews(list.filter((review) => review.status !== 'Draft'));
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.employee_id]);

  // The notes the team leader wrote — deliberately excludes the rating.
  const notesFor = (review) => [
    { label: t('Strengths'), value: review.strengths },
    { label: t('Improvement Areas'), value: review.improvementAreas },
    { label: t('Goals Summary'), value: review.goalsSummary },
  ].filter((note) => String(note.value || '').trim());

  if (loading) return (
    <div style={{ height: '70vh', display: 'grid', placeItems: 'center' }}>
      <Spinner size="lg" color="var(--red-600)" />
    </div>
  );

  return (
    <div className="employee-portal-bg animate-fade-in" style={{ padding: '0 20px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('My Performance Reviews')}</h1>
          <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginTop: 4 }}>{t('Feedback your team leader shared with you.')}</p>
        </div>

        {reviews.length === 0 ? (
          <div className="glass-card-employee" style={{ padding: '60px', textAlign: 'center' }}>
            <ClipboardList size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E293B', margin: '0 0 4px' }}>{t('No reviews yet')}</h3>
            <p style={{ fontSize: 14, color: '#64748B', fontWeight: 600, margin: 0 }}>{t('Reviews shared by your team leader will appear here.')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {reviews.map((review) => {
              const notes = notesFor(review);
              return (
                <div key={review.reviewID} className="glass-card-employee" style={{ padding: '28px 32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Badge label={t(review.reviewType || 'General')} color="red" />
                      {review.reviewPeriod && <span style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{review.reviewPeriod}</span>}
                    </div>
                    {review.reviewDate && <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>{formatDate(review.reviewDate)}</span>}
                  </div>

                  {notes.length > 0 ? (
                    <div style={{ display: 'grid', gap: 18 }}>
                      {notes.map((note) => (
                        <div key={note.label}>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{note.label}</div>
                          <div style={{ fontSize: 14, color: '#475569', fontWeight: 500, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>
                      <MessageSquare size={16} /> {t('No notes were added to this review.')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
