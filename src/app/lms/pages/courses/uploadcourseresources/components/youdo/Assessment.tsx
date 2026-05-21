"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, CheckCircle, Clock, BarChart2,
  ChevronRight, MoreVertical, Plus, Edit2, Trash2,
  List, Code, Layers, Brain, FlaskConical, PenLine, Settings,
  X, AlertTriangle, ChevronLeft, ChevronsLeft, ChevronRight as ChevronRightIcon, ChevronsRight,
  Check
} from "lucide-react";
import { toast } from "react-hot-toast";
import type { YouDoProps } from "./TestYourSkills";
import CreateAssessmentModal from "./CreateAssessmentModal";
import { exerciseApi, EntityType } from "@/apiServices/exercise";
import AddQuestionForm from "@/app/lms/component/questionforms/AddQuestionForm";
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
  pageBg: "#faf9fc",
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

// Pagination constants
const ITEMS_PER_PAGE = 10;

// Helper to get entity type
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

// ─── DropMenu Components ──────────────────────────────────────────────────────
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

// ─── Pagination Component ────────────────────────────────────────────────────
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
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: currentPage === 1 ? T.textMuted : T.textSub }}
          title="First page"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: currentPage === 1 ? T.textMuted : T.textSub }}
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1 px-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className="min-w-[28px] h-7 px-2 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: currentPage === pageNum ? T.blue : 'transparent',
                  color: currentPage === pageNum ? '#fff' : T.textSub,
                }}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: currentPage === totalPages ? T.textMuted : T.textSub }}
          title="Next page"
        >
          <ChevronRightIcon size={14} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: currentPage === totalPages ? T.textMuted : T.textSub }}
          title="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Section Picker Modal ──────────────────────────────────────────────────────
const SectionPickerModal: React.FC<{
  exercise: any;
  onClose: () => void;
  onPick: (sectionCfg: any, sectionMeta: any) => void;
}> = ({ exercise, onClose, onPick }) => {
  const sectionConfigs = exercise?.sectionConfigs || {};
  const allQuestions: any[] = exercise?.questions || [];

  // ── Count existing questions per sectionId split by type ────────────────
  const countBySectionId: Record<string, { mcq: number; programming: number }> = {};
  allQuestions.forEach((q: any) => {
    if (q.sectionId) {
      if (!countBySectionId[q.sectionId]) {
        countBySectionId[q.sectionId] = { mcq: 0, programming: 0 };
      }
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

      // ── MCQ limits ──
      const mcqLimit = cfg.mcqConfig?.generalQuestionCount || 0;
      const mcqCount = counts.mcq;
      const mcqFull = mcqLimit > 0 && mcqCount >= mcqLimit;

      // ── Programming limits ──
      const pc = cfg.programmingConfig || {};
      let progLimit = 0;
      if (pc.questionConfigType === 'general') {
        progLimit = pc.generalQuestionCount || 0;
      } else {
        const lb = pc.levelBasedCounts || {};
        progLimit = (lb.easy || 0) + (lb.medium || 0) + (lb.hard || 0);
      }
      const progCount = counts.programming;
      const progFull = progLimit > 0 && progCount >= progLimit;

      // ── Section disabled only when ALL applicable types are full ──
      let isFull = false;
      if (exerciseType === 'MCQ') isFull = mcqFull;
      if (exerciseType === 'Programming') isFull = progFull;
      if (exerciseType === 'Combined') isFull = mcqFull && progFull; // BOTH must be full

      return {
        id: sectionId,
        name: cfg.name || key,
        order: cfg.sectionNumber ?? 0,
        totalMarks: cfg.totalMarks ?? 0,
        description: cfg.description || '',
        exerciseType,
        mcqLimit, mcqCount, mcqFull,
        progLimit, progCount, progFull,
        isFull,
        _cfg: cfg,
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
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
        style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: T.border, background: T.blueLight }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.bg }}>
              <Layers size={15} style={{ color: T.blue }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: T.textMain }}>Select Section</h3>
              <p className="text-[10.5px]" style={{ color: T.textMuted }}>
                {exercise?.exerciseInformation?.exerciseName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white">
            <X size={15} style={{ color: T.textMuted }} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto" style={{ background: T.pageBg }}>
          {sections.length === 0 ? (
            <div className="text-center py-10 text-xs" style={{ color: T.textMuted }}>
              No sections found.
            </div>
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
                    style={{
                      background: sec.isFull ? '#f9f9fb' : T.bg,
                      border: `1px solid ${sec.isFull ? '#e0e0e0' : T.border}`,
                      cursor: sec.isFull ? 'not-allowed' : 'pointer',
                      opacity: sec.isFull ? 0.65 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!sec.isFull) {
                        (e.currentTarget as HTMLElement).style.borderColor = T.blue;
                        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${T.blueGlow}`;
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = sec.isFull ? '#e0e0e0' : T.border;
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* Order badge */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-extrabold"
                      style={{
                        background: sec.isFull ? '#efefef' : T.blueLight,
                        color: sec.isFull ? T.textMuted : T.blue,
                      }}
                    >
                      {sec.order || idx + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12.5px] font-bold truncate"
                          style={{ color: sec.isFull ? T.textMuted : T.textMain }}>
                          {sec.name}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex-shrink-0"
                          style={{ background: tm.bg, color: tm.color }}>
                          {tm.icon}{tm.label}
                        </span>
                      </div>

                      {/* Quota pills */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {sec.mcqLimit > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                            style={{
                              background: sec.mcqFull ? '#fee2e2' : 'rgba(99,102,241,0.08)',
                              color: sec.mcqFull ? T.red : '#6366f1',
                            }}
                          >
                            <List size={8} />
                            MCQ {sec.mcqCount}/{sec.mcqLimit}
                            {sec.mcqFull && ' ✓'}
                          </span>
                        )}
                        {sec.progLimit > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                            style={{
                              background: sec.progFull ? '#fee2e2' : 'rgba(5,150,105,0.08)',
                              color: sec.progFull ? T.red : '#059669',
                            }}
                          >
                            <Code size={8} />
                            Prog {sec.progCount}/{sec.progLimit}
                            {sec.progFull && ' ✓'}
                          </span>
                        )}
                        <span className="text-[9px]" style={{ color: T.textMuted }}>
                          {sec.totalMarks} marks
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex-shrink-0">
                      {sec.isFull ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black"
                          style={{ background: '#fee2e2', color: T.red }}>
                          Full
                        </span>
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
// ─── Type Picker Modal (for Combined sections) ─────────────────────────────────
const TypePickerModal: React.FC<{
  section: any;
  onClose: () => void;
  onBack: () => void;
  onPick: (type: 'MCQ' | 'Programming') => void;
}> = ({ section, onClose, onBack, onPick }) => {

  // section already has mcqFull, progFull, mcqCount, mcqLimit etc
  // passed through from SectionPickerModal via merged object
  const mcqFull = section?.mcqFull || false;
  const progFull = section?.progFull || false;
  const mcqCount = section?.mcqCount || 0;
  const mcqLimit = section?.mcqLimit || 0;
  const progCount = section?.progCount || 0;
  const progLimit = section?.progLimit || 0;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,30,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
        style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: T.border, background: 'rgba(139,92,246,0.10)' }}>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 rounded-lg hover:bg-white" title="Back">
              <ChevronLeft size={14} style={{ color: T.textMuted }} />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.bg }}>
              <Layers size={15} style={{ color: '#8b5cf6' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: T.textMain }}>Question Type</h3>
              <p className="text-[10.5px]" style={{ color: T.textMuted }}>
                Section: {section?.name} (Combined)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white">
            <X size={15} style={{ color: T.textMuted }} />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3" style={{ background: T.pageBg }}>

          {/* MCQ Button */}
          <button
            onClick={() => !mcqFull && onPick('MCQ')}
            disabled={mcqFull}
            className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all relative"
            style={{
              background: mcqFull ? '#f9f9fb' : T.bg,
              border: `1px solid ${mcqFull ? '#e0e0e0' : T.border}`,
              cursor: mcqFull ? 'not-allowed' : 'pointer',
              opacity: mcqFull ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!mcqFull) {
                (e.currentTarget as HTMLElement).style.borderColor = '#6366f1';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.22)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = mcqFull ? '#e0e0e0' : T.border;
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {/* Full badge top right */}
            {mcqFull && (
              <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: '#fee2e2', color: T.red }}>
                Full
              </span>
            )}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: mcqFull ? '#efefef' : 'rgba(99,102,241,0.10)' }}>
              <List size={22} style={{ color: mcqFull ? T.textMuted : '#6366f1' }} />
            </div>
            <div className="text-[12px] font-bold" style={{ color: mcqFull ? T.textMuted : T.textMain }}>
              MCQ Question
            </div>
            {/* Count */}
            <div className="text-[10px] font-semibold"
              style={{ color: mcqFull ? T.red : T.textMuted }}>
              {mcqLimit > 0 ? `${mcqCount} / ${mcqLimit} added` : `${mcqCount} added`}
            </div>
            {/* Progress bar */}
            {mcqLimit > 0 && (
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e4e4ed' }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (mcqCount / mcqLimit) * 100)}%`,
                    background: mcqFull ? T.red : '#6366f1',
                  }} />
              </div>
            )}
          </button>

          {/* Programming Button */}
          <button
            onClick={() => !progFull && onPick('Programming')}
            disabled={progFull}
            className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all relative"
            style={{
              background: progFull ? '#f9f9fb' : T.bg,
              border: `1px solid ${progFull ? '#e0e0e0' : T.border}`,
              cursor: progFull ? 'not-allowed' : 'pointer',
              opacity: progFull ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!progFull) {
                (e.currentTarget as HTMLElement).style.borderColor = '#059669';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(5,150,105,0.22)';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = progFull ? '#e0e0e0' : T.border;
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {progFull && (
              <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: '#fee2e2', color: T.red }}>
                Full
              </span>
            )}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: progFull ? '#efefef' : 'rgba(5,150,105,0.10)' }}>
              <Code size={22} style={{ color: progFull ? T.textMuted : '#059669' }} />
            </div>
            <div className="text-[12px] font-bold" style={{ color: progFull ? T.textMuted : T.textMain }}>
              Programming
            </div>
            <div className="text-[10px] font-semibold"
              style={{ color: progFull ? T.red : T.textMuted }}>
              {progLimit > 0 ? `${progCount} / ${progLimit} added` : `${progCount} added`}
            </div>
            {progLimit > 0 && (
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e4e4ed' }}>
                <div className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (progCount / progLimit) * 100)}%`,
                    background: progFull ? T.red : '#059669',
                  }} />
              </div>
            )}
          </button>

        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Assessment({
  nodeId, nodeName, subcategory, subcategoryLabel,
  courseId, nodeType, hierarchyData,
}: YouDoProps) {
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAsm, setEditingAsm] = useState<AssessmentRecord | null>(null);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [dropUpward, setDropUpward] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string; _id?: string }>({
    isOpen: false,
    id: "",
    name: "",
    _id: undefined
  });
  const [isDeleting, setIsDeleting] = useState(false);
const [showQuestionsTest, setShowQuestionsTest] = useState(false);
const [selectedAssessmentForTest, setSelectedAssessmentForTest] = useState<any>(null);
  // Add-Question flow state
  const [addQ, setAddQ] = useState<{
    step: 'section' | 'type' | 'form' | null;
    exercise?: any;
    section?: any;
    questionType?: 'MCQ' | 'Programming';
  }>({ step: null });
  const [loadingFullExercise, setLoadingFullExercise] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset to first page when assessments change
  useEffect(() => {
    setCurrentPage(1);
  }, [assessments.length]);

  // Get current page data
  const getCurrentPageData = useCallback(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return assessments.slice(startIndex, endIndex);
  }, [assessments, currentPage]);

  // Calculate total pages
  const totalPages = Math.ceil(assessments.length / ITEMS_PER_PAGE);
  const currentAssessments = getCurrentPageData();

  // Transform exercise from API to AssessmentRecord format
  const transformExerciseToAssessment = (ex: any): AssessmentRecord => {
    // Some responses may still ship the Mongoose `_doc` wrapper — fall back to it
    // so the assessment name doesn't silently become "Untitled Assessment".
    const src = ex?.exerciseInformation ? ex : (ex?._doc || ex || {});
    const info = src.exerciseInformation || {};
    const config = src.questionConfiguration || {};

    // Get test type
    let testType: AssessmentRecord["testType"] = "mock";
    if (info.testType === "final") testType = "final";
    else if (info.testType === "practice") testType = "practice";
    else testType = "mock";

    // Determine scoring method
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

    // Calculate question count
    let questions = 0;
    if (config.mcqQuestionConfiguration) {
      questions += config.mcqQuestionConfiguration.totalMcqQuestions || 0;
    }
    if (config.programmingQuestionConfiguration) {
      const prog = config.programmingQuestionConfiguration;
      if (prog.questionConfigType === 'general') {
        questions += prog.generalQuestionCount || 0;
      } else {
        const counts = prog.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
        questions += (counts.easy || 0) + (counts.medium || 0) + (counts.hard || 0);
      }
    }

    // Get status based on availability period
    let status: AssessmentRecord["status"] = "draft";
    const startDate = src.availabilityPeriod?.startDate;
    const endDate = src.availabilityPeriod?.endDate;
    const now = new Date();

    if (startDate) {
      const start = new Date(startDate);
      if (start <= now) {
        if (endDate) {
          const end = new Date(endDate);
          status = end >= now ? "active" : "ended";
        } else {
          status = "active";
        }
      }
    }

    return {
      id: info.exerciseId || src._id || ex._id,
      _id: src._id || ex._id,
      name: info.exerciseName || "Untitled Assessment",
      testType,
      totalMarks: info.totalMarks || 0,
      questions,
      scoring,
      level: info.exerciseLevel || "beginner",
      status,
      startDate: startDate ? new Date(startDate).toLocaleDateString() : "",
      endDate: endDate ? new Date(endDate).toLocaleDateString() : "",
      createdAt: src.createdAt,
      subcategory: src.subcategory,
      isSectionBased: src.isSectionBased || false,
    };
  };

  // Fetch exercises from API
  const fetchExercises = useCallback(async () => {
    if (!nodeId || !subcategory) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await exerciseApi.getYouDoExercises(
        getEntityType(nodeType),
        nodeId,
        'You_Do',
        subcategory
      );

      // Extract exercises from response
      let exercises = [];
      if (response?.data?.exercises) {
        exercises = response.data.exercises;
      } else if (response?.data && Array.isArray(response.data)) {
        exercises = response.data;
      } else if (response?.exercises) {
        exercises = response.exercises;
      }

      // Transform exercises to AssessmentRecord format
      const formattedAssessments: AssessmentRecord[] = exercises.map(transformExerciseToAssessment);

      setAssessments(formattedAssessments);
    } catch (err: any) {
      console.error('Failed to fetch exercises:', err);
      setError(err.message || 'Failed to load assessments');
      toast.error('Failed to load assessments');
    } finally {
      setIsLoading(false);
    }
  }, [nodeId, subcategory, nodeType]);

  // Load exercises on mount
  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Handle save (create/update)
  const handleSave = useCallback(async (payload: any) => {
    try {
      await fetchExercises();
      toast.success(editingAsm ? 'Assessment updated!' : 'Assessment created!');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save assessment');
    } finally {
      setShowModal(false);
      setEditingAsm(null);
    }
  }, [fetchExercises, editingAsm]);

  // Open delete confirmation modal
  const openDeleteModal = (id: string, name: string, _id?: string) => {
    setDeleteModal({ isOpen: true, id, name, _id });
    setOpenDrop(null);
  };

  // Handle delete with confirmation
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await exerciseApi.deleteExercise(
        getEntityType(nodeType),
        nodeId,
        deleteModal._id || deleteModal.id,
        'You_Do',
        subcategory
      );

      setAssessments(prev => prev.filter(a => a.id !== deleteModal.id && a._id !== deleteModal._id));
      toast.success('Assessment deleted successfully');
      setDeleteModal({ isOpen: false, id: "", name: "", _id: undefined });
    } catch (err: any) {
      console.error('Delete error:', err);
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

  // ─── Add Question flow ──────────────────────────────────────────────────────
  const handleAddQuestion = async (asm: AssessmentRecord) => {
    setOpenDrop(null);
    setLoadingFullExercise(true);
    try {
      const exId = asm._id || asm.id;
      const res = await exerciseApi.getExerciseById(exId);
      const full =
        res?.data?.exercise ||
        res?.exercise ||
        (res?.data && !Array.isArray(res.data) ? res.data : null) ||
        res;
      if (!full) {
        toast.error('Could not load exercise details');
        return;
      }
      if (full.isSectionBased) {
        setAddQ({ step: 'section', exercise: full });
      } else {
        setAddQ({ step: 'form', exercise: full });
      }
    } catch (err: any) {
      console.error('Failed to fetch exercise:', err);
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
    if (!fullExercise) {
      toast.error('Could not load assessment details');
      return;
    }
    setSelectedAssessmentForTest(fullExercise);
    setShowQuestionsTest(true);
  } catch (err: any) {
    console.error('Failed to fetch exercise:', err);
    toast.error(err?.message || 'Failed to load assessment details');
  } finally {
    setLoadingFullExercise(false);
  }
};




  // Build synthetic exerciseData for AddQuestionForm
  // Build synthetic exerciseData for AddQuestionForm
  const buildAddQExerciseData = () => {
    const ex = addQ.exercise;
    if (!ex) return null;

    // Resolve the effective exerciseType for routing inside AddQuestionForm
    let effectiveExerciseType: string = ex.exerciseType;
    if (addQ.section) {
      // For Combined sections, the user already picked MCQ or Programming
      if (addQ.section.exerciseType === 'Combined' && addQ.questionType) {
        effectiveExerciseType = addQ.questionType;
      } else {
        effectiveExerciseType = addQ.section.exerciseType;
      }
    }

    // ── Resolve current section identifiers ──────────────────────────────────
    const currentSectionId = addQ.section?.id || null;
    const currentSectionName = addQ.section?.name || null;

    // ── Filter exercise questions to only this section's questions ────────────
    // Questions saved after this fix carry sectionId + sectionName.
    // Legacy questions (no tag) are excluded from all sections safely.
    // Non-section exercises: currentSectionId is null → all questions pass through.
    const allQuestions: any[] = ex.questions || [];
    const sectionQuestions = currentSectionId
      ? allQuestions.filter((q: any) => {
        if (q.sectionId && q.sectionId === currentSectionId) return true;
        if (!q.sectionId && q.sectionName && q.sectionName === currentSectionName) return true;
        return false;
      })
      : allQuestions;

    // Clone fullExerciseData and inject section-specific config so the
    // sub-forms (MCQ/Programming) read the section's counts/marks instead
    // of the parent exercise defaults.
    let fullExerciseData: any = {
      ...ex,
      exerciseType: effectiveExerciseType,
      hierarchyData,
      // KEY FIX: only this section's questions go into the child form
      questions: sectionQuestions,
      // Pass section identifiers so MCQQuestionForm can tag new questions
      currentSectionId,
      currentSectionName,
    };

    if (addQ.section) {
      const sec = addQ.section;
      const mcqCfg = sec.mcqConfig || {};
      const progCfg = sec.programmingConfig || {};

      // Resolve section totals (Combined splits into mcqSectionMarks / programmingSectionMarks)
      const mcqSectionMarks =
        sec.mcqSectionMarks
        ?? mcqCfg?.scoreSettings?.equalDistribution
        ?? (sec.exerciseType === 'MCQ' ? sec.totalMarks : 0)
        ?? 0;
      const progSectionMarks =
        sec.programmingSectionMarks
        ?? (sec.exerciseType === 'Programming' ? sec.totalMarks : 0)
        ?? 0;

      // ── Build MCQ configuration in form-expected shape ──
      const mcqGenCount = mcqCfg.generalQuestionCount || 0;
      const mcqEqualDist = mcqCfg?.scoreSettings?.equalDistribution || mcqSectionMarks || 0;
      const mcqScoringType = mcqCfg?.scoreSettings?.scoreType || 'equalDistribution';
      const mcqMarksPerQ = mcqGenCount > 0 ? Math.floor(mcqEqualDist / mcqGenCount) : 0;
      const mcqQuestionConfiguration = {
        scoringType: mcqScoringType,
        marksPerQuestion: mcqMarksPerQ,
        totalMcqQuestions: mcqGenCount,
        attemptLimitEnabled: mcqCfg.attemptLimitEnabled,
        submissionAttempts: mcqCfg.submissionAttempts,
      };

      // ── Build Programming configuration in form-expected shape ──
      const lvlCounts = progCfg.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
      const selCounts = progCfg.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
      const lvlScoring = progCfg.levelScoring || {};
      const levelScoringConfiguration: any = {};
      const levelBasedMarks: any = {};
      (['easy', 'medium', 'hard'] as const).forEach((d) => {
        const s = lvlScoring[d] || {};
        const count = lvlCounts[d] || 0;
        const mpq = s.marksPerQuestion || 0;
        levelScoringConfiguration[d] = {
          type: s.type || 'level_specific',
          marksPerQuestion: mpq,
          questionCount: count,
          totalMarks: mpq * count,
        };
        levelBasedMarks[d] = mpq;
      });
      const programmingQuestionConfiguration = {
        questionConfigType: progCfg.questionConfigType || 'general',
        generalQuestionCount: progCfg.generalQuestionCount || 0,
        generalMarksPerQuestion:
          (progCfg.generalQuestionCount || 0) > 0
            ? Math.floor(progSectionMarks / progCfg.generalQuestionCount)
            : 0,
        levelBasedCounts: lvlCounts,
        selectionLevelCounts: selCounts,
        questionFlow: progCfg.questionFlow || 'freeFlow',
        attemptLimitEnabled: progCfg.attemptLimitEnabled,
        submissionAttempts: progCfg.submissionAttempts,
        scoreSettings: {
          ...(progCfg.scoreSettings || {}),
          levelScoringConfiguration,
          levelBasedMarks,
          evenMarks:
            (progCfg.generalQuestionCount || 0) > 0
              ? Math.floor(progSectionMarks / progCfg.generalQuestionCount)
              : 0,
        },
      };

      // Resolve totals for exerciseInformation
      const effTotalMarks =
        effectiveExerciseType === 'MCQ' ? mcqSectionMarks :
          effectiveExerciseType === 'Programming' ? progSectionMarks :
            sec.totalMarks || 0;

      fullExerciseData = {
        ...fullExerciseData,
        questionConfiguration: {
          ...(ex.questionConfiguration || {}),
          mcqQuestionConfiguration,
          programmingQuestionConfiguration,
        },
        exerciseInformation: {
          ...(ex.exerciseInformation || {}),
          totalMarks: effTotalMarks,
          totalMarksMCQ: mcqSectionMarks,
          totalMarksProgramming: progSectionMarks,
        },
        totalMarksMCQ: mcqSectionMarks,
        totalMarksProgramming: progSectionMarks,
      };
    }

    return {
      exerciseId: ex._id,
      _id: ex._id,
      exerciseName: ex.exerciseInformation?.exerciseName,
      exerciseLevel: ex.exerciseInformation?.exerciseLevel || 'intermediate',
      selectedLanguages: ex.exerciseInformation?.selectedLanguages || [],
      nodeId, nodeName, subcategory, nodeType,
      fullExerciseData,
      exerciseType: effectiveExerciseType,
      programmingSettings: ex.programmingSettings,
      subcategoryLabel,
      // Pass section identifiers at top level so AddQuestionForm
      // can forward them to whichever child form it renders
      currentSectionId,
      currentSectionName,
    };
  };

  // Summary stats
  const stats = [
    { icon: <FileText size={14} />, label: "Total", value: assessments.length, color: T.blue },
    { icon: <CheckCircle size={14} />, label: "Active", value: assessments.filter(a => a.status === "active").length, color: "#059669" },
    { icon: <Clock size={14} />, label: "Draft", value: assessments.filter(a => a.status === "draft").length, color: "#f59e0b" },
    { icon: <BarChart2 size={14} />, label: "Ended", value: assessments.filter(a => a.status === "ended").length, color: "#8b5cf6" },
  ];

  // Updated column widths: removed Type, added Section
  const rowBase: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0,2fr) 80px 80px 70px 90px 80px 80px 80px 60px",
    gap: 8, alignItems: "center",
    padding: "11px 16px",
    borderBottom: `1px solid ${T.border}`,
    transition: "all 0.14s",
    borderLeft: "2.5px solid transparent",
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ background: T.pageBg }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: T.blue, borderTopColor: 'transparent' }} />
        <p className="text-xs mt-3" style={{ color: T.textMuted }}>Loading assessments...</p>
      </div>
    );
  }
// After the loading check, before the main return
if (showQuestionsTest && selectedAssessmentForTest) {
  return (
    <QuestionsTest
      assessment={selectedAssessmentForTest}
      onBack={() => {
        setShowQuestionsTest(false);
        setSelectedAssessmentForTest(null);
        fetchExercises(); // Refresh the assessment list
      }}
      nodeId={nodeId}
      nodeName={nodeName}
      subcategory={subcategory}
      nodeType={nodeType}
      tabType="You_Do"
      hierarchyData={hierarchyData}
    />
  );
}
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

        {/* ── Error state ── */}
        {error && (
          <div className="mx-4 mt-4 p-3 rounded-lg text-center" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => fetchExercises()}
              className="mt-2 text-xs font-semibold underline"
            >
              Try Again
            </button>
          </div>
        )}

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
          className={`rounded-2xl overflow-hidden mx-4 ${assessments.length > 0 ? "mt-4" : "mt-4"}`}
          style={{ border: `1px solid ${T.border}`, background: T.bg }}
        >
          {/* Table header - updated columns */}
          <div
            style={{
              ...rowBase,
              background: T.pageBg,
              borderBottom: `1px solid ${T.border}`,
              borderLeft: "2.5px solid transparent",
              padding: "8px 16px",
            }}
          >
            {["Assessment Name", "Test Type", "Section", "Marks", "Questions", "Scoring", "Level", "Status", "Actions"].map(h => (
              <div key={h} className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: T.textMuted }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {assessments.length === 0 ? (
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
            <>
              {currentAssessments.map((asm, idx) => {
                const tm = TEST_TYPE_META[asm.testType] ?? TEST_TYPE_META.mock;
                const sm = STATUS_META[asm.status] ?? STATUS_META.draft;
                const scm = asm.scoring !== "—" ? SCORING_META[asm.scoring] : null;
                const lc = LEVEL_COLORS[asm.level] ?? T.textMuted;
                const isLast = idx === currentAssessments.length - 1;

                return (
                  <div
                    key={asm._id || asm.id || `row-${idx}`}
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

                    {/* Test Type */}
                    <div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide"
                        style={{ background: tm.bg, color: tm.color }}
                      >
                        {tm.label}
                      </span>
                    </div>

                    {/* Section Based Indicator */}
                    <div>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide"
                        style={{
                          background: asm.isSectionBased ? `${T.emerald}12` : `${T.amber}12`,
                          color: asm.isSectionBased ? T.emerald : T.amber
                        }}
                      >
                        <Settings size={8} />
                        {asm.isSectionBased ? "Yes" : "No"}
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
                            onClick={() => { toast(`Results view coming soon: ${asm.name}`); setOpenDrop(null); }}
                          />
                          <DropItem
                            icon={<Plus size={11} />} label="Add Question"
                            color={T.blue}
                            onClick={() => handleAddQuestion(asm)}
                          />
                          <DropItem
                            icon={<Settings size={11} />} label="Manage Test"
                            color="#8b5cf6"
                            onClick={() => handleManageQuestion(asm)}

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
                        </DropMenu>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={assessments.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            </>
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
          courseId={courseId}
          hierarchyData={hierarchyData}
          isEditing={!!editingAsm}
          exercise_Id={editingAsm?._id}
          tabType="You_Do"
          initialData={editingAsm
            ? {
              assessmentType: editingAsm.testType === "mock" ? "MCQ" : "Other",
              assessmentInfo: {
                assessmentId: editingAsm.id,
                name: editingAsm.name,
                description: "",
                level: editingAsm.level,
                totalMarks: editingAsm.totalMarks,
              },
              schedule: {
                startDate: editingAsm.startDate, endDate: editingAsm.endDate || "",
                gracePeriod: false, gracePeriodDate: "",
              },
            }
            : undefined
          }
        />
      )}

      {/* ── Delete Confirmation Modal ── */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", name: "", _id: undefined })}
        onConfirm={handleDelete}
        assessmentName={deleteModal.name}
        isDeleting={isDeleting}
      />

      {/* ── Loading full exercise spinner ── */}
      {loadingFullExercise && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center" style={{ background: 'rgba(15,15,30,0.45)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3" style={{ boxShadow: '0 20px 56px rgba(0,0,0,0.25)' }}>
            <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: T.blue, borderTopColor: 'transparent' }} />
            <p className="text-xs font-medium" style={{ color: T.textMain }}>Loading exercise…</p>
          </div>
        </div>
      )}

      {/* ── Section Picker ── */}
      {addQ.step === 'section' && addQ.exercise && (
        <SectionPickerModal
          exercise={addQ.exercise}
          onClose={closeAddQ}
          // In Assessment.tsx where SectionPickerModal is rendered
          onPick={(sectionCfg, sectionMeta) => {
            // FIX: sectionMeta spread last so .id is always preserved
            const merged = { ...sectionCfg, ...sectionMeta };

            if ((sectionCfg.exerciseType || '').toLowerCase() === 'combined') {
              setAddQ(prev => ({ ...prev, step: 'type', section: merged }));
            } else {
              setAddQ(prev => ({ ...prev, step: 'form', section: merged }));
            }
          }}
        />
      )}

      {/* ── Type Picker (Combined sections) ── */}
      {addQ.step === 'type' && addQ.section && (
        <TypePickerModal
          section={addQ.section}
          onClose={closeAddQ}
          onBack={() => setAddQ(prev => ({ ...prev, step: 'section', section: undefined, questionType: undefined }))}
          onPick={(type) => setAddQ(prev => ({ ...prev, step: 'form', questionType: type }))}
        />
      )}

      {/* ── Add Question Form ── */}
      {addQ.step === 'form' && (() => {
        const exData = buildAddQExerciseData();
        if (!exData) return null;
        return (
          <AddQuestionForm
            key={`addq-${exData.exerciseId}-${addQ.section?.id || 'no-section'}-${addQ.questionType || ''}`}
            exerciseData={exData}
            tabType="You_Do"
            sectionData={addQ.section}
            onClose={async () => {
              closeAddQ();
              await fetchExercises();
            }}
            onSave={async () => {
              await fetchExercises();
            }}
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