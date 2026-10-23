"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, ChevronRight, ClipboardList, Eye, FileText, Info, Loader2, RotateCcw,
  Search, SearchX, UsersRound, X,
} from "lucide-react";
import { MappingMultiFilter } from "@/app/lms/pages/servicemapping/components/MappingReportFilters";
import {
  NextStepGlow, REPORT_FIELD, REPORT_PRIMARY_BTN, ReportEmptyState, ReportShowingRow, chipLabel,
  useNextStepNudge, type ReportChip,
} from "@/app/lms/shared/report/reportKit";
import { phaseOrdinal } from "@/lib/phaseGroups";
import { PrintPreviewModal } from "@/app/lms/pages/businessreports/components/PrintPreviewModal";
import type { ServiceMapping } from "@/app/lms/pages/servicemapping/api/serviceMappingService";
import type { ReportClientBlock } from "@/app/lms/pages/servicemapping/components/serviceReport";
import {
  appliesTo, batchLabel, collectExercises, collectStudents, formatDate, formatMarks, formatPercent, questionsFor,
  resultFor, round1, totalsFor,
  type ActivityType, type QuestionRow, type ReportExercise, type ReportStudent, type StudentResult,
} from "./reportData";
import { fetchReportPayload, liveBatches } from "./reportApi";
import {
  exerciseBlocks, exerciseListBlocks, LAYOUT_FIELDS, studentBlocks,
  type PrintLayout, type PrintSources,
} from "./courseReportPrint";
import { usePrintSetup } from "./usePrintSetup";
import {
  Checkbox, Dash, PrintMenu, QuestionTable, SelectField, Stat, StatusChip, TD, TD_NUM, TH, TypeChip,
} from "./ReportUi";

// ─── Course Report ──────────────────────────────────────────────────────────
//
// Opened from Course Actions ▸ Report. Two readings of the same results:
//
//   By Exercise  E1 every assignment + assessment in the course
//                E2 ▸ View: the students of one exercise (tick to print)
//                E3 ▸ View on a student: their questions in that exercise
//   By Student   S1 every student with totals across the filtered exercises
//                S2 ▸ View: one student's every exercise, each expandable to
//                   its questions
//
// Read-only on purpose — grading, retests and live monitoring stay on the Live
// Dashboard. Every figure comes from reportData.ts, which reuses the Live
// Dashboard's own marks functions.

type Tab = "exercise" | "student";

// The report's picks. Like Business Reports, they are a draft until
// Generate Report applies them; empty means "all".
interface Draft {
  phases: string[];
  batches: string[];
  activities: string[];
  subcategories: string[];
  exerciseIds: string[];
}
const EMPTY_DRAFT: Draft = { phases: [], batches: [], activities: [], subcategories: [], exerciseIds: [] };
type ChipKey = keyof Draft;

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  Assignment: "Assignment (We Do)",
  Assessment: "Assessment (You Do)",
};

const EMPTY_RESULT: StudentResult = {
  status: "not-started", scored: 0, total: 0, percent: null, scale: "", attempted: 0, totalQuestions: 0,
};

interface PrintJob {
  layout: PrintLayout;
  blocks: ReportClientBlock[];
  /** Short on purpose — the default letterhead sets the title beside the
   *  scope line, so a long one runs into it. What the sheet is about goes
   *  in `subject`, which prints on the full-width line below. */
  title: string;
  /** "Exercise: … · Student: …" — empty for a whole-roster print. */
  subject: string;
  /** One exercise's sheet: the Activity / Subcategory filters do not apply. */
  byExercise: boolean;
  fileBase: string;
  /** Extra words for the sheet's "Filtered by" line (e.g. who was ticked). */
  scopeNote: string;
  /** Set when printing from the student drawer. The print modal sits on a
   *  lower layer than the drawer, so the drawer steps aside while it is open
   *  and comes back when it closes. */
  reopenDrawer?: { exerciseId: string; studentId: string };
}

const matches = (q: string, ...fields: (string | undefined)[]) =>
  !q || fields.some((f) => (f || "").toLowerCase().includes(q));

const fileSafe = (s: string) => s.replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");

export default function CourseReport() {
  const router = useRouter();
  const params = useSearchParams();
  const courseId = params.get("courseId") || "";
  const returnTo = params.get("returnTo") || "";

  // ── Where the reader is — mirrored into the URL so a refresh (or coming
  //    back from another page) reopens the same view. ──
  const [tab, setTab] = useState<Tab>(params.get("view") === "student" ? "student" : "exercise");
  const [exerciseId, setExerciseId] = useState(params.get("exerciseId") || "");
  const [studentId, setStudentId] = useState(params.get("studentId") || "");
  const [drawer, setDrawer] = useState<{ exerciseId: string; studentId: string } | null>(null);

  // Nothing is listed until Generate Report. Opening a link straight to one
  // exercise or student (a refresh on that screen) reports on everything.
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [applied, setApplied] = useState<{ draft: Draft; generated: string } | null>(() =>
    params.get("exerciseId") || params.get("studentId") ? { draft: EMPTY_DRAFT, generated: new Date().toLocaleString() } : null);
  const nudge = useNextStepNudge(draft);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [printJob, setPrintJob] = useState<PrintJob | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", tab);
    if (tab === "exercise" && exerciseId) url.searchParams.set("exerciseId", exerciseId);
    else url.searchParams.delete("exerciseId");
    if (tab === "student" && studentId) url.searchParams.set("studentId", studentId);
    else url.searchParams.delete("studentId");
    window.history.replaceState(window.history.state, "", url.toString());
  }, [tab, exerciseId, studentId]);

  // A new screen starts with nothing ticked, nothing searched, nothing open.
  const screenKey = `${tab}|${tab === "exercise" ? exerciseId : studentId}`;
  const lastScreen = useRef(screenKey);
  useEffect(() => {
    if (lastScreen.current === screenKey) return;
    lastScreen.current = screenKey;
    setSelected(new Set());
    setExpanded(new Set());
    setSearch("");
  }, [screenKey]);

  // ── Data: the Live Dashboard's payload (roster + answers), plus each
  //    batch's own exercises when the course keeps different material per
  //    batch — see reportApi.ts. ──
  const { data: payload, isLoading, isError } = useQuery({
    queryKey: ["courseReport", "payload", courseId],
    queryFn: () => fetchReportPayload(courseId),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });
  const courseData = payload?.course ?? null;
  const courseName: string = courseData?.courseName || "Course";

  const exercises = useMemo(() => (payload ? collectExercises(payload.views) : []), [payload]);
  const students = useMemo(() => collectStudents(courseData), [courseData]);

  // Every student in every exercise set for their batch, computed once per
  // payload. Filters and views only read from it; a pair that is not in it
  // is an exercise the student's batch does not have.
  const results = useMemo(() => {
    const byExercise = new Map<string, Map<string, StudentResult>>();
    for (const ex of exercises) {
      const row = new Map<string, StudentResult>();
      for (const s of students) if (appliesTo(ex, s)) row.set(s.id, resultFor(courseId, ex, s));
      byExercise.set(ex.id, row);
    }
    return byExercise;
  }, [exercises, students, courseId]);

  const resultOf = useCallback(
    (exId: string, stId: string) => results.get(exId)?.get(stId) ?? EMPTY_RESULT,
    [results],
  );


  // Questions are only needed when a row is opened or printed, so they are
  // built on demand and kept for the life of the payload.
  const questionCache = useRef(new Map<string, QuestionRow[]>());
  useEffect(() => { questionCache.current = new Map(); }, [courseData]);
  const questionsOf = useCallback((ex: ReportExercise, s: ReportStudent) => {
    const key = `${ex.id}|${s.id}`;
    const hit = questionCache.current.get(key);
    if (hit) return hit;
    const rows = questionsFor(courseId, ex, s, resultOf(ex.id, s.id));
    questionCache.current.set(key, rows);
    return rows;
  }, [courseId, resultOf]);

  // ── Filters ──
  // Every option list is read off the course's own exercises, and each one
  // narrows by the others: a course with no assessments offers no
  // "Assessment", and picking a batch offers only what that batch was set.
  const batchOptions = useMemo(() => {
    const withStudents = new Set(students.flatMap((s) => s.batchIds));
    return liveBatches(courseData)
      .filter((b) => withStudents.has(String(b._id)))
      .map((b) => ({ value: String(b._id), label: batchLabel(b) || "Batch" }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [courseData, students]);
  const batchNameById = useMemo(() => new Map(batchOptions.map((o) => [o.value, o.label])), [batchOptions]);

  // ── Phases — "the students of Phase III": a batch belongs to its phase,
  //    an exercise to its module's. A module saved before phases existed
  //    ("") counts as the first phase, as the course sidebars show it. ──
  const batchPhaseById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of liveBatches(courseData)) m.set(String(b._id), String(b.phase || "").trim());
    return m;
  }, [courseData]);
  const phaseNames = useMemo(() => {
    const names = new Set<string>([
      ...((courseData?.phaseNames || []) as unknown[]).map((p) => String(p || "").trim()),
      ...batchPhaseById.values(),
      ...exercises.map((ex) => ex.phase),
    ].filter(Boolean));
    return [...names].sort((a, b) => phaseOrdinal(a) - phaseOrdinal(b) || a.localeCompare(b));
  }, [courseData, batchPhaseById, exercises]);
  const phaseOptions = useMemo(() => phaseNames.map((p) => ({ value: p, label: p })), [phaseNames]);
  const phaseOfBatch = useCallback((id: string) => batchPhaseById.get(id) || phaseNames[0] || "", [batchPhaseById, phaseNames]);
  const phaseOfExercise = useCallback((ex: ReportExercise) => ex.phase || phaseNames[0] || "", [phaseNames]);
  /** Each batch's phase and its own name, for the student list's columns. */
  const batchMeta = useMemo(() => {
    const m = new Map<string, { phase: string; name: string }>();
    for (const b of liveBatches(courseData)) {
      const id = String(b._id);
      m.set(id, { phase: phaseOfBatch(id), name: String(b.batchName || "").trim() || batchLabel(b) || "Batch" });
    }
    return m;
  }, [courseData, phaseOfBatch]);

  /** The batches a set of picks covers; [] = every batch. */
  const batchesFor = useCallback(
    (d: Draft) => (d.batches.length
      ? d.batches
      : d.phases.length ? batchOptions.filter((b) => d.phases.includes(phaseOfBatch(b.value))).map((b) => b.value) : []),
    [batchOptions, phaseOfBatch],
  );
  /** Phase + batch scope of an exercise. */
  const inScope = useCallback((ex: ReportExercise, d: Draft) => {
    const batches = batchesFor(d);
    return (!d.phases.length || d.phases.includes(phaseOfExercise(ex)))
      && (!batches.length || !ex.batchIds || batches.some((b) => ex.batchIds!.has(b)));
  }, [batchesFor, phaseOfExercise]);

  // Options for the filter menus, each narrowed by the other picks.
  const draftBatchOptions = useMemo(
    () => (draft.phases.length ? batchOptions.filter((b) => draft.phases.includes(phaseOfBatch(b.value))) : batchOptions),
    [draft.phases, batchOptions, phaseOfBatch],
  );
  const activityOptions = useMemo(() => {
    const present = new Set(exercises
      .filter((ex) => inScope(ex, draft) && (!draft.subcategories.length || draft.subcategories.includes(ex.subcategoryKey)))
      .map((ex) => ex.type));
    return (Object.keys(ACTIVITY_LABEL) as ActivityType[])
      .filter((t) => present.has(t))
      .map((t) => ({ value: t, label: ACTIVITY_LABEL[t] }));
  }, [exercises, inScope, draft]);
  const subcategoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const ex of exercises) {
      if (!inScope(ex, draft) || (draft.activities.length && !draft.activities.includes(ex.type))) continue;
      if (!seen.has(ex.subcategoryKey)) seen.set(ex.subcategoryKey, ex.subcategory);
    }
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [exercises, inScope, draft]);
  const exerciseOptions = useMemo(
    () => exercises
      .filter((ex) => inScope(ex, draft)
        && (!draft.activities.length || draft.activities.includes(ex.type))
        && (!draft.subcategories.length || draft.subcategories.includes(ex.subcategoryKey)))
      .map((ex) => ({ value: ex.id, label: ex.name })),
    [exercises, inScope, draft],
  );

  // Subcategory only says something when an activity has more than one —
  // otherwise it repeats Type, so its filter and columns stay hidden.
  const showSubcategory = useMemo(() => {
    const byType = new Map<string, Set<string>>();
    for (const ex of exercises) {
      if (!byType.has(ex.type)) byType.set(ex.type, new Set());
      byType.get(ex.type)!.add(ex.subcategoryKey);
    }
    return [...byType.values()].some((keys) => keys.size > 1);
  }, [exercises]);

  // ── What was generated ──
  const filteredExercises = useMemo(() => {
    if (!applied) return [];
    const d = applied.draft;
    return exercises.filter((ex) => inScope(ex, d)
      && (!d.activities.length || d.activities.includes(ex.type))
      && (!d.subcategories.length || d.subcategories.includes(ex.subcategoryKey))
      && (!d.exerciseIds.length || d.exerciseIds.includes(ex.id)));
  }, [applied, exercises, inScope]);
  const appliedBatches = useMemo(() => (applied ? batchesFor(applied.draft) : []), [applied, batchesFor]);
  const roster = useMemo(
    () => (!applied ? [] : appliedBatches.length ? students.filter((s) => s.batchIds.some((id) => appliedBatches.includes(id))) : students),
    [applied, appliedBatches, students],
  );
  const batchName = appliedBatches.map((id) => batchNameById.get(id)).filter(Boolean).join(", ");

  const setPick = (key: ChipKey, value: string[]) => setDraft((d) => ({ ...d, [key]: value }));
  const draftTouched = Object.values(draft).some((v) => v.length > 0);
  const generate = (from: Draft = draft) => {
    setApplied({ draft: from, generated: new Date().toLocaleString() });
    setSelected(new Set());
    nudge.markGenerated(from);
  };
  const resetReport = () => {
    setDraft(EMPTY_DRAFT);
    setApplied(null);
    setSearch("");
    setSelected(new Set());
    nudge.clear();
  };

  // "Showing:" — one chip per filter; × drops it and regenerates.
  const optionLabels = (values: string[], options: { value: string; label: string }[]) =>
    values.map((v) => options.find((o) => o.value === v)?.label || v);
  const chips: ReportChip<ChipKey>[] = applied ? ([
    ...(phaseOptions.length ? [{ key: "phases" as const, title: "Phase", all: "All phases", options: phaseOptions }] : []),
    { key: "batches" as const, title: "Batch", all: "All batches", options: batchOptions },
    { key: "activities" as const, title: "Activity", all: "All activities", options: (Object.keys(ACTIVITY_LABEL) as ActivityType[]).map((t) => ({ value: t, label: ACTIVITY_LABEL[t] })) },
    ...(showSubcategory ? [{ key: "subcategories" as const, title: "Subcategory", all: "All subcategories", options: exercises.map((e) => ({ value: e.subcategoryKey, label: e.subcategory })) }] : []),
    { key: "exerciseIds" as const, title: "Exercises", all: "All exercises", options: exercises.map((e) => ({ value: e.id, label: e.name })) },
  ]).map((c) => {
    const values = applied.draft[c.key];
    return { key: c.key, title: c.title, label: chipLabel(optionLabels(values, c.options), values.length > 0, c.all), narrowed: values.length > 0 };
  }) : [];
  const removeChip = (key: ChipKey) => {
    const next = { ...draft, [key]: [] };
    setDraft(next);
    generate(next);
  };

  /** The roster students an exercise is set for. */
  const rosterFor = useCallback(
    (ex: ReportExercise) => roster.filter((s) => appliesTo(ex, s)),
    [roster],
  );

  const totalsOf = useCallback(
    (s: ReportStudent) => totalsFor(filteredExercises, (exId) => results.get(exId)?.get(s.id)),
    [filteredExercises, results],
  );

  const printSources: PrintSources = useMemo(
    () => ({ resultOf, questionsOf, totalsOf, appliesTo }),
    [resultOf, questionsOf, totalsOf],
  );
  const printFields = useMemo(() => {
    if (!printJob) return undefined;
    const { fields } = LAYOUT_FIELDS[printJob.layout];
    return showSubcategory ? fields : fields.filter((f) => f.key !== "subcategory");
  }, [printJob, showSubcategory]);

  const q = search.trim().toLowerCase();
  const currentExercise = tab === "exercise" && exerciseId ? exercises.find((e) => e.id === exerciseId) || null : null;
  const currentStudent = tab === "student" && studentId ? students.find((s) => s.id === studentId) || null : null;

  // ── Print ──
  const { letterhead, initialFormat } = usePrintSetup();
  // The full-width line under the title: what the sheet is about, then what
  // it was narrowed by.
  const filterWords = (job: PrintJob) => {
    const parts = [
      // One exercise's sheet: only who it covers (phase / batch) applies.
      ...chips
        .filter((c) => c.narrowed && (!job.byExercise || c.key === "phases" || c.key === "batches"))
        .map((c) => `${c.title}: ${c.label}`),
      job.scopeNote,
    ].filter(Boolean);
    return [job.subject, parts.length ? `Filtered by  ·  ${parts.join("  ·  ")}` : ""].filter(Boolean).join("  ·  ");
  };
  const printMeta = useMemo(() => ({
    title: printJob?.title || "Course Report",
    scope: [courseName, batchName || "All batches"].join(" · "),
    generated: new Date().toLocaleString(),
    filters: printJob ? filterWords(printJob) : "",
    ...letterhead,
  }), [printJob, courseName, batchName, letterhead]); // eslint-disable-line react-hooks/exhaustive-deps
  const printSnapshot = useMemo(
    () => ({ draft: {}, rows: [] as ServiceMapping[], generated: printMeta.generated }),
    [printMeta.generated],
  );

  const pickedOr = <T extends { id: string }>(rows: T[]) => {
    const picked = rows.filter((r) => selected.has(r.id));
    return picked.length ? picked : rows;
  };
  const scopeNote = (count: number, total: number, noun: string) =>
    count && count < total ? `${count} selected ${noun}${count === 1 ? "" : "s"}` : "";

  // Average over COMPLETED attempts only: a half-done attempt's percentage
  // is not a result yet and would drag the figure down.
  const tallies = (ex: ReportExercise) => {
    let attempted = 0, completed = 0, pctSum = 0, pctN = 0;
    const set = rosterFor(ex);
    for (const s of set) {
      const r = resultOf(ex.id, s.id);
      if (r.status !== "not-started") attempted += 1;
      if (r.status === "completed") {
        completed += 1;
        if (r.percent != null) { pctSum += r.percent; pctN += 1; }
      }
    }
    return { students: set.length, attempted, completed, avg: pctN ? pctSum / pctN : null };
  };
  const visibleExercises = filteredExercises.filter((ex) => matches(q, ex.name, ex.location, ex.subcategory));
  const visibleStudents = roster.filter((s) => matches(q, s.name, s.regNo, s.email));
  /** Preview & Print of the generated list (the action row's button). */
  const printList = (layout: PrintLayout) => {
    if (tab === "exercise") {
      setPrintJob({
        layout,
        blocks: exerciseListBlocks(visibleExercises, tallies, (ex) =>
          ex.startDate || ex.endDate ? `${formatDate(ex.startDate)} – ${formatDate(ex.endDate)}` : "—"),
        title: "Exercise Report",
        subject: "",
        byExercise: false,
        fileBase: `${courseName}-Exercise-Report`,
        scopeNote: "",
      });
      return;
    }
    const chosen = pickedOr(visibleStudents);
    setPrintJob({
      layout,
      blocks: studentBlocks(layout as "student-totals" | "student-exercises" | "student-questions", chosen, filteredExercises, printSources),
      title: "Student Report",
      subject: "",
      byExercise: false,
      fileBase: `${courseName}-Student-Report`,
      scopeNote: scopeNote(chosen.length, visibleStudents.length, "student"),
    });
  };

  // ── Navigation ──
  const goBack = () => {
    if (tab === "exercise" && exerciseId) { setExerciseId(""); return; }
    if (tab === "student" && studentId) { setStudentId(""); return; }
    if (returnTo) router.push(returnTo);
    else router.back();
  };
  const switchTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    setDrawer(null);
  };

  // ── Render ──
  if (!courseId) {
    return (
      <Centered icon={<BookOpen size={20} />} title="No course selected" body="Open the Report from a course's Course Actions." />
    );
  }

  const batchesOf = (ex: ReportExercise) =>
    ex.batchIds && batchOptions.length > 1
      ? [...ex.batchIds].map((id) => batchNameById.get(id)).filter(Boolean).join(", ")
      : "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-3 py-3 sm:px-4">
      {/* ── Header — back + title + course on the left, the two kinds of
           list on the right. Kept to one band so the list gets the room. ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            onClick={goBack}
            title={currentExercise ? "Back to exercises" : currentStudent ? "Back to students" : "Back"}
            aria-label={currentExercise ? "Back to exercises" : currentStudent ? "Back to students" : "Back"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-hairline-strong bg-surface text-subtle transition-colors hover:bg-row-hover hover:text-heading"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight tracking-[-0.01em] text-heading">Course Report</h1>
            <p className="truncate text-xs text-subtle" title={courseName}>
              {courseName}
              {!isLoading && ` · ${exercises.length} exercise${exercises.length === 1 ? "" : "s"} · ${students.length} student${students.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <div className="inline-flex overflow-hidden rounded-control border border-hairline-strong bg-surface" role="tablist">
          {([
            { key: "exercise" as const, label: "By Exercise", icon: <ClipboardList size={13} /> },
            { key: "student" as const, label: "By Student", icon: <UsersRound size={13} /> },
          ]).map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => switchTab(t.key)}
              className={`inline-flex h-9 items-center gap-1.5 px-3.5 text-xs font-medium transition-colors ${
                tab === t.key ? "bg-brand-strong text-white" : "text-body hover:bg-row-hover"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters ──
           The lists (exercise list, student list): Search, then the report
           filters, then Reset · Preview & Print · Generate Report — nothing
           is listed until Generate. On one exercise or one student only
           Search applies. */}
      {currentExercise || currentStudent ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-surface px-3 py-2.5 shadow-xs">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-2xs font-semibold uppercase tracking-wider text-subtle">Search</span>
            <span className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={currentStudent ? "Search exercises…" : "Search students…"}
                className="h-9 w-full rounded-control border border-hairline-strong bg-surface pl-8 pr-8 text-xs text-body focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-heading">
                  <X size={14} />
                </button>
              )}
            </span>
          </label>
        </div>
      ) : (
        <div className="shrink-0 rounded-xl border border-hairline bg-surface px-3 pb-2.5 pt-3.5 shadow-xs">
          {/* One row of fields, each named on its border. */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3.5">
            <BorderLabel label="Search" className="min-w-[220px] flex-[2_1_240px]">
              <span className="relative block">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === "exercise" ? "Search exercises in the report…" : "Search students in the report…"}
                  className="h-9 w-full rounded-[10px] border border-[#e7ddd1] bg-surface pl-8 pr-8 text-xs text-body shadow-xs focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-heading">
                    <X size={14} />
                  </button>
                )}
              </span>
            </BorderLabel>
            {phaseOptions.length > 0 && (
              <BorderLabel label="Phase" className={`${REPORT_FIELD} flex-[1_1_140px] sm:max-w-[200px]`}>
                <MappingMultiFilter label="Phases" options={phaseOptions} value={draft.phases} onChange={(v) => setPick("phases", v)} placeholder="All phases" />
              </BorderLabel>
            )}
            {batchOptions.length > 0 && (
              <BorderLabel label="Batch" className={`${REPORT_FIELD} flex-[1_1_150px] sm:max-w-[220px]`}>
                <MappingMultiFilter
                  label="Batches"
                  options={draftBatchOptions}
                  value={draft.batches.filter((b) => draftBatchOptions.some((o) => o.value === b))}
                  onChange={(v) => setPick("batches", v)}
                  placeholder="All batches"
                  emptyLabel="No batches in the selected phases"
                />
              </BorderLabel>
            )}
            <BorderLabel label="Activity" className={`${REPORT_FIELD} flex-[1_1_150px] sm:max-w-[220px]`}>
              <MappingMultiFilter label="Activities" options={activityOptions} value={draft.activities} onChange={(v) => setPick("activities", v)} placeholder="All activities" />
            </BorderLabel>
            {showSubcategory && (
              <BorderLabel label="Subcategory" className={`${REPORT_FIELD} flex-[1_1_150px] sm:max-w-[220px]`}>
                <MappingMultiFilter label="Subcategories" options={subcategoryOptions} value={draft.subcategories} onChange={(v) => setPick("subcategories", v)} placeholder="All subcategories" />
              </BorderLabel>
            )}
            <BorderLabel label="Exercises" className={`${REPORT_FIELD} flex-[1_1_160px] sm:max-w-[240px]`}>
              <MappingMultiFilter
                label="Exercises"
                options={exerciseOptions}
                value={draft.exerciseIds.filter((id) => exerciseOptions.some((o) => o.value === id))}
                onChange={(v) => setPick("exerciseIds", v)}
                placeholder="All exercises"
                emptyLabel="No exercises for these filters"
              />
            </BorderLabel>
          </div>

          {/* What the report shows (once generated) and its actions — one line. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5 border-t border-[#ece3d8] pt-2.5">
            <div className="min-w-0 flex-1 [&>div]:mb-0">
              {applied ? (
                <ReportShowingRow chips={chips} onRemove={removeChip} loading={false} />
              ) : (
                <p className="text-xs text-subtle">
                  Pick what you need, then <span className="font-semibold text-heading">Generate Report</span>
                  {tab === "student" ? " — e.g. Phase III to list that phase's students." : "."}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetReport}
                disabled={!draftTouched && !applied}
                className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#e2dbd3] bg-surface px-3.5 text-xs font-medium text-body transition-colors hover:bg-row-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw size={14} className="text-subtle" /> Reset
              </button>
              <NextStepGlow active={nudge.isFresh && !nudge.seen}>
                <PrintMenu
                  outline
                  layouts={tab === "exercise" ? ["exercise-list"] : ["student-totals", "student-exercises", "student-questions"]}
                  scopeLabel={tab === "exercise"
                    ? `${visibleExercises.length} exercise${visibleExercises.length === 1 ? "" : "s"}`
                    : selected.size ? `${pickedOr(visibleStudents).length} selected` : `all ${visibleStudents.length}`}
                  disabled={!applied || (tab === "exercise" ? !visibleExercises.length : !visibleStudents.length)}
                  onPick={(layout) => { nudge.markSeen(); printList(layout); }}
                />
              </NextStepGlow>
              <button type="button" className={REPORT_PRIMARY_BTN} onClick={() => generate()} disabled={isLoading || !courseData}>
                <FileText className="size-4" strokeWidth={2.25} /> Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-16 text-xs text-subtle">
          <Loader2 size={16} className="animate-spin" /> Loading course results…
        </div>
      ) : isError || !courseData ? (
        <Centered icon={<SearchX size={20} />} title="Couldn't load this course" body="Check the connection and reload the page." />
      ) : !applied && !currentExercise && !currentStudent ? (
        <ReportEmptyState />
      ) : tab === "exercise" && !currentExercise ? (
        <ExerciseList
          rows={visibleExercises}
          tallies={tallies}
          batchesOf={batchesOf}
          showSubcategory={showSubcategory}
          onView={(id) => setExerciseId(id)}
        />
      ) : tab === "exercise" && currentExercise ? (
        <ExerciseResults
          exercise={currentExercise}
          rows={rosterFor(currentExercise).filter((s) => matches(q, s.name, s.regNo, s.email))}
          roster={rosterFor(currentExercise)}
          batches={batchesOf(currentExercise)}
          showSubcategory={showSubcategory}
          resultOf={resultOf}
          selected={selected}
          setSelected={setSelected}
          onView={(sid) => setDrawer({ exerciseId: currentExercise.id, studentId: sid })}
          onPrint={(layout, visible) => {
            const chosen = pickedOr(visible);
            setPrintJob({
              layout,
              blocks: exerciseBlocks(layout as "exercise-summary" | "exercise-questions", currentExercise, chosen, printSources),
              title: `${currentExercise.type} Report`,
              subject: `Exercise: ${currentExercise.name}`,
              byExercise: true,
              fileBase: `${courseName}-${currentExercise.name}`,
              scopeNote: scopeNote(chosen.length, visible.length, "student"),
            });
          }}
        />
      ) : tab === "student" && !currentStudent ? (
        <StudentList
          rows={visibleStudents}
          batchOptions={batchOptions}
          batchMeta={batchMeta}
          showPhase={phaseNames.length > 0}
          totalsOf={totalsOf}
          exerciseCount={filteredExercises.length}
          selected={selected}
          setSelected={setSelected}
          onView={(id) => setStudentId(id)}
          onPrint={(layout, visible) => {
            const chosen = pickedOr(visible);
            setPrintJob({
              layout,
              blocks: studentBlocks(layout as "student-totals" | "student-exercises" | "student-questions", chosen, filteredExercises, printSources),
              title: "Student Report",
              subject: "",
              byExercise: false,
              fileBase: `${courseName}-Student-Report`,
              scopeNote: scopeNote(chosen.length, visible.length, "student"),
            });
          }}
        />
      ) : currentStudent ? (
        <StudentResults
          student={currentStudent}
          rows={filteredExercises.filter((ex) => appliesTo(ex, currentStudent) && matches(q, ex.name, ex.location, ex.subcategory))}
          totals={totalsOf(currentStudent)}
          showSubcategory={showSubcategory}
          resultOf={resultOf}
          questionsOf={questionsOf}
          expanded={expanded}
          setExpanded={setExpanded}
          onPrint={(layout) => setPrintJob({
            layout,
            blocks: studentBlocks(layout as "student-exercises" | "student-questions", [currentStudent], filteredExercises, printSources),
            title: "Student Report",
            subject: `Student: ${currentStudent.name}${currentStudent.regNo ? ` (${currentStudent.regNo})` : ""}`,
            byExercise: false,
            fileBase: `${courseName}-${currentStudent.name}`,
            scopeNote: "",
          })}
        />
      ) : (
        <Centered icon={<SearchX size={20} />} title="Not found" body="This item is no longer part of the course." />
      )}

      {/* ── E3: one student's questions in one exercise ── */}
      <StudentDrawer
        open={Boolean(drawer)}
        exercise={drawer ? exercises.find((e) => e.id === drawer.exerciseId) || null : null}
        student={drawer ? students.find((s) => s.id === drawer.studentId) || null : null}
        resultOf={resultOf}
        questionsOf={questionsOf}
        onClose={() => setDrawer(null)}
        onPrint={(exercise, student) => {
          setDrawer(null);
          setPrintJob({
            layout: "exercise-questions",
            blocks: exerciseBlocks("exercise-questions", exercise, [student], printSources),
            title: `${exercise.type} Report`,
            subject: `Exercise: ${exercise.name}  ·  Student: ${student.name}`,
            byExercise: true,
            fileBase: `${courseName}-${exercise.name}-${student.name}`,
            scopeNote: "",
            reopenDrawer: { exerciseId: exercise.id, studentId: student.id },
          });
        }}
      />

      <PrintPreviewModal
        open={Boolean(printJob)}
        onClose={() => {
          if (printJob?.reopenDrawer) setDrawer(printJob.reopenDrawer);
          setPrintJob(null);
        }}
        snapshot={printSnapshot}
        blocks={printJob?.blocks || []}
        letterhead={letterhead}
        initialFormat={initialFormat}
        meta={printMeta}
        fields={printFields}
        defaultEnabled={printJob ? LAYOUT_FIELDS[printJob.layout].defaults : undefined}
        filenameBase={printJob ? `${fileSafe(printJob.fileBase)}-${new Date().toISOString().slice(0, 10)}` : undefined}
        keepBlocksTogether
        noFillerRows
      />
    </div>
  );
}

// ─── Pieces ─────────────────────────────────────────────────────────────────

/** A filter field with its name on the top border — keeps the filter bar
 *  to one row instead of a label line over every field. */
function BorderLabel({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`relative ${className || ""}`}>
      {children}
      <span className="pointer-events-none absolute -top-[7px] left-2.5 z-[1] bg-surface px-1 text-[10.5px] font-medium leading-[14px] text-subtle">
        {label}
      </span>
    </div>
  );
}

function Centered({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-wash text-brand-strong">{icon}</span>
      <p className="text-sm font-semibold text-heading">{title}</p>
      <p className="mt-1 text-xs text-subtle">{body}</p>
    </div>
  );
}

function Card({ children, toolbar }: { children: React.ReactNode; toolbar?: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
      {toolbar && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-3 py-2.5">{toolbar}</div>}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-xs text-subtle">{text}</td>
    </tr>
  );
}

function ViewButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={label}
      className="inline-flex h-7 items-center gap-1 rounded-chip border border-hairline-strong bg-surface px-2.5 text-2xs font-semibold text-body transition-colors hover:border-brand-500/40 hover:text-brand-strong"
    >
      <Eye size={12} /> View
    </button>
  );
}

/** Header-checkbox state for the rows on screen. */
function useSelection(rows: { id: string }[], selected: Set<string>, setSelected: (s: Set<string>) => void) {
  const onScreen = rows.filter((r) => selected.has(r.id)).length;
  const all = rows.length > 0 && onScreen === rows.length;
  const toggleAll = (checked: boolean) => {
    const next = new Set(selected);
    rows.forEach((r) => (checked ? next.add(r.id) : next.delete(r.id)));
    setSelected(next);
  };
  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };
  const picked = rows.filter((r) => selected.has(r.id)).length;
  return { all, some: onScreen > 0, toggleAll, toggle, picked };
}

const THEAD = "sticky top-0 z-[1] bg-canvas";

// E1 ────────────────────────────────────────────────────────────────────────
function ExerciseList({
  rows, tallies, batchesOf, showSubcategory, onView,
}: {
  rows: ReportExercise[];
  tallies: (ex: ReportExercise) => { students: number; attempted: number; completed: number; avg: number | null };
  /** "batch1" when the exercise is set for some batches only, else "". */
  batchesOf: (ex: ReportExercise) => string;
  showSubcategory: boolean;
  onView: (id: string) => void;
}) {
  const cols = showSubcategory ? 11 : 10;
  return (
    <Card toolbar={(
      <>
        <span className="text-xs text-subtle">{rows.length} exercise{rows.length === 1 ? "" : "s"}</span>
        <span className="text-2xs text-faint">Avg % is over completed attempts</span>
      </>
    )}>
      <table className="w-full min-w-[900px] border-collapse lg:min-w-0">
        <thead className={THEAD}>
          <tr>
            <th className={`${TH} w-10 text-right`}>#</th>
            <th className={TH}>Name</th>
            <th className={TH}>Type</th>
            {showSubcategory && <th className={TH}>Subcategory</th>}
            <th className={TH}>Module › Topic</th>
            <th className={`${TH} text-right`}>Questions</th>
            <th className={`${TH} text-right`}>Total Marks</th>
            <th className={`${TH} text-right`}>Attempted</th>
            <th className={`${TH} text-right`}>Completed</th>
            <th className={`${TH} text-right`}>Avg %</th>
            <th className={`${TH} text-right`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={cols} text="No assignments or assessments match these filters." />}
          {rows.map((ex, i) => {
            const t = tallies(ex);
            const batches = batchesOf(ex);
            return (
              <tr key={ex.id} onClick={() => onView(ex.id)} className="cursor-pointer border-t border-hairline transition-colors hover:bg-row-hover">
                <td className={`${TD_NUM} text-faint`}>{i + 1}</td>
                <td className={`${TD} max-w-[260px]`}>
                  <span className="block truncate font-semibold text-heading" title={ex.name}>{ex.name}</span>
                  {(ex.startDate || ex.endDate) && (
                    <span className="block text-2xs text-faint">{formatDate(ex.startDate)} – {formatDate(ex.endDate)}</span>
                  )}
                  {batches && <span className="block truncate text-2xs text-faint" title={batches}>Batch: {batches}</span>}
                </td>
                <td className={TD}><TypeChip type={ex.type} /></td>
                {showSubcategory && <td className={TD}>{ex.subcategory || <Dash />}</td>}
                <td className={`${TD} max-w-[240px]`}><span className="block truncate" title={ex.location}>{ex.location || <Dash />}</span></td>
                <td className={TD_NUM}>{ex.questionCount}</td>
                <td className={TD_NUM}>{round1(ex.totalMarks)}</td>
                <td className={TD_NUM}>{t.attempted} / {t.students}</td>
                <td className={TD_NUM}>{t.completed} / {t.students}</td>
                <td className={TD_NUM}>{t.avg == null ? <Dash /> : formatPercent(t.avg)}</td>
                <td className={`${TD} text-right`}><ViewButton onClick={() => onView(ex.id)} label={`View ${ex.name}`} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// E2 ────────────────────────────────────────────────────────────────────────
function ExerciseResults({
  exercise, rows, roster, batches, showSubcategory, resultOf, selected, setSelected, onView, onPrint,
}: {
  exercise: ReportExercise;
  rows: ReportStudent[];
  /** The students this exercise is set for (batch filter applied). */
  roster: ReportStudent[];
  batches: string;
  showSubcategory: boolean;
  resultOf: (exId: string, stId: string) => StudentResult;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onView: (studentId: string) => void;
  onPrint: (layout: PrintLayout, visible: ReportStudent[]) => void;
}) {
  const sel = useSelection(rows, selected, setSelected);
  const counts = useMemo(() => {
    let completed = 0, inProgress = 0, pctSum = 0, pctN = 0;
    for (const s of roster) {
      const r = resultOf(exercise.id, s.id);
      if (r.status === "completed") {
        completed += 1;
        // Completed attempts only — see `tallies`.
        if (r.percent != null) { pctSum += r.percent; pctN += 1; }
      } else if (r.status === "in-progress") inProgress += 1;
    }
    return { completed, inProgress, notStarted: roster.length - completed - inProgress, avg: pctN ? pctSum / pctN : null };
  }, [exercise.id, roster, resultOf]);

  return (
    <>
      <div className="rounded-xl border border-hairline bg-surface px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-heading" title={exercise.name}>{exercise.name}</h2>
          <TypeChip type={exercise.type} />
          {showSubcategory && exercise.subcategory && <span className="text-2xs text-subtle">{exercise.subcategory}</span>}
        </div>
        <p className="mt-0.5 text-2xs text-faint">
          {[exercise.location, `${exercise.questionCount} question${exercise.questionCount === 1 ? "" : "s"}`, `${round1(exercise.totalMarks)} marks`,
            (exercise.startDate || exercise.endDate) ? `${formatDate(exercise.startDate)} – ${formatDate(exercise.endDate)}` : "",
            batches && `Batch: ${batches}`]
            .filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Stat label="Students" value={roster.length} />
          <Stat label="Completed" value={counts.completed} tone="text-success-700" />
          <Stat label="In Progress" value={counts.inProgress} tone="text-info-700" />
          <Stat label="Not Started" value={counts.notStarted} tone="text-subtle" />
          <Stat label="Avg (completed)" value={formatPercent(counts.avg)} />
        </div>
      </div>
      <Card
        toolbar={(
          <>
            <span className="text-xs text-subtle">
              {sel.picked ? `${sel.picked} of ${rows.length} selected` : `${rows.length} student${rows.length === 1 ? "" : "s"} — tick rows to print only those`}
            </span>
            <PrintMenu
              layouts={["exercise-summary", "exercise-questions"]}
              scopeLabel={sel.picked ? `${sel.picked} selected` : `all ${rows.length}`}
              disabled={rows.length === 0}
              onPick={(layout) => onPrint(layout, rows)}
            />
          </>
        )}
      >
        <table className="w-full min-w-[900px] border-collapse lg:min-w-0">
          <thead className={THEAD}>
            <tr>
              <th className={`${TH} w-10`}><Checkbox checked={sel.all} indeterminate={sel.some} onChange={sel.toggleAll} label="Select all students" disabled={!rows.length} /></th>
              <th className={`${TH} w-10 text-right`}>#</th>
              <th className={TH}>Reg No</th>
              <th className={TH}>Student</th>
              <th className={TH}>Batch</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Attempted</th>
              <th className={`${TH} text-right`}>Marks</th>
              <th className={`${TH} text-right`}>%</th>
              <th className={TH}>Scale</th>
              <th className={`${TH} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={11} text="No students match." />}
            {rows.map((s, i) => {
              const r = resultOf(exercise.id, s.id);
              const started = r.status !== "not-started";
              return (
                <tr key={s.id} onClick={() => onView(s.id)} className={`cursor-pointer border-t border-hairline transition-colors hover:bg-row-hover ${selected.has(s.id) ? "bg-brand-wash/40" : ""}`}>
                  <td className={TD}><Checkbox checked={selected.has(s.id)} onChange={(c) => sel.toggle(s.id, c)} label={`Select ${s.name}`} /></td>
                  <td className={`${TD_NUM} text-faint`}>{i + 1}</td>
                  <td className={`${TD} whitespace-nowrap`}>{s.regNo || <Dash />}</td>
                  <td className={`${TD} max-w-[240px]`}>
                    <span className="block truncate font-semibold text-heading" title={s.name}>{s.name}</span>
                    {s.email && <span className="block truncate text-2xs text-faint" title={s.email}>{s.email}</span>}
                  </td>
                  <td className={`${TD} max-w-[160px]`}><span className="block truncate" title={s.batch}>{s.batch || <Dash />}</span></td>
                  <td className={TD}><StatusChip status={r.status} /></td>
                  <td className={TD_NUM}>{r.attempted} / {r.totalQuestions}</td>
                  <td className={`${TD_NUM} font-semibold text-heading`}>{formatMarks(r.scored, r.total, started)}</td>
                  <td className={TD_NUM}>{formatPercent(r.percent)}</td>
                  <td className={TD}>{r.scale || <Dash />}</td>
                  <td className={`${TD} text-right`}><ViewButton onClick={() => onView(s.id)} label={`View ${s.name}`} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// S1 ────────────────────────────────────────────────────────────────────────
function StudentList({
  rows, batchOptions, batchMeta, showPhase, totalsOf, exerciseCount, selected, setSelected, onView,
}: {
  rows: ReportStudent[];
  batchOptions: { value: string; label: string }[];
  batchMeta: Map<string, { phase: string; name: string }>;
  /** The course runs in phases — show the Phase column. */
  showPhase: boolean;
  totalsOf: (s: ReportStudent) => ReturnType<typeof totalsFor>;
  exerciseCount: number;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onView: (id: string) => void;
  onPrint: (layout: PrintLayout, visible: ReportStudent[]) => void;
}) {
  const sel = useSelection(rows, selected, setSelected);

  // One line per student per batch, ordered phase → batch → name. A student
  // in two batches is listed under each; one with no batch comes last.
  const lines = useMemo(() => {
    const metaOf = (id: string) => batchMeta.get(id);
    const order = [...batchOptions].sort((a, b) => {
      const pa = metaOf(a.value)?.phase || "";
      const pb = metaOf(b.value)?.phase || "";
      return phaseOrdinal(pa) - phaseOrdinal(pb) || pa.localeCompare(pb)
        || (metaOf(a.value)?.name || a.label).localeCompare(metaOf(b.value)?.name || b.label, undefined, { numeric: true });
    });
    const byName = (x: ReportStudent, y: ReportStudent) => x.name.localeCompare(y.name);
    const out: { key: string; student: ReportStudent; phase: string; batchId: string; batch: string }[] = [];
    for (const b of order) {
      const meta = metaOf(b.value);
      for (const st of rows.filter((r) => r.batchIds.includes(b.value)).sort(byName)) {
        out.push({ key: `${b.value}|${st.id}`, student: st, phase: meta?.phase || "", batchId: b.value, batch: meta?.name || b.label });
      }
    }
    const known = new Set(batchOptions.map((b) => b.value));
    for (const st of rows.filter((r) => !r.batchIds.some((id) => known.has(id))).sort(byName)) {
      out.push({ key: `none|${st.id}`, student: st, phase: "", batchId: "", batch: "" });
    }
    return out;
  }, [rows, batchOptions, batchMeta]);

  // The same phase (or batch) on consecutive lines is written once, in one
  // cell merged down over them — the way Business Reports merges a client.
  const spans = useMemo(() => {
    const phase = new Array<number>(lines.length).fill(0);
    const batch = new Array<number>(lines.length).fill(0);
    for (let i = 0; i < lines.length;) {
      let j = i;
      while (j < lines.length && lines[j].phase === lines[i].phase) j++;
      phase[i] = j - i;
      i = j;
    }
    for (let i = 0; i < lines.length;) {
      let j = i;
      while (j < lines.length && lines[j].batchId === lines[i].batchId && lines[j].phase === lines[i].phase) j++;
      batch[i] = j - i;
      i = j;
    }
    return { phase, batch };
  }, [lines]);

  const batchCount = new Set(lines.map((l) => l.batchId)).size;
  const COLS = showPhase ? 12 : 11;
  // A merged group cell: read as a label, not a row to open.
  const GROUP_TD = "border-x border-hairline bg-[#fbf8f4] px-3 py-2.5 align-top text-xs font-semibold text-heading dark:bg-white/[0.03]";

  return (
    <Card
      toolbar={(
        <span className="text-xs text-subtle">
          {sel.picked ? `${sel.picked} of ${rows.length} selected` : `${rows.length} student${rows.length === 1 ? "" : "s"}`}
          {batchCount > 1 && ` in ${batchCount} batches`}
          {` · totals over ${exerciseCount} exercise${exerciseCount === 1 ? "" : "s"}`}
          <span
            title="Marks count exercises that are due or started; ones still open and not started are left out."
            className="ml-1 inline-flex cursor-help align-[-2px] text-faint"
          >
            <Info size={13} />
          </span>
        </span>
      )}
    >
      <table className="w-full min-w-[980px] border-collapse lg:min-w-0">
        <thead className={THEAD}>
          <tr>
            <th className={`${TH} w-10`}><Checkbox checked={sel.all} indeterminate={sel.some} onChange={sel.toggleAll} label="Select all students" disabled={!rows.length} /></th>
            <th className={`${TH} w-10 text-right`}>#</th>
            {showPhase && <th className={TH}>Phase</th>}
            <th className={TH}>Batch</th>
            <th className={TH}>Reg No</th>
            <th className={TH}>Student</th>
            <th className={`${TH} text-right`}>Assignments</th>
            <th className={`${TH} text-right`}>Assessments</th>
            <th className={`${TH} text-right`}>Marks</th>
            <th className={`${TH} text-right`}>Overall %</th>
            <th className={TH}>Scale</th>
            <th className={`${TH} text-right`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 && <EmptyRow colSpan={COLS} text="No students match." />}
          {lines.map((l, i) => {
            const s = l.student;
            const t = totalsOf(s);
            // A new batch starts on this line: a firmer rule above it.
            const groupStart = i > 0 && spans.batch[i] > 0;
            return (
              <tr
                key={l.key}
                onClick={() => onView(s.id)}
                className={`cursor-pointer transition-colors hover:bg-row-hover ${groupStart ? "border-t-2 border-[#e9dfd3]" : "border-t border-hairline"} ${selected.has(s.id) ? "bg-brand-wash/40" : ""}`}
              >
                <td className={TD} onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(s.id)} onChange={(c) => sel.toggle(s.id, c)} label={`Select ${s.name}`} /></td>
                <td className={`${TD_NUM} text-faint`}>{i + 1}</td>
                {showPhase && spans.phase[i] > 0 && (
                  <td rowSpan={spans.phase[i]} className={`${GROUP_TD} cursor-default whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                    {l.phase || <Dash />}
                  </td>
                )}
                {spans.batch[i] > 0 && (
                  <td rowSpan={spans.batch[i]} className={`${GROUP_TD} max-w-[180px] cursor-default`} onClick={(e) => e.stopPropagation()}>
                    <span className="block truncate" title={l.batch}>{l.batch || "No batch"}</span>
                    <span className="mt-0.5 block text-2xs font-normal text-subtle">
                      {spans.batch[i]} student{spans.batch[i] === 1 ? "" : "s"}
                    </span>
                  </td>
                )}
                <td className={`${TD} whitespace-nowrap`}>{s.regNo || <Dash />}</td>
                <td className={`${TD} max-w-[260px]`}>
                  <span className="block truncate font-semibold text-heading" title={s.name}>{s.name}</span>
                  {s.email && <span className="block truncate text-2xs text-faint" title={s.email}>{s.email}</span>}
                </td>
                <td className={TD_NUM}>{t.assignmentsDone} / {t.assignmentsTotal}</td>
                <td className={TD_NUM}>{t.assessmentsDone} / {t.assessmentsTotal}</td>
                <td className={`${TD_NUM} font-semibold text-heading`}>{round1(t.scored)} / {round1(t.total)}</td>
                <td className={TD_NUM}>{formatPercent(t.percent)}</td>
                <td className={TD}>{t.scale || <Dash />}</td>
                <td className={`${TD} text-right`}><ViewButton onClick={() => onView(s.id)} label={`View ${s.name}`} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// S2 ────────────────────────────────────────────────────────────────────────
function StudentResults({
  student, rows, totals, showSubcategory, resultOf, questionsOf, expanded, setExpanded, onPrint,
}: {
  student: ReportStudent;
  rows: ReportExercise[];
  totals: ReturnType<typeof totalsFor>;
  showSubcategory: boolean;
  resultOf: (exId: string, stId: string) => StudentResult;
  questionsOf: (ex: ReportExercise, s: ReportStudent) => QuestionRow[];
  expanded: Set<string>;
  setExpanded: (s: Set<string>) => void;
  onPrint: (layout: PrintLayout) => void;
}) {
  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };
  const allOpen = rows.length > 0 && rows.every((r) => expanded.has(r.id));
  return (
    <>
      <div className="rounded-xl border border-hairline bg-surface px-4 py-3 shadow-xs">
        <h2 className="truncate text-sm font-semibold text-heading">{student.name}</h2>
        <p className="mt-0.5 text-2xs text-faint">
          {[student.regNo && `Reg No ${student.regNo}`, student.email, student.batch].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Stat label="Assignments" value={`${totals.assignmentsDone} / ${totals.assignmentsTotal}`} />
          <Stat label="Assessments" value={`${totals.assessmentsDone} / ${totals.assessmentsTotal}`} />
          <Stat label="Marks" value={`${round1(totals.scored)} / ${round1(totals.total)}`} />
          <Stat label="Overall" value={formatPercent(totals.percent)} tone="text-brand-strong" />
          <Stat label="Scale" value={totals.scale || "—"} />
        </div>
        {totals.open > 0 && (
          <p className="mt-2 text-2xs text-faint">
            {totals.open} open exercise{totals.open === 1 ? "" : "s"} not started yet {totals.open === 1 ? "is" : "are"} left out of Marks and Overall.
          </p>
        )}
      </div>
      <Card
        toolbar={(
          <>
            <button
              type="button"
              onClick={() => setExpanded(allOpen ? new Set() : new Set(rows.map((r) => r.id)))}
              disabled={!rows.length}
              className="text-xs font-medium text-brand-strong hover:underline disabled:opacity-50"
            >
              {allOpen ? "Collapse all" : "Expand all questions"}
            </button>
            <PrintMenu
              layouts={["student-exercises", "student-questions"]}
              scopeLabel={student.name}
              disabled={rows.length === 0}
              onPick={onPrint}
            />
          </>
        )}
      >
        <table className="w-full min-w-[900px] border-collapse lg:min-w-0">
          <thead className={THEAD}>
            <tr>
              <th className={`${TH} w-8`} aria-label="Expand" />
              <th className={`${TH} w-10 text-right`}>#</th>
              <th className={TH}>Exercise</th>
              <th className={TH}>Type</th>
              {showSubcategory && <th className={TH}>Subcategory</th>}
              <th className={TH}>Module › Topic</th>
              <th className={TH}>Status</th>
              <th className={`${TH} text-right`}>Attempted</th>
              <th className={`${TH} text-right`}>Marks</th>
              <th className={`${TH} text-right`}>%</th>
              <th className={TH}>Scale</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <EmptyRow colSpan={showSubcategory ? 11 : 10} text="No assignments or assessments match these filters." />}
            {rows.map((ex, i) => {
              const r = resultOf(ex.id, student.id);
              const open = expanded.has(ex.id);
              return (
                <React.Fragment key={ex.id}>
                  <tr onClick={() => toggle(ex.id)} className="cursor-pointer border-t border-hairline transition-colors hover:bg-row-hover" aria-expanded={open}>
                    <td className={TD}>
                      <ChevronRight size={15} strokeWidth={2.5} className={`text-brand-500 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
                    </td>
                    <td className={`${TD_NUM} text-faint`}>{i + 1}</td>
                    <td className={`${TD} max-w-[240px]`}><span className="block truncate font-semibold text-heading" title={ex.name}>{ex.name}</span></td>
                    <td className={TD}><TypeChip type={ex.type} /></td>
                    {showSubcategory && <td className={TD}>{ex.subcategory || <Dash />}</td>}
                    <td className={`${TD} max-w-[220px]`}><span className="block truncate" title={ex.location}>{ex.location || <Dash />}</span></td>
                    <td className={TD}><StatusChip status={r.status} /></td>
                    <td className={TD_NUM}>{r.attempted} / {r.totalQuestions}</td>
                    <td className={`${TD_NUM} font-semibold text-heading`}>{formatMarks(r.scored, r.total, r.status !== "not-started")}</td>
                    <td className={TD_NUM}>{formatPercent(r.percent)}</td>
                    <td className={TD}>{r.scale || <Dash />}</td>
                  </tr>
                  {open && (
                    <tr className="bg-canvas/60">
                      <td colSpan={showSubcategory ? 11 : 10} className="px-3 pb-3 pt-1 sm:pl-12">
                        <QuestionTable rows={questionsOf(ex, student)} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// E3 ────────────────────────────────────────────────────────────────────────
function StudentDrawer({
  open, exercise, student, resultOf, questionsOf, onClose, onPrint,
}: {
  open: boolean;
  exercise: ReportExercise | null;
  student: ReportStudent | null;
  resultOf: (exId: string, stId: string) => StudentResult;
  questionsOf: (ex: ReportExercise, s: ReportStudent) => QuestionRow[];
  onClose: () => void;
  onPrint: (exercise: ReportExercise, student: ReportStudent) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const show = open && exercise && student;
  const r = show ? resultOf(exercise.id, student.id) : EMPTY_RESULT;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-popover flex justify-end bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={onClose}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={`${student.name} — ${exercise.name}`}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-[760px] flex-col bg-surface shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="break-words text-2xs font-semibold uppercase tracking-wider text-subtle">{exercise.type} · {exercise.name}</p>
                <h3 className="mt-0.5 truncate text-base font-semibold text-heading">{student.name}</h3>
                <p className="break-words text-2xs text-faint">{[student.regNo && `Reg No ${student.regNo}`, student.email, student.batch].filter(Boolean).join(" · ")}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-md p-1.5 text-subtle hover:bg-row-hover hover:text-heading sm:p-1">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5">
              <Stat label="Status" value={<StatusChip status={r.status} />} />
              <Stat label="Attempted" value={`${r.attempted} / ${r.totalQuestions}`} />
              <Stat label="Marks" value={formatMarks(r.scored, r.total, r.status !== "not-started")} />
              <Stat label="Percentage" value={formatPercent(r.percent)} tone="text-brand-strong" />
              <Stat label="Scale" value={r.scale || "—"} />
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 sm:px-5">
              <QuestionTable rows={questionsOf(exercise, student)} />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline bg-canvas px-4 py-3 sm:px-5">
              <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-control border border-hairline-strong bg-surface px-3.5 text-xs font-medium text-body hover:bg-row-hover">
                Close
              </button>
              <PrintMenu layouts={["exercise-questions"]} scopeLabel={student.name} onPick={() => onPrint(exercise, student)} />
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
