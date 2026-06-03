"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Eye, MessageSquare } from "lucide-react";
import type { StudentProgress } from "../types/liveDashboard.types";

interface StudentRowProps {
  student: StudentProgress;
  index: number;
  onViewDetails: (studentId: string) => void;
  onSendMessage: (studentId: string) => void;
}

function StudentRowBase({ student, index, onViewDetails, onSendMessage }: StudentRowProps) {
  const s = student;
  // "In Progress" column → three-state test progress: Not Started → Started → Completed.
  const testProgress = s.submitted
    ? { label: "Completed", cls: "text-green-600 font-medium" }
    : s.inProgress || s.completed > 0
      ? { label: "Started", cls: "text-blue-600 font-medium" }
      : { label: "Not Started", cls: "text-gray-400" };
  // Keep the % column in lockstep with the Completed / Total shown on the same row.
  const completionPercent = s.totalQuestions > 0
    ? Math.round((s.completed / s.totalQuestions) * 100)
    : 0;
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 6, left: r.right - 168 }); // align menu's right edge to the button
    setOpen(true);
  };

  // Close on outside click, scroll, resize, or Escape.
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

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-[13px] text-gray-500">{index + 1}</td>
      <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{s.studentName}</td>
      <td className="px-4 py-3 text-[13px] text-gray-500">{s.email}</td>
      <td className="px-4 py-3 text-[13px] text-center text-gray-700">{s.totalQuestions}</td>
      <td className="px-4 py-3 text-[13px] text-center font-semibold text-green-600">{s.completed}</td>
      <td className="px-4 py-3 text-[13px] text-center font-semibold text-amber-500">{s.yetToComplete}</td>
      <td className="px-4 py-3 text-[13px] text-center text-gray-700">{s.notAttempted}</td>
      <td className="px-4 py-3 text-[13px] text-center">
        <span className={testProgress.cls}>{testProgress.label}</span>
      </td>
      <td className="px-4 py-3 text-[13px] text-center font-semibold text-blue-600">
        {completionPercent}%
      </td>
      <td className="px-4 py-3 text-[13px] text-center">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${
            s.submitted ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {s.submitted ? "Submitted" : "Not Submitted"}
        </span>
      </td>
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
              style={{ position: "fixed", top: coords.top, left: coords.left, width: 168 }}
              className="z-[1000] rounded-lg border border-gray-200 bg-white shadow-lg py-1 animate-[fadeIn_0.12s_ease-out]"
            >
              <button
                type="button"
                onClick={() => { setOpen(false); onViewDetails(s.id); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Eye size={15} className="text-gray-400" />
                View Details
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
  if (prev.onViewDetails !== next.onViewDetails) return false;
  if (prev.onSendMessage !== next.onSendMessage) return false;
  const a = prev.student;
  const b = next.student;
  return (
    a.id === b.id &&
    a.studentName === b.studentName &&
    a.email === b.email &&
    a.totalQuestions === b.totalQuestions &&
    a.completed === b.completed &&
    a.yetToComplete === b.yetToComplete &&
    a.notAttempted === b.notAttempted &&
    a.inProgress === b.inProgress &&
    a.completionPercent === b.completionPercent &&
    a.submitted === b.submitted
  );
}

export const StudentRow = React.memo(StudentRowBase, areEqual);
export default StudentRow;
