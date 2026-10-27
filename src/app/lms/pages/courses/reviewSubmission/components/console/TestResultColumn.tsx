"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2, ChevronsDown, ChevronsLeft, ChevronsRight, ChevronsUp, ClipboardCheck, Eye, Loader2, Lock, X, XCircle,
} from "lucide-react";
import type {
  TestResultCase,
  TestResultState,
} from "@/app/lms/pages/courses/coursesdetailedview/components/multi-file/BottomPanel";

// The review console's last column — the submission's test results, the same
// way the multi-file editor shows them: a passed / failed overview, then one
// row per case with a tick or a cross and View details, which opens that
// case in a popup. Collapses to a thin strip (→ / ←); the page owns the width
// and the drag handle in front of it.

interface TestResultColumnProps {
  state: TestResultState | null;
  open: boolean;
  onToggle: () => void;
  width: number;
  /** Graded exercises also show the score line. */
  showScore?: boolean;
}

const caseLabel = (c: TestResultCase) =>
  `${c.hidden ? "Hidden case" : c.source === "ai" ? "AI case" : "Case"} ${c.index + 1}`;

export default function TestResultColumn({
  state, open, onToggle, width, showScore = true,
}: TestResultColumnProps) {
  const [detail, setDetail] = useState<TestResultCase | null>(null);
  // A new evaluation closes the popup.
  useEffect(() => { setDetail(null); }, [state]);

  const evaluating = state?.status === "evaluating";
  const cases = state?.cases || [];
  const total = typeof state?.totalCount === "number" ? state.totalCount : cases.length;
  const passed = typeof state?.passedCount === "number" ? state.passedCount : cases.filter((c) => c.passed).length;
  const hasCounts = !evaluating && total > 0;

  // Collapsed: a thin strip beside the grading rail; a bar where the
  // columns stack (below lg).
  if (!open) {
    return (
      <aside className="flex w-full flex-none items-center gap-3 rounded-[8px] border border-[#E5E7EB] bg-white px-3 py-2 lg:w-10 lg:flex-col lg:px-0">
        <button
          type="button"
          onClick={onToggle}
          title="Show test results"
          aria-label="Show test results"
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#53658C] transition-colors hover:bg-[#F1F6FE] hover:text-[#0667F9]"
        >
          <ChevronsLeft className="hidden h-4 w-4 lg:block" />
          <ChevronsDown className="h-4 w-4 lg:hidden" />
        </button>
        <span className="text-[11.5px] font-semibold text-[#39496B] lg:[writing-mode:vertical-rl]">Test Result</span>
        {hasCounts && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${passed === total ? "bg-[#ECFDF3] text-[#046C4E]" : "bg-[#FEF3F2] text-[#B42318]"}`}
            title={`${passed} of ${total} passed`}
          >
            {passed}/{total}
          </span>
        )}
      </aside>
    );
  }

  return (
    <aside
      style={{ ["--test-col-w" as string]: `${width}px` } as React.CSSProperties}
      className="flex w-full min-h-0 flex-none flex-col overflow-hidden rounded-[8px] border border-[#E5E7EB] bg-white lg:w-[var(--test-col-w)]"
    >
      <div className="flex h-[42px] flex-none items-center gap-2 border-b border-[#E7EEF8] px-3">
        <ClipboardCheck className="h-4 w-4 text-[#0667F9]" />
        <span className="flex-1 truncate text-[13.5px] font-semibold text-[#0B1437]">Test Result</span>
        <button
          type="button"
          onClick={onToggle}
          title="Hide test results"
          aria-label="Hide test results"
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#53658C] transition-colors hover:bg-[#F1F6FE] hover:text-[#0667F9]"
        >
          <ChevronsRight className="hidden h-4 w-4 lg:block" />
          <ChevronsUp className="h-4 w-4 lg:hidden" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
        {!state ? (
          <p className="px-1 py-6 text-center text-[12.5px] font-medium text-[#8090AF]">
            No test results for this answer yet. Use Run tests to check it.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Overview */}
            <div className="rounded-[8px] border border-[#E7EEF8] bg-[#F8FAFE] p-3">
              {evaluating ? (
                <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[#175CD3]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {state.message || "Running tests…"}
                </span>
              ) : (
                <>
                  <div className="text-[13px] font-bold text-[#0B1437]">
                    {hasCounts
                      ? passed === total ? `All ${total} tests passed` : `${passed} of ${total} tests passed`
                      : state.message || "No test cases ran"}
                  </div>
                  {showScore && typeof state.score === "number" && typeof state.maxMarks === "number" && (
                    <div className="mt-0.5 text-[12px] font-medium text-[#66789C]">
                      Score {state.score} / {state.maxMarks}
                    </div>
                  )}
                  {hasCounts && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#FDE2E0]" aria-hidden>
                      <div className="h-full rounded-full bg-[#12B76A]" style={{ width: `${(passed / total) * 100}%` }} />
                    </div>
                  )}
                </>
              )}
            </div>

            {state.errorDetail && !evaluating && (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-[8px] border border-[#FBD3CE] bg-[#FEF3F2] p-2.5 font-mono text-[11.5px] text-[#912018]">
                {state.errorDetail}
              </pre>
            )}

            {cases.length > 0 && (
              <ul className={`overflow-hidden rounded-[8px] border border-[#E5E7EB] ${evaluating ? "pointer-events-none opacity-50" : ""}`}>
                {cases.map((c, i) => (
                  <li
                    key={`${c.source || "question"}-${c.index}-${i}`}
                    className={`flex items-center gap-2 px-3 py-2 ${i ? "border-t border-[#EEF2F8]" : ""}`}
                  >
                    <span
                      role="img"
                      aria-label={c.passed ? "Passed" : "Failed"}
                      title={c.passed ? "Passed" : "Failed"}
                      className={c.passed ? "text-[#12B76A]" : "text-[#F04438]"}
                    >
                      {c.passed ? <CheckCircle2 className="h-[18px] w-[18px]" /> : <XCircle className="h-[18px] w-[18px]" />}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-[12.5px] font-semibold text-[#0B1437]">
                      {caseLabel(c)}
                      {c.hidden && <Lock className="h-3 w-3 shrink-0 text-[#8090AF]" aria-label="Hidden case" />}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetail(c)}
                      aria-label={`View details of ${caseLabel(c)}`}
                      className="flex h-[26px] shrink-0 items-center gap-1 rounded-[6px] border border-[#D6E4FA] bg-white px-2 text-[11.5px] font-semibold text-[#0667F9] transition-colors hover:bg-[#F1F6FE]"
                    >
                      <Eye className="h-3.5 w-3.5" /> View details
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {detail && (
        <CaseDetailDialog
          testCase={detail}
          ai={!!state?.ai}
          onClose={() => setDetail(null)}
        />
      )}
    </aside>
  );
}

function CaseDetailDialog({
  testCase: c, ai, onClose,
}: { testCase: TestResultCase; ai: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${caseLabel(c)} details`}>
      <div className="absolute inset-0 bg-[rgba(16,24,40,0.35)]" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[10px] bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-[#E7EEF8] px-4 py-3">
          <span className={c.passed ? "text-[#12B76A]" : "text-[#F04438]"}>
            {c.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <span className="flex-1 text-[14px] font-bold text-[#0B1437]">
            {caseLabel(c)} · {c.passed ? "Passed" : "Failed"}
          </span>
          {typeof c.runtimeMs === "number" && (
            <span className="text-[11.5px] font-medium text-[#66789C]">{c.runtimeMs} ms</span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#53658C] hover:bg-[#F1F6FE]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          <DetailBlock label="Input" value={c.input} />
          <DetailBlock label="Expected output" value={c.expectedOutput} />
          {ai
            ? <DetailBlock label="AI verdict" value={c.comment || "No feedback provided"} tone={c.passed ? "ok" : "bad"} />
            : <DetailBlock label="Student output" value={c.actualOutput} tone={c.passed ? "ok" : "bad"} />}
          {c.errorMessage && <DetailBlock label="Error" value={c.errorMessage} tone="bad" />}
        </div>
      </div>
    </div>
  );
}

function DetailBlock({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  const box = tone === "ok"
    ? "border-[#BBF7D0] bg-[#F6FEF9]"
    : tone === "bad" ? "border-[#FBD3CE] bg-[#FFFBFA]" : "border-[#E5E7EB] bg-[#F8FAFE]";
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#8090AF]">{label}</div>
      <pre className={`max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-[8px] border p-2.5 font-mono text-[12px] text-[#39496B] ${box}`}>
        {value || "(empty)"}
      </pre>
    </div>
  );
}
