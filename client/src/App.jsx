import QRCode from "qrcode";
import { useState, useEffect, useRef, useCallback } from "react";
import { FaFacebook, FaInstagram, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { authAPI, applicantAPI, adminAPI, publicAPI, tokenManager } from "./api.js";
// Hero image imported
// import heroImg from "./assets/hero.png";

// ── Utility ──────────────────────────────────────────────────────────────────
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView];
};

// Theme helper used throughout the app to map theme names to palette tokens
const getTheme = (mode = "light") => {
  const light = mode === "light";
  return {
    page: light ? "#f8faf6" : "#071022",
    text: light ? "#0f172a" : "#e6eef8",
    muted: light ? "#64748b" : "#9aa7bb",
    border: light ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)",
    accent: "#c9952a",
    card: light ? "#fffdf8" : "rgba(255,255,255,0.03)",
    glow: light ? "rgba(201,149,42,0.12)" : "rgba(201,149,42,0.08)",
  };
};

// Default public/admin settings used by the client when server settings are unavailable
const createDefaultSettings = () => ({
  recruitmentOpen: false,
  emailNotifications: { enabled: false },
  manualPayment: {
    feeAmount: 5000,
    currency: "NGN",
    bankName: "",
    accountName: "",
    accountNumber: "",
    bankBranch: "",
  },
  serviceYear: new Date().getFullYear(),
  serviceBatch: 1,
  servicePrefix: "CES",
  numberPadding: 3,
});

// Service status options used in forms
const SERVICE_STATUS_OPTIONS = ["active", "dismissed", "retired"];

// Application status options used by the admin assessment UI
const APPLICATION_STATUS_OPTIONS = ["pending", "under_review", "approved", "rejected"];

// Simple currency formatter used by the UI
const formatCurrency = (amount = 0, currency = "NGN") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const SOCIAL_LINKS = [
  { label: "WhatsApp Group", href: "https://chat.whatsapp.com/Hrr2tVkOEfQ2W5DZ4KG1YD?mode=gi_t", icon: "💬", note: "Get live updates and alerts" },
  { label: "Facebook Page", href: "https://www.facebook.com/profile.php?id=100067616334695", icon: "📘", note: "News, photos, and notices" },
  { label: "TikTok", href: "https://vm.tiktok.com/ZS9F3dEAjwbdg-UR6EN/", icon: "🎵", note: "Short updates and highlights" },
  { label: "Instagram", href: "https://www.instagram.com/civileliteservice?igsh=MXNra3g3enhjbWZ3Yw==", icon: "📷", note: "Photos and stories" },
];

const createApplicantId = () => `CES-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;

// Starting serial number for applicants listing (first row will show this value)
const APPLICANT_SERIAL_START = 1;

const USER_REGISTRY_KEY = "ces_user_registry";

const loadUserRegistry = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_REGISTRY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveUserRegistry = (users) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_REGISTRY_KEY, JSON.stringify(users));
};

const createUniqueApplicantId = (users) => {
  const ids = new Set(users.map(u => u.applicantId));
  let id = createApplicantId();
  while (ids.has(id)) id = createApplicantId();
  return id;
};

const buildQrPayload = ({ applicantId }) => {
  if (typeof window === "undefined") return `/?verify=${encodeURIComponent(applicantId)}`;
  return `${window.location.origin}/?verify=${encodeURIComponent(applicantId)}`;
};

const parseQrPayload = (raw) => {
  try {
    const data = JSON.parse(raw);
    if (
      data &&
      data.type === "CES_USER" &&
      typeof data.applicantId === "string" &&
      (data.serviceStatus === undefined || SERVICE_STATUS_OPTIONS.includes(data.serviceStatus))
    ) {
      return data;
    }
  } catch {
    try {
      const url = new URL(raw);
      const applicantId = url.searchParams.get("verify") || url.searchParams.get("applicantId");
      if (applicantId) {
        return {
          type: "CES_USER",
          applicantId,
        };
      }
    } catch {
      return null;
    }
  }
  return null;
};

const base64UrlToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
};

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

const GoldBtn = ({ children, onClick, outline = false, disabled = false, style = {} }) => (
  <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, padding: "12px 20px", border: outline ? "2px solid #c9952a" : "none", background: disabled ? "rgba(201,149,42,0.35)" : outline ? "transparent" : "linear-gradient(135deg,#c9952a,#f0c060)", color: outline ? "#c9952a" : "#0f172a", fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.75 : 1, transition: "all .2s ease", ...style }}>{children}</button>
);

const PaymentNotice = ({ settings, light = false }) => {
  const payment = settings?.manualPayment || {};
  const feeAmount = payment.feeAmount ?? 5000;
  const currency = payment.currency || "NGN";
  const bankRows = [
    ["Bank", payment.bankName],
    ["Account Name", payment.accountName],
    ["Account Number", payment.accountNumber],
  ];

  if (payment.bankBranch) {
    bankRows.push(["Branch", payment.bankBranch]);
  }

  return (
    <div className={`payment-notice ${light ? "payment-notice--light" : "payment-notice--dark"}`} style={{ marginBottom: 20 }}>
      <div className="payment-notice__glow" />
      
      {/* Amount + Title */}
      <div className="payment-notice__header">
        <div>
          <div className="payment-notice__title">Form Fee</div>
          <div className="payment-notice__subcopy">Manual bank transfer</div>
        </div>
        <div className="payment-notice__amount">{formatCurrency(feeAmount, currency)}</div>
      </div>

      {/* Bank Details - Compact Receipt Style */}
      <div className="payment-notice__receipt-box">
        <div className="payment-notice__receipt-bank">{payment.bankName || "Zenith"}</div>
        <div className="payment-notice__receipt-account">
          <span className="payment-notice__receipt-label">Account:</span>
          {payment.accountNumber || "1311106690"}
        </div>
        <div className="payment-notice__receipt-name">
          {payment.accountName || "Civic Rights and peace building foundation"}
        </div>
      </div>

      {/* Action Footer */}
      <div className="payment-notice__footer">
        <span style={{ fontWeight: 600 }}>✓</span> Bring receipt to camp for verification
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder, required, light = false }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", color: light ? "#475569" : "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{label}{required && <span style={{ color: "#c9952a" }}> *</span>}</label>}
    <input value={value} onChange={onChange} type={type} placeholder={placeholder} required={required} style={{ width: "100%", background: light ? "#ffffff" : "rgba(255,255,255,0.05)", border: `1px solid ${light ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "11px 14px", color: light ? "#0f172a" : "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#c9952a"} onBlur={e => e.target.style.borderColor = light ? "#cbd5e1" : "rgba(255,255,255,0.1)"} />
  </div>
);

const PasswordInput = ({ label, value, onChange, placeholder, required, light = false }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", color: light ? "#475569" : "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{label}{required && <span style={{ color: "#c9952a" }}> *</span>}</label>}
      <div style={{ position: "relative" }}>
        <input
          value={value}
          onChange={onChange}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          required={required}
          style={{ width: "100%", background: light ? "#ffffff" : "rgba(255,255,255,0.05)", border: `1px solid ${light ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "11px 42px 11px 14px", color: light ? "#0f172a" : "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = "#c9952a"}
          onBlur={e => e.target.style.borderColor = light ? "#cbd5e1" : "rgba(255,255,255,0.1)"}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: "none",
            color: light ? "#475569" : "#cbd5e1",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Eye />
        </button>
      </div>
    </div>
  );
};

const Select = ({ label, value, onChange, options, required, light = false }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", color: light ? "#475569" : "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{label}{required && <span style={{ color: "#c9952a" }}> *</span>}</label>}
    <select value={value} onChange={onChange} required={required} style={{ width: "100%", background: light ? "#ffffff" : "#0d1b2a", border: `1px solid ${light ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "11px 14px", color: value ? (light ? "#0f172a" : "#fff") : (light ? "#64748b" : "#777"), fontSize: 14, outline: "none", cursor: "pointer", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "#c9952a"} onBlur={e => e.target.style.borderColor = light ? "#cbd5e1" : "rgba(255,255,255,0.1)"}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Textarea = ({ label, value, onChange, placeholder, rows = 4, required, light = false }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", color: light ? "#475569" : "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{label}{required && <span style={{ color: "#c9952a" }}> *</span>}</label>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} required={required} style={{ width: "100%", background: light ? "#ffffff" : "rgba(255,255,255,0.05)", border: `1px solid ${light ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "11px 14px", color: light ? "#0f172a" : "#fff", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} onFocus={e => e.target.style.borderColor = "#c9952a"} onBlur={e => e.target.style.borderColor = light ? "#cbd5e1" : "rgba(255,255,255,0.1)"} />
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

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara", "Abuja FCT",
];

const LGA_OPTIONS = {
  "Abia": ["Aba North", "Aba South", "Arochukwu", "Bende", "Ikwuano", "Isiukwuato", "Obi Ngwa", "Ohafia", "Osisioma Ngwa", "Ugwunagbo", "Ukwa East", "Ukwa West", "Umuahia North", "Umuahia South", "Umunneochi"],
  "Adamawa": ["Demsa", "Fufore", "Ganye", "Girei", "Gombi", "Guyuk", "Hong", "Jada", "Madamatak", "Maiha", "Mayo Belwa", "Michika", "Mubi North", "Mubi South", "Numan", "Shelleng", "Song", "Toungo", "Yola North", "Yola South"],
  "Akwa Ibom": ["Abak", "Abia Akwa Ibom", "Eket", "Esit Eket", "Essien Udim", "Etim Ekpo", "Etinan", "Ibeno", "Ibesikpo Asutan", "Ibiam", "Ibibio", "Ibiono Ibom", "Ikot Abasi", "Ikot Ekpene", "Ini", "Iquita Ibom", "Ituk-Mbon", "Mbo", "Mkpat Enin", "Nsit Atai", "Nsit Ibom", "Nsit Ubium", "Obot Akara", "Okobo", "Onna", "Oron", "Oruk Anem", "Udung Uko", "Ukanafun", "Uruan", "Urue-Offong/Oruko", "Uyo"],
  "Anambra": ["Aguata", "Anambra East", "Anambra West", "Anaocha", "Awka North", "Awka South", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South", "Ihiala", "Njikoka", "Nnewi North", "Nnewi South", "Ogbaru", "Onitsha North", "Onitsha South", "Orumba North", "Orumba South", "Oyi"],
  "Bauchi": ["Alkaleri", "Bauchi", "Bogoro", "Damban", "Darazo", "Dass", "Gamawa", "Ganjuwa", "Giade", "Ilesha Baruba", "Jama'are", "Jambal", "Katagum", "Kirfi", "Kiwi", "Lere", "Misau", "Ningi", "Shira", "Tafawa Balewa", "Toro", "Warji", "Zaki"],
  "Bayelsa": ["Brass", "Ekpetiama", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw", "Yenagoa"],
  "Benue": ["Ado", "Agatu", "Apa", "Buruku", "Gboko", "Guma", "Gwer East", "Gwer West", "Katsina-Ala", "Konshisha", "Koudun", "Logo", "Makurdi", "Obi", "Ogbadibo", "Oji River", "Okpokwu", "Otukpo", "Tarka", "Ukum", "Ushongo", "Vandeikya"],
  "Borno": ["Abadam", "Askira/Uba", "Bama", "Bayo", "Benie", "Bogoro", "Borno", "Chibok", "Damboa", "Dikwa", "Gajigada", "Guzamala", "Gwoza", "Hawul", "Jere", "Kaga", "Kala/Balge", "Konduga", "Kusar", "Kwan", "Kwaya Kusar", "Mafa", "Magumeri", "Maiha", "Maiduguri", "Maisari", "Makan", "Mambutu", "Mandara", "Mangu", "Marghi North", "Marghi South", "Mobbar", "Modu", "Monguno", "Mora", "Mubi", "Muna", "Mushai", "Mustapha", "Ngala", "Nganzai", "Nguru", "Potiskum", "Shani", "Shira", "Tarmua", "Yunusari", "Yusufari"],
  "Cross River": ["Abi", "Akamkpa", "Akpabuyo", "Bakassi", "Balanga", "Boki", "Buanchor", "Calabar Municipal", "Calabar South", "Cham", "Cockem", "Etung", "Ikom", "Oban", "Obanliku", "Obot Akara", "Odukpani", "Ogoja", "Okombo", "Okuku", "Okwan", "Oron", "Ossiomo", "Ugep", "Uwet", "Yakurr", "Yekamene"],
  "Delta": ["Aniocha North", "Aniocha South", "Bomadi", "Burutu", "Ethiope East", "Ethiope West", "Ika North East", "Ika South", "Isoko North", "Isoko South", "Ndokwa East", "Ndokwa West", "Okpe", "Oshimili North", "Oshimili South", "Patani", "Sapele", "Udu", "Ughelli North", "Ughelli South", "Ukwuani", "Uvwie", "Warri North", "Warri South", "Warri South West"],
  "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Eguatiegba", "Enugu-Ezike", "Enugu-Nzeke", "Enugwu-Agidi", "Enugwu-Ekiti", "Enugwu-Iggah", "Enugwu-Odum", "Enugwu-Ukwu", "Enukwu-Ujah", "Enukwu-Ukwu", "Essiene", "Evangel", "Gbuji", "Gbulle", "Gbute", "Igede", "Igga", "Ikarama", "Iwollo", "Ohaozara", "Okposi", "Oye"],
  "Edo": ["Akoko-Edo", "Egor", "Esan Central", "Esan North-East", "Esan South-East", "Esan West", "Etsako Central", "Etsako East", "Etsako West", "Igueben", "Ikpoba-Okha", "Oredo", "Orhionmwon", "Owan East", "Owan West", "Ovia North-East", "Ovia South-West", "Owan"],
  "Ekiti": ["Ado Ekiti", "Efon Alaaye", "Ekiti East", "Ekiti South-West", "Ekiti West", "Emure", "Gbonyin", "Ido Osi", "Ijero", "Ikere", "Ilejemeje", "Irepodun", "Ise/Orun", "Moba", "Oye"],
  "Enugu": ["Aninri", "Awgu", "Enugu East", "Enugu North", "Enugu South", "Ezeagu", "Igbo Etiti", "Igbo Eze North", "Igbo Eze South", "Isi Uzo", "Nkanu East", "Nkanu West", "Nsukka", "Oji River", "Udenu", "Udi", "Uzo Uwani"],
  "Gombe": ["Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Gombe", "Kaltungo", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
  "Imo": ["Aboh Mbaise", "Ahiazu Mbaise", "Ehime Mbano", "Ezinihitte Mbaise", "Ideato North", "Ideato South", "Igbo-Eze", "Ikeduru", "Isiala Mbano", "Isiuzo", "Isuikwuato", "Ivuogu", "Mbaitoli", "Mbano", "Mbieri", "Ngor-Okpala", "Njaba", "Nkwerre", "Nkwerre", "Obowo", "Oguta", "Ohaji/Egbema", "Okigwe", "Onuimo", "Orlu", "Orogu", "Orsu", "Oru East", "Oru West", "Osuagwu", "Otugu", "Owerri Municipal", "Owerri North", "Owerri West", "Ozo-Owerri", "Unuimo"],
  "Jigawa": ["Auyo", "Babbar", "Bauchi", "Baure", "Biriniwa", "Buji", "Dutse", "Gagarawa", "Garki", "Garun Mallam", "Gaya", "Gerie", "Giwa", "Guri", "Gumel", "Gummi", "Gwiwa", "Hadejia", "Jahun", "Jangefe", "Jari", "Jigawa", "Jobna", "Kafinhausa", "Kafur", "Kaugama", "Kaura Namoda", "Kazaure", "Kiri Kasama", "Kiyawa", "Koko/Baba", "Kongolam", "Kura", "Kurmama", "Kustau", "Kuturkwada", "Kwankwaso", "Kware", "Maigatari", "Maikano", "Maiha", "Maijamaje", "Maijiya", "Majiyagbe", "Makoda", "Makoda", "Makwaye", "Malammadori", "Malammaji", "Malamawa", "Malammaye", "Mali", "Malimdori", "Mallamkari", "Mallamkassa", "Mallamkasua", "Mallawa", "Mallawa", "Mallo", "Malmaji", "Malodo", "Malumfashi", "Malumshi", "Mamala", "Mamasa", "Mamaye", "Mambaya", "Mambi", "Mami", "Mamida", "Mamila", "Mamino", "Mamimu", "Mamiyan", "Mamiya", "Mamizagari", "Mamo", "Mamud", "Mamudo", "Mamudo", "Mamugere", "Mamukari", "Mamukarya", "Mamukebe", "Mamukar", "Mamukare", "Mamukarsa", "Mamukasua", "Mamukaw", "Mamuka", "Mamuka", "Mamukayi", "Mamukebe", "Mamuka", "Mamuka", "Mamuka", "Mamuka", "Mamuka", "Mamukai", "Mamukay", "Mamuka", "Mamuka", "Mamuka"],
  "Kaduna": ["Birnin Gwari", "Chikun", "Giwa", "Igabi", "Ikara", "Jaba", "Jema'a", "Kachia", "Kaduna North", "Kaduna South", "Kagarko", "Kajuru", "Kaura", "Kauru", "Kubau", "Kudan", "Lere", "Makarfi", "Sabon Gari", "Sanga", "Soba", "Zangon Kataf", "Zaria"],
  "Kano": ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", "Gabasawa", "Garko", "Garun Malam", "Gaya", "Gezawa", "Gwale", "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru", "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir", "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila", "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo", "Warawa", "Wudil"],
  "Katsina": ["Achalonu", "Akiya", "Amalatu", "Arkiya", "Atabaji", "Bajeji", "Bakori", "Batagarawa", "Batsari", "Baure", "Bebeji", "Bichi", "Bida", "Bindawa", "Birchi", "Birnin Gwari", "Birnin Kudu", "Birnin Magaji", "Birnin Yero", "Bogoro", "Bohari", "Boisar", "Bolaji", "Boniaye", "Bossi", "Bowaye", "Buji", "Bukanji", "Bukarrama", "Bukurundum", "Bulakada", "Bulukiya", "Bungudu", "Buniyan", "Bunkure", "Bunza", "Buramburama", "Burburawa", "Bure", "Burjin", "Burkurumbai", "Burmi", "Burmichiya", "Bursali", "Burtai", "Burta", "Busawa", "Bushira", "Bussi", "Butai", "Butalbai", "Butawada", "Bute", "Butenchi", "Buteri", "Butery", "Butinja", "Butiri", "Buton", "Bututu", "Buyamba", "Buzaye"],
  "Kebbi": ["Aleiro", "Argungu", "Augie", "Bagudo", "Birnin Kebbi", "Bunza", "Dandi", "Danko/Wasagu", "Fakai", "Gwandu", "Jega", "Jogodo", "Kabo", "Katsina", "Kaura", "Koko/Baba", "Maiyama", "Makera", "Makoda", "Makundu", "Malammaji", "Mali", "Malumfashi", "Maradun", "Maradi", "Marafa", "Maraya", "Markudi", "Marmudu", "Marore", "Marraba", "Marrada", "Marule", "Masalache", "Masaude", "Masausau", "Masayi", "Masazaki", "Masgida", "Masindawa", "Maslaka", "Masma", "Masoba", "Masofa", "Massaja", "Massakala", "Massalate", "Massali", "Massan", "Massinissa", "Massinissa", "Massinissa", "Massinissa", "Massinissa", "Massinissa", "Massinissa", "Massinissa", "Massinissa", "Massinissa", "Massinissa", "Massinissa"],
  "Kogi": ["Adavi", "Ajaokuta", "Ankpa", "Bassa", "Dekina", "Dogo", "Gane", "Gaya", "Ideato", "Igalamela-Odolu", "Ikwo", "Iyambo", "Kabba/Bununu", "Kogi", "Lokoja", "Mopa-Muro", "Ofu", "Ogaminana", "Okehi", "Okene", "Olamaboro", "Olanite", "Olokemeji", "Omala", "Omuo", "Onda", "Ono", "Orishielu", "Orokoto", "Orome", "Oron", "Ososo", "Ozoro", "Ugwolawo", "Unjiba"],
  "Kwara": ["Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Isin", "Kaiama", "Kaura", "Kiaama", "Kigbe", "Kode", "Kosubosu", "Koton-Karfi", "Koya", "Koyan", "Kudan", "Kulende", "Kumpe", "Kura", "Kutagbe", "Kutambaa", "Kutagbe", "Kutagbe", "Kutagbe", "Kutagbe"],
  "Lagos": ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe", "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere"],
  "Nasarawa": ["Akwanga", "Awe", "Doma", "Guma", "Keana", "Keffi", "Kokona", "Lafia", "Nasarawa", "Nasarawa Egon", "Obi", "Toto", "Wamba"],
  "Niger": ["Agaie", "Agama", "Agwara", "Bida", "Borgu", "Bosso", "Chachaga", "Edati", "Enagi", "Gbako", "Guni", "Gurara", "Katcha", "Kasuwan Barki", "Katcha", "Kolo", "Kontagora", "Lapai", "Lavun", "Magama", "Mariga", "Mashegu", "Minna", "Mokwa", "Muya", "Paikoro", "Rafi", "Rijau", "Shiroro", "Suleja", "Tafa", "Taiga", "Tanke", "Tegina", "Tenebe", "Tundun", "Tungan Kasuwa", "Tungar Dumbi", "Tungar Kasuwa"],
  "Ogun": ["Abeokuta North", "Abeokuta South", "Ado-Odo/Ota", "Egbado North", "Egbado South", "Ewekoro", "Ijebu East", "Ijebu North", "Ijebu North East", "Ijebu Ode", "Ikenne", "Imeko Afon", "Ipokia", "Obafemi Owode", "Odeda", "Odogbolu", "Ogun Waterside", "Remo North", "Shagamu"],
  "Ondo": ["Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Akure North", "Akure South", "Almada", "Bolorunduro", "Ese-Odo", "Idanre", "Ifedore", "Ilesha East", "Ilesha West", "Ilaje", "Ilapo", "Ile-Oluji/Okeigbo", "Ilesha", "Irele", "Isua", "Itaogbolu", "Itapaji", "Itatiba", "Iwajowa", "Iwere", "Iwere", "Iwere", "Iwere", "Iwere", "Iyere", "Izere"],
  "Osun": ["Aiyedaade", "Aiyedire", "Atakumosa East", "Atakumosa West", "Boluwaduro", "Boripe", "Ede North", "Ede South", "Egbedore", "Ejigbo", "Ifelodun", "Ife Central", "Ife East", "Ife North", "Ife South", "Ifedayo", "Ifodan", "Ilesha East", "Ilesha West", "Irepodun", "Irewole", "Isokan", "Iyere", "Obokun", "Odo-Otin", "Ola-Oluwa", "Olorunda", "Oriade", "Orile-Imeko", "Osogbo", "Otoro"],
  "Oyo": ["Afijio", "Akinyele", "Atiba", "Atisbo", "Egbeda", "Ibadan North", "Ibadan North-East", "Ibadan North-West", "Ibadan South-East", "Ibadan South-West", "Ibarapa Central", "Ibarapa East", "Ibarapa North", "Ido", "Irepo", "Iseyin", "Itesiwaju", "Iwajowa", "Kajola", "Lagelu", "Ogbomosho North", "Ogbomosho South", "Ogo Oluwa", "Olorunsogo", "Oluyole", "Ona Ara", "Orelope", "Ori Ire", "Oyo East", "Oyo West", "Saki East", "Saki West", "Surulere"],
  "Plateau": ["Barikin Ladi", "Beaversh", "Bokkos", "Bukuru", "Gindiri", "Gusau", "Gyel", "Jos East", "Jos North", "Jos South", "Kanam", "Kanopolis", "Kasuwan", "Kasuwan", "Katsena-Ala", "Katsinala", "Katzina", "Kaura", "Kaure", "Kauru", "Kauru", "Kaware", "Kawaredo", "Kawari", "Kawarim", "Kawase", "Kaware", "Kawari", "Kawari", "Kawarim", "Kawarim"],
  "Rivers": ["Abua/Odual", "Ahoada East", "Ahoada West", "Akuku-Toru", "Andoni", "Asari-Toru", "Bonny", "Degema", "Eleme", "Emohua", "Etche", "Gokana", "Ikwerre", "Khana", "Obio/Akpor", "Ogba/Egbema/Ndoni", "Ogu/Bolo", "Okrika", "Omuma", "Opobo/Nkoro", "Oyigbo", "Port Harcourt", "Tai"],
  "Sokoto": ["Binji", "Bodinga", "Dange-Shinchimaka", "Gada", "Gawabawa", "Goronyo", "Gudu", "Gummi", "Gwadabawa", "Illela", "Isa", "Jega", "Kamba", "Kanem", "Kanke", "Kasuwan Magani", "Kasuwan Zaki", "Katsina", "Kauran Namoda", "Kaura", "Kauru", "Kauru", "Kauru"],
  "Taraba": ["Ardo Kola", "Bali", "Bantaje", "Barkin Ladi", "Bassa", "Biaju", "Biyala", "Donga", "Gashaka", "Gassol", "Gaya", "Giade", "Gumti", "Ibi", "Igumode", "Jabba", "Jalingo", "Karim Lamido", "Kasuwan", "Kasuwan", "Kaura", "Kauru", "Kauru"],
  "Yobe": ["Bade", "Borsari", "Bursari", "Damaturu", "Damaturu", "Damaturu", "Damaturu", "Damaturu", "Damaturu"],
  "Zamfara": ["Anka", "Bakura", "Birnin Magaji/Kasuwan", "Bunkuyum", "Chafe", "Dandume", "Dansadau", "Danzatta", "Gawa", "Gummi", "Gummi", "Gummi", "Gummi", "Gummi", "Gummi", "Gummi", "Gummi"],
  "Abuja FCT": ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"],
};

const getLgaOptions = (state) => {
  if (!state) return [];
  return LGA_OPTIONS[state] || [];
};

const ThemeToggle = ({ theme, onToggle }) => {
  const [isMobileToggle, setIsMobileToggle] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 420 : false));

  useEffect(() => {
    const onResize = () => setIsMobileToggle(window.innerWidth <= 420);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const style = {
    position: 'fixed',
    right: isMobileToggle ? 12 : 24,
    bottom: isMobileToggle ? 96 : 24,
    zIndex: 1100,
    border: '1px solid rgba(201,149,42,0.5)',
    background: theme === 'light' ? '#111827' : '#f8fafc',
    color: theme === 'light' ? '#fff' : '#0f172a',
    borderRadius: 999,
    padding: isMobileToggle ? '8px 12px' : '10px 16px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    fontSize: isMobileToggle ? 12 : 14,
  };

  return (
    <button onClick={onToggle} style={style}>
      {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
    </button>
  );
};

const FloatingHelpButton = () => {
  const [isMobileToggle, setIsMobileToggle] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 420 : false));

  useEffect(() => {
    const onResize = () => setIsMobileToggle(window.innerWidth <= 420);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const style = {
    position: 'fixed',
    right: isMobileToggle ? 12 : 24,
    bottom: isMobileToggle ? 148 : 72,
    zIndex: 1100,
    border: '1px solid rgba(201,149,42,0.65)',
    background: '#c9952a',
    color: '#000',
    borderRadius: 999,
    padding: isMobileToggle ? '8px 12px' : '10px 16px',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
    fontSize: isMobileToggle ? 12 : 14,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    animation: 'helpFloat 2.8s ease-in-out infinite, helpPulse 2.8s ease-in-out infinite',
  };

  return (
    <a href="tel:07066304322" aria-label="Call portal support" style={style}>
      <span aria-hidden="true">📞</span>
      Help
    </a>
  );
};

const InstallPromptWidget = ({ visible, onInstall, onDismiss, enabled }) => {
  const [isMobileToggle, setIsMobileToggle] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 420 : false));

  useEffect(() => {
    const onResize = () => setIsMobileToggle(window.innerWidth <= 420);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!enabled) return null;

  const buttonStyle = {
    position: 'fixed',
    right: isMobileToggle ? 12 : 24,
    bottom: isMobileToggle ? 206 : 124,
    zIndex: 1100,
    border: '1px solid rgba(201,149,42,0.7)',
    background: '#111827',
    color: '#fbbf24',
    borderRadius: '50%',
    width: isMobileToggle ? 38 : 44,
    height: isMobileToggle ? 38 : 44,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobileToggle ? 18 : 20,
  };

  const toastStyle = {
    position: 'fixed',
    right: isMobileToggle ? 12 : 24,
    bottom: isMobileToggle ? 258 : 180,
    zIndex: 1100,
    background: '#0f172a',
    color: '#f8fafc',
    border: '1px solid rgba(201,149,42,0.6)',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    width: isMobileToggle ? 220 : 260,
    boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
  };

  return (
    <>
      {visible && (
        <div style={toastStyle}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Install the app</div>
          <div style={{ color: 'rgba(248,250,252,0.8)', fontSize: 12, marginBottom: 8 }}>Add Civil Elite Service to your home screen for quick access.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onDismiss} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>Later</button>
            <button onClick={onInstall} style={{ background: '#c9952a', border: 'none', color: '#111827', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer', fontSize: 12 }}>Install</button>
          </div>
        </div>
      )}
      <button onClick={onInstall} aria-label="Install app" style={buttonStyle}>
        ⬇
      </button>
    </>
  );
};

const VerificationPage = ({ applicantId, onNavigate, theme = "light" }) => {
  const t = getTheme(theme);
  const isLight = theme === "light";
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadVerification = async () => {
      if (!applicantId) {
        setError("Missing applicant ID in verification link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await publicAPI.getVerification(applicantId);
        if (!active) return;
        setRecord(data);
      } catch (err) {
        if (!active) return;
        setRecord(null);
        setError(err.message || "Unable to verify applicant.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadVerification();

    return () => {
      active = false;
    };
  }, [applicantId]);

  const cardStyle = {
    maxWidth: 980,
    margin: "0 auto",
    padding: "24px 18px 60px",
  };

  const panelStyle = {
    borderRadius: 24,
    border: `1px solid ${t.border}`,
    background: isLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.04)",
    boxShadow: isLight ? "0 24px 60px rgba(15,23,42,0.08)" : "0 24px 60px rgba(0,0,0,0.28)",
    padding: 28,
  };

  const field = (label, value) => (
    <div style={{ padding: "14px 0", borderBottom: `1px solid ${t.border}` }}>
      <div style={{ color: t.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ color: t.text, fontWeight: 700, fontSize: 15 }}>{value || "Not provided"}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: isLight ? "linear-gradient(180deg,#eef4fb 0%,#f7f9fc 100%)" : "linear-gradient(180deg,#090d18 0%,#060a12 100%)", color: t.text }}>
      <div style={{ ...cardStyle, paddingTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#c9952a", fontWeight: 800, letterSpacing: 1, fontSize: 12, textTransform: "uppercase" }}>Civil Elite Service</div>
            <h1 style={{ margin: "8px 0 0", fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.1, color: t.text, fontWeight: 900 }}>Applicant Verification</h1>
          </div>
          <GoldBtn outline onClick={() => onNavigate("home")} style={{ padding: "10px 16px" }}>Back to Home</GoldBtn>
        </div>

        <div style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
            <div>
              <div style={{ color: t.muted, fontSize: 13, marginBottom: 6 }}>Verification link</div>
              <div style={{ color: t.text, fontWeight: 800, fontSize: 18 }}>{applicantId || "Not available"}</div>
            </div>
            {record?.status ? <StatusBadge s={record.status} /> : null}
          </div>

          {loading && <div style={{ color: t.muted, fontSize: 15 }}>Loading applicant record...</div>}

          {!loading && error && (
            <div style={{ color: "#e57373", fontWeight: 700, background: "rgba(244,67,54,0.08)", border: "1px solid rgba(244,67,54,0.2)", borderRadius: 14, padding: 16 }}>
              {error}
            </div>
          )}

          {!loading && record && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18 }}>
              <div>
                {field("Full Name", record.fullName)}
                {field("Applicant ID", record.applicantId)}
                {field("Blood Group", record.bloodGroup)}
                {field("Genotype", record.genotype)}
              </div>
              <div>
                {field("Service Status", record.serviceStatus)}
                {field("Application Status", record.status)}
                {field("Assigned Rank", record.paramilitaryRank)}
                {field("Assigned Post", record.paramilitaryPost)}
              </div>
              <div>
                {field("Phone", record.phone)}
                {field("Email", record.email)}
                {field("Submitted At", record.submittedAt ? new Date(record.submittedAt).toLocaleString() : "Not provided")}
                {field("Last Updated", record.updatedAt ? new Date(record.updatedAt).toLocaleString() : "Not provided")}
              </div>
            </div>
          )}

          {!loading && !error && !record && (
            <div style={{ color: t.muted, fontSize: 15 }}>No verification record available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ onNavigate, theme = "light" }) => {
  const isLight = theme === "light";
  const [navScrolled, setNavScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 768 : false));
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 1024 : false));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [announcementsPublic, setAnnouncementsPublic] = useState([]);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsNarrow(window.innerWidth <= 1024);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentSlide(s => (s + 1) % 3), 5000);
    return () => clearInterval(interval);
  }, []);

  const loadPublicAnnouncements = async () => {
    try {
      const data = await publicAPI.getAnnouncements();
      setAnnouncementsPublic(data || []);
    } catch (err) {
      setAnnouncementsPublic([]);
    }
  };

  useEffect(() => {
    loadPublicAnnouncements();
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const navLinks = [
    ["About", "about"],
    ["Divisions", "divisions"],
    ["Process", "process"],
    ["Requirements", "requirements"],
    ["FAQ", "faq"],
     ["Press Releases", "press"],
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
    { src: "elite.jpg", caption: "Command Presence" },
    { src: "20250830_172445.jpg", caption: "Field Readiness" },
    { src: "20250831_083759.jpg", caption: "Drill Formation", position: "center 70%" },
    { src: "20250831_083836.jpg", caption: "Unit Coordination", position: "center 75%" },
    { src: "IMG-20260508-WA0011.jpg", caption: "Discipline in Action" },
    { src: "IMG-20260508-WA0012.jpg", caption: "Team Cohesion" },
    { src: "IMG-20260508-WA0013.jpg", caption: "Operational Focus" },
    { src: "IMG-20260508-WA0014.jpg", caption: "Leadership & Service" },
    { src: "IMG-20260508-WA0015.jpg", caption: "Training Grounds" },
    { src: "IMG-20260508-WA0016.jpg", caption: "Prepared to Serve" },
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

  const [faqOpen, setFaqOpen] = useState(-1);
  const pageColors = isLight ? { text: "#0f172a", muted: "#526173", page: "#f8fafc", nav: "#ffffff", border: "rgba(15,23,42,0.1)" } : { text: "#f8fbff", muted: "#b7c2d0", page: "#060a12", nav: "rgba(6,10,18,0.95)", border: "rgba(255,255,255,0.07)" };
  const t = pageColors;

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: t.page, color: t.text, fontFamily: "'Barlow', 'Segoe UI', sans-serif", overflowX: "hidden" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { max-width: 100%; overflow-x: hidden; }
        @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes helpFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes helpPulse { 0%, 100% { box-shadow: 0 10px 24px rgba(0,0,0,0.22); } 50% { box-shadow: 0 14px 30px rgba(0,0,0,0.28); } }
        ::selection { background: rgba(201,149,42,0.24); }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,149,42,0.5); border-radius: 999px; }
      `}</style>

      {/* STICKY HEADER */}
      <header style={{ background: navScrolled ? t.nav : "#fff", backdropFilter: navScrolled ? "blur(18px)" : "none", borderBottom: navScrolled ? `1px solid ${t.border}` : "none", position: "fixed", top: 0, left: 0, right: 0, width: "100%", zIndex: 1000, transition: "all .25s ease", boxShadow: navScrolled ? "0 2px 12px rgba(0,0,0,.08)" : "none" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 78 }}>
          <button onClick={() => scrollTo("hero")} style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", color: "#004d26", fontWeight: 900, fontSize: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <img src="/logo.png" alt="CES" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
            <div style={{ textAlign: "left", lineHeight: 1.2 }}>CIVIL ELITE<br /><span style={{ fontSize: 10, color: "#c9952a", fontWeight: 700 }}>SERVICE PORTAL</span></div>
          </button>
          {/* Desktop nav or mobile hamburger */}
          {!isMobile ? (
            <nav style={{ display: "flex", alignItems: "center", gap: 24, justifyContent: "center", flex: 1 }}>
              {[["About", "about"], ["Divisions", "divisions"], ["Process", "process"], ["Apply", "apply"]].map(([label, id]) => (
                <button key={id} onClick={() => { scrollTo(id); }} style={{ background: "none", border: "none", color: "#004d26", fontWeight: 600, cursor: "pointer", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, transition: "color .2s" }} onMouseEnter={e => e.currentTarget.style.color = "#c9952a"} onMouseLeave={e => e.currentTarget.style.color = "#004d26"}>{label}</button>
              ))}
            </nav>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button aria-label="menu" onClick={() => setMobileMenuOpen(v => !v)} style={{ background: "none", border: "1px solid rgba(0,0,0,0.06)", padding: 8, borderRadius: 6, cursor: "pointer" }}>
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="2" rx="1" fill="#004d26"/><rect y="6" width="20" height="2" rx="1" fill="#004d26"/><rect y="12" width="20" height="2" rx="1" fill="#004d26"/></svg>
              </button>
            </div>
          )}
          <button onClick={() => onNavigate("register")} style={{ background: "#c9952a", color: "#000", border: "none", borderRadius: 2, padding: "11px 24px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, fontSize: 12.5, cursor: "pointer", transition: "all .25s", boxShadow: "0 6px 18px rgba(200,168,75,.4)" }} onMouseEnter={e => { e.currentTarget.style.background = "#e0c06a"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#c9952a"; e.currentTarget.style.transform = "translateY(0)"; }}>Apply Now</button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {isMobile && mobileMenuOpen && (
        <div style={{ position: "fixed", top: 78, left: 0, right: 0, background: "#fff", zIndex: 9999, boxShadow: "0 10px 30px rgba(0,0,0,.12)", borderBottom: "4px solid #c9952a" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            {[["About", "about"], ["Divisions", "divisions"], ["Process", "process"], ["Apply", "apply"]].map(([label, id]) => (
              <button key={id} onClick={() => { scrollTo(id); setMobileMenuOpen(false); }} style={{ textAlign: "left", padding: "12px 10px", border: "none", background: "none", fontSize: 16, fontWeight: 700, color: "#004d26", cursor: "pointer" }}>{label}</button>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => { onNavigate("register"); setMobileMenuOpen(false); }} style={{ flex: 1, padding: "10px 12px", background: "#c9952a", color: "#000", border: "none", borderRadius: 4, fontWeight: 800 }}>Apply Now</button>
            </div>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section id="hero" style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "linear-gradient(105deg, rgba(0,35,12,.95) 35%, rgba(0,60,25,.7) 100%), linear-gradient(180deg, #004d26 0%, #003d1f 100%)", display: "flex", alignItems: "center", padding: isMobile ? "95px 24px 36px" : isNarrow ? "164px 32px" : "168px 40px" }}>
        <div style={{ position: "absolute", inset: 0, background: "url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 800%22><defs><pattern id=%22grid%22 width=%2240%22 height=%2240%22 patternUnits=%22userSpaceOnUse%22><path d=%22M 40 0 L 0 0 0 40%22 fill=%22none%22 stroke=%22rgba(200,168,75,0.03)%22 stroke-width=%221%22/></pattern></defs><rect width=%221200%22 height=%22800%22 fill=%22url(%23grid)%22/></svg>')", opacity: 0.4, pointerEvents: "none" }} />

        <div style={{ maxWidth: 1120, margin: "0 auto", width: "100%", position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: isNarrow ? "1fr" : "minmax(0, 620px) minmax(260px, 380px)", gap: isNarrow ? 22 : 22, alignItems: "center", justifyContent: "center", justifyItems: isNarrow ? "center" : "start" }}>
          <div style={{ textAlign: isNarrow ? "center" : "left" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#c9952a", color: "#000", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, padding: "5px 16px", marginBottom: 18, clipPath: "polygon(0 0,calc(100% - 8px) 0,100% 50%,calc(100% - 8px) 100%,0 100%)" }}>⭐ Official Portal</div>

            <h1 style={{ fontSize: "clamp(28px, 4vw, 50px)", lineHeight: 1.1, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, color: "#fff", fontWeight: 900, maxWidth: 560 }}>Defend the Nation.<br /><span style={{ color: "#c9952a" }}>Build Your Career</span> in Service.</h1>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              maxWidth: isMobile ? 420 : 560,
              padding: isMobile ? "0" : "6px 12px",
              marginBottom: 14,
              marginTop: 8,
              color: isMobile ? "rgba(255,255,255,.78)" : "#d8b04b",
              background: isMobile ? "transparent" : "rgba(201,149,42,0.08)",
              border: isMobile ? "none" : "1px solid rgba(201,149,42,0.18)",
              borderRadius: 999,
              fontWeight: 700,
              textTransform: "none",
              letterSpacing: isMobile ? 0 : 0.4,
              fontSize: isMobile ? 11.5 : 12,
              lineHeight: 1.5,
              textAlign: "center"
            }}>
              <span>Together we can protect ourselves.</span>
              <span style={{ display: "block", fontWeight: 900, color: isMobile ? "#fff" : "#c9952a" }}>Motto: Always @ Alert</span>
            </div>

            <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.8)", maxWidth: 500, lineHeight: 1.75, marginBottom: 26 }}>A modern, transparent recruitment experience for applicants seeking structured national service. Apply online, track your progress, and secure a role in Civil Elite Service.</p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flexDirection: isMobile ? 'column' : 'row', justifyContent: isNarrow ? "center" : "flex-start" }}>
              <button onClick={() => onNavigate("register")} style={{ display: "inline-flex", width: isMobile ? '100%' : 'auto', justifyContent: 'center', alignItems: "center", gap: 7, padding: "11px 24px", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderRadius: 2, background: "#c9952a", color: "#000", border: "none", cursor: "pointer", transition: "all .25s", boxShadow: "0 6px 18px rgba(200,168,75,.4)" }} onMouseEnter={e => { e.currentTarget.style.background = "#e0c06a"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#c9952a"; e.currentTarget.style.transform = "translateY(0)"; }}>Start Application ➜</button>
              <button onClick={() => scrollTo("divisions")} style={{ display: "inline-flex", width: isMobile ? '100%' : 'auto', justifyContent: 'center', alignItems: "center", gap: 7, padding: "11px 24px", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderRadius: 2, border: "2px solid rgba(255,255,255,.45)", color: "#fff", background: "transparent", cursor: "pointer", transition: "all .25s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9952a"; e.currentTarget.style.color = "#c9952a"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.45)"; e.currentTarget.style.color = "#fff"; }}>Explore Divisions</button>
            </div>

            <div style={{ display: "flex", gap: 28, marginTop: 28, flexWrap: "wrap", justifyContent: isNarrow ? "center" : "flex-start" }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.7)" }}>
                <strong style={{ display: "block", fontFamily: "'Oswald', sans-serif", fontSize: 20, color: "#c9952a" }}>12.4K+</strong>
                Applications Processed
              </div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.7)" }}>
                <strong style={{ display: "block", fontFamily: "'Oswald', sans-serif", fontSize: 20, color: "#c9952a" }}>36</strong>
                States Covered
              </div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "rgba(255,255,255,.7)" }}>
                <strong style={{ display: "block", fontFamily: "'Oswald', sans-serif", fontSize: 20, color: "#c9952a" }}>2015</strong>
                Established in 2015
              </div>
            </div>
          </div>

          <div style={{ display: isMobile ? "none" : "block", justifySelf: "center", alignSelf: "center" }}>
            <img src="/logo.png" alt="Hero" style={{ width: 'clamp(220px, 22vw, 380px)', maxWidth: '100%', maxHeight: 420, objectFit: "contain", display: "block", borderRadius: 6 }} />
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
          {[0, 1, 2].map(i => (
            <button key={i} onClick={() => setCurrentSlide(i)} style={{ width: i === currentSlide ? 24 : 8, height: 8, borderRadius: 4, background: i === currentSlide ? "#c9952a" : "rgba(255,255,255,.35)", cursor: "pointer", border: "none", transition: "all .3s" }} />
          ))}
        </div>
      </section>

      {/* PRESS / PRESS RELEASES SECTION */}
      <section id="press" style={{ background: isLight ? "#fff" : "#07110b", padding: isMobile ? "42px 24px" : "56px 40px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto 22px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2.2, color: "#c9952a", marginBottom: 8 }}>Press</div>
            <h2 style={{ fontSize: "clamp(20px, 2.6vw, 28px)", color: isLight ? "#0f172a" : "#e8d8a0", textTransform: "uppercase", lineHeight: 1.2, marginBottom: 10, fontWeight: 900 }}>Press Releases</h2>
            <p style={{ fontSize: 14, color: isLight ? "#53606a" : "#b7c2d0", lineHeight: 1.6 }}>Official announcements and notices from Civil Elite Service.</p>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {announcementsPublic.length === 0 && (
              <div style={{ color: isLight ? "#64748b" : "#8f9fb0", fontSize: 13, textAlign: "center" }}>No press releases available.</div>
            )}
            {announcementsPublic.map((a) => (
              <div key={a.id} style={{ background: isLight ? "#fff" : "rgba(255,255,255,0.03)", padding: 18, borderRadius: 8, border: isLight ? "1px solid rgba(15,23,42,0.04)" : "1px solid rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, color: isLight ? "#0f172a" : "#e8d8a0" }}>{a.title}</div>
                  <div style={{ color: isLight ? "#65748b" : "#9aa7b8", fontSize: 12 }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}</div>
                </div>
                <div style={{ color: isLight ? "#475569" : "#c7d2da", fontSize: 14 }}>{a.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY SECTION */}
      <section id="gallery" style={{ background: isLight ? "#f3f5ef" : "#0c1510", padding: isMobile ? "64px 24px" : "72px 40px", borderTop: "4px solid #c9952a" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2.2, color: "#c9952a", marginBottom: 8 }}>In Action</div>
            <h2 style={{ fontSize: "clamp(26px, 3.4vw, 38px)", color: "#004d26", textTransform: "uppercase", lineHeight: 1.2, marginBottom: 10, fontWeight: 900 }}>Training & Service Moments</h2>
            <p style={{ fontSize: 14.5, color: "#586168", lineHeight: 1.7 }}>A glimpse into the discipline, teamwork, and professionalism at the heart of Civil Elite Service.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {gallery.map((item, idx) => (
              <div key={item.src} style={{ position: "relative", overflow: "hidden", borderRadius: 10, background: "#0d1f14", boxShadow: "0 12px 26px rgba(0,0,0,0.14)" }}>
                <img
                  src={`/images/${item.src}`}
                  alt={`gallery-${idx + 1}`}
                  loading="lazy"
                  style={{ width: "100%", height: isMobile ? 260 : 200, objectFit: "cover", objectPosition: item.position || (isMobile ? "top center" : "center"), display: "block", transition: "transform .35s ease" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, color: "#fff", fontSize: 12.5, letterSpacing: 0.6, fontWeight: 700, textTransform: "uppercase", textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>{item.caption}</div>
                <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(255,255,255,0.08)", pointerEvents: "none" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIVISIONS SECTION */}
      <section id="divisions" style={{ background: "#f5f5f0", padding: isMobile ? "72px 24px" : "72px 60px", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #004d26, #c9952a, #004d26)" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 44px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2.5, color: "#c9952a", marginBottom: 8 }}>Our Structure</div>
            <h2 style={{ fontSize: 34, color: "#004d26", textTransform: "uppercase", lineHeight: 1.15, marginBottom: 12, fontWeight: 900 }}>Divisions with Clear Purpose</h2>
            <p style={{ fontSize: 14.5, color: "#666", lineHeight: 1.7 }}>Civil Elite Service comprises specialized operational units, each with distinct mandates aligned to national defense and civil protection.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 24 }}>
            {[["Operations", "🧭", "Field coordination, incident response, and national deployment support."], ["Intelligence", "🔎", "Information gathering, threat analysis, and situational awareness."], ["Training", "📘", "Recruits are molded through structured drills, ethics, and leadership."]].map(([name, icon, desc], idx) => (
              <div key={name} style={{ background: "#fff", padding: 30, borderTop: "4px solid #004d26", borderRadius: 2, transition: "all .3s", position: "relative", overflow: "hidden" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,.1)"; }} onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 0"; }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "0%", height: 3, background: "#c9952a", transition: "width .4s", pointerEvents: "none" }} className="mandate-bottom" />
                <div style={{ width: 52, height: 52, background: "#004d26", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 24 }}>{icon}</div>
                <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 17, color: "#004d26", textTransform: "uppercase", marginBottom: 10, lineHeight: 1.3, fontWeight: 900 }}>{name}</h3>
                <p style={{ fontSize: 13.5, color: "#555", lineHeight: 1.75, marginBottom: 18 }}>{desc}</p>
                <a href="#apply" onClick={() => scrollTo("apply")} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#004d26", cursor: "pointer", transition: "gap .2s, color .2s" }} onMouseEnter={e => { e.currentTarget.style.gap = "10px"; e.currentTarget.style.color = "#c9952a"; }} onMouseLeave={e => { e.currentTarget.style.gap = "5px"; e.currentTarget.style.color = "#004d26"; }}>Learn More ➜</a>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 34 }}>
            <button onClick={() => scrollTo("process")} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 24px", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderRadius: 2, border: "2px solid #004d26", color: "#004d26", background: "transparent", cursor: "pointer", transition: "all .25s" }} onMouseEnter={e => { e.currentTarget.style.background = "#004d26"; e.currentTarget.style.color = "#fff"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#004d26"; }}>View Application Process</button>
          </div>
        </div>
      </section>

      {/* MISSION SECTION */}
      <section style={{ background: "#004d26", padding: isMobile ? "72px 24px" : "72px 60px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(-45deg, transparent, transparent 28px, rgba(255,255,255,.02) 28px, rgba(255,255,255,.02) 56px)" }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 40 }}>
          <div style={{ padding: 34, border: "1px solid rgba(255,255,255,.11)", borderTop: "4px solid #c9952a", background: "rgba(255,255,255,.04)" }}>
            <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: "#c9952a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, fontWeight: 900 }}>Our Vision</h3>
            <p style={{ color: "rgba(255,255,255,.78)", fontSize: 14.5, lineHeight: 1.85 }}>To establish a transparent, merit-based recruitment system where every applicant receives fair consideration and clear communication throughout the selection process.</p>
          </div>

          <div style={{ padding: 34, border: "1px solid rgba(255,255,255,.11)", borderTop: "4px solid #c9952a", background: "rgba(255,255,255,.04)" }}>
            <h3 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: "#c9952a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, fontWeight: 900 }}>Our Mission</h3>
            <p style={{ color: "rgba(255,255,255,.78)", fontSize: 14.5, lineHeight: 1.85 }}>To recruit, train, and deploy disciplined personnel committed to national security and civic protection. We uphold the highest standards of integrity and professionalism.</p>
          </div>
        </div>
      </section>

      {/* PROCESS SECTION */}
      <section id="process" style={{ padding: isMobile ? "72px 24px" : "72px 60px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto 44px" }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2.5, color: "#c9952a", marginBottom: 8 }}>How It Works</div>
            <h2 style={{ fontSize: 34, color: "#004d26", textTransform: "uppercase", lineHeight: 1.15, marginBottom: 12, fontWeight: 900 }}>Four Steps to Your Career</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 16 }}>
            {[["01", "Register", "Create your applicant profile and verify your contact details."], ["02", "Screening", "Submit documents and complete the eligibility review."], ["03", "Assessment", "Attend aptitude, physical, and medical examinations."], ["04", "Placement", "Successful candidates move into training and deployment."]].map(([step, title, text]) => (
              <div key={step} style={{ textAlign: "center", padding: isMobile ? 18 : 26, border: "1px solid rgba(255,255,255,.1)", background: isLight ? "#f8fafc" : "rgba(255,255,255,.04)", transition: "all .3s" }} onMouseEnter={e => { e.currentTarget.style.background = "#c9952a"; e.currentTarget.style.color = "#000"; }} onMouseLeave={e => { e.currentTarget.style.background = isLight ? "#f8fafc" : "rgba(255,255,255,.04)"; e.currentTarget.style.color = t.text; }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, color: "#c9952a", fontWeight: 900, marginBottom: 12 }}>{step}</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 17, color: "#004d26", textTransform: "uppercase", marginBottom: 10, fontWeight: 900 }}>{title}</div>
                <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPLY CTA */}
      <section id="apply" style={{ background: `linear-gradient(135deg, ${isLight ? "#f5f5f0" : "#1a2a3a"} 0%, ${isLight ? "#e5ede5" : "#1a2a1a"} 100%)`, padding: isMobile ? "60px 24px" : "60px 60px", borderTop: "4px solid #004d26" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", alignItems: "center", gap: 40 }}>
          <div>
            <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 26, color: "#004d26", textTransform: "uppercase", marginBottom: 8, fontWeight: 900 }}>Ready to Serve?</h2>
            <p style={{ fontSize: 14.5, color: "#555", maxWidth: 540, lineHeight: 1.7 }}>Apply now through our streamlined recruitment portal. Track your progress in real-time and stay updated every step of the way.</p>
          </div>
          <button onClick={() => onNavigate("register")} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 24px", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderRadius: 2, background: "#c9952a", color: "#000", border: "none", cursor: "pointer", transition: "all .25s", boxShadow: "0 6px 18px rgba(200,168,75,.4)", whiteSpace: "nowrap" }} onMouseEnter={e => { e.currentTarget.style.background = "#e0c06a"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#c9952a"; e.currentTarget.style.transform = "translateY(0)"; }}>Begin Application ➜</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#07150a", color: "rgba(255,255,255,.72)", padding: isMobile ? "56px 24px 0" : "56px 60px 0", borderTop: "4px solid #c9952a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "minmax(260px, 1.45fr) repeat(3, minmax(0, 1fr))", gap: isMobile ? 18 : "24px 40px", marginBottom: 40, alignItems: "start", justifyItems: "start" }}>
          <div style={{ maxWidth: 320, gridColumn: isMobile ? "1 / -1" : "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <img src="/logo.png" alt="Logo" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 11 : 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, color: "#fff" }}>CIVIL ELITE<br /><span style={{ fontSize: isMobile ? 8 : 10, color: "#c9952a" }}>SERVICE</span></div>
            </div>
            <p style={{ fontSize: isMobile ? 11 : 13, lineHeight: 1.6, color: "rgba(255,255,255,.55)", marginTop: 8 }}>Together we can protect ourselves. Motto: Always @ Alert</p>
          </div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 11 : 13, textTransform: "uppercase", letterSpacing: 1.5, color: "#c9952a", marginBottom: isMobile ? 8 : 14, fontWeight: 900 }}>Quick Links</h4>
            {[["Home", "hero"], ["About", "about"], ["Process", "process"], ["Apply", "apply"]].map(([label, id]) => (
              <div key={id} style={{ marginBottom: isMobile ? 4 : 7 }}>
                <a href="#" onClick={e => { e.preventDefault(); scrollTo(id); }} style={{ fontSize: isMobile ? 11 : 12.5, color: "rgba(255,255,255,.58)", transition: "color .2s", cursor: "pointer", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.color = "#c9952a"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.58)"}>{label}</a>
              </div>
            ))}
          </div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 11 : 13, textTransform: "uppercase", letterSpacing: 1.5, color: "#c9952a", marginBottom: isMobile ? 8 : 14, fontWeight: 900 }}>Support</h4>
            <div style={{ fontSize: isMobile ? 10 : 12.5, color: "rgba(255,255,255,.62)", lineHeight: 1.5 }}>civileliteservice@gmail.com<br />Portal Support:<br />Use the Help button (24/7) or call 07066304322</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h4 style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 11 : 13, textTransform: "uppercase", letterSpacing: 1.5, color: "#c9952a", marginBottom: isMobile ? 8 : 14, fontWeight: 900 }}>Follow Us</h4>
            <div style={{ display: "flex", gap: isMobile ? 6 : 8, marginTop: isMobile ? 4 : 6, alignItems: "center" }}>
              {[{ Icon: FaFacebook, url: "https://www.facebook.com/profile.php?id=100067616334695" }, { Icon: FaInstagram, url: "https://www.instagram.com/civileliteservice?igsh=MXNra3g3enhjbWZ3Yw==" }, { Icon: FaTiktok, url: "https://vm.tiktok.com/ZS9F3dEAjwbdg-UR6EN/" }, { Icon: FaWhatsapp, url: "https://chat.whatsapp.com/Hrr2tVkOEfQ2W5DZ4KG1YD?mode=gi_t" }].map(({ Icon, url }, idx) => (
                <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, border: "1px solid rgba(255,255,255,.18)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", cursor: "pointer", color: "rgba(255,255,255,.72)" }} onMouseEnter={e => { e.currentTarget.style.background = "#c9952a"; e.currentTarget.style.borderColor = "#c9952a"; e.currentTarget.style.color = "#000"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,.18)"; e.currentTarget.style.color = "rgba(255,255,255,.72)"; }}><Icon size={isMobile ? 14 : 16} /></a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "rgba(255,255,255,.35)", flexWrap: "wrap", gap: 8 }}>
          <span>© {new Date().getFullYear()} Civil Elite Service</span>
          <span>Together we can protect ourselves. Motto: Always @ Alert</span>
        </div>
      </footer>
    </div>
  );
};

// ── AUTH PAGE ─────────────────────────────────────────────────────────────────
const AuthPage = ({ mode, onAuth, onNavigate, theme = "light", loading = false }) => {
  const t = getTheme(theme);
  const isLight = theme === "light";
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    confirm: "",
    phone: "",
    identifier: "",
    legacyServiceNumber: "",
  });
  const [registrationRole, setRegistrationRole] = useState("applicant");
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotApplicantId, setForgotApplicantId] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirm, setForgotConfirm] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const isLogin = mode === "login";
  const isLegacyClaim = !isLogin && registrationRole === "legacy";

  useEffect(() => {
    if (mode === "register") {
      setRegistrationRole("applicant");
    }
  }, [mode]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError("");
    if (isLogin) {
      if (!form.identifier || !form.password) { setError("Please fill all required fields."); return; }
    } else {
      if (!form.email || !form.password) { setError("Please fill all required fields."); return; }
      if (!form.phone) { setError("Phone number is required."); return; }
    }
    if (!isLogin && form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (!isLogin && !form.name) { setError("Full name is required."); return; }
    setLocalLoading(true);
    try {
      if (isLogin) {
        // allow signing in with either email or phone in a single field
        let email = "";
        let phone = "";
        if ((form.identifier || "").includes("@")) {
          email = form.identifier;
        } else {
          phone = form.identifier;
        }
        const result = await authAPI.login(email, form.password, phone);
        onAuth(result);
      } else {
        if (isLegacyClaim) {
          const result = await authAPI.submitLegacyClaim({
            name: form.name,
            email: form.email,
            password: form.password,
            phone: form.phone,
            legacyServiceNumber: form.legacyServiceNumber,
          });
          if (result.token && result.user) {
            tokenManager.setToken(result.token);
            await onAuth(result);
            return;
          }
          setError(result.message || "Claim submitted. You can now complete the legacy update form.");
          setLocalLoading(false);
          return;
        }

        const roleToRegister = registrationRole;
        const result = await authAPI.register(form.email, form.password, form.name, roleToRegister, form.phone);
        if (result.token && result.user) {
          tokenManager.setToken(result.token);
          onAuth(result);
          return;
        }

        if (roleToRegister === "legacy") {
          setError(result.message || "Claim submitted. Await admin approval before login.");
        } else {
          setError(result.message || "Applicant registration submitted. Await approval from an existing admin.");
        }
        setLocalLoading(false);
        return;
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
      setLocalLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: isLight ? "linear-gradient(180deg, #f7f9fc 0%, #eef3f7 100%)" : "#0a0e1a", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "'Segoe UI',sans-serif", padding: 24, position: "relative",
    }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", right: "10%", width: 350, height: 350, background: isLight ? "radial-gradient(circle,rgba(201,149,42,0.12) 0%,transparent 70%)" : "radial-gradient(circle,rgba(201,168,76,0.07) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "10%", width: 300, height: 300, background: isLight ? "radial-gradient(circle,rgba(15,118,110,0.08) 0%,transparent 70%)" : "radial-gradient(circle,rgba(13,83,150,0.1) 0%,transparent 70%)" }} />
      </div>
      <div style={{
        background: isLight ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.03)", border: `1px solid ${isLight ? "rgba(15,23,42,0.08)" : "rgba(201,168,76,0.2)"}`,
        borderRadius: 20, padding: "44px 40px", width: "100%", maxWidth: 440, zIndex: 1,
        backdropFilter: "blur(20px)", boxShadow: isLight ? "0 24px 70px rgba(15,23,42,0.08)" : "none",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="panel-logo" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: 1, color: t.text }}>CIVIL <span style={{ color: "#c9952a" }}>ELITE</span> SERVICE</div>
          <div style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>SECURE RECRUITMENT PORTAL</div>
        </div>

        <h2 style={{ color: t.text, fontWeight: 800, fontSize: 22, marginBottom: 24, textAlign: "center" }}>
          {isLogin ? "Sign In to Portal" : isLegacyClaim ? "Submit Existing Officer Claim" : "Create Applicant Account"}
        </h2>

        {!isLogin && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => setRegistrationRole("applicant")}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${registrationRole === "applicant" ? "#c9952a" : isLight ? "rgba(15,23,42,0.14)" : "rgba(255,255,255,0.08)"}`,
                background: registrationRole === "applicant" ? "rgba(201,149,42,0.12)" : "transparent",
                color: t.text,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Register as Applicant
            </button>
            <button
              type="button"
              onClick={() => setRegistrationRole("legacy")}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${registrationRole === "legacy" ? "#c9952a" : isLight ? "rgba(15,23,42,0.14)" : "rgba(255,255,255,0.08)"}`,
                background: registrationRole === "legacy" ? "rgba(201,149,42,0.12)" : "transparent",
                color: t.text,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Existing Claim
            </button>
          </div>
        )}

        {!isLogin && <Input light={isLight} label="Full Name" value={form.name} onChange={set("name")} placeholder="John Adebayo" required />}
        {isLogin ? (
          <Input light={isLight} label="Email or Phone" value={form.identifier} onChange={set("identifier")} placeholder="you@example.com or 08012345678" required />
        ) : (
          <>
            <Input light={isLight} label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
            <Input light={isLight} label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="08012345678" required />
          </>
        )}
        {!isLogin && isLegacyClaim && <Input light={isLight} label="Service Number (optional)" value={form.legacyServiceNumber} onChange={set("legacyServiceNumber")} placeholder="Old officer or service number" />}
        <PasswordInput light={isLight} label="Password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
        {!isLogin && <PasswordInput light={isLight} label="Confirm Password" value={form.confirm} onChange={set("confirm")} placeholder="••••••••" required />}

        {isLogin && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            {!showForgot ? (
              <div>
                <button onClick={() => { setShowForgot(true); setForgotMsg(""); setForgotEmail(""); setForgotApplicantId(""); setForgotPhone(""); setForgotNewPassword(""); setForgotConfirm(""); }} style={{ background: "none", border: "none", color: "#c9952a", cursor: "pointer", fontWeight: 700 }}>Forgot password?</button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="Account email" style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${isLight ? '#e6e6e6' : 'rgba(255,255,255,0.12)'}` }} />
                <input value={forgotApplicantId} onChange={e => setForgotApplicantId(e.target.value)} placeholder="Applicant ID" style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${isLight ? '#e6e6e6' : 'rgba(255,255,255,0.12)'}` }} />
                <input required value={forgotPhone} onChange={e => setForgotPhone(e.target.value)} placeholder="Phone number" style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${isLight ? '#e6e6e6' : 'rgba(255,255,255,0.12)'}` }} />
                <PasswordInput light={isLight} value={forgotNewPassword} onChange={e => setForgotNewPassword(e.target.value)} placeholder="New password" />
                <PasswordInput light={isLight} value={forgotConfirm} onChange={e => setForgotConfirm(e.target.value)} placeholder="Confirm new password" />
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button onClick={async () => {
                    setForgotMsg("");
                    try {
                      if (!forgotEmail || !forgotNewPassword) throw new Error("Email and new password are required");
                      if (!forgotApplicantId || !forgotPhone) throw new Error("Enter both Applicant ID and phone number for verification");
                      if (forgotNewPassword !== forgotConfirm) throw new Error("Passwords do not match");
                      await authAPI.forgotPassword(forgotEmail, forgotApplicantId, forgotPhone, forgotNewPassword);
                      setForgotMsg("Password updated successfully. You can sign in now.");
                      setShowForgot(false);
                      setForm(f => ({ ...f, email: forgotEmail, password: "" }));
                    } catch (err) {
                      setForgotMsg(err.message || "Unable to reset password");
                    }
                  }} style={{ background: "#0f766e", border: "none", color: "#fff", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }}>Reset password</button>
                  <button onClick={() => { setShowForgot(false); setForgotMsg(""); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", color: t.muted, padding: "8px 12px", borderRadius: 6, cursor: "pointer" }}>Cancel</button>
                </div>
                {forgotMsg && <div style={{ fontSize: 13, color: isLight ? "#0f172a" : "#fef3c7", textAlign: "center", fontWeight: 600, marginTop: 8 }}>{forgotMsg}</div>}
              </div>
            )}
          </div>
        )}

        {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#f8717122", borderRadius: 8 }}>{error}</div>}

        <GoldBtn onClick={submit} disabled={localLoading} style={{ width: "100%", justifyContent: "center", marginBottom: 20, opacity: localLoading ? 0.7 : 1 }}>
          {localLoading ? "Authenticating…" : isLogin ? "Sign In" : isLegacyClaim ? "Submit Claim" : "Create Applicant Account"}
        </GoldBtn>

        <div style={{ textAlign: "center", color: t.muted, fontSize: 14 }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => onNavigate(isLogin ? "register" : "login")} style={{
            background: "none", border: "none", color: "#c9952a", cursor: "pointer", fontWeight: 700,
          }}>{isLogin ? "Register" : "Sign In"}</button>
        </div>

        <button onClick={() => onNavigate("home")} style={{
          display: "block", margin: "16px auto 0", background: "none", border: "none",
          color: t.muted, cursor: "pointer", fontSize: 13,
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
  const [tab, setTab] = useState(user?.legacyApproved ? "apply" : "overview");
  const [toast, setToast] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [publicSettings, setPublicSettings] = useState(createDefaultSettings());
  const [appData, setAppData] = useState({
    fullName: user.name || "", email: user.email || "", phone: "", gender: "",
    dob: "", religion: "", maritalStatus: "", placeOfBirth: "", height: "", bloodGroup: "", genotype: "", urinaryTest: "", nationality: "",
    profession: "", professionAddress: "", educationQualification: "", disability: "",
    convictedBefore: "", convictionReasons: "", paramilitaryMember: "", paramilitaryName: "",
    paramilitaryRank: "", paramilitaryPost: "", paramilitaryYears: "", leavingReasons: "",
    declarationName: "", declarationDate: "", passportPhotoDataUrl: "",
    guardianName: "", guardianSignatureDate: "", witnessName: "", witnessSignatureDate: "",
    state: "", lga: "", address: "", qualification: "",
    kinName: "", kinPhone: "", medInfo: "", whyJoin: "",
    generalAptitudeScore: "", vocationalAptitudeScore: "", oralTestScore: "", documentsPresented: "", remarks: "",
    eliteAdminOfficerName: "", eliteAdminOfficerPortfolio: "", eliteAdminOfficerSignatureDate: "",
    directorateName: "", directoratePortfolio: "", directorateSignatureDate: "",
    id: user.applicantId || "", serviceStatus: user.serviceStatus || "active",
    status: "pending", submitted: false,
  });
  const [printSlipType, setPrintSlipType] = useState("application");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const hasConvictionDetails = appData.convictedBefore === "yes";
  const hasParamilitaryDetails = appData.paramilitaryMember === "yes";
  const qrPayload = appData.id ? buildQrPayload({ applicantId: appData.id }) : "";

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAnnouncements = async () => {
    try {
      const data = await applicantAPI.getAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      setAnnouncements([]);
      showToast("Failed to load announcements: " + err.message, "error");
    }
  };

  const loadPublicSettings = async () => {
    try {
      const settings = await publicAPI.getSettings();
      setPublicSettings({
        ...createDefaultSettings(),
        ...settings,
        manualPayment: {
          ...createDefaultSettings().manualPayment,
          ...(settings?.manualPayment || {}),
        },
      });
    } catch {
      setPublicSettings(createDefaultSettings());
    }
  };

  const loadProfile = async () => {
    try {
      const profile = await applicantAPI.getProfile();
      if (profile) {
        setAppData((d) => ({
          ...d,
          fullName: profile.fullName || d.fullName,
          email: profile.email || d.email,
          phone: profile.phone || "",
          gender: profile.gender || "",
          dob: profile.dob || "",
          religion: profile.religion || "",
          maritalStatus: profile.maritalStatus || "",
          placeOfBirth: profile.placeOfBirth || "",
          height: profile.height || "",
          bloodGroup: profile.bloodGroup || "",
          genotype: profile.genotype || "",
          urinaryTest: profile.urinaryTest || "",
          nationality: profile.nationality || "",
          profession: profile.profession || "",
          professionAddress: profile.professionAddress || "",
          educationQualification: profile.educationQualification || "",
          disability: profile.disability || "",
          convictedBefore: profile.convictedBefore || "",
          convictionReasons: profile.convictionReasons || "",
          paramilitaryMember: profile.paramilitaryMember || "",
          paramilitaryName: profile.paramilitaryName || "",
          paramilitaryRank: profile.paramilitaryRank || "",
          paramilitaryPost: profile.paramilitaryPost || "",
          paramilitaryYears: profile.paramilitaryYears || "",
          leavingReasons: profile.leavingReasons || "",
          declarationName: profile.declarationName || profile.fullName || d.declarationName,
          declarationDate: profile.declarationDate || "",
          passportPhotoDataUrl: profile.passportPhotoDataUrl || "",
          guardianName: profile.guardianName || "",
          guardianSignatureDate: profile.guardianSignatureDate || profile.guardianName || d.guardianSignatureDate,
          witnessName: profile.witnessName || profile.kinName || profile.fullName || d.witnessName,
          witnessSignatureDate: profile.witnessSignatureDate || "",
          state: profile.state || "",
          lga: profile.lga || "",
          address: profile.address || "",
          qualification: profile.qualification || "",
          kinName: profile.kinName || "",
          kinPhone: profile.kinPhone || "",
          medInfo: profile.medInfo || "",
          whyJoin: profile.whyJoin || "",
          generalAptitudeScore: profile.generalAptitudeScore || "",
          vocationalAptitudeScore: profile.vocationalAptitudeScore || "",
          oralTestScore: profile.oralTestScore || "",
          documentsPresented: profile.documentsPresented || "",
          remarks: profile.remarks || "",
          eliteAdminOfficerName: profile.eliteAdminOfficerName || "",
          eliteAdminOfficerPortfolio: profile.eliteAdminOfficerPortfolio || "",
          eliteAdminOfficerSignatureDate: profile.eliteAdminOfficerSignatureDate || "",
          directorateName: profile.directorateName || "",
          directoratePortfolio: profile.directoratePortfolio || "",
          directorateSignatureDate: profile.directorateSignatureDate || "",
          id: profile.applicantId || d.id,
          serviceStatus: profile.serviceStatus || d.serviceStatus,
          status: profile.status || d.status,
          submitted: profile.submitted || d.submitted,
        }));
      }
    } catch (err) {
      showToast("Failed to load profile: " + err.message, "error");
    }
  };

  const submitApp = async () => {
    if (!appData.fullName || !appData.phone || !appData.gender || !appData.state || !appData.lga) {
      showToast("Please fill all required fields.", "error"); return;
    }
    try {
      const result = await applicantAPI.submitApplication({
        fullName: appData.fullName,
        phone: appData.phone,
        gender: appData.gender,
        dob: appData.dob,
        bloodGroup: appData.bloodGroup,
        genotype: appData.genotype,
        urinaryTest: appData.urinaryTest,
        religion: appData.religion,
        maritalStatus: appData.maritalStatus,
        placeOfBirth: appData.placeOfBirth,
        height: appData.height,
        nationality: appData.nationality,
        profession: appData.profession,
        professionAddress: appData.professionAddress,
        educationQualification: appData.educationQualification,
        disability: appData.disability,
        convictedBefore: appData.convictedBefore,
        convictionReasons: hasConvictionDetails ? appData.convictionReasons : "",
        paramilitaryMember: appData.paramilitaryMember,
        paramilitaryName: hasParamilitaryDetails ? appData.paramilitaryName : "",
        paramilitaryRank: hasParamilitaryDetails ? appData.paramilitaryRank : "",
        paramilitaryPost: hasParamilitaryDetails ? appData.paramilitaryPost : "",
        paramilitaryYears: hasParamilitaryDetails ? appData.paramilitaryYears : "",
        leavingReasons: hasParamilitaryDetails ? appData.leavingReasons : "",
        declarationName: appData.declarationName,
        declarationDate: appData.declarationDate,
        passportPhotoDataUrl: appData.passportPhotoDataUrl,
        guardianName: appData.guardianName,
        guardianSignatureDate: appData.guardianSignatureDate,
        witnessName: appData.witnessName,
        witnessSignatureDate: appData.witnessSignatureDate,
        state: appData.state,
        lga: appData.lga,
        address: appData.address,
        qualification: appData.qualification,
        kinName: appData.kinName,
        kinPhone: appData.kinPhone,
        medInfo: appData.medInfo,
        whyJoin: appData.whyJoin,
        generalAptitudeScore: appData.generalAptitudeScore,
        vocationalAptitudeScore: appData.vocationalAptitudeScore,
        oralTestScore: appData.oralTestScore,
        documentsPresented: appData.documentsPresented,
        remarks: appData.remarks,
        eliteAdminOfficerName: appData.eliteAdminOfficerName,
        eliteAdminOfficerPortfolio: appData.eliteAdminOfficerPortfolio,
        eliteAdminOfficerSignatureDate: appData.eliteAdminOfficerSignatureDate,
        directorateName: appData.directorateName,
        directoratePortfolio: appData.directoratePortfolio,
        directorateSignatureDate: appData.directorateSignatureDate,
      });

      if (result?.applicant) {
        const a = result.applicant;
        setAppData((d) => ({
          ...d,
          id: a.applicantId || d.id,
          status: a.status || "under_review",
          submitted: a.submitted ?? true,
          fullName: a.fullName || d.fullName,
          bloodGroup: a.bloodGroup || d.bloodGroup,
          genotype: a.genotype || d.genotype,
          serviceStatus: a.serviceStatus || d.serviceStatus,
        }));
      } else {
        const id = appData.id || createApplicantId();
        setAppData(d => ({ ...d, submitted: true, status: "under_review", id }));
      }

      setTab("status");
      showToast("Application submitted successfully!");
    } catch (err) {
      showToast("Submit failed: " + err.message, "error");
    }
  };

  const onPassportChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Passport must be an image file.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setAppData((d) => ({ ...d, passportPhotoDataUrl: dataUrl }));
      showToast("Passport uploaded.");
    };
    reader.onerror = () => showToast("Unable to read passport image.", "error");
    reader.readAsDataURL(file);
  };

  const shareQr = async () => {
    if (!appData.id) {
      showToast("No applicant ID yet.", "error");
      return;
    }
    const text = `Civil Elite Applicant Verification URL\nApplicant ID: ${appData.id}\nURL: ${qrPayload}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Civil Elite Applicant Verification", text });
        showToast("Verification link shared.");
        return;
      }
      await navigator.clipboard.writeText(qrPayload);
      showToast("Verification link copied to clipboard.");
    } catch {
      showToast("Unable to share QR right now.", "error");
    }
  };

  const downloadQrImage = () => {
    if (!qrDataUrl || !appData.id) {
      showToast("QR image not ready.", "error");
      return;
    }
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${appData.id}-qr.png`;
    link.click();
    showToast("QR image downloaded.");
  };

  const printApplicationSlip = () => {
    if (!appData.submitted) {
      showToast("Submit your application before printing the slip.", "error");
      return;
    }
    setPrintSlipType("application");
    requestAnimationFrame(() => window.print());
  };

  const printAcceptanceSlip = () => {
    if (!appData.submitted) {
      showToast("Submit your application before printing the slip.", "error");
      return;
    }
    if (appData.status !== "approved") {
      showToast("Acceptance slip is available only for approved applicants.", "error");
      return;
    }
    setPrintSlipType("acceptance");
    requestAnimationFrame(() => window.print());
  };

  useEffect(() => {
    if (appData.id) {
      const payload = buildQrPayload({ applicantId: appData.id });
      QRCode.toDataURL(payload).then(url => setQrDataUrl(url)).catch(() => setQrDataUrl(null));
    } else setQrDataUrl(null);
  }, [appData.id]);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    loadPublicSettings();
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  const menuItems = [
    { id: "overview", icon: "🏠", label: "Overview" },
    { id: "apply", icon: "📋", label: "Application Form" },
    { id: "status", icon: "📊", label: "Track Status" },
    { id: "camp", icon: "🧰", label: "Camp Requirements" },
    { id: "announcements", icon: "📢", label: "Announcements" },
  ];

  const S2 = {
    card: { background: surface, border: `1px solid ${surfaceBorder}`, borderRadius: 14, padding: 24 },
    label: { color: t.muted, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 6 },
  };

  return (
    <div style={{ minHeight: "100vh", background: t.page, color: t.text, fontFamily: "'Segoe UI',sans-serif", display: "flex" }}>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-slip, .print-slip *, .print-acceptance-slip, .print-acceptance-slip * {
            visibility: visible !important;
          }
          .print-slip, .print-acceptance-slip {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
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
            <button key={m.id} onClick={() => { setTab(m.id); setSidebarOpen(false); }} style={{
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
                  { icon: "🛂", label: "Verification", val: "Physical check in camp", color: "#64b5f6" },
                  { icon: "📢", label: "Announcements", val: `${announcements.length} New`, color: "#c9952a" },
                  { icon: "🎯", label: "Current Stage", val: getCurrentStage(appData.status, appData.submitted), color: getStageColor(appData.status, appData.submitted) },
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
                  <p style={{ color: t.muted, fontSize: 14, marginBottom: 16 }}>Your application has not been submitted. Fill the form and proceed to physical verification in camp.</p>
                  <div style={{ color: t.muted, fontSize: 13, marginBottom: 12 }}>Your unique Applicant ID: <span style={{ color: "#c9952a", fontWeight: 700 }}>{appData.id || "Generating..."}</span></div>
                  <GoldBtn onClick={() => setTab("apply")} style={{ fontSize: 13, padding: "10px 20px" }}>Start Application</GoldBtn>
                </div>
              )}

              <div style={{ ...S2.card, marginTop: 20 }}>
                <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 10 }}>Join our socials to get updated</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                  {SOCIAL_LINKS.map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        textDecoration: "none",
                        color: t.text,
                        border: `1px solid ${t.border}`,
                        borderRadius: 12,
                        padding: 16,
                        background: isLight ? "#fff" : "rgba(255,255,255,0.03)",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div style={{ fontSize: 24 }}>{social.icon}</div>
                      <div>
                        <div style={{ fontWeight: 800 }}>{social.label}</div>
                        <div style={{ color: t.muted, fontSize: 13 }}>{social.note}</div>
                      </div>
                    </a>
                  ))}
                </div>
                <div style={{ color: t.muted, fontSize: 12, marginTop: 12 }}>Replace the placeholder links in the code with your official WhatsApp, Facebook, TikTok, and YouTube URLs.</div>
              </div>

              <div style={{ marginTop: 28 }}>
                <div style={{ color: isLight ? "#9a6b1a" : "#e8d8a0", fontWeight: 700, marginBottom: 14 }}>Latest Announcements</div>
                {announcements.map((a, i) => (
                  <div key={i} style={{ ...S2.card, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <Badge label="NOTICE" />
                      <span style={{ color: faintText, fontSize: 12 }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, color: t.text, marginBottom: 6 }}>{a.title}</div>
                    <div style={{ color: t.muted, fontSize: 14 }}>{a.body}</div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div style={{ color: t.muted, fontSize: 13 }}>No announcements available.</div>
                )}
              </div>

              <div style={{ ...S2.card, marginTop: 20 }}>
                <div style={{ color: theme === "light" ? "#0f172a" : "#e8d8a0", fontWeight: 800, fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>Join Our Socials</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {SOCIAL_LINKS.map((social) => (
                    <a key={social.label} href={social.href} target="_blank" rel="noreferrer" style={{ color: t.muted, textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{social.icon}</span>
                      <span>{social.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─ APPLICATION FORM ─ */}
          {tab === "apply" && (
            <div>
              <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Recruitment Application</h2>
              <p style={{ color: t.muted, marginBottom: 28 }}>Complete all fields accurately. False information is disqualifying.</p>

              <PaymentNotice settings={publicSettings} light={isLight} />

              {appData.submitted && (
                <div style={{ ...S2.card, background: "rgba(76,175,80,0.08)", border: "1px solid rgba(76,175,80,0.3)", marginBottom: 24 }}>
                  <div style={{ color: "#81c784", fontWeight: 700 }}>✅ Application Submitted — Your application is under review.</div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 0 }}>
                <div>
                  <div style={{ color: theme === "light" ? "#0f172a" : "#e8d8a0", fontWeight: 800, fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>Join Our Socials</div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {SOCIAL_LINKS.map((social) => (
                      <a key={social.label} href={social.href} target="_blank" rel="noreferrer" style={{ color: t.muted, textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{social.icon}</span>
                        <span>{social.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
                <div style={{ paddingRight: 16 }}>
                  <div style={{ color: "#c9952a", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>PERSONAL INFORMATION</div>
                  <Input light={isLight} label="Full Name" value={appData.fullName} onChange={e => setAppData(d => ({ ...d, fullName: e.target.value }))} required />
                  <Input light={isLight} label="Email Address" type="email" value={appData.email} onChange={e => setAppData(d => ({ ...d, email: e.target.value }))} required />
                  <Input light={isLight} label="Phone Number" value={appData.phone} onChange={e => setAppData(d => ({ ...d, phone: e.target.value }))} placeholder="+234 800 000 0000" required />
                  <Select light={isLight} label="Gender" value={appData.gender} onChange={e => setAppData(d => ({ ...d, gender: e.target.value }))} required
                    options={[{ value: "", label: "Select gender" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }]} />
                  <Input light={isLight} label="Date of Birth" type="date" value={appData.dob} onChange={e => setAppData(d => ({ ...d, dob: e.target.value }))} required />
                  <Input light={isLight} label="Religion" value={appData.religion} onChange={e => setAppData(d => ({ ...d, religion: e.target.value }))} />
                  <Select light={isLight} label="Marital Status" value={appData.maritalStatus} onChange={e => setAppData(d => ({ ...d, maritalStatus: e.target.value }))}
                    options={[{ value: "", label: "Select marital status" }, { value: "single", label: "Single" }, { value: "married", label: "Married" }, { value: "divorced", label: "Divorced" }, { value: "widowed", label: "Widowed" }]} />
                  <Input light={isLight} label="Place of Birth" value={appData.placeOfBirth} onChange={e => setAppData(d => ({ ...d, placeOfBirth: e.target.value }))} />
                  <Input light={isLight} label="Height" value={appData.height} onChange={e => setAppData(d => ({ ...d, height: e.target.value }))} placeholder="e.g. 5ft 8in" />
                  <Select light={isLight} label="Blood Group" value={appData.bloodGroup} onChange={e => setAppData(d => ({ ...d, bloodGroup: e.target.value }))}
                    options={[
                      { value: "", label: "Select blood group" },
                      { value: "A+", label: "A+" },
                      { value: "A-", label: "A-" },
                      { value: "B+", label: "B+" },
                      { value: "B-", label: "B-" },
                      { value: "AB+", label: "AB+" },
                      { value: "AB-", label: "AB-" },
                      { value: "O+", label: "O+" },
                      { value: "O-", label: "O-" },
                    ]} />
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", color: isLight ? "#475569" : "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Passport Photograph</label>
                    <input type="file" accept="image/*" onChange={onPassportChange} style={{ display: "block", marginBottom: 8 }} />
                    {appData.passportPhotoDataUrl && (
                      <img src={appData.passportPhotoDataUrl} alt="Passport preview" style={{ width: 110, height: 130, objectFit: "cover", borderRadius: 8, border: `1px solid ${t.border}` }} />
                    )}
                  </div>
                  <Input light={isLight} label="Nationality" value={appData.nationality} onChange={e => setAppData(d => ({ ...d, nationality: e.target.value }))} />
                  <Input light={isLight} label="Profession (Optional)" value={appData.profession} onChange={e => setAppData(d => ({ ...d, profession: e.target.value }))} />
                  <Textarea light={isLight} label="Profession Address" value={appData.professionAddress} onChange={e => setAppData(d => ({ ...d, professionAddress: e.target.value }))} rows={2} />
                  <Input light={isLight} label="Education Qualification if any" value={appData.educationQualification} onChange={e => setAppData(d => ({ ...d, educationQualification: e.target.value }))} />
                  <Textarea light={isLight} label="Disability" value={appData.disability} onChange={e => setAppData(d => ({ ...d, disability: e.target.value }))} rows={2} placeholder="State none if not applicable" />
                  <Select light={isLight} label="Have you been convicted by any court of law before?" value={appData.convictedBefore} onChange={e => setAppData(d => ({ ...d, convictedBefore: e.target.value, convictionReasons: e.target.value === "yes" ? d.convictionReasons : "" }))}
                    options={[{ value: "", label: "Select answer" }, { value: "no", label: "No" }, { value: "yes", label: "Yes" }]} />
                  {hasConvictionDetails && <Textarea light={isLight} label="If yes, state the reasons" value={appData.convictionReasons} onChange={e => setAppData(d => ({ ...d, convictionReasons: e.target.value }))} rows={3} />}
                  <Select light={isLight} label="Have you been a member of any voluntary, paramilitary organisation?" value={appData.paramilitaryMember} onChange={e => setAppData(d => ({ ...d, paramilitaryMember: e.target.value, paramilitaryName: e.target.value === "yes" ? d.paramilitaryName : "", paramilitaryRank: e.target.value === "yes" ? d.paramilitaryRank : "", paramilitaryPost: e.target.value === "yes" ? d.paramilitaryPost : "", paramilitaryYears: e.target.value === "yes" ? d.paramilitaryYears : "", leavingReasons: e.target.value === "yes" ? d.leavingReasons : "" }))}
                    options={[{ value: "", label: "Select answer" }, { value: "no", label: "No" }, { value: "yes", label: "Yes" }]} />
                  {hasParamilitaryDetails && <>
                    <Input light={isLight} label="If yes, name of organisation" value={appData.paramilitaryName} onChange={e => setAppData(d => ({ ...d, paramilitaryName: e.target.value }))} />
                    <Input light={isLight} label="Rank" value={appData.paramilitaryRank} onChange={e => setAppData(d => ({ ...d, paramilitaryRank: e.target.value }))} />
                    <Input light={isLight} label="Post" value={appData.paramilitaryPost} onChange={e => setAppData(d => ({ ...d, paramilitaryPost: e.target.value }))} />
                    <Input light={isLight} label="Years of Service" value={appData.paramilitaryYears} onChange={e => setAppData(d => ({ ...d, paramilitaryYears: e.target.value }))} />
                    <Textarea light={isLight} label="Reasons for leaving" value={appData.leavingReasons} onChange={e => setAppData(d => ({ ...d, leavingReasons: e.target.value }))} rows={3} />
                  </>}
                  <Select light={isLight} label="State of Origin" value={appData.state} onChange={e => setAppData(d => ({ ...d, state: e.target.value, lga: "" }))} required
                    options={[{ value: "", label: "Select state" }, ...NIGERIAN_STATES.map(s => ({ value: s, label: s }))]} />
                  <Select light={isLight} label="Local Government Area" value={appData.lga} onChange={e => setAppData(d => ({ ...d, lga: e.target.value }))} required
                    options={[{ value: "", label: appData.state ? "Select LGA" : "Select state first" }, ...getLgaOptions(appData.state).map(lga => ({ value: lga, label: lga }))]} />
                  <Textarea light={isLight} label="Residential Address" value={appData.address} onChange={e => setAppData(d => ({ ...d, address: e.target.value }))} rows={2} required />
                </div>
                <div>
                  <div style={{ color: "#c9952a", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>QUALIFICATIONS & DECLARATION</div>
                  <Select light={isLight} label="Highest Educational Qualification" value={appData.qualification} onChange={e => setAppData(d => ({ ...d, qualification: e.target.value }))} required
                    options={[{ value: "", label: "Select qualification" }, { value: "waec", label: "WAEC/NECO" }, { value: "ond", label: "OND" }, { value: "hnd", label: "HND" }, { value: "bsc", label: "B.Sc / B.A" }, { value: "msc", label: "M.Sc / MBA" }]} />
                  <Input light={isLight} label="Next of Kin — Full Name" value={appData.kinName} onChange={e => setAppData(d => ({ ...d, kinName: e.target.value }))} required />
                  <Input light={isLight} label="Next of Kin — Phone" value={appData.kinPhone} onChange={e => setAppData(d => ({ ...d, kinPhone: e.target.value }))} required />
                  <Textarea light={isLight} label="Medical Information (Conditions, Allergies, etc.)" value={appData.medInfo} onChange={e => setAppData(d => ({ ...d, medInfo: e.target.value }))} placeholder="None known / describe any conditions..." rows={3} />
                  <Textarea light={isLight} label="Why do you want to join Civil Elite Service? *" value={appData.whyJoin} onChange={e => setAppData(d => ({ ...d, whyJoin: e.target.value }))} placeholder="Describe your motivation, goals, and how you will contribute..." rows={5} required />
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", color: isLight ? "#475569" : "#aab", fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Declaration</label>
                    <div style={{ border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: 14, color: isLight ? "#0f172a" : "#fff", background: isLight ? "#fff" : "rgba(255,255,255,0.03)", lineHeight: 1.7, fontSize: 14 }}>
                      I {appData.declarationName || "____________"} hereby declare that the information contained herein is true and correct to the best of my knowledge.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <Input light={isLight} label="Applicant Signature" value={appData.declarationName} onChange={e => setAppData(d => ({ ...d, declarationName: e.target.value }))} placeholder="Type your full name as signature" required />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button onClick={() => setAppData(d => ({ ...d, declarationName: d.fullName || d.declarationName }))} style={{ height: 40, padding: '6px 10px', borderRadius: 8, border: '1px solid #c9952a', background: 'transparent', color: isLight ? '#c9952a' : '#ffd7a8', cursor: 'pointer', fontWeight: 700 }}>Use full name</button>
                    </div>
                  </div>
                  <Input light={isLight} label="Date" type="date" value={appData.declarationDate} onChange={e => setAppData(d => ({ ...d, declarationDate: e.target.value }))} required />

                  <div style={{ marginTop: 20, marginBottom: 12, color: "#c9952a", fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>
                    PARENTS AND GUARDIAN DETAILS: ATTESTATION OF GOOD CONDUCT
                  </div>
                  <div style={{ border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: 14, color: isLight ? "#0f172a" : "#fff", background: isLight ? "#fff" : "rgba(255,255,255,0.03)", lineHeight: 1.7, fontSize: 14, marginBottom: 12 }}>
                    I, Mr./Mrs./Chief {appData.guardianName || "__________"} parent/guardian of {appData.fullName || "__________"} who is applying for recruitment into the corps hereby certify that, I fully understand that my child/ward will attend the recruitment exercise, with an attestation of good conduct as a well behaved person that can serve and portray a good ambassador of the organization anywhere.
                  </div>
                  <Input light={isLight} label="Parent/Guardian Name" value={appData.guardianName} onChange={e => setAppData(d => ({ ...d, guardianName: e.target.value }))} placeholder="Mr./Mrs./Chief ..." />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input light={isLight} label="Parent/Guardian Sign & Date" value={appData.guardianSignatureDate} onChange={e => setAppData(d => ({ ...d, guardianSignatureDate: e.target.value }))} placeholder="Signature and date" />
                    <button onClick={() => setAppData(d => ({ ...d, guardianSignatureDate: d.guardianName || d.kinName || d.fullName }))} style={{ height: 40, padding: '6px 10px', borderRadius: 8, border: '1px solid #c9952a', background: 'transparent', color: isLight ? '#c9952a' : '#ffd7a8', cursor: 'pointer', fontWeight: 700 }}>Use name</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input light={isLight} label="Witness Sign/Date (Name or Signature)" value={appData.witnessName} onChange={e => setAppData(d => ({ ...d, witnessName: e.target.value }))} placeholder="Witness signature/name" />
                    <button onClick={() => setAppData(d => ({ ...d, witnessName: d.kinName || d.witnessName || d.fullName }))} style={{ height: 40, padding: '6px 10px', borderRadius: 8, border: '1px solid #c9952a', background: 'transparent', color: isLight ? '#c9952a' : '#ffd7a8', cursor: 'pointer', fontWeight: 700 }}>Use name</button>
                  </div>
                  <Input light={isLight} label="Witness Date" value={appData.witnessSignatureDate} onChange={e => setAppData(d => ({ ...d, witnessSignatureDate: e.target.value }))} placeholder="Date" />
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
              <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Application Status</h2>
              {!appData.submitted ? (
                <div style={{ ...S2.card, textAlign: "center", padding: 48 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                  <div style={{ color: t.text, fontWeight: 700, marginBottom: 8 }}>No Application Found</div>
                  <div style={{ color: t.muted, marginBottom: 20 }}>You have not submitted an application yet.</div>
                  {qrDataUrl && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ color: t.muted, fontSize: 13, marginBottom: 10 }}>Your live verification QR is already active and shareable.</div>
                      <img src={qrDataUrl} alt="Applicant QR" style={{ width: 170, height: 170, borderRadius: 12, background: "#fff", padding: 8 }} />
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
                    <GoldBtn outline onClick={shareQr} style={{ padding: "10px 16px" }}>Share QR</GoldBtn>
                    <GoldBtn outline onClick={downloadQrImage} style={{ padding: "10px 16px" }}>Download QR</GoldBtn>
                  </div>
                  <GoldBtn onClick={() => setTab("apply")}>Start Application</GoldBtn>
                </div>
              ) : (
                <div>
                  <div style={{ ...S2.card, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: t.text, fontSize: 18 }}>{appData.fullName}</div>
                        <div style={{ color: t.muted, fontSize: 13 }}>Ref: {appData.id}</div>
                        <div style={{ color: t.muted, fontSize: 13, marginTop: 2, textTransform: "capitalize" }}>Service status: {appData.serviceStatus}</div>
                      </div>
                      <StatusBadge s={appData.status} />
                    </div>
                    {/* Timeline */}
                    <div style={{ position: "relative", paddingLeft: 28 }}>
                      <div style={{ position: "absolute", left: 9, top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.1)" }} />
                      {buildApplicationTimeline(appData.status).map((step, i) => (
                        <div key={i} style={{ position: "relative", marginBottom: 20 }}>
                          <div style={{
                            position: "absolute", left: -24, top: 2, width: 12, height: 12,
                            borderRadius: "50%", background: step.done ? "#c9952a" : "#333",
                            border: `2px solid ${step.done ? "#c9952a" : "#555"}`,
                          }} />
                          <div style={{ fontWeight: 600, color: step.done ? t.text : t.muted, fontSize: 14 }}>{step.label}</div>
                          <div style={{ color: "#64748b", fontSize: 12 }}>{step.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {qrDataUrl && (
                    <div style={{ ...S2.card, marginBottom: 20, textAlign: "center" }}>
                      <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 12 }}>Identity QR Code</div>
                      <img src={qrDataUrl} alt="Applicant QR" style={{ width: 180, height: 180, borderRadius: 12, background: "#fff", padding: 8 }} />
                      <div style={{ color: t.muted, marginTop: 10, fontSize: 13 }}>Contains Applicant ID and Service Status for quick camp/event check-ins.</div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
                        <GoldBtn outline onClick={shareQr} style={{ padding: "10px 16px" }}>Share QR</GoldBtn>
                        <GoldBtn outline onClick={downloadQrImage} style={{ padding: "10px 16px" }}>Download QR</GoldBtn>
                      </div>
                    </div>
                  )}
                  {appData.submitted && (
                    <div style={{ ...S2.card, marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 14 }}>Admin Assessment</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                        {[
                          ["Blood Group", appData.bloodGroup || "Pending assessment"],
                          ["Genotype", appData.genotype || "Pending assessment"],
                          ["Urinary Test", appData.urinaryTest || "Pending assessment"],
                          ["General Aptitude", appData.generalAptitudeScore || "Pending assessment"],
                          ["Vocational Aptitude", appData.vocationalAptitudeScore || "Pending assessment"],
                          ["Oral Test", appData.oralTestScore || "Pending assessment"],
                        ].map(([label, value]) => (
                          <div key={label} style={{ border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px", background: isLight ? "#fff" : "rgba(255,255,255,0.03)" }}>
                            <div style={{ color: t.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
                            <div style={{ color: t.text, fontSize: 14, fontWeight: 700 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                        <div><strong>Documents Presented:</strong> {appData.documentsPresented || "Pending assessment"}</div>
                        <div><strong>Remarks:</strong> {appData.remarks || "Pending assessment"}</div>
                        <div><strong>Elite Admin Officer:</strong> {appData.eliteAdminOfficerName || "Pending admin update"} | {appData.eliteAdminOfficerPortfolio || "Pending admin update"} | {appData.eliteAdminOfficerSignatureDate || "Pending admin update"}</div>
                        <div><strong>Directorate of Recruitment:</strong> {appData.directorateName || "Pending admin update"} | {appData.directoratePortfolio || "Pending admin update"} | {appData.directorateSignatureDate || "Pending admin update"}</div>
                      </div>
                    </div>
                  )}
                  <GoldBtn outline onClick={printApplicationSlip}>
                    <Download /> Print Application Slip
                  </GoldBtn>
                  {appData.status === "approved" && (
                    <GoldBtn outline onClick={printAcceptanceSlip} style={{ marginLeft: 10 }}>
                      <Download /> Print Acceptance Slip
                    </GoldBtn>
                  )}
                </div>
              )}
              <div className="print-slip" style={{ display: "none" }}>
                {printSlipType === "application" && (
                <div style={{ padding: 28, fontFamily: "Arial, sans-serif", color: "#111827" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, borderBottom: "2px solid #c9952a", paddingBottom: 14 }}>
                    <img src="/logo.png" alt="Civil Elite Service logo" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10 }} />
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>Civil Elite Service</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>Applicant Application Slip</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div><strong>Applicant ID:</strong> {appData.id}</div>
                    <div><strong>Full Name:</strong> {appData.fullName}</div>
                    <div><strong>Email:</strong> {appData.email}</div>
                    <div><strong>Phone:</strong> {appData.phone}</div>
                    <div><strong>State:</strong> {appData.state}</div>
                    <div><strong>LGA:</strong> {appData.lga}</div>
                    <div><strong>Blood Group:</strong> {appData.bloodGroup || "Pending assessment"}</div>
                    <div><strong>Genotype:</strong> {appData.genotype || "Pending assessment"}</div>
                    <div><strong>Urinary Test:</strong> {appData.urinaryTest || "Pending assessment"}</div>
                    <div><strong>Religion:</strong> {appData.religion || "Not provided"}</div>
                    <div><strong>Marital Status:</strong> {appData.maritalStatus || "Not provided"}</div>
                    <div><strong>Nationality:</strong> {appData.nationality || "Not provided"}</div>
                    <div><strong>Date of Birth:</strong> {appData.dob || "Not provided"}</div>
                  </div>

                  {appData.passportPhotoDataUrl && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 6 }}><strong>Passport Photograph</strong></div>
                      <img src={appData.passportPhotoDataUrl} alt="Passport" style={{ width: 120, height: 150, objectFit: "cover", borderRadius: 8, border: "1px solid #d1d5db" }} />
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}><strong>Declaration</strong></div>
                  <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 14, marginBottom: 16 }}>
                    I {appData.declarationName || appData.fullName || "____________"} hereby declare that the information contained herein is true and correct to the best of my knowledge.
                  </div>

                  <div style={{ marginBottom: 14 }}><strong>PARENTS AND GUARDIAN DETAILS: ATTESTATION OF GOOD CONDUCT</strong></div>
                  <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 14, marginBottom: 16, lineHeight: 1.7 }}>
                    I, Mr./Mrs./Chief {appData.guardianName || "__________"} parent/guardian of {appData.fullName || "__________"} who is applying for recruitment into the corps hereby certify that, I fully understand that my child/ward will attend the recruitment exercise, with an attestation of good conduct as a well behaved person that can serve and portray a good ambassador of the organization anywhere.
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 28 }}>
                    <div>
                      <div style={{ borderTop: "1px solid #111827", paddingTop: 8, fontSize: 13 }}>Applicant Signature</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>{appData.declarationName || ""}</div>
                    </div>
                    <div>
                      <div style={{ borderTop: "1px solid #111827", paddingTop: 8, fontSize: 13 }}>Date</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>{appData.declarationDate || ""}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 18 }}>
                    <div>
                      <div style={{ borderTop: "1px solid #111827", paddingTop: 8, fontSize: 13 }}>Parent/Guardian Sign & Date</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>{appData.guardianSignatureDate || ""}</div>
                    </div>
                    <div>
                      <div style={{ borderTop: "1px solid #111827", paddingTop: 8, fontSize: 13 }}>Witness Sign/Date</div>
                      <div style={{ marginTop: 6, fontSize: 13 }}>{appData.witnessName || ""} {appData.witnessSignatureDate ? `(${appData.witnessSignatureDate})` : ""}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 22, fontSize: 12, color: "#6b7280" }}>
                    Generated from the Civil Elite Service portal.
                  </div>
                </div>
                )}
              </div>

              <div className="print-acceptance-slip" style={{ display: "none" }}>
                {printSlipType === "acceptance" && appData.status === "approved" && (
                  <div style={{ padding: 28, fontFamily: "Arial, sans-serif", color: "#111827" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, borderBottom: "2px solid #c9952a", paddingBottom: 14 }}>
                      <img src="/logo.png" alt="Civil Elite Service logo" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10 }} />
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>Civil Elite Service</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>Acceptance & Assessment Slip</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14, fontWeight: 700, color: "#0f172a" }}>
                      This certifies that {appData.fullName} ({appData.id}) has been accepted for Civil Elite Service camp.
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <div><strong>Applicant ID:</strong> {appData.id}</div>
                      <div><strong>Full Name:</strong> {appData.fullName}</div>
                      <div><strong>Status:</strong> {appData.status}</div>
                      <div><strong>Service Status:</strong> {appData.serviceStatus}</div>
                      <div><strong>Assigned Rank:</strong> {appData.paramilitaryRank || "Pending posting"}</div>
                      <div><strong>Assigned Post:</strong> {appData.paramilitaryPost || "Pending posting"}</div>
                      <div><strong>Blood Group:</strong> {appData.bloodGroup || "Pending assessment"}</div>
                      <div><strong>Genotype:</strong> {appData.genotype || "Pending assessment"}</div>
                      <div><strong>Urinary Test:</strong> {appData.urinaryTest || "Pending assessment"}</div>
                      <div><strong>General Aptitude Score:</strong> {appData.generalAptitudeScore || "Pending assessment"}</div>
                      <div><strong>Vocational Aptitude Score:</strong> {appData.vocationalAptitudeScore || "Pending assessment"}</div>
                      <div><strong>Oral Test Score:</strong> {appData.oralTestScore || "Pending assessment"}</div>
                    </div>

                    <div style={{ marginBottom: 14 }}><strong>Documents Presented:</strong> {appData.documentsPresented || "Pending assessment"}</div>
                    <div style={{ marginBottom: 14 }}><strong>Remarks:</strong> {appData.remarks || "Pending assessment"}</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                      <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Elite Admin Officer</div>
                        <div style={{ marginBottom: 8 }}><strong>Name:</strong> {appData.eliteAdminOfficerName || "Pending admin update"}</div>
                        <div style={{ marginBottom: 18 }}><strong>Port-folio:</strong> {appData.eliteAdminOfficerPortfolio || "Pending admin update"}</div>
                        <div style={{ borderTop: "1px solid #111827", paddingTop: 8, fontSize: 13 }}>Signature &amp; Date: {appData.eliteAdminOfficerSignatureDate || "________________"}</div>
                      </div>
                      <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Directorate of Recruitment</div>
                        <div style={{ marginBottom: 8 }}><strong>Name:</strong> {appData.directorateName || "Pending admin update"}</div>
                        <div style={{ marginBottom: 18 }}><strong>Port-folio:</strong> {appData.directoratePortfolio || "Pending admin update"}</div>
                        <div style={{ borderTop: "1px solid #111827", paddingTop: 8, fontSize: 13 }}>Signature &amp; Date: {appData.directorateSignatureDate || "________________"}</div>
                      </div>
                    </div>

                    <div style={{ marginTop: 22, fontSize: 12, color: "#6b7280" }}>
                      Generated from the Civil Elite Service portal.
                    </div>
                  </div>
                )}
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
                    <Badge label="NOTICE" />
                    <span style={{ color: faintText, fontSize: 12 }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: t.text, fontSize: 16, marginBottom: 8 }}>{a.title}</div>
                  <div style={{ color: t.muted, lineHeight: 1.7 }}>{a.body}</div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div style={{ color: t.muted, fontSize: 13 }}>No announcements available.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── LEGACY UPDATE FORM ───────────────────────────────────────────────────────
const LegacyUpdateForm = ({ user, onLogout, theme = "light", initialData = null, adminView = false, onAdminSave = null }) => {
  const t = getTheme(theme);
  const isLight = theme === "light";
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: user.name || "",
    contactAddress: "",
    serviceStatus: user.serviceStatus || "active",
    age: "",
    placeOfBirth: "",
    gender: "",
    height: "",
    bloodGroup: "",
    genotype: "",
    schoolOccupation: "",
    state: "",
    homeTown: "",
    lga: "",
    phone: "",
    phone2: "",
    email: user.email || "",
    email2: "",
    serviceNumber: "",
    department: "",
    parentName: "",
    parentContactAddress: "",
    parentOccupation: "",
    parentPhone1: "",
    parentPhone2: "",
    parentEmail: "",
    parentSignature: "",
    passportPhotoDataUrl: "",
    birthCertificateDataUrl: "",
    schoolCertificateDataUrl: "",
    attestationLetterDataUrl: "",
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState("update");
  const [announcements, setAnnouncements] = useState([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);

  const LegacyField = useCallback(({ label, value, onChange, placeholder = "", type = "text", options = null, rows = 1, multiline = false, required = false, readOnly = false }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: isLight ? "#475569" : "#cbd5e1", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{label}{required ? " *" : ""}</div>
      {options ? (
        <select value={value} onChange={onChange} required={required} disabled={readOnly} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.18)"}`, padding: "8px 0", color: value ? t.text : t.muted, fontSize: 14, outline: "none", boxSizing: "border-box", cursor: readOnly ? 'not-allowed' : 'pointer' }}>
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : multiline ? (
        <textarea value={value} onChange={onChange} rows={rows} placeholder={placeholder} required={required} disabled={readOnly} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.18)"}`, padding: "8px 0", color: t.text, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", cursor: readOnly ? 'not-allowed' : 'text' }} />
      ) : (
        <input value={value} onChange={onChange} type={type} placeholder={placeholder} required={required} disabled={readOnly} style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.18)"}`, padding: "8px 0", color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box", cursor: readOnly ? 'not-allowed' : 'text' }} />
      )}
    </div>
  ), [isLight, t]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (initialData) {
          // Populate from provided initial data (claim, applicant, user)
          const { claim = {}, applicant = {}, user: claimUser = {} } = initialData || {};
          setForm((current) => ({
            ...current,
            fullName: claim.fullName || claimUser.name || current.fullName,
            contactAddress: applicant.contactAddress || applicant.address || current.contactAddress,
            serviceStatus: claimUser.serviceStatus || current.serviceStatus,
            age: applicant.age || current.age,
            placeOfBirth: applicant.placeOfBirth || current.placeOfBirth,
            gender: applicant.gender || current.gender,
            height: applicant.height || current.height,
            bloodGroup: applicant.bloodGroup || current.bloodGroup,
            genotype: applicant.genotype || current.genotype,
            schoolOccupation: applicant.schoolOccupation || applicant.profession || current.schoolOccupation,
            state: claim.state || applicant.state || current.state,
            homeTown: applicant.homeTown || current.homeTown,
            lga: applicant.lga || current.lga,
            phone: claim.phone || applicant.phone || current.phone,
            phone2: applicant.phone2 || current.phone2,
            email: claim.email || claimUser.email || current.email,
            email2: applicant.email2 || current.email2,
            serviceNumber: claim.legacyServiceNumber || current.serviceNumber,
            department: applicant.department || current.department,
            parentName: applicant.parentName || current.parentName,
            parentContactAddress: applicant.parentContactAddress || current.parentContactAddress,
            parentOccupation: applicant.parentOccupation || current.parentOccupation,
            parentPhone1: applicant.parentPhone1 || current.parentPhone1,
            parentPhone2: applicant.parentPhone2 || current.parentPhone2,
            parentEmail: applicant.parentEmail || current.parentEmail,
            parentSignature: applicant.parentSignature || applicant.parentName || current.parentSignature,
            passportPhotoDataUrl: applicant.passportPhotoDataUrl || current.passportPhotoDataUrl,
            birthCertificateDataUrl: applicant.birthCertificateDataUrl || current.birthCertificateDataUrl,
            schoolCertificateDataUrl: applicant.schoolCertificateDataUrl || current.schoolCertificateDataUrl,
            attestationLetterDataUrl: applicant.attestationLetterDataUrl || current.attestationLetterDataUrl,
          }));
          return;
        }

        const profile = await applicantAPI.getProfile();
        if (profile) {
          setForm((current) => ({
            ...current,
            fullName: profile.fullName || current.fullName,
            contactAddress: profile.contactAddress || profile.address || current.contactAddress,
            serviceStatus: profile.serviceStatus || current.serviceStatus,
            age: profile.age || current.age,
            placeOfBirth: profile.placeOfBirth || current.placeOfBirth,
            gender: profile.gender || current.gender,
            height: profile.height || current.height,
            bloodGroup: profile.bloodGroup || current.bloodGroup,
            genotype: profile.genotype || current.genotype,
            schoolOccupation: profile.schoolOccupation || profile.profession || current.schoolOccupation,
            state: profile.state || current.state,
            homeTown: profile.homeTown || current.homeTown,
            lga: profile.lga || current.lga,
            phone: profile.phone || current.phone,
            phone2: profile.phone2 || current.phone2,
            email: profile.email || current.email,
            email2: profile.email2 || current.email2,
            serviceNumber: profile.serviceNumber || current.serviceNumber,
            department: profile.department || current.department,
            parentName: profile.parentName || current.parentName,
            parentContactAddress: profile.parentContactAddress || current.parentContactAddress,
            parentOccupation: profile.parentOccupation || current.parentOccupation,
            parentPhone1: profile.parentPhone1 || current.parentPhone1,
            parentPhone2: profile.parentPhone2 || current.parentPhone2,
            parentEmail: profile.parentEmail || current.parentEmail,
            parentSignature: profile.parentSignature || profile.parentName || current.parentSignature,
            passportPhotoDataUrl: profile.passportPhotoDataUrl || current.passportPhotoDataUrl,
            birthCertificateDataUrl: profile.birthCertificateDataUrl || current.birthCertificateDataUrl,
            schoolCertificateDataUrl: profile.schoolCertificateDataUrl || current.schoolCertificateDataUrl,
            attestationLetterDataUrl: profile.attestationLetterDataUrl || current.attestationLetterDataUrl,
          }));
        }
      } catch (error) {
        showToast("Failed to load update profile: " + error.message, "error");
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    let active = true;
    const loadLegacyAnnouncements = async () => {
      try {
        const data = await publicAPI.getAnnouncements();
        if (!active) return;
        setAnnouncements(data || []);
      } catch {
        if (!active) return;
        setAnnouncements([]);
      }
    };

    loadLegacyAnnouncements();
    return () => {
      active = false;
    };
  }, []);

  const qrIdentifier = user.applicantId || form.serviceNumber || user.email || "legacy-officer";
  const qrPayload = buildQrPayload({ applicantId: qrIdentifier });

  useEffect(() => {
    let active = true;
    if (!qrPayload) {
      setQrDataUrl("");
      return undefined;
    }

    setQrLoading(true);
    QRCode.toDataURL(qrPayload)
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      })
      .finally(() => {
        if (active) setQrLoading(false);
      });

    return () => {
      active = false;
    };
  }, [qrPayload]);

  const menuItems = [
    { id: "overview", icon: "🏠", label: "Overview" },
    { id: "qr", icon: "🔳", label: "QR" },
    { id: "announcements", icon: "📢", label: "Announcements" },
    { id: "update", icon: "📝", label: "Update Form" },
  ];

  const copyQrLink = async () => {
    try {
      await navigator.clipboard.writeText(qrPayload);
      showToast("QR link copied.");
    } catch {
      showToast("Unable to copy QR link.", "error");
    }
  };

  const downloadQrImage = () => {
    if (!qrDataUrl) {
      showToast("QR image not ready.", "error");
      return;
    }
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${qrIdentifier}-qr.png`;
    link.click();
    showToast("QR image downloaded.");
  };

  const onPassportChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Passport must be an image file.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, passportPhotoDataUrl: dataUrl }));
      showToast("Passport uploaded.");
    };
    reader.onerror = () => showToast("Unable to read passport image.", "error");
    reader.readAsDataURL(file);
  };

  const onDocumentChange = (field, label) => (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) {
      showToast(`${label} must be an image or PDF file.`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, [field]: dataUrl }));
      showToast(`${label} uploaded.`);
    };
    reader.onerror = () => showToast(`Unable to read ${label.toLowerCase()}.`, "error");
    reader.readAsDataURL(file);
  };

  const submitUpdate = async () => {
    if (!form.fullName || !form.contactAddress || !form.serviceStatus || !form.age || !form.gender || !form.state || !form.lga || !form.phone || !form.email || !form.department || !form.parentName || !form.parentContactAddress || !form.parentPhone1) {
      showToast("Please complete the required update fields.", "error");
      return;
    }
    if (adminView && typeof onAdminSave === 'function') {
      setSaving(true);
      try {
        await onAdminSave(form);
        showToast("Update saved (admin).");
      } catch (err) {
        showToast("Admin save failed: " + err.message, "error");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      await applicantAPI.submitApplication({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        phone2: form.phone2,
        email2: form.email2,
        contactAddress: form.contactAddress,
        address: form.contactAddress,
        age: form.age,
        serviceStatus: form.serviceStatus,
        placeOfBirth: form.placeOfBirth,
        gender: form.gender,
        height: form.height,
        bloodGroup: form.bloodGroup,
        genotype: form.genotype,
        schoolOccupation: form.schoolOccupation,
        profession: form.schoolOccupation,
        state: form.state,
        homeTown: form.homeTown,
        lga: form.lga,
        serviceNumber: form.serviceNumber,
        department: form.department,
        parentName: form.parentName,
        parentContactAddress: form.parentContactAddress,
        parentOccupation: form.parentOccupation,
        parentPhone1: form.parentPhone1,
        parentPhone2: form.parentPhone2,
        parentEmail: form.parentEmail,
        parentSignature: form.parentSignature,
        passportPhotoDataUrl: form.passportPhotoDataUrl,
        birthCertificateDataUrl: form.birthCertificateDataUrl,
        schoolCertificateDataUrl: form.schoolCertificateDataUrl,
        attestationLetterDataUrl: form.attestationLetterDataUrl,
        dob: "",
        qualification: "",
        religion: "",
        maritalStatus: "",
        nationality: "",
        whyJoin: "",
      });
      showToast("Update form submitted successfully.");
    } catch (error) {
      showToast("Submit failed: " + error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const paper = {
    background: isLight ? "#fffdf8" : "rgba(255,255,255,0.04)",
    border: `1px solid ${isLight ? "#d6ccb6" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 18,
    boxShadow: isLight ? "0 24px 60px rgba(15,23,42,0.08)" : "none",
    overflow: "hidden",
  };

  const sectionTitle = {
    color: isLight ? "#9a6b1a" : "#e8d8a0",
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: 1,
    margin: "18px 0 12px",
  };

  return (
    <div style={{ minHeight: "100vh", background: isLight ? "linear-gradient(180deg, #f7f1e4 0%, #f0eadf 100%)" : t.page, color: t.text, padding: 24 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "rgba(201,149,42,0.12)", color: "#c9952a", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>EXISTING OFFICER UPDATE</div>
            <h1 style={{ margin: "10px 0 4px", fontSize: 30, fontWeight: 900 }}>UPDATE FORM (I'M STILL ALIVE)</h1>
            
          </div>
          <GoldBtn outline onClick={onLogout} style={{ alignSelf: "center" }}>Sign Out</GoldBtn>
        </div>

        <div style={paper}>
          <div style={{ padding: 20, borderBottom: `1px solid ${isLight ? "#e6dac1" : "rgba(255,255,255,0.08)"}`, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1 }}>CIVIL ELITE SERVICE</div>
              <div style={{ color: t.muted, fontSize: 13 }}>Existing officer update sheet</div>
            </div>
            <div style={{ textAlign: "right", color: t.muted, fontSize: 13 }}>
              <div>Applicant ID: {user.applicantId || form.serviceNumber || "Pending"}</div>
              <div>Service Status: {form.serviceStatus}</div>
            </div>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, alignItems: "start" }}>
              <div>
                <div style={sectionTitle}>PERSONAL INFORMATION</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
                  <LegacyField label="Name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required />
                  <LegacyField label="Contact Address" value={form.contactAddress} onChange={(event) => setForm((current) => ({ ...current, contactAddress: event.target.value }))} multiline rows={2} required />
                  <LegacyField label="Status" value={form.serviceStatus} onChange={(event) => setForm((current) => ({ ...current, serviceStatus: event.target.value }))} options={[{ value: "active", label: "Active" }, { value: "dismissed", label: "Dismissed" }, { value: "retired", label: "Retired" }]} required />
                  <LegacyField label="Age" type="number" value={form.age} onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))} required />
                  <LegacyField label="Place of birth" value={form.placeOfBirth} onChange={(event) => setForm((current) => ({ ...current, placeOfBirth: event.target.value }))} />
                  <LegacyField label="Gender" value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }]} required />
                  <LegacyField label="Height" value={form.height} onChange={(event) => setForm((current) => ({ ...current, height: event.target.value }))} />
                  <LegacyField label="Blood group" value={form.bloodGroup} onChange={(event) => setForm((current) => ({ ...current, bloodGroup: event.target.value }))} />
                  <LegacyField label="Genotype" value={form.genotype} onChange={(event) => setForm((current) => ({ ...current, genotype: event.target.value }))} />
                  <LegacyField label="School/Occupation" value={form.schoolOccupation} onChange={(event) => setForm((current) => ({ ...current, schoolOccupation: event.target.value }))} />
                  <LegacyField label="State of Origin" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} options={NIGERIAN_STATES.map((state) => ({ value: state, label: state }))} required />
                  <LegacyField label="Home Town" value={form.homeTown} onChange={(event) => setForm((current) => ({ ...current, homeTown: event.target.value }))} />
                  <LegacyField label="Local Govt Area" value={form.lga} onChange={(event) => setForm((current) => ({ ...current, lga: event.target.value }))} options={(LGA_OPTIONS[form.state] || []).map((lga) => ({ value: lga, label: lga }))} required />
                  <LegacyField label="Phone No 1" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
                  <LegacyField label="Phone No 2" value={form.phone2} onChange={(event) => setForm((current) => ({ ...current, phone2: event.target.value }))} />
                  <LegacyField label="Email address" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
                  <LegacyField label="Email address 2" type="email" value={form.email2} onChange={(event) => setForm((current) => ({ ...current, email2: event.target.value }))} />
                  <LegacyField label="Service No" value={form.serviceNumber} onChange={(event) => setForm((current) => ({ ...current, serviceNumber: event.target.value }))} />
                  <LegacyField label="Department" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} required />
                </div>

                <div style={sectionTitle}>PARENT / GUARDIAN INFORMATION</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
                  <LegacyField label="Name of Parent" value={form.parentName} onChange={(event) => setForm((current) => ({ ...current, parentName: event.target.value }))} required />
                  <LegacyField label="Contact address" value={form.parentContactAddress} onChange={(event) => setForm((current) => ({ ...current, parentContactAddress: event.target.value }))} multiline rows={2} required />
                  <LegacyField label="Occupation" value={form.parentOccupation} onChange={(event) => setForm((current) => ({ ...current, parentOccupation: event.target.value }))} />
                  <LegacyField label="Phone No 1" value={form.parentPhone1} onChange={(event) => setForm((current) => ({ ...current, parentPhone1: event.target.value }))} required />
                  <LegacyField label="Phone No 2" value={form.parentPhone2} onChange={(event) => setForm((current) => ({ ...current, parentPhone2: event.target.value }))} />
                  <LegacyField label="Email address" type="email" value={form.parentEmail} onChange={(event) => setForm((current) => ({ ...current, parentEmail: event.target.value }))} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <LegacyField label="Parent/Guardian Signature" value={form.parentSignature} onChange={(event) => setForm((current) => ({ ...current, parentSignature: event.target.value }))} />
                    </div>
                    <button onClick={() => setForm(current => ({ ...current, parentSignature: current.parentName || current.fullName || current.parentSignature }))} style={{ height: 40, padding: '6px 10px', borderRadius: 8, border: '1px solid #c9952a', background: 'transparent', color: isLight ? '#c9952a' : '#ffd7a8', cursor: 'pointer', fontWeight: 700 }}>Use name</button>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ border: `1px dashed ${isLight ? "#cdbb98" : "rgba(255,255,255,0.2)"}`, borderRadius: 16, padding: 18, background: isLight ? "#fff" : "rgba(255,255,255,0.03)", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 4 }}>Passport</div>
                      <div style={{ color: t.muted, fontSize: 13 }}>Upload a recent passport photograph</div>
                    </div>
                    <div style={{ width: 18, height: 18, border: `1px solid ${isLight ? "#d6ccb6" : "rgba(255,255,255,0.2)"}`, borderRadius: 4, display: "grid", placeItems: "center", color: t.muted, fontSize: 11 }}>2</div>
                  </div>
                  <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                    <input type="file" accept="image/*" onChange={onPassportChange} />
                    {form.passportPhotoDataUrl ? (
                      <img src={form.passportPhotoDataUrl} alt="Passport preview" style={{ width: "100%", maxWidth: 220, height: 260, objectFit: "cover", borderRadius: 12, border: `1px solid ${isLight ? "#d6ccb6" : "rgba(255,255,255,0.2)"}` }} />
                    ) : (
                      <div style={{ width: "100%", maxWidth: 220, height: 260, borderRadius: 12, border: `1px solid ${isLight ? "#d6ccb6" : "rgba(255,255,255,0.2)"}`, display: "grid", placeItems: "center", color: t.muted, background: isLight ? "#f9f4e7" : "rgba(255,255,255,0.02)" }}>Passport</div>
                    )}
                  </div>
                </div>

                <div style={{ border: `1px solid ${isLight ? "#e0d3bc" : "rgba(255,255,255,0.08)"}`, borderRadius: 16, padding: 18, background: isLight ? "#fffefb" : "rgba(255,255,255,0.03)" }}>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Document Requirement</div>
                  <div style={{ color: t.muted, fontSize: 14, lineHeight: 1.8, display: "grid", gap: 12 }}>
                    <div>
                      <div style={{ marginBottom: 6 }}>A copy of Birth Certificate</div>
                      <input type="file" accept="image/*,application/pdf" onChange={onDocumentChange("birthCertificateDataUrl", "Birth certificate")} />
                      <div style={{ fontSize: 12, marginTop: 4, color: form.birthCertificateDataUrl ? "#16a34a" : t.muted }}>
                        {form.birthCertificateDataUrl ? "Uploaded" : "Not uploaded"}
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: 6 }}>A copy of School Leaving Certificate (minimum of O level) or awaiting</div>
                      <input type="file" accept="image/*,application/pdf" onChange={onDocumentChange("schoolCertificateDataUrl", "School leaving certificate")} />
                      <div style={{ fontSize: 12, marginTop: 4, color: form.schoolCertificateDataUrl ? "#16a34a" : t.muted }}>
                        {form.schoolCertificateDataUrl ? "Uploaded" : "Not uploaded"}
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: 6 }}>Attestation Letter (From a lawyer, Mosque or Church.)</div>
                      <input type="file" accept="image/*,application/pdf" onChange={onDocumentChange("attestationLetterDataUrl", "Attestation letter")} />
                      <div style={{ fontSize: 12, marginTop: 4, color: form.attestationLetterDataUrl ? "#16a34a" : t.muted }}>
                        {form.attestationLetterDataUrl ? "Uploaded" : "Not uploaded"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <GoldBtn onClick={submitUpdate} disabled={saving}>{saving ? "Submitting..." : "Submit Update"}</GoldBtn>
              <GoldBtn outline onClick={() => showToast("Draft retained on this device.")}>Save Draft</GoldBtn>
            </div>
          </div>
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
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [assessmentDraft, setAssessmentDraft] = useState({
    bloodGroup: "",
    genotype: "",
    urinaryTest: "",
    generalAptitudeScore: "",
    vocationalAptitudeScore: "",
    oralTestScore: "",
    paramilitaryRank: "",
    paramilitaryPost: "",
    serviceNumber: "",
    department: "",
    documentsPresented: "",
    remarks: "",
    eliteAdminOfficerName: "",
    eliteAdminOfficerPortfolio: "",
    eliteAdminOfficerSignatureDate: "",
    directorateName: "",
    directoratePortfolio: "",
    directorateSignatureDate: "",
  });


  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [applicants, setApplicants] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ email: "", name: "", password: "", confirm: "" });
  const [legacyClaims, setLegacyClaims] = useState([]);
  const [selectedLegacyClaimId, setSelectedLegacyClaimId] = useState(null);
  const [selectedLegacyClaim, setSelectedLegacyClaim] = useState(null);
  const [modalReadOnly, setModalReadOnly] = useState(true);
  const [claimStatusFilter, setClaimStatusFilter] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, review: 0, approved: 0, rejected: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [settings, setSettings] = useState(createDefaultSettings());
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
    const [selectedApplicantForQR, setSelectedApplicantForQR] = useState("");
    const [qrDataUrl, setQrDataUrl] = useState("");
    const [qrLoading, setQrLoading] = useState(false);
  const selectedApplicant = applicants.find((item) => item.id === selectedApplicantId) || null;

  useEffect(() => {
    if (!selectedApplicant) return;
    setAssessmentDraft({
      bloodGroup: selectedApplicant.bloodGroup || "",
      genotype: selectedApplicant.genotype || "",
      urinaryTest: selectedApplicant.urinaryTest || "",
      generalAptitudeScore: selectedApplicant.generalAptitudeScore || "",
      vocationalAptitudeScore: selectedApplicant.vocationalAptitudeScore || "",
      oralTestScore: selectedApplicant.oralTestScore || "",
      paramilitaryRank: selectedApplicant.paramilitaryRank || "",
      paramilitaryPost: selectedApplicant.paramilitaryPost || "",
      serviceNumber: selectedApplicant.serviceNumber || "",
      department: selectedApplicant.department || "",
      documentsPresented: selectedApplicant.documentsPresented || "",
      remarks: selectedApplicant.remarks || "",
      eliteAdminOfficerName: selectedApplicant.eliteAdminOfficerName || "",
      eliteAdminOfficerPortfolio: selectedApplicant.eliteAdminOfficerPortfolio || "",
      eliteAdminOfficerSignatureDate: selectedApplicant.eliteAdminOfficerSignatureDate || "",
      directorateName: selectedApplicant.directorateName || "",
      directoratePortfolio: selectedApplicant.directoratePortfolio || "",
      directorateSignatureDate: selectedApplicant.directorateSignatureDate || "",
    });
  }, [selectedApplicant?.id]);

  const loadApplicants = async (silent = false) => {
    try {
      const data = await adminAPI.getApplicants();
      setApplicants(data || []);
    } catch (err) {
      setApplicants([]);
      if (!silent) showToast("Failed to load applicants: " + err.message, "error");
    }
  };

  const loadAdminAnnouncements = async () => {
    try {
      const data = await adminAPI.getAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      setAnnouncements([]);
      showToast("Failed to load announcements: " + err.message, "error");
    }
  };

  const loadAdmins = async () => {
    try {
      const data = await adminAPI.getAdmins();
      setAdmins(data || []);
    } catch (err) {
      setAdmins([]);
      showToast("Failed to load admins: " + err.message, "error");
    }
  };

  const loadLegacyClaims = async (status = claimStatusFilter) => {
    try {
      const data = await adminAPI.getLegacyClaims(status);
      setLegacyClaims(data || []);
    } catch (err) {
      setLegacyClaims([]);
      showToast("Failed to load legacy claims: " + err.message, "error");
    }
  };

  useEffect(() => {
    let active = true;
    if (selectedLegacyClaimId === null) {
      setSelectedLegacyClaim(null);
      return;
    }

    const load = async () => {
      try {
        const data = await adminAPI.getLegacyClaim(selectedLegacyClaimId);
        if (!active) return;
        setSelectedLegacyClaim({ claim: data.claim, applicant: data.applicant, user: data.user });
      } catch (err) {
        const found = legacyClaims.find(c => c.id === selectedLegacyClaimId);
        setSelectedLegacyClaim(found ? { claim: found, applicant: null, user: null } : null);
      }
    };

    load();
    return () => { active = false; };
  }, [selectedLegacyClaimId]);

  const updateAdmin = async (id, partial) => {
    try {
      const updated = await adminAPI.updateAdmin(id, partial);
      setAdmins((cur) => cur.map(a => a.id === id ? { ...a, ...updated } : a));
      showToast("Admin updated.");
    } catch (err) {
      showToast("Failed to update admin: " + err.message, "error");
    }
  };

  const deleteAdminUser = async (id) => {
    if (!confirm("Delete this admin account? This cannot be undone.")) return;
    try {
      await adminAPI.deleteAdmin(id);
      setAdmins((cur) => cur.filter(a => a.id !== id));
      showToast("Admin deleted.");
    } catch (err) {
      showToast("Failed to delete admin: " + err.message, "error");
    }
  };

  const loadSettings = async () => {
    setLoadingSettings(true);
    try {
      const s = await adminAPI.getSettings();
      setSettings({
        ...createDefaultSettings(),
        ...s,
        manualPayment: {
          ...createDefaultSettings().manualPayment,
          ...(s?.manualPayment || {}),
        },
      });
    } catch (err) {
      showToast("Failed to load settings: " + err.message, "error");
    } finally {
      setLoadingSettings(false);
    }
  };

  const saveSettings = async (partial) => {
    try {
      const updated = await adminAPI.updateSettings(partial);
      setSettings(updated);
      showToast("Settings saved.");
    } catch (err) {
      showToast("Failed to save settings: " + err.message, "error");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const logs = await adminAPI.getAuditLogs(50);
      setAuditLogs(logs || []);
    } catch (err) {
      showToast("Failed to load audit logs: " + err.message, "error");
    }
  };

  const exportApplicants = async () => {
    try {
      const res = await adminAPI.exportApplicants();
      // apiCall with raw returns Response-like object; try to download
      if (res && typeof res === "string") {
        // fallback if server returned CSV string
        const blob = new Blob([res], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `applicants-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Export downloaded.");
        return;
      }
      if (res && res.blob) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `applicants-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Export downloaded.");
      } else {
        showToast("Export failed: unexpected response.", "error");
      }
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    }
  };

  const generateQRCode = async () => {
    if (!selectedApplicantForQR) {
      showToast("Please select an applicant", "error");
      return;
    }

    setQrLoading(true);
    try {
      const verificationUrl = `${window.location.origin}/?verify=${encodeURIComponent(selectedApplicantForQR)}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl);
      setQrDataUrl(qrDataUrl);
      showToast("QR code generated successfully");
    } catch (err) {
      showToast("Failed to generate QR code: " + err.message, "error");
      setQrDataUrl("");
    } finally {
      setQrLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${selectedApplicantForQR}-qr.png`;
    link.click();
    showToast("QR code downloaded");
  };

  const downloadAllQRCodes = async () => {
    setQrLoading(true);
    try {
      const [approvedApplicants, approvedLegacyClaims] = await Promise.all([
        Promise.resolve(applicants.filter(a => a.status === "approved")),
        adminAPI.getLegacyClaims("approved").catch(() => []),
      ]);

      const qrSources = [
        ...approvedApplicants.map((item) => ({
          applicantId: item.applicantId,
          fullName: item.fullName,
          label: "Applicant",
        })),
        ...approvedLegacyClaims.map((item) => ({
          applicantId: item.applicantId,
          fullName: item.fullName,
          label: "Aspirant",
        })),
      ].filter((item) => item.applicantId);

      const uniqueQrSources = Array.from(
        new Map(qrSources.map((item) => [item.applicantId, item])).values()
      );

      if (uniqueQrSources.length === 0) {
        showToast("No approved applicants or aspirants found", "error");
        setQrLoading(false);
        return;
      }

      // Dynamically import JSZip for client-side ZIP creation
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      
      for (const applicant of uniqueQrSources) {
        try {
          const verificationUrl = `${window.location.origin}/?verify=${encodeURIComponent(applicant.applicantId)}`;
          const qrDataUrl = await QRCode.toDataURL(verificationUrl);
          const base64Data = qrDataUrl.split(",")[1];
          const safeLabel = applicant.label.toLowerCase();
          zip.file(`${safeLabel}-${applicant.applicantId}-qr.png`, base64Data, { base64: true });
        } catch (err) {
          console.error(`Error generating QR for ${applicant.applicantId}:`, err);
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-codes-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("QR codes downloaded as ZIP");
    } catch (err) {
      showToast("Failed to download QR codes: " + err.message, "error");
    } finally {
      setQrLoading(false);
    }
  };

  const loadStats = async (silent = false) => {
    try {
      const data = await adminAPI.getStats();
      setStats({
        total: data.total || 0,
        pending: data.pending || 0,
        review: data.review || 0,
        approved: data.approved || 0,
        rejected: data.rejected || 0,
      });
    } catch (err) {
      setStats({ total: 0, pending: 0, review: 0, approved: 0, rejected: 0 });
      if (!silent) showToast("Failed to load stats: " + err.message, "error");
    }
  };

  const refreshOverviewData = async (silent = false) => {
    await Promise.all([loadApplicants(silent), loadStats(silent)]);
  };

  useEffect(() => {
    refreshOverviewData();
    loadAdmins();
    loadLegacyClaims(claimStatusFilter);

    const intervalId = window.setInterval(() => {
      refreshOverviewData(true);
    }, 5000);

    const onFocus = () => refreshOverviewData(true);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (tab === "overview" || tab === "applicants") {
      refreshOverviewData(true);
    }
  }, [tab]);

  useEffect(() => {
    loadAdminAnnouncements();
    loadSettings();
  }, []);

  const updateStatus = async (id, status, extra = {}) => {
    try {
      const updated = await adminAPI.updateStatus(id, status, extra);
      setApplicants(a => a.map(ap => ap.id === id ? { ...ap, ...updated } : ap));
      await loadStats(true);
      showToast(`Applicant status updated to ${status}.`);
    } catch (err) {
      showToast("Failed to update status: " + err.message, "error");
    }
  };

  const updateServiceStatus = async (id, serviceStatus) => {
    try {
      await adminAPI.updateServiceStatus(id, serviceStatus);
      setApplicants(a => a.map(ap => ap.id === id ? { ...ap, serviceStatus } : ap));
      showToast(`Service status updated to ${serviceStatus}.`);
    } catch (err) {
      showToast("Failed to update service status: " + err.message, "error");
    }
  };

  const updateApplicantStatus = async (id, status) => {
    try {
      await adminAPI.updateStatus(id, status);
      setApplicants((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      showToast(`Applicant status updated to ${status}.`);
    } catch (err) {
      showToast("Failed to update applicant status: " + err.message, "error");
    }
  };

  const deleteApplicant = async (id) => {
    if (!confirm("Are you sure you want to delete this applicant? This action cannot be undone.")) return;
    try {
      await adminAPI.deleteApplicant(id);
      setApplicants((current) => current.filter((item) => item.id !== id));
      if (selectedApplicantId === id) setSelectedApplicantId(null);
      await loadStats(true);
      showToast("Applicant deleted successfully.");
    } catch (err) {
      showToast("Failed to delete applicant: " + err.message, "error");
    }
  };

  const saveAssessment = async () => {
    if (!selectedApplicant) {
      showToast("Select an applicant first.", "error");
      return;
    }
    try {
      const updated = await adminAPI.updateAssessment(selectedApplicant.id, assessmentDraft);
      setApplicants((current) => current.map((item) => item.id === selectedApplicant.id ? { ...item, ...updated } : item));
      showToast("Assessment saved.");
    } catch (err) {
      showToast("Failed to save assessment: " + err.message, "error");
    }
  };

  const printAssessment = () => {
    if (!selectedApplicant) {
      showToast("Select an applicant first.", "error");
      return;
    }
    window.print();
  };

  const publishAnnouncement = async () => {
    const title = announcement.title.trim();
    const body = announcement.body.trim();
    if (!title || !body) {
      showToast("Title and body are required.", "error");
      return;
    }

    try {
      await adminAPI.createAnnouncement(title, body);
      setAnnouncement({ title: "", body: "" });
      showToast("Announcement published.");
      await loadAdminAnnouncements();
    } catch (err) {
      showToast("Failed to publish announcement: " + err.message, "error");
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await adminAPI.deleteAnnouncement(id);
      showToast("Announcement deleted.");
      await loadAdminAnnouncements();
    } catch (err) {
      showToast("Failed to delete announcement: " + err.message, "error");
    }
  };

  const editAnnouncement = (ann) => {
    setAnnouncement({ title: ann.title, body: ann.body, id: ann.id });
    setEditingAnnouncementId(ann.id);
  };

  const updateAnnouncement = async () => {
    if (!announcement.title?.trim() || !announcement.body?.trim()) {
      showToast("Title and body are required.", "error");
      return;
    }
    try {
      await adminAPI.updateAnnouncement(announcement.id, announcement.title, announcement.body);
      setAnnouncement({ title: "", body: "" });
      setEditingAnnouncementId(null);
      showToast("Announcement updated.");
      await loadAdminAnnouncements();
    } catch (err) {
      showToast("Failed to update announcement: " + err.message, "error");
    }
  };

  const approveLegacyClaim = async (id) => {
    const note = prompt("Approval note (optional):", "");
    if (note === null) return;
    try {
      await adminAPI.approveLegacyClaim(id, note);
      await loadLegacyClaims(claimStatusFilter);
      showToast("Legacy claim approved.");
    } catch (err) {
      showToast("Failed to approve claim: " + err.message, "error");
    }
  };

  const rejectLegacyClaim = async (id) => {
    const note = prompt("Reason for rejection (optional):", "");
    if (note === null) return;
    try {
      await adminAPI.rejectLegacyClaim(id, note);
      await loadLegacyClaims(claimStatusFilter);
      showToast("Legacy claim rejected.");
    } catch (err) {
      showToast("Failed to reject claim: " + err.message, "error");
    }
  };

  const updateLegacyServiceNumber = async (id, currentValue = "") => {
    const next = prompt("Set legacy service number:", currentValue || "");
    if (next === null) return;
    try {
      await adminAPI.updateLegacyClaimServiceNumber(id, next);
      await loadLegacyClaims(claimStatusFilter);
      showToast("Legacy service number updated.");
    } catch (err) {
      showToast("Failed to update service number: " + err.message, "error");
    }
  };



  const filtered = applicants.filter(a =>
    a.applicantId.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.state.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    total: stats.total,
    pending: stats.pending,
    review: stats.review,
    approved: stats.approved,
    rejected: stats.rejected,
  };

  const recentApplications = applicants.slice(0, 5);

  const approvalRate = counts.total ? Math.round((counts.approved / counts.total) * 100) : 0;
  const rejectionRate = counts.total ? Math.round((counts.rejected / counts.total) * 100) : 0;
  const reviewRate = counts.total ? Math.round((counts.review / counts.total) * 100) : 0;
  const pendingRate = counts.total ? Math.round((counts.pending / counts.total) * 100) : 0;

  const stateCounts = applicants.reduce((acc, a) => {
    const key = a.state || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  legacyClaims.forEach((claim) => {
    const key = claim.state || claim.lastUnit || "Unknown";
    stateCounts[key] = (stateCounts[key] || 0) + 1;
  });

  const topStates = Object.entries(stateCounts)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const topStateMax = topStates[0]?.count || 0;

  const menuItems = [
    { id: "overview", icon: <BarChart />, label: "Overview" },
    { id: "applicants", icon: <UsersIcon />, label: "Applicants" },
    { id: "legacy-claims", icon: <ShieldIcon />, label: "Existing Claims" },
    { id: "administrators", icon: <ShieldIcon />, label: "Administrators" },
    { id: "announcements", icon: <BellIcon />, label: "Announcements" },
    { id: "analytics", icon: <TrendingUp />, label: "Analytics" },
    { id: "settings", icon: <Settings />, label: "Settings" },
  ];

  const S2 = {
    card: { background: surface, border: `1px solid ${surfaceBorder}`, borderRadius: 14, padding: 24 },
  };

  return (
    <div style={{ minHeight: "100vh", background: t.page, color: t.text, fontFamily: "'Segoe UI',sans-serif", display: "flex" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .admin-print-sheet, .admin-print-sheet * { visibility: visible !important; }
          .admin-print-sheet {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #fff !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
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
            <button key={m.id} onClick={() => { setTab(m.id); setSidebarOpen(false); }} style={{
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
                  { icon: "⏳", label: "Pending Admin Registrants", val: counts.pending, color: "#c9952a" },
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
                <div style={{ width: "100%", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "34%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {["Name", "State", "Date", "Status", "Action"].map((h, idx) => (
                          <th
                            key={h}
                            style={{
                              textAlign: idx === 4 ? "center" : "left",
                              whiteSpace: "nowrap",
                              padding: "10px",
                              color: faintText,
                              fontSize: 12,
                              fontWeight: 700,
                              borderBottom: `1px solid ${t.border}`,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentApplications.map(a => (
                        <tr key={a.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                          <td style={{ padding: "11px 10px", textAlign: "left", color: t.text, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 0 }}>{a.name}</td>
                          <td style={{ padding: "11px 10px", textAlign: "left", color: t.muted, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 0 }}>{a.state}</td>
                          <td style={{ padding: "11px 10px", textAlign: "left", color: t.muted, fontSize: 13, whiteSpace: "nowrap" }}>{a.date}</td>
                          <td style={{ padding: "11px 10px", textAlign: "left", whiteSpace: "nowrap" }}><StatusBadge s={a.status} /></td>
                          <td style={{ padding: "11px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                            <button onClick={() => { setTab("applicants"); setSelectedApplicantId(a.id); }} style={{
                              background: "none", border: "1px solid rgba(201,168,76,0.3)", color: "#c9952a",
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                            }}>Review</button>
                          </td>
                        </tr>
                      ))}
                      {recentApplications.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "16px 12px", color: t.muted, fontSize: 13, textAlign: "center" }}>
                            No applications yet.
                          </td>
                        </tr>
                      )}
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
                <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24 }}>All Applicants</h2>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.muted }}><Search /></div>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicants…"
                      style={{
                        background: isLight ? "#ffffff" : "rgba(255,255,255,0.05)", border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`,
                        borderRadius: 8, padding: "10px 14px 10px 40px", color: t.text, fontSize: 14, outline: "none", width: 220,
                      }} />
                  </div>
                  <GoldBtn onClick={() => showToast("Data exported as CSV!")} style={{ fontSize: 13, padding: "10px 18px" }}>
                    <Download /> Export
                  </GoldBtn>
                </div>
              </div>
              <div style={{ ...S2.card, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120, tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                        {[
                          { label: "#", width: 44 },
                          { label: "Applicant ID", width: 148 },
                          { label: "Name", width: 160 },
                          { label: "Email", width: 170 },
                          { label: "State", width: 90 },
                          { label: "Gender", width: 90 },
                          { label: "Date", width: 110 },
                          { label: "Status", width: 110 },
                          { label: "Service No.", width: 150 },
                          { label: "Department", width: 130 },
                          { label: "Service Status", width: 130 },
                          { label: "Actions", width: 170 },
                        ].map(h => (
                          <th key={h.label} style={{ textAlign: "left", padding: "10px 14px", color: "#64748b", fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${t.border}`, width: h.width, whiteSpace: "nowrap" }}>{h.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, idx) => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${t.border}`, cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = isLight ? "rgba(15,23,42,0.02)" : "rgba(255,255,255,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        onClick={e => {
                          // don't trigger when clicking controls inside the actions cell
                          if (e.target.closest('button, select, a')) return;
                          setSelectedApplicantId(a.id);
                        }}
                      >
                        <td style={{ padding: "12px 14px", color: "#64748b", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{APPLICANT_SERIAL_START + idx}</td>
                        <td style={{ padding: "12px 14px", color: "#c9952a", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.applicantId}</td>
                        <td style={{ padding: "12px 14px", color: t.text, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</td>
                        <td style={{ padding: "12px 14px", color: t.muted, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.email}</td>
                        <td style={{ padding: "12px 14px", color: t.muted, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.state}</td>
                        <td style={{ padding: "12px 14px", color: t.muted, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.gender}</td>
                        <td style={{ padding: "12px 14px", color: "#64748b", fontSize: 13, whiteSpace: "nowrap" }}>{a.date}</td>
                        <td style={{ padding: "12px 14px" }}><StatusBadge s={a.status} /></td>
                        <td style={{ padding: "12px 14px", color: t.text, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.serviceNumber || "-"}</td>
                        <td style={{ padding: "12px 14px", color: t.muted, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.department || "-"}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <select value={a.serviceStatus} onChange={e => updateServiceStatus(a.id, e.target.value)} style={{ background: isLight ? "#fff" : "#0d1b2a", border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`, borderRadius: 6, color: t.text, padding: "4px 8px", fontSize: 12, textTransform: "capitalize" }}>
                            {SERVICE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => {
                              const dept = prompt("Department for approved applicant (leave blank for General):", "General");
                              updateStatus(a.id, "approved", dept ? { department: dept } : {});
                            }} style={{
                              background: "rgba(76,175,80,0.15)", border: "1px solid rgba(76,175,80,0.3)", color: "#81c784",
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700,
                            }}>✓</button>
                            <button onClick={() => updateStatus(a.id, "rejected")} style={{
                              background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.25)", color: "#e57373",
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700,
                            }}>✗</button>
                            <button onClick={() => setSelectedApplicantId(a.id)} style={{
                              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: t.text,
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700,
                            }}>View</button>
                            <button onClick={() => deleteApplicant(a.id)} style={{
                              background: "rgba(244,67,54,0.1)", border: "1px solid rgba(244,67,54,0.25)", color: "#e57373",
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700,
                            }}>Delete</button>
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

                {selectedApplicant && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2,6,23,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={() => setSelectedApplicantId(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ width: 'calc(100% - 80px)', maxWidth: 1100, maxHeight: '90vh', overflow: 'auto', ...S2.card }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 800, color: t.text, fontSize: 18 }}>{selectedApplicant.fullName || selectedApplicant.name}</div>
                          <div style={{ color: t.muted, fontSize: 13 }}>Applicant ID: {selectedApplicant.applicantId}</div>
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: 'center' }}>
                          <button onClick={() => setSelectedApplicantId(null)} style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Close</button>
                          <GoldBtn outline onClick={printAssessment} style={{ padding: "10px 16px" }}>Print Result Sheet</GoldBtn>
                          <GoldBtn onClick={saveAssessment} style={{ padding: "10px 16px" }}>Save Assessment</GoldBtn>
                        </div>
                      </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginBottom: 14 }}>
                      <Select
                        light={isLight}
                        label="Application Status"
                        value={selectedApplicant.status || "pending"}
                        onChange={e => updateApplicantStatus(selectedApplicant.id, e.target.value)}
                        options={APPLICATION_STATUS_OPTIONS.map((status) => ({ value: status, label: status.replace(/_/g, " ") }))}
                      />
                      <Select
                        light={isLight}
                        label="Service Status"
                        value={selectedApplicant.serviceStatus || "active"}
                        onChange={e => updateServiceStatus(selectedApplicant.id, e.target.value)}
                        options={SERVICE_STATUS_OPTIONS.map((status) => ({ value: status, label: status }))}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
                      <Input light={isLight} label="Blood Group" value={assessmentDraft.bloodGroup} onChange={e => setAssessmentDraft(d => ({ ...d, bloodGroup: e.target.value }))} placeholder="e.g. O+" />
                      <Input light={isLight} label="Genotype" value={assessmentDraft.genotype} onChange={e => setAssessmentDraft(d => ({ ...d, genotype: e.target.value }))} placeholder="e.g. AA" />
                      <Input light={isLight} label="Urinary Test" value={assessmentDraft.urinaryTest} onChange={e => setAssessmentDraft(d => ({ ...d, urinaryTest: e.target.value }))} placeholder="e.g. Negative" />
                      <Input light={isLight} label="General Aptitude Test Score" value={assessmentDraft.generalAptitudeScore} onChange={e => setAssessmentDraft(d => ({ ...d, generalAptitudeScore: e.target.value }))} placeholder="e.g. 78/100" />
                      <Input light={isLight} label="Vocational Aptitude Test Score" value={assessmentDraft.vocationalAptitudeScore} onChange={e => setAssessmentDraft(d => ({ ...d, vocationalAptitudeScore: e.target.value }))} placeholder="e.g. 82/100" />
                      <Input light={isLight} label="Oral Test Score" value={assessmentDraft.oralTestScore} onChange={e => setAssessmentDraft(d => ({ ...d, oralTestScore: e.target.value }))} placeholder="e.g. 19/20" />
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <div style={{ color: t.muted, fontSize: 13, marginBottom: 10 }}>Accepted applicant posting details</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
                        <Input light={isLight} label="Service Number" value={assessmentDraft.serviceNumber || ""} readOnly placeholder="Auto-generated on approval" />
                        <Input light={isLight} label="Department" value={assessmentDraft.department || ""} onChange={e => setAssessmentDraft(d => ({ ...d, department: e.target.value }))} placeholder="e.g. General / Medical / Intelligence" />
                        <Input light={isLight} label="Assigned Rank" value={assessmentDraft.paramilitaryRank} onChange={e => setAssessmentDraft(d => ({ ...d, paramilitaryRank: e.target.value }))} placeholder="e.g. Recruit / Lance Corporal" />
                        <Input light={isLight} label="Assigned Post" value={assessmentDraft.paramilitaryPost} onChange={e => setAssessmentDraft(d => ({ ...d, paramilitaryPost: e.target.value }))} placeholder="e.g. Operations / Training Unit" />
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <Textarea light={isLight} label="Documents Presented" value={assessmentDraft.documentsPresented} onChange={e => setAssessmentDraft(d => ({ ...d, documentsPresented: e.target.value }))} rows={3} placeholder="List all documents presented by the applicant" />
                      <Textarea light={isLight} label="Remarks" value={assessmentDraft.remarks} onChange={e => setAssessmentDraft(d => ({ ...d, remarks: e.target.value }))} rows={3} placeholder="General remarks, observations, or decision notes" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginTop: 14 }}>
                      <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ fontWeight: 700, color: t.text, marginBottom: 10 }}>Elite Admin Officer</div>
                        <Input light={isLight} label="Name" value={assessmentDraft.eliteAdminOfficerName} onChange={e => setAssessmentDraft(d => ({ ...d, eliteAdminOfficerName: e.target.value }))} />
                        <Input light={isLight} label="Port-folio" value={assessmentDraft.eliteAdminOfficerPortfolio} onChange={e => setAssessmentDraft(d => ({ ...d, eliteAdminOfficerPortfolio: e.target.value }))} />
                        <Input light={isLight} label="Signature & Date" value={assessmentDraft.eliteAdminOfficerSignatureDate} onChange={e => setAssessmentDraft(d => ({ ...d, eliteAdminOfficerSignatureDate: e.target.value }))} placeholder="Sign and date" />
                      </div>
                      <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, padding: 14 }}>
                        <div style={{ fontWeight: 700, color: t.text, marginBottom: 10 }}>Directorate of Recruitment</div>
                        <Input light={isLight} label="Name" value={assessmentDraft.directorateName} onChange={e => setAssessmentDraft(d => ({ ...d, directorateName: e.target.value }))} />
                        <Input light={isLight} label="Port-folio" value={assessmentDraft.directoratePortfolio} onChange={e => setAssessmentDraft(d => ({ ...d, directoratePortfolio: e.target.value }))} />
                        <Input light={isLight} label="Signature & Date" value={assessmentDraft.directorateSignatureDate} onChange={e => setAssessmentDraft(d => ({ ...d, directorateSignatureDate: e.target.value }))} placeholder="Sign and date" />
                      </div>
                    </div>
                  </div>
                </div>
                )}

                <div className="admin-print-sheet" style={{ display: "none" }}>
                  {selectedApplicant && (
                    <div style={{ padding: 28, fontFamily: "Arial, sans-serif", color: "#111827" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, borderBottom: "2px solid #c9952a", paddingBottom: 14 }}>
                        <img src="/logo.png" alt="Civil Elite Service logo" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10 }} />
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>Civil Elite Service</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>Detailed Recruitment Result</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div><strong>Applicant ID:</strong> {selectedApplicant.applicantId}</div>
                        <div><strong>Full Name:</strong> {selectedApplicant.fullName || selectedApplicant.name}</div>
                        <div><strong>Blood Group:</strong> {selectedApplicant.bloodGroup || "Pending assessment"}</div>
                        <div><strong>Genotype:</strong> {selectedApplicant.genotype || "Pending assessment"}</div>
                        <div><strong>Urinary Test:</strong> {selectedApplicant.urinaryTest || "Pending assessment"}</div>
                        <div><strong>General Aptitude Test Score:</strong> {selectedApplicant.generalAptitudeScore || "Pending assessment"}</div>
                        <div><strong>Vocational Aptitude Test Score:</strong> {selectedApplicant.vocationalAptitudeScore || "Pending assessment"}</div>
                        <div><strong>Oral Test Score:</strong> {selectedApplicant.oralTestScore || "Pending assessment"}</div>
                        <div><strong>Documents Presented:</strong> {selectedApplicant.documentsPresented || "Pending assessment"}</div>
                        <div><strong>Remarks:</strong> {selectedApplicant.remarks || "Pending assessment"}</div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
                        <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8 }}>Elite Admin Officer</div>
                          <div style={{ marginBottom: 8 }}><strong>Name:</strong> {selectedApplicant.eliteAdminOfficerName || "Pending admin update"}</div>
                          <div style={{ marginBottom: 18 }}><strong>Port-folio:</strong> {selectedApplicant.eliteAdminOfficerPortfolio || "Pending admin update"}</div>
                          <div style={{ borderTop: "1px solid #111827", paddingTop: 8, fontSize: 13 }}>Signature &amp; Date: {selectedApplicant.eliteAdminOfficerSignatureDate || "________________"}</div>
                        </div>
                        <div style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8 }}>Directorate of Recruitment</div>
                          <div style={{ marginBottom: 8 }}><strong>Name:</strong> {selectedApplicant.directorateName || "Pending admin update"}</div>
                          <div style={{ marginBottom: 18 }}><strong>Port-folio:</strong> {selectedApplicant.directoratePortfolio || "Pending admin update"}</div>
                          <div style={{ borderTop: "1px solid #111827", paddingTop: 8, fontSize: 13 }}>Signature &amp; Date: {selectedApplicant.directorateSignatureDate || "________________"}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </div>
          )}

          {/* ─ EXISTING CLAIMS ─ */}
          {tab === "legacy-claims" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 4 }}>Existing Officer Claims</h2>
                  <div style={{ color: t.muted, fontSize: 14 }}>Review claims submitted by officers approved through physical forms.</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select
                    value={claimStatusFilter}
                    onChange={(e) => setClaimStatusFilter(e.target.value)}
                    style={{
                      background: isLight ? "#ffffff" : "#0d1b2a",
                      border: `1px solid ${isLight ? "#cbd5e1" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 8,
                      padding: "9px 12px",
                      color: t.text,
                      fontSize: 13,
                    }}
                  >
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <GoldBtn onClick={() => loadLegacyClaims(claimStatusFilter)} style={{ fontSize: 13, padding: "10px 16px" }}>Refresh</GoldBtn>
                </div>
              </div>

              <div style={{ ...S2.card, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1180, tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {["Name", "Email", "Phone", "Existing Service No.", "Unit", "Year", "Status", "Actions"].map((h) => (
                        <th key={h} style={{ textAlign: h === "Actions" ? "center" : "left", padding: "10px 10px", color: "#64748b", fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {legacyClaims.map((c) => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${t.border}`, cursor: 'pointer' }} onClick={(e) => { if (e.target.closest('button, select, a')) return; setSelectedLegacyClaimId(c.id); setModalReadOnly(true); }}>
                        <td style={{ padding: "12px 10px", color: t.text, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.fullName}</td>
                        <td style={{ padding: "12px 10px", color: t.muted, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</td>
                        <td style={{ padding: "12px 10px", color: t.muted, fontSize: 13 }}>{c.phone || "-"}</td>
                        <td style={{ padding: "12px 10px", color: c.legacyServiceNumber ? "#c9952a" : t.muted, fontSize: 13, fontWeight: 700 }}>{c.legacyServiceNumber || "Not provided"}</td>
                        <td style={{ padding: "12px 10px", color: t.muted, fontSize: 13 }}>{c.lastUnit || "-"}</td>
                        <td style={{ padding: "12px 10px", color: t.muted, fontSize: 13 }}>{c.approvalYear || "-"}</td>
                        <td style={{ padding: "12px 10px" }}><StatusBadge s={c.status} /></td>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this legacy claim? This action cannot be undone.')) return;
                                try {
                                  await adminAPI.deleteLegacyClaim(c.id);
                                  await loadLegacyClaims(claimStatusFilter);
                                  showToast('Legacy claim deleted.');
                                } catch (err) {
                                  showToast('Failed to delete claim: ' + err.message, 'error');
                                }
                              }}
                              style={{
                                background: "rgba(244,67,54,0.08)",
                                border: "1px solid rgba(244,67,54,0.25)",
                                color: "#e57373",
                                borderRadius: 6,
                                padding: "4px 10px",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => approveLegacyClaim(c.id)}
                              disabled={c.status === "approved"}
                              style={{
                                background: "rgba(76,175,80,0.15)",
                                border: "1px solid rgba(76,175,80,0.3)",
                                color: "#81c784",
                                borderRadius: 6,
                                padding: "4px 10px",
                                cursor: c.status === "approved" ? "not-allowed" : "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                opacity: c.status === "approved" ? 0.6 : 1,
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectLegacyClaim(c.id)}
                              disabled={c.status === "rejected"}
                              style={{
                                background: "rgba(244,67,54,0.1)",
                                border: "1px solid rgba(244,67,54,0.25)",
                                color: "#e57373",
                                borderRadius: 6,
                                padding: "4px 10px",
                                cursor: c.status === "rejected" ? "not-allowed" : "pointer",
                                fontSize: 11,
                                fontWeight: 700,
                                opacity: c.status === "rejected" ? 0.6 : 1,
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {legacyClaims.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: "#556" }}>No legacy claims found for this filter.</div>
                )}
              </div>
            </div>
          )}

            {selectedLegacyClaim && (
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(2,6,23,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200 }} onClick={() => setSelectedLegacyClaimId(null)}>
                <div onClick={e => e.stopPropagation()} style={{ width: 'calc(100% - 80px)', maxWidth: 1100, maxHeight: '90vh', overflow: 'auto', ...S2.card }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: t.text, fontSize: 18 }}>{selectedLegacyClaim.fullName}</div>
                      <div style={{ color: t.muted, fontSize: 13 }}>Claim ID: {selectedLegacyClaim.id}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button onClick={() => setSelectedLegacyClaimId(null)} style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Close</button>
                    </div>
                  </div>

                  <div style={{ padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ fontWeight: 800 }}>{selectedLegacyClaim.claim?.fullName || selectedLegacyClaim.user?.name || 'Claim'}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setModalReadOnly(r => !r)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: modalReadOnly ? 'transparent' : '#c9952a', color: modalReadOnly ? '#111' : '#000', cursor: 'pointer' }}>{modalReadOnly ? 'Edit' : 'View'}</button>
                        <button onClick={() => setSelectedLegacyClaimId(null)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: 'transparent', cursor: 'pointer' }}>Close</button>
                      </div>
                    </div>

                    <LegacyUpdateForm
                      user={selectedLegacyClaim.user || {}}
                      initialData={selectedLegacyClaim}
                      theme={isLight ? 'light' : 'dark'}
                      adminView={true}
                      readOnly={modalReadOnly}
                      onAdminSave={async (form) => {
                        try {
                          const payload = {
                            fullName: form.fullName,
                            email: form.email,
                            phone: form.phone,
                            state: form.state,
                            dob: form.dob || '',
                            legacyServiceNumber: form.serviceNumber || '',
                            lastUnit: form.lastUnit || '',
                            approvalYear: form.approvalYear || null,
                            adminNote: form.adminNote || '',
                          };
                          await adminAPI.updateLegacyClaim(selectedLegacyClaim.claim._id, payload);
                          await loadLegacyClaims(claimStatusFilter);
                          showToast('Claim updated.');
                          setSelectedLegacyClaimId(null);
                          setSelectedLegacyClaim(null);
                        } catch (err) {
                          showToast('Failed to update claim: ' + err.message, 'error');
                        }
                      }}
                    />

                    <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end' }}>
                      {selectedLegacyClaim.claim?.status === 'pending' && (
                        <>
                          <button onClick={() => approveLegacyClaim(selectedLegacyClaim.claim._id)} style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', color: '#81c784', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>Approve</button>
                          <button onClick={() => rejectLegacyClaim(selectedLegacyClaim.claim._id)} style={{ background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.25)', color: '#e57373', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }}>Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* ─ ADMINISTRATORS ─ */}
          {tab === "administrators" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24 }}>Administrators</h2>
                <div style={{ color: t.muted }}>Manage admin accounts</div>
              </div>

              <div style={{ ...S2.card, maxWidth: 760, marginBottom: 18 }}>
                <div style={{ color: "#c9952a", fontWeight: 700, marginBottom: 12 }}>Create New Administrator</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginBottom: 10 }}>
                  <Input light={isLight} label="Full name" value={newAdmin.name} onChange={e => setNewAdmin(d => ({ ...d, name: e.target.value }))} placeholder="Jane Doe" />
                  <Input light={isLight} label="Email" value={newAdmin.email} onChange={e => setNewAdmin(d => ({ ...d, email: e.target.value }))} placeholder="admin@example.com" />
                  <PasswordInput light={isLight} label="Password" value={newAdmin.password} onChange={e => setNewAdmin(d => ({ ...d, password: e.target.value }))} placeholder="••••••••" />
                  <PasswordInput light={isLight} label="Confirm password" value={newAdmin.confirm} onChange={e => setNewAdmin(d => ({ ...d, confirm: e.target.value }))} placeholder="••••••••" />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <GoldBtn onClick={async () => {
                    const email = (newAdmin.email || "").trim();
                    const name = (newAdmin.name || "").trim();
                    const password = newAdmin.password || "";
                    const confirm = newAdmin.confirm || "";
                    if (!email || !name || !password) { showToast("Please fill name, email and password", "error"); return; }
                    if (password !== confirm) { showToast("Passwords do not match", "error"); return; }
                    try {
                      const created = await adminAPI.createAdmin(email, name, password);
                      // refresh admin list
                      await loadAdmins();
                      setNewAdmin({ email: "", name: "", password: "", confirm: "" });
                      showToast("Administrator created successfully");
                    } catch (err) {
                      showToast("Failed to create admin: " + err.message, "error");
                    }
                  }}>
                    <Plus /> Create Admin
                  </GoldBtn>
                </div>
              </div>

              <div style={{ ...S2.card, overflowX: "auto", padding: 18 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860, tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 50 }} />
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: 140 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {["#", "Email", "Name", "Admin ID", "Status", "Registration", "Actions"].map(h => (
                        <th key={h} style={{ textAlign: h === "Actions" ? "center" : "left", padding: "10px 10px", color: "#64748b", fontSize: 12, fontWeight: 700, borderBottom: `1px solid ${t.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a, idx) => (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                        <td style={{ padding: "12px 10px", color: "#64748b", fontSize: 13 }}>{idx + 1}</td>
                        <td title={a.email} style={{ padding: "12px 10px", color: t.muted, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</td>
                        <td title={a.name} style={{ padding: "12px 10px", color: t.text, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</td>
                        <td title={a.adminId || "-"} style={{ padding: "12px 10px", color: "#c9952a", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.adminId || "-"}</td>
                        <td style={{ padding: "12px 10px", color: t.muted, fontSize: 13, textTransform: "capitalize", whiteSpace: "nowrap" }}>{a.serviceStatus || "active"}</td>
                        <td style={{ padding: "12px 10px", color: t.muted, fontSize: 13, textTransform: "capitalize", whiteSpace: "nowrap" }}>{a.registrationStatus || "approved"}</td>
                        <td style={{ padding: "12px 10px" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                            <button onClick={() => {
                              const newName = prompt("Edit name", a.name);
                              if (newName !== null) updateAdmin(a.id, { name: newName });
                            }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: t.text, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, lineHeight: 1.1 }}>Edit</button>
                            <button onClick={() => deleteAdminUser(a.id)} style={{ background: "rgba(244,67,54,0.08)", border: "1px solid rgba(244,67,54,0.2)", color: "#e57373", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, lineHeight: 1.1 }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {admins.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: "#556" }}>No administrators found</div>
                )}
              </div>
            </div>
          )}

          {/* ─ ANNOUNCEMENTS ─ */}
          {tab === "announcements" && (
            <div>
              <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Post Announcement</h2>
              <div style={{ ...S2.card, maxWidth: 600, marginBottom: 32 }}>
                <div style={{ color: "#c9952a", fontWeight: 700, marginBottom: 16 }}>{editingAnnouncementId ? "Edit Announcement" : "New Announcement"}</div>
                <Input light={isLight} label="Title" value={announcement.title} onChange={e => setAnnouncement(a => ({ ...a, title: e.target.value }))} placeholder="Announcement headline…" />
                <Textarea light={isLight} label="Body" value={announcement.body} onChange={e => setAnnouncement(a => ({ ...a, body: e.target.value }))} placeholder="Full announcement content…" rows={5} />
                <div style={{ display: "flex", gap: 10 }}>
                  <GoldBtn onClick={editingAnnouncementId ? updateAnnouncement : publishAnnouncement}>
                    <Plus /> {editingAnnouncementId ? "Update Announcement" : "Publish Announcement"}
                  </GoldBtn>
                  {editingAnnouncementId && (
                    <button onClick={() => { setAnnouncement({ title: "", body: "" }); setEditingAnnouncementId(null); }} style={{
                      padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(201,168,76,0.3)", background: "transparent",
                      color: "#c9952a", cursor: "pointer", fontSize: 14, fontWeight: 600
                    }}>Cancel</button>
                  )}
                </div>
              </div>
              <div style={{ ...S2.card }}>
                <div style={{ color: isLight ? "#9a6b1a" : "#e8d8a0", fontWeight: 700, marginBottom: 16 }}>Recent Announcements</div>
                {announcements.map((a) => (
                  <div key={a.id} style={{ padding: "14px 0", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, color: t.text }}>{a.title}</div>
                        <div style={{ color: t.muted, fontSize: 12, whiteSpace: "nowrap", marginLeft: 12 }}>
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                        </div>
                      </div>
                      <div style={{ color: t.muted, fontSize: 13, lineHeight: 1.6 }}>{a.body}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginLeft: 12, flexShrink: 0 }}>
                      <button onClick={() => editAnnouncement(a)} style={{
                        background: "none", border: "none", color: "#64b5f6", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 4
                      }}>Edit</button>
                      <button onClick={() => deleteAnnouncement(a.id)} style={{
                        background: "none", border: "none", color: "#e57373", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 4
                      }}>Delete</button>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div style={{ color: t.muted, fontSize: 13 }}>No announcements available.</div>
                )}
              </div>
            </div>
          )}

          {/* ─ ANALYTICS ─ */}
          {tab === "analytics" && (
            <div>
              <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Analytics Dashboard</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20, marginBottom: 28 }}>
                {[
                  { label: "Approval Rate", val: `${approvalRate}%`, sub: `${counts.approved} approved`, icon: "✅" },
                  { label: "Under Review", val: `${reviewRate}%`, sub: `${counts.review} in review`, icon: "🔍" },
                  { label: "Pending Admin Registrants", val: `${pendingRate}%`, sub: `${counts.pending} pending approval`, icon: "⏳" },
                  { label: "Rejected", val: `${rejectionRate}%`, sub: `${counts.rejected} rejected`, icon: "❌" },
                ].map(c => (
                  <div key={c.label} style={{ ...S2.card }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{c.icon}</div>
                    <div style={{ color: t.muted, fontSize: 12, marginBottom: 6 }}>{c.label}</div>
                    <div style={{ color: t.text, fontWeight: 800, fontSize: 28 }}>{c.val}</div>
                    <div style={{ color: t.muted, fontSize: 13, marginTop: 4 }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Visual bar chart */}
              <div style={{ ...S2.card }}>
                <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 20 }}>Applications by State</div>
                {topStates.length === 0 ? (
                  <div style={{ color: t.muted, fontSize: 13 }}>No state breakdown available yet.</div>
                ) : (
                  topStates.map(s => (
                    <div key={s.state} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: t.muted, fontSize: 13 }}>{s.state}</span>
                        <span style={{ color: "#c9952a", fontSize: 13, fontWeight: 700 }}>{s.count}</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                        <div style={{
                          width: topStateMax ? `${(s.count / topStateMax) * 100}%` : "0%",
                          height: "100%",
                          background: "linear-gradient(90deg,#c9952a,#f0c060)",
                          borderRadius: 999,
                          transition: "width 1s ease",
                        }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─ SETTINGS ─ */}
          {tab === "settings" && (
            <div>
              <h2 style={{ color: t.text, fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Admin Settings</h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20 }}>
                  <div style={{ ...S2.card }}>
                    <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 6 }}>Form Fee & Manual Payment</div>
                    <div style={{ color: t.muted, fontSize: 14, marginBottom: 12 }}>Set the fee and bank details applicants should use for manual payment.</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label style={{ color: t.muted, fontSize: 13 }}>Fee amount</label>
                      <input type="number" min="0" value={settings?.manualPayment?.feeAmount ?? 5000} onChange={e => setSettings(s => ({ ...s, manualPayment: { ...(s?.manualPayment || {}), feeAmount: Number(e.target.value) } }))} style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }} />
                      <label style={{ color: t.muted, fontSize: 13 }}>Bank name</label>
                      <input value={settings?.manualPayment?.bankName || ""} onChange={e => setSettings(s => ({ ...s, manualPayment: { ...(s?.manualPayment || {}), bankName: e.target.value } }))} placeholder="Bank name" style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }} />
                      <label style={{ color: t.muted, fontSize: 13 }}>Account name</label>
                      <input value={settings?.manualPayment?.accountName || ""} onChange={e => setSettings(s => ({ ...s, manualPayment: { ...(s?.manualPayment || {}), accountName: e.target.value } }))} placeholder="Account name" style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }} />
                      <label style={{ color: t.muted, fontSize: 13 }}>Account number</label>
                      <input value={settings?.manualPayment?.accountNumber || ""} onChange={e => setSettings(s => ({ ...s, manualPayment: { ...(s?.manualPayment || {}), accountNumber: e.target.value } }))} placeholder="Account number" style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }} />
                      <label style={{ color: t.muted, fontSize: 13 }}>Receipt requirement</label>
                      <textarea value={settings?.manualPayment?.receiptRequirement || ""} onChange={e => setSettings(s => ({ ...s, manualPayment: { ...(s?.manualPayment || {}), receiptRequirement: e.target.value } }))} placeholder="Come to camp with your receipt for verification." rows={3} style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}`, resize: "vertical" }} />
                      <GoldBtn onClick={() => saveSettings({ manualPayment: settings?.manualPayment })} style={{ padding: "8px 14px", marginTop: 8 }}>Save</GoldBtn>
                    </div>
                  </div>

                <div style={{ ...S2.card }}>
                  <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 6 }}>Export All Data</div>
                  <div style={{ color: t.muted, fontSize: 14, marginBottom: 12 }}>Download full applicant database as CSV</div>
                  <GoldBtn onClick={exportApplicants} style={{ padding: "8px 14px" }}>Export Now</GoldBtn>
                </div>

                <div style={{ ...S2.card }}>
                  <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 6 }}>QR Codes for ID Cards</div>
                  <div style={{ color: t.muted, fontSize: 14, marginBottom: 12 }}>Generate QR codes from applicant IDs (same as applicant portal).</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div>
                      <label style={{ color: t.muted, fontSize: 13, display: "block", marginBottom: 4 }}>Select Applicant</label>
                      <select
                        value={selectedApplicantForQR}
                        onChange={e => {
                          setSelectedApplicantForQR(e.target.value);
                          setQrDataUrl("");
                        }}
                        style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}`, width: "100%" }}
                      >
                        <option value="">-- Select an approved applicant --</option>
                        {[
                          ...applicants.filter(a => a.status === "approved").map(a => ({ ...a, label: "Applicant" })),
                          ...legacyClaims.filter(c => c.status === "approved").map(c => ({ ...c, label: "Aspirant" })),
                        ]
                          .filter(item => item.applicantId)
                          .reduce((acc, item) => {
                            if (!acc.some((existing) => existing.applicantId === item.applicantId)) acc.push(item);
                            return acc;
                          }, [])
                          .map(item => (
                            <option key={item.applicantId} value={item.applicantId}>
                              {item.label}: {item.fullName} ({item.applicantId})
                            </option>
                          ))}
                      </select>
                    </div>
                    <GoldBtn onClick={generateQRCode} disabled={qrLoading} style={{ padding: "8px 14px" }}>
                      {qrLoading ? "Generating..." : "Generate QR Code"}
                    </GoldBtn>
                    {qrDataUrl && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 12, background: "rgba(255,255,255,0.05)", borderRadius: 6 }}>
                        <img src={qrDataUrl} alt="QR Code" style={{ width: 150, height: 150, border: `2px solid ${t.border}`, borderRadius: 4 }} />
                        <GoldBtn onClick={downloadQRCode} style={{ padding: "6px 12px", fontSize: 12 }}>Download QR Code</GoldBtn>
                      </div>
                    )}
                    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 8, marginTop: 8 }}>
                      <div style={{ color: t.muted, fontSize: 12, marginBottom: 8 }}>Download QR codes for all approved applicants:</div>
                      <GoldBtn onClick={downloadAllQRCodes} disabled={qrLoading} style={{ padding: "8px 14px", width: "100%" }}>
                        {qrLoading ? "Downloading..." : "Download All QR Codes (ZIP)"}
                      </GoldBtn>
                    </div>
                  </div>
                </div>

                <div style={{ ...S2.card }}>
                  <div style={{ fontWeight: 700, color: isLight ? "#9a6b1a" : "#e8d8a0", marginBottom: 6 }}>Service Number & Application Settings</div>
                  <div style={{ color: t.muted, fontSize: 14, marginBottom: 12 }}>Configure service number structure, current year and batch, and open/close applications.</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <label style={{ color: t.muted, fontSize: 13 }}>Service Year</label>
                    <input type="number" value={settings?.serviceYear || new Date().getFullYear()} onChange={e => setSettings(s => ({ ...s, serviceYear: Number(e.target.value) }))} style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }} />
                    <label style={{ color: t.muted, fontSize: 13 }}>Batch Number</label>
                    <input type="number" min="1" value={settings?.serviceBatch || 1} onChange={e => setSettings(s => ({ ...s, serviceBatch: Number(e.target.value) }))} style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }} />
                    <label style={{ color: t.muted, fontSize: 13 }}>Prefix (e.g., CES)</label>
                    <input value={settings?.servicePrefix || 'CES'} onChange={e => setSettings(s => ({ ...s, servicePrefix: e.target.value }))} style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }} />
                    <label style={{ color: t.muted, fontSize: 13 }}>Number Padding (digits for batch & position)</label>
                    <input type="number" min="1" value={settings?.numberPadding ?? 2} onChange={e => setSettings(s => ({ ...s, numberPadding: Number(e.target.value) }))} style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }} />
                    <div>
                      <label style={{ color: t.muted, fontSize: 13, display: 'block' }}>Applications Open</label>
                      <select value={settings?.recruitmentOpen ? 'open' : 'closed'} onChange={e => setSettings(s => ({ ...s, recruitmentOpen: e.target.value === 'open' }))} style={{ padding: 8, borderRadius: 6, border: `1px solid ${t.border}` }}>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <GoldBtn onClick={() => saveSettings({ serviceYear: Number(settings?.serviceYear || new Date().getFullYear()), serviceBatch: Number(settings?.serviceBatch || 1), servicePrefix: settings?.servicePrefix || 'CES', numberPadding: Number(settings?.numberPadding || 2), recruitmentOpen: !!settings?.recruitmentOpen })} style={{ padding: "8px 14px", marginTop: 8 }}>Save</GoldBtn>
                  </div>
                </div>


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
  const initialVerifyApplicantId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("verify") || ""
    : "";
  const [page, setPage] = useState(initialVerifyApplicantId ? "verify" : "home"); // home | login | register | dashboard | verify
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  const isLight = theme === "light";
  const [userRegistry, setUserRegistry] = useState(() => loadUserRegistry());
  const [loading, setLoading] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installToastVisible, setInstallToastVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const pushSubscriptionAttemptedRef = useRef(false);
  const verifyApplicantId = initialVerifyApplicantId;

  useEffect(() => {
    saveUserRegistry(userRegistry);
  }, [userRegistry]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedInstalled = window.localStorage.getItem("ces_pwa_installed") === "1";
    const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    setIsInstalled(storedInstalled || displayModeStandalone);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setInstallAvailable(true);
    };

    const onAppInstalled = () => {
      window.localStorage.setItem("ces_pwa_installed", "1");
      setIsInstalled(true);
      setInstallAvailable(false);
      setInstallToastVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!installAvailable || isInstalled) return;
    const now = Date.now();
    const lastShown = Number(window.localStorage.getItem("ces_install_prompt_last") || 0);
    const intervalMs = 6 * 60 * 60 * 1000;
    if (now - lastShown < intervalMs) return;

    setInstallToastVisible(true);
    window.localStorage.setItem("ces_install_prompt_last", String(now));
    const timer = window.setTimeout(() => setInstallToastVisible(false), 9000);
    return () => window.clearTimeout(timer);
  }, [installAvailable, isInstalled]);

  useEffect(() => {
    const restoreSession = async () => {
      if (page === "verify") return;
      const token = tokenManager.getToken();
      if (!token) return;

      setLoading(true);
      try {
        const { user: userData } = await authAPI.me();

        if (!userData) throw new Error("No user in session");

        if (userData.role === "admin") {
          setUser({
            ...userData,
            role: "admin",
          });
          setPage("dashboard");
          return;
        }

        const email = (userData.email || "").toLowerCase().trim();
        const existing = userRegistry.find((item) => item.email === email);
        let nextUser = existing;

        if (!nextUser) {
          nextUser = {
            email,
            name: userData.name || email.split("@")[0],
            role: "applicant",
            applicantId: userData.applicantId,
            serviceStatus: userData.serviceStatus,
          };
          setUserRegistry((prev) => [...prev, nextUser]);
        }

        // enrich user with registration and applicant status (if available)
        let enriched = {
          ...nextUser,
          id: userData.id,
          legacyApproved: userData.legacyApproved || false,
          registrationStatus: userData.registrationStatus || "approved",
        };
        try {
          const profile = await applicantAPI.getProfile();
          if (profile && profile.status === "rejected") {
            enriched.rejected = true;
            enriched.applicantStatus = profile.status;
          }
        } catch (err) {
          // ignore profile errors
        }
        setUser(enriched);
        setPage("dashboard");
      } catch (e) {
        tokenManager.clearToken();
        setUser(null);
        setPage("home");
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [page]);

  useEffect(() => {
    const enablePushNotifications = async () => {
      if (typeof window === "undefined") return;
      if (pushSubscriptionAttemptedRef.current) return;
      if (page !== "dashboard" || !user?.id) return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      pushSubscriptionAttemptedRef.current = true;

      try {
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted") return;

        const { publicKey } = await authAPI.getPushPublicKey();
        if (!publicKey) return;

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlToUint8Array(publicKey),
          });
        }

        await authAPI.subscribePush(subscription.toJSON());
      } catch (error) {
        console.warn("Push subscription skipped:", error?.message || error);
      }
    };

    enablePushNotifications();
  }, [page, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      pushSubscriptionAttemptedRef.current = false;
    }
  }, [user?.id]);

  const handleAuth = async (authResult) => {
    setLoading(true);
    try {
      if (!authResult || !authResult.user || !authResult.token) {
        throw new Error("Missing auth result");
      }

      tokenManager.setToken(authResult.token);
      const userData = authResult.user;

      if (userData.role === "admin") {
        setUser({
          ...userData,
          name: userData.name,
          role: "admin",
          legacyApproved: userData.legacyApproved || false,
        });
        setPage("dashboard");
        return;
      }

      const email = (userData.email || "").toLowerCase().trim();
      const existing = userRegistry.find(item => item.email === email);
      let nextUser = existing;

      if (!nextUser) {
        nextUser = {
          email,
          name: userData.name || email.split("@")[0],
          role: "applicant",
          applicantId: userData.applicantId,
          serviceStatus: userData.serviceStatus,
        };
        setUserRegistry(prev => [...prev, nextUser]);
      }

      // enrich user with registration and applicant status (if available)
      let enriched = {
        ...nextUser,
        id: userData.id,
        legacyApproved: userData.legacyApproved || false,
        registrationStatus: userData.registrationStatus || "approved",
      };
      try {
        const profile = await applicantAPI.getProfile();
        if (profile && profile.status === "rejected") {
          enriched.rejected = true;
          enriched.applicantStatus = profile.status;
        }
      } catch (err) {
        // ignore
      }
      setUser(enriched);
      setPage("dashboard");
    } catch (error) {
      console.error("Auth error:", error);
      tokenManager.clearToken();
      setUser(null);
      setPage("login");
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = () => {
    tokenManager.clearToken();
    setUser(null);
    setPage("home");
  };

  const toggleTheme = () => setTheme(current => (current === "light" ? "dark" : "light"));
  const runInstallPrompt = async () => {
    if (!installPromptEvent) return;
    try {
      installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        window.localStorage.setItem("ces_pwa_installed", "1");
        setIsInstalled(true);
        setInstallAvailable(false);
        setInstallToastVisible(false);
      }
    } catch {
      // Ignore prompt errors
    }
  };

  if (page === "home") return <><LandingPage onNavigate={setPage} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /><FloatingHelpButton /></>;
  if (page === "verify") return <><VerificationPage applicantId={verifyApplicantId} onNavigate={setPage} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /><FloatingHelpButton /><InstallPromptWidget visible={installToastVisible} onInstall={runInstallPrompt} onDismiss={() => setInstallToastVisible(false)} enabled={installAvailable && !isInstalled} /></>;
  if (page === "login") return <><AuthPage key="auth-login" mode="login" onAuth={handleAuth} onNavigate={setPage} theme={theme} loading={loading} /><ThemeToggle theme={theme} onToggle={toggleTheme} /><FloatingHelpButton /><InstallPromptWidget visible={installToastVisible} onInstall={runInstallPrompt} onDismiss={() => setInstallToastVisible(false)} enabled={installAvailable && !isInstalled} /></>;
  if (page === "register") return <><AuthPage key="auth-register" mode="register" onAuth={handleAuth} onNavigate={setPage} theme={theme} loading={loading} /><ThemeToggle theme={theme} onToggle={toggleTheme} /><FloatingHelpButton /><InstallPromptWidget visible={installToastVisible} onInstall={runInstallPrompt} onDismiss={() => setInstallToastVisible(false)} enabled={installAvailable && !isInstalled} /></>;
  if (page === "dashboard" && user && tokenManager.isLoggedIn()) {
    if (user.role === "admin") {
      return <><AdminDashboard user={user} onLogout={handleLogout} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /><FloatingHelpButton /><InstallPromptWidget visible={installToastVisible} onInstall={runInstallPrompt} onDismiss={() => setInstallToastVisible(false)} enabled={installAvailable && !isInstalled} /></>;
    }

    // If the account or applicant profile was rejected, block access with a strong message
    if (user.registrationStatus === 'rejected' || user.rejected) {
      return <>
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: isLight ? '#fff6f6' : '#2a0a0a', padding: 24 }}>
          <div style={{ textAlign: 'center', maxWidth: 820 }}>
            <h1 style={{ fontSize: 48, marginBottom: 12, color: isLight ? '#b91c1c' : '#ff7b7b', fontWeight: 900 }}>ACCESS DENIED</h1>
            <p style={{ fontSize: 18, color: isLight ? '#7f1d1d' : '#ffb4b4', marginBottom: 20 }}>Your account has been rejected and you no longer have access to the dashboard. If you believe this is a mistake, please contact support.</p>
            <button onClick={handleLogout} style={{ padding: '12px 18px', borderRadius: 8, background: isLight ? '#b91c1c' : '#ff7b7b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Sign Out</button>
          </div>
        </div>
      </>;
    }

    if (user.legacyApproved) {
      return <><LegacyUpdateForm user={user} onLogout={handleLogout} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /><FloatingHelpButton /><InstallPromptWidget visible={installToastVisible} onInstall={runInstallPrompt} onDismiss={() => setInstallToastVisible(false)} enabled={installAvailable && !isInstalled} /></>;
    }

    return <><ApplicantDashboard user={user} onLogout={handleLogout} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /><FloatingHelpButton /><InstallPromptWidget visible={installToastVisible} onInstall={runInstallPrompt} onDismiss={() => setInstallToastVisible(false)} enabled={installAvailable && !isInstalled} /></>;
  }
  return <><LandingPage onNavigate={setPage} theme={theme} /><ThemeToggle theme={theme} onToggle={toggleTheme} /><FloatingHelpButton /><InstallPromptWidget visible={installToastVisible} onInstall={runInstallPrompt} onDismiss={() => setInstallToastVisible(false)} enabled={installAvailable && !isInstalled} /></>;
}
