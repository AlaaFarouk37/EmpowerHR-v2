import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

import { postCommandQuery } from '../../api/ai';

export const CommandSearch = () => {
  const { t } = useLanguage();
  const { resolvePath } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const ACTIONS = [
    { id: 'emp-list', title: t('Human Capital Ledger'), category: t('Operations'), icon: '👥', path: '/hr/employees' },
    { id: 'payroll', title: t('Fiscal Pulse Node'), category: t('Finance'), icon: '💰', path: '/hr/payroll' },
    { id: 'docs', title: t('Artifact Governance'), category: t('Governance'), icon: '📁', path: '/hr/documents' },
    { id: 'analytics', title: t('Cognitive Terminal'), category: t('Intelligence'), icon: '📊', path: '/admin/analytics' },
    { id: 'training', title: t('Neural Upgrading'), category: t('Evolution'), icon: '🧬', path: '/hr/training' },
    { id: 'approvals', title: t('Decision Matrix'), category: t('Operations'), icon: '⚖️', path: '/hr/approvals' },
  ];

  // AI Command Processing
  useEffect(() => {
    if (query.trim().length < 3) {
      setAiResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await postCommandQuery(query);
        if (res.action === 'redirect') {
          setAiResult({
            id: 'ai-intent',
            title: res.message,
            category: t('Neural Intent'),
            icon: '🧠',
            path: res.target,
            params: res.params,
            isAi: true
          });
        } else {
          setAiResult(null);
        }
      } catch (err) {
        console.error('AI Command Error', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, t]);

  const localMatches = ACTIONS.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) || 
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  const filteredActions = aiResult ? [aiResult, ...localMatches] : localMatches;

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
    if (e.key === 'Escape') setIsOpen(false);
    
    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredActions.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
      }
      if (e.key === 'Enter' && filteredActions[activeIndex]) {
        navigate(resolvePath(filteredActions[activeIndex].path));
        setIsOpen(false);
      }
    }
  }, [isOpen, filteredActions, activeIndex, navigate, resolvePath]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', padding: 24 }}>
      {/* Backdrop */}
      <div 
        onClick={() => setIsOpen(false)}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', animation: 'fade-in 0.2s' }} 
      />
      
      {/* Search Modal */}
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: 640, 
        background: 'var(--bg-surface)', 
        borderRadius: 24, 
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        border: '1px solid var(--border-soft)',
        animation: 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-soft)' }}>
          <span style={{ fontSize: 20, marginRight: 16 }}>🔍</span>
          <input 
            autoFocus
            placeholder={t('Search neural index... (e.g. "Who is at risk?", "Audit Payroll")')}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 18, fontWeight: 700, color: 'var(--gray-900)' }}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
          />
          {isLoading && <div className="ai-loader-dots" style={{ marginRight: 12 }}><span></span><span></span><span></span></div>}
          <div style={{ padding: '4px 8px', background: 'var(--gray-50)', border: '1px solid var(--border-soft)', borderRadius: 6, fontSize: 11, fontWeight: 800, color: 'var(--gray-400)' }}>ESC</div>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto', padding: 12 }}>
          {filteredActions.length > 0 ? (
            filteredActions.map((action, idx) => (
              <div 
                key={action.id}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => { navigate(resolvePath(action.path)); setIsOpen(false); }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 16, 
                  padding: '12px 16px', 
                  borderRadius: 14, 
                  cursor: 'pointer',
                  background: action.isAi 
                    ? (idx === activeIndex ? 'linear-gradient(90deg, #fff1f0 0%, #f9fafb 100%)' : 'rgba(232, 50, 26, 0.03)')
                    : (idx === activeIndex ? 'var(--gray-50)' : 'transparent'),
                  border: action.isAi ? '1px solid rgba(232, 50, 26, 0.1)' : '1px solid transparent',
                  transition: 'all 0.2s',
                  marginBottom: 4
                }}
              >
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 10, 
                  background: action.isAi ? 'var(--red)' : (idx === activeIndex ? 'white' : 'var(--gray-50)'), 
                  color: action.isAi ? 'white' : 'inherit',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 18,
                  boxShadow: idx === activeIndex ? 'var(--shadow-xs)' : 'none'
                }}>
                  {action.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: action.isAi ? 'var(--red)' : 'var(--gray-900)' }}>{action.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: action.isAi ? 'var(--red-light)' : 'var(--gray-400)', textTransform: 'uppercase', marginTop: 2 }}>
                    {action.isAi && <span style={{ marginRight: 6 }}>✨</span>}
                    {action.category}
                  </div>
                </div>
                {idx === activeIndex && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: action.isAi ? 'var(--red)' : 'var(--gray-400)' }}>
                    {action.isAi ? 'AI COMMAND ↵' : 'ENTER ↵'}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🌑</div>
              <div style={{ fontWeight: 800, color: 'var(--gray-400)' }}>{t('No neural matches found.')}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 24px', background: 'var(--gray-50)', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <div style={{ padding: '2px 6px', background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>↑↓</div>
               <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{t('Navigate')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <div style={{ padding: '2px 6px', background: 'var(--bg-surface)', border: '1px solid var(--border-soft)', borderRadius: 4, fontSize: 10, fontWeight: 800 }}>↵</div>
               <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase' }}>{t('Execute')}</span>
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--red)' }}>NEURAL COMMAND ENGINE v1.0</div>
        </div>
      </div>
    </div>
  );
};
