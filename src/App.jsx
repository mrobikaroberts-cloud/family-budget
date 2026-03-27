import { useState, useRef, useCallback, useEffect } from "react";
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
// ── Initial data ──────────────────────────────────────────────────────────────
const INITIAL_INCOME = [
  { id: 1, label: "Primary Salary", amount: 5500, date: "2025-06-01", recurring: true },
  { id: 2, label: "Side Freelance", amount: 800, date: "2025-06-15", recurring: false },
];
const INITIAL_EXPENSES = [
  { id: 1, label: "Mortgage / Rent", amount: 1800, category: "Housing", date: "2025-06-01", fixed: true },
  { id: 2, label: "Electricity", amount: 120, category: "Utilities", date: "2025-06-03", fixed: true },
  { id: 3, label: "Groceries", amount: 280, category: "Food", date: "2025-06-05", fixed: false },
  { id: 4, label: "Netflix", amount: 18, category: "Entertainment", date: "2025-06-02", fixed: true },
  { id: 5, label: "Gas", amount: 95, category: "Transport", date: "2025-06-07", fixed: false },
  { id: 6, label: "Gym", amount: 45, category: "Health", date: "2025-06-01", fixed: true },
  { id: 7, label: "Dining out", amount: 140, category: "Food", date: "2025-06-10", fixed: false },
  { id: 8, label: "Car payment", amount: 380, category: "Transport", date: "2025-06-05", fixed: true },
  { id: 9, label: "Internet", amount: 70, category: "Utilities", date: "2025-06-03", fixed: true },
  { id: 10, label: "Clothing", amount: 95, category: "Personal", date: "2025-06-12", fixed: false },
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
const CATEGORIES = ["Housing", "Food", "Utilities", "Transport", "Health", "Entertainment", "Personal", "Education", "Savings", "Kids", "Other"];
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
      "category": "one of: Housing|Food|Utilities|Transport|Health|Entertainment|Personal|Education|Savings|Other",
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
      "category": "Housing|Food|Utilities|Transport|Health|Entertainment|Personal|Education|Savings|Other",
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
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
  // ── Dashboard extra state ──
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [viewMonthKey, setViewMonthKey] = useState(() => monthKey(new Date().getFullYear(), new Date().getMonth()));
  const [budgetStartDate, setBudgetStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [budgetEndDate, setBudgetEndDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10));
  const [startingBalance, setStartingBalance] = useState(0);
  const [showIncomeInCharts, setShowIncomeInCharts] = useState(true);
  const [bills, setBills] = useState([
    { id: 1, label: "Mortgage", dueDate: "2026-03-25", budget: 600, actual: 0, paid: false },
    { id: 2, label: "Car", dueDate: "2026-03-01", budget: 100, actual: 0, paid: false },
    { id: 3, label: "Credit Card", dueDate: "2026-03-07", budget: 50, actual: 0, paid: false },
    { id: 4, label: "Gas", dueDate: "2026-03-12", budget: 50, actual: 50, paid: true },
    { id: 5, label: "Home Insurance", dueDate: "2026-03-15", budget: 25, actual: 0, paid: false },
    { id: 6, label: "Internet", dueDate: "2026-03-21", budget: 25, actual: 0, paid: false },
  ]);
  const [savingsItems, setSavingsItems] = useState([
    { id: 1, label: "House", expected: 300, actual: 400 },
    { id: 2, label: "Holiday", expected: 25, actual: 0 },
    { id: 3, label: "Emergency Fund", expected: 20, actual: 0 },
  ]);
  const [expenseBudgets, setExpenseBudgets] = useState({
    Housing: 1800, Food: 500, Utilities: 300, Transport: 500,
    Health: 100, Entertainment: 150, Personal: 200, Education: 50, Other: 120,
  });
  const [familyName, setFamilyName] = useState("Roberts Family");
  const [expenseCardPage, setExpenseCardPage] = useState(0);
  // Family Budget tab state
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { id, field }
  const [editingDebtCell, setEditingDebtCell] = useState(null); // { id, field }
  const [editingSavingsCell, setEditingSavingsCell] = useState(null); // { id, field }
  const [expSortField, setExpSortField] = useState("date");
  const [expSortDir, setExpSortDir] = useState("asc");
  // ── Monthly insights state ──
  const todayKey = monthKey(new Date().getFullYear(), new Date().getMonth());
  const [startMonthKey, setStartMonthKey] = useState("2025-01");
  const [activeInsightKey, setActiveInsightKey] = useState(todayKey);
  // monthlySnapshots: { [key]: { income: [], expenses: [], notes: string, insightLoading, insightText } }
  const [monthlySnapshots, setMonthlySnapshots] = useState({
    "2025-01": { income: [{ id: 101, label: "Primary Salary", amount: 5500, recurring: true }], expenses: [{ id: 201, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 202, label: "Electricity", amount: 110, category: "Utilities", fixed: true },{ id: 203, label: "Groceries", amount: 320, category: "Food", fixed: false },{ id: 204, label: "Gas", amount: 80, category: "Transport", fixed: false }], notes: "" },
    "2025-02": { income: [{ id: 111, label: "Primary Salary", amount: 5500, recurring: true }], expenses: [{ id: 211, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 212, label: "Electricity", amount: 98, category: "Utilities", fixed: true },{ id: 213, label: "Groceries", amount: 290, category: "Food", fixed: false },{ id: 214, label: "Dining out", amount: 180, category: "Food", fixed: false },{ id: 215, label: "Gym", amount: 45, category: "Health", fixed: true }], notes: "" },
    "2025-03": { income: [{ id: 121, label: "Primary Salary", amount: 5500, recurring: true },{ id: 122, label: "Tax Refund", amount: 1200, recurring: false }], expenses: [{ id: 221, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 222, label: "Electricity", amount: 105, category: "Utilities", fixed: true },{ id: 223, label: "Groceries", amount: 340, category: "Food", fixed: false },{ id: 224, label: "Clothing", amount: 210, category: "Personal", fixed: false }], notes: "" },
    "2025-04": { income: [{ id: 131, label: "Primary Salary", amount: 5500, recurring: true }], expenses: [{ id: 231, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 232, label: "Utilities", amount: 115, category: "Utilities", fixed: true },{ id: 233, label: "Groceries", amount: 310, category: "Food", fixed: false },{ id: 234, label: "Entertainment", amount: 95, category: "Entertainment", fixed: false }], notes: "" },
    "2025-05": { income: [{ id: 141, label: "Primary Salary", amount: 5500, recurring: true },{ id: 142, label: "Side Freelance", amount: 600, recurring: false }], expenses: [{ id: 241, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 242, label: "Electricity", amount: 130, category: "Utilities", fixed: true },{ id: 243, label: "Groceries", amount: 295, category: "Food", fixed: false },{ id: 244, label: "Car payment", amount: 380, category: "Transport", fixed: true },{ id: 245, label: "Health", amount: 60, category: "Health", fixed: false }], notes: "" },
    "2025-06": { income: INITIAL_INCOME, expenses: INITIAL_EXPENSES, notes: "" },
  });
  // Persist current month's live data into snapshots whenever income/expenses change
  useEffect(() => {
    setMonthlySnapshots(prev => ({
      ...prev,
      [todayKey]: { ...(prev[todayKey] || { notes: "" }), income, expenses },
    }));
  }, [income, expenses]);
  // Reset expense card pagination when viewing a different month
  useEffect(() => { setExpenseCardPage(0); }, [viewMonthKey]);
  // Auto-send when navigating to advisor tab from header search
  useEffect(() => {
    if (pendingAdvisorSend.current && tab === "advisor" && advisorMsg) {
      pendingAdvisorSend.current = false;
      handleAdvisor();
    }
  });
  const twelveMonths = build12Months(startMonthKey);
  // Get snapshot for a key (fallback empty)
  const getSnap = (key) => monthlySnapshots[key] || { income: [], expenses: [], notes: "" };
  // Compute stats for any month key
  const monthStats = (key) => {
    const snap = getSnap(key);
    const inc = snap.income.reduce((s, i) => s + i.amount, 0);
    const exp = snap.expenses.reduce((s, e) => s + e.amount, 0);
    const cats = {};
    CATEGORIES.forEach(c => { cats[c] = snap.expenses.filter(e => e.category === c).reduce((s,e)=>s+e.amount,0); });
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
  const savings = Math.max(0, leftover);
  // category totals
  const catTotals = {};
  CATEGORIES.forEach(c => { catTotals[c] = expenses.filter(e => e.category === c).reduce((s,e)=>s+e.amount,0); });
  // weekly report helper
  const weeklyData = CATEGORIES.map(c => ({ name: c, amount: catTotals[c] })).filter(c => c.amount > 0);
  // ── Dashboard derived ──
  const billsBudgetTotal = bills.reduce((s, b) => s + b.budget, 0);
  const billsActualTotal = bills.reduce((s, b) => s + b.actual, 0);
  const savingsExpectedTotal = savingsItems.reduce((s, i) => s + i.expected, 0);
  const savingsActualTotal = savingsItems.reduce((s, i) => s + i.actual, 0);
  const expenseBudgetTotal = Object.values(expenseBudgets).reduce((s, v) => s + v, 0);
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
  const budgetVsActualData = CATEGORIES.filter(c => (expenseBudgets[c] || 0) > 0 || catTotals[c] > 0).map(c => ({
    name: c.slice(0, 5), Budget: expenseBudgets[c] || 0, Actual: catTotals[c] || 0,
  }));
  const expBreakdownData = CATEGORIES.filter(c => catTotals[c] > 0).map((c, i) => ({
    name: c, value: catTotals[c], color: CHART_COLORS[i % CHART_COLORS.length],
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
  const unpaidSorted = bills.filter(b => !b.paid);
  const futureBills = unpaidSorted.filter(b => { const d = new Date(b.dueDate); d.setHours(0,0,0,0); return d >= today0; });
  const nextBill = futureBills.length > 0
    ? futureBills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]
    : unpaidSorted.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))[0];
  const daysUntilBill = nextBill ? Math.round((new Date(nextBill.dueDate).setHours(0,0,0,0) - today0.getTime()) / 86400000) : null;
  const billsDueIn7Days = bills.filter(b => { if (b.paid) return false; const d = new Date(b.dueDate); d.setHours(0,0,0,0); const diff = Math.round((d - today0) / 86400000); return diff >= 0 && diff <= 7; }).length;
  const catExpenseCards = Object.entries(catTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const totalBills = bills.reduce((s, b) => s + (b.budget || 0), 0);
  const totalDebtPayments = debts.reduce((s, d) => s + parseFloat(d.minPayment || 0), 0);
  const totalDebtBalance = debts.reduce((s, d) => s + parseFloat(d.balance || 0), 0);
  const spentPct = Math.round(pct(totalExpenses, totalIncome));
  const CATEGORY_ICONS = { Housing: "home", Food: "restaurant", Transport: "directions_car", Utilities: "bolt", Health: "medication", Entertainment: "movie", Personal: "person", Education: "school", Kids: "child_care", Other: "category" };
  const CATEGORY_ICON_BG = { Housing: "rgba(97,205,253,0.2)", Food: "rgba(192,232,255,0.3)", Transport: "rgba(186,191,255,0.3)", Utilities: "rgba(192,232,255,0.3)", Health: "rgba(186,191,255,0.3)", Entertainment: "rgba(186,191,255,0.3)", Personal: "rgba(186,191,255,0.3)", Education: "rgba(97,205,253,0.2)", Kids: "rgba(192,232,255,0.3)", Other: "#eaeef0" };
  const CATEGORY_ICON_COLOR = { Housing: COLORS.primary, Food: COLORS.secondary, Transport: COLORS.tertiary, Utilities: COLORS.secondary, Health: COLORS.tertiary, Entertainment: COLORS.tertiary, Personal: COLORS.tertiary, Education: COLORS.primary, Kids: COLORS.secondary, Other: COLORS.subtext };
  // ── View-month derived values (dashboard month picker) ──
  const viewSnap = viewMonthKey === todayKey
    ? { income, expenses }
    : (monthlySnapshots[viewMonthKey] || { income: [], expenses: [] });
  const viewExpenses = viewSnap.expenses;
  const viewIncome = viewSnap.income;
  const viewTotalExpenses = viewExpenses.reduce((s, e) => s + e.amount, 0);
  const viewTotalIncome = viewIncome.reduce((s, i) => s + i.amount, 0);
  const viewSpentPct = Math.round(pct(viewTotalExpenses, viewTotalIncome || 1));
  const viewCatTotals = CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: viewExpenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) }), {});
  const viewCatExpenseCards = Object.entries(viewCatTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  // ── Add forms state ──
  const [newExp, setNewExp] = useState({ label: "", amount: "", category: "Food", date: new Date().toISOString().slice(0,10), fixed: false });
  const [newInc, setNewInc] = useState({ label: "", amount: "", date: new Date().toISOString().slice(0,10), recurring: false });
  const [newDebt, setNewDebt] = useState({ label: "", balance: "", minPayment: "", interest: "" });
  const addExpense = () => {
    if (!newExp.label || !newExp.amount) return;
    setExpenses(prev => [...prev, { ...newExp, id: Date.now(), amount: parseFloat(newExp.amount) }]);
    setNewExp({ label: "", amount: "", category: "Food", date: new Date().toISOString().slice(0,10), fixed: false });
    setModal(null);
  };
  const addIncome = () => {
    if (!newInc.label || !newInc.amount) return;
    setIncome(prev => [...prev, { ...newInc, id: Date.now(), amount: parseFloat(newInc.amount) }]);
    setNewInc({ label: "", amount: "", date: new Date().toISOString().slice(0,10), recurring: false });
    setModal(null);
  };
  const addDebt = () => {
    if (!newDebt.label || !newDebt.balance) return;
    setDebts(prev => [...prev, { ...newDebt, id: Date.now(), balance: parseFloat(newDebt.balance), minPayment: parseFloat(newDebt.minPayment)||0, interest: parseFloat(newDebt.interest)||0 }]);
    setNewDebt({ label: "", balance: "", minPayment: "", interest: "" });
    setModal(null);
  };
  const deleteExpenseFromView = (id) => {
    if (viewMonthKey === todayKey) {
      setExpenses(prev => prev.filter(x => x.id !== id));
    } else {
      setMonthlySnapshots(prev => ({ ...prev, [viewMonthKey]: { ...getSnap(viewMonthKey), expenses: getSnap(viewMonthKey).expenses.filter(x => x.id !== id) } }));
    }
  };
  const deleteIncomeFromView = (id) => {
    if (viewMonthKey === todayKey) {
      setIncome(prev => prev.filter(x => x.id !== id));
    } else {
      setMonthlySnapshots(prev => ({ ...prev, [viewMonthKey]: { ...getSnap(viewMonthKey), income: getSnap(viewMonthKey).income.filter(x => x.id !== id) } }));
    }
  };
  const updateExpenseField = (id, field, value) => {
    const updated = (arr) => arr.map(e => e.id === id ? { ...e, [field]: field === "amount" ? (parseFloat(value) || 0) : value } : e);
    if (viewMonthKey === todayKey) { setExpenses(updated); }
    else { setMonthlySnapshots(prev => ({ ...prev, [viewMonthKey]: { ...getSnap(viewMonthKey), expenses: updated(getSnap(viewMonthKey).expenses) } })); }
  };
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
  const handleAdvisor = async () => {
    if (!advisorMsg.trim() && !advisorFile) return;
    const userMsg = advisorMsg.trim();
    setAdvisorLoading(true);
    const { month0, year } = parseKey(viewMonthKey);
    const summary = `Family: ${familyName}. Month: ${MONTH_FULL[month0]} ${year}. Income: ${fmt(viewTotalIncome)}/mo. Expenses: ${fmt(viewTotalExpenses)}/mo. Net: ${fmt(viewTotalIncome - viewTotalExpenses)}. Category breakdown: ${JSON.stringify(viewCatTotals)}. Bills: ${JSON.stringify(bills.map(b => ({ label: b.label, due: b.dueDate, amount: b.budget, paid: b.paid })))}. Debts: ${JSON.stringify(debts.map(d => ({ label: d.label, balance: d.balance, apr: d.interest })))}. Savings goals: ${JSON.stringify(savingsItems)}. Budget goals: ${JSON.stringify(goals)}.`;

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
      <aside style={{ width: 288, background: COLORS.sidebarBg, display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", borderRadius: "0 24px 24px 0" }}>
        {/* Family branding */}
        <div style={{ padding: "24px 24px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #006788, #005a77)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: COLORS.shadowSm }}>
              {familyName.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: COLORS.sidebarText, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{familyName}</h1>
          </div>
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { id: "dashboard",    label: "Overview",            icon: "dashboard" },
            { id: "transactions", label: "Family Budget",        icon: "payments" },
            { id: "weekly",       label: "Bill Calendar",        icon: "calendar_month" },
            { id: "insights",     label: "Monthly Insights",     icon: "bar_chart" },
            { id: "advisor",      label: "AI Assistant",         icon: "smart_toy" },
          ].map(item => (
            <button key={item.id} className="nav-item" onClick={() => setTab(item.id)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
              background: tab === item.id ? COLORS.sidebarActive : "transparent",
              border: "none", borderRadius: 12,
              color: tab === item.id ? "#ffffff" : COLORS.sidebarText,
              fontSize: 14, fontWeight: 500,
              cursor: "pointer", textAlign: "left", width: "100%",
              opacity: tab === item.id ? 1 : 0.8,
              transition: "all 0.15s",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "inherit" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        {/* Add Transaction CTA */}
        <div style={{ padding: "20px 16px 28px" }}>
          <button onClick={() => setModal("addMenu")} style={{
            width: "100%", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDim})`,
            border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 600,
            padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: COLORS.shadow,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            Add Transaction
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
                  const months2026 = Array.from({ length: 12 }, (_, i) => monthKey(2026, i));
                  const snapshotMonths = Object.keys(monthlySnapshots).filter(k => !k.startsWith("2026-"));
                  const allMonths = [...new Set([...months2026, ...snapshotMonths])].sort().reverse();
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
              placeholder="Ask AI Financial Assistant..."
              style={{ width: "100%", background: COLORS.containerLow, border: `2px solid rgba(0,103,136,0.1)`, borderRadius: 9999, padding: "10px 48px 10px 44px", fontSize: 14, color: COLORS.text }}
              onKeyDown={e => { if (e.key === "Enter" && e.target.value.trim()) { setAdvisorMsg(e.target.value.trim()); pendingAdvisorSend.current = true; setTab("advisor"); e.target.value = ""; } }}
            />
            <button style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: "50%" }}>
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

            {/* This week vs last week comparison */}
            {(() => {
              const now = new Date(); now.setHours(0,0,0,0);
              const dow = now.getDay();
              const startThis = new Date(now.getTime() - dow * 86400000);
              const startLast = new Date(startThis.getTime() - 7 * 86400000);
              const thisWeekAmt = viewExpenses.filter(e => { const d = new Date(e.date); d.setHours(0,0,0,0); return d >= startThis && d <= now; }).reduce((s,e) => s+e.amount, 0);
              const lastWeekAmt = viewExpenses.filter(e => { const d = new Date(e.date); d.setHours(0,0,0,0); return d >= startLast && d < startThis; }).reduce((s,e) => s+e.amount, 0);
              const diff = thisWeekAmt - lastWeekAmt;
              const pctChg = lastWeekAmt > 0 ? Math.round(Math.abs(diff) / lastWeekAmt * 100) : null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 14, background: COLORS.card, borderRadius: 12, padding: "12px 20px", marginBottom: 20, boxShadow: COLORS.shadowSm }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: diff < 0 ? COLORS.success : diff > 0 ? COLORS.danger : COLORS.subtext }}>
                    {diff < 0 ? "trending_down" : diff > 0 ? "trending_up" : "trending_flat"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>This week: {fmt(thisWeekAmt)}</span>
                  <span style={{ fontSize: 13, color: COLORS.subtext }}>vs last week: {fmt(lastWeekAmt)}</span>
                  {pctChg !== null && diff !== 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: diff < 0 ? COLORS.success : COLORS.danger }}>
                      {diff < 0 ? "▼" : "▲"} {pctChg}% {diff < 0 ? "less" : "more"}
                    </span>
                  )}
                  {thisWeekAmt === 0 && lastWeekAmt === 0 && (
                    <span style={{ fontSize: 12, color: COLORS.muted }}>No spending data for this month</span>
                  )}
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
                    <button onClick={() => setBills(p => p.map(b => b.id === nextBill.id ? { ...b, paid: true, actual: b.budget } : b))}
                      style={{ width: "100%", background: COLORS.onSecondaryContainer, color: "#fff", border: "none", borderRadius: 9999, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: COLORS.shadowSm }}>
                      Pay Now
                    </button>
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
                      const budgetPct = expenseBudgets[cat] ? Math.round(pct(amt, expenseBudgets[cat])) : null;
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
                                <p style={{ fontSize: 10, fontWeight: 700, color: COLORS.secondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>{budgetPct}% of budget</p>
                              )}
                              <p style={{ fontSize: 12, fontWeight: 500, color: COLORS.subtext }}>{topExpense ? topExpense.date : ""}</p>
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
          const COLS = "2.5fr 1.1fr 1fr 1fr 1fr 32px";

          // Inline cell helpers
          const EditableText = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} onKeyDown={e=>{if(e.key==="Enter")setEditingCell(null);}} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:13,color:COLORS.text,outline:"none"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px"}}>{value||"—"}</span>;
          const EditableNum = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus type="number" value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} onKeyDown={e=>{if(e.key==="Enter")setEditingCell(null);}} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:13,color:COLORS.text,outline:"none"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px",color:COLORS.danger,fontWeight:700}}>−{fmt(value)}</span>;
          const EditableDate = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus type="date" value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:12,color:COLORS.text,outline:"none"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px",fontSize:12,color:COLORS.subtext}}>{value?.slice(5)||"—"}</span>;
          const EditableCat = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <select autoFocus value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:12,color:COLORS.text,outline:"none"}}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
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

          return (
            <div style={{ paddingBottom: 48 }}>
              {/* ── Page header ── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 20, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.sidebarText, letterSpacing: "-0.02em", marginBottom: 4 }}>Budget the Money!</h2>
                  <p style={{ fontSize: 14, color: COLORS.subtext }}>Spending Plan · {MONTH_FULL[vm0]} {vy}</p>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: COLORS.subtext }}>work</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.text }}>{i.label}{i.recurring ? " ↺" : ""}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.secondary }}>+{fmt(i.amount)}</span>
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
                  {/* Column headers */}
                  <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "10px 12px", background: COLORS.containerLow, borderRadius: 10, marginBottom: 16 }}>
                    <span style={colStyle} onClick={() => toggleSort("label")}>Items <SortArrow field="label" /></span>
                    <span style={colStyle} onClick={() => toggleSort("category")}>Category <SortArrow field="category" /></span>
                    <span style={colStyle} onClick={() => toggleSort("date")}>Date <SortArrow field="date" /></span>
                    <span style={colStyle}>Planned</span>
                    <span style={colStyle} onClick={() => toggleSort("amount")}>Actual <SortArrow field="amount" /></span>
                    <span style={{ ...colStyle, cursor: "default" }}></span>
                  </div>

                  {/* Category groups */}
                  {SPENDING_PLAN_GROUPS.map(group => {
                    const grpExp = sortExp(viewExpenses.filter(e => e.category === group.catId));
                    const grpActual = grpExp.reduce((s,e) => s+e.amount, 0);
                    const grpPlanned = expenseBudgets[group.catId] || 0;
                    const isCollapsed = collapsedCategories[group.catId];
                    const util = grpPlanned > 0 ? Math.round(pct(grpActual, grpPlanned)) : null;
                    const utilColor = util === null ? COLORS.muted : util >= 100 ? COLORS.danger : util >= 80 ? COLORS.warning : COLORS.success;
                    const usedLabels = grpExp.map(e => e.label.toLowerCase());
                    const unusedTemplates = group.templateItems.filter(t => !usedLabels.some(l => l.includes(t.split(/[/(]/)[0].trim().toLowerCase())));

                    return (
                      <div key={group.catId} style={{ marginBottom: 6 }}>
                        {/* Group header */}
                        <div onClick={() => setCollapsedCategories(p => ({ ...p, [group.catId]: !p[group.catId] }))}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: COLORS.containerLow, borderRadius: 10, cursor: "pointer", marginBottom: isCollapsed ? 0 : 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: CATEGORY_ICON_BG[group.catId] || "#eaeef0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 15, color: CATEGORY_ICON_COLOR[group.catId] || COLORS.subtext }}>{CATEGORY_ICONS[group.catId] || "category"}</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{group.label}</span>
                            {grpExp.length > 0 && <span style={{ fontSize: 11, color: COLORS.muted }}>({grpExp.length})</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {grpPlanned > 0 && (
                              <>
                                <span style={{ fontSize: 11, color: COLORS.subtext }}>{fmt(grpPlanned)} planned</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: utilColor }}>{fmt(grpActual)} actual</span>
                                <span style={{ fontSize: 10, fontWeight: 700, color: utilColor, background: utilColor+"18", borderRadius: 9999, padding: "1px 7px" }}>{util}%</span>
                              </>
                            )}
                            {grpPlanned === 0 && grpActual > 0 && <span style={{ fontSize: 12, color: COLORS.subtext }}>{fmt(grpActual)}</span>}
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: COLORS.muted, transition: "transform .2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>expand_more</span>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div style={{ borderLeft: `3px solid ${CATEGORY_ICON_BG[group.catId] || COLORS.containerLow}`, marginLeft: 6, paddingLeft: 10, marginBottom: 4 }}>
                            {/* Existing expense rows */}
                            {grpExp.map(e => (
                              <div key={e.id} style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "7px 10px", alignItems: "center", borderRadius: 8, background: COLORS.card, marginBottom: 2, boxShadow: COLORS.shadowSm }}>
                                <EditableText id={e.id} field="label" value={e.label} />
                                <EditableCat id={e.id} field="category" value={e.category} />
                                <EditableDate id={e.id} field="date" value={e.date} />
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <EditableNum id={e.id} field="amount" value={e.amount} />
                                <button onClick={() => deleteExpenseFromView(e.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>×</button>
                              </div>
                            ))}
                            {/* Template items not yet added */}
                            {unusedTemplates.slice(0, 4).map(item => (
                              <div key={item} style={{ display: "grid", gridTemplateColumns: COLS, gap: 8, padding: "6px 10px", alignItems: "center", borderRadius: 8, opacity: 0.45, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, color: COLORS.muted, fontStyle: "italic" }}>{item}</span>
                                <span style={{ fontSize: 11, color: COLORS.muted }}>{group.catId}</span>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <button onClick={() => { setNewExp(p => ({ ...p, label: item, category: group.catId })); setModal("addExpense"); }}
                                  style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 18, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }} title="Add this item">+</button>
                              </div>
                            ))}
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
                            <button onClick={() => deleteExpenseFromView(e.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>×</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* ── Right sidebar (col-4) ── */}
                <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Bills */}
                  <div style={{ background: COLORS.card, borderRadius: 20, padding: 22, boxShadow: COLORS.shadowSm }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ padding: "6px 8px", background: "rgba(97,205,253,0.2)", borderRadius: 10 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 17, color: COLORS.primary }}>receipt_long</span>
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Bills</h3>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {bills.map(b => {
                        const bDate = new Date(b.dueDate); bDate.setHours(0,0,0,0);
                        const isOverdue = !b.paid && bDate < today0;
                        const borderColor = b.paid ? COLORS.success : isOverdue ? COLORS.danger : "transparent";
                        return (
                          <div key={b.id} style={{ background: COLORS.containerLow, borderRadius: 10, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `3px solid ${borderColor}` }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{b.label}</p>
                              <p style={{ fontSize: 11, color: isOverdue ? COLORS.danger : COLORS.subtext }}>{b.dueDate?.slice(5)}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{fmt(b.budget)}</p>
                              <span style={{ fontSize: 10, fontWeight: 700, color: b.paid ? COLORS.success : isOverdue ? COLORS.danger : COLORS.muted }}>{b.paid ? "Paid ✓" : isOverdue ? "Overdue" : "Due"}</span>
                            </div>
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
                              <DebtText id={d.id} field="balance" value={d.balance} style={{ fontSize: 14, fontWeight: 800, color: COLORS.danger, display: "block" }} />
                              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end", marginTop: 2 }}>
                                <button onClick={() => {
                                  const extra = prompt("Extra payment amount?");
                                  if (extra && !isNaN(extra)) updateDebtField(d.id, "balance", Math.max(0, d.balance - parseFloat(extra)));
                                }} style={{ fontSize: 11, color: COLORS.primary, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}>Pay Extra</button>
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
                      {savingsItems.map(s => (
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
                          <div style={{ height: 6, background: COLORS.containerLow, borderRadius: 9999, overflow: "hidden", marginBottom: 6 }}>
                            <div style={{ width: `${pct(s.actual, s.expected||1)}%`, height: "100%", background: COLORS.primary, borderRadius: 9999 }} />
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => { const a = prompt("Amount to add?"); if (a && !isNaN(a)) updateSavingsField(s.id,"actual",s.actual+parseFloat(a)); }}
                              style={{ flex:1, background: `rgba(0,103,136,0.08)`, border:"none", borderRadius:8, padding:"5px 0", fontSize:12, fontWeight:700, color:COLORS.primary, cursor:"pointer" }}>+ Add</button>
                            <button onClick={() => { const a = prompt("Amount to subtract?"); if (a && !isNaN(a)) updateSavingsField(s.id,"actual",s.actual-parseFloat(a)); }}
                              style={{ flex:1, background: `rgba(172,49,73,0.06)`, border:"none", borderRadius:8, padding:"5px 0", fontSize:12, fontWeight:700, color:COLORS.danger, cursor:"pointer" }}>− Remove</button>
                          </div>
                        </div>
                      ))}
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
          const [calYear, calMonth] = [now.getFullYear(), now.getMonth()];
          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
          const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
          const todayDate = now.getDate();
          const BILL_COLORS = { Housing: { bg: "rgba(97,205,253,0.15)", text: COLORS.primary }, Utilities: { bg: "rgba(192,232,255,0.4)", text: COLORS.secondary }, Entertainment: { bg: "rgba(186,191,255,0.3)", text: COLORS.tertiary } };
          const paidBillsTotal = bills.filter(b => b.paid).reduce((s, b) => s + b.actual, 0);
          const unpaidBills = bills.filter(b => !b.paid).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
          const totalBillsBudget = bills.reduce((s, b) => s + b.budget, 0);
          const billsOnDay = (day) => bills.filter(b => {
            const d = new Date(b.dueDate);
            return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
          });
          return (
            <div style={{ paddingBottom: 48 }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.sidebarText, letterSpacing: "-0.02em", marginBottom: 4 }}>Bill Calendar</h2>
                <p style={{ fontSize: 14, color: COLORS.subtext }}>Upcoming bills and payment schedule</p>
              </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 24 }}>
              {/* ── Calendar (col-8) ── */}
              <div style={{ gridColumn: "span 8", background: COLORS.card, borderRadius: 20, padding: 28, boxShadow: COLORS.shadowSm }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{MONTH_FULL[calMonth]} {calYear}</h3>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["Month", "List"].map((v, i) => (
                      <button key={v} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: i === 0 ? COLORS.primary : COLORS.containerLow, color: i === 0 ? "#fff" : COLORS.subtext, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{v}</button>
                    ))}
                  </div>
                </div>
                {/* Day headers */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                    <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", padding: "6px 0" }}>{d}</div>
                  ))}
                </div>
                {/* Calendar grid */}
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
                          const colorSet = BILL_COLORS[b.label] || { bg: "rgba(97,205,253,0.15)", text: COLORS.primary };
                          return (
                            <div key={b.id} style={{ background: colorSet.bg, borderRadius: 4, padding: "2px 6px", marginBottom: 2 }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: colorSet.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Right sidebar (col-4) ── */}
              <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Total Monthly Obligations */}
                <div style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDim})`, borderRadius: 20, padding: 24, color: "#fff" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Total Monthly Obligations</p>
                  <p style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 16 }}>{fmt(totalBillsBudget)}</p>
                  <div style={{ background: "rgba(0,90,119,0.4)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: "rgba(255,255,255,0.8)" }}>trending_down</span>
                    <div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Remaining to pay</p>
                      <p style={{ fontSize: 16, fontWeight: 800 }}>{fmt(unpaidBills.reduce((s, b) => s + b.budget, 0))}</p>
                    </div>
                  </div>
                </div>

                {/* Upcoming Statements */}
                <div style={{ background: COLORS.card, borderRadius: 20, padding: 24, boxShadow: COLORS.shadowSm }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>Upcoming Statements</h4>
                    <span style={{ fontSize: 11, color: COLORS.subtext, fontWeight: 600 }}>Next 14 Days</span>
                  </div>
                  {(() => {
                    const today14 = new Date(); today14.setHours(0,0,0,0);
                    const in14days = new Date(today14.getTime() + 14 * 86400000);
                    const upcoming14 = unpaidBills.filter(b => { const d = new Date(b.dueDate); d.setHours(0,0,0,0); return d <= in14days; });
                    if (upcoming14.length === 0) return <p style={{ fontSize: 13, color: COLORS.muted }}>No bills due in the next 14 days.</p>;
                    return upcoming14.map(b => (
                      <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${COLORS.containerLow}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(97,205,253,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: COLORS.primary }}>receipt_long</span>
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{b.label}</p>
                            <p style={{ fontSize: 11, color: COLORS.subtext }}>Due {b.dueDate?.slice(5)}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{fmt(b.budget)}</span>
                      </div>
                    ));
                  })()}
                </div>

                {/* Savings Sprint */}
                <div style={{ background: "rgba(97,205,253,0.15)", borderRadius: 20, padding: 24 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,103,136,0.12)", borderRadius: 9999, padding: "4px 12px", marginBottom: 12 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: COLORS.primary }}>bolt</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary }}>Bills Sprint</span>
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: COLORS.onSecondaryContainer, marginBottom: 12 }}>Bills Paid Progress</h4>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.5)", borderRadius: 9999, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ width: `${pct(paidBillsTotal, totalBillsBudget || 1)}%`, height: "100%", background: COLORS.primary, borderRadius: 9999 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.onSecondaryContainer }}>
                    <span style={{ fontWeight: 700 }}>{fmt(paidBillsTotal)} paid</span>
                    <span>of {fmt(totalBillsBudget)}</span>
                  </div>
                </div>
              </div>
            </div>
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
                <p style={{ color: COLORS.subtext, fontSize: 14 }}>12-month view · Click any month for details & AI analysis</p>
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
            {/* 12-month mini-card strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 28 }}>
              {twelveMonths.map((key) => {
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
                      {/* Category breakdown */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Spending by Category</h4>
                          {CATEGORIES.filter(c => s.cats[c] > 0).sort((a,b) => s.cats[b]-s.cats[a]).map(c => (
                            <div key={c} style={{ marginBottom: 11 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, color: COLORS.text }}>{c}</span>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>{fmt(s.cats[c])} · {s.exp > 0 ? pct(s.cats[c], s.exp).toFixed(0) : 0}%</span>
                              </div>
                              <ProgressBar value={s.cats[c]} max={s.exp} color={COLORS.accentBlue} />
                            </div>
                          ))}
                          {CATEGORIES.every(c => s.cats[c] === 0) && <p style={{ color: COLORS.muted, fontSize: 13 }}>No expenses recorded.</p>}
                        </div>
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>50 / 30 / 20</h4>
                          {(() => {
                            const needs2 = snap.expenses.filter(e => ["Housing","Utilities","Transport","Health"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
                            const wants2 = snap.expenses.filter(e => ["Food","Entertainment","Personal","Education","Other"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
                            const sav2 = Math.max(0, s.net);
                            return [
                              { label: "Needs (50%)", val: needs2, target: s.inc * 0.5, color: COLORS.accentBlue },
                              { label: "Wants (30%)", val: wants2, target: s.inc * 0.3, color: COLORS.accentPurple },
                              { label: "Savings (20%)", val: sav2, target: s.inc * 0.2, color: COLORS.accent },
                            ].map(b => (
                              <div key={b.label} style={{ marginBottom: 14 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                  <span style={{ fontSize: 12, color: b.color, fontWeight: 600 }}>{b.label}</span>
                                  <span style={{ fontSize: 12, color: COLORS.muted }}>{fmt(b.val)} / {fmt(b.target)}</span>
                                </div>
                                <ProgressBar value={b.val} max={b.target} color={b.color} />
                              </div>
                            ));
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
                  const allStats = twelveMonths.map(k => monthStats(k));
                  const totalInc = allStats.reduce((s,m)=>s+m.inc,0);
                  const totalExp = allStats.reduce((s,m)=>s+m.exp,0);
                  const bestMonth = twelveMonths.reduce((best,k) => monthStats(k).net > monthStats(best).net ? k : best, twelveMonths[0]);
                  const worstMonth = twelveMonths.filter(k=>monthStats(k).hasData).reduce((worst,k) => monthStats(k).net < monthStats(worst).net ? k : worst, twelveMonths[0]);
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
              {/* Sparkline-style monthly expense bars */}
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 60 }}>
                {twelveMonths.map(key => {
                  const s = monthStats(key);
                  const { month0 } = parseKey(key);
                  const maxExp = Math.max(...twelveMonths.map(k => monthStats(k).exp), 1);
                  const barH = s.hasData ? Math.max(4, (s.exp / maxExp) * 52) : 4;
                  return (
                    <div key={key} onClick={() => setActiveInsightKey(key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", gap: 4 }}>
                      <div style={{ width: "100%", height: barH, background: key === activeInsightKey ? COLORS.accentBlue : s.hasData ? COLORS.accent + "99" : COLORS.border, borderRadius: "4px 4px 0 0", transition: "all .2s" }} />
                      <span style={{ fontSize: 9, color: key === activeInsightKey ? COLORS.accentBlue : COLORS.muted }}>{MONTH_NAMES[month0]}</span>
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
                    <button key={chip.label} onClick={() => { setAdvisorMsg(chip.label); handleAdvisor(); }} style={{
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
                    fontSize: 14, lineHeight: 1.7, color: COLORS.text,
                    boxShadow: msg.role === "assistant" ? COLORS.shadowSm : "none",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
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
              {/* Chips after AI response */}
              {advisorHistory.length > 0 && !advisorLoading && advisorHistory[advisorHistory.length - 1]?.role === "assistant" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { icon: "shopping_cart", label: "How's our grocery spending?" },
                    { icon: "trending_up", label: "Investment update" },
                    { icon: "savings", label: "Vacation goal progress" },
                  ].map(chip => (
                    <button key={chip.label} onClick={() => { setAdvisorMsg(chip.label); handleAdvisor(); }} style={{
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
        <Modal title="Add Expense" onClose={() => setModal(null)}>
          <Field label="Description"><input style={inputStyle} value={newExp.label} onChange={e => setNewExp(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Groceries" /></Field>
          <Field label="Amount ($)"><input style={inputStyle} type="number" value={newExp.amount} onChange={e => setNewExp(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></Field>
          <Field label="Category">
            <select style={selectStyle} value={newExp.category} onChange={e => setNewExp(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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
          <button onClick={addExpense} style={btnPrimary}>Add Expense</button>
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
            const dueSoon = bills.filter(b => { if (b.paid) return false; const d = new Date(b.dueDate); d.setHours(0,0,0,0); return d <= in7; }).sort((a,b) => new Date(a.dueDate)-new Date(b.dueDate));
            if (dueSoon.length === 0) return <p style={{ color: COLORS.muted, fontSize: 14 }}>No bills due in the next 7 days. You're all set!</p>;
            return dueSoon.map(b => {
              const dLeft = Math.round((new Date(b.dueDate).setHours(0,0,0,0) - tnow.getTime()) / 86400000);
              return (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${COLORS.containerLow}` }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{b.label}</p>
                    <p style={{ fontSize: 12, color: dLeft <= 0 ? COLORS.danger : COLORS.subtext }}>{dLeft < 0 ? `Overdue by ${Math.abs(dLeft)} day${Math.abs(dLeft)===1?"":"s"}` : dLeft === 0 ? "Due today" : `Due in ${dLeft} day${dLeft===1?"":"s"}`}</p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>{fmt(b.budget)}</span>
                </div>
              );
            });
          })()}
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
