"use client"
import { useState, useEffect, useRef } from "react"
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "react-toastify"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Check, X, Save, Loader2, Users, Search, ChevronDown, UserCheck,
  UserX, ShieldCheck, Home, BookOpen, Settings2, Bell, GraduationCap,
  MessageCircleQuestion, Filter, RotateCcw, Layers, Zap, Tag,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Functionality { id: string; label: string; description: string }

interface PermissionItem {
  id: string; key: string; name: string; icon: string; color: string
  description: string; categories?: string[]; functionalities: Functionality[]
}

interface User {
  id: string; firstName: string; lastName: string; email: string
  role: string; roleId: string; degree?: string; department?: string
  year?: string; batch?: string; semester?: string
  status: "active" | "inactive"; gender?: string
}

interface Role { _id: string; renameRole: string; originalRole: string }

interface BulkPermissionModalProps {
  isOpen: boolean; onClose: () => void; availableUsers: User[]
  roles: Role[]; basedOn: string | null; preSelectedUser?: User | null
}

// ─── Permission Data ───────────────────────────────────────────────────────────

const PERMISSION_DATA: PermissionItem[] = [
  { id: "admindashboard", key: "admindashboard", name: "Admin Dashboard", icon: "Home", color: "indigo", categories: ["admin"], description: "Dashboard overview & stats",
    functionalities: [{ id: "view_users", label: "View Users", description: "View user list" }, { id: "add_users", label: "Add Users", description: "Create new accounts" }, { id: "edit_users", label: "Edit Users", description: "Modify user info" }, { id: "delete_users", label: "Delete Users", description: "Remove accounts" }] },
  { id: "admin-usermanagement", key: "usermanagement", name: "User Management", icon: "Users", color: "blue", categories: ["admin"], description: "Manage users & access",
    functionalities: [{ id: "Add User", label: "Add User", description: "Create accounts" }, { id: "View Full Details", label: "View Details", description: "View full info" }, { id: "Bulk Upload", label: "Bulk Upload", description: "Upload multiple users" }, { id: "Bulk Permission", label: "Bulk Permission", description: "Mass permission set" }, { id: "Edit", label: "Edit", description: "Modify user" }, { id: "Permissions", label: "Permissions", description: "User permissions" }, { id: "Delete", label: "Delete", description: "Remove user" }, { id: "Toggle User Status", label: "Toggle Status", description: "Active/inactive" }] },
  { id: "admin-coursemanagement", key: "coursestructure", name: "Course Management", icon: "BookOpen", color: "emerald", categories: ["admin"], description: "Courses & curriculum",
    functionalities: [{ id: "Add Course Structure", label: "Add Structure", description: "Course structure" }, { id: "View Full Details", label: "View Details", description: "Course catalog" }, { id: "Add Course", label: "Add Course", description: "New courses" }, { id: "Add Participants", label: "Participants", description: "Add members" }, { id: "Upload Resourses", label: "Upload Resources", description: "Course files" }, { id: "Edit Course", label: "Edit Course", description: "Edit existing" }, { id: "Delete Course", label: "Delete Course", description: "Remove course" }, { id: "Dublicate", label: "Duplicate", description: "Copy course" }] },
  { id: "admin-notification", key: "notifications", name: "Notifications", icon: "Bell", color: "amber", categories: ["admin"], description: "System notifications",
    functionalities: [{ id: "view_notifications", label: "View", description: "View notifications" }, { id: "edit_notifications", label: "Edit", description: "Modify notifications" }] },
  { id: "admin-dynamic-field-settings", key: "dynamicfieldsettings", name: "Dynamic Fields", icon: "Settings2", color: "slate", categories: ["admin"], description: "Field configuration",
    functionalities: [{ id: "Service Modal", label: "Service Modal", description: "Service config" }, { id: "Course Category", label: "Course Category", description: "Categories" }, { id: "Pedagogy", label: "Pedagogy", description: "Teaching methods" }, { id: "Client Modal", label: "Client Modal", description: "Client settings" }, { id: "Question Bank", label: "Question Bank", description: "Question config" }] },
  { id: "admin-question-banks", key: "questionbanks", name: "Question Banks", icon: "MessageCircleQuestion", color: "slate", categories: ["admin"], description: "Manage question banks", functionalities: [] },
  { id: "admin-grades", key: "grades", name: "Grades", icon: "GraduationCap", color: "emerald", categories: ["admin"], description: "Grade management", functionalities: [] },
  { id: "admin-profile", key: "profile", name: "Profiles", icon: "GraduationCap", color: "emerald", categories: ["admin"], description: "Profile management", functionalities: [] },
  { id: "staffdashboard", key: "dashboard", name: "Staff Dashboard", icon: "Home", color: "indigo", categories: ["staff"], description: "Staff overview",
    functionalities: [{ id: "view_users", label: "View Users", description: "View list" }, { id: "add_users", label: "Add Users", description: "Create accounts" }, { id: "edit_users", label: "Edit Users", description: "Modify info" }, { id: "delete_users", label: "Delete Users", description: "Remove accounts" }] },
  { id: "staff-usermanagement", key: "usermanagement", name: "User Management", icon: "Users", color: "blue", categories: ["staff"], description: "Staff user tools",
    functionalities: [{ id: "Add User", label: "Add User", description: "Create accounts" }, { id: "View Full Details", label: "View Details", description: "Full info" }, { id: "Bulk Upload", label: "Bulk Upload", description: "Mass upload" }, { id: "Bulk Permission", label: "Bulk Permission", description: "Mass permissions" }, { id: "Edit", label: "Edit", description: "Modify" }, { id: "Permissions", label: "Permissions", description: "Permissions" }, { id: "Delete", label: "Delete", description: "Delete" }, { id: "Toggle User Status", label: "Toggle Status", description: "Active/inactive" }] },
  { id: "staff-courses", key: "courses", name: "Courses", icon: "BookOpen", color: "emerald", categories: ["staff"], description: "Staff course access",
    functionalities: [{ id: "enroll_courses", label: "Enroll", description: "Enroll in courses" }, { id: "access_materials", label: "Materials", description: "Access content" }, { id: "view_schedule", label: "Schedule", description: "View timetable" }] },
  { id: "staff-notification", key: "notifications", name: "Notifications", icon: "Bell", color: "amber", categories: ["staff"], description: "Staff notifications",
    functionalities: [{ id: "view_notifications", label: "View", description: "View" }, { id: "edit_notifications", label: "Edit", description: "Edit" }] },
  { id: "staff-question-banks", key: "questionbanks", name: "Question Banks", icon: "MessageCircleQuestion", color: "slate", categories: ["staff"], description: "Staff question banks", functionalities: [] },
  { id: "staff-grades", key: "grades", name: "Grades", icon: "GraduationCap", color: "emerald", categories: ["staff"], description: "Staff grade tools", functionalities: [] },
  { id: "staff-profile", key: "profile", name: "Profile", icon: "GraduationCap", color: "emerald", categories: ["staff"], description: "Staff profiles", functionalities: [] },
  { id: "studentdashboard", key: "studentdashboard", name: "Student Dashboard", icon: "Home", color: "indigo", categories: ["student"], description: "Student overview",
    functionalities: [{ id: "view_courses", label: "View Courses", description: "Enrolled courses" }, { id: "view_grades", label: "View Grades", description: "Grades & progress" }, { id: "submit_assignments", label: "Submit Work", description: "Assignments" }] },
  { id: "student-courses", key: "courses", name: "Courses", icon: "BookOpen", color: "emerald", categories: ["student"], description: "Student course access",
    functionalities: [{ id: "enroll_courses", label: "Enroll", description: "Enroll" }, { id: "access_materials", label: "Materials", description: "Access content" }, { id: "view_schedule", label: "Schedule", description: "Timetable" }] },
  { id: "student-notification", key: "notifications", name: "Notifications", icon: "Bell", color: "amber", categories: ["student"], description: "Student notifications",
    functionalities: [{ id: "view_notifications", label: "View", description: "View" }, { id: "edit_notifications", label: "Edit", description: "Edit" }] },
  { id: "student-profile", key: "profile", name: "My Profile", icon: "GraduationCap", color: "emerald", categories: ["student"], description: "Student profile", functionalities: [] },
  { id: "student-grade", key: "grade", name: "Grade", icon: "GraduationCap", color: "emerald", categories: ["student"], description: "Student grades", functionalities: [] },
]

// ─── Color maps ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Users, ShieldCheck, Home, BookOpen, Settings2, Bell, GraduationCap, MessageCircleQuestion, Layers, Zap, Tag,
}

const COLOR: Record<string, { dot: string; text: string; chip: string; chipText: string; funcSel: string; funcSelText: string; funcSelBorder: string; checkBg: string }> = {
  indigo: { dot: "bg-indigo-500", text: "text-indigo-600", chip: "bg-indigo-50 dark:bg-indigo-950/40", chipText: "text-indigo-700 dark:text-indigo-300", funcSel: "bg-indigo-50 dark:bg-indigo-950/40", funcSelText: "text-indigo-700 dark:text-indigo-300", funcSelBorder: "border-indigo-200 dark:border-indigo-800", checkBg: "bg-indigo-500" },
  blue:   { dot: "bg-blue-500",   text: "text-blue-600",   chip: "bg-blue-50 dark:bg-blue-950/40",   chipText: "text-blue-700 dark:text-blue-300",   funcSel: "bg-blue-50 dark:bg-blue-950/40",   funcSelText: "text-blue-700 dark:text-blue-300",   funcSelBorder: "border-blue-200 dark:border-blue-800",   checkBg: "bg-blue-500" },
  emerald:{ dot: "bg-emerald-500",text: "text-emerald-600",chip: "bg-emerald-50 dark:bg-emerald-950/40",chipText:"text-emerald-700 dark:text-emerald-300",funcSel:"bg-emerald-50 dark:bg-emerald-950/40",funcSelText:"text-emerald-700 dark:text-emerald-300",funcSelBorder:"border-emerald-200 dark:border-emerald-800",checkBg:"bg-emerald-500" },
  amber:  { dot: "bg-amber-500",  text: "text-amber-600",  chip: "bg-amber-50 dark:bg-amber-950/40",  chipText: "text-amber-700 dark:text-amber-300",  funcSel: "bg-amber-50 dark:bg-amber-950/40",  funcSelText: "text-amber-700 dark:text-amber-300",  funcSelBorder: "border-amber-200 dark:border-amber-800",  checkBg: "bg-amber-500" },
  slate:  { dot: "bg-slate-500",  text: "text-slate-600",  chip: "bg-slate-100 dark:bg-slate-800",    chipText: "text-slate-600 dark:text-slate-300",  funcSel: "bg-slate-50 dark:bg-slate-800",     funcSelText: "text-slate-700 dark:text-slate-200",  funcSelBorder: "border-slate-200 dark:border-slate-700",  checkBg: "bg-slate-500" },
}
const fallbackColor = COLOR.slate

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  admin:   { label: "Admin",   color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  staff:   { label: "Staff",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  student: { label: "Student", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
}

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700", "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
]

// ─── Small helpers ─────────────────────────────────────────────────────────────

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb() }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
}

function initials(u: User) { return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() }
function avatarBg(id: string) { return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length] }

// ─── Tiny checkbox ─────────────────────────────────────────────────────────────

function Tick({ checked, color = "bg-blue-500", size = 14, onClick }: { checked: boolean; color?: string; size?: number; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size, flexShrink: 0 }}
      className={`rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${checked ? `${color} border-transparent` : "border-gray-300 dark:border-gray-600 hover:border-gray-400 bg-white dark:bg-gray-800"}`}
    >
      {checked && <Check style={{ width: size * 0.6, height: size * 0.6 }} className="text-white" strokeWidth={3} />}
    </div>
  )
}

// ─── Filter dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({ placeholder, options, selected, onChange }: { placeholder: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClose(ref, () => setOpen(false))

  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} type="button"
        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${selected.length > 0 ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-gray-300"}`}>
        <span className="truncate">{selected.length === 0 ? placeholder : selected.length > 1 ? `${selected.length} selected` : selected[0]}</span>
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          {selected.length > 0 && <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold leading-none">{selected.length}</span>}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            <button onClick={() => onChange([...options])} className="flex-1 text-[10px] py-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold transition-colors">All</button>
            <button onClick={() => onChange([])} className="flex-1 text-[10px] py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold transition-colors">Clear</button>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} onClick={() => toggle(opt)} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                <Tick checked={selected.includes(opt)} size={12} />
                <span className="text-xs text-gray-700 dark:text-gray-300 capitalize truncate">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RoleDropdown({ roles, selected, onChange }: { roles: Role[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClose(ref, () => setOpen(false))

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  const names = roles.filter(r => selected.includes(r._id)).map(r => r.renameRole)

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} type="button"
        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${selected.length > 0 ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-gray-300"}`}>
        <span className="truncate">{selected.length === 0 ? "All Roles" : selected.length > 1 ? `${selected.length} roles` : names[0]}</span>
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          {selected.length > 0 && <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold leading-none">{selected.length}</span>}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            <button onClick={() => onChange(roles.map(r => r._id))} className="flex-1 text-[10px] py-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold transition-colors">All</button>
            <button onClick={() => onChange([])} className="flex-1 text-[10px] py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold transition-colors">Clear</button>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {roles.map(r => (
              <label key={r._id} onClick={() => toggle(r._id)} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                <Tick checked={selected.includes(r._id)} size={12} />
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{r.renameRole}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function BulkPermissionModal({ isOpen, onClose, availableUsers, roles, basedOn, preSelectedUser }: BulkPermissionModalProps) {
  // User selection
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [roleFilters, setRoleFilters] = useState<string[]>([])
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [degreeFilters, setDegreeFilters] = useState<string[]>([])
  const [deptFilters, setDeptFilters] = useState<string[]>([])
  const [yearFilters, setYearFilters] = useState<string[]>([])
  const [batchFilters, setBatchFilters] = useState<string[]>([])
  const [showSelected, setShowSelected] = useState(false)

  // Permission selection
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])
  const [selectedFuncs, setSelectedFuncs] = useState<Record<string, string[]>>({})
  const [expandedFuncs, setExpandedFuncs] = useState<string[]>([])
  const [permSearch, setPermSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const queryClient = useQueryClient()
  const token = typeof window !== "undefined" ? localStorage.getItem("smartcliff_token") : null

  // Unique filter options
  const uniqueDegrees = [...new Set(availableUsers.map(u => u.degree).filter(Boolean) as string[])]
  const uniqueDepts   = [...new Set(availableUsers.map(u => u.department).filter(Boolean) as string[])]
  const uniqueYears   = [...new Set(availableUsers.map(u => u.year).filter(Boolean) as string[])]
  const uniqueBatches = [...new Set(availableUsers.map(u => u.batch).filter(Boolean) as string[])]

  const activeFilters = roleFilters.length + statusFilters.length + degreeFilters.length + deptFilters.length + yearFilters.length + batchFilters.length

  const filteredUsers = availableUsers.filter(u => {
    const q = searchTerm.toLowerCase()
    return (
      (!q || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (!roleFilters.length   || roleFilters.includes(u.roleId)) &&
      (!statusFilters.length || statusFilters.includes(u.status)) &&
      (!degreeFilters.length || (u.degree && degreeFilters.includes(u.degree))) &&
      (!deptFilters.length   || (u.department && deptFilters.includes(u.department))) &&
      (!yearFilters.length   || (u.year && yearFilters.includes(u.year))) &&
      (!batchFilters.length  || (u.batch && batchFilters.includes(u.batch)))
    )
  })

  const displayUsers = showSelected
    ? availableUsers.filter(u => selectedUsers.includes(u.id))
    : filteredUsers

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUsers.includes(u.id))

  useEffect(() => {
    if (preSelectedUser && !selectedUsers.includes(preSelectedUser.id)) {
      setSelectedUsers([preSelectedUser.id])
    }
  }, [preSelectedUser])

  // Permission helpers
  const filteredPerms = PERMISSION_DATA.filter(p => {
    const q = permSearch.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    const matchCat = categoryFilter === "all" || p.categories?.includes(categoryFilter)
    return matchQ && matchCat
  })

  const toggleUser = (id: string) => setSelectedUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedUsers(prev => prev.filter(id => !filteredUsers.some(u => u.id === id)))
    } else {
      setSelectedUsers(prev => { const next = [...prev]; filteredUsers.forEach(u => { if (!next.includes(u.id)) next.push(u.id) }); return next })
    }
  }

  const togglePerm = (id: string) => {
    setSelectedPerms(prev => {
      if (prev.includes(id)) {
        const f = { ...selectedFuncs }; delete f[id]; setSelectedFuncs(f)
        setExpandedFuncs(e => e.filter(x => x !== id))
        return prev.filter(x => x !== id)
      }
      return [...prev, id]
    })
  }

  const toggleFunc = (permId: string, funcId: string) => {
    if (!selectedPerms.includes(permId)) setSelectedPerms(p => [...p, permId])
    setSelectedFuncs(prev => {
      const next = { ...prev }
      const arr = next[permId] ? [...next[permId]] : []
      const i = arr.indexOf(funcId)
      if (i > -1) arr.splice(i, 1); else arr.push(funcId)
      if (arr.length === 0) { delete next[permId]; setSelectedPerms(p => p.filter(x => x !== permId)) }
      else next[permId] = arr
      return next
    })
  }

  const selectAllFuncs = (permId: string, funcs: Functionality[]) => {
    if (!selectedPerms.includes(permId)) setSelectedPerms(p => [...p, permId])
    setSelectedFuncs(prev => ({ ...prev, [permId]: funcs.map(f => f.id) }))
  }

  const clearFuncs = (permId: string) => {
    const f = { ...selectedFuncs }; delete f[permId]; setSelectedFuncs(f)
    setSelectedPerms(p => p.filter(x => x !== permId))
    setExpandedFuncs(e => e.filter(x => x !== permId))
  }

  const selectAllPerms = () => {
    setSelectedPerms(PERMISSION_DATA.map(p => p.id))
    const f: Record<string, string[]> = {}
    PERMISSION_DATA.forEach(p => { f[p.id] = p.functionalities.map(fn => fn.id) })
    setSelectedFuncs(f)
  }

  const clearAllPerms = () => { setSelectedPerms([]); setSelectedFuncs({}); setExpandedFuncs([]) }

  const totalFuncs = Object.values(selectedFuncs).reduce((a, b) => a + b.length, 0)

  const resetFilters = () => { setSearchTerm(""); setRoleFilters([]); setStatusFilters([]); setDegreeFilters([]); setDeptFilters([]); setYearFilters([]); setBatchFilters([]) }

  const mutation = useMutation({
    mutationFn: async (payload: { userId: string; permissions: any[] }[]) => {
      const r = await fetch("https://lms-server-ym1q.onrender.com/user-permission/bulk-update", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ userPermissions: payload }),
      })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message?.[0]?.value || "Failed") }
      return r.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success(`Permissions updated for ${data.data?.summary?.successful || selectedUsers.length} users`)
      onClose()
      setSelectedUsers([]); setSelectedPerms([]); setSelectedFuncs({}); setExpandedFuncs([])
    },
    onError: (e: any) => toast.error(e.message || "Failed to update permissions"),
  })

  const handleSave = () => {
    if (!selectedUsers.length) { toast.error("Select at least one user"); return }
    if (!selectedPerms.length) { toast.error("Select at least one permission"); return }
    const permissions = selectedPerms.map((id, order) => {
      const p = PERMISSION_DATA.find(x => x.id === id)
      return { id: p?.id, permissionName: p?.name, permissionKey: p?.key, permissionFunctionality: selectedFuncs[id] || [], icon: p?.icon, color: p?.color, description: p?.description, isActive: true, order }
    })
    mutation.mutate(selectedUsers.map(userId => ({ userId, permissions })))
  }

  const canSave = selectedUsers.length > 0 && selectedPerms.length > 0
  const isReady = canSave

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[96vw] w-[1200px] max-h-[92vh] p-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl bg-gray-50 dark:bg-gray-950 gap-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">Bulk Permission Assignment</DialogTitle>
              <DialogDescription className="text-xs text-gray-400 mt-0.5">Assign permissions to multiple users at once</DialogDescription>
            </div>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${selectedUsers.length > 0 ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300" : "bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700"}`}>
              <Users className="w-3 h-3" />{selectedUsers.length} users
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${selectedPerms.length > 0 ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300" : "bg-gray-100 border-gray-200 text-gray-400 dark:bg-gray-800 dark:border-gray-700"}`}>
              <ShieldCheck className="w-3 h-3" />{selectedPerms.length} perms
            </span>
            {totalFuncs > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                <Zap className="w-3 h-3" />{totalFuncs} fns
              </span>
            )}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(92vh - 108px)" }}>

          {/* ──── LEFT: User panel (narrower) ──────────────────────────── */}
          <div className="w-[320px] flex-shrink-0 flex flex-col min-h-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">

            {/* Search row */}
            <div className="flex-shrink-0 p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search users…"
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3 h-3" /></button>}
              </div>

              {/* Filter toggle + tabs */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${showFilters || activeFilters > 0 ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <Filter className="w-3 h-3" />
                  Filters
                  {activeFilters > 0 && <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold">{activeFilters}</span>}
                </button>

                {/* View toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                  <button onClick={() => setShowSelected(false)} className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${!showSelected ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500"}`}>
                    All {!showSelected && <span className="text-[10px] text-gray-400">({filteredUsers.length})</span>}
                  </button>
                  <button onClick={() => setShowSelected(true)} className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${showSelected ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500"}`}>
                    Selected {showSelected && <span className="text-[10px] text-gray-400">({selectedUsers.length})</span>}
                    {selectedUsers.length > 0 && !showSelected && <span className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold">{selectedUsers.length}</span>}
                  </button>
                </div>
              </div>

              {/* Filter panel */}
              {showFilters && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2.5 space-y-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Role</p><RoleDropdown roles={roles} selected={roleFilters} onChange={setRoleFilters} /></div>
                    <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p><FilterDropdown placeholder="All" options={["active", "inactive"]} selected={statusFilters} onChange={setStatusFilters} /></div>
                    {basedOn === "college" && uniqueDegrees.length > 0 && (
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Degree</p><FilterDropdown placeholder="All" options={uniqueDegrees} selected={degreeFilters} onChange={setDegreeFilters} /></div>
                    )}
                    {basedOn === "college" && uniqueDepts.length > 0 && (
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Dept</p><FilterDropdown placeholder="All" options={uniqueDepts} selected={deptFilters} onChange={setDeptFilters} /></div>
                    )}
                    {basedOn === "college" && uniqueYears.length > 0 && (
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Year</p><FilterDropdown placeholder="All" options={uniqueYears} selected={yearFilters} onChange={setYearFilters} /></div>
                    )}
                    {basedOn === "college" && uniqueBatches.length > 0 && (
                      <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Batch</p><FilterDropdown placeholder="All" options={uniqueBatches} selected={batchFilters} onChange={setBatchFilters} /></div>
                    )}
                  </div>
                  {activeFilters > 0 && (
                    <button onClick={resetFilters} className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
                      <RotateCcw className="w-3 h-3" /> Reset filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Select-all row */}
            {!showSelected && (
              <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Tick checked={allFilteredSelected} size={13} onClick={toggleAllFiltered} />
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Select all ({filteredUsers.length})</span>
                </label>
                {selectedUsers.length > 0 && (
                  <button onClick={() => setSelectedUsers([])} className="text-[11px] text-red-500 hover:text-red-700 font-medium flex items-center gap-0.5 transition-colors">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            )}

            {/* User list */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {displayUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                      <UserX className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-xs font-medium text-gray-500">{showSelected ? "No users selected" : "No users found"}</p>
                    {!showSelected && <p className="text-[11px] text-gray-400 mt-0.5">Adjust your search or filters</p>}
                  </div>
                ) : (
                  displayUsers.map(user => {
                    const isSel = selectedUsers.includes(user.id)
                    const userRole = roles.find(r => r._id === user.roleId)
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${isSel ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" : "bg-white dark:bg-gray-800/40 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                      >
                        <Tick checked={isSel} size={13} />
                        <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${avatarBg(user.id)}`}>
                          {initials(user)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{user.firstName} {user.lastName}</p>
                            <span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${user.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"}`}>
                              {user.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                          <p className="text-[10px] text-gray-400">{userRole?.renameRole || user.role}</p>
                        </div>
                        {showSelected && (
                          <button onClick={e => { e.stopPropagation(); toggleUser(user.id) }} className="flex-shrink-0 w-5 h-5 rounded-md hover:bg-red-100 dark:hover:bg-red-950/30 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ──── RIGHT: Permissions panel (wider, flat list) ───────────── */}
          <div className="flex-1 flex flex-col min-h-0">

            {/* Permissions toolbar */}
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              {/* Search perms */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  value={permSearch} onChange={e => setPermSearch(e.target.value)}
                  placeholder="Search permissions…"
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                {permSearch && <button onClick={() => setPermSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X className="w-3 h-3" /></button>}
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                {["all", "admin", "staff", "student"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors capitalize ${categoryFilter === cat ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <button onClick={selectAllPerms} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors">
                  Select all
                </button>
                <button onClick={clearAllPerms} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800 transition-colors">
                  Clear all
                </button>
              </div>
            </div>

            {/* Flat permission list */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3">
                {filteredPerms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                      <ShieldCheck className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-xs font-medium text-gray-500">No permissions found</p>
                  </div>
                ) : (
                  /* Grid of permission cards */
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                    {filteredPerms.map(perm => {
                      const isSel = selectedPerms.includes(perm.id)
                      const funcCount = selectedFuncs[perm.id]?.length ?? 0
                      const totalFn = perm.functionalities.length
                      const isExpanded = expandedFuncs.includes(perm.id)
                      const PermIcon = ICON_MAP[perm.icon] || ShieldCheck
                      const c = COLOR[perm.color] ?? fallbackColor
                      const cats = perm.categories ?? []

                      return (
                        <div
                          key={perm.id}
                          className={`flex flex-col rounded-xl border transition-all overflow-hidden ${isSel ? `border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 shadow-sm` : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"}`}
                        >
                          {/* Card header */}
                          <div className={`flex items-start gap-2.5 p-3 cursor-pointer ${isSel ? "" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`} onClick={() => togglePerm(perm.id)}>
                            <Tick checked={isSel} size={14} color="bg-blue-500" />
                            <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${isSel ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-100 dark:bg-gray-800"}`}>
                              <PermIcon className={`w-4 h-4 ${isSel ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`text-xs font-bold leading-tight ${isSel ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>{perm.name}</p>
                                {cats.map(cat => (
                                  <span key={cat} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold leading-none ${CATEGORY_LABELS[cat]?.color ?? ""}`}>
                                    {CATEGORY_LABELS[cat]?.label}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{perm.description}</p>
                            </div>
                          </div>

                          {/* Functions strip (only when selected & has functions) */}
                          {isSel && totalFn > 0 && (
                            <div className="border-t border-gray-100 dark:border-gray-800">
                              {/* Functions header */}
                              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50/70 dark:bg-gray-800/50">
                                <button
                                  onClick={() => setExpandedFuncs(prev => prev.includes(perm.id) ? prev.filter(x => x !== perm.id) : [...prev, perm.id])}
                                  className="flex items-center gap-1.5 flex-1 text-left"
                                >
                                  <span className={`text-[10px] font-semibold ${funcCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>
                                    {funcCount > 0 ? `${funcCount}/${totalFn} functions` : `${totalFn} functions`}
                                  </span>
                                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => selectAllFuncs(perm.id, perm.functionalities)} className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-1">All</button>
                                  {funcCount > 0 && <button onClick={() => clearFuncs(perm.id)} className="text-[10px] font-semibold text-red-500 hover:underline px-1">Clear</button>}
                                </div>
                              </div>

                              {/* Function checkboxes */}
                              {isExpanded && (
                                <div className="px-3 pb-2.5 pt-1.5 grid grid-cols-1 gap-1">
                                  {perm.functionalities.map(fn => {
                                    const fnSel = selectedFuncs[perm.id]?.includes(fn.id) ?? false
                                    return (
                                      <label
                                        key={fn.id}
                                        onClick={() => toggleFunc(perm.id, fn.id)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${fnSel ? `${c.funcSel} ${c.funcSelBorder}` : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"}`}
                                      >
                                        <Tick checked={fnSel} size={11} color={c.checkBg} />
                                        <span className={`text-[11px] font-medium leading-none ${fnSel ? c.funcSelText : "text-gray-600 dark:text-gray-400"}`}>{fn.label}</span>
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Empty functions note */}
                          {isSel && totalFn === 0 && (
                            <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 bg-gray-50/50 dark:bg-gray-800/30">
                              <p className="text-[10px] text-gray-400 italic">Page access only — no sub-functions</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          {/* Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${isReady ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400"}`}>
            {isReady ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Ready — <strong>{selectedPerms.length}</strong> permissions{totalFuncs > 0 ? ` & ${totalFuncs} functions` : ""} for <strong>{selectedUsers.length}</strong> user{selectedUsers.length !== 1 ? "s" : ""}</span>
              </>
            ) : (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 flex items-center justify-center text-[9px] font-bold">!</span>
                <span>{selectedUsers.length === 0 ? "Select at least one user to continue" : "Select at least one permission to continue"}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelectedUsers([]); setSelectedPerms([]); setSelectedFuncs({}); setExpandedFuncs([]) }}
              disabled={!selectedUsers.length && !selectedPerms.length}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending || !canSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
            >
              {mutation.isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assigning…</>
                : <><Save className="w-3.5 h-3.5" /> Assign Permissions</>
              }
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}






















// "use client"
// import { useState, useEffect, useRef } from "react"
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Check, X, Save, Loader2, Users, Search, Filter, ChevronDown, UserCheck, UserX, CheckSquare, Square, ChevronUp, SlidersHorizontal, ShieldCheck, Home, BookOpen, FileText, Settings2, Settings, Bell, ChevronRight, Computer } from "lucide-react"
// import { toast } from "react-toastify"
// import { useMutation, useQueryClient } from "@tanstack/react-query"
// import { Input } from "@/components/ui/input"
// import { ScrollArea } from "@/components/ui/scroll-area"
// import { Checkbox } from "@/components/ui/checkbox"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Avatar, AvatarFallback } from "@/components/ui/avatar"
// import { Card, CardContent } from "@/components/ui/card"

// interface BulkPermissionModalProps {
//   isOpen: boolean
//   onClose: () => void
//   availableUsers: User[]
//   roles: Role[]
//   basedOn: string | null
//   preSelectedUser?: User | null
// }

// interface User {
//   id: string
//   firstName: string
//   lastName: string
//   email: string
//   role: string
//   roleId: string
//   degree?: string
//   department?: string
//   year?: string
//   batch?: string
//   semester?: string
//   status: "active" | "inactive"
//   gender?: string
// }

// interface Role {
//   _id: string
//   renameRole: string
//   originalRole: string
// }

// interface PermissionItem {
//   id: string
//   key: string
//   name: string
//   icon: string
//   color: string
//   description: string
//   categories?: string[] // Multiple categories support
//   functionalities: {
//     id: string
//     label: string
//     description: string
//   }[]
// }

// // Define permission categories for bulk modal
// const permissionCategories = [
//   {
//     name: "Student",
//     key: "student",
//     icon: "Users",
//     color: "green"
//   },
//   {
//     name: "Staff",
//     key: "staff", 
//     icon: "Users",
//     color: "blue"
//   },
//   {
//     name: "Admin",
//     key: "admin",
//     icon: "ShieldCheck",
//     color: "purple"
//   }
// ]

// // Define default permissions with categories and color coding
// const defaultPermissionData: PermissionItem[] = [
//   {
//     id: "dashboard",
//     key: "admindashboard",
//     name: "Admin Dashboard",
//     icon: "Home",
//     color: "green",
//     categories: ["staff", "admin"],
//     description: "Admin Dashboard Management",
//     functionalities: [
//       { id: "view_users", label: "View Users", description: "View user list" },
//       { id: "add_users", label: "Add Users", description: "Create new accounts" },
//       { id: "edit_users", label: "Edit Users", description: "Modify user info" },
//       { id: "delete_users", label: "Delete Users", description: "Remove accounts" },
//     ]
//   },
//   {
//     id: "user-management",
//     key: "usermanagement",
//     name: "User Management",
//     icon: "Users",
//     color: "blue",
//     categories: ["staff", "admin"],
//     description: "Manage users and access",
//     functionalities: [
//       { id: "Add User", label: "Add User", description: "Create new accounts" },
//       { id: "View Full Details", label: "View Full Details", description: "View user full details" },
//       { id: "Bulk Permission", label: "Bulk Permission", description: "Bulk user Permissions" },
//       { id: "Edit", label: "Edit", description: "Modify user info" },
//       { id: "Permissions", label: "Permissions", description: "single User Permissions" },
//       { id: "Delete", label: "Delete", description: "Delete the user" },
//       { id: "Toggle User Status", label: "Toggle User Status", description: "Toggle the user's active status" },
//     ]
//   },
//   {
//     id: "course-management",
//     key: "coursestructure",
//     name: "Course Management",
//     icon: "BookOpen",
//     color: "green",
//     categories: ["staff", "admin"],
//     description: "Manage courses and materials",
//     functionalities: [
//       { id: "Add Course Structure", label: "Add Course Structure", description: "Add Course Structure new courses" },
//       { id: "View Full Details", label: "View Full Details", description: "View course catalog" },
//       { id: "Add Course", label: "Add Courses", description: "Create new courses" },
//       { id: "Add Participants", label: "Add Participants", description: "Add Participants" },
//       { id: "Upload Resourses", label: "Upload Resourses", description: "Add Course Structure" },
//       { id: "Edit Course", label: "Edit Course", description: "Remove courses" },
//       { id: "Delete Course", label: "Delete Course", description: "Delete new courses" },
//       { id: "Dublicate", label: "Dublicate", description: "Delete new courses" },
//     ]
//   },
//   {
//     id: "student-dashboard",
//     key: "studentdashboard",
//     name: "Student Dashboard",
//     icon: "Home",
//     color: "green",
//     categories: ["student"],
//     description: "Student Dashboard Access",
//     functionalities: [
//       { id: "view_courses", label: "View Courses", description: "View enrolled courses" },
//       { id: "view_grades", label: "View Grades", description: "View grades and progress" },
//       { id: "submit_assignments", label: "Submit Assignments", description: "Submit course assignments" },
//     ]
//   },
//   {
//     id: "course",
//     key: "courses",
//     name: "Courses",
//     icon: "BookOpen",
//     color: "red",
//     categories: ["student"],
//     description: "Student Course Access",
//     functionalities: [
//       { id: "enroll_courses", label: "Enroll Courses", description: "Enroll in new courses" },
//       { id: "access_materials", label: "Access Materials", description: "Access course materials" },
//       { id: "view_schedule", label: "View Schedule", description: "View course schedule" },
//     ]
//   },
 
//   {
//     id: "compiler-management",
//     key: "compailertest",
//     name: "Compiler Management",
//     icon: "FileText",
//     color: "purple",
//     categories: ["admin"],
//     description: "Manage compiler tests",
//     functionalities: [
//       { id: "view_tests", label: "View Tests", description: "View test list" },
//       { id: "create_tests", label: "Create Tests", description: "Create assessments" },
//       { id: "edit_tests", label: "Edit Tests", description: "Modify questions" },
//       { id: "delete_tests", label: "Delete Tests", description: "Remove tests" },
//     ]
//   },
//   {
//     id: "dynamicfieldsettings",
//     key: "dynamicfieldsettings",
//     name: "Dynamic Field Settings",
//     icon: "Settings2",
//     color: "gray",
//     categories: ["staff", "admin"],
//     description: "Dynamic Field Configuration",
//     functionalities: [
//       { id: "Service Modal", label: "Service Modal", description: "Service config" },
//       { id: "Course Category", label: "Course Category", description: "Course preferences" },
//       { id: "Pedagogy", label: "Pedagogy", description: "Pedagogy preferences" },
//     ]
//   },
//   {
//     id: "notification",
//     key: "notifications",
//     name: "Notifications",
//     icon: "Bell",
//     color: "gray",
//     categories: ["student", "staff", "admin"],
//     description: "System notifications",
//     functionalities: [
//       { id: "view_notifications", label: "View Notifications", description: "View notifications" },
//       { id: "edit_notifications", label: "Edit Notifications", description: "Modify notifications" },
//     ]
//   },
// ]

// // Color classes for categories and permissions
// const colorClasses: Record<string, any> = {
//   green: {
//     bg: 'bg-green-500',
//     bgLight: 'bg-green-50',
//     text: 'text-green-600',
//     border: 'border-green-200',
//     iconBg: 'bg-green-100'
//   },
//   blue: {
//     bg: 'bg-blue-500',
//     bgLight: 'bg-blue-50',
//     text: 'text-blue-600',
//     border: 'border-blue-200',
//     iconBg: 'bg-blue-100'
//   },
//   purple: {
//     bg: 'bg-purple-500',
//     bgLight: 'bg-purple-50',
//     text: 'text-purple-600',
//     border: 'border-purple-200',
//     iconBg: 'bg-purple-100'
//   },
//   red: {
//     bg: 'bg-red-500',
//     bgLight: 'bg-red-50',
//     text: 'text-red-600',
//     border: 'border-red-200',
//     iconBg: 'bg-red-100'
//   },
//   orange: {
//     bg: 'bg-orange-500',
//     bgLight: 'bg-orange-50',
//     text: 'text-orange-600',
//     border: 'border-orange-200',
//     iconBg: 'bg-orange-100'
//   },
//   teal: {
//     bg: 'bg-teal-500',
//     bgLight: 'bg-teal-50',
//     text: 'text-teal-600',
//     border: 'border-teal-200',
//     iconBg: 'bg-teal-100'
//   },
//   gray: {
//     bg: 'bg-gray-500',
//     bgLight: 'bg-gray-50',
//     text: 'text-gray-600',
//     border: 'border-gray-200',
//     iconBg: 'bg-gray-100'
//   },
//   yellow: {
//     bg: 'bg-yellow-500',
//     bgLight: 'bg-yellow-50',
//     text: 'text-yellow-600',
//     border: 'border-yellow-200',
//     iconBg: 'bg-yellow-100'
//   }
// }

// // Icon mapping
// const iconMap: Record<string, any> = {
//   Users: Users,
//   ShieldCheck: ShieldCheck,
//   Home: Home,
//   BookOpen: BookOpen,
//   FileText: FileText,
//   Settings2: Settings2,
//   Bell: Bell,
//   Settings: Settings,
//   Computer: Computer
// }

// // Compact MultiSelect Dropdown Component
// interface CompactMultiSelectProps {
//   options: string[]
//   selected: string[]
//   onChange: (selected: string[]) => void
//   placeholder: string
//   emptyMessage?: string
// }

// function CompactMultiSelect({ options, selected, onChange, placeholder, emptyMessage = "No options" }: CompactMultiSelectProps) {
//   const [isOpen, setIsOpen] = useState(false)
//   const dropdownRef = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsOpen(false)
//       }
//     }
//     document.addEventListener('mousedown', handleClickOutside)
//     return () => document.removeEventListener('mousedown', handleClickOutside)
//   }, [])

//   const toggleOption = (value: string) => {
//     if (selected.includes(value)) {
//       onChange(selected.filter(item => item !== value))
//     } else {
//       onChange([...selected, value])
//     }
//   }

//   const selectAll = () => {
//     onChange([...options])
//   }

//   const clearAll = () => {
//     onChange([])
//   }

//   const getDisplayText = () => {
//     if (selected.length === 0) return placeholder
//     if (selected.length === options.length) return `All (${selected.length})`
//     if (selected.length > 2) return `${selected.length} selected`
//     return selected.join(", ")
//   }

//   const getSelectedCount = () => {
//     if (selected.length === 0) return null
//     return selected.length
//   }

//   return (
//     <div className="relative" ref={dropdownRef}>
//       <button
//         type="button"
//         onClick={() => setIsOpen(!isOpen)}
//         className={`flex items-center justify-between w-full px-2 py-1.5 text-xs border rounded bg-white hover:bg-gray-50 transition-colors ${
//           isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200"
//         } ${selected.length > 0 ? "bg-blue-50 border-blue-200" : ""}`}
//       >
//         <div className="flex items-center gap-1.5 min-w-0">
//           <span className="truncate text-left">{getDisplayText()}</span>
//           {getSelectedCount() && (
//             <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
//               {getSelectedCount()}
//             </Badge>
//           )}
//         </div>
//         <ChevronDown className={`h-3 w-3 transition-transform flex-shrink-0 ${isOpen ? "transform rotate-180" : ""}`} />
//       </button>
      
//       {isOpen && (
//         <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
//           <div className="p-1.5">
//             <div className="flex justify-between items-center mb-1.5 px-1">
//               <button
//                 type="button"
//                 onClick={selectAll}
//                 className="text-xs text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50"
//               >
//                 Select All
//               </button>
//               <button
//                 type="button"
//                 onClick={clearAll}
//                 className="text-xs text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50"
//               >
//                 Clear All
//               </button>
//             </div>
//             <div className="max-h-48 overflow-y-auto">
//               {options.length === 0 ? (
//                 <div className="px-2 py-1.5 text-xs text-gray-500">{emptyMessage}</div>
//               ) : (
//                 options.map((option) => {
//                   const isSelected = selected.includes(option)
//                   return (
//                     <div
//                       key={option}
//                       className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-xs"
//                       onClick={() => toggleOption(option)}
//                     >
//                       <div className={`h-3 w-3 rounded border flex items-center justify-center mr-2 flex-shrink-0 ${
//                         isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
//                       }`}>
//                         {isSelected && <Check className="h-2 w-2 text-white" />}
//                       </div>
//                       <span className="truncate">{option}</span>
//                     </div>
//                   )
//                 })
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// // Compact Role MultiSelect
// interface CompactRoleMultiSelectProps {
//   roles: Role[]
//   selected: string[]
//   onChange: (selected: string[]) => void
//   placeholder: string
// }

// function CompactRoleMultiSelect({ roles, selected, onChange, placeholder }: CompactRoleMultiSelectProps) {
//   const [isOpen, setIsOpen] = useState(false)
//   const dropdownRef = useRef<HTMLDivElement>(null)

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsOpen(false)
//       }
//     }
//     document.addEventListener('mousedown', handleClickOutside)
//     return () => document.removeEventListener('mousedown', handleClickOutside)
//   }, [])

//   const toggleRole = (roleId: string) => {
//     if (selected.includes(roleId)) {
//       onChange(selected.filter(id => id !== roleId))
//     } else {
//       onChange([...selected, roleId])
//     }
//   }

//   const selectAll = () => {
//     onChange(roles.map(role => role._id))
//   }

//   const clearAll = () => {
//     onChange([])
//   }

//   const getDisplayText = () => {
//     if (selected.length === 0) return placeholder
//     if (selected.length === roles.length) return `All Roles`
//     if (selected.length > 2) return `${selected.length} roles`
    
//     const selectedNames = roles
//       .filter(role => selected.includes(role._id))
//       .map(role => role.renameRole)
//     return selectedNames.join(", ")
//   }

//   const getSelectedCount = () => {
//     if (selected.length === 0) return null
//     return selected.length
//   }

//   return (
//     <div className="relative" ref={dropdownRef}>
//       <button
//         type="button"
//         onClick={() => setIsOpen(!isOpen)}
//         className={`flex items-center justify-between w-full px-2 py-1.5 text-xs border rounded bg-white hover:bg-gray-50 transition-colors ${
//           isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-200"
//         } ${selected.length > 0 ? "bg-blue-50 border-blue-200" : ""}`}
//       >
//         <div className="flex items-center gap-1.5 min-w-0">
//           <span className="truncate text-left">{getDisplayText()}</span>
//           {getSelectedCount() && (
//             <Badge variant="secondary" className="h-4 w-4 p-0 flex items-center justify-center text-[10px]">
//               {getSelectedCount()}
//             </Badge>
//           )}
//         </div>
//         <ChevronDown className={`h-3 w-3 transition-transform flex-shrink-0 ${isOpen ? "transform rotate-180" : ""}`} />
//       </button>
      
//       {isOpen && (
//         <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
//           <div className="p-1.5">
//             <div className="flex justify-between items-center mb-1.5 px-1">
//               <button
//                 type="button"
//                 onClick={selectAll}
//                 className="text-xs text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-50"
//               >
//                 Select All
//               </button>
//               <button
//                 type="button"
//                 onClick={clearAll}
//                 className="text-xs text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50"
//               >
//                 Clear All
//               </button>
//             </div>
//             <div className="max-h-48 overflow-y-auto">
//               {roles.length === 0 ? (
//                 <div className="px-2 py-1.5 text-xs text-gray-500">No roles available</div>
//               ) : (
//                 roles.map((role) => {
//                   const isSelected = selected.includes(role._id)
//                   return (
//                     <div
//                       key={role._id}
//                       className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-xs"
//                       onClick={() => toggleRole(role._id)}
//                     >
//                       <div className={`h-3 w-3 rounded border flex items-center justify-center mr-2 flex-shrink-0 ${
//                         isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
//                       }`}>
//                         {isSelected && <Check className="h-2 w-2 text-white" />}
//                       </div>
//                       <span className="truncate">{role.renameRole}</span>
//                     </div>
//                   )
//                 })
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// export function BulkPermissionModal({ isOpen, onClose, availableUsers, roles, basedOn, preSelectedUser }: BulkPermissionModalProps) {
//   const [selectedUsers, setSelectedUsers] = useState<string[]>([])
//   const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
//   const [selectedFunctionalities, setSelectedFunctionalities] = useState<Record<string, string[]>>({})
//   const [permissionData] = useState<PermissionItem[]>(defaultPermissionData)
//   const [expandedCategories, setExpandedCategories] = useState<string[]>(permissionCategories.map(c => c.key)) // Expand all by default
  
//   // Filter states
//   const [searchTerm, setSearchTerm] = useState("")
//   const [selectedRoleFilters, setSelectedRoleFilters] = useState<string[]>([])
//   const [selectedStatusFilters, setSelectedStatusFilters] = useState<string[]>([])
//   const [selectedDegreeFilters, setSelectedDegreeFilters] = useState<string[]>([])
//   const [selectedDepartmentFilters, setSelectedDepartmentFilters] = useState<string[]>([])
//   const [selectedYearFilters, setSelectedYearFilters] = useState<string[]>([])
//   const [selectedBatchFilters, setSelectedBatchFilters] = useState<string[]>([])
//   const [showFilters, setShowFilters] = useState(false)
  
//   const [selectAllUsers, setSelectAllUsers] = useState(false)
//   const [activeTab, setActiveTab] = useState("users")
//   const queryClient = useQueryClient()
//   const token = localStorage.getItem('smartcliff_token')

//   // Get unique values for filters
//   const uniqueDegrees = Array.from(new Set(availableUsers
//     .map(u => u.degree)
//     .filter(Boolean) as string[]
//   ))
//   const uniqueDepartments = Array.from(new Set(availableUsers
//     .map(u => u.department)
//     .filter(Boolean) as string[]
//   ))
//   const uniqueYears = Array.from(new Set(availableUsers
//     .map(u => u.year)
//     .filter(Boolean) as string[]
//   ))
//   const uniqueBatches = Array.from(new Set(availableUsers
//     .map(u => u.batch)
//     .filter(Boolean) as string[]
//   ))
//   const uniqueStatuses = ["active", "inactive"]

//   // Filter users based on criteria
//   const filteredUsers = availableUsers.filter(user => {
//     const matchesSearch = !searchTerm ||
//       user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       user.email.toLowerCase().includes(searchTerm.toLowerCase())
    
//     const matchesRole = selectedRoleFilters.length === 0 || selectedRoleFilters.includes(user.roleId)
//     const matchesStatus = selectedStatusFilters.length === 0 || selectedStatusFilters.includes(user.status)
//     const matchesDegree = selectedDegreeFilters.length === 0 || (user.degree && selectedDegreeFilters.includes(user.degree))
//     const matchesDepartment = selectedDepartmentFilters.length === 0 || (user.department && selectedDepartmentFilters.includes(user.department))
//     const matchesYear = selectedYearFilters.length === 0 || (user.year && selectedYearFilters.includes(user.year))
//     const matchesBatch = selectedBatchFilters.length === 0 || (user.batch && selectedBatchFilters.includes(user.batch))
    
//     return matchesSearch && matchesRole && matchesStatus && matchesDegree && matchesDepartment && matchesYear && matchesBatch
//   })

//   useEffect(() => {
//     if (preSelectedUser && !selectedUsers.includes(preSelectedUser.id)) {
//       setSelectedUsers([preSelectedUser.id])
//     }
//   }, [preSelectedUser, selectedUsers])

//   // Update selectAll when all filtered users are selected
//   useEffect(() => {
//     if (filteredUsers.length > 0) {
//       const allFilteredSelected = filteredUsers.every(user => selectedUsers.includes(user.id))
//       setSelectAllUsers(allFilteredSelected)
//     } else {
//       setSelectAllUsers(false)
//     }
//   }, [filteredUsers, selectedUsers])

//   // Toggle category expansion
//   const toggleCategory = (categoryKey: string) => {
//     setExpandedCategories(prev =>
//       prev.includes(categoryKey)
//         ? prev.filter(key => key !== categoryKey)
//         : [...prev, categoryKey]
//     )
//   }

//   // Get permissions by category
//   const getPermissionsByCategory = (categoryKey: string) => {
//     return permissionData.filter(permission => 
//       permission.categories?.includes(categoryKey)
//     )
//   }

//   // Check if category has selected permissions
//   const hasSelectedPermissionsInCategory = (categoryKey: string) => {
//     const categoryPermissions = getPermissionsByCategory(categoryKey)
//     return categoryPermissions.some(permission => selectedPermissions.includes(permission.key))
//   }

//   // Get selected count in category
//   const getSelectedCountInCategory = (categoryKey: string) => {
//     const categoryPermissions = getPermissionsByCategory(categoryKey)
//     return categoryPermissions.filter(permission => selectedPermissions.includes(permission.key)).length
//   }

//   // Get total permissions count in category
//   const getTotalCountInCategory = (categoryKey: string) => {
//     return getPermissionsByCategory(categoryKey).length
//   }

//   // Toggle select all users
//   const handleSelectAllUsers = () => {
//     if (selectAllUsers) {
//       const newSelected = selectedUsers.filter(userId => 
//         !filteredUsers.some(user => user.id === userId)
//       )
//       setSelectedUsers(newSelected)
//       setSelectAllUsers(false)
//     } else {
//       const newSelected = [...selectedUsers]
//       filteredUsers.forEach(user => {
//         if (!newSelected.includes(user.id)) {
//           newSelected.push(user.id)
//         }
//       })
//       setSelectedUsers(newSelected)
//       setSelectAllUsers(true)
//     }
//   }

//   // Toggle single user selection
//   const handleUserToggle = (userId: string) => {
//     setSelectedUsers(prev => {
//       if (prev.includes(userId)) {
//         return prev.filter(id => id !== userId)
//       } else {
//         return [...prev, userId]
//       }
//     })
//   }

//   // Toggle permission selection
//   const handlePermissionToggle = (permissionKey: string) => {
//     setSelectedPermissions(prev => {
//       if (prev.includes(permissionKey)) {
//         const newFuncs = { ...selectedFunctionalities }
//         delete newFuncs[permissionKey]
//         setSelectedFunctionalities(newFuncs)
//         return prev.filter(key => key !== permissionKey)
//       } else {
//         return [...prev, permissionKey]
//       }
//     })
//   }

//   // Toggle functionality selection
//   const handleFunctionalityToggle = (permissionKey: string, functionalityId: string) => {
//     if (!selectedPermissions.includes(permissionKey)) {
//       setSelectedPermissions(prev => [...prev, permissionKey])
//     }
    
//     setSelectedFunctionalities(prev => {
//       const newFuncs = { ...prev }
//       if (!newFuncs[permissionKey]) {
//         newFuncs[permissionKey] = []
//       }
      
//       const index = newFuncs[permissionKey].indexOf(functionalityId)
//       if (index > -1) {
//         newFuncs[permissionKey].splice(index, 1)
//       } else {
//         newFuncs[permissionKey].push(functionalityId)
//       }
      
//       if (newFuncs[permissionKey].length === 0) {
//         delete newFuncs[permissionKey]
//         setSelectedPermissions(prev => prev.filter(key => key !== permissionKey))
//       }
      
//       return newFuncs
//     })
//   }

//   // Select all functionalities for a permission
//   const handleSelectAllFunctionalities = (permissionKey: string) => {
//     const permission = permissionData.find(p => p.key === permissionKey)
//     if (!permission) return
    
//     if (!selectedPermissions.includes(permissionKey)) {
//       setSelectedPermissions(prev => [...prev, permissionKey])
//     }
    
//     const allFuncs = permission.functionalities.map(f => f.id)
//     setSelectedFunctionalities(prev => ({
//       ...prev,
//       [permissionKey]: allFuncs
//     }))
//   }

//   // Clear all functionalities for a permission
//   const handleClearFunctionalities = (permissionKey: string) => {
//     const newFuncs = { ...selectedFunctionalities }
//     delete newFuncs[permissionKey]
//     setSelectedFunctionalities(newFuncs)
//     setSelectedPermissions(prev => prev.filter(key => key !== permissionKey))
//   }

//   // Select all permissions in a category
//   const handleSelectAllPermissionsInCategory = (categoryKey: string) => {
//     const categoryPermissions = getPermissionsByCategory(categoryKey)
//     const newSelected = [...selectedPermissions]
//     const newFuncs = { ...selectedFunctionalities }
    
//     categoryPermissions.forEach(permission => {
//       if (!newSelected.includes(permission.key)) {
//         newSelected.push(permission.key)
//       }
//       newFuncs[permission.key] = permission.functionalities.map(f => f.id)
//     })
    
//     setSelectedPermissions(newSelected)
//     setSelectedFunctionalities(newFuncs)
//   }

//   // Clear all permissions in a category
//   const handleClearPermissionsInCategory = (categoryKey: string) => {
//     const categoryPermissions = getPermissionsByCategory(categoryKey)
//     const newSelected = selectedPermissions.filter(key => 
//       !categoryPermissions.some(p => p.key === key)
//     )
//     const newFuncs = { ...selectedFunctionalities }
    
//     categoryPermissions.forEach(permission => {
//       delete newFuncs[permission.key]
//     })
    
//     setSelectedPermissions(newSelected)
//     setSelectedFunctionalities(newFuncs)
//   }

//   // Select all permissions
//   const handleSelectAllPermissions = () => {
//     const allPermissionKeys = permissionData.map(p => p.key)
//     setSelectedPermissions(allPermissionKeys)
    
//     const allFuncs: Record<string, string[]> = {}
//     permissionData.forEach(permission => {
//       allFuncs[permission.key] = permission.functionalities.map(f => f.id)
//     })
//     setSelectedFunctionalities(allFuncs)
//   }

//   // Clear all permissions
//   const handleClearAllPermissions = () => {
//     setSelectedPermissions([])
//     setSelectedFunctionalities({})
//   }

//   // Bulk update mutation
//   const bulkUpdateMutation = useMutation({
//     mutationFn: async (userPermissions: { userId: string, permissions: any[] }[]) => {
//       const response = await fetch('https://lms-server-ym1q.onrender.com/user-permission/bulk-update', {
//         method: 'PUT',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ userPermissions })
//       })
      
//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}))
//         throw new Error(errorData.message?.[0]?.value || 'Failed to update permissions')
//       }
      
//       return response.json()
//     },
//     onSuccess: (data) => {
//       queryClient.invalidateQueries({ queryKey: ['users'] })
//       const successCount = data.data?.summary?.successful || selectedUsers.length
//       toast.success(`Permissions updated for ${successCount} users`)
//       onClose()
      
//       // Reset state
//       setSelectedUsers([])
//       setSelectedPermissions([])
//       setSelectedFunctionalities({})
//       setSelectAllUsers(false)
//       setShowFilters(false)
//     },
//     onError: (error: any) => {
//       toast.error(error.message || "Failed to update permissions")
//       console.error("Bulk update error:", error)
//     }
//   })

//   const handleSave = () => {
//     if (selectedUsers.length === 0) {
//       toast.error("Please select at least one user")
//       return
//     }

//     if (selectedPermissions.length === 0) {
//       toast.error("Please select at least one permission")
//       return
//     }

//     // Prepare permissions array for each user
//     const permissionsArray = selectedPermissions.map((permissionKey, index) => {
//       const permission = permissionData.find(p => p.key === permissionKey)
//       return {
//         permissionName: permission?.name || permissionKey,
//         permissionKey: permissionKey,
//         permissionFunctionality: selectedFunctionalities[permissionKey] || [],
//         icon: permission?.icon || "Shield",
//         color: permission?.color || "blue",
//         description: permission?.description || "",
//         isActive: true,
//         order: index
//       }
//     })

//     // Create array of user permissions
//     const userPermissions = selectedUsers.map(userId => ({
//       userId,
//       permissions: permissionsArray
//     }))

//     bulkUpdateMutation.mutate(userPermissions)
//   }

//   const handleClearAll = () => {
//     setSelectedUsers([])
//     setSelectedPermissions([])
//     setSelectedFunctionalities({})
//     setSelectAllUsers(false)
//   }

//   const getPermissionFuncCount = (permissionKey: string) => {
//     return selectedFunctionalities[permissionKey]?.length || 0
//   }

//   const getSelectedUserDetails = () => {
//     return availableUsers.filter(user => selectedUsers.includes(user.id))
//   }

//   // Reset all filters
//   const resetFilters = () => {
//     setSearchTerm("")
//     setSelectedRoleFilters([])
//     setSelectedStatusFilters([])
//     setSelectedDegreeFilters([])
//     setSelectedDepartmentFilters([])
//     setSelectedYearFilters([])
//     setSelectedBatchFilters([])
//   }

//   // Toggle filters visibility
//   const toggleFilters = () => {
//     setShowFilters(!showFilters)
//   }

//   // Check if any filter is selected
//   const hasActiveFilters = () => {
//     return selectedRoleFilters.length > 0 ||
//       selectedStatusFilters.length > 0 ||
//       selectedDegreeFilters.length > 0 ||
//       selectedDepartmentFilters.length > 0 ||
//       selectedYearFilters.length > 0 ||
//       selectedBatchFilters.length > 0
//   }

//   // Get active filter count
//   const getActiveFilterCount = () => {
//     return selectedRoleFilters.length +
//       selectedStatusFilters.length +
//       selectedDegreeFilters.length +
//       selectedDepartmentFilters.length +
//       selectedYearFilters.length +
//       selectedBatchFilters.length
//   }

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
//         <div className="flex flex-col h-[90vh]">
//           {/* Compact Header */}
//           <div className="px-4 py-3 border-b bg-white">
//             <div className="flex items-center justify-between">
//               <div>
//                 <DialogTitle className="text-base font-semibold text-gray-900">
//                   Bulk Permission Assignment
//                 </DialogTitle>
//                 <DialogDescription className="text-xs text-gray-500">
//                   Select users and assign permissions in bulk
//                 </DialogDescription>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Badge variant="outline" className="text-xs px-2 py-0.5">
//                   <Users className="h-3 w-3 mr-1" />
//                   {selectedUsers.length} users
//                 </Badge>
//                 <Badge variant="outline" className="text-xs px-2 py-0.5">
//                   <CheckSquare className="h-3 w-3 mr-1" />
//                   {selectedPermissions.length} perms
//                 </Badge>
//               </div>
//             </div>
//           </div>

//           {/* Main Content Area */}
//           <div className="flex flex-1 min-h-0 overflow-hidden">
//             {/* Left Panel - User Selection */}
//             <div className="w-2/5 border-r flex flex-col min-h-0 overflow-hidden">
//               <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
//                 {/* Compact Tabs */}
//                 <div className="px-3 pt-3 pb-1 border-b bg-white flex-shrink-0">
//                   <TabsList className="grid grid-cols-2 w-full h-8">
//                     <TabsTrigger value="users" className="text-xs h-7">
//                       <Users className="h-3 w-3 mr-1.5" />
//                       Users ({filteredUsers.length})
//                     </TabsTrigger>
//                     <TabsTrigger value="selected" className="text-xs h-7">
//                       <UserCheck className="h-3 w-3 mr-1.5" />
//                       Selected ({selectedUsers.length})
//                     </TabsTrigger>
//                   </TabsList>
//                 </div>

//                 {/* Tab Content Container */}
//                 <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
//                   {/* Users Tab */}
//                   <TabsContent 
//                     value="users" 
//                     className="flex-1 flex flex-col p-0 m-0 min-h-0 data-[state=active]:flex"
//                   >
//                     {/* Compact Search and Filters Header */}
//                     <div className="p-2 border-b bg-gray-50 flex-shrink-0">
//                       <div className="flex items-center gap-1.5 mb-1.5">
//                         <Search className="h-3 w-3 text-gray-400" />
//                         <Input
//                           placeholder="Search users..."
//                           value={searchTerm}
//                           onChange={(e) => setSearchTerm(e.target.value)}
//                           className="h-7 text-xs flex-1"
//                         />
//                       </div>
                      
//                       {/* Compact Filter Controls */}
//                       <div className="flex items-center justify-between">
//                         <Button
//                           variant="ghost"
//                           size="sm"
//                           onClick={toggleFilters}
//                           className="h-6 text-xs px-1.5"
//                         >
//                           {showFilters ? (
//                             <ChevronUp className="h-3 w-3 mr-1" />
//                           ) : (
//                             <ChevronDown className="h-3 w-3 mr-1" />
//                           )}
//                           Filters
//                           {getActiveFilterCount() > 0 && (
//                             <Badge variant="secondary" className="ml-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]">
//                               {getActiveFilterCount()}
//                             </Badge>
//                           )}
//                         </Button>
//                         <div className="flex items-center gap-1">
//                           {hasActiveFilters() && (
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               onClick={resetFilters}
//                               className="h-6 text-xs px-1.5 text-red-600"
//                             >
//                               <X className="h-3 w-3 mr-0.5" />
//                               Clear
//                             </Button>
//                           )}
//                         </div>
//                       </div>
                      
//                       {/* Expandable Filters Grid */}
//                       {showFilters && (
//                         <div className="mt-1.5 animate-in fade-in duration-200">
//                           <div className="grid grid-cols-2 gap-1.5">
//                             {/* Roles Filter */}
//                             <div className="space-y-0.5">
//                               <label className="text-[10px] font-medium text-gray-600">Roles</label>
//                               <CompactRoleMultiSelect
//                                 roles={roles}
//                                 selected={selectedRoleFilters}
//                                 onChange={setSelectedRoleFilters}
//                                 placeholder="All Roles"
//                               />
//                             </div>

//                             {/* Status Filter */}
//                             <div className="space-y-0.5">
//                               <label className="text-[10px] font-medium text-gray-600">Status</label>
//                               <CompactMultiSelect
//                                 options={uniqueStatuses}
//                                 selected={selectedStatusFilters}
//                                 onChange={setSelectedStatusFilters}
//                                 placeholder="All Status"
//                               />
//                             </div>

//                             {/* College-based filters */}
//                             {basedOn === 'college' && (
//                               <>
//                                 {/* Degrees Filter */}
//                                 {uniqueDegrees.length > 0 && (
//                                   <div className="space-y-0.5">
//                                     <label className="text-[10px] font-medium text-gray-600">Degree</label>
//                                     <CompactMultiSelect
//                                       options={uniqueDegrees}
//                                       selected={selectedDegreeFilters}
//                                       onChange={setSelectedDegreeFilters}
//                                       placeholder="All Degrees"
//                                     />
//                                   </div>
//                                 )}

//                                 {/* Departments Filter */}
//                                 {uniqueDepartments.length > 0 && (
//                                   <div className="space-y-0.5">
//                                     <label className="text-[10px] font-medium text-gray-600">Department</label>
//                                     <CompactMultiSelect
//                                       options={uniqueDepartments}
//                                       selected={selectedDepartmentFilters}
//                                       onChange={setSelectedDepartmentFilters}
//                                       placeholder="All Departments"
//                                     />
//                                   </div>
//                                 )}

//                                 {/* Years Filter */}
//                                 {uniqueYears.length > 0 && (
//                                   <div className="space-y-0.5">
//                                     <label className="text-[10px] font-medium text-gray-600">Year</label>
//                                     <CompactMultiSelect
//                                       options={uniqueYears}
//                                       selected={selectedYearFilters}
//                                       onChange={setSelectedYearFilters}
//                                       placeholder="All Years"
//                                     />
//                                   </div>
//                                 )}

//                                 {/* Batches Filter */}
//                                 {uniqueBatches.length > 0 && (
//                                   <div className="space-y-0.5">
//                                     <label className="text-[10px] font-medium text-gray-600">Batch</label>
//                                     <CompactMultiSelect
//                                       options={uniqueBatches}
//                                       selected={selectedBatchFilters}
//                                       onChange={setSelectedBatchFilters}
//                                       placeholder="All Batches"
//                                     />
//                                   </div>
//                                 )}
//                               </>
//                             )}
//                           </div>
//                         </div>
//                       )}
//                     </div>

//                     {/* User List Header */}
//                     <div className="flex items-center justify-between p-1.5 border-b bg-white flex-shrink-0">
//                       <div className="flex items-center gap-1.5">
//                         <Checkbox
//                           checked={selectAllUsers}
//                           onCheckedChange={handleSelectAllUsers}
//                           className="h-3.5 w-3.5"
//                         />
//                         <span className="text-xs font-medium text-gray-900">
//                           All ({filteredUsers.length})
//                         </span>
//                       </div>
//                       {selectedUsers.length > 0 && (
//                         <div className="flex items-center gap-1">
//                           <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
//                             {selectedUsers.length}
//                           </Badge>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => setSelectedUsers([])}
//                             className="h-5 w-5 p-0"
//                           >
//                             <X className="h-2.5 w-2.5" />
//                           </Button>
//                         </div>
//                       )}
//                     </div>

//                     {/* User List - Scrollable Area */}
//                     <ScrollArea className="flex-1 min-h-0">
//                       <div className="p-1 space-y-0.5">
//                         {filteredUsers.length === 0 ? (
//                           <div className="flex flex-col items-center justify-center py-6 text-center">
//                             <UserX className="h-8 w-8 text-gray-300 mb-1.5" />
//                             <p className="text-xs text-gray-500">No users found</p>
//                             <p className="text-[10px] text-gray-400 mt-0.5">Try adjusting your search or filters</p>
//                           </div>
//                         ) : (
//                           filteredUsers.map(user => {
//                             const isSelected = selectedUsers.includes(user.id)
//                             const userRole = roles.find(r => r._id === user.roleId)
                            
//                             return (
//                               <div
//                                 key={user.id}
//                                 className={`flex items-center gap-1.5 p-1.5 rounded cursor-pointer transition-all text-xs ${
//                                   isSelected 
//                                     ? 'bg-blue-50 border border-blue-200' 
//                                     : 'border border-transparent hover:bg-gray-50'
//                                 }`}
//                                 onClick={() => handleUserToggle(user.id)}
//                               >
//                                 <Checkbox
//                                   checked={isSelected}
//                                   onCheckedChange={() => handleUserToggle(user.id)}
//                                   className="h-3 w-3"
//                                 />
//                                 <Avatar className="h-6 w-6">
//                                   <AvatarFallback className="bg-blue-100 text-blue-600 text-[10px]">
//                                     {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
//                                   </AvatarFallback>
//                                 </Avatar>
//                                 <div className="flex-1 min-w-0">
//                                   <div className="flex items-center justify-between mb-0.5">
//                                     <h4 className="font-medium text-gray-900 truncate text-xs">
//                                       {user.firstName} {user.lastName}
//                                     </h4>
//                                     <div className="flex items-center gap-0.5">
//                                       <div className={`h-1.5 w-1.5 rounded-full ${
//                                         user.status === "active" ? "bg-green-500" : "bg-red-500"
//                                       }`} />
//                                       <span className="text-gray-500 text-[10px]">
//                                         {userRole?.renameRole || user.role}
//                                       </span>
//                                     </div>
//                                   </div>
//                                   <p className="text-gray-500 truncate text-[10px]">{user.email}</p>
//                                   {basedOn === 'college' && (user.degree || user.department) && (
//                                     <div className="flex items-center gap-0.5 mt-0.5">
//                                       {user.degree && (
//                                         <span className="text-[9px] bg-gray-100 px-1 py-0.25 rounded">
//                                           {user.degree}
//                                         </span>
//                                       )}
//                                       {user.department && (
//                                         <span className="text-[9px] bg-gray-100 px-1 py-0.25 rounded">
//                                           {user.department}
//                                         </span>
//                                       )}
//                                     </div>
//                                   )}
//                                 </div>
//                               </div>
//                             )
//                           })
//                         )}
//                       </div>
//                     </ScrollArea>
//                   </TabsContent>

//                   {/* Selected Users Tab */}
//                   <TabsContent 
//                     value="selected" 
//                     className="flex-1 flex flex-col p-0 m-0 min-h-0 data-[state=active]:flex"
//                   >
//                     {/* Selected Users Header */}
//                     <div className="p-2 border-b bg-white flex-shrink-0">
//                       <div className="flex items-center justify-between">
//                         <div>
//                           <h3 className="text-xs font-semibold text-gray-900">Selected Users</h3>
//                           <p className="text-[10px] text-gray-500">
//                             {selectedUsers.length} users selected
//                           </p>
//                         </div>
//                         <Button
//                           variant="outline"
//                           size="sm"
//                           onClick={() => setActiveTab("users")}
//                           className="text-xs h-6 px-2"
//                         >
//                           <Users className="h-3 w-3 mr-1" />
//                           Edit
//                         </Button>
//                       </div>
//                     </div>

//                     {/* Selected Users List - Scrollable */}
//                     <ScrollArea className="flex-1">
//                       <div className="p-1.5 space-y-1">
//                         {selectedUsers.length === 0 ? (
//                           <div className="flex flex-col items-center justify-center py-8 text-center">
//                             <UserX className="h-8 w-8 text-gray-300 mb-1.5" />
//                             <p className="text-xs text-gray-500">No users selected</p>
//                             <p className="text-[10px] text-gray-400 mt-0.5">Select users from Users tab</p>
//                           </div>
//                         ) : (
//                           getSelectedUserDetails().map(user => (
//                             <div key={user.id} className="flex items-center gap-1.5 p-1.5 bg-gray-50 rounded border text-xs">
//                               <Avatar className="h-5 w-5">
//                                 <AvatarFallback className="bg-blue-100 text-blue-600 text-[10px]">
//                                   {user.firstName?.charAt(0)}
//                                 </AvatarFallback>
//                               </Avatar>
//                               <div className="flex-1 min-w-0">
//                                 <div className="flex items-center justify-between mb-0.5">
//                                   <p className="font-medium text-gray-900 truncate text-xs">
//                                     {user.firstName} {user.lastName}
//                                   </p>
//                                   <Badge variant="outline" className="text-[9px] px-1 py-0">
//                                     {user.role}
//                                   </Badge>
//                                 </div>
//                                 <p className="text-gray-500 truncate text-[10px]">{user.email}</p>
//                               </div>
//                               <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 onClick={() => handleUserToggle(user.id)}
//                                 className="h-4 w-4 p-0"
//                               >
//                                 <X className="h-2.5 w-2.5" />
//                               </Button>
//                             </div>
//                           ))
//                         )}
//                       </div>
//                     </ScrollArea>
//                   </TabsContent>
//                 </div>
//               </Tabs>
//             </div>

//             {/* Right Panel - Permissions with Categories and Color Coding */}
//             <div className="w-3/5 flex flex-col min-h-0 overflow-hidden">
//               {/* Permissions Header */}
//               <div className="p-2 border-b bg-gray-50 flex-shrink-0">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <h3 className="text-xs font-semibold text-gray-900">Permissions</h3>
//                     <p className="text-[10px] text-gray-500">Select permissions to assign</p>
//                   </div>
//                   <div className="flex items-center gap-1">
//                     <Button
//                       size="sm"
//                       variant="outline"
//                       onClick={handleSelectAllPermissions}
//                       className="h-6 px-1.5 text-xs"
//                     >
//                       <CheckSquare className="h-2.5 w-2.5 mr-1" />
//                       All
//                     </Button>
//                     <Button
//                       size="sm"
//                       variant="outline"
//                       onClick={handleClearAllPermissions}
//                       className="h-6 px-1.5 text-xs text-red-600"
//                     >
//                       <Square className="h-2.5 w-2.5 mr-1" />
//                       Clear
//                     </Button>
//                   </div>
//                 </div>
//               </div>

//               {/* Permissions List with Categories - Scrollable */}
//               <div className="flex-1 min-h-0 overflow-hidden">
//                 <ScrollArea className="h-full">
//                   <div className="p-2 space-y-2">
//                     {permissionCategories.map((category) => {
//                       const isExpanded = expandedCategories.includes(category.key)
//                       const categoryPermissions = getPermissionsByCategory(category.key)
//                       const hasSelected = hasSelectedPermissionsInCategory(category.key)
//                       const selectedCount = getSelectedCountInCategory(category.key)
//                       const totalCount = getTotalCountInCategory(category.key)
//                       const Icon = iconMap[category.icon] || ShieldCheck
//                       const color = colorClasses[category.color] || colorClasses.blue
                      
//                       return (
//                         <div key={category.key} className="border rounded-md overflow-hidden">
//                           {/* Category Header */}
//                           <div 
//                             onClick={() => toggleCategory(category.key)}
//                             className={`p-1.5 cursor-pointer transition-all ${hasSelected ? color.bgLight : 'bg-white hover:bg-gray-50'} border-b`}
//                           >
//                             <div className="flex items-center justify-between">
//                               <div className="flex items-center gap-1.5">
//                                 <div className={`p-0.5 rounded ${hasSelected ? color.bg : color.iconBg}`}>
//                                   <Icon className={`h-3 w-3 ${hasSelected ? 'text-white' : color.text}`} />
//                                 </div>
//                                 <div>
//                                   <h4 className="text-xs font-medium text-gray-900">{category.name}</h4>
//                                   <p className="text-[10px] text-gray-500">
//                                     {selectedCount}/{totalCount} selected
//                                   </p>
//                                 </div>
//                               </div>
//                               <div className="flex items-center gap-1">
//                                 {hasSelected && (
//                                   <Badge variant="secondary" className="text-[10px] px-1 py-0">
//                                     {selectedCount}
//                                   </Badge>
//                                 )}
//                                 {isExpanded ? (
//                                   <ChevronDown className="h-3 w-3 text-gray-400" />
//                                 ) : (
//                                   <ChevronRight className="h-3 w-3 text-gray-400" />
//                                 )}
//                               </div>
//                             </div>
                            
//                             {/* Category Actions */}
//                             <div className="flex items-center gap-1 mt-1">
//                               <Button
//                                 size="sm"
//                                 variant="ghost"
//                                 onClick={(e) => {
//                                   e.stopPropagation()
//                                   handleSelectAllPermissionsInCategory(category.key)
//                                 }}
//                                 className="h-5 px-1 text-[10px]"
//                               >
//                                 Select All
//                               </Button>
//                               {selectedCount > 0 && (
//                                 <Button
//                                   size="sm"
//                                   variant="ghost"
//                                   onClick={(e) => {
//                                     e.stopPropagation()
//                                     handleClearPermissionsInCategory(category.key)
//                                   }}
//                                   className="h-5 px-1 text-[10px] text-red-600"
//                                 >
//                                   Clear
//                                 </Button>
//                               )}
//                             </div>
//                           </div>
                          
//                           {/* Permissions List (Collapsible) */}
//                           {isExpanded && (
//                             <div className="p-1 space-y-1 bg-gray-50">
//                               {categoryPermissions.map(permission => {
//                                 const isSelected = selectedPermissions.includes(permission.key)
//                                 const funcCount = getPermissionFuncCount(permission.key)
//                                 const PermissionIcon = iconMap[permission.icon] || ShieldCheck
//                                 const permissionColor = colorClasses[permission.color] || colorClasses.blue
                                
//                                 return (
//                                   <div key={permission.key} className={`p-1 border rounded transition-all text-xs ${
//                                     isSelected 
//                                       ? `${permissionColor.border} ${permissionColor.bgLight}` 
//                                       : 'border-gray-200 hover:border-gray-300 bg-white'
//                                   }`}>
//                                     {/* Permission Header */}
//                                     <div className="flex items-start justify-between mb-1">
//                                       <div className="flex items-start gap-1 flex-1">
//                                         <div 
//                                           onClick={(e) => {
//                                             e.stopPropagation()
//                                             handlePermissionToggle(permission.key)
//                                           }}
//                                           className={`h-3 w-3 rounded border flex items-center justify-center cursor-pointer mt-0.5 flex-shrink-0 ${
//                                             isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'
//                                           }`}
//                                         >
//                                           {isSelected && <Check className="h-2 w-2 text-white" />}
//                                         </div>
//                                         <div className="flex-1 min-w-0">
//                                           <div className="flex items-center gap-0.5 mb-0.5">
//                                             <div className={`p-0.5 rounded ${permissionColor.iconBg}`}>
//                                               <PermissionIcon className={`h-2.5 w-2.5 ${permissionColor.text}`} />
//                                             </div>
//                                             <h4 className="font-semibold text-gray-900 text-xs">
//                                               {permission.name}
//                                             </h4>
//                                             {funcCount > 0 && (
//                                               <Badge variant="secondary" className="text-[9px] px-1 py-0">
//                                                 {funcCount}
//                                               </Badge>
//                                             )}
//                                           </div>
//                                           <p className="text-gray-500 text-[10px]">
//                                             {permission.description}
//                                           </p>
//                                         </div>
//                                       </div>
                                      
//                                       <div className="flex items-center gap-0.5">
//                                         <Button
//                                           size="sm"
//                                           variant="ghost"
//                                           onClick={(e) => {
//                                             e.stopPropagation()
//                                             handleSelectAllFunctionalities(permission.key)
//                                           }}
//                                           className="h-4 px-1 text-[10px]"
//                                         >
//                                           All
//                                         </Button>
//                                         {funcCount > 0 && (
//                                           <Button
//                                             size="sm"
//                                             variant="ghost"
//                                             onClick={(e) => {
//                                               e.stopPropagation()
//                                               handleClearFunctionalities(permission.key)
//                                             }}
//                                             className="h-4 px-1 text-[10px] text-red-600 hover:text-red-700"
//                                           >
//                                             Clear
//                                           </Button>
//                                         )}
//                                       </div>
//                                     </div>

//                                     {/* Functionalities */}
//                                     {isSelected && permission.functionalities.length > 0 && (
//                                       <div className="mt-1.5 space-y-1">
//                                         <div className="flex items-center justify-between mb-0.5">
//                                           <span className="font-medium text-gray-700 text-[10px]">Functions:</span>
//                                           <span className="text-gray-500 text-[10px]">
//                                             {funcCount}/{permission.functionalities.length}
//                                           </span>
//                                         </div>
//                                         <div className="grid grid-cols-2 gap-1">
//                                           {permission.functionalities.map(func => {
//                                             const isFuncSelected = selectedFunctionalities[permission.key]?.includes(func.id) || false
                                            
//                                             return (
//                                               <div
//                                                 key={func.id}
//                                                 className="flex items-start gap-0.5 p-0.5 hover:bg-white rounded border border-gray-200 cursor-pointer transition-colors"
//                                                 onClick={(e) => {
//                                                   e.stopPropagation()
//                                                   handleFunctionalityToggle(permission.key, func.id)
//                                                 }}
//                                               >
//                                                 <div className={`h-2 w-2 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
//                                                   isFuncSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'
//                                                 }`}>
//                                                   {isFuncSelected && <Check className="h-1 w-1 text-white" />}
//                                                 </div>
//                                                 <div className="flex-1 min-w-0">
//                                                   <h5 className="font-medium text-gray-900 text-[10px]">
//                                                     {func.label}
//                                                   </h5>
//                                                   <p className="text-gray-500 text-[9px] mt-0.25">
//                                                     {func.description}
//                                                   </p>
//                                                 </div>
//                                               </div>
//                                             )
//                                           })}
//                                         </div>
//                                       </div>
//                                     )}

//                                     {/* No functionalities message */}
//                                     {isSelected && permission.functionalities.length === 0 && (
//                                       <div className="mt-1.5">
//                                         <div className="flex items-center justify-center p-1 bg-gray-50 rounded border border-dashed border-gray-300">
//                                           <span className="text-gray-400 text-[10px]">No functions available</span>
//                                         </div>
//                                       </div>
//                                     )}
//                                   </div>
//                                 )
//                               })}
//                             </div>
//                           )}
//                         </div>
//                       )
//                     })}
//                   </div>
//                 </ScrollArea>
//               </div>
//             </div>
//           </div>

//           {/* Footer */}
//           <DialogFooter className="p-2 border-t bg-white flex-shrink-0">
//             <div className="flex items-center justify-between w-full">
//               <div className="text-[10px] text-gray-600">
//                 {selectedUsers.length > 0 ? (
//                   <div className="flex items-center gap-1">
//                     <UserCheck className="h-3 w-3 text-green-600" />
//                     <span>
//                       Assigning to <strong className="text-gray-900">{selectedUsers.length}</strong> user{selectedUsers.length > 1 ? 's' : ''}
//                     </span>
//                   </div>
//                 ) : (
//                   <div className="flex items-center gap-1">
//                     <UserX className="h-3 w-3 text-amber-600" />
//                     <span className="text-amber-700 font-medium">Select users first</span>
//                   </div>
//                 )}
//               </div>
              
//               <div className="flex gap-1.5">
//                 <Button
//                   variant="outline"
//                   onClick={handleClearAll}
//                   size="sm"
//                   className="h-7 px-2 text-xs"
//                   disabled={selectedUsers.length === 0 && selectedPermissions.length === 0}
//                 >
//                   Clear All
//                 </Button>
//                 <Button
//                   variant="outline"
//                   onClick={onClose}
//                   disabled={bulkUpdateMutation.isPending}
//                   size="sm"
//                   className="h-7 px-2 text-xs"
//                 >
//                   Cancel
//                 </Button>
//                 <Button
//                   onClick={handleSave}
//                   disabled={bulkUpdateMutation.isPending || selectedUsers.length === 0 || selectedPermissions.length === 0}
//                   className="bg-blue-600 hover:bg-blue-700 h-7 px-2 text-xs"
//                   size="sm"
//                 >
//                   {bulkUpdateMutation.isPending ? (
//                     <>
//                       <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
//                       Assigning...
//                     </>
//                   ) : (
//                     <>
//                       <Save className="h-2.5 w-2.5 mr-1" />
//                       Assign
//                     </>
//                   )}
//                 </Button>
//               </div>
//             </div>
//           </DialogFooter>
//         </div>
//       </DialogContent>
//     </Dialog>
//   )
// }