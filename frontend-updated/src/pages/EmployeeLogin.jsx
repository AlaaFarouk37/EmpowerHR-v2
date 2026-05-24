import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { confirmPasswordReset, requestPasswordResetOtp } from "../api/index";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Zap, Globe, ArrowLeft } from "lucide-react";
const logo = "/logo.png";
/* ─────────────────────────────────────────────────────────
   Background: animated particle-mesh canvas
   Card: dark red/black left panel + white right form
   matching the second image's color scheme
───────────────────────────────────────────────────────── */

function ParticleMesh() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Generate particles
    const COUNT = 55;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r: Math.random() * 2.5 + 1.5,
      // vary between red, dark-red, pink-red
      hue: Math.random() > 0.5 ? 350 : 340,
      sat: 60 + Math.random() * 30,
      lit: 40 + Math.random() * 25,
    }));

    const LINK_DIST = 140;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Move
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });

      // Draw lines
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.35;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(220, 38, 38, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw dots
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, 0.8)`;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        display: "block",
      }}
    />
  );
}

export default function EmployeeLogin() {
  const { login } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm]           = useState({ email: "", password: "" });
  const [resetForm, setResetForm] = useState({ email: "", otp: "", new_password: "" });
  const [authView, setAuthView]   = useState("login");
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);
  const [focused, setFocused]     = useState({ email: false, password: false, otp: false, newPw: false });

  const handleChange      = (e) => setForm((p)      => ({ ...p, [e.target.name]: e.target.value }));
  const handleResetChange = (e) => setResetForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const resetToLogin = () => {
    setAuthView("login"); setError(""); setSuccess("");
    setResetForm((p) => ({ ...p, otp: "", new_password: "" }));
  };

  const validateEmail = (v) => String(v).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!validateEmail(form.email)) { setError("auth.invalidEmailFormat"); return; }
    if (form.password.length < 4)   { setError("auth.passwordTooShort");   return; }
    setLoading(true);
    try {
      const to = await login(form.email, form.password);
      navigate(to, { replace: true });
    } catch (err) {
      const d = err.response?.data;
      const m = d?.detail || d?.non_field_errors?.[0] || err.message || t("auth.invalidCredentials");
      setError(m === "true" || m === true ? t("auth.invalidCredentials") : m);
    } finally { setLoading(false); }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    const email = (resetForm.email || form.email).trim();
    if (!email) { setError(t("auth.enterWorkEmailFirst")); return; }
    setError(""); setSuccess(""); setLoading(true);
    try {
      await requestPasswordResetOtp({ email });
      setResetForm((p) => ({ ...p, email }));
      setSuccess(t("auth.otpEmailSent"));
      setAuthView("confirm-reset");
    } catch (err) { setError(err.message || "Unable to send reset code."); }
    finally { setLoading(false); }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (resetForm.otp.length !== 6)        { setError("auth.invalidOtp");        return; }
    if (resetForm.new_password.length < 8) { setError("auth.passwordTooShort8"); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(resetForm);
      setForm((p) => ({ ...p, email: resetForm.email, password: "" }));
      setSuccess(t("auth.passwordUpdated"));
      setAuthView("login");
      setResetForm((p) => ({ ...p, otp: "", new_password: "" }));
    } catch (err) { setError(err.message || "Unable to reset password."); }
    finally { setLoading(false); }
  };

  const onSubmit = authView === "login" ? handleSubmit
                 : authView === "request-reset" ? handleRequestReset
                 : handleConfirmReset;

  return (
    <div style={{
      minHeight: "100vh",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      // deep dark background — very different from HiBob's bright pink
      background: "#0D0205",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Subtle radial glow behind card */
        .login-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          z-index: 0;
          pointer-events: none;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Split card ── */
        .login-shell {
          position: relative; z-index: 10;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          max-width: 1100px; width: 100%;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(220,38,38,0.15);
          animation: cardIn 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* Left dark panel */
        .login-left {
          padding: 64px;
          background: linear-gradient(160deg, #1a0505 0%, #2d0a0a 50%, #1f0612 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          color: #fff;
        }
        .login-left-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(220,38,38,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220,38,38,0.07) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .login-left-glow {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(220,38,38,0.18) 0%, transparent 70%);
          top: -80px; left: -80px;
          pointer-events: none;
        }

        /* Right white panel */
        .login-right {
          background: #fff;
          padding: 56px 48px;
          display: flex;
          flex-direction: column;
        }

        /* Input */
        .login-field {
          width: 100%;
          background: #F7F5F5;
          border: 1.5px solid #EDE8E8;
          border-radius: 12px;
          padding: 14px 16px 14px 44px;
          font-size: 15px; font-weight: 600; color: #111;
          outline: none; transition: all 0.2s ease;
          font-family: inherit;
        }
        .login-field::placeholder { color: #C5BEBE; font-weight: 500; }
        .login-field:focus {
          background: #fff;
          border-color: #DC2626;
          box-shadow: 0 0 0 4px rgba(220,38,38,0.09);
        }
        .field-wrap { position: relative; }
        .field-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: #C5BEBE;
          pointer-events: none; display: flex; align-items: center;
          transition: color 0.2s;
        }
        .field-wrap:focus-within .field-icon { color: #DC2626; }

        /* Button */
        .login-btn {
          width: 100%; height: 52px;
          background: linear-gradient(135deg, #DC2626 0%, #E11D48 100%);
          color: #fff; border: none; border-radius: 12px;
          font-size: 16px; font-weight: 800; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
          box-shadow: 0 6px 20px rgba(220,38,38,0.3);
          font-family: inherit; letter-spacing: 0.01em;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(220,38,38,0.42);
        }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        @media (max-width: 860px) {
          .login-shell { grid-template-columns: 1fr; max-width: 460px; }
          .login-left  { display: none; }
          .login-right { padding: 40px 32px; border-radius: 24px; }
        }
      `}</style>

      {/* Animated particle mesh background */}
      <ParticleMesh />

      {/* Deep red glow blobs behind card */}
      <div className="login-glow" style={{ width: 600, height: 600, background: "radial-gradient(circle, rgba(180,20,20,0.22) 0%, transparent 70%)", top: "10%", left: "20%", zIndex: 0 }} />
      <div className="login-glow" style={{ width: 400, height: 400, background: "radial-gradient(circle, rgba(140,0,40,0.18) 0%, transparent 70%)", bottom: "5%", right: "18%", zIndex: 0 }} />

      <div className="login-shell">

        {/* ── LEFT: dark showcase panel ── */}
        <aside className="login-left">
          <div className="login-left-grid" />
          <div className="login-left-glow" />

          <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
            <Link to="/" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.45)",
              textDecoration: "none", marginBottom: 48, transition: "color 0.2s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}>
              <ArrowLeft size={13} /> {t("common.backToHome") || "Back to home"}
            </Link>

            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#F87171", marginBottom: 16, display: "block" }}>
              {t("auth.employeeEyebrow") || "EMPOWERHR · EMPLOYEE ACCESS"}
            </span>

            <h1 style={{ fontSize: "clamp(28px, 3.2vw, 44px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20 }}>
              {t("auth.employeeTitle") || "Professional access for HR teams and employees."}
            </h1>

            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: 340, fontWeight: 500, marginBottom: 44 }}>
              {t("auth.employeeText") || "Log in to manage feedback, review insights, and work within the same clean experience used across the platform."}
            </p>

            <div style={{ display: "grid", gap: 20 }}>
              {[
                { icon: "🛡", label: t("auth.employeeHighlight1") || "Access internal feedback and HR tools securely" },
                { icon: "👤", label: t("auth.employeeHighlight2") || "Move between forms, dashboard, and profile smoothly" },
                { icon: "📊", label: t("auth.employeeHighlight3") || "Stay aligned with the EmpowerHR workspace experience" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                    background: "rgba(220,38,38,0.15)",
                    border: "1px solid rgba(220,38,38,0.25)",
                    display: "grid", placeItems: "center", fontSize: 18,
                  }}>{item.icon}</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "auto", paddingTop: 48, display: "flex", gap: 10 }}>
              {["SECURE", "UNIFIED", "AI-POWERED"].map((b) => (
                <span key={b} style={{
                  padding: "5px 12px", borderRadius: 99, fontSize: 10, fontWeight: 800,
                  color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em",
                  background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.18)",
                }}>{b}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* ── RIGHT: white form panel ── */}
        <section className="login-right">
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 44 }}>
            <Link to="/">
              <img src={logo} alt="EmpowerHR" style={{ height: 50, width: "auto" }} />
            </Link>
            <button onClick={toggleLanguage} style={{
              background: "#F5F3F3", border: "1px solid #EDE8E8",
              color: "#666", padding: "7px 14px", borderRadius: 99,
              fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center",
              gap: 6, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.borderColor = "#FECACA"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#F5F3F3"; e.currentTarget.style.borderColor = "#EDE8E8"; }}>
              <Globe size={13} /> {t("language.switch") || "العربية"}
            </button>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: "clamp(22px, 2.5vw, 28px)", fontWeight: 900, color: "#111", letterSpacing: "-0.04em", lineHeight: 1.2, marginBottom: 10 }}>
              {authView === "login"
                ? (t("auth.signInEmployee") || "Log in to your employee account")
                : authView === "request-reset"
                  ? (t("auth.requestResetTitle") || "Reset your password")
                  : (t("auth.confirmResetTitle") || "Set a new password")}
            </h2>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 3, minHeight: 36, borderRadius: 99, background: "linear-gradient(180deg, #DC2626, #BE185D)", flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 14, color: "#888", fontWeight: 500, lineHeight: 1.6 }}>
                {authView === "login"
                  ? (t("auth.employeeTextShort") || "Continue to your feedback forms, profile details, and HR tools.")
                  : authView === "request-reset"
                    ? (t("auth.requestResetText") || "Enter your work email to receive a reset code.")
                    : (t("auth.confirmResetText") || "Enter the 6-digit code sent to your email.")}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ padding: "11px 14px", borderRadius: 10, marginBottom: 16, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13, fontWeight: 700 }}>
              {t(error) || error}
            </div>
          )}
          {success && (
            <div style={{ padding: "11px 14px", borderRadius: 10, marginBottom: 16, background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#16A34A", fontSize: 13, fontWeight: 700 }}>
              {t(success) || success}
            </div>
          )}

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
            {/* Email */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                {t("auth.workEmail") || "Work Email"}
              </div>
              <div className="field-wrap">
                <span className="field-icon"><Mail size={16} /></span>
                <input type="email" name="email" autoComplete="username" className="login-field"
                  value={authView === "login" ? form.email : resetForm.email}
                  onChange={authView === "login" ? handleChange : handleResetChange}
                  placeholder={t("auth.workEmailPlaceholder") || "you@company.com"}
                  onFocus={() => setFocused(p => ({ ...p, email: true }))}
                  onBlur={() => setFocused(p => ({ ...p, email: false }))}
                  required />
              </div>
            </div>

            {/* Password */}
            {authView === "login" && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  {t("auth.password") || "Password"}
                </div>
                <div className="field-wrap">
                  <span className="field-icon"><Lock size={16} /></span>
                  <input type={showPw ? "text" : "password"} name="password"
                    autoComplete="current-password" className="login-field"
                    style={{ paddingRight: 44 }}
                    value={form.password} onChange={handleChange}
                    onFocus={() => setFocused(p => ({ ...p, password: true }))}
                    onBlur={() => setFocused(p => ({ ...p, password: false }))}
                    placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#BBB", cursor: "pointer",
                    display: "flex", alignItems: "center",
                  }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* OTP + new password */}
            {authView === "confirm-reset" && (
              <>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                    {t("auth.otp") || "6-Digit Code"}
                  </div>
                  <div className="field-wrap">
                    <span className="field-icon"><ShieldCheck size={16} /></span>
                    <input name="otp" className="login-field" value={resetForm.otp} onChange={handleResetChange} placeholder="123456" required />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#AAA", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                    {t("auth.newPassword") || "New Password"}
                  </div>
                  <div className="field-wrap">
                    <span className="field-icon"><Lock size={16} /></span>
                    <input type="password" name="new_password" className="login-field" value={resetForm.new_password} onChange={handleResetChange} placeholder="Min. 8 characters" required />
                  </div>
                </div>
              </>
            )}

            {/* Remember / Forgot */}
            {authView === "login" && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: -4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#666", fontWeight: 600, cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "#DC2626", width: 14, height: 14 }} />
                  {t("auth.rememberMe") || "Remember this device"}
                </label>
                <button type="button"
                  style={{ background: "none", border: "none", color: "#DC2626", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                  onClick={() => { setAuthView("request-reset"); setError(""); setSuccess(""); setResetForm((p) => ({ ...p, email: form.email || p.email })); }}>
                  {t("common.forgotPassword") || "Forgot your password?"}
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="login-btn" style={{ marginTop: 4 }}>
              {loading
                ? (authView === "login" ? (t("auth.pleaseWait") || "Signing in…")
                   : authView === "request-reset" ? (t("common.loading") || "Sending…")
                   : (t("auth.updatingPassword") || "Updating…"))
                : (authView === "login" ? (t("auth.signIn") || "Login")
                   : authView === "request-reset" ? (t("common.sendOtp") || "Send Reset Code")
                   : (t("common.resetPassword") || "Set New Password"))}
            </button>

            {authView !== "login" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginTop: 4 }}>
                {authView === "confirm-reset" && (
                  <button type="button" style={{ background: "none", border: "none", color: "#AAA", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                    onClick={() => setAuthView("request-reset")}>
                    {t("common.sendAnotherCode") || "Resend code"}
                  </button>
                )}
                <button type="button" style={{ background: "none", border: "none", color: "#AAA", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  onClick={resetToLogin}>
                  {t("common.backToSignIn") || "Back to sign in"}
                </button>
              </div>
            )}
          </form>

          {/* Footer badges */}
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#CCC", display: "flex", alignItems: "center", gap: 5 }}>
              <ShieldCheck size={12} color="#DC2626" /> {t("auth.secure") || "SECURE LOGIN"}
            </div>
            <div style={{ width: 1, height: 14, background: "#EEE", alignSelf: "center" }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "#CCC", display: "flex", alignItems: "center", gap: 5 }}>
              <Zap size={12} color="#DC2626" /> {t("auth.unified") || "EMPLOYEE PORTAL"}
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "#999", fontWeight: 500, marginTop: 20 }}>
            {t("auth.applyingQuestion") || "Applying for a job?"}{" "}
            <Link to="/candidate/login" style={{ color: "#DC2626", fontWeight: 800, textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}>
              {t("auth.jobPortalLink") || "Candidate portal →"}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
