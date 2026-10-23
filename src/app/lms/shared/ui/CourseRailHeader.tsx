"use client";

// The top of a course sidebar (student course view and the trainer's Upload
// Resources), with Back and Collapse kept apart so neither is mistaken for
// the other:
//   ← All courses                      its own row above the card
//   [book] PRT I              [panel]  the course card; the outlined
//          1 module                    sidebar-panel button collapses the
//                                      rail, "Collapse sidebar" on hover

import React from "react";
import { ArrowLeft, BookOpen, Layers, PanelLeft } from "lucide-react";

export function CourseRailHeader({
  courseName,
  moduleCount,
  onBack,
  backLabel = "All courses",
  backTitle,
  onCollapse,
}: {
  courseName: string;
  moduleCount: number;
  onBack: () => void;
  backLabel?: string;
  /** Hover text of the back row — where it goes. */
  backTitle?: string;
  /** Omit when the rail cannot collapse (e.g. the mobile drawer). */
  onCollapse?: () => void;
}) {
  return (
    <div className="flex-shrink-0 px-3 pb-1.5 pt-3">
      {/* Back — a navigation row of its own. */}
      <button
        type="button"
        onClick={onBack}
        title={backTitle || backLabel}
        className="mb-2 inline-flex h-8 max-w-full items-center gap-2 rounded-[9px] px-2 text-[13.5px] font-medium text-[#1E293B] transition-colors hover:bg-[#E9EBF0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
      >
        <ArrowLeft className="h-4 w-4 flex-shrink-0" strokeWidth={2} aria-hidden />
        <span className="truncate">{backLabel}</span>
      </button>

      {/* The course card. */}
      <div className="flex items-center gap-3 rounded-[14px] border border-[#E4E7EC] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <span
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] shadow-sm"
          style={{ background: "linear-gradient(135deg, #F97316, #FB923C)" }}
        >
          <BookOpen className="h-[18px] w-[18px] text-white" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-bold leading-tight tracking-tight text-[#0F172A]" title={courseName}>
            {courseName || "Course"}
          </p>
          <p className="m-0 mt-0.5 flex items-center gap-1 text-[12px] font-medium text-[#64748B]">
            <Layers className="h-3 w-3 flex-shrink-0" strokeWidth={2} aria-hidden />
            {moduleCount} module{moduleCount === 1 ? "" : "s"}
          </p>
        </div>
        {onCollapse && (
          <span className="group relative flex-shrink-0">
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#E4E7EC] bg-white text-[#475569] transition-colors hover:border-[#CBD1D9] hover:bg-[#F8FAFC] hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 z-50 whitespace-nowrap rounded-md bg-[#1E293B] px-2.5 py-1 text-[11.5px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              Collapse sidebar
              <span className="absolute -bottom-1 right-3.5 h-2 w-2 rotate-45 bg-[#1E293B]" aria-hidden />
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

export default CourseRailHeader;
