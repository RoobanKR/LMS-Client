// components/TopBar.tsx
import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Layout, Bot, Sparkles, Sun, Moon, User, Settings, LogOut, BookOpen, ChevronDown, FileText, Bell, EyeOff } from "lucide-react"
import { T } from "./types/constants"
import { userPermission } from "@/apiServices/tokenVerify"
import { postLogout } from "@/apiServices/activityLog"
import { RoleSwitchState } from "./types/types"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notificationsService } from "@/apiServices/notifications"
import { notificationKeys } from "@/apiServices/notifications"
import { cn } from "@/lib/utils"

interface TopBarProps {
  items: Array<{ label: string; icon?: React.ComponentType<any>; onClick?: () => void; isLast?: boolean }>
  onAIClick: () => void
  onSummaryClick: () => void
  onMenuClick: () => void
  onNotesClick?: () => void
  onHideHeader?: () => void
}

export const TopBar: React.FC<TopBarProps> = ({ items, onAIClick, onSummaryClick, onMenuClick, onNotesClick, onHideHeader }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [userOpen, setUserOpen] = useState(false)
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false)
  const [isDummyStudent, setIsDummyStudent] = useState(false)
  const [originalRoleInfo, setOriginalRoleInfo] = useState<{ roleName: string; renameRole: string } | null>(null)
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string; role: { roleName: string; renameRole: string } } | null>(null)
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Fetch notifications
  const { data: notificationsData } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => notificationsService.fetchNotifications(),
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem("smartcliff_token"),
  })

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })

  const checkDummyStatus = () => {
    try {
      const raw = localStorage.getItem('smartcliff_roleSwitch')
      if (raw) {
        const d: RoleSwitchState = JSON.parse(raw)
        setIsDummyStudent(d.isDummyStudent || false)
        if (d.originalRole || d.originalRenameRole) {
          setOriginalRoleInfo({ roleName: d.originalRole || '', renameRole: d.originalRenameRole || '' })
        }
      } else {
        setIsDummyStudent(false)
        setOriginalRoleInfo(null)
      }
    } catch { }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as 'light' | 'dark'
      const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
      const t = saved || (sys ? 'dark' : 'light')
      setThemeState(t)
      if (t === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch { }
    checkDummyStatus()
    try {
      const raw = localStorage.getItem('smartcliff_userData') || localStorage.getItem('smartcliff_user') || localStorage.getItem('currentUser')
      if (raw) setUser(JSON.parse(raw))
    } catch { }
  }, [])

  useEffect(() => {
    const h = () => checkDummyStatus()
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setShowNotificationsDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    const n = theme === 'light' ? 'dark' : 'light'
    setThemeState(n)
    if (n === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', n)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Record logout time / session duration before the token is cleared.
      await postLogout()
      localStorage.removeItem('smartcliff_roleSwitch')
      localStorage.removeItem('smartcliff_isDummyStudent')
      localStorage.clear()
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleSwitchToStudent = () => {
    try {
      const d: RoleSwitchState = {
        isDummyStudent: true,
        originalRole: user?.role?.roleName || '',
        originalRenameRole: user?.role?.renameRole || '',
        switchTimestamp: Date.now()
      }
      localStorage.setItem('smartcliff_roleSwitch', JSON.stringify(d))
      localStorage.setItem('smartcliff_isDummyStudent', 'true')
      setIsDummyStudent(true)
      setOriginalRoleInfo({ roleName: user?.role?.roleName || '', renameRole: user?.role?.renameRole || '' })
      setUserOpen(false)
      router.push('/lms/pages/courses')
      setTimeout(() => window.dispatchEvent(new Event('storage')), 100)
    } catch { }
  }

  const handleSwitchBack = () => {
    try {
      localStorage.removeItem('smartcliff_roleSwitch')
      localStorage.removeItem('smartcliff_isDummyStudent')
      setIsDummyStudent(false)
      setOriginalRoleInfo(null)
      setUserOpen(false)
      const r = originalRoleInfo?.renameRole?.toLowerCase() || ''
      if (r.includes('poc')) router.push('/lms/pages/poc/dashboard')
      else if (r.includes('admin')) router.push('/lms/pages/admin/dashboard')
      else router.push('/lms/pages/dashboard')
      setTimeout(() => window.dispatchEvent(new Event('storage')), 100)
    } catch { }
  }

  const isActualStudent = () => {
    if (user) {
      if (user.role?.roleName?.toLowerCase().includes('student')) return true
      if (user.role?.renameRole?.toLowerCase().includes('student')) return true
    }
    try {
      const renameRole = localStorage.getItem('smartcliff_renameRole')
      if (renameRole?.toLowerCase().includes('student')) return true
      const roleVal = localStorage.getItem('smartcliff_roleValue')
      if (roleVal?.toLowerCase().includes('student')) return true
    } catch { }
    return false
  }

  const getInitials = () => {
    if (!user) return 'SC'
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const notifications = notificationsData?.notifications || []
  const unreadCount = notificationsData?.unreadCount || 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 48, background: '#f5f9ff', flexShrink: 0, position: 'relative', borderBottom: '1px solid #e2e8f0' }}>
      {/* Mobile Menu Button */}
      <button onClick={onMenuClick} className="lg:hidden"
        style={{ padding: 6, borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
        <Layout size={15} />
      </button>

      {/* Breadcrumb */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {items.map((item, i) => {
          const isLast = item.isLast || i === items.length - 1

          return (
            <React.Fragment key={i}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  borderRadius: 4,
                  cursor: !isLast ? 'pointer' : 'default',
                  flexShrink: 0,
                  transition: 'background .12s ease',
                }}
                onClick={!isLast ? item.onClick : undefined}
                onMouseEnter={e => {
                  if (!isLast) {
                    (e.currentTarget as HTMLElement).style.background = '#f1f5f9'
                  }
                }}
                onMouseLeave={e => {
                  if (!isLast) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                {item.icon &&
                  React.createElement(item.icon, {
                    size: 13,
                    style: {
                      color: isLast ? '#1e293b' : '#64748b',
                      flexShrink: 0,
                    },
                  })}

                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isLast ? 600 : 500,
                    color: isLast ? '#1e293b' : '#64748b',
                    whiteSpace: 'nowrap',
                    transition: 'color .12s',
                    padding: '0 1px',
                  }}
                  onMouseEnter={e => {
                    if (!isLast)
                      (e.currentTarget as HTMLElement).style.color = '#3b82f6'
                  }}
                  onMouseLeave={e => {
                    if (!isLast)
                      (e.currentTarget as HTMLElement).style.color = '#64748b'
                  }}
                >
                  {item.label}
                </span>

                {isLast && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '1px 5px',
                      borderRadius: 12,
                      fontSize: '9px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      background: '#2263c5',
                      color: '#fff',
                      marginLeft: 4,
                    }}
                  >
                    LIVE
                  </span>
                )}
              </div>

              {!isLast && (
                <ChevronRight
                  size={11}
                  style={{
                    color: '#cbd5e1',
                    flexShrink: 0,
                    margin: '0 2px',
                  }}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Icon action group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

        {/* Hide Header */}
        {onHideHeader && (
          <button
            onClick={onHideHeader}
            title="Hide header"
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #e2e8f0', background: '#ffffff',
              color: '#64748b', cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#fef2f2'; el.style.borderColor = '#fca5a5'; el.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = '#ffffff'; el.style.borderColor = '#e2e8f0'; el.style.color = '#64748b'
            }}
          >
            <EyeOff size={14} />
          </button>
        )}

        {/* Notes */}
        <button
          onClick={() => {
            if (!onNotesClick || notesLoading) return
            setNotesLoading(true)
            onNotesClick()
            const timer = setTimeout(() => setNotesLoading(false), 1200)
            return () => clearTimeout(timer)
          }}
          title="Notes"
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid #e2e8f0', background: '#ffffff',
            color: '#64748b', cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#f0f9ff'; el.style.borderColor = '#93c5fd'; el.style.color = '#2563eb'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#ffffff'; el.style.borderColor = '#e2e8f0'; el.style.color = '#64748b'
          }}
        >
          {notesLoading ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: 'spin 0.7s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <FileText size={14} />
          )}
        </button>

        {/* Notifications */}
        <div ref={notificationRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
            title="Notifications"
            style={{
              position: 'relative',
              width: 32, height: 32, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${showNotificationsDropdown ? '#93c5fd' : '#e2e8f0'}`,
              background: showNotificationsDropdown ? '#eff6ff' : '#ffffff',
              color: showNotificationsDropdown ? '#2563eb' : '#64748b',
              cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => {
              if (!showNotificationsDropdown) {
                const el = e.currentTarget as HTMLElement
                el.style.background = '#f0f9ff'; el.style.borderColor = '#93c5fd'; el.style.color = '#2563eb'
              }
            }}
            onMouseLeave={e => {
              if (!showNotificationsDropdown) {
                const el = e.currentTarget as HTMLElement
                el.style.background = '#ffffff'; el.style.borderColor = '#e2e8f0'; el.style.color = '#64748b'
              }
            }}
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -3,
                height: 15, minWidth: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 9999, background: '#ef4444',
                color: '#fff', fontSize: '8px', fontWeight: 'bold', padding: '0 3px',
                border: '1.5px solid #fff',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

        {/* Notifications Dropdown */}
        {showNotificationsDropdown && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowNotificationsDropdown(false)} />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 320,
                borderRadius: 12,
                background: T.bg,
                border: `1px solid ${T.line}`,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                zIndex: 11,
                overflow: 'hidden',
                animation: 'fadeIn .15s ease both',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '10px 14px',
                  borderBottom: `1px solid ${T.line}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: T.textMain }}>Notifications</h3>
                  {unreadCount > 0 && (
                    <p style={{ fontSize: '10px', color: T.textMuted, marginTop: 2 }}>{unreadCount} unread</p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#3b82f6',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notifications List */}
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                    <Bell size={24} style={{ color: T.textMuted, opacity: 0.4, marginBottom: 8 }} />
                    <p style={{ fontSize: '11px', color: T.textMuted }}>No notifications</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => markAsReadMutation.mutate(n._id)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: `1px solid ${T.line}`,
                        cursor: 'pointer',
                        transition: 'background .12s',
                        background: !n.isRead ? 'rgba(59,130,246,0.04)' : 'transparent',
                        display: 'flex',
                        gap: 10,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = T.pageBg
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = !n.isRead ? 'rgba(59,130,246,0.04)' : 'transparent'
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: !n.isRead ? '#3b82f6' : '#cbd5e1',
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: !n.isRead ? 700 : 500,
                            color: !n.isRead ? T.textMain : T.textSub,
                            marginBottom: 2,
                          }}
                        >
                          {n.title}
                        </p>
                        <p
                          style={{
                            fontSize: '10px',
                            color: T.textMuted,
                            lineHeight: 1.4,
                          }}
                        >
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
        </div>{/* end notifications */}
      </div>{/* end icon action group */}

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} />

      {/* User Menu */}
      <div ref={userRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setUserOpen(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', borderRadius: 8, border: `1px solid ${T.border}`, background: userOpen ? T.pageBg : 'transparent', cursor: 'pointer', transition: 'all .12s' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.pageBg}
          onMouseLeave={e => { if (!userOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg,#8b5cf6,#d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '9px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em', boxShadow: '0 1px 3px rgba(139,92,246,0.25)' }}>
            {getInitials()}
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: T.textMain }}>{user?.firstName || 'Student'}</div>
            <div style={{ fontSize: '9px', color: isDummyStudent ? '#d97706' : T.textMuted, fontWeight: isDummyStudent ? 600 : 400 }}>
              {isDummyStudent ? '⚡ Student View' : user?.role?.renameRole || 'Account'}
            </div>
          </div>
          <ChevronDown size={11} style={{ color: T.textMuted, transform: userOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
        </button>

        {/* User Dropdown (existing content remains the same) */}
        {userOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setUserOpen(false)} />
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 256, borderRadius: 12, background: T.bg, border: `1px solid ${T.line}`, boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', zIndex: 11, overflow: 'hidden', animation: 'fadeIn .15s ease both' }}>
              {/* User Info Header */}
              <div style={{ padding: '12px 14px', background: T.pageBg, borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px', fontWeight: 800, color: '#fff', boxShadow: '0 2px 6px rgba(139,92,246,0.30)' }}>
                  {getInitials()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: T.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{ fontSize: '11px', color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                    {user?.email}
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', marginTop: 4, padding: '2px 7px', borderRadius: 5, fontSize: '10px', fontWeight: 600,
                    background: isDummyStudent ? 'rgba(217,119,6,0.12)' : 'rgba(139,92,246,0.10)',
                    color: isDummyStudent ? '#d97706' : '#7c3aed'
                  }}>
                    {isDummyStudent ? '⚡ Student View' : user?.role?.renameRole || 'Account'}
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: '6px' }}>
                {/* Switch to Student View */}
                {!isActualStudent() && !isDummyStudent && (
                  <button onClick={handleSwitchToStudent}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s', marginBottom: 2 }}
                    onMouseEnter={e => { const b = e.currentTarget.querySelector('div') as HTMLElement; if (b) { b.style.background = '#2563eb'; b.style.color = '#fff' }; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.07)' }}
                    onMouseLeave={e => { const b = e.currentTarget.querySelector('div') as HTMLElement; if (b) { b.style.background = 'rgba(59,130,246,0.10)'; b.style.color = '#3b82f6' }; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .12s', color: '#3b82f6' }}>
                      <User size={13} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>Switch to Student</div>
                      <div style={{ fontSize: '10px', color: T.textMuted }}>Preview student experience</div>
                    </div>
                  </button>
                )}

                {/* Switch Back from Student View */}
                {isDummyStudent && originalRoleInfo && (
                  <button onClick={handleSwitchBack}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s', marginBottom: 2 }}
                    onMouseEnter={e => { const b = e.currentTarget.querySelector('div') as HTMLElement; if (b) { b.style.background = '#d97706'; b.style.color = '#fff' }; (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,6,0.08)' }}
                    onMouseLeave={e => { const b = e.currentTarget.querySelector('div') as HTMLElement; if (b) { b.style.background = 'rgba(217,119,6,0.10)'; b.style.color = '#d97706' }; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(217,119,6,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .12s', color: '#d97706' }}>
                      <Sparkles size={13} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>Back to {originalRoleInfo.renameRole}</div>
                      <div style={{ fontSize: '10px', color: T.textMuted }}>Return to original role</div>
                    </div>
                  </button>
                )}

                <div style={{ height: 1, background: T.line, margin: '4px 4px 6px' }} />

                {/* My Profile */}
                <button onClick={() => { setUserOpen(false); router.push('/lms/pages/studentdashboard/student/profile') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <User size={13} style={{ color: T.inkMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: T.textMain }}>My Profile</span>
                </button>

                {/* Settings */}
                <button onClick={() => setUserOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <Settings size={13} style={{ color: T.inkMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: T.textMain }}>Settings</span>
                </button>

                {/* Help & Support */}
                <button onClick={() => setUserOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <BookOpen size={13} style={{ color: T.inkMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: T.textMain }}>Help & Support</span>
                </button>
              </div>

              {/* Sign Out */}
              <div style={{ padding: '6px', borderTop: `1px solid ${T.line}` }}>
                <button onClick={handleLogout} disabled={isLoggingOut}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <LogOut size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444' }}>{isLoggingOut ? 'Signing out…' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add CSS animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}