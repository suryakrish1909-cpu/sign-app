import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, Target, Calendar as CalIcon,
  Upload, X, ChevronLeft, ChevronRight, AlertTriangle, PiggyBank,
  Wallet, Trash2, Check, Sparkles, FileText, ChevronDown, Download,
  Cloud, CloudOff, Loader2,
} from "lucide-react";

const STORAGE_KEY = "sign-ledger-v1";

/* ---------- constants ---------- */

const EXPENSE_PRESETS = [
  { name: "Food & Drinks", color: "#C0483A" },
  { name: "Transport", color: "#B8935A" },
  { name: "Shopping", color: "#8A6FA8" },
  { name: "Bills & Rent", color: "#3E6B8A" },
  { name: "Entertainment", color: "#D98E4A" },
  { name: "Health", color: "#5B8A72" },
  { name: "Groceries", color: "#2E6B4F" },
  { name: "Other", color: "#7A8B7F" },
];

const INCOME_PRESETS = ["Salary", "Allowance", "Freelance", "Gift", "Other"];

const WANT_CATEGORIES = ["Shopping", "Entertainment", "Food & Drinks"];

const uid = () => Math.random().toString(36).slice(2, 10);

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmt = (n) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const monthLabel = (d) =>
  d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const isSameDay = (a, b) => a === b;

/* ---------- small UI atoms ---------- */

function StampCard({ children, className = "" }) {
  return (
    <div
      className={`relative bg-[#F7F4EC] border-2 border-[#0F1410] rounded-sm ${className}`}
      style={{ boxShadow: "3px 3px 0 #0F1410" }}
    >
      {children}
    </div>
  );
}

function AdvisorNote({ tone = "warn", children, onDismiss }) {
  const colors = {
    warn: { bg: "#FBEFE9", border: "#C0483A", text: "#7A2E22" },
    good: { bg: "#EEF4EE", border: "#2E6B4F", text: "#1E4A35" },
    info: { bg: "#F3EFE2", border: "#B8935A", text: "#6B4F26" },
  };
  const c = colors[tone];
  return (
    <div
      className="relative px-4 py-3 rounded-sm text-sm leading-snug font-medium"
      style={{
        background: c.bg,
        borderLeft: `4px solid ${c.border}`,
        color: c.text,
        transform: "rotate(-0.4deg)",
      }}
    >
      <div className="flex gap-2 items-start pr-5">
        <Sparkles size={15} className="shrink-0 mt-0.5" />
        <span>{children}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 opacity-50 hover:opacity-100"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wider text-[#7A8B7F] font-semibold mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full bg-white border-2 border-[#0F1410]/15 focus:border-[#2E6B4F] outline-none rounded-sm px-3 py-2 text-[15px] text-[#0F1410] transition-colors";

/* ---------- onboarding ---------- */

function Onboarding({ onDone }) {
  const [balance, setBalance] = useState("");
  return (
    <div className="min-h-screen bg-[#0F1410] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-block text-5xl font-bold text-[#F7F4EC] mb-1"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            $ign
          </div>
          <p className="text-[#7A8B7F] text-sm tracking-wide">
            your ledger. your guardrails.
          </p>
        </div>
        <StampCard className="p-6">
          <p className="text-[#0F1410] text-sm mb-4 leading-relaxed">
            Let's start with what's actually in your account right now.
            Every rupee that moves after this, I'll track against it.
          </p>
          <Field label="Current bank balance">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8B7F] font-semibold">
                ₹
              </span>
              <input
                autoFocus
                inputMode="decimal"
                value={balance}
                onChange={(e) => setBalance(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                className={inputCls + " pl-7 text-lg font-semibold"}
              />
            </div>
          </Field>
          <button
            disabled={!balance}
            onClick={() => onDone(parseFloat(balance) || 0)}
            className="mt-5 w-full bg-[#2E6B4F] disabled:bg-[#2E6B4F]/30 text-[#F7F4EC] font-semibold py-3 rounded-sm hover:bg-[#255840] transition-colors"
          >
            Open my ledger
          </button>
        </StampCard>
        <p className="text-center text-[10px] text-[#7A8B7F] mt-4">
          Everything stays in this session — nothing is uploaded anywhere.
        </p>
      </div>
    </div>
  );
}

/* ---------- add transaction sheet ---------- */

function AddTransactionSheet({ type, onClose, onAdd, goals }) {
  const [category, setCategory] = useState(
    type === "expense" ? EXPENSE_PRESETS[0].name : INCOME_PRESETS[0]
  );
  const [customCat, setCustomCat] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [goalId, setGoalId] = useState("");

  const presets = type === "expense" ? EXPENSE_PRESETS.map((p) => p.name) : INCOME_PRESETS;

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    onAdd({
      id: uid(),
      type,
      category: useCustom && customCat.trim() ? customCat.trim() : category,
      amount: amt,
      date,
      note: note.trim(),
      goalId: type === "saving" ? goalId : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-[#0F1410]/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-[#F7F4EC] rounded-t-2xl sm:rounded-sm border-2 border-[#0F1410] p-5 pb-8 sm:pb-5 safe-bottom max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#0F1410] text-lg">
            {type === "expense" ? "Add expense" : type === "income" ? "Add income" : "Add to a goal"}
          </h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        {type !== "saving" && (
          <Field label="Category">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => { setCategory(p); setUseCustom(false); }}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium border-2 transition-colors ${
                    !useCustom && category === p
                      ? "bg-[#0F1410] text-[#F7F4EC] border-[#0F1410]"
                      : "bg-white text-[#0F1410] border-[#0F1410]/15"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`px-2.5 py-1.5 rounded-full text-xs font-medium border-2 border-dashed transition-colors ${
                  useCustom ? "bg-[#0F1410] text-[#F7F4EC] border-[#0F1410]" : "border-[#0F1410]/30 text-[#0F1410]"
                }`}
              >
                + Custom
              </button>
            </div>
            {useCustom && (
              <input
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                placeholder="Name your category"
                className={inputCls}
              />
            )}
          </Field>
        )}

        {type === "saving" && (
          <Field label="Which goal?">
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select a goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Amount">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8B7F] font-semibold">₹</span>
              <input
                autoFocus
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0"
                className={inputCls + " pl-7"}
              />
            </div>
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Note (optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was it for?" className={inputCls} />
          </Field>
        </div>

        <button
          onClick={submit}
          disabled={type === "saving" && !goalId}
          className="mt-5 w-full bg-[#2E6B4F] disabled:opacity-40 text-[#F7F4EC] font-semibold py-3 rounded-sm hover:bg-[#255840] transition-colors"
        >
          Save entry
        </button>
      </div>
    </div>
  );
}

/* ---------- new goal sheet ---------- */

function AddGoalSheet({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  const submit = () => {
    const t = parseFloat(target);
    if (!name.trim() || !t || t <= 0) return;
    onAdd({ id: uid(), name: name.trim(), target: t, saved: 0, deadline: deadline || null });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-[#0F1410]/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-[#F7F4EC] rounded-t-2xl sm:rounded-sm border-2 border-[#0F1410] p-5 pb-8 sm:pb-5 safe-bottom">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#0F1410] text-lg">New savings goal</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <Field label="Goal name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dandiya event" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Field label="Target amount">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8B7F] font-semibold">₹</span>
              <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" className={inputCls + " pl-7"} />
            </div>
          </Field>
          <Field label="Deadline (optional)">
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <button onClick={submit} className="mt-5 w-full bg-[#B8935A] text-[#0F1410] font-semibold py-3 rounded-sm hover:bg-[#a5824c] transition-colors">
          Create goal
        </button>
      </div>
    </div>
  );
}

/* ---------- CSV statement parser ---------- */

// splits a CSV line into fields, respecting double-quoted fields (handles commas inside quotes)
function splitCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { fields.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

// parses common date formats into ISO yyyy-mm-dd
function parseDateToISO(raw) {
  if (!raw) return null;
  const s = raw.trim();

  // "Jul 30, 2026" / "30 Jul 2026" style
  const monthNames = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  let m = s.match(/([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})/); // Jul 30, 2026
  if (m) {
    const mon = monthNames[m[1].slice(0,3).toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2,"0")}-${String(m[2]).padStart(2,"0")}`;
  }
  m = s.match(/(\d{1,2})\s+([A-Za-z]{3,}),?\s+(\d{4})/); // 30 Jul 2026
  if (m) {
    const mon = monthNames[m[2].slice(0,3).toLowerCase()];
    if (mon) return `${m[3]}-${String(mon).padStart(2,"0")}-${String(m[1]).padStart(2,"0")}`;
  }

  // numeric formats: dd/mm/yyyy, yyyy-mm-dd, dd-mm-yy etc.
  m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const yr = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${yr}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseAmount(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[₹,\s]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function guessCategory(desc) {
  const d = (desc || "").toLowerCase();
  if (/swiggy|zomato|instamart|wow momo|xerox|mughlai|momo|restaurant|cafe|food/.test(d)) return "Food & Drinks";
  if (/uber|ola|petrol|fuel|metro|auto|transport/.test(d)) return "Transport";
  if (/amazon|flipkart|myntra|shopping/.test(d)) return "Shopping";
  if (/jio|airtel|electricity|recharge|bill|rent|broadband/.test(d)) return "Bills & Rent";
  if (/spotify|netflix|google play|prime video|hotstar|rooter|game/.test(d)) return "Entertainment";
  if (/pharmacy|hospital|clinic|medical|apollo/.test(d)) return "Health";
  if (/grocery|omfed|kirana|supermarket|bazaar/.test(d)) return "Groceries";
  return "Other";
}

function parseStatementCSV(rawText) {
  const allLines = rawText.split(/\r?\n/);

  // find the header row — the line containing a recognizable date-ish and amount-ish column name
  const headerKeywords = ["date"];
  let headerIdx = -1;
  let headerFields = [];
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i].trim();
    if (!line) continue;
    const fields = splitCsvLine(line).map((f) => f.toLowerCase());
    if (fields.some((f) => f.includes("date")) && fields.some((f) => /amount|debit|credit|withdrawal|deposit/.test(f))) {
      headerIdx = i;
      headerFields = fields;
      break;
    }
  }

  if (headerIdx === -1) {
    return { error: "Couldn't find a header row with Date and Amount columns. Make sure you uploaded the unedited CSV export from your bank or UPI app." };
  }

  // map column indices
  const findCol = (patterns) => headerFields.findIndex((f) => patterns.some((p) => f.includes(p)));
  const dateCol = findCol(["date"]);
  const descCol = findCol(["description", "details", "narration", "particulars", "remarks"]);
  const typeCol = findCol(["type", "credit/debit", "dr/cr"]);
  const amountCol = findCol(["amount"]);
  const debitCol = findCol(["debit", "withdrawal"]);
  const creditCol = findCol(["credit", "deposit"]);

  const results = [];
  const skipped = [];

  for (let i = headerIdx + 1; i < allLines.length; i++) {
    const line = allLines[i];
    if (!line || !line.trim()) continue;
    const fields = splitCsvLine(line);
    if (fields.length < 2) continue;

    const dateRaw = dateCol >= 0 ? fields[dateCol] : null;
    const iso = parseDateToISO(dateRaw);
    if (!iso) { skipped.push(line); continue; }

    let amount = null;
    let type = null;

    if (amountCol >= 0) {
      amount = parseAmount(fields[amountCol]);
      if (amount != null && amount < 0) { type = "expense"; amount = Math.abs(amount); }
    } else if (debitCol >= 0 || creditCol >= 0) {
      const debitVal = debitCol >= 0 ? parseAmount(fields[debitCol]) : null;
      const creditVal = creditCol >= 0 ? parseAmount(fields[creditCol]) : null;
      if (debitVal) { amount = debitVal; type = "expense"; }
      else if (creditVal) { amount = creditVal; type = "income"; }
    }

    if (amount == null || amount === 0) { skipped.push(line); continue; }

    if (!type && typeCol >= 0) {
      const t = (fields[typeCol] || "").toLowerCase();
      if (/debit|dr|paid|withdraw/.test(t)) type = "expense";
      else if (/credit|cr|received|deposit/.test(t)) type = "income";
    }
    if (!type) type = "expense"; // safe default when direction is unclear

    const desc = descCol >= 0 ? fields[descCol] : (fields.find((f, idx) => idx !== dateCol && isNaN(parseFloat(f))) || "Statement entry");

    results.push({
      id: uid(),
      type,
      category: guessCategory(desc),
      amount,
      date: iso,
      note: (desc || "Statement entry").slice(0, 60),
      fromStatement: true,
    });
  }

  return { transactions: results, skippedCount: skipped.length };
}

function StatementImport({ onClose, onImport }) {
  const [fileName, setFileName] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    setError(null);
    setPreview(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseStatementCSV(e.target.result);
      if (result.error) {
        setError(result.error);
      } else {
        setPreview(result);
      }
    };
    reader.onerror = () => setError("Couldn't read that file. Try exporting the CSV again.");
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-[#0F1410]/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#F7F4EC] rounded-t-2xl sm:rounded-sm border-2 border-[#0F1410] p-5 pb-8 sm:pb-5 safe-bottom max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[#0F1410] text-lg flex items-center gap-2">
            <FileText size={18} /> Import statement
          </h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <p className="text-xs text-[#7A8B7F] mb-3 leading-relaxed">
          Upload the CSV export of your bank or UPI statement (PhonePe, GPay, bank exports all work). I'll read the dates, amounts, and whether each was money in or out — review before adding. This only fills in past history for your calendar and charts; it won't change your current balance.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#0F1410]/30 rounded-sm py-6 text-[#0F1410]"
        >
          <Upload size={22} />
          <span className="text-sm font-semibold">{fileName || "Choose CSV file"}</span>
          <span className="text-[10px] text-[#7A8B7F]">Tap to browse your files</span>
        </button>

        {error && (
          <div className="mt-3">
            <AdvisorNote tone="warn">{error}</AdvisorNote>
          </div>
        )}

        {preview && (
          <div className="mt-3">
            {preview.transactions.length === 0 ? (
              <AdvisorNote tone="warn">
                Found a header row but no valid transaction rows underneath it. The file may be empty or in an unexpected format.
              </AdvisorNote>
            ) : (
              <>
                <p className="text-xs font-semibold text-[#0F1410] mb-2">
                  Found {preview.transactions.length} entries — {preview.transactions.filter(p=>p.type==='income').length} income, {preview.transactions.filter(p=>p.type==='expense').length} expense
                  {preview.skippedCount > 0 && <span className="text-[#7A8B7F] font-normal"> · {preview.skippedCount} rows skipped</span>}
                </p>
                <div className="max-h-64 overflow-y-auto border-2 border-[#0F1410]/10 rounded-sm divide-y divide-[#0F1410]/10 mb-3">
                  {preview.transactions.map((p) => (
                    <div key={p.id} className="flex justify-between items-center px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <div className="truncate text-[#0F1410]">{p.note}</div>
                        <div className="text-[#7A8B7F]">{p.category} · {p.date}</div>
                      </div>
                      <div className={`font-mono font-semibold shrink-0 ml-2 ${p.type === "income" ? "text-[#2E6B4F]" : "text-[#C0483A]"}`}>
                        {p.type === "income" ? "+" : "−"}{fmt(p.amount)}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { onImport(preview.transactions); onClose(); }}
                  className="w-full bg-[#2E6B4F] text-[#F7F4EC] font-semibold py-2.5 rounded-sm"
                >
                  Add all {preview.transactions.length} to ledger
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- pie chart ---------- */

function SpendPie({ transactions }) {
  const data = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => {
      const preset = EXPENSE_PRESETS.find((p) => p.name === name);
      return { name, value, color: preset ? preset.color : "#7A8B7F" };
    }).sort((a,b) => b.value - a.value);
  }, [transactions]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-[#7A8B7F] text-sm gap-2">
        <PiggyBank size={28} strokeWidth={1.5} />
        No expenses logged yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-32 h-32 shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2}>
              {data.map((d, i) => <Cell key={i} fill={d.color} stroke="#F7F4EC" strokeWidth={2} />)}
            </Pie>
            <Tooltip
              formatter={(v) => fmt(v)}
              contentStyle={{ background: "#0F1410", border: "none", borderRadius: 4, fontSize: 12 }}
              itemStyle={{ color: "#F7F4EC" }}
              labelStyle={{ color: "#F7F4EC" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] text-[#7A8B7F]">total</span>
          <span className="text-sm font-bold text-[#0F1410]">{fmt(total)}</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {data.slice(0, 6).map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-[#0F1410] truncate flex-1">{d.name}</span>
            <span className="text-[#7A8B7F] font-mono shrink-0">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- calendar ---------- */

function CalendarView({ transactions }) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(null);
  const [range, setRange] = useState("month"); // day/week/month/year

  const byDay = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      map[t.date] = map[t.date] || { income: 0, expense: 0 };
      map[t.date][t.type === "income" ? "income" : "expense"] += t.amount;
    });
    return map;
  }, [transactions]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const totalsFor = (rangeType) => {
    const t = todayISO();
    const now = new Date();
    let inc = 0, exp = 0;
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      let match = false;
      if (rangeType === "day") match = tx.date === t;
      if (rangeType === "week") {
        const diff = (now - d) / 86400000;
        match = diff >= 0 && diff < 7;
      }
      if (rangeType === "month") match = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (rangeType === "year") match = d.getFullYear() === now.getFullYear();
      if (match) {
        if (tx.type === "income") inc += tx.amount; else exp += tx.amount;
      }
    });
    return { inc, exp };
  };

  const rt = totalsFor(range);

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {["day", "week", "month", "year"].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border-2 transition-colors ${
              range === r ? "bg-[#0F1410] text-[#F7F4EC] border-[#0F1410]" : "border-[#0F1410]/15 text-[#0F1410]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-white border-2 border-[#0F1410]/10 rounded-sm p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#7A8B7F] font-semibold mb-1 flex items-center gap-1">
            <TrendingUp size={12} /> in
          </div>
          <div className="text-lg font-bold text-[#2E6B4F] font-mono">{fmt(rt.inc)}</div>
        </div>
        <div className="flex-1 bg-white border-2 border-[#0F1410]/10 rounded-sm p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#7A8B7F] font-semibold mb-1 flex items-center gap-1">
            <TrendingDown size={12} /> out
          </div>
          <div className="text-lg font-bold text-[#C0483A] font-mono">{fmt(rt.exp)}</div>
        </div>
        <div className="flex-1 bg-white border-2 border-[#0F1410]/10 rounded-sm p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#7A8B7F] font-semibold mb-1">net</div>
          <div className={`text-lg font-bold font-mono ${rt.inc - rt.exp >= 0 ? "text-[#0F1410]" : "text-[#C0483A]"}`}>
            {rt.inc - rt.exp >= 0 ? "+" : "−"}{fmt(rt.inc - rt.exp)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-[#0F1410]/5 rounded-sm">
          <ChevronLeft size={18} />
        </button>
        <span className="font-bold text-[#0F1410] text-sm">{monthLabel(cursor)}</span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-[#0F1410]/5 rounded-sm">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#7A8B7F] mb-1">
        {["S","M","T","W","T","F","S"].map((d,i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const data = byDay[iso];
          const isToday = iso === todayISO();
          const isSel = selected === iso;
          return (
            <button
              key={i}
              onClick={() => setSelected(isSel ? null : iso)}
              className={`aspect-square rounded-sm text-xs flex flex-col items-center justify-center relative border-2 transition-colors ${
                isSel ? "border-[#0F1410] bg-[#0F1410] text-[#F7F4EC]" :
                isToday ? "border-[#2E6B4F] text-[#0F1410]" : "border-transparent text-[#0F1410] hover:bg-[#0F1410]/5"
              }`}
            >
              <span>{d}</span>
              {data && (
                <span className="flex gap-0.5 mt-0.5">
                  {data.income > 0 && <span className="w-1 h-1 rounded-full bg-[#2E6B4F]" />}
                  {data.expense > 0 && <span className="w-1 h-1 rounded-full bg-[#C0483A]" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && byDay[selected] && (
        <div className="mt-3 p-3 bg-white border-2 border-[#0F1410]/10 rounded-sm text-xs">
          <div className="font-semibold text-[#0F1410] mb-1">{selected}</div>
          <div className="flex justify-between text-[#2E6B4F]"><span>Income</span><span className="font-mono">+{fmt(byDay[selected].income)}</span></div>
          <div className="flex justify-between text-[#C0483A]"><span>Expense</span><span className="font-mono">−{fmt(byDay[selected].expense)}</span></div>
        </div>
      )}
      {selected && !byDay[selected] && (
        <div className="mt-3 p-3 text-xs text-[#7A8B7F] text-center">No activity on {selected}</div>
      )}
    </div>
  );
}

/* ---------- goals ---------- */

function GoalsView({ goals, onAddGoal, onContribute, onDelete }) {
  return (
    <div className="space-y-3">
      {goals.length === 0 && (
        <div className="text-center py-10 text-[#7A8B7F] text-sm">
          <Target size={28} strokeWidth={1.5} className="mx-auto mb-2" />
          No goals yet. Add one — Dandiya isn't going to fund itself.
        </div>
      )}
      {goals.map((g) => {
        const pct = Math.min(100, (g.saved / g.target) * 100);
        const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;
        return (
          <StampCard key={g.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-[#0F1410]">{g.name}</div>
                {g.deadline && (
                  <div className="text-[10px] text-[#7A8B7F]">
                    {daysLeft >= 0 ? `${daysLeft} days left` : "deadline passed"} · {g.deadline}
                  </div>
                )}
              </div>
              <button onClick={() => onDelete(g.id)} className="text-[#7A8B7F] hover:text-[#C0483A]">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="h-2.5 bg-[#0F1410]/10 rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-[#B8935A] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-mono font-semibold text-[#0F1410]">{fmt(g.saved)} <span className="text-[#7A8B7F] font-normal">of {fmt(g.target)}</span></span>
              <span className="text-[#B8935A] font-semibold">{Math.round(pct)}%</span>
            </div>
            <button
              onClick={() => onContribute(g.id)}
              className="mt-2.5 w-full text-xs font-semibold border-2 border-[#0F1410] py-1.5 rounded-sm hover:bg-[#0F1410] hover:text-[#F7F4EC] transition-colors"
            >
              Add money to this goal
            </button>
          </StampCard>
        );
      })}
      <button
        onClick={onAddGoal}
        className="w-full border-2 border-dashed border-[#0F1410]/30 text-[#0F1410] py-3 rounded-sm text-sm font-semibold hover:bg-[#0F1410]/5 flex items-center justify-center gap-1.5"
      >
        <Plus size={16} /> New goal
      </button>
    </div>
  );
}

/* ---------- advisor logic ---------- */

function generateAdvice({ transactions, balance, goals, monthlyBudget }) {
  const notes = [];
  const now = new Date();
  const thisMonthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const income = thisMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = thisMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // budget check
  if (monthlyBudget && expense > monthlyBudget) {
    notes.push({ tone: "warn", text: `You've spent ${fmt(expense)} this month — that's over your ${fmt(monthlyBudget)} budget. Time to slow down on new purchases.` });
  } else if (monthlyBudget && expense > monthlyBudget * 0.85) {
    notes.push({ tone: "warn", text: `You're at ${Math.round((expense/monthlyBudget)*100)}% of your monthly budget already. A few more days of careful spending will keep you safe.` });
  }

  // spend vs income
  if (income > 0 && expense > income * 0.9) {
    notes.push({ tone: "warn", text: `You've spent ${Math.round((expense/income)*100)}% of what you earned this month. Not much room left before you're eating into savings.` });
  }

  // category concentration
  const catMap = {};
  thisMonthTx.filter(t=>t.type==="expense").forEach(t => catMap[t.category] = (catMap[t.category]||0)+t.amount);
  const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  if (topCat && expense > 0 && topCat[1] / expense > 0.4 && WANT_CATEGORIES.includes(topCat[0])) {
    notes.push({ tone: "info", text: `${topCat[0]} is eating ${Math.round((topCat[1]/expense)*100)}% of your spending this month. Worth asking: need, or want?` });
  }

  // goal behind schedule + wants spending
  const wantsSpend = thisMonthTx.filter(t => t.type === "expense" && WANT_CATEGORIES.includes(t.category)).reduce((s,t)=>s+t.amount,0);
  goals.forEach((g) => {
    if (!g.deadline) return;
    const daysLeft = (new Date(g.deadline) - now) / 86400000;
    const remaining = g.target - g.saved;
    if (daysLeft > 0 && remaining > 0 && wantsSpend > remaining * 0.5) {
      notes.push({ tone: "warn", text: `You still need ${fmt(remaining)} for "${g.name}" but spent ${fmt(wantsSpend)} on non-essentials this month. That gap won't close itself.` });
    }
  });

  // low balance
  if (balance < expense * 0.2 && balance < 1000) {
    notes.push({ tone: "warn", text: `Your balance is running low at ${fmt(balance)}. Hold off on non-essential spending until more income comes in.` });
  }

  if (notes.length === 0) {
    notes.push({ tone: "good", text: `Spending looks controlled this month — ${fmt(expense)} out against ${fmt(income)} in. Keep this pace up.` });
  }

  return notes.slice(0, 3);
}

/* ---------- main app ---------- */

export default function SignApp() {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null); // 'expense' | 'income' | 'saving' | 'goal' | 'statement' | 'settings'
  const [contributeGoalId, setContributeGoalId] = useState(null);
  const [monthlyBudget, setMonthlyBudgetState] = useState("");
  const [budgetDraft, setBudgetDraft] = useState("");
  const [balanceFix, setBalanceFix] = useState("");
  const [dismissed, setDismissed] = useState([]);
  const [syncState, setSyncState] = useState("idle"); // idle | saving | saved | error
  const fileInputRef = useRef(null);

  // load saved ledger on mount — localStorage persists per-browser on this device
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setBalance(data.balance ?? 0);
        setTransactions(data.transactions ?? []);
        setGoals(data.goals ?? []);
        setMonthlyBudgetState(data.monthlyBudget ?? "");
        setOnboarded(!!data.onboarded);
      }
    } catch (e) {
      // no saved data yet, or storage unavailable — start fresh
    }
    setLoading(false);
  }, []);

  // autosave whenever the ledger changes (skip until initial load finishes)
  useEffect(() => {
    if (loading) return;
    setSyncState("saving");
    const t = setTimeout(() => {
      try {
        const payload = { balance, transactions, goals, monthlyBudget, onboarded };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setSyncState("saved");
      } catch (e) {
        setSyncState("error");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [balance, transactions, goals, monthlyBudget, onboarded, loading]);

  const startApp = (bal) => {
    setBalance(bal);
    setTransactions([]);
    setGoals([]);
    setOnboarded(true);
  };

  const addTransaction = useCallback((tx) => {
    setTransactions((prev) => [tx, ...prev]);
    setBalance((b) => tx.type === "income" ? b + tx.amount : b - tx.amount);
    if (tx.goalId) {
      setGoals((gs) => gs.map((g) => g.id === tx.goalId ? { ...g, saved: g.saved + tx.amount } : g));
    }
  }, []);

  const importStatement = useCallback((entries) => {
    // Statement entries are historical — the user's current balance already
    // reflects them, so we only backfill transaction history (for the
    // calendar/pie chart) and never adjust the balance here.
    setTransactions((prev) => [...entries, ...prev]);
  }, []);

  const addGoal = (g) => setGoals((gs) => [...gs, g]);
  const deleteGoal = (id) => setGoals((gs) => gs.filter((g) => g.id !== id));

  const exportData = () => {
    const payload = { balance, transactions, goals, monthlyBudget, onboarded: true, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sign-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setBalance(data.balance ?? 0);
        setTransactions(data.transactions ?? []);
        setGoals(data.goals ?? []);
        setMonthlyBudgetState(data.monthlyBudget ?? "");
        setOnboarded(true);
        setSheet(null);
      } catch (err) {
        alert("Couldn't read that file — make sure it's a $ign backup JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const openContribute = (goalId) => {
    setContributeGoalId(goalId);
    setSheet("saving");
  };

  const thisMonth = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }, [transactions]);

  const monthIncome = thisMonth.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const monthExpense = thisMonth.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);

  const advice = useMemo(
    () => generateAdvice({ transactions, balance, goals, monthlyBudget: parseFloat(monthlyBudget) || null }),
    [transactions, balance, goals, monthlyBudget]
  );
  const visibleAdvice = advice.filter((a) => !dismissed.includes(a.text));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1410] flex items-center justify-center">
        <div className="text-[#F7F4EC] flex flex-col items-center gap-3">
          <Loader2 size={22} className="animate-spin text-[#B8935A]" />
          <span className="text-sm text-[#7A8B7F]">Opening your ledger…</span>
        </div>
      </div>
    );
  }

  if (!onboarded) return <Onboarding onDone={startApp} />;

  const recentTx = transactions.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#EDE9DD] pb-32" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* header */}
      <div className="bg-[#0F1410] safe-top px-5 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-5">
          <span className="text-2xl font-bold text-[#F7F4EC]" style={{ fontFamily: "Georgia, serif" }}>$ign</span>
          <button onClick={() => setSheet("settings")} className="flex items-center gap-1.5 text-[#7A8B7F]">
            {syncState === "saving" && <Loader2 size={14} className="animate-spin" />}
            {syncState === "saved" && <Cloud size={14} className="text-[#B8935A]" />}
            {syncState === "error" && <CloudOff size={14} className="text-[#C0483A]" />}
            <Wallet size={20} className="text-[#B8935A]" />
          </button>
        </div>
        <div className="text-[#7A8B7F] text-xs uppercase tracking-wider font-semibold mb-1">Current balance</div>
        <div className="text-4xl font-bold text-[#F7F4EC] font-mono mb-4">{fmt(balance)}</div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-[#8FBFA0]">
            <TrendingUp size={13} /> {fmt(monthIncome)} in this month
          </div>
          <div className="flex items-center gap-1.5 text-[#E0968A]">
            <TrendingDown size={13} /> {fmt(monthExpense)} out this month
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4">
        {/* advisor notes */}
        {visibleAdvice.length > 0 && (
          <div className="space-y-2 mb-4">
            {visibleAdvice.map((a, i) => (
              <AdvisorNote key={i} tone={a.tone} onDismiss={() => setDismissed((d) => [...d, a.text])}>
                {a.text}
              </AdvisorNote>
            ))}
          </div>
        )}

        {tab === "home" && (
          <>
            {/* quick actions */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={() => setSheet("expense")} className="bg-[#C0483A] text-[#F7F4EC] rounded-sm py-3 flex flex-col items-center gap-1 text-xs font-semibold" style={{boxShadow:"3px 3px 0 #0F1410"}}>
                <TrendingDown size={16} /> Expense
              </button>
              <button onClick={() => setSheet("income")} className="bg-[#2E6B4F] text-[#F7F4EC] rounded-sm py-3 flex flex-col items-center gap-1 text-xs font-semibold" style={{boxShadow:"3px 3px 0 #0F1410"}}>
                <TrendingUp size={16} /> Income
              </button>
              <button onClick={() => setSheet("statement")} className="bg-[#B8935A] text-[#0F1410] rounded-sm py-3 flex flex-col items-center gap-1 text-xs font-semibold" style={{boxShadow:"3px 3px 0 #0F1410"}}>
                <Upload size={16} /> Statement
              </button>
            </div>

            {/* budget setting */}
            <StampCard className="p-4 mb-4">
              <div className="text-[11px] uppercase tracking-wider text-[#7A8B7F] font-semibold mb-1.5">Monthly budget</div>
              {monthlyBudget ? (
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#0F1410]">{fmt(parseFloat(monthlyBudget))}</span>
                  <button onClick={() => { setBudgetDraft(monthlyBudget); setMonthlyBudgetState(""); }} className="text-xs text-[#7A8B7F] underline">edit</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    inputMode="decimal"
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value.replace(/[^0-9.]/g,""))}
                    placeholder="Set a monthly spending limit"
                    className={inputCls + " text-sm"}
                  />
                  <button onClick={() => setMonthlyBudgetState(budgetDraft)} className="bg-[#0F1410] text-[#F7F4EC] px-3 rounded-sm text-xs font-semibold shrink-0">Set</button>
                </div>
              )}
            </StampCard>

            {/* pie chart */}
            <StampCard className="p-4 mb-4">
              <div className="font-bold text-[#0F1410] text-sm mb-3">Where it's going</div>
              <SpendPie transactions={transactions} />
            </StampCard>

            {/* recent transactions */}
            <StampCard className="p-4 mb-4">
              <div className="font-bold text-[#0F1410] text-sm mb-3">Recent entries</div>
              {recentTx.length === 0 && <div className="text-xs text-[#7A8B7F] text-center py-4">No entries yet</div>}
              <div className="divide-y divide-[#0F1410]/8">
                {recentTx.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="text-[#0F1410] font-medium truncate">{t.note || t.category}</div>
                      <div className="text-[10px] text-[#7A8B7F]">{t.category} · {t.date}</div>
                    </div>
                    <span className={`font-mono font-semibold shrink-0 ml-2 ${t.type === "income" ? "text-[#2E6B4F]" : "text-[#C0483A]"}`}>
                      {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </StampCard>
          </>
        )}

        {tab === "calendar" && (
          <StampCard className="p-4 mb-4">
            <CalendarView transactions={transactions} />
          </StampCard>
        )}

        {tab === "goals" && (
          <GoalsView
            goals={goals}
            onAddGoal={() => setSheet("goal")}
            onContribute={openContribute}
            onDelete={deleteGoal}
          />
        )}
      </div>

      {/* bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0F1410] border-t-2 border-[#0F1410] safe-bottom flex justify-around py-2.5 px-2">
        {[
          { id: "home", icon: Wallet, label: "Home" },
          { id: "calendar", icon: CalIcon, label: "Calendar" },
          { id: "goals", icon: Target, label: "Goals" },
        ].map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-sm text-[10px] font-semibold transition-colors ${
              tab === n.id ? "text-[#B8935A]" : "text-[#7A8B7F]"
            }`}
          >
            <n.icon size={19} />
            {n.label}
          </button>
        ))}
      </div>

      {sheet === "expense" && (
        <AddTransactionSheet type="expense" onClose={() => setSheet(null)} onAdd={addTransaction} goals={goals} />
      )}
      {sheet === "income" && (
        <AddTransactionSheet type="income" onClose={() => setSheet(null)} onAdd={addTransaction} goals={goals} />
      )}
      {sheet === "saving" && (
        <AddTransactionSheet
          type="saving"
          onClose={() => setSheet(null)}
          onAdd={addTransaction}
          goals={contributeGoalId ? goals.filter(g => g.id === contributeGoalId) : goals}
        />
      )}
      {sheet === "goal" && <AddGoalSheet onClose={() => setSheet(null)} onAdd={addGoal} />}
      {sheet === "statement" && <StatementImport onClose={() => setSheet(null)} onImport={importStatement} />}

      {sheet === "settings" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-[#0F1410]/50" onClick={() => setSheet(null)} />
          <div className="relative w-full sm:max-w-sm bg-[#F7F4EC] rounded-t-2xl sm:rounded-sm border-2 border-[#0F1410] p-5 pb-8 sm:pb-5 safe-bottom max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0F1410] text-lg">Your data</h3>
              <button onClick={() => setSheet(null)}><X size={20} /></button>
            </div>

            <div className="flex items-center gap-2 mb-4 text-xs">
              {syncState === "saved" && <><Cloud size={14} className="text-[#B8935A]" /><span className="text-[#0F1410]">Saved on this phone — it'll be here next time you open $ign in this browser.</span></>}
              {syncState === "saving" && <><Loader2 size={14} className="animate-spin text-[#7A8B7F]" /><span className="text-[#7A8B7F]">Saving…</span></>}
              {syncState === "error" && <><CloudOff size={14} className="text-[#C0483A]" /><span className="text-[#C0483A]">Couldn't save just now — your data is still here in this session.</span></>}
            </div>

            <div className="mb-5 p-3 bg-white border-2 border-[#0F1410]/10 rounded-sm">
              <div className="text-[11px] uppercase tracking-wider text-[#7A8B7F] font-semibold mb-1.5">Correct your balance</div>
              <p className="text-[10px] text-[#7A8B7F] mb-2 leading-relaxed">
                If your balance ever looks wrong, set it to what your bank actually shows right now.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8B7F] font-semibold text-sm">₹</span>
                  <input
                    inputMode="decimal"
                    value={balanceFix}
                    onChange={(e) => setBalanceFix(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder={String(balance)}
                    className={inputCls + " pl-7 text-sm"}
                  />
                </div>
                <button
                  onClick={() => { if (balanceFix !== "") { setBalance(parseFloat(balanceFix)); setBalanceFix(""); } }}
                  disabled={balanceFix === ""}
                  className="bg-[#0F1410] disabled:opacity-30 text-[#F7F4EC] px-4 rounded-sm text-xs font-semibold shrink-0"
                >
                  Update
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-center gap-2 bg-[#0F1410] text-[#F7F4EC] font-semibold py-3 rounded-sm text-sm"
              >
                <Download size={15} /> Download backup file
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-[#0F1410] text-[#0F1410] font-semibold py-3 rounded-sm text-sm"
              >
                <Upload size={15} /> Restore from backup file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) importData(e.target.files[0]); e.target.value = ""; }}
              />
            </div>
            <p className="text-[10px] text-[#7A8B7F] mt-4 leading-relaxed">
              Your ledger is saved in this browser only — clearing browser data or switching browsers will lose it. Download a backup file regularly, especially before clearing storage or switching phones. Restoring replaces everything currently in $ign with what's in the file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
