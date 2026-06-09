"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, ClipboardCheck, MessageSquare } from "lucide-react";
import type { StudentProgress, TestStatus } from "../types/liveDashboard.types";

interface StudentRowProps {
  student: StudentProgress;
  index: number;
  /** Click handler for the Send Message menu item. */
  onSendMessage: (studentId: string) => void;
  /**
   * Click handler for the Check Answers menu item. Wired by the parent — for
   * now the parent passes a no-op (the menu item is enabled only when the
   * student has submitted, but does nothing until we wire the answers view).
   */
  onCheckAnswers: (studentId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
/**
 * Collapse the raw fields into the three-value status we render.
 *
 * Rules (per product feedback):
 *   - `submitted`   → has submitted their attempt.
 *   - `started`     → currently in the test live (active session). We use
 *                     ONLY `inProgress` here — `completed > 0` no longer
 *                     promotes a row to "started" because a student who
 *                     answered some questions earlier and walked away is
 *                     not actively attending.
 *   - `not-started` → everything else (truly never started, OR previously
 *                     started but no live session).
 */
export function deriveTestStatus(s: StudentProgress): TestStatus {
  if (s.submitted) return "submitted";
  if (s.inProgress) return "started";
  return "not-started";
}

/** Format seconds as `1h 23m 45s` / `12m 34s` / `34s` — compact, no leading zeros. */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "—";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const STATUS_BADGE: Record<TestStatus, { label: string; cls: string }> = {
  "not-started":  { label: "Not Started", cls: "bg-gray-100  text-gray-600" },
  "started":      { label: "Started",     cls: "bg-amber-50  text-amber-700" },
  "submitted":    { label: "Submitted",   cls: "bg-green-50  text-green-700" },
};

// ─── Row ────────────────────────────────────────────────────────────────────
function StudentRowBase({ student, index, onSendMessage, onCheckAnswers }: StudentRowProps) {
  const s = student;
  const status = deriveTestStatus(s);
  // "Check Answers" is only enabled once the student has submitted their
  // attempt. Renamed from `isCompleted` to `isSubmitted` after the status
  // refactor — same gate, clearer name.
  const isCompleted = status === "submitted";

  // Display ID prefers an explicit field; falls back to the raw id (truncated).
  const displayId = s.studentDisplayId || s.id || "";

  // Time Duration — dash unless completed AND backend supplied durationSeconds.
  const durationText = isCompleted && s.durationSeconds != null
    ? formatDuration(s.durationSeconds)
    : "—";

  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 6, left: r.right - 180 });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onClose = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const statusBadge = STATUS_BADGE[status];

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* S. No. cell removed — the row counter added visual noise without
          much value. Student ID + Name are the natural identifiers. */}
      <td className="px-4 py-3 text-[13px] text-gray-700 font-mono truncate max-w-[120px]" title={displayId}>
        {displayId}
      </td>
      <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{s.studentName}</td>
      <td className="px-4 py-3 text-[13px] text-gray-500">{s.email}</td>
      <td className="px-4 py-3 text-[13px] text-center">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${statusBadge.cls}`}
        >
          {statusBadge.label}
        </span>
      </td>
      <td className="px-4 py-3 text-[13px] text-center text-gray-700">{durationText}</td>
      <td className="px-4 py-3 text-[13px] text-center">
        <button
          ref={btnRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openMenu())}
          aria-label="Row actions"
          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors ${open ? "bg-gray-100 text-gray-700" : ""}`}
        >
          <MoreVertical size={18} />
        </button>

        {open &&
          createPortal(
            <div
              ref={menuRef}
              style={{ position: "fixed", top: coords.top, left: coords.left, width: 180 }}
              className="z-[1000] rounded-lg border border-gray-200 bg-white shadow-lg py-1 animate-[fadeIn_0.12s_ease-out]"
            >
              {/* Check Answers — enabled only when the student has submitted.
                  No-op for now; wired later when the answers view is built. */}
              <button
                type="button"
                disabled={!isCompleted}
                onClick={() => {
                  if (!isCompleted) return;
                  setOpen(false);
                  onCheckAnswers(s.id);
                }}
                title={isCompleted ? "Review this student's answers" : "Available after the student submits"}
                className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${
                  isCompleted
                    ? "text-gray-700 hover:bg-gray-50"
                    : "text-gray-400 cursor-not-allowed"
                }`}
              >
                <ClipboardCheck size={15} className={isCompleted ? "text-gray-400" : "text-gray-300"} />
                Check Answers
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); onSendMessage(s.id); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare size={15} className="text-gray-400" />
                Send Message
              </button>
            </div>,
            document.body,
          )}
      </td>
    </tr>
  );
}

// Re-render ONLY when this row's own student data (or index/handlers) changes.
function areEqual(prev: StudentRowProps, next: StudentRowProps) {
  if (prev.index !== next.index) return false;
  if (prev.onSendMessage !== next.onSendMessage) return false;
  if (prev.onCheckAnswers !== next.onCheckAnswers) return false;
  const a = prev.student;
  const b = next.student;
  return (
    a.id === b.id &&
    a.studentName === b.studentName &&
    a.email === b.email &&
    a.studentDisplayId === b.studentDisplayId &&
    a.completed === b.completed &&
    a.inProgress === b.inProgress &&
    a.submitted === b.submitted &&
    a.durationSeconds === b.durationSeconds
  );
}

export const StudentRow = React.memo(StudentRowBase, areEqual);
export default StudentRow;
