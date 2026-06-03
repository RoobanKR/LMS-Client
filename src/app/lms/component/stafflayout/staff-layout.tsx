"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { StaffSidebar } from "./staff-sidebar"
import { StaffTopBar } from "./staff-navbar"

interface StaffLayoutProps {
  children: React.ReactNode
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"))
    checkDark()
    const obs = new MutationObserver(checkDark)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) setSidebarOpen(false)
  }, [pathname])

  const getActiveRoute = () => {
    if (pathname.includes("/notifications")) return "notifications"
    if (pathname.includes("/courses"))       return "courses"
    if (pathname.includes("/dashboard"))     return "dashboard"
    if (pathname.includes("/profile"))       return "profile"
    if (pathname.includes("/grades"))        return "grades"
    if (pathname.includes("/assignments"))   return "assignments"
    if (pathname.includes("/messages"))      return "messages"
    if (pathname.includes("/resources"))     return "resources"
    if (pathname.includes("/schedule"))      return "schedule"
    if (pathname.includes("/progress"))      return "progress"
    if (pathname.includes("/settings"))      return "settings"
    if (pathname.includes("/students"))      return "students"
    if (pathname.includes("/analytics"))     return "analytics"
    if (pathname.includes("/logs"))          return "logs"
    if (pathname.includes("/help"))          return "help"
    return "dashboard"
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: isDark ? "#12121f" : "#f8f8fa",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Sidebar — full height, fixed, z-50 */}
      <StaffSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRoute={getActiveRoute()}
      />

      {/* Content area — offset by sidebar, NO fixed navbar */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 ease-out",
          sidebarOpen ? "md:ml-[220px]" : "md:ml-0"
        )}
      >
        <div className="p-3 md:px-4 md:py-4">
          {/* Top bar — search + bell + theme + profile — inline, not fixed */}
          <StaffTopBar
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
          />

          {/* Page content */}
          {children}
        </div>
      </div>
    </div>
  )
}