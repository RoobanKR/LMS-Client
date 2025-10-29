"use client";

import { createContext, useContext, useState } from "react";
import { Navbarpro } from "./navbar";
import { Sidebarpro } from "./sidebar";
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

export default function DashboardLayoutProgramcoordinator({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(true); // Default closed

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
            <div className="h-screen flex flex-col">
                {/* Navbar */}
                <Navbarpro />

                {/* Main content area */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar - Hidden on mobile, visible on md+ */}
                    <aside className="flex-shrink-0">
                        <Sidebarpro />
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 overflow-y-auto bg-white-100   p-2">
                        <div className="mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </SidebarContext.Provider>
    );
}