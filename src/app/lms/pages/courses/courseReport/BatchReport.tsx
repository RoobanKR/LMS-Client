"use client";

// ─── Batch Report ───────────────────────────────────────────────────────────
//
// The Course Report's third reading, built like Business Reports: pick the
// batches, activities and exercises, press Generate, and read one table —
// every batch as a collapsible header row spanning the table, its students
// under it, one column per exercise and the student's totals at the end.
// Preview / Print / PDF / Excel go through the shared PrintPreviewModal, one
// block per batch.
//
// Nothing is fetched here: the Course Report already holds the roster, the
// exercises and every student's result; this only arranges them.

import React, { useCallback, useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, ChevronRight, ClipboardList, Layers, Search, Tags, UsersRound, X } from "lucide-react";
import { MappingMultiFilter } from "@/app/lms/pages/servicemapping/components/MappingReportFilters";
import { PrintPreviewModal, type FieldRow } from "@/app/lms/pages/businessreports/components/PrintPreviewModal";
import type { ServiceMapping } from "@/app/lms/pages/servicemapping/api/serviceMappingService";
import type { ReportClientBlock } from "@/app/lms/pages/servicemapping/components/serviceReport";
import {
  FilterLabel, REPORT_FIELD, REPORT_TABLE_CARD, REPORT_TD, REPORT_TH, ReportActionRow, ReportEmptyState,
  ReportNoMatches, ReportShowingRow, chipLabel, useNextStepNudge, type ReportChip,
} from "@/app/lms/shared/report/reportKit";
import {
  appliesTo, formatPercent, round1, totalsFor,
  type ActivityType, type ReportExercise, type ReportStudent, type StudentResult, type StudentTotals,
} from "./reportData";
import { usePrintSetup } from "./usePrintSetup";

type ScoreAs = "marks" | "percent";

interface Draft {
  batches: string[];
  activities: string[];
  subcategories: string[];
  exercises: string[];
  scoreAs: ScoreAs;
}

const EMPTY_DRAFT: Draft = { batches: [], activities: [], subcategories: [], exercises: [], scoreAs: "marks" };

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  Assignment: "Assignment (We Do)",
  Assessment: "Assessment (You Do)",
};

type ChipKey = "batches" | "activities" | "subcategories" | "exercises";

interface Props {
  courseName: string;
  exercises: ReportExercise[];
  students: ReportStudent[];
  batchOptions: { value: string; label: string }[];
  showSubcategory: boolean;
  /** The student's result when the exercise is set for their batch. */
  resultIfSet: (exerciseId: string, studentId: string) => StudentResult | undefined;
}

const fileSafe = (s: string) => s.replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "");

/** One exercise's cell: marks or %, or why there is none. */
function cellText(r: StudentResult | undefined, scoreAs: ScoreAs): string {
  if (!r) return "N/A";
  if (r.status === "not-started") return "—";
  return scoreAs === "percent" ? formatPercent(r.percent) : `${round1(r.scored)}/${round1(r.total)}`;
}

export default function BatchReport({ courseName, exercises, students, batchOptions, showSubcategory, resultIfSet }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [snapshot, setSnapshot] = useState<{ draft: Draft; generated: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const nudge = useNextStepNudge(draft);

  // ── Filter options — each narrows by the others ──
  const inBatches = useCallback(
    (ex: ReportExercise, batches: string[]) => !batches.length || !ex.batchIds || batches.some((b) => ex.batchIds!.has(b)),
    [],
  );
  const activityOptions = useMemo(() => {
    const present = new Set(exercises.filter((ex) => inBatches(ex, draft.batches)).map((ex) => ex.type));
    return (Object.keys(ACTIVITY_LABEL) as ActivityType[])
      .filter((t) => present.has(t))
      .map((t) => ({ value: t, label: ACTIVITY_LABEL[t] }));
  }, [exercises, draft.batches, inBatches]);
  const subcategoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const ex of exercises) {
      if (!inBatches(ex, draft.batches) || (draft.activities.length && !draft.activities.includes(ex.type))) continue;
      if (!seen.has(ex.subcategoryKey)) seen.set(ex.subcategoryKey, ex.subcategory);
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [exercises, draft.batches, draft.activities, inBatches]);
  const exerciseOptions = useMemo(
    () => exercises
      .filter((ex) => inBatches(ex, draft.batches)
        && (!draft.activities.length || draft.activities.includes(ex.type))
        && (!draft.subcategories.length || draft.subcategories.includes(ex.subcategoryKey)))
      .map((ex) => ({ value: ex.id, label: ex.name })),
    [exercises, draft.batches, draft.activities, draft.subcategories, inBatches],
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const hasDraft = draft.batches.length + draft.activities.length + draft.subcategories.length + draft.exercises.length > 0 || draft.scoreAs !== "marks";

  const generate = (from: Draft = draft) => {
    setSnapshot({ draft: from, generated: new Date().toLocaleString() });
    setCollapsed(new Set());
    setSearch("");
    nudge.markGenerated(from);
  };
  const reset = () => {
    setDraft(EMPTY_DRAFT);
    setSnapshot(null);
    setSearch("");
    nudge.clear();
  };

  // ── The generated report ──
  const report = useMemo(() => {
    if (!snapshot) return null;
    const d = snapshot.draft;
    const batchIds = d.batches.length ? d.batches : batchOptions.map((b) => b.value);
    const cols = exercises.filter((ex) => inBatches(ex, batchIds)
      && (!d.activities.length || d.activities.includes(ex.type))
      && (!d.subcategories.length || d.subcategories.includes(ex.subcategoryKey))
      && (!d.exercises.length || d.exercises.includes(ex.id)));

    const groups = batchOptions
      .filter((b) => batchIds.includes(b.value))
      .map((b) => {
        const rows = students
          .filter((s) => s.batchIds.includes(b.value))
          .sort((x, y) => x.name.localeCompare(y.name))
          .map((s) => {
            const cells = cols.map((ex) => (appliesTo(ex, s) ? resultIfSet(ex.id, s.id) : undefined));
            const totals: StudentTotals = totalsFor(cols, (exId) => resultIfSet(exId, s.id));
            return { student: s, cells, totals };
          });
        const pcts = rows.map((r) => r.totals.percent).filter((p): p is number => p != null);
        const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
        return { id: b.value, label: b.label, rows, avg };
      })
      .filter((g) => g.rows.length > 0);
    return { cols, groups, scoreAs: d.scoreAs };
  }, [snapshot, exercises, students, batchOptions, resultIfSet, inBatches]);

  const q = search.trim().toLowerCase();
  const visibleGroups = useMemo(
    () => (report?.groups || [])
      .map((g) => ({ ...g, rows: q ? g.rows.filter((r) => `${r.student.name} ${r.student.regNo} ${r.student.email}`.toLowerCase().includes(q)) : g.rows }))
      .filter((g) => g.rows.length > 0),
    [report, q],
  );
  const studentCount = useMemo(() => new Set(visibleGroups.flatMap((g) => g.rows.map((r) => r.student.id))).size, [visibleGroups]);

  // ── "Showing:" chips ──
  const labelsOf = (values: string[], options: { value: string; label: string }[]) =>
    values.map((v) => options.find((o) => o.value === v)?.label || v);
  const chips: ReportChip<ChipKey>[] = snapshot ? [
    { key: "batches", title: "Batch", label: chipLabel(labelsOf(snapshot.draft.batches, batchOptions), snapshot.draft.batches.length > 0, "All batches"), narrowed: snapshot.draft.batches.length > 0 },
    { key: "activities", title: "Activity", label: chipLabel(labelsOf(snapshot.draft.activities, activityOptions), snapshot.draft.activities.length > 0, "All activities"), narrowed: snapshot.draft.activities.length > 0 },
    ...(showSubcategory ? [{ key: "subcategories" as const, title: "Subcategory", label: chipLabel(labelsOf(snapshot.draft.subcategories, subcategoryOptions), snapshot.draft.subcategories.length > 0, "All subcategories"), narrowed: snapshot.draft.subcategories.length > 0 }] : []),
    { key: "exercises", title: "Exercises", label: chipLabel(labelsOf(snapshot.draft.exercises, exercises.map((e) => ({ value: e.id, label: e.name }))), snapshot.draft.exercises.length > 0, "All exercises"), narrowed: snapshot.draft.exercises.length > 0 },
  ] : [];
  const removeChip = (key: ChipKey) => {
    const next = { ...draft, [key]: [] } as Draft;
    setDraft(next);
    generate(next);
  };

  // ── Preview / print / export — one block per batch ──
  const { letterhead, initialFormat } = usePrintSetup();
  const printFields: FieldRow[] = useMemo(() => {
    if (!report) return [];
    return [
      { key: "client", label: "Batch", scope: "client", column: "Batch", dataKey: "client", required: true },
      { key: "regNo", label: "Reg No", scope: "service", column: "Reg No", dataKey: "regNo" },
      { key: "student", label: "Student", scope: "service", column: "Student", dataKey: "student", required: true },
      ...report.cols.map((ex, i): FieldRow => ({ key: `ex_${i}`, label: ex.name, scope: "service", column: ex.name, dataKey: `ex_${i}` })),
      { key: "done", label: "Completed", scope: "service", column: "Completed", dataKey: "done" },
      { key: "marks", label: "Marks", scope: "service", column: "Marks", dataKey: "marks" },
      { key: "percent", label: "Overall %", scope: "service", column: "Overall %", dataKey: "percent" },
    ];
  }, [report]);
  const printDefaults = useMemo(() => new Set(printFields.map((f) => f.key)), [printFields]);
  const printBlocks: ReportClientBlock[] = useMemo(() => visibleGroups.map((g) => ({
    client: g.label,
    business: `${g.rows.length} student${g.rows.length === 1 ? "" : "s"}`,
    services: g.rows.map((r) => {
      const row: Record<string, string> = {
        regNo: r.student.regNo || "—",
        student: r.student.name,
        done: `${r.totals.assignmentsDone + r.totals.assessmentsDone}/${r.totals.assignmentsTotal + r.totals.assessmentsTotal}`,
        marks: r.totals.total ? `${round1(r.totals.scored)}/${round1(r.totals.total)}` : "—",
        percent: formatPercent(r.totals.percent),
      };
      r.cells.forEach((c, i) => { row[`ex_${i}`] = cellText(c, report?.scoreAs || "marks"); });
      return row;
    }),
  })), [visibleGroups, report]);
  const printMeta = useMemo(() => {
    const narrowed = chips.filter((c) => c.narrowed).map((c) => `${c.title}: ${c.label}`);
    return {
      title: "Batch Report",
      scope: courseName,
      generated: snapshot?.generated || "",
      filters: [
        narrowed.length ? `Filtered by  ·  ${narrowed.join("  ·  ")}` : "",
        `Scores as ${report?.scoreAs === "percent" ? "percentage" : "marks"}  ·  — not started  ·  N/A not set for the batch`,
      ].filter(Boolean).join("  ·  "),
      ...letterhead,
    };
  }, [chips, courseName, snapshot, report, letterhead]); // eslint-disable-line react-hooks/exhaustive-deps
  const printSnapshot = useMemo(
    () => ({ draft: {}, rows: [] as ServiceMapping[], generated: printMeta.generated }),
    [printMeta.generated],
  );

  const toggleBatch = (id: string) => setCollapsed((c) => {
    const n = new Set(c);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allCollapsed = visibleGroups.length > 0 && visibleGroups.every((g) => collapsed.has(g.id));
  const colCount = 2 + (report?.cols.length || 0) + 3;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* ── Filters ── */}
      <div className="shrink-0 rounded-xl border border-hairline bg-surface px-4 py-3 shadow-xs">
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${showSubcategory ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
          <div className={REPORT_FIELD}>
            <FilterLabel icon={UsersRound} tone="text-emerald-500">Batch</FilterLabel>
            <MappingMultiFilter label="Batches" options={batchOptions} value={draft.batches} onChange={(v) => set("batches", v)} placeholder="All batches" />
          </div>
          <div className={REPORT_FIELD}>
            <FilterLabel icon={Layers} tone="text-brand-500">Activity</FilterLabel>
            <MappingMultiFilter label="Activities" options={activityOptions} value={draft.activities} onChange={(v) => set("activities", v)} placeholder="All activities" />
          </div>
          {showSubcategory && (
            <div className={REPORT_FIELD}>
              <FilterLabel icon={Tags} tone="text-brand-500">Subcategory</FilterLabel>
              <MappingMultiFilter label="Subcategories" options={subcategoryOptions} value={draft.subcategories} onChange={(v) => set("subcategories", v)} placeholder="All subcategories" />
            </div>
          )}
          <div className={REPORT_FIELD}>
            <FilterLabel icon={ClipboardList} tone="text-sky-500">Exercises</FilterLabel>
            <MappingMultiFilter
              label="Exercises"
              options={exerciseOptions}
              value={draft.exercises.filter((id) => exerciseOptions.some((o) => o.value === id))}
              onChange={(v) => set("exercises", v)}
              placeholder="All exercises"
              emptyLabel="No exercises for these filters"
            />
          </div>
          <div>
            <FilterLabel icon={BookOpenCheck} tone="text-violet-500">Show scores as</FilterLabel>
            <div className="inline-flex h-9 w-full overflow-hidden rounded-[10px] border border-[#e7ddd1] bg-surface shadow-xs" role="radiogroup" aria-label="Show scores as">
              {([["marks", "Marks"], ["percent", "Percentage"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={draft.scoreAs === v}
                  onClick={() => set("scoreAs", v)}
                  className={`flex-1 text-xs font-medium transition-colors ${draft.scoreAs === v ? "bg-brand-wash text-brand-strong" : "text-body hover:bg-row-hover"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ReportActionRow
          onReset={reset}
          resetDisabled={!hasDraft && !snapshot}
          onPreview={() => { setPreviewOpen(true); nudge.markSeen(); }}
          previewDisabled={!report || visibleGroups.length === 0}
          nudge={nudge.isFresh && !nudge.seen}
          onGenerate={() => generate()}
          generateDisabled={batchOptions.length === 0 && students.length === 0}
          loading={false}
        />
      </div>

      {/* ── Report ── */}
      {!report ? (
        <ReportEmptyState />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <ReportShowingRow chips={chips} onRemove={removeChip} loading={false} />
          {report.groups.length === 0 || report.cols.length === 0 ? (
            <ReportNoMatches />
          ) : (
            <div className={REPORT_TABLE_CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece3d8] px-3 py-2.5">
                <p className="text-xs text-subtle">
                  <span className="font-semibold text-heading">{visibleGroups.length}</span> batch{visibleGroups.length === 1 ? "" : "es"}
                  {" · "}<span className="font-semibold text-heading">{studentCount}</span> student{studentCount === 1 ? "" : "s"}
                  {" · "}<span className="font-semibold text-heading">{report.cols.length}</span> exercise{report.cols.length === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-2">
                  <span className="relative">
                    <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Find a student"
                      aria-label="Find a student"
                      className="h-8 w-48 rounded-[9px] border border-[#e7ddd1] bg-surface pl-7 pr-7 text-xs text-body focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-heading">
                        <X size={12} />
                      </button>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(visibleGroups.map((g) => g.id)))}
                    className="h-8 rounded-[9px] border border-[#e7ddd1] bg-surface px-3 text-xs font-medium text-body transition-colors hover:border-brand-300 hover:text-heading"
                  >
                    {allCollapsed ? "Expand all" : "Collapse all"}
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                {visibleGroups.length === 0 ? (
                  <p className="py-12 text-center text-sm text-subtle">No student matches “{search}”.</p>
                ) : (
                  <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
                    <thead>
                      <tr>
                        <th className={`${REPORT_TH} left-0 z-20 w-11 text-center`}>#</th>
                        <th className={`${REPORT_TH} left-11 z-20 min-w-[220px] border-r text-left`}>Student</th>
                        {report.cols.map((ex) => (
                          <th key={ex.id} className={`${REPORT_TH} min-w-[110px] max-w-[160px] text-center normal-case tracking-normal`} title={`${ex.name} · ${ex.type} · ${round1(ex.totalMarks)} marks`}>
                            <span className="line-clamp-2 text-[11px] font-semibold text-heading">{ex.name}</span>
                            <span className="mt-0.5 block text-[10px] font-medium text-subtle">{ex.type} · {round1(ex.totalMarks)}</span>
                          </th>
                        ))}
                        <th className={`${REPORT_TH} text-center`}>Completed</th>
                        <th className={`${REPORT_TH} text-center`}>Marks</th>
                        <th className={`${REPORT_TH} text-center`}>Overall %</th>
                      </tr>
                    </thead>
                    {visibleGroups.map((g) => {
                      const open = !collapsed.has(g.id);
                      return (
                        <tbody key={g.id}>
                          {/* The batch — a header row across the whole table. */}
                          <tr>
                            <td colSpan={colCount} className="border-y border-[#e3d7c9] bg-[#fbf3ea] p-0">
                              <button
                                type="button"
                                onClick={() => toggleBatch(g.id)}
                                aria-expanded={open}
                                className="sticky left-0 flex items-center gap-2 px-3 py-2 text-left"
                              >
                                {open ? <ChevronDown size={15} className="text-brand-strong" /> : <ChevronRight size={15} className="text-brand-strong" />}
                                <span className="text-[13px] font-semibold text-heading">{g.label}</span>
                                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-body ring-1 ring-[#ecd9c4]">
                                  {g.rows.length} student{g.rows.length === 1 ? "" : "s"}
                                </span>
                                <span className="text-[11px] text-subtle">Batch average {formatPercent(g.avg)}</span>
                              </button>
                            </td>
                          </tr>
                          {open && g.rows.map((r, i) => {
                            const done = r.totals.assignmentsDone + r.totals.assessmentsDone;
                            const of = r.totals.assignmentsTotal + r.totals.assessmentsTotal;
                            return (
                              <tr key={r.student.id} className="group">
                                <td className={`${REPORT_TD} sticky left-0 z-[5] border-b border-[#f1ebe4] bg-surface text-center text-subtle group-hover:bg-[#fffaf5]`}>{i + 1}</td>
                                <td className={`${REPORT_TD} sticky left-11 z-[5] border-b border-[#f1ebe4] bg-surface group-hover:bg-[#fffaf5]`}>
                                  <p className="truncate font-medium text-heading" title={r.student.name}>{r.student.name}</p>
                                  {r.student.regNo && <p className="truncate text-[11px] text-subtle">{r.student.regNo}</p>}
                                </td>
                                {r.cells.map((c, ci) => {
                                  const tone = !c ? "text-faint" : c.status === "completed" ? "text-heading" : c.status === "in-progress" ? "text-amber-700" : "text-faint";
                                  return (
                                    <td
                                      key={ci}
                                      className={`${REPORT_TD} border-b border-[#f1ebe4] text-center tabular-nums group-hover:bg-[#fffaf5] ${tone}`}
                                      title={!c ? "Not set for this student's batch" : c.status === "not-started" ? "Not started" : c.status === "in-progress" ? "In progress" : "Completed"}
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        {c && c.status !== "not-started" && (
                                          <span className={`h-1.5 w-1.5 rounded-full ${c.status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                        )}
                                        {cellText(c, report.scoreAs)}
                                      </span>
                                    </td>
                                  );
                                })}
                                <td className={`${REPORT_TD} border-b border-[#f1ebe4] text-center tabular-nums group-hover:bg-[#fffaf5]`}>{done}/{of}</td>
                                <td className={`${REPORT_TD} border-b border-[#f1ebe4] text-center tabular-nums group-hover:bg-[#fffaf5]`}>
                                  {r.totals.total ? `${round1(r.totals.scored)}/${round1(r.totals.total)}` : "—"}
                                </td>
                                <td className={`${REPORT_TD} border-b border-[#f1ebe4] text-center font-semibold tabular-nums text-heading group-hover:bg-[#fffaf5]`}>
                                  {formatPercent(r.totals.percent)}
                                  {r.totals.scale && <span className="ml-1 text-[10px] font-medium text-subtle">{r.totals.scale}</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      );
                    })}
                  </table>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#ece3d8] px-3 py-2 text-[11px] text-subtle">
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Completed</span>
                <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> In progress</span>
                <span>— Not started</span>
                <span>N/A Not set for the student&apos;s batch</span>
              </div>
            </div>
          )}
        </div>
      )}

      <PrintPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        snapshot={printSnapshot}
        blocks={printBlocks}
        letterhead={letterhead}
        initialFormat={initialFormat}
        meta={printMeta}
        fields={printFields}
        defaultEnabled={printDefaults}
        filenameBase={`${fileSafe(`${courseName}-Batch-Report`)}-${new Date().toISOString().slice(0, 10)}`}
        noFillerRows
      />
    </div>
  );
}
