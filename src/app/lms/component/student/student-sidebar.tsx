"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { notificationsService, notificationKeys } from "@/apiServices/notifications"
import { useQuery } from "@tanstack/react-query"
import { getCurrentUser } from "@/apiServices/tokenVerify"
import { getStudentDashboardAnalytics } from "@/apiServices/studentAnalytics"
import * as LucideIcons from "lucide-react"

// Import Lucide icons
import {
  ShieldCheck, Home, User, Bell, BookOpen, FileText, Trophy,
  GraduationCap, Calendar, MessageSquare, BarChart3, Settings2,
  Clock, Computer, Users, Bookmark, Target, Zap, Layers, Award,
  Briefcase, LayoutDashboard, FolderOpen, ClipboardCheck, Video,
  Activity, TrendingUp, Target as TargetIcon, CheckCircle,
  Clock as ClockIcon, FileBarChart, FolderTree, Brain, Lightbulb,
  Plus, Moon, Sun, MoreHorizontal, ArrowLeft, Sparkles, Flame
} from "lucide-react"

// --- Interfaces ---
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

// --- Icon Helper ---
const getIconByName = (iconName: string): any => {
  if (!iconName) return ShieldCheck;
  
  if (LucideIcons[iconName as keyof typeof LucideIcons]) {
    return LucideIcons[iconName as keyof typeof LucideIcons];
  }
  
  const pascalCaseName = iconName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  if (LucideIcons[pascalCaseName as keyof typeof LucideIcons]) {
    return LucideIcons[pascalCaseName as keyof typeof LucideIcons];
  }
  
  const iconMappings: Record<string, any> = {
    "dashboard": LayoutDashboard, "home": Home, "courses": BookOpen,
    "assignments": ClipboardCheck, "grades": Trophy, "messages": MessageSquare,
    "notifications": Bell, "resources": FolderOpen, "schedule": Calendar,
    "settings": Settings2, "users": Users, "profile": User,
  };
  
  const lowerIconName = iconName.toLowerCase();
  if (iconMappings[lowerIconName]) return iconMappings[lowerIconName];
  
  return ShieldCheck;
};

const BASE_PATH = "/lms/pages/"

export function StudentSidebar({ isOpen = true, onClose, activeRoute }: StudentSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [studentInfo, setStudentInfo] = useState({
    name: "Loading...",
    course: "Loading...",
    avatarLetter: "S",
    enrolledCourses: 0,
    completedCourses: 0,
    activeCourses: 0,
    overallProgress: 0,
    streak: 0,
    totalModules: 0,
    totalTopics: 0,
    attemptedExercises: 0,
    attemptedQuestions: 0
  })

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("smartcliff_token")
        const userId = localStorage.getItem("smartcliff_userId")

        if (!token || !userId) {
          setLoading(false)
          return
        }

        const userData = await getCurrentUser()
        const user = userData?.user
        const analyticsData = await getStudentDashboardAnalytics()
        const userCourses = user?.courses || []
        const userAnalytics = calculateUserAnalytics(analyticsData, userCourses)
        const items = await buildSidebarItems(userId, userAnalytics)
        setSidebarItems(items)
        
        const firstName = user?.firstName || ''
        const lastName = user?.lastName || ''
        
        setStudentInfo({
          name: `${firstName} ${lastName}`.trim() || "Student",
          course: getPrimaryCourse(userCourses) || "General Studies",
          avatarLetter: firstName ? firstName.charAt(0).toUpperCase() : "S",
          enrolledCourses: userAnalytics.enrolledCourses,
          completedCourses: userAnalytics.completedCourses,
          activeCourses: userAnalytics.activeCourses,
          overallProgress: userAnalytics.overallProgress,
          streak: calculateLearningStreak(userCourses),
          totalModules: userAnalytics.totalModules,
          totalTopics: userAnalytics.totalTopics,
          attemptedExercises: userAnalytics.attemptedExercises,
          attemptedQuestions: userAnalytics.attemptedQuestions
        })

      } catch (error) {
        console.error("Error fetching data:", error)
        setSidebarItems(getDefaultSidebarItems({
            enrolledCourses: 0, completedCourses: 0, activeCourses: 0, overallProgress: 0, totalModules: 0, totalTopics: 0, attemptedExercises: 0, attemptedQuestions: 0
        }))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // --- Calculations ---
  const calculateUserAnalytics = (analyticsData: any, userCourses: any[]) => {
    const enrolledCourses = userCourses.length
    const completedCourses = userCourses.filter(course => calculateCourseProgress(course) >= 90).length
    const activeCourses = userCourses.filter(course => {
      const p = calculateCourseProgress(course); return p > 0 && p < 90
    }).length
    const totalProgress = userCourses.reduce((sum, course) => sum + calculateCourseProgress(course), 0)
    const overallProgress = enrolledCourses > 0 ? Math.round(totalProgress / enrolledCourses) : 0
    const totalModules = analyticsData?.analytics?.totalModules || 0
    const totalTopics = analyticsData?.analytics?.totalTopics || 0
    let attemptedExercises = 0
    let attemptedQuestions = 0
    
    userCourses.forEach(course => {
      if (course.answers?.We_Do?.practical) {
        course.answers.We_Do.practical.forEach((exercise: any) => {
          if (exercise.questions?.length > 0) {
            attemptedExercises++
            exercise.questions.forEach((q: any) => {
               if (q.status === 'attempted' || q.status === 'evaluated' || q.submittedAt) attemptedQuestions++
            })
          }
        })
      }
    })
    return { enrolledCourses, completedCourses, activeCourses, overallProgress, totalModules, totalTopics, attemptedExercises, attemptedQuestions }
  }

  const calculateCourseProgress = (course: any) => {
    if (!course.answers?.We_Do?.practical) return 0
    const practicalExercises = course.answers.We_Do.practical
    if (practicalExercises.length === 0) return 0
    let attemptedExercises = 0
    let attemptedQuestions = 0
    practicalExercises.forEach((exercise: any) => {
      if (exercise.questions && exercise.questions.length > 0) {
        attemptedExercises++
        const attemptedQs = exercise.questions.filter((q: any) => q.status === 'attempted' || q.status === 'evaluated' || q.submittedAt).length
        attemptedQuestions += attemptedQs
      }
    })
    const totalExercises = 10 
    const totalQuestions = totalExercises * 4
    const exerciseProgress = totalExercises > 0 ? (attemptedExercises / totalExercises) * 100 : 0
    const questionProgress = totalQuestions > 0 ? (attemptedQuestions / totalQuestions) * 100 : 0
    return Math.round((exerciseProgress * 0.4) + (questionProgress * 0.6))
  }

  const calculateLearningStreak = (userCourses: any[]) => {
    const today = new Date()
    const lastWeek = new Date(today.setDate(today.getDate() - 7))
    const recentActivities = userCourses.filter(course => {
      const lastAccessed = new Date(course.lastAccessed || course.createdAt)
      return lastAccessed >= lastWeek
    }).length
    return Math.min(recentActivities, 7)
  }

  const getPrimaryCourse = (userCourses: any[]) => {
    if (userCourses.length === 0) return "General Studies"
    return userCourses.reduce((maxCourse, currentCourse) => {
      const maxProgress = calculateCourseProgress(maxCourse)
      const currentProgress = calculateCourseProgress(currentCourse)
      return currentProgress > maxProgress ? currentCourse : maxCourse
    }).courseName || "General Studies"
  }

  const buildSidebarItems = async (userId: string, userAnalytics: any): Promise<SidebarItem[]> => {
    try {
      const token = localStorage.getItem("smartcliff_token")
      if (!token) return getDefaultSidebarItems(userAnalytics)
      const permissionsResponse = await fetch(`http://localhost:5533/user/get-permission/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!permissionsResponse.ok) return getDefaultSidebarItems(userAnalytics)
      const permissionsData = await permissionsResponse.json()
      if (permissionsData.data?.permissions) {
        const permissions: UserPermission[] = permissionsData.data.permissions
        const sortedPermissions = [...permissions].filter(permission => permission.isActive).sort((a, b) => a.order - b.order)
        return sortedPermissions.map((permission) => {
          const route = permissionKeyToRoute(permission.permissionKey)
          const IconComponent = getIconByName(permission.icon || "ShieldCheck")
          const { count, progress } = getDynamicDataForPermission(permission.permissionKey, userAnalytics)
          return {
            icon: IconComponent,
            label: permission.permissionName,
            href: route,
            permissionKey: permission.permissionKey,
            isActive: getIsActive(route),
            count,
            progress
          }
        })
      }
      return getDefaultSidebarItems(userAnalytics)
    } catch (error) {
      console.error("Error building sidebar items:", error)
      return getDefaultSidebarItems(userAnalytics)
    }
  }

  const getDynamicDataForPermission = (permissionKey: string, userAnalytics: any) => {
    const key = permissionKey.toLowerCase()
    if (key.includes('course')) return { count: userAnalytics.enrolledCourses, progress: userAnalytics.overallProgress }
    else if (key.includes('assignment')) return { count: userAnalytics.attemptedExercises, progress: 0 }
    else if (key.includes('message')) return { count: 3, progress: 0 }
    else if (key.includes('notification')) return { count: 4, progress: 0 }
    return { count: 0, progress: 0 }
  }

  const getDefaultSidebarItems = (userAnalytics: any): SidebarItem[] => [
    { icon: LayoutDashboard, label: "Dashboard", href: `${BASE_PATH}dashboard`, count: 0 },
    { icon: ClipboardCheck, label: "Tasks", href: `${BASE_PATH}assignments`, count: 32 },
    { icon: Bell, label: "Notifications", href: `${BASE_PATH}notifications`, count: 4 },
    { icon: MessageSquare, label: "Messages", href: `${BASE_PATH}messages`, count: 0 },
    { icon: FolderOpen, label: "Inbox", href: `${BASE_PATH}resources`, count: 9 }
  ]

  const permissionKeyToRoute = (permissionKey: string): string => {
    if (!permissionKey) return `${BASE_PATH}dashboard`;
    let routeKey = permissionKey.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
    const routeMappings: Record<string, string> = {
      'student-dashboard': 'dashboard', 'course-overview': 'courses', 'learning-materials': 'materials',
      'assignment-submission': 'assignments', 'performance-analytics': 'analytics', 'message-center': 'messages',
      'resource-library': 'resources', 'study-schedule': 'schedule', 'user-profile': 'profile',
      'system-settings': 'settings', 'help-support': 'help',
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
      setSidebarItems(prevItems => 
        prevItems.map(item => {
          const isNotificationItem = item.label.toLowerCase().includes('notification')
          if (isNotificationItem && unreadCount > 0) return { ...item, badge: unreadCount }
          return item
        })
      )
    }
  }, [notificationsData])

  const getIsActive = (href: string) => {
    if (activeRoute) {
      const routePart = href.replace(BASE_PATH, '').split('/')[0]
      const activeRoutePart = activeRoute.toLowerCase()
      return routePart === activeRoutePart
    }
    return pathname === href || (href !== '/' && pathname?.startsWith(href))
  }

  useEffect(() => {
    setSidebarItems(prevItems => prevItems.map(item => ({ ...item, isActive: getIsActive(item.href) })))
  }, [pathname, activeRoute])

  const handleNavigation = (href: string) => {
    router.push(href)
    if (window.innerWidth < 768 && onClose) onClose()
  }

  if (loading) {
    return (
      <aside className="fixed left-0 top-[72px] z-30 h-[calc(100vh-72px)] w-72 bg-white border-r border-slate-200">
         <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
         </div>
      </aside>
    )
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/20 z-20 md:hidden backdrop-blur-sm" onClick={onClose} />}

      <aside
        className={cn(
          "fixed left-0 top-0 md:top-[72px] z-30 h-full md:h-[calc(100vh-72px)] w-[280px] flex flex-col transform transition-all duration-300 ease-out bg-white border-r border-slate-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Mobile Header (Close Button) */}
        <div className="md:hidden p-4 flex justify-between items-center border-b border-slate-100">
            <h2 className="font-bold text-slate-800">Menu</h2>
            <button onClick={onClose} className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <ArrowLeft className="w-5 h-5" />
            </button>
        </div>

        {/* --- 1. User Profile Widget --- */}
        <div className="px-5 pt-6 pb-2">
            <div className="flex items-center gap-4 mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px]">
                         <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                            <span className="text-sm font-bold text-indigo-600">{studentInfo.avatarLetter}</span>
                         </div>
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white ring-1 ring-slate-100"></span>
                </div>
                
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-slate-800 truncate">{studentInfo.name}</h2>
                    <p className="text-[10px] font-semibold text-slate-400 truncate uppercase tracking-wider">{studentInfo.course}</p>
                </div>
            </div>
            
            {/* Quick Stats Row */}
            <div className="flex gap-2 mb-2">
                <div className="flex-1 bg-indigo-50/50 rounded-xl p-2.5 text-center border border-indigo-100/50">
                    <p className="text-indigo-600 font-bold text-sm">{studentInfo.completedCourses}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Done</p>
                </div>
                <div className="flex-1 bg-purple-50/50 rounded-xl p-2.5 text-center border border-purple-100/50">
                    <p className="text-purple-600 font-bold text-sm">{studentInfo.activeCourses}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Active</p>
                </div>
            </div>
        </div>

        {/* --- 2. Navigation Links --- */}
        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar space-y-6">
            <ul className="space-y-1">
                {sidebarItems.map((item, index) => {
                    const Icon = item.icon
                    const badgeCount = item.badge || item.count || 0
                    
                    return (
                        <li key={item.permissionKey || item.href}>
                            <div 
                                onClick={() => handleNavigation(item.href)}
                                className={cn(
                                    "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer select-none",
                                    item.isActive 
                                        ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100" 
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <Icon 
                                    className={cn(
                                        "h-[18px] w-[18px] transition-colors", 
                                        item.isActive ? "text-indigo-600 fill-indigo-600/10" : "text-slate-400 group-hover:text-slate-600"
                                    )} 
                                    strokeWidth={item.isActive ? 2.5 : 2}
                                />
                                
                                <span className={cn("flex-1 text-sm font-medium", item.isActive ? "font-bold" : "")}>
                                    {item.label}
                                </span>

                                {/* Badge Count */}
                                {Number(badgeCount) > 0 && (
                                    <span className={cn(
                                        "flex h-5 min-w-[20px] items-center justify-center rounded-md px-1.5 text-[10px] font-bold transition-colors",
                                        item.isActive 
                                            ? "bg-white text-indigo-600 shadow-sm" 
                                            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                                    )}>
                                        {badgeCount}
                                    </span>
                                )}

                                {/* Active Indicator (Dot) */}
                                {item.isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-r-full"></div>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>

            {/* Teams / Mentors Section */}
            <div className="px-2">
                <div className="flex items-center justify-between mb-3 px-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mentors</h3>
                    <MoreHorizontal className="w-4 h-4 text-slate-300 cursor-pointer hover:text-slate-500" />
                </div>
                <div className="space-y-3">
                    {/* Placeholder Data */}
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                         <div className="relative">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">PT</div>
                            <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-white flex items-center justify-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            </span>
                         </div>
                         <div className="flex-1">
                            <p className="text-xs font-bold text-slate-700">Peter Taylor</p>
                            <p className="text-[10px] text-slate-400">Physics Lead</p>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-indigo-500 shadow-sm">
                            <Video className="h-3 w-3" />
                         </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- 4. Footer (Streak & Theme) --- */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            {/* Premium Streak Card */}
            
          

            {/* Theme Toggle (Segmented Control) */}
           
        </div>

      </aside>
    </>
  )
}