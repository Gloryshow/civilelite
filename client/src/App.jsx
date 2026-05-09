import { useState, useEffect, useRef } from "react";
// Hero image imported
// import heroImg from "./assets/hero.png";

// ── Utility ──────────────────────────────────────────────────────────────────
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

const useCountUp = (target, visible, duration = 1200) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setVal(target);
        clearInterval(timer);
      } else {
        setVal(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);
  return val;
};

const THEME = {
  light: {
    page: "#f0f4f8",
    pageAlt: "#ffffff",
    surface: "#eef2f7",
    surfaceSoft: "rgba(26,107,60,0.08)",
    border: "rgba(26,107,60,0.15)",
    text: "#0f172a",
    muted: "#475569",
    nav: "rgba(255,255,255,0.95)",
  },
  dark: {
    page: "#0a0e1a",
    pageAlt: "#0d1b2a",
    surface: "rgba(255,255,255,0.04)",
    surfaceSoft: "rgba(255,255,255,0.03)",
    border: "rgba(99,147,255,0.15)",
    text: "#e8eef8",
    muted: "#8899aa",
    nav: "rgba(10,14,26,0.96)",
  },
};

const getTheme = (mode = "light") => THEME[mode] || THEME.light;

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, cls = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls}>
    <path d={d} />
  </svg>
);

const MenuIcon = () => <Icon d="M3 12h18M3 6h18M3 18h18" />;
const ChevronDown = () => <Icon d="m6 9 6 6 6-6" size={16} />;
const ShieldIcon = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={22} />;
const ArrowRight = () => <Icon d="M5 12h14M12 5l7 7-7 7" size={18} />;
const UploadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const BellIcon = () => <Icon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />;
const UsersIcon = () => <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />;
const BarChart = () => <Icon d="M18 20V10M12 20V4M6 20v-6" />;
const LogOut = () => <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />;
const Settings = () => <Icon d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />;
const Search = () => <Icon d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />;
const Download = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const Plus = () => <Icon d="M12 5v14M5 12h14" />;
const Eye = () => <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />;
const TrendingUp = () => <Icon d="m23 6-9.5 9.5-5-5L1 18" />;

// ── Shared UI ────────────────────────────────────────────────────────────────
const Badge = ({ label, color = "#c9952a" }) => (
  <span style={{ display: "inline-flex", alignItems: "center", padding: "7px 12px", borderRadius: 999, border: `1px solid ${color}55`, color, fontWeight: 800, letterSpacing: 1.2, fontSize: 11, textTransform: "uppercase", background: `${color}11` }}>{label}</span>
);

const GoldBtn = ({ children, onClick, outline = false, style = {} }) => (
  <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, padding: "12px 20px", border: outline ? "2px solid #c9952a" : "none", background: outline ? "transparent" : "linear-gradient(135deg,#c9952a,#f0c060)", color: outline ? "#c9952a" : "#0f172a", fontWeight: 800, cursor: "pointer", transition: "all .2s ease", ...style }}>{children}</button>
);

const Input = ({ label, value, onChange, type = "text", placeholder, required }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", color: "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{label}{required && <span style={{ color: "#c9952a" }}> *</span>}</label>}
    <input value={value} onChange={onChange} type={type} placeholder={placeholder} required={required} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#c9952a"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
  </div>
);

const Select = ({ label, value, onChange, options, required }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", color: "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{label}{required && <span style={{ color: "#c9952a" }}> *</span>}</label>}
    <select value={value} onChange={onChange} required={required} style={{ width: "100%", background: "#0d1b2a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "11px 14px", color: value ? "#fff" : "#777", fontSize: 14, outline: "none", cursor: "pointer", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#c9952a"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows = 4, required }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", color: "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{label}{required && <span style={{ color: "#c9952a" }}> *</span>}</label>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} required={required} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = "#c9952a"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
  </div>
);

const Toast = ({ msg, type = "success", onClose }) => (
  <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: type === "success" ? "linear-gradient(135deg,#1a3a1a,#0d2a0d)" : "linear-gradient(135deg,#3a1a1a,#2a0d0d)", border: `1px solid ${type === "success" ? "#4caf50" : "#f44336"}`, borderRadius: 12, padding: "14px 22px", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", gap: 12, minWidth: 260, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
    <span style={{ fontSize: 20 }}>{type === "success" ? "OK" : "ERR"}</span>
    {msg}
    <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "#aab", cursor: "pointer", fontSize: 18 }}>x</button>
  </div>
);

const StatusBadge = ({ s }) => {
  const map = {
    pending: { bg: "#c9952a22", color: "#c9952a", label: "Pending" },
    under_review: { bg: "#2196f322", color: "#64b5f6", label: "Under Review" },
    approved: { bg: "#4caf5022", color: "#81c784", label: "Approved" },
    rejected: { bg: "#f4433622", color: "#e57373", label: "Rejected" },
  };
  const m = map[s] || map.pending;
  return <span style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}44`, borderRadius: 999, padding: "3px 12px", fontSize: 12, fontWeight: 700 }}>{m.label}</span>;
};

const ThemeToggle = ({ theme, onToggle }) => (
  <button onClick={onToggle} style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1100, border: "1px solid rgba(201,149,42,0.5)", background: theme === "light" ? "#111827" : "#f8fafc", color: theme === "light" ? "#fff" : "#0f172a", borderRadius: 999, padding: "10px 16px", fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
    {theme === "light" ? "Switch to dark" : "Switch to light"}
  </button>
);

const LandingPage = ({ onNavigate, theme = "light" }) => {
  const t = getTheme(theme);
  const [navScrolled, setNavScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 900 : false));
  const [isSmall, setIsSmall] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 640 : false));

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 900);
      setIsSmall(window.innerWidth <= 640);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const navLinks = [
    ["About", "about"],
    ["Divisions", "divisions"],
    ["Process", "process"],
    ["Requirements", "requirements"],
    ["FAQ", "faq"],
  ];

  const stats = [
    ["12.4K+", "Applications Reviewed"],
    ["36", "States Covered"],
    ["4", "Selection Phases"],
    ["98%", "Candidate Satisfaction"],
  ];

  const pillars = [
    { icon: "🛡️", title: "National Discipline", text: "A recruitment portal built to project order, credibility, and authority." },
    { icon: "⚡", title: "Fast Application", text: "A clean application flow that gets candidates from interest to submission quickly." },
    { icon: "🎯", title: "Clear Eligibility", text: "Applicants can see requirements, process steps, and expectations at a glance." },
  ];

  const divisions = [
    { name: "Operations", icon: "🧭", desc: "Field coordination, incident response, and national deployment support." },
    { name: "Intelligence", icon: "🔎", desc: "Information gathering, threat analysis, and situational awareness." },
    { name: "Training", icon: "📘", desc: "Recruits are molded through structured drills, ethics, and leadership." },
    { name: "Border Control", icon: "🛡️", desc: "Monitoring sensitive corridors with precision and accountability." },
  ];

  const gallery = [
    "20250830_172445.jpg",
    "20250831_083759.jpg",
    "20250831_083836.jpg",
    "IMG-20260508-WA0011.jpg",
    "IMG-20260508-WA0012.jpg",
    "IMG-20260508-WA0013.jpg",
    "IMG-20260508-WA0014.jpg",
    "IMG-20260508-WA0015.jpg",
    "IMG-20260508-WA0016.jpg",
    "IMG_8348.heif",
    "IMG_8368.heif",
  ];

  const steps = [
    { step: "01", title: "Register", text: "Create your applicant profile and verify your details." },
    { step: "02", title: "Screening", text: "Submit documents and complete the eligibility review." },
    { step: "03", title: "Assessment", text: "Attend aptitude, physical, and medical checks." },
    { step: "04", title: "Placement", text: "Successful candidates move into training and unit assignment." },
  ];

  const faqs = [
    { q: "Who can apply?", a: "Nigerian citizens who meet the age, education, and medical requirements can apply." },
    { q: "What documents are needed?", a: "You will need a valid ID, educational records, a passport photo, and supporting documents." },
    { q: "Can I switch themes?", a: "Yes. The theme toggle remains available for users who prefer dark mode." },
  ];

  const pageSection = { padding: "88px 60px" };

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: t.page, color: t.text, fontFamily: "'Segoe UI',sans-serif", overflowX: "hidden" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { max-width: 100%; overflow-x: hidden; }
        @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        ::selection { background: rgba(201,149,42,0.24); }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${t.page}; }
        ::-webkit-scrollbar-thumb { background: rgba(201,149,42,0.34); border-radius: 999px; }
      `}</style>

      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, padding: isMobile ? "8px 14px" : "0 24px", background: navScrolled ? t.nav : "transparent", backdropFilter: navScrolled ? "blur(18px)" : "none", borderBottom: navScrolled ? `1px solid ${t.border}` : "none", transition: "all .25s ease" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", minHeight: isMobile ? 64 : 76, display: "flex", alignItems: "center", justifyContent: "space-between", gap: isMobile ? 12 : 20, flexWrap: "wrap", padding: isMobile ? "8px 14px" : "0 60px" }}>
          <button onClick={() => scrollTo("hero")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: t.text, minWidth: 0 }}>
            <img src="/logo.png" alt="logo" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.08)" }} />
            <span style={{ fontWeight: 900, letterSpacing: 0.6, fontSize: isMobile ? 14 : 18, whiteSpace: "normal", lineHeight: 1.2 }}>CIVIL <span style={{ color: "#c9952a" }}>ELITE</span> SERVICE</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 24, flexWrap: "nowrap", justifyContent: isMobile ? "flex-start" : "center", width: isMobile ? "100%" : "auto", overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch" }}>
            {navLinks.map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: "none", border: "none", color: t.muted, fontWeight: 700, cursor: "pointer", fontSize: isMobile ? 13 : 14, padding: isMobile ? "4px 0" : 0 }} onMouseEnter={e => e.currentTarget.style.color = "#c9952a"} onMouseLeave={e => e.currentTarget.style.color = t.muted}>{label}</button>
            ))}
            <GoldBtn onClick={() => onNavigate("register")} style={{ padding: isMobile ? "8px 14px" : "10px 20px", fontSize: 13 }}>Apply Now</GoldBtn>
          </div>
        </div>
      </nav>

      <section id="hero" style={{ minHeight: "100vh", paddingTop: isSmall ? 124 : isMobile ? 148 : 106, display: "grid", alignItems: "center", position: "relative", background: theme === "light" ? "radial-gradient(circle at top right, rgba(201,149,42,0.12), transparent 28%), linear-gradient(180deg, #f7f9fc 0%, #eef3f7 100%)" : "radial-gradient(circle at top right, rgba(201,149,42,0.12), transparent 28%), linear-gradient(180deg, #0a0e1a 0%, #0d1b2a 100%)" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {[...Array(8)].map((_, i) => <span key={i} style={{ position: "absolute", left: `${10 + i * 10}%`, top: -30, width: 1, height: "125%", background: `rgba(201,149,42,${0.03 + i * 0.004})`, transform: "rotate(-18deg)" }} />)}
        </div>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: isMobile ? "0 14px" : "0 60px", width: "100%", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr", gap: isMobile ? 24 : 40, alignItems: "center", position: "relative", zIndex: 1 }}>
          <div style={{ animation: "rise .7s ease both", textAlign: isSmall ? "center" : "left" }}>
            <div style={{ display: "inline-flex", alignItems: "center", padding: "8px 14px", borderRadius: 999, border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.14)" : "rgba(255,255,255,0.12)"}`, background: theme === "light" ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)", color: t.muted, fontSize: 12, letterSpacing: 1.4, fontWeight: 800, textTransform: "uppercase" }}>Official Recruitment Portal</div>
            <h1 style={{ marginTop: 22, fontSize: "clamp(32px, 9vw, 86px)", lineHeight: 0.98, letterSpacing: isMobile ? -1 : -2, fontWeight: 900, color: theme === "light" ? "#0f172a" : "#fff", maxWidth: isSmall ? "100%" : 760, marginLeft: isSmall ? "auto" : 0, marginRight: isSmall ? "auto" : 0 }}>Build a disciplined career in <span style={{ color: "#c9952a" }}>Civil Elite</span> Service.</h1>
            <p style={{ marginTop: 16, fontSize: "clamp(15px, 3.4vw, 20px)", lineHeight: 1.8, maxWidth: isSmall ? "100%" : 640, color: t.muted, marginLeft: isSmall ? "auto" : 0, marginRight: isSmall ? "auto" : 0 }}>A modern recruitment experience for applicants who want structure, purpose, and national service. Apply, track progress, and stay informed from one clean portal.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24, justifyContent: isSmall ? "center" : "flex-start" }}>
              <GoldBtn onClick={() => onNavigate("register")} style={{ padding: "15px 26px" }}>Start Application <ArrowRight /></GoldBtn>
              <GoldBtn outline onClick={() => scrollTo("divisions")} style={{ padding: "15px 26px" }}>Explore Divisions</GoldBtn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isSmall ? "1fr" : "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginTop: 28, maxWidth: isSmall ? "100%" : 760 }}>
              {pillars.map(p => (
                <div key={p.title} style={{ animation: "rise .7s ease both", background: theme === "light" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.04)", border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.1)" : "rgba(255,255,255,0.08)"}`, borderRadius: 18, padding: 18 }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{p.icon}</div>
                  <div style={{ fontWeight: 800, color: theme === "light" ? "#0f172a" : "#fff", marginBottom: 6 }}>{p.title}</div>
                  <div style={{ color: t.muted, fontSize: 14, lineHeight: 1.6 }}>{p.text}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ animation: "rise .85s ease both", display: "grid", gap: 14 }}>
            <img src="/logo.png" alt="Hero" style={{ width: "100%", borderRadius: 18, objectFit: "contain", maxHeight: isSmall ? 180 : isMobile ? 240 : 380, display: "block", marginBottom: 6 }} />
            <div style={{ borderRadius: 24, padding: isMobile ? 18 : 24, background: theme === "light" ? "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,244,248,0.95))" : "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))", border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.12)" : "rgba(255,255,255,0.08)"}`, boxShadow: theme === "light" ? "0 24px 70px rgba(15,23,42,0.08)" : "0 24px 70px rgba(0,0,0,0.35)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <div style={{ color: "#c9952a", fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase" }}>Portal Overview</div>
                  <div style={{ color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 900, fontSize: 22, marginTop: 4 }}>Ready for new applicants</div>
                </div>
                <div style={{ width: 54, height: 54, borderRadius: 18, background: "rgba(201,149,42,0.14)", display: "grid", placeItems: "center", color: "#c9952a", fontSize: 24 }}>◎</div>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {stats.map(([value, label]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "12px 14px" : "16px 18px", borderRadius: 16, background: theme === "light" ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.03)", border: `1px solid ${theme === "light" ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)"}` }}>
                    <span style={{ color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 800 }}>{label}</span>
                    <span style={{ color: "#c9952a", fontWeight: 900, fontSize: 20 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderRadius: 24, padding: isMobile ? 18 : 24, background: theme === "light" ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.04)", border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.12)" : "rgba(255,255,255,0.08)"}` }}>
              <div style={{ color: t.muted, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 800 }}>Application Snapshot</div>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {[["Eligibility", "18-35 years, medically fit"], ["Documents", "ID, certificates, passport photo"], ["Selection", "Screening, assessment, placement"]].map(([a, b]) => (
                  <div key={a} style={{ padding: "14px 16px", borderRadius: 14, background: theme === "light" ? "#f8fafc" : "rgba(255,255,255,0.03)", border: `1px solid ${theme === "light" ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)"}` }}>
                    <div style={{ color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 800, marginBottom: 4 }}>{a}</div>
                    <div style={{ color: t.muted, fontSize: 14 }}>{b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="gallery" style={{ padding: isMobile ? "40px 14px" : "72px 60px", background: theme === "light" ? "#fff" : "#07101a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <Badge label="Gallery" />
            <div style={{ color: t.muted, fontSize: 13 }}>{gallery.length} images</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {gallery.map((f, i) => (
              <div key={f} style={{ borderRadius: 12, overflow: "hidden", background: "#f6f8fa", display: "block" }}>
                <img src={`/images/${f}`} alt={`photo-${i+1}`} loading="lazy" style={{ width: "100%", height: isMobile ? 200 : 220, objectFit: "contain", display: "block", backgroundColor: theme === "light" ? "#f6f8fa" : "#1a2a3a" }} onError={(e)=>{e.currentTarget.style.display='none'}} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: theme === "light" ? "#ffffff" : "rgba(255,255,255,0.02)", borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: isMobile ? "22px 14px" : "22px 60px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
          {stats.map(([value, label]) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ color: "#c9952a", fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{value}</div>
              <div style={{ color: t.muted, fontSize: 13, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" style={{ ...pageSection, padding: isMobile ? "72px 14px" : pageSection.padding }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: isMobile ? "0 14px" : "0 60px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 20 : 36, alignItems: "start" }}>
          <div>
            <Badge label="About the Service" />
            <h2 style={{ marginTop: 16, fontSize: "clamp(30px,4.5vw,52px)", lineHeight: 1.05, color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 900 }}>Built for disciplined public service.</h2>
            <p style={{ marginTop: 18, color: t.muted, lineHeight: 1.8, fontSize: 16, maxWidth: 620 }}>Civil Elite Service is presented as a structured recruitment and applicant management platform. The design now focuses on clarity, trust, and a clean first impression.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 14 }}>
            {divisions.map(item => (
              <div key={item.name} style={{ padding: 18, borderRadius: 18, background: theme === "light" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.03)", border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.1)" : "rgba(255,255,255,0.08)"}` }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 800, marginBottom: 6 }}>{item.name}</div>
                <div style={{ color: t.muted, fontSize: 14, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="divisions" style={{ ...pageSection, padding: isMobile ? "72px 14px" : pageSection.padding, background: theme === "light" ? "#f7f9fc" : "rgba(255,255,255,0.02)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge label="Divisions" />
            <h2 style={{ marginTop: 16, fontSize: "clamp(30px,4.5vw,52px)", lineHeight: 1.05, color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 900 }}>Operational divisions with clear purpose.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 18 }}>
            {divisions.map((item, index) => (
              <div key={item.name} style={{ animation: `rise .5s ease ${index * 0.04}s both`, padding: 22, borderRadius: 18, background: theme === "light" ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.03)", border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.1)" : "rgba(255,255,255,0.07)"}` }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{item.name}</div>
                <div style={{ color: t.muted, lineHeight: 1.7, fontSize: 14 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="process" style={{ ...pageSection, padding: isMobile ? "72px 14px" : pageSection.padding }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge label="Process" />
            <h2 style={{ marginTop: 16, fontSize: "clamp(30px,4.5vw,52px)", lineHeight: 1.05, color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 900 }}>Four steps from registration to placement.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
            {steps.map(step => (
              <div key={step.step} style={{ padding: 22, borderRadius: 18, background: theme === "light" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.03)", border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.1)" : "rgba(255,255,255,0.07)"}` }}>
                <div style={{ color: "#c9952a", fontWeight: 900, fontSize: 13, letterSpacing: 2 }}>{step.step}</div>
                <div style={{ marginTop: 10, color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 800, fontSize: 18 }}>{step.title}</div>
                <div style={{ marginTop: 10, color: t.muted, lineHeight: 1.7, fontSize: 14 }}>{step.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="requirements" style={{ ...pageSection, padding: isMobile ? "72px 14px" : pageSection.padding, background: theme === "light" ? "#f7f9fc" : "rgba(255,255,255,0.02)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge label="Requirements" />
            <h2 style={{ marginTop: 16, fontSize: "clamp(30px,4.5vw,52px)", lineHeight: 1.05, color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 900 }}>Check eligibility before you apply.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 }}>
            {[["Age", "18-35 years"], ["Nationality", "Nigerian citizen"], ["Education", "WAEC / NECO minimum"], ["Medical", "Fit for active service"], ["Documents", "ID, certificates, passport photo"], ["Conduct", "No pending disciplinary issues"]].map(([label, value]) => (
              <div key={label} style={{ padding: 20, borderRadius: 16, background: theme === "light" ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.03)", border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.1)" : "rgba(255,255,255,0.07)"}` }}>
                <div style={{ color: "#c9952a", fontWeight: 800, fontSize: 13, marginBottom: 8 }}>{label}</div>
                <div style={{ color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 700, lineHeight: 1.6 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...pageSection, padding: isMobile ? "72px 14px" : pageSection.padding, background: theme === "light" ? "linear-gradient(135deg, #eef4f8 0%, #f6f9fb 100%)" : "linear-gradient(135deg, #0d1b2a 0%, #1a2a1a 100%)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: isMobile ? "0 14px" : "0 60px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 24, alignItems: "center" }}>
          <div>
            <div style={{ color: "#c9952a", fontWeight: 800, letterSpacing: 2, fontSize: 12, textTransform: "uppercase" }}>Apply Today</div>
            <h2 style={{ marginTop: 10, fontSize: "clamp(30px,4.5vw,52px)", lineHeight: 1.05, color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 900 }}>Start your application in a focused, professional portal.</h2>
            <p style={{ marginTop: 12, color: t.muted, maxWidth: 720, lineHeight: 1.8 }}>The landing page has been rebuilt from scratch to feel more intentional, more readable, and more trustworthy. It now gives applicants a clear path into the portal.</p>
          </div>
          <GoldBtn onClick={() => onNavigate("register")} style={{ padding: "16px 24px" }}>Begin Application <ArrowRight /></GoldBtn>
        </div>
      </section>

      <section id="faq" style={{ ...pageSection, padding: isMobile ? "72px 14px" : pageSection.padding }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Badge label="FAQ" />
            <h2 style={{ marginTop: 16, fontSize: "clamp(30px,4.5vw,52px)", lineHeight: 1.05, color: theme === "light" ? "#0f172a" : "#fff", fontWeight: 900 }}>Common questions, answered.</h2>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {faqs.map((item, index) => (
              <div key={item.q} style={{ borderRadius: 16, overflow: "hidden", background: theme === "light" ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.03)", border: `1px solid ${theme === "light" ? "rgba(26,107,60,0.1)" : "rgba(255,255,255,0.07)"}` }}>
                <button onClick={() => setFaqOpen(faqOpen === index ? -1 : index)} style={{ width: "100%", background: "none", border: "none", color: theme === "light" ? "#0f172a" : "#fff", padding: "18px 20px", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, fontSize: 15 }}>
                  {item.q}
                  <span style={{ color: "#c9952a", transform: faqOpen === index ? "rotate(180deg)" : "none", transition: "transform .2s" }}><ChevronDown /></span>
                </button>
                {faqOpen === index && <div style={{ padding: "0 20px 18px", color: t.muted, lineHeight: 1.8, fontSize: 14 }}>{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ background: theme === "light" ? "#ffffff" : "#060a12", borderTop: `1px solid ${t.border}`, padding: isMobile ? "40px 14px 26px" : "40px 60px 26px" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <img src="/logo.png" alt="footer-logo" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 6 }} />
                <span style={{ fontWeight: 900 }}>CIVIL <span style={{ color: "#c9952a" }}>ELITE</span> SERVICE</span>
              </div>
              <div style={{ color: t.muted, lineHeight: 1.8, fontSize: 13 }}>A voluntary uniformed organization established to build and develop youths through various learning programs and training.</div>
            </div>
            <div>
              <div style={{ color: theme === "light" ? "#0f172a" : "#e8d8a0", fontWeight: 800, fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>Quick Links</div>
              {navLinks.map(([label, id]) => <div key={id} style={{ color: t.muted, fontSize: 13, marginBottom: 8, cursor: "pointer" }} onClick={() => scrollTo(id)}>{label}</div>)}
            </div>
            <div>
              <div style={{ color: theme === "light" ? "#0f172a" : "#e8d8a0", fontWeight: 800, fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>Contact</div>
              <div style={{ color: t.muted, fontSize: 13, lineHeight: 1.8 }}>civileliteservice@gmail.com<br />0818 302 0916</div>
            </div>
          </div>
          <div style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${t.border}`, color: t.muted, fontSize: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span>© {new Date().getFullYear()} Civil Elite Service</span>
            <span>Built for clarity, trust, and national service</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// ── AUTH PAGE ─────────────────────────────────────────────────────────────────
const AuthPage = ({ mode, onAuth, onNavigate }) => {
  const [form, setForm] = useState({ email: "", password: "", name: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isLogin = mode === "login";

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    setError("");
    if (!form.email || !form.password) { setError("Please fill all required fields."); return; }
    if (!isLogin && form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!isLogin && !form.name) { setError("Full name is required."); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Demo: admin@ces.gov.ng → admin, anything else → applicant
      const role = form.email === "admin@ces.gov.ng" ? "admin" : "applicant";
      onAuth({ email: form.email, name: form.name || form.email.split("@")[0], role });
    }, 1400);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0e1a", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "'Segoe UI',sans-serif", padding: 24, position: "relative",
    }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", right: "10%", width: 350, height: 350, background: "radial-gradient(circle,rgba(201,168,76,0.07) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "10%", width: 300, height: 300, background: "radial-gradient(circle,rgba(13,83,150,0.1) 0%,transparent 70%)" }} />
      </div>
      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.2)",
        borderRadius: 20, padding: "44px 40px", width: "100%", maxWidth: 440, zIndex: 1,
        backdropFilter: "blur(20px)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="panel-logo" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>CIVIL <span style={{ color: "#c9952a" }}>ELITE</span> SERVICE</div>
          <div style={{ color: "#667", fontSize: 12, marginTop: 4 }}>SECURE RECRUITMENT PORTAL</div>
        </div>

        <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 22, marginBottom: 24, textAlign: "center" }}>
          {isLogin ? "Sign In to Portal" : "Create Account"}
        </h2>

        {!isLogin && <Input label="Full Name" value={form.name} onChange={set("name")} placeholder="John Adebayo" required />}
        <Input label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
        {!isLogin && <Input label="Confirm Password" type="password" value={form.confirm} onChange={set("confirm")} placeholder="••••••••" required />}

        {isLogin && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{ color: "#667", fontSize: 12 }}>Demo: </span>
            <span style={{ color: "#c9952a", fontSize: 12 }}>admin@ces.gov.ng</span>
            <span style={{ color: "#667", fontSize: 12 }}> or any email for applicant</span>
          </div>
        )}

        {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#f8717122", borderRadius: 8 }}>{error}</div>}

        <GoldBtn onClick={submit} style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}>
          {loading ? "Authenticating…" : isLogin ? "Sign In" : "Create Account"}
        </GoldBtn>

        <div style={{ textAlign: "center", color: "#667", fontSize: 14 }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => onNavigate(isLogin ? "register" : "login")} style={{
            background: "none", border: "none", color: "#c9952a", cursor: "pointer", fontWeight: 700,
          }}>{isLogin ? "Register" : "Sign In"}</button>
        </div>

        <button onClick={() => onNavigate("home")} style={{
          display: "block", margin: "16px auto 0", background: "none", border: "none",
          color: "#556", cursor: "pointer", fontSize: 13,
        }}>← Back to Home</button>
      </div>
    </div>
  );
};

// ── APPLICANT DASHBOARD ───────────────────────────────────────────────────────
const ApplicantDashboard = ({ user, onLogout, theme = "light" }) => {
  const t = getTheme(theme);
  const isLight = theme === "light";
  const surface = isLight ? "#ffffff" : "rgba(255,255,255,0.04)";
  const surfaceBorder = isLight ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.07)";
  const sidebarBg = isLight ? "#ffffff" : "#060a12";
  const topBarBg = isLight ? "rgba(255,255,255,0.9)" : "rgba(6,10,18,0.9)";
  const softText = isLight ? "#475569" : "#8899aa";
  const faintText = isLight ? "#64748b" : "#556";
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [appData, setAppData] = useState({
    fullName: user.name || "", email: user.email || "", phone: "", gender: "",
    dob: "", state: "", lga: "", address: "", qualification: "",
    kinName: "", kinPhone: "", medInfo: "", whyJoin: "",
    status: "pending", submitted: false,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const submitApp = () => {
    if (!appData.fullName || !appData.phone || !appData.gender || !appData.state) {
      showToast("Please fill all required fields.", "error"); return;
    }
    setAppData(d => ({ ...d, submitted: true, status: "under_review" }));
    setTab("status");
    showToast("Application submitted successfully!");
  };

  const announcements = [
    { title: "2025 Batch A Recruitment Open", date: "Jan 15, 2025", tag: "RECRUITMENT", text: "Applications are now open for the 2025 Batch A recruitment exercise. Deadline: March 31, 2025." },
    { title: "Physical Assessment Schedule Released", date: "Jan 20, 2025", tag: "NOTICE", text: "Physical fitness assessment will hold at state capitals nationwide from April 10–20, 2025." },
  ];

  const menuItems = [
    { id: "overview", icon: "🏠", label: "Overview" },
    { id: "apply", icon: "📋", label: "Application Form" },
    { id: "status", icon: "📊", label: "Track Status" },
    { id: "documents", icon: "📁", label: "Documents" },
    { id: "announcements", icon: "📢", label: "Announcements" },
  ];

  const S2 = {
    card: { background: surface, border: `1px solid ${surfaceBorder}`, borderRadius: 14, padding: 24 },
    label: { color: t.muted, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 6 },
  };

  return (
    <div style={{ minHeight: "100vh", background: t.page, color: t.text, fontFamily: "'Segoe UI',sans-serif", display: "flex" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 240 : 0, minHeight: "100vh", overflow: "hidden",
        background: sidebarBg, borderRight: `1px solid ${t.border}`,
        transition: "width .3s", flexShrink: 0,
      }}>
        <div style={{ padding: "24px 20px", minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
            <img src="/logo.png" alt="sid-logo" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 6 }} />
            <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: 1, whiteSpace: "nowrap" }}>
              CES <span style={{ color: "#c9952a" }}>PORTAL</span>
            </span>
          </div>
          {menuItems.map(m => (
            <button key={m.id} onClick={() => setTab(m.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              borderRadius: 10, marginBottom: 4, width: "100%", textAlign: "left",
              background: tab === m.id ? "rgba(201,168,76,0.1)" : "transparent",
              border: tab === m.id ? "1px solid rgba(201,168,76,0.25)" : "1px solid transparent",
              color: tab === m.id ? "#c9952a" : softText, cursor: "pointer",
              fontSize: 14, fontWeight: tab === m.id ? 700 : 400, whiteSpace: "nowrap",
              transition: "all .2s",
            }}>
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
          <button onClick={onLogout} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderRadius: 10, marginTop: 20, width: "100%", textAlign: "left",
            background: "transparent", border: "1px solid transparent",
            color: softText, cursor: "pointer", fontSize: 14, transition: "color .2s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
            onMouseLeave={e => e.currentTarget.style.color = "#667"}
          >
            <LogOut /> Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Top bar */}
        <div style={{
          background: topBarBg, borderBottom: `1px solid ${t.border}`,
          padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: softText, cursor: "pointer" }}>
              <MenuIcon />
            </button>
            <div>
              <div style={{ fontWeight: 700, color: t.text, fontSize: 16 }}>Applicant Portal</div>
              <div style={{ color: faintText, fontSize: 12 }}>Welcome back, {user.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ color: softText }}><BellIcon /></div>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg,#c9952a,#f0c060)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0a0e1a", fontWeight: 900, fontSize: 14,
            }}>{user.name[0]?.toUpperCase()}</div>
          </div>
        </div>

        <div style={{ padding: "32px 28px" }}>
          {/* ─ OVERVIEW ─ */}
          {tab === "overview" && (
            <div>
              <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Dashboard Overview</h2>
              <p style={{ color: t.muted, marginBottom: 28 }}>Track your application progress and announcements.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
                {[
                  { icon: "📋", label: "Application Status", val: appData.submitted ? "Submitted" : "Not Started", color: appData.submitted ? "#81c784" : "#c9952a" },
                  { icon: "📁", label: "Documents", val: "0 / 2 Uploaded", color: "#64b5f6" },
                  { icon: "📢", label: "Announcements", val: `${announcements.length} New`, color: "#c9952a" },
                  { icon: "🎯", label: "Current Stage", val: appData.submitted ? "Under Review" : "Pre-Application", color: "#aab" },
                ].map(c => (
                  <div key={c.label} style={{ ...S2.card }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                    <div style={{ ...S2.label }}>{c.label}</div>
                    <div style={{ color: c.color, fontWeight: 700, fontSize: 15 }}>{c.val}</div>
                  </div>
                ))}
              </div>

              {!appData.submitted && (
                <div style={{ ...S2.card, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.05)" }}>
                  <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 8 }}>⚠️ Complete Your Application</div>
                  <p style={{ color: t.muted, fontSize: 14, marginBottom: 16 }}>Your application has not been submitted. Fill the form and upload required documents to proceed.</p>
                  <GoldBtn onClick={() => setTab("apply")} style={{ fontSize: 13, padding: "10px 20px" }}>Start Application</GoldBtn>
                </div>
              )}

              <div style={{ marginTop: 28 }}>
                <div style={{ color: isLight ? "#9a6b1a" : "#e8d8a0", fontWeight: 700, marginBottom: 14 }}>Latest Announcements</div>
                {announcements.map((a, i) => (
                  <div key={i} style={{ ...S2.card, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <Badge label={a.tag} />
                      <span style={{ color: faintText, fontSize: 12 }}>{a.date}</span>
                    </div>
                    <div style={{ fontWeight: 700, color: t.text, marginBottom: 6 }}>{a.title}</div>
                    <div style={{ color: t.muted, fontSize: 14 }}>{a.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ APPLICATION FORM ─ */}
          {tab === "apply" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Recruitment Application</h2>
              <p style={{ color: "#667", marginBottom: 28 }}>Complete all fields accurately. False information is disqualifying.</p>

              {appData.submitted && (
                <div style={{ ...S2.card, background: "rgba(76,175,80,0.08)", border: "1px solid rgba(76,175,80,0.3)", marginBottom: 24 }}>
                  <div style={{ color: "#81c784", fontWeight: 700 }}>✅ Application Submitted — Your application is under review.</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 0 }}>
                <div style={{ paddingRight: 16 }}>
                  <div style={{ color: "#c9952a", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>PERSONAL INFORMATION</div>
                  <Input label="Full Name" value={appData.fullName} onChange={e => setAppData(d => ({ ...d, fullName: e.target.value }))} required />
                  <Input label="Email Address" type="email" value={appData.email} onChange={e => setAppData(d => ({ ...d, email: e.target.value }))} required />
                  <Input label="Phone Number" value={appData.phone} onChange={e => setAppData(d => ({ ...d, phone: e.target.value }))} placeholder="+234 800 000 0000" required />
                  <Select label="Gender" value={appData.gender} onChange={e => setAppData(d => ({ ...d, gender: e.target.value }))} required
                    options={[{ value: "", label: "Select gender" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
                  <Input label="Date of Birth" type="date" value={appData.dob} onChange={e => setAppData(d => ({ ...d, dob: e.target.value }))} required />
                  <Select label="State of Origin" value={appData.state} onChange={e => setAppData(d => ({ ...d, state: e.target.value }))} required
                    options={[{ value: "", label: "Select state" }, ...["Lagos", "Abuja FCT", "Rivers", "Kano", "Ogun", "Oyo", "Anambra", "Delta", "Enugu", "Kaduna"].map(s => ({ value: s, label: s }))]} />
                  <Input label="Local Government Area" value={appData.lga} onChange={e => setAppData(d => ({ ...d, lga: e.target.value }))} required />
                  <Textarea label="Residential Address" value={appData.address} onChange={e => setAppData(d => ({ ...d, address: e.target.value }))} rows={2} required />
                </div>
                <div>
                  <div style={{ color: "#c9952a", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>QUALIFICATIONS & NEXT OF KIN</div>
                  <Select label="Highest Educational Qualification" value={appData.qualification} onChange={e => setAppData(d => ({ ...d, qualification: e.target.value }))} required
                    options={[{ value: "", label: "Select qualification" }, { value: "waec", label: "WAEC/NECO" }, { value: "ond", label: "OND" }, { value: "hnd", label: "HND" }, { value: "bsc", label: "B.Sc / B.A" }, { value: "msc", label: "M.Sc / MBA" }]} />
                  <Input label="Next of Kin — Full Name" value={appData.kinName} onChange={e => setAppData(d => ({ ...d, kinName: e.target.value }))} required />
                  <Input label="Next of Kin — Phone" value={appData.kinPhone} onChange={e => setAppData(d => ({ ...d, kinPhone: e.target.value }))} required />
                  <Textarea label="Medical Information (Conditions, Allergies, etc.)" value={appData.medInfo} onChange={e => setAppData(d => ({ ...d, medInfo: e.target.value }))} placeholder="None known / describe any conditions..." rows={3} />
                  <Textarea label="Why do you want to join Civil Elite Service? *" value={appData.whyJoin} onChange={e => setAppData(d => ({ ...d, whyJoin: e.target.value }))} placeholder="Describe your motivation, goals, and how you will contribute..." rows={5} required />
                </div>
              </div>

              {!appData.submitted && (
                <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                  <GoldBtn onClick={submitApp}>Submit Application</GoldBtn>
                  <GoldBtn outline onClick={() => showToast("Draft saved successfully!")}>Save Draft</GoldBtn>
                </div>
              )}
            </div>
          )}

          {/* ─ STATUS ─ */}
          {tab === "status" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Application Status</h2>
              {!appData.submitted ? (
                <div style={{ ...S2.card, textAlign: "center", padding: 48 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                  <div style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>No Application Found</div>
                  <div style={{ color: "#667", marginBottom: 20 }}>You have not submitted an application yet.</div>
                  <GoldBtn onClick={() => setTab("apply")}>Start Application</GoldBtn>
                </div>
              ) : (
                <div>
                  <div style={{ ...S2.card, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#fff", fontSize: 18 }}>{appData.fullName}</div>
                        <div style={{ color: "#667", fontSize: 13 }}>Ref: CES-2025-{String(Math.floor(Math.random() * 9000) + 1000)}</div>
                      </div>
                      <StatusBadge s={appData.status} />
                    </div>
                    {/* Timeline */}
                    <div style={{ position: "relative", paddingLeft: 28 }}>
                      <div style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.1)" }} />
                      {[
                        { label: "Application Received", date: "Jan 22, 2025", done: true },
                        { label: "Document Verification", date: "Pending", done: false },
                        { label: "Physical Assessment", date: "April 10–20, 2025", done: false },
                        { label: "Medical Examination", date: "TBD", done: false },
                        { label: "Final Approval & Posting", date: "TBD", done: false },
                      ].map((step, i) => (
                        <div key={i} style={{ position: "relative", marginBottom: 20 }}>
                          <div style={{
                            position: "absolute", left: -24, top: 2, width: 12, height: 12,
                            borderRadius: "50%", background: step.done ? "#c9952a" : "#333",
                            border: `2px solid ${step.done ? "#c9952a" : "#555"}`,
                          }} />
                          <div style={{ fontWeight: 600, color: step.done ? "#fff" : "#667", fontSize: 14 }}>{step.label}</div>
                          <div style={{ color: "#556", fontSize: 12 }}>{step.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <GoldBtn outline onClick={() => showToast("Application slip downloaded!")}>
                    <Download /> Download Application Slip
                  </GoldBtn>
                </div>
              )}
            </div>
          )}

          {/* ─ DOCUMENTS ─ */}
          {tab === "documents" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Document Upload</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
                {[{ label: "Passport Photograph", hint: "Clear face photo, white background, JPG/PNG, max 2MB" },
                  { label: "Valid Government ID", hint: "NIN slip, Voter's card, Driver's licence, or Passport" }].map(d => (
                  <div key={d.label} style={{ ...S2.card }}>
                    <div style={{ fontWeight: 700, color: "#e8d8a0", marginBottom: 6 }}>{d.label}</div>
                    <div style={{ color: "#667", fontSize: 13, marginBottom: 16 }}>{d.hint}</div>
                    <div style={{
                      border: "2px dashed rgba(201,168,76,0.3)", borderRadius: 10, padding: "28px 20px",
                      textAlign: "center", cursor: "pointer",
                    }}
                      onClick={() => showToast("Document uploaded successfully!")}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#c9952a"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"}
                    >
                      <div style={{ color: "#c9952a", display: "flex", justifyContent: "center", marginBottom: 8 }}><UploadIcon /></div>
                      <div style={{ color: "#aab", fontSize: 14 }}>Click to upload</div>
                      <div style={{ color: "#556", fontSize: 12, marginTop: 4 }}>JPG, PNG or PDF up to 5MB</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ ANNOUNCEMENTS ─ */}
          {tab === "announcements" && (
            <div>
              <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Announcements</h2>
              {announcements.map((a, i) => (
                <div key={i} style={{ ...S2.card, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <Badge label={a.tag} />
                    <span style={{ color: faintText, fontSize: 12 }}>{a.date}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: t.text, fontSize: 16, marginBottom: 8 }}>{a.title}</div>
                  <div style={{ color: t.muted, lineHeight: 1.7 }}>{a.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
const AdminDashboard = ({ user, onLogout, theme = "light" }) => {
  const t = getTheme(theme);
  const isLight = theme === "light";
  const surface = isLight ? "#ffffff" : "rgba(255,255,255,0.04)";
  const surfaceBorder = isLight ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.07)";
  const sidebarBg = isLight ? "#ffffff" : "#060a12";
  const topBarBg = isLight ? "rgba(255,255,255,0.9)" : "rgba(6,10,18,0.9)";
  const softText = isLight ? "#475569" : "#8899aa";
  const faintText = isLight ? "#64748b" : "#556";
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [announcement, setAnnouncement] = useState({ title: "", body: "" });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [applicants, setApplicants] = useState([
    { id: 1, name: "Adebayo Taiwo", email: "adebayo@email.com", state: "Lagos", status: "pending", date: "Jan 18, 2025", gender: "Male" },
    { id: 2, name: "Amaka Okonkwo", email: "amaka@email.com", state: "Anambra", status: "under_review", date: "Jan 20, 2025", gender: "Female" },
    { id: 3, name: "Emeka Chukwu", email: "emeka@email.com", state: "Enugu", status: "approved", date: "Jan 22, 2025", gender: "Male" },
    { id: 4, name: "Fatima Musa", email: "fatima@email.com", state: "Kano", status: "pending", date: "Jan 23, 2025", gender: "Female" },
    { id: 5, name: "Ibrahim Garba", email: "ibrahim@email.com", state: "Kaduna", status: "rejected", date: "Jan 24, 2025", gender: "Male" },
    { id: 6, name: "Blessing Effiong", email: "blessing@email.com", state: "Rivers", status: "under_review", date: "Jan 25, 2025", gender: "Female" },
  ]);

  const updateStatus = (id, status) => {
    setApplicants(a => a.map(ap => ap.id === id ? { ...ap, status } : ap));
    showToast(`Applicant status updated to ${status}.`);
  };

  const filtered = applicants.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.state.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    total: applicants.length,
    pending: applicants.filter(a => a.status === "pending").length,
    review: applicants.filter(a => a.status === "under_review").length,
    approved: applicants.filter(a => a.status === "approved").length,
    rejected: applicants.filter(a => a.status === "rejected").length,
  };

  const menuItems = [
    { id: "overview", icon: <BarChart />, label: "Overview" },
    { id: "applicants", icon: <UsersIcon />, label: "Applicants" },
    { id: "announcements", icon: <BellIcon />, label: "Announcements" },
    { id: "analytics", icon: <TrendingUp />, label: "Analytics" },
    { id: "settings", icon: <Settings />, label: "Settings" },
  ];

  const S2 = {
    card: { background: surface, border: `1px solid ${surfaceBorder}`, borderRadius: 14, padding: 24 },
  };

  return (
    <div style={{ minHeight: "100vh", background: t.page, color: t.text, fontFamily: "'Segoe UI',sans-serif", display: "flex" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? 240 : 0, minHeight: "100vh", overflow: "hidden",
        background: sidebarBg, borderRight: `1px solid ${t.border}`,
        transition: "width .3s", flexShrink: 0,
      }}>
        <div style={{ padding: "24px 20px", minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <img src="/logo.png" alt="sid-admin-logo" style={{ width: 22, height: 22, objectFit: "cover", borderRadius: 6 }} />
            <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: 1, whiteSpace: "nowrap" }}>
              CES <span style={{ color: "#c9952a" }}>ADMIN</span>
            </span>
          </div>
          <div style={{ color: faintText, fontSize: 11, marginBottom: 28 }}>Control Panel</div>
          {menuItems.map(m => (
            <button key={m.id} onClick={() => setTab(m.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
              borderRadius: 10, marginBottom: 4, width: "100%", textAlign: "left",
              background: tab === m.id ? "rgba(201,168,76,0.1)" : "transparent",
              border: tab === m.id ? "1px solid rgba(201,168,76,0.25)" : "1px solid transparent",
              color: tab === m.id ? "#c9952a" : softText, cursor: "pointer",
              fontSize: 14, fontWeight: tab === m.id ? 700 : 400, whiteSpace: "nowrap",
              transition: "all .2s",
            }}>
              {m.icon} {m.label}
            </button>
          ))}
          <button onClick={onLogout} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            borderRadius: 10, marginTop: 20, width: "100%", textAlign: "left",
            background: "transparent", border: "1px solid transparent",
            color: softText, cursor: "pointer", fontSize: 14,
          }}
            onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
            onMouseLeave={e => e.currentTarget.style.color = "#667"}
          >
            <LogOut /> Sign Out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {/* Top bar */}
        <div style={{
          background: topBarBg, borderBottom: `1px solid ${t.border}`,
          padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: softText, cursor: "pointer" }}>
              <MenuIcon />
            </button>
            <div>
              <div style={{ fontWeight: 700, color: t.text, fontSize: 16 }}>Admin Dashboard</div>
              <div style={{ color: faintText, fontSize: 12 }}>{user.name} · Super Administrator</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Badge label="ADMIN" color="#e57373" />
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg,#c9952a,#f0c060)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0a0e1a", fontWeight: 900, fontSize: 14,
            }}>{user.name[0]?.toUpperCase()}</div>
          </div>
        </div>

        <div style={{ padding: "32px 28px" }}>
          {/* ─ OVERVIEW ─ */}
          {tab === "overview" && (
            <div>
              <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Admin Overview</h2>
              <p style={{ color: t.muted, marginBottom: 28 }}>Real-time recruitment statistics and activity.</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 28 }}>
                {[
                  { icon: "👥", label: "Total Applicants", val: counts.total, color: t.text },
                  { icon: "⏳", label: "Pending", val: counts.pending, color: "#c9952a" },
                  { icon: "🔍", label: "Under Review", val: counts.review, color: "#64b5f6" },
                  { icon: "✅", label: "Approved", val: counts.approved, color: "#81c784" },
                  { icon: "❌", label: "Rejected", val: counts.rejected, color: "#e57373" },
                ].map(c => (
                  <div key={c.label} style={{ ...S2.card, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                    <div style={{ color: c.color, fontWeight: 800, fontSize: 28 }}>{c.val}</div>
                    <div style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div style={{ ...S2.card }}>
                <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                  Recent Applications
                  <button onClick={() => setTab("applicants")} style={{ background: "none", border: "none", color: "#c9952a", cursor: "pointer", fontSize: 13 }}>View All →</button>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Name", "State", "Date", "Status", "Action"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: faintText, fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${t.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {applicants.slice(0, 5).map(a => (
                        <tr key={a.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                          <td style={{ padding: "12px 14px", color: t.text, fontSize: 14 }}>{a.name}</td>
                          <td style={{ padding: "12px 14px", color: t.muted, fontSize: 14 }}>{a.state}</td>
                          <td style={{ padding: "12px 14px", color: t.muted, fontSize: 13 }}>{a.date}</td>
                          <td style={{ padding: "12px 14px" }}><StatusBadge s={a.status} /></td>
                          <td style={{ padding: "12px 14px" }}>
                            <button onClick={() => updateStatus(a.id, "under_review")} style={{
                              background: "none", border: "1px solid rgba(201,168,76,0.3)", color: "#c9952a",
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                            }}>Review</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─ APPLICANTS ─ */}
          {tab === "applicants" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
                <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 24 }}>All Applicants</h2>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#556" }}><Search /></div>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicants…"
                      style={{
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8, padding: "10px 14px 10px 40px", color: "#fff", fontSize: 14, outline: "none", width: 220,
                      }} />
                  </div>
                  <GoldBtn onClick={() => showToast("Data exported as CSV!")} style={{ fontSize: 13, padding: "10px 18px" }}>
                    <Download /> Export
                  </GoldBtn>
                </div>
              </div>
              <div style={{ ...S2.card, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      {["#", "Name", "Email", "State", "Gender", "Date", "Status", "Actions"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "#556", fontSize: 12, fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => (
                      <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "12px 14px", color: "#556", fontSize: 13 }}>{a.id}</td>
                        <td style={{ padding: "12px 14px", color: "#fff", fontSize: 14, fontWeight: 600 }}>{a.name}</td>
                        <td style={{ padding: "12px 14px", color: "#8899aa", fontSize: 13 }}>{a.email}</td>
                        <td style={{ padding: "12px 14px", color: "#aab", fontSize: 14 }}>{a.state}</td>
                        <td style={{ padding: "12px 14px", color: "#aab", fontSize: 14 }}>{a.gender}</td>
                        <td style={{ padding: "12px 14px", color: "#556", fontSize: 13 }}>{a.date}</td>
                        <td style={{ padding: "12px 14px" }}><StatusBadge s={a.status} /></td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => updateStatus(a.id, "approved")} style={{
                              background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.3)", color: "#81c784",
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700,
                            }}>✓</button>
                            <button onClick={() => updateStatus(a.id, "rejected")} style={{
                              background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.25)", color: "#e57373",
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700,
                            }}>✗</button>
                            <button onClick={() => updateStatus(a.id, "under_review")} style={{
                              background: "rgba(100,181,246,0.1)", border: "1px solid rgba(100,181,246,0.25)", color: "#64b5f6",
                              borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11,
                            }}><Eye /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: "#556" }}>No applicants found for "{search}"</div>
                )}
              </div>
            </div>
          )}

          {/* ─ ANNOUNCEMENTS ─ */}
          {tab === "announcements" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Post Announcement</h2>
              <div style={{ ...S2.card, maxWidth: 600, marginBottom: 32 }}>
                <div style={{ color: "#c9952a", fontWeight: 700, marginBottom: 16 }}>New Announcement</div>
                <Input label="Title" value={announcement.title} onChange={e => setAnnouncement(a => ({ ...a, title: e.target.value }))} placeholder="Announcement headline…" />
                <Textarea label="Body" value={announcement.body} onChange={e => setAnnouncement(a => ({ ...a, body: e.target.value }))} placeholder="Full announcement content…" rows={5} />
                <GoldBtn onClick={() => { showToast("Announcement published to all applicants!"); setAnnouncement({ title: "", body: "" }); }}>
                  <Plus /> Publish Announcement
                </GoldBtn>
              </div>
            </div>
          )}

          {/* ─ ANALYTICS ─ */}
          {tab === "analytics" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Analytics Dashboard</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20, marginBottom: 28 }}>
                {[
                  { label: "Application Completion Rate", val: "74%", trend: "+8%", icon: "📈" },
                  { label: "Avg. Processing Time", val: "3.2 days", trend: "-0.5d", icon: "⏱" },
                  { label: "Approval Rate", val: `${Math.round(counts.approved / counts.total * 100)}%`, trend: "+2%", icon: "✅" },
                  { label: "Female Applicants", val: "41%", trend: "+6%", icon: "👩" },
                ].map(c => (
                  <div key={c.label} style={{ ...S2.card }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                    <div style={{ color: "#8899aa", fontSize: 12, marginBottom: 6 }}>{c.label}</div>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 28 }}>{c.val}</div>
                    <div style={{ color: "#81c784", fontSize: 13, marginTop: 4 }}>↑ {c.trend} this month</div>
                  </div>
                ))}
              </div>

              {/* Visual bar chart */}
              <div style={{ ...S2.card }}>
                <div style={{ fontWeight: 700, color: "#e8d8a0", marginBottom: 20 }}>Applications by State</div>
                {[{ state: "Lagos", count: 42 }, { state: "Rivers", count: 28 }, { state: "Abuja FCT", count: 25 }, { state: "Kano", count: 19 }, { state: "Anambra", count: 14 }, { state: "Oyo", count: 11 }].map(s => (
                  <div key={s.state} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#aab", fontSize: 13 }}>{s.state}</span>
                      <span style={{ color: "#c9952a", fontSize: 13, fontWeight: 700 }}>{s.count}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                      <div style={{
                        width: `${(s.count / 42) * 100}%`, height: "100%",
                        background: "linear-gradient(90deg,#c9952a,#f0c060)", borderRadius: 999,
                        transition: "width 1s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─ SETTINGS ─ */}
          {tab === "settings" && (
            <div>
              <h2 style={{ color: "#fff", fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Admin Settings</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
                {[
                  { label: "Recruitment Status", desc: "Toggle the portal open/closed for new applications", action: "Toggle Open", icon: "🔓" },
                  { label: "Audit Logs", desc: "View all admin actions and changes in the system", action: "View Logs", icon: "📋" },
                  { label: "Export All Data", desc: "Download full applicant database as CSV or Excel", action: "Export Now", icon: "📥" },
                  { label: "Email Notifications", desc: "Configure system email alerts to applicants", action: "Configure", icon: "📧" },
                ].map(s => (
                  <div key={s.label} style={{ ...S2.card }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                    <div style={{ fontWeight: 700, color: "#e8d8a0", marginBottom: 6 }}>{s.label}</div>
                    <div style={{ color: "#667", fontSize: 14, marginBottom: 16 }}>{s.desc}</div>
                    <GoldBtn outline onClick={() => showToast(`${s.action} action triggered.`)} style={{ fontSize: 13, padding: "8px 16px" }}>{s.action}</GoldBtn>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  ROOT APP (ROUTER)
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home"); // home | login | register | dashboard
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");

  const handleAuth = (u) => {
    setUser(u);
    setPage("dashboard");
  };
  const handleLogout = () => {
    setUser(null);
    setPage("home");
  };

  const toggleTheme = () => setTheme(current => (current === "light" ? "dark" : "light"));

  if (page === "home") return <><LandingPage onNavigate={setPage} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /></>;
  if (page === "login") return <><AuthPage mode="login" onAuth={handleAuth} onNavigate={setPage} /><ThemeToggle theme={theme} onToggle={toggleTheme} /></>;
  if (page === "register") return <><AuthPage mode="register" onAuth={handleAuth} onNavigate={setPage} /><ThemeToggle theme={theme} onToggle={toggleTheme} /></>;
  if (page === "dashboard" && user) {
    return user.role === "admin"
      ? <><AdminDashboard user={user} onLogout={handleLogout} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /></>
      : <><ApplicantDashboard user={user} onLogout={handleLogout} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /></>;
  }
  return <><LandingPage onNavigate={setPage} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /></>;
}
