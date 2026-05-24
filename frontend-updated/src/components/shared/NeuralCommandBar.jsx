import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Brain, 
  ArrowRight, 
  Sparkles,
  Users,
  CreditCard,
  FileText,
  CheckCircle,
  Activity,
  UserPlus,
  Network,
  Zap,
  Clock,
  Shield
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { postCommandQuery } from '../../api/ai';
import { hrGetEmployees } from '../../api/index.js';
import { talentSearch } from '../../api/recruitment';

export const NeuralCommandBar = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { resolvePath, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [vaultResults, setVaultResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);

  const ACTIONS = useMemo(() => [
    { id: 'emp-list', title: t('Human Capital Ledger'), category: t('Pages'), icon: <Users size={16} />, path: '/hr/employees' },
    { id: 'payroll', title: t('Fiscal Pulse Node'), category: t('Pages'), icon: <CreditCard size={16} />, path: '/hr/payroll' },
    { id: 'add-emp', title: t('Initialize Onboarding'), category: t('Actions'), icon: <UserPlus size={16} />, path: '/hr/onboarding', cmd: '/add' },
    { id: 'org-map', title: t('Structural Intelligence'), category: t('Pages'), icon: <Network size={16} />, path: '/hr/org-map', cmd: '/org' },
    { id: 'payroll-action', title: t('Run Payroll Audit'), category: t('Actions'), icon: <Zap size={16} />, path: '/hr/payroll', cmd: '/pay' },
    { id: 'attendance', title: t('Operational Rhythm'), category: t('Pages'), icon: <Clock size={16} />, path: '/hr/attendance', cmd: '/att' },
    { id: 'docs', title: t('Artifact Governance'), category: t('Pages'), icon: <FileText size={16} />, path: '/hr/documents' },
    { id: 'approvals', title: t('Decision Matrix'), category: t('Pages'), icon: <CheckCircle size={16} />, path: '/hr/approvals' },
  ], [t]);

  const SMART_DRAFTS = useMemo(() => [
    { id: 'draft-review', title: t('Draft performance review...'), category: t('Neural Draft'), icon: <Sparkles size={16} />, path: '/hr/reviews', isAi: true },
    { id: 'draft-audit', title: t('Initiate fiscal audit...'), category: t('Neural Draft'), icon: <Zap size={16} />, path: '/hr/payroll', isAi: true },
    { id: 'draft-onboarding', title: t('Generate onboarding plan...'), category: t('Neural Draft'), icon: <UserPlus size={16} />, path: '/hr/onboarding', isAi: true },
    { id: 'draft-risk', title: t('Analyze workforce risk...'), category: t('Neural Draft'), icon: <Shield size={16} />, path: '/admin/intelligence', isAi: true },
  ], [t]);

  useEffect(() => {
    if (authLoading) return;

    const saved = localStorage.getItem('eh_recent_searches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter(s => s && typeof s === 'object' && s.id && s.title));
        }
      } catch (e) { localStorage.removeItem('eh_recent_searches'); }
    }
    
    // Load directory for local search - only for authorized roles
    if (user?.role === 'HRManager' || user?.role === 'Admin') {
      hrGetEmployees().then(data => setEmployees(Array.isArray(data) ? data : [])).catch(() => {});
    }
  }, [authLoading, user]);

  const saveRecentSearch = useCallback((action) => {
    const updated = [action, ...recentSearches.filter(s => s.id !== action.id)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('eh_recent_searches', JSON.stringify(updated));
  }, [recentSearches]);

  useEffect(() => {
    if (query.trim().length < 3) { setAiResult(null); return; }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await postCommandQuery(query);
        if (res.action === 'redirect') {
          setAiResult({
            id: 'ai-intent',
            title: res.message,
            category: t('Neural Intent'),
            icon: <Sparkles size={16} />,
            path: res.target,
            isAi: true
          });
        } else { setAiResult(null); }
      } catch (err) { console.error('AI Command Error', err); }
      finally { setIsLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, t]);

  useEffect(() => {
    if (query.trim().length < 3) { setVaultResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const results = await talentSearch(query);
        setVaultResults(results.map(r => ({
          id: `vault-${r.id}`,
          title: r.name,
          category: t('Talent Vault'),
          icon: <Brain size={16} />,
          path: `/hr/cv-ranking`, // Link to CV ranking (maybe with a filter)
          meta: `${r.job_title} • ${Math.round(r.score * 100)}% Match`
        })));
      } catch (err) { console.error('Vault Search Error', err); }
    }, 500);
    return () => clearTimeout(timer);
  }, [query, t]);

  const filteredActions = useMemo(() => {
    if (query.trim() === '') return recentSearches;
    
    const lowerQuery = query.toLowerCase();
    const keywords = lowerQuery.split(' ').filter(k => k.length > 0);
    
    // 1. Direct Keyword / Command Matching
    const matches = ACTIONS.filter(a => {
      // Direct title match
      if (a.title.toLowerCase().includes(lowerQuery)) return true;
      // Command match (e.g. /pay)
      if (a.cmd && keywords.some(k => a.cmd.includes(k) || k.includes(a.cmd))) return true;
      // Semantic intent detection (e.g. "pay" -> payroll)
      const intentKeywords = {
        'pay': ['payroll', 'salary', 'audit'],
        'hire': ['onboarding', 'initialize'],
        'add': ['onboarding', 'initialize'],
        'leave': ['attendance', 'rhythm'],
        'att': ['attendance', 'rhythm'],
        'org': ['structural', 'map'],
        'doc': ['artifact', 'governance'],
        'app': ['decision', 'matrix']
      };
      
      return Object.entries(intentKeywords).some(([trigger, targets]) => 
        keywords.includes(trigger) && targets.some(t => a.title.toLowerCase().includes(t))
      );
    });

    // 2. Intelligent People Search
    const empMatches = employees.filter(e => {
      const nameParts = e.fullName.toLowerCase().split(' ');
      // Match if any keyword matches any part of the name or the ID
      return keywords.some(k => 
        nameParts.some(np => np.startsWith(k)) || 
        e.employeeID.toLowerCase().includes(k)
      );
    }).slice(0, 3).map(e => ({
      id: `emp-${e.employeeID}`,
      title: e.fullName,
      category: t('People'),
      icon: <div style={{ 
        width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary-teal)', color: 'white',
        display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 900 
      }}>{e.fullName.charAt(0)}</div>,
      path: `/hr/employees?id=${e.employeeID}`,
      meta: e.jobTitle
    }));
    
    const results = [...matches, ...empMatches, ...vaultResults];
    
    // 3. Inject Smart Drafts if relevant keywords match
    const draftMatches = SMART_DRAFTS.filter(d => 
      keywords.some(k => d.title.toLowerCase().includes(k) || d.category.toLowerCase().includes(k))
    );
    results.push(...draftMatches);

    if (aiResult) results.unshift(aiResult);
    
    // De-duplicate by ID
    const seen = new Set();
    return results.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [query, ACTIONS, employees, aiResult, recentSearches, t]);

  const handleExecute = useCallback((action) => {
    saveRecentSearch(action);
    navigate(resolvePath(action.path));
    onClose();
  }, [navigate, resolvePath, onClose, saveRecentSearch]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % Math.max(filteredActions.length, 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredActions.length) % Math.max(filteredActions.length, 1));
      }
      if (e.key === 'Enter' && filteredActions[activeIndex]) {
        handleExecute(filteredActions[activeIndex]);
      }
    }
  }, [isOpen, filteredActions, activeIndex, handleExecute, onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="neural-command-wrapper" onClick={onClose}>
      <div className="neural-command-bar" onClick={e => e.stopPropagation()}>
        <div className="neural-input-container">
          {isLoading ? (
            <Sparkles size={22} style={{ color: 'var(--neural-red)', animation: 'pulse-neural 2s infinite' }} />
          ) : (
            <Search size={22} style={{ color: 'var(--text-muted)' }} />
          )}
          <input 
            ref={inputRef}
            className="neural-input"
            placeholder={t('Search or command... (e.g. /pay, "Ahmed Ali")')}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {['ESC'].map(k => (
              <div key={k} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }}>{k}</div>
            ))}
          </div>
        </div>

        <div className="neural-results-list">
          {filteredActions.length > 0 ? (
            filteredActions.map((action, idx) => (
              <button 
                key={action.id}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleExecute(action)}
                className={`neural-result-item ${idx === activeIndex ? 'is-active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ 
                    width: 40, height: 40, borderRadius: 12, 
                    background: action.isAi ? 'var(--neural-red)' : (idx === activeIndex ? 'var(--bg-primary)' : 'var(--bg-surface)'), 
                    color: idx === activeIndex ? 'var(--neural-red)' : 'var(--text-primary)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                  }}>
                    {action.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: idx === activeIndex ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {String(action.title || '')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {String(action.meta || action.category || '')}
                    </div>
                  </div>
                </div>
                {idx === activeIndex && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--neural-red)', textTransform: 'uppercase' }}>{t('Execute')}</span>
                    <ArrowRight size={14} style={{ color: 'var(--neural-red)' }} />
                  </div>
                )}
              </button>
            ))
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <Brain size={40} style={{ margin: '0 auto 16px', color: 'var(--text-muted)', opacity: 0.2 }} />
              <div style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{t('No neural matches found.')}</div>
              
              <div style={{ textAlign: 'left', maxWidth: 320, margin: '0 auto' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{t('Suggestions')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { t: t('Run payroll for employees'), q: 'pay' },
                    { t: t('Initialize new onboarding'), q: 'add' },
                    { t: t('View structural org map'), q: 'org' },
                    { t: t('Find Ahmed in directory'), q: 'Ahmed' }
                  ].map(s => (
                    <button key={s.q} onClick={() => setQuery(s.q)} style={{ 
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', 
                      padding: '8px 12px', borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)',
                      textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                      <Sparkles size={12} style={{ color: 'var(--neural-red)' }} />
                      {s.t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-primary)' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <kbd style={{ padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: 4, color: 'var(--text-muted)', fontSize: 10 }}>↑↓</kbd>
               <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Navigate')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <kbd style={{ padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: 4, color: 'var(--text-muted)', fontSize: 10 }}>↵</kbd>
               <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('Open')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={12} style={{ color: 'var(--neural-red)' }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>NEURAL COMMAND V2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
