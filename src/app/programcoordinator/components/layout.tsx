"use client";

/**
 * Program-coordinator shell — floating-workspace layout, matching the rest of
 * the product: gray canvas, flat sidebar, page content in a white rounded
 * panel inset by a gray gutter, internal panel scroll. The old top navbar
 * (Navbarpro) is retired: its only REAL functions moved — logout + identity
 * to the sidebar footer (now showing the actual signed-in user instead of the
 * hard-coded "John Doe"), notifications to the shared NotificationBell pinned
 * in the panel corner. The fake search/Teams/Apps buttons had no behavior and
 * were dropped. The useSidebarpro API is unchanged.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebarpro } from "./sidebar";
import NotificationBell from "@/app/lms/component/NotificationBell";
import { ToastContainer } from "react-toastify";

// Create context for sidebar state
const SidebarContext = createContext<{
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}>({
    isCollapsed: true,
    setIsCollapsed: () => { },
});

export const useSidebarpro = () => useContext(SidebarContext);

export default function DashboardLayoutlms({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(true); // Default closed
    const pathname = usePathname();

    // Below lg the sidebar is an off-canvas drawer: "expanded" means open.
    // Close it on navigation, on Escape, and when growing back to desktop.
    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) setIsCollapsed(true);
    }, [pathname]);

    useEffect(() => {
        if (isCollapsed) return;
        const mq = window.matchMedia("(max-width: 1023px)");
        if (!mq.matches) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsCollapsed(true);
        };
        const onMq = () => {
            if (!mq.matches) setIsCollapsed(true);
        };
        document.addEventListener("keydown", onKey);
        mq.addEventListener?.("change", onMq);
        return () => {
            document.removeEventListener("keydown", onKey);
            mq.removeEventListener?.("change", onMq);
        };
    }, [isCollapsed]);

    return (
        <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <div className="h-dvh flex bg-[#F5F6F8]">
                {/* Sidebar — flat on the gray canvas. Below lg it becomes an
                    off-canvas drawer (fixed); the sidebar renders its own
                    backdrop and close button there. */}
                <aside
                    className={`flex-shrink-0 h-full max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-overlay max-lg:h-auto ${isCollapsed ? "max-lg:hidden" : ""}`}
                >
                    <Sidebarpro />
                </aside>

                {/* Floating white workspace panel. Below lg the rail is
                    off-canvas, so the gutter wraps all four sides. */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3.5 pl-0 max-lg:pl-3.5 max-md:p-2.5 max-md:pl-2.5">
                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
                        {/* Below lg: compact top bar — drawer hamburger + bell. */}
                        <div className="flex h-12 flex-shrink-0 items-center gap-2.5 border-b border-[#EAECF0] px-3 lg:hidden">
                            <button
                                type="button"
                                onClick={() => setIsCollapsed(false)}
                                aria-label="Open navigation"
                                aria-expanded={!isCollapsed}
                                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-gray-700 shadow-[0_1px_2px_rgba(16,24,40,.04)]"
                            >
                                <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
                            </button>
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-800">Program Coordinator</span>
                            <NotificationBell />
                        </div>
                        {/* Notifications sit alone in the panel's top-right corner. */}
                        <div className="absolute top-3 right-4 z-30 max-lg:hidden">
                            <NotificationBell />
                        </div>
                        <main className="sc-panel-scroll min-h-0 flex-1 overflow-y-auto p-3">
                            <div className="mx-auto">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </SidebarContext.Provider>
    );
}
