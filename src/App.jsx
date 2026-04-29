import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { flushSync } from "react-dom";
import { PieChart, Pie, Cell, BarChart, Bar, ComposedChart, AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { db } from './firebase'
import { doc, setDoc, getDoc, addDoc, collection, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { motion, AnimatePresence } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";
// ── Design System: "The Modern Hearth" — Roberts Family Finance ───────────────
// ── COLORS — values resolve to CSS custom properties defined in index.css.
// Theme (light/dark) is toggled by toggling .dark on <html>; every downstream
// `style={{ color: COLORS.primary }}` automatically re-renders in the new theme
// because CSS var resolution happens at paint time.
const COLORS = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  card: "var(--c-card)",
  containerLow: "var(--c-container-low)",
  container: "var(--c-container)",
  containerHigh: "var(--c-container-high)",
  containerHighest: "var(--c-container-highest)",
  neutral: "var(--c-neutral)",
  primary: "var(--c-primary)",
  primaryDim: "var(--c-primary-dim)",
  primaryContainer: "var(--c-primary-container)",
  primaryFixed: "var(--c-primary-fixed)",
  secondary: "var(--c-secondary)",
  secondaryContainer: "var(--c-secondary-container)",
  onSecondaryContainer: "var(--c-on-secondary-container)",
  tertiary: "var(--c-tertiary)",
  tertiaryContainer: "var(--c-tertiary-container)",
  onTertiaryContainer: "var(--c-on-tertiary-container)",
  sidebarBg: "var(--c-sidebar-bg)",
  sidebarActive: "var(--c-sidebar-active)",
  sidebarText: "var(--c-sidebar-text)",
  accent: "var(--c-accent)",
  accentWarm: "var(--c-accent-warm)",
  accentBlue: "var(--c-accent-blue)",
  accentPurple: "var(--c-accent-purple)",
  danger: "var(--c-danger)",
  warning: "var(--c-warning)",
  success: "var(--c-success)",
  successFill: "var(--c-success-fill)",
  dangerFill: "var(--c-danger-fill)",
  warningFill: "var(--c-warning-fill)",
  successFillBg: "var(--c-success-fill-bg)",
  dangerFillBg: "var(--c-danger-fill-bg)",
  primaryFillBg: "var(--c-primary-fill-bg)",
  text: "var(--c-text)",
  subtext: "var(--c-subtext)",
  muted: "var(--c-muted)",
  inputBg: "var(--c-input-bg)",
  border: "var(--c-border)",
  shadow: "var(--c-shadow)",
  shadowSm: "var(--c-shadow-sm)",
  shadowLg: "var(--c-shadow-lg)",
};
// ── Typography scale ──────────────────────────────────────────────────────────
const FS = { "2xs": 9, xs: 11, sm: 12, base: 13, md: 14, lg: 15, xl: 16, "2xl": 18, "3xl": 20, "4xl": 22, "5xl": 24 };
// ── Border-radius scale ───────────────────────────────────────────────────────
const R = { xs: 4, sm: 6, md: 8, lg: 10, xl: 12, "2xl": 14, "3xl": 16, "4xl": 20, "5xl": 24, pill: 9999, circle: "50%" };
// ── Spacing scale (margin / padding / gap) ────────────────────────────────────
const S = { "2xs": 2, xs: 4, sm: 6, md: 8, lg: 12, xl: 16, "2xl": 20, "3xl": 24, "4xl": 28, "5xl": 32 };
// ── Font-weight scale ─────────────────────────────────────────────────────────
const FW = { normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };
// ── Chart palettes ────────────────────────────────────────────────────────────
// Per-category data-viz colors — brand-anchored (teal / indigo / warm axis)
const CAT_CHART_COLOR = {
  Housing:       "#0078a8",  // brand primary teal
  Food:          "#d97706",  // amber — warm, brand accentWarm
  Utilities:     "#0891b2",  // cyan-teal — primary family, lighter
  Transport:     "#4f7090",  // steel blue — muted, calm
  Health:        "#c0544f",  // muted coral — brand danger family
  Entertainment: "#2e8b6e",  // green-teal — success adjacent
  Personal:      "#7059b5",  // muted purple — tertiary
  Education:     "#b86e2a",  // warm brown-orange
  Savings:       "#2d8050",  // brand success green
  Kids:          "#a8497a",  // muted rose-fuchsia
  Subscriptions: "#4b7fa8",  // slate blue — primary family, muted
  Travel:        "#2a7dbf",  // medium blue
  Other:         "#7a8fa0",  // neutral slate
};
// Ordered array for positional use (pie/bar slice index fallback)
const CHART_COLORS = Object.values(CAT_CHART_COLOR);
// Semantic colors for the 5 cash-flow series
const CASH_FLOW_COLORS = {
  Income:   "#10b981",  // emerald  — positive inflow
  Expenses: "#0078a8",  // primary  — main spending activity
  Bills:    "#6366f1",  // indigo   — recurring committed
  Debt:     "#f59e0b",  // amber    — obligation / caution
  Savings:  "#0d9488",  // teal-grn — growth / positive
};
const fmt = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (val, total) => (total === 0 ? 0 : Math.min(100, (val / total) * 100));
const fmtDate = (iso) => { if (!iso) return ""; const [y, m, d] = iso.split("-"); return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
const renderMd = (text) => {
  const lines = (text || "").split("\n");
  const out = [];
  let listItems = [];
  const flushList = () => { if (listItems.length) { out.push(<ul key={`ul-${out.length}`} style={{ margin: "4px 0 4px 16px", padding: 0 }}>{listItems}</ul>); listItems = []; } };
  const inlineHtml = (s) => s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/`(.*?)`/g, "<code style='background:var(--c-border);borderRadius:3px;padding:1px 4px;fontSize:0.9em'>$1</code>");
  lines.forEach((line, i) => {
    if (line.startsWith("- ") || line.startsWith("• ")) {
      listItems.push(<li key={i} style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: inlineHtml(line.slice(2)) }} />);
    } else if (line.startsWith("### ")) {
      flushList(); out.push(<p key={i} style={{ fontWeight: FW.bold, fontSize: 14, margin: "10px 0 4px" }} dangerouslySetInnerHTML={{ __html: inlineHtml(line.slice(4)) }} />);
    } else if (line.startsWith("## ")) {
      flushList(); out.push(<p key={i} style={{ fontWeight: FW.extrabold, fontSize: 15, margin: "12px 0 4px" }} dangerouslySetInnerHTML={{ __html: inlineHtml(line.slice(3)) }} />);
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
const BASE_CATEGORIES = [
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
  { id: "Travel", label: "Travel & Experiences" },
  { id: "Other", label: "Other" },
];
const BASE_SPENDING_PLAN_GROUPS = [
  { catId: "Housing",       label: "Housing",                 icon: "home",               templateItems: ["Rent / Mortgage", "Furnishings / home upgrades"] },
  { catId: "Utilities",     label: "Utilities",               icon: "bolt",               templateItems: ["Electricity", "Water / sewer", "Gas", "Trash / recycling", "Internet", "Mobile phones"] },
  { catId: "Food",          label: "Food",                    icon: "restaurant",         templateItems: ["Groceries", "Dining out / takeout", "Coffee / snacks", "Meal prep / delivery services"] },
  { catId: "Transport",     label: "Transportation",          icon: "directions_car",     templateItems: ["Car payment(s)", "Gas / charging (EV)", "Insurance", "Maintenance & repairs", "Parking / tolls", "Public transportation / rideshare"] },
  { catId: "Health",        label: "Health & Wellness",       icon: "favorite",           templateItems: ["Health insurance", "Doctor visits / copays", "Medications", "Dental / vision", "Gym / fitness", "Mental health / therapy"] },
  { catId: "Kids",          label: "Kingdom",                 icon: "child_care",         templateItems: ["Childcare / daycare", "School tuition / fees", "Activities (sports, classes)", "Clothing & shoes", "Toys / entertainment", "Babysitting"] },
  { catId: "Personal",      label: "Personal Spending",       icon: "person",             templateItems: ["Clothing", "Grooming (haircuts, skincare)", "Subscriptions (Netflix, Spotify)", "Hobbies", "Personal care"] },
  { catId: "Entertainment", label: "Relationship / Lifestyle",icon: "celebration",        templateItems: ["Date nights", "Gifts (spouse, family, friends)", "Celebrations / holidays", "Experiences (trips, outings)"] },
  { catId: "Education",     label: "Work / Professional",     icon: "work",               templateItems: ["Courses / certifications", "Work clothes", "Tools / software", "Commuting extras", "Networking"] },
  { catId: "Travel",        label: "Travel & Experiences",    icon: "flight",             templateItems: ["Flights", "Hotels", "Activities", "Travel food", "Travel insurance"] },
  { catId: "Savings",       label: "Giving",                  icon: "volunteer_activism", templateItems: ["Donations / charity", "Tithing", "Family support"] },
  { catId: "Subscriptions", label: "Subscriptions & Streaming", icon: "subscriptions",    templateItems: ["Netflix", "Spotify", "Amazon Prime", "Disney+", "YouTube Premium", "Apple services", "Google services", "Other streaming"] },
  { catId: "Other",         label: "Other",                   icon: "category",           templateItems: ["Miscellaneous", "Uncategorized"] },
];
// Module-level aliases so module-scope components (e.g. SmartAddModal) still
// compile against the base set. Inside App, these are shadowed by derived
// locals that merge customCategories + categoryLabelOverrides.
const CATEGORIES = BASE_CATEGORIES;
const SPENDING_PLAN_GROUPS = BASE_SPENDING_PLAN_GROUPS;
const CAT_LABEL = Object.fromEntries(BASE_CATEGORIES.map(c => [c.id, c.label]));
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
// ── AnimatedNumber ────────────────────────────────────────────────────────────
// Tweens between numeric values on prop change. format() maps the intermediate
// number to its display string (e.g. fmt for currency). Respects reduced-motion.
function AnimatedNumber({ value, format = (v) => String(Math.round(v)), duration = 700, style, className }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(null);
  useEffect(() => {
    if (typeof window === "undefined") { setDisplay(value); return; }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(value); fromRef.current = value; return; }
    const from = fromRef.current;
    const to = Number.isFinite(value) ? value : 0;
    if (from === to) { setDisplay(to); return; }
    const startT = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startT) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = from + (to - from) * eased;
      setDisplay(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else { fromRef.current = to; rafRef.current = null; }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); fromRef.current = display; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);
  return <span className={className} style={style}>{format(display)}</span>;
}
// ── ProgressBar ───────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color }) {
  const p = pct(value, max);
  const barColor = p >= 100 ? COLORS.dangerFill : p >= 80 ? COLORS.warningFill : color || COLORS.primary;
  return (
    <div style={{ background: COLORS.containerLow, borderRadius: R.pill, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${p}%`, background: barColor, height: "100%", borderRadius: R.pill, transition: "width .4s ease" }} />
    </div>
  );
}
// ── CategoryCard ──────────────────────────────────────────────────────────────
function CategoryCard({ name, spent, goal, color }) {
  const p = goal ? pct(spent, goal) : null;
  const borderColor =
    p === null ? COLORS.border :
    p >= 100 ? COLORS.dangerFill :
    p >= 80  ? COLORS.warningFill :
    p <= 50  ? COLORS.successFill :
    COLORS.border;
  return (
    <div style={{
      background: "var(--c-surface)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: R["2xl"],
      padding: `${S.lg}px ${S.xl}px`,
      transition: "border-color .3s ease",
      boxShadow: borderColor !== COLORS.border ? `0 0 12px ${borderColor}33` : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 }}>{name}</span>
        <span style={{ fontFamily: "var(--font-num)", fontWeight: FW.bold, fontSize: 15, color: COLORS.text, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{fmt(spent)}</span>
      </div>
      {goal && (
        <>
          <ProgressBar value={spent} max={goal} color={color} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{ fontSize: 11, color: COLORS.muted }}>Limit: {fmt(goal)}</span>
            <span style={{ fontSize: FS.xs, color: borderColor === COLORS.dangerFill ? COLORS.danger : borderColor === COLORS.warningFill ? COLORS.warning : COLORS.success }}>
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
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.30)",
      backdropFilter: "blur(12px) saturate(140%)",
      WebkitBackdropFilter: "blur(12px) saturate(140%)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: S.xl,
    }} onClick={onClose}>
      <div style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: R["5xl"], padding: S["5xl"], width: "100%",
        maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: S["3xl"] }}>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: FW.extrabold, color: COLORS.text, fontSize: FS["3xl"], margin: 0, letterSpacing: "-0.025em" }}>{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" style={{ background: "var(--c-border)", border: "none", color: COLORS.subtext, borderRadius: R.circle, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: FS["2xl"], lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
// ── Input helper ──────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: S.xl }}>
      <label style={{ display: "block", fontSize: FS.xs, color: COLORS.subtext, marginBottom: S.sm, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: FW.bold }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = {
  width: "100%", background: "rgba(0,120,168,0.055)", border: "1px solid rgba(0,120,168,0.10)",
  borderRadius: R.xl, padding: `${S.lg}px ${S.xl}px`, color: COLORS.text, fontSize: FS.md,
  fontFamily: "'Figtree', sans-serif", outline: "none", boxSizing: "border-box",
  transition: "box-shadow 0.15s ease, border-color 0.15s ease",
};
const selectStyle = { ...inputStyle, appearance: "none" };
const btnPrimary = {
  width: "100%", background: `linear-gradient(140deg, ${COLORS.primary} 0%, #0095d2 100%)`,
  color: "#fff", border: "none", borderRadius: R.xl, padding: `${S.lg}px`,
  fontSize: FS.md, fontWeight: FW.bold, cursor: "pointer", fontFamily: "'Figtree', sans-serif",
  boxShadow: "0 6px 20px rgba(0,120,168,0.30), inset 0 1px 0 rgba(255,255,255,0.15)",
};
// ── BudgetBar ─────────────────────────────────────────────────────────────────
function BudgetBar({ totalIncome, totalPlanned, totalSpent, hideLabel = false }) {
  const isOverPlanned = totalIncome > 0 && totalPlanned > totalIncome;
  const isOverIncome = totalIncome > 0 && totalSpent > totalIncome;
  // Only flag "over budget" if a meaningful budget is set (>10% of income) and exceeded
  const hasMeaningfulBudget = totalPlanned > 0 && totalIncome > 0 && (totalPlanned / totalIncome) > 0.10;
  const isOverBudget = hasMeaningfulBudget && totalSpent > totalPlanned;
  const plannedPct = totalIncome > 0 ? Math.min(100, (totalPlanned / totalIncome) * 100) : 0;
  // spent fills relative to income (not clamped to planned)
  const spentPct = totalIncome > 0 ? Math.min(100, (totalSpent / totalIncome) * 100) : 0;
  const remaining = totalIncome - totalPlanned;
  const overBy = Math.abs(remaining);
  const pillBg = remaining > 0 ? COLORS.successFillBg : remaining === 0 ? COLORS.primaryFillBg : COLORS.dangerFillBg;
  const pillColor = remaining > 0 ? COLORS.successFill : remaining === 0 ? COLORS.primary : COLORS.dangerFill;
  const pillText = remaining > 0 ? `${fmt(remaining)} left to budget` : remaining === 0 ? "Fully budgeted ✓" : `${fmt(overBy)} over-budgeted`;
  const borderColor = isOverPlanned ? COLORS.dangerFill : "rgba(172,179,181,0.2)";
  const spentColor = isOverIncome ? COLORS.dangerFill : isOverBudget ? COLORS.warningFill : COLORS.primary;
  return (
    <div style={{ marginBottom: S.xs }}>
      {!hideLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: S.md }}>
          <span style={{ fontSize: FS.sm, fontWeight: FW.bold, color: COLORS.subtext }}>Budget Status</span>
          <span style={{ fontSize: FS.sm, fontWeight: FW.bold, background: pillBg, color: pillColor, borderRadius: R.pill, padding: `3px ${S.lg}px`, letterSpacing: "-0.01em" }}>{pillText}</span>
        </div>
      )}
      <div style={{ position: "relative", height: 28, background: COLORS.containerLow, borderRadius: R.xl, overflow: "hidden", border: `1.5px solid ${borderColor}`, boxShadow: isOverPlanned ? `0 0 10px ${COLORS.dangerFill}30` : "none" }}>
        {/* Planned fill */}
        {plannedPct > 0 && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${plannedPct}%`, background: isOverPlanned ? `${COLORS.dangerFill}48` : `${COLORS.primary}38`, transition: "width 0.5s ease", borderRadius: `${R.lg}px 0 0 ${R.lg}px` }} />}
        {/* Spent fill */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${spentPct}%`, background: spentColor, transition: "width 0.5s ease", borderRadius: `${R.lg}px 0 0 ${R.lg}px` }} />
        {/* Inline labels */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${S.lg}px`, pointerEvents: "none" }}>
          <span style={{ fontSize: FS.xs, fontWeight: FW.bold, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>Spent {fmt(totalSpent)}</span>
          <span style={{ fontSize: FS.xs, fontWeight: FW.bold, color: COLORS.subtext, whiteSpace: "nowrap" }}>Income {fmt(totalIncome)}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: S.sm, flexWrap: "wrap" }}>
        {[
          { color: spentColor, label: `Spent ${fmt(totalSpent)}` },
          { color: `${COLORS.primary}72`, label: `Planned ${fmt(totalPlanned)}` },
        ].map(l => (
          <span key={l.label} style={{ fontSize: FS.xs, color: COLORS.muted, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: R.xs, background: l.color, flexShrink: 0, display: "inline-block" }} />{l.label}
          </span>
        ))}
        {isOverPlanned && <span style={{ fontSize: FS.xs, color: COLORS.dangerFill, fontWeight: FW.bold, marginLeft: "auto" }}>⚠ Over by {fmt(overBy)}</span>}
        {isOverIncome && <span style={{ fontSize: FS.xs, color: COLORS.dangerFill, fontWeight: FW.bold, marginLeft: "auto" }}>Overspent by {fmt(totalSpent - totalIncome)}</span>}
        {isOverBudget && !isOverIncome && <span style={{ fontSize: FS.xs, color: COLORS.warningFill, fontWeight: FW.bold, marginLeft: "auto" }}>Over budget by {fmt(totalSpent - totalPlanned)}</span>}
      </div>
    </div>
  );
}
// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ info }) {
  if (!info) return null;
  return (
    <div style={{ position: "fixed", bottom: 48, left: "50%", transform: "translateX(-50%)", background: "rgba(22,22,35,0.88)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#fff", borderRadius: R["4xl"], padding: `${S.md}px 22px`, fontSize: FS.base, fontWeight: FW.semibold, zIndex: 9999, display: "flex", alignItems: "center", gap: S.md, boxShadow: "0 8px 32px rgba(0,0,0,0.28)", animation: "toastSlideUp 0.2s ease", fontFamily: "'Figtree', sans-serif" }}>
      <span style={{ fontSize: FS.lg }}>{info.icon}</span>{info.msg}
    </div>
  );
}
// ── PDF text extractor (loads pdf.js from CDN on first use) ──────────────────
let _pdfjs = null;
async function extractPdfText(file) {
  if (!_pdfjs) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    _pdfjs = window.pdfjsLib;
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await _pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(it => it.str).join(" "));
  }
  return pages.join("\n\n");
}
// ── SmartAddModal ─────────────────────────────────────────────────────────────
function SmartAddModal({ onClose, onManualExpense, onManualIncome, onImportExpenses, onImportIncome, existingExpenses = [] }) {
  const [step, setStep] = useState("home"); // home | nl | upload | preview
  const [nlInput, setNlInput] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewItems, setPreviewItems] = useState([]);
  const [previewType, setPreviewType] = useState("expense"); // expense | income
  const [skippedCount, setSkippedCount] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileRef = useRef();
  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const bytes = new Uint8Array(r.result);
        let binary = "";
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        res(btoa(binary));
      };
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsArrayBuffer(file);
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
      "category": "one of: Housing|Food|Utilities|Transport|Health|Entertainment|Personal|Education|Savings|Kids|Travel|Subscriptions|Other. Hints: daycare/childcare/diapers/preschool/baby/toys/school supplies → Kids; doctor/pharmacy/copay/hospital/prescription/dental/vision → Health; netflix/spotify/gym/movie/games → Entertainment; mortgage/rent → Housing; flights/hotels/vacation → Travel; netflix/spotify/streaming → Subscriptions",
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
    setSkippedCount(0);
    try {
      const isPDF = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      if (!isPDF && !isImage) { setUploadError("Please upload a JPG, PNG, or PDF."); setUploadLoading(false); return; }
      const today = new Date().toISOString().slice(0, 10);
      const prompt = `Today is ${today}. Extract ALL debit/charge transactions as expenses.
SKIP completely: transfers between own accounts (e.g. "Transfer to Savings", "Transfer from Checking", "Internal Transfer"), payments to own bank accounts, Zelle/Venmo transfers to self, and credit/deposit entries.
Return ONLY valid JSON (no markdown):
{
  "type": "expense",
  "documentDescription": "brief description of the document",
  "items": [
    {
      "label": "merchant or payee name (clean, no transaction codes)",
      "amount": 0.00,
      "category": "Housing|Food|Utilities|Transport|Health|Entertainment|Personal|Education|Savings|Kids|Travel|Subscriptions|Other",
      "date": "YYYY-MM-DD",
      "fixed": false,
      "recurring": false
    }
  ]
}
Category hints: daycare/childcare/preschool/school supplies → Kids; doctor/pharmacy/copay/dental/vision/hospital → Health; netflix/spotify/gym/games/movies → Entertainment; mortgage/rent → Housing; flights/hotels/vacation/airbnb → Travel; streaming/subscriptions → Subscriptions; gas/uber/lyft/parking/transit → Transport; groceries/restaurants/coffee/dining → Food; electric/water/internet/phone/cable → Utilities.
Use positive amounts. If date not visible, use today. If unsure of category, use Other.`;

      let messageContent;
      if (isPDF) {
        // Extract text client-side — avoids sending ~600KB binary over the network
        const pdfText = await extractPdfText(file);
        if (pdfText.trim().length < 20) {
          setUploadError("This PDF appears to be scanned (no selectable text). Please upload a JPG or PNG screenshot instead.");
          setUploadLoading(false);
          return;
        }
        messageContent = [{ type: "text", text: `BANK STATEMENT TEXT:\n${pdfText}\n\n${prompt}` }];
      } else {
        // Image — base64 encode and send as image block
        if (file.size > 4 * 1024 * 1024) { setUploadError("Image too large — please use a file under 4 MB."); setUploadLoading(false); return; }
        const base64 = await fileToBase64(file);
        messageContent = [
          { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
          { type: "text", text: prompt }
        ];
      }

      const res = await fetch("/.netlify/functions/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          messages: [{ role: "user", content: messageContent }]
        })
      });
      const rawText = await res.text();
      if (!res.ok || rawText.trimStart().startsWith("<")) {
        throw new Error("Request timed out — try a smaller PDF (1–2 pages work best).");
      }
      const data = JSON.parse(rawText);
      if (data.type === "error") {
        throw new Error(data.error?.message || `API error ${res.status}`);
      }
      const text = data.content?.map(b => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const allItems = parsed.items.map((it, i) => ({ ...it, id: Date.now() + i, amount: parseFloat(it.amount) }));
      // Silently deduplicate against existing expenses
      const deduped = allItems.filter(it =>
        !existingExpenses.some(ex =>
          ex.label.toLowerCase() === it.label.toLowerCase() &&
          Math.abs(parseFloat(ex.amount) - it.amount) < 0.01 &&
          ex.date === it.date
        )
      );
      setSkippedCount(allItems.length - deduped.length);
      // Sort by category order
      const catOrder = CATEGORIES.map(c => c.id);
      deduped.sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category));
      setPreviewItems(deduped);
      setPreviewType("expense");
      setStep("preview");
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(err.message || "Couldn't read that document. Try a clearer photo or different file.");
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.30)", backdropFilter: "blur(12px) saturate(140%)", WebkitBackdropFilter: "blur(12px) saturate(140%)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={step === "home" ? onClose : undefined}>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 28, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step !== "home" && (
              <button onClick={() => { setStep("home"); setNlInput(""); setNlError(""); setUploadError(""); setPreviewItems([]); setSkippedCount(0); }}
                style={{ background: "var(--c-border)", border: "none", color: COLORS.subtext, borderRadius: 10, padding: "4px 10px", cursor: "pointer", fontSize: 14 }}>←</button>
            )}
            <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: FW.extrabold, color: COLORS.text, fontSize: 20, margin: 0, letterSpacing: "-0.025em" }}>
              {step === "home" && "Add Transaction"}
              {step === "nl" && "Describe It"}
              {step === "upload" && "Upload Document"}
              {step === "preview" && "Review & Import"}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "var(--c-border)", border: "none", color: COLORS.subtext, borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>×</button>
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
                  background: "rgba(0,120,168,0.07)", border: "1px solid rgba(0,120,168,0.10)", borderRadius: 16, padding: "20px 12px",
                  cursor: "pointer", textAlign: "center", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `rgba(0,120,168,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: COLORS.primary, fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
                  </div>
                  <p style={{ fontWeight: FW.semibold, fontSize: 13, color: COLORS.text, marginBottom: 2 }}>Expense</p>
                  <p style={{ fontSize: 11, color: COLORS.subtext, lineHeight: 1.4 }}>Add a cost</p>
                </button>
                <button onClick={onManualIncome} style={{
                  background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 16, padding: "20px 12px",
                  cursor: "pointer", textAlign: "center", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `rgba(16,185,129,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: COLORS.success, fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                  </div>
                  <p style={{ fontWeight: FW.semibold, fontSize: 13, color: COLORS.text, marginBottom: 2 }}>Income</p>
                  <p style={{ fontSize: 11, color: COLORS.subtext, lineHeight: 1.4 }}>Add earnings</p>
                </button>
                <button onClick={() => { setStep("upload"); setTimeout(() => fileRef.current?.click(), 100); }} style={{
                  background: "rgba(74,82,168,0.07)", border: "1px solid rgba(74,82,168,0.10)", borderRadius: 16, padding: "20px 12px",
                  cursor: "pointer", textAlign: "center", transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `rgba(74,82,168,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, color: COLORS.tertiary, fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                  </div>
                  <p style={{ fontWeight: FW.semibold, fontSize: 13, color: COLORS.text, marginBottom: 2 }}>Document</p>
                  <p style={{ fontSize: 11, color: COLORS.subtext, lineHeight: 1.4 }}>Scan a doc</p>
                </button>
              </div>
              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
                <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: FW.medium }}>or describe in words</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
              </div>
              <button onClick={() => setStep("nl")} style={{
                width: "100%", background: "rgba(0,120,168,0.07)", border: "1px solid rgba(0,120,168,0.10)", borderRadius: 14, padding: "14px 16px",
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.18s ease",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.primary }}>chat</span>
                <div>
                  <p style={{ fontWeight: FW.bold, fontSize: 14, color: COLORS.text, marginBottom: 2 }}>Natural Language</p>
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
              <div style={{ background: "rgba(0,120,168,0.05)", border: "1px solid rgba(0,120,168,0.08)", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: COLORS.muted, fontWeight: FW.bold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>EXAMPLES</p>
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
{/* keyframes defined in global <style> block */}
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
                  <p style={{ fontWeight: FW.bold, fontSize: 15, marginBottom: 6, color: COLORS.text }}>Tap to choose a file</p>
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
                  {previewItems.length} item{previewItems.length !== 1 ? "s" : ""} found{skippedCount > 0 ? ` · ${skippedCount} duplicate${skippedCount !== 1 ? "s" : ""} skipped` : ""} · Edit before importing
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setPreviewType("expense")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: FW.bold, border: `1px solid ${previewType === "expense" ? COLORS.accentWarm : COLORS.border}`, background: previewType === "expense" ? COLORS.accentWarm + "22" : "none", color: previewType === "expense" ? COLORS.accentWarm : COLORS.muted }}>Expense</button>
                  <button onClick={() => setPreviewType("income")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontWeight: FW.bold, border: `1px solid ${previewType === "income" ? COLORS.accent : COLORS.border}`, background: previewType === "income" ? COLORS.accent + "22" : "none", color: previewType === "income" ? COLORS.accent : COLORS.muted }}>Income</button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 18, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
                {(() => {
                  const catOrder = CATEGORIES.map(c => c.id);
                  const grouped = {};
                  previewItems.forEach(item => {
                    if (!grouped[item.category]) grouped[item.category] = [];
                    grouped[item.category].push(item);
                  });
                  const sortedCats = Object.keys(grouped).sort((a, b) => catOrder.indexOf(a) - catOrder.indexOf(b));
                  return sortedCats.map(cat => {
                    const catMeta = CATEGORIES.find(c => c.id === cat);
                    return (
                      <div key={cat} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 2px 7px", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13, color: COLORS.primary, fontVariationSettings: "'FILL' 1" }}>{catMeta?.icon || "label"}</span>
                            <span style={{ fontSize: 11, fontWeight: FW.bold, color: COLORS.subtext, textTransform: "uppercase", letterSpacing: "0.07em" }}>{catMeta?.label || cat}</span>
                          </div>
                          <span style={{ fontSize: 11, color: COLORS.muted }}>{grouped[cat].length}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {grouped[cat].map(item => (
                            <div key={item.id} style={{ background: "rgba(0,120,168,0.04)", border: "1px solid rgba(0,120,168,0.09)", borderRadius: 14, padding: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                <input
                                  value={item.label}
                                  onChange={e => updateItem(item.id, "label", e.target.value)}
                                  style={{ ...inputStyle, flex: 1, marginRight: 10, padding: "7px 12px", fontSize: 13, fontWeight: FW.semibold }}
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
                      </div>
                    );
                  });
                })()}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: `1px solid ${COLORS.border}`, marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: COLORS.muted }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: FW.extrabold, color: previewType === "income" ? COLORS.accent : COLORS.accentWarm }}>
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
  // ── Dark mode ── initial value is read in index.html to avoid FOUC; we mirror here.
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (darkMode) root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem("ff_theme", darkMode ? "dark" : "light"); } catch (e) {}
  }, [darkMode]);
  const toggleDarkMode = useCallback(() => {
    const run = () => setDarkMode(p => !p);
    if (typeof document !== "undefined" && typeof document.startViewTransition === "function" &&
        !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(() => { flushSync(run); });
    } else { run(); }
  }, []);
  // ── View Transition navigation ── native cross-document-style morphing between tabs.
  // Falls back to plain setTab in browsers without the API or when prefers-reduced-motion is set.
  const navigateToTab = useCallback((id) => {
    if (typeof document === "undefined" || typeof document.startViewTransition !== "function") {
      setTab(id);
      return;
    }
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { setTab(id); return; }
    // Mark the root as a tab-swap so the page-main slide/fade keyframes fire.
    // For non-tab transitions (bill morph), the class is absent and page-main
    // falls back to the browser's trivial default (old == new → no visible change).
    document.documentElement.classList.add("vt-tab-swap");
    const t = document.startViewTransition(() => { flushSync(() => setTab(id)); });
    t.finished.finally(() => document.documentElement.classList.remove("vt-tab-swap"));
  }, []);
  // Open the bill detail sheet. When View Transitions are supported, the
  // clicked bill gets a unique view-transition-name so it morphs into the
  // modal. We set the name via flushSync BEFORE calling startViewTransition,
  // so the "old" snapshot includes the name on the source element.
  // Artifact hardening: always clear morphBillId via .finally() (covers both
  // `.finished` resolve AND reject — e.g. if a second transition skips this one).
  const openBillDetail = useCallback((bill) => {
    if (!bill) return;
    if (typeof document === "undefined" || typeof document.startViewTransition !== "function") {
      setActiveBillDetail(bill);
      return;
    }
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { setActiveBillDetail(bill); return; }
    flushSync(() => setMorphBillId(bill.id));
    try {
      const t = document.startViewTransition(() => { flushSync(() => setActiveBillDetail(bill)); });
      // swallow rejection (happens when a newer transition skips this one) so it
      // doesn't bubble as an unhandled promise, then clean up morph state either way.
      t.finished.catch(() => {}).finally(() => setMorphBillId(null));
    } catch {
      setActiveBillDetail(bill);
      setMorphBillId(null);
    }
  }, []);
  // Ref mirrors the open bill id so closeBillDetail can read it without taking
  // activeBillDetail as a useCallback dep (which would TDZ-crash, since the
  // state is declared below). Mirrored via useEffect further down.
  const activeBillIdRef = useRef(null);
  const closeBillDetail = useCallback(() => {
    if (typeof document === "undefined" || typeof document.startViewTransition !== "function") {
      setActiveBillDetail(null);
      setMorphBillId(null);
      return;
    }
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { setActiveBillDetail(null); setMorphBillId(null); return; }
    // CRITICAL: re-set morphBillId BEFORE the transition so the NEW snapshot
    // has a source card (carousel on Overview, row on Bill Calendar) that holds
    // view-transition-name: bill-active — the modal panel morphs back INTO it.
    // Without this, the browser has no NEW target and the OLD modal snapshot
    // hangs on screen as a frozen glass rectangle.
    const idToMorph = activeBillIdRef.current;
    // If we have no source to morph back into, just unmount normally — attempting
    // a view transition with only an OLD snapshot would leave a frozen glass
    // rectangle on screen (no NEW target to animate into).
    if (idToMorph == null) {
      setActiveBillDetail(null);
      setMorphBillId(null);
      return;
    }
    flushSync(() => setMorphBillId(idToMorph));
    try {
      const t = document.startViewTransition(() => { flushSync(() => setActiveBillDetail(null)); });
      t.finished.catch(() => {}).finally(() => setMorphBillId(null));
    } catch {
      setActiveBillDetail(null);
      setMorphBillId(null);
    }
  }, []);
  const [householdId, setHouseholdId] = useState(() => localStorage.getItem('familyfinance_household_id'));
  const [householdCode, setHouseholdCode] = useState(() => localStorage.getItem('familyfinance_household_code'));
  const [joinScreen, setJoinScreen] = useState(false); // show join/create screen
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const saveTimer = useRef(null);
  const isInitialLoad = useRef(true);
  const isSavingRef = useRef(false);       // prevents onSnapshot from re-applying our own writes
  const unsubscribeRef = useRef(null);     // real-time Firestore listener cleanup
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
  const [incomeCollapsed, setIncomeCollapsed] = useState(true);    // Income strip at top of Family Budget table — collapsed by default
  // User-customisable categories: override labels for built-in categories, and
  // add wholly new categories. Both persist via Firebase (see effects below).
  const [categoryLabelOverrides, setCategoryLabelOverrides] = useState({}); // Record<catId, label>
  const [customCategories, setCustomCategories] = useState([]);             // Array<{ catId, label, icon, templateItems: [] }>
  const [editingCategoryLabelId, setEditingCategoryLabelId] = useState(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [payBillConfirm, setPayBillConfirm] = useState(null);      // BUG #3: bill awaiting pay confirmation
  const [activeBillDetail, setActiveBillDetail] = useState(null);  // BUG #10: bill detail popover
  // Keep ref in sync so closeBillDetail (declared above) can read the open
  // bill id without a useCallback dep that would reference this state var
  // before declaration (TDZ).
  activeBillIdRef.current = activeBillDetail?.id ?? null;
  const [morphBillId, setMorphBillId] = useState(null);            // Tracks the source element that should receive view-transition-name during a bill morph
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
  const [billCarouselIdx, setBillCarouselIdx] = useState(0);
  const [toastInfo, setToastInfo] = useState(null); // { msg, icon }
  const toastTimer = useRef(null);
  const pre5020Budgets = useRef(null);
  const pre5020Savings = useRef(null);
  // ── Refs for month-scoped data ──
  const prevMonthRef = useRef(viewMonthKey);
  const incomeRef = useRef(income);
  const expensesRef = useRef(expenses);
  // Always-fresh refs used inside Firebase callbacks / effects to avoid stale closures
  const viewMonthKeyRef = useRef(viewMonthKey);
  const monthlySnapshotsRef = useRef({});
  incomeRef.current = income;
  expensesRef.current = expenses;
  viewMonthKeyRef.current = viewMonthKey;
  // monthlySnapshotsRef.current is assigned AFTER monthlySnapshots useState (see below)
  // ── Monthly insights state ──
  const todayKey = monthKey(new Date().getFullYear(), new Date().getMonth());
  const [startMonthKey, setStartMonthKey] = useState("2026-01");
  const [activeInsightKey, setActiveInsightKey] = useState(todayKey);
  const [insightsMonthsOpen, setInsightsMonthsOpen] = useState(true);
  // monthlySnapshots and DEFAULT_EXPENSE_BUDGETS must be declared before Firebase useEffects that reference them
  const DEFAULT_EXPENSE_BUDGETS = { Housing: 1800, Food: 500, Utilities: 300, Transport: 500, Health: 100, Entertainment: 150, Personal: 200, Education: 50, Kids: 0, Savings: 0, Subscriptions: 0, Travel: 120, Other: 0 };
  const [monthlySnapshots, setMonthlySnapshots] = useState({
    "2026-01": { income: [{ id: 101, label: "Primary Salary", amount: 5500, recurring: true }], expenses: [{ id: 201, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 202, label: "Electricity", amount: 110, category: "Utilities", fixed: true },{ id: 203, label: "Groceries", amount: 320, category: "Food", fixed: false },{ id: 204, label: "Gas", amount: 80, category: "Transport", fixed: false }], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    "2026-02": { income: [{ id: 111, label: "Primary Salary", amount: 5500, recurring: true }], expenses: [{ id: 211, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 212, label: "Electricity", amount: 98, category: "Utilities", fixed: true },{ id: 213, label: "Groceries", amount: 290, category: "Food", fixed: false },{ id: 214, label: "Dining out", amount: 180, category: "Food", fixed: false },{ id: 215, label: "Gym", amount: 45, category: "Health", fixed: true }], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    "2026-03": { income: [{ id: 121, label: "Primary Salary", amount: 5500, recurring: true },{ id: 122, label: "Tax Refund", amount: 1200, recurring: false }], expenses: [{ id: 221, label: "Mortgage / Rent", amount: 1800, category: "Housing", fixed: true },{ id: 222, label: "Electricity", amount: 105, category: "Utilities", fixed: true },{ id: 223, label: "Groceries", amount: 340, category: "Food", fixed: false },{ id: 224, label: "Clothing", amount: 210, category: "Personal", fixed: false }], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
    [DEMO_MONTH]: { income: INITIAL_INCOME, expenses: INITIAL_EXPENSES, notes: "", billStatus: { 4: true }, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } },
  });
  // Now that monthlySnapshots is declared, keep ref in sync on every render
  monthlySnapshotsRef.current = monthlySnapshots;
  // ── Firebase initialization ──
  useEffect(() => {
    const init = async () => {
      try {
        if (!db) {
          setFirebaseLoading(false);
          isInitialLoad.current = false;
          return;
        }
        let hId = localStorage.getItem('familyfinance_household_id');
        if (!hId) {
          // No household — show join screen
          setFirebaseLoading(false);
          setJoinScreen(true);
          isInitialLoad.current = false;
          return;
        }
        setHouseholdId(hId);
        // Migration: generate code for existing households that don't have one
        let code = localStorage.getItem('familyfinance_household_code');
        if (!code) {
          const docSnap = await getDoc(doc(db, 'households', hId));
          if (docSnap.exists() && docSnap.data().code) {
            code = docSnap.data().code;
          } else {
            code = generateHouseholdCode();
            // Save code to household doc and create reverse lookup
            await setDoc(doc(db, 'households', hId), { code }, { merge: true });
            await setDoc(doc(db, 'householdCodes', code), { householdId: hId });
          }
          localStorage.setItem('familyfinance_household_code', code);
          setHouseholdCode(code);
        }
        // Load data (one-time read for initial hydration)
        const docRef = doc(db, 'households', hId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Load snapshots FIRST — they are the canonical per-month store
          if (data.monthlySnapshots) setMonthlySnapshots(data.monthlySnapshots);
          // Derive income/expenses for the CURRENT month from its snapshot.
          // Never use the top-level income/expenses fields for this — they carry
          // whatever month was last active and would corrupt the current month.
          const curSnap = data.monthlySnapshots?.[viewMonthKeyRef.current];
          if (curSnap?.income?.length) setIncome(curSnap.income);
          else if (data.income) setIncome(data.income); // backward-compat fallback
          if (curSnap?.expenses?.length) setExpenses(curSnap.expenses);
          else if (data.expenses) setExpenses(data.expenses);
          if (data.bills) setBills(data.bills);
          if (data.debts) setDebts(data.debts);
          if (data.savingsItems) setSavingsItems(data.savingsItems);
          if (data.itemBudgets) setItemBudgets(data.itemBudgets);
          if (data.categoryLabelOverrides) setCategoryLabelOverrides(data.categoryLabelOverrides);
          if (Array.isArray(data.customCategories)) setCustomCategories(data.customCategories);
          if (data.goals) setGoals(data.goals);
          if (data.advisorHistory) setAdvisorHistory(data.advisorHistory);
          if (data.familyName) setFamilyName(data.familyName);
        }
        // Real-time listener — keeps mobile/desktop in sync.
        // Skips our own writes (isSavingRef) and the initial load burst.
        unsubscribeRef.current = onSnapshot(docRef, (snap) => {
          if (isInitialLoad.current) return;
          if (snap.metadata.hasPendingWrites) return; // our own local write, not yet server-confirmed
          if (isSavingRef.current) return;            // our own recently-confirmed write
          if (!snap.exists()) return;
          const d = snap.data();
          // Snapshots first — source of truth
          if (d.monthlySnapshots) setMonthlySnapshots(d.monthlySnapshots);
          // Sync income/expenses for whichever month is currently viewed, not the stale top-level fields
          if (d.monthlySnapshots) {
            const curSnap = d.monthlySnapshots[viewMonthKeyRef.current];
            if (curSnap?.income) setIncome(curSnap.income);
            if (curSnap?.expenses) setExpenses(curSnap.expenses);
          }
          if (d.bills) setBills(d.bills);
          if (d.debts) setDebts(d.debts);
          if (d.savingsItems) setSavingsItems(d.savingsItems);
          if (d.itemBudgets) setItemBudgets(d.itemBudgets);
          if (d.categoryLabelOverrides) setCategoryLabelOverrides(d.categoryLabelOverrides);
          if (Array.isArray(d.customCategories)) setCustomCategories(d.customCategories);
          if (d.goals) setGoals(d.goals);
          if (d.advisorHistory) setAdvisorHistory(d.advisorHistory);
          if (d.familyName) setFamilyName(d.familyName);
        });
      } catch (err) {
        console.error('Firebase load error:', err);
      }
      setFirebaseLoading(false);
      setTimeout(() => { isInitialLoad.current = false; }, 1500);
    };
    init();
    return () => { if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, []);
  // ── Firebase auto-save (debounced) ──
  useEffect(() => {
    if (!db || !householdId || isInitialLoad.current || firebaseLoading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      isSavingRef.current = true; // tell onSnapshot to ignore the echo of this write
      try {
        const savePromise = setDoc(doc(db, 'households', householdId), {
          income,
          expenses,
          bills,
          debts,
          savingsItems,
          monthlySnapshots,
          itemBudgets,
          categoryLabelOverrides,
          customCategories,
          goals,
          advisorHistory,
          familyName,
          updatedAt: serverTimestamp(),
        });
        // Timeout after 10 seconds to prevent stuck "Saving…"
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Save timed out')), 10000));
        await Promise.race([savePromise, timeout]);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (err) {
        console.error('Firebase save error:', err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 4000);
      } finally {
        // Allow 2 s for server-confirmed onSnapshot echo to arrive, then re-enable foreign updates
        setTimeout(() => { isSavingRef.current = false; }, 2000);
      }
    }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [income, expenses, bills, debts, savingsItems, monthlySnapshots, itemBudgets, categoryLabelOverrides, customCategories, goals, advisorHistory, familyName, householdId, firebaseLoading]);
  // ── withSave helper — wraps any async Firebase operation with status indicator ──
  const withSave = async (operation) => {
    setSaveStatus('saving');
    try {
      await operation();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };
  // Generate a 6-char household code like "RF-4829"
  function generateHouseholdCode() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `RF-${num}`;
  }
  // Create a new household with code
  async function handleCreateHousehold() {
    setJoinLoading(true);
    try {
      const hId = 'household_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const code = generateHouseholdCode();
      if (db) {
        await setDoc(doc(db, 'households', hId), { code, createdAt: serverTimestamp() });
        await setDoc(doc(db, 'householdCodes', code), { householdId: hId });
      }
      localStorage.setItem('familyfinance_household_id', hId);
      localStorage.setItem('familyfinance_household_code', code);
      setHouseholdId(hId);
      setHouseholdCode(code);
      setJoinScreen(false);
      isInitialLoad.current = false;
    } catch (err) {
      console.error('Create household error:', err);
      setJoinError('Failed to create household. Please try again.');
    }
    setJoinLoading(false);
  }
  // Join existing household by code
  async function handleJoinHousehold() {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError('Please enter a household code'); return; }
    setJoinLoading(true);
    setJoinError('');
    try {
      if (!db) { setJoinError('Firebase not available'); setJoinLoading(false); return; }
      const codeDoc = await getDoc(doc(db, 'householdCodes', code));
      if (!codeDoc.exists()) { setJoinError('Invalid code. Check and try again.'); setJoinLoading(false); return; }
      const hId = codeDoc.data().householdId;
      // Verify household exists
      const hDoc = await getDoc(doc(db, 'households', hId));
      if (!hDoc.exists()) { setJoinError('Household not found.'); setJoinLoading(false); return; }
      // Check for PIN
      const hData = hDoc.data();
      if (hData.pinHash) {
        // PIN required — prompt for it
        const pin = prompt('This household requires a PIN. Enter 4-digit PIN:');
        if (!pin) { setJoinLoading(false); return; }
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(pin));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        if (hashHex !== hData.pinHash) { setJoinError('Incorrect PIN.'); setJoinLoading(false); return; }
      }
      localStorage.setItem('familyfinance_household_id', hId);
      localStorage.setItem('familyfinance_household_code', code);
      setHouseholdId(hId);
      setHouseholdCode(code);
      // Load data — snapshots first, then derive current month's income/expenses from them
      if (hData.monthlySnapshots) setMonthlySnapshots(hData.monthlySnapshots);
      const jCurSnap = hData.monthlySnapshots?.[viewMonthKeyRef.current];
      if (jCurSnap?.income?.length) setIncome(jCurSnap.income);
      else if (hData.income) setIncome(hData.income);
      if (jCurSnap?.expenses?.length) setExpenses(jCurSnap.expenses);
      else if (hData.expenses) setExpenses(hData.expenses);
      if (hData.bills) setBills(hData.bills);
      if (hData.debts) setDebts(hData.debts);
      if (hData.savingsItems) setSavingsItems(hData.savingsItems);
      if (hData.itemBudgets) setItemBudgets(hData.itemBudgets);
      if (hData.categoryLabelOverrides) setCategoryLabelOverrides(hData.categoryLabelOverrides);
      if (Array.isArray(hData.customCategories)) setCustomCategories(hData.customCategories);
      if (hData.goals) setGoals(hData.goals);
      if (hData.advisorHistory) setAdvisorHistory(hData.advisorHistory);
      if (hData.familyName) setFamilyName(hData.familyName);
      setJoinScreen(false);
      isInitialLoad.current = false;
    } catch (err) {
      console.error('Join household error:', err);
      setJoinError('Failed to join. Please try again.');
    }
    setJoinLoading(false);
  }
  // Reset household — generate new ID and code
  async function handleResetHousehold() {
    if (!confirm('This will disconnect you from the current household and create a new one. Continue?')) return;
    localStorage.removeItem('familyfinance_household_id');
    localStorage.removeItem('familyfinance_household_code');
    setHouseholdId(null);
    setHouseholdCode(null);
    setJoinScreen(true);
    setModal(null);
  }
  // Migration: backfill missing catIds in existing snapshots' expenseBudgets
  useEffect(() => {
    setMonthlySnapshots(prev => {
      let changed = false;
      const next = { ...prev };
      for (const mk of Object.keys(next)) {
        const eb = next[mk]?.expenseBudgets;
        if (!eb) continue;
        for (const c of CATEGORIES) {
          if (eb[c.id] === undefined) {
            if (!changed) { changed = true; }
            next[mk] = { ...next[mk], expenseBudgets: { ...eb, [c.id]: DEFAULT_EXPENSE_BUDGETS[c.id] ?? 0 } };
          }
        }
      }
      return changed ? next : prev;
    });
  }, []);
  // Sync live income/expenses into snapshots for the currently viewed month.
  // Guard: skip when prevMonthRef hasn't caught up to viewMonthKey yet (mid-transition).
  // During a month switch, the effect would fire with the OLD income/expenses but the NEW
  // viewMonthKey, writing stale data into the new month's slot. The month-switch effect
  // updates prevMonthRef.current synchronously after loading the new month, so by the time
  // income/expenses change (triggering this effect again), the guard passes correctly.
  useEffect(() => {
    if (prevMonthRef.current !== viewMonthKey) return;
    setMonthlySnapshots(prev => ({
      ...prev,
      [viewMonthKey]: { ...(prev[viewMonthKey] || { notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } }), income, expenses },
    }));
  }, [income, expenses, viewMonthKey]);
  // Month switch: save old month, load new month data
  useEffect(() => {
    const prevKey = prevMonthRef.current;
    if (prevKey === viewMonthKey) return;
    // Capture the OLD month's income/expenses NOW — before calling setIncome/setExpenses
    // below. If we read incomeRef.current inside the setMonthlySnapshots updater, the ref
    // will have been reassigned to the NEW month's values by the time the updater actually
    // runs (during the next render's useState processing), and we'd write the new month's
    // data into the old month's slot. This was the root cause of the data-erasure bug.
    const savedIncome = incomeRef.current;
    const savedExpenses = expensesRef.current;
    // Save current data to old month
    setMonthlySnapshots(prev => ({
      ...prev,
      [prevKey]: { ...(prev[prevKey] || { notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } }), income: savedIncome, expenses: savedExpenses },
    }));
    // Load new month data — use ref to get the truly-current snapshot (avoids stale closure)
    const snap = monthlySnapshotsRef.current[viewMonthKey];
    if (snap?.income?.length > 0 || snap?.expenses?.length > 0) {
      setIncome(snap.income || []);
      setExpenses(snap.expenses || []);
    } else {
      // Auto-populate: recurring income + fixed expenses from old month
      const newDate = `${viewMonthKey}-01`;
      const src = monthlySnapshotsRef.current[prevKey] || { income: incomeRef.current, expenses: expensesRef.current };
      const recInc = (src.income || []).filter(i => i.recurring).map((i, idx) => ({ ...i, id: Date.now() + idx, date: newDate }));
      const fixExp = (src.expenses || []).filter(e => e.fixed).map((e, idx) => ({ ...e, id: Date.now() + 500 + idx, date: newDate }));
      setIncome(recInc);
      setExpenses(fixExp);
    }
    prevMonthRef.current = viewMonthKey;
  }, [viewMonthKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Reset expense card pagination when viewing a different month
  useEffect(() => { setExpenseCardPage(0); }, [viewMonthKey]);
  // Reset 50/30/20 toggle when switching months — pre5020Budgets is month-scoped
  useEffect(() => {
    setToggle5020(false);
    pre5020Budgets.current = null;
    pre5020Savings.current = null;
  }, [viewMonthKey]); // eslint-disable-line react-hooks/exhaustive-deps
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
  useEffect(() => { if (tab === "insights") setActiveInsightKey(viewMonthKey); }, [tab, viewMonthKey]);
  useEffect(() => { setShowMonthPicker(false); }, [tab]);
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
      if (tabId) { navigateToTab(tabId); }
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
  // All insight months: only Jan–Dec 2026
  const allInsightMonths = Array.from({ length: 12 }, (_, i) => monthKey(2026, i));

  // ── Runtime-extensible category tables ──
  // Shadow the module-level SPENDING_PLAN_GROUPS / CATEGORIES / CAT_LABEL with
  // derived locals that merge user-added customCategories and apply any
  // categoryLabelOverrides. Placed here — before normaliseExpenseBudgets and
  // every other synchronous reference — to avoid TDZ errors.
  // eslint-disable-next-line no-shadow
  const SPENDING_PLAN_GROUPS = useMemo(
    () => [
      ...BASE_SPENDING_PLAN_GROUPS.map(g => ({ ...g, label: categoryLabelOverrides[g.catId] || g.label })),
      ...customCategories.map(c => ({ ...c, label: categoryLabelOverrides[c.catId] || c.label, templateItems: c.templateItems || [], custom: true })),
    ],
    [categoryLabelOverrides, customCategories]
  );
  // eslint-disable-next-line no-shadow
  const CATEGORIES = useMemo(
    () => [
      ...BASE_CATEGORIES.map(c => ({ ...c, label: categoryLabelOverrides[c.id] || c.label })),
      ...customCategories.map(c => ({ id: c.catId, label: categoryLabelOverrides[c.catId] || c.label })),
    ],
    [categoryLabelOverrides, customCategories]
  );
  // eslint-disable-next-line no-shadow
  const CAT_LABEL = useMemo(() => Object.fromEntries(CATEGORIES.map(c => [c.id, c.label])), [CATEGORIES]);
  const CATEGORY_ICONS = useMemo(() => ({
    Housing: "home", Food: "restaurant", Transport: "directions_car", Utilities: "bolt",
    Health: "medication", Entertainment: "movie", Personal: "person", Education: "school",
    Kids: "child_care", Savings: "savings", Subscriptions: "subscriptions", Travel: "flight", Other: "category",
    ...Object.fromEntries(customCategories.map(c => [c.catId, c.icon || "category"])),
  }), [customCategories]);
  const CATEGORY_ICON_BG = useMemo(() => ({
    Housing: "rgba(97,205,253,0.2)", Food: "rgba(192,232,255,0.3)", Transport: "rgba(186,191,255,0.3)",
    Utilities: "rgba(192,232,255,0.3)", Health: "rgba(186,191,255,0.3)", Entertainment: "rgba(186,191,255,0.3)",
    Personal: "rgba(186,191,255,0.3)", Education: "rgba(97,205,253,0.2)", Kids: "rgba(192,232,255,0.3)",
    Savings: "rgba(97,205,253,0.2)", Subscriptions: "rgba(186,191,255,0.3)", Travel: "rgba(186,191,255,0.3)",
    Other: COLORS.neutral,
    ...Object.fromEntries(customCategories.map(c => [c.catId, "rgba(186,191,255,0.3)"])),
  }), [customCategories]);
  const CATEGORY_ICON_COLOR = useMemo(() => ({
    Housing: COLORS.primary, Food: COLORS.secondary, Transport: COLORS.tertiary, Utilities: COLORS.secondary,
    Health: COLORS.tertiary, Entertainment: COLORS.tertiary, Personal: COLORS.tertiary, Education: COLORS.primary,
    Kids: COLORS.secondary, Savings: COLORS.primary, Subscriptions: COLORS.tertiary, Travel: COLORS.tertiary,
    Other: COLORS.subtext,
    ...Object.fromEntries(customCategories.map(c => [c.catId, COLORS.tertiary])),
  }), [customCategories]);

  // ── Normalise expense budgets (ensure all catIds present) ──
  const normaliseExpenseBudgets = (budgets) => {
    const result = { ...budgets };
    for (const cat of CATEGORIES) {
      if (result[cat.id] === undefined) result[cat.id] = DEFAULT_EXPENSE_BUDGETS[cat.id] ?? 0;
    }
    return result;
  };
  // Get snapshot for a key (fallback empty)
  const getSnap = (key) => { const s = monthlySnapshots[key] || { income: [], expenses: [], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } }; return { ...s, expenseBudgets: normaliseExpenseBudgets(s.expenseBudgets || DEFAULT_EXPENSE_BUDGETS) }; };
  // ── Bill helpers (per-month paid status) ──
  const getBillDueDate = (bill, mk) => { const day = String(bill.dayOfMonth).padStart(2, "0"); return `${mk}-${day}`; };
  const getBillPaid = (bill, mk) => !!(monthlySnapshots[mk]?.billStatus?.[bill.id]);
  const markBillPaid = (billId, mk, paid = true) => setMonthlySnapshots(prev => ({ ...prev, [mk]: { ...(prev[mk] || { income: [], expenses: [], notes: "", billStatus: {}, expenseBudgets: { ...DEFAULT_EXPENSE_BUDGETS } }), billStatus: { ...(prev[mk]?.billStatus || {}), [billId]: paid } } }));
  // ── Per-month expense budgets (Fix 9) ──
  const viewExpenseBudgets = normaliseExpenseBudgets(monthlySnapshots[viewMonthKey]?.expenseBudgets || DEFAULT_EXPENSE_BUDGETS);
  const setViewExpenseBudgets = (updater) => setMonthlySnapshots(prev => {
    const oldBudgets = prev[viewMonthKey]?.expenseBudgets || DEFAULT_EXPENSE_BUDGETS;
    const newBudgets = typeof updater === "function" ? updater(oldBudgets) : { ...updater };
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
  // ── Derived numbers (memoized — these feed every chart and re-running them on each keystroke is expensive) ──
  const totalIncome = useMemo(() => income.reduce((s, i) => s + i.amount, 0), [income]);
  const { totalExpenses, fixedExpenses, variableExpenses, needs, wants, savings, catTotals } = useMemo(() => {
    const te = expenses.reduce((s, e) => s + e.amount, 0);
    const fe = expenses.filter(e => e.fixed).reduce((s, e) => s + e.amount, 0);
    const n = expenses.filter(e => ["Housing","Utilities","Food","Transport","Health"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
    const w = expenses.filter(e => ["Entertainment","Personal","Kids","Education","Subscriptions","Travel"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
    const sv = expenses.filter(e => ["Other","Savings"].includes(e.category)).reduce((s, e) => s + e.amount, 0);
    const cats = {};
    CATEGORIES.forEach(c => { cats[c.id] = expenses.filter(e => e.category === c.id).reduce((s,e)=>s+e.amount,0); });
    return { totalExpenses: te, fixedExpenses: fe, variableExpenses: te - fe, needs: n, wants: w, savings: sv, catTotals: cats };
  }, [expenses]);
  const totalDebt = useMemo(() => debts.reduce((s, d) => s + d.balance, 0), [debts]);
  const debtPayments = useMemo(() => debts.reduce((s, d) => s + d.minPayment, 0), [debts]);
  const leftover = totalIncome - totalExpenses;
  const weeklyData = useMemo(() => CATEGORIES.map(c => ({ name: c.label, amount: catTotals[c.id] })).filter(c => c.amount > 0), [catTotals]);
  // ── Dashboard derived ──
  const billsBudgetTotal = bills.reduce((s, b) => s + b.budget, 0);
  const billsActualTotal = bills.reduce((s, b) => s + (getBillPaid(b, viewMonthKey) ? b.budget : 0), 0);
  // Fixed expenses not yet paid this month — reserved, don't spend
  const billsReservedTotal = bills.reduce((s, b) => s + (getBillPaid(b, viewMonthKey) ? 0 : b.budget), 0);
  const savingsExpectedTotal = savingsItems.reduce((s, i) => s + i.expected, 0);
  const savingsActualTotal = savingsItems.reduce((s, i) => s + i.actual, 0);
  const expenseBudgetTotal = Object.values(viewExpenseBudgets).reduce((s, v) => s + v, 0);
  const totalBudgeted = expenseBudgetTotal + billsBudgetTotal + savingsExpectedTotal;
  const totalSpent = totalExpenses + billsActualTotal + savingsActualTotal;
  const leftForBudgeting = totalIncome - totalBudgeted;
  const leftToSpend2 = totalBudgeted - totalSpent;
  const endingBalance = startingBalance + totalIncome - totalSpent;
  // ── showToast helper ──
  const showToast = useCallback((msg, icon = "✓") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastInfo({ msg, icon });
    toastTimer.current = setTimeout(() => setToastInfo(null), 2400);
  }, []);
  const cashFlowData = useMemo(() => [
    ...(showIncomeInCharts ? [{ name: "Income",   value: totalIncome,        color: CASH_FLOW_COLORS.Income   }] : []),
    { name: "Expenses", value: totalExpenses,     color: CASH_FLOW_COLORS.Expenses },
    { name: "Bills",    value: billsActualTotal,  color: CASH_FLOW_COLORS.Bills    },
    { name: "Debt",     value: debtPayments,      color: CASH_FLOW_COLORS.Debt     },
    { name: "Savings",  value: savingsActualTotal, color: CASH_FLOW_COLORS.Savings },
  ].filter(d => d.value > 0), [showIncomeInCharts, totalIncome, totalExpenses, billsActualTotal, debtPayments, savingsActualTotal]);
  const budgetVsActualData = useMemo(() => CATEGORIES.filter(c => (viewExpenseBudgets[c.id] || 0) > 0 || catTotals[c.id] > 0).map(c => ({
    name: c.label.slice(0, 5), Budget: viewExpenseBudgets[c.id] || 0, Actual: catTotals[c.id] || 0,
  })), [viewExpenseBudgets, catTotals]);
  const expBreakdownData = useMemo(() => CATEGORIES.filter(c => catTotals[c.id] > 0).map(c => ({
    name: c.label, value: catTotals[c.id], color: CAT_CHART_COLOR[c.id] ?? COLORS.primary,
  })), [catTotals]);
  const dailyExpenseData = useMemo(() => {
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
  }, [expenses, budgetStartDate, budgetEndDate, totalIncome]);
  const balanceOverviewData = useMemo(() => {
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
  }, [expenses, income, budgetStartDate, budgetEndDate, startingBalance]);
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
  // ── View-month derived values (income/expenses are now always month-scoped) ──
  const viewExpenses = expenses;
  const viewIncome = income;
  const viewTotalExpenses = viewExpenses.reduce((s, e) => s + e.amount, 0);
  const viewTotalIncome = viewIncome.reduce((s, i) => s + i.amount, 0);
  // Item-level budgets — needed early for effective per-category budgets
  const monthItemBudgetsGlobal = itemBudgets[viewMonthKey] || {};
  // Effective budget per category: sum ALL item-level budgets (fixed or variable), fall back to
  // category-level budget. The bills tracker (not the fixed flag) is the ZBB "Fixed Committed" source,
  // so the fixed flag on expense entries is only a plan-page display label, not a ZBB boundary.
  const catEffectiveBudgets = CATEGORIES.reduce((acc, c) => {
    const catItems = viewExpenses.filter(e => e.category === c.id);
    const itemSum = catItems.reduce((s, e) => s + (monthItemBudgetsGlobal[`exp-${e.id}`] || 0), 0);
    acc[c.id] = itemSum > 0 ? itemSum : (viewExpenseBudgets[c.id] || 0);
    return acc;
  }, {});
  // ── ZBB (Zero-Based Budget) calculations ──
  // Fixed commitments = bills tracker total (Q1→C)
  const fixedCommitmentsTotal = billsBudgetTotal;
  // Variable actuals = ALL expense entries per category (bills tracker handles fixed, not the fixed flag)
  const varCatActuals = CATEGORIES.reduce((acc, c) => ({
    ...acc,
    [c.id]: viewExpenses.filter(e => e.category === c.id).reduce((s, e) => s + e.amount, 0)
  }), {});
  const plannedVariableTotal = CATEGORIES.reduce((sum, c) => {
    return sum + Math.max(catEffectiveBudgets[c.id] || 0, varCatActuals[c.id] || 0);
  }, 0);
  // True Available (ZBB): targets $0. Positive = unassigned dollars. Negative = overcommitted.
  const cashAvailable = viewTotalIncome - viewTotalExpenses;
  const trueAvailable = viewTotalIncome - fixedCommitmentsTotal - plannedVariableTotal;
  const viewSpentPct = Math.round(pct(viewTotalExpenses, viewTotalIncome || 1));
  const viewCatTotals = CATEGORIES.reduce((acc, c) => ({ ...acc, [c.id]: viewExpenses.filter(e => e.category === c.id).reduce((s, e) => s + e.amount, 0) }), {});
  // Show every category on Overview (even with $0 spent / $0 planned) so users
  // can see the full spending plan at a glance. Sort: planned desc → spent desc.
  const viewCatExpenseCards = Object.entries(viewCatTotals).sort((a, b) => {
    const pA = catEffectiveBudgets[a[0]] || 0;
    const pB = catEffectiveBudgets[b[0]] || 0;
    if (pB !== pA) return pB - pA;
    return b[1] - a[1];
  });
  // ── Budget bar unified totals ──
  // Planned total: use item-level budgets when available, else category-level
  const budgetBarPlanned = SPENDING_PLAN_GROUPS.reduce((sum, group) => {
    const grpExp = viewExpenses.filter(e => e.category === group.catId);
    const grpItemsSum = grpExp.reduce((s, e) => s + (monthItemBudgetsGlobal[`exp-${e.id}`] || 0), 0);
    const grpCatBudget = viewExpenseBudgets[group.catId] ?? 0;
    return sum + (grpItemsSum > 0 ? grpItemsSum : grpCatBudget);
  }, 0) + billsBudgetTotal; // bills are always planned spending
  const budgetBarSpent = viewTotalExpenses + billsActualTotal; // paid bills count as spent
  const remainingToBudget = viewTotalIncome - budgetBarPlanned;
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
      showToast(`Updated ${newExp.label}`);
    } else {
      setExpenses(prev => [...prev, { ...newExp, id: Date.now(), amount: parseFloat(newExp.amount) }]);
      showToast(`Added ${newExp.label} (${fmt(parseFloat(newExp.amount))})`);
      if (newExp.fixed) {
        const dayNum = newExp.date ? (parseInt(newExp.date.split("-")[2]) || 1) : 1;
        const labelLow = newExp.label.toLowerCase().trim();
        setBills(prev => {
          const exists = prev.some(b => b.label.toLowerCase().trim() === labelLow);
          if (exists) return prev;
          setTimeout(() => showToast(`"${newExp.label}" added to Fixed Expenses`), 600);
          return [...prev, { id: Date.now() + 1, label: newExp.label, dayOfMonth: dayNum, budget: parseFloat(newExp.amount) || 0 }];
        });
      }
    }
    setNewExp({ label: "", amount: "", category: "Food", date: getDefaultDate(viewMonthKey), fixed: false });
    setModal(null);
  };
  const addIncome = () => {
    if (!newInc.label || !newInc.amount) return;
    setIncome(prev => [...prev, { ...newInc, id: Date.now(), amount: parseFloat(newInc.amount) }]);
    showToast(`Income added: +${fmt(parseFloat(newInc.amount))}`);
    setNewInc({ label: "", amount: "", date: getDefaultDate(viewMonthKey), recurring: false });
    setModal(null);
  };
  const addDebt = () => {
    if (!newDebt.label || !newDebt.balance) return;
    setDebts(prev => [...prev, { ...newDebt, id: Date.now(), balance: parseFloat(newDebt.balance), minPayment: parseFloat(newDebt.minPayment)||0, interest: parseFloat(newDebt.interest)||0 }]);
    showToast(`Debt "${newDebt.label}" added`);
    setNewDebt({ label: "", balance: "", minPayment: "", interest: "" });
    setModal(null);
  };
  const deleteExpenseFromView = (id) => { setExpenses(prev => prev.filter(x => x.id !== id)); showToast("Item removed", "✕"); };
  const deleteIncomeFromView = (id) => { setIncome(prev => prev.filter(x => x.id !== id)); showToast("Income removed", "✕"); };
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
          { type: "text", text: "Extract all expense line items from this receipt/bill. Return ONLY a JSON array like: [{\"label\":\"...\",\"amount\":0.00,\"category\":\"Food\",\"date\":\"YYYY-MM-DD\"}]. Guess category from: Housing,Food,Utilities,Transport,Health,Entertainment,Personal,Travel,Other. If date missing use today. No markdown, just JSON array." }
        ];
      } else if (isImage) {
        contentBlocks = [
          { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
          { type: "text", text: "Extract all expense line items from this receipt/bill image. Return ONLY a JSON array like: [{\"label\":\"...\",\"amount\":0.00,\"category\":\"Food\",\"date\":\"YYYY-MM-DD\"}]. Guess category from: Housing,Food,Utilities,Transport,Health,Entertainment,Personal,Travel,Other. If date missing use today. No markdown, just JSON array." }
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
      r.onload = () => {
        const bytes = new Uint8Array(r.result);
        let binary = "";
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        res(btoa(binary));
      };
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsArrayBuffer(file);
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
  const SplashStyles = () => (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Figtree:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background:
          radial-gradient(ellipse at 10% 10%, rgba(0,120,168,0.10) 0%, transparent 48%),
          radial-gradient(ellipse at 90% 85%, rgba(74,82,168,0.07) 0%, transparent 48%),
          radial-gradient(ellipse at 55% 45%, rgba(16,185,129,0.04) 0%, transparent 55%),
          #f0f4f7;
        background-attachment: fixed;
      }
      @keyframes spin { to { transform: rotate(360deg) } }
      @keyframes beam-pulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
    `}</style>
  );

  /* ── Feature chips shown below the hero card ───────────────────────── */
  const heroFeatures = [
    { icon: "📊", label: "Budget breakdown" },
    { icon: "🤖", label: "AI advisor" },
    { icon: "📅", label: "Bill tracker" },
    { icon: "📈", label: "12-month history" },
  ];

  if (joinScreen) {
    return (
      <div style={{ minHeight: "100vh", fontFamily: "'Figtree', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px 40px" }}>
        <SplashStyles />

        {/* ── Wordmark ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 48, display: "flex", alignItems: "center", gap: 12 }}
        >
          {/* App icon — squircle with specular */}
          <div style={{
            width: 52, height: 52, borderRadius: 18,
            background: `linear-gradient(145deg, #0095d2 0%, ${COLORS.primary} 45%, ${COLORS.tertiary} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 28px rgba(0,120,168,0.38), inset 0 1px 0 rgba(255,255,255,0.30)",
            position: "relative", overflow: "hidden",
          }}>
            <span style={{ fontSize: 20, fontWeight: FW.black, color: "#fff", fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.03em", zIndex: 1 }}>FF</span>
            {/* specular sheen */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "52%", background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)", borderRadius: "18px 18px 0 0" }} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: FW.extrabold, color: COLORS.text, fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.03em", lineHeight: 1.1 }}>FamilyFinance</div>
            <div style={{ fontSize: 11, fontWeight: FW.semibold, color: COLORS.muted, letterSpacing: "0.04em", textTransform: "uppercase" }}>by the Roberts family</div>
          </div>
        </motion.div>

        {/* ── Hero heading ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: "center", marginBottom: 40, maxWidth: 520 }}
        >
          <h1 style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: "clamp(36px, 7vw, 58px)",
            fontWeight: FW.extrabold,
            color: COLORS.text,
            letterSpacing: "-0.04em",
            lineHeight: 1.08,
            marginBottom: 16,
          }}>
            Your family's money,{" "}
            <span style={{ color: COLORS.primary }}>together.</span>
          </h1>
          <p style={{ fontSize: 17, color: COLORS.subtext, lineHeight: 1.6, fontWeight: FW.normal }}>
            One shared budget. Real-time spend tracking, smart AI insights,
            and a clear picture every single month.
          </p>
        </motion.div>

        {/* ── Glass action card ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: "100%", maxWidth: 420,
            position: "relative",
            background: "rgba(255,255,255,0.78)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.92)",
            borderRadius: 32,
            padding: "32px 28px 28px",
            boxShadow: "0 12px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)",
            overflow: "hidden",
          }}
        >
          {/* BorderBeam shimmer on the card edge */}
          <BorderBeam
            size={260}
            duration={10}
            colorFrom={COLORS.primary}
            colorTo={COLORS.tertiary}
            borderWidth={1.5}
          />

          {/* Create CTA */}
          <button
            onClick={handleCreateHousehold}
            disabled={joinLoading}
            style={{
              width: "100%", padding: "17px 20px",
              fontSize: 16, fontWeight: FW.bold,
              background: `linear-gradient(140deg, ${COLORS.primary} 0%, #0095d2 60%, ${COLORS.tertiary} 140%)`,
              color: "#fff", border: "none", borderRadius: 18,
              cursor: joinLoading ? "wait" : "pointer",
              marginBottom: 22,
              opacity: joinLoading ? 0.65 : 1,
              boxShadow: `0 10px 28px rgba(0,120,168,0.38), inset 0 1px 0 rgba(255,255,255,0.20)`,
              fontFamily: "'Figtree', sans-serif",
              letterSpacing: "-0.01em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>🏠</span>
            <span>{joinLoading ? "Setting up…" : "Start a New Household"}</span>
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
            <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: FW.semibold, letterSpacing: "0.05em", textTransform: "uppercase" }}>or join existing</span>
            <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
          </div>

          {/* Join code input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              placeholder="e.g. RF-4829"
              maxLength={7}
              onKeyDown={e => { if (e.key === 'Enter') handleJoinHousehold(); }}
              style={{
                flex: 1, padding: "14px 16px",
                fontSize: 16, fontWeight: FW.semibold,
                letterSpacing: "0.10em",
                background: "rgba(0,120,168,0.06)",
                border: "1.5px solid rgba(0,120,168,0.14)",
                borderRadius: 14,
                color: COLORS.text,
                textAlign: "center",
                fontFamily: "'Figtree', sans-serif",
                outline: "none",
                transition: "border-color 0.18s ease, box-shadow 0.18s ease",
              }}
              onFocus={e => { e.target.style.borderColor = "rgba(0,120,168,0.38)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,120,168,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(0,120,168,0.14)"; e.target.style.boxShadow = "none"; }}
            />
            <button
              onClick={handleJoinHousehold}
              disabled={joinLoading || !joinCode.trim()}
              style={{
                padding: "14px 22px",
                fontSize: 15, fontWeight: FW.bold,
                background: joinCode.trim() ? COLORS.primary : "rgba(0,120,168,0.35)",
                color: "#fff", border: "none", borderRadius: 14,
                cursor: (joinLoading || !joinCode.trim()) ? "not-allowed" : "pointer",
                fontFamily: "'Figtree', sans-serif",
                transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                whiteSpace: "nowrap",
              }}
            >
              Join →
            </button>
          </div>

          {joinError && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 13, color: COLORS.danger, fontWeight: FW.semibold, marginTop: 6, textAlign: "center" }}
            >
              {joinError}
            </motion.p>
          )}
        </motion.div>

        {/* ── Feature chips ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}
        >
          {heroFeatures.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px",
                background: "rgba(255,255,255,0.62)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid var(--c-glass-border)",
                borderRadius: 999,
                fontSize: 12, fontWeight: FW.semibold,
                color: COLORS.subtext,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <span style={{ fontSize: 14 }}>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </motion.div>
      </div>
    );
  }

  if (firebaseLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Figtree', sans-serif" }}>
        <SplashStyles />
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 24,
            background: `linear-gradient(145deg, #0095d2 0%, ${COLORS.primary} 45%, ${COLORS.tertiary} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 24,
            boxShadow: `0 14px 40px rgba(0,120,168,0.38)`,
            position: "relative", overflow: "hidden",
          }}>
            <span style={{ fontSize: 26, fontWeight: FW.black, color: "#fff", fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.03em", zIndex: 1 }}>FF</span>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 100%)", borderRadius: "24px 24px 0 0" }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: FW.extrabold, color: COLORS.text, marginBottom: 24, fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.03em" }}>FamilyFinance</h2>
          <div style={{ width: 28, height: 28, border: `2.5px solid rgba(0,120,168,0.15)`, borderTopColor: COLORS.primary, borderRadius: "50%", animation: "spin 0.85s linear infinite", marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: COLORS.muted, fontWeight: FW.medium }}>Loading your budget…</p>
        </motion.div>
      </div>
    );
  }
  return (
    <div className="app-layout" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "transparent", color: COLORS.text, fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body {
          background: var(--c-bg);
          color: var(--c-text);
          font-family: 'Manrope', sans-serif;
        }
        html.dark input::placeholder, html.dark textarea::placeholder { color: #6e7884; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,120,168,0.18); border-radius: 99px; }
        input, select, textarea { outline: none; font-family: 'Figtree', sans-serif; }
        input::placeholder, textarea::placeholder { color: #94a3b0; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; font-family: 'Material Symbols Outlined'; }

        /* Glass surfaces */
        .glass {
          background: rgba(255,255,255,0.68);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid var(--c-glass-strong);
          box-shadow: 0 4px 24px var(--c-border), inset 0 1px 0 var(--c-glass-inset);
        }
        .glass-strong {
          background: var(--c-glass-border);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid var(--c-glass-border-strong);
          box-shadow: 0 8px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1);
        }
        .glass-tinted {
          background: rgba(0,120,168,0.07);
          backdrop-filter: blur(20px) saturate(160%);
          -webkit-backdrop-filter: blur(20px) saturate(160%);
          border: 1px solid rgba(0,120,168,0.12);
        }

        /* Nav */
        .nav-item:hover { background: rgba(0,120,168,0.07) !important; opacity: 1 !important; color: ${COLORS.primary} !important; }
        .nav-item.active { background: rgba(0,120,168,0.12) !important; }

        /* Cards */
        .exp-card:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,0.10) !important; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important; }
        .glass-card { transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease; }
        .glass-card:hover { transform: translateY(-2px); box-shadow: 0 20px 48px rgba(0,0,0,0.10) !important; }

        /* Buttons */
        button { transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
        button:hover { opacity: 0.88; }
        button:active { transform: scale(0.97) !important; }

        /* Typography */
        :root {
          /* Apple-native numeric font stack: SF Pro Rounded on macOS/iOS, graceful fallbacks elsewhere.
             Uses tabular numerals and "ss01" (SF's alternate 6/9) for a crisp, financial feel. */
          --font-num: -apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", "SF Pro Text", ui-rounded, system-ui, "Helvetica Neue", "Segoe UI", sans-serif;
        }
        .kpi-num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum", "ss01", "cv11"; letter-spacing: -0.03em; }
        .num-ios { font-family: var(--font-num); font-variant-numeric: tabular-nums; font-feature-settings: "tnum", "ss01"; letter-spacing: -0.02em; }
        h1, h2, h3, h4 { letter-spacing: -0.025em; }

        /* Keyframes */
        @keyframes toastSlideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.96); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes typing-dot { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); } 40% { opacity: 1; transform: scale(1); } }
        @keyframes pop-in { 0% { transform: scale(0.7); opacity: 0; } 80% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }

        /* Focus accessibility — never remove focus without a visible replacement */
        :focus-visible { outline: 2px solid rgba(0,120,168,0.65); outline-offset: 2px; border-radius: 8px; }
        button:focus-visible { outline: 2px solid rgba(0,120,168,0.65); outline-offset: 2px; }
        input:focus, select:focus, textarea:focus { box-shadow: 0 0 0 3px rgba(0,120,168,0.18) !important; border-color: rgba(0,120,168,0.35) !important; }

        /* Reduced motion — respect user preference */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
        }

        /* ── View Transitions — tab swaps morph natively ── */
        /* Disable default root cross-fade so we can choreograph specific elements */
        ::view-transition-old(root), ::view-transition-new(root) {
          animation-duration: 420ms;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }
        /* Main content: soft fade + gentle upward glide */
        @keyframes vt-fade-slide-out {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-6px) scale(0.995); filter: blur(2px); }
        }
        @keyframes vt-fade-slide-in {
          0% { opacity: 0; transform: translateY(12px) scale(0.995); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        /* page-main slide/fade fires ONLY during tab swaps.
           For other transitions (e.g. bill morph) the class is absent and
           the browser applies its trivial default — since the page doesn't
           actually change, nothing is visible. */
        html.vt-tab-swap::view-transition-old(page-main) {
          animation: vt-fade-slide-out 280ms cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        html.vt-tab-swap::view-transition-new(page-main) {
          animation: vt-fade-slide-in 460ms cubic-bezier(0.16, 1, 0.3, 1) 60ms backwards;
        }
        /* Outside tab-swap, silence page-main entirely — it's not actually changing. */
        html:not(.vt-tab-swap)::view-transition-old(page-main),
        html:not(.vt-tab-swap)::view-transition-new(page-main) {
          animation: none !important;
        }
        /* The active sidebar pill morphs between nav items — spring-like */
        ::view-transition-group(active-nav-pill) {
          animation-duration: 520ms;
          animation-timing-function: cubic-bezier(0.34, 1.35, 0.64, 1);
        }
        ::view-transition-old(active-nav-pill),
        ::view-transition-new(active-nav-pill) {
          animation-duration: 240ms;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        /* Mobile bottom-nav pill */
        ::view-transition-group(active-mobile-pill) {
          animation-duration: 420ms;
          animation-timing-function: cubic-bezier(0.34, 1.35, 0.64, 1);
        }
        ::view-transition-old(active-mobile-pill),
        ::view-transition-new(active-mobile-pill) {
          animation-duration: 200ms;
        }
        /* Bill card morph — shared name "bill-active" so we can target one ease
           globally. Spring-like cubic-bezier gives a natural lift+settle feel. */
        ::view-transition-group(bill-active) {
          animation-duration: 520ms;
          animation-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
        }
        ::view-transition-old(bill-active) {
          animation: vt-bill-old 180ms cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        ::view-transition-new(bill-active) {
          animation: vt-bill-new 320ms cubic-bezier(0.16, 1, 0.3, 1) 120ms backwards;
        }
        @keyframes vt-bill-old {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes vt-bill-new {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        /* ── Category expand/collapse morph ── */
        /* When a category row toggles, we wrap the state change in a
           startViewTransition() and add html.vt-cat-expand. Rules below
           give the row a short, springy cross-fade — no layout leak
           to other rows because the default ::view-transition-old/new
           on root is short and eased. */
        html.vt-cat-expand::view-transition-old(root),
        html.vt-cat-expand::view-transition-new(root) {
          animation-duration: 280ms;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        }

        /* ── Header: shadow + intensified blur as user scrolls ── */
        header.app-header {
          transition: box-shadow 220ms ease, border-color 220ms ease, backdrop-filter 220ms ease, -webkit-backdrop-filter 220ms ease;
        }
        header.app-header[data-scrolled="true"] {
          backdrop-filter: blur(48px) saturate(220%) !important;
          -webkit-backdrop-filter: blur(48px) saturate(220%) !important;
          box-shadow: 0 1px 0 var(--c-border), 0 20px 48px rgba(0,0,0,0.10) !important;
          border-bottom-color: var(--c-glass-border-strong) !important;
        }

        /* ── Category expand: animate chevron smoothly ── */
        .budget-cat-group .expand-chevron {
          transition: transform 290ms cubic-bezier(0.22,1,0.36,1);
        }

        /* ── Savings goal cards — slide up when they mount ── */
        .savings-goal-card {
          animation: sav-card-in 380ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes sav-card-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Stagger per position in the grid */
        .savings-goal-group > div > .savings-goal-card:nth-child(2) { animation-delay: 60ms; }
        .savings-goal-group > div > .savings-goal-card:nth-child(3) { animation-delay: 120ms; }
        .savings-goal-group > div > .savings-goal-card:nth-child(4) { animation-delay: 180ms; }
        .savings-goal-card:hover { transform: translateY(-2px) !important; box-shadow: 0 16px 48px rgba(74,82,168,0.20) !important; }

        /* ── Morph artifact cleanup — stale view-transition-names ── */
        /* Prevent page-main pseudo from lingering after non-tab transitions */
        ::view-transition-old(page-main):only-child,
        ::view-transition-new(page-main):only-child {
          animation: none !important;
        }
        /* Ensure no orphaned transition-name escapes the layout layer */
        ::view-transition-group(*) { mix-blend-mode: normal; }

        /* ── SF Pro Rounded: all bold numbers ── */
        .kpi-num, .num-ios {
          font-family: var(--font-num);
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum", "ss01", "cv11";
          letter-spacing: -0.025em;
        }

        /* ── Horizontal scroll containers — iOS-grade momentum + snap ── */
        .overview-hscroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
        }
        .overview-hscroll::-webkit-scrollbar { display: none; }
        .overview-hscroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* ── prefers-reduced-motion: disable all animations/transitions ── */
        @media (prefers-reduced-motion: reduce) {
          .savings-goal-card { animation: none !important; }
          .budget-cat-group .expand-chevron { transition: none !important; }
          header.app-header { transition: none !important; }
        }

        /* Insights metrics band — 4 cols on desktop */
        .metric-band-grid { grid-template-columns: repeat(4, 1fr); }

        /* Scroll */
        .cat-scroll { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; padding-bottom: 8px; }
        .cat-scroll::-webkit-scrollbar { display: none; }
        .cat-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* Family Budget — group + empty-row + add-btn interactions */
        .budget-cat-group > .budget-row:hover { background: var(--c-glass-strong) !important; }
        .budget-cat-group .cat-add-btn { opacity: 0; }
        .budget-cat-group:hover .cat-add-btn { opacity: 1; }
        .budget-cat-group .cat-add-btn:hover { border-color: rgba(0,120,168,0.5) !important; color: #0078a8 !important; }
        .budget-cat-group:hover .cat-rename-btn { opacity: 0.8 !important; }
        .budget-cat-group .cat-rename-btn:hover { opacity: 1 !important; color: var(--c-primary) !important; }
        @media (hover: none) {
          .budget-cat-group .cat-add-btn { opacity: 1; }
        }

        /* Main scroll container — iOS/macOS-grade smoothness.
           - momentum scrolling on touch (iOS)
           - no rubber-band bleeding to body
           - reserved gutter prevents layout shift when scrollbar appears/disappears on tab swap
           - thin, auto-hiding scrollbar
           - opt into CSS scroll-behavior for anchor jumps (browsers already handle pointer wheel natively) */
        html { scroll-behavior: smooth; }
        .main-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scrollbar-gutter: stable;
          scroll-padding-top: 16px;
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 120, 140, 0.28) transparent;
        }
        .main-scroll::-webkit-scrollbar { width: 10px; }
        .main-scroll::-webkit-scrollbar-track { background: transparent; }
        .main-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 120, 140, 0.22);
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
          transition: background 0.2s ease;
        }
        .main-scroll:hover::-webkit-scrollbar-thumb { background: rgba(100, 120, 140, 0.38); background-clip: padding-box; }
        .main-scroll::-webkit-scrollbar-thumb:active { background: rgba(100, 120, 140, 0.55); background-clip: padding-box; }
        html.dark .main-scroll { scrollbar-color: rgba(200, 215, 230, 0.22) transparent; }
        html.dark .main-scroll::-webkit-scrollbar-thumb { background: rgba(200, 215, 230, 0.18); background-clip: padding-box; }
        html.dark .main-scroll:hover::-webkit-scrollbar-thumb { background: rgba(200, 215, 230, 0.32); background-clip: padding-box; }

        /* Plan table — desktop grid columns */
        .sticky-col-header, .plan-cat-header, .budget-row { grid-template-columns: 2.2fr 1fr 0.8fr 0.9fr 0.9fr 0.9fr 32px; }
        /* Year at a Glance — 4-col desktop */
        .year-glance-grid { grid-template-columns: repeat(4, 1fr); }
        /* Plan hero stats strip — 3-col desktop */
        .plan-stats-strip { grid-template-columns: repeat(3, 1fr); }

        /* Mobile responsive — stack layout for iPhone/iPad */
        @media (max-width: 767px) {
          .app-layout { flex-direction: column !important; }
          .app-sidebar { display: none !important; }
          .app-main { min-height: 100dvh; }
          main { padding: 16px !important; }
          /* Compact header: single bar with no overflow */
          .app-header { padding: 0 !important; }
          .app-header > div:first-child { padding: 0 12px !important; height: 48px !important; gap: 8px !important; }
          /* Hide top tab bar and desktop Add button on mobile */
          .header-tab-nav { display: none !important; }
          .header-add-btn { display: none !important; }
          .header-search { display: none !important; }
          .home-stats-strip { grid-template-columns: repeat(2, 1fr) !important; }
          .home-two-col { grid-template-columns: 1fr !important; }
          /* Fixed tab hero: stack ring above stats */
          .bill-hero-card { grid-template-columns: 1fr !important; gap: 16px !important; padding: 20px !important; justify-items: center; }
          .bill-hero-card > div:last-child { grid-template-columns: repeat(3, 1fr) !important; width: 100%; gap: 10px !important; }
          /* Fixed tab: hide calendar toggle, only show list view on mobile */
          .cal-view-toggle { display: none !important; }
          .cal-month-view { display: none !important; }
          /* Compact "Add Fixed Expense" button on mobile — icon + short text */
          .add-fixed-btn { padding: 8px 12px !important; font-size: 12px !important; border-radius: 9px !important; }
          .add-fixed-label { display: none !important; }
          .mobile-nav {
            display: flex !important;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
            background: var(--c-surface);
            border-top: 1px solid var(--c-border);
            padding: 8px 4px calc(8px + env(safe-area-inset-bottom));
            gap: 0;
            box-shadow: 0 -1px 0 var(--c-border);
          }
          .mobile-nav-item {
            flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
            padding: 4px 2px; border: none; background: transparent; cursor: pointer;
            font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 500;
            color: var(--s-tab-idle, var(--c-muted));
            border-radius: 10px; transition: color 0.18s ease;
            letter-spacing: 0.01em;
          }
          .mobile-nav-item.active { color: var(--c-primary); font-weight: 600; }
          .mobile-nav-item .material-symbols-outlined { font-size: 20px; }
          main { padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important; }
          .mobile-fab { display: flex !important; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
          .bento-grid > * { grid-column: span 1 !important; min-width: 0; }
          .comparison-strip { flex-wrap: wrap !important; }
          .comparison-strip > * { flex: 1 1 calc(33% - 8px) !important; min-width: 100px; }

          /* Insights: 2x2 metrics band on mobile */
          .metric-band-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px 10px !important;
          }
          .metric-band-grid > div {
            padding-right: 0 !important;
            margin-right: 0 !important;
            border-right: none !important;
          }

          /* Family Budget — peer sections stack on mobile */
          .budget-peer-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }
          .budget-table-card {
            padding: 16px !important;
            overflow-x: hidden !important;
          }
          /* Plan table: 3-col layout on mobile (Item | Actual | Left | ×) */
          .sticky-col-header, .plan-cat-header, .budget-row {
            grid-template-columns: 2fr 1fr 1fr 32px !important;
            min-width: unset !important;
          }
          .plan-col-hide { display: none !important; }

          /* Plan hero card — compact padding */
          .plan-hero-card { padding: 20px 16px !important; }
          .plan-stat-val { font-size: 15px !important; }
          .plan-stats-cell { padding-right: 10px !important; margin-right: 10px !important; }

          /* Year at a Glance — 2×2 on mobile */
          .year-glance-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px 12px !important;
          }
          .year-glance-cell { padding-right: 0 !important; margin-right: 0 !important; border-right: none !important; }
          .year-glance-val { font-size: 17px !important; }

          /* Copy link — icon only on mobile */
          .bill-copy-label { display: none !important; }

          /* Plan table — compact category header on mobile */
          .plan-cat-item-cell { min-width: 0; overflow: hidden; }
          /* Hide count badge and rename/delete buttons — icon identifies the category */
          .plan-cat-count { display: none !important; }
          .plan-cat-item-cell .cat-rename-btn { display: none !important; }
          /* Label fills remaining space and truncates with ellipsis */
          .plan-cat-label { flex: 1 1 0; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

          /* Monthly Insights — single column chart rows */
          .insights-two-col {
            grid-template-columns: 1fr !important;
          }

          /* Overview bento cards — reduce padding on mobile */
          .bill-due-card {
            padding: 16px !important;
            min-height: auto !important;
          }
          .cashflow-summary-card {
            padding: 20px 16px !important;
            min-height: 260px !important;
          }
          .savings-goal-card,
          .savings-invest-card {
            padding: 20px !important;
          }

          /* Bill Calendar — tighter card + smaller cells on mobile */
          .bill-cal-card {
            padding: 12px !important;
          }
          .cal-day-cell {
            min-height: 56px !important;
            padding: 4px !important;
          }
          .cal-scroll-wrap {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }

          /* Bills summary stat boxes — compact on mobile */
          .bills-stat-grid {
            gap: 8px !important;
          }
          .bills-stat-grid > div {
            padding: 12px 10px !important;
            gap: 8px !important;
          }
          .bills-stat-grid > div > div:first-child {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
          }
        }
        @media (min-width: 768px) {
          .mobile-nav { display: none !important; }
          .mobile-fab { display: none !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .app-sidebar { width: 72px !important; }
          .sidebar-label { display: none !important; }
          .sidebar-family-name { display: none !important; }
          header { padding: 16px 20px 14px !important; }
          main { padding: 20px 20px !important; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── SIDEBAR — hidden, replaced by top-nav ── */}
      <aside className="app-sidebar" style={{ display: "none" }}>
        {/* Family branding */}
        <div style={{ padding: sidebarCollapsed ? "22px 0 18px" : "28px 20px 32px", display: "flex", justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 18, background: `linear-gradient(140deg, ${COLORS.primary} 0%, #0095d2 50%, ${COLORS.tertiary} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: FW.extrabold, color: "#fff", flexShrink: 0, boxShadow: `0 6px 20px rgba(0,120,168,0.35), inset 0 1px 0 rgba(255,255,255,0.25)`, fontFamily: "'Manrope', sans-serif", letterSpacing: "-0.01em" }}>
              {familyName.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            {!sidebarCollapsed && <div className="sidebar-family-name"><h1 style={{ fontSize: 17, fontWeight: FW.extrabold, color: COLORS.text, letterSpacing: "-0.03em", lineHeight: 1.15, whiteSpace: "nowrap", fontFamily: "'Manrope', sans-serif" }}>{familyName}</h1>
              {saveStatus ? (
                <span style={{ fontSize: 11, fontWeight: FW.semibold, color: saveStatus === 'saving' ? COLORS.muted : saveStatus === 'saved' ? COLORS.success : COLORS.danger }}>
                  {saveStatus === 'saving' ? '⟳ Saving…' : saveStatus === 'saved' ? '✓ Saved' : '⚠ Not saved'}
                </span>
              ) : <span style={{ fontSize: 11, color: COLORS.muted }}>Family Finance</span>}
            </div>}
          </div>
        </div>
        {/* Nav */}
        <nav style={{ flex: 1, padding: sidebarCollapsed ? "0 10px" : "0 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { id: "dashboard",    label: "Overview",        icon: "dashboard" },
            { id: "transactions", label: "Plan",             icon: "payments" },
            { id: "weekly",       label: "Fixed",           icon: "calendar_month" },
            { id: "insights",     label: "Monthly Insights",icon: "bar_chart" },
            { id: "advisor",      label: "Advisor",         icon: "auto_awesome" },
          ].map(item => (
            <button key={item.id} className={`nav-item${tab === item.id ? " active" : ""}`} onClick={() => navigateToTab(item.id)} title={sidebarCollapsed ? item.label : undefined} style={{
              display: "flex", alignItems: "center", justifyContent: sidebarCollapsed ? "center" : "flex-start", gap: 11, padding: sidebarCollapsed ? "12px 0" : "11px 14px",
              background: tab === item.id ? `linear-gradient(135deg, rgba(0,120,168,0.13), rgba(74,82,168,0.08))` : "transparent",
              border: "none", borderRadius: 14,
              color: tab === item.id ? COLORS.primary : COLORS.subtext,
              fontSize: 14, fontWeight: tab === item.id ? FW.semibold : FW.medium,
              cursor: "pointer", textAlign: "left", width: "100%",
              transition: "all 0.2s ease",
              viewTransitionName: tab === item.id ? "active-nav-pill" : undefined,
              position: "relative",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 21, color: "inherit", flexShrink: 0, fontVariationSettings: tab === item.id ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 300" }}>{item.icon}</span>
              <span className="sidebar-label">{!sidebarCollapsed && item.label}</span>
            </button>
          ))}
        </nav>
        {/* Collapse toggle */}
        <div style={{ padding: sidebarCollapsed ? "8px 0" : "8px 10px", display: "flex", justifyContent: sidebarCollapsed ? "center" : "flex-end" }}>
          <button onClick={() => setSidebarCollapsed(p => !p)} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} style={{ background: "rgba(0,0,0,0.04)", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 10, color: COLORS.muted, display: "flex", alignItems: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{sidebarCollapsed ? "chevron_right" : "chevron_left"}</span>
          </button>
        </div>
        {/* Add Transaction CTA */}
        <div style={{ padding: sidebarCollapsed ? "10px 10px 28px" : "8px 12px 28px" }}>
          <button onClick={() => setModal("addMenu")} title={sidebarCollapsed ? "Add Transaction" : undefined} style={{
            width: "100%",
            background: `linear-gradient(140deg, ${COLORS.primary} 0%, #0095d2 50%, #0069a0 100%)`,
            border: "none", borderRadius: 16, color: "#fff", fontSize: 14, fontWeight: FW.semibold,
            padding: sidebarCollapsed ? "15px 0" : "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: sidebarCollapsed ? 0 : 8,
            boxShadow: `0 8px 24px rgba(0,120,168,0.40), inset 0 1px 0 rgba(255,255,255,0.2)`,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            {!sidebarCollapsed && <span className="sidebar-label">Add Transaction</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN COLUMN ── */}
      <div className="app-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* ── STUDIO TOP NAV ── */}
        <header className="app-header" style={{ background: "var(--s-nav-bg, var(--c-surface))", borderBottom: "1px solid var(--s-nav-border, var(--c-border))", flexShrink: 0, position: "relative", zIndex: 1000 }}>
          {/* Top bar row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 52 }}>
            {/* Wordmark */}
            <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, letterSpacing: "-0.02em" }}>{familyName}</span>
            {/* Month picker */}
            <div style={{ position: "relative", zIndex: 300 }}>
              {showMonthPicker && <div onClick={() => setShowMonthPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 999 }} />}
              <button onClick={() => setShowMonthPicker(p => !p)} style={{ display: "flex", alignItems: "center", gap: 6, background: "oklch(0% 0 0 / 0.04)", border: "none", borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: 400, color: COLORS.subtext, cursor: "pointer", fontFamily: "'Manrope', sans-serif" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                {(() => { const { month0, year } = parseKey(viewMonthKey); return `${MONTH_FULL[month0]} ${year}`; })()}
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
              </button>
              {showMonthPicker && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 14, boxShadow: "0 8px 32px oklch(0% 0 0 / 0.12)", zIndex: 1001, padding: 8, minWidth: 200, maxHeight: 300, overflowY: "auto" }}>
                  {(() => {
                    const endDate = new Date(2026, 11, 1);
                    const allMonths = [];
                    let cur = new Date(2026, 0, 1);
                    while (cur <= endDate) { allMonths.push(monthKey(cur.getFullYear(), cur.getMonth())); cur.setMonth(cur.getMonth() + 1); }
                    return allMonths.map(key => {
                      const { month0, year } = parseKey(key);
                      const isView = key === viewMonthKey;
                      const isCurrent = key === todayKey;
                      const snap = monthlySnapshots[key];
                      const hasData = snap && (snap.income.length > 0 || snap.expenses.length > 0);
                      return (
                        <button key={key} onClick={() => { setViewMonthKey(key); setShowMonthPicker(false); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 12px", border: "none", borderRadius: 8, background: isView ? "var(--c-primary-fill-bg)" : "transparent", color: isView ? COLORS.primary : COLORS.text, fontWeight: isView ? 500 : 400, fontSize: 13, cursor: "pointer", fontFamily: "'Manrope', sans-serif" }}>
                          <span>{MONTH_FULL[month0]} {year}{isCurrent ? " ·" : ""}</span>
                          {hasData && <div style={{ width: 5, height: 5, borderRadius: "50%", background: COLORS.primary, flexShrink: 0 }} />}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            {/* Right icons */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {saveStatus && <span style={{ fontSize: 11, color: saveStatus === 'saving' ? COLORS.muted : saveStatus === 'saved' ? COLORS.success : COLORS.danger, fontWeight: 500 }}>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Not saved'}</span>}
              <button onClick={() => setModal("notifications")} aria-label="Notifications" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", position: "relative" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.subtext, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>notifications</span>
                {billsDueIn7Days > 0 && <span style={{ position: "absolute", top: 3, right: 3, width: 8, height: 8, borderRadius: "50%", background: COLORS.danger, border: "1.5px solid var(--c-surface)" }} />}
              </button>
              <button className="header-add-btn" onClick={() => setModal("addMenu")} aria-label="Add transaction" style={{ background: COLORS.primary, border: "none", cursor: "pointer", padding: "6px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 12, fontWeight: 500, fontFamily: "'Manrope', sans-serif" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                Add
              </button>
              <button onClick={() => setModal("settings")} aria-label="Settings" style={{ background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.subtext, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>settings</span>
              </button>
            </div>
          </div>
          {/* Tab nav row */}
          <nav className="header-tab-nav" style={{ display: "flex", padding: "0 28px", borderTop: "1px solid var(--s-nav-border, var(--c-border))" }}>
            {[
              { id: "dashboard",    label: "Home"     },
              { id: "transactions", label: "Plan"     },
              { id: "weekly",       label: "Fixed"    },
              { id: "insights",     label: "Insights" },
              { id: "advisor",      label: "Advisor"  },
            ].map(item => (
              <button key={item.id} onClick={() => navigateToTab(item.id)} style={{ padding: "11px 16px", background: "transparent", border: "none", fontSize: 13, fontWeight: tab === item.id ? 500 : 400, color: tab === item.id ? COLORS.text : "var(--s-tab-idle, var(--c-muted))", cursor: "pointer", position: "relative", fontFamily: "'Manrope', sans-serif", letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
                {item.label}
                {tab === item.id && <span style={{ position: "absolute", bottom: 0, left: 16, right: 16, height: 2, background: COLORS.primary, borderRadius: "2px 2px 0 0" }} />}
              </button>
            ))}
          </nav>
        </header>

        {/* MOBILE BOTTOM NAV */}
        <nav className="mobile-nav">
          {[
            { id: "dashboard",    label: "Home",     icon: "home" },
            { id: "transactions", label: "Plan",     icon: "receipt_long" },
            { id: "weekly",       label: "Fixed",    icon: "event_available" },
            { id: "insights",     label: "Insights", icon: "monitoring" },
            { id: "advisor",      label: "Advisor",  icon: "chat_bubble" },
          ].map(item => {
            const isActive = tab === item.id;
            return (
              <button key={item.id} className={`mobile-nav-item${isActive ? " active" : ""}`} onClick={() => navigateToTab(item.id)} style={{ viewTransitionName: isActive ? "active-mobile-pill" : undefined }}>
                <span className="mobile-nav-icon-wrap" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 28, borderRadius: 18, background: isActive ? `${COLORS.primary}18` : "transparent", transition: "background 0.2s" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300", color: isActive ? COLORS.primary : "var(--s-tab-idle, var(--c-muted))", transition: "color 0.2s" }}>{item.icon}</span>
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Add button for mobile */}
        <button className="mobile-fab" aria-label="Add entry" onClick={() => setModal("addMenu")} style={{ display: "none", position: "fixed", bottom: "calc(80px + env(safe-area-inset-bottom) + 12px)", right: 20, width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(140deg, ${COLORS.primary}, #0095d2)`, border: "none", color: "#fff", fontSize: 26, cursor: "pointer", zIndex: 101, boxShadow: `0 8px 24px rgba(0,120,168,0.45)`, alignItems: "center", justifyContent: "center" }}>+</button>

        {/* SCROLLABLE CONTENT */}
        <main
          className="main-scroll"
          onScroll={e => {
            const shouldBeScrolled = e.currentTarget.scrollTop > 8;
            if (shouldBeScrolled !== headerScrolled) setHeaderScrolled(shouldBeScrolled);
          }}
          style={{ flex: 1, overflowY: "auto", padding: "24px 32px", viewTransitionName: "page-main" }}
        >
        {/* ── HOME TAB ── */}
        {tab === "dashboard" && (() => {
          const totalFixedPaid = billsActualTotal;
          // Variable Spent = all expense entries (bills tracker is the fixed boundary, not the fixed flag)
          const totalVarSpent = viewTotalExpenses;
          // ZBB bar segment percentages (clamped so they never exceed 100% combined)
          const fixedPct = viewTotalIncome > 0 ? Math.min(fixedCommitmentsTotal / viewTotalIncome * 100, 100) : 0;
          const varPct = viewTotalIncome > 0 ? Math.min(plannedVariableTotal / viewTotalIncome * 100, Math.max(0, 100 - fixedPct)) : 0;
          const availPct = Math.max(0, 100 - fixedPct - varPct);
          // ZBB color: red = overcommitted, green = near $0 (ideal), amber = unassigned dollars
          const zbbThreshold = viewTotalIncome * 0.05; // within 5% of income = "on plan"
          const zbbColor = trueAvailable < 0 ? COLORS.danger
            : trueAvailable <= zbbThreshold ? COLORS.success
            : COLORS.warning;
          const availColor = trueAvailable < 0 ? COLORS.danger
            : trueAvailable <= zbbThreshold ? "oklch(62% 0.15 145)"
            : "oklch(72% 0.18 70)";
          const zbbStatus = trueAvailable < 0
            ? `Overcommitted by ${fmt(Math.abs(trueAvailable))}`
            : trueAvailable <= zbbThreshold
              ? "Fully planned ✓"
              : `${fmt(trueAvailable)} unassigned`;
          const cardStyle = { background: COLORS.surface, borderRadius: 12, padding: "18px 20px", boxShadow: "var(--c-shadow)", border: "1px solid transparent" };
          const catRows = CATEGORIES.map(c => ({ ...c, spent: viewCatTotals[c.id] || 0, budget: catEffectiveBudgets[c.id] || 0 })).filter(c => c.spent > 0 || c.budget > 0).sort((a, b) => (b.budget || b.spent) - (a.budget || a.spent));
          const billRows = [...bills].sort((a, b) => { const aP = getBillPaid(a, viewMonthKey); const bP = getBillPaid(b, viewMonthKey); if (aP !== bP) return aP ? 1 : -1; return a.dayOfMonth - b.dayOfMonth; });
          return (
            <div style={{ fontSize: 14, color: COLORS.text, display: "flex", flexDirection: "column", gap: 14 }}>

              {/* ── True Available hero (ZBB) ── */}
              <div style={{ ...cardStyle, padding: "22px 24px" }}>
                <p style={{ fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.muted, marginBottom: 4 }}>True Available</p>
                <AnimatedNumber
                  value={trueAvailable}
                  format={v => v >= 0 ? fmt(v) : `−${fmt(Math.abs(v))}`}
                  style={{ fontSize: 46, fontWeight: 300, color: zbbColor, letterSpacing: "-0.04em", lineHeight: 1, display: "block", marginBottom: 6, fontVariantNumeric: "tabular-nums" }}
                />
                <p style={{ fontSize: 11, fontWeight: 500, color: zbbColor, marginBottom: 14 }}>{zbbStatus}</p>
                {viewTotalIncome > 0 && (
                  <>
                    {/* 3-segment bar: [Fixed Committed] [Variable Planned] [True Available] */}
                    <div style={{ height: 5, borderRadius: 9999, background: "var(--s-bar-bg,var(--c-container))", overflow: "hidden", display: "flex", marginBottom: 10 }}>
                      <div style={{ width: `${fixedPct}%`, background: "oklch(52% 0.025 250)", transition: "width 0.8s cubic-bezier(0.25,1,0.5,1)", flexShrink: 0 }} />
                      <div style={{ width: `${varPct}%`, background: "oklch(68% 0.025 250)", transition: "width 0.8s cubic-bezier(0.25,1,0.5,1)", flexShrink: 0 }} />
                      {availPct > 0 && (
                        <div style={{ flex: 1, background: availColor, transition: "background 0.4s ease" }} />
                      )}
                    </div>
                    {/* Legend */}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      {[
                        { label: "Fixed Committed", color: "oklch(52% 0.025 250)", val: fmt(fixedCommitmentsTotal) },
                        { label: "Variable Planned", color: "oklch(68% 0.025 250)", val: fmt(plannedVariableTotal) },
                        { label: "True Available", color: zbbColor, val: trueAvailable < 0 ? `−${fmt(Math.abs(trueAvailable))}` : fmt(trueAvailable) },
                      ].map(l => (
                        <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: COLORS.muted }}>
                          <div style={{ width: 7, height: 7, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                          {l.label} {l.val}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── Stats strip ── */}
              <div className="home-stats-strip" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { label: "Income",         value: viewTotalIncome,       color: COLORS.success },
                  { label: "Fixed Paid",      value: totalFixedPaid,        color: COLORS.text },
                  { label: "Variable Spent",  value: totalVarSpent,         color: totalVarSpent > 0 ? COLORS.warning : COLORS.muted },
                  { label: "Savings",         value: viewCatTotals["Savings"] || 0,  color: COLORS.text },
                ].map(chip => (
                  <div key={chip.label} style={{ ...cardStyle, padding: "11px 14px" }}>
                    <p style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.muted, marginBottom: 4 }}>{chip.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 300, color: chip.color, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{fmt(chip.value)}</p>
                  </div>
                ))}
              </div>

              {/* ── Two-column: Fixed Commitments + Variable Spending ── */}
              <div className="home-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                {/* Fixed Commitments */}
                <div style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <p style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.muted }}>Fixed Commitments</p>
                    {billsReservedTotal > 0 && <span style={{ fontSize: 9, fontWeight: 500, padding: "2px 7px", borderRadius: 9999, background: COLORS.primaryFillBg, color: COLORS.primary }}>{billRows.filter(b => !getBillPaid(b, viewMonthKey)).length} due</span>}
                  </div>
                  {billRows.length === 0 && <p style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", padding: "16px 0" }}>No fixed expenses yet</p>}
                  {billRows.map(b => {
                    const paid = getBillPaid(b, viewMonthKey);
                    const dueDate = getBillDueDate(b, viewMonthKey);
                    const daysLeft = dueDate ? Math.round((new Date(dueDate) - today0) / 86400000) : null;
                    const soon = !paid && daysLeft !== null && daysLeft <= 2;
                    return (
                      <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${COLORS.containerLow}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 17, height: 17, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, flexShrink: 0, background: paid ? COLORS.successFillBg : soon ? COLORS.dangerFillBg : COLORS.containerLow, color: paid ? COLORS.success : soon ? COLORS.danger : COLORS.muted }}>
                            {paid ? "✓" : "!"}
                          </div>
                          <div>
                            <p style={{ fontSize: 12, color: paid ? COLORS.muted : COLORS.text, textDecoration: paid ? "line-through" : "none", textDecorationColor: COLORS.muted }}>{b.label}</p>
                            {!paid && daysLeft !== null && <p style={{ fontSize: 10, color: soon ? COLORS.danger : COLORS.muted }}>{daysLeft < 0 ? `Overdue ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Due today" : `due ${fmtDate(dueDate)}`}</p>}
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: paid ? COLORS.muted : COLORS.text, fontVariantNumeric: "tabular-nums", textDecoration: paid ? "line-through" : "none", textDecorationColor: COLORS.muted }}>{fmt(b.budget)}</p>
                      </div>
                    );
                  })}
                  {bills.length > 0 && (
                    <div style={{ paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: COLORS.muted }}>{billRows.filter(b => getBillPaid(b, viewMonthKey)).length} of {bills.length} paid</span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: COLORS.text }}>{fmt(billsBudgetTotal)} total</span>
                    </div>
                  )}
                </div>

                {/* Variable Spending */}
                <div style={cardStyle}>
                  <p style={{ fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.muted, marginBottom: 14 }}>Variable Spending</p>
                  {catRows.length === 0 && <p style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", padding: "16px 0" }}>No expenses yet</p>}
                  {catRows.map(c => {
                    const hasBudget = c.budget > 0;
                    const remaining = hasBudget ? c.budget - c.spent : null;
                    const pctUsed = hasBudget ? Math.min(100, (c.spent / c.budget) * 100) : 100;
                    const over = hasBudget && c.spent > c.budget;
                    const warn = hasBudget && !over && pctUsed >= 85;
                    const barColor = over ? COLORS.danger : warn ? COLORS.warning : hasBudget ? COLORS.primary : "var(--c-container-high, oklch(88% 0.005 250))";
                    return (
                      <div key={c.id} style={{ padding: "8px 0", borderBottom: `1px solid ${COLORS.containerLow}` }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
                          <p style={{ fontSize: 12, color: COLORS.text }}>{c.label}</p>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 3, fontVariantNumeric: "tabular-nums" }}>
                            {remaining !== null
                              ? <p style={{ fontSize: 12, fontWeight: 500, color: barColor }}>{over ? `${fmt(Math.abs(remaining))} over` : `${fmt(remaining)} left`}</p>
                              : <p style={{ fontSize: 12, color: COLORS.subtext }}>{fmt(c.spent)} <span style={{ fontSize: 10 }}>spent</span></p>}
                            {hasBudget
                              ? <p style={{ fontSize: 10, color: COLORS.muted }}>/ {fmt(c.budget)}</p>
                              : <p style={{ fontSize: 10, color: COLORS.muted }}>no budget</p>}
                          </div>
                        </div>
                        <div style={{ height: 4, borderRadius: 9999, background: "var(--s-bar-bg,var(--c-container))", overflow: "hidden" }}>
                          <div style={{ width: `${pctUsed}%`, height: "100%", background: barColor, borderRadius: 9999, transition: "width 0.8s cubic-bezier(0.25,1,0.5,1)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          );
        })()}
        {/* ── PLAN TAB ── */}
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
          const colStyle = { fontSize: 11, fontWeight: FW.bold, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", userSelect: "none", display: "flex", alignItems: "center" };
          const COLS = "2.2fr 1fr 0.8fr 0.9fr 0.9fr 0.9fr 32px";

          // Inline cell helpers
          const EditableText = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} onKeyDown={e=>{if(e.key==="Enter")setEditingCell(null);}} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:13,color:COLORS.text,outline:"none"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px",fontSize:13}}>{value||"—"}</span>;
          const EditableNum = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus type="number" value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} onKeyDown={e=>{if(e.key==="Enter")setEditingCell(null);}} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:13,color:COLORS.text,outline:"none",textAlign:"right"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px",color:COLORS.text,fontWeight:FW.semibold,fontSize:13,textAlign:"right",fontFamily:"var(--font-num)",fontVariantNumeric:"tabular-nums"}}>{fmt(value)}</span>;
          const EditableDate = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <input autoFocus type="date" value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:12,color:COLORS.text,outline:"none"}} />
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"text",display:"block",borderRadius:4,padding:"2px 4px",fontSize:12,color:COLORS.subtext}}>{value ? fmtDate(value) : "—"}</span>;
          const EditableCat = ({ id, field, value }) => editingCell?.id===id && editingCell?.field===field
            ? <select autoFocus value={value} onChange={e=>updateExpenseField(id,field,e.target.value)} onBlur={()=>setEditingCell(null)} style={{width:"100%",background:COLORS.containerLow,border:"none",borderRadius:6,padding:"3px 6px",fontSize:12,color:COLORS.text,outline:"none"}}>
                {CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            : <span onClick={()=>setEditingCell({id,field})} title="Click to edit" style={{cursor:"pointer",display:"inline-block",fontSize:11,fontWeight:FW.semibold,color:COLORS.subtext,background:COLORS.containerHighest,borderRadius:9999,padding:"2px 8px"}}>{value}</span>;

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
          const prevMonthExpBudgets = normaliseExpenseBudgets(monthlySnapshots[prevMonthKey]?.expenseBudgets || {});
          const hasPrevPlanned = Object.keys(prevMonthItemBudgets).length > 0 || Object.values(prevMonthExpBudgets).some(v => v > 0);
          const prevHasCustomBudgets = !CATEGORIES.every(cat => (prevMonthExpBudgets[cat.id] ?? 0) === (DEFAULT_EXPENSE_BUDGETS[cat.id] ?? 0));
          const showCopyButton = hasPrevPlanned || prevHasCustomBudgets;

          const totalPlanned = SPENDING_PLAN_GROUPS.reduce((sum, group) => {
            const grpExp = viewExpenses.filter(e => e.category === group.catId);
            const grpItemsSum = grpExp.reduce((s, e) => s + (monthItemBudgets[`exp-${e.id}`] || 0), 0);
            const grpCatBudget = viewExpenseBudgets[group.catId] ?? 0;
            return sum + (grpItemsSum > 0 ? grpItemsSum : grpCatBudget);
          }, 0);
          const totalActual = viewTotalExpenses;
          const pctSpent = viewTotalIncome > 0 ? Math.round((totalActual / viewTotalIncome) * 100) : 0;
          const pctPlanned = viewTotalIncome > 0 ? Math.round((totalPlanned / viewTotalIncome) * 100) : 0;
          const hasMeaningfulBudget = totalPlanned > 0 && viewTotalIncome > 0 && (totalPlanned / viewTotalIncome) > 0.10;
          const isOverBudget = hasMeaningfulBudget && totalActual > totalPlanned;
          const isOverIncome = totalActual > viewTotalIncome && viewTotalIncome > 0;
          const plannedCount = Object.keys(monthItemBudgets).length;
          const now2 = new Date();
          const isCurrentMonth = vy === now2.getFullYear() && vm0 === now2.getMonth();
          const daysInMonth2 = new Date(vy, vm0 + 1, 0).getDate();
          const daysLeft = isCurrentMonth ? Math.max(0, daysInMonth2 - now2.getDate()) : 0;
          const healthStatus = (() => {
            if (isOverIncome) return { label: "Overspent", color: COLORS.danger, bg: COLORS.danger + "15" };
            if (isOverBudget) return { label: "Over Budget", color: COLORS.warning, bg: COLORS.warning + "15" };
            if (pctSpent > 90) return { label: "Watch Spending", color: COLORS.warning, bg: COLORS.warning + "15" };
            if (totalPlanned === 0) return { label: "Start Planning", color: COLORS.primary, bg: COLORS.primary + "15" };
            return { label: "On Track", color: COLORS.success, bg: COLORS.success + "15" };
          })();
          return (
            <div style={{ paddingBottom: 48 }}>
              {/* ── Hero: Remaining + supporting stats ── */}
              {(() => {
                const remaining = viewTotalIncome - totalActual;
                const remainingColor = remaining >= 0 ? COLORS.success : COLORS.danger;
                return (
                  <div className="plan-hero-card" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 24, padding: "28px 32px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 20 }}>
                    {/* Month label + status */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: 13, fontWeight: FW.medium, color: COLORS.muted }}>
                        {MONTH_FULL[vm0]} {vy} · Monthly Plan
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isCurrentMonth && daysLeft > 0 && (
                          <span style={{ fontSize: 11, color: COLORS.muted }}>{daysLeft} days left</span>
                        )}
                        <button
                          onClick={() => { setAdvisorMsg(`My budget health: ${healthStatus.label}. I've spent ${fmt(totalActual)} of ${fmt(viewTotalIncome)} income (${pctSpent}%). ${isCurrentMonth ? `${daysLeft} days left in the month.` : ""} Please give me specific advice.`); pendingAdvisorSend.current = true; navigateToTab("insights"); }}
                          title="Ask AI for advice"
                          style={{ fontSize: 12, fontWeight: FW.semibold, color: healthStatus.color, background: healthStatus.bg, border: "none", borderRadius: 9999, padding: "4px 12px", cursor: "pointer" }}
                        >
                          {healthStatus.label}
                        </button>
                      </div>
                    </div>

                    {/* Hero remaining number */}
                    <div style={{ marginBottom: 24 }}>
                      <p style={{ fontSize: 11, fontWeight: FW.medium, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Remaining this month</p>
                      <AnimatedNumber
                        value={Math.abs(remaining)}
                        format={(v) => (remaining < 0 ? "−" : "") + fmt(v)}
                        style={{ fontSize: 48, fontWeight: 300, color: remainingColor, fontFamily: "'Manrope', var(--font-num)", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
                      />
                    </div>

                    {/* Supporting stats strip */}
                    <div className="plan-stats-strip" style={{ display: "grid", gap: 0, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid var(--c-border)" }}>
                      {[
                        { label: "Income",  val: fmt(viewTotalIncome), color: COLORS.success },
                        { label: "Spent",   val: fmt(totalActual),     color: COLORS.accentWarm },
                        { label: "Planned", val: totalPlanned > 0 ? fmt(totalPlanned) : "—", color: COLORS.primary },
                      ].map((m, i) => (
                        <div key={m.label} className="plan-stats-cell" style={{ paddingRight: i < 2 ? 20 : 0, marginRight: i < 2 ? 20 : 0, borderRight: i < 2 ? "1px solid var(--c-border)" : "none" }}>
                          <p style={{ fontSize: 10, fontWeight: FW.medium, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{m.label}</p>
                          <p className="plan-stat-val" style={{ fontSize: 18, fontWeight: 300, color: m.color, fontFamily: "'Manrope', var(--font-num)", letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>{m.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <BudgetBar totalIncome={viewTotalIncome} totalPlanned={totalPlanned} totalSpent={totalActual} hideLabel />

                    {/* Controls */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <button onClick={() => {
                          if (!toggle5020) {
                            if (viewTotalIncome === 0) { setToast5020("Add income first to use the 50/30/20 rule"); setTimeout(() => setToast5020(""), 3000); return; }
                            pre5020Budgets.current = { ...viewExpenseBudgets };
                            pre5020Savings.current = savingsItems.map(s => ({ ...s }));
                            const inc = viewTotalIncome;
                            const needsAmt = Math.round(inc * 0.50 / 5);
                            const wantsAmt = Math.round(inc * 0.30 / 6);
                            const savesAmt = Math.round(inc * 0.20 / 2);
                            setViewExpenseBudgets({
                              Housing: needsAmt, Utilities: needsAmt, Food: needsAmt, Transport: needsAmt, Health: needsAmt,
                              Entertainment: wantsAmt, Personal: wantsAmt, Kids: wantsAmt, Education: wantsAmt, Subscriptions: wantsAmt, Travel: wantsAmt,
                              Other: savesAmt, Savings: savesAmt
                            });
                            if (savingsItems.length > 0) setSavingsItems(p => [{ ...p[0], expected: Math.round(inc*0.20) }, ...p.slice(1)]);
                            setToggle5020(true);
                          } else {
                            if (pre5020Budgets.current) setViewExpenseBudgets(pre5020Budgets.current);
                            if (pre5020Savings.current) setSavingsItems(pre5020Savings.current);
                            pre5020Budgets.current = null; pre5020Savings.current = null;
                            setToggle5020(false);
                          }
                        }} style={{ fontSize: 11, fontWeight: FW.semibold, background: toggle5020 ? COLORS.primary : "transparent", color: toggle5020 ? "#fff" : COLORS.primary, border: `1.5px solid ${COLORS.primary}`, borderRadius: 9999, padding: "4px 12px", cursor: "pointer", transition: "all .2s" }}>
                          50/30/20 Rule {toggle5020 ? "ON" : "OFF"}
                        </button>
                        {toggle5020 && viewTotalIncome > 0 && <span style={{ fontSize: 11, color: COLORS.muted }}>Based on {fmt(viewTotalIncome)} income</span>}
                        {toast5020 && <span style={{ fontSize: 11, color: COLORS.warning, fontWeight: FW.semibold }}>{toast5020}</span>}
                      </div>
                      {showCopyButton && (
                        <button onClick={() => { if (Object.values(prevMonthExpBudgets).some(v => v > 0)) setViewExpenseBudgets({ ...prevMonthExpBudgets }); if (Object.keys(prevMonthItemBudgets).length > 0) setItemBudgets(p => ({...p, [viewMonthKey]: {...prevMonthItemBudgets}})); }} style={{ background: "rgba(0,103,136,0.08)", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: FW.semibold, color: COLORS.primary, cursor: "pointer" }}>
                          Copy from {MONTH_NAMES[new Date(prevY, prevM0 - 1, 1).getMonth()]}
                        </button>
                      )}
                    </div>
                    {!onboardingDismissed && plannedCount < 5 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, background: `rgba(0,103,136,0.07)`, borderRadius: 10, padding: "9px 14px" }}>
                        <span style={{ fontSize: 12, color: COLORS.primary }}>👋 Set your planned amounts — click any <strong>—</strong> in the Planned column to get started.</span>
                        <button onClick={() => setOnboardingDismissed(true)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* ── Main card (full-width) ── */}
              <div className="budget-main-grid">
                <div className="budget-table-card" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 20, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 20 }}>
                  {/* ── Income strip (collapsible) ── */}
                  <div style={{ marginBottom: 18, padding: "12px 14px", background: "rgba(192,232,255,0.22)", border: "1px solid rgba(0,103,136,0.12)", borderRadius: 12, position: "relative", overflow: "hidden" }}>
                    <div onClick={() => setIncomeCollapsed(p => !p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: COLORS.muted, transition: "transform .24s cubic-bezier(0.34, 1.35, 0.64, 1)", transform: incomeCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>expand_more</span>
                        <div style={{ padding: "4px 6px", background: "rgba(23,102,132,0.12)", borderRadius: 7 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: COLORS.secondary }}>trending_up</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: FW.bold, color: COLORS.text }}>Income</span>
                        <span style={{ fontSize: 11, color: COLORS.muted }}>({viewIncome.length} {viewIncome.length === 1 ? "source" : "sources"})</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18, fontWeight: FW.extrabold, color: COLORS.secondary, fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum","ss01"', letterSpacing: "-0.02em" }}>{fmt(viewTotalIncome)}</span>
                        <button onClick={(e) => { e.stopPropagation(); setModal("addIncome"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }} title="Add income source">
                          <span className="material-symbols-outlined" style={{ fontSize: 20, color: COLORS.primary }}>add_circle</span>
                        </button>
                      </div>
                    </div>
                    {!incomeCollapsed && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(23,102,132,0.12)", display: "flex", flexDirection: "column", gap: 5 }}>
                        {viewIncome.length === 0 && (
                          <p style={{ fontSize: 12, color: COLORS.muted, margin: "4px 0" }}>No income sources yet. Tap + to add one.</p>
                        )}
                        {viewIncome.map(i => (
                          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14, color: COLORS.subtext, flexShrink: 0 }}>work</span>
                              {editingIncomeCell?.id === i.id && editingIncomeCell?.field === "label"
                                ? <input autoFocus value={i.label} onChange={e => updateIncomeField(i.id, "label", e.target.value)} onBlur={() => setEditingIncomeCell(null)} onKeyDown={e => { if (e.key === "Enter") setEditingIncomeCell(null); }} style={{ flex:1, background:COLORS.containerLow, border:"none", borderRadius:6, padding:"2px 6px", fontSize:12, color:COLORS.text, outline:"none" }} />
                                : <span onClick={() => setEditingIncomeCell({id:i.id, field:"label"})} title="Click to edit" style={{ fontSize: 12, fontWeight: FW.medium, color: COLORS.text, cursor:"text", flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{i.label}{i.recurring ? " ↺" : ""}</span>
                              }
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              {editingIncomeCell?.id === i.id && editingIncomeCell?.field === "amount"
                                ? <input autoFocus type="number" defaultValue={i.amount} onBlur={e => { updateIncomeField(i.id, "amount", e.target.value); setEditingIncomeCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }} style={{ width:80, background:COLORS.containerLow, border:"none", borderRadius:6, padding:"2px 6px", fontSize:13, color:COLORS.text, outline:"none" }} />
                                : <span onClick={() => setEditingIncomeCell({id:i.id, field:"amount"})} title="Click to edit" style={{ fontSize: 13, fontWeight: FW.bold, color: COLORS.secondary, cursor:"text", fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum","ss01"', letterSpacing: "-0.01em" }}>+{fmt(i.amount)}</span>
                              }
                              <button onClick={() => deleteIncomeFromView(i.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                            </div>
                          </div>
                        ))}
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
                  <div className="sticky-col-header" style={{ display: "grid", gap: 8, padding: "10px 12px", background: COLORS.containerLow, borderRadius: 10, marginBottom: 16 }}>
                    <span style={colStyle} onClick={() => toggleSort("label")}>Items <SortArrow field="label" /></span>
                    <span className="plan-col-hide" style={colStyle} onClick={() => toggleSort("category")}>Type</span>
                    <span className="plan-col-hide" style={{ ...colStyle, cursor: "default" }}>Due</span>
                    <span className="plan-col-hide" style={{ ...colStyle, justifyContent: "flex-end" }}>Planned</span>
                    <span style={{ ...colStyle, justifyContent: "flex-end" }} onClick={() => toggleSort("amount")}>Actual <SortArrow field="amount" /></span>
                    <span style={{ ...colStyle, cursor: "default", justifyContent: "flex-end" }}>Left</span>
                    <span style={{ ...colStyle, cursor: "default" }}></span>
                  </div>

                  {/* Category groups */}
                  {SPENDING_PLAN_GROUPS.map(group => {
                    const grpExp = sortExp(viewExpenses.filter(e => e.category === group.catId));
                    const grpActual = grpExp.reduce((s,e) => s+e.amount, 0);
                    const grpPlanned = viewExpenseBudgets[group.catId] ?? 0;
                    const grpItemsPlannedSum = grpExp.reduce((s, e) => s + (monthItemBudgets[`exp-${e.id}`] || 0), 0);
                    const effectivePlanned = grpItemsPlannedSum > 0 ? grpItemsPlannedSum : grpPlanned;
                    const isCollapsed = collapsedCategories[group.catId];
                    const util = effectivePlanned > 0 ? Math.round((grpActual / effectivePlanned) * 100) : null;
                    const utilColor = util === null ? COLORS.muted : util > 100 ? COLORS.danger : util >= 80 ? COLORS.warning : COLORS.success;
                    const accentColor = util === null ? "rgba(0,0,0,0)" : utilColor;
                    const usedLabels = grpExp.map(e => e.label.toLowerCase());
                    const unusedTemplates = group.templateItems.filter(t => !usedLabels.some(l => l.includes(t.split(/[/(]/)[0].trim().toLowerCase())));
                    const isEditingLabel = editingCategoryLabelId === group.catId;

                    return (
                      <div key={group.catId} className="budget-cat-group" style={{ marginBottom: 6, position: "relative" }}>
                        {/* Left accent bar — colored by utilization */}
                        <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: accentColor, borderRadius: 2, opacity: util === null ? 0 : 1, transition: "background .2s, opacity .2s" }} />
                        {/* Group header — chevron on LEFT next to larger icon */}
                        <div className="plan-cat-header budget-row" onClick={() => {
                          const toggle = () => setCollapsedCategories(p => ({ ...p, [group.catId]: !p[group.catId] }));
                          if (typeof document !== "undefined" && typeof document.startViewTransition === "function" &&
                              !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
                            document.documentElement.classList.add("vt-cat-expand");
                            const t = document.startViewTransition(() => { flushSync(toggle); });
                            t.finished.finally(() => document.documentElement.classList.remove("vt-cat-expand"));
                          } else { toggle(); }
                        }}
                          style={{ display: "grid", gap: 8, alignItems: "center", padding: "10px 12px 10px 14px", background: "var(--c-surface)", borderRadius: 10, cursor: "pointer", marginBottom: isCollapsed ? 0 : 6, border: "1px solid var(--c-border)", transition: "background .15s" }}>
                          <div className="plan-cat-item-cell" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="material-symbols-outlined expand-chevron" style={{ fontSize: 18, color: COLORS.muted, transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink: 0 }}>expand_more</span>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: CATEGORY_ICON_BG[group.catId] || COLORS.neutral, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 19, color: CATEGORY_ICON_COLOR[group.catId] || COLORS.subtext }}>{CATEGORY_ICONS[group.catId] || "category"}</span>
                            </div>
                            {isEditingLabel ? (
                              <input
                                autoFocus
                                defaultValue={group.label}
                                onClick={e => e.stopPropagation()}
                                onBlur={ev => {
                                  const v = ev.target.value.trim();
                                  if (v && v !== group.label) {
                                    setCategoryLabelOverrides(prev => ({ ...prev, [group.catId]: v }));
                                    showToast(`Renamed to ${v}`);
                                  }
                                  setEditingCategoryLabelId(null);
                                }}
                                onKeyDown={ev => {
                                  if (ev.key === "Enter") ev.target.blur();
                                  if (ev.key === "Escape") setEditingCategoryLabelId(null);
                                }}
                                style={{ fontSize: 14, fontWeight: FW.bold, color: COLORS.text, background: COLORS.containerLow, border: `1px solid ${COLORS.primary}`, borderRadius: 6, padding: "2px 6px", minWidth: 140, outline: "none", fontFamily: "inherit" }}
                              />
                            ) : (
                              <span
                                className="plan-cat-label"
                                onDoubleClick={e => { e.stopPropagation(); setEditingCategoryLabelId(group.catId); }}
                                title="Double-click to rename"
                                style={{ fontSize: 14, fontWeight: FW.bold, color: COLORS.text, cursor: "text" }}
                              >{group.label}</span>
                            )}
                            {grpExp.length > 0 && <span className="plan-cat-count" style={{ fontSize: 11, color: COLORS.muted }}>({grpExp.length})</span>}
                            {!isEditingLabel && (
                              <button
                                onClick={e => { e.stopPropagation(); setEditingCategoryLabelId(group.catId); }}
                                title="Rename category"
                                className="cat-rename-btn"
                                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: COLORS.muted, opacity: 0, transition: "opacity .15s", display: "inline-flex", alignItems: "center" }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                              </button>
                            )}
                            {group.custom && !isEditingLabel && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!confirm(`Remove the "${group.label}" category? Expenses in it will become uncategorized.`)) return;
                                  setCustomCategories(prev => prev.filter(c => c.catId !== group.catId));
                                  setCategoryLabelOverrides(prev => { const { [group.catId]: _, ...rest } = prev; return rest; });
                                  showToast(`Removed ${group.label}`, "✕");
                                }}
                                title="Remove category"
                                className="cat-rename-btn"
                                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: COLORS.muted, opacity: 0, transition: "opacity .15s", display: "inline-flex", alignItems: "center" }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                              </button>
                            )}
                          </div>
                          {/* cat column — empty, hidden on mobile */}
                          <span className="plan-col-hide" />
                          {/* due column — empty, hidden on mobile */}
                          <span className="plan-col-hide" />
                          {/* planned — hidden on mobile, editable category budget */}
                          <div className="plan-col-hide">
                          {grpItemsPlannedSum > 0
                            ? <span title={`Auto-sum of ${grpExp.length} item budgets${grpPlanned > 0 ? ` (category cap: ${fmt(grpPlanned)})` : ""}`} style={{ fontSize: 13, fontWeight: FW.bold, color: COLORS.subtext, fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum","ss01"', letterSpacing: "-0.01em", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                                {fmt(grpItemsPlannedSum)}
                                <span style={{ fontSize: 9, color: COLORS.muted, background: COLORS.containerHigh, borderRadius: 3, padding: "1px 4px", fontFamily: "inherit" }}>Σ</span>
                              </span>
                            : editingPlannedKey === `cat-${group.catId}`
                              ? <input autoFocus type="number" placeholder="0" defaultValue={grpPlanned || ""} onClick={e => e.stopPropagation()} onBlur={ev => { const v = parseFloat(ev.target.value) || 0; setViewExpenseBudgets(prev => ({ ...prev, [group.catId]: v })); setEditingPlannedKey(null); }} onKeyDown={ev => { if (ev.key === "Enter") ev.target.blur(); if (ev.key === "Escape") setEditingPlannedKey(null); }} style={{ width:"100%", background:COLORS.containerLow, border:`1px solid ${COLORS.primary}`, borderRadius:6, padding:"3px 6px", fontSize:13, color:COLORS.text, outline:"none" }} />
                              : <span onClick={e => { e.stopPropagation(); setEditingPlannedKey(`cat-${group.catId}`); }} title="Click to edit category budget" style={{ fontSize: 13, fontWeight: FW.bold, color: grpPlanned > 0 ? COLORS.subtext : COLORS.muted, cursor: "text", borderRadius: 4, padding: "2px 4px", fontFamily: grpPlanned > 0 ? "var(--font-num)" : "inherit", fontVariantNumeric: "tabular-nums", letterSpacing: grpPlanned > 0 ? "-0.01em" : "normal", display: "block", textAlign: "right" }}>{viewExpenseBudgets[group.catId] != null ? fmt(grpPlanned) : <span style={{ display:"flex", alignItems:"center", justifyContent: "flex-end", gap:4 }}>—<span className="material-symbols-outlined" style={{ fontSize:13, color: COLORS.primary, opacity: 0.6 }}>edit</span></span>}</span>
                          }
                          </div>
                          {/* actual */}
                          <span style={{ fontSize: 13, fontWeight: FW.bold, color: utilColor, fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum","ss01"', letterSpacing: "-0.01em", textAlign: "right" }}>{grpActual > 0 ? fmt(grpActual) : "—"}</span>
                          {/* variance */}
                          {(() => { const left = effectivePlanned - grpActual; const showDash = effectivePlanned === 0 && grpActual === 0; return <span style={{ fontSize: 13, fontWeight: FW.bold, color: showDash ? COLORS.muted : left >= 0 ? COLORS.success : COLORS.danger, fontFamily: showDash ? "inherit" : "var(--font-num)", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum","ss01"', letterSpacing: showDash ? "normal" : "-0.01em", textAlign: "right", display: "block" }}>{showDash ? "—" : left > 0 ? `+${fmt(left)}` : fmt(left)}</span>; })()}
                          {/* actions col — empty (chevron moved left) */}
                          <span />
                        </div>

                        {/* CSS grid-rows expand — no JS animation, no layout thrash */}
                        <div style={{ display: "grid", gridTemplateRows: isCollapsed ? "0fr" : "1fr", transition: "grid-template-rows 290ms cubic-bezier(0.22,1,0.36,1)" }}>
                          <div style={{ overflow: "hidden" }}>
                          <div style={{ marginLeft: 44, marginBottom: 4, paddingTop: 2 }}>
                            {/* Existing expense rows */}
                            {grpExp.map(e => {
                              const expPlanned = monthItemBudgets[`exp-${e.id}`] || 0;
                              const expVar = expPlanned > 0 ? expPlanned - e.amount : null;
                              // BUG 8: For fixed expenses, construct due date within viewed month
                              const displayDate = (() => {
                                if (e.date) {
                                  const [ey, em] = e.date.split("-").map(Number);
                                  if (ey === vy && em === vm0 + 1) return e.date; // already correct month
                                  if (e.fixed) { const day = e.date.split("-")[2]; return `${viewMonthKey}-${day}`; }
                                  return e.date;
                                }
                                if (e.fixed) return `${viewMonthKey}-01`;
                                return e.date;
                              })();
                              return (
                              <div key={e.id} className="budget-row" style={{ display: "grid", gap: 8, padding: "7px 10px", alignItems: "center", borderRadius: 8, background: "var(--c-container-low)", marginBottom: 2, border: "1px solid var(--c-border)" }}>
                                <EditableText id={e.id} field="label" value={e.label} />
                                <span className="plan-col-hide" style={{ fontSize: 11, fontWeight: FW.semibold, color: e.fixed ? COLORS.subtext : COLORS.muted, background: e.fixed ? COLORS.containerHigh : COLORS.containerLow, borderRadius: 9999, padding: "2px 7px", justifySelf: "start" }}>{e.fixed ? "Fixed" : "Variable"}</span>
                                <div className="plan-col-hide"><EditableDate id={e.id} field="date" value={displayDate} /></div>
                                <div className="plan-col-hide">
                                {editingPlannedKey === `exp-${e.id}`
                                  ? <input autoFocus type="number" placeholder="0" defaultValue={expPlanned || ""} onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v) setMonthItemBudget(`exp-${e.id}`, v); setEditingPlannedKey(null); }} onKeyDown={ev => { if (ev.key === "Enter") ev.target.blur(); if (ev.key === "Escape") setEditingPlannedKey(null); }} style={{ width:"100%", background:COLORS.containerLow, border:`1px solid ${COLORS.primary}`, borderRadius:6, padding:"3px 6px", fontSize:13, color:COLORS.text, outline:"none" }} />
                                  : <span onClick={() => setEditingPlannedKey(`exp-${e.id}`)} title="Click to set planned budget" style={{ fontSize: 13, color: expPlanned ? COLORS.subtext : COLORS.muted, cursor: "text", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, borderRadius:4, padding:"2px 4px", fontFamily: expPlanned ? "var(--font-num)" : "inherit", fontVariantNumeric: "tabular-nums", fontWeight: expPlanned ? FW.semibold : 400, letterSpacing: expPlanned ? "-0.01em" : "normal" }}>{expPlanned ? fmt(expPlanned) : <><span>—</span><span className="material-symbols-outlined" style={{ fontSize:13, color: COLORS.primary, opacity: 0.55 }}>edit</span></>}</span>
                                }
                                </div>
                                <EditableNum id={e.id} field="amount" value={e.amount} />
                                <span style={{ fontSize: 13, fontWeight: FW.bold, color: expVar === null ? COLORS.muted : expVar >= 0 ? COLORS.success : COLORS.danger, fontFamily: expVar === null ? "inherit" : "var(--font-num)", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum","ss01"', letterSpacing: expVar === null ? "normal" : "-0.01em", textAlign: "right", display: "block" }}>
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
                              <div key={item} className="budget-row" style={{ display: "grid", gap: 8, padding: "6px 10px", alignItems: "center", borderRadius: 8, opacity: 0.55, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, color: COLORS.muted, fontStyle: "italic" }}>{item}</span>
                                <span className="plan-col-hide" style={{ fontSize: 11, color: COLORS.muted }}>—</span>
                                <span className="plan-col-hide" style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <div className="plan-col-hide">
                                {editingPlannedKey === tKey
                                  ? <input autoFocus type="number" placeholder="Budget amt" onBlur={ev => { const v = parseFloat(ev.target.value) || 0; if (v) setMonthItemBudget(tKey, v); setEditingPlannedKey(null); }} onKeyDown={ev => { if (ev.key === "Enter") ev.target.blur(); if (ev.key === "Escape") setEditingPlannedKey(null); }} style={{ width:"100%", background:COLORS.containerLow, border:`1px solid ${COLORS.primary}`, borderRadius:6, padding:"3px 6px", fontSize:13, color:COLORS.text, outline:"none" }} />
                                  : <span onClick={() => setEditingPlannedKey(tKey)} title="Click to set planned budget" style={{ fontSize: 13, color: monthItemBudgets[tKey] ? COLORS.subtext : COLORS.muted, cursor: "text", display:"block", borderRadius:4, padding:"2px 4px", fontFamily: monthItemBudgets[tKey] ? "var(--font-num)" : "inherit", fontVariantNumeric: "tabular-nums", letterSpacing: monthItemBudgets[tKey] ? "-0.01em" : "normal" }}>{monthItemBudgets[tKey] ? fmt(monthItemBudgets[tKey]) : "—"}</span>
                                }
                                </div>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                                <button onClick={() => { setNewExp(p => ({ ...p, label: item, category: group.catId })); setModal("addExpense"); }}
                                  style={{ background: "none", border: "none", color: COLORS.primary, cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }} title="Add actual expense">
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
                                </button>
                              </div>
                              );
                            })}
                            {/* Add row button — appears on group hover */}
                            <button className="cat-add-btn" onClick={() => { setNewExp(p => ({ ...p, label: "", category: group.catId })); setModal("addExpense"); }}
                              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${COLORS.border}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: COLORS.muted, fontSize: 12, marginTop: 4, transition: "opacity .18s, border-color .18s, color .18s" }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Add {group.label} item
                            </button>
                          </div>
                          </div>{/* overflow:hidden wrapper */}
                        </div>{/* grid-rows wrapper */}
                      </div>
                    );
                  })}

                  {/* + Add category row */}
                  <button
                    onClick={() => {
                      const name = prompt("New category name?");
                      if (!name) return;
                      const trimmed = name.trim();
                      if (!trimmed) return;
                      const catId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                      setCustomCategories(prev => [...prev, { catId, label: trimmed, icon: "label", templateItems: [] }]);
                      setCollapsedCategories(prev => ({ ...prev, [catId]: false }));
                      showToast(`Added "${trimmed}"`, "+");
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "transparent", border: `1px dashed ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", marginTop: 8, marginBottom: 6, cursor: "pointer", color: COLORS.subtext, fontSize: 13, fontWeight: FW.semibold, fontFamily: "inherit", transition: "background .15s, border-color .15s, color .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; e.currentTarget.style.background = "rgba(0,120,168,0.04)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.subtext; e.currentTarget.style.background = "transparent"; }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
                    Add category
                  </button>

                  {/* Uncategorized / other expenses */}
                  {(() => {
                    const others = sortExp(viewExpenses.filter(e => !knownCatIds.includes(e.category)));
                    if (others.length === 0) return null;
                    return (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: COLORS.containerLow, borderRadius: 10, marginBottom: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: COLORS.subtext }}>category</span>
                          <span style={{ fontSize: 13, fontWeight: FW.bold, color: COLORS.text }}>Uncategorized</span>
                          <span style={{ fontSize: 11, color: COLORS.muted }}>({others.length})</span>
                        </div>
                        {others.map(e => (
                          <div key={e.id} className="budget-row" style={{ display: "grid", gap: 8, padding: "7px 10px", alignItems: "center", borderRadius: 8, background: "var(--c-container-low)", marginBottom: 2, border: "1px solid var(--c-border)" }}>
                            <EditableText id={e.id} field="label" value={e.label} />
                            <div className="plan-col-hide"><EditableCat id={e.id} field="category" value={e.category} /></div>
                            <div className="plan-col-hide"><EditableDate id={e.id} field="date" value={e.date} /></div>
                            <span className="plan-col-hide" style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                            <EditableNum id={e.id} field="amount" value={e.amount} />
                            <span style={{ fontSize: 12, color: COLORS.muted }}>—</span>
                            <button onClick={() => deleteExpenseFromView(e.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 16, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}>×</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* ── Savings section ── */}
                <div>
                  <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 20, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ padding: "6px 8px", background: "rgba(97,205,253,0.15)", borderRadius: 10 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 17, color: COLORS.primary }}>savings</span>
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: FW.bold, color: COLORS.text }}>Savings Goals</h3>
                        {savingsItems.length > 0 && <span style={{ fontSize: 11, color: COLORS.muted }}>({savingsItems.length})</span>}
                      </div>
                      <button onClick={() => { setSavingsItems(prev => [...prev, { id: Date.now(), label: "New Goal", expected: 100, actual: 0 }]); showToast("Savings goal added"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", gap: 4, color: COLORS.primary, fontSize: 12, fontWeight: FW.semibold }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
                        <span>Add goal</span>
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: savingsItems.length > 1 ? "repeat(auto-fill, minmax(260px, 1fr))" : "1fr", gap: 14 }}>
                      {savingsItems.length === 0 && (
                        <div style={{ textAlign: "center", padding: "24px 0", gridColumn: "1 / -1" }}>
                          <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>No savings goals yet.</p>
                          <p style={{ fontSize: 12, color: COLORS.muted }}>Tap <strong>+ Add goal</strong> to start — house, vacation, emergency fund.</p>
                        </div>
                      )}
                      {savingsItems.map(s => {
                        const goalReached = s.expected > 0 && s.actual >= s.expected;
                        const savPct = pct(s.actual, s.expected || 1);
                        return (
                        <div key={s.id} style={{ padding: 14, background: "var(--c-container-low)", border: "1px solid var(--c-border)", borderRadius: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <SavText id={s.id} field="label" value={s.label} style={{ fontSize: 13, fontWeight: FW.semibold, color: COLORS.text }} />
                            <button onClick={() => { setSavingsItems(prev => prev.filter(x => x.id !== s.id)); showToast(`${s.label} goal removed`, "✕"); }} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 14, padding: 0 }}>×</button>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                            <span style={{ fontSize: 18, fontWeight: FW.extrabold, color: goalReached ? COLORS.success : COLORS.primary, fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum","ss01"', letterSpacing: "-0.02em" }}>{fmt(s.actual)}</span>
                            <span style={{ fontSize: 12, color: COLORS.muted, fontFamily: "var(--font-num)", fontVariantNumeric: "tabular-nums" }}>
                              /&nbsp;
                              <SavText id={s.id} field="expected" value={s.expected} style={{ fontSize: 12, color: COLORS.muted, display: "inline" }} />
                            </span>
                          </div>
                          <div style={{ height: 6, background: COLORS.containerLow, borderRadius: 9999, overflow: "hidden", marginBottom: goalReached ? 6 : 10 }}>
                            <div style={{ width: `${savPct}%`, height: "100%", background: goalReached ? COLORS.success : COLORS.primary, borderRadius: 9999, transition: "width 400ms cubic-bezier(0.22, 1, 0.36, 1)" }} />
                          </div>
                          {goalReached && <p style={{ fontSize: 11, color: COLORS.success, fontWeight: FW.bold, marginBottom: 8 }}>🎉 Goal reached!</p>}
                          {addingSavingsId === s.id
                            ? <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                                <input id={`sav-inp-${s.id}`} autoFocus type="number" placeholder={savingsMode === "add" ? "Contribute" : "Withdraw"} style={{ flex:1, background:COLORS.containerLow, border:"none", borderRadius:8, padding:"5px 8px", fontSize:12, color:COLORS.text, outline:"none" }} onKeyDown={e=>{if(e.key==="Escape"){ setAddingSavingsId(null); setSavingsMode(null); }}} />
                                <button onClick={()=>{ const v=parseFloat(document.getElementById(`sav-inp-${s.id}`)?.value)||0; if(v>0){ if(savingsMode==="add"){ updateSavingsField(s.id,"actual",s.actual+v); setExpenses(prev=>[...prev,{id:Date.now(),label:`${s.label} savings`,amount:v,category:"Savings",date:new Date().toISOString().slice(0,10),fixed:false}]); showToast(`Contributed ${fmt(v)} to ${s.label}`); } else { updateSavingsField(s.id,"actual",Math.max(0,s.actual-v)); showToast(`Withdrew ${fmt(v)} from ${s.label}`, "−"); } } setAddingSavingsId(null); setSavingsMode(null); }} style={{background:savingsMode==="add"?COLORS.primary:`rgba(172,49,73,0.12)`,color:savingsMode==="add"?"#fff":COLORS.danger,border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:FW.bold,cursor:"pointer"}}>✓</button>
                                <button onClick={()=>{ setAddingSavingsId(null); setSavingsMode(null); }} style={{background:"none",border:"none",color:COLORS.muted,cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
                              </div>
                            : <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => { setAddingSavingsId(s.id); setSavingsMode("add"); }} style={{ flex:1, background: `rgba(0,103,136,0.09)`, border:"none", borderRadius:8, padding:"6px 0", fontSize:12, fontWeight:FW.bold, color:COLORS.primary, cursor:"pointer" }}>+ Contribute</button>
                                <button onClick={() => { setAddingSavingsId(s.id); setSavingsMode("remove"); }} style={{ flex:0.6, background: `rgba(172,49,73,0.08)`, border:"none", borderRadius:8, padding:"6px 0", fontSize:12, fontWeight:FW.bold, color:COLORS.danger, cursor:"pointer" }}>− Withdraw</button>
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
        {/* ── FIXED TAB ── */}
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
                  <h2 style={{ fontSize: 24, fontWeight: FW.extrabold, color: COLORS.sidebarText, letterSpacing: "-0.02em", marginBottom: 4 }}>Fixed Expenses</h2>
                  <p style={{ fontSize: 14, color: COLORS.subtext }}>Upcoming fixed expenses and payment schedule</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); setBillLinkToast(true); setTimeout(() => setBillLinkToast(false), 2000); }} title="Copy link to this month" style={{ background: billLinkToast ? COLORS.success + "18" : COLORS.containerLow, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: FW.semibold, color: billLinkToast ? COLORS.success : COLORS.subtext, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link</span><span className="bill-copy-label">{billLinkToast ? "Link copied!" : "Copy link"}</span>
                  </button>
                  <button className="add-fixed-btn" onClick={() => setModal("addBill")} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.primary, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: FW.bold, cursor: "pointer" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span><span className="add-fixed-label">Add Fixed Expense</span>
                  </button>
                </div>
              </div>

              {/* ── Hero progress ring + key numbers ── */}
              {(() => {
                const nowR = new Date(); nowR.setHours(0,0,0,0);
                const in7 = new Date(nowR.getTime() + 7 * 86400000);
                const overdueCount = bills.filter(b => { if (getBillPaid(b, calMk)) return false; const [y3,m3,d3] = getBillDueDate(b, calMk).split("-").map(Number); return new Date(y3,m3-1,d3) < nowR; }).length;
                const dueSoonCount = bills.filter(b => { if (getBillPaid(b, calMk)) return false; const [y3,m3,d3] = getBillDueDate(b, calMk).split("-").map(Number); const dt = new Date(y3,m3-1,d3); return dt >= nowR && dt <= in7; }).length;
                const paidPct = totalBillsBudget > 0 ? Math.min(100, (paidAmountTotal / totalBillsBudget) * 100) : 0;
                const size = 148, stroke = 12, radius = (size - stroke) / 2, circ = 2 * Math.PI * radius;
                const ringColor = paidPct === 100 ? COLORS.success : paidPct >= 60 ? COLORS.primary : overdueCount > 0 ? COLORS.danger : COLORS.primary;
                return (
                  <div className="bill-hero-card" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 24, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 20, display: "grid", gridTemplateColumns: "auto 1fr", gap: 32, alignItems: "center" }}>
                    {/* Ring */}
                    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
                      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--c-border)" strokeWidth={stroke} />
                        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={ringColor} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - (circ * paidPct) / 100} style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.33, 1, 0.68, 1), stroke 300ms ease" }} />
                      </svg>
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <AnimatedNumber value={paidPct} format={(v) => `${Math.round(v)}%`} style={{ fontSize: 30, fontWeight: 300, color: ringColor, fontFamily: "'Manrope', var(--font-num)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", lineHeight: 1 }} />
                        <span style={{ fontSize: 10, fontWeight: FW.bold, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>Paid</span>
                      </div>
                    </div>
                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: FW.bold, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Total Fixed</p>
                        <AnimatedNumber value={totalBillsBudget} format={fmt} style={{ fontSize: 24, fontWeight: 300, color: COLORS.text, fontFamily: "'Manrope', var(--font-num)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", display: "block" }} />
                        <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{bills.length} {bills.length === 1 ? "item" : "items"} this month</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: FW.bold, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Paid</p>
                        <AnimatedNumber value={paidAmountTotal} format={fmt} style={{ fontSize: 24, fontWeight: 300, color: COLORS.success, fontFamily: "'Manrope', var(--font-num)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", display: "block" }} />
                        <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>{bills.filter(b => getBillPaid(b, calMk)).length} of {bills.length} complete</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: FW.bold, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Remaining</p>
                        <AnimatedNumber value={remainingBillsTotal} format={fmt} style={{ fontSize: 24, fontWeight: 300, color: remainingBillsTotal > 0 ? (overdueCount > 0 ? COLORS.danger : COLORS.warning) : COLORS.success, fontFamily: "'Manrope', var(--font-num)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em", display: "block" }} />
                        <p style={{ fontSize: 11, color: overdueCount > 0 ? COLORS.danger : dueSoonCount > 0 ? COLORS.warning : COLORS.muted, marginTop: 4, fontWeight: overdueCount > 0 || dueSoonCount > 0 ? FW.semibold : FW.normal }}>
                          {overdueCount > 0 ? `${overdueCount} overdue` : dueSoonCount > 0 ? `${dueSoonCount} due this week` : "All caught up"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Full-width calendar card ── */}
              <div className="bill-cal-card" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 20, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: FW.bold, color: COLORS.text }}>{MONTH_FULL[calMonth]} {calYear}</h3>
                  <div className="cal-view-toggle" style={{ display: "flex", gap: 4 }}>
                    {[["Month","month"], ["List","list"]].map(([label, val]) => (
                      <button key={val} onClick={() => setBillCalView(val)} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: billCalView === val ? COLORS.primary : COLORS.containerLow, color: billCalView === val ? "#fff" : COLORS.subtext, fontSize: 12, fontWeight: FW.semibold, cursor: "pointer" }}>{label}</button>
                    ))}
                  </div>
                </div>
                {/* Month view */}
                {billCalView === "month" && <div className="cal-month-view">
                  <div className="cal-scroll-wrap" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <div style={{ minWidth: 300 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                      <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: FW.bold, color: COLORS.muted, textTransform: "uppercase", padding: "6px 0" }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                    {Array.from({ length: firstDayOfWeek }, (_, i) => (
                      <div key={`empty-${i}`} className="cal-day-cell" style={{ background: COLORS.containerLow, borderRadius: 8, minHeight: 80, opacity: 0.3 }} />
                    ))}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dayBills = billsOnDay(day);
                      const isToday = day === todayDate;
                      return (
                        <div key={day} className="cal-day-cell" style={{ background: "var(--c-surface)", borderRadius: 10, minHeight: 80, padding: 8, border: "1px solid var(--c-border)" }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: isToday ? COLORS.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: isToday ? FW.extrabold : FW.medium, color: isToday ? "#fff" : COLORS.text }}>{day}</span>
                          </div>
                          {dayBills.map(b => {
                            const bPaidCal = getBillPaid(b, calMk);
                            const colorSet = bPaidCal ? { bg: COLORS.success + "18", text: COLORS.success } : { bg: "rgba(97,205,253,0.15)", text: COLORS.primary };
                            return (
                              <div key={b.id} onClick={() => openBillDetail(b)} style={{ background: colorSet.bg, borderRadius: 4, padding: "2px 6px", marginBottom: 2, cursor: "pointer", border: bPaidCal ? `1px solid ${COLORS.success}40` : "1px solid transparent" }}>
                                <p style={{ fontSize: 10, fontWeight: FW.bold, color: colorSet.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}{bPaidCal ? " ✓" : ""}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  </div>{/* end min-width wrapper */}
                  </div>{/* end cal-scroll-wrap */}
                </div>}
                {/* List view — unified grouped list */}
                {billCalView === "list" && (() => {
                  const nowL = new Date(); nowL.setHours(0,0,0,0);
                  const in7L = new Date(nowL.getTime() + 7 * 86400000);
                  const billsEnriched = bills.map(b => {
                    const due = getBillDueDate(b, calMk);
                    const [y,m,dd] = due.split("-").map(Number);
                    const dt = new Date(y, m-1, dd);
                    const paid = getBillPaid(b, calMk);
                    const overdue = !paid && dt < nowL;
                    const dueSoon = !paid && dt >= nowL && dt <= in7L;
                    return { b, due, dt, paid, overdue, dueSoon };
                  });
                  const overdueGroup = billsEnriched.filter(x => x.overdue).sort((a,b) => a.dt - b.dt);
                  const thisWeekGroup = billsEnriched.filter(x => x.dueSoon).sort((a,b) => a.dt - b.dt);
                  const upcomingGroup = billsEnriched.filter(x => !x.paid && !x.overdue && !x.dueSoon).sort((a,b) => a.dt - b.dt);
                  const paidGroup = billsEnriched.filter(x => x.paid).sort((a,b) => a.dt - b.dt);
                  const sections = [
                    { key: "overdue",  title: "Overdue",        items: overdueGroup,  color: COLORS.danger,  icon: "warning" },
                    { key: "week",     title: "Due This Week",  items: thisWeekGroup, color: COLORS.warning, icon: "schedule" },
                    { key: "upcoming", title: "Upcoming",       items: upcomingGroup, color: COLORS.primary, icon: "event" },
                    { key: "paid",     title: "Paid",           items: paidGroup,     color: COLORS.success, icon: "check_circle" },
                  ].filter(s => s.items.length > 0);
                  const BillRow = ({ b, due, paid, overdue, dueSoon }) => {
                    const [y,m,dd] = due.split("-").map(Number);
                    const daysDiff = Math.round((new Date(y,m-1,dd) - nowL) / 86400000);
                    const relLabel = paid ? "Paid" : daysDiff < 0 ? `${Math.abs(daysDiff)}d overdue` : daysDiff === 0 ? "Due today" : daysDiff === 1 ? "Tomorrow" : `In ${daysDiff}d`;
                    const relColor = paid ? COLORS.success : overdue ? COLORS.danger : dueSoon ? COLORS.warning : COLORS.muted;
                    return (
                      <div
                        key={b.id}
                        onClick={() => openBillDetail(b)}
                        style={{
                          display: "grid", gridTemplateColumns: "auto 1fr auto auto auto", gap: 16, alignItems: "center",
                          padding: "14px 18px", borderRadius: 14, marginBottom: 8, cursor: "pointer",
                          background: paid ? "rgba(16,185,129,0.06)" : overdue ? "rgba(248,113,113,0.06)" : "var(--c-surface)",
                          border: `1px solid ${paid ? "rgba(16,185,129,0.18)" : overdue ? "rgba(248,113,113,0.22)" : "var(--c-border)"}`,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                          transition: "transform .2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .2s, background .2s",
                          viewTransitionName: morphBillId === b.id && !activeBillDetail ? "bill-active" : undefined,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.06)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)"; }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: paid ? `${COLORS.success}18` : overdue ? `${COLORS.danger}18` : `${COLORS.primary}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 19, color: paid ? COLORS.success : overdue ? COLORS.danger : COLORS.primary }}>{paid ? "check" : "receipt_long"}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: FW.bold, color: COLORS.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</p>
                          <p style={{ fontSize: 11, color: COLORS.subtext }}>{fmtDate(due)} · <span style={{ color: relColor, fontWeight: FW.semibold }}>{relLabel}</span></p>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: FW.extrabold, color: COLORS.text, fontFamily: "var(--font-num)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum","ss01"' }}>{fmt(b.budget)}</span>
                        {paid
                          ? <button onClick={(e) => { e.stopPropagation(); markBillPaid(b.id, calMk, false); }} style={{ background: "transparent", border: "1px solid var(--c-border)", borderRadius: 9999, padding: "5px 12px", fontSize: 11, fontWeight: FW.bold, color: COLORS.subtext, cursor: "pointer" }}>Undo</button>
                          : <button onClick={(e) => { e.stopPropagation(); markBillPaid(b.id, calMk); showToast(`${b.label} marked as paid`); }} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 9999, padding: "6px 14px", fontSize: 11, fontWeight: FW.bold, cursor: "pointer", boxShadow: `0 2px 8px ${COLORS.primary}33` }}>Mark Paid</button>
                        }
                        <button onClick={(e) => { e.stopPropagation(); setBills(p => p.filter(x => x.id !== b.id)); showToast(`${b.label} removed`, "✕"); }} aria-label="Delete bill" style={{ background: "transparent", border: "none", color: COLORS.muted, cursor: "pointer", padding: 6, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                        </button>
                      </div>
                    );
                  };
                  return (
                    <div>
                      {bills.length === 0 && <p style={{ fontSize: 14, color: COLORS.muted, padding: "40px 0", textAlign: "center" }}>No fixed expenses yet. Click "Add Fixed Expense" to get started.</p>}
                      {sections.map((sec, i) => (
                        <div key={sec.key} style={{ marginBottom: i === sections.length - 1 ? 0 : 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 4px" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: sec.color }}>{sec.icon}</span>
                            <h4 style={{ fontSize: 11, fontWeight: FW.extrabold, color: sec.color, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>{sec.title}</h4>
                            <span style={{ fontSize: 11, fontWeight: FW.semibold, color: COLORS.muted }}>· {sec.items.length}</span>
                          </div>
                          {sec.items.map(item => <BillRow key={item.b.id} {...item} />)}
                        </div>
                      ))}
                      {/* Inline add row inside list view */}
                      {newBillInline !== null && (
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 1fr auto auto", gap: 10, padding: "14px 18px", borderRadius: 14, background: `${COLORS.primary}0D`, marginTop: 12, alignItems: "center", border: `1px dashed ${COLORS.primary}55` }}>
                          <input autoFocus placeholder="Bill name" value={newBillInline.label} onChange={e => setNewBillInline(p => ({...p, label: e.target.value}))} style={{ ...inpStyleInline, width: "100%" }} />
                          <input type="number" min="1" max="31" placeholder="Day" value={newBillInline.dayOfMonth} onChange={e => setNewBillInline(p => ({...p, dayOfMonth: e.target.value}))} style={{ ...inpStyleInline, width: "100%" }} />
                          <input type="number" placeholder="Amount" value={newBillInline.budget} onChange={e => setNewBillInline(p => ({...p, budget: e.target.value}))} style={{ ...inpStyleInline, width: "100%" }} />
                          <button onClick={() => { if(!newBillInline.label || !newBillInline.budget) return; setBills(p => [...p, { id: Date.now(), label: newBillInline.label, budget: parseFloat(newBillInline.budget)||0, dayOfMonth: parseInt(newBillInline.dayOfMonth)||1 }]); showToast(`Fixed expense "${newBillInline.label}" added`); setNewBillInline(null); }} style={{ background: COLORS.primary, color:"#fff", border:"none", borderRadius:9999, padding:"7px 14px", fontSize:12, fontWeight:FW.bold, cursor:"pointer" }}>Save</button>
                          <button onClick={() => setNewBillInline(null)} aria-label="Cancel" style={{ background:"none", border:"none", color:COLORS.muted, cursor:"pointer", display: "flex", alignItems: "center", padding: 4 }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span></button>
                        </div>
                      )}
                      {newBillInline === null && bills.length > 0 && (
                        <button onClick={() => setNewBillInline({ label: "", budget: "", dayOfMonth: "" })} style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "transparent", border: "1px dashed var(--c-border)", borderRadius: 14, padding: "12px", fontSize: 12, fontWeight: FW.semibold, color: COLORS.subtext, cursor: "pointer", transition: "background .2s, color .2s" }} onMouseEnter={e => { e.currentTarget.style.background = `${COLORS.primary}0D`; e.currentTarget.style.color = COLORS.primary; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = COLORS.subtext; }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Add a fixed expense
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}
        {/* ── MONTHLY INSIGHTS TAB ── */}
        {tab === "insights" && (() => {
          const key = activeInsightKey;
          const { month0, year } = parseKey(key);
          const snap = getSnap(key);
          const s = monthStats(key);
          const prevKey = monthKey(year, month0 - 1);
          const prevS = monthStats(prevKey);
          const isCurrent = key === todayKey;
          const savingsRate = s.inc > 0 ? Math.max(0, (s.net / s.inc) * 100) : null;
          const fixedPct = s.inc > 0 ? Math.round((s.cats["Housing"] || 0) + (s.cats["Utilities"] || 0) + (s.cats["Transport"] || 0) + (s.cats["Health"] || 0)) / s.inc * 100 : null;

          // ── Year trend data for AreaChart ──────────────────────────────
          const yearChartData = allInsightMonths.map(mk => {
            const ms = monthStats(mk);
            const { month0: m0 } = parseKey(mk);
            return {
              month: MONTH_NAMES[m0],
              Income: ms.hasData && ms.inc > 0 ? ms.inc : null,
              Expenses: ms.hasData && ms.exp > 0 ? ms.exp : null,
            };
          });

          // ── Category donut data ────────────────────────────────────────
          const catPieData = CATEGORIES
            .filter(c => (s.cats[c.id] || 0) > 0)
            .sort((a, b) => (s.cats[b.id] || 0) - (s.cats[a.id] || 0))
            .map(c => ({ name: c.label, value: s.cats[c.id] || 0, color: CAT_CHART_COLOR[c.id] || COLORS.muted }));

          // ── 50/30/20 ──────────────────────────────────────────────────
          const needsAmt = snap.expenses.filter(e => ["Housing","Utilities","Food","Transport","Health"].includes(e.category)).reduce((acc,e)=>acc+e.amount,0);
          const wantsAmt = snap.expenses.filter(e => ["Entertainment","Personal","Kids","Education","Subscriptions","Travel"].includes(e.category)).reduce((acc,e)=>acc+e.amount,0);
          const savingsAmt = snap.expenses.filter(e => ["Other","Savings"].includes(e.category)).reduce((acc,e)=>acc+e.amount,0);

          // ── 3-bar spending mix trend ───────────────────────────────────
          const spendingMixData = allInsightMonths.map(mk => {
            const ms = monthStats(mk);
            const mSnap = getSnap(mk);
            const { month0: m0 } = parseKey(mk);
            if (!ms.hasData) return { month: MONTH_NAMES[m0], Fixed: null, Variable: null, Savings: null };
            const fixedAmt = mSnap.expenses.filter(e => ["Housing","Utilities","Transport","Health"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
            const variableAmt = mSnap.expenses.filter(e => ["Food","Entertainment","Personal","Kids","Education","Subscriptions","Travel","Other"].includes(e.category)).reduce((s,e)=>s+e.amount,0);
            const savAmt = mSnap.expenses.filter(e => e.category === "Savings").reduce((s,e)=>s+e.amount,0);
            return { month: MONTH_NAMES[m0], Fixed: fixedAmt || null, Variable: variableAmt || null, Savings: savAmt || null };
          }).filter(d => d.Fixed !== null || d.Variable !== null || d.Savings !== null);

          // ── Shared glass card style ────────────────────────────────────
          const glassCard = { background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" };

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* ── Header ──────────────────────────────────────────────── */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontWeight: FW.extrabold, fontSize: 24, color: COLORS.sidebarText, letterSpacing: "-0.03em", marginBottom: 3 }}>Monthly Insights</h2>
                  <p style={{ color: COLORS.subtext, fontSize: 13 }}>Use the month picker above to explore</p>
                </div>
                <button
                  onClick={() => generateInsight(key)}
                  disabled={!s.hasData || insightLoading[key]}
                  style={{ background: s.hasData ? `linear-gradient(135deg, ${COLORS.accentPurple}22, ${COLORS.accentPurple}11)` : "rgba(0,0,0,0.04)", border: `1px solid ${COLORS.accentPurple}44`, color: s.hasData ? COLORS.accentPurple : COLORS.muted, borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: FW.bold, cursor: s.hasData ? "pointer" : "not-allowed", opacity: s.hasData ? 1 : 0.45, display: "flex", alignItems: "center", gap: 8, transition: "all 0.18s ease" }}
                >
                  {insightLoading[key]
                    ? <><div style={{ width: 12, height: 12, border: `2px solid ${COLORS.accentPurple}44`, borderTopColor: COLORS.accentPurple, borderRadius: "50%", animation: "spin 1s linear infinite" }} />Analyzing…</>
                    : <>✦ AI Insights</>}
                </button>
              </div>

              {/* ── AI insight panel ─────────────────────────────────────── */}
              {insightText[key] && (
                <div style={{ ...glassCard, padding: "18px 20px", background: `linear-gradient(135deg, ${COLORS.accentPurple}10, ${COLORS.accentPurple}06)`, border: `1px solid ${COLORS.accentPurple}33` }}>
                  <p style={{ fontSize: 11, fontWeight: FW.extrabold, color: COLORS.accentPurple, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>✦ Claude's Analysis · {MONTH_FULL[month0]}</p>
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.75 }}>{renderMd(insightText[key])}</div>
                </div>
              )}

              {/* ── No data empty state ──────────────────────────────────── */}
              {!s.hasData ? (
                <div style={{ ...glassCard, padding: 48, textAlign: "center" }}>
                  <p style={{ fontSize: 36, marginBottom: 12 }}>📭</p>
                  <p style={{ fontWeight: FW.bold, fontSize: 16, color: COLORS.text, marginBottom: 6, fontFamily: "'Manrope', sans-serif" }}>No data for {MONTH_FULL[month0]}</p>
                  <p style={{ color: COLORS.muted, fontSize: 13, lineHeight: 1.6 }}>Switch to this month and add income or expenses<br />using the + button — they'll appear here automatically.</p>
                </div>
              ) : (
                <>
                  {/* ── Hero metrics band ────────────────────────────────── */}
                  <div style={{ ...glassCard, padding: "22px 28px", borderRadius: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: FW.medium, fontSize: 15, color: COLORS.text, letterSpacing: "-0.01em" }}>{MONTH_FULL[month0]} {year}</span>
                      {isCurrent && <span style={{ fontSize: 11, fontWeight: FW.medium, color: COLORS.primary }}>Current month</span>}
                    </div>
                    <div className="metric-band-grid" style={{ display: "grid", gap: 0 }}>
                      {[
                        { label: "Income",       value: s.inc,       fmtFn: fmt,                                                                color: COLORS.success },
                        { label: "Expenses",     value: s.exp,       fmtFn: fmt,                                                                color: COLORS.accentWarm },
                        { label: "Net",          value: s.net,       fmtFn: fmt,                                                                color: s.net >= 0 ? COLORS.success : COLORS.danger },
                        { label: "Savings Rate", value: savingsRate, fmtFn: (v) => v !== null && Number.isFinite(v) ? `${v.toFixed(1)}%` : "—", color: COLORS.accentPurple, netDiff: prevS.hasData ? s.net - prevS.net : null },
                      ].map((metric, i) => {
                        const isLast = i === 3;
                        const prevVal = i < 3 && prevS.hasData ? [prevS.inc, prevS.exp, prevS.net][i] : null;
                        const diff = metric.netDiff !== undefined ? metric.netDiff : (prevVal !== null ? metric.value - prevVal : null);
                        const higherIsGood = metric.label !== "Expenses";
                        const isPos = diff !== null && diff !== 0 && (higherIsGood ? diff > 0 : diff < 0);
                        return (
                          <div key={metric.label} style={{ paddingRight: isLast ? 0 : 20, marginRight: isLast ? 0 : 20, borderRight: isLast ? "none" : "1px solid var(--c-border)" }}>
                            <p style={{ fontSize: 10, fontWeight: FW.medium, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{metric.label}</p>
                            <AnimatedNumber value={metric.value ?? 0} format={metric.fmtFn} style={{ fontSize: 24, fontWeight: 300, color: metric.color, fontFamily: "'Manrope', var(--font-num)", letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums", lineHeight: 1, display: "block" }} />
                            {diff !== null && diff !== 0 && (
                              <p style={{ fontSize: 10, color: isPos ? COLORS.success : COLORS.danger, marginTop: 6, fontWeight: FW.medium }}>
                                {isPos ? "▲" : "▼"} {fmt(Math.abs(diff))} vs {MONTH_NAMES[parseKey(prevKey).month0]}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Chart row: Year trend + Category donut ───────────── */}
                  <div className="insights-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                    {/* Year trend AreaChart */}
                    <div style={{ ...glassCard, padding: "20px 20px 12px" }}>
                      <h4 style={{ fontWeight: FW.bold, fontSize: 13, color: COLORS.text, marginBottom: 4, letterSpacing: "-0.01em" }}>Income vs Expenses — 2026</h4>
                      <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 16 }}>Click a month on the chart to explore it</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart data={yearChartData} onClick={d => { if (d?.activeLabel) { const idx = MONTH_NAMES.indexOf(d.activeLabel); if (idx !== -1) setViewMonthKey(monthKey(2026, idx)); } }} style={{ cursor: "pointer" }}>
                          <defs>
                            <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.18} />
                              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.accentWarm} stopOpacity={0.16} />
                              <stop offset="95%" stopColor={COLORS.accentWarm} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 10, fill: COLORS.muted }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: COLORS.muted }} axisLine={false} tickLine={false} width={38} />
                          <Tooltip
                            formatter={(v, name) => [fmt(v), name]}
                            contentStyle={{ background: "var(--c-glass-inset)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}
                            cursor={{ stroke: COLORS.primary, strokeWidth: 1, strokeDasharray: "4 4" }}
                          />
                          <Area type="monotone" dataKey="Income" stroke={COLORS.primary} strokeWidth={2} fill="url(#incGrad)" dot={{ r: 3, fill: COLORS.primary, strokeWidth: 0 }} activeDot={{ r: 5, fill: COLORS.primary }} connectNulls={false} />
                          <Area type="monotone" dataKey="Expenses" stroke={COLORS.accentWarm} strokeWidth={2} fill="url(#expGrad)" dot={{ r: 3, fill: COLORS.accentWarm, strokeWidth: 0 }} activeDot={{ r: 5, fill: COLORS.accentWarm }} connectNulls={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Category donut PieChart */}
                    <div style={{ ...glassCard, padding: "20px 20px 16px" }}>
                      <h4 style={{ fontWeight: FW.bold, fontSize: 13, color: COLORS.text, marginBottom: 4, letterSpacing: "-0.01em" }}>Spending by Category</h4>
                      <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>{MONTH_FULL[month0]} · {fmt(s.exp)} total</p>
                      {catPieData.length === 0 ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: COLORS.muted, fontSize: 13 }}>No expenses recorded</div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <ResponsiveContainer width={160} height={160}>
                            <PieChart>
                              <Pie data={catPieData} cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={0}>
                                {catPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                              </Pie>
                              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                            {catPieData.slice(0, 6).map(entry => (
                              <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: COLORS.subtext, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</span>
                                <span style={{ fontSize: 11, fontWeight: FW.semibold, color: COLORS.text, fontVariantNumeric: "tabular-nums" }}>{s.exp > 0 ? Math.round((entry.value / s.exp) * 100) : 0}%</span>
                              </div>
                            ))}
                            {catPieData.length > 6 && (
                              <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>+{catPieData.length - 6} more</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Lower row: 50/30/20 + Debt snapshot ─────────────── */}
                  <div className="insights-two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                    {/* 50/30/20 */}
                    <div style={{ ...glassCard, padding: "20px 22px" }}>
                      <h4 style={{ fontWeight: FW.bold, fontSize: 13, color: COLORS.text, marginBottom: 4, letterSpacing: "-0.01em" }}>50 / 30 / 20 Rule</h4>
                      <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14 }}>Based on {fmt(s.inc)} income</p>
                      {s.inc === 0 ? (
                        <p style={{ color: COLORS.muted, fontSize: 13 }}>Add income to see your breakdown.</p>
                      ) : (() => {
                        const needsP   = s.inc > 0 ? Math.round(needsAmt / s.inc * 100) : 0;
                        const wantsP   = s.inc > 0 ? Math.round(wantsAmt / s.inc * 100) : 0;
                        const savingsP = s.inc > 0 ? Math.round(savingsAmt / s.inc * 100) : 0;
                        return (
                          <>
                            {/* ── At-a-glance comparison ── */}
                            <div style={{ background: "var(--c-container-low)", borderRadius: 12, padding: "12px 14px", marginBottom: 18 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: FW.medium, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your split this month</span>
                              </div>
                              <p style={{ fontSize: 13, fontWeight: FW.medium, color: COLORS.text, marginBottom: 6 }}>
                                <span style={{ color: COLORS.accentBlue }}>Needs {needsP}%</span>
                                <span style={{ color: COLORS.muted, margin: "0 6px" }}>·</span>
                                <span style={{ color: COLORS.accentPurple }}>Wants {wantsP}%</span>
                                <span style={{ color: COLORS.muted, margin: "0 6px" }}>·</span>
                                <span style={{ color: COLORS.success }}>Savings {savingsP}%</span>
                              </p>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              {[
                                { label: "Needs", target: 50, val: needsAmt, targetAmt: s.inc * 0.5, color: COLORS.accentBlue },
                                { label: "Wants", target: 30, val: wantsAmt, targetAmt: s.inc * 0.3, color: COLORS.accentPurple },
                                { label: "Savings", target: 20, val: savingsAmt, targetAmt: s.inc * 0.2, color: COLORS.success },
                              ].map(b => {
                                const actualPct = b.targetAmt > 0 ? Math.min(100, (b.val / b.targetAmt) * 100) : 0;
                                const overBudget = b.val > b.targetAmt && b.targetAmt > 0;
                                return (
                                  <div key={b.label}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                                      <div>
                                        <span style={{ fontSize: 13, fontWeight: FW.semibold, color: COLORS.text }}>{b.label}</span>
                                        <span style={{ fontSize: 10, color: COLORS.muted, marginLeft: 6 }}>({b.target}% target)</span>
                                      </div>
                                      <div style={{ textAlign: "right" }}>
                                        <span style={{ fontSize: 13, fontWeight: FW.bold, color: overBudget ? COLORS.danger : COLORS.text }}>{fmt(b.val)}</span>
                                        <span style={{ fontSize: 10, color: COLORS.muted }}> / {fmt(b.targetAmt)}</span>
                                      </div>
                                    </div>
                                    <div style={{ height: 7, background: "var(--c-border)", borderRadius: 999, overflow: "hidden" }}>
                                      <div style={{ width: `${actualPct}%`, height: "100%", background: overBudget ? COLORS.danger : b.color, borderRadius: 999, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                      {/* Notes */}
                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--c-border)" }}>
                        <p style={{ fontSize: 11, fontWeight: FW.semibold, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Month Notes</p>
                        <textarea
                          value={snap.notes || ""}
                          onChange={e => updateSnapNotes(key, e.target.value)}
                          placeholder="Add notes for this month…"
                          rows={3}
                          style={{ ...inputStyle, resize: "none", fontSize: 12, lineHeight: 1.6, width: "100%" }}
                        />
                      </div>
                    </div>

                    {/* ── Spending Mix BarChart ── */}
                    <div style={{ ...glassCard, padding: "20px 22px" }}>
                      <h4 style={{ fontWeight: FW.bold, fontSize: 13, color: COLORS.text, marginBottom: 3, letterSpacing: "-0.01em" }}>Spending Mix · {year}</h4>
                      <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 16 }}>Fixed · Variable · Savings — watch fixed shrink over time</p>
                      {spendingMixData.length === 0 ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160, color: COLORS.muted, fontSize: 13 }}>No data yet — add some expenses to get started</div>
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={spendingMixData} barSize={10} barGap={3} barCategoryGap="35%">
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                              <XAxis dataKey="month" tick={{ fontSize: 10, fill: COLORS.muted, fontWeight: 300 }} axisLine={false} tickLine={false} />
                              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: COLORS.muted }} axisLine={false} tickLine={false} width={36} />
                              <Tooltip formatter={(v, name) => [fmt(v), name]} contentStyle={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
                              <Bar dataKey="Fixed" fill="oklch(60% 0.04 200)" radius={[3,3,0,0]} />
                              <Bar dataKey="Variable" fill={COLORS.accentWarm} radius={[3,3,0,0]} />
                              <Bar dataKey="Savings" fill={COLORS.success} radius={[3,3,0,0]} />
                            </BarChart>
                          </ResponsiveContainer>
                          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                            {[
                              { label: "Fixed",    color: "oklch(60% 0.04 200)" },
                              { label: "Variable", color: COLORS.accentWarm },
                              { label: "Savings",  color: COLORS.success },
                            ].map(l => (
                              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                                <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 300 }}>{l.label}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Year summary stats ───────────────────────────────── */}
                  {(() => {
                    const allStats = allInsightMonths.map(k => monthStats(k));
                    const totalInc = allStats.reduce((acc, m) => acc + m.inc, 0);
                    const totalExp = allStats.reduce((acc, m) => acc + m.exp, 0);
                    const monthsWithData = allStats.filter(m => m.hasData).length;
                    const avgMonthlyExp = monthsWithData > 0 ? totalExp / monthsWithData : 0;
                    const netSaved = totalInc - totalExp;
                    return (
                      <div style={{ ...glassCard, padding: "18px 22px" }}>
                        <h4 style={{ fontWeight: FW.bold, fontSize: 13, color: COLORS.text, marginBottom: 16, letterSpacing: "-0.01em" }}>Year-at-a-Glance · 2026</h4>
                        <div className="year-glance-grid" style={{ display: "grid", gap: 0 }}>
                          {[
                            { label: "Total Income",    val: fmt(totalInc),    color: COLORS.success },
                            { label: "Total Expenses",  val: fmt(totalExp),    color: COLORS.accentWarm },
                            { label: "Net Saved",       val: fmt(netSaved),    color: netSaved >= 0 ? COLORS.success : COLORS.danger },
                            { label: "Avg / Month",     val: fmt(avgMonthlyExp), color: COLORS.accentPurple },
                          ].map((stat, i) => (
                            <div key={stat.label} className="year-glance-cell" style={{ paddingRight: i < 3 ? 20 : 0, marginRight: i < 3 ? 20 : 0, borderRight: i < 3 ? "1px solid var(--c-border)" : "none" }}>
                              <p style={{ fontSize: 10, fontWeight: FW.bold, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{stat.label}</p>
                              <p className="year-glance-val" style={{ fontSize: 22, fontWeight: 300, color: stat.color, fontFamily: "'Manrope', var(--font-num)", letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}>{stat.val}</p>
                              {monthsWithData > 0 && <p style={{ fontSize: 10, color: COLORS.muted, marginTop: 3 }}>{monthsWithData} months tracked</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

            </div>
          );
        })()}

        {/* ── ADVISOR TAB ── */}
        {tab === "advisor" && (() => {
          return (
            <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>
              {/* Page header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(140deg, ${COLORS.primary}, #0095d2)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#fff", fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 300, color: COLORS.text, letterSpacing: "-0.03em", margin: 0 }}>AI Advisor</h2>
                    <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>Ask anything about your budget, spending, or goals</p>
                  </div>
                  {advisorHistory.length > 0 && (
                    <button onClick={() => setAdvisorHistory([])} style={{ marginLeft: "auto", fontSize: 11, background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "4px 12px", color: COLORS.muted, cursor: "pointer" }}>Clear chat</button>
                  )}
                </div>
              </div>

              {/* Chat area */}
              <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 480 }}>
                <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, minHeight: 0 }}>
                  {advisorHistory.length === 0 && (
                    <div>
                      <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12 }}>Try asking:</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {[
                          { icon: "shopping_cart", label: "How's our grocery spending?" },
                          { icon: "trending_down", label: "Where can we cut back?" },
                          { icon: "flag", label: "Am I on track for my goals?" },
                          { icon: "savings", label: "How are our savings goals?" },
                          { icon: "insights", label: "Summarize this month" },
                          { icon: "account_balance", label: "How do we compare to 50/30/20?" },
                        ].map(chip => (
                          <button key={chip.label} onClick={() => { setAdvisorMsg(chip.label); handleAdvisor(chip.label); }} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                            background: "var(--c-container-low)", border: "1px solid var(--c-border)", borderRadius: 9999, cursor: "pointer",
                            fontSize: 12, fontWeight: FW.semibold, color: COLORS.text,
                            transition: "border-color .15s, color .15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.color = COLORS.text; }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "inherit" }}>{chip.icon}</span>
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {advisorHistory.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 10, alignItems: "flex-start" }}>
                      {msg.role === "assistant" && (
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#fff", fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        </div>
                      )}
                      <div style={{
                        background: msg.role === "user" ? COLORS.containerHighest : "var(--c-container-low)",
                        borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                        padding: "12px 16px", maxWidth: "75%", color: COLORS.text,
                      }}>
                        {msg.role === "assistant" ? renderMd(msg.content) : <p style={{ fontSize: 13, lineHeight: 1.65, margin: 0 }}>{msg.content}</p>}
                      </div>
                    </div>
                  ))}
                  {advisorLoading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#fff", fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      </div>
                      <div style={{ background: "var(--c-container-low)", borderRadius: "4px 14px 14px 14px", padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          {[0,1,2].map(j => <div key={j} style={{ width: 7, height: 7, background: COLORS.primary, borderRadius: "50%", animation: `typing-dot 1.2s ${j*0.18}s cubic-bezier(0.4, 0, 0.2, 1) infinite` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid var(--c-border)", background: "var(--c-container-low)", flexShrink: 0 }}>
                  {advisorFile && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "4px 10px", background: `rgba(0,103,136,0.1)`, borderRadius: 8, width: "fit-content" }}>
                      <span style={{ fontSize: 12, color: COLORS.primary }}>📎 {advisorFile.name}</span>
                      <button onClick={() => setAdvisorFile(null)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer" }}>×</button>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--c-surface)", borderRadius: 12, padding: "8px 8px 8px 16px", border: `1px solid var(--c-border)` }}>
                    <input
                      value={advisorMsg}
                      onChange={e => setAdvisorMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdvisor(); } }}
                      placeholder="Ask about your finances, goals, or spending..."
                      style={{ flex: 1, background: "transparent", border: "none", fontSize: 13, color: COLORS.text, outline: "none" }}
                    />
                    <input ref={advisorFileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => setAdvisorFile(e.target.files[0])} />
                    <button onClick={() => advisorFileRef.current?.click()} style={{ width: 34, height: 34, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: COLORS.subtext }}>attach_file</span>
                    </button>
                    <button onClick={handleAdvisor} disabled={advisorLoading} style={{ width: 40, height: 40, background: COLORS.primary, border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#fff" }}>arrow_upward</span>
                    </button>
                  </div>
                  <p style={{ fontSize: 10, textAlign: "center", marginTop: 6, color: COLORS.muted }}>AI can make mistakes. Verify important financial decisions.</p>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
      {/* ── Bill detail popover ── rendered at top level so it's available from any tab (dashboard carousel, bills list, etc.) */}
      {activeBillDetail && (() => {
        const b = bills.find(x => x.id === activeBillDetail.id) || activeBillDetail;
        const billMk = viewMonthKey;
        const bDueDatePop = getBillDueDate(b, billMk);
        const [y2,m2,d2] = bDueDatePop.split("-").map(Number);
        const isPast = new Date(y2,m2-1,d2) < new Date(new Date().toDateString());
        const bPaidPop = getBillPaid(b, billMk);
        const popInpStyle = { background: COLORS.containerLow, border: `1px solid ${COLORS.primary}`, borderRadius: 8, padding: "4px 10px", fontSize: 14, color: COLORS.text, outline: "none", textAlign: "right" };
        const isELabel = editingBillCell?.id === b.id && editingBillCell?.field === "label";
        const isEAmt = editingBillCell?.id === b.id && editingBillCell?.field === "budget";
        const isEDate = editingBillCell?.id === b.id && editingBillCell?.field === "dueDate";
        return (
          <div onClick={() => { closeBillDetail(); setEditingBillCell(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.30)", backdropFilter: "blur(12px) saturate(140%)", WebkitBackdropFilter: "blur(12px) saturate(140%)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 24, padding: 32, minWidth: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", viewTransitionName: "bill-active" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "flex-start" }}>
                {isELabel
                  ? <input autoFocus defaultValue={b.label} style={{ ...popInpStyle, textAlign: "left", fontSize: 18, fontWeight: FW.extrabold, flex: 1, marginRight: 8 }} onBlur={e => { setBills(p => p.map(x => x.id === b.id ? {...x, label: e.target.value || x.label} : x)); setEditingBillCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingBillCell(null); }} />
                  : <h3 onClick={() => setEditingBillCell({id: b.id, field: "label"})} title="Click to edit" style={{ fontSize: 18, fontWeight: FW.extrabold, color: COLORS.text, cursor: "text", flex: 1 }}>{b.label}</h3>
                }
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setBills(p => p.filter(x => x.id !== b.id)); closeBillDetail(); setEditingBillCell(null); }} title="Delete" style={{ background: COLORS.danger + "18", border: "none", color: COLORS.danger, borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                  <button onClick={() => { closeBillDetail(); setEditingBillCell(null); }} style={{ background: COLORS.containerHigh, border: "none", fontSize: 20, cursor: "pointer", color: COLORS.muted, borderRadius: 8, width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: COLORS.subtext }}>Amount</span>
                  {isEAmt
                    ? <input autoFocus type="number" defaultValue={b.budget} style={popInpStyle} onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) setBills(p => p.map(x => x.id === b.id ? {...x, budget: v} : x)); setEditingBillCell(null); }} onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingBillCell(null); }} />
                    : <span onClick={() => setEditingBillCell({id: b.id, field: "budget"})} title="Click to edit" style={{ fontSize: 14, fontWeight: FW.bold, color: COLORS.text, cursor: "text" }}>{fmt(b.budget)}</span>
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
                  <span style={{ fontSize: 13, fontWeight: FW.bold, color: bPaidPop ? COLORS.success : isPast ? COLORS.danger : COLORS.subtext }}>{bPaidPop ? "Paid ✓" : isPast ? "Overdue" : "Upcoming"}</span>
                </div>
              </div>
              {!bPaidPop && <button onClick={() => { markBillPaid(b.id, billMk); closeBillDetail(); }} style={{ width: "100%", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: FW.bold, cursor: "pointer" }}>Mark as Paid</button>}
            </div>
          </div>
        );
      })()}
      {/* ── MODALS ── */}
      {modal === "addMenu" && <SmartAddModal
        onClose={() => setModal(null)}
        onManualExpense={() => setModal("addExpense")}
        onManualIncome={() => setModal("addIncome")}
        existingExpenses={expenses}
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
                <button key={t} onClick={() => setNewExp(p => ({ ...p, fixed: t === "Fixed" }))} style={{ flex: 1, background: (t === "Fixed") === newExp.fixed ? COLORS.accentBlue + "22" : COLORS.inputBg, border: `1px solid ${(t === "Fixed") === newExp.fixed ? COLORS.accentBlue : COLORS.border}`, color: (t === "Fixed") === newExp.fixed ? COLORS.accentBlue : COLORS.muted, borderRadius: 10, padding: "10px", fontWeight: FW.semibold, cursor: "pointer" }}>{t}</button>
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
                <button key={t} onClick={() => setNewInc(p => ({ ...p, recurring: t === "Yes" }))} style={{ flex: 1, background: (t === "Yes") === newInc.recurring ? COLORS.accent + "22" : COLORS.inputBg, border: `1px solid ${(t === "Yes") === newInc.recurring ? COLORS.accent : COLORS.border}`, color: (t === "Yes") === newInc.recurring ? COLORS.accent : COLORS.muted, borderRadius: 10, padding: "10px", fontWeight: FW.semibold, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          </Field>
          <button onClick={addIncome} style={btnPrimary}>Add Income</button>
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
                  <span style={{ fontSize: 13, fontWeight: FW.semibold }}>{g.label}</span>
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
                    <p style={{ fontSize: 14, fontWeight: FW.semibold, color: COLORS.text }}>{b.label}</p>
                    <p style={{ fontSize: 12, color: dLeft <= 0 ? COLORS.danger : COLORS.subtext }}>{dLeft < 0 ? `Overdue by ${Math.abs(dLeft)} day${Math.abs(dLeft)===1?"":"s"}` : dLeft === 0 ? "Due today" : `Due in ${dLeft} day${dLeft===1?"":"s"}`}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: FW.bold, color: COLORS.text }}>{fmt(b.budget)}</span>
                    <button onClick={() => markBillPaid(b.id, viewMonthKey)} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: FW.bold, cursor: "pointer" }}>Mark Paid</button>
                  </div>
                </div>
              );
            });
          })()}
        </Modal>
      )}
      {modal === "addBill" && (
        <Modal title="Add Fixed Expense" onClose={() => { setModal(null); setNewBill({ label: "", budget: "", dayOfMonth: "" }); }}>
          <Field label="Name"><input style={inputStyle} value={newBill.label} onChange={e => setNewBill(p=>({...p,label:e.target.value}))} placeholder="e.g. Electric" /></Field>
          <Field label="Amount"><input style={inputStyle} type="number" value={newBill.budget} onChange={e => setNewBill(p=>({...p,budget:e.target.value}))} placeholder="0" /></Field>
          <Field label="Day of Month"><input style={inputStyle} type="number" min="1" max="31" value={newBill.dayOfMonth} onChange={e => setNewBill(p=>({...p,dayOfMonth:e.target.value}))} placeholder="e.g. 15" /></Field>
          <button disabled={!newBill.label || !newBill.budget || !newBill.dayOfMonth} onClick={() => {
            setBills(p => [...p, { id: Date.now(), label: newBill.label, dayOfMonth: parseInt(newBill.dayOfMonth)||1, budget: parseFloat(newBill.budget)||0 }]);
            showToast(`Fixed expense "${newBill.label}" added`);
            setNewBill({ label: "", budget: "", dayOfMonth: "" }); setModal(null);
          }} style={{ ...btnPrimary, opacity: (!newBill.label || !newBill.budget || !newBill.dayOfMonth) ? 0.5 : 1 }}>Add Fixed Expense</button>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="Settings" onClose={() => setModal(null)}>
          <Field label="Family Name">
            <input style={inputStyle} value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="e.g. Roberts Family" />
          </Field>
          <Field label="Budget Start Month">
            <select style={selectStyle} value={startMonthKey} onChange={e => setStartMonthKey(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => {
                const d = new Date(2026, i, 1);
                const k = monthKey(d.getFullYear(), d.getMonth());
                return <option key={k} value={k}>{MONTH_FULL[d.getMonth()]} {d.getFullYear()}</option>;
              })}
            </select>
          </Field>
          <Field label="Appearance">
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => darkMode && toggleDarkMode()} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `1px solid ${darkMode ? COLORS.border : COLORS.primary}`, background: darkMode ? "transparent" : COLORS.primaryFillBg, color: COLORS.text, fontSize: 13, fontWeight: FW.semibold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>light_mode</span>
                Light
              </button>
              <button type="button" onClick={() => !darkMode && toggleDarkMode()} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: `1px solid ${!darkMode ? COLORS.border : COLORS.primary}`, background: !darkMode ? "transparent" : COLORS.primaryFillBg, color: COLORS.text, fontSize: 13, fontWeight: FW.semibold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>dark_mode</span>
                Dark
              </button>
            </div>
          </Field>
          <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 16, paddingTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: FW.bold, color: COLORS.text, marginBottom: 8 }}>Household Access</p>
            {householdCode ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: FW.extrabold, letterSpacing: "0.08em", color: COLORS.primary, fontFamily: "monospace" }}>{householdCode}</span>
                  <button onClick={() => { navigator.clipboard.writeText(householdCode); setToastInfo({ msg: "Code copied!", icon: "content_copy" }); }} style={{ fontSize: 11, fontWeight: FW.semibold, background: COLORS.containerLow, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: COLORS.subtext }}>Copy code</button>
                </div>
                <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>Enter this code on any browser or device to access your budget.</p>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: COLORS.muted }}>No household code available (offline mode)</p>
            )}
            <button onClick={handleResetHousehold} style={{ marginTop: 12, fontSize: 12, fontWeight: FW.semibold, background: "none", border: `1px solid ${COLORS.danger}40`, borderRadius: 8, padding: "6px 12px", color: COLORS.danger, cursor: "pointer" }}>Reset household</button>
          </div>
          <button onClick={() => setModal(null)} style={btnPrimary}>Save Settings</button>
        </Modal>
      )}
      </div>{/* end main column */}
      {/* ── Toast Notification ── */}
      <Toast info={toastInfo} />
    </div>
  );
}
