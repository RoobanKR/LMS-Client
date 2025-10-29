"use client";

import { createContext, useContext, useState } from "react";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { ToastContainer } from "react-toastify";


// Create context for sidebar state
const SidebarContext = createContext<{
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}>({
  isCollapsed: true,
  setIsCollapsed: () => { },
});

export const useSidebar = () => useContext(SidebarContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true); // Default closed

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="h-screen flex flex-col">
        {/* Navbar */}
        <Navbar />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Hidden on mobile, visible on md+ */}
          <aside className="flex-shrink-0">
            <Sidebar />
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto ">
            <div className="mx-auto p-2">
              {children}
            </div>
          </main>
        </div>
      </div>
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