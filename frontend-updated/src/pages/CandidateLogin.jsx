import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { confirmPasswordReset, registerCandidate, requestPasswordResetOtp } from "../api/index";
import { Mail, Lock, User, Globe, ShieldCheck } from "lucide-react";

const candidateHighlights = [
  'auth.candidateHighlight1',
  'auth.candidateHighlight2',
  'auth.candidateHighlight3',
];

export default function CandidateLogin() {
  const { login } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [resetStep, setResetStep] = useState("request");
  const [form, setForm] = useState({ email: "", full_name: "", password: "" });
  const [resetForm, setResetForm] = useState({ email: "", otp: "", new_password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState({ email: false, password: false, otp: false, newPassword: false, fullName: false });

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const moveX = (clientX - window.innerWidth / 2) / 50;
    const moveY = (clientY - window.innerHeight / 2) / 50;
    setMousePos({ x: moveX, y: moveY });
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleResetChange = (e) =>
    setResetForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateEmail(form.email)) {
      setError('auth.invalidEmailFormat');
      return;
    }

    if (form.password.length < 4) {
      setError('auth.passwordTooShort');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = await login(form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.detail || data?.non_field_errors?.[0] || err.message || t('auth.invalidCredentials');
      setError(msg === "true" || msg === true ? t('auth.invalidCredentials') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.full_name.trim() || form.full_name.trim().split(' ').length < 2) {
      setError('auth.enterFullName');
      return;
    }

    if (!validateEmail(form.email)) {
      setError('auth.invalidEmailFormat');
      return;
    }

    if (form.password.length < 8) {
      setError('auth.passwordTooShort8');
      return;
    }

    setLoading(true);
    try {
      await registerCandidate({
        email: form.email,
        full_name: form.full_name,
        password: form.password,
      });
      setSuccess(t('auth.registerSuccess'));
      setMode("login");
    } catch (err) {
      const data = err.response?.data;
      let msg = data?.detail || data?.email?.[0] || data?.password?.[0] || data?.full_name?.[0] || err.message || "Registration failed.";
      if (msg === "true" || msg === true) msg = "Registration failed. Please check your details.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    const email = (resetForm.email || form.email).trim();
    if (!email) {
      setError(t('auth.enterEmailFirst'));
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await requestPasswordResetOtp({ email });
      setResetForm((prev) => ({ ...prev, email }));
      setResetStep("confirm");
      setSuccess(t('auth.resetEmailSent'));
    } catch (err) {
      setError(err.message || "Unable to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (resetForm.otp.length !== 6) {
      setError('auth.invalidOtp');
      return;
    }

    if (resetForm.new_password.length < 8) {
      setError('auth.passwordTooShort8');
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(resetForm);
      setForm((prev) => ({ ...prev, email: resetForm.email, password: "" }));
      setResetForm((prev) => ({ ...prev, otp: "", new_password: "" }));
      setMode("login");
      setResetStep("request");
      setSuccess(t('auth.resetSuccess'));
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-red" onMouseMove={handleMouseMove} style={{ 
      background: '#0F172A',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: 'var(--sans)',
      color: '#fff'
    }}>
      {/* Red Interactive Parallax Mesh */}
      <div style={{ 
        position: 'absolute', inset: -100, 
        backgroundImage: 'radial-gradient(#DC2626 1px, transparent 1px)', 
        backgroundSize: '40px 40px', opacity: 0.1, zIndex: 0,
        transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
        transition: 'transform 0.1s ease-out'
      }}></div>

      <div className="red-pulse-glow" style={{ 
        position: 'absolute', top: '50%', left: '50%', transform: `translate(calc(-50% + ${mousePos.x * 1.5}px), calc(-50% + ${mousePos.y * 1.5}px))`, 
        width: '120vw', height: '120vh', 
        background: 'radial-gradient(circle at 20% 30%, rgba(220, 38, 38, 0.08) 0%, transparent 40%)', 
        zIndex: 0,
        transition: 'transform 0.2s ease-out'
      }}></div>

      <style>{`
        @keyframes red-scan {
          0% { top: -10%; opacity: 0; }
          50% { opacity: 0.5; }
          100% { top: 110%; opacity: 0; }
        }
        .scan-line-red {
          position: absolute;
          left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #DC2626, transparent);
          box-shadow: 0 0 15px #DC2626;
          z-index: 2;
          animation: red-scan 4s linear infinite;
        }
        @keyframes red-core-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(220, 38, 38, 0.4); }
          50% { transform: scale(1.1); box-shadow: 0 0 40px rgba(220, 38, 38, 0.7); }
        }
        .red-core { animation: red-core-pulse 3s infinite ease-in-out; }
        
        .login-btn-premium {
          background: #000;
          color: #fff;
          border: 1px solid #333;
          border-radius: 14px;
          height: 56px;
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.02em;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-btn-premium::after {
          content: '';
          position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: rotate(45deg);
          transition: 0.8s;
        }
        .login-btn-premium:hover:not(:disabled) {
          background: #111;
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .login-btn-premium:hover:not(:disabled):::after {
          left: 100%;
        }
        .login-btn-premium:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .input-premium-container {
          position: relative;
          background: #fff;
          border: 1.5px solid #E5E7EB;
          border-radius: 14px;
          padding: 12px 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }
        .input-premium-container.focused {
          border-color: #DC2626;
          background: #FAFAF9;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05), 0 0 0 4px rgba(220, 38, 38, 0.08);
          transform: translateY(-2px);
        }
        .input-premium-label {
          font-size: 11px;
          font-weight: 800;
          color: #9CA3AF;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 2px;
          transition: color 0.3s;
        }
        .input-premium-container.focused .input-premium-label {
          color: #DC2626;
        }
        .input-premium-field {
          background: transparent;
          border: none;
          outline: none;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          width: 100%;
          padding: 4px 0;
        }
        .input-premium-field::placeholder {
          color: #D1D5DB;
          font-weight: 500;
        }

        .glass-card-split {
          background: #fff;
          border: 1px solid #E5E7EB;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        
        .lang-toggle-light {
          background: #F3F4F6;
          border: 1px solid #E5E7EB;
          color: #4B5563;
          padding: 8px 16px;
          border-radius: 99px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .lang-toggle-light:hover {
          background: #E5E7EB;
          color: #111827;
        }
      `}</style>

      <div className="login-shell glass-card-split" style={{ 
        maxWidth: '1240px', 
        width: '100%', 
        display: 'grid', 
        gridTemplateColumns: '1.1fr 0.9fr', 
        borderRadius: '24px', 
        overflow: 'hidden',
        zIndex: 1,
      }}>
        <aside className="login-showcase" style={{ 
          padding: '80px', 
          color: 'white', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#0B0F19',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div className="scan-line-red" />
          <div style={{ 
            position: 'absolute', top: '-10%', left: '-10%', 
            width: '100%', height: '100%', 
            background: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
            zIndex: 0
          }}></div>

          <div className="login-showcase-content" style={{ position: 'relative', zIndex: 1 }}>
             <span className="login-eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '11px', fontWeight: 800, color: '#F87171', marginBottom: '16px', display: 'block' }}>
               {t('auth.candidateEyebrow')}
             </span>
            <h1 className="login-showcase-title" style={{ fontSize: '48px', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
               {t('auth.candidateTitle')}
             </h1>
             <p className="login-showcase-text" style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6, maxWidth: '400px', fontWeight: 500 }}>
               {t('auth.candidateText')}
             </p>

             <div className="login-showcase-list" style={{ marginTop: 48, display: 'grid', gap: 20 }}>
                {candidateHighlights.map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                     <div style={{ 
                        width: 24, height: 24, borderRadius: '50%', background: '#DC2626', color: 'white', 
                        display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900
                     }}>✓</div>
                     <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}>{t(item)}</span>
                  </div>
                ))}
             </div>
             
             <div className="login-showcase-minimal-foot" style={{ marginTop: 'auto', display: 'flex', gap: 12, paddingTop: '40px' }}>
              <span style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.3)', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '0.05em' }}>{t('auth.secure')}</span>
              <span style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.3)', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '0.05em' }}>{t('auth.unified')}</span>
            </div>
          </div>
        </aside>

        <section className="login-card" style={{ padding: '60px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div className="login-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '60px' }}>
             <div className="login-brand-mark red-core" style={{ 
                width: '48px', 
                height: '48px', 
                background: '#DC2626', 
                borderRadius: '12px', 
                color: '#FFFFFF', 
                display: 'grid', 
                placeItems: 'center', 
                fontWeight: 900, 
                fontSize: '20px',
                position: 'relative',
                zIndex: 2
             }}>EH</div>
             <button className="lang-toggle-light" onClick={toggleLanguage}>
                <Globe size={14} />
                {t('language.switch')}
             </button>
          </div>

          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#111827', letterSpacing: '-0.03em' }}>
               {mode === "login" ? t('auth.signIn') : mode === "register" ? t('auth.register') : t('common.resetPassword')}
            </h2>
            <div style={{ 
              display: 'flex', 
              alignItems: 'stretch', 
              gap: 16, 
              marginTop: 12,
              paddingLeft: 4,
              borderLeft: '2px solid #DC2626',
              transition: 'all 0.3s ease'
            }}>
              <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 600, lineHeight: 1.5, maxWidth: '340px' }}>
                 {mode === "login" ? t('auth.candidateWelcome') : mode === "register" ? t('auth.registerTitle') : t('auth.confirmResetText')}
              </p>
            </div>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#F3F4F6', padding: 6, borderRadius: 16, marginBottom: 32, border: '1px solid #E5E7EB' }}>
               <button 
                  type="button"
                  onClick={() => setMode('login')}
                  style={{ 
                    padding: '12px', borderRadius: 12, border: 'none', 
                    background: mode === 'login' ? '#fff' : 'transparent', 
                    color: mode === 'login' ? '#111827' : '#6B7280', 
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
               >
                  {t('auth.signIn')}
               </button>
               <button 
                  type="button"
                  onClick={() => setMode('register')}
                  style={{ 
                    padding: '12px', borderRadius: 12, border: 'none', 
                    background: mode === 'register' ? '#fff' : 'transparent', 
                    color: mode === 'register' ? '#111827' : '#6B7280', 
                    fontSize: 14, fontWeight: 800, cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
               >
                  {t('auth.register')}
               </button>
            </div>
          )}

          <form onSubmit={mode === "login" ? handleLogin : mode === "register" ? handleRegister : resetStep === "request" ? handleResetRequest : handleResetConfirm} className={`login-form ${error ? 'shiver' : ''}`} style={{ display: 'grid', gap: '24px' }}>
            {error && <div className="login-error" style={{ padding: '14px', borderRadius: '14px', background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#EF4444', fontSize: '13px', fontWeight: 700 }}>{t(error) || error}</div>}
            {success && <div className="login-success" style={{ padding: '14px', borderRadius: '14px', background: '#ECFDF5', border: '1px solid #D1FAE5', color: '#059669', fontSize: '13px', fontWeight: 700 }}>{t(success) || success}</div>}

            {mode === "register" && (
              <div className={`input-premium-container ${isFocused.fullName ? 'focused' : ''}`}>
                <label className="input-premium-label">{t('auth.fullName')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <User size={18} color={isFocused.fullName ? '#DC2626' : '#9CA3AF'} style={{ transition: 'color 0.3s' }} />
                  <input
                    name="full_name"
                    className="input-premium-field"
                    value={form.full_name}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(prev => ({ ...prev, fullName: true }))}
                    onBlur={() => setIsFocused(prev => ({ ...prev, fullName: false }))}
                    placeholder={t('auth.fullNamePlaceholder')}
                    required
                  />
                </div>
              </div>
            )}

            <div className={`input-premium-container ${isFocused.email ? 'focused' : ''}`}>
              <label className="input-premium-label">{t('auth.email')}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Mail size={18} color={isFocused.email ? '#DC2626' : '#9CA3AF'} style={{ transition: 'color 0.3s' }} />
                <input
                  type="email"
                  name="email"
                  className="input-premium-field"
                  value={mode === "reset" ? resetForm.email : form.email}
                  onChange={mode === "reset" ? handleResetChange : handleChange}
                  onFocus={() => setIsFocused(prev => ({ ...prev, email: true }))}
                  onBlur={() => setIsFocused(prev => ({ ...prev, email: false }))}
                  placeholder={t('auth.emailPlaceholder')}
                  required
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className={`input-premium-container ${isFocused.password ? 'focused' : ''}`}>
                <label className="input-premium-label">{t('auth.password')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Lock size={18} color={isFocused.password ? '#DC2626' : '#9CA3AF'} style={{ transition: 'color 0.3s' }} />
                  <input
                    type="password"
                    name="password"
                    className="input-premium-field"
                    value={form.password}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(prev => ({ ...prev, password: true }))}
                    onBlur={() => setIsFocused(prev => ({ ...prev, password: false }))}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {mode === "reset" && resetStep === "confirm" && (
              <>
                <div className={`input-premium-container ${isFocused.otp ? 'focused' : ''}`}>
                  <label className="input-premium-label">{t('auth.otp')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ShieldCheck size={18} color={isFocused.otp ? '#DC2626' : '#9CA3AF'} style={{ transition: 'color 0.3s' }} />
                    <input
                      name="otp"
                      className="input-premium-field"
                      value={resetForm.otp}
                      onChange={handleResetChange}
                      onFocus={() => setIsFocused(prev => ({ ...prev, otp: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, otp: false }))}
                      placeholder="123456"
                      required
                    />
                  </div>
                </div>
                <div className={`input-premium-container ${isFocused.newPassword ? 'focused' : ''}`}>
                  <label className="input-premium-label">{t('auth.newPassword')}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Lock size={18} color={isFocused.newPassword ? '#DC2626' : '#9CA3AF'} style={{ transition: 'color 0.3s' }} />
                    <input
                      type="password"
                      name="new_password"
                      className="input-premium-field"
                      value={resetForm.new_password}
                      onChange={handleResetChange}
                      onFocus={() => setIsFocused(prev => ({ ...prev, newPassword: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, newPassword: false }))}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="login-btn-premium">
               {loading ? t('auth.pleaseWait') : mode === 'login' ? t('auth.signIn') : mode === 'register' ? t('auth.createAccount') : resetStep === 'request' ? t('common.sendOtp') : t('common.resetPassword')}
            </button>

            {mode === "login" && (
               <button type="button" onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', marginTop: 8 }}>
                  {t('common.forgotPassword')}
               </button>
            )}

            {mode === "reset" && (
               <button type="button" onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center', marginTop: 8 }}>
                  {t('common.backToSignIn')}
               </button>
            )}
          </form>

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 24 }}>
             <div style={{ fontSize: 10, fontWeight: 900, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.15em' }}>
                <Globe size={12} /> GLOBAL TALENT PORTAL
             </div>
             <div style={{ width: 1, height: 12, background: '#E5E7EB' }} />
             <div style={{ fontSize: 10, fontWeight: 900, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.15em' }}>
                <ShieldCheck size={12} /> VERIFIED ENCRYPTION
             </div>
          </div>

          <div className="login-footer" style={{ marginTop: 'auto', paddingTop: 40, borderTop: '1px solid #F3F4F6', textAlign: 'center' }}>
             <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>
                {t('auth.employeeQuestion')}{" "}
                <Link to="/login" style={{ color: '#DC2626', fontWeight: 800, textDecoration: 'none' }}>
                  {t('auth.employeePortalLink')}
                </Link>
             </p>
          </div>
        </section>
      </div>
    </div>
  );
}
