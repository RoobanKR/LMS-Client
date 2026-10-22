"use client"

import { Loading } from "@/components/loading-ui/loading"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  User, Mail, Phone, Calendar, FileText,
  Clock, Shield, Award, CheckCircle, Activity,
  ChevronRight, Home, TrendingUp, Bell, Flame,
  Pencil, Pin,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"

import { StudentLayout } from "@/app/lms/component/student/student-layout"
import { StaffLayout } from "@/app/lms/component/stafflayout/staff-layout"
import DashboardLayout from "@/app/lms/component/layout"
import { useProfileUserStatsQuery } from "@/queries/profileStats"
import { courseStructuresSummaryQuery } from "@/app/lms/pages/coursestructure/api/createCourseStucture"
import EditProfileModal from "./EditProfileModal"

// The Performance tab is the student dashboard's OWN metrics engine, re-read
// on this page — not a second implementation of the same numbers. Everything
// it renders comes out of buildDashboard(), so Profile → Performance and the
// dashboard can never drift apart or disagree about a percentage.
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
  shortDuration,
  type DashboardModel,
  type StageStats,
  type CourseModel,
} from "@/app/lms/pages/studentdashboard/_lib/metrics"

// The trainer's headline counts come from the SAME hook the trainer dashboard
// renders (use-trainer-dashboard.ts), not from the cached user document. The
// user doc only carries the courses a trainer is a *participant* on, so a
// trainer teaching six courses to 44 learners read "0 Courses · 0 Students"
// here while the dashboard read the real figures — the two disagreed on the
// same account. Sharing the hook means they cannot drift again.
import { useTrainerDashboard } from "@/app/lms/pages/dashboard/features/hooks/use-trainer-dashboard"

interface UserData {
  _id: string; email: string; firstName: string; lastName: string;
  phone: string; gender: string; profile: string; degree: string;
  department: string; year: string; semester: string; batch: string;
  status: string; institution: { $oid: string };
  role: { _id: string; originalRole: string; renameRole: string; roleValue: string };
  createdAt: string; updatedAt: string; createdBy: string;
  notes: any[]; permissions: any[]; notifications: any[]; courses: any[]; __v?: number;
}

interface DashboardStats {
  users: {
    total: number;
    students: number;
    staff: number;
    admin: number;
  };
  courses: {
    total: number;
    active: number;
    inactive: number;
  };
  recentActivities: {
    newUsers: number;
    newCourses: number;
    activeUsers: number;
  };
  institution: string;
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
      
      // Check for admin roles first
      if (ADMIN_ROLES.includes(normalizedRole)) {
        return 'admin'
      }
      
      // Check for staff roles
      if (STAFF_ROLES.includes(normalizedRole)) {
        return 'staff'
      }
      
      if (normalizedRole === 'student') {
        return 'student'
      }
      
      console.log(`Unrecognized role: ${normalizedRole}, defaulting to staff check`)
    }
    
    const userDataStr = localStorage.getItem(USER_DATA_KEY)
    if (userDataStr) {
      const userData: UserData = JSON.parse(userDataStr)
      if (userData.role) {
        const roleFromData = (userData.role.roleValue || 
                             userData.role.originalRole || 
                             userData.role.renameRole || '').toLowerCase()
        
        // Check for admin roles
        if (ADMIN_ROLES.includes(roleFromData)) {
          return 'admin'
        }
        
        // Check for staff roles
        if (STAFF_ROLES.includes(roleFromData)) {
          return 'staff'
        }
        
        if (roleFromData === 'student') {
          return 'student'
        }
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
    if (roleValue) {
      return roleValue
    }
    
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
    
    const userData: UserData = JSON.parse(userDataStr)
    return { valid: true, user: userData }
  } catch (error) {
    console.error('Error getting current user:', error)
    return { valid: false, user: null }
  }
}

const calcProgress = (course: any) => {
  const assignments = course.answers?.We_Do?.assignments || []
  if (!assignments.length) return 0
  let total = 0, attempted = 0, solved = 0
  assignments.forEach((a: any) => a.questions?.forEach((q: any) => {
    total++
    if (['attempted','solved','submitted'].includes(q.status)) attempted++
    if (q.status === 'solved') solved++
  }))
  return total === 0 ? 0 : Math.round((attempted / total) * 60 + (solved / total) * 40)
}

// Trainer headline stats — Courses · Learners · Permissions · Member Since.
//
// The first two are the teaching figures the dashboard leads with, read from
// the dashboard's OWN hook so the two surfaces cannot disagree. The last two are
// account facts about the person, which is what a profile is for: the
// dashboard's operational cards (batches due today, clients served) belong on
// the dashboard, not on someone's personal page.
//
// It is its own component so `useTrainerDashboard` mounts only for staff: that
// hook fans out to five endpoints, the analytics one costing ~12s server-side,
// and an admin or learner opening their profile must not pay for a teaching
// roll-up they will never see.
function TrainerHeadlineStats({ user }: { user: UserData }) {
  const noop = useMemo(() => () => {}, [])
  const { model, loading } = useTrainerDashboard("all", noop)

  // Only the grants actually in force — a revoked permission still sits on
  // the user record with isActive false.
  const activePermissions = (user.permissions || []).filter((p: any) => p?.isActive).length
  const joined = user.createdAt ? new Date(user.createdAt) : null
  const joinedValid = joined && !Number.isNaN(joined.getTime())

  return (
    <StatStrip
      items={[
        {
          label: 'Courses',
          value: loading ? '—' : (model?.courses ?? 0),
          sub: loading ? 'Loading…' : `${model?.activeCourses ?? 0} with learners`,
        },
        {
          label: 'Learners',
          value: loading ? '—' : (model?.students ?? 0),
          sub: loading ? 'Loading…' : `${model?.completed ?? 0} completed`,
        },
        { label: 'Permissions', value: activePermissions, sub: 'active' },
        {
          label: 'Member since',
          value: joinedValid ? joined.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
          sub: joinedValid ? joined.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        },
      ]}
    />
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userDataLoading, setUserDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [editOpen, setEditOpen] = useState(false)
  const [userRole, setUserRole] = useState<string>("")
  const [originalRoleName, setOriginalRoleName] = useState<string>("")

  useEffect(() => {
    const loadUserData = () => {
      try {
        const role = getUserRole()
        const originalRole = getOriginalRoleName()
        setUserRole(role)
        setOriginalRoleName(originalRole)

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
      const newRole = getUserRole()
      const newOriginalRole = getOriginalRoleName()
      setUserRole(newRole)
      setOriginalRoleName(newOriginalRole)

      const { valid, user } = getCurrentUser()
      if (valid && user) {
        setUserData(user)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [router])

  // Admin-only dashboard stats. Both reads are independent (RQ fires them in
  // parallel, unlike the old sequential `await` pair) and share their cache
  // with the rest of the app: the courses summary rides the same
  // ['courseStructures','summary'] key as the coursestructure page,
  // servicemapping wizard, and grades — a repeat Profile visit within the
  // staleTime window paints instantly instead of re-fetching.
  const isAdminRole = userRole === 'admin'
  const usersQuery = useProfileUserStatsQuery(isAdminRole ? (userData?.institution as any) : null)
  const coursesQuery = useQuery({
    ...courseStructuresSummaryQuery(),
    enabled: isAdminRole && !!userData?.institution,
  })

  // ── Student performance ───────────────────────────────────────────────────
  // Same four reads the student dashboard makes, in the same order, off the
  // same cache keys — so opening Profile after the dashboard costs nothing and
  // the two surfaces always show identical figures.
  //
  // Gated on the role the way the admin block above is: every one of these
  // queries is `enabled: !!userId`, so passing null for staff/admin keeps them
  // from ever firing. The hooks themselves stay unconditional, which is what
  // the rules of hooks require — only their inputs change.
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

  // Stable for the life of the page — recomputing per render would mint a new
  // query key every time.
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

  // Attendance and study time fill in after; only the analytics read gates the
  // panel, exactly as on the dashboard.
  const perfLoading = isStudentRole && (meLoading || (!!perfStudentId && perfAnalyticsLoading))

  const dashboardStats: DashboardStats | null = (() => {
    if (!isAdminRole || !usersQuery.data || !coursesQuery.data) return null
    // The user figures are counted in Mongo now (`?stats=1`) instead of by
    // walking the whole roster here — see queries/profileStats.ts. The bucket
    // rules, the raw-status test for activeUsers and the 30-day window are all
    // ports of the loop that used to live here, checked against it over live
    // data: identical on all six numbers.
    const userStats = usersQuery.data
    const allCourses = coursesQuery.data as any[]

    const activeCourses = allCourses.filter((c: any) => c.status === 'active').length
    const inactiveCourses = allCourses.filter((c: any) => c.status === 'inactive').length

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const newCourses = allCourses.filter((c: any) => new Date(c.createdAt) >= thirtyDaysAgo).length

    return {
      users: {
        total: userStats.total,
        students: userStats.students,
        staff: userStats.staff,
        admin: userStats.admin
      },
      courses: {
        total: allCourses.length,
        active: activeCourses,
        inactive: inactiveCourses
      },
      recentActivities: {
        newUsers: userStats.newUsers,
        newCourses,
        activeUsers: userStats.activeUsers
      },
      institution: String(userData?.institution || '')
    }
  })()

  // Preserves the page's original behavior: for admin users the full-page
  // spinner used to block until both stats calls resolved (they were
  // sequential `await`s in the old code). Cold loads still block the same
  // way; a repeat visit within the queries' staleTime has cached data
  // already, so isLoading is false immediately and the block disappears —
  // that's the actual win here, not a change to what's shown.
  const loading = userDataLoading || (isAdminRole && (usersQuery.isLoading || coursesQuery.isLoading))

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  // Companion to `fmt` for the activity rail, which shows "Aug 23, 2026 · 10:30 AM".
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })

  const navigateToDashboard = () => {
    switch(userRole) {
      case 'admin':
        router.push("/lms/pages/admindashboard")
        break
      case 'student':
        router.push("/lms/pages/studentdashboard")
        break
      case 'staff':
        router.push("/lms/pages/dashboard")
        break
      default:
        router.push("/login")
    }
  }

  const getStats = () => {
    if (userRole === 'student') {
      // The dashboard's model is the source of truth for anything progress-
      // shaped. `calcProgress` below only ever looked at We Do assignments on
      // the cached user record, so a learner who had opened resources and sat
      // assessments still read 0% here while the dashboard read 15% — the two
      // surfaces contradicted each other on the same screen. It stays as the
      // fallback for the moment before analytics resolve, and the completed
      // threshold follows the dashboard's rule (100) rather than 90.
      const completed = performance
        ? performance.completed
        : userData?.courses?.filter(c => calcProgress(c) >= 90).length || 0
      const active = performance
        ? performance.inProgress
        : userData?.courses?.filter(c => {
            const p = calcProgress(c)
            return p > 0 && p < 90
          }).length || 0
      const overall = performance
        ? performance.overallProgress
        : userData?.courses?.length
          ? Math.round(userData.courses.reduce((s, c) => s + calcProgress(c), 0) / userData.courses.length)
          : 0
      return { 
        totalCourses: performance ? performance.activeCourses : (userData?.courses?.length || 0),
        completed, 
        active, 
        overall,
        totalNotes: userData?.notes?.length || 0,
        totalNotifications: userData?.notifications?.length || 0,
        unread: userData?.notifications?.filter(n => !n.isRead).length || 0, 
        totalPermissions: 0, 
        totalAssignments: 0, 
        totalEvaluations: 0, 
        totalEnrollments: 0 
      }
    }
    
    if (userRole === 'admin' && dashboardStats) {
      return {
        totalCourses: dashboardStats.courses.total,
        totalAssignments: 0,
        totalEvaluations: 0,
        totalEnrollments: 0,
        totalNotes: userData?.notes?.length || 0,
        totalPermissions: userData?.permissions?.length || 0,
        totalNotifications: userData?.notifications?.length || 0,
        unread: userData?.notifications?.filter(n => !n.isRead).length || 0,
        completed: 0,
        active: 0,
        overall: 0,
        totalUsers: dashboardStats.users.total,
        totalStudents: dashboardStats.users.students,
        totalStaff: dashboardStats.users.staff,
        activeCourses: dashboardStats.courses.active,
        inactiveCourses: dashboardStats.courses.inactive,
        newUsers: dashboardStats.recentActivities.newUsers,
        newCourses: dashboardStats.recentActivities.newCourses,
        activeUsers: dashboardStats.recentActivities.activeUsers
      }
    }
    
    return {
      totalCourses: userData?.courses?.length || 0,
      totalAssignments: userData?.courses?.reduce((s, c) => s + (c.answers?.We_Do?.assignments || []).length, 0) || 0,
      totalEvaluations: userData?.notifications?.filter(n => n.title === "Evaluation Completed").length || 0,
      totalEnrollments: userData?.notifications?.filter(n => n.title === "New Course Enrollment").length || 0,
      totalNotes: userData?.notes?.length || 0, 
      totalPermissions: userData?.permissions?.length || 0,
      totalNotifications: userData?.notifications?.length || 0,
      unread: userData?.notifications?.filter(n => !n.isRead).length || 0, 
      completed: 0, 
      active: 0, 
      overall: 0
    }
  }

  const stats = getStats()

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
          <button
            onClick={() => router.push("/login")}
            className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-control bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Go to sign in
          </button>
        </div>
      </div>
    )
  }

  const getLayout = () => {
    switch(userRole) {
      case 'admin':
        return DashboardLayout
      case 'student':
        return StudentLayout
      case 'staff':
        return StaffLayout
      default:
        return StaffLayout
    }
  }

  const Layout = getLayout()

  const getDisplayRoleName = () => {
    if (userRole === 'admin') {
      // Check if it's a specific admin sub-role
      const originalRole = originalRoleName.toLowerCase()
      if (originalRole === 'ldhead') return 'LD Head'
      if (originalRole === 'subhead') return 'Sub Head'
      if (originalRole === 'programcoordinator') return 'Program Coordinator'
      return 'Administrator'
    }
    if (userRole === 'student') return 'Student'
    // A trainer's role may carry the institution's own name for it.
    return userData.role?.renameRole || cap(originalRoleName)
  }

  const roleName = getDisplayRoleName()
  const isStaffOrAdmin = userRole === 'staff' || userRole === 'admin'

  // ── Headline figures ──────────────────────────────────────────────────────
  // Staff read the trainer dashboard's own figures (TrainerHeadlineStats).
  const getStatCards = (): StatItem[] => {
    if (userRole === 'student') {
      return [
        { label: 'Enrolled courses', value: stats.totalCourses, sub: 'active enrolments' },
        { label: 'Completed', value: stats.completed, sub: 'courses finished' },
        { label: 'In progress', value: stats.active, sub: 'courses under way' },
        { label: 'Overall progress', value: `${stats.overall}%`, sub: 'across all courses' },
      ]
    }

    if (userRole === 'admin' && dashboardStats) {
      return [
        { label: 'Total users', value: stats.totalUsers ?? 0, sub: 'registered' },
        { label: 'Students', value: stats.totalStudents ?? 0, sub: 'enrolled' },
        { label: 'Faculty & staff', value: stats.totalStaff ?? 0, sub: 'members' },
        // Course records carry no status of their own, so an "N active"
        // split would always read 0 — the plain total is the honest figure.
        { label: 'Courses', value: stats.totalCourses, sub: 'in your institution' },
      ]
    }

    return [
      { label: 'Courses', value: stats.totalCourses, sub: 'total' },
      { label: 'Assignments', value: stats.totalAssignments, sub: 'total' },
      { label: 'Evaluations', value: stats.totalEvaluations, sub: 'completed' },
      { label: 'Enrolments', value: stats.totalEnrollments, sub: 'students' },
    ]
  }

  // Admin only: the last-30-days figures, as plain counts.
  const secondaryStats: StatItem[] = userRole === 'admin' && dashboardStats
    ? [
        { label: 'Active users', value: stats.activeUsers ?? 0, sub: `of ${stats.totalUsers ?? 0} registered` },
        { label: 'New users', value: stats.newUsers ?? 0, sub: 'in the last 30 days' },
        { label: 'New courses', value: stats.newCourses ?? 0, sub: 'in the last 30 days' },
      ]
    : []

  const permissions: any[] = (userData.permissions || []).slice()
    .sort((a: any, b: any) => Number(!!b?.isActive) - Number(!!a?.isActive))
  const activePermissionCount = permissions.filter((p) => p?.isActive).length

  const notifications: any[] = (userData.notifications || []).slice()
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const tabs: { id: string; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    // Students only: their own performance, read from the dashboard's metrics.
    // Staff and admin have no learner record to summarise here.
    ...(isStudentRole ? [{ id: "performance", label: "Performance" }] : []),
    { id: "notes", label: "Notes", badge: stats.totalNotes },
    { id: "notifications", label: "Notifications", badge: stats.unread },
    ...(isStaffOrAdmin ? [{ id: "permissions", label: "Permissions", badge: activePermissionCount }] : []),
  ]

  // ── Overview fields ───────────────────────────────────────────────────────
  // `createdBy` is free text — a name or an email. An id says nothing to the
  // person reading their own profile, so it is left out.
  const createdBy = userData.createdBy && !/^[a-f0-9]{24}$/i.test(userData.createdBy) ? userData.createdBy : ''
  const personalFields: DetailItem[] = [
    { label: 'Full name', value: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() },
    { label: 'Email', value: userData.email },
    { label: 'Phone', value: userData.phone },
    { label: 'Gender', value: cap(userData.gender) },
    { label: 'Account created', value: userData.createdAt ? fmt(userData.createdAt) : '' },
    { label: 'Last updated', value: userData.updatedAt ? `${fmt(userData.updatedAt)}, ${fmtTime(userData.updatedAt)}` : '' },
    ...(createdBy ? [{ label: 'Created by', value: createdBy }] : []),
  ]

  const workTitle = userRole === 'student' ? 'Academic details' : 'Professional details'
  const workFields: DetailItem[] = userRole === 'student'
    ? [
        { label: 'Degree', value: userData.degree },
        { label: 'Department', value: userData.department },
        { label: 'Year', value: userData.year },
        { label: 'Semester', value: userData.semester },
        { label: 'Batch', value: userData.batch },
        { label: 'Enrolled courses', value: String(stats.totalCourses) },
      ]
    : [
        { label: 'Role', value: roleName },
        { label: 'Department', value: userData.department },
        { label: 'Degree', value: userData.degree },
        { label: 'Permissions', value: `${activePermissionCount} active` },
      ]

  const content = (
    <div className="min-h-full bg-surface">
      <div className="mx-auto max-w-[1200px] space-y-4 px-3 py-3 sm:px-6 sm:py-5">

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
          <button onClick={navigateToDashboard} className="inline-flex items-center gap-1.5 text-subtle transition-colors hover:text-heading">
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-subtle/60" />
          <span className="font-medium text-heading" aria-current="page">Profile</span>
        </nav>

        {/* ── Identity + headline figures ────────────────────────────────── */}
        <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <Avatar user={userData} className="h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-heading">
                  {userData.firstName} {userData.lastName}
                </h1>
                <StatusBadge status={userData.status} />
              </div>
              <p className="mt-0.5 text-sm text-subtle">
                {[roleName, userData.department].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-body">
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0 text-subtle" />
                  <span className="truncate">{userData.email}</span>
                </span>
                {userData.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0 text-subtle" />
                    {userData.phone}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex h-9 flex-shrink-0 items-center justify-center gap-1.5 rounded-control border border-hairline-strong bg-surface px-3.5 text-[13px] font-medium text-heading shadow-xs transition-colors hover:bg-row-hover sm:self-start"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </button>
          </div>

          <div className="border-t border-hairline">
            {userRole === 'staff' ? <TrainerHeadlineStats user={userData} /> : <StatStrip items={getStatCards()} />}
          </div>
          {secondaryStats.length > 0 && (
            <div className="border-t border-hairline">
              <StatStrip items={secondaryStats} />
            </div>
          )}
        </section>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        {/* Scrolls sideways on narrow screens with the bar hidden. */}
        <div className="border-b border-hairline">
          <div role="tablist" className="-mb-px flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] transition-colors duration-150',
                    active
                      ? 'border-brand font-semibold text-heading'
                      : 'border-transparent font-medium text-subtle hover:text-heading'
                  )}
                >
                  {tab.label}
                  {!!tab.badge && tab.badge > 0 && (
                    <span className="rounded-full bg-surface-sunken px-1.5 py-px text-[11px] font-medium tabular-nums text-body ring-1 ring-hairline">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Tab panel ──────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="min-w-0 space-y-4"
          >

            {activeTab === 'overview' && (
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <Panel title="Personal details">
                  <DetailList items={personalFields} />
                </Panel>
                <Panel title={workTitle}>
                  <DetailList items={workFields} />
                </Panel>
              </div>
            )}

            {activeTab === 'notes' && (
              <Panel
                title="Notes"
                description={stats.totalNotes > 0
                  ? `${stats.totalNotes} ${stats.totalNotes === 1 ? 'note' : 'notes'} · ${userData.notes?.filter((n) => n.isPinned).length || 0} pinned`
                  : undefined}
              >
                {userData.notes?.length > 0 ? (
                  <div className="grid gap-3 py-1 sm:grid-cols-2">
                    {userData.notes
                      .slice()
                      .sort((a: any, b: any) => Number(!!b.isPinned) - Number(!!a.isPinned))
                      .map((note, i) => (
                        <article key={note._id || i} className="min-w-0 rounded-lg border border-hairline bg-surface p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-heading">
                              {note.isPinned && <Pin className="h-3.5 w-3.5 flex-shrink-0 text-subtle" aria-label="Pinned" />}
                              <span className="truncate">{note.title || 'Untitled note'}</span>
                            </h3>
                            {note.lastEdited && <span className="flex-shrink-0 text-xs text-subtle">{fmt(note.lastEdited)}</span>}
                          </div>
                          <div
                            className="mt-1.5 line-clamp-3 break-words text-[13px] leading-relaxed text-body"
                            dangerouslySetInnerHTML={{ __html: note.content }}
                          />
                          {note.tags?.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {note.tags.slice(0, 4).map((tag: string, ti: number) => (
                                <Chip key={ti}>#{tag}</Chip>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                  </div>
                ) : (
                  <EmptyBlock icon={FileText} title="No notes yet" text="Notes you save appear here." />
                )}
              </Panel>
            )}

            {activeTab === 'notifications' && (
              <Panel
                title="Notifications"
                description={notifications.length > 0
                  ? `${notifications.length} total · ${stats.unread || 0} unread`
                  : undefined}
                action={
                  <button
                    onClick={() => router.push('/lms/pages/notifications')}
                    className="flex-shrink-0 text-[13px] font-medium text-brand-strong hover:underline"
                  >
                    View all
                  </button>
                }
              >
                {notifications.length > 0 ? (
                  <ul className="divide-y divide-hairline">
                    {notifications.slice(0, 10).map((n, i) => (
                      <li key={n._id || i} className="flex items-start gap-3 py-3">
                        <span
                          className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', n.isRead ? 'bg-transparent' : 'bg-brand')}
                          aria-label={n.isRead ? undefined : 'Unread'}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <p className={cn('min-w-0 break-words text-[13px] text-heading', !n.isRead && 'font-semibold')}>
                              {n.title || 'Notification'}
                            </p>
                            {n.createdAt && (
                              <time className="flex-shrink-0 text-xs text-subtle">{fmt(n.createdAt)}, {fmtTime(n.createdAt)}</time>
                            )}
                          </div>
                          {n.message && <p className="mt-0.5 break-words text-[13px] text-body">{n.message}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyBlock icon={Bell} title="No notifications" text="Updates about your courses and account appear here." />
                )}
              </Panel>
            )}

            {activeTab === 'permissions' && isStaffOrAdmin && (
              <Panel
                title="Permissions"
                description={permissions.length > 0
                  ? `${activePermissionCount} of ${permissions.length} active · assigned by your administrator`
                  : undefined}
              >
                {permissions.length > 0 ? (
                  <ul className="divide-y divide-hairline">
                    {permissions.map((p, i) => (
                      <li key={p._id || p.permissionKey || i} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="break-words text-[13px] font-medium text-heading">{p.permissionName}</p>
                          {p.description && <p className="mt-0.5 break-words text-xs text-subtle">{p.description}</p>}
                        </div>
                        <Chip tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Active' : 'Inactive'}</Chip>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyBlock icon={Shield} title="No permissions assigned" text="Your administrator assigns permissions from User Management." />
                )}
              </Panel>
            )}

            {activeTab === 'performance' && isStudentRole && (
              <>
                {perfLoading && (
                  <Panel title="Overall performance">
                    <div className="flex justify-center py-10"><Loading size="size-8" /></div>
                  </Panel>
                )}

                {!perfLoading && (!performance || performance.courses.length === 0) && (
                  <Panel title="Overall performance">
                    <EmptyBlock icon={TrendingUp} title="No enrolled courses yet" text="Your performance appears here once you start learning." />
                  </Panel>
                )}

                {!perfLoading && performance && performance.courses.length > 0 && (
                  <>
                    {/* ── Headline: the four numbers the dashboard leads with ── */}
                    <Panel
                      title="Overall performance"
                      action={
                        <button
                          onClick={() => router.push('/lms/pages/studentdashboard')}
                          className="flex-shrink-0 text-[13px] font-medium text-brand-strong hover:underline"
                        >
                          Open dashboard
                        </button>
                      }
                    >
                      <div className="grid gap-3 py-1 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricTile
                          icon={TrendingUp} label="Overall progress"
                          value={`${performance.overallProgress}%`}
                          sub={`${performance.activeCourses} active · ${performance.completed} completed`}
                          pct={performance.overallProgress}
                        />
                        <MetricTile
                          icon={Award} label="Grade"
                          value={performance.scorePct === null ? '—' : performance.grade.letter}
                          sub={performance.scorePct === null ? 'Nothing graded yet' : `${performance.scorePct}% · ${performance.grade.caption}`}
                          pct={performance.scorePct}
                        />
                        <MetricTile
                          icon={CheckCircle} label="Attendance"
                          value={performance.attendance.pct === null ? '—' : `${performance.attendance.pct}%`}
                          sub={performance.attendance.hasData
                            ? `${performance.attendance.present} present of ${performance.attendance.totalDays} days`
                            : 'Not marked yet'}
                          pct={performance.attendance.pct}
                        />
                        <MetricTile
                          icon={Clock} label="Study time"
                          value={performance.time.tracked ? shortDuration(performance.time.totalSeconds) : '—'}
                          sub={performance.time.tracked
                            ? `${shortDuration(performance.time.exerciseSeconds)} on exercises`
                            : 'No measured sessions yet'}
                          pct={null}
                        />
                      </div>
                    </Panel>

                    {/* ── Stage breakdown: the Learn → Practice → Assess pipeline ── */}
                    <Panel title="Learning journey" description="I Do → We Do → You Do">
                      <div className="space-y-3 py-1">
                        <StageRow
                          title="I Do · Learning resources"
                          hasContent={performance.totals.learn.hasContent}
                          pct={performance.totals.learn.completionPct}
                          meterLabel="opened"
                          cells={[
                            { label: 'Resources', value: `${performance.totals.learn.opened}/${performance.totals.learn.total}`, sub: 'opened' },
                            { label: 'Checkpoints', value: `${performance.totals.learn.mcqCompleted}/${performance.totals.learn.mcqDocs}`, sub: 'completed' },
                            { label: 'Content', value: `${Math.round(performance.totals.learn.completedMinutes)}/${performance.totals.learn.contentMinutes}`, sub: 'minutes' },
                            { label: 'Done', value: `${performance.totals.learn.completionPct}%`, sub: 'of resources' },
                          ]}
                        />
                        <StageRow
                          title="We Do · Assignments"
                          hasContent={performance.totals.practice.hasContent}
                          pct={performance.totals.practice.completionPct}
                          meterLabel="started"
                          cells={stageCells(performance.totals.practice)}
                        />
                        <StageRow
                          title="You Do · Assessments"
                          hasContent={performance.totals.assess.hasContent}
                          pct={performance.totals.assess.completionPct}
                          meterLabel="started"
                          cells={stageCells(performance.totals.assess)}
                        />
                      </div>
                    </Panel>

                    {/* ── Per course: where the blended figure above comes from ── */}
                    <Panel title="Course progress">
                      <div className="divide-y divide-hairline">
                        {performance.courses.map((c, i) => (
                          <CourseProgressRow key={c.id || i} course={c} />
                        ))}
                      </div>
                    </Panel>

                    {/* ── Momentum ── */}
                    <Panel title="Momentum">
                      <div className="grid gap-3 py-1 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricTile
                          icon={Flame} label="Current streak"
                          value={`${performance.momentum.streak}`}
                          sub={performance.momentum.streak === 1 ? 'day in a row' : 'days in a row'}
                          pct={null}
                        />
                        <MetricTile
                          icon={Activity} label="Active days"
                          value={`${performance.momentum.activeDays30}`} sub="in the last 30 days" pct={null}
                        />
                        <MetricTile
                          icon={CheckCircle} label="Solved this month"
                          value={`${performance.solvedThisMonth}`}
                          sub={performance.monthDeltaPct === null
                            ? 'no earlier baseline'
                            : `${performance.monthDeltaPct >= 0 ? '+' : ''}${performance.monthDeltaPct}% vs previous 30 days`}
                          pct={null}
                        />
                        <MetricTile
                          icon={Calendar} label="Due this week"
                          value={`${performance.pendingThisWeek}`} sub="pending deadlines" pct={null}
                        />
                      </div>
                    </Panel>

                    {/* ── Insights: the dashboard's own read of these numbers ── */}
                    {performance.insights.length > 0 && (
                      <Panel title="Insights">
                        <ul className="divide-y divide-hairline">
                          {performance.insights.map((ins, i) => (
                            <li key={i} className="flex items-start gap-2.5 py-2.5">
                              <span
                                className={cn(
                                  'mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full',
                                  ins.tone === 'good' ? 'bg-emerald-500' : ins.tone === 'warn' ? 'bg-amber-500' : 'bg-slate-400'
                                )}
                              />
                              <p className="text-[13px] leading-relaxed text-body">{ins.text}</p>
                            </li>
                          ))}
                        </ul>
                      </Panel>
                    )}
                  </>
                )}
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Self-service editor — photo and password only. Everything else on this
          page is owned by User Management. */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={userData}
        onUpdated={(patch) => {
          // Reflect the new photo immediately, and persist it to the same
          // localStorage record the whole app reads its identity from —
          // otherwise the sidebar avatar would stay stale until re-login.
          setUserData((prev) => {
            if (!prev) return prev
            const merged = {
              ...prev,
              ...(patch.profile ? { profile: patch.profile } : {}),
              ...(patch.updatedAt ? { updatedAt: patch.updatedAt } : {}),
            }
            try { localStorage.setItem(USER_DATA_KEY, JSON.stringify(merged)) } catch { /* quota / private mode */ }
            return merged
          })
        }}
      />
    </div>
  )

  return <Layout>{content}</Layout>
}

// ─── Presentational pieces ────────────────────────────────────────────────────

const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

type StatItem = { label: string; value: React.ReactNode; sub?: string }
type DetailItem = { label: string; value?: string }

/** The profile photo, or the person's initials on a neutral disc. */
function Avatar({ user, className }: { user: UserData; className?: string }) {
  const hasPhoto = !!user.profile && user.profile !== 'default'
  return (
    <div className={cn('grid flex-shrink-0 place-items-center overflow-hidden rounded-full bg-surface-sunken font-semibold text-body ring-1 ring-hairline', className)}>
      {hasPhoto ? (
        <Image src={user.profile} alt={`${user.firstName} ${user.lastName}`} width={112} height={112} className="h-full w-full object-cover" />
      ) : (
        <span>{user.firstName?.[0]?.toUpperCase()}{user.lastName?.[0]?.toUpperCase()}</span>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const s = status.toLowerCase()
  const cls = s === 'active'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30'
    : s === 'pending'
      ? 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/30'
      : 'bg-surface-sunken text-body ring-hairline'
  const dot = s === 'active' ? 'bg-emerald-500' : s === 'pending' ? 'bg-amber-500' : 'bg-gray-400'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', cls)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {cap(status)}
    </span>
  )
}

function Chip({ tone = 'neutral', children }: { tone?: 'neutral' | 'success'; children: React.ReactNode }) {
  return (
    <span className={cn(
      'inline-flex flex-shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
      tone === 'success'
        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30'
        : 'bg-surface-sunken text-body ring-hairline'
    )}>
      {children}
    </span>
  )
}

/** A row of headline figures in one bordered strip, split by hairlines. */
function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div className={cn(
      'grid gap-px bg-hairline',
      items.length % 2 ? 'grid-cols-1' : 'grid-cols-2',
      items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'
    )}>
      {items.map((s) => (
        <div key={s.label} className="min-w-0 bg-surface px-4 py-3 sm:px-5">
          <p className="truncate text-xs font-medium text-subtle">{s.label}</p>
          <p className="mt-1 truncate text-xl font-semibold leading-tight tabular-nums text-heading">{s.value}</p>
          {s.sub && <p className="mt-0.5 truncate text-xs text-subtle">{s.sub}</p>}
        </div>
      ))}
    </div>
  )
}

/** A content card: title, optional one-line description and a right-aligned
 *  action, over its body. Every tab is built from these so the page reads as
 *  one surface. */
function Panel({
  title, description, action, children,
}: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-hairline bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-heading">{title}</h2>
          {description && <p className="mt-0.5 truncate text-xs text-subtle">{description}</p>}
        </div>
        {action}
      </header>
      <div className="px-4 py-2 sm:px-5">{children}</div>
    </section>
  )
}

/** Label / value rows. A missing value reads "Not provided" rather than a dash. */
function DetailList({ items }: { items: DetailItem[] }) {
  return (
    <dl className="divide-y divide-hairline">
      {items.map((it) => (
        <div key={it.label} className="grid gap-0.5 py-2.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
          <dt className="text-[13px] text-subtle">{it.label}</dt>
          <dd className="min-w-0 break-words text-[13px] font-medium text-heading">
            {it.value || <span className="font-normal text-faint">Not provided</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A thin progress bar: slate while under way, green once complete. */
function Meter({ pct, className }: { pct: number; className?: string }) {
  const w = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div
      className={cn('h-1.5 overflow-hidden rounded-full bg-hairline', className)}
      role="progressbar" aria-valuenow={w} aria-valuemin={0} aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', w >= 100 ? 'bg-emerald-500' : 'bg-slate-600 dark:bg-slate-400')}
        style={{ width: `${w}%` }}
      />
    </div>
  )
}

/** The four cells every graded stage (We Do / You Do) reports. Shared so the
 *  two rows can never fall out of step with each other. */
function stageCells(s: StageStats) {
  return [
    { label: 'Exercises', value: `${s.submitted}/${s.assigned}`, sub: 'submitted' },
    { label: 'Questions', value: `${s.questionsSolved}/${s.questionsTotal}`, sub: 'solved' },
    { label: 'Attempted', value: `${s.questionsAttempted}/${s.questionsTotal}`, sub: 'questions tried' },
    {
      label: 'Score',
      value: s.scorePct === null ? '—' : `${s.scorePct}%`,
      sub: s.scorePct === null ? 'not graded yet' : `${s.scoreObtained}/${s.scoreMax} marks`,
    },
  ]
}

/** A headline number with its own meter. `pct` null → no meter (the metric has
 *  no 0-100 scale, or nothing has been recorded to place it on one yet). */
function MetricTile({
  icon: Icon, label, value, sub, pct,
}: { icon: any; label: string; value: string; sub: string; pct: number | null }) {
  return (
    <div className="min-w-0 rounded-lg border border-hairline bg-surface p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-subtle">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1.5 text-xl font-semibold leading-tight tabular-nums text-heading">{value}</p>
      <p className="mt-0.5 truncate text-xs text-subtle">{sub}</p>
      {pct !== null && <Meter pct={pct} className="mt-2.5" />}
    </div>
  )
}

/** One stage of the Learn → Practice → Assess pipeline: a titled header with
 *  its completion meter, over a four-cell figure strip. */
function StageRow({
  title, hasContent, pct, meterLabel, cells,
}: {
  title: string; hasContent: boolean; pct: number
  /** What the header meter is a percentage OF — without it "20%" next to an
   *  "Exercises 3/15" cell reads as though it were the question figure. */
  meterLabel: string
  cells: { label: string; value: string; sub: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline">
      <div className="flex flex-col items-start gap-1.5 border-b border-hairline bg-surface-sunken/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h3 className="min-w-0 max-w-full truncate text-[13px] font-semibold text-heading">{title}</h3>
        {hasContent ? (
          <div className="flex flex-shrink-0 items-center gap-2">
            <Meter pct={pct} className="w-24" />
            <span className="text-xs font-semibold tabular-nums text-heading">{pct}%</span>
            <span className="text-xs text-subtle">{meterLabel}</span>
          </div>
        ) : (
          <span className="flex-shrink-0 text-xs text-subtle">Nothing configured</span>
        )}
      </div>
      {hasContent && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-4">
          {cells.map((c) => (
            <div key={c.label} className="min-w-0">
              <p className="text-xs text-subtle">{c.label}</p>
              <p className="mt-0.5 text-base font-semibold leading-tight tabular-nums text-heading">{c.value}</p>
              <p className="text-xs text-subtle">{c.sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** One course in the Performance tab's Course progress list.
 *
 *  Driven by the dashboard's CourseModel, not by the cached user record, so
 *  the figure here is the same blend the dashboard shows.
 */
function CourseProgressRow({ course }: { course: CourseModel }) {
  const p = Math.max(0, Math.min(100, Math.round(course.progress)))
  const done = p >= 100
  const started = p > 0 || course.hasActivity

  // Only the stages this course actually configured.
  const stages = [
    { label: 'I Do', on: course.learn.hasContent, pct: course.learn.completionPct, detail: `${course.learn.opened}/${course.learn.total}` },
    { label: 'We Do', on: course.practice.hasContent, pct: course.practice.completionPct, detail: `${course.practice.started}/${course.practice.assigned}` },
    { label: 'You Do', on: course.assess.hasContent, pct: course.assess.completionPct, detail: `${course.assess.started}/${course.assess.assigned}` },
  ].filter((s) => s.on)

  const lastSeen = course.lastAccessed
    ? course.lastAccessed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Never'

  return (
    <div className="py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-heading">{course.name}</p>
          {(course.code || course.level) && (
            <p className="mt-0.5 truncate text-xs text-subtle">
              {[course.code, course.level].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Chip tone={done ? 'success' : 'neutral'}>{done ? 'Completed' : started ? 'In progress' : 'Not started'}</Chip>
          <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-heading">{p}%</span>
        </div>
      </div>

      <Meter pct={p} className="mt-2.5" />

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-subtle">
        {stages.map((s) => (
          <span key={s.label}>
            {s.label} <span className="font-medium tabular-nums text-body">{s.pct}%</span> ({s.detail})
          </span>
        ))}
        <span>Last opened {lastSeen}</span>
        {course.scorePct !== null && <span>Score <span className="font-medium tabular-nums text-body">{course.scorePct}%</span></span>}
      </div>
    </div>
  )
}

function EmptyBlock({ icon: Icon, title, text }: { icon: any; title: string; text?: string }) {
  return (
    <div className="py-10 text-center">
      <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-surface-sunken ring-1 ring-hairline">
        <Icon className="h-[18px] w-[18px] text-subtle" />
      </span>
      <p className="text-sm font-medium text-heading">{title}</p>
      {text && <p className="mt-1 text-xs text-subtle">{text}</p>}
    </div>
  )
}
