"use client";
 
/**
 * Dedicated L&D Head console shell — used ONLY by /lms/pages/lddashboard.
 * Presentational: the parent page owns the filter state and passes it in via
 * the `filter` prop (no React context, to avoid an SWC JSX-provider quirk).
 * Sidebar structure mirrors the approved wireframe: Approvals and Reports
 * expand into sub-items; the rest are single items.
 */
 
import { ReactNode, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import LDAccountMenu from "./LDAccountMenu";
import { useQuery } from "@tanstack/react-query";
import { notificationsService, notificationKeys } from "../../pages/notifications/api/notifications";
import { useAccountMenu } from "../../pages/courses/coursesdetailedview/components/useAccountMenu";
 
export type LDView =
  | "dashboard"
  | "appr-queue" | "appr-rules"
  | "clients" | "courses" | "content" | "schedule" | "trainers"
  // Reached from a course's Manage-course menu, not the sidebar: each hosts the
  // real screen for the selected course inside this shell.
  | "course-structure" | "course-calendar" | "course-enrollment"
  | "attendance"
  | "perf-progress" | "perf-results"
  | "fb-summary"
  // "reports" is the legacy hash — it now lands on the first report page.
  | "reports"
  // "rep-overview" is the L&D Overview — Reports’ landing page and where
  // the legacy "reports" hash now resolves.
  | "rep-overview"
  | "rep-performance" | "rep-attendance" | "rep-delivery" | "rep-feedback" | "rep-clients"
  | "profile"
  // Business Management — the admin Client Management / Service Mapping /
  // Reports pages, hosted in this shell by app/lms/pages/layout.tsx.
  | "business"
  // The admin /lms/pages/approvals page, hosted the same way (rail: Approvals).
  | "approvals"
  // The admin Course Management pages (/lms/pages/coursestructure and its
  // batches / sections / participants / feedback / calendar screens), hosted
  // the same way (rail: Course Management).
  | "course-mgmt"
  // The shared /lms/pages/notifications page, hosted the same way.
  | "notifications"
  // The Reports course list (/lms/pages/reports/performance) — lights Reports.
  | "reports-list";

export interface CourseOpt { id: string; name: string; client: string; }
export interface FilterBar {
  client: string; course: string;
  clients: string[]; courseOpts: CourseOpt[];
  onClient: (v: string) => void; onCourse: (v: string) => void;
}
 
interface NavItem {
  id: LDView;
  label: string;
  badge?: number;
  icon: string;
  /** Override the default hash-based href — used by items that should
   *  navigate to a full page instead of a hash view. Example: Reports
   *  now points at the standalone /lms/pages/reports/performance page. */
  href?: string;
  children?: { id: LDView; label: string; badge?: number; href?: string }[];
}
interface NavGroup { label: string; items: NavItem[] }
 
const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard" },
      // Notification — same page the admin sidebar's item opens (approval
      // requests, batches with attendance not marked, …). Live unread badge.
      { id: "notifications", label: "Notification", icon: "notifications", href: "/lms/pages/notifications" },
    ],
  },
  {
    label: "Planning & Delivery",
    items: [
      {
        // Approvals is a single top-level item (no sub-items) that opens the
        // shared admin Approvals page — /lms/pages/approvals hosts both the
        // Pending Approvals queue and the Approval Setup tab, so the two
        // former L&D sub-views (#appr-queue, #appr-rules) collapse into that
        // one destination. The badge is still LIVE via the `apprBadge` prop.
        id: "appr-queue", label: "Approvals", icon: "approvals",
        href: "/lms/pages/approvals",
      },
      // 2026-10-02: Clients replaced by Business Management — the same
      // Client Management / Service Mapping / Reports tab workspace the admin
      // sidebar opens. app/lms/pages/layout.tsx keeps THIS rail around those
      // routes for L&D roles, so the sidebar doesn't change on click.
      // Do not restore the Clients item on merge.
      { id: "business", label: "Business Management", icon: "clients", href: "/lms/pages/clientmanagement" },
      // Course Management — the same /lms/pages/coursestructure screen the
      // admin sidebar opens; app/lms/pages/layout.tsx keeps this rail around it.
      { id: "course-mgmt", label: "Course Management", icon: "courses", href: "/lms/pages/coursestructure" },
      // 2026-10-03: Learning Content (#content) DELIBERATELY removed from the
      // rail — Course Management covers it. The view still renders for old
      // #content links (alias below lights Course Management). Do not restore
      // on merge.
    ],
  },
  {
    label: "Monitoring",
    items: [
      { id: "attendance", label: "Attendance", icon: "attendance" },
      // Student Performance was DELIBERATELY removed from the rail; its screens
      // (#perf-progress, #perf-results) stay live via the dashboard's alerts,
      // quick actions and at-risk links. Do not restore on merge.
      // Single item on purpose: it opens the finished Feedback Report (client/
      // course scope, filters, ratings, downloads) — no sub-pages to maintain.
      { id: "fb-summary", label: "Feedback", icon: "feedback" },
    ],
  },
  {
    // 2026-09-04: sidebar restructured — Reports is a top-level item with
    // NO children (the Learner Progress & Performance Report page).
    // 2026-10-02: the Overview item (#rep-overview) was DELIBERATELY removed
    // from the rail. The view still renders for old #rep-overview / #reports
    // links (alias below lights Reports). Do not restore on merge.
    // Course Delivery and Clients & Services were dropped from the rail
    // (they were dashboard-driven detailed reports; the day-to-day L&D
    // reporting flow the redesign asked for lives under Reports alone).
    // They remain reachable via existing hash links inside the L&D
    // dashboard, so nothing routes to a dead page.
    label: "Reporting",
    items: [
      // Reports opens the standalone Learner Progress & Performance
      // Report page directly — no hash view, no Create-Report modal.
      // The `href` overrides the default hash-based nav.
      { id: "rep-performance", label: "Reports", icon: "reports", href: "/lms/pages/reports/performance" },
    ],
  },
  { label: "Account", items: [{ id: "profile", label: "Profile & Access", icon: "profile" }] },
];
 
const ICONS: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
  approvals: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  clients: <><path d="M3 21h18" /><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M15 21V11h2a2 2 0 0 1 2 2v8" /><path d="M9 7h2M9 11h2M9 15h2" /></>,
  courses: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></>,
  content: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12l1.5 1.5L13 11" /><path d="M16 12.5h1M9 17h7" /></>,
  schedule: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  trainers: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></>,
  attendance: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  performance: <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>,
  feedback: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
  reports: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  profile: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  notifications: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
};
 
function Ico({ name }: { name: string }) {
  return (
    <svg className="ldx-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth={2}>{ICONS[name] || ICONS.dashboard}</svg>
  );
}
 
/* ── Modern combobox (replaces the native <select>) ──────────────────────────
   Styled trigger + floating panel, optional type-ahead search, full keyboard
   nav (↑/↓/Home/End/Enter/Esc), click-outside close and a selected checkmark.
   Presentational + self-contained; the parent still owns the value. */
export interface SelOpt { value: string; label: string; }
 
export function LDSelect({
  label, value, options, onChange, searchable, applied,
}: {
  label: string;
  value: string;
  options: SelOpt[];
  onChange: (v: string) => void;
  searchable?: boolean;
  applied?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
 
  const current = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
 
  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: globalThis.MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
 
  // On open: clear the query, point the active row at the current value, focus search.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx < 0 ? 0 : idx);
    if (searchable) inputRef.current?.focus();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
 
  // Keep the active row scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${active}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
 
  const commit = (v: string) => { onChange(v); setOpen(false); setQuery(""); };
 
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[active]) commit(filtered[active].value);
      else setOpen(true);
    } else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(filtered.length - 1); }
  };
 
  return (
    <div className="ldx-fld ldsel" ref={rootRef}>
      <span>{label}</span>
      <div className="ldsel-wrap">
        <button
          type="button"
          className={`ldsel-btn ${open ? "open" : ""} ${applied ? "set" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKey}
        >
          <span className="ldsel-val">{current ? current.label : "Select…"}</span>
          <svg className="ldsel-chev" viewBox="0 0 24 24" fill="none" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {open ? (
          <div className="ldsel-pop" role="listbox" aria-label={label}>
            {searchable ? (
              <div className="ldsel-srch">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
                <input
                  ref={inputRef}
                  value={query}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  onKeyDown={onKey}
                />
              </div>
            ) : null}
            <div className="ldsel-list" ref={listRef}>
              {filtered.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  data-idx={i}
                  role="option"
                  aria-selected={o.value === value}
                  className={`ldsel-opt ${o.value === value ? "sel" : ""} ${i === active ? "act" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(o.value)}
                >
                  <span className="ldsel-optlab">{o.label}</span>
                  {o.value === value ? (
                    <svg className="ldsel-check" viewBox="0 0 24 24" fill="none" strokeWidth={2.5}><path d="M20 6 9 17l-5-5" /></svg>
                  ) : null}
                </button>
              ))}
              {filtered.length === 0 ? <div className="ldsel-empty">No matches</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
 
/** Views that fit the viewport and scroll their own list instead of the page. */
const FIT_VIEWS = new Set<LDView>([
  "clients", "courses", "content", "trainers", "perf-progress",
  // Feedback summary: the RTable list should fill the viewport so its
  // pagination sits at the bottom without page-scroll — same fit contract
  // the other list views use. CSS below (.ldx-content.fit .ldr-shell /
  // .ldc-list / .ldc-scroll) chains flex:1 down to the scroll region.
  "fb-summary",
  // Old #rep-feedback bookmarks render the same Feedback view.
  "rep-feedback",
  // The hosted course screens manage their own internal scrolling.
  "course-structure", "course-calendar", "course-enrollment",
]);

/* The hosted course screens have no sidebar entry of their own — they are a
   course's detail, so the sidebar keeps Course Insight lit while you are in one
   rather than dropping every highlight. */
const SIDEBAR_ALIAS: Partial<Record<LDView, LDView>> = {
  "course-structure": "courses",
  "course-calendar": "courses",
  "course-enrollment": "courses",
  // Legacy #reports / #rep-overview links still render the Overview view, but
  // it has no rail entry anymore — keep Reports lit instead.
  "reports": "rep-performance",
  "rep-overview": "rep-performance",
  // Student Performance has no rail entry anymore; its screens are reached
  // from the dashboard's alerts/quick actions, so Dashboard stays lit.
  "perf-progress": "dashboard",
  "perf-results": "dashboard",
  // Feedback lives ONLY under its standalone rail item now; a #rep-feedback
  // bookmark still renders the report, but the rail highlights fb-summary.
  "rep-feedback": "fb-summary",
  // Same pattern for Attendance — kept as a view for old bookmarks but the
  // rail highlights the standalone Attendance item in Monitoring.
  "rep-attendance": "attendance",
  // Approvals collapsed to a single rail item (no sub-items). The rail
  // sends users to /lms/pages/approvals now, but the dashboard's own
  // internal links still open #appr-rules (settings-icon route) and
  // #appr-queue (priority actions) — highlight the Approvals item for both.
  "appr-rules": "appr-queue",
  // The hosted admin Approvals page lights the same rail item.
  "approvals": "appr-queue",
  // Learning Content has no rail entry anymore — light Course Management.
  "content": "course-mgmt",
  "reports-list": "rep-performance",
  // Clients has no rail entry anymore (#clients redirects to Business Management).
  "clients": "business",
};

/* Hosted screens bring their own gutters and want every pixel — the shell's
   content padding would box them in and waste the width they are built for. */
const HOST_VIEWS = new Set<LDView>(["course-structure", "course-calendar", "course-enrollment", "business", "approvals", "course-mgmt", "notifications", "reports-list"]);

/* Admin pages hosted as-is (Business Management, Approvals): give them the admin shell's
   content contract — a definite-height box that scrolls as a whole — so their
   h-full chains resolve exactly as they do under DashboardLayout. */
const ADMIN_HOST_VIEWS = new Set<LDView>(["business", "approvals", "course-mgmt", "notifications", "reports-list"]);

/* `filter` is accepted but unused: the scope pickers now live inside the pages
   (page.tsx ScopeFilters). Kept optional so older callers (page2.tsx) still
   type-check. */
export default function LDLayout({ active, children, apprBadge }: { active: LDView; children: ReactNode; filter?: FilterBar; apprBadge?: number }) {
  const navActive = SIDEBAR_ALIAS[active] ?? active;
  // Unread count for the Notification item — the same query (and cache entry)
  // the bell and the admin sidebar's NotificationDot read.
  const { data: notifData } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsService.fetchNotifications(),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
  const unreadNotifs = notifData?.unreadCount || 0;
  const [railCollapsed, setRailCollapsed] = useState(false);
  // The sidebar's nav items are hash-based (#dashboard, #attendance, …), which
  // only mean anything on the LD console page itself. When this shell is
  // rendered from a sub-route (e.g. /lms/pages/attendancemanagement via
  // ?from=ldc), we prepend the console path so a click actually navigates
  // back to the console rather than sticking the hash on the current URL.
  const pathname = usePathname() || "";
  const LDC_PATH = "/lms/pages/lddashboard";
  const onLdc = pathname === LDC_PATH || pathname.startsWith(LDC_PATH + "/");
  const navHref = (id: string) => (onLdc ? `#${id}` : `${LDC_PATH}#${id}`);
  // Parent groups (items with children) — track which ones the user has
  // manually expanded off-page. On the LDC page the "trail" (a child is
  // active) implicitly expands them; off-page, clicking the parent should
  // just toggle the dropdown inline (no full page load), so we store an
  // explicit open set here and OR it with the trail check when rendering.
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (label: string) => setOpenGroups((prev) => {
    const next = new Set(prev);
    if (next.has(label)) next.delete(label); else next.add(label);
    return next;
  });

  // Below lg (1024px) the rail is an off-canvas drawer opened from the panel's
  // top bar. The desktop collapse ("rail") only applies at lg and up, so a
  // collapsed desktop rail never leaks into the drawer.
  const [navOpen, setNavOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setNavOpen(false);
    };
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    const onHash = () => setNavOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
    };
  }, [navOpen]);
  const railOn = railCollapsed && isDesktop;

  return (
    <div className={`ldx${railOn ? " rail" : ""}${navOpen ? " nav-open" : ""}`}>
      <style>{LDX_CSS}</style>

      {/* Below lg: dimmed backdrop behind the off-canvas rail. */}
      {navOpen ? <div className="ldx-scrim" aria-hidden onClick={() => setNavOpen(false)} /> : null}

      <aside
        className="ldx-side"
        aria-label="L&D navigation"
        onClick={(e) => {
          // Drawer: any link tap (hash view or page) closes it.
          if ((e.target as HTMLElement).closest("a")) setNavOpen(false);
        }}
      >
        {/* Brand card — the reference layout opens on a raised company block.
            Product identity plus the rail-collapse toggle; who is signed in
            lives in the footer card. */}
        <div className="ldx-brand">
          <span className="ldx-brand-logo" aria-hidden>S</span>
          <span className="ldx-brand-meta">
            <b>SmartCliff</b>
            <small>L&amp;D Console</small>
          </span>
          <button
            type="button"
            className="ldx-brand-tgl"
            aria-label={railCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!railCollapsed}
            onClick={() => setRailCollapsed((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} aria-hidden>
              {railCollapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
            </svg>
          </button>
          {/* Drawer close — shown below lg only (CSS). */}
          <button
            type="button"
            className="ldx-brand-x"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Group labels are not rendered — a flat list keeps the rail short
            enough to never scroll. GROUPS still structures the data (and the
            rail search results). */}
        {GROUPS.map((g) => (
          <div key={g.label}>
            {g.items.map((it) => {
              // Live approvals badge — everything else keeps its static badge.
              const badgeFor = (id: LDView, fallback?: number) =>
                id === "appr-queue" ? (apprBadge && apprBadge > 0 ? apprBadge : undefined)
                  : id === "notifications" ? (unreadNotifs > 0 ? unreadNotifs : undefined)
                  : fallback;
              if (it.children) {
                const trail = it.children.some((c) => c.id === navActive);
                const open = trail || openGroups.has(it.label);
                const itBadge = badgeFor(it.id, it.badge);
                return (
                  <div key={it.label}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(it.label)}
                      aria-expanded={open}
                      className={`ldx-nav w-full text-left ${trail ? "trail" : ""}`}
                    >
                      <Ico name={it.icon} />
                      {it.label}
                      {itBadge ? <span className="ldx-badge">{itBadge}</span> : null}
                      <svg className={`ldx-caret ${open ? "open" : ""}`} viewBox="0 0 24 24" fill="none" strokeWidth={2.5}><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    <div className={`ldx-children ${open ? "open" : ""}`}>
                      {it.children.map((c) => {
                        const cBadge = badgeFor(c.id, c.badge);
                        return (
                          <a key={c.id} href={navHref(c.id)} className={`ldx-sub ${navActive === c.id ? "on" : ""}`}>
                            {c.label}
                            {cBadge ? <span className="ldx-pill">{cBadge}</span> : null}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              // Explicit `href` (Reports → /lms/pages/reports/performance,
              // Approvals → /lms/pages/approvals) takes precedence over the
              // hash-based default. Active-state matches by id so
              // highlighting still works whether the item is a hash view or
              // a full page. Badge renders here too — Approvals is now a
              // single item, so its live pending count belongs on this pill.
              const itBadge = badgeFor(it.id, it.badge);
              return (
                <a key={it.id} href={it.href ?? navHref(it.id)} className={`ldx-nav ${navActive === it.id ? "on" : ""}`}>
                  <Ico name={it.icon} />{it.label}
                  {itBadge ? <span className="ldx-badge">{itBadge}</span> : null}
                </a>
              );
            })}
          </div>
        ))}

        <LDRailFoot />
      </aside>

      <main className="ldx-main">
        {/* White workspace card. The rail's gray runs beneath it and shows as a
            gutter on its top, right and bottom edges, so the gray visually
            flows from the sidebar around the workspace. No top bar: the pages
            open straight on their own header, and the account/logout menu sits
            at the bottom of the rail like the reference. */}
        <div className="ldx-panel">
        {/* Below lg: compact top bar with the drawer's hamburger (CSS-gated). */}
        <div className="ldx-mbar">
          <button
            type="button"
            className="ldx-burger"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ldx-brand-logo ldx-mbar-logo" aria-hidden>S</span>
          <span className="ldx-mbar-meta">
            <b>SmartCliff</b>
            <small>L&amp;D Console</small>
          </span>
        </div>
        {/* List views own their scrolling: the shell hands them the leftover
            height and stops scrolling itself, so each view's header stays put
            while only its table body moves. Analytical views (dashboard,
            reports) are taller than any viewport and keep the normal document
            scroll.
            No corner bell (removed 2026-10-03): notifications are the rail's
            Notification item with its unread badge, as in the admin shell.
            Do not restore on merge. */}
        {/* Attendance fits only on the console itself: the Attendance
            Management routes hosted in this shell also pass "attendance"
            (to light the rail item) and keep their own document scroll. */}
        <div className={`ldx-content${active === "dashboard" ? " dashboard-spacing" : ""}${FIT_VIEWS.has(active) || (active === "attendance" && onLdc) ? " fit" : ""}${HOST_VIEWS.has(active) ? " bleed" : ""}${ADMIN_HOST_VIEWS.has(active) ? " admin-host" : ""}`}>
          <div className="ldx-content-scroll-flow">
            {children}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
 
/* Console search — CURRENTLY UNMOUNTED: the search UI was removed from the
   shell along with the top bar. Kept compiled so restoring it is a one-line
   render (<LDSearch />); this workspace has no git history to recover from.
   Deliberately NOT the shared CommandPalette in app/lms/shared/ui: that one
   builds its entries from the ADMIN nav, so in this console it would offer
   routes an L&D user hits "Access Restricted" on (providers.tsx gates by
   permissionKey). This searches GROUPS — the very list the rail renders — so
   every result is somewhere this user can actually go. */
type LDHit = { id: LDView; label: string; group: string; parent?: string };

const NAV_HITS: LDHit[] = GROUPS.flatMap((g) =>
  g.items.flatMap((it) =>
    it.children?.length
      ? it.children.map((c) => ({ id: c.id, label: c.label, group: g.label, parent: it.label }))
      : [{ id: it.id, label: it.label, group: g.label }],
  ),
);

function LDSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // "/" focuses search — the hint printed on the trigger. Ignored while the
  // caret is in another field, or "/" could never be typed anywhere.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const term = q.trim().toLowerCase();
  const hits = term
    ? NAV_HITS.filter((h) =>
        `${h.label} ${h.parent || ""} ${h.group}`.toLowerCase().includes(term),
      ).slice(0, 8)
    : NAV_HITS.slice(0, 6);

  const go = (id: LDView) => {
    window.location.hash = id;
    setOpen(false);
    setQ("");
  };

  return (
    <div className="ldx-search" ref={boxRef}>
      <button
        type="button"
        className="ldx-searchbtn"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        aria-label="Search the console"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} aria-hidden>
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <span>Search anything…</span>
        <kbd>/</kbd>
      </button>

      {open ? (
        <div className="ldx-searchpop" role="dialog" aria-label="Search">
          <div className="ldx-searchfield">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits[0]) go(hits[0].id);
              }}
              placeholder="Search anything…"
              aria-label="Search the console"
            />
          </div>
          <div className="ldx-searchlist">
            {hits.length === 0 ? (
              <p className="ldsel-empty">No matches</p>
            ) : (
              hits.map((h) => (
                <button
                  key={`${h.group}-${h.parent || ""}-${h.id}-${h.label}`}
                  type="button"
                  className="ldx-searchopt"
                  onClick={() => go(h.id)}
                >
                  <span className="ldx-searchlab">{h.label}</span>
                  <span className="ldx-searchgrp">{h.parent ? `${h.group} · ${h.parent}` : h.group}</span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* Rail footer — the signed-in identity plus the account menu (profile, role
   switch, sign out), mirroring the reference's bottom-of-sidebar user row.
   Identity comes from the SAME useAccountMenu hook the menu uses, so the two
   can never disagree about who is signed in. */
function LDRailFoot() {
  const { user, getFullName, getUserInitials } = useAccountMenu({
    returnTo: "/lms/pages/lddashboard",
    stayOnSwitch: true,
  });
  return (
    <div className="ldx-foot">
      <div className="ldx-user">
        {user?.profile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ldx-uav-img" src={user.profile} alt="" aria-hidden />
        ) : (
          <span className="ldx-uav" aria-hidden>{getUserInitials()}</span>
        )}
        <span className="ldx-umeta">
          <b>{getFullName()}</b>
          <small>{user?.email || "—"}</small>
        </span>
        <LDAccountMenu variant="rail" />
      </div>
    </div>
  );
}

// Exported for the standalone Performance Report page (/lms/pages/reports/
// performance), which renders L&D report components outside this shell and
// needs the same `.ldx`-scoped palette + control styles.
export const LDX_CSS = `
.ldx{
  /* ── Figure/ground, QuikStats-style ─────────────────────────────────────
     The canvas is a COOL light gray and the rail sits ON it rather than
     beside it as a white column: raised things (brand card, active nav pill,
     content cards) are white, everything else is canvas. The old #FAFAFA was
     too close to white for cards to ever read as raised. Text stays on the
     cool ink ramp; the accent stays the product orange (#F97316) and is
     reserved for the current item + focus states — never the only cue. */
  --page:#F5F6F8; --surface:#FFFFFF; --ink:#111827; --ink2:#374151; --muted:#6B7280;
  --grid:#EAECF0; --border:#E4E7EC; --accent:#F97316; --accent-ink:#F97316;
  --wash:rgba(249,115,22,0.10); --good:#22C55E; --good-ink:#15803D; --warn:#CA8A04; --bad:#EF4444;
  --sh:0 1px 2px rgba(16,24,40,.04),0 10px 24px -18px rgba(16,24,40,.10);
  /* ── Scoped overrides of the app-wide design tokens (globals.css) ───────
     Tailwind v4 utilities resolve through CSS variables at use time, so
     re-declaring them here restyles every token-driven component rendered
     inside this console (the ld-dashboard feature, DataTable, chips) without
     touching the rest of the product: cooler hairlines, a gray sunken
     surface and a larger radius language. Anything re-declared here MUST get
     a twin in the .dark .ldx block below — this element's own declaration
     beats html.dark's, so a missing twin leaks light chrome into dark mode. */
  --surface-sunken:#F5F6F8; --hairline:#EAECF0; --hairline-strong:#DDE2E8;
  --color-line:#EAECF0; --color-line-strong:#DDE2E8; --color-canvas:#F5F6F8; --color-row-hover:#F2F4F7;
  --radius-tile:16px; --radius-chip:12px; --radius-control:12px;
  --shadow-xs:0 1px 2px rgba(16,24,40,.04);
  --shadow-sm:0 1px 2px rgba(16,24,40,.05),0 8px 20px -14px rgba(16,24,40,.08);
  display:flex; min-height:calc(100vh * var(--ui-scale-inv, 1)); background:var(--page); color:var(--ink);
  font-family:Poppins,"Segoe UI",system-ui,-apple-system,sans-serif; letter-spacing:-0.002em;
}
.ldx *{box-sizing:border-box;}
/* Rail — canvas-coloured so only raised (white) elements pop from it. No
   right border: the gray must run uninterrupted from the rail into the gutter
   around the white workspace panel. */
/* Full viewport height (not content height): the footer identity row reaches
   the BOTTOM-LEFT corner via margin-top:auto only because the rail actually
   spans the whole viewport. */
.ldx-side{flex:0 0 252px; background:transparent; padding:14px 14px 12px; display:flex; flex-direction:column; gap:1px; position:sticky; top:0; align-self:flex-start; height:calc(100vh * var(--ui-scale-inv, 1)); overflow-y:auto;}
/* Brand card — product identity; who is signed in stays in the footer card. */
.ldx-brand{display:flex; align-items:center; gap:10px; padding:9px 11px; margin-bottom:10px; background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow-xs);}
.ldx-brand-logo{flex:0 0 auto; width:34px; height:34px; border-radius:10px; background:linear-gradient(145deg,#FB8C3C,var(--accent)); color:#fff; display:grid; place-items:center; font-size:15px; font-weight:800; letter-spacing:-.02em;}
.ldx-brand-meta{min-width:0;}
.ldx-brand-meta b{display:block; font-size:13.5px; font-weight:700; color:var(--ink); line-height:1.2; letter-spacing:-.01em;}
.ldx-brand-meta small{display:block; font-size:10.5px; color:var(--muted); line-height:1.35;}
.ldx-brand-tgl{flex:0 0 auto; margin-left:auto; display:inline-grid; place-items:center; width:24px; height:24px; border:none; border-radius:7px; background:none; color:var(--muted); cursor:pointer; transition:background .14s, color .14s;}
.ldx-brand-tgl svg{width:14px; height:14px; stroke:currentColor; fill:none; stroke-linecap:round; stroke-linejoin:round;}
.ldx-brand-tgl:hover{background:#E9EBF0; color:var(--ink2);}
.ldx-brand-tgl:focus-visible{outline:2px solid var(--accent); outline-offset:1px;}
/* Drawer-only chrome (below lg): close X in the brand card, the panel's top
   bar with the hamburger, and the backdrop. Hidden on desktop. */
.ldx-brand-x{display:none; flex:0 0 auto; margin-left:auto; place-items:center; width:34px; height:34px; border:none; border-radius:9px; background:none; color:var(--muted); cursor:pointer;}
.ldx-brand-x svg{width:16px; height:16px; stroke:currentColor; fill:none; stroke-linecap:round; stroke-linejoin:round;}
.ldx-brand-x:hover{background:#E9EBF0; color:var(--ink2);}
.ldx-mbar{display:none;}
.ldx-scrim{display:none;}
.ldx-burger{flex:0 0 auto; display:inline-grid; place-items:center; width:36px; height:36px; border:1px solid var(--border); border-radius:99px; background:var(--surface); color:var(--ink2); cursor:pointer; box-shadow:var(--shadow-xs);}
.ldx-burger svg{width:18px; height:18px; stroke:currentColor; fill:none; stroke-linecap:round;}
.ldx-burger:hover{background:#ECEEF2;}
.ldx-burger:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
.ldx-mbar-logo{width:28px; height:28px; border-radius:8px; font-size:13px;}
.ldx-mbar-meta{min-width:0; line-height:1.2;}
.ldx-mbar-meta b{display:block; font-size:13px; font-weight:700; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.ldx-mbar-meta small{display:block; font-size:10.5px; color:var(--muted); white-space:nowrap;}
.ldx-nav{display:flex; align-items:center; gap:11px; padding:8px 10px; border-radius:10px; border:1px solid transparent; color:var(--ink2); text-decoration:none; font-size:13px; font-weight:500; transition:background .14s, color .14s;}
.ldx-nav:hover{background:#ECEEF2; color:var(--ink);}
/* Active item = white raised pill (reference pattern), accent for the label. */
.ldx-nav.on{background:var(--surface); border-color:var(--border); color:var(--accent-ink); font-weight:600; box-shadow:0 1px 2px rgba(16,24,40,.06);}
.ldx-nav.trail{color:var(--accent-ink); font-weight:600;}
.ldx-ico{flex:0 0 auto; stroke:currentColor; opacity:.85;}
.ldx-nav.on .ldx-ico,.ldx-nav.trail .ldx-ico{opacity:1;}
.ldx-caret{margin-left:auto; width:13px; height:13px; stroke:currentColor; opacity:.55; transform:rotate(-90deg); transition:transform .16s;}
.ldx-caret.open{transform:rotate(0);}
.ldx-badge{margin-left:6px; font-size:10px; font-weight:700; background:var(--bad); color:#fff; border-radius:99px; padding:0 6px; line-height:16px;}
.ldx-children{display:none; margin:2px 0 6px 22px; padding-left:12px; border-left:1.5px solid var(--grid);}
.ldx-children.open{display:block;}
.ldx-sub{display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:8px; color:var(--ink2); text-decoration:none; font-size:12.5px; transition:background .14s, color .14s;}
.ldx-sub:hover{background:#ECEEF2; color:var(--ink);}
.ldx-sub.on{background:var(--surface); color:var(--accent-ink); font-weight:600; box-shadow:0 1px 2px rgba(16,24,40,.05);}
.ldx-pill{margin-left:auto; font-size:10px; font-weight:700; color:var(--bad); background:color-mix(in srgb,var(--bad) 12%,transparent); border-radius:99px; padding:0 6px; line-height:15px;}
/* Rail footer — FLAT identity row like the reference (photo/initials avatar,
   name, email, dots menu), no card box around it. */
.ldx-foot{margin-top:auto; padding-top:12px;}
.ldx-user{display:flex; align-items:center; gap:10px; min-width:0; padding:6px 4px;}
.ldx-uav{flex:0 0 auto; width:34px; height:34px; border-radius:99px; background:var(--accent); color:#fff; display:grid; place-items:center; font-size:11.5px; font-weight:700; letter-spacing:.02em;}
.ldx-uav-img{flex:0 0 auto; width:34px; height:34px; border-radius:99px; object-fit:cover;}
.ldx-umeta{flex:1; min-width:0; display:block;}
.ldx-umeta b{display:block; font-size:12.5px; font-weight:600; color:var(--ink); line-height:1.25; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.ldx-umeta small{display:block; font-size:10.5px; color:var(--muted); line-height:1.35; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
/* Horizontal ⋯ like the reference — the shared menu button draws vertical
   dots, so the rail variant just rotates them. */
.ldx-user .ldx-acct{width:28px; height:28px;}
.ldx-user .ldx-acct svg{transform:rotate(90deg);}

/* Search — pill trigger, panel on click or "/". */
.ldx-search{position:relative;}
.ldx-searchbtn{display:inline-flex; align-items:center; gap:8px; width:100%; height:36px; padding:0 8px 0 12px; font:inherit; font-size:12.5px; color:var(--muted); text-align:left; background:var(--surface); border:1px solid var(--border); border-radius:99px; box-shadow:var(--shadow-xs); cursor:pointer; transition:border-color .14s, background .14s;}
.ldx-searchbtn:hover{border-color:color-mix(in srgb,var(--accent) 35%,var(--border));}
.ldx-searchbtn:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
.ldx-searchbtn svg{width:15px; height:15px; stroke:var(--muted); fill:none; flex:0 0 auto; stroke-linecap:round;}
.ldx-searchbtn span{flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.ldx-searchbtn kbd{flex:0 0 auto; font:inherit; font-size:10.5px; font-weight:600; color:var(--muted); background:var(--page); border:1px solid var(--border); border-radius:7px; padding:1px 7px; line-height:16px;}
/* Anchored LEFT: the trigger sits on the rail, so the panel opens rightward
   over the workspace instead of running off the screen edge. */
.ldx-searchpop{position:absolute; top:calc(100% + 8px); left:0; z-index:40; width:min(330px, calc(100vw - 24px)); background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:0 4px 10px -4px rgba(16,24,40,.10),0 24px 44px -20px rgba(16,24,40,.22); overflow:hidden; animation:ldselin .13s ease;}
.ldx-searchfield{display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--grid);}
.ldx-searchfield svg{width:15px; height:15px; stroke:var(--muted); fill:none; flex:0 0 auto; stroke-linecap:round;}
.ldx-searchfield input{flex:1; min-width:0; border:none; outline:none; background:none; font:inherit; font-size:13px; color:var(--ink);}
.ldx-searchfield input::placeholder{color:var(--muted);}
.ldx-searchlist{max-height:300px; overflow-y:auto; padding:5px;}
.ldx-searchopt{display:flex; align-items:baseline; gap:8px; width:100%; text-align:left; border:none; background:none; font:inherit; padding:8px 10px; border-radius:7px; cursor:pointer;}
.ldx-searchopt:hover{background:var(--wash);}
.ldx-searchlab{font-size:12.5px; font-weight:600; color:var(--ink);}
.ldx-searchgrp{margin-left:auto; font-size:10.5px; color:var(--muted); white-space:nowrap;}

/* Collapsed rail — icons only. Labels and section headings go, the width
   halves, and .ldx-main reflows because the rail's width is its flex basis. */
.ldx.rail .ldx-side{flex-basis:76px;}
.ldx.rail .ldx-caret,
.ldx.rail .ldx-children,
.ldx.rail .ldx-brand-meta,
.ldx.rail .ldx-umeta,
.ldx.rail .ldx-nav>span:not(.ldx-badge){display:none;}
.ldx.rail .ldx-brand{flex-direction:column; gap:6px; padding:8px 6px;}
.ldx.rail .ldx-brand-tgl{margin-left:0;}
.ldx.rail .ldx-user{flex-direction:column; gap:6px; padding:8px 6px;}
/* font-size:0 because the nav labels are bare text nodes, not elements — there
   is no selector that can hide them. It has to be undone on the badge, which
   is an element and must keep its digits. */
.ldx.rail .ldx-nav{justify-content:center; padding-left:0; padding-right:0; font-size:0;}
.ldx.rail .ldx-badge{font-size:10px;}
.ldx.rail .ldx-nav .ldx-ico{margin:0;}
/* Gray rail, white workspace: the main column stays on the rail's gray and
   the actual workspace is a rounded white panel inset by a gutter on its top,
   right and bottom edges — the gray flows from the sidebar around it. */
.ldx-main{flex:1; min-width:0; height:calc(100vh * var(--ui-scale-inv, 1)); overflow:hidden; display:flex; flex-direction:column; padding:14px 14px 14px 0;}
.ldx-panel{position:relative; flex:1 1 auto; min-height:0; display:flex; flex-direction:column; background:var(--surface); border:1px solid var(--border); border-radius:18px; box-shadow:var(--shadow-xs); overflow:hidden;}
.ldx-content-scroll-flow{position:relative; min-height:100%;}
/* .ldx-fld / .ldsel / .ldx-add once lived in the shell's top bar; the pages'
   ScopeFilters pickers still render them, so the styles stay. */
.ldx-fld{display:inline-flex; align-items:center; gap:6px; margin-right:8px;}
.ldx-fld>span{font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--muted);}
.ldx-add{background:none; border:1px dashed var(--border); border-radius:99px; padding:3px 11px; font:inherit; font-size:11px; font-weight:600; color:var(--ink2); cursor:pointer;}
.ldx-add:hover{border-color:var(--accent); color:var(--accent-ink);}
/* modern combobox */
.ldsel-wrap{position:relative;}
.ldsel-btn{display:inline-flex; align-items:center; gap:8px; min-width:170px; max-width:246px; font:inherit; font-size:11.5px; font-weight:600; color:var(--ink); background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:7px 12px; cursor:pointer; box-shadow:0 1px 2px rgba(16,24,40,.03); transition:border-color .14s, box-shadow .14s, background .14s;}
.ldsel-btn:hover{border-color:color-mix(in srgb,var(--accent) 40%,var(--border));}
.ldsel-btn.open{border-color:var(--accent); box-shadow:0 0 0 3px var(--wash);}
.ldsel-btn.set{background:var(--wash); border-color:color-mix(in srgb,var(--accent) 48%,var(--border)); color:var(--accent-ink);}
.ldsel-btn.set.open{background:var(--surface);}
.ldsel-val{flex:1; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.ldsel-chev{width:14px; height:14px; stroke:var(--muted); flex:0 0 auto; transition:transform .16s;}
.ldsel-btn.set .ldsel-chev{stroke:var(--accent-ink);}
.ldsel-btn.open .ldsel-chev{transform:rotate(180deg); stroke:var(--accent);}
.ldsel-pop{position:absolute; top:calc(100% + 6px); left:0; z-index:30; min-width:min(238px, calc(100vw - 24px)); max-width:min(330px, calc(100vw - 24px)); background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:0 4px 10px -4px rgba(16,24,40,.10),0 24px 44px -20px rgba(16,24,40,.22); overflow:hidden; animation:ldselin .13s ease;}
@keyframes ldselin{from{opacity:0; transform:translateY(-4px);} to{opacity:1; transform:none;}}
.ldsel-srch{display:flex; align-items:center; gap:7px; padding:9px 11px; border-bottom:1px solid var(--grid);}
.ldsel-srch svg{width:14px; height:14px; stroke:var(--muted); flex:0 0 auto;}
.ldsel-srch input{flex:1; min-width:0; border:none; outline:none; background:none; font:inherit; font-size:12px; color:var(--ink);}
.ldsel-srch input::placeholder{color:var(--muted);}
.ldsel-list{max-height:264px; overflow-y:auto; padding:5px;}
.ldsel-opt{display:flex; align-items:center; gap:8px; width:100%; text-align:left; border:none; background:none; font:inherit; font-size:12px; color:var(--ink2); padding:8px 10px; border-radius:7px; cursor:pointer;}
.ldsel-opt.act{background:color-mix(in srgb,var(--muted) 14%,transparent); color:var(--ink);}
.ldsel-opt.sel{background:var(--wash); color:var(--accent-ink); font-weight:650;}
.ldsel-opt.sel.act{background:color-mix(in srgb,var(--accent) 17%,transparent);}
.ldsel-optlab{flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.ldsel-check{width:15px; height:15px; stroke:var(--accent); flex:0 0 auto;}
.ldsel-empty{padding:16px 12px; text-align:center; font-size:11.5px; color:var(--muted);}
/* Account avatar sits at the far right of the top bar, after the status text.
   The dropdown itself is portalled to the body, so it uses the global design
   tokens rather than the --ldx palette. */
.ldx-acct{flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; padding:0; border:none; border-radius:99px; background:none; color:var(--ink2); cursor:pointer; transition:background .14s;}
.ldx-acct:hover{background:color-mix(in srgb,var(--muted) 12%,transparent);}
.ldx-acct:disabled{cursor:default; opacity:.6;}
.ldx-acct:focus-visible{outline:2px solid var(--accent); outline-offset:2px;}
/* Full-bleed. The old 1120px cap left a dead column on the right of any
   monitor wider than ~1400px; these are operational list/grid views, which
   subdivide their own space, so they use the whole viewport. Padding scales up
   on large monitors so content breathes at the edges instead of touching them. */
.ldx-content{flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; padding:20px 26px 36px; max-width:none; scrollbar-width:thin; scrollbar-color:#CBD1D9 transparent;}
/* Workspace scrollbar — slim, trackless, and inset from the panel's rounded
   corners so the thumb never cuts across the radius. */
.ldx-content::-webkit-scrollbar{width:8px;}
.ldx-content::-webkit-scrollbar-track{background:transparent; margin:18px 0;}
.ldx-content::-webkit-scrollbar-thumb{background:#CBD1D9; border-radius:99px; border:2px solid transparent; background-clip:padding-box;}
.ldx-content::-webkit-scrollbar-thumb:hover{background:#B4BBC6; background-clip:padding-box;}
/* Fit mode: no scroll here — the view is a column that hands its leftover
   height to the list, which scrolls internally. */
.ldx-content.fit{overflow:hidden; display:flex; flex-direction:column; padding-bottom:16px;}
/* Fit-mode flex chain for RTable-based views (e.g. fb-summary). The scroll
   flow, ReportShell wrapper, and ldc-list all become flex columns so the
   scroll region (.ldc-scroll) can flex:1 min-h:0 and fill the leftover
   viewport height. Pagination (.ldr-pgn) keeps its natural height at the
   bottom. Kept fit-mode-only so document-scroll views are untouched. */
.ldx-content.fit .ldx-content-scroll-flow{display:flex; flex-direction:column; flex:1 1 auto; min-height:0;}
.ldx-content.fit .ldr-shell{display:flex; flex-direction:column; flex:1 1 auto; min-height:0;}
.ldx-content.fit .ldr-shell > .ldc-list{display:flex; flex-direction:column; flex:1 1 auto; min-height:0; margin-bottom:0;}
.ldx-content.fit .ldr-shell > .ldc-list > .ldc-scroll{flex:1 1 auto; min-height:0; max-height:none;}
/* Hosted course screens run edge to edge — they supply their own gutters. */
.ldx-content.bleed{padding:0;}
/* Hosted admin pages: definite height like DashboardLayout's h-full wrapper.
   The bell is hidden there — the admin workspace's own action slot
   (+ Add Client / + Add Service) occupies that top-right corner. */
.ldx-content.admin-host .ldx-content-scroll-flow{height:100%;}
@media (min-width:1600px){ .ldx-content{padding:24px 36px 40px;} .ldx-content.fit{padding-bottom:20px;} .ldx-content.bleed{padding:0;} }
@media (min-width:1920px){ .ldx-content{padding:28px 44px 44px;} .ldx-content.fit{padding-bottom:24px;} .ldx-content.bleed{padding:0;} }
/* Dashboard side gutters match StaffLayout: 16px on mobile, 24px on desktop. */
.ldx-content.dashboard-spacing{padding-left:16px; padding-right:16px;}
@media (min-width:768px){ .ldx-content.dashboard-spacing{padding-left:24px; padding-right:24px;} }

/* ── Dark ────────────────────────────────────────────────────────────────
   The theme control in the rail is only honest if this shell answers it. The
   whole palette lives in the 5 declarations at the top of .ldx, so dark mode
   is a re-declaration of those variables and nothing else — every rule below
   reads through them. Surfaces step UP in lightness as they come forward,
   which is how depth reads on a dark ground. The ink ramp INVERTS and stays
   COOL, mirroring globals.css's own dark block. accent-ink lifts to brand-400
   rather than dropping to 700: on a dark ground the deep shade is the one that
   loses contrast, so the light/dark relationship reverses. */
.dark .ldx{
  --page:#0E0F12; --surface:#17181C; --ink:#F9FAFB; --ink2:#D1D5DB; --muted:#9CA3AF;
  --grid:#23252B; --border:#2A2D34; --accent:#F97316; --accent-ink:#FB8C3C;
  --wash:rgba(249,115,22,0.16); --good:#22C55E; --good-ink:#4ADE80; --warn:#EAB308; --bad:#F87171;
  --sh:0 1px 2px rgba(0,0,0,.34),0 12px 28px -16px rgba(0,0,0,.60);
  /* Dark twins of the scoped design-token overrides above — required, or the
     light values on this element would beat html.dark's own declarations. */
  --surface-sunken:#0E0F12; --hairline:#23252B; --hairline-strong:#31343C;
  --color-line:#23252B; --color-line-strong:#31343C; --color-canvas:#0E0F12; --color-row-hover:#1E2025;
  --shadow-xs:0 1px 2px rgba(0,0,0,.40);
  --shadow-sm:0 1px 2px rgba(0,0,0,.40),0 8px 20px -14px rgba(0,0,0,.50);
}
/* Hovers hardcoded to light gray above get dark twins too. */
.dark .ldx-nav:hover,.dark .ldx-sub:hover,.dark .ldx-iconbtn:hover,.dark .ldx-burger:hover{background:#1C1E23;}
.dark .ldx-nav.on{box-shadow:0 1px 2px rgba(0,0,0,.40);}
.dark .ldx-searchbtn{background:#1D1F25;}
.dark .ldx-brand-tgl:hover,.dark .ldx-brand-x:hover{background:#1C1E23;}
.dark .ldx-content{scrollbar-color:#3A3E46 transparent;}
.dark .ldx-content::-webkit-scrollbar-thumb{background:#3A3E46; background-clip:padding-box;}
.dark .ldx-content::-webkit-scrollbar-thumb:hover{background:#4A4F58; background-clip:padding-box;}
.dark .ldsel-btn{background:#1D1F25;}
.dark .ldsel-btn:hover,.dark .ldsel-btn.open,.dark .ldsel-btn.set.open{background:#232529;}

/* Below lg the rail leaves the flow and becomes an off-canvas drawer, opened
   by the hamburger in the panel's top bar (.ldx-mbar). */
@media (max-width:1023px){
  .ldx-side{position:fixed; top:0; left:0; bottom:0; z-index:1100; flex:none; align-self:auto; height:auto; width:min(280px, calc(100vw - 48px)); background:var(--page); box-shadow:0 10px 40px rgba(16,24,40,.22); overscroll-behavior:contain; transform:translateX(-100%); visibility:hidden; transition:transform .22s ease, visibility .22s;}
  .ldx.nav-open .ldx-side{transform:none; visibility:visible;}
  .ldx-scrim{display:block; position:fixed; inset:0; z-index:1090; background:rgba(15,23,42,.4);}
  .ldx-brand-tgl{display:none;}
  .ldx-brand-x{display:inline-grid;}
  /* The gutter wraps all four sides — no rail beside the panel any more. */
  .ldx-main{padding:14px;}
  .ldx-mbar{display:flex; align-items:center; gap:10px; flex:0 0 auto; height:52px; padding:0 12px; border-bottom:1px solid var(--grid); background:var(--surface); border-radius:18px 18px 0 0;}
}
@media (max-width:820px){
  .ldx{flex-direction:column;}
  /* Below the tablet break the shell returns to normal document scrolling —
     a fixed viewport column is unusable next to a mobile keyboard. The gutter
     wraps all four sides here since the rail is an off-canvas drawer. */
  .ldx-main{height:auto; overflow:visible; padding:10px;}
  .ldx-panel{overflow:visible;}
  .ldx-content, .ldx-content.fit{overflow:visible; display:block;}
  /* Document scroll: keep the hamburger bar reachable while scrolling. */
  .ldx-mbar{position:sticky; top:0; z-index:30;}
}
@media (max-width:640px){
  .ldx-content{padding:14px 12px 24px;}
  .ldx-content.bleed{padding:0;}
  .ldx-content.dashboard-spacing{padding-left:12px; padding-right:12px;}
}
@media print{ .ldx-mbar, .ldx-scrim{display:none !important;} }
`;
 
 