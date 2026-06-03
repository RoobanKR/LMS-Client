"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactDOM from "react-dom";
import {
  FileText, CheckCircle, Clock, BarChart2,
  ChevronRight, MoreVertical, Plus, Edit2, Trash2,
  List, Code, Layers, Brain, FlaskConical, PenLine, Settings,
  X, AlertTriangle, ChevronLeft, ChevronsLeft, ChevronRight as ChevronRightIcon, ChevronsRight,
  Check, Calendar, Search, RefreshCw, Activity, Users
} from "lucide-react";
import { toast } from "react-hot-toast";
import type { YouDoProps } from "./TestYourSkills";
import CreateAssessmentModal from "./CreateAssessmentModal";
import { exerciseApi, EntityType } from "@/apiServices/exercise";
import AddQuestionForm from "@/app/lms/component/student/YouDo/assessment/questionforms/AddQuestionForm";
import QuestionsTest from "./QuestionsTest";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  blue: "#6366f1",
  blueDark: "#4f46e5",
  blueLight: "rgba(99,102,241,0.08)",
  blueMid: "rgba(99,102,241,0.15)",
  blueGlow: "rgba(99,102,241,0.22)",
  textMain: "#1a1a2e",
  textSub: "#6b6b7e",
  textMuted: "#8b8b9e",
  textHint: "#bcbccc",
  border: "#ece9f1",
  bg: "#ffffff",
  pageBg: "#ffffff",
  warm: "#f5f3ff",
  red: "#ef4444",
  redLight: "rgba(239,68,68,0.1)",
  emerald: "#10b981",
  amber: "#f59e0b",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssessmentRecord {
  id: string;
  _id?: string;
  name: string;
  testType: "mock" | "final" | "practice";
  totalMarks: number;
  questions: number;
  scoring: "testcase" | "ai" | "manual" | "hybrid" | "—";
  level: "beginner" | "intermediate" | "expert";
  status: "active" | "draft" | "ended";
  startDate: string;
  endDate?: string;
  createdAt?: string;
  subcategory?: string;
  isSectionBased: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TEST_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  mock: { label: "Mock", color: "#8b5cf6", bg: "rgba(139,92,246,0.09)" },
  final: { label: "Final", color: "#ef4444", bg: "rgba(239,68,68,0.09)" },
  practice: { label: "Practice", color: "#10b981", bg: "rgba(16,185,129,0.09)" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#059669", bg: "rgba(5,150,105,0.09)" },
  draft: { label: "Draft", color: "#f59e0b", bg: "rgba(245,158,11,0.09)" },
  ended: { label: "Ended", color: T.textMuted, bg: T.pageBg },
};

const SCORING_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  testcase: { label: "Test Case", icon: <FlaskConical size={10} />, color: "#059669", bg: "rgba(5,150,105,0.09)" },
  ai: { label: "AI Eval", icon: <Brain size={10} />, color: "#6366f1", bg: "rgba(99,102,241,0.09)" },
  manual: { label: "Manual", icon: <PenLine size={10} />, color: "#f97316", bg: "rgba(249,115,22,0.09)" },
  hybrid: { label: "Hybrid", icon: <Layers size={10} />, color: "#8b5cf6", bg: "rgba(139,92,246,0.09)" },
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: "#10b981",
  intermediate: "#f59e0b",
  expert: "#ef4444",
};

const ITEMS_PER_PAGE = 10;

const getEntityType = (nodeType: string): EntityType => {
  switch (nodeType) {
    case 'module': return 'modules';
    case 'submodule': return 'submodules';
    case 'topic': return 'topics';
    case 'subtopic': return 'subtopics';
    default: return 'topics';
  }
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assessmentName: string;
  isDeleting: boolean;
}> = ({ isOpen, onClose, onConfirm, assessmentName, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1000]" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.redLight }}>
              <AlertTriangle size={16} style={{ color: T.red }} />
            </div>
            <h3 className="text-base font-bold" style={{ color: T.textMain }}>Delete Assessment</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: T.textMuted }} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm" style={{ color: T.textSub }}>
            Are you sure you want to delete <span className="font-semibold" style={{ color: T.textMain }}>"{assessmentName}"</span>?
          </p>
          <p className="text-xs mt-2" style={{ color: T.textMuted }}>
            This action cannot be undone. All student submissions and data associated with this assessment will be permanently deleted.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t" style={{ borderColor: T.border, background: T.pageBg }}>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ color: T.textSub, background: T.bg, border: `1px solid ${T.border}` }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all flex items-center gap-2"
            style={{ background: T.red }}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Portal Dropdown ──────────────────────────────────────────────────────────
const PortalDropMenu: React.FC<{
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ anchorEl, onClose, children }) => {
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuH = 200;

    setStyle(
      spaceBelow < menuH
        ? {
            position: "fixed",
            right: window.innerWidth - rect.right,
            bottom: window.innerHeight - rect.top + 4,
            zIndex: 9999,
          }
        : {
            position: "fixed",
            right: window.innerWidth - rect.right,
            top: rect.bottom + 4,
            zIndex: 9999,
          }
    );
  }, [anchorEl]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !(e.target as Element).closest(".asm-dd") &&
        !(e.target as Element).closest(".portal-dropmenu")
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!anchorEl) return null;

  return ReactDOM.createPortal(
    <div
      className="portal-dropmenu"
      style={{
        ...style,
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: "0 10px 32px rgba(0,0,0,0.12)",
        padding: 4,
        minWidth: 148,
        animation: "asmFadeIn 0.12s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// ─── DropItem Component ───────────────────────────────────────────────────────
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
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.background = color ? `${color}10` : T.pageBg;
      (e.currentTarget as HTMLElement).style.color = color || T.textMain;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.background = "transparent";
      (e.currentTarget as HTMLElement).style.color = color || T.textSub;
    }}
  >
    {icon}{label}
  </button>
);

// ─── Pagination Component ─────────────────────────────────────────────────────
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}> = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: T.border, background: T.bg }}>
      <div className="text-[10px] font-medium" style={{ color: T.textMuted }}>
        Showing {startItem} to {endItem} of {totalItems} assessments
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: currentPage === 1 ? T.textMuted : T.textSub }} title="First page">
          <ChevronsLeft size={14} />
        </button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: currentPage === 1 ? T.textMuted : T.textSub }} title="Previous page">
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-1 px-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <button key={pageNum} onClick={() => onPageChange(pageNum)} className="min-w-[28px] h-7 px-2 rounded-lg text-[11px] font-semibold transition-all" style={{ background: currentPage === pageNum ? T.blue : 'transparent', color: currentPage === pageNum ? '#fff' : T.textSub }}>
                {pageNum}
              </button>
            );
          })}
        </div>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: currentPage === totalPages ? T.textMuted : T.textSub }} title="Next page">
          <ChevronRightIcon size={14} />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ color: currentPage === totalPages ? T.textMuted : T.textSub }} title="Last page">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Section Picker Modal ─────────────────────────────────────────────────────
const SectionPickerModal: React.FC<{
  exercise: any;
  onClose: () => void;
  onPick: (sectionCfg: any, sectionMeta: any) => void;
}> = ({ exercise, onClose, onPick }) => {
  const sectionConfigs = exercise?.sectionConfigs || {};
  const allQuestions: any[] = exercise?.questions || [];

  const countBySectionId: Record<string, { mcq: number; programming: number }> = {};
  allQuestions.forEach((q: any) => {
    if (q.sectionId) {
      if (!countBySectionId[q.sectionId]) countBySectionId[q.sectionId] = { mcq: 0, programming: 0 };
      if (q.questionType === 'mcq') countBySectionId[q.sectionId].mcq++;
      if (q.questionType === 'programming') countBySectionId[q.sectionId].programming++;
    }
  });

  const sections: any[] = Object.keys(sectionConfigs)
    .map((key) => {
      const cfg = sectionConfigs[key] || {};
      const sectionId = cfg.id || key;
      const exerciseType: string = cfg.exerciseType || 'MCQ';
      const counts = countBySectionId[sectionId] || { mcq: 0, programming: 0 };

      const mcqLimit = cfg.mcqConfig?.generalQuestionCount || 0;
      const mcqCount = counts.mcq;
      const mcqFull = mcqLimit > 0 && mcqCount >= mcqLimit;

      const pc = cfg.programmingConfig || {};
      let progLimit = 0;
      if (pc.questionConfigType === 'general') progLimit = pc.generalQuestionCount || 0;
      else {
        const lb = pc.levelBasedCounts || {};
        progLimit = (lb.easy || 0) + (lb.medium || 0) + (lb.hard || 0);
      }
      const progCount = counts.programming;
      const progFull = progLimit > 0 && progCount >= progLimit;

      let isFull = false;
      if (exerciseType === 'MCQ') isFull = mcqFull;
      if (exerciseType === 'Programming') isFull = progFull;
      if (exerciseType === 'Combined') isFull = mcqFull && progFull;

      return {
        id: sectionId, name: cfg.name || key, order: cfg.sectionNumber ?? 0,
        totalMarks: cfg.totalMarks ?? 0, description: cfg.description || '',
        exerciseType, mcqLimit, mcqCount, mcqFull,
        progLimit, progCount, progFull, isFull, _cfg: cfg,
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const typeMeta: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    MCQ: { label: "MCQ", color: "#6366f1", bg: "rgba(99,102,241,0.10)", icon: <List size={11} /> },
    Programming: { label: "Programming", color: "#059669", bg: "rgba(5,150,105,0.10)", icon: <Code size={11} /> },
    Combined: { label: "Combined", color: "#8b5cf6", bg: "rgba(139,92,246,0.10)", icon: <Layers size={11} /> },
    Other: { label: "Other", color: "#f59e0b", bg: "rgba(245,158,11,0.10)", icon: <FlaskConical size={11} /> },
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden" style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: T.border, background: T.blueLight }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.bg }}>
              <Layers size={15} style={{ color: T.blue }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: T.textMain }}>Select Section</h3>
              <p className="text-[10.5px]" style={{ color: T.textMuted }}>{exercise?.exerciseInformation?.exerciseName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white"><X size={15} style={{ color: T.textMuted }} /></button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto" style={{ background: T.pageBg }}>
          {sections.length === 0 ? (
            <div className="text-center py-10 text-xs" style={{ color: T.textMuted }}>No sections found.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {sections.map((sec: any, idx: number) => {
                const tm = typeMeta[sec.exerciseType] || typeMeta.MCQ;
                return (
                  <button
                    key={sec.id || idx}
                    onClick={() => !sec.isFull && onPick(sec._cfg, sec)}
                    disabled={sec.isFull}
                    className="text-left p-3 rounded-xl flex items-center gap-3 transition-all"
                    style={{ background: sec.isFull ? '#f9f9fb' : T.bg, border: `1px solid ${sec.isFull ? '#e0e0e0' : T.border}`, cursor: sec.isFull ? 'not-allowed' : 'pointer', opacity: sec.isFull ? 0.65 : 1 }}
                    onMouseEnter={e => { if (!sec.isFull) { (e.currentTarget as HTMLElement).style.borderColor = T.blue; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${T.blueGlow}`; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = sec.isFull ? '#e0e0e0' : T.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-extrabold" style={{ background: sec.isFull ? '#efefef' : T.blueLight, color: sec.isFull ? T.textMuted : T.blue }}>
                      {sec.order || idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12.5px] font-bold truncate" style={{ color: sec.isFull ? T.textMuted : T.textMain }}>{sec.name}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex-shrink-0" style={{ background: tm.bg, color: tm.color }}>{tm.icon}{tm.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sec.mcqLimit > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: sec.mcqFull ? '#fee2e2' : 'rgba(99,102,241,0.08)', color: sec.mcqFull ? T.red : '#6366f1' }}>
                            <List size={8} />MCQ {sec.mcqCount}/{sec.mcqLimit}{sec.mcqFull && ' ✓'}
                          </span>
                        )}
                        {sec.progLimit > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: sec.progFull ? '#fee2e2' : 'rgba(5,150,105,0.08)', color: sec.progFull ? T.red : '#059669' }}>
                            <Code size={8} />Prog {sec.progCount}/{sec.progLimit}{sec.progFull && ' ✓'}
                          </span>
                        )}
                        <span className="text-[9px]" style={{ color: T.textMuted }}>{sec.totalMarks} marks</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {sec.isFull ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black" style={{ background: '#fee2e2', color: T.red }}>Full</span>
                      ) : (
                        <ChevronRight size={14} style={{ color: T.textHint }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Type Picker Modal ────────────────────────────────────────────────────────
const TypePickerModal: React.FC<{
  section: any;
  onClose: () => void;
  onBack: () => void;
  onPick: (type: 'MCQ' | 'Programming') => void;
}> = ({ section, onClose, onBack, onPick }) => {
  const mcqFull = section?.mcqFull || false;
  const progFull = section?.progFull || false;
  const mcqCount = section?.mcqCount || 0;
  const mcqLimit = section?.mcqLimit || 0;
  const progCount = section?.progCount || 0;
  const progLimit = section?.progLimit || 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: T.border, background: 'rgba(139,92,246,0.10)' }}>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 rounded-lg hover:bg-white" title="Back"><ChevronLeft size={14} style={{ color: T.textMuted }} /></button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.bg }}><Layers size={15} style={{ color: '#8b5cf6' }} /></div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: T.textMain }}>Question Type</h3>
              <p className="text-[10.5px]" style={{ color: T.textMuted }}>Section: {section?.name} (Combined)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white"><X size={15} style={{ color: T.textMuted }} /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3" style={{ background: T.pageBg }}>
          <button
            onClick={() => !mcqFull && onPick('MCQ')}
            disabled={mcqFull}
            className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all relative"
            style={{ background: mcqFull ? '#f9f9fb' : T.bg, border: `1px solid ${mcqFull ? '#e0e0e0' : T.border}`, cursor: mcqFull ? 'not-allowed' : 'pointer', opacity: mcqFull ? 0.6 : 1 }}
            onMouseEnter={e => { if (!mcqFull) { (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.22)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = mcqFull ? '#e0e0e0' : T.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {mcqFull && <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#fee2e2', color: T.red }}>Full</span>}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: mcqFull ? '#efefef' : 'rgba(99,102,241,0.10)' }}><List size={22} style={{ color: mcqFull ? T.textMuted : '#6366f1' }} /></div>
            <div className="text-[12px] font-bold" style={{ color: mcqFull ? T.textMuted : T.textMain }}>MCQ Question</div>
            <div className="text-[10px] font-semibold" style={{ color: mcqFull ? T.red : T.textMuted }}>{mcqLimit > 0 ? `${mcqCount} / ${mcqLimit} added` : `${mcqCount} added`}</div>
            {mcqLimit > 0 && (
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e4e4ed' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (mcqCount / mcqLimit) * 100)}%`, background: mcqFull ? T.red : '#6366f1' }} />
              </div>
            )}
          </button>
          <button
            onClick={() => !progFull && onPick('Programming')}
            disabled={progFull}
            className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all relative"
            style={{ background: progFull ? '#f9f9fb' : T.bg, border: `1px solid ${progFull ? '#e0e0e0' : T.border}`, cursor: progFull ? 'not-allowed' : 'pointer', opacity: progFull ? 0.6 : 1 }}
            onMouseEnter={e => { if (!progFull) { (e.currentTarget as HTMLElement).style.borderColor = '#059669'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(5,150,105,0.22)'; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = progFull ? '#e0e0e0' : T.border; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {progFull && <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#fee2e2', color: T.red }}>Full</span>}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: progFull ? '#efefef' : 'rgba(5,150,105,0.10)' }}><Code size={22} style={{ color: progFull ? T.textMuted : '#059669' }} /></div>
            <div className="text-[12px] font-bold" style={{ color: progFull ? T.textMuted : T.textMain }}>Programming</div>
            <div className="text-[10px] font-semibold" style={{ color: progFull ? T.red : T.textMuted }}>{progLimit > 0 ? `${progCount} / ${progLimit} added` : `${progCount} added`}</div>
            {progLimit > 0 && (
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e4e4ed' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (progCount / progLimit) * 100)}%`, background: progFull ? T.red : '#059669' }} />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Completeness checker ──────────────────────────────────────────────────────
const isAssessmentComplete = (ex: any): boolean => {
  if (!ex) return false;

  // ── 1. Basic settings ─────────────────────────────────────────────────────
  if (!ex.exerciseType) return false;
  const info = ex.exerciseInformation || {};
  if (!info.exerciseName?.trim()) return false;
  if (!ex.availabilityPeriod?.startDate) return false;
  if ((info.totalMarks ?? 0) <= 0 && (info.totalMarksMCQ ?? 0) <= 0) return false;

  // ── 2. Questions completeness ─────────────────────────────────────────────
  if (ex.isSectionBased) {
    const sectionConfigs: Record<string, any> = ex.sectionConfigs || {};
    const allQuestions: any[] = ex.questions || [];

    const countBySectionId: Record<string, { mcq: number; prog: number }> = {};
    allQuestions.forEach((q: any) => {
      const sid = q.sectionId;
      if (!sid) return;
      if (!countBySectionId[sid]) countBySectionId[sid] = { mcq: 0, prog: 0 };
      if (q.questionType === 'mcq') countBySectionId[sid].mcq++;
      if (q.questionType === 'programming' || q.questionType === 'database' || q.questionType === 'others') countBySectionId[sid].prog++;
    });

    for (const key of Object.keys(sectionConfigs)) {
      const cfg = sectionConfigs[key] || {};
      const sectionId = cfg.id || key;
      const exerciseType: string = cfg.exerciseType || 'MCQ';
      const counts = countBySectionId[sectionId] || { mcq: 0, prog: 0 };

      if (exerciseType === 'MCQ' || exerciseType === 'Combined') {
        const mcqLimit: number = cfg.mcqConfig?.generalQuestionCount || 0;
        if (mcqLimit > 0 && counts.mcq < mcqLimit) return false;
      }
      if (exerciseType === 'Programming' || exerciseType === 'Combined') {
        const pc = cfg.programmingConfig || {};
        const lb = pc.levelBasedCounts || {};
        const progLimit: number = pc.questionConfigType === 'general'
          ? (pc.generalQuestionCount || 0)
          : ((lb.easy || 0) + (lb.medium || 0) + (lb.hard || 0));
        if (progLimit > 0 && counts.prog < progLimit) return false;
      }
    }
    return true;
  }

  // Regular (non-section-based) exercise
  const qc = ex.questionConfiguration || {};
  const mcqCfg: any = qc.mcqQuestionConfiguration;
  const progCfg: any = qc.programmingQuestionConfiguration;
  const questions: any[] = ex.questions || [];
  const mcqQs = questions.filter((q: any) => q.questionType === 'mcq');
  const progQs = questions.filter((q: any) =>
    q.questionType === 'programming' || q.questionType === 'database' || q.questionType === 'others'
  );

  if (ex.exerciseType === 'MCQ') {
    const maxQ: number = mcqCfg?.totalMcqQuestions ?? 0;
    if (maxQ > 0 && mcqQs.length < maxQ) return false;
  } else if (ex.exerciseType === 'Programming') {
    const ct = progCfg?.questionConfigType;
    const lc = progCfg?.levelBasedCounts ?? progCfg?.selectionLevelCounts ?? {};
    const maxQ: number = ct === 'general'
      ? (progCfg?.generalQuestionCount ?? 0)
      : ((lc.easy ?? 0) + (lc.medium ?? 0) + (lc.hard ?? 0));
    if (maxQ > 0 && progQs.length < maxQ) return false;
  } else if (ex.exerciseType === 'Combined') {
    const ct = progCfg?.questionConfigType;
    const lc = progCfg?.levelBasedCounts ?? progCfg?.selectionLevelCounts ?? {};
    const progMax: number = ct === 'general'
      ? (progCfg?.generalQuestionCount ?? 0)
      : ((lc.easy ?? 0) + (lc.medium ?? 0) + (lc.hard ?? 0));
    const maxQ = (mcqCfg?.totalMcqQuestions ?? 0) + progMax;
    const curQ = mcqQs.length + progQs.length;
    if (maxQ > 0 && curQ < maxQ) return false;
  }

  return true;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Assessment({
  nodeId, nodeName, subcategory, subcategoryLabel,
  courseId, nodeType, hierarchyData,
}: YouDoProps) {
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [rawExercises, setRawExercises] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAsm, setEditingAsm] = useState<AssessmentRecord | null>(null);

  // ── CHANGED: openDrop now tracks id + anchor element ──
  const [openDrop, setOpenDrop] = useState<{ id: string; el: HTMLElement } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string; _id?: string }>({
    isOpen: false, id: "", name: "", _id: undefined
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQuestionsTest, setShowQuestionsTest] = useState(false);
  const [selectedAssessmentForTest, setSelectedAssessmentForTest] = useState<any>(null);
  const [addQ, setAddQ] = useState<{
    step: 'section' | 'type' | 'form' | null;
    exercise?: any;
    section?: any;
    questionType?: 'MCQ' | 'Programming';
  }>({ step: null });
  const [loadingFullExercise, setLoadingFullExercise] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTestType, setFilterTestType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // ── CHANGED: outside-click handler also ignores portal-dropmenu clicks ──
  React.useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        !(e.target as Element).closest(".asm-dd") &&
        !(e.target as Element).closest(".portal-dropmenu")
      ) setOpenDrop(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── CHANGED: toggleDrop stores the button element as anchor ──
  const toggleDrop = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openDrop?.id === id) { setOpenDrop(null); return; }
    setOpenDrop({ id, el: e.currentTarget as HTMLElement });
  };

  useEffect(() => { setCurrentPage(1); }, [assessments.length, searchQuery, filterTestType, filterStatus]);

  const filtered = useMemo(() => {
    return assessments.filter(asm => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!asm.name.toLowerCase().includes(q) && !asm.id.toLowerCase().includes(q)) return false;
      }
      if (filterTestType && asm.testType !== filterTestType) return false;
      if (filterStatus) {
        const rawEx = rawExercises.find((e: any) => (e._id || e.id) === (asm._id || asm.id));
        const complete = isAssessmentComplete(rawEx);
        if (filterStatus === 'complete' && !complete) return false;
        if (filterStatus === 'incomplete' && complete) return false;
      }
      return true;
    });
  }, [assessments, rawExercises, searchQuery, filterTestType, filterStatus]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentAssessments = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const transformExerciseToAssessment = (ex: any): AssessmentRecord => {
    const src = ex?.exerciseInformation ? ex : (ex?._doc || ex || {});
    const info = src.exerciseInformation || {};
    const config = src.questionConfiguration || {};

    let testType: AssessmentRecord["testType"] = "mock";
    if (info.testType === "final") testType = "final";
    else if (info.testType === "practice") testType = "practice";

    let scoring: AssessmentRecord["scoring"] = "—";
    if (ex.exerciseType === "Programming" || ex.exerciseType === "Combined") {
      const progConfig = config.programmingQuestionConfiguration;
      if (progConfig?.scoreSettings) {
        const scoreType = progConfig.scoreSettings.scoreType;
        if (scoreType === 'evenMarks') scoring = "testcase";
        else if (scoreType === 'separateMarks') scoring = "manual";
        else if (scoreType === 'levelBasedMarks') scoring = "hybrid";
      }
    }

    let questions = 0;
    if (config.mcqQuestionConfiguration) questions += config.mcqQuestionConfiguration.totalMcqQuestions || 0;
    if (config.programmingQuestionConfiguration) {
      const prog = config.programmingQuestionConfiguration;
      if (prog.questionConfigType === 'general') questions += prog.generalQuestionCount || 0;
      else {
        const counts = prog.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
        questions += (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
      }
    }

    let status: AssessmentRecord["status"] = "draft";
    const startDate = src.availabilityPeriod?.startDate;
    const endDate = src.availabilityPeriod?.endDate;
    const now = new Date();
    if (startDate) {
      const start = new Date(startDate);
      if (start <= now) {
        if (endDate) { const end = new Date(endDate); status = end >= now ? "active" : "ended"; }
        else status = "active";
      }
    }

    return {
      id: info.exerciseId || src._id || ex._id,
      _id: src._id || ex._id,
      name: info.exerciseName || "Untitled Assessment",
      testType, totalMarks: info.totalMarks || 0, questions, scoring,
      level: info.exerciseLevel || "beginner", status,
      startDate: startDate ? new Date(startDate).toLocaleDateString() : "",
      endDate: endDate ? new Date(endDate).toLocaleDateString() : "",
      createdAt: src.createdAt, subcategory: src.subcategory,
      isSectionBased: src.isSectionBased || false,
    };
  };

  const fetchExercises = useCallback(async () => {
    if (!nodeId || !subcategory) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const response = await exerciseApi.getYouDoExercises(getEntityType(nodeType), nodeId, 'You_Do', subcategory);
      let exercises = [];
      if (response?.data?.exercises) exercises = response.data.exercises;
      else if (response?.data && Array.isArray(response.data)) exercises = response.data;
      else if (response?.exercises) exercises = response.exercises;
      setRawExercises(exercises);
      setAssessments(exercises.map(transformExerciseToAssessment));
    } catch (err: any) {
      console.error('Failed to fetch exercises:', err);
      setError(err.message || 'Failed to load assessments');
      toast.error('Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, subcategory, nodeType]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  const handleSave = useCallback(async (payload: any) => {
    try {
      await fetchExercises();
      toast.success(editingAsm ? 'Assessment updated!' : 'Assessment created!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save assessment');
    } finally {
      setShowModal(false);
      setEditingAsm(null);
    }
  }, [fetchExercises, editingAsm]);

  const openDeleteModal = (id: string, name: string, _id?: string) => {
    setDeleteModal({ isOpen: true, id, name, _id });
    setOpenDrop(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await exerciseApi.deleteExercise(getEntityType(nodeType), nodeId, deleteModal._id || deleteModal.id, 'You_Do', subcategory);
      setAssessments(prev => prev.filter(a => a.id !== deleteModal.id && a._id !== deleteModal._id));
      toast.success('Assessment deleted successfully');
      setDeleteModal({ isOpen: false, id: "", name: "", _id: undefined });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete assessment');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (asm: AssessmentRecord) => {
    setEditingAsm(asm);
    setShowModal(true);
    setOpenDrop(null);
  };

  const handleAddQuestion = async (asm: AssessmentRecord) => {
    setOpenDrop(null);
    setLoadingFullExercise(true);
    try {
      const exId = asm._id || asm.id;
      const res = await exerciseApi.getExerciseById(exId);
      const full = res?.data?.exercise || res?.exercise || (res?.data && !Array.isArray(res.data) ? res.data : null) || res;
      if (!full) { toast.error('Could not load exercise details'); return; }
      if (full.isSectionBased) setAddQ({ step: 'section', exercise: full });
      else setAddQ({ step: 'form', exercise: full });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load exercise details');
    } finally {
      setLoadingFullExercise(false);
    }
  };

  const closeAddQ = () => setAddQ({ step: null });

  const handleManageQuestion = async (asm: AssessmentRecord) => {
    setOpenDrop(null);
    setLoadingFullExercise(true);
    try {
      const exId = asm._id || asm.id;
      const res = await exerciseApi.getExerciseById(exId);
      const fullExercise = res?.data?.exercise || res?.exercise || res?.data;
      if (!fullExercise) { toast.error('Could not load assessment details'); return; }
      setSelectedAssessmentForTest(fullExercise);
      setShowQuestionsTest(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load assessment details');
    } finally {
      setLoadingFullExercise(false);
    }
  };

  const buildAddQExerciseData = () => {
    const ex = addQ.exercise;
    if (!ex) return null;

    let effectiveExerciseType: string = ex.exerciseType;
    if (addQ.section) {
      if (addQ.section.exerciseType === 'Combined' && addQ.questionType) effectiveExerciseType = addQ.questionType;
      else effectiveExerciseType = addQ.section.exerciseType;
    }

    const currentSectionId = addQ.section?.id || null;
    const currentSectionName = addQ.section?.name || null;
    const allQuestions: any[] = ex.questions || [];
    const sectionQuestions = currentSectionId
      ? allQuestions.filter((q: any) => {
          if (q.sectionId && q.sectionId === currentSectionId) return true;
          if (!q.sectionId && q.sectionName && q.sectionName === currentSectionName) return true;
          return false;
        })
      : allQuestions;

    let fullExerciseData: any = {
      ...ex, exerciseType: effectiveExerciseType, hierarchyData,
      questions: sectionQuestions, currentSectionId, currentSectionName,
    };

    if (addQ.section) {
      const sec = addQ.section;
      const mcqCfg = sec.mcqConfig || {};
      const progCfg = sec.programmingConfig || {};
      // mcqSectionMarks = TOTAL marks for the MCQ part of this section
      // Note: mcqCfg.scoreSettings.equalDistribution = marks PER QUESTION (not total),
      //       so we must NOT use it as a stand-in for the total section marks.
      const mcqSectionMarks = sec.mcqSectionMarks ?? (sec.exerciseType === 'MCQ' ? sec.totalMarks : 0) ?? 0;
      const progSectionMarks = sec.programmingSectionMarks ?? (sec.exerciseType === 'Programming' ? sec.totalMarks : 0) ?? 0;
      const mcqGenCount = mcqCfg.generalQuestionCount || 0;
      const mcqScoringType = mcqCfg?.scoreSettings?.scoreType || 'equalDistribution';
      // equalDistribution in sectionConfig.mcqConfig = marks per question directly
      const mcqMarksPerQ: number =
        mcqCfg?.scoreSettings?.equalDistribution ||
        (mcqGenCount > 0 ? Math.floor(mcqSectionMarks / mcqGenCount) : 0);
      const mcqQuestionConfiguration = { scoringType: mcqScoringType, marksPerQuestion: mcqMarksPerQ, totalMcqQuestions: mcqGenCount, attemptLimitEnabled: mcqCfg.attemptLimitEnabled, submissionAttempts: mcqCfg.submissionAttempts };
      // ── Programming config — only relevant when section exerciseType is Programming or Combined ──
      const pc = progCfg;
      const cfgType = pc.questionConfigType || 'general';

      const lvlCounts    = pc.levelBasedCounts    || { easy: 0, medium: 0, hard: 0 };
      const selCounts    = pc.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
      const lvlScoring   = pc.levelScoring || {};

      // level-based: read marksPerQuestion directly from levelScoring (already per-question)
      const levelScoringConfiguration: any = {};
      const levelBasedMarks: any = {};
      (['easy', 'medium', 'hard'] as const).forEach((d) => {
        const s     = lvlScoring[d] || {};
        const count = (cfgType === 'selectionLevel' ? selCounts[d] : lvlCounts[d]) || 0;
        const mpq   = s.marksPerQuestion || 0;
        levelScoringConfiguration[d] = {
          type: s.type || 'level_specific',
          marksPerQuestion: mpq,
          questionCount: count,
          totalMarks: mpq * count,
        };
        levelBasedMarks[d] = mpq;
      });

      // general: scoreSettings.equalDistribution = marks PER QUESTION (same pattern as MCQ)
      const progGenCount: number = pc.generalQuestionCount || 0;
      const generalMarksPerQuestion: number =
        pc.scoreSettings?.equalDistribution ||
        (progGenCount > 0 ? Math.floor(progSectionMarks / progGenCount) : 0);

      const programmingQuestionConfiguration = {
        questionConfigType: cfgType,
        generalQuestionCount: progGenCount,
        generalMarksPerQuestion,
        levelBasedCounts: lvlCounts,
        selectionLevelCounts: selCounts,
        questionFlow: pc.questionFlow || 'freeFlow',
        attemptLimitEnabled: pc.attemptLimitEnabled,
        submissionAttempts: pc.submissionAttempts,
        scoreSettings: {
          ...(pc.scoreSettings || {}),
          levelScoringConfiguration,
          levelBasedMarks,
          evenMarks: generalMarksPerQuestion,  // same value, used as fallback in form
        },
      };
      const effTotalMarks = effectiveExerciseType === 'MCQ' ? mcqSectionMarks : effectiveExerciseType === 'Programming' ? progSectionMarks : sec.totalMarks || 0;
      fullExerciseData = {
        ...fullExerciseData,
        questionConfiguration: { ...(ex.questionConfiguration || {}), mcqQuestionConfiguration, programmingQuestionConfiguration },
        exerciseInformation: { ...(ex.exerciseInformation || {}), totalMarks: effTotalMarks, totalMarksMCQ: mcqSectionMarks, totalMarksProgramming: progSectionMarks },
        totalMarksMCQ: mcqSectionMarks, totalMarksProgramming: progSectionMarks,
      };
    }

    return {
      exerciseId: ex._id, _id: ex._id,
      exerciseName: ex.exerciseInformation?.exerciseName,
      exerciseLevel: ex.exerciseInformation?.exerciseLevel || 'intermediate',
      selectedLanguages: ex.exerciseInformation?.selectedLanguages || [],
      nodeId, nodeName, subcategory, nodeType, fullExerciseData,
      exerciseType: effectiveExerciseType,
      programmingSettings: ex.programmingSettings,
      subcategoryLabel, currentSectionId, currentSectionName,
    };
  };

  const stats = [
    { icon: <FileText size={14} />, label: "Total", value: assessments.length, color: T.blue },
    { icon: <CheckCircle size={14} />, label: "Active", value: assessments.filter(a => a.status === "active").length, color: "#059669" },
    { icon: <Clock size={14} />, label: "Draft", value: assessments.filter(a => a.status === "draft").length, color: "#f59e0b" },
    { icon: <BarChart2 size={14} />, label: "Ended", value: assessments.filter(a => a.status === "ended").length, color: "#8b5cf6" },
  ];

  const rowBase: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr) 80px 110px 90px 80px 60px",
    gap: 8, alignItems: "center", padding: "11px 16px",
    borderBottom: `1px solid ${T.border}`, transition: "all 0.14s",
    borderLeft: "2.5px solid transparent",
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ background: T.pageBg }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: T.blue, borderTopColor: 'transparent' }} />
        <p className="text-xs mt-3" style={{ color: T.textMuted }}>Loading assessments...</p>
      </div>
    );
  }

  if (showQuestionsTest && selectedAssessmentForTest) {
    return (
      <QuestionsTest
        assessment={selectedAssessmentForTest}
        onBack={() => { setShowQuestionsTest(false); setSelectedAssessmentForTest(null); fetchExercises(); }}
        nodeId={nodeId} nodeName={nodeName} subcategory={subcategory}
        nodeType={nodeType} tabType="You_Do" hierarchyData={hierarchyData}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: T.pageBg }}>

      {/* ── Header bar ── */}
      <div className="flex-shrink-0" style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
        <div className="px-4 py-2 flex items-center gap-2">

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.textHint }} />
            <input
              placeholder="Search assessments…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-7 pr-7 h-7 w-full text-[12px] rounded-lg outline-none transition-all"
              style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, color: T.textMain }}
              onFocus={e => { e.currentTarget.style.borderColor = T.blue; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.blueLight}`; e.currentTarget.style.background = '#fff'; }}
              onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = T.pageBg; }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: T.textHint, background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                onMouseEnter={e => (e.currentTarget.style.color = T.blue)}
                onMouseLeave={e => (e.currentTarget.style.color = T.textHint)}>
                <X size={11} />
              </button>
            )}
          </div>

          {/* Test Type filter */}
          <select
            value={filterTestType}
            onChange={e => setFilterTestType(e.target.value)}
            className="h-7 text-[11px] rounded-lg outline-none transition-all flex-shrink-0"
            style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, color: T.textSub, padding: '0 8px', cursor: 'pointer', minWidth: 110 }}
            onFocus={e => { e.currentTarget.style.borderColor = T.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; }}>
            <option value="">All Types</option>
            <option value="mock">Mock</option>
            <option value="final">Final</option>
            <option value="practice">Practice</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-7 text-[11px] rounded-lg outline-none transition-all flex-shrink-0"
            style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, color: T.textSub, padding: '0 8px', cursor: 'pointer', minWidth: 120 }}
            onFocus={e => { e.currentTarget.style.borderColor = T.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; }}>
            <option value="">All Status</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
          </select>

          {/* Divider */}
          <div className="h-5 w-px flex-shrink-0" style={{ background: T.border }} />

          {/* Refresh */}
          <button onClick={fetchExercises} title="Refresh"
            className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={{ color: T.textMuted, background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.blue; (e.currentTarget as HTMLElement).style.background = T.blueLight; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.textMuted; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {/* Create Assessment */}
          <button
            onClick={() => { setEditingAsm(null); setShowModal(true); }}
            className="h-7 px-3 text-[12px] font-semibold rounded-lg flex items-center gap-1 flex-shrink-0 text-white transition-all"
            style={{ background: T.blue, boxShadow: `0 2px 8px ${T.blueGlow}`, border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.blueDark; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.blue; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
            <Plus size={13} strokeWidth={2.5} />
            <span>Create Assessment</span>
          </button>
        </div>

        {/* Active search chip */}
        {searchQuery && (
          <div className="flex items-center gap-2 px-4 py-1.5"
            style={{ background: T.blueLight, borderTop: `1px solid ${T.blueMid}` }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: T.blue }}>Filtering:</span>
            <button onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all"
              style={{ background: T.blueMid, color: T.blue, border: `1px solid ${T.blue}30`, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.blueGlow)}
              onMouseLeave={e => (e.currentTarget.style.background = T.blueMid)}>
              "{searchQuery}" <X size={9} />
            </button>
            <span className="text-[10px] ml-auto" style={{ color: T.blue }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${T.border} transparent` }}>

        {error && (
          <div className="mx-4 mt-4 p-3 rounded-lg text-center" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => fetchExercises()} className="mt-2 text-xs font-semibold underline">Try Again</button>
          </div>
        )}

        {/* {assessments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 pb-0">
            {stats.map((s, i) => (
              <div key={i} className="p-4 rounded-2xl" style={{ background: T.bg, border: `1px solid ${T.border}`, transition: "all 0.18s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${s.color}18`; (e.currentTarget as HTMLElement).style.borderColor = `${s.color}30`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.borderColor = T.border; }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${s.color}12`, color: s.color }}>{s.icon}</div>
                <div className="text-[17px] font-extrabold" style={{ color: T.textMain }}>{s.value}</div>
                <div className="text-[10px] font-medium mt-0.5" style={{ color: T.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>
        )} */}

        {/* ── Table ── */}
        <div className=" overflow-hidden " style={{ border: `1px solid ${T.border}`, background: T.bg }}>

          {/* Header row */}
          <div style={{ ...rowBase, background: '#fafbfc', borderBottom: '1px solid #eef0f4', borderLeft: "2.5px solid transparent", padding: "10px 16px" }}>
            {["Assessment ID", "Assessment Name", "Test Type", "Created", "Level", "Status", "Actions"].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#64748b' }}>{h}</div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center" style={{ animation: "asmFadeIn 0.3s ease-out both" }}>
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: T.blueLight, border: `1.5px dashed ${T.blue}40` }}>
                <FileText size={22} style={{ color: T.blue }} strokeWidth={1.5} />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: T.blue, color: "#fff" }}><Plus size={10} strokeWidth={3} /></div>
              </div>
              <p className="text-[14px] font-bold mb-1" style={{ color: T.textMain }}>No Assessments Yet</p>
              <p className="text-[11px] font-medium mb-5 max-w-[220px] leading-relaxed" style={{ color: T.textMuted }}>Create your first assessment to start evaluating students.</p>
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
            <>
              {currentAssessments.map((asm, idx) => {
                const tm = TEST_TYPE_META[asm.testType] ?? TEST_TYPE_META.mock;
                const rawEx = rawExercises.find((e: any) => (e._id || e.id) === (asm._id || asm.id));
                const complete = isAssessmentComplete(rawEx);
                const isLast = idx === currentAssessments.length - 1;

                return (
                  <div
                    key={asm._id || asm.id || `row-${idx}`}
                    style={{ ...rowBase, borderBottom: isLast ? "none" : `1px solid ${T.border}`, background: T.bg }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.warm; (e.currentTarget as HTMLElement).style.borderLeftColor = T.blue; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.bg; (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"; }}
                  >
                    {/* Assessment ID */}
                    <div className="min-w-0">
                      <span className="text-[11px] font-mono truncate block" style={{ color: '#64748b' }}>{asm.id}</span>
                    </div>

                    {/* Name */}
                    <div className="min-w-0">
                      <span className="text-[12px] font-semibold truncate block" style={{ color: T.textMain }}>{asm.name}</span>
                    </div>

                    {/* Test Type — plain text */}
                    <div>
                      <span className="text-[11px] font-medium" style={{ color: T.textSub }}>{tm.label}</span>
                    </div>

                    {/* Created */}
                    <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 500, color: '#475569' }}>
                      <Calendar size={11} style={{ color: '#bcbccc', flexShrink: 0 }} />
                      <span>{asm.createdAt ? new Date(asm.createdAt).toLocaleDateString('en-GB') : '—'}</span>
                    </div>

                    {/* Level — plain text */}
                    <div>
                      <span className="text-[11px] font-medium capitalize" style={{ color: T.textSub }}>
                        {asm.level}
                      </span>
                    </div>

                    {/* Status — Complete / Incomplete badge */}
                    <div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px', borderRadius: 6,
                        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                        background: complete ? 'rgba(34,197,94,0.08)' : 'rgba(242,119,87,0.08)',
                        color: complete ? '#16a34a' : '#e0623f',
                        border: `1px solid ${complete ? 'rgba(34,197,94,0.2)' : 'rgba(242,119,87,0.2)'}`,
                      }}>
                        {complete
                          ? <CheckCircle size={12} strokeWidth={2.5} style={{ color: '#22c55e', flexShrink: 0 }} />
                          : <AlertTriangle size={12} strokeWidth={2.5} style={{ color: '#F27757', flexShrink: 0 }} />
                        }
                        <span>{complete ? 'Complete' : 'Incomplete'}</span>
                      </span>
                    </div>

                    {/* ── CHANGED: Actions — portal-based dropdown ── */}
                    <div className="flex items-center justify-end asm-dd">
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

                      {openDrop?.id === asm.id && (
                        <PortalDropMenu anchorEl={openDrop.el} onClose={() => setOpenDrop(null)}>
                          <DropItem
                            icon={<BarChart2 size={11} />} label="Review Submission"
                            onClick={() => {
                              setOpenDrop(null);
                              const q = new URLSearchParams({
                                exerciseId: asm._id || asm.id || '',
                                nodeId: nodeId || '',
                                nodeType: nodeType || '',
                                sourceTab: 'You_Do',
                                sourceSubcategory: subcategory || '',
                                courseId: courseId || '',
                                moduleName: hierarchyData?.moduleName || '',
                                returnUrl: '/lms/pages/coursestructure/uploadcourseresources',
                              }).toString();
                              router.push(`/lms/pages/courses/reviewSubmission?${q}`);
                            }}
                          />
                          {/* ── Live Dashboard — only while the assessment window is open ── */}
                          {(() => {
                            const ap = rawEx?.availabilityPeriod;
                            const sd = ap?.startDate ? new Date(ap.startDate) : null;
                            const ed = ap?.endDate ? new Date(ap.endDate) : null;
                            const now = new Date();
                            const isLive = !!(sd && ed && now >= sd && now <= ed);
                            if (!isLive) return null;
                            return (
                              <DropItem
                                color="#16a34a"
                                icon={
                                  <span style={{ position: "relative", display: "inline-flex" }}>
                                    <Activity size={11} />
                                    <span
                                      style={{
                                        position: "absolute", top: -3, right: -3,
                                        width: 6, height: 6, borderRadius: "50%",
                                        background: "#22c55e",
                                        animation: "liveDashPulse 1.4s ease-in-out infinite",
                                      }}
                                    />
                                    <style>{`@keyframes liveDashPulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,0.6)}70%{box-shadow:0 0 0 5px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}`}</style>
                                  </span>
                                }
                                label="Live Dashboard"
                                onClick={() => {
                                  setOpenDrop(null);
                                  const q = new URLSearchParams({
                                    exerciseId: asm._id || asm.id || "",
                                    assessmentId: asm._id || asm.id || "",
                                    nodeId: nodeId || "",
                                    nodeType: nodeType || "",
                                    courseId: courseId || "",
                                    moduleName: hierarchyData?.moduleName || "",
                                    submoduleName: hierarchyData?.submoduleName || "",
                                    topicName: hierarchyData?.topicName || nodeName || "",
                                    subtopicName: hierarchyData?.subtopicName || "",
                                    tabType: "You_Do",
                                    subcategory: subcategoryLabel || subcategory || "",
                                  }).toString();
                                  router.push(`/lms/pages/courses/liveDashboard?${q}`);
                                }}
                              />
                            );
                          })()}
                          <DropItem
                            icon={<Settings size={11} />} label="Manage Test"
                            color="#8b5cf6"
                            onClick={() => handleManageQuestion(asm)}
                          />
                          <DropItem
                            icon={<Users size={11} />} label="Manage Users"
                            color="#0891b2"
                            onClick={() => {
                              setOpenDrop(null);
                              const q = new URLSearchParams({
                                exerciseId: asm._id || asm.id || '',
                                assessmentName: asm.name || '',
                                nodeId: nodeId || '',
                                nodeType: nodeType || '',
                                subcategory: subcategory || '',
                                courseId: courseId || '',
                                moduleName: hierarchyData?.moduleName || '',
                              }).toString();
                              router.push(`/lms/pages/courses/manageUsers?${q}`);
                            }}
                          />
                          <DropItem
                            icon={<Edit2 size={11} />} label="Edit"
                            onClick={() => handleEdit(asm)}
                          />
                          <DropItem
                            icon={<Trash2 size={11} />} label="Delete"
                            color="#ef4444" divider
                            onClick={() => openDeleteModal(asm.id, asm.name, asm._id)}
                          />
                        </PortalDropMenu>
                      )}
                    </div>
                  </div>
                );
              })}

              <Pagination
                currentPage={currentPage} totalPages={totalPages}
                onPageChange={setCurrentPage} totalItems={filtered.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <CreateAssessmentModal
          onClose={() => { setShowModal(false); setEditingAsm(null); }}
          onSave={handleSave}
          nodeId={nodeId} nodeName={nodeName} nodeType={nodeType}
          subcategory={subcategory} courseId={courseId} hierarchyData={hierarchyData}
          isEditing={!!editingAsm}
          exercise_Id={editingAsm?._id || editingAsm?.id}
          exerciseData={
            editingAsm
              ? rawExercises.find(e => (e._id || e.id) === (editingAsm._id || editingAsm.id))
              : undefined
          }
          tabType="You_Do"
        />
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", name: "", _id: undefined })}
        onConfirm={handleDelete}
        assessmentName={deleteModal.name}
        isDeleting={isDeleting}
      />

      {loadingFullExercise && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center" style={{ background: 'rgba(15,15,30,0.45)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.25)' }}>
            <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: T.blue, borderTopColor: 'transparent' }} />
            <p className="text-xs font-medium" style={{ color: T.textMain }}>Loading..</p>
          </div>
        </div>
      )}

      {addQ.step === 'section' && addQ.exercise && (
        <SectionPickerModal
          exercise={addQ.exercise}
          onClose={closeAddQ}
          onPick={(sectionCfg, sectionMeta) => {
            const merged = { ...sectionCfg, ...sectionMeta };
            if ((sectionCfg.exerciseType || '').toLowerCase() === 'combined') setAddQ(prev => ({ ...prev, step: 'type', section: merged }));
            else setAddQ(prev => ({ ...prev, step: 'form', section: merged }));
          }}
        />
      )}

      {addQ.step === 'type' && addQ.section && (
        <TypePickerModal
          section={addQ.section}
          onClose={closeAddQ}
          onBack={() => setAddQ(prev => ({ ...prev, step: 'section', section: undefined, questionType: undefined }))}
          onPick={(type) => setAddQ(prev => ({ ...prev, step: 'form', questionType: type }))}
        />
      )}

      {addQ.step === 'form' && (() => {
        const exData = buildAddQExerciseData();
        if (!exData) return null;
        return (
          <AddQuestionForm
            key={`addq-${exData.exerciseId}-${addQ.section?.id || 'no-section'}-${addQ.questionType || ''}`}
            exerciseData={exData}
            tabType="You_Do"
            sectionData={addQ.section}
            onClose={async () => { closeAddQ(); await fetchExercises(); }}
            onSave={async () => { await fetchExercises(); }}
            showTypeSelector={(exData.exerciseType || '').toLowerCase() === 'combined'}
            shouldRefreshOnMount={true}
          />
        );
      })()}

      <style jsx global>{`
        @keyframes asmFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}