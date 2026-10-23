"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Report — the course's Report tab, laid out like Service Mapping's
// report: pick Date / Batch / Students / Status, press Generate Report, and the
// stats + student list appear; Preview Report opens the shared Preview & Print
// sheet (Reg No · Student · Phase · Batch, Phase and Batch merged). Nothing
// loads until Generate.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, type ReactNode } from "react";
import { Poppins } from "next/font/google";
import {
    AlertTriangle,
    CalendarDays,
    Circle,
    Clock,
    Loader2,
    TrendingUp,
    Users,
    UserX,
    UserCheck,
} from "lucide-react";
import {
    StatCard,
    bandOf,
    type StatusFilter,
} from "@/app/lms/pages/attendancemanagement/features/attendanceReportShared";
import { useAttendanceReport } from "@/app/lms/pages/attendancemanagement/features/useAttendanceReport";
import { createReportExports } from "@/app/lms/pages/attendancemanagement/features/attendanceReportExports";
import AttendanceReportTable from "@/app/lms/pages/attendancemanagement/features/AttendanceReportTable";
import AttendanceReportCharts, { AttendanceReportInsights } from "@/app/lms/pages/attendancemanagement/features/AttendanceReportCharts";
import AttendanceReportStudentSelect from "@/app/lms/pages/attendancemanagement/features/AttendanceReportStudentSelect";
import {
    attendanceFilterWords,
    attendancePrintBlocks,
    attendancePrintDefaults,
    attendancePrintFields,
} from "@/app/lms/pages/attendancemanagement/features/attendanceReportPrint";
import { MappingMultiFilter } from "@/app/lms/pages/servicemapping/components/MappingReportFilters";
import { PrintPreviewModal } from "@/app/lms/pages/businessreports/components/PrintPreviewModal";
import { usePrintSetup } from "@/app/lms/pages/courses/courseReport/usePrintSetup";
import {
    REPORT_FIELD,
    ReportActionRow,
    ReportEmptyState,
    ReportNoMatches,
    useNextStepNudge,
} from "@/app/lms/shared/report/reportKit";
import { phaseOrdinal } from "@/lib/phaseGroups";

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

const FIELD_BOX = "h-9 rounded-[10px] border border-[#e7ddd1] bg-surface shadow-xs";

// ── Component ──────────────────────────────────────────────────────────────
export default function AttendanceReportPage() {
    const report = useAttendanceReport();
    const {
        courseId, todayKey, course,
        pendingMode, setPendingMode, pendingDate, setPendingDate, pendingFrom, setPendingFrom, pendingTo, setPendingTo,
        pendingStudent, setPendingStudent, pendingStatus, setPendingStatus,
        batchGroups, pendingBatches, setPendingBatches, generated, pickerStudents,
        filteredStudents, studentsLoading, summaryLoading,
        workingDays, workingDayList, totals, totalStudents,
        applyFilters, resetFilters,
    } = report;
    const exports = createReportExports(report);

    // ── Batch options — "Batch I (Phase III)", phases in order ───────────
    const phased = batchGroups.some((g) => g.phase);
    const batchLabel = (id: string) => {
        const g = batchGroups.find((b) => b.id === id);
        if (!g) return "Batch";
        return g.phase ? `${g.name} (${g.phase})` : g.name;
    };
    const batchOptions = useMemo(
        () => [...batchGroups]
            .sort((a, b) =>
                phaseOrdinal(a.phase) - phaseOrdinal(b.phase) ||
                a.phase.localeCompare(b.phase) ||
                a.name.localeCompare(b.name, undefined, { numeric: true }))
            .map((g) => ({ value: g.id, label: g.phase ? `${g.name} (${g.phase})` : g.name })),
        [batchGroups]
    );

    // ── Generate / Reset, and the "Preview next" glow ────────────────────
    const draft = useMemo(
        () => ({ pendingMode, pendingDate, pendingFrom, pendingTo, pendingStudent, pendingStatus, pendingBatches }),
        [pendingMode, pendingDate, pendingFrom, pendingTo, pendingStudent, pendingStatus, pendingBatches]
    );
    const nudge = useNextStepNudge(draft);
    const generate = () => {
        applyFilters();
        nudge.markGenerated(draft);
    };
    const reset = () => {
        resetFilters();
        nudge.clear();
    };
    const draftTouched =
        pendingMode !== "single" || pendingDate !== todayKey || pendingStudent !== "all" ||
        pendingStatus !== "all" || pendingBatches.length > 0;

    // ── Preview & Print ──────────────────────────────────────────────────
    const { letterhead, initialFormat } = usePrintSetup();
    const [printOpen, setPrintOpen] = useState(false);
    const openPreview = () => {
        nudge.markSeen();
        setPrintOpen(true);
    };
    const printFields = useMemo(() => attendancePrintFields(workingDayList), [workingDayList]);
    const printDefaults = useMemo(() => attendancePrintDefaults(workingDayList, phased), [workingDayList, phased]);
    const printBlocks = useMemo(
        () => (printOpen ? attendancePrintBlocks(report, phased) : []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [printOpen, filteredStudents, report.grid, workingDays, phased]
    );
    const printMeta = useMemo(() => ({
        title: "Attendance Report",
        scope: course?.courseName || "Course",
        generated: new Date().toLocaleString(),
        filters: attendanceFilterWords(report, batchLabel),
        ...letterhead,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [printOpen, course?.courseName, letterhead]);
    const printSnapshot = useMemo(
        () => ({ draft: {}, rows: [], generated: printMeta.generated }),
        [printMeta.generated]
    );
    const fileBase = `attendance-${(course?.courseCode || course?.courseName || "course").replace(/[^\w-]+/g, "-")}-${report.appliedFrom}${report.appliedTo !== report.appliedFrom ? `_${report.appliedTo}` : ""}`;

    // ── Render ───────────────────────────────────────────────────────────
    if (!courseId) {
        return (
            <div className="p-8 text-center text-sm text-gray-600">
                No course selected.{" "}
                <a href="/lms/pages/attendancemanagement" className="text-indigo-600 hover:underline">
                    Go back
                </a>.
            </div>
        );
    }

    const loading = generated && (studentsLoading || summaryLoading);
    const hasRows = generated && !loading && filteredStudents.length > 0;

    return (
        <div className={`${poppins.className} h-full overflow-y-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-4`}>
            {/* Filters — one row, each named on its border */}
            <div className="rounded-xl border border-hairline bg-surface px-3 pb-2.5 pt-3.5 shadow-xs">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3.5">
                    <BorderLabel label={pendingMode === "single" ? "Date" : "Date range"} className="min-w-[260px] flex-[2_1_300px]">
                        <div className={`${FIELD_BOX} flex items-center gap-2 pl-1 pr-2`}>
                            <div className="inline-flex shrink-0 rounded-[7px] bg-canvas p-0.5" role="tablist" aria-label="Date mode">
                                {(["single", "range"] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        role="tab"
                                        aria-selected={pendingMode === mode}
                                        onClick={() => setPendingMode(mode)}
                                        className={`h-7 rounded-[6px] px-2.5 text-[11px] font-semibold transition-colors ${pendingMode === mode
                                            ? "bg-surface text-brand-strong shadow-xs"
                                            : "text-subtle hover:text-heading"}`}
                                    >
                                        {mode === "single" ? "Day" : "Range"}
                                    </button>
                                ))}
                            </div>
                            {pendingMode === "single" ? (
                                <input
                                    type="date"
                                    value={pendingDate}
                                    max={todayKey}
                                    onChange={(e) => e.target.value && setPendingDate(e.target.value)}
                                    className="min-w-0 flex-1 bg-transparent text-xs text-body outline-none"
                                />
                            ) : (
                                <>
                                    <input
                                        type="date"
                                        value={pendingFrom}
                                        max={todayKey}
                                        onChange={(e) => e.target.value && setPendingFrom(e.target.value)}
                                        className="min-w-0 flex-1 bg-transparent text-xs text-body outline-none"
                                        title="Start date"
                                    />
                                    <span className="shrink-0 text-faint">–</span>
                                    <input
                                        type="date"
                                        value={pendingTo}
                                        max={todayKey}
                                        onChange={(e) => e.target.value && setPendingTo(e.target.value)}
                                        className="min-w-0 flex-1 bg-transparent text-xs text-body outline-none"
                                        title="End date"
                                    />
                                </>
                            )}
                        </div>
                    </BorderLabel>
                    {batchOptions.length > 0 && (
                        <BorderLabel label="Batch" className={`${REPORT_FIELD} flex-[1_1_170px] sm:max-w-[240px]`}>
                            <MappingMultiFilter
                                label="Batches"
                                options={batchOptions}
                                value={pendingBatches}
                                onChange={setPendingBatches}
                                placeholder="All batches"
                            />
                        </BorderLabel>
                    )}
                    <BorderLabel
                        label="Students"
                        className="min-w-0 flex-[1_1_190px] sm:max-w-[260px] [&>div>button]:h-9 [&>div>button]:rounded-[10px] [&>div>button]:border-[#e7ddd1] [&>div>button]:text-xs [&>div>button]:shadow-xs"
                    >
                        <AttendanceReportStudentSelect
                            students={pickerStudents}
                            value={pendingStudent}
                            onChange={setPendingStudent}
                        />
                    </BorderLabel>
                    <BorderLabel label="Status" className="min-w-0 flex-[1_1_140px] sm:max-w-[180px]">
                        <select
                            value={pendingStatus}
                            onChange={(e) => setPendingStatus(e.target.value as StatusFilter)}
                            className={`${FIELD_BOX} w-full px-2.5 text-xs text-body outline-none focus:border-brand-400`}
                        >
                            <option value="all">All statuses</option>
                            <option value="P">Present</option>
                            <option value="A">Absent</option>
                            <option value="H">Half-day</option>
                            <option value="N">Not marked</option>
                        </select>
                    </BorderLabel>
                </div>

                <ReportActionRow
                    onReset={reset}
                    resetDisabled={!draftTouched && !generated}
                    onPreview={openPreview}
                    previewDisabled={!hasRows}
                    nudge={hasRows && nudge.isFresh && !nudge.seen}
                    onGenerate={generate}
                    generateDisabled={studentsLoading}
                    loading={loading}
                />
            </div>

            {!generated ? (
                <ReportEmptyState />
            ) : loading ? (
                <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-subtle">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating the report…
                </div>
            ) : filteredStudents.length === 0 ? (
                <ReportNoMatches />
            ) : (
                <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                            iconBg="bg-indigo-50 text-indigo-600"
                            icon={<Users className="h-5 w-5" />}
                            label="Total Students"
                            value={String(totalStudents)}
                        />
                        <StatCard
                            iconBg="bg-violet-50 text-violet-600"
                            icon={<CalendarDays className="h-5 w-5" />}
                            label="Total Working Days"
                            value={String(workingDays)}
                            sub="(excl. weekends)"
                        />
                        <StatCard
                            iconBg="bg-emerald-50 text-emerald-600"
                            icon={<TrendingUp className="h-5 w-5" />}
                            label="Class Average"
                            value={`${totals.avgAttendance.toFixed(2)}%`}
                            sub={bandOf(totals.avgAttendance).label}
                        />
                        <StatCard
                            iconBg="bg-rose-50 text-rose-600"
                            icon={<AlertTriangle className="h-5 w-5" />}
                            label="At Risk (< 75%)"
                            value={String(totals.atRisk)}
                            sub={totals.atRisk === 1 ? "student" : "students"}
                        />
                        <StatCard
                            iconBg="bg-emerald-50 text-emerald-600"
                            icon={<UserCheck className="h-5 w-5" />}
                            label="Present"
                            value={String(totals.P)}
                            sub={`(${totals.pPct.toFixed(2)}%)`}
                        />
                        <StatCard
                            iconBg="bg-red-50 text-red-600"
                            icon={<UserX className="h-5 w-5" />}
                            label="Absent"
                            value={String(totals.A)}
                            sub={`(${totals.aPct.toFixed(2)}%)`}
                        />
                        <StatCard
                            iconBg="bg-amber-50 text-amber-600"
                            icon={<Clock className="h-5 w-5" />}
                            label="Half-day"
                            value={String(totals.H)}
                            sub={`(${totals.hPct.toFixed(2)}%)`}
                        />
                        <StatCard
                            iconBg="bg-gray-100 text-gray-500"
                            icon={<Circle className="h-5 w-5" />}
                            label="Not Marked"
                            value={String(totals.N)}
                            sub={`(${totals.nPct.toFixed(2)}%)`}
                        />
                    </div>

                    {/* The student list — Daily / Summary, with its own Excel / PDF */}
                    <AttendanceReportTable
                        {...report}
                        loading={loading}
                        onExcel={exports.handleExcel}
                        onSummaryPdf={exports.handlePdf}
                        onSummaryPrint={openPreview}
                    />

                    <AttendanceReportCharts {...report} />
                    <AttendanceReportInsights {...report} />
                </>
            )}

            <PrintPreviewModal
                open={printOpen}
                onClose={() => setPrintOpen(false)}
                snapshot={printSnapshot}
                blocks={printBlocks}
                letterhead={letterhead}
                initialFormat={initialFormat}
                meta={printMeta}
                fields={printFields}
                defaultEnabled={printDefaults}
                filenameBase={fileBase}
                keepBlocksTogether
                noFillerRows
                serialPerRow
            />
        </div>
    );
}

/** A field named on its top border (the Course Report's filter style). */
function BorderLabel({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
    return (
        <div className={`relative ${className || ""}`}>
            {children}
            <span className="pointer-events-none absolute -top-[7px] left-2.5 z-[1] bg-surface px-1 text-[10.5px] font-medium leading-[14px] text-subtle">
                {label}
            </span>
        </div>
    );
}
