"use client"

import {
  Bell, User, Settings, Menu, ChevronDown,
  LogOut, HelpCircle, Zap,
  Sun, Moon, UserCheck2, Sparkles,
  CalendarDays, Clock,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { notificationsService } from "@/apiServices/notifications"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationKeys } from "@/apiServices/notifications"
import { getCurrentUser } from "@/apiServices/tokenVerify"
import { cn } from "@/lib/utils"

interface StaffTopBarProps {
  onMenuClick?: () => void
  sidebarOpen?: boolean
}

interface CurrentUser {
  _id: string
  firstName: string
  lastName: string
  email: string
  mobileNumber: string
  role: { roleName: string; renameRole: string }
  institution: { institutionName: string }
  isActive: boolean
}

interface RoleSwitchState {
  isDummyStudent: boolean
  originalRole?: string
  originalRenameRole?: string
  switchTimestamp?: number
}

const T = {
  orange:      "#F27757",
  orangeDark:  "#E0623F",
  orangeGlow:  "rgba(242,119,87,0.25)",
  orangeLight: "rgba(242,119,87,0.08)",
  textMain:    "#1a1a2e",
  textSub:     "#6b6b7e",
  textMuted:   "#8b8b9e",
  textHint:    "#bcbccc",
  border:      "#ecedf1",
  bg:          "#ffffff",
  surface:     "#f6f4f7",
  dark: {
    bg: "#1a1a2e", surface: "#222240", border: "#2e2e4a",
    textMain: "#e8e8f0", textSub: "#a0a0b8", textMuted: "#6b6b88", textHint: "#4a4a66",
  },
}

// ── Greeting helper ──────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return { text: "Good Morning", emoji: "☀️" }
  if (h < 17) return { text: "Good Afternoon", emoji: "🌤️" }
  return { text: "Good Evening", emoji: "🌙" }
}

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })

const formatTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })

// ────────────────────────────────────────────────────────────────────────────

export function StaffTopBar({ onMenuClick, sidebarOpen }: StaffTopBarProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [isDummyStudent, setIsDummyStudent] = useState(false)
  const [originalRoleInfo, setOriginalRoleInfo] = useState<{ roleName: string; renameRole: string } | null>(null)
  const [now, setNow] = useState(new Date())

  const notifRef = useRef<HTMLDivElement>(null)
  const userRef  = useRef<HTMLDivElement>(null)

  const isDark = theme === "dark"

  // Live clock — ticks every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark"
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches
    const init = saved || (sys ? "dark" : "light")
    setTheme(init)
    if (init === "dark") document.documentElement.classList.add("dark")
    else document.documentElement.classList.remove("dark")
    checkDummy()
  }, [])

  const checkDummy = () => {
    try {
      const s = localStorage.getItem("smartcliff_roleSwitch")
      if (s) {
        const d: RoleSwitchState = JSON.parse(s)
        setIsDummyStudent(d.isDummyStudent || false)
        if (d.originalRole || d.originalRenameRole)
          setOriginalRoleInfo({ roleName: d.originalRole || "", renameRole: d.originalRenameRole || "" })
      }
    } catch {}
  }

  useEffect(() => {
    const h = () => checkDummy()
    window.addEventListener("storage", h)
    return () => window.removeEventListener("storage", h)
  }, [])

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    document.documentElement.classList.toggle("dark", next === "dark")
    localStorage.setItem("theme", next)
  }

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"], queryFn: getCurrentUser, retry: 1, staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, enabled: typeof window !== "undefined" && !!localStorage.getItem("smartcliff_token"),
  })
  const user: CurrentUser | null = userData?.user || null

  const { data: nData } = useQuery({
    queryKey: notificationKeys.all, queryFn: () => notificationsService.fetchNotifications(),
    refetchOnWindowFocus: true, staleTime: 30 * 1000,
  })
  const markRead = useMutation({ mutationFn: (id: string) => notificationsService.markAsRead(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }) })
  const markAll  = useMutation({ mutationFn: () => notificationsService.markAllAsRead(),         onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }) })

  const notifications = nData?.notifications || []
  const unread = nData?.unreadCount || 0

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setShowUserMenu(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try { localStorage.clear(); toast.success("Logged out"); router.push("/login") }
    catch { toast.error("Logout failed") }
    finally { setIsLoggingOut(false) }
  }
  const handleProfile = () => { setShowUserMenu(false); router.push("/lms/pages/studentdashboard/student/profile") }
  const handleSwitchStudent = () => {
    try {
      const d: RoleSwitchState = { isDummyStudent: true, originalRole: user?.role?.roleName || "", originalRenameRole: user?.role?.renameRole || "", switchTimestamp: Date.now() }
      localStorage.setItem("smartcliff_roleSwitch", JSON.stringify(d))
      localStorage.setItem("smartcliff_isDummyStudent", "true")
      setIsDummyStudent(true); setOriginalRoleInfo({ roleName: d.originalRole!, renameRole: d.originalRenameRole! })
      setShowUserMenu(false); toast.success("Switched to Student View"); router.push("/lms/pages/courses")
      setTimeout(() => window.dispatchEvent(new Event("storage")), 100)
    } catch { toast.error("Failed") }
  }
  const handleSwitchBack = () => {
    try {
      localStorage.removeItem("smartcliff_roleSwitch"); localStorage.removeItem("smartcliff_isDummyStudent")
      setIsDummyStudent(false); setOriginalRoleInfo(null); setShowUserMenu(false)
      toast.success(`Switched back to ${originalRoleInfo?.renameRole || "original role"}`)
      const r = originalRoleInfo?.renameRole?.toLowerCase() || ""
      if (r.includes("poc")) router.push("/lms/pages/poc/dashboard")
      else if (r.includes("admin")) router.push("/lms/pages/admin/dashboard")
      else router.push("/lms/pages/dashboard")
      setTimeout(() => window.dispatchEvent(new Event("storage")), 100)
    } catch { toast.error("Failed") }
  }

  const initials = user ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() : "SC"
  const isActualStudent = user?.role?.roleName?.toLowerCase().includes("student") || user?.role?.renameRole?.toLowerCase().includes("student")
  const { text: greetText, emoji: greetEmoji } = getGreeting()

  return (
    <>
      <style jsx global>{`
        .sc-drop {
          animation: scDrop .18s cubic-bezier(.16,1,.3,1) both;
          transform-origin: top right;
        }
        @keyframes scDrop {
          from { opacity: 0; transform: scale(.95) translateY(-6px) }
          to   { opacity: 1; transform: scale(1)  translateY(0) }
        }

        /* ── icon buttons ── */
        .sc-topbar-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
          cursor: pointer;
          border: 1.5px solid ${isDark ? T.dark.border : "#eae7ec"};
          outline: none;
          background: ${isDark ? T.dark.surface : "#ffffff"};
          box-shadow: 0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04);
        }
        .sc-topbar-icon:hover {
          background: ${isDark ? "rgba(255,255,255,0.08)" : T.surface};
          box-shadow: 0 3px 10px rgba(0,0,0,0.10);
          transform: translateY(-1px);
        }
        .sc-topbar-icon.active {
          background: ${isDark ? "rgba(242,119,87,0.14)" : T.orangeLight};
          color: ${T.orange} !important;
          box-shadow: 0 2px 8px ${T.orangeGlow};
          border-color: ${T.orange}44;
        }

        /* Theme toggle spin animation */
        .sc-theme-spin {
          transition: transform 0.4s cubic-bezier(.34,1.56,.64,1);
        }
        .sc-theme-spin:hover {
          transform: rotate(20deg) scale(1.15);
        }

        .sc-topbar-divider {
          width: 1px;
          height: 28px;
          background: ${isDark ? T.dark.border : T.border};
          margin: 0 6px;
          flex-shrink: 0;
        }
      `}</style>

      <div className="flex items-center justify-between gap-4 pb-5 mb-5">

        {/* ── LEFT: hamburger + greeting card ── */}
        <div className="flex items-center gap-3 flex-1">

          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-full transition-colors md:hidden flex-shrink-0"
            style={{
              color: isDark ? T.dark.textMuted : T.textMuted,
              background: isDark ? T.dark.surface : "#ffffff",
              border: `1.5px solid ${isDark ? T.dark.border : "#eae7ec"}`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}
          >
            <Menu className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>

          {/* ── GREETING + DATE/TIME CARD ── */}
          <div
            className="flex items-center gap-4 flex-1 px-5 py-3 rounded-2xl"
            style={{
              background: isDark
                ? `linear-gradient(120deg, rgba(242,119,87,0.10) 0%, ${T.dark.surface} 100%)`
                : `linear-gradient(120deg, rgba(242,119,87,0.07) 0%, #ffffff 100%)`,
              border: `1.5px solid ${isDark ? "rgba(242,119,87,0.18)" : "rgba(242,119,87,0.15)"}`,
              boxShadow: isDark
                ? `0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)`
                : `0 2px 12px rgba(242,119,87,0.08), inset 0 1px 0 rgba(255,255,255,0.9)`,
            }}
          >
            {/* Emoji badge */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 select-none"
              style={{
                background: isDark ? "rgba(242,119,87,0.15)" : T.orangeLight,
                border: `1.5px solid ${isDark ? "rgba(242,119,87,0.25)" : "rgba(242,119,87,0.20)"}`,
              }}
            >
              {greetEmoji}
            </div>

            {/* Greeting text */}
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold leading-tight truncate" style={{ color: isDark ? T.dark.textMain : T.textMain }}>
                {greetText},{" "}
                <span style={{ color: T.orange }}>
                  {user?.firstName || "there"}{isDummyStudent ? " (Student View)" : ""}
                </span>{" "}
                <Sparkles className="inline w-3.5 h-3.5 mb-0.5" style={{ color: T.orange }} />
              </p>
              <p className="text-[11px] mt-0.5 leading-none" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
                {user?.role?.renameRole || user?.institution?.institutionName || "SmartCliff LMS"}
              </p>
            </div>

            {/* Date + time pills */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {/* Date pill */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: isDark ? T.dark.bg : "#f5f3f8",
                  border: `1px solid ${isDark ? T.dark.border : T.border}`,
                }}
              >
                <CalendarDays className="w-3.5 h-3.5" style={{ color: T.orange }} strokeWidth={2} />
                <span className="text-[11px] font-semibold" style={{ color: isDark ? T.dark.textSub : T.textSub }}>
                  {formatDate(now)}
                </span>
              </div>

              {/* Time pill */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: isDark ? T.dark.bg : "#f5f3f8",
                  border: `1px solid ${isDark ? T.dark.border : T.border}`,
                }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: T.orange }} strokeWidth={2} />
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: isDark ? T.dark.textSub : T.textSub }}>
                  {formatTime(now)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: bell + theme toggle + divider + profile ── */}
        <div className="flex items-center gap-2">

          {/* Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn("sc-topbar-icon", showNotifications && "active")}
              style={{ color: showNotifications ? T.orange : (isDark ? T.dark.textMuted : T.textMuted) }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.orange }}
              onMouseLeave={e => { if (!showNotifications) (e.currentTarget as HTMLElement).style.color = isDark ? T.dark.textMuted : T.textMuted }}
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: T.orange }} />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: T.orange }} />
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="sc-drop absolute top-full right-0 mt-2 w-80 z-50 overflow-hidden"
                style={{
                  background: isDark ? T.dark.surface : T.bg,
                  borderRadius: "16px",
                  border: `1px solid ${isDark ? T.dark.border : T.border}`,
                  boxShadow: isDark
                    ? "0 16px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)"
                    : "0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${isDark ? T.dark.border : T.border}` }}>
                  <div>
                    <h3 className="text-[13px] font-bold" style={{ color: isDark ? T.dark.textMain : T.textMain }}>Notifications</h3>
                    {unread > 0 && <p className="text-[10px] mt-0.5" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>{unread} unread</p>}
                  </div>
                  {unread > 0 && (
                    <button onClick={() => markAll.mutate()} className="text-[11px] font-semibold hover:underline" style={{ color: T.orange }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0
                    ? (
                      <div className="py-10 text-center">
                        <Bell className="w-6 h-6 mx-auto mb-2" style={{ color: isDark ? T.dark.border : T.border }} />
                        <p className="text-[12px]" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>No notifications</p>
                      </div>
                    )
                    : notifications.map((n: any) => (
                      <div
                        key={n._id}
                        onClick={() => markRead.mutate(n._id)}
                        className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                        style={{ borderBottom: `1px solid ${isDark ? T.dark.border : "#f7f7f9"}`, background: !n.isRead ? T.orangeLight : "transparent" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(242,119,87,0.08)" : "#FFF4F1" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = !n.isRead ? T.orangeLight : "transparent" }}
                      >
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: !n.isRead ? T.orange : (isDark ? T.dark.border : T.border) }} />
                        <div className="min-w-0">
                          <p className="text-[12px] leading-tight" style={{ fontWeight: !n.isRead ? 600 : 500, color: !n.isRead ? (isDark ? T.dark.textMain : T.textMain) : (isDark ? T.dark.textMuted : T.textMuted) }}>{n.title}</p>
                          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: isDark ? T.dark.textHint : T.textHint }}>{n.message}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* ── THEME TOGGLE — replaces phone icon ── */}
          <button
            onClick={toggleTheme}
            className="sc-topbar-icon"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              color: isDark ? "#f59e0b" : "#6366f1",
              background: isDark
                ? "rgba(245,158,11,0.10)"
                : "rgba(99,102,241,0.07)",
              borderColor: isDark ? "rgba(245,158,11,0.30)" : "rgba(99,102,241,0.20)",
              boxShadow: isDark
                ? "0 2px 8px rgba(245,158,11,0.18), 0 1px 3px rgba(0,0,0,0.06)"
                : "0 2px 8px rgba(99,102,241,0.12), 0 1px 3px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background    = isDark ? "rgba(245,158,11,0.18)" : "rgba(99,102,241,0.14)"
              el.style.boxShadow     = isDark ? "0 4px 14px rgba(245,158,11,0.25)" : "0 4px 14px rgba(99,102,241,0.20)"
              el.style.transform     = "translateY(-1px) rotate(15deg)"
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background    = isDark ? "rgba(245,158,11,0.10)" : "rgba(99,102,241,0.07)"
              el.style.boxShadow     = isDark
                ? "0 2px 8px rgba(245,158,11,0.18), 0 1px 3px rgba(0,0,0,0.06)"
                : "0 2px 8px rgba(99,102,241,0.12), 0 1px 3px rgba(0,0,0,0.06)"
              el.style.transform     = "translateY(0) rotate(0deg)"
            }}
          >
            {/* Shows Sun in dark mode (click → go light), Moon in light mode (click → go dark) */}
            {isDark
              ? <Sun  className="w-[18px] h-[18px]" strokeWidth={2} />
              : <Moon className="w-[18px] h-[18px]" strokeWidth={2} />
            }
          </button>

          {/* Divider */}
          <div className="sc-topbar-divider" />

          {/* ── PROFILE ── */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 transition-all"
              style={{
                background: isDark
                  ? (showUserMenu ? "rgba(242,119,87,0.10)" : T.dark.surface)
                  : (showUserMenu ? "#FFF4F1" : "#ffffff"),
                borderRadius: "999px",
                border: `1.5px solid ${showUserMenu ? T.orange + "55" : (isDark ? T.dark.border : "#e8e4eb")}`,
                padding: "5px 12px 5px 6px",
                boxShadow: showUserMenu
                  ? `0 2px 12px ${T.orangeGlow}`
                  : "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
              }}
              onMouseEnter={e => {
                if (!showUserMenu) {
                  (e.currentTarget as HTMLElement).style.background  = isDark ? "rgba(255,255,255,0.06)" : T.surface
                  ;(e.currentTarget as HTMLElement).style.boxShadow  = "0 3px 12px rgba(0,0,0,0.10)"
                }
              }}
              onMouseLeave={e => {
                if (!showUserMenu) {
                  (e.currentTarget as HTMLElement).style.background  = isDark ? T.dark.surface : "#ffffff"
                  ;(e.currentTarget as HTMLElement).style.boxShadow  = "0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)"
                }
              }}
            >
              {userLoading
                ? <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: isDark ? T.dark.border : T.border }} />
                : (
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${T.orange}, ${T.orangeDark})`,
                      boxShadow: `0 2px 8px ${T.orangeGlow}`,
                    }}
                  >
                    {initials}
                  </div>
                )
              }
              <div className="hidden sm:block text-left">
                <p className="text-[12.5px] font-semibold leading-tight" style={{ color: isDark ? T.dark.textMain : T.textMain }}>
                  {user?.firstName || "User"}
                </p>
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>
                  {isDummyStudent ? "Student View" : user?.role?.renameRole || "Account"}
                </p>
              </div>
              <ChevronDown
                className={cn("w-3.5 h-3.5 hidden sm:block transition-transform duration-200 ml-0.5", showUserMenu && "rotate-180")}
                style={{ color: isDark ? T.dark.textHint : "#bcbccc" }}
              />
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div
                className="sc-drop absolute top-full right-0 mt-2 w-64 z-50 overflow-hidden"
                style={{
                  background: isDark ? T.dark.surface : T.bg,
                  borderRadius: "18px",
                  border: `1px solid ${isDark ? T.dark.border : T.border}`,
                  boxShadow: isDark
                    ? "0 16px 40px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)"
                    : "0 16px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)",
                }}
              >
                {/* Header */}
                <div
                  className="px-4 py-3"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.02)" : T.surface,
                    borderBottom: `1px solid ${isDark ? T.dark.border : T.border}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, boxShadow: `0 4px 14px ${T.orangeGlow}` }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold truncate" style={{ color: isDark ? T.dark.textMain : T.textMain }}>{user?.firstName} {user?.lastName}</p>
                      <p className="text-[11px] truncate" style={{ color: isDark ? T.dark.textMuted : T.textMuted }}>{user?.email}</p>
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5" style={{ background: T.orangeLight, color: T.orange }}>
                        {isDummyStudent ? "⚡ Student View" : user?.role?.renameRole || "Account"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-1.5">
                  {!isActualStudent && !isDummyStudent && (
                    <MRow icon={UserCheck2} label="Switch to Student" sub="Preview student experience" color="#3b82f6" bg="#eff6ff" onClick={handleSwitchStudent} isDark={isDark} />
                  )}
                  {isDummyStudent && originalRoleInfo && (
                    <MRow icon={Zap} label={`Back to ${originalRoleInfo.renameRole}`} sub="Return to original role" color="#f59e0b" bg="#fffbeb" onClick={handleSwitchBack} isDark={isDark} />
                  )}
                  <div className="h-px my-1 mx-1" style={{ background: isDark ? T.dark.border : T.border }} />
                  <MRow icon={User}       label="My Profile"     sub="" color={isDark ? T.dark.textMuted : T.textMuted} bg={isDark ? T.dark.surface : T.surface} onClick={handleProfile}             isDark={isDark} />
                  <MRow icon={Settings}   label="Settings"       sub="" color={isDark ? T.dark.textMuted : T.textMuted} bg={isDark ? T.dark.surface : T.surface} onClick={() => setShowUserMenu(false)} isDark={isDark} />
                  <MRow icon={HelpCircle} label="Help & Support" sub="" color={isDark ? T.dark.textMuted : T.textMuted} bg={isDark ? T.dark.surface : T.surface} onClick={() => setShowUserMenu(false)} isDark={isDark} />
                </div>

                <div className="p-1.5" style={{ borderTop: `1px solid ${isDark ? T.dark.border : T.border}` }}>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors"
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark ? "rgba(229,62,62,0.10)" : "#fff5f5" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  >
                    <LogOut className="w-3.5 h-3.5" style={{ color: "#e53e3e" }} />
                    <span className="text-[12px] font-semibold" style={{ color: "#e53e3e" }}>
                      {isLoggingOut ? "Signing out…" : "Sign Out"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function MRow({ icon: Icon, label, sub, color, bg, onClick, isDark }: {
  icon: React.ElementType; label: string; sub: string
  color: string; bg: string; onClick: () => void; isDark?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors"
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = bg }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <div className="min-w-0">
        <p className="text-[12px] font-medium" style={{ color: isDark ? "#e8e8f0" : "#1a1a2e" }}>{label}</p>
        {sub && <p className="text-[10px]" style={{ color: isDark ? "#6b6b88" : "#8b8b9e" }}>{sub}</p>}
      </div>
    </button>
  )
}