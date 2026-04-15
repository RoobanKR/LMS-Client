"use client";

import React, { useState } from "react";
import {
  FileText, CheckCircle, Clock, BarChart2,
  ChevronRight, MoreVertical, Plus, Edit2, Trash2,
  List, Code, Layers, Brain, FlaskConical, PenLine,
} from "lucide-react";
import CreateAssessmentModal, { type AssessmentPayload } from "./CreateAssessmentModal";
import type { YouDoProps } from "./TestYourSkills";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  blue:      "#6366f1",
  blueDark:  "#4f46e5",
  blueLight: "rgba(99,102,241,0.08)",
  blueMid:   "rgba(99,102,241,0.15)",
  blueGlow:  "rgba(99,102,241,0.22)",
  textMain:  "#1a1a2e",
  textSub:   "#6b6b7e",
  textMuted: "#8b8b9e",
  textHint:  "#bcbccc",
  border:    "#ece9f1",
  bg:        "#ffffff",
  pageBg:    "#faf9fc",
  warm:      "#f5f3ff",
};

// ─── Local assessment record ──────────────────────────────────────────────────
interface AssessmentRecord {
  id: string;
  name: string;
  type: "MCQ" | "Coding" | "Mixed";
  totalMarks: number;
  questions: number;
  scoring: "testcase" | "ai" | "manual" | "hybrid" | "—";
  level: "beginner" | "intermediate" | "expert";
  status: "active" | "draft" | "ended";
  startDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  MCQ:    { icon: <List size={11} />,   color: "#6366f1", bg: "rgba(99,102,241,0.09)" },
  Coding: { icon: <Code size={11} />,   color: "#059669", bg: "rgba(5,150,105,0.09)" },
  Mixed:  { icon: <Layers size={11} />, color: "#f97316", bg: "rgba(249,115,22,0.09)" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#059669", bg: "rgba(5,150,105,0.09)" },
  draft:  { label: "Draft",  color: "#f59e0b", bg: "rgba(245,158,11,0.09)" },
  ended:  { label: "Ended",  color: T.textMuted, bg: T.pageBg },
};

const SCORING_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  testcase: { label: "Test Case", icon: <FlaskConical size={10} />, color: "#059669", bg: "rgba(5,150,105,0.09)" },
  ai:       { label: "AI Eval",   icon: <Brain size={10} />,        color: "#6366f1", bg: "rgba(99,102,241,0.09)" },
  manual:   { label: "Manual",    icon: <PenLine size={10} />,      color: "#f97316", bg: "rgba(249,115,22,0.09)" },
  hybrid:   { label: "Hybrid",    icon: <Layers size={10} />,       color: "#8b5cf6", bg: "rgba(139,92,246,0.09)" },
};

const LEVEL_COLORS: Record<string, string> = {
  beginner:     "#10b981",
  intermediate: "#f59e0b",
  expert:       "#ef4444",
};

// ─── DropMenu ─────────────────────────────────────────────────────────────────
const DropMenu: React.FC<{ children: React.ReactNode; upward?: boolean }> = ({ children, upward }) => (
  <div
    className={`absolute right-0 w-40 z-[200] overflow-hidden ${upward ? "bottom-full mb-1" : "top-full mt-1"}`}
    style={{
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12,
      boxShadow: "0 10px 32px rgba(0,0,0,0.10)", padding: 4,
      animation: "asmFadeIn 0.12s cubic-bezier(0.16,1,0.3,1) both",
    }}
    onClick={e => e.stopPropagation()}
  >
    {children}
  </div>
);

const DropItem: React.FC<{
  icon: React.ReactNode; label: string; color?: string; divider?: boolean; onClick: () => void;
}> = ({ icon, label, color, divider, onClick }) => (
  <button
    type="button" onClick={onClick}
    className="flex items-center gap-2 w-full px-2.5 py-2 text-[11px] font-semibold rounded-lg"
    style={{
      color: color || T.textSub,
      borderTop: divider ? `1px solid ${T.border}` : "none",
      marginTop: divider ? 3 : 0,
      background: "transparent", transition: "all 0.12s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = color ? `${color}10` : T.pageBg; (e.currentTarget as HTMLElement).style.color = color || T.textMain; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = color || T.textSub; }}
  >
    {icon}{label}
  </button>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function Assessment({
  nodeId, nodeName, subcategory, subcategoryLabel,
  courseId, nodeType, hierarchyData,
}: YouDoProps) {
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [showModal, setShowModal]       = useState(false);
  const [editingAsm, setEditingAsm]     = useState<AssessmentRecord | null>(null);
  const [openDrop, setOpenDrop]         = useState<string | null>(null);
  const [dropUpward, setDropUpward]     = useState(false);

  // Close dropdown on outside click
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as Element).closest(".asm-dd")) setOpenDrop(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleDrop = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openDrop === id) { setOpenDrop(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropUpward(window.innerHeight - rect.bottom < 180);
    setOpenDrop(id);
  };

  // ── Save callback from modal ─────────────────────────────────────────────
  const handleSave = (payload: AssessmentPayload) => {
    const qCount =
      (payload.questionConfig.mcq?.questionCount ?? 0) +
      (payload.questionConfig.coding?.configType === "general"
        ? payload.questionConfig.coding.generalCount
        : (payload.questionConfig.coding?.levelCounts
            ? Object.values(payload.questionConfig.coding.levelCounts).reduce((a, b) => a + b, 0)
            : 0));

    const scoring: AssessmentRecord["scoring"] =
      payload.assessmentType === "MCQ" ? "—" : payload.programmingScoring.method;

    if (editingAsm) {
      setAssessments(prev => prev.map(a =>
        a.id === editingAsm.id
          ? {
              ...a,
              name:       payload.assessmentInfo.name,
              type:       payload.assessmentType,
              totalMarks: payload.assessmentInfo.totalMarks,
              level:      payload.assessmentInfo.level,
              questions:  qCount,
              scoring,
              startDate:  payload.schedule.startDate,
              status:     payload.schedule.startDate ? "active" : "draft",
            }
          : a
      ));
    } else {
      const newAsm: AssessmentRecord = {
        id:         payload.assessmentInfo.assessmentId,
        name:       payload.assessmentInfo.name,
        type:       payload.assessmentType,
        totalMarks: payload.assessmentInfo.totalMarks,
        level:      payload.assessmentInfo.level,
        questions:  qCount,
        scoring,
        startDate:  payload.schedule.startDate,
        status:     payload.schedule.startDate ? "active" : "draft",
      };
      setAssessments(prev => [newAsm, ...prev]);
    }
    setShowModal(false);
    setEditingAsm(null);
  };

  const handleDelete = (id: string) => {
    setAssessments(prev => prev.filter(a => a.id !== id));
    setOpenDrop(null);
  };

  const handleEdit = (asm: AssessmentRecord) => {
    setEditingAsm(asm);
    setShowModal(true);
    setOpenDrop(null);
  };

  // Summary stats (only shown when records exist)
  const stats = [
    { icon: <FileText size={14} />,    label: "Total",    value: assessments.length,                                     color: T.blue    },
    { icon: <CheckCircle size={14} />, label: "Active",   value: assessments.filter(a => a.status === "active").length,  color: "#059669" },
    { icon: <Clock size={14} />,       label: "Draft",    value: assessments.filter(a => a.status === "draft").length,   color: "#f59e0b" },
    { icon: <BarChart2 size={14} />,   label: "Ended",    value: assessments.filter(a => a.status === "ended").length,   color: "#8b5cf6" },
  ];

  const rowBase: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0,2fr) 80px 70px 70px 90px 80px 72px 60px",
    gap: 8, alignItems: "center",
    padding: "11px 16px",
    borderBottom: `1px solid ${T.border}`,
    transition: "all 0.14s",
    borderLeft: "2.5px solid transparent",
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: T.pageBg }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-5 py-3.5"
        style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, borderLeft: `3px solid ${T.blue}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: T.blueLight, border: `1px solid ${T.blue}25` }}
          >
            <FileText size={16} style={{ color: T.blue }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[14px] font-extrabold tracking-tight" style={{ color: T.textMain }}>
              {subcategoryLabel}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-semibold" style={{ color: T.textHint }}>{hierarchyData.courseName}</span>
              {nodeName && (
                <>
                  <ChevronRight size={8} style={{ color: T.textHint }} />
                  <span className="text-[10px] font-semibold" style={{ color: T.blue }}>{nodeName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Create button ── */}
        <button
          onClick={() => { setEditingAsm(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11.5px] font-bold text-white flex-shrink-0"
          style={{ background: T.blue, boxShadow: `0 3px 12px ${T.blueGlow}`, transition: "all 0.18s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.blueDark; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.blue; (e.currentTarget as HTMLElement).style.transform = "none"; }}
        >
          <Plus size={13} strokeWidth={2.5} />
          Create Assessment
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${T.border} transparent` }}>

        {/* ── Stat cards ── */}
        {assessments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 pb-0">
            {stats.map((s, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl"
                style={{ background: T.bg, border: `1px solid ${T.border}`, transition: "all 0.18s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${s.color}18`; (e.currentTarget as HTMLElement).style.borderColor = `${s.color}30`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = T.border; }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${s.color}12`, color: s.color }}>
                  {s.icon}
                </div>
                <div className="text-[17px] font-extrabold" style={{ color: T.textMain }}>{s.value}</div>
                <div className="text-[10px] font-medium mt-0.5" style={{ color: T.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Table wrapper ── */}
        <div
          className={`rounded-2xl overflow-hidden mx-4 ${assessments.length > 0 ? "mt-4 mb-6" : "mt-4"}`}
          style={{ border: `1px solid ${T.border}`, background: T.bg }}
        >
          {/* Table header */}
          <div
            style={{
              ...rowBase,
              background: T.pageBg,
              borderBottom: `1px solid ${T.border}`,
              borderLeft: "2.5px solid transparent",
              padding: "8px 16px",
            }}
          >
            {["Assessment Name", "Type", "Marks", "Questions", "Scoring", "Level", "Status", "Actions"].map(h => (
              <div key={h} className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMuted }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {assessments.length === 0 ? (
            // Empty state inside table
            <div className="flex flex-col items-center justify-center py-16 text-center" style={{ animation: "asmFadeIn 0.3s ease-out both" }}>
              <div
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: T.blueLight, border: `1.5px dashed ${T.blue}40` }}
              >
                <FileText size={22} style={{ color: T.blue }} strokeWidth={1.5} />
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: T.blue, color: "#fff" }}
                >
                  <Plus size={10} strokeWidth={3} />
                </div>
              </div>
              <p className="text-[14px] font-bold mb-1" style={{ color: T.textMain }}>No Assessments Yet</p>
              <p className="text-[11px] font-medium mb-5 max-w-[220px] leading-relaxed" style={{ color: T.textMuted }}>
                Create your first assessment to start evaluating students.
              </p>
              <button
                onClick={() => { setEditingAsm(null); setShowModal(true); }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[11px] font-bold text-white"
                style={{ background: T.blue, boxShadow: `0 4px 12px ${T.blueGlow}`, transition: "all 0.18s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.blueDark; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.blue; (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <Plus size={12} strokeWidth={2.5} />Create Assessment
              </button>
            </div>
          ) : (
            assessments.map((asm, idx) => {
              const tm  = TYPE_META[asm.type]     ?? TYPE_META.MCQ;
              const sm  = STATUS_META[asm.status] ?? STATUS_META.draft;
              const scm = asm.scoring !== "—" ? SCORING_META[asm.scoring] : null;
              const lc  = LEVEL_COLORS[asm.level] ?? T.textMuted;
              const isLast = idx === assessments.length - 1;

              return (
                <div
                  key={asm.id}
                  style={{
                    ...rowBase,
                    borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                    background: T.bg,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.warm; (e.currentTarget as HTMLElement).style.borderLeftColor = T.blue; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.bg; (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; }}
                >
                  {/* Name */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold truncate" style={{ color: T.textMain }}>{asm.name}</span>
                    <span className="text-[9.5px] font-medium" style={{ color: T.textHint }}>{asm.id}</span>
                  </div>

                  {/* Type */}
                  <div>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                      style={{ background: tm.bg, color: tm.color }}
                    >
                      {tm.icon}{asm.type}
                    </span>
                  </div>

                  {/* Marks */}
                  <div className="text-[10.5px] font-bold" style={{ color: T.textMain }}>
                    {asm.totalMarks}
                    <span className="text-[9px] font-medium ml-0.5" style={{ color: T.textHint }}>pts</span>
                  </div>

                  {/* Questions */}
                  <div className="text-[10.5px] font-medium" style={{ color: T.textMuted }}>
                    {asm.questions > 0 ? `${asm.questions} Q` : "—"}
                  </div>

                  {/* Scoring */}
                  <div>
                    {scm ? (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                        style={{ background: scm.bg, color: scm.color }}
                      >
                        {scm.icon}{scm.label}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium" style={{ color: T.textHint }}>—</span>
                    )}
                  </div>

                  {/* Level */}
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                      style={{ background: `${lc}12`, color: lc }}
                    >
                      {asm.level.charAt(0).toUpperCase() + asm.level.slice(1)}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                      style={{ background: sm.bg, color: sm.color }}
                    >
                      {sm.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end relative asm-dd">
                    <button
                      type="button"
                      onClick={e => toggleDrop(asm.id, e)}
                      className="p-1.5 rounded-lg"
                      style={{ color: T.textHint, transition: "all 0.12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg; (e.currentTarget as HTMLElement).style.color = T.textMain; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = T.textHint; }}
                    >
                      <MoreVertical size={13} />
                    </button>

                    {openDrop === asm.id && (
                      <DropMenu upward={dropUpward}>
                        <DropItem
                          icon={<BarChart2 size={11} />} label="View Results"
                          onClick={() => { alert(`Results: ${asm.name}`); setOpenDrop(null); }}
                        />
                        <DropItem
                          icon={<Edit2 size={11} />} label="Edit"
                          onClick={() => handleEdit(asm)}
                        />
                        <DropItem
                          icon={<Trash2 size={11} />} label="Delete"
                          color="#ef4444" divider
                          onClick={() => handleDelete(asm.id)}
                        />
                      </DropMenu>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ── Create / Edit modal ── */}
      {showModal && (
        <CreateAssessmentModal
          onClose={() => { setShowModal(false); setEditingAsm(null); }}
          onSave={handleSave}
          nodeId={nodeId}
          nodeName={nodeName}
          nodeType={nodeType}
          subcategory={subcategory}
          hierarchyData={hierarchyData}
          isEditing={!!editingAsm}
          initialData={editingAsm
            ? {
                assessmentType: editingAsm.type,
                assessmentInfo: {
                  assessmentId: editingAsm.id,
                  name:         editingAsm.name,
                  description:  "",
                  level:        editingAsm.level,
                  totalMarks:   editingAsm.totalMarks,
                },
                schedule: {
                  startDate: editingAsm.startDate, endDate: "",
                  gracePeriod: false, gracePeriodDate: "",
                },
              }
            : undefined
          }
        />
      )}

      <style jsx global>{`
        @keyframes asmFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
