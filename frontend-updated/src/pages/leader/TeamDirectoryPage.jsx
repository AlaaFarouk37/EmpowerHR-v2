import { useState, useEffect, useMemo } from 'react';
import {
  LeaderPortalLayout,
  Skeleton,
  useToast,
  Btn,
  Modal
} from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  MapPin,
  MoreHorizontal,
  Users,
  Activity,
  Zap,
  Globe,
  Briefcase
} from 'lucide-react';
import { hrGetEmployees } from '../../api/hr';

export function TeamDirectoryPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await hrGetEmployees();
        // The backend already scopes this endpoint to the TL's team (excluding themselves).
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map(m => {
          const name = m.fullName || m.full_name || m.name || m.email || 'Unnamed';
          const initials = String(name).trim().split(/\s+/).map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
          return {
            id: m.employeeID || m.employee_id,
            name,
            role: m.jobTitle || m.role || m.position || 'Team Member',
            jobLevel: m.jobLevel || '',
            email: m.email || '',
            phone: m.phoneNumber || '',
            department: m.department || '—',
            team: m.team || '—',
            location: m.location || m.department || '—',
            employmentStatus: m.employmentStatus || 'Active',
            employeeType: m.employeeType || '',
            joined: (m.hiring_date || m.date_joined || '').slice(0, 10),
            yearsAtCompany: m.yearsAtCompany ?? null,
            age: m.age ?? null,
            gender: m.gender || '',
            maritalStatus: m.maritalStatus || '',
            numberOfDependents: m.numberOfDependents ?? null,
            monthlyIncome: m.monthlyIncome ?? null,
            remoteWork: Boolean(m.remoteWork),
            avatar: initials,
          };
        });
        setMembers(mapped);
      } catch (error) {
        console.error('Error fetching team directory:', error);
        toast(t('Failed to sync team directory'), 'error');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, t, toast]);

  const compositionStats = useMemo(() => {
    return [
      { label: 'Total Nodes', value: members.length, icon: Users, color: 'var(--red-600)' },
      { label: 'Active Efficiency', value: '94.2%', icon: Activity, color: 'var(--red-800)' },
      { label: 'Skill Density', value: 'High', icon: Zap, color: 'var(--pink-500)' },
    ];
  }, [members]);

  const profileFields = (m) => {
    const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);
    return [
      [t('Employee ID'), dash(m.id)],
      [t('Job Title'), dash(m.role)],
      [t('Level'), dash(m.jobLevel)],
      [t('Email'), dash(m.email)],
      [t('Phone'), dash(m.phone)],
      [t('Department'), dash(m.department)],
      [t('Team'), dash(m.team)],
      [t('Location'), dash(m.location)],
      [t('Employment Status'), dash(m.employmentStatus)],
      [t('Employee Type'), dash(m.employeeType)],
      [t('Gender'), dash(m.gender)],
      [t('Marital Status'), dash(m.maritalStatus)],
      [t('Dependents'), dash(m.numberOfDependents)],
      [t('Age'), dash(m.age)],
      [t('Joined'), dash(m.joined)],
      [t('Years at Company'), m.yearsAtCompany != null ? `${m.yearsAtCompany}` : '—'],
      [t('Remote'), m.remoteWork ? t('Yes') : t('No')],
      [t('Monthly Income'), m.monthlyIncome != null ? `${m.monthlyIncome}` : '—'],
    ];
  };

  if (loading || authLoading) {
    return (
      <LeaderPortalLayout>
        <div style={{ padding: 40 }}>
           <Skeleton count={1} height={60} style={{ marginBottom: 40 }} />
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              <Skeleton count={6} height={200} />
           </div>
        </div>
      </LeaderPortalLayout>
    );
  }

  return (
    <LeaderPortalLayout>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-50)', display: 'grid', placeItems: 'center' }}>
                 <Users size={20} style={{ color: 'var(--red-600)' }} />
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0 }}>Team Command Directory</h2>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Real-time inventory of team talent, stability, and connectivity.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40 }}>
         {/* Main Content Area */}
         <div style={{ display: 'grid', gap: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
               {members.map((m, i) => (
                 <div key={i} style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32, transition: 'all 0.2s', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                       <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                          <div style={{
                            width: 60, height: 60, borderRadius: 18, background: 'var(--red-50)',
                            display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900, color: 'var(--red-600)',
                            border: '1px solid var(--red-100)'
                          }}>
                             {m.avatar}
                          </div>
                          <div>
                             <div style={{ fontSize: 18, fontWeight: 900, color: '#1E293B' }}>{m.name}</div>
                             <div style={{ fontSize: 13, color: 'var(--red-600)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Briefcase size={12} />
                                {m.role}
                             </div>
                          </div>
                       </div>
                       <button style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><MoreHorizontal size={20} /></button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                       <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Department')}</div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{m.department}</div>
                          {m.team && m.team !== '—' && (
                             <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginTop: 6 }}>{t('Team')}: {m.team}</div>
                          )}
                       </div>
                       <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 20, border: '1px solid #F1F5F9' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{t('Joined')}</div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{m.joined || '—'}</div>
                          {m.yearsAtCompany != null && (
                             <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginTop: 6 }}>{m.yearsAtCompany} {t('yrs')}</div>
                          )}
                       </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                       {m.employmentStatus && (
                         <span style={{ padding: '6px 12px', background: m.employmentStatus === 'Active' ? '#ECFDF5' : '#FFF7ED', color: m.employmentStatus === 'Active' ? '#059669' : '#B54708', borderRadius: 10, fontSize: 11, fontWeight: 800 }}>{m.employmentStatus}</span>
                       )}
                       {m.employeeType && (
                         <span style={{ padding: '6px 12px', background: '#fff', border: '1.5px solid #F1F5F9', borderRadius: 10, fontSize: 11, fontWeight: 800, color: '#64748B' }}>{m.employeeType}</span>
                       )}
                       {m.location && m.location !== '—' && (
                         <span style={{ padding: '6px 12px', background: '#fff', border: '1.5px solid #F1F5F9', borderRadius: 10, fontSize: 11, fontWeight: 800, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                           <MapPin size={11} /> {m.location}
                         </span>
                       )}
                       {m.remoteWork && (
                         <span style={{ padding: '6px 12px', background: 'var(--red-50)', borderRadius: 10, fontSize: 11, fontWeight: 800, color: 'var(--red-600)' }}>{t('Remote')}</span>
                       )}
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                       <Btn variant="primary" onClick={() => setSelected(m)} style={{ flex: 1, height: 44, borderRadius: 12, background: '#1E293B', border: 'none' }}>{t('View Detailed Profile')}</Btn>
                       <Btn
                         variant="secondary"
                         onClick={() => { if (m.email) window.location.href = `mailto:${m.email}`; }}
                         disabled={!m.email}
                         title={m.email ? `${t('Email')} ${m.email}` : t('No email on file')}
                         style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', opacity: m.email ? 1 : 0.5 }}
                       >
                         <Mail size={18} />
                       </Btn>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Sidebar: Composition & Skill Cloud */}
         <div style={{ display: 'grid', gap: 32, alignContent: 'start' }}>
            {/* Composition Stats */}
            <div style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32 }}>
               <h4 style={{ fontSize: 16, fontWeight: 900, marginBottom: 24 }}>Workforce Composition</h4>
               <div style={{ display: 'grid', gap: 20 }}>
                  {compositionStats.map(s => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--red-50)', display: 'grid', placeItems: 'center' }}>
                             <s.icon size={16} style={{ color: s.color }} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>{t(s.label)}</span>
                       </div>
                       <span style={{ fontSize: 16, fontWeight: 900, color: '#1E293B' }}>{s.value}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Neural Skill Cloud */}
            <div style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)', borderRadius: 28, padding: 32, color: 'white' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 900, color: 'var(--red-500)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>Neural Skill Cloud</h4>
                  <Zap size={18} style={{ color: 'var(--red-600)' }} />
               </div>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {['React', 'TypeScript', 'Node.js', 'Figma', 'UI/UX', 'Python', 'AWS', 'Agile', 'PostgreSQL'].map(skill => (
                    <span key={skill} style={{ fontSize: 11, fontWeight: 800, color: '#fff', padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }}>{skill}</span>
                  ))}
               </div>
               <Btn variant="secondary" style={{ width: '100%', marginTop: 24, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {t('Expand Inventory')}
               </Btn>
            </div>

            {/* Geographic Distribution */}
            <div style={{ background: '#fff', borderRadius: 28, border: '1.5px solid #F1F5F9', padding: 32 }}>
               <h4 style={{ fontSize: 16, fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Globe size={18} style={{ color: 'var(--red-600)' }} />
                  Geo-distribution
               </h4>
               <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600, lineHeight: 1.6, marginBottom: 20 }}>Your team is 60% Remote across 3 time zones.</p>
               <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { label: 'Remote (GMT+8)', count: 2 },
                    { label: 'HQ (Hybrid)', count: 3 },
                    { label: 'Remote (GMT-5)', count: 1 },
                  ].map(loc => (
                    <div key={loc.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                       <span style={{ color: '#64748B' }}>{loc.label}</span>
                       <span style={{ color: '#1E293B' }}>{loc.count}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Detailed profile modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t('Employee Profile')}
        maxWidth={640}
      >
        {selected && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--red-50)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900, color: 'var(--red-600)', border: '1px solid var(--red-100)' }}>
                {selected.avatar}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#1E293B' }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: 'var(--red-600)', fontWeight: 800 }}>
                  {selected.role}{selected.jobLevel ? ` · ${selected.jobLevel}` : ''}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {profileFields(selected).map(([label, value]) => (
                <div key={label} style={{ background: '#F8FAFC', borderRadius: 14, border: '1px solid #F1F5F9', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1E293B', wordBreak: 'break-word' }}>{value}</div>
                </div>
              ))}
            </div>

            {selected.email && (
              <Btn
                variant="primary"
                onClick={() => { window.location.href = `mailto:${selected.email}`; }}
                style={{ width: '100%', marginTop: 20, height: 44, borderRadius: 12, background: 'var(--red-600)', border: 'none' }}
              >
                <Mail size={16} style={{ marginRight: 8 }} /> {t('Email')} {selected.name}
              </Btn>
            )}
          </div>
        )}
      </Modal>
    </LeaderPortalLayout>
  );
}
