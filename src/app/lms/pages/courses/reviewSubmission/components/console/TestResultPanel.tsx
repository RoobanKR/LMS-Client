"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Eye, Loader2, Lock, X, XCircle } from "lucide-react";
import type {
  TestResultCase,
  TestResultState,
} from "@/app/lms/pages/courses/coursesdetailedview/components/multi-file/BottomPanel";

// Review console ▸ Test Result panel (docked beside the Student Answer code)
// — the submission's test results laid out the way the multi-file editor's
// Test Results drawer shows them: an overview (passed / failed / total), then
// Test case · Status · Actions, where View details opens that case in a popup.

const caseLabel = (c: TestResultCase) =>
  `${c.hidden ? "Hidden case" : c.source === "ai" ? "AI case" : "Case"} ${c.index + 1}`;

const TONES = {
  ok: { fg: "#046C4E", bg: "#ECFDF3", border: "#BBF7D0" },
  bad: { fg: "#B42318", bg: "#FEF3F2", border: "#FBD3CE" },
  warn: { fg: "#B54708", bg: "#FFFAEB", border: "#F5DFA8" },
  info: { fg: "#175CD3", bg: "#EFF6FF", border: "#BFDBFE" },
};

interface TestResultPanelProps {
  state: TestResultState | null;
  /** Graded exercises also show the score. */
  showScore?: boolean;
  /** Offered in the empty state when the trainer can run the tests. */
  onRunTests?: () => void;
}

export default function TestResultPanel({ state, showScore = true, onRunTests }: TestResultPanelProps) {
  const [detail, setDetail] = useState<TestResultCase | null>(null);
  // A new evaluation closes the popup.
  useEffect(() => { setDetail(null); }, [state]);

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#E5E7EB] bg-[#F8FAFE]">
          <ClipboardCheck className="h-5 w-5 text-[#8090AF]" />
        </span>
        <span className="text-[13.5px] font-semibold text-[#39496B]">No test results yet</span>
        <span className="max-w-[340px] text-[12.5px] font-medium text-[#8090AF]">
          This answer has no stored test results.{onRunTests ? " Run the tests to check it." : ""}
        </span>
        {onRunTests && (
          <button
            type="button"
            onClick={onRunTests}
            className="mt-1 rounded-[6px] bg-[#009F9A] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#00857F]"
          >
            Run tests
          </button>
        )}
      </div>
    );
  }

  const evaluating = state.status === "evaluating";
  const cases = state.cases || [];
  const total = typeof state.totalCount === "number" ? state.totalCount : cases.length;
  const passed = typeof state.passedCount === "number" ? state.passedCount : cases.filter((c) => c.passed).length;
  const hasCounts = !evaluating && total > 0;
  const tone = evaluating ? TONES.info
    : hasCounts ? (passed === total ? TONES.ok : passed === 0 ? TONES.bad : TONES.warn)
      : TONES.bad;
  const title = evaluating
    ? state.message || "Running tests…"
    : hasCounts
      ? passed === total ? `All ${total} tests passed` : `${total - passed} of ${total} tests failed`
      : state.message || "No test cases ran";
  const sub = [
    hasCounts && state.message ? state.message : "",
    showScore && !evaluating && typeof state.score === "number" && typeof state.maxMarks === "number"
      ? `Score ${state.score} / ${state.maxMarks}` : "",
  ].filter(Boolean).join(" · ");
  const TitleIcon = evaluating ? Loader2 : hasCounts && passed === total ? CheckCircle2 : XCircle;

  return (
    <div className="flex flex-col gap-3">
      {/* Overview */}
      <div className="rounded-[10px] border p-3.5" style={{ borderColor: tone.border, background: tone.bg }}>
        <div className="flex items-start gap-2">
          <TitleIcon className={`mt-0.5 h-5 w-5 shrink-0 ${evaluating ? "animate-spin" : ""}`} style={{ color: tone.fg }} />
          <div className="min-w-0">
            <div className="text-[15px] font-bold" style={{ color: tone.fg }}>{title}</div>
            {sub && <div className="mt-0.5 text-[12.5px] text-[#475467]">{sub}</div>}
          </div>
        </div>
        {hasCounts && (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: "Passed", value: passed, fg: "#046C4E", Icon: CheckCircle2 },
                { label: "Failed", value: Math.max(0, total - passed), fg: "#B42318", Icon: XCircle },
                { label: "Total", value: total, fg: "#344054", Icon: ClipboardCheck },
              ].map((s) => (
                <div key={s.label} className="rounded-[9px] border border-[#EAECF0] bg-white px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: s.fg }}>
                    <s.Icon className="h-3.5 w-3.5" />{s.label}
                  </div>
                  <div className="mt-0.5 text-[20px] font-bold leading-tight text-[#101828]">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#FDE2E0]" aria-hidden>
              <div className="h-full rounded-full bg-[#12B76A]" style={{ width: `${(passed / total) * 100}%` }} />
            </div>
          </>
        )}
      </div>

      {state.errorDetail && !evaluating && (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-[8px] border border-[#FBD3CE] bg-[#FEF3F2] p-2.5 font-mono text-[12px] text-[#912018]">
          {state.errorDetail}
        </pre>
      )}

      {/* Test case | Status | Actions */}
      {cases.length > 0 && (
        <div className={`overflow-hidden rounded-[10px] border border-[#EAECF0] ${evaluating ? "pointer-events-none opacity-50" : ""}`}>
          <table className="w-full border-collapse text-left text-[13px]" aria-label="Test case results">
            <thead className="bg-[#F9FAFB] text-[#475467]">
              <tr>
                <th scope="col" className="border-b border-[#EAECF0] px-3 py-2.5 text-[12px] font-semibold">Test case</th>
                <th scope="col" className="w-[64px] border-b border-[#EAECF0] px-2 py-2.5 text-center text-[12px] font-semibold">Status</th>
                <th scope="col" className="w-[124px] border-b border-[#EAECF0] px-3 py-2.5 text-right text-[12px] font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => (
                <tr key={`${c.source || "question"}-${c.index}-${i}`} className={i ? "border-t border-[#EAECF0]" : ""}>
                  <th scope="row" className="px-3 py-2.5 font-semibold text-[#101828]">
                    <span className="inline-flex items-center gap-1.5">
                      {caseLabel(c)}
                      {c.hidden && <Lock className="h-3 w-3 text-[#8090AF]" aria-label="Hidden case" />}
                    </span>
                  </th>
                  <td className="px-2 py-2.5 text-center">
                    <span
                      role="img"
                      aria-label={c.passed ? "Passed" : "Failed"}
                      title={c.passed ? "Passed" : "Failed"}
                      className={`inline-flex ${c.passed ? "text-[#12B76A]" : "text-[#F04438]"}`}
                    >
                      {c.passed ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setDetail(c)}
                      aria-label={`View details of ${caseLabel(c)}`}
                      className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-[#D6E4FA] bg-white px-2.5 text-[12px] font-semibold text-[#0667F9] transition-colors hover:bg-[#F1F6FE]"
                    >
                      <Eye className="h-3.5 w-3.5" /> View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && <CaseDetailDialog testCase={detail} ai={!!state.ai} onClose={() => setDetail(null)} />}
    </div>
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
