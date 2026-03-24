import { useState, useRef, useCallback, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, ComposedChart, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
// ── Palette & helpers ─────────────────────────────────────────────────────────
const COLORS = {
  bg: "#0f0f14",
  surface: "#16161f",
  card: "#1c1c28",
  border: "#2a2a3a",
  accent: "#6ee7b7",        // mint green
  accentWarm: "#fbbf24",    // amber
  accentBlue: "#60a5fa",    // sky blue
  accentPurple: "#a78bfa",  // violet
  danger: "#f87171",
  warning: "#fb923c",
  success: "#34d399",
  text: "#f0f0f5",
  muted: "#8888aa",
  inputBg: "#12121a",
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
const CATEGORIES = ["Housing", "Food", "Utilities", "Transport", "Health", "Entertainment", "Personal", "Education", "Savings", "Other"];
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
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>{name}</span>
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
      position: "fixed", inset: 0, background: "#00000099", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}
      onClick={onClose}
    >
      <div style={{
        background: COLORS.card, borderRadius: 20, border: `1px solid ${COLORS.border}`,
        padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
      }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: COLORS.text, fontSize: 20, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 22, cursor: "pointer" }}>×</button>
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
      <label style={{ display: "block", fontSize: 12, color: COLORS.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "'DM Mono', monospace" }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = {
  width: "100%", background: COLORS.inputBg, border: `1px solid ${COLORS.border}`,
  borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontSize: 14,
  fontFamily: "'DM Mono', monospace", outline: "none", boxSizing: "border-box",
};
const selectStyle = { ...inputStyle };
const btnPrimary = {
  background: COLORS.accent, color: "#0a0a10", border: "none", borderRadius: 10,
  padding: "11px 22px", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
  cursor: "pointer", width: "100%",
};
// ── SmartAddModal ─────────────────────────────────────────────────────────────
function SmartAddModal({ onClose, onManualExpense, onManualIncome, onManualDebt, onImportExpenses, onImportIncome }) {
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
      <div style={{ background: COLORS.card, borderRadius: 22, border: `1px solid ${COLORS.border}`, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: `0 0 60px #00000088` }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step !== "home" && (
              <button onClick={() => { setStep("home"); setNlInput(""); setNlError(""); setUploadError(""); setPreviewItems([]); }}
                style={{ background: COLORS.border, border: "none", color: COLORS.muted, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 14 }}>←</button>
            )}
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: COLORS.text, fontSize: 19, margin: 0 }}>
              {step === "home" && "✦ Add Entry"}
              {step === "nl" && "💬 Describe It"}
              {step === "upload" && "📄 Upload Document"}
              {step === "preview" && "✓ Review & Import"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.muted, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px 24px 28px" }}>
          {/* ── HOME ── */}
          {step === "home" && (
            <div>
              <p style={{ fontSize: 12, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginBottom: 18, lineHeight: 1.6 }}>
                How would you like to add entries?
              </p>
              {/* Smart input options */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <button onClick={() => setStep("nl")} style={{
                  background: `linear-gradient(135deg, ${COLORS.accentPurple}22, ${COLORS.accentBlue}18)`,
                  border: `1px solid ${COLORS.accentPurple}66`, borderRadius: 16, padding: "20px 16px",
                  cursor: "pointer", textAlign: "left", transition: "all .2s",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.accentPurple, marginBottom: 4 }}>Natural Language</p>
                  <p style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>"Spent $85 on groceries and $40 on gas today"</p>
                </button>
                <button onClick={() => { setStep("upload"); setTimeout(() => fileRef.current?.click(), 100); }} style={{
                  background: `linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.accentWarm}18)`,
                  border: `1px solid ${COLORS.accent}66`, borderRadius: 16, padding: "20px 16px",
                  cursor: "pointer", textAlign: "left", transition: "all .2s",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.accent, marginBottom: 4 }}>Upload Document</p>
                  <p style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>Receipt, bill, bank statement, payslip…</p>
                </button>
              </div>
              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: COLORS.border }} />
                <span style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>or add manually</span>
                <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              </div>
              {/* Manual options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "💸  Add Expense", action: onManualExpense, color: COLORS.accentWarm },
                  { label: "💰  Add Income", action: onManualIncome, color: COLORS.accent },
                  { label: "💳  Add Debt", action: onManualDebt, color: COLORS.danger },
                ].map(o => (
                  <button key={o.label} onClick={o.action} style={{
                    background: o.color + "12", border: `1px solid ${o.color}33`,
                    color: o.color, borderRadius: 12, padding: "12px 18px",
                    fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left",
                    fontFamily: "'Syne', sans-serif",
                  }}>{o.label}</button>
                ))}
              </div>
            </div>
          )}
          {/* ── NATURAL LANGUAGE ── */}
          {step === "nl" && (
            <div>
              <p style={{ fontSize: 12, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginBottom: 16, lineHeight: 1.7 }}>
                Describe any transaction in plain English. Claude will extract and categorize everything automatically.
              </p>
              <div style={{ background: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${COLORS.border}` }}>
                <p style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>EXAMPLES</p>
                {[
                  "Spent $85 on groceries and $60 on gas today",
                  "Paid $1,200 rent and $110 electricity this week",
                  "Got $2,500 salary deposit yesterday",
                  "Netflix $18, Spotify $10, gym $45 this month",
                ].map((ex, i) => (
                  <p key={i} onClick={() => setNlInput(ex)} style={{ fontSize: 12, color: COLORS.accentBlue, fontFamily: "'DM Mono', monospace", cursor: "pointer", marginBottom: 4, lineHeight: 1.5 }}>→ {ex}</p>
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
              {nlError && <p style={{ color: COLORS.danger, fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>{nlError}</p>}
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
                  <p style={{ color: COLORS.muted, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>Receipt · Bill · Bank statement · Payslip<br />JPG · PNG · PDF</p>
                </div>
              )}
              {uploadLoading && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ width: 40, height: 40, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 14px" }} />
                  <p style={{ color: COLORS.accent, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>Claude is reading {uploadedFileName}…</p>
                  <p style={{ color: COLORS.muted, fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 6 }}>Extracting and categorizing all line items</p>
                </div>
              )}
              {uploadError && (
                <div style={{ background: COLORS.danger + "18", border: `1px solid ${COLORS.danger}44`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <p style={{ color: COLORS.danger, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{uploadError}</p>
                  <button onClick={() => { setUploadError(""); fileRef.current?.click(); }} style={{ marginTop: 10, background: "none", border: `1px solid ${COLORS.muted}`, color: COLORS.muted, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>Try Again</button>
                </div>
              )}
              <p style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace", textAlign: "center", lineHeight: 1.6 }}>
                Claude AI will extract every line item and suggest categories. You'll review before anything is saved.
              </p>
            </div>
          )}
          {/* ── PREVIEW ── */}
          {step === "preview" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>
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
                        <p style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>AMOUNT</p>
                        <input type="number" value={item.amount} onChange={e => updateItem(item.id, "amount", e.target.value)} style={{ ...inputStyle, padding: "6px 10px", fontSize: 13 }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>CATEGORY</p>
                        <select value={item.category} onChange={e => updateItem(item.id, "category", e.target.value)} style={{ ...selectStyle, padding: "6px 10px", fontSize: 12 }}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>DATE</p>
                        <input type="date" value={item.date} onChange={e => updateItem(item.id, "date", e.target.value)} style={{ ...inputStyle, padding: "6px 10px", fontSize: 12 }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: `1px solid ${COLORS.border}`, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: previewType === "income" ? COLORS.accent : COLORS.accentWarm, fontFamily: "'DM Mono', monospace" }}>
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
  // ── Dashboard extra state ──
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
    const summary = `Income: ${fmt(totalIncome)}/mo. Expenses: ${fmt(totalExpenses)}/mo. Fixed: ${fmt(fixedExpenses)}. Variable: ${fmt(variableExpenses)}. Leftover: ${fmt(leftover)}. Debts: ${JSON.stringify(debts)}. Category breakdown: ${JSON.stringify(catTotals)}. Goals: ${JSON.stringify(goals)}.`;

    let contentBlocks = [];
    if (advisorFile) {
      const base64 = await fileToBase64(advisorFile);
      if (advisorFile.type === "application/pdf") {
        contentBlocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } });
      } else if (advisorFile.type.startsWith("image/")) {
        contentBlocks.push({ type: "image", source: { type: "base64", media_type: advisorFile.type, data: base64 } });
      }
    }
    contentBlocks.push({ type: "text", text: `You are a friendly household financial advisor. Here is the user's current budget: ${summary}\n\nUser question: ${userMsg || "Please review this document and give me advice."}` });
    const newHistory = [...advisorHistory, { role: "user", content: userMsg || "Review attached file" }];
    setAdvisorHistory(newHistory);
    setAdvisorMsg("");
    setAdvisorFile(null);
    try {
      const messages = [
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
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Syne', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        input, select, textarea { outline: none; }
        input::placeholder, textarea::placeholder { color: #555570; }
      `}</style>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.surface, position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
            <span style={{ color: COLORS.accent }}>$</span> FamilyFinance
          </h1>
          <p style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>{MONTH_FULL[new Date().getMonth()]} {new Date().getFullYear()} · Household Budget</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Goal button */}
          <button onClick={() => setModal("goal")} style={{ background: COLORS.accentPurple + "22", border: `1px solid ${COLORS.accentPurple}`, color: COLORS.accentPurple, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            🎯 Goal
          </button>
          {/* Green Add button */}
          <button onClick={() => setModal("addMenu")} style={{ background: COLORS.accent, color: "#0a0a10", border: "none", borderRadius: 50, width: 42, height: 42, fontSize: 26, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${COLORS.accent}55` }}>
            +
          </button>
        </div>
      </header>
      {/* Nav Tabs */}
      <nav style={{ display: "flex", gap: 4, padding: "12px 28px", borderBottom: `1px solid ${COLORS.border}`, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? COLORS.accent + "18" : "none",
            border: `1px solid ${tab === t.id ? COLORS.accent : "transparent"}`,
            color: tab === t.id ? COLORS.accent : COLORS.muted,
            borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </nav>
      {/* Content */}
      <main style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
        {/* ── DASHBOARD TAB ── */}
        {tab === "dashboard" && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: 3, color: COLORS.text, fontFamily: "'Syne', sans-serif" }}>
                {MONTH_FULL[new Date().getMonth()].toUpperCase()} {new Date().getFullYear()}
              </h2>
            </div>
            {/* Date / Balance settings */}
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", gap: 20, alignItems: "flex-end", flexWrap: "wrap" }}>
              <p style={{ fontSize: 10, color: COLORS.muted, maxWidth: 200, lineHeight: 1.5 }}>To get started, set your start date, end date and starting balance</p>
              {[
                { label: "Start Date", val: budgetStartDate, set: setBudgetStartDate, type: "date", w: 140 },
                { label: "End Date (Max 31 Days Apart)", val: budgetEndDate, set: setBudgetEndDate, type: "date", w: 140 },
                { label: "Starting Balance", val: startingBalance, set: v => setStartingBalance(parseFloat(v)||0), type: "number", w: 110 },
              ].map(f => (
                <label key={f.label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontSize: 10, color: COLORS.muted }}>{f.label}</span>
                  <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} style={{ ...inputStyle, padding: "5px 8px", fontSize: 11, width: f.w }} />
                </label>
              ))}
            </div>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 18 }}>
              {[
                { label: "LEFT FOR BUDGETING", value: fmt(leftForBudgeting), color: leftForBudgeting >= 0 ? "#4ade80" : COLORS.danger, border: "#4ade80" },
                { label: "TOTAL BUDGETED", value: fmt(totalBudgeted), color: COLORS.accentPurple, border: COLORS.accentPurple },
                { label: "LEFT TO SPEND", value: fmt(leftToSpend2), color: COLORS.accentBlue, border: COLORS.accentBlue },
                { label: "TOTAL SPENT", value: fmt(totalSpent), color: COLORS.accentWarm, border: COLORS.accentWarm },
                { label: "ENDING BALANCE", value: fmt(endingBalance), color: endingBalance >= 0 ? "#4ade80" : COLORS.danger, border: "#4ade80" },
                { label: "CURRENCY SYMBOL", value: "$", color: COLORS.muted, border: COLORS.border },
              ].map(k => (
                <div key={k.label} style={{ background: COLORS.card, border: `1px solid ${k.border}55`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: k.color, fontFamily: "'Syne', sans-serif" }}>{k.value}</div>
                </div>
              ))}
            </div>
            {/* Charts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "200px 200px 1fr 1fr", gap: 12, marginBottom: 18 }}>
              {/* Summary Table */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "7px 10px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.text }}>SUMMARY</span>
                  <label style={{ fontSize: 10, color: COLORS.muted, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <input type="checkbox" checked={showIncomeInCharts} onChange={e => setShowIncomeInCharts(e.target.checked)} />
                    Show Income
                  </label>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: COLORS.surface }}>
                    <th style={{ padding: "4px 8px", textAlign: "left", fontSize: 9, color: COLORS.muted, fontWeight: 600 }}></th>
                    <th style={{ padding: "4px 8px", textAlign: "right", fontSize: 9, color: COLORS.muted, fontWeight: 600 }}>BUDGET</th>
                    <th style={{ padding: "4px 8px", textAlign: "right", fontSize: 9, color: COLORS.muted, fontWeight: 600 }}>ACTUAL</th>
                  </tr></thead>
                  <tbody>
                    {[
                      { label: "Expenses", budget: expenseBudgetTotal, actual: totalExpenses },
                      { label: "Bills", budget: billsBudgetTotal, actual: billsActualTotal },
                      { label: "Debt", budget: debtPayments, actual: debtPayments },
                      { label: "Savings", budget: savingsExpectedTotal, actual: savingsActualTotal },
                      { label: "Income", budget: totalIncome, actual: totalIncome },
                    ].map((row, i) => (
                      <tr key={row.label} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? COLORS.surface + "44" : "transparent" }}>
                        <td style={{ padding: "5px 8px", color: COLORS.text, fontSize: 11 }}>{row.label}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: COLORS.muted, fontSize: 11 }}>{fmt(row.budget)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", fontSize: 11, color: row.actual > row.budget && row.label !== "Income" ? COLORS.danger : "#4ade80" }}>{fmt(row.actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Cash Flow Donut */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>CASH FLOW SUMMARY</div>
                <PieChart width={180} height={130}>
                  <Pie data={cashFlowData} cx={90} cy={65} innerRadius={38} outerRadius={58} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                    {cashFlowData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, fontSize: 10 }} />
                </PieChart>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {cashFlowData.map(d => {
                    const total2 = cashFlowData.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color }} />
                          <span style={{ fontSize: 9, color: COLORS.muted }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 9, color: COLORS.text }}>{total2 > 0 ? (d.value / total2 * 100).toFixed(1) : 0}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Budget vs Actual Bar */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>BUDGET VS ACTUAL</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={budgetVsActualData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: COLORS.muted }} />
                    <YAxis tick={{ fontSize: 8, fill: COLORS.muted }} tickFormatter={v => `$${v}`} width={45} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, fontSize: 10 }} />
                    <Legend iconSize={7} wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="Budget" fill={COLORS.accentBlue + "99"} radius={[2,2,0,0]} />
                    <Bar dataKey="Actual" fill="#4ade8099" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Balance Overview */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>BALANCE OVERVIEW</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={balanceOverviewData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                    <defs>
                      <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 7, fill: COLORS.muted }} interval={Math.floor(balanceOverviewData.length / 6)} />
                    <YAxis tick={{ fontSize: 8, fill: COLORS.muted }} tickFormatter={v => `$${v}`} width={45} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, fontSize: 10 }} />
                    <Area type="monotone" dataKey="Balance" stroke={COLORS.success} fill="url(#balGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Helper text */}
            <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 10 }}>Add / edit subcategories in the tables below.</p>
            {/* Data Tables Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
              {/* INCOME */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "7px 10px", background: "#4ade8018", borderBottom: `1px solid #4ade8033` }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#4ade80", letterSpacing: 1 }}>INCOME</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: COLORS.surface }}>
                    <th style={{ padding: "4px 8px", textAlign: "left", fontSize: 9, color: COLORS.muted }}></th>
                    <th style={{ padding: "4px 8px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>EXPECTED</th>
                    <th style={{ padding: "4px 8px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>ACTUAL</th>
                  </tr></thead>
                  <tbody>
                    {income.map((item, i) => (
                      <tr key={item.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? COLORS.surface + "44" : "transparent" }}>
                        <td style={{ padding: "5px 8px", color: COLORS.text, fontSize: 11 }}>{item.label}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: COLORS.muted, fontSize: 11 }}>{fmt(item.amount)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: "#4ade80", fontSize: 11 }}>{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    {Array(Math.max(0, 3 - income.length)).fill(0).map((_, i) => (
                      <tr key={`ei-${i}`} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <td style={{ padding: "5px 8px", color: COLORS.border, fontSize: 10 }}>—</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: COLORS.border, fontSize: 10 }}>$</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: COLORS.border, fontSize: 10 }}>$</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{ borderTop: `2px solid ${COLORS.border}`, background: COLORS.surface }}>
                    <td style={{ padding: "5px 8px", fontWeight: 700, color: COLORS.text, fontSize: 11 }}>TOTAL</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: COLORS.muted, fontSize: 11 }}>{fmt(totalIncome)}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: "#4ade80", fontSize: 11 }}>{fmt(totalIncome)}</td>
                  </tr></tfoot>
                </table>
              </div>
              {/* EXPENSES */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "7px 10px", background: "#f472b618", borderBottom: `1px solid #f472b633` }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#f472b6", letterSpacing: 1 }}>EXPENSES</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: COLORS.surface }}>
                    <th style={{ padding: "4px 6px", textAlign: "left", fontSize: 9, color: COLORS.muted }}></th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>BUDGET</th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>ACTUAL</th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>LEFT</th>
                  </tr></thead>
                  <tbody>
                    {CATEGORIES.filter(c => (expenseBudgets[c] || 0) > 0 || catTotals[c] > 0).map((cat, i) => {
                      const budget = expenseBudgets[cat] || 0, actual = catTotals[cat] || 0, left = budget - actual;
                      return (
                        <tr key={cat} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? COLORS.surface + "44" : "transparent" }}>
                          <td style={{ padding: "4px 6px", color: COLORS.text, fontSize: 10 }}>{cat}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", color: COLORS.muted, fontSize: 10 }}>{budget > 0 ? fmt(budget) : <span style={{ color: COLORS.border }}>$</span>}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10, color: actual > budget ? COLORS.danger : COLORS.text }}>{actual > 0 ? fmt(actual) : <span style={{ color: COLORS.border }}>$</span>}</td>
                          <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10, color: left < 0 ? COLORS.danger : COLORS.success }}>{(budget > 0 || actual > 0) ? fmt(left) : <span style={{ color: COLORS.border }}>$</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr style={{ borderTop: `2px solid ${COLORS.border}`, background: COLORS.surface }}>
                    <td style={{ padding: "5px 6px", fontWeight: 700, color: COLORS.text, fontSize: 10 }}>TOTAL</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: COLORS.muted, fontSize: 10 }}>{fmt(expenseBudgetTotal)}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: COLORS.text, fontSize: 10 }}>{fmt(totalExpenses)}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, fontSize: 10, color: expenseBudgetTotal - totalExpenses < 0 ? COLORS.danger : COLORS.success }}>{fmt(expenseBudgetTotal - totalExpenses)}</td>
                  </tr></tfoot>
                </table>
              </div>
              {/* BILLS */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "7px 10px", background: "#c084fc18", borderBottom: `1px solid #c084fc33` }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#c084fc", letterSpacing: 1 }}>BILLS</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: COLORS.surface }}>
                    <th style={{ padding: "4px 4px", width: 20 }}></th>
                    <th style={{ padding: "4px 6px", textAlign: "left", fontSize: 9, color: COLORS.muted }}></th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>DUE</th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>BUDGET</th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>ACTUAL</th>
                  </tr></thead>
                  <tbody>
                    {bills.map((bill, i) => (
                      <tr key={bill.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: bill.paid ? COLORS.success + "11" : i % 2 ? COLORS.surface + "44" : "transparent" }}>
                        <td style={{ padding: "4px 4px", textAlign: "center" }}>
                          <input type="checkbox" checked={bill.paid} style={{ cursor: "pointer" }} onChange={e => setBills(p => p.map(b => b.id === bill.id ? { ...b, paid: e.target.checked, actual: e.target.checked ? b.budget : 0 } : b))} />
                        </td>
                        <td style={{ padding: "4px 6px", color: bill.paid ? COLORS.muted : COLORS.text, fontSize: 10, textDecoration: bill.paid ? "line-through" : "none" }}>{bill.label}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: COLORS.muted, fontSize: 9 }}>{bill.dueDate.slice(5)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: COLORS.muted, fontSize: 10 }}>{fmt(bill.budget)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontSize: 10, color: bill.paid ? COLORS.success : COLORS.border }}>{bill.paid ? fmt(bill.actual) : "$"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{ borderTop: `2px solid ${COLORS.border}`, background: COLORS.surface }}>
                    <td colSpan={2} style={{ padding: "5px 6px", fontWeight: 700, color: COLORS.text, fontSize: 10 }}>TOTAL</td>
                    <td></td>
                    <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: COLORS.muted, fontSize: 10 }}>{fmt(billsBudgetTotal)}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: COLORS.text, fontSize: 10 }}>{fmt(billsActualTotal)}</td>
                  </tr></tfoot>
                </table>
              </div>
              {/* DEBTS */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "7px 10px", background: "#facc1518", borderBottom: `1px solid #facc1533` }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#facc15", letterSpacing: 1 }}>DEBTS</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: COLORS.surface }}>
                    <th style={{ padding: "4px 4px", width: 20 }}></th>
                    <th style={{ padding: "4px 6px", textAlign: "left", fontSize: 9, color: COLORS.muted }}></th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>DUE</th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>BUDGET</th>
                    <th style={{ padding: "4px 6px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>ACTUAL</th>
                  </tr></thead>
                  <tbody>
                    {debts.map((debt, i) => (
                      <tr key={debt.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? COLORS.surface + "44" : "transparent" }}>
                        <td style={{ padding: "4px 4px", textAlign: "center" }}><input type="checkbox" style={{ cursor: "pointer" }} /></td>
                        <td style={{ padding: "4px 6px", color: COLORS.text, fontSize: 10 }}>{debt.label}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: COLORS.muted, fontSize: 9 }}>—</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: COLORS.muted, fontSize: 10 }}>{fmt(debt.minPayment)}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: COLORS.border, fontSize: 10 }}>$</td>
                      </tr>
                    ))}
                    {Array(Math.max(0, 3 - debts.length)).fill(0).map((_, i) => (
                      <tr key={`ed-${i}`} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <td colSpan={5} style={{ padding: "5px 6px", color: COLORS.border, fontSize: 10 }}>—</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{ borderTop: `2px solid ${COLORS.border}`, background: COLORS.surface }}>
                    <td colSpan={2} style={{ padding: "5px 6px", fontWeight: 700, color: COLORS.text, fontSize: 10 }}>TOTAL</td>
                    <td></td>
                    <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: COLORS.muted, fontSize: 10 }}>{fmt(debtPayments)}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", color: COLORS.border, fontSize: 10 }}>$</td>
                  </tr></tfoot>
                </table>
              </div>
            </div>
            {/* Savings Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: 12, marginBottom: 18 }}>
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "7px 10px", background: "#34d39918", borderBottom: `1px solid #34d39933` }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#34d399", letterSpacing: 1 }}>SAVINGS</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: COLORS.surface }}>
                    <th style={{ padding: "4px 8px", textAlign: "left", fontSize: 9, color: COLORS.muted }}></th>
                    <th style={{ padding: "4px 8px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>EXPECTED</th>
                    <th style={{ padding: "4px 8px", textAlign: "right", fontSize: 9, color: COLORS.muted }}>ACTUAL</th>
                  </tr></thead>
                  <tbody>
                    {savingsItems.map((item, i) => (
                      <tr key={item.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? COLORS.surface + "44" : "transparent" }}>
                        <td style={{ padding: "5px 8px", color: COLORS.text, fontSize: 11 }}>{item.label}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: COLORS.muted, fontSize: 11 }}>{fmt(item.expected)}</td>
                        <td style={{ padding: "5px 8px", textAlign: "right", color: COLORS.success, fontSize: 11 }}>{fmt(item.actual)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{ borderTop: `2px solid ${COLORS.border}`, background: COLORS.surface }}>
                    <td style={{ padding: "5px 8px", fontWeight: 700, color: COLORS.text, fontSize: 11 }}>TOTAL</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: COLORS.muted, fontSize: 11 }}>{fmt(savingsExpectedTotal)}</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: COLORS.success, fontSize: 11 }}>{fmt(savingsActualTotal)}</td>
                  </tr></tfoot>
                </table>
              </div>
            </div>
            {/* Bottom Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 12, marginBottom: 18 }}>
              {/* Debt vs Savings */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>DEBT VS SAVINGS</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={[{ name: "Savings", value: savingsActualTotal }, { name: "Debt", value: debtPayments }]} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.muted }} />
                    <YAxis tick={{ fontSize: 8, fill: COLORS.muted }} tickFormatter={v => `$${v}`} width={40} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, fontSize: 10 }} />
                    <Bar dataKey="value" radius={[3,3,0,0]}>
                      <Cell fill={COLORS.accentBlue} />
                      <Cell fill={COLORS.accentWarm} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 4 }}>
                  {[{ label: "Savings", color: COLORS.accentBlue }, { label: "Debt", color: COLORS.accentWarm }].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 8, height: 8, background: l.color }} />
                      <span style={{ fontSize: 9, color: COLORS.muted }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Daily Expenses Overview */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.text }}>DAILY EXPENSES OVERVIEW</span>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ label: "Expenses", color: "#f472b6" }, { label: "Daily Budget", color: COLORS.success }].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <div style={{ width: 12, height: 2, background: l.color }} />
                        <span style={{ fontSize: 8, color: COLORS.muted }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <ComposedChart data={dailyExpenseData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                    <defs>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f472b6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f472b6" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="date" tick={{ fontSize: 7, fill: COLORS.muted }} interval={Math.floor(dailyExpenseData.length / 8)} />
                    <YAxis tick={{ fontSize: 8, fill: COLORS.muted }} tickFormatter={v => `$${v}`} width={40} />
                    <Tooltip formatter={v => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, fontSize: 10 }} />
                    <Area type="monotone" dataKey="Expenses" stroke="#f472b6" fill="url(#expGrad)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Daily Budget" stroke={COLORS.success} strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "right", marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: COLORS.muted }}>DAILY BUDGET </span>
                  <span style={{ fontSize: 10, color: COLORS.success, fontWeight: 700 }}>{fmt(totalIncome / 30)}</span>
                </div>
              </div>
              {/* Expenses Breakdown */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.text, marginBottom: 4 }}>EXPENSES BREAK DOWN</div>
                <PieChart width={170} height={130}>
                  <Pie data={expBreakdownData} cx={85} cy={65} innerRadius={32} outerRadius={60} paddingAngle={2} dataKey="value">
                    {expBreakdownData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, fontSize: 10 }} />
                </PieChart>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
                  {expBreakdownData.slice(0, 5).map(d => (
                    <div key={d.name} style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 1, background: d.color }} />
                        <span style={{ fontSize: 9, color: COLORS.muted }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: 9, color: COLORS.text }}>{totalExpenses > 0 ? (d.value / totalExpenses * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Transaction Log */}
            <p style={{ fontSize: 10, color: COLORS.muted, marginBottom: 8 }}>Add your transactions via the + button. They appear here automatically.</p>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.text }}>TRANSACTION LOG</span>
                <span style={{ fontSize: 10, color: COLORS.muted }}>{expenses.length} transactions</span>
              </div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: COLORS.surface }}>
                    <tr>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, color: COLORS.muted, fontWeight: 600 }}>DATE</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, color: COLORS.muted, fontWeight: 600 }}>DESCRIPTION</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, color: COLORS.muted, fontWeight: 600 }}>CATEGORY</th>
                      <th style={{ padding: "6px 10px", textAlign: "right", fontSize: 9, color: COLORS.muted, fontWeight: 600 }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map((e, i) => (
                      <tr key={e.id} style={{ borderTop: `1px solid ${COLORS.border}`, background: i % 2 ? COLORS.surface + "44" : "transparent" }}>
                        <td style={{ padding: "6px 10px", color: COLORS.muted, fontSize: 10 }}>{e.date}</td>
                        <td style={{ padding: "6px 10px", color: COLORS.text, fontSize: 11 }}>{e.label}</td>
                        <td style={{ padding: "6px 10px", fontSize: 10 }}>
                          <span style={{ background: COLORS.accentBlue + "22", color: COLORS.accentBlue, padding: "2px 6px", borderRadius: 4, fontSize: 9 }}>{e.category}</span>
                        </td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: COLORS.accentWarm, fontWeight: 600, fontSize: 11 }}>{fmt(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* ── TRANSACTIONS TAB ── */}
        {tab === "transactions" && (
          <div>
            <h2 style={{ fontWeight: 800, marginBottom: 20, fontSize: 20 }}>All Transactions</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: 12, color: COLORS.accent, fontSize: 15 }}>Income</h3>
                {income.map(i => (
                  <div key={i.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{i.label}</p>
                      <p style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>{i.date} {i.recurring && "· recurring"}</p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ color: COLORS.accent, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>+{fmt(i.amount)}</span>
                      <button onClick={() => setIncome(prev => prev.filter(x => x.id !== i.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16 }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: 12, color: COLORS.accentWarm, fontSize: 15 }}>Expenses</h3>
                {expenses.map(e => (
                  <div key={e.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{e.label}</p>
                      <p style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>{e.category} · {e.date} {e.fixed && "· fixed"}</p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ color: COLORS.accentWarm, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>−{fmt(e.amount)}</span>
                      <button onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16 }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* ── DEBTS TAB ── */}
        {tab === "debts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 20 }}>Debt Tracker</h2>
              <button onClick={() => setModal("addDebt")} style={{ ...btnPrimary, width: "auto", background: COLORS.danger + "22", color: COLORS.danger, border: `1px solid ${COLORS.danger}` }}>+ Add Debt</button>
            </div>
            <div style={{ display: "grid", gap: 16 }}>
              {debts.map(d => (
                <div key={d.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 16 }}>{d.label}</h3>
                      <p style={{ fontSize: 12, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>{d.interest}% APR · Min. payment {fmt(d.minPayment)}/mo</p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ color: COLORS.danger, fontWeight: 800, fontSize: 20, fontFamily: "'DM Mono', monospace" }}>{fmt(d.balance)}</span>
                      <button onClick={() => setDebts(prev => prev.filter(x => x.id !== d.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18 }}>×</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => {
                      const extra = prompt("Extra payment amount?");
                      if (extra && !isNaN(extra)) setDebts(prev => prev.map(x => x.id === d.id ? { ...x, balance: Math.max(0, x.balance - parseFloat(extra)) } : x));
                    }} style={{ background: COLORS.success + "22", border: `1px solid ${COLORS.success}`, color: COLORS.success, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Make Payment</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20, marginTop: 20 }}>
              <p style={{ fontSize: 13, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>TOTAL DEBT</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: COLORS.danger }}>{fmt(totalDebt)}</p>
              <p style={{ fontSize: 12, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>Total min. payments: {fmt(debtPayments)}/month</p>
            </div>
          </div>
        )}
        {/* ── WEEKLY REPORT TAB ── */}
        {tab === "weekly" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 20 }}>Weekly Report</h2>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Spending Summary</h3>
              {weeklyData.sort((a,b)=>b.amount-a.amount).map(c => (
                <div key={c.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: COLORS.muted }}>{fmt(c.amount)} <span style={{ color: COLORS.muted, fontSize: 11 }}>({pct(c.amount, totalExpenses).toFixed(0)}%)</span></span>
                  </div>
                  <ProgressBar value={c.amount} max={totalExpenses} color={COLORS.accentBlue} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Total Spent This Period", value: fmt(totalExpenses), color: COLORS.accentWarm },
                { label: "Total Income", value: fmt(totalIncome), color: COLORS.accent },
                { label: "Net", value: fmt(leftover), color: leftover >= 0 ? COLORS.success : COLORS.danger },
                { label: "Savings Rate", value: `${Math.max(0, (leftover/totalIncome*100)).toFixed(1)}%`, color: COLORS.accentPurple },
              ].map(s => (
                <div key={s.label} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20 }}>
                  <p style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>{s.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, marginTop: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Goals Progress</h3>
              {goals.map(g => {
                const spent = catTotals[g.category] || 0;
                const p = pct(spent, g.limit);
                const c = p >= 100 ? COLORS.danger : p >= 80 ? COLORS.warning : COLORS.success;
                return (
                  <div key={g.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: c }}>{fmt(spent)} / {fmt(g.limit)}</span>
                    </div>
                    <ProgressBar value={spent} max={g.limit} color={c} />
                    <p style={{ fontSize: 11, color: c, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
                      {p >= 100 ? "⚠ Limit exceeded!" : p >= 80 ? "⚡ Approaching limit" : `✓ ${fmt(g.limit - spent)} remaining`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ── MONTHLY INSIGHTS TAB ── */}
        {tab === "insights" && (
          <div>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Monthly Insights</h2>
                <p style={{ color: COLORS.muted, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>12-month view · Click any month for details & AI analysis</p>
              </div>
              {/* Start month picker */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>Budget starts:</span>
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
                const hasData = s.hasData;
                const netColor = s.net >= 0 ? COLORS.success : COLORS.danger;
                return (
                  <button key={key} onClick={() => setActiveInsightKey(key)} style={{
                    background: isActive ? COLORS.accentBlue + "22" : COLORS.card,
                    border: `1.5px solid ${isActive ? COLORS.accentBlue : isToday ? COLORS.accent + "66" : COLORS.border}`,
                    borderRadius: 14, padding: "14px 12px", cursor: "pointer", textAlign: "left",
                    boxShadow: isActive ? `0 0 16px ${COLORS.accentBlue}33` : "none",
                    transition: "all .2s", position: "relative",
                  }}>
                    {isToday && <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: COLORS.accent }} />}
                    <p style={{ fontSize: 11, fontWeight: 800, color: isActive ? COLORS.accentBlue : COLORS.muted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                      {MONTH_NAMES[month0]} {String(year).slice(2)}
                    </p>
                    {hasData ? (
                      <>
                        <p style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>{fmt(s.exp)}</p>
                        <p style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: netColor }}>{s.net >= 0 ? "+" : ""}{fmt(s.net)}</p>
                        {/* Tiny bar */}
                        <div style={{ marginTop: 8, background: COLORS.border, borderRadius: 99, height: 3 }}>
                          <div style={{ width: `${Math.min(100, s.inc > 0 ? (s.exp/s.inc)*100 : 0)}%`, background: s.exp > s.inc ? COLORS.danger : COLORS.accent, height: "100%", borderRadius: 99 }} />
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: 11, color: COLORS.border, fontFamily: "'DM Mono', monospace", marginTop: 6 }}>No data</p>
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
                        <p style={{ fontSize: 11, color: COLORS.muted, fontFamily: "'DM Mono', monospace", marginTop: 3 }}>
                          vs {MONTH_NAMES[parseKey(prevKey).month0]}: expenses {s.exp > prevS.exp ? "▲" : "▼"} {fmt(Math.abs(s.exp - prevS.exp))} · net {s.net > prevS.net ? "▲" : "▼"} {fmt(Math.abs(s.net - prevS.net))}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => generateInsight(key)}
                      disabled={!s.hasData || insightLoading[key]}
                      style={{ background: COLORS.accentPurple + "22", border: `1px solid ${COLORS.accentPurple}`, color: COLORS.accentPurple, borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: s.hasData ? "pointer" : "not-allowed", opacity: s.hasData ? 1 : 0.4, display: "flex", alignItems: "center", gap: 8 }}
                    >
                      {insightLoading[key] ? <><div style={{ width: 12, height: 12, border: `2px solid ${COLORS.accentPurple}44`, borderTopColor: COLORS.accentPurple, borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Analyzing…</> : "✦ AI Insights"}
                    </button>
                  </div>
                  {/* AI insight box */}
                  {insightText[key] && (
                    <div style={{ background: COLORS.accentPurple + "12", border: `1px solid ${COLORS.accentPurple}44`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
                      <p style={{ fontSize: 12, color: COLORS.accentPurple, fontFamily: "'DM Mono', monospace", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>✦ Claude's Analysis</p>
                      {insightText[key].split("\n").filter(l => l.trim()).map((line, i) => (
                        <p key={i} style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{line}</p>
                      ))}
                    </div>
                  )}
                  {!s.hasData ? (
                    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
                      <p style={{ fontSize: 32, marginBottom: 12 }}>📭</p>
                      <p style={{ fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>No data for {MONTH_FULL[month0]}</p>
                      <p style={{ color: COLORS.muted, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Switch to this month and use the + button to add entries,<br />or they'll appear here automatically.</p>
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
                            <p style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.label}</p>
                            <p style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.raw ? k.val : fmt(k.val)}</p>
                            {prevS.hasData && !k.raw && (() => {
                              const prev = k.label === "Income" ? prevS.inc : k.label === "Expenses" ? prevS.exp : prevS.net;
                              const diff = k.val - prev;
                              return <p style={{ fontSize: 11, color: diff >= 0 ? (k.label === "Expenses" ? COLORS.danger : COLORS.success) : (k.label === "Expenses" ? COLORS.success : COLORS.danger), fontFamily: "'DM Mono', monospace", marginTop: 3 }}>{diff >= 0 ? "+" : ""}{fmt(diff)} vs prev</p>;
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
                                <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: COLORS.muted }}>{fmt(s.cats[c])} · {s.exp > 0 ? pct(s.cats[c], s.exp).toFixed(0) : 0}%</span>
                              </div>
                              <ProgressBar value={s.cats[c]} max={s.exp} color={COLORS.accentBlue} />
                            </div>
                          ))}
                          {CATEGORIES.every(c => s.cats[c] === 0) && <p style={{ color: COLORS.muted, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>No expenses recorded.</p>}
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
                                  <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: COLORS.muted }}>{fmt(b.val)} / {fmt(b.target)}</span>
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
                          {snap.income.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>None recorded</p> :
                            snap.income.map(i => (
                              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                                <span style={{ fontSize: 13 }}>{i.label}</span>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: COLORS.accent }}>+{fmt(i.amount)}</span>
                              </div>
                            ))
                          }
                        </div>
                        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 20 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: COLORS.accentWarm }}>Expenses ({snap.expenses.length})</h4>
                          {snap.expenses.length === 0 ? <p style={{ color: COLORS.muted, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>None recorded</p> :
                            snap.expenses.slice().sort((a,b)=>b.amount-a.amount).map(e => (
                              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                                <div>
                                  <p style={{ fontSize: 13 }}>{e.label}</p>
                                  <p style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>{e.category}</p>
                                </div>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: COLORS.accentWarm }}>−{fmt(e.amount)}</span>
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
                      <p style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{k.label}</p>
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
                      <span style={{ fontSize: 9, color: key === activeInsightKey ? COLORS.accentBlue : COLORS.muted, fontFamily: "'DM Mono', monospace" }}>{MONTH_NAMES[month0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {/* ── UPLOAD RECEIPT TAB ── */}
        {tab === "upload" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Upload Receipt or Bill</h2>
            <p style={{ color: COLORS.muted, fontSize: 13, fontFamily: "'DM Mono', monospace", marginBottom: 24 }}>Claude AI will extract and categorize line items automatically.</p>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${COLORS.border}`, borderRadius: 18, padding: "48px 24px", textAlign: "center", cursor: "pointer", background: COLORS.card, transition: "border-color .2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
            >
              <p style={{ fontSize: 40, marginBottom: 12 }}>📄</p>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Drop a receipt or bill here</p>
              <p style={{ color: COLORS.muted, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Supports JPG, PNG, PDF</p>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFileUpload} />
            </div>
            {parseLoading && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ color: COLORS.muted, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>Claude is reading your receipt…</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
            {parseResult?.error && (
              <div style={{ background: COLORS.danger + "18", border: `1px solid ${COLORS.danger}`, borderRadius: 14, padding: 20, marginTop: 20 }}>
                <p style={{ color: COLORS.danger, fontWeight: 600 }}>{parseResult.error}</p>
              </div>
            )}
            {parseResult?.items && (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, marginTop: 20 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Detected Items — Review before importing</h3>
                {parseResult.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>{item.category} · {item.date}</p>
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: COLORS.accentWarm }}>{fmt(item.amount)}</span>
                  </div>
                ))}
                <button onClick={() => importParsedItems(parseResult.items)} style={{ ...btnPrimary, marginTop: 18 }}>Import All to Expenses</button>
              </div>
            )}
          </div>
        )}
        {/* ── ADVISOR TAB ── */}
        {tab === "advisor" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>AI Financial Advisor</h2>
            <p style={{ color: COLORS.muted, fontSize: 13, fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>Ask anything about your budget. Upload documents for review.</p>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, marginBottom: 16, paddingRight: 4 }}>
              {advisorHistory.length === 0 && (
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 20, textAlign: "center" }}>
                  <p style={{ fontSize: 30, marginBottom: 10 }}>💬</p>
                  <p style={{ color: COLORS.muted, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Start a conversation. Try:<br />"How can I save $200 more per month?"<br />"Am I on track with my 50/30/20?"<br />"Review my mortgage document."</p>
                </div>
              )}
              {advisorHistory.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    background: msg.role === "user" ? COLORS.accent + "22" : COLORS.card,
                    border: `1px solid ${msg.role === "user" ? COLORS.accent + "44" : COLORS.border}`,
                    borderRadius: 14, padding: "12px 16px", maxWidth: "75%",
                    fontSize: 14, lineHeight: 1.6, color: COLORS.text,
                    fontFamily: msg.role === "user" ? "'Syne', sans-serif" : "'DM Mono', monospace",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {advisorLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[0,1,2].map(j => <div key={j} style={{ width: 8, height: 8, background: COLORS.accent, borderRadius: "50%", animation: `bounce .8s ${j*0.15}s infinite alternate` }} />)}
                    </div>
                    <style>{`@keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-6px); } }`}</style>
                  </div>
                </div>
              )}
            </div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16 }}>
              {advisorFile && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 12px", background: COLORS.accent + "18", borderRadius: 8, width: "fit-content" }}>
                  <span style={{ fontSize: 13, color: COLORS.accent }}>📎 {advisorFile.name}</span>
                  <button onClick={() => setAdvisorFile(null)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}>×</button>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <button onClick={() => advisorFileRef.current?.click()} title="Attach file" style={{ background: COLORS.border, border: "none", color: COLORS.muted, borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>📎</button>
                <input ref={advisorFileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => setAdvisorFile(e.target.files[0])} />
                <textarea
                  value={advisorMsg}
                  onChange={e => setAdvisorMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdvisor(); } }}
                  placeholder="Ask your advisor anything… (Enter to send)"
                  rows={2}
                  style={{ ...inputStyle, flex: 1, resize: "none", lineHeight: 1.5 }}
                />
                <button onClick={handleAdvisor} disabled={advisorLoading} style={{ background: COLORS.accent, border: "none", color: "#0a0a10", borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>→</button>
              </div>
            </div>
          </div>
        )}
      </main>
      {/* ── MODALS ── */}
      {modal === "addMenu" && <SmartAddModal
        onClose={() => setModal(null)}
        onManualExpense={() => setModal("addExpense")}
        onManualIncome={() => setModal("addIncome")}
        onManualDebt={() => setModal("addDebt")}
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
          <p style={{ color: COLORS.muted, fontSize: 13, fontFamily: "'DM Mono', monospace", marginBottom: 18 }}>
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
              <p style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap" }}>{goalResponse}</p>
            </div>
          )}
          {goals.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>Active Goals</p>
              {goals.map(g => (
                <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: COLORS.accentPurple }}>{fmt(g.limit)}</span>
                    <button onClick={() => setGoals(prev => prev.filter(x => x.id !== g.id))} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
