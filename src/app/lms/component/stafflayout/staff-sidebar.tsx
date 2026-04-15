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
  Clock, Users, Bookmark, Target, Zap, Layers, Award,
  LayoutDashboard, FolderOpen, ClipboardCheck, Video,
  Activity, TrendingUp, CheckCircle, Brain, Sparkles, Flame, X,
  ChevronRight, HelpCircle, Settings,
} from "lucide-react"

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface SidebarItem { icon: React.ElementType; label: string; href: string; badge?: string | number; isActive?: boolean; permissionKey?: string; color?: string; progress?: number; count?: number }
interface StaffSidebarProps { isOpen?: boolean; onClose?: () => void; activeRoute?: string }
interface UserPermission { _id: string; permissionName: string; permissionKey: string; permissionFunctionality: string[]; icon: string; color: string; description: string; isActive: boolean; order: number; createdAt: string; updatedAt: string }
interface UserData { _id: string; email: string; firstName: string; lastName: string; courses: any[]; permissions: UserPermission[]; lastAccessed?: string; createdAt?: string; updatedAt?: string; role?: { _id: string; originalRole: string; renameRole: string; roleValue: string }; status?: string }

const USER_DATA_KEY = "smartcliff_userData"
const BASE_PATH = "/lms/pages/"

const T = {
  orange: "#F27757", orangeDark: "#E0623F", orangeGlow: "rgba(242,119,87,0.22)", orangeLight: "rgba(242,119,87,0.08)",
  // ✅ Dark solid orange for inactive icons
  orangeInactive:     "#C45A38",   // dark solid orange — light mode inactive
  orangeInactiveDark: "#B85030",   // deeper tone — dark mode inactive
  textMain: "#1a1a2e", textSub: "#6b6b7e", textMuted: "#8b8b9e", textHint: "#bcbccc", border: "#ecedf1", bg: "#ffffff",
  dark: { bg: "#1a1a2e", surface: "#222240", border: "#2e2e4a", textMain: "#e8e8f0", textSub: "#a0a0b8", textMuted: "#6b6b88", textHint: "#4a4a66" },
}

const getCurrentUserLocal = (): { valid: boolean; user: UserData | null } => {
  try { const s = localStorage.getItem(USER_DATA_KEY); if (!s) return { valid: false, user: null }; return { valid: true, user: JSON.parse(s) } } catch { return { valid: false, user: null } }
}

const getIconByName = (iconName: string): any => {
  if (!iconName) return ShieldCheck
  if (LucideIcons[iconName as keyof typeof LucideIcons]) return LucideIcons[iconName as keyof typeof LucideIcons]
  const m: Record<string, any> = { dashboard: LayoutDashboard, home: Home, courses: BookOpen, assignments: ClipboardCheck, grades: Trophy, messages: MessageSquare, notifications: Bell, resources: FolderOpen, schedule: Calendar, settings: Settings2, users: Users, profile: User, book: BookOpen, "book-open": BookOpen, "file-text": FileText, "bar-chart-3": BarChart3, chart: BarChart3, "graduation-cap": GraduationCap, "message-square": MessageSquare, folder: FolderOpen, clock: Clock, bookmark: Bookmark, target: Target, zap: Zap, layers: Layers, award: Award, "clipboard-check": ClipboardCheck, video: Video, activity: Activity, "trending-up": TrendingUp, brain: Brain, sparkles: Sparkles, flame: Flame, students: Users, analytics: BarChart3, "help-circle": HelpCircle }
  return m[iconName.toLowerCase()] || ShieldCheck
}

export function StaffSidebar({ isOpen = true, onClose, activeRoute }: StaffSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [studentInfo, setStudentInfo] = useState({ name: "Loading...", role: "Student", avatarLetter: "S", overallProgress: 0, streak: 0, enrolledCourses: 0 })

  useEffect(() => { const c = () => setIsDark(document.documentElement.classList.contains("dark")); c(); const o = new MutationObserver(c); o.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] }); return () => o.disconnect() }, [])

  useEffect(() => {
    try {
      const r = getCurrentUserLocal()
      if (!r.valid || !r.user) { setLoading(false); return }
      const u = r.user, uc = u?.courses || []
      const a = calcAnalytics(u, uc)
      setSidebarItems(buildItems(u, a))
      setStudentInfo({ name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Student", role: u.role?.renameRole || "Student", avatarLetter: u.firstName?.charAt(0).toUpperCase() || "S", overallProgress: a.overallProgress, streak: calcStreak(uc), enrolledCourses: a.enrolledCourses })
    } catch (e) { console.error(e); setSidebarItems(defaultItems({ enrolledCourses: 0, completedCourses: 0, activeCourses: 0, overallProgress: 0, totalModules: 0, totalTopics: 0, attemptedExercises: 0, attemptedQuestions: 0 })) }
    finally { setLoading(false) }
  }, [])

  const calcProgress = (c: any) => { const p = c.answers?.We_Do?.practical; if (!p?.length) return 0; let a = 0, q = 0; p.forEach((e: any) => { if (e.questions?.length) { a++; q += e.questions.filter((x: any) => x.status === "attempted" || x.status === "evaluated" || x.submittedAt).length } }); return Math.round(((a / p.length) * 0.4 + (a > 0 ? q / (a * 4) : 0) * 0.6) * 100) }
  const calcAnalytics = (_u: UserData | null, uc: any[]) => { const e = uc.length, co = uc.filter(c => calcProgress(c) >= 90).length, ac = uc.filter(c => { const p = calcProgress(c); return p > 0 && p < 90 }).length, tp = uc.reduce((s, c) => s + calcProgress(c), 0), op = e > 0 ? Math.round(tp / e) : 0; let tm = 0, tt = 0, ae = 0, aq = 0; uc.forEach(c => { tm += c.modules?.length || 0; tt += c.topics?.length || 0; c.answers?.We_Do?.practical?.forEach((ex: any) => { if (ex.questions?.length) { ae++; aq += ex.questions.filter((q: any) => q.status === "attempted" || q.status === "evaluated" || q.submittedAt).length } }) }); return { enrolledCourses: e, completedCourses: co, activeCourses: ac, overallProgress: op, totalModules: tm, totalTopics: tt, attemptedExercises: ae, attemptedQuestions: aq } }
  const calcStreak = (uc: any[]) => { const w = new Date(Date.now() - 7 * 864e5); return Math.min(uc.filter(c => new Date(c.lastAccessed || c.updatedAt || Date.now()) >= w).length, 7) }

  const buildItems = (u: UserData, a: any): SidebarItem[] => {
    if (!u?.permissions?.length) return defaultItems(a)
    const s = [...u.permissions].filter(p => p.isActive).sort((x, y) => (x.order || 0) - (y.order || 0))
    if (!s.length) return defaultItems(a)
    return s.map(p => { const r = keyToRoute(p.permissionKey); const { count, progress } = dynData(p.permissionKey, a); return { icon: getIconByName(p.icon || "ShieldCheck"), label: p.permissionName, href: r, permissionKey: p.permissionKey, isActive: isActive(r), count, progress, color: p.color || "orange" } })
  }

  const dynData = (k: string, a: any) => { const l = k.toLowerCase(); if (l.includes("dashboard")) return { count: 0, progress: a.overallProgress }; if (l.includes("course")) return { count: a.enrolledCourses, progress: a.overallProgress }; if (l.includes("assignment") || l.includes("task")) return { count: a.attemptedExercises, progress: 0 }; if (l.includes("progress") || l.includes("analytics")) return { count: a.completedCourses, progress: a.overallProgress }; if (l.includes("message") || l.includes("chat")) return { count: 3, progress: 0 }; if (l.includes("resource") || l.includes("material")) return { count: a.totalModules + a.totalTopics, progress: 0 }; if (l.includes("schedule") || l.includes("calendar")) return { count: 2, progress: 0 }; return { count: 0, progress: 0 } }

  const defaultItems = (a: any): SidebarItem[] => [
    { icon: Home, label: "Dashboard", href: `${BASE_PATH}dashboard`, count: 0, progress: a.overallProgress },
    { icon: BookOpen, label: "Courses", href: `${BASE_PATH}courses`, count: a.enrolledCourses, progress: a.overallProgress },
    { icon: Trophy, label: "Grades", href: `${BASE_PATH}grades`, count: 0, progress: 0 },
    { icon: Users, label: "Students", href: `${BASE_PATH}students`, count: 0, progress: 0 },
    { icon: BarChart3, label: "Analytics", href: `${BASE_PATH}analytics`, count: 0, progress: 0 },
    { icon: Settings2, label: "Settings", href: `${BASE_PATH}settings`, count: 0, progress: 0 },
    { icon: HelpCircle, label: "Help & Support", href: `${BASE_PATH}help`, count: 0, progress: 0 },
  ]

  const keyToRoute = (k: string): string => { if (!k) return `${BASE_PATH}dashboard`; let r = k.toLowerCase().replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "").replace(/[_\s]/g, "-"); const m: Record<string, string> = { "student-dashboard": "dashboard", dashboard: "dashboard", "course-overview": "courses", courses: "courses", "my-courses": "courses", "assignment-submission": "assignments", assignments: "assignments", "performance-analytics": "progress", analytics: "analytics", progress: "progress", grades: "grades", messages: "messages", "message-center": "messages", "resource-library": "resources", resources: "resources", "study-schedule": "schedule", schedule: "schedule", calendar: "schedule", "user-profile": "profile", profile: "profile", notifications: "notifications", alerts: "notifications", students: "students", settings: "settings", help: "help" }; if (m[r]) r = m[r]; return `${BASE_PATH}${r}` }

  const { data: nData } = useQuery({ queryKey: notificationKeys.all, queryFn: () => notificationsService.fetchNotifications(), refetchOnWindowFocus: true, staleTime: 30000 })
  useEffect(() => { if (nData) { const u = nData.unreadCount || 0; setSidebarItems(p => p.map(i => { const n = i.label.toLowerCase().includes("notification") || i.permissionKey?.toLowerCase().includes("notification"); return n ? { ...i, badge: u > 0 ? u : undefined } : i })) } }, [nData])

  const isActive = (href: string) => { if (activeRoute) { return href.replace(BASE_PATH, "").split("/")[0] === activeRoute.toLowerCase() } return pathname === href || (href !== "/" && pathname?.startsWith(href)) }
  useEffect(() => { setSidebarItems(p => p.map(i => ({ ...i, isActive: isActive(i.href) }))) }, [pathname, activeRoute])

  const nav = (href: string) => { router.push(href); if (typeof window !== "undefined" && window.innerWidth < 768 && onClose) onClose() }

  const CircProg = ({ value, size = 38 }: { value: number; size?: number }) => { const sw = 3, r = (size - sw) / 2, c = 2 * Math.PI * r; return (<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={isDark ? T.dark.border : "#f0f0f4"} strokeWidth={sw} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.orange} strokeWidth={sw} strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} strokeLinecap="round" className="transition-all duration-700" /></svg>) }

  if (loading) return (
    <aside className={cn("sc-sb fixed left-0 top-0 z-50 h-screen w-[260px] flex flex-col", isDark ? "bg-[#1a1a2e] border-r border-[#2e2e4a]" : "bg-white border-r border-[#ecedf1]")}>
      <div className={cn("flex items-center gap-3 px-6 h-[70px] border-b", isDark ? "border-[#2e2e4a]" : "border-[#ecedf1]")}><div className="w-10 h-10 rounded-xl bg-[#F27757]/10 animate-pulse" /><div className="w-28 h-5 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /></div>
      <div className="flex-1 px-4 py-6 space-y-2">{[...Array(7)].map((_, i) => <div key={i} className={cn("h-[44px] rounded-xl animate-pulse", isDark ? "bg-[#222240]" : "bg-gray-50")} style={{ animationDelay: `${i * 60}ms` }} />)}</div>
    </aside>
  )

  return (
    <>
      <style jsx global>{`@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap");.sc-sb,.sc-sb *{font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif!important}`}</style>

      {isOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ background: isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)", backdropFilter: "blur(2px)" }} onClick={onClose} />}

      <aside className={cn("sc-sb fixed left-0 top-0 z-50 h-screen w-[260px] flex flex-col transform transition-transform duration-300 ease-out", isDark ? "bg-[#1a1a2e] border-r border-[#2e2e4a]" : "bg-white border-r border-[#ecedf1]", isOpen ? "translate-x-0" : "-translate-x-full")}>

        {/* Logo */}
        <div className={cn("flex items-center gap-3 px-6 py-5 flex-shrink-0 border-b", isDark ? "border-[#2e2e4a]" : "border-[#ecedf1]")}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: T.orange, boxShadow: `0 4px 14px ${T.orangeGlow}` }}>
            <CheckCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-[17px] font-extrabold tracking-[-0.03em] leading-none" style={{ color: isDark ? T.dark.textMain : T.textMain }}>Smart<span style={{ color: T.orange }}>Cliff</span></span>
            <p className="text-[10.5px] font-medium mt-0.5 leading-none tracking-wide" style={{ color: isDark ? T.dark.textMuted : T.textHint }}>LMS Platform</p>
          </div>
          <button className={cn("ml-auto p-1.5 rounded-lg md:hidden transition-colors", isDark ? "text-gray-400 hover:bg-[#222240]" : "text-[#8b8b9e] hover:bg-[#FFF4F1] hover:text-[#F27757]")} onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5">
          <ul className="space-y-1">
            {sidebarItems.map(item => {
              const Icon = item.icon, active = item.isActive
              const badge = item.badge ?? (item.count && item.count > 0 ? item.count : undefined)
              return (
                <li key={item.permissionKey || item.href}>
                  <button onClick={() => nav(item.href)}
                    className="group w-full flex items-center gap-3.5 px-4 py-[11px] rounded-xl transition-all duration-150 text-left"
                    style={active ? { background: isDark ? "rgba(242,119,87,0.12)" : T.orangeLight, borderLeft: `3px solid ${T.orange}` } : { background: "transparent", borderLeft: "3px solid transparent" }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(255,255,255,0.04)" : "#fafafa" }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  >
                    {/* ✅ Icon is always orange — full #F27757 when active, soft rgba when inactive */}
                    <Icon
                      className="flex-shrink-0 w-[18px] h-[18px]"
                      style={{ color: active ? T.orange : isDark ? T.orangeInactiveDark : T.orangeInactive }}
                      strokeWidth={active ? 2.3 : 1.8}
                    />
                    <span className="flex-1 text-[14px] leading-none truncate" style={{ fontWeight: active ? 700 : 500, color: active ? T.orange : isDark ? T.dark.textSub : T.textSub }}>{item.label}</span>
                    {badge !== undefined && Number(badge) > 0 && (
                      <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold" style={{ background: active ? T.orange : isDark ? "rgba(242,119,87,0.15)" : T.orangeLight, color: active ? "#fff" : T.orange }}>{Number(badge) > 99 ? "99+" : badge}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className={cn("px-5 py-4 flex-shrink-0 border-t", isDark ? "border-[#2e2e4a]" : "border-[#ecedf1]")} style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#fafafa" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0"><CircProg value={studentInfo.overallProgress || 75} /></div>
            <p className="flex-1 text-[13px] font-bold leading-tight" style={{ color: isDark ? T.dark.textMain : T.textMain }}>All Systems</p>
            <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full text-[11px] font-bold" style={{ background: isDark ? "rgba(242,119,87,0.15)" : T.orangeLight, color: T.orange }}>{studentInfo.enrolledCourses || 4}</span>
          </div>
          <div className="mb-3"><div className="h-[5px] w-full rounded-full overflow-hidden" style={{ background: isDark ? T.dark.border : "#ecedf1" }}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(studentInfo.overallProgress || 65, 100)}%`, background: `linear-gradient(90deg, ${T.orange}, #3b82f6)` }} /></div></div>
          <div className="flex items-center gap-1.5 mb-3"><Flame className="w-3.5 h-3.5" style={{ color: T.orange }} /><span className="text-[11px] font-semibold" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>Streak - {studentInfo.streak || 4}.</span></div>
          <p className="text-[10px] font-medium" style={{ color: isDark ? T.dark.textHint : T.textHint }}>© SmartCliff LMS v2.0</p>
        </div>
      </aside>
    </>
  )
}

export { getCurrentUserLocal as getCurrentUser }