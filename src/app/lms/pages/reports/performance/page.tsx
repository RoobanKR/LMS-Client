"use client";

/**
 * Reports — /lms/pages/reports/performance
 *
 * Every course as one flat list, in the Client Management / Course Management
 * listing style (search + filters, auto-fit table, pager). "View" opens that
 * course's existing report — the same screen Course Actions ▸ Reports opens
 * (/lms/pages/coursestructure/courseReport), with `returnTo` pointing back
 * here so its Back button lands on this list.
 *
 * 2026-10-03: replaces the guided Client → Course → Activities report that
 * lived here. The previous page is kept beside this file as
 * page.tsx.bak-2026-10-03-before-course-list.
 *
 * Scope: admin / L&D see every course of the institution; a POC sees its
 * enrolled courses (scoped server-side); a trainer sees the courses it is
 * enrolled in (`scope=enrolled`).
 *
 * Shell: L&D Head / Subhead → LDLayout (Reports lit), trainer → StaffLayout,
 * everyone else → DashboardLayout.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search, X } from "lucide-react";
import DashboardLayout from "@/app/lms/component/layout";
import { StaffLayout } from "@/app/lms/component/stafflayout/staff-layout";
import LDLayout from "@/app/lms/component/ldshell/LDLayout";
import DataTable, { type Column } from "@/app/lms/shared/listing/DataTable";
import TableFooter from "@/app/lms/shared/listing/TableFooter";
import { ClientAvatar } from "@/app/lms/pages/servicemapping/components/workspaceShared";
import { useClients } from "@/app/lms/pages/clientmanagement/api/clientManagementService";
import {
    fetchCourseStructuresSummary,
    fetchEnrolledCourseStructuresSummary,
} from "@/app/lms/pages/coursestructure/api/createCourseStucture";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPocSession } from "@/lib/session";

type Shell = "admin" | "staff" | "ld";

interface CourseRow {
    _id: string;
    courseName?: string;
    courseCode?: string;
    clientId?: string;
    clientName?: string;
    serviceType?: string;
    serviceModal?: string;
    category?: string;
    participantCount?: number;
    exerciseCount?: number;
    hasSubmissions?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const REPORTS_PATH = "/lms/pages/reports/performance";

const readShell = (): Shell => {
    if (isPocSession()) return "admin";
    let roleStr = "";
    try {
        const u = JSON.parse(localStorage.getItem("smartcliff_userData") || "null");
        const role = u?.role;
        roleStr = String(
            (typeof role === "object" ? role?.roleValue || role?.originalRole || role?.renameRole : role) ||
                localStorage.getItem("smartcliff_originalRole") ||
                "",
        );
    } catch { /* fall through to the role key */ }
    const r = (roleStr || localStorage.getItem("smartcliff_roleValue") || "").toLowerCase().replace(/[^a-z]/g, "");
    if (r.includes("ldhead") || r.includes("subhead")) return "ld";
    if (r.includes("admin") || r.includes("programcoordinator")) return "admin";
    return "staff";
};

const titleCase = (s?: string) =>
    (s || "").replace(/\b\w/g, (ch) => ch.toUpperCase());

export default function ReportsPage() {
    const router = useRouter();
    const [shell, setShell] = useState<Shell | null>(null);
    useEffect(() => { setShell(readShell()); }, []);

    // A trainer's list is its enrolled courses; everyone else gets the
    // institution's (a POC's is already narrowed by the server).
    const coursesQ = useQuery({
        queryKey: ["courseStructures", "summary", shell === "staff" ? "enrolled" : "all"],
        queryFn: shell === "staff" ? fetchEnrolledCourseStructuresSummary : fetchCourseStructuresSummary,
        enabled: shell !== null,
        staleTime: 30_000,
        refetchOnMount: "always",
    });
    const courses: CourseRow[] = useMemo(() => {
        const raw = coursesQ.data as { data?: unknown } | unknown;
        const list = Array.isArray((raw as { data?: unknown })?.data)
            ? (raw as { data: unknown[] }).data
            : Array.isArray(raw) ? (raw as unknown[]) : [];
        return list as CourseRow[];
    }, [coursesQ.data]);

    const { data: clientList } = useClients();
    const clientById = useMemo(() => {
        const map = new Map<string, { clientCompany?: string; clientLogo?: string }>();
        for (const c of (clientList ?? []) as Array<{ _id: string; clientCompany?: string; clientLogo?: string }>) {
            map.set(String(c._id), c);
        }
        return map;
    }, [clientList]);
    const clientNameOf = (row: CourseRow) =>
        clientById.get(String(row.clientId || ""))?.clientCompany || row.clientName || "—";

    // ── Filters ───────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [clientFilter, setClientFilter] = useState("all");
    const [serviceFilter, setServiceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const clientOptions = useMemo(() => {
        const seen = new Map<string, string>();
        courses.forEach((c) => {
            const id = String(c.clientId || "");
            if (id && !seen.has(id)) seen.set(id, clientNameOf(c));
        });
        return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courses, clientById]);
    const serviceOptions = useMemo(
        () => [...new Set(courses.map((c) => (c.serviceModal || "").trim()).filter(Boolean))].sort(),
        [courses],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return courses
            .filter((c) => clientFilter === "all" || String(c.clientId || "") === clientFilter)
            .filter((c) => serviceFilter === "all" || (c.serviceModal || "").trim() === serviceFilter)
            .filter((c) => statusFilter === "all" || (statusFilter === "submitted" ? !!c.hasSubmissions : !c.hasSubmissions))
            .filter((c) => !q || [c.courseName, c.courseCode, clientNameOf(c), c.serviceModal, c.serviceType]
                .some((f) => (f || "").toLowerCase().includes(q)))
            .slice()
            .sort((a, b) => {
                const ts = (r: CourseRow) => Math.max(r.updatedAt ? Date.parse(r.updatedAt) : 0, r.createdAt ? Date.parse(r.createdAt) : 0);
                return ts(b) - ts(a) || String(b._id).localeCompare(String(a._id));
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courses, clientById, search, clientFilter, serviceFilter, statusFilter]);

    // ── Pagination + auto-fit page size (Client Management recipe) ───────
    const [pageSize, setPageSize] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [autoFitPageSize, setAutoFitPageSize] = useState(true);
    const tableCardRef = useRef<HTMLDivElement | null>(null);
    const tableFooterRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (!autoFitPageSize) return;
        const cardEl = tableCardRef.current;
        if (!cardEl) return;
        const HEADER_H = 40;
        const ROW_H = 52;
        const SAFETY = Math.round(ROW_H / 2);
        const compute = () => {
            if (cardEl.clientHeight <= 0) return;
            const footerH = tableFooterRef.current?.clientHeight ?? 44;
            const budget = Math.max(0, cardEl.clientHeight - HEADER_H - footerH - SAFETY);
            const fits = Math.max(3, Math.min(50, Math.floor(budget / ROW_H)));
            setPageSize((prev) => (prev === fits ? prev : fits));
        };
        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(cardEl);
        if (tableFooterRef.current) ro.observe(tableFooterRef.current);
        return () => ro.disconnect();
    }, [autoFitPageSize, shell]);
    useEffect(() => { setCurrentPage(1); }, [search, clientFilter, serviceFilter, statusFilter]);

    const totalRows = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const pageRows = useMemo(
        () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
        [filtered, safePage, pageSize],
    );

    const hasActiveFilters = Boolean(search.trim()) || clientFilter !== "all" || serviceFilter !== "all" || statusFilter !== "all";
    const clearFilters = () => {
        setSearch(""); setClientFilter("all"); setServiceFilter("all"); setStatusFilter("all");
    };

    // The existing per-course report; Back returns here.
    const openReport = (row: CourseRow) => {
        const q = new URLSearchParams({ courseId: row._id, returnTo: REPORTS_PATH, view: "exercise" });
        router.push(`/lms/pages/coursestructure/courseReport?${q.toString()}`);
    };

    const columns: Column<CourseRow>[] = [
        {
            key: "num",
            label: "#",
            className: "w-[5%] pl-5 text-left text-xs text-faint tabular-nums align-middle",
            skeletonWidth: "20px",
            render: (_r, i) => (safePage - 1) * pageSize + i + 1,
        },
        {
            key: "course",
            label: "Course",
            className: "w-[25%] px-3 text-left align-middle",
            skeletonWidth: "70%",
            render: (row) => (
                <div className="min-w-0">
                    <span className="block truncate font-medium text-heading" title={row.courseName}>{row.courseName || "Untitled course"}</span>
                    <span className="block truncate text-2xs text-subtle tabular-nums">{row.courseCode || "—"}</span>
                </div>
            ),
        },
        {
            key: "client",
            label: "Client",
            className: "w-[20%] px-3 text-left align-middle",
            skeletonWidth: "80%",
            render: (row) => {
                const name = clientNameOf(row);
                return (
                    <div className="flex items-center gap-2 min-w-0">
                        <ClientAvatar name={name} size="sm" logoUrl={clientById.get(String(row.clientId || ""))?.clientLogo || undefined} />
                        <span className="block truncate" title={name}>{name}</span>
                    </div>
                );
            },
        },
        {
            key: "service",
            label: "Service",
            className: "w-[18%] px-3 text-left align-middle",
            skeletonWidth: "70%",
            render: (row) => (
                <div className="min-w-0">
                    <span className="block truncate text-body" title={titleCase(row.serviceModal)}>{titleCase(row.serviceModal) || "—"}</span>
                    <span className="block truncate text-2xs text-subtle" title={titleCase(row.serviceType)}>{titleCase(row.serviceType)}</span>
                </div>
            ),
        },
        {
            key: "learners",
            label: "Participants",
            className: "w-[9%] px-3 text-left align-middle tabular-nums",
            skeletonWidth: "30px",
            render: (row) => row.participantCount ?? 0,
        },
        {
            key: "exercises",
            label: "Exercises",
            className: "w-[8%] px-3 text-left align-middle tabular-nums",
            skeletonWidth: "30px",
            render: (row) => row.exerciseCount ?? 0,
        },
        {
            key: "status",
            label: "Submissions",
            className: "w-[9%] px-3 text-left align-middle",
            skeletonWidth: "60px",
            render: (row) => row.hasSubmissions ? (
                <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-2xs font-semibold text-success-700">Received</span>
            ) : (
                <span className="inline-flex items-center rounded-full bg-ink-100 px-2 py-0.5 text-2xs font-semibold text-subtle">None yet</span>
            ),
        },
        {
            key: "actions",
            label: "Action",
            className: "w-[6%] no-print pl-2 pr-4 sm:pr-5 text-right whitespace-nowrap align-middle",
            skeletonWidth: "40px",
            render: (row) => (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openReport(row); }}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-hairline-strong bg-surface text-xs font-semibold text-brand-strong hover:border-brand hover:bg-brand-wash transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                    <Eye className="h-3.5 w-3.5" /> View
                </button>
            ),
        },
    ];

    const content = (
        // Root flex column — consumes the shell's bounded height so the table
        // area can auto-fit. h-full / min-h-0 / flex-col are all load-bearing.
        <div className="flex flex-col h-full min-h-0 min-w-0 p-6">
            <div className="shrink-0 mb-4">
                <h1 className="text-base sm:text-lg font-semibold text-heading tracking-[-0.01em]">Reports</h1>
                <p className="mt-0.5 text-xs text-subtle">
                    Every course and its results. Open a course to see its report by exercise or by student.
                </p>
            </div>

            <div className="shrink-0 mb-3 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search course, code, client or service..."
                        aria-label="Search"
                        className="w-full h-9 pl-8 pr-8 rounded-md border border-hairline-strong bg-surface text-xs text-body placeholder:text-faint focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 transition-colors duration-150"
                    />
                    {search && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => setSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex size-5 items-center justify-center rounded-chip text-faint hover:bg-ink-100 hover:text-heading transition-colors duration-150"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger aria-label="Filter by client" className="h-9 min-w-[180px] rounded-md border-hairline">
                        <SelectValue placeholder="All clients" />
                    </SelectTrigger>
                    <SelectContent sideOffset={4} style={{ width: "var(--radix-select-trigger-width)" }} className="max-h-[280px]">
                        <SelectItem value="all">All clients</SelectItem>
                        {clientOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger aria-label="Filter by service" className="h-9 min-w-[170px] rounded-md border-hairline">
                        <SelectValue placeholder="All services" />
                    </SelectTrigger>
                    <SelectContent sideOffset={4} style={{ width: "var(--radix-select-trigger-width)" }} className="max-h-[280px]">
                        <SelectItem value="all">All services</SelectItem>
                        {serviceOptions.map((s) => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger aria-label="Filter by submissions" className="h-9 min-w-[170px] rounded-md border-hairline">
                        <SelectValue placeholder="All courses" />
                    </SelectTrigger>
                    <SelectContent sideOffset={4} style={{ width: "var(--radix-select-trigger-width)" }} className="max-h-[280px]">
                        <SelectItem value="all">All courses</SelectItem>
                        <SelectItem value="submitted">Submissions received</SelectItem>
                        <SelectItem value="none">No submissions yet</SelectItem>
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-xs font-semibold text-brand-strong hover:text-brand-800 transition-colors"
                    >
                        <X size={12} /> Clear filters
                    </button>
                )}
            </div>

            <div ref={tableCardRef} className="flex flex-1 min-h-0 flex-col">
                {coursesQ.isError ? (
                    <div className="flex-1 min-h-[200px] flex items-center justify-center px-4 py-8 text-sm text-red-600">
                        Couldn&apos;t load the courses. Refresh to try again.
                    </div>
                ) : (
                    <DataTable<CourseRow>
                        rows={pageRows}
                        columns={columns}
                        rowKey={(row) => row._id}
                        sortKey={null}
                        sortDir="asc"
                        onSort={() => {}}
                        isLoading={shell === null || coursesQ.isLoading}
                        isFiltered={hasActiveFilters}
                        fillHeight
                        fixedLayout
                        onRowClick={openReport}
                        emptyTitle={hasActiveFilters ? "No courses match these filters" : "No courses yet"}
                        emptyHint={hasActiveFilters
                            ? "Try widening or clearing them to see more."
                            : "Courses appear here once they are set up in Course Management."}
                        emptyAction={hasActiveFilters ? "Clear filters" : undefined}
                        onEmptyAction={hasActiveFilters ? clearFilters : undefined}
                    />
                )}
                <div ref={tableFooterRef}>
                    <TableFooter
                        from={totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1}
                        to={Math.min(safePage * pageSize, totalRows)}
                        total={totalRows}
                        pageSize={pageSize}
                        onPageSize={(n) => { setAutoFitPageSize(false); setPageSize(n); setCurrentPage(1); }}
                        currentPage={safePage}
                        totalPages={totalPages}
                        onPage={setCurrentPage}
                    />
                </div>
            </div>
        </div>
    );

    if (shell === null) return null;
    if (shell === "ld") return <LDLayout active="reports-list">{content}</LDLayout>;
    if (shell === "staff") return <StaffLayout noBuiltInPadding hideCornerBell>{content}</StaffLayout>;
    return <DashboardLayout>{content}</DashboardLayout>;
}
