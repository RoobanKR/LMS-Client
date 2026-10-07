"use client";

/**
 * Admin shell — floating-workspace layout (same pattern as the L&D console and
 * student shells): one continuous gray canvas, the sidebar flat on it, and the
 * page content inside a white rounded panel inset by a gray gutter on its top,
 * right and bottom. There is NO top navbar anymore — its jobs moved:
 *   collapse toggle → sidebar brand card · notifications → bell pinned in the
 *   panel corner · ⌘K CommandPalette → mounted here (it registers its own
 *   hotkey) · breadcrumbs/"New" menu/Help/Settings icons → retired (all their
 *   targets are one click away in the sidebar or the account menu).
 * The public API is unchanged: default-export DashboardLayout + useSidebar(),
 * so the ~30 pages that wrap themselves in this shell keep compiling as-is.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "../shared/ui/CommandPalette";
import { useAccountMenu } from "../pages/courses/coursesdetailedview/components/useAccountMenu";
import { ToastContainer } from "react-toastify";
import { Poppins } from "next/font/google";
import { useSyncPermissions } from "@/hooks/useSyncPermissions";
import { SidebarContext, useSidebar } from "./dashboard-context";
export { useSidebar } from "./dashboard-context";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { hasSidebar } = useSidebar();
  // Existing page wrappers become content-only inside the persistent layout.
  return hasSidebar ? <>{children}</> : <DashboardShell>{children}</DashboardShell>;
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  // Expanded by default on desktop (matches the design); collapsed on mobile.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Below lg the rail is an off-canvas drawer, closed by default. Desktop
  // (>= lg) keeps the in-flow rail driven by isCollapsed exactly as before.
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { handleLogout } = useAccountMenu();

  // Refresh permissions on navigation without remounting the sidebar.
  useSyncPermissions();

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  }, []);

  // Drawer closes on navigation, on Escape, and when the viewport grows back
  // to the desktop rail.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => {
      if (mq.matches) setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    mq.addEventListener?.("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener?.("change", onMq);
    };
  }, [mobileOpen]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, hasSidebar: true, mobileOpen, setMobileOpen }}>
      {/* Print rules: hide the shell chrome (sidebar, notification bell,
          mobile menu button, and anything a page tagged as .no-print) so
          window.print() gives the reader just the page content. Unwrap the
          floating panel — no rounded card, no shadow, no gutter — and let
          <main> flow the full page. Applies to every page under this shell,
          so a page just needs .no-print on its toolbar / paginator to reach
          a clean print layout. */}
      <style jsx global>{`
        @media print {
          html, body { background: #fff !important; }
          .no-print, .no-print * { display: none !important; }
          .print-only { display: block !important; }
          aside.dashboard-aside { display: none !important; }
          .dashboard-shell { padding: 0 !important; height: auto !important; overflow: visible !important; }
          .dashboard-panel {
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .dashboard-main {
            overflow: visible !important;
            height: auto !important;
          }
          @page { margin: 14mm; }
        }
        .print-only { display: none; }
      `}</style>
      <div
        className={`${poppins.variable} dashboard-shell h-dvh flex bg-surface-sunken`}
        style={{ fontFamily: "var(--font-poppins), 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        {/* Below lg: dimmed backdrop behind the off-canvas drawer. */}
        {mobileOpen && (
          <div
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
            className="no-print fixed inset-0 z-[1090] bg-black/40 lg:hidden"
          />
        )}

        {/* Full-height sidebar, flat on the gray canvas. Below lg it becomes
            an off-canvas drawer (fixed, slides in from the left). */}
        <aside
          className={`dashboard-aside no-print flex-shrink-0 h-full max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-overlay max-lg:h-auto max-lg:bg-surface-sunken max-lg:shadow-xl max-lg:transition-[transform,visibility] max-lg:duration-200 ${mobileOpen ? "max-lg:translate-x-0" : "max-lg:invisible max-lg:-translate-x-full"}`}
        >
          <Sidebar />
        </aside>

        {/* Floating white workspace: the canvas shows through as a gutter on
            the panel's top, right and bottom edges, flowing from the rail.
            Below lg the rail is off-canvas, so the gutter wraps all sides. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3.5 pl-0 max-lg:pl-3.5 max-md:p-2.5 max-md:pl-2.5">
          <div className="dashboard-panel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-hairline bg-surface shadow-xs">

            {/* Below lg: compact top bar with the drawer's hamburger. */}
            <div className="no-print flex h-12 flex-shrink-0 items-center gap-2.5 border-b border-hairline px-3 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-body shadow-xs"
              >
                <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-tile bg-gradient-to-b from-brand-400 to-brand-600 shadow-sm">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="min-w-0 truncate text-sm font-bold tracking-[-0.01em] text-heading">SmartCliff</span>
            </div>

            {/* overflow-x-hidden is explicit: without it, overflow-y-auto
                alone computes overflow-x to auto per CSS spec, and any child
                that overflows produces a page-level horizontal scrollbar. */}
            <main className="dashboard-main sc-panel-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {/* Notifications sit inside the panel's top-right corner, but as
                  an absolute anchored to a relative wrapper INSIDE the scroll
                  flow — the bell scrolls up with the content instead of
                  staying pinned over it, which is what the admin dashboard's
                  Refresh row (and everything else on tall pages) used to slide
                  awkwardly beneath.
                  `h-full` (not min-h-full) so child pages using their own
                  h-full chain to fit the viewport can resolve — CSS percentage
                  heights need a definite parent height, and min-height does
                  not provide one. Overflowing children still bubble scroll up
                  to <main>, so tall pages behave the same as before. */}
              <div className="relative h-full">
                {/* Notification bell removed from the panel corner — the
                    Notification entry lives in the sidebar now, with its
                    own unread indicator. */}
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Global command palette (⌘K / Ctrl+K) — used to be mounted by the
          navbar; it registers its own hotkey, so mounting it here keeps the
          shortcut alive with no visible trigger. */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSignOut={handleLogout}
      />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </SidebarContext.Provider>
  );
}
