"use client";

import React, {
  useState, useRef, useEffect, useCallback, ChangeEvent,
} from "react";
import {
  X, ChevronRight, BookOpen, FileText, Code, Layers,
  Calendar, Bell, ArrowLeft, ArrowRight, Check, AlertCircle,
  Info, Clock, Mail, MessageCircle, Home, Hash, List, Zap,
  Loader2, Lock, CheckCircle, Plus, Minus,
} from "lucide-react";

// ─── Design tokens — You_Do green theme ──────────────────────────────────────
const D = {
  green:      "#059669",
  greenDark:  "#047857",
  greenLight: "rgba(5,150,105,0.08)",
  greenMed:   "rgba(5,150,105,0.15)",
  greenGlow:  "rgba(5,150,105,0.22)",
  bg:         "#ffffff",
  surface:    "#fafafa",
  surface2:   "#f4f4f6",
  border:     "#ecedf1",
  border2:    "#e2e3e8",
  textMain:   "#1a1a2e",
  textSub:    "#6b6b7e",
  textMuted:  "#9b9bae",
  textHint:   "#bcbccc",
  emerald:    "#10b981",
  blue:       "#3b82f6",
  purple:     "#8b5cf6",
  amber:      "#f59e0b",
  red:        "#ef4444",
};

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TestPayload {
  testType: "MCQ" | "Coding" | "Mixed";
  testInformation: {
    testId: string; testName: string; description: string;
    testLevel: "beginner" | "intermediate" | "expert";
    totalDuration: number; totalMarks: number;
  };
  questionConfiguration: {
    mcqConfig?: {
      questionCount: number;
      marksPerQuestion: number;
      attemptLimitEnabled: boolean;
      submissionAttempts: number;
    };
    codingConfig?: {
      configType: "general" | "levelBased";
      generalCount: number;
      levelCounts: { easy: number; medium: number; hard: number };
      marksPerQuestion: number;
      attemptLimitEnabled: boolean;
      submissionAttempts: number;
    };
  };
  schedule: {
    startDate: string; endDate: string;
    gracePeriodEnabled: boolean; gracePeriodDate: string;
  };
  notifications: {
    notifyUsers: boolean; notifyEmail: boolean;
    notifyWhatsApp: boolean; gradeSheet: boolean;
  };
}

export interface CreateTestModalProps {
  onClose: () => void;
  onSave: (data: TestPayload) => void;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  subcategory: string;
  hierarchyData: {
    courseName: string; moduleName: string; submoduleName: string;
    topicName: string; subtopicName: string; nodeType: string; level: number;
  };
  isEditing?: boolean;
  initialData?: Partial<TestPayload>;
}

// ─── Step definition ──────────────────────────────────────────────────────────
interface StepDef {
  id: number; title: string; subtitle: string;
  icon: React.ReactNode; completed: boolean; active: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────
interface VErrors {
  testType?: string; testName?: string; testId?: string;
  description?: string; totalDuration?: string; totalMarks?: string;
  mcqCount?: string; mcqMarks?: string;
  codingCount?: string; codingMarks?: string;
  startDate?: string; endDate?: string;
  [k: string]: string | undefined;
}

// ─── Tiny sub-components (self-contained) ─────────────────────────────────────

const TInput: React.FC<{
  type?: "text" | "textarea"; value: string; onChange: (v: string) => void;
  onBlur?: () => void; placeholder?: string; disabled?: boolean;
  readOnly?: boolean; error?: string; touched?: boolean; id?: string;
}> = ({ type = "text", value, onChange, onBlur, placeholder, disabled, readOnly, error, touched, id }) => {
  const [internal, setInternal] = useState(value);
  useEffect(() => setInternal(value), [value]);

  const cls = [
    "w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all",
    error && touched
      ? "border-red-300 bg-red-50/30 focus:border-red-400"
      : "border-[#ecedf1] bg-white focus:border-[#059669] focus:ring-1 focus:ring-[rgba(5,150,105,0.12)]",
    disabled || readOnly ? "bg-[#fafafa] text-[#9b9bae] cursor-not-allowed" : "text-[#1a1a2e]",
  ].join(" ");

  const props = {
    id, value: internal, placeholder, disabled, readOnly,
    onChange: (e: ChangeEvent<any>) => { setInternal(e.target.value); onChange(e.target.value); },
    onBlur: () => { onChange(internal); onBlur?.(); },
    className: cls,
    style: { fontFamily: "Plus Jakarta Sans, sans-serif" },
  };

  return (
    <div className="w-full">
      {type === "textarea"
        ? <textarea {...props} rows={3} style={{ ...props.style, resize: "none" }} />
        : <input {...props} />}
      {error && touched && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
    </div>
  );
};

const TNumber: React.FC<{
  value: number; onChange: (v: number) => void; onBlur?: () => void;
  min?: number; max?: number; placeholder?: string; error?: string; touched?: boolean; disabled?: boolean;
}> = ({ value, onChange, onBlur, min = 0, max = 9999, placeholder, error, touched, disabled }) => {
  const [disp, setDisp] = useState(value === 0 ? "" : value.toString());
  useEffect(() => setDisp(value === 0 ? "" : value.toString()), [value]);

  return (
    <div className="w-full">
      <input
        type="text" inputMode="decimal" value={disp} placeholder={placeholder} disabled={disabled}
        onChange={e => {
          const r = e.target.value;
          if (r === "" || /^\d*\.?\d*$/.test(r)) {
            setDisp(r);
            const n = parseFloat(r);
            if (!isNaN(n) && n >= min && n <= max) onChange(n);
            if (r === "") onChange(0);
          }
        }}
        onBlur={() => {
          if (!disp) { setDisp(""); onChange(0); }
          else {
            const n = parseFloat(disp);
            if (isNaN(n) || n < min) { setDisp(min.toString()); onChange(min); }
            else if (n > max) { setDisp(max.toString()); onChange(max); }
          }
          onBlur?.();
        }}
        className={[
          "w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all",
          error && touched
            ? "border-red-300 bg-red-50/30"
            : "border-[#ecedf1] bg-white focus:border-[#059669] focus:ring-1 focus:ring-[rgba(5,150,105,0.12)]",
          disabled ? "bg-[#fafafa] text-[#9b9bae] cursor-not-allowed" : "text-[#1a1a2e]",
        ].join(" ")}
        style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
      />
      {error && touched && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
    </div>
  );
};

const TToggle: React.FC<{
  enabled: boolean; onChange: (v: boolean) => void;
  label?: string; description?: string;
}> = ({ enabled, onChange, label, description }) => (
  <div className="flex items-start justify-between">
    {(label || description) && (
      <div className="flex-1 pr-3">
        {label && <div className="text-sm font-semibold" style={{ color: D.textMain }}>{label}</div>}
        {description && <div className="text-xs mt-0.5 leading-relaxed" style={{ color: D.textMuted }}>{description}</div>}
      </div>
    )}
    <button
      type="button" role="switch" aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 outline-none p-[2px]"
      style={{ background: enabled ? D.green : D.border2 }}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  </div>
);

const SectionLabel: React.FC<{ label: string; required?: boolean; hint?: string }> = ({ label, required, hint }) => (
  <div className="flex items-center gap-1.5 mb-1.5">
    <label className="text-xs font-bold uppercase tracking-wider" style={{ color: D.textSub }}>
      {label}{required && <span style={{ color: D.red }}> *</span>}
    </label>
    {hint && (
      <div className="relative group">
        <Info size={11} style={{ color: D.textHint, cursor: "help" }} />
        <div className="absolute left-5 -top-1 z-50 hidden group-hover:block w-52 p-2 text-xs rounded-lg shadow-xl"
          style={{ background: D.textMain, color: "#fff", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          {hint}
        </div>
      </div>
    )}
  </div>
);

// ─── Auto-generate test ID ────────────────────────────────────────────────────
const genId = () => `TST-${Date.now().toString(36).toUpperCase().slice(-5)}`;

// ─── Main modal ───────────────────────────────────────────────────────────────
const CreateTestModal: React.FC<CreateTestModalProps> = ({
  onClose, onSave, nodeId, nodeName, hierarchyData, subcategory, isEditing, initialData,
}) => {
  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [testType,     setTestType]     = useState<"MCQ" | "Coding" | "Mixed" | "">(initialData?.testType ?? "");
  const [testId,       setTestId]       = useState(initialData?.testInformation?.testId       ?? genId());
  const [testName,     setTestName]     = useState(initialData?.testInformation?.testName     ?? "");
  const [description,  setDescription]  = useState(initialData?.testInformation?.description  ?? "");
  const [level,        setLevel]        = useState<"beginner" | "intermediate" | "expert">(
    initialData?.testInformation?.testLevel ?? "beginner"
  );
  const [duration,     setDuration]     = useState(initialData?.testInformation?.totalDuration ?? 0);
  const [totalMarks,   setTotalMarks]   = useState(initialData?.testInformation?.totalMarks   ?? 0);

  // MCQ config
  const [mcqCount,    setMcqCount]    = useState(initialData?.questionConfiguration?.mcqConfig?.questionCount     ?? 0);
  const [mcqMarks,    setMcqMarks]    = useState(initialData?.questionConfiguration?.mcqConfig?.marksPerQuestion  ?? 0);
  const [mcqAttempt,  setMcqAttempt]  = useState(initialData?.questionConfiguration?.mcqConfig?.attemptLimitEnabled ?? false);
  const [mcqAttemptN, setMcqAttemptN] = useState(initialData?.questionConfiguration?.mcqConfig?.submissionAttempts  ?? 1);

  // Coding config
  const [codingCfgType, setCodingCfgType] = useState<"general" | "levelBased">(
    initialData?.questionConfiguration?.codingConfig?.configType ?? "general"
  );
  const [codingGenCount, setCodingGenCount] = useState(initialData?.questionConfiguration?.codingConfig?.generalCount ?? 0);
  const [codingLevels,   setCodingLevels]   = useState(initialData?.questionConfiguration?.codingConfig?.levelCounts ?? { easy: 0, medium: 0, hard: 0 });
  const [codingMarks,    setCodingMarks]    = useState(initialData?.questionConfiguration?.codingConfig?.marksPerQuestion ?? 0);
  const [codingAttempt,  setCodingAttempt]  = useState(initialData?.questionConfiguration?.codingConfig?.attemptLimitEnabled ?? false);
  const [codingAttemptN, setCodingAttemptN] = useState(initialData?.questionConfiguration?.codingConfig?.submissionAttempts  ?? 1);

  // Schedule
  const [startDate, setStartDate] = useState(initialData?.schedule?.startDate ?? "");
  const [endDate,   setEndDate]   = useState(initialData?.schedule?.endDate   ?? "");
  const [graceEnabled, setGraceEnabled] = useState(initialData?.schedule?.gracePeriodEnabled ?? false);
  const [graceDate,    setGraceDate]    = useState(initialData?.schedule?.gracePeriodDate    ?? "");

  // Notifications
  const [notifyUsers,    setNotifyUsers]    = useState(initialData?.notifications?.notifyUsers    ?? false);
  const [notifyEmail,    setNotifyEmail]    = useState(initialData?.notifications?.notifyEmail    ?? false);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(initialData?.notifications?.notifyWhatsApp ?? false);
  const [gradeSheet,     setGradeSheet]     = useState(initialData?.notifications?.gradeSheet     ?? false);

  // ── Steps definition ────────────────────────────────────────────────────────
  const totalSteps = 5;

  const STEPS: StepDef[] = [
    { id: 1, title: "Test Type",     subtitle: testType || "Select type",           icon: <List size={13} />,     completed: step > 1, active: step === 1 },
    { id: 2, title: "Test Details",  subtitle: testName || "Name & info",           icon: <FileText size={13} />, completed: step > 2, active: step === 2 },
    { id: 3, title: "Questions",     subtitle: "Configure questions",               icon: <Hash size={13} />,     completed: step > 3, active: step === 3 },
    { id: 4, title: "Schedule",      subtitle: startDate || "Set dates",            icon: <Calendar size={13} />, completed: step > 4, active: step === 4 },
    { id: 5, title: "Notifications", subtitle: "Alert settings",                    icon: <Bell size={13} />,     completed: false,    active: step === 5 },
  ];

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors: VErrors = {};
  if (!testType)   errors.testType    = "Please select a test type.";
  if (!testName.trim()) errors.testName = "Test name is required.";
  if (duration <= 0)    errors.totalDuration = "Duration must be greater than 0.";
  if (totalMarks <= 0)  errors.totalMarks    = "Total marks must be greater than 0.";
  if ((testType === "MCQ" || testType === "Mixed") && mcqCount <= 0)
    errors.mcqCount = "Question count must be > 0.";
  if ((testType === "Coding" || testType === "Mixed") && codingCfgType === "general" && codingGenCount <= 0)
    errors.codingCount = "Question count must be > 0.";
  if (!startDate) errors.startDate = "Start date is required.";
  if (!endDate)   errors.endDate   = "End date is required.";

  const touch = (...fields: string[]) =>
    setTouched(prev => { const s = new Set(prev); fields.forEach(f => s.add(f)); return s; });

  const stepHasError = (s: number) => {
    const map: Record<number, string[]> = {
      1: ["testType"],
      2: ["testName", "totalDuration", "totalMarks"],
      3: ["mcqCount", "codingCount"],
      4: ["startDate", "endDate"],
      5: [],
    };
    return (map[s] || []).some(k => !!errors[k] && touched.has(k));
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const touchStep = (s: number) => {
    const map: Record<number, string[]> = {
      1: ["testType"],
      2: ["testName", "totalDuration", "totalMarks"],
      3: ["mcqCount", "codingCount", "codingMarks"],
      4: ["startDate", "endDate"],
      5: [],
    };
    touch(...(map[s] || []));
  };

  const canAdvance = (s: number): boolean => {
    const map: Record<number, string[]> = {
      1: ["testType"],
      2: ["testName", "totalDuration", "totalMarks"],
      3: testType === "MCQ" ? ["mcqCount"] : testType === "Coding" ? ["codingCount"] : ["mcqCount", "codingCount"],
      4: ["startDate", "endDate"],
      5: [],
    };
    return (map[s] || []).every(k => !errors[k]);
  };

  const handleNext = () => {
    touchStep(step);
    if (canAdvance(step)) { setStep(s => s + 1); contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const handleBack = () => { setStep(s => s - 1); contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleSave = async () => {
    // Touch all fields
    touch("testType", "testName", "totalDuration", "totalMarks", "mcqCount", "codingCount", "startDate", "endDate");
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      onSave({
        testType: testType as "MCQ" | "Coding" | "Mixed",
        testInformation: { testId, testName, description, testLevel: level, totalDuration: duration, totalMarks },
        questionConfiguration: {
          ...(testType !== "Coding" && {
            mcqConfig: { questionCount: mcqCount, marksPerQuestion: mcqMarks, attemptLimitEnabled: mcqAttempt, submissionAttempts: mcqAttemptN },
          }),
          ...(testType !== "MCQ" && {
            codingConfig: { configType: codingCfgType, generalCount: codingGenCount, levelCounts: codingLevels, marksPerQuestion: codingMarks, attemptLimitEnabled: codingAttempt, submissionAttempts: codingAttemptN },
          }),
        },
        schedule: { startDate, endDate, gracePeriodEnabled: graceEnabled, gracePeriodDate: graceDate },
        notifications: { notifyUsers, notifyEmail, notifyWhatsApp, gradeSheet },
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const crumbs = [
    hierarchyData.courseName,
    hierarchyData.moduleName || hierarchyData.submoduleName || hierarchyData.topicName || hierarchyData.subtopicName || nodeName,
    "You Do",
    "Test Your Skills",
  ].filter(Boolean);

  // ── Close on backdrop ───────────────────────────────────────────────────────
  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  const LEVEL_OPTIONS = [
    { value: "beginner",     label: "Beginner",     color: "#10b981" },
    { value: "intermediate", label: "Intermediate", color: "#f59e0b" },
    { value: "expert",       label: "Expert",       color: "#ef4444" },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center p-4"
      style={{ background: "rgba(15,15,30,0.55)", backdropFilter: "blur(6px)" }}
      onClick={handleBackdrop}
    >
      <div
        className="relative w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 1100,
          height: "92vh",
          background: D.bg,
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.14)",
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top header ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${D.border}`, borderLeft: `3px solid ${D.green}`, background: D.bg }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: D.greenLight, border: `1px solid ${D.green}25` }}
            >
              <BookOpen size={16} style={{ color: D.green }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-extrabold" style={{ color: D.textMain }}>
                {isEditing ? "Edit Test" : "Create Test"}
              </h2>
              {/* Breadcrumb */}
              <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {crumbs.map((c, i) => (
                  <div key={i} className="flex items-center gap-0.5 flex-shrink-0">
                    {i === 0
                      ? <Home size={9} style={{ color: D.textHint, marginRight: 2 }} />
                      : <ChevronRight size={9} style={{ color: D.textHint }} />}
                    <span
                      className="text-[10px] font-semibold max-w-[120px] truncate"
                      style={{ color: i === crumbs.length - 1 ? D.green : D.textHint }}
                    >{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button" onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.textMuted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fee2e2"; (e.currentTarget as HTMLElement).style.color = D.red; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = D.surface; (e.currentTarget as HTMLElement).style.color = D.textMuted; }}
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body: sidebar + content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Sidebar ── */}
          <div
            className="flex-shrink-0 w-44 flex flex-col py-5 overflow-y-auto"
            style={{ background: D.surface, borderRight: `1px solid ${D.border}`, scrollbarWidth: "none" }}
          >
            <div className="px-3 mb-4">
              <p className="text-[9.5px] font-black uppercase tracking-[0.12em]" style={{ color: D.textHint }}>Steps</p>
            </div>
            {STEPS.map(s => (
              <button
                key={s.id} type="button"
                onClick={() => { if (s.id < step || (s.id === step + 1 && canAdvance(step))) { touchStep(step); setStep(s.id); } }}
                className="flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
                style={{
                  borderLeft: s.active ? `2.5px solid ${D.green}` : "2.5px solid transparent",
                  background: s.active ? D.greenLight : "transparent",
                  cursor: s.id <= step ? "pointer" : "default",
                  opacity: s.id > step + 1 ? 0.45 : 1,
                }}
              >
                {/* Step circle */}
                <div
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black relative"
                  style={{
                    background: s.completed ? D.green : s.active ? D.green : D.surface2,
                    color: s.completed || s.active ? "#fff" : D.textMuted,
                    border: `1.5px solid ${s.completed || s.active ? D.green : D.border2}`,
                  }}
                >
                  {s.completed ? <Check size={10} strokeWidth={3} /> : s.id}
                  {/* Error badge */}
                  {stepHasError(s.id) && !s.completed && (
                    <span
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black"
                      style={{ background: D.red, color: "#fff", border: `1.5px solid ${D.bg}` }}
                    >!</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate" style={{ color: s.active ? D.green : D.textSub }}>{s.title}</div>
                  <div className="text-[9.5px] font-medium truncate" style={{ color: D.textHint }}>{s.subtitle}</div>
                </div>
              </button>
            ))}

            {/* Test type display at bottom */}
            {testType && (
              <div className="mt-auto mx-3 mb-2 px-3 py-2 rounded-xl" style={{ background: D.greenLight, border: `1px solid ${D.green}25` }}>
                <div className="text-[8.5px] font-black uppercase tracking-wider" style={{ color: D.green }}>Test Type</div>
                <div className="text-[11px] font-bold mt-0.5" style={{ color: D.textMain }}>{testType}</div>
              </div>
            )}
          </div>

          {/* ── Main content ── */}
          <div
            ref={contentRef}
            className="flex-1 min-w-0 overflow-y-auto px-8 py-6"
            style={{ scrollbarWidth: "thin", scrollbarColor: `${D.border} transparent` }}
          >

            {/* ════════ STEP 1 — Test Type ════════ */}
            {step === 1 && (
              <div style={{ animation: "ctmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Choose Test Type</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Select the format for this test.</p>

                {errors.testType && touched.has("testType") && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-[11px] font-semibold"
                    style={{ background: "rgba(239,68,68,0.08)", color: D.red, border: "1px solid rgba(239,68,68,0.20)" }}>
                    <AlertCircle size={13} />{errors.testType}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    {
                      key: "MCQ" as const,
                      icon: <List size={22} />,
                      color: "#6366f1",
                      title: "MCQ",
                      desc: "Multiple-choice questions only. Fast to grade, great for concept checks.",
                    },
                    {
                      key: "Coding" as const,
                      icon: <Code size={22} />,
                      color: D.green,
                      title: "Coding",
                      desc: "Code-based problems. Tests practical programming and problem-solving skills.",
                    },
                    {
                      key: "Mixed" as const,
                      icon: <Layers size={22} />,
                      color: "#f97316",
                      title: "Mixed",
                      desc: "Combine MCQ and Coding. Best for comprehensive skill evaluation.",
                    },
                  ] as const).map(opt => {
                    const sel = testType === opt.key;
                    return (
                      <button
                        key={opt.key} type="button"
                        onClick={() => { setTestType(opt.key); touch("testType"); }}
                        className="text-left p-5 rounded-2xl transition-all"
                        style={{
                          background: sel ? `${opt.color}0d` : D.bg,
                          border: `2px solid ${sel ? opt.color : D.border}`,
                          boxShadow: sel ? `0 0 0 3px ${opt.color}18, 0 4px 16px ${opt.color}12` : "none",
                          transform: sel ? "translateY(-1px)" : "none",
                        }}
                      >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: `${opt.color}12`, color: opt.color }}>
                          {opt.icon}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-extrabold" style={{ color: D.textMain }}>{opt.title}</span>
                          {sel && <CheckCircle size={14} style={{ color: opt.color }} />}
                        </div>
                        <p className="text-[11px] leading-relaxed" style={{ color: D.textMuted }}>{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ════════ STEP 2 — Test Details ════════ */}
            {step === 2 && (
              <div style={{ animation: "ctmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Test Details</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Fill in the basic information for this test.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Test ID */}
                  <div>
                    <SectionLabel label="Test ID" hint="Auto-generated unique identifier" />
                    <TInput value={testId} onChange={setTestId} readOnly />
                  </div>

                  {/* Test Name */}
                  <div>
                    <SectionLabel label="Test Name" required />
                    <TInput
                      value={testName} onChange={setTestName}
                      onBlur={() => touch("testName")}
                      placeholder="e.g. Week 3 Concept Check"
                      error={errors.testName} touched={touched.has("testName")}
                    />
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <SectionLabel label="Description" hint="Brief instructions for students" />
                    <TInput type="textarea" value={description} onChange={setDescription} placeholder="Describe the test objectives…" />
                  </div>

                  {/* Level */}
                  <div>
                    <SectionLabel label="Difficulty Level" required />
                    <div className="flex gap-2">
                      {LEVEL_OPTIONS.map(o => (
                        <button key={o.value} type="button"
                          onClick={() => setLevel(o.value)}
                          className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                          style={{
                            background: level === o.value ? `${o.color}12` : D.surface,
                            border: `1.5px solid ${level === o.value ? o.color : D.border}`,
                            color: level === o.value ? o.color : D.textMuted,
                          }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <SectionLabel label="Duration (minutes)" required />
                    <TNumber
                      value={duration} onChange={setDuration} onBlur={() => touch("totalDuration")}
                      min={1} placeholder="e.g. 60"
                      error={errors.totalDuration} touched={touched.has("totalDuration")}
                    />
                  </div>

                  {/* Total Marks */}
                  <div>
                    <SectionLabel label="Total Marks" required />
                    <TNumber
                      value={totalMarks} onChange={setTotalMarks} onBlur={() => touch("totalMarks")}
                      min={1} placeholder="e.g. 100"
                      error={errors.totalMarks} touched={touched.has("totalMarks")}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ════════ STEP 3 — Question Config ════════ */}
            {step === 3 && (
              <div style={{ animation: "ctmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Question Configuration</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>
                  Configure question counts and scoring for <span style={{ color: D.green, fontWeight: 700 }}>{testType}</span> type.
                </p>

                {/* MCQ section */}
                {(testType === "MCQ" || testType === "Mixed") && (
                  <div
                    className="rounded-2xl p-5 mb-4"
                    style={{ border: `1.5px solid rgba(99,102,241,0.22)`, background: "rgba(99,102,241,0.04)" }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                        <List size={14} />
                      </div>
                      <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>MCQ Settings</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <SectionLabel label="Number of Questions" required />
                        <TNumber
                          value={mcqCount} onChange={setMcqCount} onBlur={() => touch("mcqCount")}
                          min={1} placeholder="e.g. 20"
                          error={errors.mcqCount} touched={touched.has("mcqCount")}
                        />
                      </div>
                      <div>
                        <SectionLabel label="Marks per Question" />
                        <TNumber value={mcqMarks} onChange={setMcqMarks} min={0} placeholder="e.g. 2" />
                        {mcqCount > 0 && mcqMarks > 0 && (
                          <p className="mt-1 text-[10px] font-semibold" style={{ color: D.green }}>
                            Total MCQ marks: {mcqCount * mcqMarks}
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-2 pt-2" style={{ borderTop: `1px solid rgba(99,102,241,0.15)` }}>
                        <TToggle
                          enabled={mcqAttempt} onChange={setMcqAttempt}
                          label="Limit Attempts"
                          description="Restrict how many times a student can submit this section."
                        />
                        {mcqAttempt && (
                          <div className="mt-3 w-40">
                            <SectionLabel label="Max Attempts" />
                            <TNumber value={mcqAttemptN} onChange={setMcqAttemptN} min={1} max={10} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Coding section */}
                {(testType === "Coding" || testType === "Mixed") && (
                  <div
                    className="rounded-2xl p-5"
                    style={{ border: `1.5px solid ${D.green}30`, background: D.greenLight }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.greenMed, color: D.green }}>
                        <Code size={14} />
                      </div>
                      <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Coding Settings</span>
                    </div>

                    {/* Config type tabs */}
                    <div className="flex gap-2 mb-4">
                      {(["general", "levelBased"] as const).map(opt => (
                        <button key={opt} type="button"
                          onClick={() => setCodingCfgType(opt)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                          style={{
                            background: codingCfgType === opt ? D.green : D.surface2,
                            color: codingCfgType === opt ? "#fff" : D.textMuted,
                            border: `1px solid ${codingCfgType === opt ? D.green : D.border}`,
                          }}
                        >
                          {opt === "general" ? "General" : "Level Based"}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {codingCfgType === "general" ? (
                        <div>
                          <SectionLabel label="Number of Questions" required />
                          <TNumber
                            value={codingGenCount} onChange={setCodingGenCount} onBlur={() => touch("codingCount")}
                            min={1} placeholder="e.g. 5"
                            error={errors.codingCount} touched={touched.has("codingCount")}
                          />
                        </div>
                      ) : (
                        <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                          {(["easy", "medium", "hard"] as const).map(lv => {
                            const colMap = { easy: "#10b981", medium: D.amber, hard: D.red };
                            return (
                              <div key={lv}>
                                <SectionLabel label={lv.charAt(0).toUpperCase() + lv.slice(1)} />
                                <TNumber
                                  value={codingLevels[lv]}
                                  onChange={v => setCodingLevels(prev => ({ ...prev, [lv]: v }))}
                                  min={0} placeholder="0"
                                />
                                <div className="mt-1 h-1 rounded-full" style={{ background: `${colMap[lv]}30` }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(codingLevels[lv] / 20 * 100, 100)}%`, background: colMap[lv] }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div>
                        <SectionLabel label="Marks per Question" />
                        <TNumber value={codingMarks} onChange={setCodingMarks} min={0} placeholder="e.g. 10" />
                      </div>

                      <div className="sm:col-span-2 pt-2" style={{ borderTop: `1px solid ${D.green}20` }}>
                        <TToggle
                          enabled={codingAttempt} onChange={setCodingAttempt}
                          label="Limit Submissions"
                          description="Set how many times a student can submit code."
                        />
                        {codingAttempt && (
                          <div className="mt-3 w-40">
                            <SectionLabel label="Max Submissions" />
                            <TNumber value={codingAttemptN} onChange={setCodingAttemptN} min={1} max={10} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════ STEP 4 — Schedule ════════ */}
            {step === 4 && (
              <div style={{ animation: "ctmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Schedule</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Set the availability window for this test.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Start */}
                  <div>
                    <SectionLabel label="Start Date & Time" required />
                    <input
                      type="datetime-local" value={startDate}
                      onChange={e => { setStartDate(e.target.value); touch("startDate"); }}
                      onBlur={() => touch("startDate")}
                      className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all"
                      style={{
                        borderColor: errors.startDate && touched.has("startDate") ? D.red : D.border,
                        fontFamily: "Plus Jakarta Sans, sans-serif", color: D.textMain,
                        background: D.bg,
                      }}
                    />
                    {errors.startDate && touched.has("startDate") && (
                      <p className="mt-1 text-xs" style={{ color: D.red }}>{errors.startDate}</p>
                    )}
                  </div>

                  {/* End */}
                  <div>
                    <SectionLabel label="End Date & Time" required />
                    <input
                      type="datetime-local" value={endDate}
                      onChange={e => { setEndDate(e.target.value); touch("endDate"); }}
                      onBlur={() => touch("endDate")}
                      min={startDate}
                      className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all"
                      style={{
                        borderColor: errors.endDate && touched.has("endDate") ? D.red : D.border,
                        fontFamily: "Plus Jakarta Sans, sans-serif", color: D.textMain,
                        background: D.bg,
                      }}
                    />
                    {errors.endDate && touched.has("endDate") && (
                      <p className="mt-1 text-xs" style={{ color: D.red }}>{errors.endDate}</p>
                    )}
                  </div>

                  {/* Grace period */}
                  <div className="sm:col-span-2 p-4 rounded-2xl" style={{ border: `1px solid ${D.border}`, background: D.surface }}>
                    <TToggle
                      enabled={graceEnabled} onChange={setGraceEnabled}
                      label="Grace Period"
                      description="Allow late submissions until this extended deadline."
                    />
                    {graceEnabled && (
                      <div className="mt-3">
                        <SectionLabel label="Grace Period Deadline" />
                        <input
                          type="datetime-local" value={graceDate}
                          onChange={e => setGraceDate(e.target.value)}
                          min={endDate}
                          className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border outline-none"
                          style={{ borderColor: D.border, fontFamily: "Plus Jakarta Sans, sans-serif", color: D.textMain, background: D.bg }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════ STEP 5 — Notifications ════════ */}
            {step === 5 && (
              <div style={{ animation: "ctmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Notification Settings</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Choose how students are notified about this test.</p>

                <div className="flex flex-col gap-3">
                  {/* Grade sheet */}
                  <div className="p-4 rounded-2xl" style={{ border: `1px solid ${D.border}`, background: D.surface }}>
                    <TToggle enabled={gradeSheet} onChange={setGradeSheet}
                      label="Grade Sheet" description="Send a grade sheet to students after evaluation." />
                  </div>

                  {/* Dashboard (locked on) */}
                  <div className="p-4 rounded-2xl flex items-start justify-between" style={{ border: `1px solid ${D.border}`, background: D.surface }}>
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold" style={{ color: D.textMain }}>Dashboard Notification</span>
                        <Lock size={10} style={{ color: D.textHint }} />
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: D.textMuted }}>Always active — students see this in their dashboard.</div>
                    </div>
                    <div className="relative inline-flex items-center h-6 w-11 rounded-full p-[2px]" style={{ background: D.green }}>
                      <span className="inline-block h-5 w-5 rounded-full bg-white shadow translate-x-5" />
                    </div>
                  </div>

                  {/* Notify users */}
                  <div
                    className="p-4 rounded-2xl"
                    style={{
                      border: `1.5px solid ${notifyUsers ? `${D.green}35` : D.border}`,
                      background: notifyUsers ? D.greenLight : D.surface,
                    }}
                  >
                    <TToggle enabled={notifyUsers} onChange={v => { setNotifyUsers(v); if (!v) { setNotifyEmail(false); setNotifyWhatsApp(false); } }}
                      label="Notify Users" description="Send notifications via the channels below." />

                    {notifyUsers && (
                      <div className="mt-3 flex flex-col gap-2 pl-2 border-l-2" style={{ borderColor: D.green }}>
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.10)", color: D.blue }}>
                            <Mail size={13} />
                          </div>
                          <div className="flex-1">
                            <TToggle enabled={notifyEmail} onChange={setNotifyEmail} label="Email" description="Send test link and details via email." />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 py-2" style={{ borderTop: `1px solid ${D.border}` }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.10)", color: D.emerald }}>
                            <MessageCircle size={13} />
                          </div>
                          <div className="flex-1">
                            <TToggle enabled={notifyWhatsApp} onChange={setNotifyWhatsApp} label="WhatsApp" description="Send test link via WhatsApp." />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-3.5"
          style={{ borderTop: `1px solid ${D.border}`, background: D.bg }}
        >
          {/* Progress dots + step counter */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: step === i + 1 ? 16 : 6,
                    height: 6,
                    background: i + 1 < step ? D.green : i + 1 === step ? D.green : D.border2,
                    opacity: i + 1 > step ? 0.4 : 1,
                  }}
                />
              ))}
            </div>
            <span className="text-[10.5px] font-bold" style={{ color: D.textMuted }}>
              Step {step} / {totalSteps}
            </span>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button" onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold"
                style={{ background: D.surface, color: D.textSub, border: `1px solid ${D.border}` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.surface2}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = D.surface}
              >
                <ArrowLeft size={12} />Back
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button" onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[11px] font-bold text-white"
                style={{ background: `linear-gradient(135deg,${D.green},${D.greenDark})`, boxShadow: `0 3px 12px ${D.greenGlow}` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
              >
                Continue<ArrowRight size={12} />
              </button>
            ) : (
              <button
                type="button" onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[11px] font-bold text-white"
                style={{
                  background: saving ? D.greenMed : `linear-gradient(135deg,${D.green},${D.greenDark})`,
                  boxShadow: saving ? "none" : `0 3px 12px ${D.greenGlow}`,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving
                  ? <><Loader2 size={12} className="animate-spin" />Saving…</>
                  : <><Check size={12} strokeWidth={2.5} />{isEditing ? "Update Test" : "Create Test"}</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes ctmFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CreateTestModal;
