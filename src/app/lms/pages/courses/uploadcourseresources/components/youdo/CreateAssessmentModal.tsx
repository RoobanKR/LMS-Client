"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import {
  X, ChevronRight, FileText, Code, Layers, Calendar, Bell,
  ArrowLeft, ArrowRight, Check, AlertCircle, Info, Clock,
  Mail, MessageCircle, Home, Hash, List, Loader2, Lock,
  CheckCircle, Plus, Shield, Eye, Monitor, Copy,
  KeyRound, Brain, FlaskConical, PenLine, Timer, Zap,
  BarChart2, AlertTriangle, Camera, Terminal, Cpu, BookOpen,
  ChevronDown,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const D = {
  blue:       "#6366f1",
  blueDark:   "#4f46e5",
  blueLight:  "rgba(99,102,241,0.08)",
  blueMed:    "rgba(99,102,241,0.15)",
  blueGlow:   "rgba(99,102,241,0.22)",
  green:      "#059669",
  greenLight: "rgba(5,150,105,0.08)",
  amber:      "#f59e0b",
  amberLight: "rgba(245,158,11,0.08)",
  red:        "#ef4444",
  redLight:   "rgba(239,68,68,0.08)",
  purple:     "#8b5cf6",
  purpleLight:"rgba(139,92,246,0.08)",
  orange:     "#f97316",
  orangeLight:"rgba(249,115,22,0.08)",
  emerald:    "#10b981",
  bg:         "#ffffff",
  surface:    "#fafafa",
  surface2:   "#f4f4f6",
  border:     "#ecedf1",
  border2:    "#e2e3e8",
  textMain:   "#1a1a2e",
  textSub:    "#6b6b7e",
  textMuted:  "#9b9bae",
  textHint:   "#bcbccc",
};

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface AssessmentPayload {
  assessmentType: "MCQ" | "Coding" | "Mixed";
  assessmentInfo: {
    assessmentId: string; name: string; description: string;
    level: "beginner" | "intermediate" | "expert";
    totalMarks: number;
  };
  questionConfig: {
    mcq?: {
      questionCount: number; marksPerQuestion: number;
      markMode: "equal" | "questionSpecific";
      attemptLimit: boolean; maxAttempts: number;
    };
    coding?: {
      configType: "general" | "levelBased";
      generalCount: number;
      levelCounts: { easy: number; medium: number; hard: number };
      marksPerQuestion: number;
      attemptLimit: boolean; maxAttempts: number;
    };
  };
  programmingScoring: {
    method: "testcase" | "ai" | "manual";
    scoringConfigType: "general" | "levelBased";
    levelScoreModes?: {
      easy: "level" | "qSpec";
      medium: "level" | "qSpec";
      hard: "level" | "qSpec";
    };
    testcase?: {
      enabled: boolean;
      testCaseCount: number; marksPerCase: number;
      levelConfig: {
        easy:   { count: number; marks: number };
        medium: { count: number; marks: number };
        hard:   { count: number; marks: number };
      };
      partialScoring: boolean; hiddenCases: boolean; hiddenCaseCount: number;
    };
    ai?: {
      enabled: boolean;
      codeQuality: boolean; efficiency: boolean; correctness: boolean;
      weightQuality: number; weightEfficiency: number; weightCorrectness: number;
    };
    manual?: {
      enabled: boolean; rubricBased: boolean;
      rubricItems: { label: string; maxMarks: number }[];
      peerReview: boolean;
    };
  };
  compilerSettings?: {
    allowedLanguages: string[];
    execTimeLimitSec: number;
    memoryLimitMB: number;
    multiSolutionAllowed: boolean;
    showExpectedOutput: boolean;
  };
  timeSettings: {
    timingMode: "overall" | "perQuestion";
    overallTiming: { durationMinutes: number; autoSubmit: boolean; pauseAllowed: boolean };
    warnings: { at50: boolean; at10: boolean; at5: boolean };
    perQuestionTimer: { showTimer: boolean };
  };
  security: {
    proctoring: { enabled: boolean; webcam: boolean; screenShare: boolean };
    browserLock: boolean; copyPasteRestrict: boolean;
    tabSwitchDetect: boolean; tabSwitchLimit: number;
    passwordProtect: boolean; password: string;
    ipRestrict: boolean; allowedIPs: string;
    shuffleQuestions: boolean; shuffleOptions: boolean;
  };
  schedule: {
    startDate: string; endDate: string;
    gracePeriod: boolean; gracePeriodDate: string;
  };
  notifications: {
    notifyUsers: boolean; notifyEmail: boolean;
    notifyWhatsApp: boolean; gradeSheet: boolean;
  };
}

export interface CreateAssessmentModalProps {
  onClose: () => void;
  onSave:  (data: AssessmentPayload) => void;
  nodeId: string; nodeName: string; nodeType: string;
  subcategory: string;
  hierarchyData: {
    courseName: string; moduleName: string; submoduleName: string;
    topicName: string; subtopicName: string; nodeType: string; level: number;
  };
  isEditing?: boolean;
  initialData?: Partial<AssessmentPayload>;
}

// ─── Shared sub-components ────────────────────────────────────────────────────
const AInput: React.FC<{
  type?: "text" | "textarea" | "password";
  value: string; onChange: (v: string) => void;
  placeholder?: string; disabled?: boolean; readOnly?: boolean;
  error?: string; showError?: boolean; id?: string;
}> = ({ type = "text", value, onChange, placeholder, disabled, readOnly, error, showError, id }) => {
  const [iv, setIv] = useState(value);
  useEffect(() => setIv(value), [value]);
  const hasErr = !!error && showError;
  const cls = [
    "w-full px-3 py-2 text-sm rounded-xl border outline-none transition-all",
    hasErr
      ? "border-red-300 bg-red-50/30 focus:border-red-400"
      : "border-[#ecedf1] bg-white focus:border-[#6366f1] focus:ring-1 focus:ring-[rgba(99,102,241,0.12)]",
    disabled || readOnly ? "bg-[#fafafa] text-[#9b9bae] cursor-not-allowed" : "text-[#1a1a2e]",
  ].join(" ");
  const p = {
    id, value: iv, placeholder, disabled, readOnly, className: cls,
    style: { fontFamily: "Plus Jakarta Sans, sans-serif" },
    onChange: (e: ChangeEvent<any>) => { setIv(e.target.value); onChange(e.target.value); },
    onBlur:   () => onChange(iv),
  };
  return (
    <div className="w-full">
      {type === "textarea"
        ? <textarea {...p} rows={3} style={{ ...p.style, resize: "none" }} />
        : <input {...p} type={type} />}
      {hasErr && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
    </div>
  );
};

const ANumber: React.FC<{
  value: number; onChange: (v: number) => void;
  min?: number; max?: number; placeholder?: string;
  error?: string; showError?: boolean; disabled?: boolean; suffix?: string;
}> = ({ value, onChange, min = 0, max = 9999, placeholder, error, showError, disabled, suffix }) => {
  const [d, setD] = useState(value === 0 ? "" : value.toString());
  useEffect(() => setD(value === 0 ? "" : value.toString()), [value]);
  const hasErr = !!error && showError;
  return (
    <div className="w-full">
      <div className="relative">
        <input
          type="text" inputMode="decimal" value={d} placeholder={placeholder} disabled={disabled}
          onChange={e => {
            const r = e.target.value;
            if (r === "" || /^\d*\.?\d*$/.test(r)) {
              setD(r);
              const n = parseFloat(r);
              if (!isNaN(n) && n >= min && n <= max) onChange(n);
              if (r === "") onChange(0);
            }
          }}
          onBlur={() => {
            if (!d) { setD(""); onChange(0); }
            else {
              const n = parseFloat(d);
              if (isNaN(n) || n < min) { setD(min.toString()); onChange(min); }
              else if (n > max) { setD(max.toString()); onChange(max); }
            }
          }}
          className={[
            "w-full px-3 py-2 text-sm rounded-xl border outline-none transition-all",
            suffix ? "pr-10" : "",
            hasErr ? "border-red-300 bg-red-50/30" : "border-[#ecedf1] bg-white focus:border-[#6366f1] focus:ring-1 focus:ring-[rgba(99,102,241,0.12)]",
            disabled ? "bg-[#fafafa] text-[#9b9bae] cursor-not-allowed" : "text-[#1a1a2e]",
          ].join(" ")}
          style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold pointer-events-none" style={{ color: D.textHint }}>
            {suffix}
          </span>
        )}
      </div>
      {hasErr && <p className="mt-1 text-xs" style={{ color: D.red }}>{error}</p>}
    </div>
  );
};

const AToggle: React.FC<{
  enabled: boolean; onChange: (v: boolean) => void;
  label?: string; description?: string; color?: string;
}> = ({ enabled, onChange, label, description, color = D.blue }) => (
  <div className="flex items-start justify-between gap-3">
    {(label || description) && (
      <div className="flex-1">
        {label       && <div className="text-[12.5px] font-bold"    style={{ color: D.textMain }}>{label}</div>}
        {description && <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: D.textMuted }}>{description}</div>}
      </div>
    )}
    <button type="button" role="switch" aria-checked={enabled} onClick={() => onChange(!enabled)}
      className="relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 outline-none p-[2px]"
      style={{ background: enabled ? color : D.border2 }}>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  </div>
);

const SLabel: React.FC<{ label: string; required?: boolean; hint?: string }> = ({ label, required, hint }) => (
  <div className="flex items-center gap-1.5 mb-1.5">
    <label className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: D.textSub }}>
      {label}{required && <span style={{ color: D.red }}> *</span>}
    </label>
    {hint && (
      <div className="relative group inline-block">
        <Info size={11} style={{ color: D.textHint, cursor: "help" }} />
        <div className="absolute left-5 -top-1 z-50 hidden group-hover:block w-56 p-2.5 text-[10.5px] rounded-xl shadow-2xl leading-relaxed"
          style={{ background: D.textMain, color: "#fff", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          {hint}
        </div>
      </div>
    )}
  </div>
);

const Divider = () => <div className="my-4" style={{ borderTop: `1px solid ${D.border}` }} />;

const Card: React.FC<{ children: React.ReactNode; color?: string; className?: string }> = ({ children, color = D.border, className = "" }) => (
  <div className={`rounded-2xl p-5 ${className}`}
    style={{ border: `1.5px solid ${color}`, background: color.startsWith("rgba") ? color.replace(/[\d.]+\)$/, "0.04)") : `${color}08` }}>
    {children}
  </div>
);

const genId = () => `ASM-${Date.now().toString(36).toUpperCase().slice(-6)}`;

const ALL_LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java", "C", "C++", "Go", "Rust", "Swift", "Kotlin", "PHP", "Ruby"];

// ─── Main component ───────────────────────────────────────────────────────────
const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  onClose, onSave, nodeId, nodeName, hierarchyData, subcategory, isEditing, initialData,
}) => {
  const [step, setStep]               = useState(1);
  const [saving, setSaving]           = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; steps: { id: number; title: string; count: number }[] }>({ visible: false, steps: [] });
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Step 1: Type ──────────────────────────────────────────────────────────
  const [asmType, setAsmType] = useState<"MCQ" | "Coding" | "Mixed" | "">(initialData?.assessmentType ?? "");

  // ── Step 2: Details ───────────────────────────────────────────────────────
  const [asmId,      setAsmId]      = useState(initialData?.assessmentInfo?.assessmentId ?? genId());
  const [asmName,    setAsmName]    = useState(initialData?.assessmentInfo?.name         ?? "");
  const [asmDesc,    setAsmDesc]    = useState(initialData?.assessmentInfo?.description  ?? "");
  const [asmLevel,   setAsmLevel]   = useState<"beginner"|"intermediate"|"expert">(initialData?.assessmentInfo?.level ?? "beginner");
  const [totalMarks, setTotalMarks] = useState(initialData?.assessmentInfo?.totalMarks   ?? 0);

  // ── Step 3: Question config ────────────────────────────────────────────────
  // MCQ mark distribution mode: "equal" = auto split from totalMarks, "questionSpecific" = set per question
  const [mcqMarkMode,    setMcqMarkMode]    = useState<"equal" | "questionSpecific">(
    (initialData?.questionConfig?.mcq as any)?.markMode ?? "equal"
  );
  const [mcqCount,       setMcqCount]       = useState(initialData?.questionConfig?.mcq?.questionCount    ?? 0);
  const [mcqMPQ,         setMcqMPQ]         = useState(initialData?.questionConfig?.mcq?.marksPerQuestion ?? 0);
  const [mcqAttempt,     setMcqAttempt]     = useState(initialData?.questionConfig?.mcq?.attemptLimit     ?? false);
  const [mcqAttemptN,    setMcqAttemptN]    = useState(initialData?.questionConfig?.mcq?.maxAttempts      ?? 1);

  // Auto-compute marks per question when in "equal" mode
  const mcqAutoMPQ = mcqCount > 0 && totalMarks > 0
    ? parseFloat((totalMarks / mcqCount).toFixed(2))
    : 0;

  const [codingCfg,      setCodingCfg]      = useState<"general"|"levelBased">(initialData?.questionConfig?.coding?.configType ?? "general");
  const [codingGen,      setCodingGen]      = useState(initialData?.questionConfig?.coding?.generalCount   ?? 0);
  const [codingLvl,      setCodingLvl]      = useState(initialData?.questionConfig?.coding?.levelCounts    ?? { easy: 0, medium: 0, hard: 0 });
  const [codingMPQ,      setCodingMPQ]      = useState(initialData?.questionConfig?.coding?.marksPerQuestion ?? 0);
  const [codingAttempt,  setCodingAttempt]  = useState(initialData?.questionConfig?.coding?.attemptLimit   ?? false);
  const [codingAttemptN, setCodingAttemptN] = useState(initialData?.questionConfig?.coding?.maxAttempts    ?? 1);

  // ── Step 4: Evaluation configuration ──────────────────────────────────────
  const [scoringMethod,     setScoringMethod]     = useState<"testcase"|"ai"|"manual">(
    (initialData?.programmingScoring?.method === "hybrid" ? "testcase" : initialData?.programmingScoring?.method) ?? "testcase"
  );
  const [scoringConfigType, setScoringConfigType] = useState<"general"|"levelBased">(initialData?.programmingScoring?.scoringConfigType ?? "general");
  // test case — general
  const [tcEnabled,    setTcEnabled]    = useState(initialData?.programmingScoring?.testcase?.enabled        ?? true);
  const [tcCount,      setTcCount]      = useState(initialData?.programmingScoring?.testcase?.testCaseCount  ?? 5);
  const [tcMPC,        setTcMPC]        = useState(initialData?.programmingScoring?.testcase?.marksPerCase   ?? 2);
  // test case — level based
  const [tcLvl, setTcLvl] = useState(initialData?.programmingScoring?.testcase?.levelConfig ?? {
    easy:   { count: 3, marks: 1 },
    medium: { count: 5, marks: 2 },
    hard:   { count: 8, marks: 3 },
  });
  const [tcPartial, setTcPartial] = useState(initialData?.programmingScoring?.testcase?.partialScoring  ?? false);
  const [tcHidden,  setTcHidden]  = useState(initialData?.programmingScoring?.testcase?.hiddenCases     ?? false);
  const [tcHiddenN, setTcHiddenN] = useState(initialData?.programmingScoring?.testcase?.hiddenCaseCount ?? 2);
  // ai
  const [aiEnabled,  setAiEnabled]  = useState(initialData?.programmingScoring?.ai?.enabled          ?? false);
  const [aiQuality,  setAiQuality]  = useState(initialData?.programmingScoring?.ai?.codeQuality      ?? true);
  const [aiEffic,    setAiEffic]    = useState(initialData?.programmingScoring?.ai?.efficiency        ?? true);
  const [aiCorrect,  setAiCorrect]  = useState(initialData?.programmingScoring?.ai?.correctness       ?? true);
  const [aiWQ,       setAiWQ]       = useState(initialData?.programmingScoring?.ai?.weightQuality     ?? 30);
  const [aiWE,       setAiWE]       = useState(initialData?.programmingScoring?.ai?.weightEfficiency  ?? 30);
  const [aiWC,       setAiWC]       = useState(initialData?.programmingScoring?.ai?.weightCorrectness ?? 40);
  // manual
  const [manEnabled, setManEnabled] = useState(initialData?.programmingScoring?.manual?.enabled     ?? false);
  const [manRubric,  setManRubric]  = useState(initialData?.programmingScoring?.manual?.rubricBased ?? false);
  const [manItems,   setManItems]   = useState<{ label: string; maxMarks: number }[]>(
    initialData?.programmingScoring?.manual?.rubricItems ?? [{ label: "Correctness", maxMarks: 40 }, { label: "Code Style", maxMarks: 20 }]
  );
  const [manPeer, setManPeer] = useState(initialData?.programmingScoring?.manual?.peerReview ?? false);

  // Level-based scoring modes (per level: "level" = Level Specific, "qSpec" = Question Specific)
  const [lvlScoreMode, setLvlScoreMode] = useState<{ easy: "level"|"qSpec"; medium: "level"|"qSpec"; hard: "level"|"qSpec" }>(
    initialData?.programmingScoring?.levelScoreModes ?? { easy: "level", medium: "level", hard: "level" }
  );

  // ── Step 5 (Coding/Mixed): Compiler settings ──────────────────────────────
  const [compilerLangs,   setCompilerLangs]   = useState<string[]>(initialData?.compilerSettings?.allowedLanguages ?? ["Python", "JavaScript", "Java", "C++"]);
  const [execTimeLimit,   setExecTimeLimit]   = useState(initialData?.compilerSettings?.execTimeLimitSec  ?? 5);
  const [memoryLimit,     setMemoryLimit]     = useState(initialData?.compilerSettings?.memoryLimitMB     ?? 256);
  const [multiSolution,   setMultiSolution]   = useState(initialData?.compilerSettings?.multiSolutionAllowed ?? false);
  const [showExpOutput,   setShowExpOutput]   = useState(initialData?.compilerSettings?.showExpectedOutput ?? true);

  const toggleLang = (lang: string) =>
    setCompilerLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);

  // ── Time settings ─────────────────────────────────────────────────────────
  const [timingMode,      setTimingMode]      = useState<"overall"|"perQuestion">(initialData?.timeSettings?.timingMode ?? "overall");
  const [overallDuration, setOverallDuration] = useState(initialData?.timeSettings?.overallTiming?.durationMinutes ?? 60);
  const [autoSubmit,      setAutoSubmit]      = useState(initialData?.timeSettings?.overallTiming?.autoSubmit       ?? true);
  const [pauseAllowed,    setPauseAllowed]    = useState(initialData?.timeSettings?.overallTiming?.pauseAllowed     ?? false);
  const [pqShowTimer,     setPqShowTimer]     = useState(initialData?.timeSettings?.perQuestionTimer?.showTimer     ?? true);
  const [warn50,          setWarn50]          = useState(initialData?.timeSettings?.warnings?.at50 ?? true);
  const [warn10,          setWarn10]          = useState(initialData?.timeSettings?.warnings?.at10 ?? true);
  const [warn5,           setWarn5]           = useState(initialData?.timeSettings?.warnings?.at5  ?? true);

  // ── Security ───────────────────────────────────────────────────────────────
  const [procEnabled,  setProcEnabled]  = useState(initialData?.security?.proctoring?.enabled     ?? false);
  const [procWebcam,   setProcWebcam]   = useState(initialData?.security?.proctoring?.webcam      ?? false);
  const [procScreen,   setProcScreen]   = useState(initialData?.security?.proctoring?.screenShare ?? false);
  const [browserLock,  setBrowserLock]  = useState(initialData?.security?.browserLock             ?? false);
  const [copyPaste,    setCopyPaste]    = useState(initialData?.security?.copyPasteRestrict        ?? false);
  const [tabDetect,    setTabDetect]    = useState(initialData?.security?.tabSwitchDetect          ?? false);
  const [tabLimit,     setTabLimit]     = useState(initialData?.security?.tabSwitchLimit           ?? 3);
  const [passProtect,  setPassProtect]  = useState(initialData?.security?.passwordProtect          ?? false);
  const [password,     setPassword]     = useState(initialData?.security?.password                 ?? "");
  const [ipRestrict,   setIpRestrict]   = useState(initialData?.security?.ipRestrict               ?? false);
  const [allowedIPs,   setAllowedIPs]   = useState(initialData?.security?.allowedIPs               ?? "");
  const [shuffleQ,     setShuffleQ]     = useState(initialData?.security?.shuffleQuestions         ?? false);
  const [shuffleO,     setShuffleO]     = useState(initialData?.security?.shuffleOptions           ?? false);

  // ── Schedule ───────────────────────────────────────────────────────────────
  const [startDate,    setStartDate]    = useState(initialData?.schedule?.startDate      ?? "");
  const [endDate,      setEndDate]      = useState(initialData?.schedule?.endDate        ?? "");
  const [graceEnabled, setGraceEnabled] = useState(initialData?.schedule?.gracePeriod   ?? false);
  const [graceDate,    setGraceDate]    = useState(initialData?.schedule?.gracePeriodDate ?? "");

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifyUsers, setNotifyUsers] = useState(initialData?.notifications?.notifyUsers    ?? false);
  const [notifyEmail, setNotifyEmail] = useState(initialData?.notifications?.notifyEmail    ?? false);
  const [notifyWA,    setNotifyWA]    = useState(initialData?.notifications?.notifyWhatsApp ?? false);
  const [gradeSheet,  setGradeSheet]  = useState(initialData?.notifications?.gradeSheet     ?? false);

  // ── Steps definition ──────────────────────────────────────────────────────
  const hasCoding = asmType === "Coding" || asmType === "Mixed";

  const SID = {
    TYPE:     1,
    DETAILS:  2,
    QUESTIONS:3,
    SCORING:  hasCoding ? 4 : -1,
    COMPILER: hasCoding ? 5 : -1,
    TIME:     hasCoding ? 6 : 4,
    SECURITY: hasCoding ? 7 : 5,
    SCHEDULE: hasCoding ? 8 : 6,
    NOTIFY:   hasCoding ? 9 : 7,
  };
  const STEPS_COUNT = hasCoding ? 9 : 7;

  const allSteps = [
    { id: 1, title: "Type",      subtitle: asmType || "Select type",   icon: <List size={12} />      },
    { id: 2, title: "Details",   subtitle: asmName || "Name & marks",  icon: <FileText size={12} />  },
    { id: 3, title: "Questions", subtitle: "Configure Qs",             icon: <Hash size={12} />      },
    ...(hasCoding ? [
      { id: 4, title: "Evaluation", subtitle: scoringMethod,           icon: <BarChart2 size={12} /> },
      { id: 5, title: "Compiler",   subtitle: `${compilerLangs.length} langs`, icon: <Terminal size={12} /> },
    ] : []),
    { id: hasCoding ? 6 : 4,  title: "Time",     subtitle: timingMode === "overall" ? "Overall timing" : "Per question", icon: <Timer size={12} />    },
    { id: hasCoding ? 7 : 5,  title: "Security", subtitle: "Proctoring & locks",  icon: <Shield size={12} />   },
    { id: hasCoding ? 8 : 6,  title: "Schedule", subtitle: startDate || "Dates",  icon: <Calendar size={12} /> },
    { id: hasCoding ? 9 : 7,  title: "Notify",   subtitle: "Alerts",              icon: <Bell size={12} />     },
  ];

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors: Record<string, string> = {};
  if (!asmType)        errors.asmType    = "Please select an assessment type.";
  if (!asmName.trim()) errors.asmName    = "Name is required.";
  if (totalMarks <= 0) errors.totalMarks = "Total marks must be > 0.";
  if ((asmType === "MCQ" || asmType === "Mixed") && mcqCount <= 0)
    errors.mcqCount = "MCQ question count > 0 required.";
  if ((asmType === "Coding" || asmType === "Mixed") && codingCfg === "general" && codingGen <= 0)
    errors.codingCount = "Coding question count > 0 required.";
  if (hasCoding && compilerLangs.length === 0)
    errors.compilerLangs = "Select at least one language.";
  if (!startDate) errors.startDate = "Start date required.";
  if (!endDate)   errors.endDate   = "End date required.";
  if (passProtect && !password.trim()) errors.password = "Password is required.";
  if (aiEnabled && (aiWQ + aiWE + aiWC) !== 100) errors.aiWeights = "AI weights must sum to 100.";

  const stepFields: Record<number, string[]> = {
    1: ["asmType"],
    2: ["asmName", "totalMarks"],
    3: ["mcqCount", "codingCount"],
    [SID.SCORING]:  hasCoding ? ["aiWeights"] : [],
    [SID.COMPILER]: hasCoding ? ["compilerLangs"] : [],
    [SID.TIME]:     [],
    [SID.SECURITY]: ["password"],
    [SID.SCHEDULE]: ["startDate", "endDate"],
    [SID.NOTIFY]:   [],
  };

  const stepHasError = (s: number) =>
    (stepFields[s] || []).some(k => !!errors[k]);

  const goToStep = (s: number) => {
    setStep(s);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => goToStep(Math.min(step + 1, STEPS_COUNT));
  const handleBack = () => goToStep(Math.max(step - 1, 1));

  // Auto-dismiss toast
  useEffect(() => {
    if (toast.visible) {
      const t = setTimeout(() => setToast(p => ({ ...p, visible: false })), 5000);
      return () => clearTimeout(t);
    }
  }, [toast.visible]);

  const handleSave = async () => {
    setSaveAttempted(true);
    if (Object.keys(errors).length > 0) {
      const errorSteps = allSteps
        .filter(s => stepHasError(s.id))
        .map(s => ({
          id: s.id,
          title: s.title,
          count: (stepFields[s.id] || []).filter(k => !!errors[k]).length,
        }));
      setToast({ visible: true, steps: errorSteps });
      if (errorSteps.length > 0) goToStep(errorSteps[0].id);
      return;
    }
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 700));
      onSave({
        assessmentType: asmType as any,
        assessmentInfo: { assessmentId: asmId, name: asmName, description: asmDesc, level: asmLevel, totalMarks },
        questionConfig: {
          ...(asmType !== "Coding" && {
            mcq: {
              questionCount: mcqCount,
              marksPerQuestion: mcqMarkMode === "equal" ? mcqAutoMPQ : mcqMPQ,
              markMode: mcqMarkMode,
              attemptLimit: mcqAttempt,
              maxAttempts: mcqAttemptN,
            },
          }),
          ...(asmType !== "MCQ" && { coding: { configType: codingCfg, generalCount: codingGen, levelCounts: codingLvl, marksPerQuestion: codingMPQ, attemptLimit: codingAttempt, maxAttempts: codingAttemptN } }),
        },
        programmingScoring: {
          method: scoringMethod,
          scoringConfigType,
          levelScoreModes: lvlScoreMode,
          testcase: { enabled: tcEnabled, testCaseCount: tcCount, marksPerCase: tcMPC, levelConfig: tcLvl, partialScoring: tcPartial, hiddenCases: tcHidden, hiddenCaseCount: tcHiddenN },
          ai:       { enabled: aiEnabled, codeQuality: aiQuality, efficiency: aiEffic, correctness: aiCorrect, weightQuality: aiWQ, weightEfficiency: aiWE, weightCorrectness: aiWC },
          manual:   { enabled: manEnabled, rubricBased: manRubric, rubricItems: manItems, peerReview: manPeer },
        },
        ...(hasCoding && {
          compilerSettings: {
            allowedLanguages: compilerLangs,
            execTimeLimitSec: execTimeLimit,
            memoryLimitMB: memoryLimit,
            multiSolutionAllowed: multiSolution,
            showExpectedOutput: showExpOutput,
          },
        }),
        timeSettings: {
          timingMode,
          overallTiming: { durationMinutes: overallDuration, autoSubmit, pauseAllowed },
          warnings: { at50: warn50, at10: warn10, at5: warn5 },
          perQuestionTimer: { showTimer: pqShowTimer },
        },
        security: {
          proctoring: { enabled: procEnabled, webcam: procWebcam, screenShare: procScreen },
          browserLock, copyPasteRestrict: copyPaste, tabSwitchDetect: tabDetect, tabSwitchLimit: tabLimit,
          passwordProtect: passProtect, password, ipRestrict, allowedIPs,
          shuffleQuestions: shuffleQ, shuffleOptions: shuffleO,
        },
        schedule: { startDate, endDate, gracePeriod: graceEnabled, gracePeriodDate: graceDate },
        notifications: { notifyUsers, notifyEmail, notifyWhatsApp: notifyWA, gradeSheet },
      });
    } finally { setSaving(false); }
  };

  const crumbs = [hierarchyData.courseName, nodeName, "You Do", "Assessment"].filter(Boolean);

  const LEVEL_OPTS = [
    { value: "beginner",     label: "Beginner",     color: "#10b981" },
    { value: "intermediate", label: "Intermediate", color: D.amber   },
    { value: "expert",       label: "Expert",       color: D.red     },
  ] as const;

  const aiTotal = aiWQ + aiWE + aiWC;

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center p-4"
      style={{ background: "rgba(15,15,30,0.55)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 1160, height: "94vh", background: D.bg, borderRadius: 20, boxShadow: "0 32px 80px rgba(0,0,0,0.28)", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Error Toast ── */}
        {toast.visible && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[900] shadow-2xl rounded-2xl overflow-hidden"
            style={{ minWidth: 300, maxWidth: 460, animation: "asmFade 0.2s ease-out both" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: D.redLight, borderBottom: `1px solid ${D.red}25` }}>
              <AlertCircle size={14} style={{ color: D.red }} />
              <span className="text-[12px] font-extrabold flex-1" style={{ color: D.red }}>
                Fix {toast.steps.reduce((a, s) => a + s.count, 0)} error{toast.steps.reduce((a, s) => a + s.count, 0) !== 1 ? "s" : ""} before saving
              </span>
              <button type="button" onClick={() => setToast(p => ({ ...p, visible: false }))}
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: `${D.red}20`, color: D.red }}>
                <X size={10} strokeWidth={3} />
              </button>
            </div>
            <div className="px-3 py-2.5 flex flex-col gap-1.5" style={{ background: D.bg }}>
              {toast.steps.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { goToStep(s.id); setToast(p => ({ ...p, visible: false })); }}
                  className="flex items-center gap-2.5 text-left py-2 px-3 rounded-xl transition-all"
                  style={{ background: D.surface, border: `1px solid ${D.border}` }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.surface2}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = D.surface}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
                    style={{ background: D.red, color: "#fff" }}>!</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold" style={{ color: D.textMain }}>Step {s.id}: {s.title}</span>
                    <span className="text-[10px] font-medium ml-1.5" style={{ color: D.red }}>{s.count} error{s.count > 1 ? "s" : ""}</span>
                  </div>
                  <ChevronRight size={11} style={{ color: D.textMuted, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${D.border}`, borderLeft: `3px solid ${D.blue}`, background: D.bg }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: D.blueLight, border: `1px solid ${D.blue}25` }}>
              <FileText size={16} style={{ color: D.blue }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-extrabold" style={{ color: D.textMain }}>
                {isEditing ? "Edit Assessment" : "Create Assessment"}
              </h2>
              <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {crumbs.map((c, i) => (
                  <div key={i} className="flex items-center gap-0.5 flex-shrink-0">
                    {i === 0
                      ? <Home size={9} style={{ color: D.textHint, marginRight: 2 }} />
                      : <ChevronRight size={9} style={{ color: D.textHint }} />}
                    <span className="text-[10px] font-semibold max-w-[120px] truncate"
                      style={{ color: i === crumbs.length - 1 ? D.blue : D.textHint }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: D.surface, border: `1px solid ${D.border}`, color: D.textMuted }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fee2e2"; (e.currentTarget as HTMLElement).style.color = D.red; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = D.surface; (e.currentTarget as HTMLElement).style.color = D.textMuted; }}>
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Sidebar ── */}
          <div className="flex-shrink-0 w-44 flex flex-col py-5 overflow-y-auto"
            style={{ background: D.surface, borderRight: `1px solid ${D.border}`, scrollbarWidth: "none" }}>
            <div className="px-3 mb-4">
              <p className="text-[9.5px] font-black uppercase tracking-[0.12em]" style={{ color: D.textHint }}>Steps</p>
            </div>
            {allSteps.map(s => {
              const isActive    = step === s.id;
              const isCompleted = step > s.id;
              const hasErr      = stepHasError(s.id) && saveAttempted;
              return (
                <button key={s.id} type="button"
                  onClick={() => goToStep(s.id)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-left w-full transition-all"
                  style={{
                    borderLeft: isActive ? `2.5px solid ${D.blue}` : "2.5px solid transparent",
                    background: isActive ? D.blueLight : "transparent",
                    cursor: "pointer",
                  }}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black relative"
                    style={{
                      background: isCompleted ? D.blue : isActive ? D.blue : D.surface2,
                      color: isCompleted || isActive ? "#fff" : D.textMuted,
                      border: `1.5px solid ${isCompleted || isActive ? D.blue : D.border2}`,
                    }}>
                    {isCompleted ? <Check size={10} strokeWidth={3} /> : s.id}
                    {hasErr && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black"
                        style={{ background: D.red, color: "#fff", border: `1.5px solid ${D.bg}` }}>!</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate" style={{ color: isActive ? D.blue : D.textSub }}>{s.title}</div>
                    <div className="text-[9.5px] font-medium truncate" style={{ color: D.textHint }}>{s.subtitle}</div>
                  </div>
                </button>
              );
            })}
            {asmType && (
              <div className="mt-auto mx-3 mb-2 px-3 py-2 rounded-xl" style={{ background: D.blueLight, border: `1px solid ${D.blue}25` }}>
                <div className="text-[8.5px] font-black uppercase tracking-wider" style={{ color: D.blue }}>Type</div>
                <div className="text-[11px] font-bold mt-0.5" style={{ color: D.textMain }}>{asmType}</div>
              </div>
            )}
            {saveAttempted && Object.keys(errors).length > 0 && (
              <div className="mx-3 mb-3 px-3 py-2 rounded-xl" style={{ background: D.redLight, border: `1px solid ${D.red}25` }}>
                <div className="text-[8.5px] font-black uppercase tracking-wider" style={{ color: D.red }}>Errors</div>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color: D.red }}>{Object.keys(errors).length} issue{Object.keys(errors).length > 1 ? "s" : ""} to fix</div>
              </div>
            )}
          </div>

          {/* ── Content ── */}
          <div ref={contentRef} className="flex-1 min-w-0 overflow-y-auto px-8 py-6"
            style={{ scrollbarWidth: "thin", scrollbarColor: `${D.border} transparent` }}>

            {/* ════ STEP 1 — Type ════ */}
            {step === SID.TYPE && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Choose Assessment Type</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Select the format for this assessment.</p>
                {errors.asmType && saveAttempted && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-[11px] font-semibold"
                    style={{ background: D.redLight, color: D.red, border: `1px solid ${D.red}30` }}>
                    <AlertCircle size={13} />{errors.asmType}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { key: "MCQ"    as const, icon: <List size={22} />,   color: D.blue,   title: "MCQ",    desc: "Multiple-choice questions. Fast grading and ideal for theory checks." },
                    { key: "Coding" as const, icon: <Code size={22} />,   color: D.green,  title: "Coding", desc: "Code-based problems. Evaluate practical programming skills with auto or manual scoring." },
                    { key: "Mixed"  as const, icon: <Layers size={22} />, color: D.orange, title: "Mixed",  desc: "Combine MCQ and Coding for comprehensive skill evaluation." },
                  ].map(opt => {
                    const sel = asmType === opt.key;
                    return (
                      <button key={opt.key} type="button" onClick={() => setAsmType(opt.key)}
                        className="text-left p-5 rounded-2xl transition-all"
                        style={{
                          background: sel ? `${opt.color}0d` : D.bg,
                          border: `2px solid ${sel ? opt.color : D.border}`,
                          boxShadow: sel ? `0 0 0 3px ${opt.color}18, 0 4px 16px ${opt.color}12` : "none",
                          transform: sel ? "translateY(-1px)" : "none",
                        }}>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: `${opt.color}12`, color: opt.color }}>{opt.icon}</div>
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

            {/* ════ STEP 2 — Details ════ */}
            {step === SID.DETAILS && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Assessment Details</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Fill in the basic information.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <SLabel label="Assessment ID" hint="Auto-generated, read-only" />
                    <AInput value={asmId} onChange={setAsmId} readOnly />
                  </div>
                  <div>
                    <SLabel label="Assessment Name" required />
                    <AInput value={asmName} onChange={setAsmName} placeholder="e.g. Final Module Assessment"
                      error={errors.asmName} showError={saveAttempted} />
                  </div>
                  <div className="sm:col-span-2">
                    <SLabel label="Description" hint="Instructions shown to students" />
                    <AInput type="textarea" value={asmDesc} onChange={setAsmDesc} placeholder="Describe the assessment objectives…" />
                  </div>
                  <div>
                    <SLabel label="Difficulty Level" required />
                    <div className="flex gap-2">
                      {LEVEL_OPTS.map(o => (
                        <button key={o.value} type="button" onClick={() => setAsmLevel(o.value)}
                          className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                          style={{
                            background: asmLevel === o.value ? `${o.color}12` : D.surface,
                            border: `1.5px solid ${asmLevel === o.value ? o.color : D.border}`,
                            color: asmLevel === o.value ? o.color : D.textMuted,
                          }}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <SLabel label="Total Marks" required />
                    <ANumber value={totalMarks} onChange={setTotalMarks} min={1} placeholder="e.g. 100"
                      error={errors.totalMarks} showError={saveAttempted} />
                  </div>
                </div>
              </div>
            )}

            {/* ════ STEP 3 — Questions ════ */}
            {step === SID.QUESTIONS && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Question Configuration</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>
                  Configure question counts for <span style={{ color: D.blue, fontWeight: 700 }}>{asmType}</span>.
                </p>

                {/* ── MCQ block ── */}
                {(asmType === "MCQ" || asmType === "Mixed") && (
                  <Card color="rgba(99,102,241,0.25)" className="mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.blueLight, color: D.blue }}><List size={14} /></div>
                      <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>MCQ Settings</span>
                    </div>

                    {/* ── Mark Distribution Mode selector ── */}
                    <div className="mb-5">
                      <SLabel label="Mark Distribution" hint="How marks are assigned to each MCQ question" />
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {([
                          {
                            key: "equal" as const,
                            label: "Equal Distribution",
                            sublabel: "Marks auto-split from total",
                            icon: (
                              // Simple equal-split icon using divs
                              <div className="flex items-end gap-0.5">
                                {[1,1,1,1].map((_, i) => (
                                  <div key={i} className="w-1.5 rounded-t-sm" style={{ height: 14, background: mcqMarkMode === "equal" ? D.blue : D.textHint }} />
                                ))}
                              </div>
                            ),
                            color: D.blue,
                          },
                          {
                            key: "questionSpecific" as const,
                            label: "Question Specific",
                            sublabel: "Set marks per question",
                            icon: (
                              <div className="flex items-end gap-0.5">
                                {[6,10,4,12].map((h, i) => (
                                  <div key={i} className="w-1.5 rounded-t-sm" style={{ height: h, background: mcqMarkMode === "questionSpecific" ? D.purple : D.textHint }} />
                                ))}
                              </div>
                            ),
                            color: D.purple,
                          },
                        ] as const).map(opt => {
                          const sel = mcqMarkMode === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setMcqMarkMode(opt.key)}
                              className="flex items-start gap-3 p-3.5 rounded-xl text-left transition-all"
                              style={{
                                background: sel ? `${opt.color}0d` : D.surface,
                                border: `2px solid ${sel ? opt.color : D.border}`,
                                boxShadow: sel ? `0 0 0 2px ${opt.color}18` : "none",
                              }}
                            >
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ background: sel ? `${opt.color}14` : D.surface2 }}>
                                {opt.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11.5px] font-extrabold" style={{ color: sel ? opt.color : D.textMain }}>{opt.label}</span>
                                  {sel && <CheckCircle size={12} style={{ color: opt.color }} />}
                                </div>
                                <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: D.textMuted }}>{opt.sublabel}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Fields based on mode ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <SLabel label="Number of Questions" required />
                        <ANumber value={mcqCount} onChange={setMcqCount} min={1} placeholder="e.g. 20"
                          error={errors.mcqCount} showError={saveAttempted} />
                      </div>

                      {mcqMarkMode === "equal" ? (
                        /* ── Equal Distribution: auto-computed MPQ ── */
                        <div>
                          <SLabel label="Marks per Question" hint="Auto-calculated: Total Marks ÷ Questions" />
                          <div
                            className="w-full px-3 py-2 text-sm rounded-xl border flex items-center justify-between"
                            style={{
                              borderColor: D.blue + "50",
                              background: D.blueLight,
                              cursor: "not-allowed",
                            }}
                          >
                            <span
                              className="font-extrabold text-[13px]"
                              style={{ color: mcqAutoMPQ > 0 ? D.blue : D.textHint }}
                            >
                              {mcqAutoMPQ > 0 ? mcqAutoMPQ : "—"}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                              style={{ background: D.blueMed, color: D.blue }}>
                              Auto
                            </span>
                          </div>
                          {/* Info row */}
                          {mcqCount > 0 && totalMarks > 0 ? (
                            <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                              style={{ background: `${D.blue}08`, border: `1px solid ${D.blue}20` }}>
                              <Info size={10} style={{ color: D.blue, flexShrink: 0 }} />
                              <p className="text-[10px] font-semibold" style={{ color: D.blue }}>
                                {totalMarks} total marks ÷ {mcqCount} questions = <strong>{mcqAutoMPQ} marks each</strong>
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                              style={{ background: D.amberLight, border: `1px solid ${D.amber}30` }}>
                              <AlertCircle size={10} style={{ color: D.amber, flexShrink: 0 }} />
                              <p className="text-[10px] font-semibold" style={{ color: D.amber }}>
                                {totalMarks === 0 ? "Set Total Marks in Step 2 first." : "Enter question count above to auto-calculate."}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ── Question Specific: info banner, marks set per question ── */
                        <div>
                          <SLabel label="Marks per Question" />
                          <div
                            className="w-full rounded-xl p-3 flex items-start gap-3"
                            style={{
                              background: `${D.purple}08`,
                              border: `1.5px dashed ${D.purple}40`,
                            }}
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: D.purpleLight }}>
                              <PenLine size={12} style={{ color: D.purple }} />
                            </div>
                            <div>
                              <p className="text-[11px] font-extrabold" style={{ color: D.purple }}>Set while creating questions</p>
                              <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: D.textMuted }}>
                                Each question will have its own marks defined individually when you add or edit questions for this assessment.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attempt limit — spans full width */}
                      <div className="sm:col-span-2" style={{ borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
                        <AToggle enabled={mcqAttempt} onChange={setMcqAttempt} label="Limit Attempts"
                          description="Restrict how many times a student can submit." color={D.blue} />
                        {mcqAttempt && (
                          <div className="mt-3 w-40"><SLabel label="Max Attempts" />
                            <ANumber value={mcqAttemptN} onChange={setMcqAttemptN} min={1} max={10} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary chip when both values are set */}
                    {mcqMarkMode === "equal" && mcqCount > 0 && mcqAutoMPQ > 0 && (
                      <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ background: D.greenLight, border: `1px solid ${D.green}30` }}>
                        <CheckCircle size={13} style={{ color: D.green }} />
                        <span className="text-[11px] font-bold" style={{ color: D.green }}>
                          {mcqCount} questions × {mcqAutoMPQ} marks = <strong>{mcqCount * mcqAutoMPQ} total MCQ marks</strong>
                        </span>
                      </div>
                    )}
                  </Card>
                )}

                {/* Coding block */}
                {(asmType === "Coding" || asmType === "Mixed") && (
                  <Card color={`${D.green}50`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.greenLight, color: D.green }}><Code size={14} /></div>
                      <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Coding Settings</span>
                    </div>
                    {/* General / Level-based toggle */}
                    <div className="flex gap-2 mb-4">
                      {(["general", "levelBased"] as const).map(o => (
                        <button key={o} type="button" onClick={() => setCodingCfg(o)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                          style={{
                            background: codingCfg === o ? D.green : D.surface2,
                            color: codingCfg === o ? "#fff" : D.textMuted,
                            border: `1px solid ${codingCfg === o ? D.green : D.border}`,
                          }}>
                          {o === "general" ? "General" : "Level Based"}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {codingCfg === "general" ? (
                        <div>
                          <SLabel label="Number of Questions" required />
                          <ANumber value={codingGen} onChange={setCodingGen} min={1} placeholder="e.g. 5"
                            error={errors.codingCount} showError={saveAttempted} />
                        </div>
                      ) : (
                        <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                          {(["easy","medium","hard"] as const).map(lv => {
                            const c = { easy: "#10b981", medium: D.amber, hard: D.red }[lv];
                            return (
                              <div key={lv}>
                                <SLabel label={lv.charAt(0).toUpperCase() + lv.slice(1)} />
                                <ANumber value={codingLvl[lv]} onChange={v => setCodingLvl(p => ({ ...p, [lv]: v }))} min={0} placeholder="0" />
                                <div className="mt-1 h-1.5 rounded-full" style={{ background: `${c}20` }}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(codingLvl[lv] / 20 * 100, 100)}%`, background: c }} />
                                </div>
                              </div>
                            );
                          })}
                          <div className="col-span-3 text-[10.5px] font-semibold" style={{ color: D.textMuted }}>
                            Total: {Object.values(codingLvl).reduce((a, b) => a + b, 0)} questions
                          </div>
                        </div>
                      )}
                      <div>
                        <SLabel label="Marks per Question" />
                        <ANumber value={codingMPQ} onChange={setCodingMPQ} min={0} placeholder="e.g. 10" />
                      </div>
                      <div className="sm:col-span-2" style={{ borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
                        <AToggle enabled={codingAttempt} onChange={setCodingAttempt} label="Limit Submissions"
                          description="Set max code submission attempts." color={D.green} />
                        {codingAttempt && (
                          <div className="mt-3 w-40"><SLabel label="Max Submissions" />
                            <ANumber value={codingAttemptN} onChange={setCodingAttemptN} min={1} max={20} />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ════ STEP 4 — Evaluation Configuration (Coding/Mixed only) ════ */}
            {step === SID.SCORING && hasCoding && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Evaluation Configuration</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Choose one method to evaluate coding submissions.</p>

                {/* Method selector — 3 options only */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {([
                    { key: "testcase" as const, icon: <FlaskConical size={18} />, label: "Test Case",         color: D.green,  desc: "Auto-grade via test inputs/outputs" },
                    { key: "ai"       as const, icon: <Brain size={18} />,        label: "AI Evaluation",     color: D.purple, desc: "AI analyses code quality & logic" },
                    { key: "manual"   as const, icon: <PenLine size={18} />,      label: "Manual Evaluation", color: D.blue,   desc: "Instructor reviews & grades manually" },
                  ]).map(m => {
                    const sel = scoringMethod === m.key;
                    return (
                      <button key={m.key} type="button" onClick={() => {
                        setScoringMethod(m.key);
                        setTcEnabled(m.key === "testcase");
                        setAiEnabled(m.key === "ai");
                        setManEnabled(m.key === "manual");
                      }}
                        className="flex flex-col items-start gap-2 p-4 rounded-2xl transition-all text-left"
                        style={{
                          background: sel ? `${m.color}0d` : D.surface,
                          border: `2px solid ${sel ? m.color : D.border}`,
                          boxShadow: sel ? `0 0 0 3px ${m.color}15, 0 4px 16px ${m.color}12` : "none",
                          transform: sel ? "translateY(-1px)" : "none",
                        }}>
                        <div className="flex items-center justify-between w-full">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${m.color}14`, color: m.color }}>{m.icon}</div>
                          {sel && <CheckCircle size={14} style={{ color: m.color }} />}
                        </div>
                        <span className="text-[12px] font-extrabold" style={{ color: sel ? m.color : D.textMain }}>{m.label}</span>
                        <p className="text-[10.5px] leading-relaxed" style={{ color: D.textMuted }}>{m.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* General / Level-based config toggle */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10.5px] font-bold" style={{ color: D.textMuted }}>Configuration:</span>
                  {(["general", "levelBased"] as const).map(o => (
                    <button key={o} type="button" onClick={() => setScoringConfigType(o)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        background: scoringConfigType === o ? D.green : D.surface2,
                        color: scoringConfigType === o ? "#fff" : D.textMuted,
                        border: `1px solid ${scoringConfigType === o ? D.green : D.border}`,
                      }}>
                      {o === "general" ? "General" : "Level Based"}
                    </button>
                  ))}
                </div>

                {/* ── Test Case Evaluation ── */}
                {scoringMethod === "testcase" && (
                  <Card color={`${D.green}40`} className="mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.greenLight, color: D.green }}><FlaskConical size={14} /></div>
                      <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Test Case Evaluation</span>
                    </div>

                    {scoringConfigType === "general" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <SLabel label="Total Test Cases" hint="Per question" />
                          <ANumber value={tcCount} onChange={setTcCount} min={1} max={100} placeholder="e.g. 10" />
                        </div>
                        <div>
                          <SLabel label="Marks per Test Case" />
                          <ANumber value={tcMPC} onChange={setTcMPC} min={0} placeholder="e.g. 2" />
                          {tcCount > 0 && tcMPC > 0 &&
                            <p className="mt-1 text-[10px] font-semibold" style={{ color: D.green }}>= {tcCount * tcMPC} marks/question</p>}
                        </div>
                      </div>
                    ) : (
                      /* Level-based with Equal Distribution vs Question Specific per level */
                      <div className="mb-4">
                        <p className="text-[11px] font-semibold mb-3" style={{ color: D.textMuted }}>Configure per difficulty level:</p>
                        <div className="grid grid-cols-3 gap-3">
                          {(["easy","medium","hard"] as const).map(lv => {
                            const c = { easy: "#10b981", medium: D.amber, hard: D.red }[lv];
                            const lvLabel = lv.charAt(0).toUpperCase() + lv.slice(1);
                            const mode = lvlScoreMode[lv];
                            return (
                              <div key={lv} className="p-3 rounded-xl flex flex-col gap-2" style={{ border: `1px solid ${c}30`, background: `${c}06` }}>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                                  <span className="text-[11px] font-bold" style={{ color: D.textMain }}>{lvLabel}</span>
                                </div>

                                {/* Test case count */}
                                <div>
                                  <SLabel label="Test Cases" />
                                  <ANumber value={tcLvl[lv].count} onChange={v => setTcLvl(p => ({ ...p, [lv]: { ...p[lv], count: v } }))} min={0} placeholder="0" />
                                </div>

                                {/* Scoring mode sub-option */}
                                <div>
                                  <SLabel label="Marking" />
                                  <div className="flex gap-1">
                                    {(["level","qSpec"] as const).map(md => (
                                      <button key={md} type="button"
                                        onClick={() => setLvlScoreMode(p => ({ ...p, [lv]: md }))}
                                        className="flex-1 py-1 rounded-lg text-[9.5px] font-bold transition-all"
                                        style={{
                                          background: mode === md ? `${c}18` : D.surface2,
                                          color: mode === md ? c : D.textMuted,
                                          border: `1px solid ${mode === md ? c : D.border}`,
                                        }}>
                                        {md === "level" ? "Level Specific" : "Question Specific"}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {mode === "level" ? (
                                  <div>
                                    <SLabel label="Marks / Test Case" />
                                    <ANumber value={tcLvl[lv].marks} onChange={v => setTcLvl(p => ({ ...p, [lv]: { ...p[lv], marks: v } }))} min={0} placeholder="0" />
                                    {tcLvl[lv].count > 0 && tcLvl[lv].marks > 0 &&
                                      <p className="mt-0.5 text-[9px] font-semibold" style={{ color: c }}>= {tcLvl[lv].count * tcLvl[lv].marks} marks</p>}
                                  </div>
                                ) : (
                                  <div className="px-2 py-1.5 rounded-lg" style={{ background: `${c}10`, border: `1px dashed ${c}40` }}>
                                    <p className="text-[9px] font-semibold leading-relaxed" style={{ color: c }}>
                                      Marks set per question when creating questions.
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3" style={{ borderTop: `1px solid ${D.border}`, paddingTop: 12 }}>
                      <AToggle enabled={tcPartial} onChange={setTcPartial} label="Partial Scoring" description="Award marks for partially passing test cases." color={D.green} />
                      <Divider />
                      <AToggle enabled={tcHidden} onChange={setTcHidden} label="Hidden Test Cases" description="Include hidden test cases students can't see." color={D.green} />
                      {tcHidden && (
                        <div className="w-40 mt-2"><SLabel label="No. of Hidden Cases" />
                          <ANumber value={tcHiddenN} onChange={setTcHiddenN} min={1} />
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* ── AI Evaluation ── */}
                {scoringMethod === "ai" && (
                  <Card color={`${D.purple}40`} className="mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.purpleLight, color: D.purple }}><Brain size={14} /></div>
                      <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>AI Evaluation</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: D.purpleLight, color: D.purple }}>Beta</span>
                    </div>

                    {scoringConfigType === "general" ? (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { label: "Code Quality", enabled: aiQuality, setEnabled: setAiQuality, weight: aiWQ, setWeight: setAiWQ, color: D.blue,   desc: "Style, naming, structure" },
                            { label: "Efficiency",   enabled: aiEffic,   setEnabled: setAiEffic,   weight: aiWE, setWeight: setAiWE, color: D.green,  desc: "Time & space complexity" },
                            { label: "Correctness",  enabled: aiCorrect, setEnabled: setAiCorrect, weight: aiWC, setWeight: setAiWC, color: D.purple, desc: "Output accuracy" },
                          ].map(item => (
                            <div key={item.label} className="rounded-xl p-3"
                              style={{ border: `1px solid ${item.enabled ? item.color + "30" : D.border}`, background: item.enabled ? `${item.color}06` : D.surface }}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11.5px] font-bold" style={{ color: D.textMain }}>{item.label}</span>
                                <AToggle enabled={item.enabled} onChange={item.setEnabled} color={item.color} />
                              </div>
                              <p className="text-[10px] mb-2" style={{ color: D.textMuted }}>{item.desc}</p>
                              {item.enabled && (
                                <><SLabel label="Weight (%)" />
                                  <ANumber value={item.weight} onChange={item.setWeight} min={0} max={100} suffix="%" /></>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: aiTotal === 100 ? D.greenLight : D.redLight, border: `1px solid ${aiTotal === 100 ? D.green : D.red}30` }}>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: D.surface2 }}>
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(aiTotal, 100)}%`, background: aiTotal === 100 ? D.green : aiTotal > 100 ? D.red : D.amber }} />
                          </div>
                          <span className="text-[11px] font-black flex-shrink-0" style={{ color: aiTotal === 100 ? D.green : D.red }}>
                            {aiTotal}% {aiTotal === 100 ? "✓" : aiTotal > 100 ? "(over)" : "(under)"}
                          </span>
                        </div>
                        {errors.aiWeights && saveAttempted &&
                          <p className="text-[11px] font-semibold" style={{ color: D.red }}>{errors.aiWeights}</p>}
                      </div>
                    ) : (
                      /* Level-based AI scoring */
                      <div className="grid grid-cols-3 gap-3">
                        {(["easy","medium","hard"] as const).map(lv => {
                          const c = { easy: "#10b981", medium: D.amber, hard: D.red }[lv];
                          const lvLabel = lv.charAt(0).toUpperCase() + lv.slice(1);
                          const mode = lvlScoreMode[lv];
                          return (
                            <div key={lv} className="p-3 rounded-xl flex flex-col gap-2" style={{ border: `1px solid ${c}30`, background: `${c}06` }}>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                                <span className="text-[11px] font-bold" style={{ color: D.textMain }}>{lvLabel}</span>
                              </div>
                              <div>
                                <SLabel label="Marking" />
                                <div className="flex gap-1">
                                  {(["level","qSpec"] as const).map(md => (
                                    <button key={md} type="button"
                                      onClick={() => setLvlScoreMode(p => ({ ...p, [lv]: md }))}
                                      className="flex-1 py-1 rounded-lg text-[9.5px] font-bold transition-all"
                                      style={{
                                        background: mode === md ? `${c}18` : D.surface2,
                                        color: mode === md ? c : D.textMuted,
                                        border: `1px solid ${mode === md ? c : D.border}`,
                                      }}>
                                      {md === "level" ? "Level Specific" : "Question Specific"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {mode === "level" ? (
                                <div>
                                  <SLabel label="Marks / Question" />
                                  <ANumber value={tcLvl[lv].marks} onChange={v => setTcLvl(p => ({ ...p, [lv]: { ...p[lv], marks: v } }))} min={0} placeholder="0" />
                                </div>
                              ) : (
                                <div className="px-2 py-1.5 rounded-lg" style={{ background: `${c}10`, border: `1px dashed ${c}40` }}>
                                  <p className="text-[9px] font-semibold leading-relaxed" style={{ color: c }}>Marks set per question when creating.</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}

                {/* ── Manual Evaluation ── */}
                {scoringMethod === "manual" && (
                  <Card color={`${D.blue}40`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.blueLight, color: D.blue }}><PenLine size={14} /></div>
                      <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Manual Evaluation</span>
                    </div>

                    {scoringConfigType === "general" ? (
                      <div className="flex flex-col gap-4">
                        <AToggle enabled={manRubric} onChange={setManRubric} label="Rubric-Based Scoring"
                          description="Grade against predefined rubric criteria." color={D.blue} />
                        {manRubric && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <SLabel label="Rubric Items" />
                              <button type="button" onClick={() => setManItems(p => [...p, { label: "", maxMarks: 0 }])}
                                className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                                style={{ background: D.blueLight, color: D.blue, border: `1px solid ${D.blue}25` }}>
                                <Plus size={10} />Add
                              </button>
                            </div>
                            <div className="flex flex-col gap-2">
                              {manItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <AInput value={item.label}
                                    onChange={v => setManItems(p => p.map((x, j) => j === i ? { ...x, label: v } : x))}
                                    placeholder={`Criterion ${i + 1}`} />
                                  <div className="w-24 flex-shrink-0">
                                    <ANumber value={item.maxMarks}
                                      onChange={v => setManItems(p => p.map((x, j) => j === i ? { ...x, maxMarks: v } : x))}
                                      min={0} suffix="pts" />
                                  </div>
                                  {manItems.length > 1 && (
                                    <button type="button" onClick={() => setManItems(p => p.filter((_, j) => j !== i))}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                      style={{ background: D.redLight, color: D.red }}>
                                      <X size={11} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <div className="text-right text-[10.5px] font-bold" style={{ color: D.blue }}>
                                Total rubric: {manItems.reduce((a, x) => a + x.maxMarks, 0)} marks
                              </div>
                            </div>
                          </div>
                        )}
                        <Divider />
                        <AToggle enabled={manPeer} onChange={setManPeer} label="Peer Review"
                          description="Allow students to review each other's submissions." color={D.blue} />
                      </div>
                    ) : (
                      /* Level-based manual scoring */
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-3 gap-3">
                          {(["easy","medium","hard"] as const).map(lv => {
                            const c = { easy: "#10b981", medium: D.amber, hard: D.red }[lv];
                            const lvLabel = lv.charAt(0).toUpperCase() + lv.slice(1);
                            const mode = lvlScoreMode[lv];
                            return (
                              <div key={lv} className="p-3 rounded-xl flex flex-col gap-2" style={{ border: `1px solid ${c}30`, background: `${c}06` }}>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                                  <span className="text-[11px] font-bold" style={{ color: D.textMain }}>{lvLabel}</span>
                                </div>
                                <div>
                                  <SLabel label="Marking" />
                                  <div className="flex gap-1">
                                    {(["level","qSpec"] as const).map(md => (
                                      <button key={md} type="button"
                                        onClick={() => setLvlScoreMode(p => ({ ...p, [lv]: md }))}
                                        className="flex-1 py-1 rounded-lg text-[9.5px] font-bold transition-all"
                                        style={{
                                          background: mode === md ? `${c}18` : D.surface2,
                                          color: mode === md ? c : D.textMuted,
                                          border: `1px solid ${mode === md ? c : D.border}`,
                                        }}>
                                        {md === "level" ? "Level Specific" : "Question Specific"}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {mode === "level" ? (
                                  <div>
                                    <SLabel label="Marks / Question" />
                                    <ANumber value={tcLvl[lv].marks} onChange={v => setTcLvl(p => ({ ...p, [lv]: { ...p[lv], marks: v } }))} min={0} placeholder="0" />
                                  </div>
                                ) : (
                                  <div className="px-2 py-1.5 rounded-lg" style={{ background: `${c}10`, border: `1px dashed ${c}40` }}>
                                    <p className="text-[9px] font-semibold leading-relaxed" style={{ color: c }}>Marks set per question when creating.</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <Divider />
                        <AToggle enabled={manPeer} onChange={setManPeer} label="Peer Review"
                          description="Allow students to review each other's submissions." color={D.blue} />
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* ════ STEP 5 — Compiler Settings (Coding/Mixed only) ════ */}
            {step === SID.COMPILER && hasCoding && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Compiler Settings</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>
                  Configure the code execution environment for this assessment.
                </p>

                {/* Language selection */}
                <Card color={`${D.blue}40`} className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.blueLight, color: D.blue }}><Terminal size={14} /></div>
                    <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Allowed Languages</span>
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: D.blueLight, color: D.blue }}>
                      {compilerLangs.length} selected
                    </span>
                  </div>
                  {errors.compilerLangs && saveAttempted && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-[11px] font-semibold"
                      style={{ background: D.redLight, color: D.red, border: `1px solid ${D.red}30` }}>
                      <AlertCircle size={13} />{errors.compilerLangs}
                    </div>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {ALL_LANGUAGES.map(lang => {
                      const sel = compilerLangs.includes(lang);
                      return (
                        <button key={lang} type="button" onClick={() => toggleLang(lang)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all"
                          style={{
                            background: sel ? D.blueLight : D.surface,
                            border: `1.5px solid ${sel ? D.blue : D.border}`,
                            color: sel ? D.blue : D.textMuted,
                          }}>
                          <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: sel ? D.blue : "transparent", border: `1.5px solid ${sel ? D.blue : D.border2}` }}>
                            {sel && <Check size={9} strokeWidth={3} color="#fff" />}
                          </div>
                          {lang}
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Execution limits */}
                <Card color={`${D.green}40`} className="mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.greenLight, color: D.green }}><Cpu size={14} /></div>
                    <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Execution Limits</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <SLabel label="Time Limit per Run" hint="Max seconds allowed for code execution" />
                      <ANumber value={execTimeLimit} onChange={setExecTimeLimit} min={1} max={60} suffix="sec" placeholder="e.g. 5" />
                    </div>
                    <div>
                      <SLabel label="Memory Limit" hint="Max memory the code can use" />
                      <ANumber value={memoryLimit} onChange={setMemoryLimit} min={32} max={2048} suffix="MB" placeholder="e.g. 256" />
                    </div>
                  </div>
                </Card>

                {/* Submission options */}
                <Card color={`${D.purple}40`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.purpleLight, color: D.purple }}><BookOpen size={14} /></div>
                    <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Submission Options</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <AToggle enabled={multiSolution} onChange={setMultiSolution}
                      label="Allow Multiple Solution Files"
                      description="Students can upload more than one code file per submission."
                      color={D.purple} />
                    <Divider />
                    <AToggle enabled={showExpOutput} onChange={setShowExpOutput}
                      label="Show Expected Output"
                      description="Display the expected output alongside test case results."
                      color={D.purple} />
                  </div>
                </Card>
              </div>
            )}

            {/* ════ TIME SETTINGS ════ */}
            {step === SID.TIME && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Time Settings</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Choose how time is managed for this assessment.</p>

                {/* ── Mode selector ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  {[
                    {
                      mode: "overall" as const,
                      icon: <Clock size={20} />,
                      color: D.blue,
                      title: "Overall Exercise Timing",
                      desc: "A single countdown timer for the entire assessment. Students manage their own time across all questions.",
                    },
                    {
                      mode: "perQuestion" as const,
                      icon: <Timer size={20} />,
                      color: D.purple,
                      title: "Time Per Question",
                      desc: "Each question has its own time limit. Set the time when creating individual questions.",
                    },
                  ].map(opt => {
                    const sel = timingMode === opt.mode;
                    return (
                      <button key={opt.mode} type="button" onClick={() => setTimingMode(opt.mode)}
                        className="text-left p-5 rounded-2xl transition-all"
                        style={{
                          background: sel ? `${opt.color}0d` : D.bg,
                          border: `2px solid ${sel ? opt.color : D.border}`,
                          boxShadow: sel ? `0 0 0 3px ${opt.color}18, 0 4px 16px ${opt.color}12` : "none",
                          transform: sel ? "translateY(-1px)" : "none",
                        }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: `${opt.color}12`, color: opt.color }}>{opt.icon}</div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[12.5px] font-extrabold" style={{ color: D.textMain }}>{opt.title}</span>
                          {sel && <CheckCircle size={14} style={{ color: opt.color }} />}
                        </div>
                        <p className="text-[11px] leading-relaxed" style={{ color: D.textMuted }}>{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Overall timing config */}
                {timingMode === "overall" && (
                  <>
                    <Card color={`${D.blue}40`} className="mb-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.blueLight, color: D.blue }}><Clock size={14} /></div>
                        <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Overall Assessment Duration</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <SLabel label="Total Duration" />
                          <ANumber value={overallDuration} onChange={setOverallDuration} min={1} suffix="min" placeholder="e.g. 90" />
                        </div>
                        <div className="flex flex-col gap-3 pt-1">
                          <AToggle enabled={autoSubmit} onChange={setAutoSubmit}
                            label="Auto-Submit on Expiry"
                            description="Automatically submit when time is up."
                            color={D.blue} />
                          <Divider />
                          <AToggle enabled={pauseAllowed} onChange={setPauseAllowed}
                            label="Allow Pause"
                            description="Students can pause and resume the timer."
                            color={D.amber} />
                        </div>
                      </div>
                    </Card>

                    <Card color={`${D.amber}40`}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.amberLight, color: D.amber }}><AlertTriangle size={14} /></div>
                        <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Time Warning Alerts</span>
                      </div>
                      <div className="flex flex-col gap-3">
                        <AToggle enabled={warn50} onChange={setWarn50} label="50% time remaining" description="Alert when half the time has elapsed." color={D.amber} />
                        <Divider />
                        <AToggle enabled={warn10} onChange={setWarn10} label="10% time remaining" description="Alert when 10% of time is left." color={D.amber} />
                        <Divider />
                        <AToggle enabled={warn5}  onChange={setWarn5}  label="5% time remaining"  description="Final warning — urgent alert." color={D.red} />
                      </div>
                    </Card>
                  </>
                )}

                {/* Per-question info banner */}
                {timingMode === "perQuestion" && (
                  <div className="rounded-2xl p-5" style={{ background: `${D.purple}08`, border: `1.5px solid ${D.purple}30` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: D.purpleLight, color: D.purple }}>
                        <Timer size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Time Set Per Question</p>
                        <p className="text-[11.5px] leading-relaxed" style={{ color: D.textSub }}>
                          You have selected <strong>Per-Question timing</strong>. The time limit for each question will be
                          configured individually when you create or edit the questions for this assessment.
                        </p>
                        <div className="mt-4 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: D.textMuted }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: D.purple }} />
                            MCQ questions — time in seconds (e.g. 60 sec per question)
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: D.textMuted }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: D.purple }} />
                            Coding questions — time in minutes (e.g. 20 min per problem)
                          </div>
                        </div>
                        <div className="mt-4">
                          <AToggle enabled={pqShowTimer} onChange={setPqShowTimer}
                            label="Show Countdown Timer to Students"
                            description="Display the per-question timer while students are answering."
                            color={D.purple} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════ SECURITY ════ */}
            {step === SID.SECURITY && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Security Settings</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Configure integrity controls for this assessment.</p>

                <Card color={`${D.purple}40`} className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.purpleLight, color: D.purple }}><Camera size={14} /></div>
                    <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Proctoring</span>
                  </div>
                  <AToggle enabled={procEnabled} onChange={v => { setProcEnabled(v); if (!v) { setProcWebcam(false); setProcScreen(false); } }}
                    label="Enable Proctoring" description="Monitor students during the assessment." color={D.purple} />
                  {procEnabled && (
                    <div className="mt-3 flex flex-col gap-3 pl-2 border-l-2" style={{ borderColor: D.purple }}>
                      <AToggle enabled={procWebcam} onChange={setProcWebcam} label="Webcam Monitoring" description="Capture webcam snapshots periodically." color={D.purple} />
                      <Divider />
                      <AToggle enabled={procScreen} onChange={setProcScreen} label="Screen Share Monitoring" description="Monitor the student's screen in real time." color={D.purple} />
                    </div>
                  )}
                </Card>

                <Card color={`${D.red}40`} className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.redLight, color: D.red }}><Monitor size={14} /></div>
                    <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Browser Controls</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <AToggle enabled={browserLock} onChange={setBrowserLock} label="Browser Lockdown" description="Prevent students from opening other tabs or windows." color={D.red} />
                    <Divider />
                    <AToggle enabled={copyPaste} onChange={setCopyPaste} label="Restrict Copy-Paste" description="Disable clipboard access inside the assessment." color={D.red} />
                    <Divider />
                    <AToggle enabled={tabDetect} onChange={setTabDetect} label="Tab Switch Detection" description="Flag or auto-submit when student switches tabs." color={D.red} />
                    {tabDetect && (
                      <div className="pl-4 mt-2 w-48">
                        <SLabel label="Max Tab Switches Allowed" hint="Auto-submit after this many switches" />
                        <ANumber value={tabLimit} onChange={setTabLimit} min={1} max={10} />
                      </div>
                    )}
                  </div>
                </Card>

                <Card color={`${D.blue}40`} className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.blueLight, color: D.blue }}><KeyRound size={14} /></div>
                    <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Access Control</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <AToggle enabled={passProtect} onChange={setPassProtect} label="Password Protection" description="Students must enter a password to start." color={D.blue} />
                    {passProtect && (
                      <div className="pl-4 mt-1">
                        <SLabel label="Assessment Password" required />
                        <AInput type="password" value={password} onChange={setPassword} placeholder="Enter password…"
                          error={errors.password} showError={saveAttempted} />
                      </div>
                    )}
                    <Divider />
                    <AToggle enabled={ipRestrict} onChange={setIpRestrict} label="IP Restriction" description="Limit access to specific IP addresses or ranges." color={D.blue} />
                    {ipRestrict && (
                      <div className="pl-4 mt-1">
                        <SLabel label="Allowed IPs" hint="Comma-separated, e.g. 192.168.1.0/24" />
                        <AInput type="textarea" value={allowedIPs} onChange={setAllowedIPs} placeholder="192.168.1.0/24, 10.0.0.5" />
                      </div>
                    )}
                  </div>
                </Card>

                <Card color={`${D.amber}40`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: D.amberLight, color: D.amber }}><Zap size={14} /></div>
                    <span className="text-[12px] font-extrabold" style={{ color: D.textMain }}>Randomisation</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <AToggle enabled={shuffleQ} onChange={setShuffleQ} label="Shuffle Questions" description="Randomise the order of questions for each student." color={D.amber} />
                    <Divider />
                    <AToggle enabled={shuffleO} onChange={setShuffleO} label="Shuffle MCQ Options" description="Randomise the order of answer choices." color={D.amber} />
                  </div>
                </Card>
              </div>
            )}

            {/* ════ SCHEDULE ════ */}
            {step === SID.SCHEDULE && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Schedule</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Set the availability window for this assessment.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <SLabel label="Start Date & Time" required />
                    <input type="datetime-local" value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
                      style={{ borderColor: errors.startDate && saveAttempted ? D.red : D.border, fontFamily: "Plus Jakarta Sans, sans-serif", color: D.textMain, background: D.bg }} />
                    {errors.startDate && saveAttempted && <p className="mt-1 text-xs" style={{ color: D.red }}>{errors.startDate}</p>}
                  </div>
                  <div>
                    <SLabel label="End Date & Time" required />
                    <input type="datetime-local" value={endDate} min={startDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border outline-none"
                      style={{ borderColor: errors.endDate && saveAttempted ? D.red : D.border, fontFamily: "Plus Jakarta Sans, sans-serif", color: D.textMain, background: D.bg }} />
                    {errors.endDate && saveAttempted && <p className="mt-1 text-xs" style={{ color: D.red }}>{errors.endDate}</p>}
                  </div>
                  <div className="sm:col-span-2 p-4 rounded-2xl" style={{ border: `1px solid ${D.border}`, background: D.surface }}>
                    <AToggle enabled={graceEnabled} onChange={setGraceEnabled} label="Grace Period"
                      description="Allow late submissions until an extended deadline." color={D.blue} />
                    {graceEnabled && (
                      <div className="mt-3">
                        <SLabel label="Grace Period Deadline" />
                        <input type="datetime-local" value={graceDate} min={endDate}
                          onChange={e => setGraceDate(e.target.value)}
                          className="w-full sm:w-64 px-3 py-2 text-sm rounded-xl border outline-none"
                          style={{ borderColor: D.border, fontFamily: "Plus Jakarta Sans, sans-serif", color: D.textMain, background: D.bg }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════ NOTIFICATIONS ════ */}
            {step === SID.NOTIFY && (
              <div style={{ animation: "asmFade 0.2s ease-out both" }}>
                <p className="text-[13px] font-extrabold mb-1" style={{ color: D.textMain }}>Notification Settings</p>
                <p className="text-[11px] mb-5" style={{ color: D.textMuted }}>Choose how students are notified about this assessment.</p>
                <div className="flex flex-col gap-3">
                  <div className="p-4 rounded-2xl" style={{ border: `1px solid ${D.border}`, background: D.surface }}>
                    <AToggle enabled={gradeSheet} onChange={setGradeSheet} label="Grade Sheet"
                      description="Send a grade sheet to students after evaluation." color={D.blue} />
                  </div>
                  <div className="p-4 rounded-2xl flex items-start justify-between" style={{ border: `1px solid ${D.border}`, background: D.surface }}>
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12.5px] font-bold" style={{ color: D.textMain }}>Dashboard Notification</span>
                        <Lock size={10} style={{ color: D.textHint }} />
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: D.textMuted }}>Always active — appears in student dashboards automatically.</div>
                    </div>
                    <div className="relative inline-flex items-center h-6 w-11 rounded-full p-[2px]" style={{ background: D.blue }}>
                      <span className="inline-block h-5 w-5 rounded-full bg-white shadow translate-x-5" />
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl"
                    style={{ border: `1.5px solid ${notifyUsers ? `${D.blue}35` : D.border}`, background: notifyUsers ? D.blueLight : D.surface }}>
                    <AToggle enabled={notifyUsers}
                      onChange={v => { setNotifyUsers(v); if (!v) { setNotifyEmail(false); setNotifyWA(false); } }}
                      label="Notify Users" description="Send notifications via the channels below." color={D.blue} />
                    {notifyUsers && (
                      <div className="mt-3 flex flex-col gap-2 pl-2 border-l-2" style={{ borderColor: D.blue }}>
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.10)", color: D.blue }}><Mail size={13} /></div>
                          <div className="flex-1">
                            <AToggle enabled={notifyEmail} onChange={setNotifyEmail} label="Email" description="Send assessment link & details via email." color={D.blue} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 py-2" style={{ borderTop: `1px solid ${D.border}` }}>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.10)", color: "#10b981" }}><MessageCircle size={13} /></div>
                          <div className="flex-1">
                            <AToggle enabled={notifyWA} onChange={setNotifyWA} label="WhatsApp" description="Send assessment link via WhatsApp." color="#10b981" />
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
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5"
          style={{ borderTop: `1px solid ${D.border}`, background: D.bg }}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {Array.from({ length: STEPS_COUNT }, (_, i) => (
                <div key={i} className="rounded-full transition-all"
                  style={{
                    width: step === i + 1 ? 18 : 6, height: 6,
                    background: i + 1 <= step ? D.blue : D.border2,
                    opacity: i + 1 > step ? 0.4 : 1,
                  }} />
              ))}
            </div>
            <span className="text-[10.5px] font-bold" style={{ color: D.textMuted }}>Step {step} / {STEPS_COUNT}</span>
          </div>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button type="button" onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold"
                style={{ background: D.surface, color: D.textSub, border: `1px solid ${D.border}` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = D.surface2}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = D.surface}>
                <ArrowLeft size={12} />Back
              </button>
            )}
            {step < STEPS_COUNT ? (
              <button type="button" onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[11px] font-bold text-white"
                style={{ background: `linear-gradient(135deg,${D.blue},${D.blueDark})`, boxShadow: `0 3px 12px ${D.blueGlow}` }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.9"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
                Continue<ArrowRight size={12} />
              </button>
            ) : (
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[11px] font-bold text-white"
                style={{
                  background: saving ? D.blueMed : `linear-gradient(135deg,${D.blue},${D.blueDark})`,
                  boxShadow: saving ? "none" : `0 3px 12px ${D.blueGlow}`,
                  cursor: saving ? "not-allowed" : "pointer",
                }}>
                {saving
                  ? <><Loader2 size={12} className="animate-spin" />Saving…</>
                  : <><Check size={12} strokeWidth={2.5} />{isEditing ? "Update" : "Create Assessment"}</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes asmFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CreateAssessmentModal;