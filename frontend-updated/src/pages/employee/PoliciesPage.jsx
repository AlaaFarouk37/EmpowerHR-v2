import { useEffect, useMemo, useState } from 'react';
import { acknowledgeMyPolicy, getMyPolicies } from '../../api/index.js';
import { Badge, Btn, Spinner, Textarea, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';

const STATUS_COLORS = {
  Draft: 'gray',
  Published: 'orange',
  Acknowledged: 'green',
};

const daysUntilDate = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
};

const getPolicyWindowLabel = (value, t) => {
  const days = daysUntilDate(value);
  if (!Number.isFinite(days)) return t('No effective date');
  if (days < 0) return `${Math.abs(days)} ${t('days active')}`;
  if (days === 0) return t('Effective today');
  if (days === 1) return t('Effective tomorrow');
  return `${days} ${t('days until effective')}`;
};

const getPolicyTone = (item) => {
  const days = daysUntilDate(item?.effectiveDate);
  if (item?.status === 'Acknowledged') return 'green';
  if (item?.status === 'Published' && days < 0) return 'red';
  if (item?.status === 'Published' && days <= 7) return 'orange';
  return STATUS_COLORS[item?.status] || 'gray';
};

export function EmployeePoliciesPage() {
  const toast = useToast();
  const { t } = useLanguage();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [notes, setNotes] = useState({});

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await getMyPolicies();
      const list = Array.isArray(data) ? data : [];
      setPolicies(list);
      const nextNotes = {};
      list.forEach((item) => {
        nextNotes[item.policyID] = '';
      });
      setNotes(nextNotes);
    } catch (error) {
      toast(error.message || 'Failed to load policy feed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const stats = useMemo(() => ({
    total: policies.length,
    published: policies.filter((item) => item.status === 'Published').length,
    acknowledged: policies.filter((item) => item.status === 'Acknowledged').length,
  }), [policies]);

  const dueSoonCount = policies.filter((item) => item.status === 'Published' && Number.isFinite(daysUntilDate(item.effectiveDate)) && daysUntilDate(item.effectiveDate) <= 7).length;
  const overdueAckCount = policies.filter((item) => item.status === 'Published' && Number.isFinite(daysUntilDate(item.effectiveDate)) && daysUntilDate(item.effectiveDate) < 0).length;
  const recentPolicyCount = policies.filter((item) => Number.isFinite(daysUntilDate(item.effectiveDate)) && Math.abs(daysUntilDate(item.effectiveDate)) <= 30).length;

  const policyFocusQueue = useMemo(() => {
    const statusRank = { Published: 3, Acknowledged: 2, Draft: 1 };
    return [...policies]
      .sort((a, b) => (statusRank[b.status] || 0) - (statusRank[a.status] || 0)
        || daysUntilDate(a.effectiveDate) - daysUntilDate(b.effectiveDate)
        || String(a.title || '').localeCompare(String(b.title || '')))
      .slice(0, 4);
  }, [policies]);

  const audiencePressureMap = useMemo(() => {
    const grouped = policies.reduce((acc, item) => {
      const key = item.audience || 'All Employees';
      if (!acc[key]) {
        acc[key] = { audience: key, count: 0, publishedCount: 0, acknowledgedCount: 0, dueSoonCount: 0 };
      }
      acc[key].count += 1;
      if (item.status === 'Published') acc[key].publishedCount += 1;
      if (item.status === 'Acknowledged') acc[key].acknowledgedCount += 1;
      if (item.status === 'Published' && Number.isFinite(daysUntilDate(item.effectiveDate)) && daysUntilDate(item.effectiveDate) <= 7) {
        acc[key].dueSoonCount += 1;
      }
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => b.publishedCount - a.publishedCount || b.dueSoonCount - a.dueSoonCount || b.count - a.count)
      .slice(0, 4);
  }, [policies]);

  const policyPlaybook = useMemo(() => {
    const plays = [];

    if (overdueAckCount > 0) {
      plays.push({
        title: t('Acknowledge overdue policies first'),
        note: t('Published policies that are already active deserve the fastest response because they often affect current work rules.'),
      });
    }
    if (dueSoonCount > 0) {
      plays.push({
        title: t('Review upcoming policy changes'),
        note: t('Policies becoming effective soon are the best place to check instructions and ask questions early.'),
      });
    }
    if (stats.published > 0) {
      plays.push({
        title: t('Keep acknowledgment notes clear'),
        note: t('Short notes help HR know you reviewed the announcement and any follow-up is understood.'),
      });
    }
    if (recentPolicyCount > 0) {
      plays.push({
        title: t('Stay current on recent updates'),
        note: t('Recently issued policies are easier to absorb when you review them in the same update cycle.'),
      });
    }

    return plays.length ? plays.slice(0, 4) : [{
      title: t('Policy flow looks stable'),
      note: t('Your policy feed looks steady right now, so keep reviewing updates as they are published.'),
    }];
  }, [dueSoonCount, overdueAckCount, recentPolicyCount, stats.published, t]);

  const strongestSignal = overdueAckCount > 0
    ? t('Some published policies are already active and still need acknowledgement, making compliance timing the clearest priority.')
    : dueSoonCount > 0
      ? t('A few policy items are nearing their effective date, so reviewing them now is the best next move.')
      : stats.published > 0
        ? t('There are open policy announcements waiting for acknowledgment, so steady follow-through remains the main focus.')
        : t('Your policy feed looks stable right now, with no major acknowledgement pressure standing out.');

  const handleAcknowledge = async (policyID) => {
    setSavingId(policyID);
    try {
      await acknowledgeMyPolicy(policyID, { note: notes[policyID] || '' });
      toast('Policy acknowledged');
      await loadPolicies();
    } catch (error) {
      toast(error.message || 'Failed to acknowledge policy', 'error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="hr-page-shell" style={{ background: 'var(--neural-black)', minHeight: '100vh', color: 'white', padding: '40px 32px' }}>
      <div className="hr-page-header" style={{ marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 24 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, fontFamily: 'var(--serif)', letterSpacing: '-0.02em' }}>{t('Policy Feed')}</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          {t('Review policy updates and acknowledge that you have read each announcement.')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
        {[
          { label: t('Total Items'), value: stats.total, accent: 'white' },
          { label: t('Published'), value: stats.published, accent: 'var(--neural-red)' },
          { label: t('Acknowledged'), value: stats.acknowledged, accent: 'var(--neural-pink)' },
        ].map((card) => (
          <div key={card.label} className="hr-stat-card glass-card" style={{ padding: '24px 32px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: card.accent, letterSpacing: '-0.03em' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="hr-panel-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 32, marginBottom: 32 }}>
        <div style={{ display: 'grid', gap: 24 }}>
          <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-pink)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>{t('Policy Compliance Radar')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[
                { label: t('Due Soon'), value: dueSoonCount, color: 'var(--neural-red)', note: t('Effective in the next week.') },
                { label: t('Active Now'), value: overdueAckCount, color: 'var(--neural-red)', note: t('Still need acknowledgment.') },
                { label: t('Recent'), value: recentPolicyCount, color: 'var(--neural-indigo)', note: t('Issued in current window.') },
                { label: t('Acknowledged'), value: stats.acknowledged, color: 'var(--neural-pink)', note: t('Already confirmed.') },
              ].map((item) => (
                <div key={item.label} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>{item.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.4 }}>{item.note}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, borderRadius: 16, border: '1px solid rgba(220, 38, 38, 0.2)', background: 'rgba(220, 38, 38, 0.05)', padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--neural-red)', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Compliance Intelligence')}</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: 500, lineHeight: 1.5 }}>{strongestSignal}</div>
            </div>
          </div>

          <div className="hr-table-card glass-card" style={{ overflow: 'hidden', borderRadius: 24 }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>{t('Priority Acknowledgement Queue')}</h3>
            </div>
            {policyFocusQueue.length === 0 ? (
              <div className="hr-soft-empty" style={{ padding: 48, textAlign: 'center' }}>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.3)', margin: 0, fontWeight: 500 }}>{t('No priority policy items found.')}</p>
              </div>
            ) : (
              <div style={{ padding: 12 }}>
                {policyFocusQueue.map((item) => (
                  <div key={`queue-${item.policyID}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', padding: '16px 20px', borderRadius: 16, transition: 'all 0.2s' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{t(item.category)} • {t(item.audience)}</div>
                      <div style={{ fontSize: 12, color: 'var(--neural-pink)', fontWeight: 600, marginTop: 4 }}>{getPolicyWindowLabel(item.effectiveDate, t)}</div>
                    </div>
                    <Badge label={t(item.status)} color={getPolicyTone(item) === 'red' ? 'red' : 'accent'} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-violet)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>{t('Policy Playbook')}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {policyPlaybook.map((item) => (
                <div key={item.title} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ fontWeight: 800, color: 'white', fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8, lineHeight: 1.5 }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--neural-indigo)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>{t('Audience Pressure')}</div>
            {audiencePressureMap.length === 0 ? (
              <div className="hr-soft-empty" style={{ padding: 32, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{t('No audience signals found.')}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {audiencePressureMap.map((item) => (
                  <div key={item.audience} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{t(item.audience)}</div>
                      <Badge label={`${item.count} ${t('policies')}`} color="accent" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{t('Published')}</div>
                        <div style={{ fontWeight: 900, color: 'var(--neural-red)', fontSize: 16 }}>{item.publishedCount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{t('Due Soon')}</div>
                        <div style={{ fontWeight: 900, color: 'var(--neural-red)', fontSize: 16 }}>{item.dueSoonCount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{t('Acked')}</div>
                        <div style={{ fontWeight: 900, color: 'var(--neural-pink)', fontSize: 16 }}>{item.acknowledgedCount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spinner /></div>
      ) : policies.length === 0 ? (
        <div className="hr-soft-empty glass-card" style={{ textAlign: 'center', padding: 80, borderRadius: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'white', marginBottom: 8 }}>{t('No policies available')}</p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)' }}>{t('HR will publish announcements here.')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {policies.map((item) => (
            <div key={item.policyID} className="hr-surface-card glass-card" style={{ padding: 32, borderRadius: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, fontFamily: 'var(--serif)' }}>{item.title}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    {t(item.category)} • {t(item.audience)} • {t('Effective')} {item.effectiveDate || t('TBA')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <Badge label={getPolicyWindowLabel(item.effectiveDate, t)} color={getPolicyTone(item) === 'red' ? 'red' : 'accent'} />
                  <Badge label={t(item.status)} color={getPolicyTone(item) === 'red' ? 'red' : 'accent'} />
                </div>
              </div>

              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 32, lineHeight: 1.7, fontWeight: 400 }}>{item.content}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'end', background: 'rgba(255,255,255,0.02)', padding: 32, borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
                <Textarea
                  label={t('Acknowledgment Note')}
                  value={notes[item.policyID] || ''}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [item.policyID]: e.target.value }))}
                  placeholder={t('Optional note to HR')}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                />
                <Btn 
                  onClick={() => handleAcknowledge(item.policyID)} 
                  disabled={savingId === item.policyID}
                  style={{ height: '48px', padding: '0 32px', borderRadius: '14px', background: 'var(--neural-gradient)', border: 'none' }}
                >
                  {savingId === item.policyID ? t('Saving...') : t('Acknowledge')}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
