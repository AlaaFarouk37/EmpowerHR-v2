import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getJobs, getJobRanking, hrBulkUpdateSubmissions, hrAutomateJobRecruitment,
  hireCandidate, hrGetJobInsights, hrOptimizeJob, getTalentCloneSimilarity
} from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import {
  Search, TrendingUp, Shield, FileText, Star, Zap, Info, CheckCircle, XCircle,
  Clock, Sparkles, Target, Brain, Activity, ChevronDown, Layers, ShieldCheck,
  Send, Sliders, Filter, Eye, AlertCircle, Award, BookOpen, MessageSquare,
  BarChart3, Copy, Users, X, ArrowRightLeft, Flame, ZapOff, Briefcase, History,
  Download, ShieldAlert, Lightbulb, ArrowUpRight, Settings, Bell, Cpu, UserCheck,
  Ghost, UploadCloud, Radar, RefreshCw, Plus, FileEdit, Heart, Smile, Check,
  Trash2, Calendar, Briefcase as JobIcon, ChevronRight, ArrowUpDown, SortAsc,
  SortDesc, GraduationCap, Clock3, TrendingDown, AlertTriangle,
} from 'lucide-react';

/* ─── DESIGN TOKENS ─────────────────────────────────────────────────────────── */
const C = {
  red:     'var(--red-600, #DC2626)',
  redSoft: 'var(--red-50,  #FEF2F2)',
  blue:    '#2563EB',
  blueSoft:'#EFF6FF',
  green:   '#16A34A',
  greenSoft:'#F0FDF4',
  amber:   '#D97706',
  amberSoft:'#FFFBEB',
  purple:  '#7C3AED',
  purpleSoft:'#F5F3FF',
  slate:   '#64748B',
  navy:    '#1E293B',
  bg:      '#F8FAFC',
  border:  '#E2E8F0',
  card:    '#fff',
};

const DEGREE_ORDER = { Unknown: 0, 'High School': 1, Associate: 2, Bachelor: 3, Master: 4, PhD: 5 };

/* ─── HELPER: Score Ring ─────────────────────────────────────────────────────── */
const ScoreRing = ({ value = 0, size = 56, color }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  const ringColor = color || (value >= 75 ? C.green : value >= 55 ? C.amber : C.red);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ringColor} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fill: ringColor, fontSize: size * 0.25, fontWeight: 900, transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {Math.round(value)}
      </text>
    </svg>
  );
};

/* ─── HELPER: Mini Score Bar ─────────────────────────────────────────────────── */
const MiniBar = ({ label, value = 0, color = C.blue }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: C.slate, marginBottom: 3 }}>
      <span>{label}</span><span style={{ color }}>{Math.round(value)}%</span>
    </div>
    <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  </div>
);

/* ─── HELPER: Skill Radar ────────────────────────────────────────────────────── */
const SkillRadar = ({ scores = {} }) => {
  const size = 200;
  const center = size / 2;
  const radius = center * 0.68;
  const points = [
    { label: 'Semantic', val: scores.semantic_alignment || 0 },
    { label: 'Skills',   val: scores.skill_coverage    || 0 },
    { label: 'XP',       val: scores.experience_fit    || 0 },
    { label: 'Edu',      val: scores.education_fit     || 0 },
    { label: 'Concept',  val: scores.concept_coverage  || 0 },
  ];
  const getPoint = (i, total, val) => {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const dist = (val / 100) * radius;
    return [center + dist * Math.cos(angle), center + dist * Math.sin(angle)];
  };
  const polyPoints = points.map((p, i) => getPoint(i, points.length, p.val).join(',')).join(' ');
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {[33, 66, 100].map(v => (
          <polygon key={v}
            points={points.map((p, i) => getPoint(i, points.length, v).join(',')).join(' ')}
            fill="none" stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3,3" />
        ))}
        <polygon points={polyPoints} fill="rgba(220,38,38,0.1)" stroke={C.red} strokeWidth={2} />
        {points.map((p, i) => {
          const [lx, ly] = getPoint(i, points.length, 120);
          return <text key={i} x={lx} y={ly} fontSize={9} fontWeight={800} textAnchor="middle" fill={C.slate}>{p.label}</text>;
        })}
      </svg>
    </div>
  );
};

/* ─── HELPER: Cultural Trait Bar ─────────────────────────────────────────────── */
const TraitBar = ({ label, value = 0, color }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginBottom: 5, color: C.slate }}>
      <span style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ color }}>{value}%</span>
    </div>
    <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  </div>
);

/* ─── BADGE: Seniority ───────────────────────────────────────────────────────── */
const SENIORITY_CONFIG = {
  'Expert / Lead': { bg: '#FDF4FF', color: '#7E22CE', border: '#E9D5FF' },
  'Senior':        { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'Mid':           { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  'Junior':        { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
};
const SeniorityBadge = ({ tier }) => {
  const cfg = SENIORITY_CONFIG[tier] || SENIORITY_CONFIG['Junior'];
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 900, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {tier || 'Junior'}
    </span>
  );
};

/* ─── BADGE: Industry ────────────────────────────────────────────────────────── */
const INDUSTRY_COLORS = {
  'FinTech':      { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  'Healthcare':   { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  'E-commerce':   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'Cybersecurity':{ bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  'Cloud/SaaS':   { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' },
  'Data/AI':      { bg: '#ECFEFF', color: '#0E7490', border: '#A5F3FC' },
  'EdTech':       { bg: '#FFF7ED', color: '#B45309', border: '#FDE68A' },
  'Generalist':   { bg: '#F8FAFC', color: C.slate,   border: C.border  },
};
const IndustryBadge = ({ industry }) => {
  const cfg = INDUSTRY_COLORS[industry] || INDUSTRY_COLORS['Generalist'];
  return (
    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {industry || 'Generalist'}
    </span>
  );
};

/* ─── MODAL: JD Health Report ───────────────────────────────────────────────── */
const JDHealthModal = ({ isOpen, onClose, insights, isLoading, onOptimize }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'grid', placeItems: 'center', padding: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 600, background: C.card, borderRadius: 28, padding: 40, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF3C7', color: C.amber, display: 'grid', placeItems: 'center' }}><Lightbulb size={20} /></div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: C.navy, margin: 0 }}>Strategic JD Analysis</h3>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate }}>{insights?.job_title || 'Analyzing…'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spinner /><div style={{ marginTop: 12, fontWeight: 700, color: C.slate }}>Auditing Requisition…</div></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
              <div style={{ padding: 24, borderRadius: 20, background: C.bg, border: `1.5px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>JD Health</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: insights?.health_score > 70 ? C.green : C.amber }}>{insights?.health_score || 0}%</div>
              </div>
              <div style={{ padding: 24, borderRadius: 20, background: C.bg, border: `1.5px solid ${C.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>Elite Match Rate</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.navy }}>{insights?.metrics?.elite_match_rate || 0}%</div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 16, marginBottom: 32 }}>
              <label style={{ fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>Friction Points</label>
              {insights?.friction_points?.length > 0 ? insights.friction_points.map((fp, i) => (
                <div key={i} style={{ padding: '16px 20px', borderRadius: 16, background: fp.impact === 'High' ? '#FEF2F2' : '#FFFBEB', border: `1.5px solid ${fp.impact === 'High' ? '#FCA5A5' : '#FCD34D'}`, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 2, color: fp.impact === 'High' ? C.red : C.amber }}><AlertCircle size={18} /></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: C.navy }}>{fp.title}</div>
                    <div style={{ fontSize: 12, color: C.slate, fontWeight: 600, marginTop: 4 }}>{fp.detail}</div>
                    <div style={{ fontSize: 11, color: fp.impact === 'High' ? '#B91C1C' : '#92400E', fontWeight: 900, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Zap size={12} /> {fp.suggestion}
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ padding: 24, borderRadius: 16, border: `1.5px dashed ${C.border}`, textAlign: 'center', color: C.slate, fontSize: 13, fontWeight: 700 }}>No significant friction detected.</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Btn variant="secondary" onClick={onClose} style={{ flex: 1, borderRadius: 14 }}>Dismiss</Btn>
              {insights?.friction_points?.length > 0 && (
                <Btn onClick={() => onOptimize(insights.friction_points)} style={{ flex: 2, borderRadius: 14, background: C.red, border: 'none' }}>
                  <Sparkles size={18} style={{ marginRight: 8 }} /> Apply Neural Optimization
                </Btn>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ─── MODAL: Automation ─────────────────────────────────────────────────────── */
const AutomationModal = ({ isOpen, onClose, onDeploy, currentRules }) => {
  const [rules, setRules] = useState(currentRules || { type: 'percentile', value: 10, action: 'shortlist', mustHaveSkills: [], targetStage: 'Shortlisted' });
  const [skillInput, setSkillInput] = useState('');
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'grid', placeItems: 'center', padding: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 540, background: C.card, borderRadius: 28, padding: 40, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.redSoft, color: C.red, display: 'grid', placeItems: 'center' }}><Cpu size={20} /></div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: C.navy, margin: 0 }}>Neural Automation Protocol</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gap: 28 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 12 }}>Strategy</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[{ id: 'percentile', label: 'Top Percentile', icon: TrendingUp }, { id: 'fixed', label: 'Min Score', icon: Target }].map(opt => (
                <div key={opt.id} onClick={() => setRules({ ...rules, type: opt.id })}
                  style={{ padding: 16, borderRadius: 14, border: `2px solid ${rules.type === opt.id ? C.red : C.border}`, background: rules.type === opt.id ? C.redSoft : C.card, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><opt.icon size={16} color={rules.type === opt.id ? C.red : C.slate} /><div style={{ fontWeight: 900, fontSize: 13 }}>{opt.label}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>{rules.type === 'percentile' ? 'Top %' : 'Min Score'}</label>
              <span style={{ fontSize: 14, fontWeight: 950, color: C.red }}>{rules.value}{rules.type === 'percentile' ? '%' : ''}</span>
            </div>
            <input type="range" min="1" max="95" value={rules.value} onChange={e => setRules({ ...rules, value: parseInt(e.target.value) })} style={{ width: '100%', accentColor: C.red }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 10 }}>Anchor Skills</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input type="text" placeholder="Add required skill…" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && skillInput) { setRules({ ...rules, mustHaveSkills: [...rules.mustHaveSkills, skillInput] }); setSkillInput(''); } }}
                style={{ flex: 1, height: 40, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, padding: '0 14px', fontSize: 13, fontWeight: 600 }} />
              <Btn onClick={() => { if (skillInput) { setRules({ ...rules, mustHaveSkills: [...(rules.mustHaveSkills || []), skillInput] }); setSkillInput(''); } }} style={{ height: 40, borderRadius: 10 }}><Plus size={16} /></Btn>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(rules.mustHaveSkills || []).map((s, i) => <Badge key={i} label={s} color="red" size="sm" onClick={() => setRules({ ...rules, mustHaveSkills: rules.mustHaveSkills.filter((_, idx) => idx !== i) })} style={{ cursor: 'pointer' }} />)}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 10 }}>Target Stage</label>
            <select value={rules.targetStage} onChange={e => setRules({ ...rules, targetStage: e.target.value })}
              style={{ width: '100%', height: 42, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, padding: '0 12px', fontSize: 13, fontWeight: 700 }}>
              <option>Shortlisted</option><option>Interview</option><option>Technical Test</option><option>Rejected</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
          <Btn variant="secondary" onClick={onClose} style={{ flex: 1, borderRadius: 14 }}>Cancel</Btn>
          <Btn onClick={() => onDeploy(rules)} style={{ flex: 2, borderRadius: 14, background: C.red, border: 'none' }}><Zap size={18} style={{ marginRight: 8 }} /> Deploy Protocol</Btn>
        </div>
      </div>
    </div>
  );
};

/* ─── MODAL: Talent Clones ─────────────────────────────────────────────────── */
const TalentCloneModal = ({ isOpen, onClose, sourceCandidate, clones, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'grid', placeItems: 'center', padding: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 600, background: C.card, borderRadius: 28, padding: 40, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: C.blueSoft, color: C.blue, display: 'grid', placeItems: 'center' }}><Users size={20} /></div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: C.navy, margin: 0 }}>Talent Clones</h3>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate }}>Similar to {sourceCandidate?.candidate_name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spinner /><div style={{ marginTop: 12, fontWeight: 700, color: C.slate }}>Running Semantic Search…</div></div>
        ) : (
          <div style={{ display: 'grid', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
            {clones.length === 0 && <div style={{ textAlign: 'center', color: C.slate, padding: 20 }}>No clones found.</div>}
            {clones.map(c => (
              <div key={c.submission_id} style={{ padding: '16px 20px', borderRadius: 16, border: `1.5px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{c.candidate_name}</div>
                  <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>Applied for: {c.job_title}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                     {(c.skills || []).slice(0,4).map(s => <span key={s} style={{ padding: '2px 8px', borderRadius: 12, background: C.bg, fontSize: 10, fontWeight: 700 }}>{s}</span>)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: C.blue }}>{c.similarity_score}%</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.slate, textTransform: 'uppercase' }}>Match</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


/* ─── DRAWER: Detail Intelligence ──────────────────────────────────────────── */
const DetailDrawer = ({ isOpen, onClose, candidate }) => {
  const [tab, setTab] = useState('summary');
  const toast = useToast();
  if (!isOpen || !candidate) return null;

  const meta = candidate.profile_meta || {};
  const fraud = meta.fraud_detection || {};
  const factors = candidate.decision_factors || {};
  const breakdown = candidate.score_breakdown || {};
  const traits = candidate.cultural_traits || {};
  const evidence = candidate.evidence || [];

  const tabStyle = active => ({
    background: 'none', border: 'none', padding: '12px 4px', fontSize: 13, fontWeight: 900, cursor: 'pointer',
    color: active ? C.red : C.slate, borderBottom: active ? `3px solid ${C.red}` : '3px solid transparent',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 720, height: '100%', background: C.card, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '36px 40px 0', borderBottom: `1.5px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <SeniorityBadge tier={meta.seniority_tier} />
                <IndustryBadge industry={meta.industry_focus} />
                {fraud.is_padding_risk && (
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 900, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ShieldAlert size={10} /> Padding Risk
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: C.navy }}>{candidate.candidate_name}</h3>
              <div style={{ fontSize: 13, color: C.slate, fontWeight: 600, marginTop: 4 }}>
                {candidate.candidate_years_exp ? `${candidate.candidate_years_exp}y exp` : ''}{' '}
                {candidate.candidate_degree && candidate.candidate_degree !== 'Unknown' ? `· ${candidate.candidate_degree}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ScoreRing value={candidate.final_score || 0} size={68} />
              <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.slate }}><X size={24} /></button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {['summary', 'skills', 'profile', 'heatmap', 'email'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
                {t === 'summary' ? 'AI Analysis' : t === 'skills' ? 'Skills & Gap' : t === 'profile' ? 'Cultural Profile' : t === 'heatmap' ? 'CV Heatmap' : 'Email Draft'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>

          {/* Fraud Warning */}
          {fraud.is_padding_risk && (
            <div style={{ background: '#FEF2F2', padding: '14px 20px', borderRadius: 14, border: `1.5px solid #FCA5A5`, color: '#991B1B', marginBottom: 28, display: 'flex', gap: 12, alignItems: 'center' }}>
              <ShieldAlert size={20} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 900 }}>Keyword Padding Detected — Manual Verification Recommended</div>
                {fraud.context_free_skills?.length > 0 && (
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Skills listed without context: {fraud.context_free_skills.join(', ')}</div>
                )}
              </div>
            </div>
          )}

          {tab === 'summary' && (
            <div>
              {/* AI Reasoning */}
              <div style={{ background: C.redSoft, padding: 24, borderRadius: 20, marginBottom: 28, borderLeft: `4px solid ${C.red}` }}>
                <div style={{ fontSize: 10, fontWeight: 950, color: C.red, textTransform: 'uppercase', marginBottom: 8 }}>AI Reasoning Summary</div>
                <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.7, color: C.navy, margin: 0 }}>{candidate.semantic_analysis || 'No analysis available.'}</p>
              </div>

              {/* Score Breakdown Radar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 16 }}>Score Breakdown</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
                  <SkillRadar scores={breakdown} />
                  <div style={{ display: 'grid', gap: 10 }}>
                    <MiniBar label="Semantic"   value={breakdown.semantic_alignment || 0} color={C.red} />
                    <MiniBar label="Skills"     value={breakdown.skill_coverage    || 0} color={C.blue} />
                    <MiniBar label="Experience" value={breakdown.experience_fit    || 0} color={C.green} />
                    <MiniBar label="Education"  value={breakdown.education_fit     || 0} color={C.purple} />
                    <MiniBar label="Concept"    value={breakdown.concept_coverage  || 0} color={C.amber} />
                  </div>
                </div>
              </div>

              {/* Strengths & Watchouts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                <div style={{ background: C.greenSoft, padding: 20, borderRadius: 16, border: `1px solid #BBF7D0` }}>
                  <div style={{ fontSize: 10, fontWeight: 950, color: C.green, textTransform: 'uppercase', marginBottom: 12 }}>Strengths</div>
                  {(factors.strengths || []).length > 0 ? (factors.strengths || []).map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                      <CheckCircle size={14} color={C.green} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#14532D', lineHeight: 1.5 }}>{s}</span>
                    </div>
                  )) : <div style={{ fontSize: 12, color: C.slate }}>No strengths recorded.</div>}
                </div>
                <div style={{ background: C.amberSoft, padding: 20, borderRadius: 16, border: `1px solid #FDE68A` }}>
                  <div style={{ fontSize: 10, fontWeight: 950, color: C.amber, textTransform: 'uppercase', marginBottom: 12 }}>Watch-outs</div>
                  {(factors.watchouts || []).length > 0 ? (factors.watchouts || []).map((w, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                      <AlertCircle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#78350F', lineHeight: 1.5 }}>{w}</span>
                    </div>
                  )) : <div style={{ fontSize: 12, color: C.slate }}>No watch-outs detected.</div>}
                </div>
              </div>

              {/* Evidence snippets */}
              {evidence.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 12 }}>Evidence Snippets</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {evidence.slice(0, 3).map((ev, i) => (
                      <div key={i} style={{ padding: '12px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.navy, lineHeight: 1.6 }}>
                        "{ev}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'skills' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Matched */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 950, color: C.green, textTransform: 'uppercase', marginBottom: 14 }}>
                    Matched Skills ({(candidate.matched_skills || []).length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(candidate.matched_skills || []).map(s => (
                      <span key={s} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>{s}</span>
                    ))}
                    {(candidate.matched_skills || []).length === 0 && <div style={{ fontSize: 12, color: C.slate }}>None matched</div>}
                  </div>
                </div>
                {/* Missing */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 950, color: C.red, textTransform: 'uppercase', marginBottom: 14 }}>
                    Missing Skills ({(candidate.missing_skills || []).length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(candidate.missing_skills || []).map(s => (
                      <span key={s} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>{s}</span>
                    ))}
                    {(candidate.missing_skills || []).length === 0 && <div style={{ fontSize: 12, color: C.slate }}>No gaps detected 🎉</div>}
                  </div>
                </div>
              </div>
              {/* Extra */}
              {(candidate.extra_skills || []).length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 950, color: C.purple, textTransform: 'uppercase', marginBottom: 12 }}>Bonus Skills ({candidate.extra_skills.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {candidate.extra_skills.map(s => (
                      <span key={s} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#F5F3FF', color: '#5B21B6', border: '1px solid #DDD6FE' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Skill coverage bar */}
              <div style={{ marginTop: 32, padding: 20, background: C.bg, borderRadius: 16, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>
                  <span>Skill Coverage</span>
                  <span style={{ color: C.red }}>{Math.round(candidate.skill_match_pct || 0)}%</span>
                </div>
                <div style={{ height: 10, background: '#E2E8F0', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${candidate.skill_match_pct || 0}%`, height: '100%', background: `linear-gradient(90deg, ${C.red}, #F87171)`, borderRadius: 5, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.slate, marginTop: 8, fontWeight: 700 }}>
                  <span>{(candidate.matched_skills || []).length} matched</span>
                  <span>{(candidate.missing_skills || []).length} missing</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <div>
              {/* Cultural Traits */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 16 }}>
                  Cultural Traits <span style={{ fontWeight: 600, fontSize: 9, textTransform: 'none', color: C.slate, opacity: 0.7 }}>(heuristic estimate)</span>
                </div>
                <div style={{ display: 'grid', gap: 14 }}>
                  <TraitBar label="Ambition"       value={traits.ambition   || 55} color={C.red} />
                  <TraitBar label="Teamwork"        value={traits.teamwork   || 55} color={C.blue} />
                  <TraitBar label="Analytical Tone" value={traits.analytical || 55} color={C.purple} />
                </div>
              </div>
              {/* Interview Probe */}
              <div style={{ padding: 24, background: C.purpleSoft, borderRadius: 20, marginBottom: 24 }}>
                <div style={{ fontWeight: 950, fontSize: 10, color: '#5B21B6', marginBottom: 12, textTransform: 'uppercase' }}>Interview Probe</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: 0 }}>
                  "Describe a specific project where you applied your {meta.industry_focus || 'domain'} expertise to overcome a technical challenge."
                </p>
              </div>
              {/* Meta grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Seniority', value: meta.seniority_tier || '—' },
                  { label: 'Industry', value: meta.industry_focus || '—' },
                  { label: 'Experience', value: candidate.candidate_years_exp ? `${candidate.candidate_years_exp} years` : '—' },
                  { label: 'Degree', value: candidate.candidate_degree || '—' },
                  { label: 'Confidence', value: candidate.confidence_score ? `${Math.round(candidate.confidence_score)}%` : '—' },
                  { label: 'Extraction', value: candidate.experience_extraction_method || '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '14px 16px', background: C.bg, borderRadius: 12, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.navy }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === 'heatmap' && (
             <div style={{ padding: 24, background: '#F8FAFC', borderRadius: 16, border: `1px solid ${C.border}`, fontSize: 13, lineHeight: 1.8, color: C.navy, whiteSpace: 'pre-wrap' }}>
                {(() => {
                   const txt = candidate.raw_text || evidence.join('\n\n') || "Raw text not available in the payload. Showing extracted evidence instead:\n\n" + evidence.join('\n');
                   const words = (candidate.matched_skills || []).map(s=>s.toLowerCase());
                   if(!words.length) return txt;
                   const regex = new RegExp(`\\b(${words.join('|')})\\b`, 'gi');
                   const parts = txt.split(regex);
                   return parts.map((part, i) => words.includes(part.toLowerCase()) ? <span key={i} style={{ background: '#BBF7D0', color: '#166534', padding: '2px 4px', borderRadius: 4, fontWeight: 800 }}>{part}</span> : part);
                })()}
             </div>
          )}

          {tab === 'email' && (
             <div style={{ padding: 24, background: C.bg, borderRadius: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 12 }}>Personalized Rejection Draft</div>
                <textarea readOnly value={`Hi ${candidate.candidate_name.split(' ')[0]},\n\nThank you for applying for the position. While your ${candidate.candidate_years_exp} years of experience is impressive, we are currently looking for deeper expertise in specific areas, particularly: ${(candidate.missing_skills || []).join(', ')}.\n\nWe will keep your profile in our talent pool for future opportunities.\n\nBest,\nHR Team`} style={{ width: '100%', height: 200, padding: 16, borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.navy, outline: 'none', resize: 'none' }} />
                <Btn style={{ marginTop: 12 }} onClick={() => { navigator.clipboard.writeText(`Hi ${candidate.candidate_name.split(' ')[0]},\n\nThank you for applying for the position. While your ${candidate.candidate_years_exp} years of experience is impressive, we are currently looking for deeper expertise in specific areas, particularly: ${(candidate.missing_skills || []).join(', ')}.\n\nWe will keep your profile in our talent pool for future opportunities.\n\nBest,\nHR Team`); alert('Copied to clipboard!'); }}><Copy size={14} style={{ marginRight: 6 }} /> Copy Draft</Btn>
             </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 40px', borderTop: `1.5px solid ${C.border}`, background: C.bg, display: 'flex', gap: 12 }}>
          <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Close</Btn>
          <Btn onClick={async () => {
            if (window.confirm(`Hire ${candidate.candidate_name}?`)) {
              try { await hireCandidate(candidate.submission_id); alert('Hired!'); window.location.reload(); }
              catch { alert('Error hiring candidate.'); }
            }
          }} style={{ flex: 2, background: C.green, border: 'none' }}>
            <CheckCircle size={16} style={{ marginRight: 8 }} /> One-Click Hire
          </Btn>
        </div>
      </div>
    </div>
  );
};

/* ─── MAIN PAGE ─────────────────────────────────────────────────────────────── */
export function HRCVRankingPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const requestedJobId = searchParams.get('job');

  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rankLoading, setRankLoading] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery]       = useState('');
  const [minScore, setMinScore]             = useState(0);
  const [minConfidence, setMinConfidence]   = useState(0);
  const [filterSeniority, setFilterSeniority] = useState('All');
  const [filterIndustry, setFilterIndustry]   = useState('All');
  const [filterDegree, setFilterDegree]       = useState('All');
  const [hideRisk, setHideRisk]             = useState(false);
  const [sortBy, setSortBy]                 = useState('final_score');

  // Modals / Drawers
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [isDetailOpen, setIsDetailOpen]       = useState(false);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [isJDInsightsOpen, setIsJDInsightsOpen] = useState(false);
  const [jobInsights, setJobInsights]         = useState(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [isCloneOpen, setIsCloneOpen]         = useState(false);
  const [cloneSource, setCloneSource]         = useState(null);
  const [clones, setClones]                   = useState([]);
  const [isClonesLoading, setIsClonesLoading] = useState(false);

  const [automationRules, setAutomationRules] = useState({
    type: 'percentile', value: 10, action: 'shortlist', mustHaveSkills: [], targetStage: 'Shortlisted',
  });

  /* ── Data Loading ── */
  const loadJobs = async () => {
    try {
      const data = await getJobs(); setJobs(data || []);
      if (!activeJobId && data?.length) {
        const reqNum = requestedJobId != null ? Number(requestedJobId) : null;
        const match = reqNum != null && Number.isFinite(reqNum) ? data.find(j => Number(j.id) === reqNum) : null;
        const pick = match?.id ?? data[0]?.id;
        if (pick) { setActiveJobId(pick); loadRankings(pick); }
      }
    } catch { toast('Error loading jobs', 'error'); } finally { setLoading(false); }
  };

  const loadRankings = async (id, forceRescore = false) => {
    setRankLoading(true);
    // Keep the current rows on screen while a rescore runs (the spinner overlays
    // them); only clear when switching jobs so a failed rescore never blanks the list.
    if (!forceRescore) setRankings([]);
    try {
      let data;
      if (forceRescore) {
        // Import the axios instance directly for the force_rescore query param
        const { api } = await import('../../api/base.js');
        const res = await api.get(`/recruitment/jobs/${id}/ranking/?force_rescore=1`);
        data = Array.isArray(res.data) ? res.data : [];
      } else {
        data = await getJobRanking(id);
      }
      setRankings(Array.isArray(data) ? data : []);
    } catch {
      if (!forceRescore) setRankings([]); // on rescore failure, keep the prior scores visible
      toast('Error loading rankings', 'error');
    } finally { setRankLoading(false); setIsRescoring(false); }
  };

  const handleRescore = async () => {
    if (!activeJobId) return;
    setIsRescoring(true);
    toast('Re-scoring all candidates with latest AI model…', 'info');
    await loadRankings(activeJobId, true);
    toast('Re-score complete', 'success');
  };

  const handleFindClones = async (candidate) => {
    setIsCloneOpen(true);
    setCloneSource(candidate);
    setIsClonesLoading(true);
    try {
      const res = await getTalentCloneSimilarity(activeJobId, candidate.submission_id, 'submission');
      setClones(res.data?.results || res.results || []);
    } catch (err) {
      const msg = err?.data?.error || 'Semantic Search failed';
      toast(msg, 'error');
      if (msg.includes("Run pipeline first") || msg.includes("embedding")) {
        toast('Please click the "Re-score" button above to generate AI embeddings.', 'info');
      }
      setIsCloneOpen(false);
    } finally {
      setIsClonesLoading(false);
    }
  };

  const handleAutomate = async (rules) => {
    setRankLoading(true);
    try {
      const protocol = {
        min_ats_score: rules.type === 'fixed' ? rules.value : 0,
        must_have_skills: rules.mustHaveSkills,
        target_stage: rules.targetStage,
        percentile: rules.type === 'percentile' ? rules.value : null,
      };
      const res = await hrAutomateJobRecruitment(activeJobId, protocol);
      toast(res.message || 'Automation deployed', 'success');
      setIsAutomationOpen(false); loadRankings(activeJobId);
    } catch { toast('Automation failed', 'error'); } finally { setRankLoading(false); }
  };

  const fetchJobInsights = async () => {
    if (!activeJobId) return;
    setIsInsightsLoading(true);
    try { const res = await hrGetJobInsights(activeJobId); setJobInsights(res.data || res); }
    catch { toast('Neural Audit failed', 'error'); } finally { setIsInsightsLoading(false); }
  };

  const handleOptimizeJob = async (frictionPoints) => {
    setRankLoading(true);
    try {
      const updates = {};
      frictionPoints.forEach(fp => {
        if (fp.type === 'exp_overload') { const m = fp.suggestion.match(/(\d+)/); if (m) updates.min_experience_years = parseInt(m[0]); }
        if (fp.type === 'skill_overload') {
          const m = fp.detail.match(/\[(.*?)\]/);
          if (m) { const bottlenecks = m[1].split(',').map(s => s.trim().toLowerCase()); const cur = jobs.find(j => j.id === activeJobId); updates.required_skills = (cur?.required_skills || []).filter(s => !bottlenecks.includes(s.toLowerCase())); }
        }
      });
      const res = await hrOptimizeJob(activeJobId, updates);
      toast(res.data?.message || 'Optimized', 'success'); setIsJDInsightsOpen(false); loadRankings(activeJobId);
    } catch { toast('Optimization failed', 'error'); } finally { setRankLoading(false); }
  };

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => { if (isJDInsightsOpen) fetchJobInsights(); }, [isJDInsightsOpen, activeJobId]);

  /* ── Filtering & Sorting ── */
  const filteredRankings = useMemo(() => {
    let data = rankings.filter(r => {
      const nameMatch   = r.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const scoreMatch  = (r.final_score || 0) >= minScore;
      const confMatch   = (r.confidence_score || 0) >= minConfidence;
      const senMatch    = filterSeniority === 'All' || r.profile_meta?.seniority_tier === filterSeniority;
      const indMatch    = filterIndustry === 'All' || r.profile_meta?.industry_focus === filterIndustry;
      const degMatch    = filterDegree === 'All' || r.candidate_degree === filterDegree;
      const riskMatch   = !hideRisk || !r.profile_meta?.fraud_detection?.is_padding_risk;
      return nameMatch && scoreMatch && confMatch && senMatch && indMatch && degMatch && riskMatch;
    });
    data = [...data].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    return data;
  }, [rankings, searchQuery, minScore, minConfidence, filterSeniority, filterIndustry, filterDegree, hideRisk, sortBy]);

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total:    rankings.length,
    avgScore: rankings.length ? Math.round(rankings.reduce((s, r) => s + (r.final_score || 0), 0) / rankings.length) : 0,
    riskCount: rankings.filter(r => r.profile_meta?.fraud_detection?.is_padding_risk).length,
    avgGap:   rankings.length ? Math.round(rankings.reduce((s, r) => s + (r.missing_skills?.length || 0), 0) / rankings.length) : 0,
  }), [rankings]);

  /* ── Unique filter options ── */
  const seniorityOptions = useMemo(() => ['All', ...new Set(rankings.map(r => r.profile_meta?.seniority_tier).filter(Boolean))], [rankings]);
  const industryOptions  = useMemo(() => ['All', ...new Set(rankings.map(r => r.profile_meta?.industry_focus).filter(Boolean))], [rankings]);
  const degreeOptions    = useMemo(() => ['All', ...new Set(rankings.map(r => r.candidate_degree).filter(d => d && d !== 'Unknown'))], [rankings]);

  const activeJob = jobs.find(j => j.id === activeJobId);

  if (loading) return <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>;

  /* ─── Common input style ─── */
  const inputStyle = { height: 38, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.bg, padding: '0 12px', fontSize: 12, fontWeight: 700, color: C.navy, outline: 'none' };

  return (
    <div className="page-content" style={{ background: C.bg, minHeight: '100vh', padding: '36px 48px' }}>

      {/* ── Strategic Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: C.red, display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220,38,38,0.25)' }}>
              <Brain size={22} color="#fff" />
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: C.navy, margin: 0 }}>AI Candidate Screening</h1>
          </div>
          <p style={{ fontSize: 13, color: C.slate, fontWeight: 600, margin: 0 }}>
            Analyzing pool for: <span style={{ color: C.red, fontWeight: 800 }}>{activeJob?.title || '…'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="secondary" onClick={() => setIsJDInsightsOpen(true)} style={{ height: 40, borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
            <Lightbulb size={15} style={{ marginRight: 6 }} /> JD Analysis
          </Btn>
          <Btn variant="secondary" onClick={() => setIsAutomationOpen(true)} style={{ height: 40, borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
            <Cpu size={15} style={{ marginRight: 6 }} /> Automate
          </Btn>
          <Btn onClick={handleRescore} style={{ height: 40, borderRadius: 12, background: C.red, border: 'none', fontSize: 12, fontWeight: 800 }} disabled={isRescoring}>
            <RefreshCw size={15} style={{ marginRight: 6 }} /> {isRescoring ? 'Rescoring…' : 'Re-score'}
          </Btn>
        </div>
      </div>

      {/* ── Job Hub ── */}
      <div style={{ background: C.card, padding: '20px 24px', borderRadius: 20, border: `1.5px solid ${C.border}`, marginBottom: 24 }}>
        <div style={{ maxWidth: 380 }}>
          <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', marginBottom: 8 }}>Active Job Hub</label>
          <select value={activeJobId ?? ''} onChange={e => { const id = Number(e.target.value); setActiveJobId(id); loadRankings(id); }}
            style={{ ...inputStyle, width: '100%', height: 44 }}>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Candidates', value: stats.total,    icon: Users,         color: C.blue,   bg: C.blueSoft },
          { label: 'Average Score',    value: `${stats.avgScore}%`, icon: TrendingUp, color: C.green, bg: C.greenSoft },
          { label: 'Fraud Risk',       value: stats.riskCount, icon: ShieldAlert,   color: C.red,    bg: C.redSoft },
          { label: 'Avg Skills Gap',   value: `${stats.avgGap} skills`, icon: Target, color: C.amber,bg: C.amberSoft },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: C.card, padding: '20px 24px', borderRadius: 18, border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={20} /></div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.navy }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background: C.card, padding: '16px 20px', borderRadius: 18, border: `1.5px solid ${C.border}`, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.slate }} />
          <input placeholder="Search candidates…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: 34 }} />
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>Sort By</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={inputStyle}>
            <option value="final_score">Final Score</option>
            <option value="semantic_score">Semantic Alignment</option>
            <option value="skill_match_pct">Skills Coverage</option>
            <option value="experience_fit_pct">Experience Fit</option>
            <option value="confidence_score">Confidence</option>
          </select>
        </div>

        {/* Min Score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>Min Score: {minScore}%</label>
          <input type="range" min={0} max={100} value={minScore} onChange={e => setMinScore(+e.target.value)}
            style={{ width: 100, accentColor: C.red }} />
        </div>

        {/* Seniority */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>Seniority</label>
          <select value={filterSeniority} onChange={e => setFilterSeniority(e.target.value)} style={inputStyle}>
            {seniorityOptions.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Industry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>Industry</label>
          <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={inputStyle}>
            {industryOptions.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Degree */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 9, fontWeight: 950, color: C.slate, textTransform: 'uppercase' }}>Degree</label>
          <select value={filterDegree} onChange={e => setFilterDegree(e.target.value)} style={inputStyle}>
            {degreeOptions.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Hide Fraud */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.slate, height: 38 }}>
          <input type="checkbox" checked={hideRisk} onChange={e => setHideRisk(e.target.checked)} style={{ accentColor: C.red }} />
          Hide Padding Risk
        </label>
      </div>

      {/* ── Candidate Table ── */}
      <div style={{ background: C.card, borderRadius: 22, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: `2px solid ${C.border}` }}>
              {['Candidate', 'AI Score', 'Skills Gap', 'Fraud Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '16px 20px', textAlign: 'left', fontSize: 10, fontWeight: 950, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankLoading ? (
              <tr><td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center' }}>
                <Spinner /><div style={{ marginTop: 12, fontWeight: 700, color: C.slate }}>Analyzing candidates…</div>
              </td></tr>
            ) : filteredRankings.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '60px 20px', textAlign: 'center', color: C.slate, fontWeight: 700 }}>
                <Brain size={48} style={{ display: 'block', margin: '0 auto 16px', opacity: 0.15 }} />
                No candidates match the current filters.
              </td></tr>
            ) : filteredRankings.map((r, i) => {
              const meta    = r.profile_meta || {};
              const fraud   = meta.fraud_detection || {};
              const isRisk  = fraud.is_padding_risk;
              const breakdown = r.score_breakdown || {};
              const matched = (r.matched_skills || []).length;
              const missing = (r.missing_skills || []).length;
              const total   = matched + missing;
              const coveragePct = total > 0 ? Math.round((matched / total) * 100) : 0;

              return (
                <tr key={`${r.submission_id}-${i}`}
                  style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* ── Candidate Column ── */}
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                        background: isRisk ? '#FEF2F2' : `hsl(${(r.final_score || 50) * 2}, 60%, 92%)`,
                        display: 'grid', placeItems: 'center',
                        fontWeight: 900, fontSize: 15,
                        color: isRisk ? C.red : `hsl(${(r.final_score || 50) * 2}, 50%, 40%)`,
                        border: isRisk ? `2px solid #FECACA` : 'none',
                      }}>
                        {(r.candidate_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.navy, marginBottom: 4 }}>{r.candidate_name}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          <SeniorityBadge tier={meta.seniority_tier} />
                          <IndustryBadge industry={meta.industry_focus} />
                        </div>
                        <div style={{ fontSize: 11, color: C.slate, fontWeight: 600, marginTop: 4 }}>
                          {r.candidate_years_exp ? `${r.candidate_years_exp}y` : ''}{r.candidate_degree && r.candidate_degree !== 'Unknown' ? ` · ${r.candidate_degree}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ── AI Score Column ── */}
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <ScoreRing value={r.final_score || 0} size={52} />
                      <div style={{ minWidth: 120 }}>
                        <MiniBar label="Skills"     value={breakdown.skill_coverage    || r.skill_match_pct    || 0} color={C.blue} />
                        <div style={{ marginTop: 6 }}>
                          <MiniBar label="Semantic"  value={breakdown.semantic_alignment || r.semantic_score    || 0} color={C.red} />
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <MiniBar label="Exp"        value={breakdown.experience_fit    || r.experience_fit_pct|| 0} color={C.green} />
                        </div>
                      </div>
                    </div>
                    {r.confidence_score > 0 && (
                      <div style={{ marginTop: 8, fontSize: 10, color: C.slate, fontWeight: 700 }}>
                        <span style={{ color: r.confidence_score >= 75 ? C.green : r.confidence_score >= 50 ? C.amber : C.red }}>
                          ●
                        </span> Confidence: {Math.round(r.confidence_score)}%
                      </div>
                    )}
                  </td>

                  {/* ── Skills Gap Column ── */}
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ minWidth: 120 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}>
                          ✓ {matched}
                        </span>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                          ✗ {missing}
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ width: `${coveragePct}%`, height: '100%', background: coveragePct >= 75 ? C.green : coveragePct >= 50 ? C.amber : C.red, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 10, color: C.slate, fontWeight: 700 }}>{coveragePct}% skill coverage</div>
                    </div>
                  </td>

                  {/* ── Fraud Status Column ── */}
                  <td style={{ padding: '18px 20px' }}>
                    {isRisk ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.red, fontWeight: 900, fontSize: 12 }}>
                          <ShieldAlert size={14} /> Padding Risk
                        </div>
                        <div style={{ fontSize: 10, color: C.red, opacity: 0.7, fontWeight: 700 }}>
                          {Math.round((fraud.padding_ratio || 0) * 100)}% context-free
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.green, fontWeight: 900, fontSize: 12 }}>
                          <ShieldCheck size={14} /> Verified
                        </div>
                        <div style={{ fontSize: 10, color: C.slate, fontWeight: 700 }}>No padding detected</div>
                      </div>
                    )}
                  </td>

                  {/* ── Actions Column ── */}
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                      <button
                        onClick={() => { setActiveCandidate(r); setIsDetailOpen(true); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.card, fontSize: 12, fontWeight: 800, cursor: 'pointer', color: C.navy, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.red; }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.color = C.navy; e.currentTarget.style.borderColor = C.border; }}
                      >
                        <Eye size={13} /> Full Report
                      </button>
                      <button
                        onClick={() => handleFindClones(r)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.blueSoft, fontSize: 12, fontWeight: 800, cursor: 'pointer', color: C.blue, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.blue; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.blue; }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.blueSoft; e.currentTarget.style.color = C.blue; e.currentTarget.style.borderColor = C.border; }}
                      >
                        <Users size={13} /> Find Clones
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Result Count ── */}
      {!rankLoading && filteredRankings.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: C.slate, fontWeight: 700 }}>
          Showing {filteredRankings.length} of {rankings.length} candidates
        </div>
      )}

      {/* ── Modals & Drawers ── */}
      <DetailDrawer isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} candidate={activeCandidate} />
      <AutomationModal isOpen={isAutomationOpen} onClose={() => setIsAutomationOpen(false)} onDeploy={handleAutomate} currentRules={automationRules} />
      <JDHealthModal isOpen={isJDInsightsOpen} onClose={() => setIsJDInsightsOpen(false)} insights={jobInsights} isLoading={isInsightsLoading} onOptimize={handleOptimizeJob} />
      <TalentCloneModal isOpen={isCloneOpen} onClose={() => setIsCloneOpen(false)} sourceCandidate={cloneSource} clones={clones} isLoading={isClonesLoading} />
    </div>
  );
}
