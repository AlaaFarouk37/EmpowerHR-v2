import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobs, getJobRanking, hrBulkUpdateSubmissions, hrAutomateJobRecruitment, hireCandidate, hrGetJobInsights, hrOptimizeJob, getTalentCloneSimilarity } from '../../api/index.js';
import { Badge, Btn, Spinner, useToast } from '../../components/shared/index.jsx';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, TrendingUp, Shield, FileText, Star, Zap, Info, CheckCircle, XCircle, Clock, Sparkles, Target, Brain, 
  Activity, ChevronDown, Layers, ShieldCheck, Send, Sliders, Filter, Eye, AlertCircle, Award, BookOpen, 
  MessageSquare, BarChart3, Copy, Users, X, ArrowRightLeft, Flame, ZapOff, Briefcase, History, Download, 
  ShieldAlert, Lightbulb, ArrowUpRight, Settings, Bell, Cpu, UserCheck, Ghost, UploadCloud, Radar, RefreshCw, 
  Plus, FileEdit, Heart, Smile, Check, Trash2, Calendar, ShieldAlert as ShieldRisk, Briefcase as JobIcon
} from 'lucide-react';

/* --- HELPER: Trait Map --- */
const TraitMap = ({ traits }) => {
  const list = [
    { label: 'Ambition', val: traits?.ambition || 85, color: '#DC2626' },
    { label: 'Teamwork', val: traits?.teamwork || 70, color: '#2563EB' },
    { label: 'Analytical Tone', val: traits?.analytical || 90, color: '#7C3AED' },
  ];
  return (
    <div style={{ display: 'grid', gap: 16 }}>
       {list.map(t => (
         <div key={t.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 950, marginBottom: 6, textTransform: 'uppercase', color: '#64748B' }}>
               <span>{t.label}</span>
               <span style={{ color: t.color }}>{t.val}%</span>
            </div>
            <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
               <div style={{ width: `${t.val}%`, height: '100%', background: t.color }} />
            </div>
         </div>
       ))}
    </div>
  );
};

/* --- HELPER: Skill Balance Radar --- */
const SkillRadar = ({ scores }) => {
  const size = 180;
  const center = size / 2;
  const radius = center * 0.7;
  const points = [
    { label: 'Exp', val: scores?.semantic_alignment || 0 },
    { label: 'Skills', val: scores?.skill_coverage || 0 },
    { label: 'Seniority', val: scores?.experience_fit || 0 },
    { label: 'Edu', val: scores?.education_fit || 0 },
    { label: 'Concept', val: scores?.concept_coverage || 0 },
  ];
  const getPoint = (i, total, val) => {
    const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
    const dist = (val / 100) * radius;
    return `${center + dist * Math.cos(angle)},${center + dist * Math.sin(angle)}`;
  };
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {[50, 100].map(v => <polygon key={v} points={points.map((p, i) => getPoint(i, points.length, v)).join(' ')} fill="none" stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4,4" />)}
        <polygon points={points.map((p, i) => getPoint(i, points.length, p.val)).join(' ')} fill="rgba(220, 38, 38, 0.1)" stroke="var(--red-600)" strokeWidth="2" />
        {points.map((p, i) => { const pos = getPoint(i, points.length, 120).split(','); return <text key={i} x={pos[0]} y={pos[1]} fontSize="8" fontWeight="950" textAnchor="middle" fill="#94A3B8" style={{ textTransform: 'uppercase' }}>{p.label}</text>; })}
      </svg>
    </div>
  );
};

/* --- MODAL: JD Health Report --- */
const JDHealthModal = ({ isOpen, onClose, insights, isLoading, onOptimize }) => {
  if (!isOpen) return null;
  
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'grid', placeItems: 'center', padding: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }} />
      <div className="animate-in" style={{ position: 'relative', width: '100%', maxWidth: 600, background: '#fff', borderRadius: 28, padding: '40px', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF3C7', color: '#D97706', display: 'grid', placeItems: 'center' }}>
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>Strategic JD Analysis</h3>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{insights?.job_title || 'Analyzing Requisition...'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spinner /><div style={{ marginTop: 12, fontWeight: 700, color: '#94A3B8' }}>Auditing Neural Requisition...</div></div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
               <div style={{ padding: '24px', borderRadius: 20, background: '#F8FAFC', border: '1.5px solid #F1F5F9', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase' }}>JD Health</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: insights?.health_score > 70 ? '#166534' : '#D97706' }}>{insights?.health_score || 0}%</div>
               </div>
               <div style={{ padding: '24px', borderRadius: 20, background: '#F8FAFC', border: '1.5px solid #F1F5F9', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase' }}>Elite Match Rate</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#1E293B' }}>{insights?.metrics?.elite_match_rate || 0}%</div>
               </div>
            </div>

            <div style={{ display: 'grid', gap: 16, marginBottom: 32 }}>
               <label style={{ fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase' }}>Detected Friction Points</label>
               {insights?.friction_points?.length > 0 ? insights.friction_points.map((fp, i) => (
                 <div key={i} style={{ padding: '16px 20px', borderRadius: 16, background: fp.impact === 'High' ? '#FEF2F2' : '#FFFBEB', border: `1.5px solid ${fp.impact === 'High' ? '#FCA5A5' : '#FCD34D'}`, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ marginTop: 2, color: fp.impact === 'High' ? '#DC2626' : '#D97706' }}><AlertCircle size={18} /></div>
                    <div>
                       <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>{fp.title}</div>
                       <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, marginTop: 4 }}>{fp.detail}</div>
                       <div style={{ fontSize: 11, color: fp.impact === 'High' ? '#B91C1C' : '#92400E', fontWeight: 900, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={12} /> Proactive Suggestion: {fp.suggestion}
                       </div>
                    </div>
                 </div>
               )) : (
                 <div style={{ padding: '24px', borderRadius: 16, border: '1.5px dashed #F1F5F9', textAlign: 'center', color: '#94A3B8', fontSize: 13, fontWeight: 700 }}>No significant friction detected. JD is well-aligned with pool.</div>
               )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
               <Btn variant="secondary" onClick={onClose} style={{ flex: 1, borderRadius: 14 }}>Dismiss</Btn>
               {insights?.friction_points?.length > 0 && (
                 <Btn onClick={() => onOptimize(insights.friction_points)} style={{ flex: 2, borderRadius: 14, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}>
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

/* --- MODAL: Automation Command --- */
const AutomationModal = ({ isOpen, onClose, onDeploy, currentRules }) => {
  const [rules, setRules] = useState(currentRules || { 
    type: 'percentile', 
    value: 10, 
    action: 'shortlist',
    mustHaveSkills: [],
    targetStage: 'Shortlisted'
  });
  const [skillInput, setSkillInput] = useState('');

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'grid', placeItems: 'center', padding: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }} />
      <div className="animate-in" style={{ position: 'relative', width: '100%', maxWidth: 540, background: '#fff', borderRadius: 28, padding: '40px', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--red-50)', color: 'var(--red-600)', display: 'grid', placeItems: 'center' }}>
              <Cpu size={20} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>Neural Automation Protocol</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gap: 32 }}>
           {/* Strategy Selection */}
           <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12 }}>Advanced Strategy</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                 {[
                   { id: 'percentile', label: 'Top Percentile', icon: TrendingUp },
                   { id: 'fixed', label: 'Absolute Threshold', icon: Target }
                 ].map(opt => (
                   <div key={opt.id} onClick={() => setRules({...rules, type: opt.id})} style={{ padding: '16px', borderRadius: 16, border: `2px solid ${rules.type === opt.id ? 'var(--red-600)' : '#F1F5F9'}`, background: rules.type === opt.id ? 'var(--red-50)' : '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}><opt.icon size={16} color={rules.type === opt.id ? 'var(--red-600)' : '#64748B'} /><div style={{ fontWeight: 900, fontSize: 13 }}>{opt.label}</div></div>
                      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{opt.id === 'percentile' ? 'Bulk action top performers' : 'Action by score quality'}</div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Value Slider */}
           <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                 <label style={{ fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase' }}>{rules.type === 'percentile' ? 'Percentage to Action' : 'Min Match Score'}</label>
                 <span style={{ fontSize: 14, fontWeight: 950, color: 'var(--red-600)' }}>{rules.value}{rules.type === 'percentile' ? '%' : ''}</span>
              </div>
              <input type="range" min="1" max="95" value={rules.value} onChange={e => setRules({...rules, value: parseInt(e.target.value)})} style={{ width: '100%', accentColor: 'var(--red-600)' }} />
           </div>

           {/* Must Have Skills */}
           <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12 }}>Anchor Skills (Mandatory)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                 <input 
                   type="text" 
                   placeholder="Add skill requirement..." 
                   value={skillInput}
                   onChange={e => setSkillInput(e.target.value)}
                   onKeyDown={e => {
                     if (e.key === 'Enter' && skillInput) {
                       setRules({...rules, mustHaveSkills: [...rules.mustHaveSkills, skillInput]});
                       setSkillInput('');
                     }
                   }}
                   style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 16px', fontSize: 13, fontWeight: 600 }}
                 />
                 <Btn onClick={() => { if(skillInput) { setRules({...rules, mustHaveSkills: [...(rules.mustHaveSkills || []), skillInput]}); setSkillInput(''); } }} style={{ height: 44, borderRadius: 12 }}><Plus size={18} /></Btn>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                 {(rules.mustHaveSkills || []).map((s, i) => (
                   <Badge key={i} label={s} color="red" size="sm" onClick={() => setRules({...rules, mustHaveSkills: rules.mustHaveSkills.filter((_, idx) => idx !== i)})} style={{ cursor: 'pointer' }} />
                 ))}
                 {(rules.mustHaveSkills || []).length === 0 && <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>No mandatory skills defined.</div>}
              </div>
           </div>

           {/* Target Stage */}
           <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 12 }}>Target Pipeline Stage</label>
              <select value={rules.targetStage} onChange={e => setRules({...rules, targetStage: e.target.value})} style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 12px', fontSize: 13, fontWeight: 800 }}>
                 <option value="Shortlisted">Shortlisted</option>
                 <option value="Interview">Interview</option>
                 <option value="Technical Test">Technical Test</option>
                 <option value="Rejected">Auto-Reject (Below Threshold)</option>
              </select>
           </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
           <Btn variant="secondary" onClick={onClose} style={{ flex: 1, borderRadius: 14 }}>Dismiss</Btn>
           <Btn onClick={() => onDeploy(rules)} style={{ flex: 2, borderRadius: 14, background: 'var(--red-600)', border: 'none', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)' }}><Zap size={18} style={{ marginRight: 8 }} /> Deploy Neural Protocol</Btn>
        </div>
      </div>
    </div>
  );
};

/* --- MODAL: Talent Clone Protocol --- */
const BenchmarkModal = ({ isOpen, onClose, onApplyProtocol }) => {
  const [source, setSource] = useState('internal'); 
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'grid', placeItems: 'center', padding: 40 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }} />
      <div className="animate-in" style={{ position: 'relative', width: '100%', maxWidth: 540, background: '#fff', borderRadius: 28, padding: '32px', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F3FF', color: '#7C3AED', display: 'grid', placeItems: 'center' }}>
               <Brain size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', margin: 0 }}>Target Persona Search</h3>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>Clone the DNA of your best talent</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
           <button onClick={() => setSource('internal')} style={{ flex: 1, height: 44, borderRadius: 12, border: `1.5px solid ${source === 'internal' ? '#7C3AED' : '#F1F5F9'}`, background: source === 'internal' ? '#F5F3FF' : '#fff', fontSize: 12, fontWeight: 800, color: source === 'internal' ? '#7C3AED' : '#64748B', transition: 'all 0.2s' }}>Internal Benchmark</button>
           <button onClick={() => setSource('external')} style={{ flex: 1, height: 44, borderRadius: 12, border: `1.5px solid ${source === 'external' ? '#7C3AED' : '#F1F5F9'}`, background: source === 'external' ? '#F5F3FF' : '#fff', fontSize: 12, fontWeight: 800, color: source === 'external' ? '#7C3AED' : '#64748B', transition: 'all 0.2s' }}>External Gold Standard</button>
        </div>

        {source === 'internal' ? (
          <div style={{ display: 'grid', gap: 12 }}>
             <label style={{ fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase' }}>Select Talent to Clone</label>
             {[{ id: 101, name: 'Sarah Chen', role: 'Lead Developer' }, { id: 102, name: 'Michael Ross', role: 'Product Lead' }].map(e => (
               <div key={e.id} onClick={() => onApplyProtocol(e, 'internal')} style={{ padding: '16px 20px', borderRadius: 16, background: '#F8FAFC', border: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.1s' }}>
                  <div><div style={{ fontWeight: 900, color: '#1E293B' }}>{e.name}</div><div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{e.role}</div></div>
                  <div style={{ color: '#7C3AED' }}><Zap size={14} /></div>
               </div>
             ))}
          </div>
        ) : (
          <div style={{ padding: '40px 20px', border: '2px dashed #F1F5F9', borderRadius: 20, textAlign: 'center', cursor: 'pointer' }}>
             <div style={{ width: 48, height: 48, borderRadius: 16, background: '#F1F5F9', margin: '0 auto 16px', display: 'grid', placeItems: 'center', color: '#94A3B8' }}><UploadCloud size={24} /></div>
             <div style={{ fontSize: 14, fontWeight: 900, color: '#1E293B' }}>Drop Perfect CV Here</div>
             <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>System will extract DNA for pool matching</div>
          </div>
        )}

        <div style={{ marginTop: 24, padding: '16px', borderRadius: 16, background: '#FFF7ED', border: '1px solid #FFEDD5', display: 'flex', gap: 12 }}>
           <div style={{ color: '#C2410C', marginTop: 2 }}><Info size={16} /></div>
           <div style={{ fontSize: 11, color: '#9A3412', fontWeight: 600, lineHeight: 1.5 }}>
              This protocol shifts ranking focus from "JD Match" to "Persona Similarity". 
              Recommended for finding high-performing twins.
           </div>
        </div>
      </div>
    </div>
  );
};

/* --- DRAWER: Intelligence Drawer --- */
const DetailDrawer = ({ isOpen, onClose, candidate }) => {
  const [activeTab, setActiveTab] = useState('summary');
  if (!isOpen || !candidate) return null;
  const isRisk = candidate.profile_meta?.fraud_detection?.is_padding_risk;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} />
      <div className="animate-in" style={{ position: 'relative', width: '100%', maxWidth: 700, height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '40px', borderBottom: '1.5px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
             <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                   <div style={{ fontSize: 11, fontWeight: 950, color: 'var(--red-600)', textTransform: 'uppercase' }}>{candidate.profile_meta?.seniority_tier || 'Candidate'}</div>
                   <Badge label={candidate.profile_meta?.industry_focus || 'General'} size="xs" color="indigo" />
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{candidate.candidate_name}</h3>
             </div>
             <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
             <button onClick={() => setActiveTab('summary')} style={{ background: 'none', border: 'none', padding: '12px 0', fontSize: 13, fontWeight: 950, color: activeTab === 'summary' ? 'var(--red-600)' : '#94A3B8', borderBottom: activeTab === 'summary' ? '3px solid var(--red-600)' : '3px solid transparent', cursor: 'pointer' }}>Summary Report</button>
             <button onClick={() => setActiveTab('dna')} style={{ background: 'none', border: 'none', padding: '12px 0', fontSize: 13, fontWeight: 950, color: activeTab === 'dna' ? 'var(--red-600)' : '#94A3B8', borderBottom: activeTab === 'dna' ? '3px solid var(--red-600)' : '3px solid transparent', cursor: 'pointer' }}>Cultural DNA & Prep Kit</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {isRisk && (
            <div style={{ background: '#FEF2F2', padding: '16px 20px', borderRadius: 16, border: '1.5px solid #FCA5A5', color: '#991B1B', marginBottom: 32, display: 'flex', gap: 12, alignItems: 'center' }}>
               <ShieldRisk size={20} />
               <div style={{ fontSize: 13, fontWeight: 800 }}>Reliability Warning: Keyword Padding Detected</div>
            </div>
          )}
          {activeTab === 'summary' ? (
             <div className="animate-in">
                <div style={{ background: 'var(--red-50)', padding: '24px', borderRadius: 28, marginBottom: 32 }}><p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{candidate.semantic_analysis}</p></div>
                <SkillRadar scores={candidate.score_breakdown} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 32 }}>
                   {candidate.matched_skills?.slice(0, 4).map(s => <div key={s} style={{ padding: '12px', background: '#F8FAFC', borderRadius: 12, fontSize: 12, fontWeight: 800 }}>{s}</div>)}
                </div>
             </div>
          ) : (
             <div className="animate-in">
                <TraitMap traits={candidate.cultural_traits} />
                <div style={{ marginTop: 40, padding: 24, background: '#F5F3FF', borderRadius: 24 }}>
                   <div style={{ fontWeight: 950, fontSize: 11, color: '#5B21B6', marginBottom: 16, textTransform: 'uppercase' }}>Interview Probe</div>
                   <p style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>"Explain your experience in {candidate.profile_meta?.industry_focus}..."</p>
                </div>
             </div>
          )}
        </div>
        <div style={{ padding: '24px 40px', borderTop: '1.5px solid #F1F5F9', background: '#F8FAFC', display: 'flex', gap: 12 }}>
           <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Close</Btn>
           <Btn onClick={async () => { if(window.confirm('Hire candidate?')) { try { await hireCandidate(candidate.submission_id); alert('Hired!'); window.location.reload(); } catch { alert('Error hiring'); } } }} style={{ flex: 2, background: 'var(--red-600)', border: 'none' }}>One-Click Hire</Btn>
        </div>
      </div>
    </div>
  );
};

/* --- DRAWER: Similar Talent Discovery --- */
const SimilarTalentDrawer = ({ isOpen, onClose, results, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }} />
      <div className="animate-in" style={{ position: 'relative', width: '100%', maxWidth: 500, height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '32px 40px', borderBottom: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--red-600)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Neural Discovery</div>
            <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Similar Talent Match</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spinner /><div style={{ marginTop: 16, fontWeight: 700, color: '#94A3B8' }}>Scanning Deep Archive...</div></div>
          ) : results.length > 0 ? (
            <div style={{ display: 'grid', gap: 20 }}>
               {results.map(r => (
                 <div key={r.id} style={{ padding: '20px', borderRadius: 20, background: '#F8FAFC', border: '1.5px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                       <div style={{ fontWeight: 900, fontSize: 15 }}>{r.name}</div>
                       <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>{r.job_title}</div>
                       <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <Badge label={`${Math.round(r.score * 100)}% Similarity`} size="xs" color="red" />
                          <Badge label={r.current_stage} size="xs" color="gray" />
                       </div>
                    </div>
                    <Btn size="sm" variant="outline">View</Btn>
                 </div>
               ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}><Brain size={48} opacity={0.2} style={{ margin: '0 auto 16px' }} /><div style={{ fontWeight: 800 }}>No similar candidates found in archive.</div></div>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- MAIN PAGE COMPONENT --- */
export function HRCVRankingPage() {
  const toast = useToast();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rankLoading, setRankLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [activeJobId, setActiveJobId] = useState(null);
  const [jobs, setJobs] = useState([]);
  
  // Similar Talent Discovery
  const [similarResults, setSimilarResults] = useState([]);
  const [isSimilarLoading, setIsSimilarLoading] = useState(false);
  const [isSimilarOpen, setIsSimilarOpen] = useState(false);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [filterSeniority, setFilterSeniority] = useState('All');
  const [filterIndustry, setFilterIndustry] = useState('All');
  const [hideRisk, setHideRisk] = useState(false);

  const [activeCandidate, setActiveCandidate] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [benchmarkPersona, setBenchmarkPersona] = useState(null);
  const [personaMatches, setPersonaMatches] = useState({});

  const [isJDInsightsOpen, setIsJDInsightsOpen] = useState(false);
  const [jobInsights, setJobInsights] = useState(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);

  const [automationRules, setAutomationRules] = useState({ 
    type: 'percentile', 
    value: 10, 
    action: 'shortlist',
    mustHaveSkills: [],
    targetStage: 'Shortlisted'
  });
  const [isScanningPool, setIsScanningPool] = useState(false);
  const [discoveredCandidates, setDiscoveredCandidates] = useState([]);

  const loadJobs = async () => {
    try {
      const data = await getJobs(); setJobs(data || []);
      if (data?.[0]?.id && !activeJobId) { setActiveJobId(data[0].id); loadRankings(data[0].id); }
    } catch (e) { toast('Error loading jobs', 'error'); } finally { setLoading(false); }
  };
  const loadRankings = async (id) => {
    setRankLoading(true);
    try {
      const data = await getJobRanking(id); setRankings(Array.isArray(data) ? data : []);
    } catch (e) { toast('Error analysis', 'error'); } finally { setRankLoading(false); }
  };
  
  const handleAutomate = async (rules) => {
    setRankLoading(true);
    try {
      const protocol = {
        min_ats_score: rules.type === 'fixed' ? rules.value : 0,
        must_have_skills: rules.mustHaveSkills,
        target_stage: rules.targetStage,
        percentile: rules.type === 'percentile' ? rules.value : null
      };
      
      const res = await hrAutomateJobRecruitment(activeJobId, protocol);
      toast(res.message || 'Automation protocol deployed', 'success');
      setIsAutomationOpen(false);
      loadRankings(activeJobId);
    } catch (e) {
      toast('Automation protocol failed', 'error');
    } finally {
      setRankLoading(false);
    }
  };

  const fetchJobInsights = async () => {
    if (!activeJobId) return;
    setIsInsightsLoading(true);
    try {
      const res = await hrGetJobInsights(activeJobId);
      setJobInsights(res);
    } catch (e) {
      toast('Neural Audit failed', 'error');
    } finally {
      setIsInsightsLoading(false);
    }
  };

  const handleOptimizeJob = async (frictionPoints) => {
    setRankLoading(true);
    try {
      // Logic: Extract suggested updates from friction points
      const updates = {};
      frictionPoints.forEach(fp => {
        if (fp.type === 'exp_overload') {
          // Extract number from suggestion string like "threshold to 6y"
          const match = fp.suggestion.match(/(\d+)/);
          if (match) updates.min_experience_years = parseInt(match[0]);
        }
        if (fp.type === 'skill_overload') {
          // Extract skill names from detail like "Required skills [SQL, AWS] are missing"
          const match = fp.detail.match(/\[(.*?)\]/);
          if (match) {
            const bottlenecks = match[1].split(',').map(s => s.trim().toLowerCase());
            const currentJob = jobs.find(j => j.id === activeJobId);
            updates.required_skills = (currentJob.required_skills || []).filter(s => !bottlenecks.includes(s.toLowerCase()));
          }
        }
      });

      const res = await hrOptimizeJob(activeJobId, updates);
      toast(res.message, 'success');
      setIsJDInsightsOpen(false);
      loadRankings(activeJobId);
    } catch (e) {
      toast('Optimization failed', 'error');
    } finally {
      setRankLoading(false);
    }
  };

  const handleApplyCloneProtocol = async (persona, type) => {
    if (!activeJobId) return;
    setRankLoading(true);
    try {
      // Logic: Use Submission ID 1 as dummy source for testing if needed, or real persona.id
      const sourceId = persona.id || 1; 
      const res = await getTalentCloneSimilarity(activeJobId, sourceId, type);
      setPersonaMatches(res.persona_matches || {});
      setBenchmarkPersona(persona);
      setIsBenchmarkOpen(false);
      toast(`Clone Protocol Active: Matching against ${persona.name}`, 'success');
    } catch (e) {
      toast('Talent Cloning failed', 'error');
    } finally {
      setRankLoading(false);
    }
  };

  const handleFindSimilar = async (id) => {
    if (!id || String(id).includes('null')) {
      toast('Neural mapping incomplete for this record', 'warning');
      return;
    }
    setIsSimilarOpen(true);
    setIsSimilarLoading(true);
    try {
      const { getSimilarCandidates } = await import('../../api/recruitment');
      const data = await getSimilarCandidates(id);
      setSimilarResults(data || []);
    } catch (e) {
      toast('Neural search failed', 'error');
    } finally {
      setIsSimilarLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);
  useEffect(() => { if (isJDInsightsOpen) fetchJobInsights(); }, [isJDInsightsOpen, activeJobId]);

  const filteredRankings = useMemo(() => {
    return rankings.filter(r => {
      const nameMatch = r.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const scoreMatch = (r.final_score || 0) >= minScore;
      const seniorityMatch = filterSeniority === 'All' || r.profile_meta?.seniority_tier === filterSeniority;
      const industryMatch = filterIndustry === 'All' || r.profile_meta?.industry_focus === filterIndustry;
      const riskMatch = !hideRisk || !r.profile_meta?.fraud_detection?.is_padding_risk;
      return nameMatch && scoreMatch && seniorityMatch && industryMatch && riskMatch;
    });
  }, [rankings, searchQuery, minScore, filterSeniority, filterIndustry, hideRisk]);

  const getAutomationStatus = (r, i) => {
    if (automationRules.type === 'fixed' && r.final_score >= automationRules.value) return true;
    if (automationRules.type === 'percentile') return i < Math.ceil(rankings.length * (automationRules.value / 100));
    return false;
  };

  const scanPool = () => { setIsScanningPool(true); setTimeout(() => { setDiscoveredCandidates([{ name: 'David Miller', match: 94 }]); setIsScanningPool(false); toast('Matches Found', 'success'); }, 1500); };

  if (loading) return <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>;

  return (
    <div className="page-content animate-in" style={{ background: '#F8FAFC', minHeight: '100vh', padding: '40px 60px', paddingBottom: selectedKeys.length > 0 ? 140 : 40 }}>
      
      {/* Strategic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--red-600)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 16px rgba(220, 38, 38, 0.2)' }}><Users size={22} color="#fff" /></div>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: '#1E293B', margin: 0 }}>Smart Candidate Screening</h1>
           </div>
           <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Analyzing pool for: <span style={{ color: 'var(--red-600)' }}>{jobs.find(j => j.id === activeJobId)?.title}</span></p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
           <Btn onClick={() => setIsJDInsightsOpen(true)} variant="secondary" style={{ height: 48, borderRadius: 14, background: '#FFFBEB', color: '#D97706' }}><Lightbulb size={18} style={{ marginRight: 8 }} /> JD Insights</Btn>
              {benchmarkPersona ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', borderRadius: 12, background: '#F5F3FF', border: '1.5px solid #7C3AED' }}>
                  <Brain size={14} color="#7C3AED" />
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#7C3AED' }}>Cloning: {benchmarkPersona.name}</div>
                  <button onClick={() => { setBenchmarkPersona(null); setPersonaMatches({}); }} style={{ border: 'none', background: 'none', color: '#7C3AED', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
                </div>
              ) : (
                <Btn variant="secondary" onClick={() => setIsBenchmarkOpen(true)} style={{ borderRadius: 14 }}>
                  <Star size={16} style={{ marginRight: 8 }} /> Clone Star Talent
                </Btn>
              )}
           <Btn onClick={() => loadRankings(activeJobId)} style={{ height: 48, borderRadius: 14, background: '#fff', border: '1.5px solid #F1F5F9', color: '#1E293B' }}><RefreshCw size={18} /></Btn>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
        {[
          { label: 'Total Applicants', value: rankings.length, icon: FileText, color: '#1E293B' },
          { label: 'Avg Match Score', value: rankings.length ? `${Math.round(rankings.reduce((a,b) => a + (b.final_score||0), 0) / rankings.length)}%` : '0%', icon: Activity, color: 'var(--red-600)' },
          { label: 'Potential Elite', value: rankings.filter(r => r.final_score > 85).length, icon: Star, color: 'var(--red-800)' },
          { label: 'Reliability', value: '38%', icon: ShieldCheck, color: '#1E293B' },
        ].map(stat => (
          <div key={stat.label} style={{ padding: '24px', borderRadius: 28, background: '#fff', border: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F8FAFC', color: stat.color, display: 'grid', placeItems: 'center' }}><stat.icon size={22} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase' }}>{stat.label}</div><div style={{ fontSize: 24, fontWeight: 900, color: '#1E293B' }}>{stat.value}</div></div>
          </div>
        ))}
      </div>

      {/* INTEGRATED FILTER TOOLBAR (Within Page Flow) */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: 28, border: '1.5px solid #F1F5F9', marginBottom: 32 }}>
         <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
            <div>
               <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Active Job Hub</label>
               <select value={activeJobId} onChange={e => { setActiveJobId(e.target.value); loadRankings(e.target.value); }} style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 12px', fontSize: 13, fontWeight: 800 }}>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
               </select>
            </div>
            <div>
               <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Seniority Tier</label>
               <select value={filterSeniority} onChange={e => setFilterSeniority(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 12px', fontSize: 13, fontWeight: 800 }}>
                  <option value="All">All Tiers</option>
                  <option value="Expert / Lead">Expert / Lead</option>
                  <option value="Senior">Senior</option>
                  <option value="Mid-Level">Mid-Level</option>
               </select>
            </div>
            <div>
               <label style={{ display: 'block', fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Industry DNA</label>
               <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #F1F5F9', background: '#F8FAFC', padding: '0 12px', fontSize: 13, fontWeight: 800 }}>
                  <option value="All">All Industries</option>
                  <option value="FinTech">FinTech</option>
                  <option value="Cloud/SaaS">Cloud/SaaS</option>
               </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44 }}>
               <input type="checkbox" checked={hideRisk} onChange={e => setHideRisk(e.target.checked)} style={{ width: 18, height: 18 }} />
               <span style={{ fontSize: 13, fontWeight: 800, color: hideRisk ? 'var(--red-600)' : '#64748B' }}>Hide Risk</span>
            </div>
         </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
         <Btn onClick={scanPool} variant="secondary" size="sm" style={{ borderRadius: 12 }}><Radar size={14} style={{ marginRight: 6 }} /> Neural Scan</Btn>
         {benchmarkPersona ? (
           <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', borderRadius: 12, background: '#F5F3FF', border: '1.5px solid #7C3AED' }}>
             <Brain size={14} color="#7C3AED" />
             <div style={{ fontSize: 11, fontWeight: 900, color: '#7C3AED' }}>Target Persona: {benchmarkPersona.name}</div>
             <button onClick={() => { setBenchmarkPersona(null); setPersonaMatches({}); }} style={{ border: 'none', background: 'none', color: '#7C3AED', cursor: 'pointer', padding: 2, display: 'grid', placeItems: 'center' }}><X size={14} /></button>
           </div>
         ) : (
           <Btn onClick={() => setIsBenchmarkOpen(true)} variant="secondary" size="sm" style={{ borderRadius: 12 }}><Brain size={14} style={{ marginRight: 6 }} /> Clone Star Talent</Btn>
         )}
      </div>

      {/* Main Ledger */}
      <div className="card" style={{ padding: 0, borderRadius: 24, border: '1.5px solid #F1F5F9', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              <th style={{ padding: '20px 24px', width: 40 }}><input type="checkbox" checked={selectedKeys.length === filteredRankings.length && filteredRankings.length > 0} onChange={() => setSelectedKeys(selectedKeys.length === filteredRankings.length ? [] : filteredRankings.map((r,i) => `${r.submission_id}-${i}`))} /></th>
              {['Applicant', 'Scoring Metrics', 'Reliability', 'Actions'].map(h => <th key={h} style={{ padding: '20px 24px', textAlign: 'left', fontSize: 11, fontWeight: 950, color: '#64748B', textTransform: 'uppercase' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredRankings.map((r, i) => {
              const k = `${r.submission_id}-${i}`;
              const isRisk = r.profile_meta?.fraud_detection?.is_padding_risk;
              return (
                <tr key={k} style={{ borderBottom: '1px solid #F1F5F9', background: selectedKeys.includes(k) ? '#FFF1F2' : 'transparent' }}>
                  <td style={{ padding: '20px 24px' }}><input type="checkbox" checked={selectedKeys.includes(k)} onChange={() => setSelectedKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])} /></td>
                  <td style={{ padding: '20px 24px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isRisk ? '#FEF2F2' : '#F1F5F9', display: 'grid', placeItems: 'center', fontWeight: 900, color: isRisk ? '#DC2626' : '#64748B' }}>{r.candidate_name[0]}</div>
                        <div>
                           <div style={{ fontSize: 14, fontWeight: 800 }}>{r.candidate_name} {getAutomationStatus(r, i) && <Sparkles size={13} color="var(--red-600)" />}</div>
                           {r.source === 'media' && <div style={{ fontSize: 9, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase' }}>Media Archive</div>}
                        </div>
                     </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase' }}>{benchmarkPersona ? 'Persona Fit' : 'JD Match'}</div>
                        <div style={{ fontSize: 16, fontWeight: 950, color: benchmarkPersona ? '#7C3AED' : 'var(--red-600)' }}>
                          {benchmarkPersona ? (personaMatches[r.submission_id] || 0) : Math.round(r.final_score)}%
                        </div>
                      </div>
                      {benchmarkPersona && (
                        <div style={{ paddingLeft: 12, borderLeft: '1.5px solid #F1F5F9' }}>
                          <div style={{ fontSize: 9, fontWeight: 950, color: '#94A3B8', textTransform: 'uppercase' }}>JD Match</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8' }}>{Math.round(r.final_score)}%</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <div style={{ fontSize: 12, fontWeight: 800 }}>{r.profile_meta?.seniority_tier || 'N/A'}</div>
                     <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>{r.profile_meta?.industry_focus || 'General'} Specialist</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     {isRisk ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', fontWeight: 900, fontSize: 11 }}><Shield size={14} /> Padding Risk</div>
                     ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', fontWeight: 900, fontSize: 11 }}><Shield size={14} /> Verified</div>
                     )}
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                     <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setActiveCandidate(r); setIsDetailOpen(true); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #F1F5F9', background: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Details</button>
                        <button 
                           onClick={() => handleFindSimilar(r.submission_id)} 
                           disabled={!r.submission_id}
                           style={{ 
                             padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--red-100)', 
                             background: r.submission_id ? 'var(--red-50)' : '#F1F5F9', 
                             color: r.submission_id ? 'var(--red-600)' : '#94A3B8', 
                             fontSize: 11, fontWeight: 900, cursor: r.submission_id ? 'pointer' : 'not-allowed', 
                             display: 'flex', alignItems: 'center', gap: 6 
                           }}
                        >
                           <Sparkles size={14} /> Similar
                        </button>
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {discoveredCandidates.length > 0 && (
        <div style={{ marginTop: 40 }}><h2 style={{ fontSize: 20, fontWeight: 900 }}>AI Discovery Pool</h2>
           {discoveredCandidates.map(c => <div key={c.name} style={{ background: '#fff', padding: 24, borderRadius: 24, border: '1.5px solid #DCFCE7', display: 'flex', justifyContent: 'space-between', marginTop: 16 }}><div>{c.name} • {c.match}% Fit</div><Btn size="sm">Import</Btn></div>)}
        </div>
      )}

      {selectedKeys.length > 0 && (
        <div className="animate-in" style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#0F172A', padding: '16px 32px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.5)', zIndex: 1500 }}>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 950 }}>{selectedKeys.length} Selected</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{ height: 44, padding: '0 20px', borderRadius: 10, background: '#fff', fontWeight: 900, cursor: 'pointer' }}>Schedule Interview</button>
            <button style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'var(--red-600)', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>Add to Shortlist</button>
            <button style={{ height: 44, padding: '0 20px', borderRadius: 10, background: 'transparent', color: '#F87171', border: '1.5px solid rgba(248,113,113,0.3)', fontWeight: 900, cursor: 'pointer' }}>Reject Applicants</button>
          </div>
        </div>
      )}

      <DetailDrawer isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} candidate={activeCandidate} />
      <AutomationModal 
        isOpen={isAutomationOpen} 
        onClose={() => setIsAutomationOpen(false)} 
        onDeploy={handleAutomate} 
        currentRules={automationRules} 
      />
      <BenchmarkModal 
        isOpen={isBenchmarkOpen} 
        onClose={() => setIsBenchmarkOpen(false)} 
        onApplyProtocol={handleApplyCloneProtocol} 
      />
      <JDHealthModal 
        isOpen={isJDInsightsOpen} 
        onClose={() => setIsJDInsightsOpen(false)} 
        insights={jobInsights}
        isLoading={isInsightsLoading}
        onOptimize={handleOptimizeJob}
      />
      <SimilarTalentDrawer 
         isOpen={isSimilarOpen} 
         onClose={() => setIsSimilarOpen(false)} 
         results={similarResults} 
         isLoading={isSimilarLoading} 
      />
    </div>
  );
}
