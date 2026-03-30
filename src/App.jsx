import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, ComposedChart, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
// ── Palette & helpers ─────────────────────────────────────────────────────────
// Design System: "The Modern Hearth" — Roberts Family Finance
const COLORS = {
  // Surface hierarchy (tonal layering — no harsh borders)
  bg: "#f8fafb",
  surface: "#f8fafb",
  card: "#ffffff",                 // surface-container-lowest
  containerLow: "#f1f4f5",         // surface-container-low
  container: "#eaeef0",            // surface-container
  containerHigh: "#e4e9eb",        // surface-container-high
  containerHighest: "#dde4e6",     // surface-container-highest
  // Brand — Deep Teal primary
  primary: "#006788",
  primaryDim: "#005a77",
  primaryContainer: "#61cdfd",
  primaryFixed: "#51bfef",
  // Secondary — Coral / light blue container
  secondary: "#176684",
  secondaryContainer: "#c0e8ff",   // Next Bill Due card bg
  onSecondaryContainer: "#005975",
  // Tertiary — Indigo / mint (Shared Goal)
  tertiary: "#555b93",
  tertiaryContainer: "#babfff",
  onTertiaryContainer: "#33396f",
  // Sidebar — light with deep slate active
  sidebarBg: "#f8fafb",
  sidebarActive: "#4f6174",        // deep slate
  sidebarText: "#4f6174",
  // Semantic
  accent: "#006788",
  accentWarm: "#f59e0b",
  accentBlue: "#006788",
  accentPurple: "#555b93",
  danger: "#ac3149",
  warning: "#f97316",
  success: "#006788",
  // Typography
  text: "#2d3435",                 // on-surface
  subtext: "#596062",              // on-surface-variant
  muted: "#757c7e",                // outline
  // Inputs
  inputBg: "#f1f4f5",
  border: "rgba(172,179,181,0.15)", // ghost border (outline-variant @15%)
  // Shadows — long-soft ambient
  shadow: "0 12px 24px rgba(79,97,116,0.06)",
  shadowSm: "0 4px 12px rgba(79,97,116,0.04)",
};
const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pct = (val, total) => (total === 0 ? 0 : Math.min(100, (val / total) * 100));
const fmtDate = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
const renderMd = (text) => {
  const lines = (text || "").split("\n");
  const out = [];
  let listItems = [];
  const flushList = () => { if (listItems.length) { out.push(<ul key={`ul-${out.length}`} style={{ margin: "4px 0 4px 16px", padding: 0 }}>{listItems}</ul>); listItems = []; } };
  const inlineHtml = (s) => s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/`(.*?)`/g, "<code style='background:rgba(0,0,0,0.06);borderRadius:3px;padding:1px 4px;fontSize:0.9em'>$1</code>");
  lines.forEach((line, i) => {
    if (line.startsWith("- ") || line.startsWith("• ")) {
      listItems.push(<li key={i} style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: inlineHtml(line.slice(2)) }} />);
    } else if (line.startsWith("### ")) {
      flushList(); out.push(<p key={i} style={{ fontWeight: 700, fontSize: 14, margin: "10px 0 4px" }} dangerouslySetInnerHTML={{ __html: inlineHtml(line.slice(4)) }} />);
    } else if (line.startsWith("## ")) {
      flushList(); out.push(<p key={i} style={{ fontWeight: 800, fontSize: 15, margin: "12px 0 4px" }} dangerouslySetInnerHTML={{ __html: inlineHtml(line.slice(3)) }} />);
    } else if (line.trim() === "") {
      flushList(); out.push(<br key={i} />);
    } else {
      flushList(); out.push(<p key={i} style={{ margin: "0 0 4px", fontSize: 14, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: inlineHtml(line) }} />);
    }
  });
  flushList();
  return out;
};
// ── Initial data ──────────────────────────────────────────────────────────────
const DEMO_MONTH = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();
const INITIAL_INCOME = [
  { id: 1, label: "Primary Salary", amount: 5500, date: `${DEMO_MONTH}-01`, recurring: true },
  { id: 2, label: "Side Freelance", amount: 800, date: `${DEMO_MONTH}-15`, recurring: false },
];
const INITIAL_EXPENSES = [
  { id: 1, label: "Mortgage / Rent", amount: 1800, category: "Housing", date: `${DEMO_MONTH}-01`, fixed: true },
  { id: 2, label: "Electricity", amount: 120, category: "Utilities", date: `${DEMO_MONTH}-03`, fixed: true },
  { id: 3, label: "Groceries", amount: 280, category: "Food", date: `${DEMO_MONTH}-05`, fixed: false },
  { id: 4, label: "Netflix", amount: 18, category: "Entertainment", date: `${DEMO_MONTH}-02`, fixed: true },
  { id: 5, label: "Gas", amount: 95, category: "Transport", date: `${DEMO_MONTH}-07`, fixed: false },
  { id: 6, label: "Gym", amount: 45, category: "Health", date: `${DEMO_MONTH}-01`, fixed: true },
  { id: 7, label: "Dining out", amount: 140, category: "Food", date: `${DEMO_MONTH}-10`, fixed: false },
  { id: 8, label: "Car payment", amount: 380, category: "Transport", date: `${DEMO_MONTH}-05`, fixed: true },
  { id: 9, label: "Internet", amount: 70, category: "Utilities", date: `${DEMO_MONTH}-03`, fixed: true },
  { id: 10, label: "Clothing", amount: 95, category: "Personal", date: `${DEMO_MONTH}-12`, fixed: false },
];
const INITIAL_DEBTS = [
  { id: 1, label: "Credit Card A", balance: 3200, minPayment: 80, interest: 19.9 },
  { id: 2, label: "Student Loan", balance: 18500, minPayment: 210, interest: 5.5 },
  { id: 3, label: "Car Loan", balance: 12400, minPayment: 380, interest: 6.9 },
];
const INITIAL_GOALS = [
  { id: 1, category: "Food", limit: 400, label: "Grocery Budget" },
  { id: 2, category: "Entertainment", limit: 100, label: "Fun Money" },
  { id: 3, category: "Personal", limit: 150, label: "Personal Spend" },
];
const CATEGORIES = [
  { id: "Housing", label: "Housing" },
  { id: "Food", label: "Food & Groceries" },
  { id: "Utilities", label: "Utilities" },
  { id: "Transport", label: "Transportation" },
  { id: "Health", label: "Health & Medical" },
  { id: "Entertainment", label: "Entertainment" },
  { id: "Personal", label: "Personal Care" },
  { id: "Education", label: "Education" },
  { id: "Savings", label: "Savings & Investments" },
  { id: "Kids", label: "Kids & Family" },
  { id: "Subscriptions", label: "Subscriptions" },
  { id: "Other", label: "Other" },
];
const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const SPENDING_PLAN_GROUPS = [
  { catId: "Housing",       label: "Housing",                 icon: "home",               templateItems: ["Rent / Mortgage", "Furnishings / home upgrades"] },
  { catId: "Utilities",     label: "Utilities",               icon: "bolt",               templateItems: ["Electricity", "Water / sewer", "Gas", "Trash / recycling", "Internet", "Mobile phones"] },
  { catId: "Food",          label: "Food",                    icon: "restaurant",         templateItems: ["Groceries", "Dining out / takeout", "Coffee / snacks", "Meal prep / delivery services"] },
  { catId: "Transport",     label: "Transportation",          icon: "directions_car",     templateItems: ["Car payment(s)", "Gas / charging (EV)", "Insurance", "Maintenance & repairs", "Parking / tolls", "Public transportation / rideshare"] },
  { catId: "Health",        label: "Health & Wellness",       icon: "favorite",           templateItems: ["Health insurance", "Doctor visits / copays", "Medications", "Dental / vision", "Gym / fitness", "Mental health / therapy"] },
  { catId: "Kids",          label: "Kingdom (Kids)",          icon: "child_care",         templateItems: ["Childcare / daycare", "School tuition / fees", "Activities (sports, classes)", "Clothing & shoes", "Toys / entertainment", "Babysitting"] },
  { catId: "Personal",      label: "Personal Spending",       icon: "person",             templateItems: ["Clothing", "Grooming (haircuts, skincare)", "Subscriptions (Netflix, Spotify)", "Hobbies", "Personal care"] },
  { catId: "Entertainment", label: "Relationship / Lifestyle",icon: "celebration",        templateItems: ["Date nights", "Gifts (spouse, family, friends)", "Celebrations / holidays", "Experiences (trips, outings)"] },
  { catId: "Education",     label: "Work / Professional",     icon: "work",               templateItems: ["Courses / certifications", "Work clothes", "Tools / software", "Commuting extras", "Networking"] },
  { catId: "Other",         label: "Travel & Experiences",    icon: "flight",             templateItems: ["Flights", "Hotels", "Activities", "Travel food", "Travel insurance"] },
  { catId: "Savings",       label: "Giving",                  icon: "volunteer_activism", templateItems: ["Donations / charity", "Tithing", "Family support"] },
  { catId: "Subscriptions", label: "Subscriptions & Streaming", icon: "subscriptions",    templateItems: ["Netflix", "Spotify", "Amazon Prime", "Disney+", "YouTube Premium", "Apple services", "Google services", "Other streaming"] },
];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthKey = (year, month0) => `${year}-${String(month0 + 1).padStart(2,"0")}`;
const parseKey = (key) => { const [y,m] = key.split("-"); return { year: parseInt(y), month0: parseInt(m) - 1 }; };
const build12Months = (startKey) => {
  const { year, month0 } = parseKey(startKey);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, month0 + i, 1);
    return monthKey(d.getFullYear(), d.getMonth());
  });
};
// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }) {
  const p = pct(value, max);
  const barColor = p >= 100 ? COLORS.danger : p >= 80 ? COLORS.warning : color || COLORS.accent;
  return (
    <div style={{ background: COLORS.border, borderRadius: 99, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, background: barColor, height: "100%", borderRadius: 99, transition: "width .4s ease" }} />
    </div>
  );
}
// ── CategoryCard ──────────────────────────────────────────────────────────────
function CategoryCard({ name, spent, goal, color }) {
  const p = goal ? pct(spent, goal) : null;
  const borderColor =
    p === null ? COLORS.border :
    p >= 100 ? COLORS.danger :
    p >= 80  ? COLORS.warning :
    p <= 50  ? COLORS.success :
    COLORS.border;
  return (
    <div style={{
      background: COLORS.card,
      border: `1.5px solid ${borderColor}`,
      borderRadius: 14,
      padding: "14px 16px",
      transition: "border-color .3s ease",
      boxShadow: borderColor !== COLORS.border ? `0 0 12px ${borderColor}33` : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>{name}</span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.text }}>{fmt(spent)}</span>
      </div>
      {goal && (
        <>
          <ProgressBar value={spent} max={goal} color={color} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{ fontSize: 11, color: COLORS.muted }}>Limit: {fmt(goal)}</span>
            <span style={{ fontSize: 11, color: borderColor === COLORS.danger ? COLORS.danger : borderColor === COLORS.warning ? COLORS.warning : COLORS.success }}>
              {p.toFixed(0)}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: COLORS.card, borderRadius: 24, padding: 32, width: "100%",
        maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: COLORS.text, fontSize: 20, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: COLORS.containerHigh, border: "none", color: COLORS.subtext, borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
// ── Input helper ──────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 11, color: COLORS.subtext, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = {
  width: "100%", background: COLORS.containerLow, border: "none",
  borderRadius: 12, padding: "12px 16px", color: COLORS.text, fontSize: 14,
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", boxSizing: "border-box",
};
const selectStyle = { ...inputStyle, appearance: "none" };
const btnPrimary = {
  width: "100%", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDim})`,
  color: "#fff", border: "none", borderRadius: 12, padding: "14px",
  fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
};
// ── SmartAddModal ─────────────────────────────────────────────────────────────
function SmartAddModal({ onClose, onManualExpense, onManualIncome, onImportExpenses, onImportIncome }) {
  const [step, setStep] = useState("home"); // home | nl | upload | preview
  const [nlInput, setNlInput] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewItems, setPreviewItems] = useState([]);
  const [previewType, setPreviewType] = useState("expense"); // expense | income
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileRef = useRef();
  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsDataURL(file);
    });
  }
  // ── Natural language → entries ──
  const handleNL = async () => {
    if (!nlInput.trim()) return;
    setNlLoading(true);
    setNlError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a budget entry parser. Today is ${today}.
Parse this natural language entry into structured budget items.
Input: "${nlInput}"
Return ONLY valid JSON (no markdown) with this shape:
{
  "type": "expense" | "income" | "debt",
  "items": [
    {
      "label": "description",
      "amount": 0.00,
      "category": "one of: Housing|Food|Utilities|Transport|Health|Entertainment|Personal|Education|Savings|Kids|Other. Hints: daycare/childcare/diapers/preschool/baby/toys/school supplies → Kids; doctor/pharmacy/copay/hospital/prescription/dental/vision → Health; netflix/spotify/gym/movie/games → Entertainment; mortgage/rent → Housing",
      "date": "YYYY-MM-DD",
      "fixed": true | false,
      "recurring": true | false
    }
  ],
  "summary": "one sentence natural confirmation of what was parsed"
}
Examples:
- "spent $45 on lunch today" → expense, Food, today's date
- "got paid $2000 salary yesterday" → income, recurring true
- "paid $120 electricity bill" → expense, Utilities, fixed true
- "bought groceries $85 and gas $60" → two expense items
If unsure of category, default to Other. If unsure of fixed, default to false.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setPreviewItems(parsed.items.map((it, i) => ({ ...it, id: Date.now() + i, amount: parseFloat(it.amount) })));
      setPreviewType(parsed.type === "income" ? "income" : "expense");
      setStep("preview");
    } catch {
      setNlError("Couldn't parse that. Try something like: 'spent $45 on groceries' or 'paid $120 electricity bill'.");
    }
    setNlLoading(false);
  };
  // ── Document upload → entries ──
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadLoading(true);
    setUploadError("");
    try {
      const base64 = await fileToBase64(file);
      const isPDF = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      if (!isPDF && !isImage) { setUploadError("Please upload a JPG, PNG, or PDF."); setUploadLoading(false); return; }
      const today = new Date().toISOString().slice(0, 10);
      const mediaType = isPDF ? "application/pdf" : file.type;
      const docBlock = isPDF
        ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64 } }
        : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              docBlock,
              {
                type: "text",
                text: `Today is ${today}. This is a receipt, bill, bank statement, or financial document.
Extract ALL individual line items or transactions. Return ONLY valid JSON (no markdown):
{
  "type": "expense" | "income",
  "documentDescription": "brief description of the document",
  "items": [
    {
      "label": "item description",
      "amount": 0.00,
      "category": "Housing|Food|Utilities|Transport|Health|Entertainment|Personal|Education|Savings|Kids|Other (Kids=daycare/childcare/diapers/baby/school; Health=doctor/pharmacy/copay/dental)",
      "date": "YYYY-MM-DD",
      "fixed": false,
      "recurring": false
    }
  ]
}
If this looks like income (payslip, bank deposit), set type to "income". Otherwise "expense".
If date not visible, use today. If unsure of category, use Other.`
              }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setPreviewItems(parsed.items.map((it, i) => ({ ...it, id: Date.now() + i, amount: parseFloat(it.amount) })));
      setPreviewType(parsed.type === "income" ? "income" : "expense");
      setStep("preview");
    } catch {
      setUploadError("Couldn't read that document. Try a clearer photo or different file.");
    }
    setUploadLoading(false);
  };
  const removeItem = (id) => setPreviewItems(prev => prev.filter(x => x.id !== id));
  const updateItem = (id, field, value) => setPreviewItems(prev => prev.map(x => x.id === id ? { ...x, [field]: field === "amount" ? parseFloat(value) || 0 : value } : x));
  const confirmImport = () => {
    if (previewType === "income") onImportIncome(previewItems);
    else onImportExpenses(previewItems);
  };
  // ── Render ──
  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000099", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={step === "home" ? onClose : undefined}>
      <div style={{ background: COLORS.card, borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.14)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step !== "home" && (
              <button onClick={() => { setStep("home"); setNlInput(""); setNlError(""); setUploadError(""); setPreviewItems([]); }}
                style={{ background: COLORS.containerHigh, border: "none", color: COLORS.subtext, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 14 }}>←</button>
            )}
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: COLORS.text, fontSize: 20, margin: 0 }}>
              {step === "home" && "Add Transaction"}
              {step === "nl" && "Describe It"}
              {step === "upload" && "Upload Document"}
              {step === "preview" && "Review & Import"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: COLORS.containerHigh, border: "none", color: COLORS.subtext, borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: "20px 28px 32px" }}>
          {/* ── HOME ── */}
          {step === "home" && (
            <div>
              <p style={{ fontSize: 14, color: COLORS.subtext, marginBottom: 20, lineHeight: 1.6 }}>
                How would you like to add entries?
              </p>
              {/* Action tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                <button onClick={onManualExpense} style={{
                  background: COLORS.containerLow, border: "none", borderRadius: 16, padding: "20px 12px",
                  cursor: "pointer", textAlign: "center", transition: "background .2s",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `rgba(0,103,136,0.1)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: COLORS.primary }}>shopping_bag</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.text, marginBottom: 2 }}>Expense</p>
                  <p style={{ fontSize: 11, color: COLORS.subtext, lineHeight: 1.4 }}>Add a cost</p>
                </button>
                <button onClick={onManualIncome} style={{
                  background: "rgba(192,232,255,0.4)", border: "none", borderRadius: 16, padding: "20px 12px",
                  cursor: "pointer", textAlign: "center", transition: "background .2s",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `rgba(23,102,132,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: COLORS.secondary }}>trending_up</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.text, marginBottom: 2 }}>Income</p>
                  <p style={{ fontSize: 11, color: COLORS.subtext, lineHeight: 1.4 }}>Add earnings</p>
                </button>
                <button onClick={() => { setStep("upload"); setTimeout(() => fileRef.current?.click(), 100); }} style={{
                  background: "rgba(186,191,255,0.3)", border: "none", borderRadius: 16, padding: "20px 12px",
                  cursor: "pointer", textAlign: "center", transition: "background .2s",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `rgba(85,91,147,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: COLORS.tertiary }}>receipt_long</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.text, marginBottom: 2 }}>Receipt</p>
                  <p style={{ fontSize: 11, color: COLORS.subtext, lineHeight: 1.4 }}>Scan a doc</p>
                </button>
              </div>
              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: COLORS.containerHighest }} />
                <span style={{ fontSize: 11, color: COLORS.muted }}>or describe in words</span>
                <div style={{ flex: 1, height: 1, background: COLORS.containerHighest }} />
              </div>
              <button onClick={() => setStep("nl")} style={{
                width: "100%", background: COLORS.containerLow, border: "none", borderRadius: 12, padding: "14px 16px",
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.primary }}>chat</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: COLORS.text, marginBottom: 2 }}>Natural Language</p>
                  <p style={{ fontSize: 12, color: COLORS.subtext }}>"Spent $85 on groceries and $40 on gas today"</p>
                </div>
              </button>
            </div>
          )}
          {/* ── NATURAL LANGUAGE ── */}
          {step === "nl" && (
            <div>
              <p style={{ fontSize: 14, color: COLORS.subtext, marginBottom: 16, lineHeight: 1.7 }}>
                Describe any transaction in plain English. Claude will extract and categorize everything automatically.
              </p>
              <div style={{ background: COLORS.containerLow, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>EXAMPLES</p>
                {[
                  "Spent $85 on groceries and $60 on gas today",
                  "Paid $1,200 rent and $110 electricity this week",
                  "Got $2,500 salary deposit yesterday",
                  "Netflix $18, Spotify $10, gym $45 this month",
                ].map((ex, i) => (
                  <p key={i} onClick={() => setNlInput(ex)} style={{ fontSize: 12, color: COLORS.primary, cursor: "pointer", marginBottom: 4, lineHeight: 1.5 }}>→ {ex}</p>
                ))}
              </div>
              <textarea
                autoFocus
                value={nlInput}
                onChange={e => setNlInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleNL(); }}
                placeholder="e.g. Spent $45 on lunch and $90 on groceries today…"
                rows={4}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.6, marginBottom: 12, fontSize: 14 }}
              />
              {nlError && (
                <div style={{ background: `rgba(172,49,73,0.08)`, border: `1px solid rgba(172,49,73,0.2)`, borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
                  <p style={{ color: COLORS.danger, fontSize: 12 }}>{nlError}</p>
                </div>
              )}
              <button onClick={handleNL} disabled={nlLoading || !nlInput.trim()} style={{ ...btnPrimary, background: nlLoading ? COLORS.border : COLORS.accentPurple, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {nlLoading ? (
                  <>
                    <div style={{ width: 14, height: 14, border: `2px solid #ffffff44`, borderTopColor: "#fff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    Claude is parsing…
                  </>
                ) : "✦ Parse with Claude"}
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pop-in { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } } @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }`}</style>
            </div>
          )}
          {/* ── UPLOAD ── */}
          {step === "upload" && (
            <div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleUpload} />
              {!uploadLoading && !uploadError && (
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${COLORS.accent}55`, borderRadius: 18, padding: "40px 24px", textAlign: "center", cursor: "pointer", background: COLORS.surface, marginBottom: 16 }}
                >
                  <p style={{ fontSize: 38, marginBottom: 10 }}>📄</p>
                  <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: COLORS.text }}>Tap to choose a file</p>
                  <p style={{ color: COLORS.muted, fontSize: 12 }}>Receipt · Bill · Bank statement · Payslip<br />JPG · PNG · PDF</p>
                </div>
              )}
              {uploadLoading && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ width: 40, height: 40, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 14px" }} />
                  <p style={{ color: COLORS.accent, fontSize: 13 }}>Claude is reading {uploadedFileName}…</p>
                  <p style={{ color: COLORS.muted, fontSize: 11, marginTop: 6 }}>Extracting and categorizing all line items</p>
                </div>
              )}
              {uploadError && (
                <div style={{ background: COLORS.danger + "18", border: `1px solid ${COLORS.danger}44`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <p style={{ color: COLORS.danger, fontSize: 13 }}>{uploadError}</p>
                  <button onClick={() => { setUploadError(""); fileRef.current?.click(); }} style={{ marginTop: 10, background: "none", border: `1px solid ${COLORS.muted}`, color: COLORS.muted, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>Try Again</button>
                </div>
              )}
              <p style={{ fontSize: 11, color: COLORS.muted, textAlign: "center", lineHeight: 1.6 }}>
                Claude AI will extract every line item and suggest categories. You'll review before anything is saved.
              </p>
            </div>
          )}
          {/* ── PREVIEW ── */}
          {step === "preview" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: COLORS.muted }}>
                  {previewItems.length} item{previewItems.length !== 1 ? "s" : ""} found · Edit before importing
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setPreviewType("expense")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700, border: `1px solid ${previewType === "expense" ? COLORS.accentWarm : COLORS.border}`, background: previewType === "expense" ? COLORS.accentWarm + "22" : "none", color: previewType === "expense" ? COLORS.accentWarm : COLORS.muted }}>Expense</button>
                  <button onClick={() => setPreviewType("income")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700, border: `1px solid ${previewType === "income" ? COLORS.accent : COLORS.border}`, background: previewType === "income" ? COLORS.accent + "22" : "none", color: previewType === "income" ? COLORS.accent : COLORS.muted }}>Income</button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                {previewItems.map(item => (
                  <div key={item.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <input
                        value={item.label}
                        onChange={e => updateItem(item.id, "label", e.target.value)}
                        style={{ ...inputStyle, flex: 1, marginRight: 10, padding: "7px 12px", fontSize: 13, fontWeight: 600, background: COLORS.inputBg }}
                      />
                      <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18, flexShrink: 0, lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>AMOUNT</p>
                        <input type="number" value={item.amount} onChange={e => updateItem(item.id, "amount", e.target.value)} style={{ ...inputStyle, padding: "6px 10px", fontSize: 13 }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>CATEGORY</p>
                        <select value={item.category} onChange={e => updateItem(item.id, "category", e.target.value)} style={{ ...selectStyle, padding: "6px 10px", fontSize: 12 }}>
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>DATE</p>
                        <input type="date" value={item.date} onChange={e => updateItem(item.id, "date", e.target.value)} style={{ ...inputStyle, padding: "6px 10px", fontSize: 12 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: `1px solid ${COLORS.border}`, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: previewType === "income" ? COLORS.accent : COLORS.accentWarm }}>
                  {fmt(previewItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
                </span>
              </div>
              <button onClick={confirmImport} disabled={previewItems.length === 0} style={{ ...btnPrimary, background: previewType === "income" ? COLORS.accent : COLORS.accentWarm, color: "#0a0a10" }}>
                ✓ Import {previewItems.length} Item{previewItems.length !== 1 ? "s" : ""} as {previewType === "income" ? "Income" : "Expenses"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [income, setIncome] = useState(INITIAL_INCOME);
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [debts, setDebts] = useState(INITIAL_DEBTS);
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [modal, setModal] = useState(null);
  const [goalInput, setGoalInput] = useState("");
  const [goalLoading, setGoalLoading] = useState(false);
  const [goalResponse, setGoalResponse] = useState("");
  const [advisorMsg, setAdvisorMsg] = useState("");
  const [advisorHistory, setAdvisorHistory] = useState([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const fileRef = useRef();
  const advisorFileRef = useRef();
  const [advisorFile, setAdvisorFile] = useState(null);
  const pendingAdvisorSend = useRef(false);
  const headerInputRef = useRef(null);
  const chatEndRef = useRef(null);
  // ── Dashboard extra state ──
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [viewMonthKey, setViewMonthKey] = useState(() => monthKey(new Date().getFullYear(), new Date().getMonth()));
  const [budgetStartDate, setBudgetStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [budgetEndDate, setBudgetEndDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10));
  const [startingBalance, setStartingBalance] = useState(0);
  const [showIncomeInCharts, setShowIncomeInCharts] = useState(true);
  // Bills are TEMPLATES — paid status is per-month in monthlySnapshots[mk].billStatus
  const [bills, setBills] = useState([
    { id: 1, label: "Mortgage", dayOfMonth: 25, budget: 600 },
    { id: 2, label: "Car", dayOfMonth: 1, budget: 100 },
    { id: 3, label: "Credit Card", dayOfMonth: 7, budget: 50 },
    { id: 4, label: "Gas", dayOfMonth: 12, budget: 50 },
    { id: 5, label: "Home Insurance", dayOfMonth: 15, budget: 25 },
    { id: 6, label: "Internet", dayOfMonth: 21, budget: 25 },
  ]);
  const [savingsItems, setSavingsItems] = useState([
    { id: 1, label: "House", expected: 300, actual: 400 },
    { id: 2, label: "Holiday", expected: 25, actual: 0 },
    { id: 3, label: "Emergency Fund", expected: 20, actual: 0 },
  ]);
  // viewExpenseBudgets is now per-month — derived from viewExpenseBudgets (see getSnap helpers)
  const [familyName, setFamilyName] = useState("Roberts Family");
  const [expenseCardPage, setExpenseCardPage] = useState(0);
  // Family Budget tab state
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editingDebtCell, setEditingDebtCell] = useState(null); // { id, field }
  const [editingSavingsCell, setEditingSavingsCell] = useState(null); // { id, field }
  const [expSortField, setExpSortField] = useState("date");
  const [expSortDir, setExpSortDir] = useState("asc");
  const [itemBudgets, setItemBudgets] = useState({});  // BUG #5: per-item planned amounts keyed by expense id or template label
  const [editingPlannedKey, setEditingPlannedKey] = useState(null); // id or template label being edited
  const [editingIncomeCell, setEditingIncomeCell] = useState(null); // { id, field } for income row editing
  const [payBillConfirm, setPayBillConfirm] = useState(null);      // BUG #3: bill awaiting pay confirmation
  const [activeBillDetail, setActiveBillDetail] = useState(null);  // BUG #10: bill detail popover
  const [billCalView, setBillCalView] = useState("month");          // BUG #11: month/list toggle
  const [addingSavingsId, setAddingSavingsId] = useState(null);    // BUG #24: inline savings input
  const [payExtraDebtId, setPayExtraDebtId] = useState(null);      // BUG #25: inline debt extra pay
  const [editingBillCell, setEditingBillCell] = useState(null);    // { id, field } for inline bill editing
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [savingsMode, setSavingsMode] = useState(null); // "add" | "remove"
  const [toggle5020, setToggle5020] = useState(false);
  const [toast5020, setToast5020] = useState("");
  const [billLinkToast, setBillLinkToast] = useState(false);
  const [newBillInline, setNewBillInline] = useState(null); // { label, budget, dayOfMonth } for inline add
  const pre5020Budgets = useRef(null);
  const pre5020Savings = useRef(null);
  // ── Refs for month-scoped data ──
  const prevMonthRef = useRef(viewMonthKey);
  const incomeRef = useRef(income);
  const expensesRef = useRef(expenses);
  incomeRef.current = income;
  expensesRef.current = expenses;
  // ── Monthly insights state ──
  const todayKey = monthKey(new Date().getFullYear(), new Date().getMonth());
  const [startMonthKey, setStartMonthKey] = useState("2025-01");
  const [activeInsightKey, setActiveInsightKey] = useState(todayKey);
  // monthlySnapshots: { [key]: { income: [], expenses: [], notes: string, billStatus: { [billId]: bool }, expenseBudgets: {} } }
  const DEFAULT_EXPENSE_BUDGETS = { Housing: 1800, Food: 500, Utilities: 300, Transport: 500, Health: 100, Entertainment: 150, Personal: 200, Education: 50, Subscriptions: 0, Other: 120 };
  const [monthlySnapshots, setMonthlySnapshots] = useState({
    "2025-01": { income: [{ id: 101, label: "Primary Salary", amount: 5500, recurring: true }], expenses: [{ id: 201, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 202, label: "Electricity", amount: 110, category: "Utilities", fixed: true },{ id: 203, label: "Groceries", amount: 320, category: "Food", fixed: false },{ id: 204, label: "Gas", amount: 80, category: "Transport", fixed: false }], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    "2025-02": { income: [{ id: 111, label: "Primary Salary", amount: 5500, recurring: true }], expenses: [{ id: 211, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 212, label: "Electricity", amount: 98, category: "Utilities", fixed: true },{ id: 213, label: "Groceries", amount: 290, category: "Food", fixed: false },{ id: 214, label: "Dining out", amount: 180, category: "Food", fixed: false },{ id: 215, label: "Gym", amount: 45, category: "Health", fixed: true }], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    "2025-03": { income: [{ id: 121, label: "Primary Salary", amount: 5500, recurring: true },{ id: 122, label: "Tax Refund", amount: 1200, recurring: false }], expenses: [{ id: 221, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 222, label: "Electricity", amount: 105, category: "Utilities", fixed: true },{ id: 223, label: "Groceries", amount: 340, category: "Food", fixed: false },{ id: 224, label: "Clothing", amount: 210, category: "Personal", fixed: false }], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    "2025-04": { income: [{ id: 131, label: "Primary Salary", amount: 5500, recurring: true }], expenses: [{ id: 231, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 232, label: "Utilities", amount: 115, category: "Utilities", fixed: true },{ id: 233, label: "Groceries", amount: 310, category: "Food", fixed: false },{ id: 234, label: "Entertainment", amount: 95, category: "Entertainment", fixed: false }], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    "2025-05": { income: [{ id: 141, label: "Primary Salary", amount: 5500, recurring: true },{ id: 142, label: "Side Freelance", amount: 600, recurring: false }], expenses: [{ id: 241, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 242, label: "Electricity", amount: 130, category: "Utilities", fixed: true },{ id: 243, label: "Groceries", amount: 295, category: "Food", fixed: false },{ id: 244, label: "Car payment", amount: 380, category: "Transport", fixed: true },{ id: 245, label: "Health", amount: 60, category: "Health", fixed: false }], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    "2025-06": { income: INITIAL_INCOME, expenses: INITIAL_EXPENSES, notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    [DEMO_MONTH]: { income: INITIAL_INCOME, expenses: INITIAL_EXPENSES, notes: "", billStatus: { 4: true }, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
  });
  // Sync live income/expenses into snapshots for the currently viewed month
  useEffect(() => {
    setMonthlySnapshots(prev => ({
      ...prev,
      [viewMonthKey]: { ...(prev[viewMonthKey] || { notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } }), income, expenses },
    }));
  }, [income, expenses, viewMonthKey]);
  // Month switch: save old month, load new month data
  useEffect(() => {
    const prevKey = prevMonthRef.current;
    if (prevKey === viewMonthKey) return;
    // Save current data to old month
    setMonthlySnapshots(prev => ({
      ...prev,
      [prevKey]: { ...(prev[prevKey] || { notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } }), income: incomeRef.current, expenses: expensesRef.current },
    }));
    // Load new month data
    const snap = monthlySnapshots[viewMonthKey];
    if (snap?.income?.length > 0 || snap?.expenses?.length > 0) {
      setIncome(snap.income || []);
      setExpenses(snap.expenses || []);
    } else {
      // Auto-populate: recurring income + fixed expenses from old month
      const newDate = `${viewMonthKey}-01`;
      const src = monthlySnapshots[prevKey] || { income: incomeRef.current, expenses: expensesRef.current };
      const recInc = (src.income || []).filter(i => i.recurring).map((i, idx) => ({ ...i, id: Date.now() + idx, date: newDate }));
      const fixExp = (src.expenses || []).filter(e => e.fixed).map((e, idx) => ({ ...e, id: Date.now() + 500 + idx, date: newDate }));
      setIncome(recInc);
      setExpenses(fixExp);
    }
    prevMonthRef.current = viewMonthKey;
  }, [viewMonthKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reset expense card pagination when viewing a different month
  useEffect(() => { setExpenseCardPage(0); }, [viewMonthKey]);
  // Auto-send when navigating to advisor tab from header search
  useEffect(() => {
    if (pendingAdvisorSend.current && tab === "advisor" && advisorMsg) {
      pendingAdvisorSend.current = false;
      handleAdvisor();
    }
  });
  // Auto-scroll chat to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [advisorHistory]);
  // Sync Monthly Insights expanded month when switching to insights tab
  useEffect(() => { if (tab === "insights") setActiveInsightKey(viewMonthKey); }, [tab]);
  // ── Hash-based URL routing ──
  const TAB_HASH = { dashboard: "overview", transactions: "family-budget", weekly: "bill-calendar", insights: "monthly-insights", advisor: "ai-assistant" };
  const HASH_TAB = Object.fromEntries(Object.entries(TAB_HASH).map(([k,v]) => [v,k]));
  const MONTH_SLUG = (mk) => { const { year, month0 } = parseKey(mk); return `${MONTH_FULL[month0].toLowerCase()}-${year}`; };
  const SLUG_MONTH = (slug) => { const parts = slug.split("-"); if (parts.length < 2) return null; const yr = parseInt(parts[parts.length - 1]); const mn = MONTH_FULL.findIndex(m => m.toLowerCase() === parts.slice(0, -1).join("-")); if (mn === -1 || isNaN(yr)) return null; return monthKey(yr, mn); };
  // On mount: read hash → set tab and month
  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, "");
      const parts = hash.split("/").filter(Boolean);
      if (parts.length === 0) return;
      const tabSlug = parts[0];
      const tabId = HASH_TAB[tabSlug];
      if (tabId) { setTab(tabId); }
      if (parts[1]) {
        const mk = SLUG_MONTH(parts[1]);
        if (mk) setViewMonthKey(mk);
      }
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // On tab/month change: update hash
  useEffect(() => {
    const slug = TAB_HASH[tab] || "overview";
    const monthPart = `/${MONTH_SLUG(viewMonthKey)}`;
    const newHash = `#/${slug}${monthPart}`;
    if (window.location.hash !== newHash) window.history.replaceState(null, "", newHash);
  }, [tab, viewMonthKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const twelveMonths = build12Months(startMonthKey);
  // All insight months: merge twelveMonths with every key in monthlySnapshots, sorted
  const allInsightMonths = (() => {
    const set = new Set([...twelveMonths, ...Object.keys(monthlySnapshots)]);
    return [...set].sort();
  })();
  // Get snapshot for a key (fallback empty)
  const getSnap = (key) => monthlySnapshots[key] || { income: [], expenses: [], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } };
  // ── Bill helpers (per-month paid status) ──
  const getBillDueDate = (bill, mk) => { const day = String(bill.dayOfMonth).padStart(2, "0"); return `${mk}-${day}`; };
  const getBillPaid = (bill, mk) => !!(monthlySnapshots[mk]?.billStatus?.[bill.id]);
  const markBillPaid = (billId, mk, paid = true) => setMonthlySnapshots(prev => ({ ...prev, [mk]: { ...(prev[mk] || { income: [], expenses: [], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } }), billStatus: { ...(prev[mk]?.billStatus || {}), [billId]: paid } } }));
  // ── Per-month expense budgets (Fix 9) ──
  const viewExpenseBudgets = monthlySnapshots[viewMonthKey]?.expenseBudgets || DEFAULT_EXPENSE_BUDGETS;
  const setViewExpenseBudgets = (updater) => setMonthlySnapshots(prev => {
    const oldBudgets = prev[viewMonthKey]?.expenseBudgets || DEFAULT_EXPENSE_BUDGETS;
    const newBudgets = typeof updater === "function" ? updater(oldBudgets) : updater;
    return { ...prev, [viewMonthKey]: { ...(prev[viewMonthKey] || { income: [], expenses: [], notes: "", billStatus: {} }), expenseBudgets: newBudgets } };
  });
  // ── Default date for modals (Fix 4) ──
  const getDefaultDate = (mk) => {
    const [yr, mo] = mk.split("-").map(Number);
    const now = new Date(); const ty = now.getFullYear(); const tm = now.getMonth() + 1;
    if (yr === ty && mo === tm) return now.toISOString().split("T")[0];
    if (yr > ty || (yr === ty && mo > tm)) return `${mk}-01`;
    const lastDay = new Date(yr, mo, 0).getDate();
    return `${mk}-${String(lastDay).padStart(2, "0")}`;
  };
  // Compute stats for any month key
  const monthStats = (key) => {
    const snap = getSnap(key);
    const inc = snap.income.reduce((s, i) => s + i.amount, 0);
    const exp = snap.expenses.reduce((s, e) => s + e.amount, 0);
    const cats = {};
    CATEGORIES.forEach(c => { cats[c.id] = snap.expenses.filter(e => e.category === c.id).reduce((s,e)=>s+e.amount,0); });
    return { inc, exp, net: inc - exp, cats, hasData: snap.income.length > 0 || snap.expenses.length > 0 };
  };
  const updateSnapNotes = (key, notes) => setMonthlySnapshots(prev => ({ ...prev, [key]: { ...getSnap(key), notes } }));
  // Claude insight for a month
  const [insightLoading, setInsightLoading] = useState({});
  const [insightText, setInsightText] = useState({});
  const generateInsight = async (key) => {
    const stats = monthStats(key);
    if (!stats.hasData) return;
    setInsightLoading(prev => ({ ...prev, [key]: true }));
    const { month0, year } = parseKey(key);
    const prevKey = monthKey(year, month0 - 1);
    const prevStats = monthStats(prevKey);
    try {
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 500,
          messages: [{ role: "user", content: `You are a friendly household budget analyst. Analyze this month's budget data and give 3-4 concise bullet-point insights (use • bullet symbol). Be specific with numbers. Keep it under 120 words total.
Month: ${MONTH_FULL[month0]} ${year}
Income: $${stats.inc}
Expenses: $${stats.exp}
Net: $${stats.net}
Category breakdown: ${JSON.stringify(stats.cats)}
${prevStats.hasData ? `Previous month income: $${prevStats.inc}, expenses: $${prevStats.exp}` : "No previous month data."}
Return plain text bullet points only, no headers.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      setInsightText(prev => ({ ...prev, [key]: text }));
    } catch {
      setInsightText(prev => ({ ...prev, [key]: "• Could not generate insights. Please try again." }));
    }
    setInsightLoading(prev => ({ ...prev, [key]: false }));
  };
  // ── Derived numbers ──
  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const fixedExpenses = expenses.filter(e => e.fixed).reduce((s, e) => s + e.amount, 0);
  const variableExpenses = totalExpenses - fixedExpenses;
  const leftover = totalIncome - totalExpenses;
  const debtPayments = debts.reduce((s, d) => s + d.minPayment, 0);
  // 50/30/20
  const needs = expenses.filter(e => ["Housing","Utilities","Transport","Health"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
  const wants = expenses.filter(e => ["Food","Entertainment","Personal","Education","Other"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
  const savings = expenses.filter(e => e.category === "Savings").reduce((s, e) => s + e.amount, 0);
  // category totals
  const catTotals = {};
  CATEGORIES.forEach(c => { catTotals[c.id] = expenses.filter(e => e.category === c.id).reduce((s,e)=>s+e.amount,0); });
  // weekly report helper
  const weeklyData = CATEGORIES.map(c => ({ name: c.label, amount: catTotals[c.id] })).filter(c => c.amount > 0);
  // ── Dashboard derived ──
  const billsBudgetTotal = bills.reduce((s, b) => s + b.budget, 0);
  const billsActualTotal = bills.reduce((s, b) => s + (getBillPaid(b, viewMonthKey) ? b.budget : 0), 0);
  const savingsExpectedTotal = savingsItems.reduce((s, i) => s + i.expected, 0);
  const savingsActualTotal = savingsItems.reduce((s, i) => s + i.actual, 0);
  const expenseBudgetTotal = Object.values(viewExpenseBudgets).reduce((s, v) => s + v, 0);
  const totalBudgeted = expenseBudgetTotal + billsBudgetTotal + savingsExpectedTotal;
  const totalSpent = totalExpenses + billsActualTotal + savingsActualTotal;
  const leftForBudgeting = totalIncome - totalBudgeted;
  const leftToSpend2 = totalBudgeted - totalSpent;
  const endingBalance = startingBalance + totalIncome - totalSpent;
  const CHART_COLORS = ["#f472b6","#60a5fa","#a78bfa","#fbbf24","#34d399","#fb923c","#4ade80","#c084fc","#38bdf8","#f97316"];
  const cashFlowData = [
    ...(showIncomeInCharts ? [{ name: "Income", value: totalIncome, color: "#4ade80" }] : []),
    { name: "Expenses", value: totalExpenses, color: "#f472b6" },
    { name: "Bills", value: billsActualTotal, color: "#c084fc" },
    { name: "Debt", value: debtPayments, color: "#facc15" },
    { name: "Savings", value: savingsActualTotal, color: "#34d399" },
  ].filter(d => d.value > 0);
  const budgetVsActualData = CATEGORIES.filter(c => (viewExpenseBudgets[c.id] || 0) > 0 || catTotals[c.id] > 0).map(c => ({
    name: c.label.slice(0, 5), Budget: viewExpenseBudgets[c.id] || 0, Actual: catTotals[c.id] || 0,
  }));
  const expBreakdownData = CATEGORIES.filter(c => catTotals[c.id] > 0).map((c, i) => ({
    name: c.label, value: catTotals[c.id], color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const dailyExpenseData = (() => {
    const map = {};
    expenses.forEach(e => { map[e.date] = (map[e.date] || 0) + e.amount; });
    const start = new Date(budgetStartDate), end = new Date(budgetEndDate);
    const days = Math.ceil((end - start) / 86400000) + 1;
    const dailyBudgetAmt = Math.round(totalIncome / days);
    const result = []; let d = new Date(start);
    while (d <= end) {
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key.slice(5), Expenses: map[key] || 0, "Daily Budget": dailyBudgetAmt });
      d = new Date(d.getTime() + 86400000);
    }
    return result;
  })();
  const balanceOverviewData = (() => {
    const expMap = {}, incMap = {};
    expenses.forEach(e => { expMap[e.date] = (expMap[e.date] || 0) + e.amount; });
    income.forEach(i => { incMap[i.date] = (incMap[i.date] || 0) + i.amount; });
    const start = new Date(budgetStartDate), end = new Date(budgetEndDate);
    const result = []; let d = new Date(start), running = startingBalance;
    while (d <= end) {
      const key = d.toISOString().slice(0, 10);
      running += (incMap[key] || 0) - (expMap[key] || 0);
      result.push({ date: key.slice(8), Balance: running });
      d = new Date(d.getTime() + 86400000);
    }
    return result;
  })();
  // ── Dashboard derived ──
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);
  // Next bill due — uses month-scoped bill data (getBillDueDate / getBillPaid)
  const unpaidSorted = bills.filter(b => !getBillPaid(b, viewMonthKey))
    .map(b => ({ ...b, _due: new Date(getBillDueDate(b, viewMonthKey)) }))
    .sort((a, b) => a._due - b._due);
  const nextBill = unpaidSorted.length > 0 ? unpaidSorted[0] : null;
  const daysUntilBill = nextBill ? Math.round((nextBill._due.getTime() - today0.getTime()) / 86400000) : null;
  const billsDueIn7Days = unpaidSorted.filter(b => { const diff = Math.round((b._due - today0) / 86400000); return diff >= 0 && diff <= 7; }).length;
  const catExpenseCards = Object.entries(catTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const totalBills = bills.reduce((s, b) => s + (b.budget || 0), 0);
  const totalDebtPayments = debts.reduce((s, d) => s + parseFloat(d.minPayment || 0), 0);
  const totalDebtBalance = debts.reduce((s, d) => s + parseFloat(d.balance || 0), 0);
  const spentPct = Math.round(pct(totalExpenses, totalIncome));
  const CATEGORY_ICONS = { Housing: "home", Food: "restaurant", Transport: "directions_car", Utilities: "bolt", Health: "medication", Entertainment: "movie", Personal: "person", Education: "school", Kids: "child_care", Subscriptions: "subscriptions", Other: "category" };
  const CATEGORY_ICON_BG = { Housing: "rgba(97,205,253,0.2)", Food: "rgba(192,232,255,0.3)", Transport: "rgba(186,191,255,0.3)", Utilities: "rgba(192,232,255,0.3)", Health: "rgba(186,191,255,0.3)", Entertainment: "rgba(186,191,255,0.3)", Personal: "rgba(186,191,255,0.3)", Education: "rgba(97,205,253,0.2)", Kids: "rgba(192,232,255,0.3)", Subscriptions: "rgba(186,191,255,0.3)", Other: "#eaeef0" };
  const CATEGORY_ICON_COLOR = { Housing: COLORS.primary, Food: COLORS.secondary, Transport: COLORS.tertiary, Utilities: COLORS.secondary, Health: COLORS.tertiary, Entertainment: COLORS.tertiary, Personal: COLORS.tertiary, Education: COLORS.primary, Kids: COLORS.secondary, Subscriptions: COLORS.tertiary, Other: COLORS.subtext };
  // ── View-month derived values (income/expenses are now always month-scoped) ──
  const viewExpenses = expenses;
  const viewIncome = income;
  const viewTotalExpenses = viewExpenses.reduce((s, e) => s + e.amount, 0);
  const viewTotalIncome = viewIncome.reduce((s, i) => s + i.amount, 0);
  const viewSpentPct = Math.round(pct(viewTotalExpenses, viewTotalIncome || 1));
  const viewCatTotals = CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: viewExpenses.filter(e => e.category === c.id).reduce((s, e) => s + e.amount, 0) }), {});
  const viewCatExpenseCards = Object.entries(viewCatTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  // ── Add forms state ──
  const [newExp, setNewExp] = useState({ label: "", amount: "", category: "Food", date: getDefaultDate(viewMonthKey), fixed: false });
  const [newInc, setNewInc] = useState({ label: "", amount: "", date: getDefaultDate(viewMonthKey), recurring: false });
  const [newDebt, setNewDebt] = useState({ label: "", balance: "", minPayment: "", interest: "" });
  const [newBill, setNewBill] = useState({ label: "", budget: "", dayOfMonth: "" });
  const addExpense = () => {
    if (!newExp.label || !newExp.amount) return;
    if (editingExpenseId) {
      updateExpenseField(editingExpenseId, "label", newExp.label);
      updateExpenseField(editingExpenseId, "amount", parseFloat(newExp.amount));
      updateExpenseField(editingExpenseId, "category", newExp.category);
      updateExpenseField(editingExpenseId, "date", newExp.date);
      updateExpenseField(editingExpenseId, "fixed", newExp.fixed);
      setEditingExpenseId(null);
    } else {
      setExpenses(prev => [...prev, { ...newExp, id: Date.now(), amount: parseFloat(newExp.amount) }]);
    }
    setNewExp({ label: "", amount: "", category: "Food", date: getDefaultDate(viewMonthKey), fixed: false });
    setModal(null);
  };
  const addIncome = () => {
    if (!newInc.label || !newInc.amount) return;
    setIncome(prev => [...prev, { ...newInc, id: Date.now(), amount: parseFloat(newInc.amount) }]);
    setNewInc({ label: "", amount: "", date: getDefaultDate(viewMonthKey), recurring: false });
    setModal(null);
  };
  const addDebt = () => {
    if (!newDebt.label || !newDebt.balance) return;
    setDebts(prev => [...prev, { ...newDebt, id: Date.now(), balance: parseFloat(newDebt.balance), minPayment: parseFloat(newDebt.minPayment)||0, interest: parseFloat(newDebt.interest)||0 }]);
    setNewDebt({ label: "", balance: "", minPayment: "", interest: "" });
    setModal(null);
  };
  const deleteExpenseFromView = (id) => setExpenses(prev => prev.filter(x => x.id !== id));
  const deleteIncomeFromView = (id) => setIncome(prev => prev.filter(x => x.id !== id));
  const updateIncomeField = (id, field, value) => setIncome(prev => prev.map(e => e.id === id ? { ...e, [field]: field === "amount" ? (parseFloat(value) || 0) : value } : e));
  const updateExpenseField = (id, field, value) => setExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: field === "amount" ? (parseFloat(value) || 0) : value } : e));
  const updateDebtField = (id, field, value) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, [field]: ["balance","minPayment","interest"].includes(field) ? (parseFloat(value)||0) : value } : d));
  };
  const updateSavingsField = (id, field, value) => {
    setSavingsItems(prev => prev.map(s => s.id === id ? { ...s, [field]: ["actual","expected"].includes(field) ? Math.max(0, parseFloat(value)||0) : value } : s));
  };
  // ── Claude: parse receipt/bill ──
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setParseLoading(true);
    setParseResult(null);
    try {
      const base64 = await fileToBase64(file);
      const isPDF = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      let contentBlocks = [];
      if (isPDF) {
        contentBlocks = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Extract all expense line items from this receipt/bill. Return ONLY a JSON array like: [{\"label\":\"...\",\"amount\":0.00,\"category\":\"Food\",\"date\":\"YYYY-MM-DD\"}]. Guess category from: Housing,Food,Utilities,Transport,Health,Entertainment,Personal,Other. If date missing use today. No markdown, just JSON array." }
        ];
      } else if (isImage) {
        contentBlocks = [
          { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
          { type: "text", text: "Extract all expense line items from this receipt/bill image. Return ONLY a JSON array like: [{\"label\":\"...\",\"amount\":0.00,\"category\":\"Food\",\"date\":\"YYYY-MM-DD\"}]. Guess category from: Housing,Food,Utilities,Transport,Health,Entertainment,Personal,Other. If date missing use today. No markdown, just JSON array." }
        ];
      } else {
        setParseResult({ error: "Please upload a PDF or image file." });
        setParseLoading(false);
        return;
      }
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: contentBlocks }] }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text||"").join("") || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const items = JSON.parse(clean);
      setParseResult({ items });
    } catch(err) {
      setParseResult({ error: "Could not parse file. Try a clearer image or PDF." });
    }
    setParseLoading(false);
  };
  const importParsedItems = (items) => {
    const toAdd = items.map(it => ({ ...it, id: Date.now() + Math.random(), amount: parseFloat(it.amount), fixed: false }));
    setExpenses(prev => [...prev, ...toAdd]);
    setParseResult(null);
    setUploadedFile(null);
  };
  // ── Claude: Goal ──
  const handleGoal = async () => {
    if (!goalInput.trim()) return;
    setGoalLoading(true);
    setGoalResponse("");
    try {
      const summary = JSON.stringify({ income: totalIncome, expenses: catTotals, goals });
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a household budget assistant. Current budget summary: ${summary}.
User goal request: "${goalInput}"
Parse this goal and respond in JSON ONLY (no markdown) with this shape:
{"message":"friendly confirmation message","newGoal":{"category":"FoodEtc","limit":400,"label":"label"},"tip":"one line tip"}
If the request doesn't map to a clear category goal, still return JSON with newGoal as null and message explaining why.`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b=>b.text||"").join("") || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setGoalResponse(parsed.message + (parsed.tip ? "\n\n💡 " + parsed.tip : ""));
      if (parsed.newGoal) {
        setGoals(prev => {
          const existing = prev.findIndex(g => g.category === parsed.newGoal.category);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], ...parsed.newGoal };
            return updated;
          }
          return [...prev, { ...parsed.newGoal, id: Date.now() }];
        });
      }
    } catch(err) {
      setGoalResponse("Sorry, couldn't process that goal. Try rephrasing.");
    }
    setGoalLoading(false);
    setGoalInput("");
  };
  // ── Claude: Advisor ──
  const handleAdvisor = async (msgOverride) => {
    const msgText = msgOverride !== undefined ? msgOverride : advisorMsg;
    if (!msgText.trim() && !advisorFile) return;
    const userMsg = msgText.trim();
    setAdvisorLoading(true);
    const { month0, year } = parseKey(viewMonthKey);
    const summary = `Family: ${familyName}. Month: ${MONTH_FULL[month0]} ${year}. Income: ${fmt(viewTotalIncome)}/mo. Expenses: ${fmt(viewTotalExpenses)}/mo. Net: ${fmt(viewTotalIncome - viewTotalExpenses)}. Category breakdown: ${JSON.stringify(viewCatTotals)}. Bills: ${JSON.stringify(bills.map(b => ({ label: b.label, due: getBillDueDate(b, viewMonthKey), amount: b.budget, paid: getBillPaid(b, viewMonthKey) })))}. Debts: ${JSON.stringify(debts.map(d => ({ label: d.label, balance: d.balance, apr: d.interest })))}. Savings goals: ${JSON.stringify(savingsItems)}. Budget goals: ${JSON.stringify(goals)}.`;

    let contentBlocks = [];
    if (advisorFile) {
      const base64 = await fileToBase64(advisorFile);
      if (advisorFile.type === "application/pdf") {
        contentBlocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } });
      } else if (advisorFile.type.startsWith("image/")) {
        contentBlocks.push({ type: "image", source: { type: "base64", media_type: advisorFile.type, data: base64 } });
      }
    }
    contentBlocks.push({ type: "text", text: `You are a friendly household financial advisor for the ${familyName}. Current budget data: ${summary}\n\nUser: ${userMsg || "Please review this document and give me advice."}` });
    const newHistory = [...advisorHistory, { role: "user", content: userMsg || "Review attached file" }];
    setAdvisorHistory(newHistory);
    setAdvisorMsg("");
    setAdvisorFile(null);
    try {
      // Preserve last 10 turns of conversation history
      const historyTurns = advisorHistory.slice(-10);
      const messages = [
        ...historyTurns.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: contentBlocks }
      ];
      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages }),
      });
      const data = await res.json();
      const reply = data.content?.map(b=>b.text||"").join("") || "No response.";
      setAdvisorHistory([...newHistory, { role: "assistant", content: reply }]);
    } catch {
      setAdvisorHistory([...newHistory, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    }
    setAdvisorLoading(false);
  };
  // ── File to base64 ──
  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsDataURL(file);
    });
  }
  // ── UI ──────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "transactions", label: "Transactions" },
    { id: "debts", label: "Debts" },
    { id: "weekly", label: "Weekly Report" },
    { id: "insights", label: "📅 Monthly Insights" },
    { id: "upload", label: "Upload Receipt" },
    { id: "advisor", label: "AI Advisor" },
  ];
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: COLORS.bg, color: COLORS.text, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #dde4e6; border-radius: 4px; }
        input, select, textarea { outline: none; font-family: 'Plus Jakarta Sans', sans-serif; }
        input::placeholder, textarea::placeholder { color: #757c7e; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; font-family: 'Material Symbols Outlined'; }
        .nav-item:hover { background: #f1f4f5 !important; opacity: 1 !important; }
        .exp-card:hover { transform: translateY(-2px); transition: transform 0.15s ease; }
      `}</style>

      {/* ── SIDEBAR — light, rounded-r-3xl ── */}
      <aside style={{ width: sidebarCollapsed ? 64 : 288, background: COLORS.sidebarBg, display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", borderRadius: "0 24px 24px 0", transition: "width 0.2s ease", overflow: "hidden" }}>
        {/* Family branding */}
        <div style={{ padding: sidebarCollapsed ? "20px 0" : "24px 24px 40px", display: "flex", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #006788, #005a77)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: COLORS.shadowSm }}>
              {familyName.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            {!sidebarCollapsed && <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.sidebarText, letterSpacing: "-0.02em", lineHeight: 1.2, whiteSpace: "nowrap" }}>{familyName}</h1>}
          </div>
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: sidebarCollapsed ? "0 8px" : "0 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { id: "dashboard",    label: "Overview",            icon: "dashboard" },
            { id: "transactions", label: "Family Budget",        icon: "payments" },
            { id: "weekly",       label: "Bill Calendar",        icon: "calendar_month" },
            { id: "insights",     label: "Monthly Insights",     icon: "bar_chart" },
            { id: "advisor",      label: "AI Assistant",         icon: "smart_toy" },
          ].map(item => (
            <button key={item.id} className="nav-item" onClick={() => setTab(item.id)} title={sidebarCollapsed ? item.label : undefined} style={{
              display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", gap: 12, padding: sidebarCollapsed ? "11px 0" : "11px 14px",
              background: tab === item.id ? COLORS.sidebarActive : "transparent",
              border: "none", borderRadius: 12,
              color: tab === item.id ? "#ffffff" : COLORS.sidebarText,
              fontSize: 14, fontWeight: 500,
              cursor: "pointer", textAlign: "left", width: "100%",
              opacity: tab === item.id ? 1 : 0.8,
              transition: "all 0.15s",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "inherit", flexShrink: 0 }}>{item.icon}</span>
              {!sidebarCollapsed && item.label}
            </button>
          ))}
        </nav>
        {/* Collapse toggle */}
        <div style={{ padding: sidebarCollapsed ? "8px 0" : "8px 16px", display: "flex", justifyContent: sidebarCollapsed ? "center" : "flex-end" }}>
          <button onClick={() => setSidebarCollapsed(p => !p)} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: COLORS.muted, display: "flex", alignItems: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{sidebarCollapsed ? "chevron_right" : "chevron_left"}</span>
          </button>
        </div>
        {/* Add Transaction CTA */}
        <div style={{ padding: sidebarCollapsed ? "12px 8px 28px" : "8px 16px 28px" }}>
          <button onClick={() => setModal("addMenu")} title={sidebarCollapsed ? "Add Transaction" : undefined} style={{
            width: "100%", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDim})`,
            border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600,
            padding: sidebarCollapsed ? "14px 0" : "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: sidebarCollapsed ? 0 : 8,
            boxShadow: COLORS.shadow,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            {!sidebarCollapsed && "Add Transaction"}
          </button>
        </div>
      </aside>

      {/* ── MAIN COLUMN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* TOP HEADER */}
        <header style={{ background: COLORS.bg, padding: "20px 32px 16px", display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
          {/* Month picker */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowMonthPicker(p => !p)} style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.card, border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 600, color: COLORS.text, cursor: "pointer", boxShadow: COLORS.shadowSm, flexShrink: 0 }}>
              {(() => { const { month0, year } = parseKey(viewMonthKey); return `${MONTH_FULL[month0]} ${year}`; })()}
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.subtext }}>expand_more</span>
            </button>
            {showMonthPicker && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, background: COLORS.card, borderRadius: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.12)", zIndex: 200, padding: 8, minWidth: 200, maxHeight: 320, overflowY: "auto" }}>
                {(() => {
                  const { month0: sm, year: sy } = parseKey(startMonthKey);
                  const endDate = new Date(); endDate.setMonth(endDate.getMonth() + 3);
                  const allMonths = [];
                  let cur = new Date(sy, sm, 1);
                  while (cur <= endDate) { allMonths.push(monthKey(cur.getFullYear(), cur.getMonth())); cur.setMonth(cur.getMonth() + 1); }
                  allMonths.reverse();
                  return allMonths.map(key => {
                    const { month0, year } = parseKey(key);
                    const isView = key === viewMonthKey;
                    const isCurrent = key === todayKey;
                    const snap = monthlySnapshots[key];
                    const hasData = snap && (snap.income.length > 0 || snap.expenses.length > 0);
                    return (
                      <button key={key} onClick={() => { setViewMonthKey(key); setShowMonthPicker(false); }} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "10px 14px", border: "none", borderRadius: 10,
                        background: isView ? `rgba(0,103,136,0.08)` : "transparent",
                        color: isView ? COLORS.primary : COLORS.text,
                        fontWeight: isView ? 700 : 500, fontSize: 14, cursor: "pointer",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span>{MONTH_FULL[month0]} {year}{isCurrent ? " (now)" : ""}</span>
                        {hasData && <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.primary, flexShrink: 0 }} />}
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>
          {/* AI Search bar */}
          <div style={{ flex: 1, maxWidth: 600, position: "relative" }}>
            <span className="material-symbols-outlined" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 20, color: COLORS.primary }}>smart_toy</span>
            <input
              ref={headerInputRef}
              placeholder="Ask AI Financial Assistant..."
              style={{ width: "100%", background: COLORS.containerLow, border: `2px solid rgba(0,103,136,0.1)`, borderRadius: 9999, padding: "10px 48px 10px 44px", fontSize: 14, color: COLORS.text }}
              onKeyDown={e => { if (e.key === "Enter" && e.target.value.trim()) { setAdvisorMsg(e.target.value.trim()); pendingAdvisorSend.current = true; setTab("advisor"); e.target.value = ""; } }}
            />
            <button onClick={() => { const v = headerInputRef.current?.value?.trim(); if (v) { setAdvisorMsg(v); pendingAdvisorSend.current = true; setTab("advisor"); headerInputRef.current.value = ""; } }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: "50%" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.primary }}>send</span>
            </button>
          </div>
          {/* Icons */}
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginLeft: "auto" }}>
            <button onClick={() => setModal("notifications")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, position: "relative" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: COLORS.sidebarText }}>notifications</span>
              {billsDueIn7Days > 0 && (
                <span style={{ position: "absolute", top: 0, right: 0, width: 16, height: 16, borderRadius: "50%", background: COLORS.danger, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{billsDueIn7Days}</span>
              )}
            </button>
            <button onClick={() => setModal("settings")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: COLORS.sidebarText }}>settings</span>
            </button>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div style={{ fontSize: 14, color: COLORS.text }}>
            {/* ── "Show me the Money!" spending capacity section ── */}
            <div style={{ background: COLORS.card, borderRadius: 12, padding: "32px", boxShadow: COLORS.shadow, marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.sidebarText, letterSpacing: "-0.02em", marginBottom: 4 }}>Show me the Money!</h2>
                  <p style={{ fontSize: 14, color: COLORS.subtext }}>Your overall spending capacity for {(() => { const { month0, year } = parseKey(viewMonthKey); return `${MONTH_FULL[month0]} ${year}`; })()}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: COLORS.subtext, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total Spending Power</p>
                  <p style={{ fontSize: 30, fontWeight: 800, color: COLORS.primary, letterSpacing: "-0.02em" }}>{fmt(viewTotalIncome)}</p>
                </div>
              </div>
              <div style={{ height: 16, background: COLORS.container, borderRadius: 9999, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ width: `${viewSpentPct}%`, height: "100%", background: COLORS.primary, borderRadius: 9999, transition: "width 0.5s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: COLORS.text }}>{fmt(viewTotalExpenses)}</span>
                  <span style={{ fontSize: 14, color: COLORS.subtext }}>of {fmt(viewTotalIncome)}</span>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `rgba(0,103,136,0.1)`, borderRadius: 9999, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: COLORS.primary }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>
                  {viewSpentPct}% spent
                </span>
              </div>
            </div>

            {/* Month-to-month comparison strip */}
            {(() => {
              const { year: vy2, month0: vm2 } = parseKey(viewMonthKey);
              const prevKey2 = monthKey(new Date(vy2, vm2 - 1, 1).getFullYear(), new Date(vy2, vm2 - 1, 1).getMonth());
              const prevS2 = monthStats(prevKey2);
              const currInc = viewTotalIncome, currExp = viewTotalExpenses;
              const expDiff = prevS2.hasData ? currExp - prevS2.exp : null;
              const incDiff = prevS2.hasData ? currInc - prevS2.inc : null;
              const netDiff = prevS2.hasData ? (currInc - currExp) - prevS2.net : null;
              const { month0: pm2 } = parseKey(prevKey2);
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 0, background: COLORS.card, borderRadius: 12, marginBottom: 20, boxShadow: COLORS.shadowSm, overflow: "hidden" }}>
                  {prevS2.hasData ? [
                    { label: "vs " + MONTH_NAMES[pm2] + " Income", val: incDiff, icon: "trending_up", invert: false },
                    { label: "vs " + MONTH_NAMES[pm2] + " Expenses", val: expDiff, icon: "receipt_long", invert: true },
                    { label: "vs " + MONTH_NAMES[pm2] + " Net", val: netDiff, icon: "account_balance", invert: false },
                  ].map((item, i) => {
                    const isGood = item.invert ? item.val < 0 : item.val >= 0;
                    const clr = item.val === 0 ? COLORS.muted : isGood ? COLORS.success : COLORS.danger;
                    return (
                      <div key={i} style={{ flex: 1, padding: "12px 20px", borderRight: i < 2 ? `1px solid ${COLORS.containerLow}` : "none", display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: clr }}>{item.val === 0 ? "trending_flat" : item.val > 0 ? "trending_up" : "trending_down"}</span>
                        <div>
                          <p style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{item.label}</p>
                          <p style={{ fontSize: 14, fontWeight: 800, color: clr }}>{item.val > 0 ? "+" : ""}{fmt(item.val)}</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.muted }}>insights</span>
                      <span style={{ fontSize: 13, color: COLORS.muted }}>No previous month data to compare</span>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* ── Net Worth / financial health strip ── */}
            {(() => {
              const netWorthVal = savingsActualTotal - totalDebt;
              const dti = totalIncome > 0 ? Math.round((totalDebt / totalIncome) * 100) : 0;
              const kwCards = [
                { label: "Net Worth", val: fmt(netWorthVal), color: netWorthVal >= 0 ? COLORS.success : COLORS.danger, icon: "account_balance_wallet" },
                { label: "Total Debt", val: fmt(totalDebt), color: COLORS.danger, icon: "credit_card" },
                { label: "Total Savings", val: fmt(savingsActualTotal), color: COLORS.accent, icon: "savings" },
                { label: "Debt-to-Income", val: `${dti}%`, color: dti > 200 ? COLORS.danger : dti > 100 ? COLORS.warning : COLORS.success, icon: "percent" },
              ];
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  {kwCards.map(k => (
                    <div key={k.label} style={{ background: COLORS.card, borderRadius: 12, padding: "16px 20px", boxShadow: COLORS.shadowSm, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: k.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: k.color }}>{k.icon}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{k.label}</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Bento grid — 12 columns */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 28, paddingBottom: 48 }}>
              {/* ── ROW 1, COL 1–4: Next Bill Due ── */}
              <div style={{ gridColumn: "span 4", background: COLORS.secondaryContainer, borderRadius: 12, padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 320 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ padding: 10, background: `rgba(0,89,117,0.1)`, borderRadius: 16 }}>
                      <span className="material-symbols-outlined" style={{ color: COLORS.onSecondaryContainer, fontSize: 28 }}>event_upcoming</span>
                    </div>
                    {daysUntilBill !== null && (
                      <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.onSecondaryContainer, opacity: 0.6 }}>
                        {daysUntilBill < 0 ? `OVERDUE ${Math.abs(daysUntilBill)}D` : daysUntilBill === 0 ? "DUE TODAY" : `DUE IN ${daysUntilBill} ${daysUntilBill === 1 ? "DAY" : "DAYS"}`}
                      </span>
                    )}
                  </div>
                  {nextBill ? (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 500, color: COLORS.onSecondaryContainer, marginBottom: 4 }}>Next Bill Due</p>
                      <h4 style={{ fontSize: 24, fontWeight: 700, color: COLORS.onSecondaryContainer, marginBottom: 8, lineHeight: 1.2 }}>{nextBill.label}</h4>
                      <p style={{ fontSize: 13, color: COLORS.onSecondaryContainer, opacity: 0.7, lineHeight: 1.5 }}>Ensure funds are available in your primary checking account.</p>
                    </>
                  ) : (
                    <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.onSecondaryContainer }}>All bills paid! 🎉</p>
                  )}
                </div>
                {nextBill && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: COLORS.onSecondaryContainer, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Amount Due</p>
                    <p style={{ fontSize: 36, fontWeight: 800, color: COLORS.onSecondaryContainer, marginBottom: 20, letterSpacing: "-0.02em" }}>{fmt(nextBill.budget)}</p>
                    {payBillConfirm?.id === nextBill.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ fontSize: 12, color: COLORS.onSecondaryContainer, textAlign: "center", opacity: 0.8 }}>Mark {nextBill.label} {fmt(nextBill.budget)} as paid?</p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setBills(p => p.map(b => b.id === nextBill.id ? { ...b, paid: true, actual: b.budget } : b)); setExpenses(p => [...p, { id: Date.now(), label: nextBill.label, amount: nextBill.budget, category: "Housing", date: todayKey + "-" + new Date().getDate().toString().padStart(2,"0"), fixed: true }]); setPayBillConfirm(null); }} style={{ flex: 1, background: COLORS.onSecondaryContainer, color: "#fff", border: "none", borderRadius: 9999, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                          <button onClick={() => setPayBillConfirm(null)} style={{ flex: 1, background: "rgba(0,89,117,0.15)", color: COLORS.onSecondaryContainer, border: "none", borderRadius: 9999, padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setPayBillConfirm(nextBill)}
                        style={{ width: "100%", background: COLORS.onSecondaryContainer, color: "#fff", border: "none", borderRadius: 9999, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: COLORS.shadowSm }}>
                        Pay Now
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── ROW 1, COL 5–12: Cash Flow Summary ── */}
              <div style={{ gridColumn: "span 8", position: "relative", overflow: "hidden", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDim})`, borderRadius: 12, padding: "40px", color: "#fff", boxShadow: COLORS.shadow, minHeight: 320 }}>
                <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)", marginBottom: 28 }}>Cash Flow Summary</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
                    {[
                      { label: "Expenses", amount: fmt(viewTotalExpenses), pctVal: pct(viewTotalExpenses, viewTotalIncome), badge: `${viewSpentPct}% of budget`, barColor: "#4ade80" },
                      { label: "Bills", amount: fmt(totalBills), pctVal: 100, badge: "100% committed", barColor: "rgba(255,255,255,0.9)" },
                      { label: "Debt", amount: fmt(totalDebtPayments), pctVal: pct(totalDebtPayments, totalDebtBalance || 1), badge: `${Math.round(pct(totalDebtPayments, totalDebtBalance || 1))}% of target`, barColor: "rgba(255,255,255,0.9)" },
                      { label: "Savings", amount: fmt(savingsActualTotal), pctVal: pct(savingsActualTotal, savingsExpectedTotal || 1), badge: `${Math.round(pct(savingsActualTotal, savingsExpectedTotal || 1))}% to goal`, barColor: "rgba(255,255,255,0.9)" },
                      { label: "Income", amount: fmt(viewTotalIncome), pctVal: 100, badge: null, barColor: "#4ade80" },
                    ].map(row => (
                      <div key={row.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
                            {row.label}
                            {row.badge && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.04em" }}>{row.badge}</span>}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{row.amount}</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 9999, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, row.pctVal)}%`, height: "100%", background: row.barColor, borderRadius: 9999 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── ROW 2: Spending by Category (full width) ── */}
              <div style={{ gridColumn: "span 12", background: COLORS.containerLow, borderRadius: 12, padding: "40px", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                  <div>
                    <h4 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>Spending by Category</h4>
                    <p style={{ fontSize: 14, color: COLORS.subtext }}>Track where our money goes as a family</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { dir: "prev", icon: "chevron_left", fn: () => setExpenseCardPage(p => Math.max(0, p - 1)) },
                        { dir: "next", icon: "chevron_right", fn: () => setExpenseCardPage(p => Math.min(Math.max(0, Math.ceil(viewCatExpenseCards.length / 3) - 1), p + 1)) },
                      ].map(btn => (
                        <button key={btn.dir} onClick={btn.fn} style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.card, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: COLORS.shadowSm, color: COLORS.primary }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{btn.icon}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setTab("transactions")} style={{ background: COLORS.card, border: "none", borderRadius: 9999, padding: "9px 20px", fontSize: 13, fontWeight: 700, color: COLORS.primary, cursor: "pointer", boxShadow: COLORS.shadowSm }}>
                      View All Transactions
                    </button>
                  </div>
                </div>
                {viewCatExpenseCards.length === 0 ? (
                  <p style={{ fontSize: 14, color: COLORS.muted }}>No expenses yet. Add a transaction to get started.</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
                    {viewCatExpenseCards.slice(expenseCardPage * 3, expenseCardPage * 3 + 3).map(([cat, amt]) => {
                      const topExpense = [...viewExpenses].filter(e => e.category === cat).sort((a, b) => b.amount - a.amount)[0];
                      const budgetPct = viewExpenseBudgets[cat] ? Math.round(pct(amt, viewExpenseBudgets[cat])) : null;
                      return (
                        <div key={cat} className="exp-card" style={{ background: COLORS.card, borderRadius: 12, padding: "24px", boxShadow: COLORS.shadowSm, cursor: "default" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: CATEGORY_ICON_BG[cat] || "#eaeef0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 24, color: CATEGORY_ICON_COLOR[cat] || COLORS.subtext }}>{CATEGORY_ICONS[cat] || "category"}</span>
                            </div>
                            <div>
                              <p style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>{cat}</p>
                              <p style={{ fontSize: 12, color: COLORS.subtext }}>{topExpense ? topExpense.label : "—"}</p>
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                            <span style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, letterSpacing: "-0.02em" }}>{fmt(amt)}</span>
                            <div style={{ textAlign: "right" }}>
                              {budgetPct !== null && (
                                <p style={{ fontSize: 10, fontWeight: 700, color: budgetPct > 100 ? COLORS.danger : budgetPct > 80 ? COLORS.warning : COLORS.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{budgetPct}% of {fmt(viewExpenseBudgets[cat])}</p>
                              )}
                              {viewExpenseBudgets[cat] > 0 && <p style={{ fontSize: 11, color: COLORS.muted }}>{fmt(viewExpenseBudgets[cat] - amt)} left</p>}
                              <p style={{ fontSize: 12, fontWeight: 500, color: COLORS.subtext }}>{topExpense ? fmtDate(topExpense.date) : ""}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── ROW 3, COL 1–6: Shared Goal ── */}
              {(() => {
                const goal = savingsItems[0];
                const goalPct = goal ? pct(goal.actual, goal.expected) : 0;
                const label = goal ? goal.label.toLowerCase() : "";
                const goalIcon = label.includes("holiday") || label.includes("travel") || label.includes("trip") || label.includes("vacation") ? "flight" : label.includes("house") || label.includes("home") ? "home" : label.includes("car") || label.includes("vehicle") ? "directions_car" : label.includes("school") || label.includes("college") || label.includes("education") ? "school" : "savings";
                return (
                  <div style={{ gridColumn: "span 6", background: "rgba(186,191,255,0.3)", borderRadius: 12, padding: "32px", position: "relative", overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div>
                        <h4 style={{ fontSize: 22, fontWeight: 700, color: COLORS.onTertiaryContainer, marginBottom: 4 }}>
                          Shared Goal: {goal ? goal.label : "Savings Goal"}
                        </h4>
                        <p style={{ fontSize: 13, color: `${COLORS.onTertiaryContainer}b3` }}>Saving for the family's future</p>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: 44, color: COLORS.onTertiaryContainer, opacity: 0.4 }}>{goalIcon}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 44, fontWeight: 900, color: COLORS.onTertiaryContainer, letterSpacing: "-0.02em" }}>{fmt(goal ? goal.actual : 0)}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: `${COLORS.onTertiaryContainer}99` }}>/ {fmt(goal ? goal.expected : 0)}</span>
                    </div>
                    <div style={{ width: "100%", height: 24, background: "rgba(255,255,255,0.5)", borderRadius: 9999, overflow: "hidden", marginBottom: 12 }}>
                      <div style={{ width: `${goalPct}%`, height: "100%", background: COLORS.primary, borderRadius: 9999, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: COLORS.onTertiaryContainer, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span>Just Started</span>
                      <span style={{ fontSize: 14 }}>{Math.round(goalPct)}% Saved!</span>
                      <span>Goal Reached</span>
                    </div>
                    <div style={{ position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)", width: 120, height: 120, background: "rgba(255,255,255,0.15)", borderRadius: "50%", filter: "blur(30px)" }} />
                  </div>
                );
              })()}

              {/* ── ROW 3, COL 7–12: Savings & Investments ── */}
              <div style={{ gridColumn: "span 6", background: "rgba(97,205,253,0.2)", borderRadius: 12, padding: "32px", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <h4 style={{ fontSize: 22, fontWeight: 700, color: COLORS.onSecondaryContainer, marginBottom: 4 }}>Savings &amp; Investments</h4>
                    <p style={{ fontSize: 13, color: `${COLORS.onSecondaryContainer}b3` }}>Monthly wealth building target</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 44, color: COLORS.primary, opacity: 0.4 }}>show_chart</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: COLORS.onSecondaryContainer, letterSpacing: "-0.02em" }}>{fmt(savingsActualTotal)}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: `${COLORS.onSecondaryContainer}99` }}>/ {fmt(savingsExpectedTotal)}</span>
                </div>
                <div style={{ width: "100%", height: 24, background: "rgba(255,255,255,0.5)", borderRadius: 9999, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ width: `${pct(savingsActualTotal, savingsExpectedTotal || 1)}%`, height: "100%", background: COLORS.primary, borderRadius: 9999, transition: "width 0.4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: COLORS.onSecondaryContainer, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <span>Base</span>
                  <span style={{ fontSize: 14 }}>{Math.round(pct(savingsActualTotal, savingsExpectedTotal || 1))}% of Target</span>
                  <span>Maxed Out</span>
                </div>
                <div style={{ position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)", width: 120, height: 120, background: "rgba(255,255,255,0.2)", borderRadius: "50%", filter: "blur(30px)" }} />
              </div>
            </div>{/* end bento grid */}
          </div>
        )}
        {/* ── FAMILY BUDGET TAB ── */}
        {tab === "transactions" && (() => {
          const { month0: vm0, year: vy } = parseKey(viewMonthKey);
          const sortExp = (arr) => {
            const dir = expSortDir === "asc" ? 1 : -1;
            return [...arr].sort((a, b) => {
              if (expSortField === "label") return dir * (a.label||"").localeCompare(b.label||"");
              if (expSortField === "category") return dir * (a.category||"").localeCompare(b.category||"");
              if (expSortField === "date") return dir * (a.date||"").localeCompare(b.date||"");
              if (expSortField === "amount") return -dir * (a.amount - b.amount);
              return 0;
            });
          };
          const toggleSort = (field) => { if (expSortField === field) setExpSortDir(d => d === "asc" ? "desc" : "asc"); else { setExpSortField(field); setExpSortDir("asc"); } };
          const SortArrow = ({ field }) => expSortField === field ? <span style={{ fontSize: 10, marginLeft: 2, color: COLORS.primary }}>{expSortDir === "asc" ? "↑" : "↓"}</span> : null;
          const colStyle = { fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center" };
          const COLS = "2.2fr 1fr 0.8fr 0.9fr 0.9fr 0.9fr 32px";

          // Inline cell helpers
          const EditableText = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} onKeyDown={e=>{if(e.key==="Enter")setEditingCell(null);}} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:13,color:COLORS.text,outline:"none"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px",fontSize:13}}>{value||"—"}</span>;
          const EditableNum = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus type="number" value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} onKeyDown={e=>{if(e.key==="Enter")setEditingCell(null);}} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:13,color:COLORS.text,outline:"none"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px",color:COLORS.text,fontWeight:600,fontSize:13}}>{fmt(value)}</span>;
          const EditableDate = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus type="date" value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:12,color:COLORS.text,outline:"none"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px",fontSize:12,color:COLORS.subtext}}>{value ? fmtDate(value) : "—"}</span>;
          const EditableCat = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <select autoFocus value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:12,color:COLORS.text,outline:"none"}}>
                {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"pointer",display:"inline-block",fontSize:11,fontWeight:600,color:COLORS.subtext,background:COLORS.containerHighest,borderRadius:9999,padding:"2px 8px"}}>{value}</span>;

          // Inline debt cell helpers
          const DebtText = ({ id, field, value, style={} }) => editingDebtCell?.id===id && editingDebtCell?.field===field
            ? <input autoFocus value={value} onChange={e=>updateDebtField(id,field,e.target.value)} onBlur={()=>setEditingDebtCell(null)} onKeyDown={e=>{if(e.key==="Enter")setEditingDebtCell(null);}} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:13,color:COLORS.text,outline:"none",...style}} />
            : <span onClick={()=>setEditingDebtCell({id,field})} title="Click to edit" style={{cursor:"text",...style}}>{value}</span>;

          // Inline savings cell helpers
          const SavText = ({ id, field, value, style={} }) => editingSavingsCell?.id===id && editingSavingsCell?.field===field
            ? <input autoFocus value={value} onChange={e=>updateSavingsField(id,field,e.target.value)} onBlur={()=>setEditingSavingsCell(null)} onKeyDown={e=>{if(e.key==="Enter")setEditingSavingsCell(null);}} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:13,color:COLORS.text,outline:"none",...style}} />
            : <span onClick={()=>setEditingSavingsCell({id,field})} title="Click to edit" style={{cursor:"text",...style}}>{value}</span>;

          const knownCatIds = SPENDING_PLAN_GROUPS.map(g => g.catId);
          // Per-month planned amounts
          const monthItemBudgets = itemBudgets[viewMonthKey] || {};
          const setMonthItemBudget = (key, value) => setItemBudgets(p => ({...p, [viewMonthKey]: {...(p[viewMonthKey]||{}), [key]: value}}));
          const { year: prevY, month0: prevM0 } = parseKey(viewMonthKey);
          const prevMonthKey = monthKey(new Date(prevY, prevM0 - 1, 1).getFullYear(), new Date(prevY, prevM0 - 1, 1).getMonth());
          const prevMonthItemBudgets = itemBudgets[prevMonthKey] || {};
          const prevMonthExpBudgets = monthlySnapshots[prevMonthKey]?.expenseBudgets || {};
          const hasPrevPlanned = Object.keys(prevMonthItemBudgets).length > 0 || Object.values(prevMonthExpBudgets).some(v => v > 0);
          const currentBudgetsAreDefault = Object.entries(viewExpenseBudgets).every(([k, v]) => v === DEFAULT_EXPENSE_BUDGETS[k]);

          const totalPlanned = Object.values(monthItemBudgets).reduce((s,v) => s+(v||0), 0) + Object.values(viewExpenseBudgets).reduce((s,v) => s+v, 0);
          const totalActual = viewTotalExpenses;
          const remainToSpend = viewTotalIncome > 0 ? viewTotalIncome - totalActual : totalPlanned - totalActual;
          const barMax = viewTotalIncome > 0 ? viewTotalIncome : (totalPlanned || 1);
          const usedPctBar = Math.min(110, Math.round((totalActual / barMax) * 100));
          const plannedPctBar = barMax > 0 ? Math.min(100, Math.round((totalPlanned / barMax) * 100)) : 0;
          const barColor = usedPctBar > 100 ? COLORS.danger : usedPctBar > plannedPctBar ? COLORS.warning : COLORS.success;
          const plannedCount = Object.keys(monthItemBudgets).length;
          const now2 = new Date();
          const isCurrentMonth = vy === now2.getFullYear() && vm0 === now2.getMonth();
          const daysInMonth2 = new Date(vy, vm0 + 1, 0).getDate();
          const daysLeft = isCurrentMonth ? Math.max(0, daysInMonth2 - now2.getDate()) : 0;
          const healthStatus = (() => {
            if (totalActual > viewTotalIncome && viewTotalIncome > 0) return { label: "Over Budget", color: COLORS.danger, bg: COLORS.danger + "15" };
            if (usedPctBar > 90) return { label: "Watch Spending", color: COLORS.warning, bg: COLORS.warning + "15" };
            if (usedPctBar > 75) return { label: "Watch Spending", color: COLORS.warning, bg: COLORS.warning + "15" };
            if (plannedCount < 3) return { label: "Start Planning", color: COLORS.primary, bg: COLORS.primary + "15" };
            return { label: "On Track", color: COLORS.success, bg: COLORS.success + "15" };
          })();
          return (
            <div style={{ paddingBottom: 48 }}>
              {/* ── Page header ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 20, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.sidebarText, letterSpacing: "-0.02em", marginBottom: 2 }}>{MONTH_FULL[vm0]} {vy} Budget</h2>
                  <p style={{ fontSize: 13, color: COLORS.subtext }}>{fmt(totalActual)} spent of {fmt(viewTotalIncome)} income{totalPlanned > 0 ? ` · ${fmt(totalPlanned)} planned` : ""}{isCurrentMonth && daysLeft > 0 ? ` · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left` : ""}</p>
                  {hasPrevPlanned && (currentBudgetsAreDefault || Object.keys(monthItemBudgets).length === 0) && (
                    <button onClick={() => { if (Object.values(prevMonthExpBudgets).some(v => v > 0)) setViewExpenseBudgets({ ...prevMonthExpBudgets }); if (Object.keys(prevMonthItemBudgets).length > 0) setItemBudgets(p => ({...p, [viewMonthKey]: {...prevMonthItemBudgets}})); }} style={{ marginTop: 6, background: "rgba(0,103,136,0.08)", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: COLORS.primary, cursor: "pointer" }}>
                      Copy planned amounts from {MONTH_NAMES[new Date(prevY, prevM0 - 1, 1).getMonth()]}
                    </button>
                  )}
                </div>
                {/* Income summary — top right */}
                <div style={{ background: "rgba(192,232,255,0.3)", borderRadius: 16, padding: "16px 20px", minWidth: 260 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ padding: "5px 7px", background: "rgba(23,102,132,0.12)", borderRadius: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: COLORS.secondary }}>trending_up</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>Income</span>
                    </div>
                    <button onClick={() => setModal("addIncome")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.primary }}>add_circle</span>
                    </button>
                  </div>
                  {viewIncome.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: COLORS.subtext, flexShrink: 0 }}>work</span>
                        {editingIncomeCell?.id === i.id && editingIncomeCell?.field === "label"
                          ? <input autoFocus value={i.label} onChange={e => updateIncomeField(i.id, "label", e.target.value)} onBlur={() => setEditingIncomeCell(null)} onKeyDown={e => { if (e.key === "Enter") setEditingIncomeCell(null); }} style={{ flex:1, background:COLORS.containerLow, border:"none", borderRadius:6, padding:"2px 6px", fontSize:12, color:COLORS.text, outline:"none" }} />
                          : <span onClick={() => setEditingIncomeCell({id:i.id, field:"label"})} title="Click to edit" style={{ fontSize: 12, fontWeight: 500, color: COLORS.text, cursor:"text", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{i.label}{i.recurring ? " ↺" : ""}</span>
                        }
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {editingIncomeCell?.id === i.id && editingIncomeCell?.field === "amount"
                          ? <input autoFocus type="number" defaultValue={i.amount} onBlur={e => { updateIncomeField(i.id, "amount", e.target.value); setEditingIncomeCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }} style={{ width:80, background:COLORS.containerLow, border:"none", borderRadius:6, padding:"2px 6px", fontSize:13, color:COLORS.text, outline:"none" }} />
                          : <span onClick={() => setEditingIncomeCell({id:i.id, field:"amount"})} title="Click to edit" style={{ fontSize: 13, fontWeight: 700, color: COLORS.secondary, cursor:"text" }}>+{fmt(i.amount)}</span>
                        }
                        <button onClick={() => deleteIncomeFromView(i.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid rgba(23,102,132,0.15)`, marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: COLORS.subtext }}>Total Monthly</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary }}>{fmt(viewTotalIncome)}</span>
                  </div>
                </div>
              </div>
              {/* ── Main grid ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 24 }}>
                {/* ── Spending Plan Table (col-8) ── */}
                <div style={{ gridColumn: "span 8", background: COLORS.card, borderRadius: 20, padding: 28, boxShadow: COLORS.shadowSm }}>
                  {/* ── Budget bar ── */}
                  <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "0.5px solid rgba(172,179,181,0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>{fmt(totalActual)} spent of {fmt(viewTotalIncome)} income{totalPlanned > 0 ? ` · ${fmt(totalPlanned)} planned` : ""}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => { setAdvisorMsg(`My budget health: ${healthStatus.label}. I've spent ${fmt(totalActual)} of ${fmt(viewTotalIncome)} income (${usedPctBar}%). ${isCurrentMonth ? `${daysLeft} days left in the month.` : ""} Please give me specific advice.`); pendingAdvisorSend.current = true; setTab("advisor"); }} style={{ fontSize: 11, fontWeight: 700, color: healthStatus.color, background: healthStatus.bg, border: "none", borderRadius: 9999, padding: "3px 10px", cursor: "pointer" }}>{healthStatus.label}</button>
                        <span style={{ fontSize: 12, fontWeight: 800, color: barColor }}>{usedPctBar}%</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: COLORS.containerLow, borderRadius: 9999, overflow: "visible", position: "relative" }}>
                      <div style={{ width: `${Math.min(100, usedPctBar)}%`, height: "100%", background: barColor, borderRadius: 9999, transition: "width .4s" }} />
                      {plannedPctBar > 0 && plannedPctBar < 100 && (
                        <div style={{ position: "absolute", top: -2, left: `${plannedPctBar}%`, width: 2, height: 12, background: COLORS.primary, borderRadius: 2, opacity: 0.6 }} title={`Planned: ${fmt(totalPlanned)}`} />
                      )}
                    </div>
                    {/* 50/30/20 toggle row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => {
                          if (!toggle5020) {
                            if (viewTotalIncome === 0) { setToast5020("Add income first to use the 50/30/20 rule"); setTimeout(() => setToast5020(""), 3000); return; }
                            pre5020Budgets.current = { ...viewExpenseBudgets };
                            pre5020Savings.current = savingsItems.map(s => ({ ...s }));
                            const inc = viewTotalIncome;
                            setViewExpenseBudgets({ Housing: Math.round(inc*0.30), Utilities: Math.round(inc*0.08), Transport: Math.round(inc*0.08), Health: Math.round(inc*0.04), Food: Math.round(inc*0.12), Entertainment: Math.round(inc*0.04), Personal: Math.round(inc*0.05), Kids: Math.round(inc*0.05), Education: 0, Savings: 0, Other: 0, Subscriptions: 0 });
                            if (savingsItems.length > 0) setSavingsItems(p => [{ ...p[0], expected: Math.round(inc*0.20) }, ...p.slice(1)]);
                            setToggle5020(true);
                          } else {
                            if (pre5020Budgets.current) setViewExpenseBudgets(pre5020Budgets.current);
                            if (pre5020Savings.current) setSavingsItems(pre5020Savings.current);
                            pre5020Budgets.current = null; pre5020Savings.current = null;
                            setToggle5020(false);
                          }
                        }} style={{ fontSize: 11, fontWeight: 700, background: toggle5020 ? COLORS.primary : "none", color: toggle5020 ? "#fff" : COLORS.primary, border: `1.5px solid ${COLORS.primary}`, borderRadius: 9999, padding: "3px 12px", cursor: "pointer", transition: "all .2s" }}>
                          50/30/20 Rule {toggle5020 ? "ON" : "OFF"}
                        </button>
                        {toggle5020 && viewTotalIncome > 0 && <span style={{ fontSize: 11, color: COLORS.muted }}>Based on {fmt(viewTotalIncome)} income</span>}
                        {toast5020 && <span style={{ fontSize: 11, color: COLORS.warning, fontWeight: 600 }}>{toast5020}</span>}
                      </div>
                    </div>
                    {!onboardingDismissed && plannedCount < 5 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, background: `rgba(0,103,136,0.07)`, borderRadius: 8, padding: "8px 12px" }}>
                        <span style={{ fontSize: 12, color: COLORS.primary }}>👋 Set your planned amounts to unlock full budget tracking — click any <strong>—</strong> in the Planned column.</span>
                        <button onClick={() => setOnboardingDismissed(true)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                      </div>
                    )}
                  </div>
                  {/* Column headers + table controls */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setCollapsedCategories({})} style={{ fontSize: 11, background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 8px", color: COLORS.muted, cursor: "pointer" }}>Expand All</button>
                      <button onClick={() => setCollapsedCategories(Object.fromEntries(SPENDING_PLAN_GROUPS.map(g => [g.catId, true])))} style={{ fontSize: 11, background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 8px", color: COLORS.muted, cursor: "pointer" }}>Collapse All</button>
                    </div>
                    <button onClick={() => setShowPlaceholders(p => !p)} style={{ fontSize: 11, background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 8px", color: COLORS.muted, cursor: "pointer" }}>{showPlaceholders ? "Hide placeholders" : "Show placeholders"}</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "10px 12px", background: COLORS.containerLow, borderRadius: 10, marginBottom: 16, position: "sticky", top: 0, zIndex: 10 }}>
                    <span style={colStyle} onClick={() => toggleSort("label")}>Items <SortArrow field="label" /></span>
                    <span style={colStyle} onClick={() => toggleSort("category")}>Type</span>
                    <span style={{ ...colStyle, cursor: "default" }}>Due</span>
                    <span style={colStyle}>Planned</span>
                    <span style={colStyle} onClick={() => toggleSort("amount")}>Actual <SortArrow field="amount" /></span>
                    <span style={{ ...colStyle, cursor: "default" }}>Left</span>
                    <span style={{ ...colStyle, cursor: "default" }}></span>
                  </div>

                  {/* Category groups */}
                  {SPENDING_PLAN_GROUPS.map(group => {
                    const grpExp = sortExp(viewExpenses.filter(e => e.category === group.catId));
                    const grpActual = grpExp.reduce((s,e) => s+e.amount, 0);
                    const grpPlanned = viewExpenseBudgets[group.catId] || 0;
                    const isCollapsed = collapsedCategories[group.catId];
                    const util = grpPlanned > 0 ? Math.round((grpActual / grpPlanned) * 100) : null;
                    const utilColor = util === null ? COLORS.muted : util > 100 ? COLORS.danger : util >= 80 ? COLORS.warning : COLORS.success;
                    const usedLabels = grpExp.map(e => e.label.toLowerCase());
                    const unusedTemplates = group.templateItems.filter(t => !usedLabels.some(l => l.includes(t.split(/[/(]/)[0].trim().toLowerCase())));

                    return (
                      <div key={group.catId} style={{ marginBottom: 6 }}>
                        {/* Group header — uses same grid as rows */}
                        <div onClick={() => setCollapsedCategories(p => ({ ...p, [group.catId]: !p[group.catId] }))}
                          style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, alignItems: "center", padding: "9px 12px", background: util >= 100 ? COLORS.danger + "10" : util >= 80 ? COLORS.warning + "10" : COLORS.containerLow, borderRadius: 10, cursor: "pointer", marginBottom: isCollapsed ? 0 : 6, borderLeft: util >= 100 ? `3px solid ${COLORS.danger}` : util >= 80 ? `3px solid ${COLORS.warning}` : "3px solid transparent" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: CATEGORY_ICON_BG[group.catId] || "#eaeef0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15, color: CATEGORY_ICON_COLOR[group.catId] || COLORS.subtext }}>{CATEGORY_ICONS[group.catId] || "category"}</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{group.label}</span>
                            {grpExp.length > 0 && <span style={{ fontSize: 11, color: COLORS.muted }}>({grpExp.length})</span>}
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: utilColor, flexShrink: 0 }} title={util === null ? "No budget set" : util > 100 ? "Over budget" : util >= 80 ? "Near limit" : "On track"} />
                          </div>
                          {/* cat column — empty */}
                          <span />
                          {/* due column — empty */}
                          <span />
                          {/* planned — editable */}
                          {editingPlannedKey === `cat-${group.catId}`
                            ? <input autoFocus type="number" placeholder="0" defaultValue={grpPlanned || ""} onClick={e => e.stopPropagation()} onBlur={ev => { const v = parseFloat(ev.target.value) || 0; setViewExpenseBudgets(prev => ({ ...prev, [group.catId]: v })); setEditingPlannedKey(null); }} onKeyDown={ev => { if (ev.key === "Enter") ev.target.blur(); if (ev.key === "Escape") setEditingPlannedKey(null); }} style={{ width:"100%", background:COLORS.containerLow, border:`1px solid ${COLORS.primary}`, borderRadius:6, padding:"3px 6px", fontSize:12, color:COLORS.text, outline:"none" }} />
                            : <span onClick={e => { e.stopPropagation(); setEditingPlannedKey(`cat-${group.catId}`); }} title="Click to edit planned budget" style={{ fontSize: 12, fontWeight: 700, color: grpPlanned > 0 ? COLORS.subtext : COLORS.muted, cursor: "text", borderRadius: 4, padding: "2px 4px" }}>{grpPlanned > 0 ? fmt(grpPlanned) : <span style={{ display:"flex", alignItems:"center", gap:3 }}>—<span style={{ fontSize:9, opacity:0.5 }}>✏</span></span>}</span>
                          }
                          {/* actual */}
                          <span style={{ fontSize: 12, fontWeight: 700, color: utilColor }}>{grpActual > 0 ? fmt(grpActual) : "—"}</span>
                          {/* variance */}
                          {(() => { const grpVar = grpPlanned > 0 ? grpPlanned - grpActual : null; return <span style={{ fontSize: 12, fontWeight: 700, color: grpVar === null ? COLORS.muted : grpVar >= 0 ? COLORS.success : COLORS.danger }}>{grpVar === null ? "—" : grpVar > 0 ? `+${fmt(grpVar)}` : fmt(grpVar)}</span>; })()}
                          {/* actions col — chevron */}
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: COLORS.muted, transition: "transform .2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", textAlign: "center" }}>expand_more</span>
                        </div>

                        {!isCollapsed && (
                          <div style={{ borderLeft: `3px solid ${CATEGORY_ICON_BG[group.catId] || COLORS.containerLow}`, marginLeft: 6, paddingLeft: 10, marginBottom: 4 }}>
                            {/* Existing expense rows */}
                            {grpExp.map(e => {
                              const expPlanned = monthItemBudgets[`exp-${e.id}`] || 0;
                              const expVar = expPlanned > 0 ? expPlanned - e.amount : null;
                              return (
                              <div key={e.id} style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "7px 10px", alignItems: "center", borderRadius: 8, background: COLORS.card, marginBottom: 2, boxShadow: COLORS.shadowSm }}>
                                <EditableText id={e.id} field="label" value={e.label} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: e.fixed ? COLORS.subtext : COLORS.muted, background: e.fixed ? COLORS.containerHigh : COLORS.containerLow, borderRadius: 9999, padding: "2px 7px", justifySelf: "start" }}>{e.fixed ? "Fixed" : "Variable"}</span>
                                <EditableDate id={e.id} field="date" value={e.date} />
                                {editingPlannedKey === `exp-${e.id}`
                                  ? <input autoFocus type="number" placeholder="0" defaultValue={expPlanned || ""} onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v) setMonthItemBudget(`exp-${e.id}`, v); setEditingPlannedKey(null); }} onKeyDown={ev => { if (ev.key === "Enter") ev.target.blur(); if (ev.key === "Escape") setEditingPlannedKey(null); }} style={{ width:"100%", background:COLORS.containerLow, border:`1px solid ${COLORS.primary}`, borderRadius:6, padding:"3px 6px", fontSize:12, color:COLORS.text, outline:"none" }} />
                                  : <span onClick={() => setEditingPlannedKey(`exp-${e.id}`)} title="Click to set planned budget" style={{ fontSize: 12, color: expPlanned ? COLORS.subtext : COLORS.muted, cursor: "text", display:"block", borderRadius:4, padding:"2px 4px" }}>{expPlanned ? fmt(expPlanned) : <span style={{ display:"flex", alignItems:"center", gap:3 }}>—<span style={{ fontSize:9, opacity:0.5 }}>✏</span></span>}</span>
                                }
                                <EditableNum id={e.id} field="amount" value={e.amount} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: expVar === null ? COLORS.muted : expVar >= 0 ? COLORS.success : COLORS.danger }}>
                                  {expVar === null ? "—" : expVar > 0 ? `+${fmt(expVar)}` : fmt(expVar)}
                                </span>
                                <div style={{ display: "flex", gap: 2 }}>
                                  <button onClick={() => { setEditingExpenseId(e.id); setNewExp({ label: e.label, amount: String(e.amount), category: e.category, date: e.date || getDefaultDate(viewMonthKey), fixed: e.fixed }); setModal("addExpense"); }} title="Edit" style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 13, width: 22, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>✏</button>
                                  <button onClick={() => deleteExpenseFromView(e.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, width: 20, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>×</button>
                                </div>
                              </div>
                              );
                            })}
                            {/* Template items not yet added */}
                            {showPlaceholders && unusedTemplates.slice(0, 4).map(item => {
                              const tKey = `tmpl-${item}`;
                              const tmplVar = monthItemBudgets[tKey] ? monthItemBudgets[tKey] : null;
                              return (
                              <div key={item} style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "6px 10px", alignItems: "center", borderRadius: 8, opacity: 0.55, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, color: COLORS.muted, fontStyle: "italic" }}>{item}</span>
                                <span style={{ fontSize: 11, color: COLORS.muted }}>—</span>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                {editingPlannedKey === tKey
                                  ? <input autoFocus type="number" placeholder="Budget amt" onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v) setMonthItemBudget(tKey, v); setEditingPlannedKey(null); }} onKeyDown={ev => { if (ev.key === "Enter") ev.target.blur(); if (ev.key === "Escape") setEditingPlannedKey(null); }} style={{ width:"100%", background:COLORS.containerLow, border:`1px solid ${COLORS.primary}`, borderRadius:6, padding:"3px 6px", fontSize:12, color:COLORS.text, outline:"none" }} />
                                  : <span onClick={() => setEditingPlannedKey(tKey)} title="Click to set planned budget" style={{ fontSize: 12, color: monthItemBudgets[tKey] ? COLORS.subtext : COLORS.muted, cursor: "text", display:"block", borderRadius:4, padding:"2px 4px" }}>{monthItemBudgets[tKey] ? fmt(monthItemBudgets[tKey]) : "—"}</span>
                                }
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <button onClick={() => { setNewExp(p => ({ ...p, label: item, category: group.catId })); setModal("addExpense"); }}
                                  style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }} title="Add actual expense">
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                                </button>
                              </div>
                              );
                            })}
                            {/* Add row button */}
                            <button onClick={() => { setNewExp(p => ({ ...p, label: "", category: group.catId })); setModal("addExpense"); }}
                              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${COLORS.border}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: COLORS.muted, fontSize: 12, marginTop: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Add {group.label} item
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Uncategorized / other expenses */}
                  {(() => {
                    const others = sortExp(viewExpenses.filter(e => !knownCatIds.includes(e.category)));
                    if (others.length === 0) return null;
                    return (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: COLORS.containerLow, borderRadius: 10, marginBottom: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: COLORS.subtext }}>category</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>Uncategorized</span>
                          <span style={{ fontSize: 11, color: COLORS.muted }}>({others.length})</span>
                        </div>
                        {others.map(e => (
                          <div key={e.id} style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "7px 10px", alignItems: "center", borderRadius: 8, background: COLORS.card, marginBottom: 2, boxShadow: COLORS.shadowSm }}>
                            <EditableText id={e.id} field="label" value={e.label} />
                            <EditableCat id={e.id} field="category" value={e.category} />
                            <EditableDate id={e.id} field="date" value={e.date} />
                            <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                            <EditableNum id={e.id} field="amount" value={e.amount} />
                            <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                            <button onClick={() => deleteExpenseFromView(e.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>×</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* ── Right sidebar (col-4) ── */}
                <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Bills */}
                  <div style={{ background: COLORS.card, borderRadius: 20, padding: 22, boxShadow: COLORS.shadowSm }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ padding: "6px 8px", background: "rgba(97,205,253,0.2)", borderRadius: 10 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 17, color: COLORS.primary }}>receipt_long</span>
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Bills</h3>
                      </div>
                      <button onClick={() => setModal("addBill")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.primary }}>add_circle</span>
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {bills.map(b => {
                        const bDueDate = getBillDueDate(b, viewMonthKey);
                        const [bY,bM,bD] = bDueDate.split("-").map(Number);
                        const bDate = new Date(bY,bM-1,bD);
                        const bPaid = getBillPaid(b, viewMonthKey);
                        const isOverdue = !bPaid && bDate < today0;
                        const borderColor = bPaid ? COLORS.success : isOverdue ? COLORS.danger : "transparent";
                        const sbInp = { background: COLORS.containerHigh, border: `1px solid ${COLORS.primary}`, borderRadius: 6, outline: "none", color: COLORS.text };
                        const isEL = editingBillCell?.id === b.id && editingBillCell?.field === "label";
                        const isED = editingBillCell?.id === b.id && editingBillCell?.field === "dueDate";
                        const isEA = editingBillCell?.id === b.id && editingBillCell?.field === "budget";
                        return (
                          <div key={b.id} style={{ background: COLORS.containerLow, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${borderColor}`, gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {isEL
                                ? <input autoFocus defaultValue={b.label} style={{ ...sbInp, fontSize: 13, fontWeight: 600, padding: "2px 6px", width: "100%" }} onBlur={e => { setBills(p => p.map(x => x.id === b.id ? {...x, label: e.target.value || x.label} : x)); setEditingBillCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingBillCell(null); }} />
                                : <p onClick={() => setEditingBillCell({id: b.id, field: "label"})} title="Click to edit" style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, cursor: "text" }}>{b.label}</p>
                              }
                              {isED
                                ? <input autoFocus type="number" min="1" max="31" defaultValue={b.dayOfMonth} style={{ ...sbInp, fontSize: 11, padding: "1px 4px", marginTop: 2, width: 50 }} onBlur={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= 31) setBills(p => p.map(x => x.id === b.id ? {...x, dayOfMonth: v} : x)); setEditingBillCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingBillCell(null); }} />
                                : <p onClick={() => setEditingBillCell({id: b.id, field: "dueDate"})} title="Click to edit" style={{ fontSize: 11, color: isOverdue ? COLORS.danger : COLORS.subtext, cursor: "text" }}>{fmtDate(bDueDate)}</p>
                              }
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              {isEA
                                ? <input autoFocus type="number" defaultValue={b.budget} style={{ ...sbInp, fontSize: 13, fontWeight: 700, padding: "2px 6px", width: 72, textAlign: "right" }} onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setBills(p => p.map(x => x.id === b.id ? {...x, budget: v} : x)); setEditingBillCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingBillCell(null); }} />
                                : <p onClick={() => setEditingBillCell({id: b.id, field: "budget"})} title="Click to edit" style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, cursor: "text" }}>{fmt(b.budget)}</p>
                              }
                              {bPaid
                                ? <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.success }}>Paid ✓</span>
                                : <span style={{ fontSize: 10, fontWeight: 700, color: isOverdue ? COLORS.danger : COLORS.muted, animation: isOverdue ? "pulse 2s infinite" : "none" }}>{isOverdue ? "Overdue" : "Due"}</span>
                              }
                            </div>
                            {!bPaid && (
                              <button onClick={() => markBillPaid(b.id, viewMonthKey)} title="Mark as paid" style={{ background: `rgba(0,103,136,0.1)`, border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "3px 7px", borderRadius: 6, flexShrink: 0 }}>Pay ✓</button>
                            )}
                            <button onClick={() => setBills(p => p.filter(x => x.id !== b.id))} title="Delete" style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, padding: 0, flexShrink: 0, lineHeight: 1 }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>


                  {/* Debts — with inline editing and × */}
                  <div style={{ background: COLORS.card, borderRadius: 20, padding: 22, boxShadow: COLORS.shadowSm }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ padding: "6px 8px", background: "rgba(172,49,73,0.1)", borderRadius: 10 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 17, color: COLORS.danger }}>account_balance</span>
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Debts</h3>
                      </div>
                      <button onClick={() => setModal("addDebt")} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.primary }}>add_circle</span>
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {debts.map((d, idx) => (
                        <div key={d.id}>
                          {idx > 0 && <div style={{ height: 1, background: COLORS.containerLow, margin: "8px 0" }} />}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <DebtText id={d.id} field="label" value={d.label} style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, display: "block", marginBottom: 2 }} />
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <DebtText id={d.id} field="interest" value={d.interest} style={{ fontSize: 11, color: COLORS.subtext }} />
                                <span style={{ fontSize: 11, color: COLORS.subtext }}>% APR</span>
                              </div>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.danger, display: "block", cursor: "text" }} onClick={() => setEditingDebtCell({id: d.id, field: "balance"})}>{editingDebtCell?.id === d.id && editingDebtCell?.field === "balance" ? <input autoFocus defaultValue={d.balance} onBlur={e => { updateDebtField(d.id,"balance",parseFloat(e.target.value)||0); setEditingDebtCell(null); }} onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}} style={{width:80,background:COLORS.containerLow,border:"none",borderRadius:6,padding:"2px 6px",fontSize:13,color:COLORS.text,outline:"none",textAlign:"right"}} /> : fmt(d.balance)}</span>
                              {d.minPayment > 0 && <span style={{ fontSize: 10, color: COLORS.muted, display: "block" }}>~{Math.ceil(d.balance / d.minPayment)} mo. to payoff</span>}
                              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 2 }}>
                                {payExtraDebtId === d.id
                                  ? <span style={{ display:"flex", alignItems:"center", gap:4 }}>
                                      <input id={`pe-${d.id}`} autoFocus type="number" placeholder="$" style={{ width:60, background:COLORS.containerLow, border:"none", borderRadius:6, padding:"2px 6px", fontSize:11, color:COLORS.text, outline:"none" }} onKeyDown={e=>{if(e.key==="Escape")setPayExtraDebtId(null);}} />
                                      <button onClick={()=>{ const v=parseFloat(document.getElementById(`pe-${d.id}`)?.value)||0; if(v>0){ updateDebtField(d.id,"balance",Math.max(0,d.balance-v)); const today=new Date().toISOString().slice(0,10); setExpenses(prev=>[...prev,{id:Date.now(),label:`Extra payment: ${d.label}`,amount:v,category:"Other",date:today,fixed:false}]); } setPayExtraDebtId(null); }} style={{background:COLORS.primary,color:"#fff",border:"none",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Pay</button>
                                      <button onClick={()=>setPayExtraDebtId(null)} style={{background:"none",border:"none",color:COLORS.muted,cursor:"pointer",fontSize:14,padding:0}}>×</button>
                                    </span>
                                  : <button onClick={() => setPayExtraDebtId(d.id)} style={{ fontSize: 11, color: COLORS.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>Pay Extra</button>
                                }
                                <button onClick={() => setDebts(prev => prev.filter(x => x.id !== d.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Savings — with inline editing, × , and +/- controls */}
                  <div style={{ background: COLORS.card, borderRadius: 20, padding: 22, boxShadow: COLORS.shadowSm }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ padding: "6px 8px", background: "rgba(97,205,253,0.15)", borderRadius: 10 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 17, color: COLORS.primary }}>savings</span>
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Savings</h3>
                      </div>
                      <button onClick={() => setSavingsItems(prev => [...prev, { id: Date.now(), label: "New Goal", expected: 100, actual: 0 }])} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.primary }}>add_circle</span>
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {savingsItems.map(s => {
                        const goalReached = s.expected > 0 && s.actual >= s.expected;
                        const savPct = pct(s.actual, s.expected || 1);
                        return (
                        <div key={s.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                            <SavText id={s.id} field="label" value={s.label} style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, color: COLORS.subtext }}>
                                {fmt(s.actual)} /&nbsp;
                                <SavText id={s.id} field="expected" value={s.expected} style={{ fontSize: 12, color: COLORS.subtext, display: "inline" }} />
                              </span>
                              <button onClick={() => setSavingsItems(prev => prev.filter(x => x.id !== s.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                            </div>
                          </div>
                          <div style={{ height: 6, background: COLORS.containerLow, borderRadius: 9999, overflow: "hidden", marginBottom: goalReached ? 4 : 6 }}>
                            <div style={{ width: `${savPct}%`, height: "100%", background: goalReached ? COLORS.success : COLORS.primary, borderRadius: 9999 }} />
                          </div>
                          {goalReached && <p style={{ fontSize: 11, color: COLORS.success, fontWeight: 700, marginBottom: 6 }}>🎉 Goal reached!</p>}
                          {addingSavingsId === s.id
                            ? <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                                <input id={`sav-inp-${s.id}`} autoFocus type="number" placeholder={savingsMode === "add" ? "Contribute" : "Withdraw"} style={{ flex:1, background:COLORS.containerLow, border:"none", borderRadius:8, padding:"5px 8px", fontSize:12, color:COLORS.text, outline:"none" }} onKeyDown={e=>{if(e.key==="Escape"){ setAddingSavingsId(null); setSavingsMode(null); }}} />
                                <button onClick={()=>{ const v=parseFloat(document.getElementById(`sav-inp-${s.id}`)?.value)||0; if(v>0){ if(savingsMode==="add"){ updateSavingsField(s.id,"actual",s.actual+v); setExpenses(prev=>[...prev,{id:Date.now(),label:`${s.label} savings`,amount:v,category:"Savings",date:new Date().toISOString().slice(0,10),fixed:false}]); } else { updateSavingsField(s.id,"actual",Math.max(0,s.actual-v)); } } setAddingSavingsId(null); setSavingsMode(null); }} style={{background:savingsMode==="add"?COLORS.primary:`rgba(172,49,73,0.12)`,color:savingsMode==="add"?"#fff":COLORS.danger,border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓</button>
                                <button onClick={()=>{ setAddingSavingsId(null); setSavingsMode(null); }} style={{background:"none",border:"none",color:COLORS.muted,cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
                              </div>
                            : <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => { setAddingSavingsId(s.id); setSavingsMode("add"); }} style={{ flex:1, background: `rgba(0,103,136,0.09)`, border:"none", borderRadius:8, padding:"5px 0", fontSize:12, fontWeight:700, color:COLORS.primary, cursor:"pointer" }}>+ Contribute</button>
                                <button onClick={() => { setAddingSavingsId(s.id); setSavingsMode("remove"); }} style={{ flex:0.6, background: `rgba(172,49,73,0.08)`, border:"none", borderRadius:8, padding:"5px 0", fontSize:12, fontWeight:700, color:COLORS.danger, cursor:"pointer" }}>− Withdraw</button>
                              </div>
                          }
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        {/* ── BILL CALENDAR TAB ── */}
        {tab === "weekly" && (() => {
          const now = new Date();
          const { year: calYear, month0: calMonth } = parseKey(viewMonthKey);
          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
          const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
          const todayDate = (calYear === now.getFullYear() && calMonth === now.getMonth()) ? now.getDate() : -1;
          const BILL_COLORS = { Housing: { bg: "rgba(97,205,253,0.15)", text: COLORS.primary }, Utilities: { bg: "rgba(192,232,255,0.4)", text: COLORS.secondary }, Entertainment: { bg: "rgba(186,191,255,0.3)", text: COLORS.tertiary } };
          const calMk = monthKey(calYear, calMonth);
          const paidBillsTotal = bills.filter(b => getBillPaid(b, calMk)).reduce((s, b) => s + b.budget, 0);
          const unpaidBills = bills.filter(b => !getBillPaid(b, calMk)).sort((a, b) => a.dayOfMonth - b.dayOfMonth);
          const totalBillsBudget = bills.reduce((s, b) => s + b.budget, 0);
          const billsOnDay = (day) => bills.filter(b => b.dayOfMonth === day);
          const paidAmountTotal = bills.filter(b => getBillPaid(b, calMk)).reduce((s, b) => s + b.budget, 0);
          const remainingBillsTotal = totalBillsBudget - paidAmountTotal;
          const inpStyleInline = { background: COLORS.containerLow, border: `1px solid ${COLORS.primary}40`, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: COLORS.text, outline: "none" };
          return (
            <div style={{ paddingBottom: 48 }}>
              {/* ── Header ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.sidebarText, letterSpacing: "-0.02em", marginBottom: 4 }}>Bill Calendar</h2>
                  <p style={{ fontSize: 14, color: COLORS.subtext }}>Upcoming bills and payment schedule</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); setBillLinkToast(true); setTimeout(() => setBillLinkToast(false), 2000); }} title="Copy link to this month" style={{ background: billLinkToast ? COLORS.success + "18" : COLORS.containerLow, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: billLinkToast ? COLORS.success : COLORS.subtext, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link</span>{billLinkToast ? "Link copied!" : "Copy link"}
                  </button>
                  <button onClick={() => setModal("addBill")} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.primary, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>Add Bill
                  </button>
                </div>
              </div>

              {/* ── 3 Summary stat boxes ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                {[
                  { label: "Total Bills", value: totalBillsBudget, icon: "receipt_long", color: COLORS.primary, bg: "rgba(0,103,136,0.08)" },
                  { label: "Paid", value: paidAmountTotal, icon: "check_circle", color: COLORS.success, bg: "rgba(0,103,136,0.06)" },
                  { label: "Remaining", value: remainingBillsTotal, icon: "pending", color: remainingBillsTotal > 0 ? COLORS.warning : COLORS.success, bg: remainingBillsTotal > 0 ? "rgba(249,115,22,0.07)" : "rgba(0,103,136,0.06)" },
                ].map(stat => (
                  <div key={stat.label} style={{ background: COLORS.card, borderRadius: 16, padding: "18px 20px", boxShadow: COLORS.shadowSm, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: stat.color }}>{stat.icon}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 3 }}>{stat.label}</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: stat.color, letterSpacing: "-0.02em" }}>{fmt(stat.value)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Full-width calendar card ── */}
              <div style={{ background: COLORS.card, borderRadius: 20, padding: 28, boxShadow: COLORS.shadowSm, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{MONTH_FULL[calMonth]} {calYear}</h3>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["Month","month"], ["List","list"]].map(([label, val]) => (
                      <button key={val} onClick={() => setBillCalView(val)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: billCalView === val ? COLORS.primary : COLORS.containerLow, color: billCalView === val ? "#fff" : COLORS.subtext, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{label}</button>
                    ))}
                  </div>
                </div>
                {/* Month view */}
                {billCalView === "month" && <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", padding: "6px 0" }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                    {Array.from({ length: firstDayOfWeek }, (_, i) => (
                      <div key={`empty-${i}`} style={{ background: COLORS.containerLow, borderRadius: 8, minHeight: 80, opacity: 0.3 }} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dayBills = billsOnDay(day);
                      const isToday = day === todayDate;
                      return (
                        <div key={day} style={{ background: COLORS.card, borderRadius: 8, minHeight: 80, padding: 8, border: `1px solid ${COLORS.containerLow}` }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: isToday ? COLORS.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? "#fff" : COLORS.text }}>{day}</span>
                          </div>
                          {dayBills.map(b => {
                            const bPaidCal = getBillPaid(b, calMk);
                            const colorSet = bPaidCal ? { bg: COLORS.success + "18", text: COLORS.success } : { bg: "rgba(97,205,253,0.15)", text: COLORS.primary };
                            return (
                              <div key={b.id} onClick={() => setActiveBillDetail(b)} style={{ background: colorSet.bg, borderRadius: 4, padding: "2px 6px", marginBottom: 2, cursor: "pointer", border: bPaidCal ? `1px solid ${COLORS.success}40` : "1px solid transparent" }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: colorSet.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}{bPaidCal ? " ✓" : ""}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>}
                {/* List view (quick read-only toggle) */}
                {billCalView === "list" && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 60px 28px", gap: 8, padding: "8px 12px", background: COLORS.containerLow, borderRadius: 10, marginBottom: 8 }}>
                      {["Bill", "Due Date", "Amount", "Status", "Action", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 700, color: COLORS.subtext, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>)}
                    </div>
                    {bills.length === 0 && <p style={{ fontSize: 14, color: COLORS.muted, padding: "20px 0", textAlign: "center" }}>No bills yet.</p>}
                    {[...bills].sort((a,b) => a.dayOfMonth - b.dayOfMonth).map(b => {
                      const bDueDateL = getBillDueDate(b, calMk);
                      const [y,m,dd] = bDueDateL.split("-").map(Number);
                      const dDate = new Date(y,m-1,dd); const nowL = new Date(); nowL.setHours(0,0,0,0);
                      const bPaidL = getBillPaid(b, calMk);
                      const isOverdueL = !bPaidL && dDate < nowL;
                      return (
                        <div key={b.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 60px 28px", gap: 8, padding: "10px 12px", borderRadius: 8, background: COLORS.card, marginBottom: 4, boxShadow: COLORS.shadowSm, alignItems: "center", borderLeft: `3px solid ${bPaidL ? COLORS.success : isOverdueL ? COLORS.danger : "transparent"}` }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{b.label}</span>
                          <span style={{ fontSize: 12, color: COLORS.subtext }}>{fmtDate(bDueDateL)}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{fmt(b.budget)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: bPaidL ? COLORS.success : isOverdueL ? COLORS.danger : COLORS.subtext, background: (bPaidL ? COLORS.success : isOverdueL ? COLORS.danger : COLORS.muted) + "18", borderRadius: 9999, padding: "2px 8px" }}>{bPaidL ? "Paid" : isOverdueL ? "Overdue" : "Upcoming"}</span>
                          {!bPaidL ? <button onClick={() => markBillPaid(b.id, calMk)} style={{ background: COLORS.primary, color:"#fff", border:"none", borderRadius:9999, padding:"4px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Mark Paid</button> : <span style={{ fontSize: 14, color: COLORS.success }}>✓</span>}
                          <button onClick={() => setBills(p => p.filter(x => x.id !== b.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Always-visible editable bills list ── */}
              <div style={{ background: COLORS.card, borderRadius: 20, padding: 28, boxShadow: COLORS.shadowSm, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>Bills This Month</h3>
                  <button onClick={() => setNewBillInline({ label: "", budget: "", dayOfMonth: "" })} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,103,136,0.08)", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: COLORS.primary, cursor: "pointer" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>+ Add Bill
                  </button>
                </div>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 28px", gap: 8, padding: "8px 12px", background: COLORS.containerLow, borderRadius: 10, marginBottom: 10 }}>
                  {["Bill Name", "Due Date", "Amount", "Status", "Action", ""].map(h => <span key={h} style={{ fontSize: 11, fontWeight: 700, color: COLORS.subtext, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>)}
                </div>
                {bills.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted, padding: "16px 0", textAlign: "center" }}>No bills added yet.</p>}
                {[...bills].sort((a,b) => a.dayOfMonth - b.dayOfMonth).map(b => {
                  const bDueDateE = getBillDueDate(b, calMk);
                  const [y,m,dd] = bDueDateE.split("-").map(Number);
                  const dDate = new Date(y,m-1,dd); const nowE = new Date(); nowE.setHours(0,0,0,0);
                  const bPaidE = getBillPaid(b, calMk);
                  const isOverdueE = !bPaidE && dDate < nowE;
                  const isEL = editingBillCell?.id === b.id && editingBillCell?.field === "label";
                  const isED = editingBillCell?.id === b.id && editingBillCell?.field === "dueDate";
                  const isEA = editingBillCell?.id === b.id && editingBillCell?.field === "budget";
                  const cellInp = { background: COLORS.containerLow, border: `1px solid ${COLORS.primary}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, color: COLORS.text, outline: "none", width: "100%" };
                  return (
                    <div key={b.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 28px", gap: 8, padding: "10px 12px", borderRadius: 10, background: bPaidE ? COLORS.success + "08" : isOverdueE ? COLORS.danger + "06" : COLORS.containerLow + "60", marginBottom: 6, alignItems: "center", borderLeft: `3px solid ${bPaidE ? COLORS.success : isOverdueE ? COLORS.danger : "transparent"}` }}>
                      {/* Bill Name */}
                      {isEL ? <input autoFocus defaultValue={b.label} style={cellInp} onBlur={e => { setBills(p => p.map(x => x.id===b.id?{...x,label:e.target.value||x.label}:x)); setEditingBillCell(null); }} onKeyDown={e=>{ if(e.key==="Enter")e.target.blur(); if(e.key==="Escape")setEditingBillCell(null); }} />
                        : <span onClick={() => setEditingBillCell({id:b.id,field:"label"})} style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, cursor: "text" }}>{b.label}</span>}
                      {/* Due Date */}
                      {isED ? <input autoFocus type="number" min="1" max="31" defaultValue={b.dayOfMonth} style={cellInp} onBlur={e => { const v = parseInt(e.target.value); if(v >= 1 && v <= 31) setBills(p => p.map(x => x.id===b.id?{...x,dayOfMonth:v}:x)); setEditingBillCell(null); }} onKeyDown={e=>{ if(e.key==="Enter")e.target.blur(); if(e.key==="Escape")setEditingBillCell(null); }} />
                        : <span onClick={() => setEditingBillCell({id:b.id,field:"dueDate"})} style={{ fontSize: 12, color: isOverdueE ? COLORS.danger : COLORS.subtext, cursor: "text" }}>{fmtDate(bDueDateE)}</span>}
                      {/* Amount */}
                      {isEA ? <input autoFocus type="number" defaultValue={b.budget} style={cellInp} onBlur={e => { const v=parseFloat(e.target.value); if(!isNaN(v)&&v>=0) setBills(p=>p.map(x=>x.id===b.id?{...x,budget:v}:x)); setEditingBillCell(null); }} onKeyDown={e=>{ if(e.key==="Enter")e.target.blur(); if(e.key==="Escape")setEditingBillCell(null); }} />
                        : <span onClick={() => setEditingBillCell({id:b.id,field:"budget"})} style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, cursor: "text" }}>{fmt(b.budget)}</span>}
                      {/* Status */}
                      <span style={{ fontSize: 11, fontWeight: 700, color: bPaidE ? COLORS.success : isOverdueE ? COLORS.danger : COLORS.subtext, background: (bPaidE ? COLORS.success : isOverdueE ? COLORS.danger : COLORS.muted) + "18", borderRadius: 9999, padding: "3px 10px", display: "inline-block" }}>
                        {bPaidE ? "Paid" : isOverdueE ? "Overdue" : "Upcoming"}
                      </span>
                      {/* Action */}
                      {bPaidE
                        ? <button onClick={() => markBillPaid(b.id, calMk, false)} style={{ background: COLORS.containerLow, border:"none", borderRadius:8, padding:"5px 8px", fontSize:11, fontWeight:700, color:COLORS.subtext, cursor:"pointer" }}>Unpay</button>
                        : <button onClick={() => markBillPaid(b.id, calMk)} style={{ background: COLORS.primary, color:"#fff", border:"none", borderRadius:8, padding:"5px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Mark Paid</button>
                      }
                      {/* Delete */}
                      <button onClick={() => setBills(p => p.filter(x => x.id !== b.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
                    </div>
                  );
                })}
                {/* Inline Add Row */}
                {newBillInline !== null && (
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px 28px", gap: 8, padding: "10px 12px", borderRadius: 10, background: COLORS.primary + "08", marginTop: 8, alignItems: "center" }}>
                    <input autoFocus placeholder="Bill name" value={newBillInline.label} onChange={e => setNewBillInline(p => ({...p, label: e.target.value}))} style={{ ...inpStyleInline, width: "100%" }} />
                    <input type="number" min="1" max="31" placeholder="Day" value={newBillInline.dayOfMonth} onChange={e => setNewBillInline(p => ({...p, dayOfMonth: e.target.value}))} style={{ ...inpStyleInline, width: "100%" }} />
                    <input type="number" placeholder="Amount" value={newBillInline.budget} onChange={e => setNewBillInline(p => ({...p, budget: e.target.value}))} style={{ ...inpStyleInline, width: "100%" }} />
                    <span style={{ fontSize: 11, color: COLORS.muted }}>Upcoming</span>
                    <button onClick={() => { if(!newBillInline.label || !newBillInline.budget) return; setBills(p => [...p, { id: Date.now(), label: newBillInline.label, budget: parseFloat(newBillInline.budget)||0, dayOfMonth: parseInt(newBillInline.dayOfMonth)||1 }]); setNewBillInline(null); }} style={{ background: COLORS.primary, color:"#fff", border:"none", borderRadius:8, padding:"6px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Save</button>
                    <button onClick={() => setNewBillInline(null)} style={{ background:"none", border:"none", color:COLORS.muted, cursor:"pointer", fontSize:18, padding:0 }}>×</button>
                  </div>
                )}
              </div>

              {/* ── Statements panel ── */}
              <div style={{ background: COLORS.card, borderRadius: 20, padding: 28, boxShadow: COLORS.shadowSm }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 16 }}>Statements</h4>
                {(() => {
                  const now2 = new Date(); now2.setHours(0,0,0,0);
                  const in14 = new Date(now2.getTime() + 14 * 86400000);
                  const overdueBills2 = unpaidBills.filter(b => { const dueDateStr = getBillDueDate(b, calMk); const [y2,m2,d2] = dueDateStr.split("-").map(Number); return new Date(y2,m2-1,d2) < now2; });
                  const upcomingBills2 = unpaidBills.filter(b => { const dueDateStr = getBillDueDate(b, calMk); const [y2,m2,d2] = dueDateStr.split("-").map(Number); const dt = new Date(y2,m2-1,d2); return dt >= now2 && dt <= in14; });
                  const StmtRow = ({b, color}) => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${COLORS.containerLow}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>receipt_long</span>
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{b.label}</p>
                          <p style={{ fontSize: 11, color }}>{fmtDate(getBillDueDate(b, calMk))}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{fmt(b.budget)}</span>
                        <button onClick={() => markBillPaid(b.id, calMk)} style={{ background: COLORS.primary, color:"#fff", border:"none", borderRadius:9999, padding:"3px 9px", fontSize:10, fontWeight:700, cursor:"pointer" }}>Paid</button>
                      </div>
                    </div>
                  );
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: overdueBills2.length > 0 && upcomingBills2.length > 0 ? "1fr 1fr" : "1fr", gap: 20 }}>
                      {overdueBills2.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 800, color: COLORS.danger, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>● Overdue</p>
                          {overdueBills2.map(b => <StmtRow key={b.id} b={b} color={COLORS.danger} />)}
                        </div>
                      )}
                      {upcomingBills2.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 800, color: COLORS.primary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>● Next 14 Days</p>
                          {upcomingBills2.map(b => <StmtRow key={b.id} b={b} color={COLORS.subtext} />)}
                        </div>
                      )}
                      {overdueBills2.length === 0 && upcomingBills2.length === 0 && <p style={{ fontSize: 13, color: COLORS.muted }}>No upcoming bills in the next 14 days.</p>}
                    </div>
                  );
                })()}
              </div>
            {/* Bill detail popover (BUG #10) */}
            {activeBillDetail && (() => {
              const b = bills.find(x => x.id === activeBillDetail.id) || activeBillDetail;
              const bDueDatePop = getBillDueDate(b, calMk);
              const [y2,m2,d2] = bDueDatePop.split("-").map(Number);
              const isPast = new Date(y2,m2-1,d2) < new Date(new Date().toDateString());
              const bPaidPop = getBillPaid(b, calMk);
              const popInpStyle = { background: COLORS.containerLow, border: `1px solid ${COLORS.primary}`, borderRadius: 8, padding: "4px 10px", fontSize: 14, color: COLORS.text, outline: "none", textAlign: "right" };
              const isELabel = editingBillCell?.id === b.id && editingBillCell?.field === "label";
              const isEAmt = editingBillCell?.id === b.id && editingBillCell?.field === "budget";
              const isEDate = editingBillCell?.id === b.id && editingBillCell?.field === "dueDate";
              return (
                <div onClick={() => { setActiveBillDetail(null); setEditingBillCell(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: COLORS.card, borderRadius: 20, padding: 32, minWidth: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "flex-start" }}>
                      {isELabel
                        ? <input autoFocus defaultValue={b.label} style={{ ...popInpStyle, textAlign: "left", fontSize: 18, fontWeight: 800, flex: 1, marginRight: 8 }} onBlur={e => { setBills(p => p.map(x => x.id === b.id ? {...x, label: e.target.value || x.label} : x)); setEditingBillCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingBillCell(null); }} />
                        : <h3 onClick={() => setEditingBillCell({id: b.id, field: "label"})} title="Click to edit" style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, cursor: "text", flex: 1 }}>{b.label}</h3>
                      }
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setBills(p => p.filter(x => x.id !== b.id)); setActiveBillDetail(null); setEditingBillCell(null); }} title="Delete bill" style={{ background: COLORS.danger + "18", border: "none", color: COLORS.danger, borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                        <button onClick={() => { setActiveBillDetail(null); setEditingBillCell(null); }} style={{ background: COLORS.containerHigh, border: "none", fontSize: 20, cursor: "pointer", color: COLORS.muted, borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: COLORS.subtext }}>Amount</span>
                        {isEAmt
                          ? <input autoFocus type="number" defaultValue={b.budget} style={popInpStyle} onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setBills(p => p.map(x => x.id === b.id ? {...x, budget: v} : x)); setEditingBillCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingBillCell(null); }} />
                          : <span onClick={() => setEditingBillCell({id: b.id, field: "budget"})} title="Click to edit" style={{ fontSize: 14, fontWeight: 700, color: COLORS.text, cursor: "text" }}>{fmt(b.budget)}</span>
                        }
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, color: COLORS.subtext }}>Due Date</span>
                        {isEDate
                          ? <input autoFocus type="number" min="1" max="31" defaultValue={b.dayOfMonth} style={popInpStyle} onBlur={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= 31) setBills(p => p.map(x => x.id === b.id ? {...x, dayOfMonth: v} : x)); setEditingBillCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingBillCell(null); }} />
                          : <span onClick={() => setEditingBillCell({id: b.id, field: "dueDate"})} title="Click to edit" style={{ fontSize: 14, color: COLORS.text, cursor: "text" }}>{fmtDate(bDueDatePop)}</span>
                        }
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, color: COLORS.subtext }}>Status</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: bPaidPop ? COLORS.success : isPast ? COLORS.danger : COLORS.subtext }}>{bPaidPop ? "Paid ✓" : isPast ? "Overdue" : "Upcoming"}</span>
                      </div>
                    </div>
                    {!bPaidPop && <button onClick={() => { markBillPaid(b.id, calMk); setActiveBillDetail(null); }} style={{ width: "100%", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Mark as Paid</button>}
                  </div>
                </div>
              );
            })()}
            </div>
          );
        })()}
        {/* ── MONTHLY INSIGHTS TAB ── */}
        {tab === "insights" && (
          <div>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 24, color: COLORS.sidebarText, letterSpacing: "-0.02em", marginBottom: 4 }}>Monthly Insights</h2>
                <p style={{ color: COLORS.subtext, fontSize: 14 }}>All months · Click any month for details & AI analysis</p>
              </div>
              {/* Start month picker */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: COLORS.muted }}>Budget starts:</span>
                <select
                  value={startMonthKey}
                  onChange={e => setStartMonthKey(e.target.value)}
                  style={{ ...selectStyle, width: "auto", padding: "6px 12px", fontSize: 13 }}
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const d = new Date(2024, i, 1);
                    const k = monthKey(d.getFullYear(), d.getMonth());
                    return <option key={k} value={k}>{MONTH_FULL[d.getMonth()]} {d.getFullYear()}</option>;
                  })}
                </select>
              </div>
            </div>
            {/* All-months mini-card strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 28 }}>
              {allInsightMonths.map((key) => {
                const { month0, year } = parseKey(key);
                const s = monthStats(key);
                const isActive = key === activeInsightKey;
                const isToday = key === todayKey;
                const isFuture = key > todayKey;
                const hasData = s.hasData;
                const netColor = s.net >= 0 ? COLORS.success : COLORS.danger;
                return (
                  <button key={key} onClick={() => setActiveInsightKey(key)} style={{
                    background: isActive ? COLORS.accentBlue + "22" : COLORS.card,
                    border: `1.5px ${isFuture && !hasData ? "dashed" : "solid"} ${isActive ? COLORS.accentBlue : isToday ? COLORS.accent + "66" : COLORS.border}`,
                    borderRadius: 14, padding: "14px 12px", cursor: "pointer", textAlign: "left",
                    boxShadow: isActive ? `0 0 16px ${COLORS.accentBlue}33` : "none",
                    transition: "all .2s", position: "relative",
                  }}>
                    {isToday && <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: COLORS.accent }} />}
                    <p style={{ fontSize: 11, fontWeight: 800, color: isActive ? COLORS.accentBlue : COLORS.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                      {MONTH_NAMES[month0]} {String(year).slice(2)}
                    </p>
                    {hasData ? (
                      <>
                        <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>{fmt(s.exp)}</p>
                        <p style={{ fontSize: 11, color: netColor }}>{s.net >= 0 ? "+" : ""}{fmt(s.net)}</p>
                        {/* Tiny bar */}
                        <div style={{ marginTop: 8, background: COLORS.border, borderRadius: 99, height: 3 }}>
                          <div style={{ width: `${Math.min(100, s.inc > 0 ? (s.exp/s.inc)*100 : 0)}%`, background: s.exp > s.inc ? COLORS.danger : COLORS.accent, height: "100%", borderRadius: 99 }} />
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: 11, color: COLORS.border, marginTop: 6 }}>No data</p>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Detail panel for activeInsightKey */}
            {(() => {
              const key = activeInsightKey;
              const { month0, year } = parseKey(key);
              const snap = getSnap(key);
              const s = monthStats(key);
              const prevKey = monthKey(year, month0 - 1);
              const prevS = monthStats(prevKey);
              const isCurrent = key === todayKey;
              return (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div>
                      <h3 style={{ fontWeight: 800, fontSize: 18 }}>
                        {MONTH_FULL[month0]} {year}
                        {isCurrent && <span style={{ marginLeft: 10, fontSize: 11, background: COLORS.accent + "22", color: COLORS.accent, border: `1px solid ${COLORS.accent}44`, borderRadius: 6, padding: "2px 8px", verticalAlign: "middle" }}>Current</span>}
                      </h3>
                      {prevS.hasData && (
                        <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>
                          vs {MONTH_NAMES[parseKey(prevKey).month0]}: expenses {s.exp > prevS.exp ? "▲" : "▼"} {fmt(Math.abs(s.exp - prevS.exp))} · net {s.net > prevS.net ? "▲" : "▼"} {fmt(Math.abs(s.net - prevS.net))}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => generateInsight(key)}
                      disabled={!s.hasData || insightLoading[key]}
                      style={{ background: COLORS.primary + "18", border: `1px solid ${COLORS.primary}44`, color: COLORS.primary, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: s.hasData ? "pointer" : "not-allowed", opacity: s.hasData ? 1 : 0.4, display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {insightLoading[key] ? <><div style={{ width: 12, height: 12, border: `2px solid ${COLORS.primary}44`, borderTopColor: COLORS.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Analyzing…</> : "✦ AI Insights"}
                    </button>
                  </div>
                  {/* AI insight box */}
                  {insightText[key] && (
                    <div style={{ background: COLORS.accentPurple + "12", border: `1px solid ${COLORS.accentPurple}44`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
                      <p style={{ fontSize: 12, color: COLORS.accentPurple, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>✦ Claude's Analysis</p>
                      {insightText[key].split("\n").filter(l => l.trim()).map((line, i) => (
                        <p key={i} style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, marginBottom: 4 }}>{line}</p>
                      ))}
                    </div>
                  )}
                  {!s.hasData ? (
                    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
                      <p style={{ fontSize: 32, marginBottom: 12 }}>📭</p>
                      <p style={{ fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>No data for {MONTH_FULL[month0]}</p>
                      <p style={{ color: COLORS.muted, fontSize: 13 }}>Switch to this month and use the + button to add entries,<br />or they'll appear here automatically.</p>
                    </div>
                  ) : (
                    <>
                      {/* KPI row */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                        {[
                          { label: "Income", val: s.inc, color: COLORS.accent },
                          { label: "Expenses", val: s.exp, color: COLORS.accentWarm },
                          { label: "Net", val: s.net, color: s.net >= 0 ? COLORS.success : COLORS.danger },
                          { label: "Savings Rate", val: s.inc > 0 ? `${Math.max(0,(s.net/s.inc*100)).toFixed(1)}%` : "—", color: COLORS.accentPurple, raw: true },
                        ].map(k => (
                          <div key={k.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 16px 12px" }}>
                            <p style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.label}</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.raw ? k.val : fmt(k.val)}</p>
                            {prevS.hasData && !k.raw && (() => {
                              const prev = k.label === "Income" ? prevS.inc : k.label === "Expenses" ? prevS.exp : prevS.net;
                              const diff = k.val - prev;
                              return <p style={{ fontSize: 11, color: diff >= 0 ? (k.label === "Expenses" ? COLORS.danger : COLORS.success) : (k.label === "Expenses" ? COLORS.success : COLORS.danger), marginTop: 3 }}>{diff >= 0 ? "+" : ""}{fmt(diff)} vs prev</p>;
                            })()}
                          </div>
                        ))}
                      </div>
                      {/* Debt / Net Worth row */}
                      {(() => {
                        const netWorth = savingsActualTotal - totalDebt;
                        const debtToInc = s.inc > 0 ? ((totalDebt / s.inc) * 100).toFixed(0) : "—";
                        return (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                            {[
                              { label: "Total Debt", val: fmt(totalDebt), color: COLORS.danger },
                              { label: "Net Worth", val: fmt(netWorth), color: netWorth >= 0 ? COLORS.success : COLORS.danger },
                              { label: "Debt-to-Income", val: debtToInc === "—" ? "—" : `${debtToInc}%`, color: parseFloat(debtToInc) > 200 ? COLORS.danger : parseFloat(debtToInc) > 100 ? COLORS.warning : COLORS.success },
                            ].map(k => (
                              <div key={k.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "14px 16px" }}>
                                <p style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{k.label}</p>
                                <p style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.val}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {/* Category breakdown */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                        {/* Spending by Category */}
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Spending by Category</h4>
                          {CATEGORIES.filter(c => s.cats[c.id] > 0 || viewExpenseBudgets[c.id] > 0).sort((a,b) => (s.cats[b.id]||0)-(s.cats[a.id]||0)).map(c => {
                            const budget = viewExpenseBudgets[c.id] || 0;
                            const spent = s.cats[c.id] || 0;
                            const barMax2 = Math.max(spent, budget, 1);
                            return (
                            <div key={c.id} style={{ marginBottom: 11 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: COLORS.text }}>{c.label}</span>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>{fmt(spent)}{budget > 0 ? ` / ${fmt(budget)}` : ""}</span>
                              </div>
                              <div style={{ position: "relative", height: 6, background: COLORS.containerLow, borderRadius: 9999, overflow: "visible" }}>
                                {budget > 0 && (
                                  <div style={{ position: "absolute", top: 0, left: 0, width: `${pct(budget, barMax2)}%`, height: "100%", background: COLORS.primary + "30", borderRadius: 9999 }} />
                                )}
                                <div style={{ position: "absolute", top: 0, left: 0, width: `${pct(spent, barMax2)}%`, height: "100%", background: spent > budget && budget > 0 ? COLORS.danger : COLORS.accentBlue, borderRadius: 9999, transition: "width .4s" }} />
                              </div>
                            </div>
                            );
                          })}
                          {CATEGORIES.every(c => s.cats[c.id] === 0) && <p style={{ color: COLORS.muted, fontSize: 13 }}>No expenses recorded.</p>}
                        </div>
                        {/* Debt Details */}
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Debt Details</h4>
                          {debts.length === 0 ? (
                            <p style={{ color: COLORS.muted, fontSize: 13 }}>No debts recorded.</p>
                          ) : (
                            debts.map(d => {
                              const paidOff = d.balance <= 0;
                              return (
                                <div key={d.id} style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, background: COLORS.containerLow }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{d.label}</span>
                                    <span style={{ fontSize: 13, color: paidOff ? COLORS.success : COLORS.danger, fontWeight: 700 }}>{paidOff ? "Paid off!" : fmt(d.balance)}</span>
                                  </div>
                                  <div style={{ display: "flex", gap: 12 }}>
                                    <span style={{ fontSize: 11, color: COLORS.muted }}>{d.interest}% APR</span>
                                    <span style={{ fontSize: 11, color: COLORS.muted }}>Min: {fmt(d.minPayment)}/mo</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          {totalDebt > 0 && (
                            <button
                              onClick={() => { setAdvisorMsg(`Can we pay our debt down faster? We have ${debts.map(d => `${d.label}: ${fmt(d.balance)} at ${d.interest}% APR (min payment ${fmt(d.minPayment)})`).join(", ")}. Our monthly income is ${fmt(s.inc)} and total expenses are ${fmt(s.exp)}. Please give us a specific payoff plan with estimated payoff dates.`); pendingAdvisorSend.current = true; setTab("advisor"); }}
                              style={{ width: "100%", marginTop: 10, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDim})`, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                            >
                              🚀 Can we pay this debt down faster?
                            </button>
                          )}
                        </div>
                        {/* 50/30/20 */}
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>50 / 30 / 20</h4>
                          {(() => {
                            const debtMins = debts.reduce((s,d) => s+d.minPayment, 0);
                            const needs2 = snap.expenses.filter(e => ["Housing","Utilities","Transport","Health"].includes(e.category)).reduce((s,e)=>s+e.amount,0) + debtMins;
                            const wants2 = snap.expenses.filter(e => ["Food","Entertainment","Personal","Education","Other"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
                            const sav2 = snap.expenses.filter(e => e.category === "Savings").reduce((s2,e) => s2+e.amount, 0);
                            return (
                              <>
                                {[
                                  { label: "Needs (50%)", val: needs2, target: s.inc * 0.5, color: COLORS.accentBlue, note: debtMins > 0 ? `incl. ${fmt(debtMins)} debt mins` : null },
                                  { label: "Wants (30%)", val: wants2, target: s.inc * 0.3, color: COLORS.accentPurple },
                                  { label: "Savings (20%)", val: sav2, target: s.inc * 0.2, color: COLORS.accent },
                                ].map(b => (
                                  <div key={b.label} style={{ marginBottom: 14 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                      <span style={{ fontSize: 12, color: b.color, fontWeight: 600 }}>{b.label}</span>
                                      <span style={{ fontSize: 12, color: COLORS.muted }}>{fmt(b.val)} / {fmt(b.target)}</span>
                                    </div>
                                    {b.note && <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>{b.note}</p>}
                                    <ProgressBar value={b.val} max={b.target} color={b.color} />
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                            <h4 style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: COLORS.muted }}>Notes</h4>
                            <textarea
                              value={snap.notes || ""}
                              onChange={e => updateSnapNotes(key, e.target.value)}
                              placeholder="Add notes for this month…"
                              rows={3}
                              style={{ ...inputStyle, resize: "none", fontSize: 12, lineHeight: 1.6 }}
                            />
                          </div>
                        </div>
                      </div>
                      {/* Transactions list */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: COLORS.accent }}>Income ({snap.income.length})</h4>
                          {snap.income.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 12 }}>None recorded</p> :
                            snap.income.map(i => (
                              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                                <span style={{ fontSize: 13 }}>{i.label}</span>
                                <span style={{ fontSize: 13, color: COLORS.accent }}>+{fmt(i.amount)}</span>
                              </div>
                            ))
                          }
                        </div>
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: COLORS.accentWarm }}>Expenses ({snap.expenses.length})</h4>
                          {snap.expenses.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 12 }}>None recorded</p> :
                            snap.expenses.slice().sort((a,b)=>b.amount-a.amount).map(e => (
                              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                                <div>
                                  <p style={{ fontSize: 13 }}>{e.label}</p>
                                  <p style={{ fontSize: 10, color: COLORS.muted }}>{e.category}</p>
                                </div>
                                <span style={{ fontSize: 13, color: COLORS.accentWarm }}>−{fmt(e.amount)}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            {/* Year-at-a-glance summary bar */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, marginTop: 28 }}>
              <h4 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Year-at-a-Glance</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
                {(() => {
                  const allStats = allInsightMonths.map(k => monthStats(k));
                  const totalInc = allStats.reduce((s,m)=>s+m.inc,0);
                  const totalExp = allStats.reduce((s,m)=>s+m.exp,0);
                  const bestMonth = allInsightMonths.reduce((best,k) => monthStats(k).net > monthStats(best).net ? k : best, allInsightMonths[0]);
                  const worstMonth = allInsightMonths.filter(k=>monthStats(k).hasData).reduce((worst,k) => monthStats(k).net < monthStats(worst).net ? k : worst, allInsightMonths[0]);
                  return [
                    { label: "Total Income", val: fmt(totalInc), color: COLORS.accent },
                    { label: "Total Expenses", val: fmt(totalExp), color: COLORS.accentWarm },
                    { label: "Net Saved", val: fmt(totalInc - totalExp), color: totalInc >= totalExp ? COLORS.success : COLORS.danger },
                    { label: "Avg / Month", val: fmt(allStats.filter(m=>m.hasData).length ? totalExp / allStats.filter(m=>m.hasData).length : 0), color: COLORS.accentPurple },
                  ].map(k => (
                    <div key={k.label} style={{ background: COLORS.surface, borderRadius: 12, padding: 16 }}>
                      <p style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.label}</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.val}</p>
                    </div>
                  ));
                })()}
              </div>
              {/* Dual-series Income vs Expenses bar chart */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.primary }} /><span style={{ fontSize: 11, color: COLORS.subtext }}>Income</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.accentWarm }} /><span style={{ fontSize: 11, color: COLORS.subtext }}>Expenses</span></div>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80 }}>
                {allInsightMonths.map(key => {
                  const s = monthStats(key);
                  const { month0 } = parseKey(key);
                  const maxVal = Math.max(...allInsightMonths.map(k => Math.max(monthStats(k).inc, monthStats(k).exp)), 1);
                  const incH = s.hasData && s.inc > 0 ? Math.max(4, (s.inc / maxVal) * 68) : 2;
                  const expH = s.hasData && s.exp > 0 ? Math.max(4, (s.exp / maxVal) * 68) : 2;
                  return (
                    <div key={key} onClick={() => setActiveInsightKey(key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 68, width: "100%" }}>
                        <div style={{ flex: 1, height: incH, background: key === activeInsightKey ? COLORS.primary : COLORS.primary + "66", borderRadius: "3px 3px 0 0", transition: "all .2s" }} />
                        <div style={{ flex: 1, height: expH, background: key === activeInsightKey ? COLORS.accentWarm : COLORS.accentWarm + "66", borderRadius: "3px 3px 0 0", transition: "all .2s" }} />
                      </div>
                      <span style={{ fontSize: 9, color: key === activeInsightKey ? COLORS.primary : COLORS.muted, whiteSpace: "nowrap" }}>{MONTH_NAMES[month0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {/* ── AI ASSISTANT TAB ── */}
        {tab === "advisor" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 140px)", position: "relative" }}>
            {/* Header */}
            <div style={{ marginBottom: 24, flexShrink: 0 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.sidebarText, letterSpacing: "-0.02em", marginBottom: 4 }}>How can I help you today?</h2>
              <p style={{ fontSize: 14, color: COLORS.subtext }}>Your family financial co-pilot is ready.</p>
            </div>
            {/* Chat history */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 24, paddingBottom: 160, paddingRight: 4 }}>
              {advisorHistory.length === 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { icon: "shopping_cart", label: "How's our grocery spending?", bg: COLORS.secondaryContainer, color: COLORS.onSecondaryContainer },
                    { icon: "trending_up", label: "Investment update", bg: COLORS.containerHighest, color: COLORS.text },
                    { icon: "savings", label: "Vacation goal progress", bg: COLORS.containerHighest, color: COLORS.text },
                  ].map(chip => (
                    <button key={chip.label} onClick={() => { setAdvisorMsg(chip.label); handleAdvisor(chip.label); }} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
                      background: chip.bg, border: "none", borderRadius: 9999, cursor: "pointer",
                      fontSize: 13, fontWeight: 600, color: chip.color, fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{chip.icon}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
              {advisorHistory.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 12, alignItems: "flex-start" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#fff", fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    </div>
                  )}
                  <div style={{
                    background: msg.role === "user" ? COLORS.containerHighest : "rgba(255,255,255,0.85)",
                    backdropFilter: msg.role === "assistant" ? "blur(20px)" : "none",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                    padding: "16px 20px", maxWidth: "70%",
                    color: COLORS.text,
                    boxShadow: msg.role === "assistant" ? COLORS.shadowSm : "none",
                  }}>
                    {msg.role === "assistant" ? renderMd(msg.content) : <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>{msg.content}</p>}
                    {msg.role === "user" && <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 6, textAlign: "right" }}>
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>}
                  </div>
                </div>
              ))}
              {advisorLoading && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#fff", fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)", borderRadius: "4px 16px 16px 16px", padding: "16px 20px", boxShadow: COLORS.shadowSm }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {[0,1,2].map(j => <div key={j} style={{ width: 8, height: 8, background: COLORS.primary, borderRadius: "50%", animation: `bounce .8s ${j*0.15}s infinite alternate` }} />)}
                    </div>
                    <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-6px); } }`}</style>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
              {/* Chips after AI response */}
              {advisorHistory.length > 0 && !advisorLoading && advisorHistory[advisorHistory.length - 1]?.role === "assistant" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { icon: "shopping_cart", label: "How's our grocery spending?" },
                    { icon: "trending_up", label: "Investment update" },
                    { icon: "savings", label: "Vacation goal progress" },
                  ].map(chip => (
                    <button key={chip.label} onClick={() => { setAdvisorMsg(chip.label); handleAdvisor(chip.label); }} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                      background: COLORS.containerHighest, border: "none", borderRadius: 9999, cursor: "pointer",
                      fontSize: 12, fontWeight: 600, color: COLORS.text, fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{chip.icon}</span>
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Fixed bottom input */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(248,250,251,0.85)", backdropFilter: "blur(20px)", padding: "16px 0 8px" }}>
              {advisorFile && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 12px", background: `rgba(0,103,136,0.1)`, borderRadius: 8, width: "fit-content" }}>
                  <span style={{ fontSize: 13, color: COLORS.primary }}>📎 {advisorFile.name}</span>
                  <button onClick={() => setAdvisorFile(null)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}>×</button>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: COLORS.containerLow, borderRadius: 9999, padding: "8px 8px 8px 20px", border: `1px solid rgba(172,179,181,0.1)` }}>
                <input
                  value={advisorMsg}
                  onChange={e => setAdvisorMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdvisor(); } }}
                  placeholder="Ask about your finances, goals, or spending..."
                  style={{ flex: 1, background: "transparent", border: "none", fontSize: 14, color: COLORS.text, outline: "none", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
                <input ref={advisorFileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => setAdvisorFile(e.target.files[0])} />
                <button onClick={() => advisorFileRef.current?.click()} style={{ width: 40, height: 40, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.subtext }}>attach_file</span>
                </button>
                <button onClick={handleAdvisor} disabled={advisorLoading} style={{ width: 48, height: 48, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDim})`, border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: COLORS.shadowSm }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#fff" }}>arrow_upward</span>
                </button>
              </div>
              <p style={{ fontSize: 10, textAlign: "center", marginTop: 8, color: COLORS.muted }}>AI can make mistakes. Check important financial info.</p>
            </div>
          </div>
        )}
      </main>
      {/* ── MODALS ── */}
      {modal === "addMenu" && <SmartAddModal
        onClose={() => setModal(null)}
        onManualExpense={() => setModal("addExpense")}
        onManualIncome={() => setModal("addIncome")}
        onImportExpenses={(items) => { setExpenses(prev => [...prev, ...items.map(it => ({ ...it, fixed: it.fixed ?? false }))]); setModal(null); }}
        onImportIncome={(items) => { setIncome(prev => [...prev, ...items.map(it => ({ id: it.id, label: it.label, amount: it.amount, date: it.date, recurring: it.recurring ?? false }))]); setModal(null); }}
      />}
      {modal === "addExpense" && (
        <Modal title={editingExpenseId ? "Edit Expense" : "Add Expense"} onClose={() => { setModal(null); setEditingExpenseId(null); setNewExp({ label: "", amount: "", category: "Food", date: getDefaultDate(viewMonthKey), fixed: false }); }}>
          <Field label="Description"><input style={inputStyle} value={newExp.label} onChange={e => setNewExp(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Groceries" /></Field>
          <Field label="Amount ($)"><input style={inputStyle} type="number" value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></Field>
          <Field label="Category">
            <select style={selectStyle} value={newExp.category} onChange={e => setNewExp(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Date"><input style={inputStyle} type="date" value={newExp.date} onChange={e => setNewExp(p => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Type">
            <div style={{ display: "flex", gap: 10 }}>
              {["Fixed", "Variable"].map(t => (
                <button key={t} onClick={() => setNewExp(p => ({ ...p, fixed: t === "Fixed" }))} style={{ flex: 1, background: (t === "Fixed") === newExp.fixed ? COLORS.accentBlue + "22" : COLORS.inputBg, border: `1px solid ${(t === "Fixed") === newExp.fixed ? COLORS.accentBlue : COLORS.border}`, color: (t === "Fixed") === newExp.fixed ? COLORS.accentBlue : COLORS.muted, borderRadius: 10, padding: "10px", fontWeight: 600, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          </Field>
          <button onClick={addExpense} style={btnPrimary}>{editingExpenseId ? "Save Changes" : "Add Expense"}</button>
        </Modal>
      )}
      {modal === "addIncome" && (
        <Modal title="Add Income" onClose={() => setModal(null)}>
          <Field label="Source"><input style={inputStyle} value={newInc.label} onChange={e => setNewInc(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Salary" /></Field>
          <Field label="Amount ($)"><input style={inputStyle} type="number" value={newInc.amount} onChange={e => setNewInc(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></Field>
          <Field label="Date"><input style={inputStyle} type="date" value={newInc.date} onChange={e => setNewInc(p => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Recurring?">
            <div style={{ display: "flex", gap: 10 }}>
              {["Yes", "No"].map(t => (
                <button key={t} onClick={() => setNewInc(p => ({ ...p, recurring: t === "Yes" }))} style={{ flex: 1, background: (t === "Yes") === newInc.recurring ? COLORS.accent + "22" : COLORS.inputBg, border: `1px solid ${(t === "Yes") === newInc.recurring ? COLORS.accent : COLORS.border}`, color: (t === "Yes") === newInc.recurring ? COLORS.accent : COLORS.muted, borderRadius: 10, padding: "10px", fontWeight: 600, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          </Field>
          <button onClick={addIncome} style={btnPrimary}>Add Income</button>
        </Modal>
      )}
      {modal === "addDebt" && (
        <Modal title="Add Debt" onClose={() => setModal(null)}>
          <Field label="Debt Name"><input style={inputStyle} value={newDebt.label} onChange={e => setNewDebt(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Credit Card" /></Field>
          <Field label="Balance ($)"><input style={inputStyle} type="number" value={newDebt.balance} onChange={e => setNewDebt(p => ({ ...p, balance: e.target.value }))} placeholder="0.00" /></Field>
          <Field label="Min. Payment ($/mo)"><input style={inputStyle} type="number" value={newDebt.minPayment} onChange={e => setNewDebt(p => ({ ...p, minPayment: e.target.value }))} placeholder="0.00" /></Field>
          <Field label="Interest Rate (%)"><input style={inputStyle} type="number" value={newDebt.interest} onChange={e => setNewDebt(p => ({ ...p, interest: e.target.value }))} placeholder="e.g. 19.9" /></Field>
          <button onClick={addDebt} style={{ ...btnPrimary, background: COLORS.danger, color: "#fff" }}>Add Debt</button>
        </Modal>
      )}
      {modal === "goal" && (
        <Modal title="🎯 Set a Budget Goal" onClose={() => { setModal(null); setGoalResponse(""); }}>
          <p style={{ color: COLORS.muted, fontSize: 13, marginBottom: 18 }}>
            Tell Claude your goal in plain English:<br />
            "Spend $400 on groceries this month"<br />
            "Limit entertainment to $80"
          </p>
          <Field label="Your Goal">
            <textarea
              style={{ ...inputStyle, resize: "none" }}
              rows={3}
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              placeholder="e.g. I want to spend no more than $350 on food this month"
            />
          </Field>
          <button onClick={handleGoal} disabled={goalLoading} style={{ ...btnPrimary, background: COLORS.accentPurple, marginBottom: goalResponse ? 16 : 0 }}>
            {goalLoading ? "Processing…" : "Set Goal with AI"}
          </button>
          {goalResponse && (
            <div style={{ background: COLORS.accentPurple + "18", border: `1px solid ${COLORS.accentPurple}44`, borderRadius: 12, padding: 16, marginTop: 4 }}>
              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{goalResponse}</p>
            </div>
          )}
          {goals.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Active Goals</p>
              {goals.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: COLORS.accentPurple }}>{fmt(g.limit)}</span>
                    <button onClick={() => setGoals(prev => prev.filter(x => x.id !== g.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Bills Due Soon" onClose={() => setModal(null)}>
          {(() => {
            const tnow = new Date(); tnow.setHours(0,0,0,0);
            const in7 = new Date(tnow.getTime() + 7 * 86400000);
            const dueSoon = bills.filter(b => { if (getBillPaid(b, viewMonthKey)) return false; const d = new Date(getBillDueDate(b, viewMonthKey)); d.setHours(0,0,0,0); return d <= in7; }).sort((a,b) => new Date(getBillDueDate(a, viewMonthKey))-new Date(getBillDueDate(b, viewMonthKey)));
            if (dueSoon.length === 0) return <p style={{ color: COLORS.muted, fontSize: 14 }}>No bills due in the next 7 days. You're all set!</p>;
            return dueSoon.map(b => {
              const dLeft = Math.round((new Date(getBillDueDate(b, viewMonthKey)).setHours(0,0,0,0) - tnow.getTime()) / 86400000);
              return (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.containerLow}` }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{b.label}</p>
                    <p style={{ fontSize: 12, color: dLeft <= 0 ? COLORS.danger : COLORS.subtext }}>{dLeft < 0 ? `Overdue by ${Math.abs(dLeft)} day${Math.abs(dLeft)===1?"":"s"}` : dLeft === 0 ? "Due today" : `Due in ${dLeft} day${dLeft===1?"":"s"}`}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{fmt(b.budget)}</span>
                    <button onClick={() => markBillPaid(b.id, viewMonthKey)} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Mark Paid</button>
                  </div>
                </div>
              );
            });
          })()}
        </Modal>
      )}
      {modal === "addBill" && (
        <Modal title="Add Bill" onClose={() => { setModal(null); setNewBill({ label: "", budget: "", dayOfMonth: "" }); }}>
          <Field label="Bill Name"><input style={inputStyle} value={newBill.label} onChange={e => setNewBill(p=>({...p,label:e.target.value}))} placeholder="e.g. Electric Bill" /></Field>
          <Field label="Amount"><input style={inputStyle} type="number" value={newBill.budget} onChange={e => setNewBill(p=>({...p,budget:e.target.value}))} placeholder="0" /></Field>
          <Field label="Day of Month"><input style={inputStyle} type="number" min="1" max="31" value={newBill.dayOfMonth} onChange={e => setNewBill(p=>({...p,dayOfMonth:e.target.value}))} placeholder="e.g. 15" /></Field>
          <button disabled={!newBill.label || !newBill.budget || !newBill.dayOfMonth} onClick={() => {
            setBills(p => [...p, { id: Date.now(), label: newBill.label, dayOfMonth: parseInt(newBill.dayOfMonth)||1, budget: parseFloat(newBill.budget)||0 }]);
            setNewBill({ label: "", budget: "", dayOfMonth: "" }); setModal(null);
          }} style={{ ...btnPrimary, opacity: (!newBill.label || !newBill.budget || !newBill.dayOfMonth) ? 0.5 : 1 }}>Add Bill</button>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="Settings" onClose={() => setModal(null)}>
          <Field label="Family Name">
            <input style={inputStyle} value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="e.g. Roberts Family" />
          </Field>
          <Field label="Budget Start Month">
            <select style={selectStyle} value={startMonthKey} onChange={e => setStartMonthKey(e.target.value)}>
              {Array.from({ length: 24 }, (_, i) => {
                const d = new Date(2024, i, 1);
                const k = monthKey(d.getFullYear(), d.getMonth());
                return <option key={k} value={k}>{MONTH_FULL[d.getMonth()]} {d.getFullYear()}</option>;
              })}
            </select>
          </Field>
          <button onClick={() => setModal(null)} style={btnPrimary}>Save Settings</button>
        </Modal>
      )}
      </div>{/* end main column */}
    </div>
  );
}
