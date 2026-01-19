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
  // Default to closed on mobile, open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()

  // Close sidebar automatically on route change (mobile only)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar on mobile when path changes
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [pathname])

  // Determine active route for highlighting
  const getActiveRoute = () => {
    if (pathname.includes('/notifications')) return 'notifications';
    if (pathname.includes('/courses')) return 'courses';
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/profile')) return 'profile';
    if (pathname.includes('/notes')) return 'notes';
    if (pathname.includes('/ai') || pathname.includes('/chat')) return 'ai';
    if (pathname.includes('/settings')) return 'settings';
    if (pathname.includes('/assignments')) return 'assignments';
    if (pathname.includes('/resources')) return 'resources';
    return 'dashboard';
  };

  const activeRoute = getActiveRoute()

  return (
    <div className="min-h-screen bg-slate-50/50">
      
      {/* 1. Top Navigation (Fixed Height: 72px) */}
      <StudentNavbar 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        isSidebarOpen={sidebarOpen}
        activeRoute={activeRoute}
        // Add your other handlers here (onAIClick, etc.)
      />

      {/* 2. Sidebar (Fixed Width: 280px, Top: 72px) */}
      <StudentSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        activeRoute={activeRoute}
      />

      {/* 3. Main Content Area */}
      <main 
        className={cn(
          "min-h-screen transition-all duration-300 ease-out",
          // Top padding matches Navbar height (72px)
          "mt-[72px]", 
          // Left margin matches Sidebar width (280px) only when open on desktop
          sidebarOpen ? "md:ml-[280px]" : "md:ml-0"
        )}
      >
        {/* Container with padding for content breathing room */}
        <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-[1600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>

    </div>
  )
}