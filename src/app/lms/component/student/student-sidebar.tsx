"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { notificationsService, notificationKeys } from "@/apiServices/notifications"
import { useQuery } from "@tanstack/react-query"
import * as LucideIcons from "lucide-react"

import {
  ShieldCheck, Home, User, Bell, BookOpen, FileText, Trophy,
  GraduationCap, Calendar, MessageSquare, BarChart3, Settings2,
  Clock, Computer, Users, Bookmark, Target, Zap, Layers, Award,
  Briefcase, LayoutDashboard, FolderOpen, ClipboardCheck, Video,
  Activity, TrendingUp, CheckCircle, FileBarChart, FolderTree,
  Brain, Lightbulb, Plus, Moon, Sun, ArrowLeft, Sparkles, Flame, X
} from "lucide-react"

interface SidebarItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: string | number
  isActive?: boolean
  permissionKey?: string
  color?: string
  progress?: number
  count?: number
}

interface StudentSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  activeRoute?: string
}

interface UserPermission {
  _id: string
  permissionName: string
  permissionKey: string
  permissionFunctionality: string[]
  icon: string
  color: string
  description: string
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

interface UserData {
  _id: string
  email: string
  firstName: string
  lastName: string
  courses: any[]
  permissions: UserPermission[]
  lastAccessed?: string
  createdAt?: string
  updatedAt?: string
  role?: { _id: string; originalRole: string; renameRole: string; roleValue: string }
  status?: string
}

const USER_DATA_KEY = "smartcliff_userData"
const THEME_KEY = "theme"

const getCurrentUserLocal = (): { valid: boolean; user: UserData | null } => {
  try {
    const userDataString = localStorage.getItem(USER_DATA_KEY)
    if (!userDataString) return { valid: false, user: null }
    const userData: UserData = JSON.parse(userDataString)
    return { valid: true, user: userData }
  } catch {
    return { valid: false, user: null }
  }
}

const getStoredTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  const storedTheme = localStorage.getItem(THEME_KEY) as 'light' | 'dark'
  if (storedTheme) return storedTheme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getIconByName = (iconName: string): any => {
  if (!iconName) return ShieldCheck
  if (LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons]
  }
  const iconMappings: Record<string, any> = {
    "dashboard": LayoutDashboard, "home": Home, "courses": BookOpen,
    "assignments": ClipboardCheck, "grades": Trophy, "messages": MessageSquare,
    "notifications": Bell, "resources": FolderOpen, "schedule": Calendar,
    "settings": Settings2, "users": Users, "profile": User,
    "book": BookOpen, "book-open": BookOpen, "file-text": FileText,
    "bar-chart-3": BarChart3, "chart": BarChart3,
    "graduation-cap": GraduationCap, "message-square": MessageSquare,
    "folder": FolderOpen, "clock": Clock, "bookmark": Bookmark,
    "target": Target, "zap": Zap, "layers": Layers, "award": Award,
    "clipboard-check": ClipboardCheck, "video": Video, "activity": Activity,
    "trending-up": TrendingUp, "brain": Brain, "sparkles": Sparkles, "flame": Flame,
  }
  return iconMappings[iconName.toLowerCase()] || ShieldCheck
}

const BASE_PATH = "/lms/pages/"

// Section grouping config
const SECTION_GROUPS: Record<string, string[]> = {
  "Main": ["dashboard", "courses", "assignments", "grades"],
  "Connect": ["messages", "notifications", "schedule"],
  "Account": ["resources", "profile", "settings", "help"],
}

export function StudentSidebar({ isOpen = true, onClose, activeRoute }: StudentSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [studentInfo, setStudentInfo] = useState({
    name: "Loading...",
    role: "Student",
    avatarLetter: "S",
    overallProgress: 0,
    streak: 0,
    enrolledCourses: 0,
  })

  useEffect(() => {
    const fetchData = () => {
      try {
        const userDataResponse = getCurrentUserLocal()
        if (!userDataResponse.valid || !userDataResponse.user) {
          setLoading(false)
          return
        }
        const user = userDataResponse.user
        const userCourses = user?.courses || []
        const userAnalytics = calculateUserAnalytics(user, userCourses)
        const items = buildSidebarItems(user, userAnalytics)
        setSidebarItems(items)

        setStudentInfo({
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Student",
          role: user.role?.renameRole || "Student",
          avatarLetter: user.firstName?.charAt(0).toUpperCase() || "S",
          overallProgress: userAnalytics.overallProgress,
          streak: calculateLearningStreak(userCourses),
          enrolledCourses: userAnalytics.enrolledCourses,
        })
      } catch (error) {
        console.error("Error fetching sidebar data:", error)
        setSidebarItems(getDefaultSidebarItems({ enrolledCourses: 0, completedCourses: 0, activeCourses: 0, overallProgress: 0, totalModules: 0, totalTopics: 0, attemptedExercises: 0, attemptedQuestions: 0 }))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const calculateUserAnalytics = (user: UserData | null, userCourses: any[]) => {
    const enrolledCourses = userCourses.length
    const completedCourses = userCourses.filter(c => calculateCourseProgress(c) >= 90).length
    const activeCourses = userCourses.filter(c => { const p = calculateCourseProgress(c); return p > 0 && p < 90 }).length
    const totalProgress = userCourses.reduce((sum, c) => sum + calculateCourseProgress(c), 0)
    const overallProgress = enrolledCourses > 0 ? Math.round(totalProgress / enrolledCourses) : 0
    let totalModules = 0, totalTopics = 0, attemptedExercises = 0, attemptedQuestions = 0
    userCourses.forEach(course => {
      totalModules += course.modules?.length || 0
      totalTopics += course.topics?.length || 0
      course.answers?.We_Do?.practical?.forEach((ex: any) => {
        if (ex.questions?.length) {
          attemptedExercises++
          attemptedQuestions += ex.questions.filter((q: any) => q.status === 'attempted' || q.status === 'evaluated' || q.submittedAt).length
        }
      })
    })
    return { enrolledCourses, completedCourses, activeCourses, overallProgress, totalModules, totalTopics, attemptedExercises, attemptedQuestions }
  }

  const calculateCourseProgress = (course: any) => {
    const practicals = course.answers?.We_Do?.practical
    if (!practicals?.length) return 0
    let attempted = 0, questions = 0
    practicals.forEach((ex: any) => {
      if (ex.questions?.length) {
        attempted++
        questions += ex.questions.filter((q: any) => q.status === 'attempted' || q.status === 'evaluated' || q.submittedAt).length
      }
    })
    return Math.round(((attempted / practicals.length) * 0.4 + (attempted > 0 ? questions / (attempted * 4) : 0) * 0.6) * 100)
  }

  const calculateLearningStreak = (userCourses: any[]) => {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return Math.min(userCourses.filter(c => new Date(c.lastAccessed || c.updatedAt || Date.now()) >= lastWeek).length, 7)
  }

  const buildSidebarItems = (user: UserData, userAnalytics: any): SidebarItem[] => {
    if (!user?.permissions?.length) return getDefaultSidebarItems(userAnalytics)
    const sorted = [...user.permissions].filter(p => p.isActive).sort((a, b) => (a.order || 0) - (b.order || 0))
    if (!sorted.length) return getDefaultSidebarItems(userAnalytics)
    return sorted.map(permission => {
      const route = permissionKeyToRoute(permission.permissionKey)
      const { count, progress } = getDynamicDataForPermission(permission.permissionKey, userAnalytics)
      return {
        icon: getIconByName(permission.icon || "ShieldCheck"),
        label: permission.permissionName,
        href: route,
        permissionKey: permission.permissionKey,
        isActive: getIsActive(route),
        count, progress,
        color: permission.color || "violet"
      }
    })
  }

  const getDynamicDataForPermission = (key: string, analytics: any) => {
    const k = key.toLowerCase()
    if (k.includes('dashboard')) return { count: 0, progress: analytics.overallProgress }
    if (k.includes('course')) return { count: analytics.enrolledCourses, progress: analytics.overallProgress }
    if (k.includes('assignment') || k.includes('task')) return { count: analytics.attemptedExercises, progress: 0 }
    if (k.includes('progress') || k.includes('analytics')) return { count: analytics.completedCourses, progress: analytics.overallProgress }
    if (k.includes('message') || k.includes('chat')) return { count: 3, progress: 0 }
    if (k.includes('resource') || k.includes('material')) return { count: analytics.totalModules + analytics.totalTopics, progress: 0 }
    if (k.includes('schedule') || k.includes('calendar')) return { count: 2, progress: 0 }
    return { count: 0, progress: 0 }
  }

  const getDefaultSidebarItems = (analytics: any): SidebarItem[] => [
    { icon: LayoutDashboard, label: "Dashboard", href: `${BASE_PATH}dashboard`, count: 0, progress: analytics.overallProgress },
    { icon: BookOpen, label: "My Courses", href: `${BASE_PATH}courses`,progress: analytics.overallProgress },
    { icon: ClipboardCheck, label: "Assignments", href: `${BASE_PATH}assignments`, count: analytics.attemptedExercises, progress: 0 },
    { icon: Trophy, label: "Grades", href: `${BASE_PATH}grades`, count: analytics.completedCourses, progress: analytics.overallProgress },
    { icon: Bell, label: "Notifications", href: `${BASE_PATH}notifications`, count: 0, progress: 0 },
    { icon: MessageSquare, label: "Messages", href: `${BASE_PATH}messages`, count: 0, progress: 0 },
    { icon: FolderOpen, label: "Resources", href: `${BASE_PATH}resources`, count: analytics.totalModules + analytics.totalTopics, progress: 0 },
    { icon: Calendar, label: "Schedule", href: `${BASE_PATH}schedule`, count: 2, progress: 0 },
    { icon: User, label: "Profile", href: `${BASE_PATH}profile`, count: 0, progress: 0 },
  ]

  const permissionKeyToRoute = (permissionKey: string): string => {
    if (!permissionKey) return `${BASE_PATH}dashboard`
    let routeKey = permissionKey.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/[_\s]/g, '-')
    const routeMappings: Record<string, string> = {
      'student-dashboard': 'dashboard', 'dashboard': 'dashboard',
      'course-overview': 'courses', 'courses': 'courses', 'my-courses': 'courses',
      'assignment-submission': 'assignments', 'assignments': 'assignments',
      'performance-analytics': 'progress', 'analytics': 'progress', 'progress': 'progress',
      'grades': 'grades', 'messages': 'messages', 'message-center': 'messages',
      'resource-library': 'resources', 'resources': 'resources',
      'study-schedule': 'schedule', 'schedule': 'schedule', 'calendar': 'schedule',
      'user-profile': 'profile', 'profile': 'profile',
      'notifications': 'notifications', 'alerts': 'notifications',
    }
    if (routeMappings[routeKey]) routeKey = routeMappings[routeKey]
    return `${BASE_PATH}${routeKey}`
  }

  const { data: notificationsData } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsService.fetchNotifications(),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (notificationsData) {
      const unreadCount = notificationsData.unreadCount || 0
      setSidebarItems(prev => prev.map(item => {
        const isNotif = item.label.toLowerCase().includes('notification') || item.permissionKey?.toLowerCase().includes('notification')
        return isNotif ? { ...item, badge: unreadCount > 0 ? unreadCount : undefined } : item
      }))
    }
  }, [notificationsData])

  const getIsActive = (href: string) => {
    if (activeRoute) {
      const routePart = href.replace(BASE_PATH, '').split('/')[0]
      return routePart === activeRoute.toLowerCase()
    }
    return pathname === href || (href !== '/' && pathname?.startsWith(href))
  }

  useEffect(() => {
    setSidebarItems(prev => prev.map(item => ({ ...item, isActive: getIsActive(item.href) })))
  }, [pathname, activeRoute])

  const handleNavigation = (href: string) => {
    router.push(href)
    if (typeof window !== 'undefined' && window.innerWidth < 768 && onClose) onClose()
  }

  // Group sidebar items
  const groupItems = (items: SidebarItem[]) => {
    const mainItems: SidebarItem[] = []
    const connectItems: SidebarItem[] = []
    const accountItems: SidebarItem[] = []
    const otherItems: SidebarItem[] = []

    items.forEach(item => {
      const label = item.label.toLowerCase()
      const key = item.permissionKey?.toLowerCase() || ''
      const href = item.href.replace(BASE_PATH, '')

      if (['dashboard', 'courses', 'my courses', 'assignments', 'grades', 'progress'].some(k => label.includes(k) || href.includes(k))) {
        mainItems.push(item)
      } else if (['message', 'notification', 'schedule', 'calendar', 'chat'].some(k => label.includes(k) || href.includes(k) || key.includes(k))) {
        connectItems.push(item)
      } else if (['profile', 'settings', 'help', 'resource', 'account'].some(k => label.includes(k) || href.includes(k) || key.includes(k))) {
        accountItems.push(item)
      } else {
        otherItems.push(item)
      }
    })

    return { mainItems, connectItems, accountItems, otherItems }
  }

  const { mainItems, connectItems, accountItems, otherItems } = groupItems(sidebarItems)

  if (loading) {
    return (
      <aside className={cn(
        "fixed left-0 top-[60px] z-30 h-[calc(100vh-60px)] w-[240px] bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800",
        "flex flex-col"
      )}>
        <div className="flex-1 p-4 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </aside>
    )
  }

  const SidebarSection = ({ label, items }: { label: string; items: SidebarItem[] }) => {
    if (!items.length) return null
    return (
      <div className="mb-4">
        <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">{label}</p>
        <ul className="space-y-0.5">
          {items.map(item => {
            const Icon = item.icon
            const badgeCount = item.badge || item.count || 0
            return (
              <li key={item.permissionKey || item.href}>
                <button
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    "group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-left",
                    item.isActive
                      ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200"
                  )}
                >
                  {/* Active pill */}
                  {item.isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-500 dark:bg-violet-400 rounded-r-full" />
                  )}

                  <Icon
                    className={cn(
                      "flex-shrink-0 w-4 h-4 transition-colors",
                      item.isActive ? "text-violet-600 dark:text-violet-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                    )}
                    strokeWidth={item.isActive ? 2.5 : 2}
                  />

                  <span className={cn(
                    "flex-1 text-[13px] transition-colors truncate",
                    item.isActive ? "font-semibold text-violet-700 dark:text-violet-300" : "font-medium"
                  )}>
                    {item.label}
                  </span>

                  {Number(badgeCount) > 0 && (
                    <span className={cn(
                      "flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center rounded-md px-1.5 text-[10px] font-bold",
                      item.isActive
                        ? "bg-violet-100 dark:bg-violet-800/50 text-violet-600 dark:text-violet-300"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
                    )}>
                      {Number(badgeCount) > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-gray-900/30 z-20 md:hidden backdrop-blur-sm" onClick={onClose} />
      )}

      <aside className={cn(
        "fixed left-0 top-0 md:top-[60px] z-30 h-full md:h-[calc(100vh-60px)] w-[240px]",
        "flex flex-col transform transition-transform duration-300 ease-out",
        "bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>

        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-[13px] font-bold text-gray-900 dark:text-white">Navigation</span>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User mini profile */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {studentInfo.avatarLetter}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-950" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate leading-tight">{studentInfo.name}</p>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{studentInfo.role}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-gray-400">Overall Progress</span>
              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">{studentInfo.overallProgress}%</span>
            </div>
            <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-1000"
                style={{ width: `${studentInfo.overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0">
          <SidebarSection label="Main" items={mainItems} />
          {otherItems.length > 0 && <SidebarSection label="Other" items={otherItems} />}
          <SidebarSection label="Connect" items={connectItems} />
          <SidebarSection label="Account" items={accountItems} />
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 border border-orange-100 dark:border-orange-900/30">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-orange-700 dark:text-orange-300 leading-tight">
                {studentInfo.streak > 0 ? `${studentInfo.streak}-day streak!` : 'Start your streak'}
              </p>
              <p className="text-[10px] text-orange-500/70 dark:text-orange-400/60 mt-0.5 truncate">
                {studentInfo.enrolledCourses} course{studentInfo.enrolledCourses !== 1 ? 's' : ''} enrolled
              </p>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          </div>
        </div>
      </aside>
    </>
  )
}

export { getCurrentUserLocal as getCurrentUser }