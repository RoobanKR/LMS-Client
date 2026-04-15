"use client";

import React, { useState } from "react";
import {
  BookOpen, CheckCircle, Clock, Play, Trophy,
  ChevronRight, MoreVertical, Plus, Edit2, Trash2,
  List, Code, Layers, Calendar, BarChart2, Star,
  Eye, AlertCircle, RefreshCw,
} from "lucide-react";
import CreateTestModal, { type TestPayload } from "./CreateTestModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  green:     "#059669",
  greenDark: "#047857",
  greenLight:"rgba(5,150,105,0.08)",
  greenMid:  "rgba(5,150,105,0.15)",
  greenGlow: "rgba(5,150,105,0.22)",
  textMain:  "#1a1a2e",
  textSub:   "#6b6b7e",
  textMuted: "#8b8b9e",
  textHint:  "#bcbccc",
  border:    "#ece9f1",
  bg:        "#ffffff",
  pageBg:    "#faf9fc",
  warm:      "#f0fdf9",
};

// ─── Props ────────────────────────────────────────────────────────────────────
export interface YouDoProps {
  nodeId: string;
  nodeName: string;
  subcategory: string;
  subcategoryLabel: string;
  courseId: string;
  nodeType: string;
  hierarchyData: {
    courseName: string;
    moduleName: string;
    submoduleName: string;
    topicName: string;
    subtopicName: string;
    nodeType: string;
    level: number;
  };
}

// ─── Local test record ────────────────────────────────────────────────────────
interface TestRecord {
  id: string;
  name: string;
  type: "MCQ" | "Coding" | "Mixed";
  duration: number;
  totalMarks: number;
  questions: number;
  level: "beginner" | "intermediate" | "expert";
  status: "active" | "draft" | "ended";
  startDate: string;
  attempts: number;
  bestScore: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  MCQ:    { icon: <List size={11} />,   color: "#6366f1", bg: "rgba(99,102,241,0.09)" },
  Coding: { icon: <Code size={11} />,   color: T.green,   bg: T.greenLight             },
  Mixed:  { icon: <Layers size={11} />, color: "#f97316", bg: "rgba(249,115,22,0.09)"  },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active",  color: T.green,    bg: T.greenLight                   },
  draft:  { label: "Draft",   color: "#f59e0b",  bg: "rgba(245,158,11,0.09)"        },
  ended:  { label: "Ended",   color: T.textMuted, bg: T.pageBg                      },
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
      animation: "tsFadeIn 0.12s cubic-bezier(0.16,1,0.3,1) both",
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
export default function TestYourSkills({
  nodeId, nodeName, subcategory, subcategoryLabel,
  courseId, nodeType, hierarchyData,
}: YouDoProps) {
  const [tests, setTests]       = useState<TestRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<TestRecord | null>(null);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [dropUpward, setDropUpward] = useState(false);

  // close dropdown on outside click
  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as Element).closest(".ts-dd")) setOpenDrop(null); };
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
  const handleSave = (payload: TestPayload) => {
    if (editingTest) {
      setTests(prev => prev.map(t =>
        t.id === editingTest.id
          ? {
              ...t,
              name:       payload.testInformation.testName,
              type:       payload.testType,
              duration:   payload.testInformation.totalDuration,
              totalMarks: payload.testInformation.totalMarks,
              level:      payload.testInformation.testLevel,
              questions:  (payload.questionConfiguration.mcqConfig?.questionCount ?? 0) +
                          (payload.questionConfiguration.codingConfig?.generalCount ?? 0),
              startDate:  payload.schedule.startDate,
              status:     payload.schedule.startDate ? "active" : "draft",
            }
          : t
      ));
    } else {
      const newTest: TestRecord = {
        id:         payload.testInformation.testId,
        name:       payload.testInformation.testName,
        type:       payload.testType,
        duration:   payload.testInformation.totalDuration,
        totalMarks: payload.testInformation.totalMarks,
        level:      payload.testInformation.testLevel,
        questions:  (payload.questionConfiguration.mcqConfig?.questionCount ?? 0) +
                    (payload.questionConfiguration.codingConfig?.generalCount ?? 0),
        startDate:  payload.schedule.startDate,
        status:     payload.schedule.startDate ? "active" : "draft",
        attempts:   0,
        bestScore:  null,
      };
      setTests(prev => [newTest, ...prev]);
    }
    setShowModal(false);
    setEditingTest(null);
  };

  const handleDelete = (id: string) => {
    setTests(prev => prev.filter(t => t.id !== id));
    setOpenDrop(null);
  };

  const handleEdit = (test: TestRecord) => {
    setEditingTest(test);
    setShowModal(true);
    setOpenDrop(null);
  };

  // Summary stats (only meaningful when tests exist)
  const stats = [
    { icon: <BookOpen size={14} />,    label: "Total Tests",  value: tests.length,                          color: T.green   },
    { icon: <CheckCircle size={14} />, label: "Active",       value: tests.filter(t => t.status === "active").length, color: "#6366f1" },
    { icon: <Trophy size={14} />,      label: "Avg. Best",    value: tests.length ? `${Math.round(tests.filter(t => t.bestScore !== null).reduce((a, t) => a + (t.bestScore ?? 0), 0) / Math.max(tests.filter(t => t.bestScore !== null).length, 1))}%` : "—", color: "#f59e0b" },
    { icon: <Clock size={14} />,       label: "Avg. Duration",value: tests.length ? `${Math.round(tests.reduce((a, t) => a + t.duration, 0) / tests.length)} min` : "—", color: "#8b5cf6" },
  ];

  const rowBase: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0,2fr) 80px 70px 70px 80px 80px 72px 60px",
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
        style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, borderLeft: `3px solid ${T.green}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: T.greenLight, border: `1px solid ${T.green}25` }}
          >
            <BookOpen size={16} style={{ color: T.green }} />
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
                  <span className="text-[10px] font-semibold" style={{ color: T.green }}>{nodeName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Create button ── */}
        <button
          onClick={() => { setEditingTest(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11.5px] font-bold text-white flex-shrink-0"
          style={{ background: T.green, boxShadow: `0 3px 12px ${T.greenGlow}`, transition: "all 0.18s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.greenDark; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.green; (e.currentTarget as HTMLElement).style.transform = "none"; }}
        >
          <Plus size={13} strokeWidth={2.5} />
          Create Test
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${T.border} transparent` }}>

        {/* ── Stat cards ── */}
        {tests.length > 0 && (
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
        <div className={`rounded-2xl overflow-hidden mx-4 ${tests.length > 0 ? "mt-4 mb-6" : "mt-4"}`}
          style={{ border: `1px solid ${T.border}`, background: T.bg }}>

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
            {["Test Name", "Type", "Duration", "Marks", "Questions", "Level", "Status", "Actions"].map(h => (
              <div key={h} className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMuted }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {tests.length === 0 ? (
            // Empty state inside table
            <div className="flex flex-col items-center justify-center py-16 text-center" style={{ animation: "tsFadeIn 0.3s ease-out both" }}>
              <div
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: T.greenLight, border: `1.5px dashed ${T.green}40` }}
              >
                <BookOpen size={22} style={{ color: T.green }} strokeWidth={1.5} />
                <div
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: T.green, color: "#fff" }}
                >
                  <Plus size={10} strokeWidth={3} />
                </div>
              </div>
              <p className="text-[14px] font-bold mb-1" style={{ color: T.textMain }}>No Tests Yet</p>
              <p className="text-[11px] font-medium mb-5 max-w-[220px] leading-relaxed" style={{ color: T.textMuted }}>
                Create your first test to start evaluating students&apos; skills.
              </p>
              <button
                onClick={() => { setEditingTest(null); setShowModal(true); }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[11px] font-bold text-white"
                style={{ background: T.green, boxShadow: `0 4px 12px ${T.greenGlow}`, transition: "all 0.18s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.greenDark; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.green; (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <Plus size={12} strokeWidth={2.5} />Create Test
              </button>
            </div>
          ) : (
            tests.map((test, idx) => {
              const tm  = TYPE_META[test.type]   ?? TYPE_META.MCQ;
              const sm  = STATUS_META[test.status] ?? STATUS_META.draft;
              const lc  = LEVEL_COLORS[test.level] ?? T.textMuted;
              const isLast = idx === tests.length - 1;

              return (
                <div
                  key={test.id}
                  style={{
                    ...rowBase,
                    borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                    background: T.bg,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.warm; (e.currentTarget as HTMLElement).style.borderLeftColor = T.green; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.bg; (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; }}
                >
                  {/* Name */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] font-bold truncate" style={{ color: T.textMain }}>{test.name}</span>
                    <span className="text-[9.5px] font-medium" style={{ color: T.textHint }}>{test.id}</span>
                  </div>

                  {/* Type */}
                  <div>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                      style={{ background: tm.bg, color: tm.color }}
                    >
                      {tm.icon}{test.type}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-1 text-[10.5px] font-medium" style={{ color: T.textMuted }}>
                    <Clock size={10} />{test.duration}m
                  </div>

                  {/* Marks */}
                  <div className="text-[10.5px] font-bold" style={{ color: T.textMain }}>
                    {test.totalMarks}
                    <span className="text-[9px] font-medium ml-0.5" style={{ color: T.textHint }}>pts</span>
                  </div>

                  {/* Questions */}
                  <div className="text-[10.5px] font-medium" style={{ color: T.textMuted }}>
                    {test.questions > 0 ? `${test.questions} Q` : "—"}
                  </div>

                  {/* Level */}
                  <div>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                      style={{ background: `${lc}12`, color: lc }}
                    >
                      {test.level.charAt(0).toUpperCase() + test.level.slice(1)}
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
                  <div className="flex items-center justify-end relative ts-dd">
                    <button
                      type="button"
                      onClick={e => toggleDrop(test.id, e)}
                      className="p-1.5 rounded-lg"
                      style={{ color: T.textHint, transition: "all 0.12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg; (e.currentTarget as HTMLElement).style.color = T.textMain; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = T.textHint; }}
                    >
                      <MoreVertical size={13} />
                    </button>

                    {openDrop === test.id && (
                      <DropMenu upward={dropUpward}>
                        <DropItem
                          icon={<Play size={11} />} label="Start Test"
                          onClick={() => { alert(`Starting: ${test.name}`); setOpenDrop(null); }}
                        />
                        <DropItem
                          icon={<BarChart2 size={11} />} label="View Results"
                          onClick={() => { alert(`Results: ${test.name}`); setOpenDrop(null); }}
                        />
                        <DropItem
                          icon={<Edit2 size={11} />} label="Edit"
                          onClick={() => handleEdit(test)}
                        />
                        <DropItem
                          icon={<Trash2 size={11} />} label="Delete"
                          color="#ef4444" divider
                          onClick={() => handleDelete(test.id)}
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
        <CreateTestModal
          onClose={() => { setShowModal(false); setEditingTest(null); }}
          onSave={handleSave}
          nodeId={nodeId}
          nodeName={nodeName}
          nodeType={nodeType}
          subcategory={subcategory}
          hierarchyData={hierarchyData}
          isEditing={!!editingTest}
          initialData={editingTest
            ? {
                testType: editingTest.type,
                testInformation: {
                  testId: editingTest.id,
                  testName: editingTest.name,
                  description: "",
                  testLevel: editingTest.level,
                  totalDuration: editingTest.duration,
                  totalMarks: editingTest.totalMarks,
                },
                schedule: { startDate: editingTest.startDate, endDate: "", gracePeriodEnabled: false, gracePeriodDate: "" },
                notifications: { notifyUsers: false, notifyEmail: false, notifyWhatsApp: false, gradeSheet: false },
              }
            : undefined
          }
        />
      )}

      <style jsx global>{`
        @keyframes tsFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
