"use client"

import type React from "react"

import { useState } from "react"
import {
  BookOpen,
  Calendar,
  BarChart3,
  MessageSquare,
  FileText,
  Trophy,
  Clock,
  ChevronRight,
  Home,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface SidebarItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string | number
  isActive?: boolean
  subItems?: { label: string; href: string }[]
}

const sidebarItems: SidebarItem[] = [
  {
    icon: Home,
    label: "Dashboard",
    href: "/dashboard",
    isActive: true,
  },
  {
    icon: BookOpen,
    label: "My Courses",
    href: "/courses",
    badge: 4,
    subItems: [
      { label: "Mathematics 101", href: "/courses/math-101" },
      { label: "Physics 201", href: "/courses/physics-201" },
      { label: "Chemistry 150", href: "/courses/chemistry-150" },
      { label: "Biology 120", href: "/courses/biology-120" },
    ],
  },
  {
    icon: FileText,
    label: "Assignments",
    href: "/assignments",
    badge: 3,
  },
  {
    icon: Calendar,
    label: "Schedule",
    href: "/schedule",
  },
  {
    icon: BarChart3,
    label: "Progress",
    href: "/progress",
  },
  {
    icon: MessageSquare,
    label: "Messages",
    href: "/messages",
    badge: 2,
  },
  {
    icon: Trophy,
    label: "Achievements",
    href: "/achievements",
  },
  {
    icon: Clock,
    label: "Study Time",
    href: "/study-time",
  },
]

interface StudentSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function StudentSidebar({ isOpen = true, onClose }: StudentSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (label: string) => {
    setExpandedItems((prev) => (prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]))
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 transform border-r transition-transform duration-300 ease-in-out",
          "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Student info section */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">John Smith</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Computer Science</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {sidebarItems.map((item) => (
                <li key={item.label}>
                  <Button
                    variant={item.isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10",
                      "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                      /* Orange active state */
                      item.isActive && "bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700"
                    )}
                    onClick={() => item.subItems && toggleExpanded(item.label)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      /* Orange notification badges */
                      <Badge
                        variant="secondary"
                        className="ml-auto h-5 px-1.5 text-xs bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {item.subItems && (
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform",
                          expandedItems.includes(item.label) && "rotate-90",
                        )}
                      />
                    )}
                  </Button>

                  {/* Sub-items */}
                  {item.subItems && expandedItems.includes(item.label) && (
                    <ul className="mt-1 ml-6 space-y-1">
                      {item.subItems.map((subItem) => (
                        <li key={subItem.label}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                          >
                            {subItem.label}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick stats */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2 rounded-lg bg-orange-50 border border-orange-100 dark:bg-orange-900/20 dark:border-orange-800/30">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">12</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
              </div>
              <div className="p-2 rounded-lg bg-orange-50 border border-orange-100 dark:bg-orange-900/20 dark:border-orange-800/30">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">3</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}