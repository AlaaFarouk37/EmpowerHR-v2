import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/shared/Navbar.jsx';
import { EmployeeHeader } from '../components/shared/EmployeeHeader.jsx';
import { NeuralCommandBar } from '../components/shared/NeuralCommandBar.jsx';
import { NotificationCenter } from '../components/shared/NotificationCenter.jsx';
import { useToast } from '../components/shared/index.jsx';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Sun, Moon, Maximize2, Minimize2, X, Info, Search as SearchIcon, Globe, Menu } from 'lucide-react';

/* --- Neural Drawer (Enhancement 4) --- */
const NeuralDrawer = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)' }} />
      <div style={{ 
        position: 'relative', width: '100%', maxWidth: 520, height: '100%', 
        background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-lg)', animation: 'slide-left 0.4s var(--ease-neural)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
             <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--neural-red)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Neural Deep Dive</div>
             <h3 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 12, border: 'none', background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 40 }}>{children}</div>
      </div>
      <style>{`
        @keyframes slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
};

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateAccountPreferences, portalView } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('eh_theme') === 'dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [drawerData, setDrawerData] = useState({ open: false, title: '', content: null });

  // Persistent memory for the Intelligence Theme Engine
  const patchedElements = useRef(new Set());
  const originalStylesMap = useRef(new WeakMap());
  const isPatching = useRef(false);

  useEffect(() => {
    if (!user) return;
    setIsFocusMode(Boolean(user.focus_mode_preference));
    setIsCompactMode((user.theme_preference || 'comfort') === 'compact');
    setIsDarkMode(user.ui_theme === 'dark');
  }, [user]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
      localStorage.setItem('eh_theme', 'dark');
    } else {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
      localStorage.setItem('eh_theme', 'light');
    }
  }, [isDarkMode]);

  /* --- Dark Mode Inline Style Patcher (MutationObserver) --- */
  useEffect(() => {
    // Map of light colors → dark equivalents
    const LIGHT_BG = {
      'rgb(255, 255, 255)': '#0F172A',     // #fff → slate-900
      'rgb(248, 250, 252)': '#1E293B',     // #F8FAFC → slate-800
      'rgb(241, 245, 249)': '#1E293B',     // #F1F5F9 → slate-800
      'rgb(236, 253, 245)': 'rgba(16,185,129,0.1)',  // #ECFDF5 → teal tint
      'rgb(239, 246, 255)': 'rgba(59,130,246,0.1)',  // #EFF6FF → blue tint
      'rgb(238, 242, 255)': 'rgba(99,102,241,0.1)',  // #EEF2FF → indigo tint
      'rgb(255, 251, 235)': 'rgba(245,158,11,0.1)',  // #FFFBEB → amber tint
      'rgb(254, 242, 242)': 'rgba(220,38,38,0.1)',   // #FEF2F2 → red tint
      'rgb(254, 226, 226)': 'rgba(220,38,38,0.15)',  // #FEE2E2 → red tint
      'white': '#0F172A',
      '#fff': '#0F172A',
      '#ffffff': '#0F172A',
      '#FFFFFF': '#0F172A',
      '#F8FAFC': '#1E293B',
      '#f8fafc': '#1E293B',
      '#F1F5F9': '#1E293B',
      '#f1f5f9': '#1E293B',
      '#ECFDF5': 'rgba(16,185,129,0.1)',
      '#EFF6FF': 'rgba(59,130,246,0.1)',
      '#EEF2FF': 'rgba(99,102,241,0.1)',
      '#FFFBEB': 'rgba(245,158,11,0.1)',
      '#FEF2F2': 'rgba(220,38,38,0.1)',
      '#FEE2E2': 'rgba(220,38,38,0.15)',
      '#FBFBFF': '#1E293B',
      '#E2E8F0': '#334155',
    };
    const LIGHT_BORDER = {
      'rgb(241, 245, 249)': 'rgba(255,255,255,0.08)',
      'rgb(226, 232, 240)': 'rgba(255,255,255,0.08)',
      'rgb(255, 255, 255)': 'rgba(255,255,255,0.08)',
      '#F1F5F9': 'rgba(255,255,255,0.08)',
      '#f1f5f9': 'rgba(255,255,255,0.08)',
      '#E2E8F0': 'rgba(255,255,255,0.08)',
      '#e2e8f0': 'rgba(255,255,255,0.08)',
      '#fff': 'rgba(255,255,255,0.08)',
      '#FFFFFF': 'rgba(255,255,255,0.08)',
    };
    const DARK_TEXT = {
      'rgb(30, 41, 59)': '#F8FAFC',
      'rgb(71, 85, 105)': '#CBD5E1',
      'rgb(100, 116, 139)': '#CBD5E1',
      '#1E293B': '#F8FAFC',
      '#1e293b': '#F8FAFC',
      '#475569': '#CBD5E1',
      '#64748B': '#CBD5E1',
      '#64748b': '#CBD5E1',
      '#94A3B8': '#CBD5E1',
      '#334155': '#E2E8F0',
    };

    function shouldSkip(el) {
      if (!el.style || !el.getAttribute) return true;
      const styleAttr = el.getAttribute('style');
      if (!styleAttr) return true;
      // Skip elements with gradient backgrounds (buttons, badges, branded elements)
      if (styleAttr.includes('gradient')) return true;
      // Skip elements inside sidebar (already themed via CSS variables)
      if (el.closest && el.closest('.app-sidebar')) return true;
      // Skip elements inside topbar (already themed via CSS variables)
      if (el.closest && el.closest('.app-topbar-inner')) return true;
      return false;
    }

    function patchElement(el) {
      if (shouldSkip(el)) return;

      // Store original style for restoration (only first time)
      if (!originalStylesMap.current.has(el)) {
        originalStylesMap.current.set(el, el.getAttribute('style'));
      }

      const cs = el.style;

      // Patch background / backgroundColor
      const bgProp = cs.background;
      const bgColorProp = cs.backgroundColor;
      const bg = bgProp || bgColorProp;
      if (bg && !bg.includes('gradient') && !bg.includes('var(')) {
        for (const [light, dark] of Object.entries(LIGHT_BG)) {
          if (bg === light || bg.includes(light)) {
            if (bgProp) cs.background = dark;
            if (bgColorProp) cs.backgroundColor = dark;
            break;
          }
        }
      }

      // Patch borderColor
      const bc = cs.borderColor;
      if (bc && !bc.includes('var(')) {
        for (const [light, dark] of Object.entries(LIGHT_BORDER)) {
          if (bc === light || bc.includes(light)) {
            cs.borderColor = dark;
            break;
          }
        }
      }
      // Patch border shorthand
      const border = cs.border;
      if (border && !border.includes('var(')) {
        for (const [light, dark] of Object.entries(LIGHT_BORDER)) {
          if (border.includes(light)) {
            cs.border = border.replace(light, dark);
            break;
          }
        }
      }

      // Patch text color
      const clr = cs.color;
      if (clr && !clr.includes('var(')) {
        for (const [light, dark] of Object.entries(DARK_TEXT)) {
          if (clr === light) {
            cs.color = dark;
            break;
          }
        }
      }

      patchedElements.current.add(el);
    }

    function unpatchElement(el) {
      if (!originalStylesMap.current.has(el)) return;
      const original = originalStylesMap.current.get(el);
      if (original) {
        el.setAttribute('style', original);
      }
      originalStylesMap.current.delete(el);
      patchedElements.current.delete(el);
    }

    function patchAll() {
      isPatching.current = true;
      const content = document.querySelectorAll('.page-content [style], .app-main [style]');
      content.forEach(patchElement);
      isPatching.current = false;
    }

    function unpatchAll() {
      isPatching.current = true;
      const content = document.querySelectorAll('.page-content [style], .app-main [style]');
      content.forEach(unpatchElement);
      isPatching.current = false;
    }

    let observer = null;

    if (isDarkMode) {
      // Initial patch (use rAF + small delay for React to finish rendering)
      requestAnimationFrame(() => {
        setTimeout(() => patchAll(), 50);
      });

      // Observe for new/changed DOM nodes
      observer = new MutationObserver((mutations) => {
        if (isPatching.current) return; // Prevent infinite loop
        isPatching.current = true;
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.getAttribute && node.getAttribute('style')) {
                  patchElement(node);
                }
                const styledChildren = node.querySelectorAll ? node.querySelectorAll('[style]') : [];
                styledChildren.forEach(patchElement);
              }
            });
          }
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const el = mutation.target;
            if (el.nodeType === Node.ELEMENT_NODE && !patchedElements.current.has(el)) {
              patchElement(el);
            }
          }
        }
        isPatching.current = false;
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style'],
      });
    } else {
      unpatchAll();
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [isDarkMode, location.pathname]);

  const toggleTheme = useCallback(async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    try {
      await updateAccountPreferences({ ui_theme: next ? 'dark' : 'light' });
    } catch (err) { setIsDarkMode(!next); }
  }, [isDarkMode, updateAccountPreferences]);

  const toggleDensity = useCallback(async () => {
    const next = !isCompactMode;
    setIsCompactMode(next);
    try {
      await updateAccountPreferences({ theme_preference: next ? 'compact' : 'comfort' });
    } catch (err) { setIsCompactMode(!next); }
  }, [isCompactMode, updateAccountPreferences]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setIsCommandOpen(c => !c);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isEmployeePortal = portalView === 'employee';

  return (
    <div className={`app-shell ${isDarkMode ? 'theme-dark' : 'theme-light'} ${isCompactMode ? 'is-compact' : ''} ${isFocusMode ? 'is-sidebar-hidden' : ''} ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''} ${isEmployeePortal ? 'is-employee-portal' : ''}`}>
      {isEmployeePortal ? (
        <EmployeeHeader />
      ) : (
        !isFocusMode && <Navbar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      )}
      
      <main className="app-main hr-main-area" style={{ 
        transition: 'background 0.5s var(--ease-neural)',
        marginLeft: isEmployeePortal ? 0 : undefined 
      }}>
        {/* Neural Topbar - Only show if not in Employee Portal */}
        {!isEmployeePortal && (
          <div className="app-topbar-inner" style={{ 
            background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderBottom: '1px solid var(--border-primary)',
            height: 80, padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
            <button 
              className="mobile-only-flex"
              onClick={() => setIsMobileMenuOpen(true)}
              style={{ 
                width: 44, height: 44, borderRadius: 14, border: '1px solid var(--border-primary)', 
                background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer',
                display: 'none', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <Menu size={20} />
            </button>

            <div 
              className="desktop-only-flex"
              style={{ 
                background: 'var(--bg-surface)', borderRadius: 16, padding: '12px 20px', 
                display: 'flex', alignItems: 'center', gap: 14, width: '100%', maxWidth: 420, cursor: 'pointer',
                border: '1px solid var(--border-primary)', transition: 'all 0.2s var(--ease-neural)'
              }} 
              onClick={() => setIsCommandOpen(true)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--neural-red)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <SearchIcon size={18} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 700, flex: 1 }}>{t('Search neural index...')}</span>
              <kbd style={{ background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', border: '1px solid var(--border-primary)' }}>Ctrl K</kbd>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 4, borderRadius: 14, border: '1px solid var(--border-primary)' }}>
                <button 
                  onClick={() => setIsDarkMode(false)} 
                  style={{ 
                    width: 36, height: 36, borderRadius: 10, border: 'none', 
                    background: !isDarkMode ? 'var(--color-primary-teal)' : 'transparent', 
                    color: !isDarkMode ? 'white' : 'var(--text-muted)', 
                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                    transition: 'all 0.2s var(--ease-neural)'
                  }}
                >
                   <Sun size={18} />
                </button>
                <button 
                  onClick={() => setIsDarkMode(true)} 
                  style={{ 
                    width: 36, height: 36, borderRadius: 10, border: 'none', 
                    background: isDarkMode ? 'var(--color-primary-teal)' : 'transparent', 
                    color: isDarkMode ? 'white' : 'var(--text-muted)', 
                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                    transition: 'all 0.2s var(--ease-neural)'
                  }}
                >
                   <Moon size={18} />
                </button>
             </div>

             <button onClick={toggleLanguage} style={{ 
               width: 52, height: 44, borderRadius: 14, border: '1px solid var(--border-primary)', 
               background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer', 
               display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
               fontSize: 12, fontWeight: 900
             }}>
                <Globe size={18} />
                <span>{language === 'ar' ? 'EN' : 'AR'}</span>
             </button>

             <NotificationCenter />

             <button onClick={toggleDensity} style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                {isCompactMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
             </button>

             <div style={{ width: 1, height: 24, background: 'var(--border-primary)', margin: '0 8px' }} />

             <div 
               style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} 
               onClick={() => {
                 const profilePath = user?.role === 'HRManager' ? '/hr/profile' : (user?.role === 'Admin' ? '/admin/profile' : '/employee/profile');
                 navigate(profilePath);
               }}
             >
                <div style={{ textAlign: 'end' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{user?.full_name}</div>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t(`role.${user?.role}`)}</div>
                </div>
                <div style={{ 
                  width: 44, height: 44, borderRadius: '50%', background: 'var(--neural-red)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900,
                  boxShadow: '0 4px 12px var(--neural-red-soft)'
                }}>
                  {user?.full_name?.charAt(0)}
                </div>
             </div>
          </div>
        </div>
      )}

        {/* Strategic Momentum Container */}
        <div key={location.pathname} className="neural-animate-entry" style={{ padding: isEmployeePortal ? '24px 40px' : '40px' }}>
           <Outlet context={{ setDrawer: (title, content) => setDrawerData({ open: true, title, content }) }} />
        </div>

        <NeuralCommandBar isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
        <NeuralDrawer isOpen={drawerData.open} onClose={() => setDrawerData({ ...drawerData, open: false })} title={drawerData.title}>
           {drawerData.content}
        </NeuralDrawer>

        <NeuralDrawer isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} title="System Navigation">
           <div style={{ margin: '-40px' }}>
              <Navbar isCollapsed={false} onToggle={() => {}} />
           </div>
        </NeuralDrawer>
      </main>
    </div>
  );
}
