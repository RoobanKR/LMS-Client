"use client"

import {
  Bell,
  User,
  Settings,
  Menu,
  Sparkles,
  ChevronDown,
  Search,
  X,
  LogOut,
  HelpCircle,
  MessageSquare,
  Zap,
  Sun,
  Moon,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { notificationsService } from "@/apiServices/notifications"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationKeys } from "@/apiServices/notifications"
import { getCurrentUser } from "@/apiServices/tokenVerify"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface StudentNavbarProps {
  onMenuClick?: () => void
  onAIClick?: () => void
  onSummaryClick?: () => void
  isSidebarOpen?: boolean
  activeRoute?: string
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

// --- Components ---

// 1. Premium Icon Button with Dark Mode
const NavIconButton = ({ Icon, onClick, badge, isActive, className, pingColor = "bg-red-500" }: any) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group",
        isActive 
          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-800/30" 
          : "bg-white text-slate-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-gray-300 border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600",
        className
      )}
    >
      <Icon className="w-5 h-5 transition-transform group-hover:scale-105" strokeWidth={2} />
      
      {(badge && badge > 0) && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", pingColor)}></span>
            <span className={cn("relative inline-flex rounded-full h-3.5 w-3.5 items-center justify-center text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-800", pingColor)}>
                {badge > 9 ? '9+' : badge}
            </span>
        </span>
      )}
    </button>
  )
}



export function StudentNavbar({
  onMenuClick,
  onAIClick,
  onSummaryClick,
}: StudentNavbarProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // State
  const [showAISubmenu, setShowAISubmenu] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Refs
  const notificationRef = useRef<HTMLDivElement>(null)
  const aiRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark'
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    localStorage.setItem('theme', newTheme)
  }

  // --- Data Fetching ---
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem("smartcliff_token"),
  })
  const user: CurrentUser | null = userData?.user || null

  // Notifications
  const { data: notificationsData } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsService.fetchNotifications(),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  })

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setShowNotificationsDropdown(false)
      if (aiRef.current && !aiRef.current.contains(event.target as Node)) setShowAISubmenu(false)
      if (userRef.current && !userRef.current.contains(event.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handlers
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      localStorage.clear()
      toast.success("Logged out successfully")
      router.push("/login")
    } catch (error) {
      toast.error("Logout failed")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleProfileClick = () => {
    setShowUserMenu(false) // Close the dropdown
    router.push("/lms/pages/studentdashboard/student/profile") // Navigate to profile page
  }

  const getUserInitials = () => {
    if (!user) return "SC"
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const notifications = notificationsData?.notifications || []
  const unreadCount = notificationsData?.unreadCount || 0
  
  return (
    <header 
        className={cn(
            "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
            // FIXED STYLE: Always apply height, glass effect, and bottom border
            "h-[72px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-gray-800 shadow-sm"
        )}
    >
      <div className="flex h-full items-center justify-between px-4 lg:px-6 gap-6 max-w-[1920px] mx-auto">
        
        {/* --- LEFT: Hamburger & Brand --- */}
        <div className="flex items-center gap-4">
            <button
                onClick={onMenuClick}
                className="p-2.5 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-300 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-gray-700"
            >
                <Menu className="w-5 h-5 stroke-[2.5px]" />
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-slate-200 dark:bg-gray-700 hidden sm:block"></div>

            <div className="hidden sm:flex flex-col">
                <h1 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight leading-none">
                    Dashboard
                </h1>
                <p className="text-[10px] font-medium text-slate-500 dark:text-gray-400 mt-0.5">
                    Welcome back, <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user?.firstName || 'Student'}</span>
                </p>
            </div>
        </div>

        {/* --- CENTER: Search Bar --- */}
        <div className="flex-1 max-w-xl px-4">
             {showMobileSearch ? (
                 <div className="absolute inset-0 bg-white dark:bg-gray-900 z-50 flex items-center px-4 animate-in fade-in slide-in-from-top-2 border-b border-slate-200 dark:border-gray-800">
                    <Search className="w-5 h-5 text-slate-400 dark:text-gray-500 mr-3" />
                    <input 
                       autoFocus
                       type="text" 
                       placeholder="Search..." 
                       className="flex-1 bg-transparent border-none outline-none text-base text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 h-full"
                    />
                    <button onClick={() => setShowMobileSearch(false)} className="p-2 bg-slate-100 dark:bg-gray-800 rounded-lg ml-2">
                        <X className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                    </button>
                 </div>
             ) : (
                <div className="relative group w-full hidden md:block">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400 dark:text-gray-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search for courses, assignments..."
                        className="w-full h-10 pl-10 pr-12 bg-slate-100/50 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-xl text-sm font-medium text-slate-700 dark:text-gray-300 placeholder-slate-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-indigo-300 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                        <kbd className="hidden lg:inline-flex h-6 select-none items-center gap-1 rounded border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-slate-400 dark:text-gray-500 shadow-sm">
                            ⌘ K
                        </kbd>
                    </div>
                </div>
             )}
             
             {/* Mobile Search Trigger */}
             <button 
                className="md:hidden ml-auto p-2 text-slate-500 dark:text-gray-400"
                onClick={() => setShowMobileSearch(true)}
             >
                <Search className="w-5 h-5" />
             </button>
        </div>

        {/* --- RIGHT: Action Dock --- */}
        <div className="flex items-center gap-2 sm:gap-3">

            {/* 1. AI "Magic" Button */}
            <div className="relative hidden sm:block" ref={aiRef}>
                <button
                    onClick={() => setShowAISubmenu(!showAISubmenu)}
                    className={cn(
                        "flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full transition-all border shadow-sm group",
                        showAISubmenu 
                            ? "bg-slate-900 dark:bg-gray-800 text-white border-slate-900 dark:border-gray-700" 
                            : "bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md"
                    )}
                >
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full p-1 text-white">
                        <Sparkles className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-semibold pr-1">Ask AI</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform opacity-50", showAISubmenu ? "rotate-180 text-white" : "")} />
                </button>

                {/* AI Menu */}
                {showAISubmenu && (
                    <div className="absolute top-full right-0 mt-3 w-60 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-gray-900 ring-1 ring-black/5 dark:ring-white/10 p-2 z-50 animate-in fade-in zoom-in-95 origin-top-right border border-slate-100 dark:border-gray-700">
                        <button onClick={onAIClick} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors text-left group">
                            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-gray-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                <MessageSquare className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-white">Chat Assistant</p>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400">Ask questions instantly</p>
                            </div>
                        </button>
                        <button onClick={onSummaryClick} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors text-left group">
                            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-gray-700 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 dark:group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <Zap className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-800 dark:text-white">Generate Summary</p>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400">Summarize current content</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* 2. Notifications */}
            <div ref={notificationRef} className="relative">
                <NavIconButton 
                    Icon={Bell} 
                    badge={unreadCount} 
                    isActive={showNotificationsDropdown}
                    onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                />

                {/* Dropdown */}
                {showNotificationsDropdown && (
                    <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-slate-200 dark:shadow-gray-900 ring-1 ring-black/5 dark:ring-white/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right border border-slate-100 dark:border-gray-700">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                            <span className="font-bold text-slate-800 dark:text-white text-sm">Notifications</span>
                            {unreadCount > 0 && (
                                <button onClick={() => markAllAsReadMutation.mutate()} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 dark:text-gray-500 text-xs">No notifications</div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n._id} onClick={() => markAsReadMutation.mutate(n._id)} className={cn(
                                        "p-4 border-b border-slate-50 dark:border-gray-700 cursor-pointer transition-colors flex gap-3", 
                                        !n.isRead 
                                            ? "bg-indigo-50/30 dark:bg-indigo-900/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30" 
                                            : "hover:bg-slate-50 dark:hover:bg-gray-700"
                                    )}>
                                        <div className={cn("h-2 w-2 rounded-full mt-1.5 flex-shrink-0", !n.isRead ? "bg-indigo-500 dark:bg-indigo-400" : "bg-slate-200 dark:bg-gray-600")}></div>
                                        <div>
                                            <p className={cn("text-xs mb-0.5", !n.isRead ? "font-bold text-slate-800 dark:text-white" : "font-medium text-slate-600 dark:text-gray-400")}>{n.title}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-gray-500 line-clamp-2">{n.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Vertical Divider */}
            <div className="w-px h-8 bg-slate-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

            {/* 3. User Profile Pill */}
            <div ref={userRef} className="relative">
                <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={cn(
                        "flex items-center gap-3 pl-1 pr-2 py-1 rounded-xl transition-all duration-200 outline-none",
                        showUserMenu 
                            ? "bg-slate-100 dark:bg-gray-700" 
                            : "hover:bg-slate-50 dark:hover:bg-gray-700"
                    )}
                >
                    {userLoading ? (
                        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-gray-700 animate-pulse" />
                    ) : (
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-sm">
                            <div className="h-full w-full rounded-[6px] bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{getUserInitials()}</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="hidden lg:flex flex-col items-start mr-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-white leading-none">{user?.firstName || 'Student'}</span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-gray-400 mt-0.5">{user?.role?.renameRole || 'Account'}</span>
                    </div>
                    
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-slate-400 dark:text-gray-400", showUserMenu ? "rotate-180 text-slate-600 dark:text-gray-300" : "")} />
                </button>

                {/* User Dropdown */}
                {showUserMenu && (
                    <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-gray-900 ring-1 ring-black/5 dark:ring-white/10 z-50 animate-in fade-in zoom-in-95 origin-top-right overflow-hidden border border-slate-100 dark:border-gray-700">
                        {/* Header Gradient */}
                        <div className="h-20 bg-gradient-to-br from-indigo-600 to-purple-700 relative">
                             <div className="absolute -bottom-5 left-5">
                                 <div className="h-14 w-14 rounded-xl bg-white dark:bg-gray-800 p-1 shadow-md">
                                     <div className="h-full w-full bg-slate-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                         {getUserInitials()}
                                     </div>
                                 </div>
                             </div>
                        </div>
                        
                        <div className="pt-7 px-5 pb-3 border-b border-slate-100 dark:border-gray-700">
                            <h3 className="font-bold text-slate-900 dark:text-white">{user?.firstName} {user?.lastName}</h3>
                            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium truncate">{user?.email}</p>
                        </div>

                        <div className="p-2 space-y-0.5">
                            <button 
                              onClick={handleProfileClick}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 text-xs font-semibold text-slate-600 dark:text-gray-300 transition-colors text-left"
                            >
                                <User className="w-4 h-4 text-slate-400 dark:text-gray-500" /> My Profile
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 text-xs font-semibold text-slate-600 dark:text-gray-300 transition-colors text-left">
                                <Settings className="w-4 h-4 text-slate-400 dark:text-gray-500" /> Settings
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 text-xs font-semibold text-slate-600 dark:text-gray-300 transition-colors text-left">
                                <HelpCircle className="w-4 h-4 text-slate-400 dark:text-gray-500" /> Help & Support
                            </button>
                        </div>

                        <div className="p-2 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/50">
                            <button 
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 text-xs font-bold transition-colors"
                            >
                                {isLoggingOut ? <span className="animate-spin">⏳</span> : <LogOut className="w-3.5 h-3.5" />}
                                Sign Out
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
      </div>
    </header>
  )
}