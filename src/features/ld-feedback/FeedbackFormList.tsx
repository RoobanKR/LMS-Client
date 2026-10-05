"use client";

import { useEffect, useMemo, useState } from "react";
import {
    CircleAlert, ClipboardList, Eye, FileText, Layers, Lock, MessageSquare, MoreVertical, Search, SlidersHorizontal, X,
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import DataTable, { type Column, type SortDir } from "@/app/lms/shared/listing/DataTable";
import TableFooter from "@/app/lms/shared/listing/TableFooter";
import { OverviewTiles, type OverviewTile } from "@/app/lms/shared/listing/OverviewTiles";
import { useAutoFitPageSize } from "@/app/lms/shared/listing/useAutoFitPageSize";
import { StatusPill } from "@/app/lms/shared/ui";
import { MappingMultiFilter } from "@/app/lms/pages/servicemapping/components/MappingReportFilters";
import { FORM_STATUS, RATING_LEVEL, fmtDate, type FeedbackRow, type FormStatus } from "./lib";

/* The L&D console's Feedback list — one row per feedback form, laid out like
 * Client Management: overview tiles that double as filters, a toolbar
 * (search · client · course · trainer · status · columns), a sortable table
 * and a pager. Opening a row goes to that form's Feedback / Report page;
 * "Detailed report" pools the listed forms in the cross-form designer. */

type TileKey = "all" | "open" | "closed" | "low";
export type FormTab = "feedback" | "report";

const ICON_BUTTON_CLASS =
    "w-8 h-8 rounded-lg border border-transparent bg-transparent text-subtle flex items-center " +
    "justify-center hover:text-heading hover:border-hairline hover:bg-row-hover " +
    "data-[state=open]:bg-row-hover data-[state=open]:border-hairline data-[state=open]:text-heading " +
    "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30";
const ACTION_ITEM_CLASS = "min-h-9 gap-3 rounded-lg px-3 py-2 text-xs font-medium cursor-pointer [&_svg]:size-4 [&_svg]:stroke-[1.6]";
const MENU_CLASS = "rounded-2xl border border-hairline bg-surface p-1.5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.25),0_2px_8px_rgba(15,23,42,0.06)]";

const DEFAULT_COLUMNS = ["num", "title", "course", "client", "batch", "trainer", "responses", "avg", "level", "status", "actions"];
const ALL_COLUMNS: Array<{ key: string; label: string; alwaysOn?: boolean }> = [
    { key: "num", label: "#", alwaysOn: true },
    { key: "title", label: "Feedback Form", alwaysOn: true },
    { key: "course", label: "Course" },
    { key: "client", label: "Client" },
    { key: "batch", label: "Batch" },
    { key: "trainer", label: "Trainer" },
    { key: "responses", label: "Responses" },
    { key: "rate", label: "Response Rate" },
    { key: "avg", label: "Avg Rating" },
    { key: "level", label: "Rating Level" },
    { key: "window", label: "Feedback Window" },
    { key: "status", label: "Status" },
    { key: "actions", label: "Actions", alwaysOn: true },
];

const STATUS_ORDER: Record<FormStatus, number> = { open: 0, upcoming: 1, closed: 2 };
const STATUS_OPTIONS = (Object.keys(FORM_STATUS) as FormStatus[]).map((value) => ({ value, label: FORM_STATUS[value].label }));
const isLow = (r: FeedbackRow) => r.avg != null && r.avg > 0 && r.avg < 3;

export default function FeedbackFormList({ rows, loading, error, onRetry, onOpen, onDetailedReport, initialClients, initialCourses }: {
    rows: FeedbackRow[] | undefined;
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    onOpen: (row: FeedbackRow, tab: FormTab) => void;
    /** The listed forms (after every filter) and a words-version of the scope. */
    onDetailedReport: (rows: FeedbackRow[], scopeLabel: string) => void;
    /** The console's client / course scope, when one is chosen — the list opens narrowed to it. */
    initialClients: string[];
    initialCourses: string[];
}) {
    const all = useMemo(() => rows ?? [], [rows]);

    const [tile, setTile] = useState<TileKey>("all");
    const [search, setSearch] = useState("");
    const [clientFilter, setClientFilter] = useState<string[]>(initialClients);
    const [courseFilter, setCourseFilter] = useState<string[]>(initialCourses);
    const [trainerFilter, setTrainerFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [page, setPage] = useState(1);
    const { cardRef, footerRef, pageSize, setManual } = useAutoFitPageSize();

    /* ── Options — each picker offers only what the pickers before it leave ── */
    const inClients = (r: FeedbackRow) => !clientFilter.length || clientFilter.includes(r.client);
    const inCourses = (r: FeedbackRow) => !courseFilter.length || courseFilter.includes(r.courseId);
    const clientOptions = useMemo(
        () => [...new Set(all.map((r) => r.client).filter(Boolean))].sort().map((c) => ({ value: c, label: c })),
        [all],
    );
    const courseOptions = useMemo(() => {
        const byId = new Map<string, { name: string; client: string }>();
        for (const r of all) if (inClients(r) && r.courseId && !byId.has(r.courseId)) byId.set(r.courseId, { name: r.course, client: r.client });
        // Course names repeat across clients — name the client when they do.
        const counts = new Map<string, number>();
        byId.forEach((c) => counts.set(c.name, (counts.get(c.name) || 0) + 1));
        return [...byId].map(([value, c]) => ({ value, label: (counts.get(c.name) || 0) > 1 ? `${c.name} · ${c.client}` : c.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- inClients reads clientFilter
    }, [all, clientFilter]);
    const trainerOptions = useMemo(
        () => [...new Set(all.filter((r) => inClients(r) && inCourses(r)).map((r) => r.trainer).filter(Boolean))].sort().map((t) => ({ value: t, label: t })),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- inClients / inCourses read the two filters
        [all, clientFilter, courseFilter],
    );

    // Narrowing a picker drops any pick the next one can no longer offer.
    const changeClients = (next: string[]) => {
        setClientFilter(next);
        const okCourse = new Set(all.filter((r) => !next.length || next.includes(r.client)).map((r) => r.courseId));
        const courses = courseFilter.filter((c) => okCourse.has(c));
        setCourseFilter(courses);
        const okTrainer = new Set(all.filter((r) => (!next.length || next.includes(r.client)) && (!courses.length || courses.includes(r.courseId))).map((r) => r.trainer));
        setTrainerFilter((t) => t.filter((x) => okTrainer.has(x)));
    };
    const changeCourses = (next: string[]) => {
        setCourseFilter(next);
        const okTrainer = new Set(all.filter((r) => inClients(r) && (!next.length || next.includes(r.courseId))).map((r) => r.trainer));
        setTrainerFilter((t) => t.filter((x) => okTrainer.has(x)));
    };

    // Tile counts follow every filter except the tile itself, so a tile
    // always says how many rows clicking it would leave.
    const toolbarFiltered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return all.filter((r) => {
            if (clientFilter.length && !clientFilter.includes(r.client)) return false;
            if (courseFilter.length && !courseFilter.includes(r.courseId)) return false;
            if (trainerFilter.length && !trainerFilter.includes(r.trainer)) return false;
            if (statusFilter.length && !statusFilter.includes(r.status)) return false;
            if (q && !`${r.title} ${r.course} ${r.client} ${r.batch} ${r.trainer}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [all, search, clientFilter, courseFilter, trainerFilter, statusFilter]);

    const counts = useMemo(() => ({
        all: toolbarFiltered.length,
        open: toolbarFiltered.filter((r) => r.status === "open").length,
        closed: toolbarFiltered.filter((r) => r.status === "closed").length,
        low: toolbarFiltered.filter(isLow).length,
    }), [toolbarFiltered]);

    const filtered = useMemo(() => {
        const list = toolbarFiltered.filter((r) => {
            if (tile === "open") return r.status === "open";
            if (tile === "closed") return r.status === "closed";
            if (tile === "low") return isLow(r);
            return true;
        });
        const dir = sortDir === "asc" ? 1 : -1;
        const num = (v: number | null) => (v == null ? -1 : v);
        const by = (a: FeedbackRow, b: FeedbackRow): number => {
            switch (sortKey) {
                case "title": return a.title.localeCompare(b.title) * dir;
                case "course": return a.course.localeCompare(b.course) * dir;
                case "client": return a.client.localeCompare(b.client) * dir;
                case "batch": return a.batch.localeCompare(b.batch, undefined, { numeric: true }) * dir;
                case "trainer": return a.trainer.localeCompare(b.trainer) * dir;
                case "responses": return (a.responses - b.responses) * dir;
                case "rate": return (num(a.rate) - num(b.rate)) * dir;
                case "avg": return (num(a.avg) - num(b.avg)) * dir;
                case "window": return (a.startT - b.startT) * dir;
                case "status": return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
                default:
                    // Open forms first, then upcoming, then closed — newest first within each.
                    return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.startT - a.startT || a.title.localeCompare(b.title);
            }
        };
        return [...list].sort(by);
    }, [toolbarFiltered, tile, sortKey, sortDir]);

    const hasActiveFilters = Boolean(search.trim() || clientFilter.length || courseFilter.length || trainerFilter.length || statusFilter.length || tile !== "all");
    const clearFilters = () => { setSearch(""); setClientFilter([]); setCourseFilter([]); setTrainerFilter([]); setStatusFilter([]); setTile("all"); };

    useEffect(() => { setPage(1); }, [search, clientFilter, courseFilter, trainerFilter, statusFilter, tile, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    };

    const columnsDirty = visibleColumns.length !== DEFAULT_COLUMNS.length || visibleColumns.some((k) => !DEFAULT_COLUMNS.includes(k));
    const toggleColumn = (key: string) => setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

    // What "Detailed report" covers, in words — the designer prints it.
    const scopeLabel = () => {
        const clients = clientFilter.length ? clientFilter.join(", ") : "All clients";
        const names = courseOptions.filter((o) => courseFilter.includes(o.value)).map((o) => o.label);
        return `${clients} · ${names.length ? names.join(", ") : "all courses"}`;
    };

    const text = (v: string, cls = "text-body") => (v && v !== "—"
        ? <span className={`block truncate ${cls}`} title={v}>{v}</span>
        : <span className="text-faint">—</span>);

    const columns: Column<FeedbackRow>[] = [
        {
            key: "num", label: "#",
            className: "w-[4%] pl-4 pr-2 text-left text-xs text-faint tabular-nums align-middle whitespace-nowrap",
            skeletonWidth: "20px",
            render: (_r, i) => (currentPage - 1) * pageSize + i + 1,
        },
        {
            key: "title", label: "Feedback Form", sortKey: "title",
            className: "w-[15%] px-3 text-left align-middle",
            skeletonWidth: "80%",
            render: (r) => text(r.title, "font-medium text-heading"),
        },
        { key: "course", label: "Course", sortKey: "course", className: "w-[13%] px-3 text-left align-middle", render: (r) => text(r.course) },
        { key: "client", label: "Client", sortKey: "client", className: "w-[11%] px-3 text-left align-middle", render: (r) => text(r.client) },
        { key: "batch", label: "Batch", sortKey: "batch", className: "w-[9%] px-3 text-left align-middle", render: (r) => text(r.batch) },
        { key: "trainer", label: "Trainer", sortKey: "trainer", className: "w-[11%] px-3 text-left align-middle", render: (r) => text(r.trainer, "text-subtle") },
        {
            key: "responses", label: "Responses", sortKey: "responses",
            className: "w-[8%] px-3 text-left align-middle tabular-nums whitespace-nowrap",
            render: (r) => (
                <span className="text-body" title={r.rate != null ? `${r.rate}% of the batch responded` : undefined}>
                    {r.responses}{r.denom ? <span className="text-faint"> / {r.denom}</span> : null}
                </span>
            ),
        },
        {
            key: "rate", label: "Response Rate", sortKey: "rate",
            className: "w-[9%] px-3 text-left align-middle tabular-nums",
            render: (r) => (r.rate == null ? <span className="text-faint">—</span> : <span className="text-body">{r.rate}%</span>),
        },
        {
            key: "avg", label: "Avg Rating", sortKey: "avg",
            className: "w-[8%] px-3 text-left align-middle tabular-nums whitespace-nowrap",
            render: (r) => (r.avg == null ? <span className="text-faint">—</span> : <span className="font-semibold text-heading">{r.avg}<span className="font-normal text-faint"> / 5</span></span>),
        },
        {
            // Its own column, as plain coloured text — not a badge.
            key: "level", label: "Rating Level", sortKey: "avg",
            className: "w-[8%] px-3 text-left align-middle",
            render: (r) => {
                if (!r.level) return <span className="text-faint" title="No ratings yet">—</span>;
                const l = RATING_LEVEL[r.level];
                return (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${l.text}`}>
                        <span className={`size-1.5 shrink-0 rounded-full ${l.dot}`} aria-hidden />{l.label}
                    </span>
                );
            },
        },
        {
            key: "window", label: "Feedback Window", sortKey: "window",
            className: "w-[14%] px-3 text-left align-middle",
            render: (r) => (
                <span className="block truncate text-xs tabular-nums text-subtle">
                    {r.start ? fmtDate(r.start) : "—"}{r.end ? <><span className="text-faint"> – </span>{fmtDate(r.end)}</> : null}
                </span>
            ),
        },
        {
            key: "status", label: "Status", sortKey: "status",
            className: "w-[8%] px-3 text-left align-middle",
            render: (r) => <StatusPill tone={FORM_STATUS[r.status].tone} dot>{FORM_STATUS[r.status].label}</StatusPill>,
        },
        {
            key: "actions", label: "Actions",
            className: "no-print w-[5%] pl-2 pr-2 text-right whitespace-nowrap align-middle",
            skeletonWidth: "20px",
            render: (r) => (
                // The menu portals, but React still bubbles its clicks and
                // keys through here — they must not reach the row's own
                // open-on-click handler.
                <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" title="More actions" aria-label={`Actions for ${r.title}`} className={ICON_BUTTON_CLASS}>
                                <MoreVertical size={14} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4} collisionPadding={8} className={`w-52 ${MENU_CLASS}`}>
                            <DropdownMenuItem onSelect={() => onOpen(r, "feedback")} className={ACTION_ITEM_CLASS}>
                                <Eye /> View feedback
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
        { key: "all", label: "Total forms", value: rows ? counts.all : undefined, icon: ClipboardList, chip: "bg-brand-wash text-brand-strong", tint: "#fff4e9", tintOn: "#ffe7d2", ring: "#c2540f" },
        { key: "open", label: "Open", value: rows ? counts.open : undefined, icon: MessageSquare, chip: "bg-emerald-50 text-emerald-600", tint: "#e6f7f0", tintOn: "#d0efe2", ring: "#059669" },
        { key: "closed", label: "Closed", value: rows ? counts.closed : undefined, icon: Lock, chip: "bg-ink-100 text-subtle", tint: "#f3f4f6", tintOn: "#e5e7eb", ring: "#6b7280" },
        { key: "low", label: "Low rated (below 3)", value: rows ? counts.low : undefined, icon: CircleAlert, chip: "bg-red-50 text-red-600", tint: "#fdeeee", tintOn: "#fadada", ring: "#dc2626" },
    ];

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <OverviewTiles tiles={tiles} active={tile} allKey="all" onSelect={setTile} ariaLabel="Feedback overview — filter the forms" />

            {/* ── Toolbar: Search · Client · Course · Trainer · Status · Columns · Detailed report ── */}
            <div className="no-print mt-3 flex min-w-0 shrink-0 flex-wrap items-center gap-2">
                <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-[200px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search form, course, trainer…"
                        aria-label="Search feedback forms"
                        className="h-8 w-full rounded-control border border-hairline-strong bg-surface pl-8 pr-8 text-xs text-body transition-colors duration-150 placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                    {search && (
                        <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-2 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-chip text-faint hover:bg-ink-100 hover:text-heading">
                            <X size={12} />
                        </button>
                    )}
                </div>
                <div className="w-full min-w-0 sm:w-[160px]">
                    <MappingMultiFilter label="Clients" options={clientOptions} value={clientFilter} onChange={changeClients} placeholder="All clients" />
                </div>
                <div className="w-full min-w-0 sm:w-[170px]">
                    <MappingMultiFilter label="Courses" options={courseOptions} value={courseFilter} onChange={changeCourses} placeholder="All courses" emptyLabel="No courses for the selected clients" />
                </div>
                <div className="w-full min-w-0 sm:w-[160px]">
                    <MappingMultiFilter label="Trainers" options={trainerOptions} value={trainerFilter} onChange={setTrainerFilter} placeholder="All trainers" />
                </div>
                <div className="w-full min-w-0 sm:w-[140px]">
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
                    <DropdownMenuContent align="end" sideOffset={6} collisionPadding={8} className={`w-60 ${MENU_CLASS}`}>
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
                    <span role="status" title={`${filtered.length} of ${all.length} forms match the current filters`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-brand-500/30 bg-brand-wash px-2.5 text-xs font-semibold text-brand-strong">
                        <span className="tabular-nums">{filtered.length.toLocaleString()}</span>
                        <span className="font-medium opacity-80">of {all.length.toLocaleString()}</span>
                    </span>
                )}
                {hasActiveFilters && (
                    <button type="button" onClick={clearFilters} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-control px-2 text-xs font-medium text-subtle hover:bg-row-hover hover:text-heading">
                        <X className="size-3.5" /> Clear all
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => onDetailedReport(filtered, scopeLabel())}
                    disabled={!filtered.length}
                    title="Pool the listed forms into one report — charts, filters, Excel / PDF"
                    className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-control border border-brand-300 bg-surface px-2.5 text-xs font-semibold text-brand-strong transition-colors hover:border-brand-400 hover:bg-brand-wash disabled:cursor-not-allowed disabled:border-hairline-strong disabled:text-faint"
                >
                    <SlidersHorizontal className="size-3.5" /> Detailed report
                </button>
            </div>

            {/* ── Table ── */}
            <div ref={cardRef} aria-busy={loading} className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-hairline bg-surface shadow-xs">
                {error ? (
                    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-sm text-subtle">
                        <p>Couldn’t load feedback. Please try again.</p>
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
                            onRowClick={(r) => onOpen(r, "feedback")}
                            emptyTitle={hasActiveFilters ? "No forms match these filters" : "No feedback forms yet"}
                            emptyHint={hasActiveFilters
                                ? "Try widening or clearing them to see more."
                                : "Feedback forms created for a course's batches appear here."}
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
