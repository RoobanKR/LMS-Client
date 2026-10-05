"use client";

import { useEffect, useMemo, useState } from "react";
import {
    BookOpen, CalendarCheck, CalendarClock, CircleAlert, Eye, FileText, Layers, MoreVertical, Search, X,
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import DataTable, { type Column, type SortDir } from "@/app/lms/shared/listing/DataTable";
import TableFooter from "@/app/lms/shared/listing/TableFooter";
import { StatusPill } from "@/app/lms/shared/ui";
import { MappingMultiFilter } from "@/app/lms/pages/servicemapping/components/MappingReportFilters";
import { OverviewTiles, type OverviewTile } from "@/app/lms/shared/listing/OverviewTiles";
import { useAutoFitPageSize } from "@/app/lms/shared/listing/useAutoFitPageSize";
import { COURSE_STATUS, TODAY_STATE, fmtDate, type CourseRow, type CourseStatus } from "./lib";

/* The L&D console's Attendance list — one row per scheduled course, laid out
 * like Client Management: overview tiles that double as filters, a toolbar
 * (search · client · status · columns), a sortable table and a pager.
 * Opening a row goes to that course's Attendance / Report page. */

type TileKey = "all" | "ongoing" | "marked" | "pending";
export type CourseTab = "attendance" | "report";

const ICON_BUTTON_CLASS =
    "w-8 h-8 rounded-lg border border-transparent bg-transparent text-subtle flex items-center " +
    "justify-center hover:text-heading hover:border-hairline hover:bg-row-hover " +
    "data-[state=open]:bg-row-hover data-[state=open]:border-hairline data-[state=open]:text-heading " +
    "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30";
const ACTION_ITEM_CLASS = "min-h-9 gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer [&_svg]:size-4 [&_svg]:stroke-[1.6]";

const DEFAULT_COLUMNS = ["num", "code", "name", "client", "batches", "students", "period", "status", "today", "actions"];
const ALL_COLUMNS: Array<{ key: string; label: string; alwaysOn?: boolean }> = [
    { key: "num", label: "#", alwaysOn: true },
    { key: "code", label: "Course Code" },
    { key: "name", label: "Course Name", alwaysOn: true },
    { key: "client", label: "Client" },
    { key: "category", label: "Category" },
    { key: "serviceModel", label: "Service Model" },
    { key: "batches", label: "Batches" },
    { key: "students", label: "Students" },
    { key: "period", label: "Training Period" },
    { key: "status", label: "Status" },
    { key: "today", label: "Today's Attendance" },
    { key: "actions", label: "Actions", alwaysOn: true },
];

const STATUS_ORDER: Record<CourseStatus, number> = { ongoing: 0, upcoming: 1, completed: 2 };
const TODAY_ORDER = { pending: 0, partial: 1, marked: 2, na: 3 } as const;

const STATUS_OPTIONS = (Object.keys(COURSE_STATUS) as CourseStatus[]).map((value) => ({ value, label: COURSE_STATUS[value].label }));

export default function AttendanceCourseList({ rows, loading, error, onRetry, onOpen, initialClients }: {
    rows: CourseRow[] | undefined;
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    onOpen: (row: CourseRow, tab: CourseTab) => void;
    /** The console's client scope, when one is chosen — the list opens narrowed to it. */
    initialClients: string[];
}) {
    const all = useMemo(() => rows ?? [], [rows]);

    const [tile, setTile] = useState<TileKey>("all");
    const [search, setSearch] = useState("");
    const [clientFilter, setClientFilter] = useState<string[]>(initialClients);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [page, setPage] = useState(1);
    const { cardRef, footerRef, pageSize, setManual } = useAutoFitPageSize();

    const clientOptions = useMemo(
        () => [...new Set(all.map((r) => r.client).filter(Boolean))].sort().map((c) => ({ value: c, label: c })),
        [all],
    );

    // Counts for the tiles follow every filter except the tile itself, so a
    // tile always says how many rows clicking it would leave.
    const toolbarFiltered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return all.filter((r) => {
            if (clientFilter.length && !clientFilter.includes(r.client)) return false;
            if (statusFilter.length && !statusFilter.includes(r.status)) return false;
            if (q && !`${r.name} ${r.code} ${r.client}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [all, search, clientFilter, statusFilter]);

    const counts = useMemo(() => ({
        all: toolbarFiltered.length,
        ongoing: toolbarFiltered.filter((r) => r.status === "ongoing").length,
        marked: toolbarFiltered.filter((r) => r.today === "marked").length,
        pending: toolbarFiltered.filter((r) => r.today === "pending" || r.today === "partial").length,
    }), [toolbarFiltered]);

    const filtered = useMemo(() => {
        const list = toolbarFiltered.filter((r) => {
            if (tile === "ongoing") return r.status === "ongoing";
            if (tile === "marked") return r.today === "marked";
            if (tile === "pending") return r.today === "pending" || r.today === "partial";
            return true;
        });
        const dir = sortDir === "asc" ? 1 : -1;
        const by = (a: CourseRow, b: CourseRow): number => {
            switch (sortKey) {
                case "code": return a.code.localeCompare(b.code, undefined, { numeric: true }) * dir;
                case "name": return a.name.localeCompare(b.name) * dir;
                case "client": return a.client.localeCompare(b.client) * dir;
                case "students": return (a.students - b.students) * dir;
                case "batches": return (a.totalBatches - b.totalBatches) * dir;
                case "start": return a.start.localeCompare(b.start) * dir;
                case "status": return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
                case "today": return (TODAY_ORDER[a.today] - TODAY_ORDER[b.today]) * dir;
                default:
                    // Running courses first, the ones still waiting on today's
                    // marks at the top of those — that is the list's job.
                    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
                        || TODAY_ORDER[a.today] - TODAY_ORDER[b.today]
                        || a.name.localeCompare(b.name);
            }
        };
        return [...list].sort(by);
    }, [toolbarFiltered, tile, sortKey, sortDir]);

    const hasActiveFilters = Boolean(search.trim() || clientFilter.length || statusFilter.length || tile !== "all");
    const clearFilters = () => { setSearch(""); setClientFilter([]); setStatusFilter([]); setTile("all"); };

    useEffect(() => { setPage(1); }, [search, clientFilter, statusFilter, tile, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    };

    const columnsDirty = visibleColumns.length !== DEFAULT_COLUMNS.length || visibleColumns.some((k) => !DEFAULT_COLUMNS.includes(k));
    const toggleColumn = (key: string) => setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

    const columns: Column<CourseRow>[] = [
        {
            key: "num", label: "#",
            className: "w-[4%] pl-4 pr-2 text-left text-xs text-faint tabular-nums align-middle whitespace-nowrap",
            skeletonWidth: "20px",
            render: (_r, i) => (currentPage - 1) * pageSize + i + 1,
        },
        {
            key: "code", label: "Course Code", sortKey: "code",
            className: "w-[11%] px-3 text-left align-middle whitespace-nowrap",
            render: (r) => r.code
                ? <span className="inline-flex max-w-full items-center truncate rounded-chip bg-ink-50 px-2 py-0.5 font-mono text-[11px] font-medium text-heading tabular-nums" title={r.code}>{r.code}</span>
                : <span className="text-faint">—</span>,
        },
        {
            key: "name", label: "Course Name", sortKey: "name",
            className: "w-[18%] px-3 text-left align-middle",
            skeletonWidth: "80%",
            render: (r) => <span className="block truncate font-medium text-heading" title={r.name}>{r.name}</span>,
        },
        {
            key: "client", label: "Client", sortKey: "client",
            className: "w-[13%] px-3 text-left align-middle",
            render: (r) => r.client
                ? <span className="block truncate text-body" title={r.client}>{r.client}</span>
                : <span className="text-faint">—</span>,
        },
        {
            key: "category", label: "Category",
            className: "w-[11%] px-3 text-left align-middle",
            render: (r) => r.category ? <span className="block truncate text-subtle" title={r.category}>{r.category}</span> : <span className="text-faint">—</span>,
        },
        {
            key: "serviceModel", label: "Service Model",
            className: "w-[11%] px-3 text-left align-middle",
            render: (r) => r.serviceModel ? <span className="block truncate text-subtle" title={r.serviceModel}>{r.serviceModel}</span> : <span className="text-faint">—</span>,
        },
        {
            key: "batches", label: "Batches", sortKey: "batches",
            className: "w-[7%] px-3 text-left align-middle tabular-nums",
            render: (r) => r.hasRealBatches
                ? <span className="text-body" title={r.batches.map((b) => b.name).join(", ")}>{r.totalBatches}</span>
                : <span className="text-faint" title="This course has no separate batches">—</span>,
        },
        {
            key: "students", label: "Students", sortKey: "students",
            className: "w-[8%] px-3 text-left align-middle tabular-nums",
            render: (r) => <span className={r.students ? "text-body" : "text-faint"}>{r.students}</span>,
        },
        {
            key: "period", label: "Training Period", sortKey: "start",
            className: "w-[14%] px-3 text-left align-middle",
            render: (r) => (
                <span className="block truncate text-xs tabular-nums text-subtle" title={`${fmtDate(r.start)}${r.end ? ` – ${fmtDate(r.end)}` : ""}`}>
                    {r.start ? fmtDate(r.start) : "—"}
                    {r.end ? <span className="text-faint"> – </span> : null}
                    {r.end ? fmtDate(r.end) : null}
                </span>
            ),
        },
        {
            key: "status", label: "Status", sortKey: "status",
            className: "w-[9%] px-3 text-left align-middle",
            render: (r) => <StatusPill tone={COURSE_STATUS[r.status].tone} dot>{COURSE_STATUS[r.status].label}</StatusPill>,
        },
        {
            key: "today", label: "Today's Attendance", sortKey: "today",
            className: "w-[11%] px-3 text-left align-middle",
            render: (r) => {
                const t = TODAY_STATE[r.today];
                if (r.today === "na") return <span className="text-faint" title={r.status === "ongoing" ? "Weekend — no class today" : "Not running today"}>—</span>;
                const detail = r.hasRealBatches && r.today === "partial" ? ` (${r.markedBatches}/${r.totalBatches})` : "";
                return (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${t.text}`} title={r.hasRealBatches ? `${r.markedBatches} of ${r.totalBatches} batches marked today` : undefined}>
                        <span className={`size-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden />
                        {t.label}{detail}
                    </span>
                );
            },
        },
        {
            key: "actions", label: "Actions",
            className: "no-print w-[5%] pl-2 pr-2 text-right whitespace-nowrap align-middle",
            skeletonWidth: "20px",
            render: (r) => (
                // Clicks and keys inside the menu (it portals, but React
                // still bubbles through here) must not reach the row's own
                // open-on-click handler.
                <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" title="More actions" aria-label={`Actions for ${r.name}`} className={ICON_BUTTON_CLASS}>
                                <MoreVertical size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4} collisionPadding={8} className="w-52 rounded-2xl border border-hairline bg-surface p-1.5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25),0_2px_8px_rgba(15,23,42,0.06)]">
                            <DropdownMenuItem onSelect={() => onOpen(r, "attendance")} className={ACTION_ITEM_CLASS}>
                                <Eye /> View attendance
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onOpen(r, "report")} className={ACTION_ITEM_CLASS}>
                                <FileText /> Generate report
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];
    const visibleColumnDefs = columns.filter((c) => visibleColumns.includes(c.key));

    const tiles: OverviewTile<TileKey>[] = [
        { key: "all", label: "Total courses", value: rows ? counts.all : undefined, icon: BookOpen, chip: "bg-brand-wash text-brand-strong", tint: "#fff4e9", tintOn: "#ffe7d2", ring: "#c2540f" },
        { key: "ongoing", label: "Ongoing", value: rows ? counts.ongoing : undefined, icon: CalendarClock, chip: "bg-blue-50 text-blue-600", tint: "#edf5ff", tintOn: "#dbeafe", ring: "#2563eb" },
        { key: "marked", label: "Marked today", value: rows ? counts.marked : undefined, icon: CalendarCheck, chip: "bg-emerald-50 text-emerald-600", tint: "#e6f7f0", tintOn: "#d0efe2", ring: "#059669" },
        { key: "pending", label: "Pending today", value: rows ? counts.pending : undefined, icon: CircleAlert, chip: "bg-red-50 text-red-600", tint: "#fdeeee", tintOn: "#fadada", ring: "#dc2626" },
    ];

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <OverviewTiles tiles={tiles} active={tile} allKey="all" onSelect={setTile} ariaLabel="Attendance overview — filter the courses" />

            {/* ── Toolbar: Search · Client · Status · Columns ── */}
            <div className="no-print mt-3 flex min-w-0 shrink-0 flex-wrap items-center gap-2">
                <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-[220px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search course, code, client…"
                        aria-label="Search courses"
                        className="h-8 w-full rounded-control border border-hairline-strong bg-surface pl-8 pr-8 text-xs text-body transition-colors duration-150 placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                    {search && (
                        <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-chip text-faint hover:bg-ink-100 hover:text-heading">
                            <X size={12} />
                        </button>
                    )}
                </div>
                <div className="w-full min-w-0 sm:w-[190px]">
                    <MappingMultiFilter label="Clients" options={clientOptions} value={clientFilter} onChange={setClientFilter} placeholder="All clients" />
                </div>
                <div className="w-full min-w-0 sm:w-[170px]">
                    <MappingMultiFilter label="Statuses" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} placeholder="All statuses" />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button type="button" title="Show or hide table columns" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-hairline-strong bg-surface px-2.5 text-xs font-medium text-body hover:bg-row-hover focus:outline-none focus:ring-2 focus:ring-brand/15">
                            <Layers className="size-3.5" />
                            Columns
                            {columnsDirty && (
                                <span className="ml-0.5 inline-flex items-center rounded-full bg-brand-strong px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white">{visibleColumns.length}</span>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} collisionPadding={8} className="w-60 rounded-2xl border border-hairline bg-surface p-1.5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25),0_2px_8px_rgba(15,23,42,0.06)]">
                        <DropdownMenuLabel className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-faint">Visible columns</DropdownMenuLabel>
                        <DropdownMenuSeparator className="mx-1 my-1" />
                        <div className="max-h-80 overflow-y-auto">
                            {ALL_COLUMNS.map(({ key, label, alwaysOn }) => (
                                <label key={key} className={`flex min-h-8 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium text-body hover:bg-row-hover ${alwaysOn ? "cursor-not-allowed opacity-60" : ""}`}>
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns.includes(key)}
                                        disabled={alwaysOn}
                                        onChange={() => toggleColumn(key)}
                                        className="size-3.5 shrink-0 cursor-pointer rounded border-hairline-strong accent-brand-strong disabled:cursor-not-allowed"
                                    />
                                    <span className="truncate">{label}</span>
                                </label>
                            ))}
                        </div>
                        {columnsDirty && (
                            <>
                                <DropdownMenuSeparator className="mx-1 my-1" />
                                <button type="button" onClick={() => setVisibleColumns(DEFAULT_COLUMNS)} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-strong hover:bg-brand-wash">
                                    Reset to default
                                </button>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {hasActiveFilters && (
                    <span role="status" title={`${filtered.length} of ${all.length} courses match the current filters`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-brand-500/30 bg-brand-wash px-2.5 text-xs font-semibold text-brand-strong">
                        <span className="tabular-nums">{filtered.length.toLocaleString()}</span>
                        <span className="font-medium opacity-80">of {all.length.toLocaleString()}</span>
                    </span>
                )}
                {hasActiveFilters && (
                    <button type="button" onClick={clearFilters} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2 text-xs font-medium text-subtle hover:bg-row-hover hover:text-heading">
                        <X className="size-3.5" /> Clear all
                    </button>
                )}
            </div>

            {/* ── Table ── */}
            <div ref={cardRef} aria-busy={loading} className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
                {error ? (
                    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-sm text-subtle">
                        <p>Couldn’t load attendance. Please try again.</p>
                        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
                        <DataTable
                            rows={pageRows}
                            columns={visibleColumnDefs}
                            rowKey={(r) => r.id}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                            isLoading={loading}
                            isFiltered={hasActiveFilters}
                            fixedLayout={!columnsDirty}
                            fillHeight
                            onRowClick={(r) => onOpen(r, "attendance")}
                            emptyTitle={hasActiveFilters ? "No courses match these filters" : "No scheduled courses yet"}
                            emptyHint={hasActiveFilters
                                ? "Try widening or clearing them to see more."
                                : "A course appears here once its Program Calendar is set up."}
                            emptyAction={hasActiveFilters ? "Clear filters" : undefined}
                            onEmptyAction={hasActiveFilters ? clearFilters : undefined}
                            minWidth={visibleColumns.length * 130}
                        />
                    </div>
                )}
                <div ref={footerRef} className="no-print min-h-11 border-t border-hairline">
                    <TableFooter
                        from={filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                        to={Math.min(currentPage * pageSize, filtered.length)}
                        total={filtered.length}
                        pageSize={pageSize}
                        onPageSize={(n) => { setManual(n); setPage(1); }}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPage={setPage}
                        isLoading={loading}
                    />
                </div>
            </div>
        </div>
    );
}
