"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, ChevronRight, ClipboardList, ListChecks, Search, UsersRound, X, XCircle,
} from "lucide-react";
import { getUserId, SESSION_KEYS } from "@/lib/session";
import DashboardLayout from "@/app/lms/component/layout";
import { StaffLayout } from "@/app/lms/component/stafflayout/staff-layout";
import { StudentLayout } from "@/app/lms/component/student/student-layout";
import { fetchReportPayload } from "@/app/lms/pages/courses/courseReport/reportApi";
import {
  collectExercises, collectStudents, formatDate, formatPercent, QUESTION_STATUS_LABEL, round1, totalsFor,
  type ReportExercise, type ReportStudent, type Section,
} from "@/app/lms/pages/courses/courseReport/reportData";
import { Dash, StatusChip } from "@/app/lms/pages/courses/courseReport/ReportUi";
import { buildCells, cellKey, pct, questionInsights, sumCells, type Cell } from "./insightsData";

// ─── Course Insights ─────────────────────────────────────────────────────────
//
// What the course's We Do / You Do work looks like, from the answers students
// stored: how many questions they solved, how many were fully right, how many
// test cases passed, and — for graded exercises only — the marks.
//
//   Course:    Exercises | Students, activity chips, one line of figures,
//              the list. Open an exercise (or a student's exercise) to go in.
//   Exercise:  Students — status chips, per question on expand — | Questions,
//              one line of figures; back (or the crumb) returns.
//
// Built on the Course Report's payload and marks functions, so a figure here
// is the figure the report prints.

const SECTION_LABEL: Record<Section, string> = { We_Do: "We Do", You_Do: "You Do" };

const CARD = "rounded-xl border border-hairline bg-surface shadow-xs";
const CONTROL = "h-9 rounded-control border border-hairline-strong bg-surface px-2.5 text-xs text-body focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";
const PAGE_SIZE = 50;
// A size up from the Course Report's print-minded table type: read on screen.
const TH = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-subtle whitespace-nowrap";
const TD = "px-3 py-2.5 text-[13.5px] text-body align-middle";
const TD_NUM = `${TD} text-right tabular-nums`;

type StudentSort = "name" | "correct-desc" | "correct-asc" | "tests-desc" | "marks-desc";
type StatusFilter = "" | "completed" | "in-progress" | "not-started";

/** Who is looking: a trainer sees the students of the batches they teach. */
function useViewer() {
  const [viewer, setViewer] = useState<{ trainer: boolean; id: string } | null>(null);
  useEffect(() => {
    let trainer = false;
    let id = "";
    try {
      trainer = [SESSION_KEYS.originalRole, SESSION_KEYS.renameRole, SESSION_KEYS.roleValue, SESSION_KEYS.role, SESSION_KEYS.userRole]
        .some((k) => (localStorage.getItem(k) || "").toLowerCase().includes("trainer"));
      id = getUserId() || "";
    } catch { /* storage unavailable — treated as a non-trainer */ }
    setViewer({ trainer, id });
  }, []);
  return viewer;
}

const activityOf = (ex: ReportExercise) => `${SECTION_LABEL[ex.section]} · ${ex.subcategory || "Exercises"}`;

/** "We_Do" or "We_Do|practical" against an exercise. */
const matchesActivity = (ex: ReportExercise, activity: string) => {
  if (!activity) return true;
  const [section, sub] = activity.split("|");
  return ex.section === section && (!sub || ex.subcategoryKey === sub);
};

// ─── Small pieces ────────────────────────────────────────────────────────────

/** One slim line of figures for what is on screen — no cards. */
function Figures({ items }: { items: { label: string; value: string; detail?: string; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-2 border-b border-hairline sm:flex sm:flex-wrap sm:divide-x sm:divide-hairline">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 px-4 py-2.5 sm:min-w-[150px] sm:flex-1">
          <div className="text-xs font-medium text-subtle">{it.label}</div>
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="text-lg font-bold tabular-nums leading-tight" style={{ color: it.tone || "var(--color-heading, #101828)" }}>{it.value}</span>
            {it.detail && <span className="truncate text-xs text-faint tabular-nums" title={it.detail}>{it.detail}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Pick-one chips with counts — filters that sit right on the list they filter. */
function Chips({ value, onChange, items, label }: {
  value: string; onChange: (v: string) => void; label: string;
  items: { key: string; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
      {items.map((it) => {
        const on = value === it.key;
        return (
          <button
            key={it.key || "all"}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(it.key)}
            className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[13px] transition-colors ${
              on ? "border-heading bg-heading font-semibold text-white" : "border-hairline-strong bg-surface text-body hover:bg-row-hover"
            }`}
          >
            {it.label}
            {it.count != null && <span className={`tabular-nums text-xs ${on ? "text-white/80" : "text-faint"}`}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Back, where you are, and what it is — one row, no card. */
function TopBar({ onBack, backLabel, crumb, onCrumb, title, subtitle }: {
  onBack: () => void; backLabel: string; crumb?: string; onCrumb?: () => void; title: string; subtitle: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        title={backLabel}
        aria-label={backLabel}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-hairline-strong bg-surface text-subtle transition-colors hover:bg-row-hover hover:text-heading"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="min-w-0">
        {crumb && (
          <button type="button" onClick={onCrumb} className="text-xs font-medium text-subtle hover:text-brand-strong hover:underline">
            {crumb} ›
          </button>
        )}
        <h1 className="truncate text-lg font-semibold leading-tight tracking-[-0.01em] text-heading" title={title}>{title}</h1>
        <p className="truncate text-[13px] text-subtle" title={subtitle}>{subtitle}</p>
      </div>
    </div>
  );
}

/** A percentage with a thin bar under it. */
function Meter({ part, whole, tone = "#12B76A" }: { part: number; whole: number; tone?: string }) {
  if (whole <= 0) return <Dash />;
  const p = Math.round((part / whole) * 100);
  return (
    <div className="ml-auto w-[88px]">
      <div className="text-right text-[13px] font-semibold tabular-nums text-heading">{p}%</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EAECF0]">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: tone }} />
      </div>
    </div>
  );
}

/** "x / y" with the share underneath. */
function Count({ part, whole }: { part: number; whole: number }) {
  if (whole <= 0) return <Dash />;
  return (
    <div className="text-right tabular-nums">
      <div className="text-[13.5px] font-semibold text-heading">{part} / {whole}</div>
      <div className="text-xs text-faint">{pct(part, whole)}</div>
    </div>
  );
}

function Tabs<T extends string>({ value, onChange, tabs }: {
  value: T; onChange: (v: T) => void; tabs: { key: T; label: string; icon: React.ReactNode; count?: number }[];
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-control border border-hairline-strong bg-surface" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`inline-flex h-9 items-center gap-1.5 px-3 text-[13px] font-medium transition-colors ${
            value === t.key ? "bg-brand-strong text-white" : "text-body hover:bg-row-hover"
          }`}
        >
          {t.icon} {t.label}
          {t.count != null && <span className={`rounded-full px-1.5 text-2xs ${value === t.key ? "bg-white/20" : "bg-canvas text-subtle"}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-hairline px-3 py-2 text-xs text-subtle">
      <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
      <span className="flex gap-1.5">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-control border border-hairline-strong px-2.5 py-1 hover:bg-row-hover disabled:opacity-40">Prev</button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-control border border-hairline-strong px-2.5 py-1 hover:bg-row-hover disabled:opacity-40">Next</button>
      </span>
    </div>
  );
}

const usePaged = <T,>(rows: T[], resetKey: string) => {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safe = Math.min(page, pages);
  return { page: safe, pages, setPage, rows: rows.slice((safe - 1) * PAGE_SIZE, safe * PAGE_SIZE) };
};

/** Student search — sits on the student list it filters. */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="relative min-w-[170px] flex-1 sm:max-w-[210px]">
      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name, email, reg no"
        aria-label="Search students"
        className={`${CONTROL} w-full pl-7 pr-7`}
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-heading">
          <X size={13} />
        </button>
      )}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-xs text-subtle">{text}</p>;
}

function Correctness({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle2 size={16} className="text-[#12B76A]" aria-label="Correct" />
    : <XCircle size={16} className="text-[#F04438]" aria-label="Not correct" />;
}

// ─── Page ────────────────────────────────────────────────────────────────────

// The shell by role, as this page has always picked it: the admin sidebar for
// admin / L&D / programme roles, the student's for a student, the trainer's
// otherwise. A trainer's StaffLayout is hosted by app/lms/pages/layout.tsx, so
// it stays mounted between their pages.
const ADMIN_SHELL_ROLES = ["admin", "ldhead", "subhead", "programcoordinator"];

export default function CourseInsightsRoute() {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    try {
      setRole((localStorage.getItem(SESSION_KEYS.roleValue) || localStorage.getItem(SESSION_KEYS.userRole) || "student").toLowerCase());
    } catch {
      setRole("student");
    }
  }, []);
  if (role === null) return null;
  if (ADMIN_SHELL_ROLES.includes(role)) return <DashboardLayout><CourseInsightsPage /></DashboardLayout>;
  if (role === "student") return <StudentLayout><CourseInsightsPage /></StudentLayout>;
  return <StaffLayout><CourseInsightsPage /></StaffLayout>;
}

function CourseInsightsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = String(params?.courseId || "");
  const viewer = useViewer();

  // Same query as the Course Report, so the two share one download.
  const { data: payload, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["courseReport", "payload", courseId],
    queryFn: () => fetchReportPayload(courseId),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const courseName: string = payload?.course?.courseName || "Course";
  const exercises = useMemo(() => (payload ? collectExercises(payload.views) : []), [payload]);

  // The roster this viewer may see: a trainer, the batches that list them.
  const students = useMemo<ReportStudent[]>(() => {
    if (!payload || !viewer) return [];
    const all = collectStudents(payload.course);
    if (!viewer.trainer || !viewer.id) return all;
    const mine = new Set(((payload.course?.batchAndParticipants || []) as any[])
      .filter((b) => (b?.users || []).some((u: any) => String(u?.user?._id || u?.user || "") === viewer.id))
      .map((b) => String(b?._id)));
    return all.filter((s) => s.batchIds.some((id) => mine.has(id)));
  }, [payload, viewer]);

  // Every (exercise, student) figure, once per load.
  const cells = useMemo(() => buildCells(courseId, exercises, students), [courseId, exercises, students]);

  // ── Filters ──
  const [batch, setBatch] = useState("");
  const [activity, setActivity] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"exercises" | "students">("exercises");
  const [exTab, setExTab] = useState<"students" | "questions">("students");
  const [statusF, setStatusF] = useState<StatusFilter>("");
  const [sort, setSort] = useState<StudentSort>("name");
  const [openRow, setOpenRow] = useState<string | null>(null);

  // `?exerciseId=` opens straight onto one exercise; the choice stays in the URL.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("exerciseId");
    if (id) setExerciseId(id);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (exerciseId) url.searchParams.set("exerciseId", exerciseId); else url.searchParams.delete("exerciseId");
    window.history.replaceState(null, "", url.toString());
    setOpenRow(null);
  }, [exerciseId]);

  const batchOptions = useMemo(
    () => [...new Set(students.flatMap((s) => (s.batches.length ? s.batches : [s.batch]).filter(Boolean)))]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [students],
  );
  const scopedStudents = useMemo(
    () => (batch ? students.filter((s) => (s.batches.length ? s.batches : [s.batch]).includes(batch)) : students),
    [students, batch],
  );

  // Activity options: each section, then its subcategories.
  const activityGroups = useMemo(() => {
    const groups = new Map<Section, Map<string, string>>();
    for (const ex of exercises) {
      if (!groups.has(ex.section)) groups.set(ex.section, new Map());
      groups.get(ex.section)!.set(ex.subcategoryKey, ex.subcategory || "Exercises");
    }
    return [...groups.entries()].map(([section, subs]) => ({
      section,
      subs: [...subs.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    }));
  }, [exercises]);

  // One chip per activity ("We Do · Practical"), counting its exercises.
  const activityChips = useMemo(() => {
    const inView = exercises.filter((ex) => scopedStudents.some((s) => cells.has(cellKey(ex.id, s.id))));
    const items = activityGroups.flatMap((g) => g.subs.map(([key, label]) => ({
      key: `${g.section}|${key}`,
      label: `${SECTION_LABEL[g.section]} · ${label}`,
      count: inView.filter((ex) => matchesActivity(ex, `${g.section}|${key}`)).length,
    }))).filter((c) => c.count > 0);
    return [{ key: "", label: "All", count: inView.length }, ...items];
  }, [exercises, scopedStudents, cells, activityGroups]);

  // Exercises set for at least one student in view, in the chosen activity.
  const activityExercises = useMemo(
    () => exercises.filter((ex) => matchesActivity(ex, activity)
      && scopedStudents.some((s) => cells.has(cellKey(ex.id, s.id)))),
    [exercises, activity, scopedStudents, cells],
  );
  const exercise = useMemo(
    () => (exerciseId ? exercises.find((ex) => ex.id === exerciseId) || null : null),
    [exercises, exerciseId],
  );
  // An exercise outside the chosen activity is let go.
  useEffect(() => {
    if (exercise && !matchesActivity(exercise, activity)) setExerciseId("");
  }, [exercise, activity]);
  const scopeExercises = useMemo(() => (exercise ? [exercise] : activityExercises), [exercise, activityExercises]);

  const ql = query.trim().toLowerCase();
  const matchesQuery = (s: ReportStudent) => !ql
    || [s.name, s.email, s.regNo].some((v) => (v || "").toLowerCase().includes(ql));

  const cellsOf = (exs: ReportExercise[], studs: ReportStudent[]) => {
    const out: { cell: Cell; exercise: ReportExercise; student: ReportStudent }[] = [];
    for (const ex of exs) for (const s of studs) {
      const cell = cells.get(cellKey(ex.id, s.id));
      if (cell) out.push({ cell, exercise: ex, student: s });
    }
    return out;
  };

  const scopeTotals = useMemo(
    () => sumCells(cellsOf(scopeExercises, scopedStudents)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopeExercises, scopedStudents, cells],
  );
  // The chosen exercise's students — every one (figures, status counts, question insight) and
  // those the search leaves.
  const exerciseCells = useMemo(
    () => (exercise ? cellsOf([exercise], scopedStudents) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercise, scopedStudents, cells],
  );
  const exerciseAllCells = useMemo(() => exerciseCells.map((r) => r.cell), [exerciseCells]);
  const anyGraded = scopeExercises.some((ex) => ex.graded);

  // ── States ──
  if (!courseId) return <Shell><Empty text="No course selected." /></Shell>;
  if (isLoading || !viewer) {
    return (
      <Shell>
        <div className="h-12 w-72 animate-pulse rounded-lg bg-canvas" />
        <div className="h-96 animate-pulse rounded-xl bg-canvas" />
      </Shell>
    );
  }
  if (isError) {
    return (
      <Shell>
        <div className={`${CARD} px-6 py-10 text-center`}>
          <p className="text-sm font-semibold text-heading">Couldn&apos;t load this course</p>
          <p className="mt-1 text-xs text-subtle">{(error as Error)?.message || "Something went wrong."}</p>
          <button type="button" onClick={() => refetch()} className="mt-3 rounded-control bg-brand-strong px-3 py-1.5 text-xs font-semibold text-white">Try again</button>
        </div>
      </Shell>
    );
  }

  // The figures for what is on screen: the whole course, or one exercise.
  const t = scopeTotals;
  const figures = (
    <Figures items={[
      ...(exercise ? [] : [{ label: "Completed", value: pct(t.completed, t.cells), detail: `${t.completed} / ${t.cells} attempts`, tone: "#175CD3" }]),
      { label: "Questions solved", value: pct(t.solved, t.possible), detail: `${t.solved} / ${t.possible}`, tone: "#6941C6" },
      { label: "Fully correct", value: pct(t.correct, t.solved), detail: `${t.correct} of ${t.solved} solved`, tone: "#067647" },
      { label: "Test cases passed", value: pct(t.testsPassed, t.testsTotal), detail: t.testsTotal ? `${t.testsPassed} / ${t.testsTotal}` : "no test cases", tone: "#B54708" },
      ...(anyGraded ? [{ label: "Average marks", value: formatPercent(t.avgPercent), detail: "completed, graded", tone: "#C4320A" }] : []),
    ]} />
  );

  const studentsLabel = `${scopedStudents.length} student${scopedStudents.length === 1 ? "" : "s"}`;

  // ── One exercise: its students (or its questions) ──
  if (exercise) {
    return (
      <Shell>
        <TopBar
          onBack={() => setExerciseId("")}
          backLabel="Back to all exercises"
          crumb="Course Insights"
          onCrumb={() => setExerciseId("")}
          title={exercise.name}
          subtitle={[
            activityOf(exercise),
            exercise.graded ? `Graded · ${round1(exercise.totalMarks)} marks` : "Non-graded",
            `${exercise.questionCount} question${exercise.questionCount === 1 ? "" : "s"}`,
            (exercise.startDate || exercise.endDate) ? `${formatDate(exercise.startDate)} – ${formatDate(exercise.endDate)}` : "",
            courseName,
          ].filter(Boolean).join(" · ")}
        />
        <ExerciseView
          exercise={exercise}
          rows={ql ? exerciseCells.filter((r) => matchesQuery(r.student)) : exerciseCells}
          allCells={exerciseAllCells}
          figures={figures}
          query={query}
          setQuery={setQuery}
          tab={exTab}
          setTab={setExTab}
          statusF={statusF}
          setStatusF={setStatusF}
          sort={sort}
          setSort={setSort}
          openRow={openRow}
          setOpenRow={setOpenRow}
        />
      </Shell>
    );
  }

  // ── The whole course: exercises, or students ──
  return (
    <Shell>
      <TopBar
        onBack={() => router.back()}
        backLabel="Back"
        title="Course Insights"
        subtitle={[
          courseName,
          viewer.trainer && batchOptions.length ? batchOptions.join(", ") : "",
          studentsLabel,
          `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`,
        ].filter(Boolean).join(" · ")}
      />
      {exercises.length === 0 ? (
        <div className={CARD}><Empty text="This course has no We Do or You Do exercises with questions yet." /></div>
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-4 py-3">
            <Tabs
              value={tab}
              onChange={(v) => { setTab(v); setOpenRow(null); }}
              tabs={[
                { key: "exercises", label: "Exercises", icon: <ClipboardList size={14} />, count: activityExercises.length },
                { key: "students", label: "Students", icon: <UsersRound size={14} />, count: scopedStudents.length },
              ]}
            />
            {batchOptions.length > 1 && (
              <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Batch" className={CONTROL}>
                <option value="">All batches</option>
                {batchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
            {activityChips.length > 2 && (
              <Chips label="Activity" value={activity} onChange={setActivity} items={activityChips} />
            )}
            {tab === "students" && (
              <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
                <SearchBox value={query} onChange={setQuery} />
                <SortSelect sort={sort} setSort={setSort} marks={anyGraded} />
              </div>
            )}
          </div>
          {figures}
          {tab === "exercises" ? (
            <ExerciseList
              rows={scopeExercises.map((ex) => ({ exercise: ex, totals: sumCells(cellsOf([ex], scopedStudents)) }))}
              onOpen={(id) => { setExerciseId(id); setExTab("students"); setStatusF(""); }}
            />
          ) : (
            <StudentList
              students={scopedStudents.filter(matchesQuery)}
              exercises={scopeExercises}
              cells={cells}
              sort={sort}
              openRow={openRow}
              setOpenRow={setOpenRow}
            />
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-3 py-4 sm:px-5">{children}</div>;
}

// ─── All exercises: one line per exercise ────────────────────────────────────

function ExerciseList({ rows, onOpen }: {
  rows: { exercise: ReportExercise; totals: ReturnType<typeof sumCells> }[];
  onOpen: (exerciseId: string) => void;
}) {
  const showMarks = rows.some((r) => r.exercise.graded);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse">
        <thead className="bg-canvas">
          <tr>
            <th className={`${TH} w-10 text-right`}>#</th>
            <th className={TH}>Exercise</th>
            <th className={TH}>Activity</th>
            <th className={`${TH} text-right`}>Questions</th>
            <th className={`${TH} text-right`}>Completed</th>
            <th className={`${TH} text-right`}>Solved</th>
            <th className={`${TH} text-right`}>Correct</th>
            <th className={`${TH} text-right`}>Tests passed</th>
            {showMarks && <th className={`${TH} text-right`}>Avg marks</th>}
            <th className={`${TH} w-10`} aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={showMarks ? 10 : 9}><Empty text="No exercises in this activity." /></td></tr>
          )}
          {rows.map(({ exercise: ex, totals: t }, i) => (
            <tr key={ex.id} onClick={() => onOpen(ex.id)} title="Open to see each student" className="cursor-pointer border-t border-hairline transition-colors hover:bg-row-hover">
              <td className={`${TD_NUM} text-faint`}>{i + 1}</td>
              <td className={`${TD} max-w-[340px]`}>
                <span className="block truncate font-semibold text-heading" title={ex.name}>{ex.name}</span>
                <span className="block truncate text-xs text-faint" title={ex.location}>
                  {[ex.location, (ex.startDate || ex.endDate) ? `${formatDate(ex.startDate)} – ${formatDate(ex.endDate)}` : ""].filter(Boolean).join(" · ")}
                </span>
              </td>
              <td className={TD}>
                <span className="whitespace-nowrap">{activityOf(ex)}</span>
                <span className="block text-xs text-faint">{ex.graded ? `${round1(ex.totalMarks)} marks` : "Non-graded"}</span>
              </td>
              <td className={TD_NUM}>{ex.questionCount}</td>
              <td className={TD_NUM}><Count part={t.completed} whole={t.cells} /></td>
              <td className={TD}><Meter part={t.solved} whole={t.possible} tone="#7A5AF8" /></td>
              <td className={TD}><Meter part={t.correct} whole={t.solved} /></td>
              <td className={TD}><Meter part={t.testsPassed} whole={t.testsTotal} tone="#F79009" /></td>
              {showMarks && <td className={TD_NUM}>{ex.graded ? formatPercent(t.avgPercent) : <Dash />}</td>}
              <td className={TD}><ChevronRight size={16} className="text-faint" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── All exercises: one line per student ─────────────────────────────────────

function sortStudents<T extends { student: ReportStudent; correct: number; solved: number; testsPassed: number; testsTotal: number; marksPct: number | null }>(rows: T[], sort: StudentSort): T[] {
  const share = (a: number, b: number) => (b > 0 ? a / b : -1);
  const out = rows.slice();
  out.sort((a, b) => {
    switch (sort) {
      case "correct-desc": return b.correct - a.correct || share(b.correct, b.solved) - share(a.correct, a.solved);
      case "correct-asc": return a.correct - b.correct;
      case "tests-desc": return share(b.testsPassed, b.testsTotal) - share(a.testsPassed, a.testsTotal);
      case "marks-desc": return (b.marksPct ?? -1) - (a.marksPct ?? -1);
      default: return a.student.name.localeCompare(b.student.name, undefined, { sensitivity: "base" });
    }
  });
  return out;
}

function SortSelect({ sort, setSort, marks }: { sort: StudentSort; setSort: (s: StudentSort) => void; marks: boolean }) {
  return (
    <select value={sort} onChange={(e) => setSort(e.target.value as StudentSort)} aria-label="Sort students" className={CONTROL}>
      <option value="name">Name A–Z</option>
      <option value="correct-desc">Most correct</option>
      <option value="correct-asc">Fewest correct</option>
      <option value="tests-desc">Most tests passed</option>
      {marks && <option value="marks-desc">Highest marks</option>}
    </select>
  );
}

function StudentList({ students, exercises, cells, sort, openRow, setOpenRow }: {
  students: ReportStudent[];
  exercises: ReportExercise[];
  cells: Map<string, Cell>;
  sort: StudentSort;
  openRow: string | null;
  setOpenRow: (id: string | null) => void;
}) {
  const showMarks = exercises.some((ex) => ex.graded);
  const rows = useMemo(() => sortStudents(students.map((s) => {
    const own = exercises.filter((ex) => cells.has(cellKey(ex.id, s.id)));
    const list = own.map((ex) => ({ cell: cells.get(cellKey(ex.id, s.id))!, exercise: ex }));
    const t = sumCells(list);
    const marks = totalsFor(own, (id) => cells.get(cellKey(id, s.id))?.result);
    return { student: s, own: list, ...t, marks, marksPct: marks.percent };
  }), sort), [students, exercises, cells, sort]);
  const paged = usePaged(rows, `${students.length}|${exercises.length}|${sort}`);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse">
          <thead className="bg-canvas">
            <tr>
              <th className={`${TH} w-8`} aria-label="Expand" />
              <th className={`${TH} w-10 text-right`}>#</th>
              <th className={TH}>Reg No</th>
              <th className={TH}>Student</th>
              <th className={TH}>Batch</th>
              <th className={`${TH} text-right`}>Completed</th>
              <th className={`${TH} text-right`}>Solved</th>
              <th className={`${TH} text-right`}>Correct</th>
              <th className={`${TH} text-right`}>Tests passed</th>
              {showMarks && <th className={`${TH} text-right`}>Marks</th>}
              {showMarks && <th className={`${TH} text-right`}>Marks %</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={showMarks ? 11 : 9}><Empty text="No students match these filters." /></td></tr>}
            {paged.rows.map((r, i) => {
              const open = openRow === r.student.id;
              return (
                <React.Fragment key={r.student.id}>
                  <tr onClick={() => setOpenRow(open ? null : r.student.id)} aria-expanded={open} className="cursor-pointer border-t border-hairline transition-colors hover:bg-row-hover">
                    <td className={TD}><ChevronRight size={15} className={`text-brand-500 transition-transform ${open ? "rotate-90" : ""}`} /></td>
                    <td className={`${TD_NUM} text-faint`}>{(paged.page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className={`${TD} whitespace-nowrap`}>{r.student.regNo || <Dash />}</td>
                    <td className={`${TD} max-w-[240px]`}>
                      <span className="block truncate font-semibold text-heading" title={r.student.name}>{r.student.name}</span>
                      {r.student.email && <span className="block truncate text-xs text-faint">{r.student.email}</span>}
                    </td>
                    <td className={`${TD} max-w-[160px]`}><span className="block truncate" title={r.student.batch}>{r.student.batch || <Dash />}</span></td>
                    <td className={TD_NUM}><Count part={r.completed} whole={r.cells} /></td>
                    <td className={TD_NUM}><Count part={r.solved} whole={r.possible} /></td>
                    <td className={TD_NUM}><Count part={r.correct} whole={r.possible} /></td>
                    <td className={TD_NUM}><Count part={r.testsPassed} whole={r.testsTotal} /></td>
                    {showMarks && <td className={`${TD_NUM} font-semibold text-heading`}>{r.marks.total > 0 ? `${round1(r.marks.scored)} / ${round1(r.marks.total)}` : <Dash />}</td>}
                    {showMarks && <td className={TD_NUM}>{formatPercent(r.marks.percent)}</td>}
                  </tr>
                  {open && (
                    <tr className="bg-canvas/60">
                      <td colSpan={showMarks ? 11 : 9} className="px-3 pb-3 pt-1 sm:pl-12">
                        <StudentExercises key={r.student.id} rows={r.own} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={paged.page} pages={paged.pages} total={rows.length} onPage={paged.setPage} />
    </>
  );
}

/** One student's exercises, under their row; an exercise opens this
 *  student's answers question by question, in place. */
function StudentExercises({ rows }: { rows: { cell: Cell; exercise: ReportExercise }[] }) {
  const [openEx, setOpenEx] = useState<string | null>(null);
  if (!rows.length) return <Empty text="No exercises are set for this student here." />;
  const showMarks = rows.some((r) => r.exercise.graded);
  const cols = showMarks ? 7 : 6;
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="bg-canvas">
          <tr>
            <th className={`${TH} w-8`} aria-label="Expand" />
            <th className={TH}>Exercise</th>
            <th className={TH}>Status</th>
            <th className={`${TH} text-right`}>Solved</th>
            <th className={`${TH} text-right`}>Correct</th>
            <th className={`${TH} text-right`}>Tests passed</th>
            {showMarks && <th className={`${TH} text-right`}>Marks</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ cell, exercise: ex }) => {
            const open = openEx === ex.id;
            return (
              <React.Fragment key={ex.id}>
                <tr
                  onClick={() => setOpenEx(open ? null : ex.id)}
                  aria-expanded={open}
                  title={open ? "Hide questions" : "Show this student's questions"}
                  className="cursor-pointer border-t border-hairline transition-colors hover:bg-row-hover"
                >
                  <td className={TD}><ChevronRight size={15} className={`text-brand-500 transition-transform ${open ? "rotate-90" : ""}`} /></td>
                  <td className={`${TD} max-w-[280px]`}>
                    <span className="block truncate font-semibold text-heading" title={ex.name}>{ex.name}</span>
                    <span className="block text-xs text-faint">{activityOf(ex)}</span>
                  </td>
                  <td className={TD}><StatusChip status={cell.result.status} /></td>
                  <td className={TD_NUM}>{cell.solved} / {cell.result.totalQuestions || ex.questionCount}</td>
                  <td className={TD_NUM}>{cell.correct} / {cell.result.totalQuestions || ex.questionCount}</td>
                  <td className={TD_NUM}>{cell.testsTotal ? `${cell.testsPassed} / ${cell.testsTotal}` : <Dash />}</td>
                  {showMarks && (
                    <td className={TD_NUM}>
                      {!ex.graded ? <span className="text-xs text-faint">Non-graded</span>
                        : cell.result.status === "not-started" ? <Dash />
                          : `${round1(cell.result.scored)} / ${round1(cell.result.total)}`}
                    </td>
                  )}
                </tr>
                {open && (
                  <tr className="bg-canvas/60">
                    <td colSpan={cols} className="px-3 pb-3 pt-1 sm:pl-10">
                      <AnswerTable cell={cell} graded={ex.graded} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── One exercise ────────────────────────────────────────────────────────────

function ExerciseView({
  exercise: ex, rows, allCells, figures, query, setQuery, tab, setTab, statusF, setStatusF, sort, setSort, openRow, setOpenRow,
}: {
  exercise: ReportExercise;
  rows: { cell: Cell; exercise: ReportExercise; student: ReportStudent }[];
  allCells: Cell[];
  figures: React.ReactNode;
  query: string;
  setQuery: (q: string) => void;
  tab: "students" | "questions";
  setTab: (t: "students" | "questions") => void;
  statusF: StatusFilter;
  setStatusF: (s: StatusFilter) => void;
  sort: StudentSort;
  setSort: (s: StudentSort) => void;
  openRow: string | null;
  setOpenRow: (id: string | null) => void;
}) {
  const graded = ex.graded;
  const total = ex.questionCount;
  const questions = useMemo(() => questionInsights(ex, allCells), [ex, allCells]);
  const list = useMemo(() => sortStudents(
    rows
      .filter((r) => !statusF || r.cell.result.status === statusF)
      .map((r) => ({
        ...r,
        correct: r.cell.correct,
        solved: r.cell.solved,
        testsPassed: r.cell.testsPassed,
        testsTotal: r.cell.testsTotal,
        marksPct: graded ? r.cell.result.percent : null,
      })),
    sort,
  ), [rows, statusF, sort, graded]);
  const paged = usePaged(list, `${ex.id}|${statusF}|${sort}|${rows.length}`);
  const cols = graded ? 12 : 9;

  const counts = useMemo(() => {
    const c = { completed: 0, "in-progress": 0, "not-started": 0 } as Record<Exclude<StatusFilter, "">, number>;
    allCells.forEach((cell) => { c[cell.result.status] += 1; });
    return c;
  }, [allCells]);

  return (
    <>
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-4 py-3">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "students", label: "Students", icon: <UsersRound size={14} />, count: allCells.length },
              { key: "questions", label: "Questions", icon: <ListChecks size={14} />, count: questions.length },
            ]}
          />
          {tab === "students" && (
            <>
              <Chips
                label="Status"
                value={statusF}
                onChange={(v) => setStatusF(v as StatusFilter)}
                items={[
                  { key: "", label: "All", count: allCells.length },
                  { key: "completed", label: "Completed", count: counts.completed },
                  { key: "in-progress", label: "In progress", count: counts["in-progress"] },
                  { key: "not-started", label: "Not started", count: counts["not-started"] },
                ]}
              />
              <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
                <SearchBox value={query} onChange={setQuery} />
                <SortSelect sort={sort} setSort={setSort} marks={graded} />
              </div>
            </>
          )}
        </div>
        {figures}

        {tab === "students" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead className="bg-canvas">
                  <tr>
                    <th className={`${TH} w-8`} aria-label="Expand" />
                    <th className={`${TH} w-10 text-right`}>#</th>
                    <th className={TH}>Reg No</th>
                    <th className={TH}>Student</th>
                    <th className={TH}>Batch</th>
                    <th className={TH}>Status</th>
                    <th className={`${TH} text-right`}>Solved</th>
                    <th className={`${TH} text-right`}>Correct</th>
                    <th className={`${TH} text-right`}>Tests passed</th>
                    {/* A non-graded exercise has no marks to show. */}
                    {graded && <th className={`${TH} text-right`}>Marks</th>}
                    {graded && <th className={`${TH} text-right`}>Marks %</th>}
                    {graded && <th className={TH}>Level</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && <tr><td colSpan={cols}><Empty text="No students match these filters." /></td></tr>}
                  {paged.rows.map((r, i) => {
                    const open = openRow === r.student.id;
                    const res = r.cell.result;
                    const started = res.status !== "not-started";
                    return (
                      <React.Fragment key={r.student.id}>
                        <tr onClick={() => setOpenRow(open ? null : r.student.id)} aria-expanded={open} className="cursor-pointer border-t border-hairline transition-colors hover:bg-row-hover">
                          <td className={TD}><ChevronRight size={15} className={`text-brand-500 transition-transform ${open ? "rotate-90" : ""}`} /></td>
                          <td className={`${TD_NUM} text-faint`}>{(paged.page - 1) * PAGE_SIZE + i + 1}</td>
                          <td className={`${TD} whitespace-nowrap`}>{r.student.regNo || <Dash />}</td>
                          <td className={`${TD} max-w-[240px]`}>
                            <span className="block truncate font-semibold text-heading" title={r.student.name}>{r.student.name}</span>
                            {r.student.email && <span className="block truncate text-xs text-faint">{r.student.email}</span>}
                          </td>
                          <td className={`${TD} max-w-[160px]`}><span className="block truncate" title={r.student.batch}>{r.student.batch || <Dash />}</span></td>
                          <td className={TD}><StatusChip status={res.status} /></td>
                          <td className={TD_NUM}><Count part={r.solved} whole={res.totalQuestions || total} /></td>
                          <td className={TD_NUM}><Count part={r.correct} whole={res.totalQuestions || total} /></td>
                          <td className={TD_NUM}><Count part={r.testsPassed} whole={r.testsTotal} /></td>
                          {graded && <td className={`${TD_NUM} font-semibold text-heading`}>{started ? `${round1(res.scored)} / ${round1(res.total)}` : `— / ${round1(res.total)}`}</td>}
                          {graded && <td className={TD_NUM}>{formatPercent(res.percent)}</td>}
                          {graded && <td className={TD}>{res.scale || <Dash />}</td>}
                        </tr>
                        {open && (
                          <tr className="bg-canvas/60">
                            <td colSpan={cols} className="px-3 pb-3 pt-1 sm:pl-12">
                              <AnswerTable cell={r.cell} graded={graded} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager page={paged.page} pages={paged.pages} total={list.length} onPage={paged.setPage} />
          </>
        ) : (
          <QuestionList rows={questions} graded={graded} />
        )}
      </div>
    </>
  );
}

/** One student's answers in one exercise, question by question. */
function AnswerTable({ cell, graded }: { cell: Cell; graded: boolean }) {
  if (!cell.questions.length) return <Empty text="Not started — no answers yet." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
      <table className="w-full min-w-[640px] border-collapse">
        <thead className="bg-canvas">
          <tr>
            <th className={`${TH} w-12 text-right`}>Q.</th>
            <th className={TH}>Question</th>
            <th className={TH}>Status</th>
            <th className={`${TH} text-center`}>Correct</th>
            <th className={`${TH} text-right`}>Tests passed</th>
            {graded && <th className={`${TH} text-right`}>Marks</th>}
          </tr>
        </thead>
        <tbody>
          {cell.questions.map((q) => {
            const answered = q.status === "submitted" || q.status === "evaluated";
            return (
              <tr key={q.questionId} className="border-t border-hairline">
                <td className={`${TD_NUM} text-faint`}>{q.no}</td>
                <td className={`${TD} max-w-[380px]`}><span className="line-clamp-2" title={q.title}>{q.title}</span></td>
                <td className={TD}>{QUESTION_STATUS_LABEL[q.status]}</td>
                <td className={`${TD} text-center`}>{answered ? <span className="inline-flex"><Correctness ok={q.correct} /></span> : <Dash />}</td>
                <td className={TD_NUM}>{q.testsTotal ? `${q.testsPassed} / ${q.testsTotal}` : <Dash />}</td>
                {graded && <td className={TD_NUM}>{answered ? `${round1(q.scored)} / ${round1(q.max)}` : `— / ${round1(q.max)}`}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Each question across the class — which ones students find hard. */
function QuestionList({ rows, graded }: { rows: ReturnType<typeof questionInsights>; graded: boolean }) {
  if (!rows.length) return <Empty text="This exercise has no questions." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <thead className="bg-canvas">
          <tr>
            <th className={`${TH} w-12 text-right`}>Q.</th>
            <th className={TH}>Question</th>
            <th className={TH}>Difficulty</th>
            <th className={`${TH} text-right`}>Answered</th>
            <th className={`${TH} text-right`}>Correct</th>
            <th className={`${TH} text-right`}>Tests passed</th>
            {graded && <th className={`${TH} text-right`}>Avg marks</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.questionId} className="border-t border-hairline">
              <td className={`${TD_NUM} text-faint`}>{q.no}</td>
              <td className={`${TD} max-w-[420px]`}><span className="line-clamp-2 font-medium text-heading" title={q.title}>{q.title}</span></td>
              <td className={TD}>{q.difficulty || <Dash />}</td>
              <td className={TD_NUM}><Count part={q.answered} whole={q.students} /></td>
              <td className={TD}><Meter part={q.correct} whole={q.answered} /></td>
              <td className={TD}><Meter part={q.testsPassed} whole={q.testsTotal} tone="#F79009" /></td>
              {graded && <td className={TD_NUM}>{q.avgMarks == null ? <Dash /> : `${q.avgMarks} / ${round1(q.max)}`}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
