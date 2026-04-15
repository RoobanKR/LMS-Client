"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { StudentNavbar } from "./student-navbar"
import { StudentSidebar } from "./student-sidebar"
import { cn } from "@/lib/utils"

interface StudentLayoutProps {
  children: React.ReactNode
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [pathname])

  const getActiveRoute = () => {
    if (pathname.includes('/notifications')) return 'notifications'
    if (pathname.includes('/courses')) return 'courses'
    if (pathname.includes('/dashboard')) return 'dashboard'
    if (pathname.includes('/profile')) return 'profile'
    if (pathname.includes('/grades')) return 'grades'
    if (pathname.includes('/assignments')) return 'assignments'
    if (pathname.includes('/messages')) return 'messages'
    if (pathname.includes('/resources')) return 'resources'
    if (pathname.includes('/schedule')) return 'schedule'
    if (pathname.includes('/progress')) return 'progress'
    if (pathname.includes('/settings')) return 'settings'
    if (pathname.includes('/ai') || pathname.includes('/chat')) return 'ai'
    return 'dashboard'
  }

  const activeRoute = getActiveRoute()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      <StudentNavbar
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        isSidebarOpen={sidebarOpen}
        activeRoute={activeRoute}
      />

      <StudentSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeRoute={activeRoute}
      />

      <main className={cn(
        "min-h-screen pt-[60px] transition-all duration-300 ease-out",
        sidebarOpen ? "md:ml-[240px]" : "md:ml-0"
      )}>
        <div className={cn(
          "min-h-[calc(100vh-60px)] p-4 md:p-6",
          "animate-in fade-in slide-in-from-bottom-2 duration-400"
        )}>
          {children}
        </div>
      </main>
    </div>
  )
}