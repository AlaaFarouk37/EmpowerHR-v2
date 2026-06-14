import { useEffect, useMemo, useState } from 'react';
import { hrGetReviews, hrGetEmployees, hrGetTeamOptions } from '../../api/index.js';
import { Badge, Spinner, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import {
  Search,
  Star,
  CheckCircle,
  AlertCircle,
  Target,
  Briefcase,
  Users,
} from 'lucide-react';

const STATUS_COLORS = { Acknowledged: 'green', Submitted: 'blue', Draft: 'gray' };

export function HRReviewsPage() {
  const toast = useToast();
  const { t } = useLanguage();

  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [teamOptions, setTeamOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    try {
      const [reviewData, employeeData, teamData] = await Promise.all([
        hrGetReviews(),
        hrGetEmployees().catch(() => []),
        hrGetTeamOptions().catch(() => []),
      ]);
      setReviews(Array.isArray(reviewData) ? reviewData : []);
      setEmployees(Array.isArray(employeeData) ? employeeData : []);
      setTeamOptions(Array.isArray(teamData) ? teamData : []);
    } catch (error) {
      toast('Failed to load performance reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReviews(); }, []);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => !searchQuery
      || r.employeeName?.toLowerCase().includes(searchQuery.toLowerCase())
      || r.department?.toLowerCase().includes(searchQuery.toLowerCase())
      || r.team?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [reviews, searchQuery]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((acc, r) => acc + Number(r.overallRating || 0), 0) / total : 0;
    const highPerformers = reviews.filter((r) => Number(r.overallRating) >= 4).length;
    const pending = reviews.filter((r) => r.status !== 'Acknowledged').length;
    return [
      { label: 'Average Rating', value: avg ? `${avg.toFixed(1)}/5` : '—', icon: Star, color: 'var(--red-600)', bg: 'var(--red-50)' },
      { label: 'Total Reviews', value: String(total), icon: Target, color: '#1E293B', bg: '#F8FAFC' },
      { label: 'High Performers', value: String(highPerformers), icon: CheckCircle, color: 'var(--red-800)', bg: 'var(--red-50)' },
      { label: 'Pending Acknowledgement', value: String(pending), icon: AlertCircle, color: 'var(--pink-600)', bg: 'var(--pink-50)' },
    ];
  }, [reviews]);

  const teamCards = useMemo(() => {
    // Latest review per employee (by review date, falling back to created date).
    const reviewByEmployee = new Map();
    reviews.forEach((r) => {
      const ts = new Date(r.reviewDate || r.createdAt || 0).getTime();
      const prev = reviewByEmployee.get(r.employeeID);
      if (!prev || ts >= prev._ts) reviewByEmployee.set(r.employeeID, { ...r, _ts: ts });
    });

    // employee.team is a FK id; resolve it to the team name from the options list.
    const teamIdToName = new Map(teamOptions.map((tm) => [String(tm.team_id), tm.name]));
    const resolveTeamName = (value) => {
      if (value === null || value === undefined || value === '') return 'Unassigned';
      return teamIdToName.get(String(value)) || String(value);
    };

    // Only individual contributors are reviewed; leaders/managers/admins are not.
    const NON_REVIEWED_ROLES = ['TeamLeader', 'HRManager', 'Admin'];
    const map = new Map();
    employees.filter((e) => !e.isDeleted && !NON_REVIEWED_ROLES.includes(e.role)).forEach((e) => {
      const teamName = resolveTeamName(e.team);
      const entry = map.get(teamName) || { team: teamName, members: [] };
      const review = reviewByEmployee.get(e.employeeID);
      entry.members.push({
        employeeID: e.employeeID,
        name: e.fullName || e.employeeID,
        reviewed: Boolean(review),
        rating: review ? Number(review.overallRating || 0) : null,
        status: review ? review.status : null,
      });
      map.set(teamName, entry);
    });

    return Array.from(map.values())
      .map((entry) => {
        const reviewed = entry.members.filter((m) => m.reviewed);
        const ratingSum = reviewed.reduce((acc, m) => acc + (m.rating || 0), 0);
        return {
          ...entry,
          members: entry.members.sort((a, b) => (b.rating || 0) - (a.rating || 0)),
          count: entry.members.length,
          reviewedCount: reviewed.length,
          notReviewedCount: entry.members.length - reviewed.length,
          high: reviewed.filter((m) => (m.rating || 0) >= 4).length,
          avg: reviewed.length ? ratingSum / reviewed.length : 0,
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [reviews, employees, teamOptions]);

  const getScoreColor = (score) => {
    if (score >= 4.5) return 'var(--red-800)';
    if (score >= 3.5) return 'var(--red-600)';
    return '#64748B';
  };

  if (loading) return (
    <div style={{ height: '80vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, margin: '0 auto 24px', border: '3px solid var(--red-100)', borderTopColor: 'var(--red-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B', letterSpacing: '0.1em' }}>CALIBRATING EXCELLENCE MATRIX...</div>
      </div>
    </div>
  );

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}>
              <Star size={22} style={{ color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0, letterSpacing: '-0.02em' }}>{t('Performance Insights')}</h1>
          </div>
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>
            {t('Read-only view of how each team is performing. Reviews are authored by team leaders for their own members.')}
          </p>
        </div>
        <Badge label={t('Read-only')} color="gray" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, color: s.color, display: 'grid', placeItems: 'center' }}>
              <s.icon size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(s.label)}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: '24px 28px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Users size={18} style={{ color: 'var(--red-600)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1E293B', margin: 0 }}>{t('How each team is doing')}</h2>
        </div>
        {teamCards.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>{t('No teams yet.')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {teamCards.map((team) => (
              <div key={team.team} style={{ border: '1.5px solid #F1F5F9', borderRadius: 18, padding: '18px 20px', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{team.team}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: getScoreColor(team.avg) }}>{team.avg ? team.avg.toFixed(1) : '—'}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  <Badge label={`${team.count} ${t('members')}`} color="gray" />
                  <Badge label={`${team.reviewedCount} ${t('reviewed')}`} color="green" />
                  <Badge label={`${team.notReviewedCount} ${t('not reviewed')}`} color={team.notReviewedCount ? 'orange' : 'green'} />
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {team.members.map((m) => (
                    <div key={m.employeeID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #F1F5F9', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                          {(m.name || 'U').charAt(0)}
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                      </div>
                      {m.reviewed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 900, color: getScoreColor(m.rating) }}>
                            <Star size={12} fill={getScoreColor(m.rating)} color={getScoreColor(m.rating)} />
                            {m.rating.toFixed(1)}
                          </div>
                          <Badge label={t(m.status)} color={STATUS_COLORS[m.status] || 'gray'} />
                        </div>
                      ) : (
                        <Badge label={t('Not reviewed')} color="gray" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 24, border: '1.5px solid #F1F5F9', marginBottom: 24 }}>
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder={t('Search by name, team or department...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ height: 44, padding: '0 16px 0 48px', borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', fontSize: 13, fontWeight: 600, width: '100%', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 32, border: '1.5px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #F1F5F9' }}>
              {['Employee', 'Team', 'Review Cycle', 'Rating', 'Status'].map((h) => (
                <th key={h} style={{ padding: '20px 32px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredReviews.map((rev) => (
              <tr key={rev.reviewID} style={{ borderBottom: '1px solid #F1F5F9' }} className="review-row">
                <td style={{ padding: '22px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-50)', display: 'grid', placeItems: 'center', color: 'var(--red-600)', border: '1px solid var(--red-100)', fontSize: 16, fontWeight: 900 }}>
                      {(rev.employeeName || 'U').charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#1E293B' }}>{rev.employeeName || rev.employeeID}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 800 }}>{rev.department || '—'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '22px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', fontWeight: 700 }}>
                    <Briefcase size={14} style={{ color: 'var(--red-600)' }} />
                    {rev.team || '—'}
                  </div>
                </td>
                <td style={{ padding: '22px 32px' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{rev.reviewPeriod}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase' }}>{rev.reviewType}</div>
                </td>
                <td style={{ padding: '22px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: getScoreColor(rev.overallRating) }}>{Number(rev.overallRating).toFixed(1)}</div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} fill={s <= rev.overallRating ? getScoreColor(rev.overallRating) : 'none'} color={s <= rev.overallRating ? getScoreColor(rev.overallRating) : '#E2E8F0'} />
                      ))}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '22px 32px' }}>
                  <Badge label={t(rev.status)} color={STATUS_COLORS[rev.status] || 'gray'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .review-row:hover { background: #FBFBFF; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
