"use client"

import type React from "react"

import { useState } from "react"
import { StudentNavbar } from "./student-navbar"
import { StudentSidebar } from "./student-sidebar"

interface StudentLayoutProps {
  children: React.ReactNode
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <StudentNavbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} />

      {/* Sidebar */}
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className={` transition-all duration-300 ease-in-out ${sidebarOpen ? "md:ml-64" : "md:ml-0"}`}>
        <div className="container mx-auto ">{children}</div>
      </main>
    </div>
  )
}
