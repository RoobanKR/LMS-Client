"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, ChevronRight, ClipboardList, FlaskConical, ListChecks,
  RotateCcw, Search, Trophy, UsersRound, X, XCircle,
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
import { Dash, StatusChip, TD, TD_NUM, TH } from "@/app/lms/pages/courses/courseReport/ReportUi";
import { buildCells, cellKey, pct, questionInsights, sumCells, type Cell } from "./insightsData";

// ─── Course Insights ─────────────────────────────────────────────────────────
//
// What the course's We Do / You Do work looks like, from the answers students
// stored: how many questions they solved, how many were fully right, how many
// test cases passed, and — for graded exercises only — the marks.
//
//   [header]   course · batches · students · exercises
//   [filters]  Batch · Activity · Exercise · Search
//   [tiles]    the figures for whatever the filters select
//   [lists]    All exercises: Exercises | Students
//              One exercise:  Students (per question on expand) | Questions
//
// Built on the Course Report's payload and marks functions, so a figure here
// is the figure the report prints.

const SECTION_LABEL: Record<Section, string> = { We_Do: "We Do", You_Do: "You Do" };

const CARD = "rounded-xl border border-hairline bg-surface shadow-xs";
const CONTROL = "h-9 rounded-control border border-hairline-strong bg-surface px-2.5 text-xs text-body focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";
const PAGE_SIZE = 50;

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

function Tile({ icon: Icon, label, value, hint, color, bg }: {
  icon: typeof UsersRound; label: string; value: React.ReactNode; hint?: string; color: string; bg: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-hairline bg-surface px-3.5 py-3 shadow-xs">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: bg, color }}>
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <div className="text-2xs font-semibold uppercase tracking-wide text-subtle">{label}</div>
        <div className="mt-0.5 text-lg font-bold leading-tight text-heading tabular-nums">{value}</div>
        {hint && <div className="mt-0.5 truncate text-2xs text-faint" title={hint}>{hint}</div>}
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
      <div className="text-right text-xs font-semibold tabular-nums text-heading">{p}%</div>
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
      <div className="text-xs font-semibold text-heading">{part} / {whole}</div>
      <div className="text-2xs text-faint">{pct(part, whole)}</div>
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
          className={`inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-medium transition-colors ${
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
    <span className="relative min-w-[200px] flex-1 sm:max-w-[300px]">
      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search student — name, email or reg no"
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
  // The chosen exercise's students — every one (tiles, question insight) and
  // those the search leaves.
  const exerciseCells = useMemo(
    () => (exercise ? cellsOf([exercise], scopedStudents) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercise, scopedStudents, cells],
  );
  const exerciseAllCells = useMemo(() => exerciseCells.map((r) => r.cell), [exerciseCells]);
  const anyGraded = scopeExercises.some((ex) => ex.graded);
  // The search box clears itself (✕); Clear is for the filters above.
  const filtered = Boolean(batch || activity || exerciseId);
  const clearFilters = () => { setBatch(""); setActivity(""); setExerciseId(""); setQuery(""); setStatusF(""); };

  // ── States ──
  if (!courseId) return <Shell><Empty text="No course selected." /></Shell>;
  if (isLoading || !viewer) {
    return (
      <Shell>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[74px] animate-pulse rounded-xl bg-canvas" />)}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-canvas" />
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

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => (exercise ? setExerciseId("") : router.back())}
          title={exercise ? "Back to all exercises" : "Back"}
          aria-label={exercise ? "Back to all exercises" : "Back"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-hairline-strong bg-surface text-subtle transition-colors hover:bg-row-hover hover:text-heading"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold leading-tight tracking-[-0.01em] text-heading">Course Insights</h1>
          <p className="truncate text-xs text-subtle" title={courseName}>
            {[
              courseName,
              viewer.trainer && batchOptions.length ? batchOptions.join(", ") : "",
              `${students.length} student${students.length === 1 ? "" : "s"}`,
              `${exercises.length} exercise${exercises.length === 1 ? "" : "s"}`,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {!exercise && (
        <Tabs
          value={tab}
          onChange={(t) => { setTab(t); setOpenRow(null); }}
          tabs={[
            { key: "exercises", label: "Exercises", icon: <ClipboardList size={13} />, count: activityExercises.length },
            { key: "students", label: "Students", icon: <UsersRound size={13} />, count: scopedStudents.length },
          ]}
        />
      )}
    </div>
  );

  const filters = (
    <div className={`${CARD} flex flex-wrap items-end gap-3 px-3 py-2.5`}>
      {batchOptions.length > 1 && (
        <label className="flex min-w-[150px] flex-1 flex-col gap-1 sm:max-w-[220px]">
          <span className="text-2xs font-semibold uppercase tracking-wider text-subtle">Batch</span>
          <select value={batch} onChange={(e) => setBatch(e.target.value)} className={CONTROL}>
            <option value="">All batches</option>
            {batchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      )}
      <label className="flex min-w-[170px] flex-1 flex-col gap-1 sm:max-w-[240px]">
        <span className="text-2xs font-semibold uppercase tracking-wider text-subtle">Activity</span>
        <select value={activity} onChange={(e) => setActivity(e.target.value)} className={CONTROL}>
          <option value="">All activities</option>
          {activityGroups.map((g) => (
            <optgroup key={g.section} label={SECTION_LABEL[g.section]}>
              <option value={g.section}>All {SECTION_LABEL[g.section]}</option>
              {g.subs.map(([key, label]) => <option key={key} value={`${g.section}|${key}`}>{label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="flex min-w-[220px] flex-[2_1_260px] flex-col gap-1">
        <span className="text-2xs font-semibold uppercase tracking-wider text-subtle">Exercise</span>
        <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)} className={CONTROL}>
          <option value="">All exercises ({activityExercises.length})</option>
          {activityExercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}{activity ? "" : ` — ${activityOf(ex)}`}</option>
          ))}
        </select>
      </label>
      {filtered && (
        <button type="button" onClick={clearFilters} className="inline-flex h-9 items-center gap-1 rounded-control px-2 text-xs font-medium text-subtle hover:bg-row-hover hover:text-heading">
          <RotateCcw size={12} /> Clear
        </button>
      )}
    </div>
  );

  // The figures for the current selection.
  const t = scopeTotals;
  const tiles = (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${anyGraded ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
      <Tile icon={UsersRound} color="#475467" bg="#F2F4F7" label="Students" value={scopedStudents.length}
        hint={exercise ? `${t.completed} completed · ${t.inProgress} in progress` : `${scopeExercises.length} exercise${scopeExercises.length === 1 ? "" : "s"}`} />
      <Tile icon={ClipboardList} color="#175CD3" bg="#EFF8FF" label="Completed" value={pct(t.completed, t.cells)}
        hint={`${t.completed} of ${t.cells} ${exercise ? "students" : "attempts"}`} />
      <Tile icon={ListChecks} color="#6941C6" bg="#F4F3FF" label="Questions solved" value={pct(t.solved, t.possible)}
        hint={`${t.solved} of ${t.possible} answers`} />
      <Tile icon={CheckCircle2} color="#067647" bg="#ECFDF3" label="Correct" value={pct(t.correct, t.solved)}
        hint={`${t.correct} fully correct of ${t.solved} solved`} />
      <Tile icon={FlaskConical} color="#B54708" bg="#FFFAEB" label="Test cases passed" value={pct(t.testsPassed, t.testsTotal)}
        hint={t.testsTotal ? `${t.testsPassed} of ${t.testsTotal} tests` : "no test cases"} />
      {anyGraded && (
        <Tile icon={Trophy} color="#C4320A" bg="#FFF4ED" label="Average marks" value={formatPercent(t.avgPercent)}
          hint="over completed, graded attempts" />
      )}
    </div>
  );

  return (
    <Shell>
      {header}
      {filters}
      {exercise ? (
        <ExerciseView
          exercise={exercise}
          rows={ql ? exerciseCells.filter((r) => matchesQuery(r.student)) : exerciseCells}
          allCells={exerciseAllCells}
          tiles={tiles}
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
      ) : (
        <>
          {tiles}
          {exercises.length === 0 ? (
            <div className={CARD}><Empty text="This course has no We Do or You Do exercises with questions yet." /></div>
          ) : tab === "exercises" ? (
            <ExerciseList
              rows={scopeExercises.map((ex) => ({ exercise: ex, totals: sumCells(cellsOf([ex], scopedStudents)) }))}
              onOpen={(id) => { setExerciseId(id); setExTab("students"); }}
            />
          ) : (
            <StudentList
              students={scopedStudents.filter(matchesQuery)}
              query={query}
              setQuery={setQuery}
              exercises={scopeExercises}
              cells={cells}
              sort={sort}
              setSort={setSort}
              openRow={openRow}
              setOpenRow={setOpenRow}
              onOpenExercise={(id) => { setExerciseId(id); setExTab("students"); }}
            />
          )}
        </>
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
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
        <span className="text-xs text-subtle">{rows.length} exercise{rows.length === 1 ? "" : "s"} · open one to see each student</span>
      </div>
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
              <tr><td colSpan={showMarks ? 10 : 9}><Empty text="No exercises match these filters." /></td></tr>
            )}
            {rows.map(({ exercise: ex, totals: t }, i) => (
              <tr key={ex.id} onClick={() => onOpen(ex.id)} className="cursor-pointer border-t border-hairline transition-colors hover:bg-row-hover">
                <td className={`${TD_NUM} text-faint`}>{i + 1}</td>
                <td className={`${TD} max-w-[320px]`}>
                  <span className="block truncate font-semibold text-heading" title={ex.name}>{ex.name}</span>
                  <span className="block truncate text-2xs text-faint" title={ex.location}>
                    {[ex.location, (ex.startDate || ex.endDate) ? `${formatDate(ex.startDate)} – ${formatDate(ex.endDate)}` : ""].filter(Boolean).join(" · ")}
                  </span>
                </td>
                <td className={TD}>
                  <span className="whitespace-nowrap">{activityOf(ex)}</span>
                  <span className="block text-2xs text-faint">{ex.graded ? `${round1(ex.totalMarks)} marks` : "Non-graded"}</span>
                </td>
                <td className={TD_NUM}>{ex.questionCount}</td>
                <td className={TD_NUM}><Count part={t.completed} whole={t.cells} /></td>
                <td className={TD}><Meter part={t.solved} whole={t.possible} tone="#7A5AF8" /></td>
                <td className={TD}><Meter part={t.correct} whole={t.solved} /></td>
                <td className={TD}><Meter part={t.testsPassed} whole={t.testsTotal} tone="#F79009" /></td>
                {showMarks && <td className={TD_NUM}>{ex.graded ? formatPercent(t.avgPercent) : <span className="text-2xs text-faint">—</span>}</td>}
                <td className={TD}><ChevronRight size={15} className="text-faint" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      <option value="name">Sort: Name A–Z</option>
      <option value="correct-desc">Sort: Most correct</option>
      <option value="correct-asc">Sort: Fewest correct</option>
      <option value="tests-desc">Sort: Most tests passed</option>
      {marks && <option value="marks-desc">Sort: Highest marks</option>}
    </select>
  );
}

function StudentList({ students, query, setQuery, exercises, cells, sort, setSort, openRow, setOpenRow, onOpenExercise }: {
  students: ReportStudent[];
  query: string;
  setQuery: (q: string) => void;
  exercises: ReportExercise[];
  cells: Map<string, Cell>;
  sort: StudentSort;
  setSort: (s: StudentSort) => void;
  openRow: string | null;
  setOpenRow: (id: string | null) => void;
  onOpenExercise: (exerciseId: string) => void;
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
    <div className={`${CARD} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          <SearchBox value={query} onChange={setQuery} />
          <span className="text-xs text-subtle">{rows.length} student{rows.length === 1 ? "" : "s"} · across {exercises.length} exercise{exercises.length === 1 ? "" : "s"}</span>
        </div>
        <SortSelect sort={sort} setSort={setSort} marks={showMarks} />
      </div>
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
                      {r.student.email && <span className="block truncate text-2xs text-faint">{r.student.email}</span>}
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
                        <StudentExercises rows={r.own} onOpenExercise={onOpenExercise} />
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
    </div>
  );
}

/** One student's exercises, under their row. */
function StudentExercises({ rows, onOpenExercise }: { rows: { cell: Cell; exercise: ReportExercise }[]; onOpenExercise: (id: string) => void }) {
  if (!rows.length) return <Empty text="No exercises are set for this student here." />;
  const showMarks = rows.some((r) => r.exercise.graded);
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
      <table className="w-full min-w-[720px] border-collapse">
        <thead className="bg-canvas">
          <tr>
            <th className={TH}>Exercise</th>
            <th className={TH}>Status</th>
            <th className={`${TH} text-right`}>Solved</th>
            <th className={`${TH} text-right`}>Correct</th>
            <th className={`${TH} text-right`}>Tests passed</th>
            {showMarks && <th className={`${TH} text-right`}>Marks</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ cell, exercise: ex }) => (
            <tr key={ex.id} className="border-t border-hairline">
              <td className={`${TD} max-w-[280px]`}>
                <button type="button" onClick={() => onOpenExercise(ex.id)} className="block max-w-full truncate text-left font-semibold text-heading hover:text-brand-strong hover:underline" title={`Open ${ex.name}`}>
                  {ex.name}
                </button>
                <span className="block text-2xs text-faint">{activityOf(ex)}</span>
              </td>
              <td className={TD}><StatusChip status={cell.result.status} /></td>
              <td className={TD_NUM}>{cell.solved} / {cell.result.totalQuestions || ex.questionCount}</td>
              <td className={TD_NUM}>{cell.correct} / {cell.result.totalQuestions || ex.questionCount}</td>
              <td className={TD_NUM}>{cell.testsTotal ? `${cell.testsPassed} / ${cell.testsTotal}` : <Dash />}</td>
              {showMarks && (
                <td className={TD_NUM}>
                  {!ex.graded ? <span className="text-2xs text-faint">Non-graded</span>
                    : cell.result.status === "not-started" ? <Dash />
                      : `${round1(cell.result.scored)} / ${round1(cell.result.total)}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── One exercise ────────────────────────────────────────────────────────────

function ExerciseView({
  exercise: ex, rows, allCells, tiles, query, setQuery, tab, setTab, statusF, setStatusF, sort, setSort, openRow, setOpenRow,
}: {
  exercise: ReportExercise;
  rows: { cell: Cell; exercise: ReportExercise; student: ReportStudent }[];
  allCells: Cell[];
  tiles: React.ReactNode;
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

  return (
    <>
      <div className={`${CARD} px-4 py-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-heading" title={ex.name}>{ex.name}</h2>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-2xs font-medium text-subtle">{activityOf(ex)}</span>
          <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${graded ? "bg-[#FFF4ED] text-[#C4320A]" : "bg-[#F2F4F7] text-[#475467]"}`}>
            {graded ? `Graded · ${round1(ex.totalMarks)} marks` : "Non-graded"}
          </span>
        </div>
        <p className="mt-0.5 text-2xs text-faint">
          {[ex.location, `${total} question${total === 1 ? "" : "s"}`,
            (ex.startDate || ex.endDate) ? `${formatDate(ex.startDate)} – ${formatDate(ex.endDate)}` : ""].filter(Boolean).join(" · ")}
        </p>
      </div>
      {tiles}
      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-3 py-2">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { key: "students", label: "Students", icon: <UsersRound size={13} />, count: rows.length },
              { key: "questions", label: "Questions", icon: <ListChecks size={13} />, count: questions.length },
            ]}
          />
          {tab === "students" && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
              <SearchBox value={query} onChange={setQuery} />
              <select value={statusF} onChange={(e) => setStatusF(e.target.value as StatusFilter)} aria-label="Filter by status" className={CONTROL}>
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In progress</option>
                <option value="not-started">Not started</option>
              </select>
              <SortSelect sort={sort} setSort={setSort} marks={graded} />
            </div>
          )}
        </div>

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
                            {r.student.email && <span className="block truncate text-2xs text-faint">{r.student.email}</span>}
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
