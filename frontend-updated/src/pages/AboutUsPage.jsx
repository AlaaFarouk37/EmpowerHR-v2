import { Link } from "react-router-dom";
import { ArrowRight, Globe, Target, Heart, Award } from "lucide-react";

const logo = "/logo.png";

export default function AboutUsPage() {
  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#1a1a1a",
        background: "#FAFAF8",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.3s ease both; }
      `}</style>

      {/* Navbar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(250,250,248,0.9)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(220,38,38,0.08)",
          padding: "0 32px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link to="/">
            <img src={logo} alt="EmpowerHR" style={{ height: 50, width: "auto" }} />
          </Link>
          <Link
            to="/login"
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              padding: "10px 24px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #DC2626, #E11D48)",
              boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
              transition: "all 0.2s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Get Started <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(160deg, #FAFAF8 0%, #FEF2F2 50%, #FAFAF8 100%)",
          padding: "100px 32px 80px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div
            className="fade-up"
            style={{
              display: "inline-block",
              fontSize: 13,
              fontWeight: 800,
              color: "#DC2626",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 20,
              background: "#FEF2F2",
              padding: "6px 16px",
              borderRadius: 99,
            }}
          >
            About EmpowerHR
          </div>
          <h1
            className="fade-up-2"
            style={{
              fontSize: "clamp(36px, 6vw, 72px)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "#111",
              marginBottom: 24,
            }}
          >
            Built for people,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #DC2626, #E11D48, #BE185D)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              powered by purpose
            </span>
          </h1>
          <p
            className="fade-up-3"
            style={{
              fontSize: 19,
              color: "#555",
              lineHeight: 1.8,
              fontWeight: 500,
            }}
          >
            We started with a simple belief: HR software should help people thrive, not just track them.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section style={{ padding: "80px 32px", maxWidth: 900, margin: "0 auto" }}>
        {/* Mission paragraph */}
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            padding: "48px 56px",
            border: "1px solid #F0EDE8",
            marginBottom: 48,
            boxShadow: "0 8px 40px rgba(0,0,0,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#111",
              marginBottom: 20,
              letterSpacing: "-0.02em",
            }}
          >
            Our Story
          </h2>
          <p style={{ fontSize: 17, color: "#444", lineHeight: 1.9, marginBottom: 20 }}>
            EmpowerHR was founded with one mission: to make every workplace a place where people genuinely
            want to show up. We saw organizations struggling with disconnected tools, manual processes, and
            HR teams buried under administrative work — leaving little room to focus on what truly matters:
            the people.
          </p>
          <p style={{ fontSize: 17, color: "#444", lineHeight: 1.9, marginBottom: 20 }}>
            So we built a unified platform that brings HR, payroll, attendance, performance, and employee
            experience together in one intelligent hub. From the moment someone is hired to the day they
            retire, EmpowerHR supports every step of the employee journey — giving HR teams the tools to
            be strategic partners rather than paper-pushers.
          </p>
          <p style={{ fontSize: 17, color: "#444", lineHeight: 1.9 }}>
            Today, EmpowerHR serves organizations of all sizes, helping them reduce admin overhead,
            make smarter workforce decisions, and — most importantly — build cultures where employees feel
            seen, valued, and empowered to do their best work.
          </p>
        </div>

        {/* Values grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 24,
          }}
        >
          {[
            {
              icon: Target,
              title: "Our Mission",
              body: "To simplify HR so organizations can spend less time on processes and more time on people.",
            },
            {
              icon: Heart,
              title: "Our Values",
              body: "We believe in transparency, empathy, and continuous improvement — in our product and in ourselves.",
            },
            {
              icon: Globe,
              title: "Our Reach",
              body: "Built for global teams with multi-language support, regional compliance, and a platform that scales with you.",
            },
            {
              icon: Award,
              title: "Our Commitment",
              body: "We are committed to enterprise-grade security, reliability, and a customer experience that sets the standard.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              style={{
                background: "#fff",
                borderRadius: 20,
                padding: "32px",
                border: "1px solid #F0EDE8",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(220,38,38,0.08)";
                e.currentTarget.style.borderColor = "#FECACA";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "#F0EDE8";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #FEE2E2, #FECACA)",
                  display: "grid",
                  placeItems: "center",
                  color: "#DC2626",
                  marginBottom: 16,
                }}
              >
                <Icon size={22} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#111", marginBottom: 10 }}>{title}</h3>
              <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)",
          padding: "80px 32px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-0.03em",
            marginBottom: 16,
          }}
        >
          Ready to empower your people?
        </h2>
        <p
          style={{
            fontSize: 17,
            color: "rgba(255,255,255,0.6)",
            marginBottom: 36,
          }}
        >
          Join organizations already building better workplaces with EmpowerHR.
        </p>
        <Link
          to="/login"
          style={{
            background: "linear-gradient(135deg, #DC2626, #E11D48)",
            color: "#fff",
            textDecoration: "none",
            padding: "16px 36px",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 24px rgba(220,38,38,0.4)",
            transition: "all 0.3s ease",
          }}
        >
          Get Started <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "#111",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "32px",
          textAlign: "center",
          color: "rgba(255,255,255,0.4)",
          fontSize: 13,
        }}
      >
        © 2025 EmpowerHR · <Link to="/" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Back to Home</Link>
      </footer>
    </div>
  );
}
