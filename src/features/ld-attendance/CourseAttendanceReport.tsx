"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, CalendarDays, Layers, UsersRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { MappingMultiFilter } from "@/app/lms/pages/servicemapping/components/MappingReportFilters";
import { attendanceApi } from "@/app/lms/pages/attendancemanagement/api/attendanceApi";
import { useCourseBatchGroupsQuery } from "@/app/lms/pages/attendancemanagement/queries/attendance";
import { BANDS } from "@/app/lms/pages/attendancemanagement/features/attendanceReportShared";
import {
    activeFormat, fetchReportSettings, newFormat,
    type ReportFormat, type ReportSettings,
} from "@/app/lms/pages/reportsettings/api/reportSettingsService";
import { BRAND_FALLBACK } from "@/app/lms/pages/reportsettings/api/brand";
import { fetchInstitutionById } from "@/app/lms/pages/instutionmanagement/api/institutionService";
import type { ReportClientBlock } from "@/app/lms/pages/servicemapping/components/serviceReport";
import { PrintPreviewModal, type FieldRow } from "@/app/lms/pages/businessreports/components/PrintPreviewModal";
import {
    FilterLabel, REPORT_FIELD, REPORT_ROW_HOVER, REPORT_TABLE_CARD, REPORT_TD, REPORT_TH, REPORT_WRAP,
    ReportActionRow, ReportEmptyState, ReportHeading, ReportNoMatches, ReportPager, ReportShowingRow,
    chipLabel, reportRowRule, useNextStepNudge, usePaged, type ReportChip,
} from "@/app/lms/shared/report/reportKit";
import { attendancePct, bandOf, clampYmd, fmtDate, fmtPct, monthStartOf, todayYmd, type CourseRow } from "./lib";

/* A course's Report tab — Course Management ▸ Report / Client Management ▸
 * Reports, for attendance. Choose the period and who to cover, Generate,
 * review the table, then Preview Report opens the shared print modal
 * (letterhead, field picker, layout, Print / PDF / Excel).
 *
 * Nothing loads until Generate is pressed. The filters are a draft; the table
 * is a snapshot of the draft at generate time, so editing a filter afterwards
 * cannot silently disagree with the table on screen. An empty picker means
 * "everyone". */

type Draft = {
    from: string;
    to: string;
    batches: string[];
    students: string[];
    bands: string[];
};

type ReportRow = {
    key: string;
    studentId: string;
    name: string;
    userId: string;
    email: string;
    batch: string;
    workingDays: number;
    p: number;
    a: number;
    h: number;
    n: number;
    pct: number;
    bandKey: string;
};

type ChipKey = "period" | "batches" | "students" | "bands";

/* Every column the printed sheet can carry. All per-student ("service"
 * scope), so the sheet is one row and one S. No. per student. */
const ATT_FIELDS: FieldRow[] = [
    { key: "studentName", label: "Student Name", required: true, scope: "service", column: "Student Name", dataKey: "studentName" },
    { key: "studentId", label: "Student ID", scope: "service", column: "Student ID", dataKey: "studentId" },
    { key: "email", label: "Email", scope: "service", column: "Email", dataKey: "email" },
    { key: "batch", label: "Batch", scope: "service", column: "Batch", dataKey: "batch" },
    { key: "workingDays", label: "Working Days", scope: "service", column: "Working Days", dataKey: "workingDays" },
    { key: "present", label: "Present", scope: "service", column: "Present", dataKey: "present" },
    { key: "absent", label: "Absent", scope: "service", column: "Absent", dataKey: "absent" },
    { key: "halfDay", label: "Half-day", scope: "service", column: "Half-day", dataKey: "halfDay" },
    { key: "notMarked", label: "Not Marked", scope: "service", column: "Not Marked", dataKey: "notMarked" },
    { key: "attendance", label: "Attendance %", scope: "service", column: "Attendance %", dataKey: "attendance" },
    { key: "band", label: "Attendance Level", scope: "service", column: "Level", dataKey: "band" },
];
const DEFAULT_WITH_BATCH = new Set(["studentName", "batch", "workingDays", "present", "absent", "halfDay", "notMarked", "attendance", "band"]);
const DEFAULT_NO_BATCH = new Set(["studentName", "studentId", "workingDays", "present", "absent", "halfDay", "notMarked", "attendance", "band"]);

const BAND_OPTIONS = BANDS.map((b) => ({ value: b.key, label: `${b.label} (${b.range})` }));
const bandLabel = (key: string) => BANDS.find((b) => b.key === key)?.label || key;

const DATE_INPUT = "h-9 w-full rounded-[10px] border border-[#e7ddd1] bg-surface px-3 text-xs text-heading tabular-nums shadow-xs outline-none transition-colors hover:border-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand/15";

export default function CourseAttendanceReport({ course }: { course: CourseRow }) {
    const queryClient = useQueryClient();
    const today = todayYmd();
    const minDay = course.start || undefined;
    const maxDay = course.end && course.end < today ? course.end : today;

    // The whole training period so far — what "attendance report" means
    // when nobody narrows it.
    const defaults = useMemo<Draft>(() => ({
        from: course.start ? clampYmd(course.start, undefined, maxDay) : monthStartOf(maxDay),
        to: maxDay,
        batches: [], students: [], bands: [],
    }), [course.start, maxDay]);

    const [draft, setDraft] = useState<Draft>(defaults);
    const { isFresh, seen: nudgeSeen, markGenerated, markSeen, clear: clearGenerated } = useNextStepNudge(draft);
    const [snapshot, setSnapshot] = useState<{ draft: Draft; rows: ReportRow[]; workingDays: number; generated: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [printOpen, setPrintOpen] = useState(false);
    const runId = useRef(0);

    const roster = useCourseBatchGroupsQuery(course.id);
    const showBatch = course.hasRealBatches;

    /* Letterhead + the saved report design (System Settings ▸ Report
     * Settings), fetched once — the same pattern Client Management's
     * Reports uses. A failure just means the built-in layout. */
    const [reportSettings, setReportSettings] = useState<ReportSettings | undefined>();
    const [letterhead, setLetterhead] = useState<{ org: string; address: string; contact: string }>(BRAND_FALLBACK);
    useEffect(() => {
        const institutionId = typeof window === "undefined" ? null : localStorage.getItem("smartcliff_institution");
        if (!institutionId) return;
        let cancelled = false;
        fetchReportSettings(institutionId)
            .then((settings) => { if (!cancelled) setReportSettings(settings); })
            .catch(() => { /* plain layout */ });
        fetchInstitutionById(institutionId)
            .then((inst) => {
                if (cancelled) return;
                setLetterhead({
                    org: inst?.inst_name?.trim() || BRAND_FALLBACK.org,
                    address: inst?.address?.trim() || "",
                    contact: inst?.phone?.trim() || "",
                });
            })
            .catch(() => { /* fallback wording */ });
        return () => { cancelled = true; };
    }, []);
    const initialFormat: ReportFormat = useMemo(
        () => activeFormat(reportSettings) ?? newFormat("Report layout", false),
        [reportSettings],
    );

    /* ── Options ── */
    const batchOptions = useMemo(
        () => (roster.data ?? []).map((b) => ({ value: b.id, label: b.name })),
        [roster.data],
    );
    // Students follow the batch pick, so the list never offers someone the
    // report would then drop.
    const studentOptions = useMemo(() => {
        const seen = new Map<string, string>();
        for (const b of roster.data ?? []) {
            if (draft.batches.length && !draft.batches.includes(b.id)) continue;
            for (const s of b.students) {
                const name = `${s.firstName} ${s.lastName}`.trim() || s.email || "Student";
                if (!seen.has(String(s._id))) seen.set(String(s._id), s.userId ? `${name} (${s.userId})` : name);
            }
        }
        return [...seen].map(([value, label]) => ({ value, label })).sort((x, y) => x.label.localeCompare(y.label));
    }, [roster.data, draft.batches]);

    const setBatches = (batches: string[]) => setDraft((d) => {
        if (!batches.length) return { ...d, batches };
        // Drop picked students who are not in any of the picked batches.
        const allowed = new Set((roster.data ?? []).filter((b) => batches.includes(b.id)).flatMap((b) => b.students.map((s) => String(s._id))));
        return { ...d, batches, students: d.students.filter((id) => allowed.has(id)) };
    });

    /* ── Generate ── */
    const generate = useCallback(async (source?: Draft) => {
        const asked = { ...(source ?? draft) };
        if (asked.from > asked.to) [asked.from, asked.to] = [asked.to, asked.from];
        // Typed dates can step outside the pickers' min/max — hold the period
        // to the course window so the working-day count means the course's.
        asked.from = clampYmd(asked.from, minDay, maxDay);
        asked.to = clampYmd(asked.to, minDay, maxDay);
        const groups = roster.data ?? [];
        const run = ++runId.current;
        setLoading(true);
        setError("");
        try {
            const rosterIds = [...new Set(groups.flatMap((b) => b.students.map((s) => String(s._id))))];
            if (!rosterIds.length) {
                setSnapshot({ draft: asked, rows: [], workingDays: 0, generated: new Date().toLocaleString() });
                markGenerated(source ?? draft);
                return;
            }
            const scope = {
                ...(asked.batches.length === 1 ? { batchId: asked.batches[0] } : {}),
                studentIds: rosterIds,
            };
            const summary = await queryClient.fetchQuery({
                queryKey: queryKeys.attendance.summary(course.id, asked.from, asked.to, scope),
                queryFn: () => attendanceApi.summary(course.id, asked.from, asked.to, scope),
                staleTime: 2 * 60 * 1000,
            });
            if (run !== runId.current) return;

            const tally = new Map(summary.students.map((t) => [t.studentId, t]));
            const wd = summary.workingDays;
            // One row per student; a student in two picked batches is one
            // row naming both (their marks are counted once).
            const byStudent = new Map<string, ReportRow>();
            for (const b of groups) {
                if (asked.batches.length && !asked.batches.includes(b.id)) continue;
                for (const s of b.students) {
                    const sid = String(s._id);
                    if (asked.students.length && !asked.students.includes(sid)) continue;
                    const existing = byStudent.get(sid);
                    if (existing) { existing.batch = `${existing.batch}, ${b.name}`; continue; }
                    const t = tally.get(sid) || { p: 0, a: 0, h: 0 };
                    const pct = attendancePct(t.p, t.h, wd);
                    byStudent.set(sid, {
                        key: sid,
                        studentId: sid,
                        name: `${s.firstName} ${s.lastName}`.trim() || s.email || "Student",
                        userId: s.userId || "",
                        email: s.email || "",
                        batch: b.name,
                        workingDays: wd,
                        p: t.p, a: t.a, h: t.h,
                        n: Math.max(0, wd - (t.p + t.a + t.h)),
                        pct: Math.round(pct * 10) / 10,
                        bandKey: bandOf(pct).key,
                    });
                }
            }
            const rows = [...byStudent.values()]
                .filter((r) => !asked.bands.length || asked.bands.includes(r.bandKey))
                .sort((x, y) => x.batch.localeCompare(y.batch) || x.name.localeCompare(y.name));
            setSnapshot({ draft: asked, rows, workingDays: wd, generated: new Date().toLocaleString() });
            markGenerated(source ?? draft);
        } catch (e) {
            if (run === runId.current) setError(e instanceof Error && e.message ? e.message : "Could not build the report. Please try again.");
        } finally {
            if (run === runId.current) setLoading(false);
        }
    }, [draft, roster.data, queryClient, course.id, markGenerated, minDay, maxDay]);

    const reset = () => {
        runId.current += 1;
        setDraft(defaults);
        setSnapshot(null);
        clearGenerated();
        setError("");
        setLoading(false);
    };
    const isDefaultDraft = draft.from === defaults.from && draft.to === defaults.to
        && !draft.batches.length && !draft.students.length && !draft.bands.length;

    /* ── Snapshot → chips, filter line, print blocks ── */
    const batchName = useMemo(() => new Map(batchOptions.map((o) => [o.value, o.label])), [batchOptions]);
    // How many students the snapshot's batch pick could have covered — a
    // student list holding all of them is "All Students", not a filter.
    const eligibleStudents = (batches: string[]) => new Set((roster.data ?? [])
        .filter((b) => !batches.length || batches.includes(b.id))
        .flatMap((b) => b.students.map((s) => String(s._id)))).size;
    const studentName = useMemo(() => {
        const m = new Map<string, string>();
        for (const b of roster.data ?? []) for (const s of b.students) m.set(String(s._id), `${s.firstName} ${s.lastName}`.trim() || s.email);
        return m;
    }, [roster.data]);

    const showingChips = useMemo((): ReportChip<ChipKey>[] => {
        if (!snapshot) return [];
        const asked = snapshot.draft;
        const chips: ReportChip<ChipKey>[] = [
            { key: "period", title: "Period", narrowed: false, label: `${fmtDate(asked.from)} – ${fmtDate(asked.to)}` },
        ];
        if (showBatch) {
            const nb = asked.batches.length > 0 && asked.batches.length < batchOptions.length;
            chips.push({ key: "batches", title: "Batch", narrowed: nb, label: chipLabel(asked.batches.map((id) => batchName.get(id) || id), nb, "All Batches") });
        }
        const ns = asked.students.length > 0 && asked.students.length < eligibleStudents(asked.batches);
        chips.push({ key: "students", title: "Student", narrowed: ns, label: chipLabel(asked.students.map((id) => studentName.get(id) || id), ns, "All Students") });
        const nl = asked.bands.length > 0 && asked.bands.length < BANDS.length;
        chips.push({ key: "bands", title: "Attendance Level", narrowed: nl, label: chipLabel(asked.bands.map(bandLabel), nl, "All Attendance Levels") });
        return chips;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- eligibleStudents reads roster.data, listed via studentName
    }, [snapshot, showBatch, batchOptions.length, batchName, studentName]);

    const clearFilter = (key: ChipKey) => {
        if (!snapshot || key === "period") return;
        const next: Draft = { ...snapshot.draft, [key]: [] };
        setDraft(next);
        void generate(next);
    };

    // What the sheet was narrowed to, in words. Empty when nothing was.
    const filterSummary = useMemo(() => {
        if (!snapshot) return "";
        const asked = snapshot.draft;
        const parts: string[] = [];
        const describe = (label: string, values: string[]) => {
            if (!values.length) return;
            parts.push(values.length <= 4 ? `${label}: ${values.join(", ")}` : `${label}: ${values.slice(0, 3).join(", ")} +${values.length - 3} more`);
        };
        if (showBatch && asked.batches.length < batchOptions.length) describe("Batch", asked.batches.map((id) => batchName.get(id) || id));
        if (asked.students.length < eligibleStudents(asked.batches)) describe("Student", asked.students.map((id) => studentName.get(id) || id));
        if (asked.bands.length < BANDS.length) describe("Attendance Level", asked.bands.map(bandLabel));
        return parts.length ? `Filtered by  ·  ${parts.join("  ·  ")}` : "";
        // eslint-disable-next-line react-hooks/exhaustive-deps -- eligibleStudents reads roster.data, listed via studentName
    }, [snapshot, showBatch, batchOptions.length, batchName, studentName]);

    const blocks = useMemo<ReportClientBlock[]>(() => (snapshot?.rows ?? []).map((r) => ({
        client: r.name,
        business: r.batch,
        clientExtras: {},
        services: [{
            studentName: r.name,
            studentId: r.userId || "—",
            email: r.email || "—",
            batch: r.batch || "—",
            workingDays: String(r.workingDays),
            present: String(r.p),
            absent: String(r.a),
            halfDay: String(r.h),
            notMarked: String(r.n),
            attendance: fmtPct(r.pct),
            band: bandLabel(r.bandKey),
            generatedDate: snapshot?.generated ?? "",
        }],
    })), [snapshot]);

    const classAverage = useMemo(() => {
        const rows = snapshot?.rows ?? [];
        return rows.length ? Math.round((rows.reduce((s, r) => s + r.pct, 0) / rows.length) * 10) / 10 : 0;
    }, [snapshot]);

    const printMeta = useMemo(() => ({
        title: "Attendance report",
        scope: snapshot
            ? `${course.name}${course.code ? ` (${course.code})` : ""}  ·  ${fmtDate(snapshot.draft.from)} – ${fmtDate(snapshot.draft.to)}  ·  ${snapshot.rows.length} student${snapshot.rows.length === 1 ? "" : "s"}`
            : "",
        generated: snapshot?.generated ?? "",
        filters: filterSummary,
        ...letterhead,
    }), [snapshot, course.name, course.code, filterSummary, letterhead]);

    const filenameBase = snapshot
        ? `attendance-report-${(course.code || course.name).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${snapshot.draft.from}-to-${snapshot.draft.to}`
        : undefined;

    const paged = usePaged(snapshot?.rows ?? NO_ROWS);
    const nudge = isFresh && Boolean(snapshot?.rows.length) && !nudgeSeen;

    if (course.status === "upcoming") {
        return (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#e7ddd1] p-6 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-tile bg-brand-wash">
                    <CalendarDays className="size-5 text-brand-strong" aria-hidden />
                </div>
                <h2 className="text-sm font-semibold text-heading">Training hasn’t started yet</h2>
                <p className="mt-1 max-w-sm text-xs leading-5 text-subtle">
                    This course starts on <span className="font-semibold text-heading">{fmtDate(course.start)}</span>. Its attendance report can be generated once classes begin.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 flex-col">
                    {/* ── Heading + scope form ── */}
                    <div className="no-print shrink-0">
                        <ReportHeading />

                        <div className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${showBatch ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
                            <div className="min-w-0">
                                <FilterLabel icon={CalendarDays} tone="text-violet-500">From date</FilterLabel>
                                <input type="date" aria-label="From date" value={draft.from} min={minDay} max={maxDay}
                                    onChange={(e) => e.target.value && setDraft((d) => ({ ...d, from: e.target.value }))}
                                    className={DATE_INPUT} />
                            </div>
                            <div className="min-w-0">
                                <FilterLabel icon={CalendarDays} tone="text-violet-500">To date</FilterLabel>
                                <input type="date" aria-label="To date" value={draft.to} min={minDay} max={maxDay}
                                    onChange={(e) => e.target.value && setDraft((d) => ({ ...d, to: e.target.value }))}
                                    className={DATE_INPUT} />
                            </div>
                            {showBatch && (
                                <div className={REPORT_FIELD}>
                                    <FilterLabel icon={Layers} tone="text-brand-500">Batch</FilterLabel>
                                    <MappingMultiFilter label="Batches" options={batchOptions} value={draft.batches} onChange={setBatches} placeholder="All batches" />
                                </div>
                            )}
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={UsersRound} tone="text-emerald-500">Student</FilterLabel>
                                <MappingMultiFilter label="Students" options={studentOptions} value={draft.students}
                                    onChange={(students) => setDraft((d) => ({ ...d, students }))} placeholder="All students"
                                    emptyLabel={roster.isLoading ? "Loading students…" : "No students enrolled"} />
                            </div>
                            <div className={REPORT_FIELD}>
                                <FilterLabel icon={Activity} tone="text-pink-500">Attendance Level</FilterLabel>
                                <MappingMultiFilter label="Attendance levels" options={BAND_OPTIONS} value={draft.bands}
                                    onChange={(bands) => setDraft((d) => ({ ...d, bands }))} placeholder="All levels" />
                            </div>
                        </div>

                        <ReportActionRow
                            onReset={reset}
                            resetDisabled={loading || (isDefaultDraft && !snapshot)}
                            onPreview={() => { markSeen(); setPrintOpen(true); }}
                            previewDisabled={!snapshot || !snapshot.rows.length}
                            nudge={nudge}
                            onGenerate={() => void generate()}
                            generateDisabled={loading || roster.isLoading}
                            loading={loading}
                        />
                    </div>

                    {/* ── The report ── */}
                    <div className="mt-4 flex min-h-0 flex-1 flex-col">
                        {error && (
                            <div role="alert" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-50 p-3 text-sm text-danger-700">
                                {error}
                                <Button variant="outline" size="sm" className="text-xs" onClick={() => void generate()}>Retry</Button>
                            </div>
                        )}

                        {!snapshot && !loading && !error && <ReportEmptyState />}

                        {loading && !snapshot && (
                            <div role="status" aria-label="Generating report" className="space-y-3">
                                {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-ink-100" />)}
                            </div>
                        )}

                        {snapshot && (
                            <div className={`flex min-h-0 flex-1 flex-col transition-opacity ${loading ? "opacity-50" : ""}`}>
                                <div className="flex flex-wrap items-start justify-between gap-x-4">
                                    <ReportShowingRow chips={showingChips} onRemove={clearFilter} loading={loading} />
                                    {snapshot.rows.length > 0 && (
                                        <p className="mb-3 text-xs text-subtle">
                                            <b className="font-semibold text-heading tabular-nums">{snapshot.workingDays}</b> working days
                                            <span className="mx-1.5 text-faint">·</span>
                                            Class average <b className="font-semibold text-heading tabular-nums">{fmtPct(classAverage)}</b>
                                        </p>
                                    )}
                                </div>

                                {!snapshot.rows.length ? <ReportNoMatches /> : (
                                    <div className={REPORT_TABLE_CARD}>
                                        <div className="min-h-0 flex-1 overflow-auto">
                                            <table className="w-full table-fixed border-collapse text-xs">
                                                <colgroup>
                                                    <col style={{ width: "6%" }} />
                                                    <col style={{ width: showBatch ? "20%" : "33%" }} />
                                                    {showBatch && <col style={{ width: "13%" }} />}
                                                    <col style={{ width: "10%" }} />
                                                    <col style={{ width: "8%" }} />
                                                    <col style={{ width: "8%" }} />
                                                    <col style={{ width: "8%" }} />
                                                    <col style={{ width: "9%" }} />
                                                    <col style={{ width: "9%" }} />
                                                    <col style={{ width: "9%" }} />
                                                </colgroup>
                                                <thead>
                                                    <tr>
                                                        <th className={`${REPORT_TH} border-r text-center`}>S. No.</th>
                                                        <th className={`${REPORT_TH} border-r text-left`}>Student Name</th>
                                                        {showBatch && <th className={`${REPORT_TH} border-r text-left`}>Batch</th>}
                                                        <th className={`${REPORT_TH} border-r text-center`}>Working Days</th>
                                                        <th className={`${REPORT_TH} border-r text-center`}>Present</th>
                                                        <th className={`${REPORT_TH} border-r text-center`}>Absent</th>
                                                        <th className={`${REPORT_TH} border-r text-center`}>Half-day</th>
                                                        <th className={`${REPORT_TH} border-r text-center`}>Not Marked</th>
                                                        <th className={`${REPORT_TH} border-r text-center`}>Attendance %</th>
                                                        <th className={`${REPORT_TH} text-left`}>Level</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paged.items.map((r, idx) => {
                                                        const band = BANDS.find((b) => b.key === r.bandKey) ?? BANDS[BANDS.length - 1];
                                                        return (
                                                            <tr key={r.key} className={`${reportRowRule(false)} ${REPORT_ROW_HOVER}`}>
                                                                <td className={`${REPORT_TD} text-center tabular-nums text-subtle`}>{paged.start + idx + 1}</td>
                                                                <td className={`${REPORT_TD} text-heading`} style={REPORT_WRAP}>
                                                                    <span className="block font-medium">{r.name}</span>
                                                                    {r.userId && <span className="block text-[11px] text-subtle">{r.userId}</span>}
                                                                </td>
                                                                {showBatch && <td className={`${REPORT_TD} text-body`} style={REPORT_WRAP}>{r.batch}</td>}
                                                                <td className={`${REPORT_TD} text-center tabular-nums text-body`}>{r.workingDays}</td>
                                                                <td className={`${REPORT_TD} text-center tabular-nums text-body`}>{r.p}</td>
                                                                <td className={`${REPORT_TD} text-center tabular-nums text-body`}>{r.a}</td>
                                                                <td className={`${REPORT_TD} text-center tabular-nums text-body`}>{r.h}</td>
                                                                <td className={`${REPORT_TD} text-center tabular-nums text-body`}>{r.n}</td>
                                                                <td className={`${REPORT_TD} text-center font-semibold tabular-nums text-heading`}>{fmtPct(r.pct)}</td>
                                                                {/* Plain coloured text, not a badge — Excellent /
                                                                    Good / Average / Poor / Critical. */}
                                                                <td className="px-3 py-2.5 align-middle" title={`${band.label}: ${band.range} attendance`}>
                                                                    <span className={`inline-flex items-center gap-1.5 font-semibold ${band.text}`}>
                                                                        <span className={`size-1.5 shrink-0 rounded-full ${band.dot}`} aria-hidden />
                                                                        {band.label}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        <ReportPager paged={paged} noun="students" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Preview & print — the shared modal Client Management's
                Reports, Course Setup ▸ Report and Users ▸ Report use. ── */}
            <PrintPreviewModal
                open={printOpen}
                onClose={() => setPrintOpen(false)}
                snapshot={snapshot ? { draft: snapshot.draft, rows: [], generated: snapshot.generated } : null}
                blocks={blocks}
                letterhead={letterhead}
                initialFormat={initialFormat}
                meta={printMeta}
                fields={ATT_FIELDS}
                defaultEnabled={showBatch ? DEFAULT_WITH_BATCH : DEFAULT_NO_BATCH}
                filenameBase={filenameBase}
            />
        </>
    );
}

const NO_ROWS: ReportRow[] = [];
