"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX, ChevronLeft, ChevronRight, CircleSlash, Clock, Search, UserCheck, UserX, Users, X } from "lucide-react";
import DataTable, { type Column } from "@/app/lms/shared/listing/DataTable";
import TableFooter from "@/app/lms/shared/listing/TableFooter";
import { StatusPill } from "@/app/lms/shared/ui";
import { MappingMultiFilter } from "@/app/lms/pages/servicemapping/components/MappingReportFilters";
import {
    useAttendanceRecordsQuery,
    useCourseBatchGroupsQuery,
} from "@/app/lms/pages/attendancemanagement/queries/attendance";
import { OverviewTiles, type OverviewTile } from "@/app/lms/shared/listing/OverviewTiles";
import { useAutoFitPageSize } from "@/app/lms/shared/listing/useAutoFitPageSize";
import {
    MARK, clampYmd, fmtDate, isWeekendYmd, shiftYmd, todayYmd, weekdayOf,
    type CourseRow, type MarkStatus,
} from "./lib";

/* A course's Attendance tab — the day's register, read-only. Pick a date,
 * see every enrolled student and what they were marked. The tiles count the
 * day and filter the table; marks themselves are entered by trainers in
 * Attendance Management. */

type TileKey = "all" | MarkStatus;

type RegisterRow = {
    key: string;
    studentId: string;
    name: string;
    userId: string;
    email: string;
    batchId: string;
    batch: string;
    status: MarkStatus;
    remarks: string;
};

type DayRecord = { studentId: string; batchId: string; status: "P" | "A" | "H"; reason: string; halfPeriod: string };

export default function CourseAttendanceRegister({ course }: { course: CourseRow }) {
    const today = todayYmd();
    // Course window bounds the picker: nothing before training starts, and
    // nothing after today (or after training ended).
    const minDay = course.start || undefined;
    const maxDay = course.end && course.end < today ? course.end : today;
    const [day, setDay] = useState(() => clampYmd(today, minDay, maxDay));
    const [tile, setTile] = useState<TileKey>("all");
    const [search, setSearch] = useState("");
    const [batchFilter, setBatchFilter] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const { cardRef, footerRef, pageSize, setManual } = useAutoFitPageSize();

    const roster = useCourseBatchGroupsQuery(course.id);
    const records = useAttendanceRecordsQuery(course.id, day, day);

    const dayRecords = useMemo<DayRecord[]>(
        () => (records.data ?? []).map((r) => {
            const raw = r as unknown as { batchId?: unknown; halfPeriod?: string };
            return {
                studentId: String(r.studentId),
                batchId: raw.batchId ? String(raw.batchId) : "",
                status: r.status,
                reason: r.reason || "",
                halfPeriod: raw.halfPeriod || "",
            };
        }),
        [records.data],
    );

    const allRows = useMemo<RegisterRow[]>(() => {
        const byStudent = new Map<string, DayRecord[]>();
        for (const r of dayRecords) byStudent.set(r.studentId, [...(byStudent.get(r.studentId) || []), r]);
        const out: RegisterRow[] = [];
        for (const batch of roster.data ?? []) {
            for (const s of batch.students) {
                const sid = String(s._id);
                const mine = byStudent.get(sid) || [];
                // The mark taken under THIS batch; a legacy mark (no batch)
                // or the only mark the student has stands in otherwise.
                const rec = mine.find((r) => r.batchId === batch.id) || mine.find((r) => !r.batchId) || (mine.length === 1 ? mine[0] : undefined);
                const half = rec?.status === "H" && rec.halfPeriod ? (rec.halfPeriod === "first" ? "First half" : "Second half") : "";
                out.push({
                    key: `${batch.id}:${sid}`,
                    studentId: sid,
                    name: `${s.firstName} ${s.lastName}`.trim() || s.email || "Student",
                    userId: s.userId || "",
                    email: s.email || "",
                    batchId: batch.id,
                    batch: batch.name,
                    status: rec ? rec.status : "N",
                    remarks: [half, rec?.reason || ""].filter(Boolean).join(" · "),
                });
            }
        }
        return out.sort((a, b) => a.batch.localeCompare(b.batch) || a.name.localeCompare(b.name));
    }, [roster.data, dayRecords]);

    const batchOptions = useMemo(
        () => (roster.data ?? []).map((b) => ({ value: b.id, label: b.name })),
        [roster.data],
    );
    const showBatch = course.hasRealBatches;

    const scoped = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allRows.filter((r) => {
            if (batchFilter.length && !batchFilter.includes(r.batchId)) return false;
            if (q && !`${r.name} ${r.userId} ${r.email}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [allRows, batchFilter, search]);

    const counts = useMemo(() => {
        const c = { all: scoped.length, P: 0, A: 0, H: 0, N: 0 } as Record<TileKey, number>;
        for (const r of scoped) c[r.status] += 1;
        return c;
    }, [scoped]);

    const rows = useMemo(() => (tile === "all" ? scoped : scoped.filter((r) => r.status === tile)), [scoped, tile]);

    useEffect(() => { setPage(1); }, [day, tile, search, batchFilter]);

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const loading = roster.isLoading || records.isLoading;
    const nothingMarked = !loading && dayRecords.length === 0;
    const hasFilters = Boolean(search.trim() || batchFilter.length || tile !== "all");
    const clearFilters = () => { setSearch(""); setBatchFilter([]); setTile("all"); };

    const tiles: OverviewTile<TileKey>[] = [
        { key: "all", label: "Students", value: loading ? undefined : counts.all, icon: Users, chip: "bg-brand-wash text-brand-strong", tint: "#fff4e9", tintOn: "#ffe7d2", ring: "#c2540f" },
        { key: "P", label: "Present", value: loading ? undefined : counts.P, icon: UserCheck, chip: "bg-emerald-50 text-emerald-600", tint: "#e6f7f0", tintOn: "#d0efe2", ring: "#059669" },
        { key: "A", label: "Absent", value: loading ? undefined : counts.A, icon: UserX, chip: "bg-red-50 text-red-600", tint: "#fdeeee", tintOn: "#fadada", ring: "#dc2626" },
        { key: "H", label: "Half day", value: loading ? undefined : counts.H, icon: Clock, chip: "bg-amber-50 text-amber-600", tint: "#fff7e6", tintOn: "#feecc7", ring: "#d97706" },
        { key: "N", label: "Not marked", value: loading ? undefined : counts.N, icon: CircleSlash, chip: "bg-ink-100 text-subtle", tint: "#f3f4f6", tintOn: "#e5e7eb", ring: "#6b7280" },
    ];

    const columns: Column<RegisterRow>[] = [
        {
            key: "num", label: "#",
            className: "w-[5%] pl-4 pr-2 text-left text-xs text-faint tabular-nums align-middle whitespace-nowrap",
            skeletonWidth: "20px",
            render: (_r, i) => (currentPage - 1) * pageSize + i + 1,
        },
        {
            key: "name", label: "Student Name",
            className: "w-[22%] px-3 text-left align-middle",
            skeletonWidth: "80%",
            render: (r) => <span className="block truncate font-medium text-heading" title={r.name}>{r.name}</span>,
        },
        {
            key: "userId", label: "Student ID",
            className: "w-[12%] px-3 text-left align-middle whitespace-nowrap",
            render: (r) => r.userId
                ? <span className="inline-flex max-w-full items-center truncate rounded-chip bg-ink-50 px-2 py-0.5 font-mono text-[11px] font-medium text-heading" title={r.userId}>{r.userId}</span>
                : <span className="text-faint">—</span>,
        },
        {
            key: "email", label: "Email",
            className: `${showBatch ? "w-[21%]" : "w-[29%]"} px-3 text-left align-middle`,
            render: (r) => r.email ? <span className="block truncate text-subtle" title={r.email}>{r.email}</span> : <span className="text-faint">—</span>,
        },
        ...(showBatch ? [{
            key: "batch", label: "Batch",
            className: "w-[14%] px-3 text-left align-middle",
            render: (r: RegisterRow) => <span className="block truncate text-body" title={r.batch}>{r.batch}</span>,
        }] : []),
        {
            key: "status", label: "Status",
            className: "w-[12%] px-3 text-left align-middle",
            render: (r) => <StatusPill tone={MARK[r.status].tone} dot>{MARK[r.status].label}</StatusPill>,
        },
        {
            key: "remarks", label: "Remarks",
            className: `${showBatch ? "w-[14%]" : "w-[20%]"} px-3 text-left align-middle`,
            render: (r) => r.remarks ? <span className="block truncate text-subtle" title={r.remarks}>{r.remarks}</span> : <span className="text-faint">—</span>,
        },
    ];

    // Why a day has no register, in the reader's terms.
    const emptyReason = course.status === "upcoming"
        ? `Training starts on ${fmtDate(course.start)}.`
        : isWeekendYmd(day)
            ? `${weekdayOf(day)} — no class was marked on this day.`
            : "Trainers haven’t marked attendance for this day yet.";

    const canPrev = !minDay || day > minDay;
    const canNext = day < maxDay;

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* ── Date + filters ── */}
            <div className="no-print flex min-w-0 shrink-0 flex-wrap items-center gap-2">
                <div className="inline-flex h-8 shrink-0 items-center overflow-hidden rounded-control border border-hairline-strong bg-surface">
                    <button type="button" aria-label="Previous day" disabled={!canPrev} onClick={() => setDay((d) => shiftYmd(d, -1))} className="inline-flex h-full w-8 items-center justify-center text-subtle hover:bg-row-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-40">
                        <ChevronLeft size={14} />
                    </button>
                    <input
                        type="date"
                        aria-label="Attendance date"
                        value={day}
                        min={minDay}
                        max={maxDay}
                        onChange={(e) => e.target.value && setDay(clampYmd(e.target.value, minDay, maxDay))}
                        className="h-full border-x border-hairline bg-transparent px-2 text-xs font-medium text-heading tabular-nums outline-none"
                    />
                    <button type="button" aria-label="Next day" disabled={!canNext} onClick={() => setDay((d) => shiftYmd(d, 1))} className="inline-flex h-full w-8 items-center justify-center text-subtle hover:bg-row-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-40">
                        <ChevronRight size={14} />
                    </button>
                </div>
                <span className="shrink-0 text-xs font-medium text-subtle">{weekdayOf(day)}</span>
                {day !== maxDay && (
                    <button type="button" onClick={() => setDay(maxDay)} className="inline-flex h-8 shrink-0 items-center rounded-control border border-hairline-strong bg-surface px-2.5 text-xs font-medium text-body hover:bg-row-hover">
                        {maxDay === today ? "Today" : "Last day"}
                    </button>
                )}

                <div className="relative ml-auto min-w-0 basis-full sm:basis-[240px] sm:flex-initial">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search student, ID, email…"
                        aria-label="Search students"
                        className="h-8 w-full rounded-control border border-hairline-strong bg-surface pl-8 pr-8 text-xs text-body placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                    {search && (
                        <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-chip text-faint hover:bg-ink-100 hover:text-heading">
                            <X size={12} />
                        </button>
                    )}
                </div>
                {showBatch && batchOptions.length > 1 && (
                    <div className="w-full min-w-0 sm:w-[180px]">
                        <MappingMultiFilter label="Batches" options={batchOptions} value={batchFilter} onChange={setBatchFilter} placeholder="All batches" />
                    </div>
                )}
                {hasFilters && (
                    <button type="button" onClick={clearFilters} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2 text-xs font-medium text-subtle hover:bg-row-hover hover:text-heading">
                        <X className="size-3.5" /> Clear all
                    </button>
                )}
            </div>

            <div className="mt-3">
                <OverviewTiles tiles={tiles} active={tile} allKey="all" onSelect={setTile} ariaLabel="Day summary — filter the register" />
            </div>

            {/* ── Register ── */}
            <div ref={cardRef} aria-busy={loading} className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
                {roster.isError || records.isError ? (
                    <div role="alert" className="flex flex-1 items-center justify-center py-8 text-sm text-subtle">
                        Couldn’t load this register. Please try again.
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col">
                        <DataTable
                            rows={nothingMarked ? [] : pageRows}
                            columns={columns}
                            rowKey={(r) => r.key}
                            sortKey={null}
                            sortDir="asc"
                            onSort={() => {}}
                            isLoading={loading}
                            isFiltered={hasFilters}
                            fixedLayout
                            fillHeight
                            emptyTitle={allRows.length === 0 ? "No students enrolled" : "No students match these filters"}
                            emptyHint={allRows.length === 0 ? "Enrol students in this course to see them here." : "Try widening or clearing them to see more."}
                            emptyAction={hasFilters && allRows.length > 0 ? "Clear filters" : undefined}
                            onEmptyAction={hasFilters && allRows.length > 0 ? clearFilters : undefined}
                            emptyState={nothingMarked && allRows.length > 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                                    <span className="mb-1 flex size-11 items-center justify-center rounded-tile bg-ink-100 text-subtle">
                                        <CalendarX className="size-5" aria-hidden />
                                    </span>
                                    <p className="text-sm font-semibold text-heading">No attendance marked on {fmtDate(day)}</p>
                                    <p className="max-w-sm text-xs leading-5 text-subtle">{emptyReason}{course.status === "upcoming" ? "" : " Pick another date to see its register."}</p>
                                </div>
                            ) : undefined}
                        />
                    </div>
                )}
                <div ref={footerRef} className="no-print min-h-11 border-t border-hairline">
                    <TableFooter
                        from={nothingMarked || rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                        to={nothingMarked ? 0 : Math.min(currentPage * pageSize, rows.length)}
                        total={nothingMarked ? 0 : rows.length}
                        pageSize={pageSize}
                        onPageSize={(n) => { setManual(n); setPage(1); }}
                        currentPage={currentPage}
                        totalPages={nothingMarked ? 1 : totalPages}
                        onPage={setPage}
                        isLoading={loading}
                    />
                </div>
            </div>
        </div>
    );
}
