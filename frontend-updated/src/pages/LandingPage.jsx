import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Users, BarChart3, ShieldCheck, Zap, ChevronDown, ArrowRight,
  Star, Clock, Globe, Award, TrendingUp, Heart, Target, CheckCircle,
  Menu, X
} from "lucide-react";
const logo = "/logo.png";
const NAV_LINKS = [
  {
    label: "Our Platform",
    items: [
      { title: "Core HR", desc: "Employee data & org management", icon: Users },
      { title: "Payroll & Benefits", desc: "Automated payroll processing", icon: BarChart3 },
      { title: "Performance", desc: "Reviews & goal tracking", icon: Target },
      { title: "Attendance & Shifts", desc: "Time tracking & scheduling", icon: Clock },
    ],
  },
  {
    label: "Solutions",
    items: [
      { title: "For HR Teams", desc: "Streamline HR operations", icon: Heart },
      { title: "For Leaders", desc: "Team insights & management", icon: TrendingUp },
      { title: "For Employees", desc: "Self-service portal", icon: Star },
      { title: "Enterprise", desc: "Scale across your organization", icon: Award },
    ],
  },
  {
    label: "Company",
    items: [
      { title: "About EmpowerHR", desc: "Our mission & team", icon: Globe },
      { title: "Security", desc: "Enterprise-grade security", icon: ShieldCheck },
      { title: "Careers", desc: "Join our team", icon: Zap },
    ],
  },
];

const STATS = [
  { value: "98%", label: "Employee satisfaction rate" },
  { value: "40%", label: "Reduction in HR admin time" },
  { value: "5x", label: "Faster onboarding process" },
  { value: "360°", label: "Performance visibility" },
];

const FEATURES = [
  {
    icon: Users,
    title: "People Management",
    desc: "Centralize employee data, org charts, and team structures in one intelligent hub.",
    color: "#DC2626",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    desc: "AI-powered attrition prediction, benchmarking, and workforce analytics.",
    color: "#E11D48",
  },
  {
    icon: ShieldCheck,
    title: "Compliance & Security",
    desc: "Role-based access, audit logs, and enterprise-grade data protection.",
    color: "#BE185D",
  },
  {
    icon: TrendingUp,
    title: "Performance & Growth",
    desc: "360° reviews, career path mapping, and succession planning built-in.",
    color: "#9D174D",
  },
  {
    icon: Clock,
    title: "Time & Attendance",
    desc: "Smart shift scheduling, leave management, and real-time attendance tracking.",
    color: "#DC2626",
  },
  {
    icon: Heart,
    title: "Employee Experience",
    desc: "Recognition programs, feedback loops, and pulse surveys that drive engagement.",
    color: "#E11D48",
  },
];

const TESTIMONIALS = [
  {
    quote: "EmpowerHR transformed how we manage our 500-person team. The analytics alone saved us 15 hours a week.",
    name: "Sarah Chen",
    title: "VP of People, TechCorp",
    avatar: "SC",
  },
  {
    quote: "The onboarding workflow is flawless. New hires are productive from day one.",
    name: "Ahmed Hassan",
    title: "HR Director, GlobalOps",
    avatar: "AH",
  },
  {
    quote: "Finally an HRMS that employees actually want to use. Our self-service adoption hit 94%.",
    name: "Maria Lopez",
    title: "Chief People Officer, ScaleUp",
    avatar: "ML",
  },
];

// Floating orb animation component
function FloatingOrb({ style, delay = 0 }) {
  return (
    <div
      style={{
        position: "absolute",
        borderRadius: "50%",
        filter: "blur(80px)",
        opacity: 0.15,
        animation: `floatOrb ${6 + delay}s ease-in-out infinite alternate`,
        animationDelay: `${delay}s`,
        ...style,
      }}
    />
  );
}

// Animated counter
function Counter({ value }) {
  const [display, setDisplay] = useState("0");
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
          const suffix = value.replace(/[0-9.]/g, "");
          let start = 0;
          const duration = 1800;
          const step = (numeric / duration) * 16;
          const interval = setInterval(() => {
            start = Math.min(start + step, numeric);
            setDisplay(`${start % 1 === 0 ? Math.floor(start) : start.toFixed(0)}${suffix}`);
            if (start >= numeric) clearInterval(interval);
          }, 16);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref}>{display || value}</span>;
}

// Dropdown menu
function NavDropdown({ item, isOpen, onToggle }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontSize: 15,
          fontWeight: 600,
          color: "#1a1a1a",
          padding: "8px 12px",
          borderRadius: 8,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      >
        {item.label}
        <ChevronDown
          size={14}
          style={{
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
            padding: 16,
            minWidth: 280,
            zIndex: 100,
            animation: "dropIn 0.2s ease",
          }}
        >
          {item.items.map((sub) => {
            const Icon = sub.icon;
            return (
              <div
                key={sub.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #FEE2E2, #FECACA)",
                    display: "grid",
                    placeItems: "center",
                    color: "#DC2626",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{sub.title}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{sub.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [openNav, setOpenNav] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
        color: "#1a1a1a",
        background: "#FAFAF8",
        overflowX: "hidden",
      }}
      onClick={() => setOpenNav(null)}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes floatOrb {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-40px) scale(1.05); }
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes float-card {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-12px) rotate(-1deg); }
        }
        @keyframes float-card2 {
          0%, 100% { transform: translateY(0px) rotate(2deg); }
          50%       { transform: translateY(-16px) rotate(2deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .hero-title {
          font-size: clamp(44px, 7vw, 88px);
          font-weight: 900;
          line-height: 1.0;
          letter-spacing: -0.04em;
          color: #111;
        }
        .hero-gradient-text {
          background: linear-gradient(135deg, #DC2626 0%, #E11D48 35%, #BE185D 65%, #9D174D 100%);
          background-size: 200% 200%;
          animation: gradientShift 4s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-section {
          animation: fadeUp 0.8s ease both;
        }
        .hero-sub { animation: fadeUp 0.8s 0.15s ease both; }
        .hero-cta  { animation: fadeUp 0.8s 0.3s ease both; }
        .hero-trust { animation: fadeUp 0.8s 0.45s ease both; }
        .hero-visual { animation: fadeIn 1s 0.5s ease both; }

        .feature-card {
          background: #fff;
          border: 1px solid #F0EDE8;
          border-radius: 20px;
          padding: 32px;
          transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          cursor: default;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(220,38,38,0.08), 0 8px 24px rgba(0,0,0,0.06);
          border-color: #FECACA;
        }
        .stat-card {
          background: #fff;
          border-radius: 20px;
          padding: 36px 32px;
          text-align: center;
          border: 1px solid #F0EDE8;
          transition: transform 0.3s ease;
        }
        .stat-card:hover { transform: translateY(-4px); }

        .testimonial-card {
          background: #fff;
          border-radius: 20px;
          padding: 32px;
          border: 1px solid #F0EDE8;
          transition: all 0.3s ease;
        }
        .testimonial-card:hover {
          box-shadow: 0 20px 50px rgba(220,38,38,0.07);
          border-color: #FECACA;
        }

        .cta-btn-primary {
          background: linear-gradient(135deg, #DC2626, #E11D48);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 16px 36px;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow: 0 8px 24px rgba(220,38,38,0.3);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .cta-btn-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 16px 40px rgba(220,38,38,0.4);
        }

        .cta-btn-ghost {
          background: transparent;
          color: #111;
          border: 1.5px solid #E0DBD5;
          border-radius: 14px;
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .cta-btn-ghost:hover {
          background: #FEF2F2;
          border-color: #FECACA;
          transform: translateY(-2px);
        }

        .nav-blur {
          background: rgba(250, 250, 248, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(220,38,38,0.08);
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
        }

        .marquee-track {
          display: flex;
          gap: 48px;
          animation: marquee 20s linear infinite;
          white-space: nowrap;
        }

        .scroll-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .scroll-reveal.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .dashboard-mock {
          animation: float-card 6s ease-in-out infinite;
        }
        .dashboard-mock2 {
          animation: float-card2 7s ease-in-out infinite;
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "all 0.3s ease",
        }}
        className={scrolled ? "nav-blur" : ""}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 32px",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo (left) */}
          <Link to="/">
            <img src={logo} alt="EmpowerHR" style={{ height: 50, width: "auto" }} />
          </Link>

          {/* Center nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {NAV_LINKS.map((item) => (
              <NavDropdown
                key={item.label}
                item={item}
                isOpen={openNav === item.label}
                onToggle={(e) => {
                  e && e.stopPropagation && e.stopPropagation();
                  setOpenNav(openNav === item.label ? null : item.label);
                }}
              />
            ))}
          </div>

          {/* Login (right) */}
          <Link
            to="/login"
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#111",
              textDecoration: "none",
              padding: "8px 20px",
              borderRadius: 10,
              border: "1.5px solid #E0DBD5",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#FEF2F2";
              e.currentTarget.style.borderColor = "#FECACA";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "#E0DBD5";
            }}
          >
            Log In
          </Link>

          {/* Mobile menu button */}
          <button
            style={{ display: "none", background: "none", border: "none", cursor: "pointer" }}
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "140px 32px 80px",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(160deg, #FAFAF8 0%, #FEF2F2 40%, #FDF2F8 70%, #FAFAF8 100%)",
        }}
      >
        {/* Orbs */}
        <FloatingOrb style={{ width: 600, height: 600, background: "#DC2626", top: "-10%", right: "-5%", delay: 0 }} />
        <FloatingOrb style={{ width: 400, height: 400, background: "#BE185D", bottom: "10%", left: "-5%", delay: 2 }} />
        <FloatingOrb style={{ width: 300, height: 300, background: "#E11D48", top: "40%", left: "30%", delay: 1 }} />

        {/* Grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(220,38,38,0.07) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            opacity: 0.5,
            zIndex: 0,
          }}
        />

        <div
          style={{
            maxWidth: 1200,
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Left: copy */}
          <div>
            <h1 className="hero-title hero-section">
              Empower your people,{" "}
              <span className="hero-gradient-text">elevate</span>
              <br />
              your workplace.
            </h1>

            <p
              className="hero-sub"
              style={{
                fontSize: 20,
                color: "#555",
                lineHeight: 1.7,
                marginTop: 24,
                maxWidth: 480,
                fontWeight: 500,
              }}
            >
              EmpowerHR unifies HR, payroll, attendance, and performance in one
              intelligent platform — so your people can focus on what matters.
            </p>

            <div className="hero-cta" style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap" }}>
              <Link to="/login" className="cta-btn-primary">
                Get Started <ArrowRight size={18} />
              </Link>
              <a href="#features" className="cta-btn-ghost">
                See Features
              </a>
            </div>

            <div
              className="hero-trust"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginTop: 40,
                paddingTop: 32,
                borderTop: "1px solid rgba(220,38,38,0.1)",
              }}
            >
              {[
                { icon: ShieldCheck, label: "Enterprise Secure" },
                { icon: Zap, label: "AI-Powered" },
                { icon: Globe, label: "Multi-Language" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#666",
                  }}
                >
                  <Icon size={15} color="#DC2626" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: visual mockup */}
          <div
            className="hero-visual"
            style={{ position: "relative", height: 520, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {/* Main dashboard card */}
            <div
              className="dashboard-mock"
              style={{
                position: "absolute",
                width: 380,
                background: "#fff",
                borderRadius: 20,
                boxShadow: "0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
                padding: 24,
                top: "5%",
                left: "5%",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>People Overview</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#DC2626",
                    background: "#FEF2F2",
                    padding: "3px 10px",
                    borderRadius: 99,
                  }}
                >
                  Live
                </span>
              </div>
              {/* Bar chart mock */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80, marginBottom: 16 }}>
                {[65, 80, 55, 90, 75, 88, 70].map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${h}%`,
                      borderRadius: "4px 4px 0 0",
                      background:
                        i === 3
                          ? "linear-gradient(180deg, #DC2626, #E11D48)"
                          : "linear-gradient(180deg, #FECACA, #FEE2E2)",
                      transition: "height 1s ease",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Headcount", val: "248" },
                  { label: "On Leave", val: "12" },
                  { label: "Open Roles", val: "7" },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    style={{
                      background: "#FAFAF8",
                      borderRadius: 10,
                      padding: "10px 12px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#111" }}>{val}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating mini card 1 */}
            <div
              className="dashboard-mock2"
              style={{
                position: "absolute",
                bottom: "8%",
                right: "2%",
                width: 220,
                background: "linear-gradient(135deg, #DC2626, #BE185D)",
                borderRadius: 16,
                padding: 20,
                boxShadow: "0 20px 50px rgba(220,38,38,0.3)",
                color: "#fff",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, marginBottom: 8 }}>Attrition Risk</div>
              <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 4 }}>2.1%</div>
              <div style={{ fontSize: 12, opacity: 0.7, display: "flex", alignItems: "center", gap: 4 }}>
                <TrendingUp size={12} /> Down 0.4% this quarter
              </div>
            </div>

            {/* Floating mini card 2 */}
            <div
              style={{
                position: "absolute",
                top: "2%",
                right: "0%",
                width: 180,
                background: "#fff",
                borderRadius: 14,
                padding: 16,
                boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
                animation: "fadeIn 1s 0.8s ease both",
              }}
            >
              <div style={{ fontSize: 11, color: "#999", fontWeight: 700, marginBottom: 8 }}>ENGAGEMENT SCORE</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#111" }}>
                87<span style={{ fontSize: 16, color: "#DC2626" }}>%</span>
              </div>
              <div style={{ display: "flex", gap: 3, marginTop: 10 }}>
                {[100, 85, 92, 88, 95, 87].map((v, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 99,
                      background: `rgba(220,38,38,${v / 100})`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS MARQUEE ── */}
      <section
        style={{
          borderTop: "1px solid #F0EDE8",
          borderBottom: "1px solid #F0EDE8",
          background: "#fff",
          padding: "20px 0",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex" }}>
          <div className="marquee-track">
            {[...STATS, ...STATS].map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "0 24px",
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 900, color: "#DC2626" }}>{s.value}</span>
                <span style={{ fontSize: 14, color: "#666", fontWeight: 500 }}>{s.label}</span>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FECACA", marginLeft: 8 }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section
        id="features"
        style={{
          padding: "120px 32px",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <div
            style={{
              display: "inline-block",
              fontSize: 13,
              fontWeight: 800,
              color: "#DC2626",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 16,
            }}
          >
            Platform Capabilities
          </div>
          <h2
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "#111",
              lineHeight: 1.1,
            }}
          >
            One platform for everything HR{" "}
            <span className="hero-gradient-text">team needs</span>
          </h2>
          <p
            style={{
              fontSize: 18,
              color: "#666",
              marginTop: 16,
              maxWidth: 560,
              margin: "16px auto 0",
              lineHeight: 1.7,
            }}
          >
            One platform, every HR workflow — from hire to retire.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="feature-card scroll-reveal" style={{ animationDelay: `${i * 0.08}s` }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #FEE2E2, #FECACA)",
                    display: "grid",
                    placeItems: "center",
                    marginBottom: 20,
                    color: f.color,
                  }}
                >
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6 }}>{f.desc}</p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 20,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#DC2626",
                    cursor: "pointer",
                  }}
                >
                  Learn more <ArrowRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── STATS GRID ── */}
      <section
        style={{
          background: "linear-gradient(160deg, #FEF2F2 0%, #FDF2F8 100%)",
          padding: "100px 32px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#111",
              }}
            >
              Results that speak for themselves
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {STATS.map((s) => (
              <div key={s.label} className="stat-card scroll-reveal">
                <div
                  style={{
                    fontSize: "clamp(40px, 4vw, 56px)",
                    fontWeight: 900,
                    color: "#DC2626",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  <Counter value={s.value} />
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: "#666",
                    marginTop: 12,
                    lineHeight: 1.5,
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "120px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <div
            style={{
              display: "inline-block",
              fontSize: 13,
              fontWeight: 800,
              color: "#DC2626",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 16,
            }}
          >
            How It Works
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "#111",
            }}
          >
            Up and running in days, not months
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
          {[
            {
              step: "01",
              title: "Set Up Your Organization",
              desc: "Import your org structure, configure roles and permissions, and define your HR policies in minutes.",
            },
            {
              step: "02",
              title: "Onboard Your Team",
              desc: "Automated onboarding flows guide new hires through paperwork, training, and introductions seamlessly.",
            },
            {
              step: "03",
              title: "Manage & Grow",
              desc: "Run payroll, track attendance, conduct reviews, and get AI-powered insights — all from one dashboard.",
            },
          ].map((item, i) => (
            <div key={item.step} className="scroll-reveal" style={{ position: "relative" }}>
              {i < 2 && (
                <div
                  style={{
                    position: "absolute",
                    top: 28,
                    right: -20,
                    width: 40,
                    height: 2,
                    background: "linear-gradient(90deg, #FECACA, transparent)",
                    zIndex: 1,
                  }}
                />
              )}
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: "rgba(220,38,38,0.12)",
                  lineHeight: 1,
                  marginBottom: 16,
                  letterSpacing: "-0.04em",
                }}
              >
                {item.step}
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 12 }}>{item.title}</h3>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section
        style={{
          background: "#fff",
          padding: "100px 32px",
          borderTop: "1px solid #F0EDE8",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#111",
              }}
            >
              Loved by HR teams worldwide
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card scroll-reveal">
                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={16} fill="#DC2626" color="#DC2626" />
                  ))}
                </div>
                <p style={{ fontSize: 16, color: "#333", lineHeight: 1.7, marginBottom: 24, fontWeight: 500 }}>
                  "{t.quote}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #DC2626, #BE185D)",
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111" }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{t.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section
        style={{
          padding: "100px 32px",
          background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <FloatingOrb style={{ width: 500, height: 500, background: "#DC2626", top: "-20%", right: "-10%", opacity: 0.2 }} />
        <FloatingOrb style={{ width: 300, height: 300, background: "#BE185D", bottom: "-10%", left: "5%", opacity: 0.15 }} />

        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h2
            style={{
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 20,
            }}
          >
            Ready to empower your people?
          </h2>
          <p
            style={{
              fontSize: 18,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.7,
              marginBottom: 40,
              maxWidth: 500,
              margin: "0 auto 40px",
            }}
          >
            Join forward-thinking companies already using EmpowerHR to build better workplaces.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/login" className="cta-btn-primary">
              Start Now <ArrowRight size={18} />
            </Link>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 24,
              fontSize: 14,
              color: "rgba(255,255,255,0.4)",
              fontWeight: 500,
            }}
          >
            <CheckCircle size={16} color="#DC2626" /> No credit card required &nbsp;·&nbsp;
            <CheckCircle size={16} color="#DC2626" /> Set up in minutes
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          background: "#111",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "48px 32px",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
             <img src={logo} alt="EmpowerHR" style={{ height: 50, width: "auto", filter: "brightness(1.5)" }} />
          </div>
          <div style={{ fontSize: 13 }}>
            © 2025 EmpowerHR · Built with ❤️
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy", "Security", "Terms"].map((l) => (
              <span
                key={l}
                style={{ cursor: "pointer", fontSize: 13, transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </footer>

      {/* Scroll reveal observer script */}
      <ScrollReveal />
    </div>
  );
}

function ScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".scroll-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}
