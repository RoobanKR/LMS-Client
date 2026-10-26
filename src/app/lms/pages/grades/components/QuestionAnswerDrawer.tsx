import React, { type ReactNode } from "react";
import { CheckCircle2, Circle, Clock, FileCode2, ListChecks, MessageSquare, Paperclip, XCircle } from "lucide-react";
import { Drawer } from "@/app/lms/shared/ui";
import { DifficultyChip } from "./GradeBadges";

// One question as the student answered it — marks, the answer itself (code,
// files, choice, text), test-case / AI results and the trainer's feedback.
// Opened from a row of the Questions tab: a student sees their own answer, a
// trainer the student they drilled into. Hidden test cases arrive without
// their input / output for students (the server strips them).
export default function QuestionAnswerDrawer({ question, onClose }: { question: any; onClose: () => void }) {
  const last = React.useRef<any>(null);
  if (question) last.current = question;
  const shown = question ?? last.current;
  if (!shown) return <Drawer open={false} onClose={onClose} title="Answer"><div /></Drawer>;

  const a = shown.studentAttempt;
  const max = Number(a?.totalScore || shown.score || 0);
  const got = Number(a?.score || 0);

  return (
    <Drawer open={Boolean(question)} onClose={onClose} width="lg" title="Question & answer">
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-heading leading-snug">{shown.title}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyChip difficulty={shown.difficulty || "medium"} />
            {a
              ? <Pill tone="success" icon={<CheckCircle2 className="h-3 w-3" />} label="Submitted" />
              : <Pill tone="neutral" icon={<XCircle className="h-3 w-3" />} label="Not attempted" />}
          </div>
          {plainText(shown.description) && (
            <p className="text-sm text-subtle whitespace-pre-wrap line-clamp-6">{plainText(shown.description)}</p>
          )}
        </div>

        <div className="grid grid-cols-3 divide-x divide-hairline rounded-2xl border border-hairline bg-surface shadow-xs">
          <Stat label="Marks" value={<>{got}<span className="text-sm text-faint font-normal">/{max}</span></>} />
          <Stat label="Attempts" value={a?.attempts || 0} />
          <Stat label="Result" value={a ? (a.isCorrect ? "Correct" : statusLabel(a.status)) : "—"} />
        </div>

        {a ? (
          <>
            <Section icon={<FileCode2 className="h-3.5 w-3.5" />} title="Answer">
              <AnswerBody question={shown} a={a} />
            </Section>
            <Evaluation bd={a.evaluationBreakdown} />
            {a.feedback && (
              <Section icon={<MessageSquare className="h-3.5 w-3.5" />} title="Feedback">
                <p className="rounded-tile border border-hairline bg-canvas px-3 py-2.5 text-sm text-body whitespace-pre-wrap">{a.feedback}</p>
              </Section>
            )}
            {(a.submittedAt || a.updatedAt) && (
              <p className="inline-flex items-center gap-1.5 text-xs text-subtle">
                <Clock className="h-3.5 w-3.5" /> Submitted {new Date(a.submittedAt || a.updatedAt).toLocaleString()}
              </p>
            )}
          </>
        ) : (
          <p className="rounded-tile border border-hairline bg-canvas px-3 py-3 text-sm text-subtle">No answer was submitted for this question.</p>
        )}
      </div>
    </Drawer>
  );
}

// The answer in whatever shape the editor saved it. `language` tells them apart:
// a programming language → code; "multi-file" → files; "html+css+js" → JSON of
// the three panes; "json" → matching pairs / ordering; "text" → typed or
// chosen text (MCQ, short answer).
function AnswerBody({ question, a }: { question: any; a: any }) {
  const lang = String(a.language || "").toLowerCase();
  const raw = String(a.codeAnswer || "");
  const blocks: ReactNode[] = [];

  if (a.isMultiFile && a.files?.length) {
    blocks.push(
      <div key="files" className="space-y-2">
        {a.files.map((f: any, i: number) => (
          <details key={f.id || i} className="rounded-tile border border-hairline bg-canvas" open={i === 0}>
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-heading">{f.filename || f.name || `File ${i + 1}`}</summary>
            <Code text={f.content || ""} />
          </details>
        ))}
      </div>,
    );
  } else if (question.options?.length) {
    const picked = pickedChoices(raw);
    blocks.push(
      <ul key="mcq" className="space-y-1.5">
        {question.options.map((o: any, i: number) => {
          const chosen = picked.includes(String(o.text).trim());
          return (
            <li key={i} className={`flex items-start gap-2 rounded-tile border px-3 py-2 text-sm ${chosen ? "border-info-500/40 bg-info-50" : "border-hairline bg-canvas"}`}>
              {chosen ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-info-700" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-faint" />}
              <span className="min-w-0 flex-1 text-body">{o.text || `Option ${i + 1}`}</span>
              {chosen && <span className="text-2xs font-semibold text-info-700">Your choice</span>}
              {o.isCorrect && <span className="text-2xs font-semibold text-success-700">Correct</span>}
            </li>
          );
        })}
      </ul>,
    );
  } else if (lang.includes("html") && raw.trim().startsWith("{")) {
    const parts = parseJson(raw) || {};
    for (const key of ["html", "css", "js"]) {
      if (parts[key]) blocks.push(<Labeled key={key} label={key.toUpperCase()}><Code text={String(parts[key])} /></Labeled>);
    }
  } else if (lang === "json") {
    const data = parseJson(raw);
    if (Array.isArray(data) && data.every((p) => p && "left" in p)) {
      blocks.push(
        <ul key="pairs" className="space-y-1.5">
          {data.map((p: any, i: number) => (
            <li key={i} className="flex items-center gap-2 rounded-tile border border-hairline bg-canvas px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 text-body break-words">{String(p.left)}</span>
              <span className="text-faint">→</span>
              <span className="min-w-0 flex-1 text-body break-words">{String(p.right ?? "")}</span>
            </li>
          ))}
        </ul>,
      );
    } else if (raw) {
      blocks.push(<Code key="json" text={data ? JSON.stringify(data, null, 2) : raw} />);
    }
  } else if (lang === "text") {
    if (raw) blocks.push(<p key="text" className="rounded-tile border border-hairline bg-canvas px-3 py-2.5 text-sm text-body whitespace-pre-wrap">{raw}</p>);
  } else if (raw) {
    blocks.push(<Labeled key="code" label={a.language || "Code"}><Code text={raw} /></Labeled>);
  }

  if (a.othersFiles?.length) {
    blocks.push(
      <ul key="uploads" className="space-y-1.5">
        {a.othersFiles.map((f: any, i: number) => (
          <li key={i}>
            <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-info-700 hover:underline">
              <Paperclip className="h-3.5 w-3.5" /> {f.name || `File ${i + 1}`}
            </a>
          </li>
        ))}
      </ul>,
    );
  }

  return blocks.length
    ? <div className="space-y-3">{blocks}</div>
    : <p className="text-sm text-subtle">The answer was submitted without any saved content.</p>;
}

// Test-case and AI results stored with the answer at scoring time.
function Evaluation({ bd }: { bd: any }) {
  if (!bd) return null;
  const tc = bd.testcase;
  const ai = bd.ai;
  const cases: any[] = tc?.cases?.length ? tc.cases : ai?.testCases || [];
  const passed = tc?.total ? tc.passed : ai?.passedTestCases;
  const total = tc?.total ? tc.total : ai?.totalTestCases;
  if (!total && !ai?.criteria?.length) return null;
  return (
    <Section icon={<ListChecks className="h-3.5 w-3.5" />} title={total ? `Test cases — ${passed}/${total} passed` : "Evaluation"}>
      <div className="space-y-2">
        {cases.map((c: any, i: number) => (
          <details key={i} className="rounded-tile border border-hairline bg-canvas">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-semibold text-heading">
              {c.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-success-700" /> : <XCircle className="h-3.5 w-3.5 text-danger-700" />}
              Test case {Number(c.index ?? i) + 1}{c.hidden ? " (hidden)" : ""}
            </summary>
            {c.input === undefined && c.expectedOutput === undefined
              ? <p className="px-3 pb-2 text-xs text-subtle">Hidden test case — its input and output aren't shown.</p>
              : (
                <div className="space-y-2 px-3 pb-3">
                  <Labeled label="Input"><Code text={c.input || "(none)"} /></Labeled>
                  <Labeled label="Expected output"><Code text={c.expectedOutput || "(none)"} /></Labeled>
                  {c.actualOutput !== undefined && <Labeled label="Output"><Code text={c.actualOutput || "(none)"} /></Labeled>}
                  {c.comment && <p className="text-xs text-subtle">{c.comment}</p>}
                </div>
              )}
          </details>
        ))}
        {ai?.criteria?.map((c: any, i: number) => (
          <div key={`c${i}`} className="rounded-tile border border-hairline bg-canvas px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-heading">{criterionLabel(c.key)}</span>
              <span className="tabular-nums text-subtle">{Math.round(c.percentage || 0)}%</span>
            </div>
            {c.comment && <p className="mt-1 text-xs text-subtle">{c.comment}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-subtle">{icon} {title}</p>
      {children}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-faint">{label}</p>
      {children}
    </div>
  );
}

function Code({ text }: { text: string }) {
  return <pre className="max-h-80 overflow-auto rounded-tile border border-hairline bg-surface px-3 py-2.5 font-mono text-xs leading-relaxed text-body whitespace-pre">{text}</pre>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="text-2xs uppercase font-medium text-faint">{label}</p>
      <p className="text-lg font-bold text-heading tabular-nums">{value}</p>
    </div>
  );
}

function Pill({ tone, icon, label }: { tone: "success" | "neutral"; icon: ReactNode; label: string }) {
  const cls = tone === "success"
    ? "bg-success-50 text-success-700 ring-success-500/20"
    : "bg-ink-100 text-ink-600 ring-ink-500/15";
  return <span className={`inline-flex items-center gap-1 h-6 rounded-full px-2 text-2xs font-semibold ring-1 ring-inset ${cls}`}>{icon} {label}</span>;
}

const parseJson = (s: string): any => { try { return JSON.parse(s); } catch { return null; } };

// An MCQ answer is the chosen option's text, or a JSON list of them.
const pickedChoices = (raw: string): string[] => {
  const parsed = parseJson(raw);
  if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim());
  return raw ? [raw.trim()] : [];
};

const plainText = (html?: string) =>
  String(html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").trim();

const statusLabel = (s?: string) =>
  ({ solved: "Solved", submitted: "Submitted", evaluated: "Evaluated", attempted: "Attempted", skipped: "Skipped" } as Record<string, string>)[s || ""] || "Attempted";

const criterionLabel = (k?: string) =>
  ({ correctness: "Correctness", codeQuality: "Code quality", efficiency: "Efficiency", readability: "Readability", edgeCases: "Edge cases", bestPractices: "Best practices" } as Record<string, string>)[k || ""] || k || "Criterion";
