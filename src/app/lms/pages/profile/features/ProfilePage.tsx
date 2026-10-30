"use client"

// Profile — who the signed-in person is, what they can change about it, and
// (for learners) where they stand and how to carry on.
//
// Everything shown is real: identity from the user record, learning figures
// from the student dashboard's own engine (buildDashboard), notes and
// notifications from the same services the rest of the app uses. Actions that
// have no backend behind them are not offered.

import { Loading } from "@/components/loading-ui/loading"
import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Bell, BookOpen, Calendar, Camera, Check, ChevronDown, ChevronRight, Download, FileBarChart,
  FileText, GraduationCap, Home, KeyRound, LifeBuoy, Mail, Pencil, Phone, PlayCircle,
  Settings2, Shield, TrendingUp, User, UserCircle2, Users, Zap,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { StudentLayout } from "@/app/lms/component/student/student-layout"
import { StaffLayout } from "@/app/lms/component/stafflayout/staff-layout"
import DashboardLayout from "@/app/lms/component/layout"
import { useProfileUserStatsQuery } from "@/queries/profileStats"
import { courseStructuresSummaryQuery } from "@/app/lms/pages/coursestructure/api/createCourseStucture"
import { notificationsService } from "@/app/lms/pages/notifications/api/notifications"

// The Performance tab and the learner's headline figures are the student
// dashboard's OWN metrics engine, re-read on this page — not a second
// implementation of the same numbers — so Profile and Dashboard never disagree.
import { useCurrentUserQuery } from "@/queries/auth"
import {
  useStudentAnalyticsQuery,
  useMyAttendanceQuery,
  useMyLearningTimeQuery,
  attendanceWindow,
  getUserSpecificAnalytics,
} from "@/queries/studentDashboard"
import {
  buildDashboard,
  idStr,
  type CourseModel,
  type DashboardModel,
} from "@/app/lms/pages/studentdashboard/_lib/metrics"

// The trainer's headline counts come from the SAME hook the trainer dashboard
// renders (use-trainer-dashboard.ts), not from the cached user document, which
// only carries the courses a trainer is a *participant* on.
import { useTrainerDashboard } from "@/app/lms/pages/dashboard/features/hooks/use-trainer-dashboard"

import {
  ACCENT_TEXT, Avatar, CARD, Chip, EmptyState, PButton, Panel, Ring, Skeleton, StatusBadge,
  cap, csvCell, downloadFile, fmtDate, hasRealPhoto, stripHtml,
} from "./profileUi"
import {
  ChangePasswordDialog, EditDetailsDialog, ProfilePhotoDialog, SupportDialog, type ProfilePatch,
} from "./ProfileDialogs"
import { NoteDialogs, NotesTab, RecentNotesCard, useProfileNotes, type NoteDialogState } from "./ProfileNotes"
import { NotificationsTab } from "./ProfileNotifications"
import { PerformanceTab, courseStatus } from "./ProfilePerformance"

interface UserData {
  _id: string; email: string; firstName: string; lastName: string;
  phone: string; gender: string; profile: string; degree: string;
  department: string; year: string; semester: string; batch: string;
  rollNumber?: string;
  status: string; institution: { $oid: string };
  role: { _id: string; originalRole: string; renameRole: string; roleValue: string };
  createdAt: string; updatedAt: string; createdBy: string;
  notes: any[]; permissions: any[]; notifications: any[]; courses: any[]; __v?: number;
}

interface DashboardStats {
  users: { total: number; students: number; staff: number; admin: number };
  courses: { total: number };
  recentActivities: { newUsers: number; newCourses: number; activeUsers: number };
}

const USER_DATA_KEY = "smartcliff_userData"
const ROLE_VALUE_KEY = "smartcliff_roleValue"

// Admin roles - users with these roles get admin access
const ADMIN_ROLES = ['admin', 'ldhead', 'subhead', 'programcoordinator']

// Staff roles - users with these roles get staff access
const STAFF_ROLES = ['poc', 'trainer']

const getUserRole = (): string => {
  try {
    const roleValue = localStorage.getItem(ROLE_VALUE_KEY)
    if (roleValue) {
      const normalizedRole = roleValue.toLowerCase()
      if (ADMIN_ROLES.includes(normalizedRole)) return 'admin'
      if (STAFF_ROLES.includes(normalizedRole)) return 'staff'
      if (normalizedRole === 'student') return 'student'
    }

    const userDataStr = localStorage.getItem(USER_DATA_KEY)
    if (userDataStr) {
      const userData: UserData = JSON.parse(userDataStr)
      if (userData.role) {
        const roleFromData = (userData.role.roleValue ||
                             userData.role.originalRole ||
                             userData.role.renameRole || '').toLowerCase()
        if (ADMIN_ROLES.includes(roleFromData)) return 'admin'
        if (STAFF_ROLES.includes(roleFromData)) return 'staff'
        if (roleFromData === 'student') return 'student'
      }
    }

    return 'student'
  } catch (error) {
    console.error('Error getting user role:', error)
    return 'student'
  }
}

const getOriginalRoleName = (): string => {
  try {
    const roleValue = localStorage.getItem(ROLE_VALUE_KEY)
    if (roleValue) return roleValue

    const userDataStr = localStorage.getItem(USER_DATA_KEY)
    if (userDataStr) {
      const userData: UserData = JSON.parse(userDataStr)
      if (userData.role) {
        return userData.role.renameRole || userData.role.originalRole || userData.role.roleValue || 'Staff'
      }
    }

    return 'Staff Member'
  } catch (error) {
    console.error('Error getting original role name:', error)
    return 'Staff Member'
  }
}

const getCurrentUser = (): { valid: boolean; user: UserData | null } => {
  try {
    const userDataStr = localStorage.getItem(USER_DATA_KEY)
    if (!userDataStr) return { valid: false, user: null }
    return { valid: true, user: JSON.parse(userDataStr) }
  } catch (error) {
    console.error('Error getting current user:', error)
    return { valid: false, user: null }
  }
}

const COURSE_URL = (id: string) => `/lms/pages/courses/coursesdetailedview/${id}`

// ── Headline cards ───────────────────────────────────────────────────────────
type Tone = "blue" | "green" | "orange" | "purple"
type StatItem = { icon: React.ElementType; label: string; value: React.ReactNode; sub?: string; tone: Tone }

const TONES: Record<Tone, { card: string; icon: string }> = {
  blue: {
    card: "border-[#e3ecfd] bg-[#f5f8ff] dark:border-sky-500/20 dark:bg-sky-500/[0.06]",
    icon: "bg-[#e3ecfd] text-[#2f6fed] dark:bg-sky-500/15 dark:text-sky-300",
  },
  green: {
    card: "border-[#dcf3e6] bg-[#f3fbf7] dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]",
    icon: "bg-[#dcf3e6] text-[#16a34a] dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  orange: {
    card: "border-[#ffe9d6] bg-[#fff8f1] dark:border-orange-500/20 dark:bg-orange-500/[0.06]",
    icon: "bg-[#ffe9d6] text-[#ea7a1a] dark:bg-orange-500/15 dark:text-orange-300",
  },
  purple: {
    card: "border-[#e8e3fd] bg-[#f7f5ff] dark:border-[#7a6af0]/25 dark:bg-[#7a6af0]/[0.07]",
    icon: "bg-[#ece8fe] text-[#5b47e0] dark:bg-[#7a6af0]/20 dark:text-[#b4aaf9]",
  },
}

function StatCards({ items, loading }: { items: StatItem[]; loading?: boolean }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
      {items.map((s) => {
        const t = TONES[s.tone]
        const Icon = s.icon
        return (
          <div key={s.label} className={cn("flex min-w-0 items-start gap-3 rounded-2xl border p-4 sm:gap-3.5 sm:p-5", t.card)}>
            <span className={cn("grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11", t.icon)}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-body">{s.label}</p>
              {loading ? (
                <Skeleton className="mt-2 h-7 w-12" />
              ) : (
                <p className="mt-0.5 truncate text-2xl font-semibold leading-tight tabular-nums text-heading">{s.value}</p>
              )}
              {s.sub && !loading && <p className="mt-0.5 truncate text-xs text-subtle">{s.sub}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Trainer headline cards — Courses · Learners · Permissions · Member since.
// Its own component so `useTrainerDashboard` (five endpoints, one of them
// slow) mounts only for staff.
function TrainerHeadlineStats({ user }: { user: UserData }) {
  const noop = useMemo(() => () => {}, [])
  const { model, loading } = useTrainerDashboard("all", noop)
  // Only the grants actually in force.
  const activePermissions = (user.permissions || []).filter((p: any) => p?.isActive).length
  return (
    <StatCards
      items={[
        { icon: BookOpen, tone: "blue", label: "Courses", value: loading ? "—" : (model?.courses ?? 0), sub: loading ? "Loading…" : `${model?.activeCourses ?? 0} with learners` },
        { icon: GraduationCap, tone: "green", label: "Learners", value: loading ? "—" : (model?.students ?? 0), sub: loading ? "Loading…" : `${model?.completed ?? 0} completed` },
        { icon: Shield, tone: "orange", label: "Permissions", value: activePermissions, sub: "active" },
        { icon: Calendar, tone: "purple", label: "Member since", value: fmtDate(user.createdAt).replace(/ \d+,/, "") || "—", sub: fmtDate(user.createdAt) },
      ]}
    />
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userDataLoading, setUserDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [userRole, setUserRole] = useState<string>("")
  const [originalRoleName, setOriginalRoleName] = useState<string>("")
  const [dialog, setDialog] = useState<null | "photo" | "password" | "details" | "support">(null)
  const [noteDialog, setNoteDialog] = useState<NoteDialogState>(null)
  const [exporting, setExporting] = useState(false)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const loadUserData = () => {
      try {
        setUserRole(getUserRole())
        setOriginalRoleName(getOriginalRoleName())
        const { valid, user } = getCurrentUser()
        if (!valid || !user) {
          router.push("/login")
          return
        }
        setUserData(user)
      } catch (error) {
        console.error('Error loading user data:', error)
        router.push("/login")
      } finally {
        setUserDataLoading(false)
      }
    }

    loadUserData()

    const handleStorageChange = () => {
      setUserRole(getUserRole())
      setOriginalRoleName(getOriginalRoleName())
      const { valid, user } = getCurrentUser()
      if (valid && user) setUserData(user)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [router])

  // Admin-only figures. Both reads share their cache with the rest of the app.
  const isAdminRole = userRole === 'admin'
  const usersQuery = useProfileUserStatsQuery(isAdminRole ? (userData?.institution as any) : null)
  const coursesQuery = useQuery({
    ...courseStructuresSummaryQuery(),
    enabled: isAdminRole && !!userData?.institution,
  })

  // ── Student performance ───────────────────────────────────────────────────
  // Same four reads the student dashboard makes, off the same cache keys —
  // passing null for staff/admin keeps them from ever firing.
  const isStudentRole = userRole === 'student'
  const { data: meUser, isLoading: meLoading } = useCurrentUserQuery()
  const perfStudentId = isStudentRole ? idStr((meUser as any)?.user?._id) : ''

  const { data: perfAnalytics, isLoading: perfAnalyticsLoading } =
    useStudentAnalyticsQuery(perfStudentId || null)

  const perfCourses = useMemo(
    () => (perfAnalytics && perfStudentId
      ? getUserSpecificAnalytics(perfAnalytics, perfStudentId)?.userCourses || []
      : []),
    [perfAnalytics, perfStudentId],
  )

  const perfWindow = useMemo(() => attendanceWindow(), [])
  const perfCourseIds = useMemo(() => perfCourses.map((c: any) => idStr(c?._id)), [perfCourses])
  const { records: perfAttendance } = useMyAttendanceQuery(perfCourseIds, perfStudentId || null, perfWindow)
  const { data: perfLearningTime = null } = useMyLearningTimeQuery(perfStudentId || null)

  const performance: DashboardModel | null = useMemo(
    () => (isStudentRole && meUser
      ? buildDashboard(meUser, perfCourses, perfAttendance, perfLearningTime)
      : null),
    [isStudentRole, meUser, perfCourses, perfAttendance, perfLearningTime],
  )
  const perfLoading = isStudentRole && (meLoading || (!!perfStudentId && perfAnalyticsLoading))

  const notesApi = useProfileNotes()

  const dashboardStats: DashboardStats | null = (() => {
    if (!isAdminRole || !usersQuery.data || !coursesQuery.data) return null
    const userStats = usersQuery.data
    const allCourses = coursesQuery.data as any[]
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return {
      users: { total: userStats.total, students: userStats.students, staff: userStats.staff, admin: userStats.admin },
      courses: { total: allCourses.length },
      recentActivities: {
        newUsers: userStats.newUsers,
        newCourses: allCourses.filter((c: any) => new Date(c.createdAt) >= thirtyDaysAgo).length,
        activeUsers: userStats.activeUsers,
      },
    }
  })()

  // For admins the page waits for its two stats reads (cached on repeat visits).
  const loading = userDataLoading || (isAdminRole && (usersQuery.isLoading || coursesQuery.isLoading))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loading size="size-12" label="Loading profile..." />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-xs rounded-xl border border-hairline bg-surface p-6 text-center shadow-sm">
          <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-surface-sunken ring-1 ring-hairline">
            <User className="h-5 w-5 text-subtle" />
          </span>
          <h2 className="text-base font-semibold text-heading">You are signed out</h2>
          <p className="mt-1 text-sm text-subtle">Sign in to see your profile.</p>
          <PButton variant="primary" className="mt-4 w-full" onClick={() => router.push("/login")}>Go to sign in</PButton>
        </div>
      </div>
    )
  }

  const Layout = userRole === 'admin' ? DashboardLayout : userRole === 'student' ? StudentLayout : StaffLayout

  const navigateToDashboard = () => {
    router.push(userRole === 'admin' ? "/lms/pages/admindashboard" : userRole === 'student' ? "/lms/pages/studentdashboard" : "/lms/pages/dashboard")
  }

  const roleName = (() => {
    if (userRole === 'admin') {
      const r = originalRoleName.toLowerCase()
      if (r === 'ldhead') return 'LD Head'
      if (r === 'subhead') return 'Sub Head'
      if (r === 'programcoordinator') return 'Program Coordinator'
      return 'Administrator'
    }
    if (userRole === 'student') return 'Student'
    // A trainer's role may carry the institution's own name for it.
    return userData.role?.renameRole || cap(originalRoleName)
  })()
  const isStaffOrAdmin = userRole === 'staff' || userRole === 'admin'

  // A saved change lands in the page, the cached identity the whole app reads
  // (sidebar avatar included) and the current-user query.
  const applyPatch = (patch: ProfilePatch) => {
    setUserData((prev) => {
      if (!prev) return prev
      const merged: UserData = {
        ...prev,
        ...(patch.profile !== undefined ? { profile: patch.profile } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.gender !== undefined ? { gender: patch.gender } : {}),
        ...(patch.updatedAt ? { updatedAt: patch.updatedAt } : {}),
      }
      try { localStorage.setItem(USER_DATA_KEY, JSON.stringify(merged)) } catch { /* quota / private mode */ }
      return merged
    })
    qc.invalidateQueries({ queryKey: ["currentUser"] })
  }

  // ── Learner figures ───────────────────────────────────────────────────────
  const courses: CourseModel[] = performance?.courses || []
  const completedCount = performance?.completed ?? 0
  const inProgressCount = performance?.inProgress ?? 0
  const notStartedCount = Math.max(0, courses.length - completedCount - inProgressCount)

  // Continue the course worked on most recently; otherwise start one not yet
  // begun.
  const resumeCourse = courses
    .filter((c) => courseStatus(c) === "In progress")
    .sort((a, b) => (b.lastAccessed?.getTime() || 0) - (a.lastAccessed?.getTime() || 0))[0]
  const startCourse = courses.find((c) => courseStatus(c) === "Not started")

  const statItems: StatItem[] = userRole === 'student'
    ? [
        { icon: BookOpen, tone: "blue", label: "Enrolled courses", value: courses.length, sub: notStartedCount > 0 ? `${notStartedCount} not started yet` : "active enrolments" },
        { icon: Check, tone: "green", label: "Completed", value: completedCount, sub: "courses finished" },
        { icon: PlayCircle, tone: "orange", label: "In progress", value: inProgressCount, sub: "courses under way" },
        { icon: TrendingUp, tone: "purple", label: "Overall progress", value: `${performance?.overallProgress ?? 0}%`, sub: "across all courses" },
      ]
    : dashboardStats
      // One row: the last-30-days activity rides in each card's second line
      // rather than as a second row of cards.
      ? [
          { icon: Users, tone: "blue", label: "Total users", value: dashboardStats.users.total, sub: `${dashboardStats.recentActivities.activeUsers} active · ${dashboardStats.recentActivities.newUsers} new this month` },
          { icon: GraduationCap, tone: "green", label: "Students", value: dashboardStats.users.students, sub: "enrolled" },
          { icon: UserCircle2, tone: "orange", label: "Faculty & staff", value: dashboardStats.users.staff, sub: "members" },
          { icon: BookOpen, tone: "purple", label: "Courses", value: dashboardStats.courses.total, sub: `${dashboardStats.recentActivities.newCourses} added in the last 30 days` },
        ]
      : []

  const permissions: any[] = (userData.permissions || []).slice()
    .sort((a: any, b: any) => Number(!!b?.isActive) - Number(!!a?.isActive))
  const activePermissionCount = permissions.filter((p) => p?.isActive).length
  const unreadCount = (userData.notifications || []).filter((n: any) => !n.isRead).length

  const tabs: { id: string; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: Home },
    ...(isStudentRole ? [{ id: "performance", label: "Performance", icon: TrendingUp }] : []),
    { id: "notes", label: "Notes", icon: FileText, badge: notesApi.notes.length },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    ...(isStaffOrAdmin ? [{ id: "permissions", label: "Permissions", icon: Shield, badge: activePermissionCount }] : []),
  ]
  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return
    e.preventDefault()
    const i = tabs.findIndex((t) => t.id === activeTab)
    const n = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1
      : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length
    setActiveTab(tabs[n].id)
    tabRefs.current[tabs[n].id]?.focus()
  }

  // ── Profile completion ── what the person can fill in themselves.
  const completion = [
    { key: "photo", label: "Profile photo", done: hasRealPhoto(userData.profile), open: () => setDialog("photo") },
    { key: "phone", label: "Phone number", done: !!userData.phone?.trim(), open: () => setDialog("details") },
    { key: "gender", label: "Gender", done: !!userData.gender?.trim(), open: () => setDialog("details") },
  ]
  const completionPct = Math.round((completion.filter((c) => c.done).length / completion.length) * 100)
  const firstMissing = completion.find((c) => !c.done)

  // ── Downloads ─────────────────────────────────────────────────────────────
  const stamp = new Date().toISOString().slice(0, 10)
  const downloadMyData = async () => {
    setExporting(true)
    try {
      const notifs = await notificationsService.fetchNotifications(true)
        .then((c) => c.notifications)
        .catch(() => userData.notifications || [])
      const data = {
        exportedAt: new Date().toISOString(),
        profile: {
          firstName: userData.firstName, lastName: userData.lastName, email: userData.email,
          phone: userData.phone, gender: userData.gender, role: roleName, status: userData.status,
          degree: userData.degree, department: userData.department, year: userData.year,
          semester: userData.semester, batch: userData.batch,
          accountCreated: userData.createdAt, lastUpdated: userData.updatedAt,
        },
        notes: notesApi.notes.map((n) => ({
          title: n.title, text: stripHtml(n.content), html: n.content, pinned: !!n.isPinned,
          tags: n.tags || [], created: n.createdAt, lastEdited: n.lastEdited || n.updatedAt,
        })),
        notifications: (notifs || []).map((n: any) => ({
          title: n.title, message: n.message, type: n.type, read: !!n.isRead, received: n.createdAt,
        })),
        ...(performance ? {
          learning: {
            overallProgress: performance.overallProgress,
            courses: performance.courses.map((c) => ({
              course: c.name, code: c.code || "", status: courseStatus(c), progress: Math.round(c.progress),
              score: c.scorePct, lastOpened: c.lastAccessed ? c.lastAccessed.toISOString() : null,
            })),
          },
        } : {}),
      }
      downloadFile(`my-data-${stamp}.json`, JSON.stringify(data, null, 2), "application/json")
      toast.success("Your data has been downloaded", { position: "top-right" })
    } catch {
      toast.error("Could not prepare your data. Please try again.", { position: "top-right" })
    } finally {
      setExporting(false)
    }
  }

  const downloadLearningReport = () => {
    if (!performance || courses.length === 0) return
    const rows: (string | number | null)[][] = [
      ["Learning report", `${userData.firstName} ${userData.lastName}`.trim()],
      ["Generated", new Date().toLocaleString()],
      ["Overall progress", `${performance.overallProgress}%`],
      ["Courses", `${courses.length} enrolled · ${completedCount} completed · ${inProgressCount} in progress · ${notStartedCount} not started`],
      [],
      ["Course", "Code", "Status", "Progress %", "I Do resources opened", "We Do exercises started", "You Do assessments started", "Score %", "Last opened"],
      ...courses.map((c) => [
        c.name, c.code || "", courseStatus(c), Math.round(c.progress),
        c.learn.hasContent ? `${c.learn.opened}/${c.learn.total}` : "",
        c.practice.hasContent ? `${c.practice.submitted}/${c.practice.assigned}` : "",
        c.assess.hasContent ? `${c.assess.submitted}/${c.assess.assigned}` : "",
        c.scorePct ?? "", c.lastAccessed ? fmtDate(c.lastAccessed) : "Never",
      ]),
    ]
    downloadFile(`learning-report-${stamp}.csv`, rows.map((r) => r.map(csvCell).join(",")).join("\n"), "text/csv;charset=utf-8")
    toast.success("Learning report downloaded", { position: "top-right" })
  }

  // ── Quick actions (learners) — learning, not account settings ────────────
  const quickActions = [
    resumeCourse
      ? { icon: PlayCircle, tone: "purple" as Tone, title: "Continue learning", sub: resumeCourse.name, onClick: () => router.push(COURSE_URL(resumeCourse.id)) }
      : startCourse
        ? { icon: PlayCircle, tone: "purple" as Tone, title: "Start learning", sub: startCourse.name, onClick: () => router.push(COURSE_URL(startCourse.id)) }
        : { icon: PlayCircle, tone: "purple" as Tone, title: "Start learning", sub: courses.length ? "All your courses are complete" : "No courses yet", onClick: () => router.push("/lms/pages/courses"), disabled: !courses.length },
    { icon: BookOpen, tone: "blue" as Tone, title: "My courses", sub: courses.length ? `${courses.length} enrolled` : "Browse your courses", onClick: () => router.push("/lms/pages/courses") },
    { icon: GraduationCap, tone: "green" as Tone, title: "My grades", sub: "Scores and results", onClick: () => router.push("/lms/pages/grades") },
    { icon: FileBarChart, tone: "orange" as Tone, title: "Learning report", sub: courses.length ? "Download your progress (CSV)" : "Available once you're enrolled", onClick: downloadLearningReport, disabled: !courses.length },
  ]

  // ── Personal information rows ─────────────────────────────────────────────
  const personalRows: { label: string; value?: React.ReactNode }[] = [
    { label: "Full name", value: `${userData.firstName || ""} ${userData.lastName || ""}`.trim() },
    { label: "Email address", value: userData.email },
    { label: "Phone number", value: userData.phone },
    { label: "Gender", value: cap(userData.gender) },
  ]
  const accountRows: { label: string; value?: React.ReactNode }[] = [
    { label: "Role", value: roleName },
    { label: "Account status", value: userData.status ? <StatusBadge status={userData.status} size="sm" /> : "" },
    { label: "Joined on", value: fmtDate(userData.createdAt) },
    ...(isStudentRole && performance?.student.rollNumber ? [{ label: "Student ID", value: performance.student.rollNumber }] : []),
    ...(userData.department ? [{ label: "Department", value: userData.department }] : []),
    ...(isStudentRole && userData.batch ? [{ label: "Batch", value: userData.batch }] : []),
    ...(isStaffOrAdmin ? [{ label: "Permissions", value: `${activePermissionCount} active` }] : []),
  ]
  const InfoList = ({ rows }: { rows: { label: string; value?: React.ReactNode }[] }) => (
    <dl className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
          <dt className="text-[13px] text-subtle">{r.label}</dt>
          <dd className="min-w-0 break-words text-[13px] font-medium text-heading">
            {r.value || <span className="font-normal text-faint">Not provided</span>}
          </dd>
        </div>
      ))}
    </dl>
  )

  const content = (
    // The student and staff shells pad their panel; the admin shell leaves
    // padding to the page.
    <div className={cn("min-h-full space-y-5 bg-surface", userRole === 'admin' && "p-3 sm:p-4 md:px-6 md:py-5")}>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
        <button onClick={navigateToDashboard} className="inline-flex items-center gap-1.5 rounded text-subtle transition-colors hover:text-heading">
          <Home className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-faint" />
        <span className="font-medium text-heading" aria-current="page">Profile</span>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-[#e8e3fd] bg-gradient-to-r from-[#f2efff] via-[#f5f3ff] to-[#eef1ff] p-5 sm:p-6 dark:border-white/10 dark:from-[#1e1b34] dark:via-[#1c1a31] dark:to-[#191a2c]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#e3dcff]/70 blur-3xl dark:bg-[#7a6af0]/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative self-center sm:self-auto">
            <Avatar
              src={userData.profile}
              firstName={userData.firstName}
              lastName={userData.lastName}
              className="h-24 w-24 shadow-sm ring-4 ring-white sm:h-28 sm:w-28 dark:ring-[#17181C]"
              textClassName="text-3xl"
            />
            <button
              type="button"
              onClick={() => setDialog("photo")}
              aria-label="Change profile photo"
              title="Change profile photo"
              className="absolute bottom-0.5 right-0.5 grid h-9 w-9 place-items-center rounded-full bg-[#5b47e0] text-white shadow-md ring-[3px] ring-white transition-colors hover:bg-[#4a37c9] focus-visible:outline-none focus-visible:ring-[#5b47e0]/40 dark:ring-[#17181C]"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Right padding keeps a long name clear of the Actions button. */}
          <div className="min-w-0 flex-1 text-center sm:pr-36 sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:justify-start">
              <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-heading">
                {userData.firstName} {userData.lastName}
              </h1>
              <StatusBadge status={userData.status} />
            </div>
            <p className="mt-1 text-[15px] text-body">{roleName}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-body sm:justify-start">
              <span className="inline-flex min-w-0 max-w-full items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-subtle" />
                <span className="truncate">{userData.email}</span>
              </span>
              {userData.phone && (
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 flex-shrink-0 text-subtle" />
                  {userData.phone}
                </span>
              )}
              {fmtDate(userData.createdAt) && (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0 text-subtle" />
                  Joined {fmtDate(userData.createdAt)}
                </span>
              )}
            </div>
          </div>

          {/* Account actions — grouped, each one leads somewhere real. */}
          <div className="flex justify-center sm:absolute sm:right-0 sm:top-0 sm:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <PButton variant="primary" className="h-10 px-4">
                  <Settings2 className="h-4 w-4" /> Actions <ChevronDown className="h-4 w-4" />
                </PButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6} className="w-64 rounded-xl p-1.5">
                <DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-subtle">Account & security</DropdownMenuLabel>
                <ActionItem icon={Pencil} label="Edit personal details" sub="Phone number and gender" onSelect={() => setDialog("details")} />
                <ActionItem icon={Camera} label="Profile photo" sub="Upload, replace or remove" onSelect={() => setDialog("photo")} />
                <ActionItem icon={KeyRound} label="Change password" sub="Update your sign-in password" onSelect={() => setDialog("password")} />
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuLabel className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-subtle">Data & support</DropdownMenuLabel>
                {!isStudentRole && <ActionItem icon={Download} label={exporting ? "Preparing your data…" : "Download my data"} sub="Profile, notes and progress (JSON)" onSelect={() => { void downloadMyData() }} disabled={exporting} />}
                <ActionItem icon={LifeBuoy} label="Help & support" sub="Contact the support team" onSelect={() => setDialog("support")} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>

      {/* ── Headline figures ───────────────────────────────────────────── */}
      {userRole === 'staff'
        ? <TrainerHeadlineStats user={userData} />
        : statItems.length > 0 && <StatCards items={statItems} loading={isStudentRole && perfLoading} />}

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="border-b border-hairline pb-2">
        <div
          role="tablist"
          aria-label="Profile sections"
          onKeyDown={onTabKey}
          className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el }}
                role="tab"
                id={`profile-tab-${tab.id}`}
                aria-selected={active}
                aria-controls="profile-tabpanel"
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex h-10 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-4 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b47e0]/30",
                  active
                    ? "bg-[#5b47e0] text-white shadow-[0_4px_12px_-4px_rgba(91,71,224,0.5)] dark:bg-[#7a6af0]"
                    : "text-body hover:bg-row-hover hover:text-heading",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {!!tab.badge && tab.badge > 0 && (
                  <span className={cn(
                    "min-w-[20px] rounded-full px-1.5 py-px text-center text-[11px] font-semibold tabular-nums",
                    active ? "bg-white/20 text-white" : "bg-[#ece8fe] text-[#4a37c9] dark:bg-[#7a6af0]/20 dark:text-[#c9c1fb]",
                  )}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab panel ──────────────────────────────────────────────────── */}
      <div id="profile-tabpanel" role="tabpanel" aria-labelledby={`profile-tab-${activeTab}`} className="min-w-0">

        {activeTab === 'overview' && (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-5">
              <Panel
                icon={User}
                title="Personal information"
                action={<PButton size="sm" variant="outline" onClick={() => setDialog("details")}><Pencil className="h-3.5 w-3.5" /> Edit</PButton>}
              >
                <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 md:divide-x md:divide-hairline">
                  <InfoList rows={personalRows} />
                  <div className="md:pl-6"><InfoList rows={accountRows} /></div>
                </div>
              </Panel>
              <RecentNotesCard api={notesApi} onOpen={setNoteDialog} onViewAll={() => setActiveTab("notes")} />
            </div>

            <div className="min-w-0 space-y-5">
              <Panel icon={UserCircle2} title="Profile completion">
                <div className="flex items-center gap-5">
                  <Ring pct={completionPct} label={`Profile ${completionPct}% complete`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-heading">
                      {completionPct === 100 ? "Your profile is complete" : completionPct >= 60 ? "Almost there" : "Finish setting up your profile"}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-subtle">
                      {completionPct === 100
                        ? "Trainers can recognise and reach you."
                        : `Add your ${completion.filter((c) => !c.done).map((c) => c.label.toLowerCase()).join(" and ")}.`}
                    </p>
                    {firstMissing && (
                      <PButton size="sm" variant="soft" className="mt-3" onClick={firstMissing.open}>Complete profile</PButton>
                    )}
                  </div>
                </div>
                <ul className="mt-4 space-y-1">
                  {completion.map((c) => (
                    <li key={c.key}>
                      <button
                        type="button"
                        onClick={c.open}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-row-hover"
                      >
                        <span className={cn(
                          "grid h-5 w-5 flex-shrink-0 place-items-center rounded-full",
                          c.done ? "bg-emerald-500 text-white" : "border-[1.5px] border-dashed border-hairline-strong",
                        )}>
                          {c.done && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span className={cn("flex-1", c.done ? "text-subtle" : "font-medium text-heading")}>{c.label}</span>
                        {!c.done && <span className={cn("text-xs font-medium", ACCENT_TEXT)}>Add</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>

              {isStudentRole && (
                <Panel icon={Zap} title="Quick actions">
                  {perfLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[74px] rounded-xl" />)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {quickActions.map((a) => {
                        const t = TONES[a.tone]
                        const Icon = a.icon
                        return (
                          <button
                            key={a.title}
                            type="button"
                            onClick={a.onClick}
                            disabled={a.disabled}
                            className={cn(
                              "flex min-w-0 items-start gap-3 rounded-xl border p-3.5 text-left transition-[transform,box-shadow] duration-150",
                              "hover:-translate-y-px hover:shadow-[0_6px_16px_-10px_rgba(16,24,40,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b47e0]/30",
                              "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none",
                              t.card,
                            )}
                          >
                            <span className={cn("grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg", t.icon)}>
                              <Icon className="h-[18px] w-[18px]" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-heading">{a.title}</span>
                              <span className="mt-0.5 line-clamp-2 block text-xs text-subtle">{a.sub}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </Panel>
              )}
            </div>
          </div>
        )}

        {activeTab === 'performance' && isStudentRole && (
          <PerformanceTab
            performance={performance}
            loading={perfLoading}
            onOpenCourse={(c) => router.push(COURSE_URL(c.id))}
            onBrowseCourses={() => router.push("/lms/pages/courses")}
          />
        )}

        {activeTab === 'notes' && <NotesTab api={notesApi} onOpen={setNoteDialog} />}

        {activeTab === 'notifications' && <NotificationsTab />}

        {activeTab === 'permissions' && isStaffOrAdmin && (
          <Panel
            icon={Shield}
            title="Permissions"
            subtitle={permissions.length > 0 ? `${activePermissionCount} of ${permissions.length} active · assigned by your administrator` : undefined}
          >
            {permissions.length > 0 ? (
              <ul className="divide-y divide-hairline">
                {permissions.map((p, i) => (
                  <li key={p._id || p.permissionKey || i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="break-words text-[13px] font-medium text-heading">{p.permissionName}</p>
                      {p.description && <p className="mt-0.5 break-words text-xs text-subtle">{p.description}</p>}
                    </div>
                    <Chip tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Shield} title="No permissions assigned" text="Your administrator assigns permissions from User Management." />
            )}
          </Panel>
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <ProfilePhotoDialog open={dialog === "photo"} onClose={() => setDialog(null)} user={userData} onSaved={applyPatch} />
      <ChangePasswordDialog open={dialog === "password"} onClose={() => setDialog(null)} onSaved={applyPatch} />
      <EditDetailsDialog open={dialog === "details"} onClose={() => setDialog(null)} user={userData} roleName={roleName} onSaved={applyPatch} />
      <SupportDialog open={dialog === "support"} onClose={() => setDialog(null)} user={userData} roleName={roleName} />
      <NoteDialogs state={noteDialog} setState={setNoteDialog} api={notesApi} />
    </div>
  )

  return <Layout>{content}</Layout>
}

/** One row of the Actions menu: icon, label and a short line on what it does. */
function ActionItem({ icon: Icon, label, sub, onSelect, disabled }: {
  icon: React.ElementType; label: string; sub: string; onSelect: () => void; disabled?: boolean
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} disabled={disabled} className="items-start gap-3 rounded-lg px-2 py-2">
      <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-md bg-[#f1eefe] text-[#5b47e0] dark:bg-[#7a6af0]/15 dark:text-[#b4aaf9]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-heading">{label}</span>
        <span className="block text-xs text-subtle">{sub}</span>
      </span>
    </DropdownMenuItem>
  )
}
