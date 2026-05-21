// components/TabBar.tsx  (also contains TopBar — kept for backward compat)
import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Layout, Bot, Sparkles, Sun, Moon, User, Settings, LogOut, BookOpen, ChevronDown, Eye } from "lucide-react"
import { T, FONT_PRIMARY } from "./types/constants"
import { userPermission } from "@/apiServices/tokenVerify"
import { RoleSwitchState } from "./types/types"

interface TopBarProps {
  items: Array<{ label: string; icon?: React.ComponentType<any>; onClick?: () => void; isLast?: boolean }>
  onAIClick: () => void
  onSummaryClick: () => void
  onMenuClick: () => void
  showAIChat?: boolean
  showSummary?: boolean
}

export const TopBar: React.FC<TopBarProps> = ({ items, onAIClick, onSummaryClick, onMenuClick, showAIChat = false, showSummary = false }) => {
  const router = useRouter()
  const [userOpen, setUserOpen] = useState(false)
  const [isDummyStudent, setIsDummyStudent] = useState(false)
  const [originalRoleInfo, setOriginalRoleInfo] = useState<{ roleName: string; renameRole: string } | null>(null)
  const [user, setUser] = useState<{ firstName: string; lastName: string; email: string; role: { roleName: string; renameRole: string } } | null>(null)
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

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
    const h = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
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

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '0 14px', height: 50,
      background: '#f5f9ff', flexShrink: 0, position: 'relative',
      fontFamily: FONT_PRIMARY,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <button onClick={onMenuClick} className="lg:hidden"
        style={{ padding: 6, borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
        <Layout size={15} />
      </button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0, overflow: 'hidden' }}>
        {items.map((item, i) => {
          const isLast = item.isLast || i === items.length - 1
          const isNav = i <= 1
          return (
            <React.Fragment key={i}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                padding: '0',
                cursor: !isLast ? 'pointer' : 'default',
                flexShrink: 0
              }}
                onClick={item.onClick}
              >
                {item.icon && (
                  <item.icon size={10} style={{ color: isLast ? '#2563eb' : '#6b7280', flexShrink: 0 }} />
                )}
                <span style={{
                  fontSize: isLast ? '11.5px' : '10.5px',
                  fontWeight: isLast ? 700 : 500,
                  color: isLast ? '#1e3a8a' : '#4b5563',
                  padding: '1px 2px', borderRadius: 4,
                  background: isLast ? 'rgba(37,99,235,0.10)' : 'transparent',
                  transition: 'all .12s',
                  whiteSpace: 'nowrap',
                  textDecoration: item.onClick && !isLast ? 'none' : 'none',
                }}>
                  {item.label}
                </span>
              </div>
              {!isLast && <ChevronRight size={9} style={{ color: '#9ca3af', flexShrink: 0, margin: '0 2px' }} />}
            </React.Fragment>
          )
        })}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          onClick={onSummaryClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
            borderRadius: 8, border: `1px solid ${showSummary ? T.orange : T.border}`,
            background: showSummary ? T.orangeTint : 'transparent',
            color: showSummary ? T.orange : T.textMuted,
            fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
          }}
        >
          <Sparkles size={12} /><span className="hidden sm:inline">Summary</span>
        </button>
        <button
          onClick={onAIClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
            borderRadius: 8, border: `1px solid ${showAIChat ? T.orange : T.border}`,
            background: showAIChat ? T.orangeTint : 'transparent',
            color: showAIChat ? T.orange : T.textMuted,
            fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
          }}
        >
          <Bot size={12} /><span className="hidden sm:inline">Ask AI</span>
        </button>

        {/* User dropdown */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setUserOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
              borderRadius: 8, border: `1px solid ${userOpen ? T.orange : T.border}`,
              background: userOpen ? T.orangeTint : 'transparent',
              cursor: 'pointer', transition: 'all .15s',
            }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: 8,
              background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, color: '#fff',
            }}>
              {getInitials()}
            </div>
            <ChevronDown size={11} style={{ color: T.textMuted, transition: 'transform .15s', transform: userOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {userOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              background: '#fff', borderRadius: 12, border: `1px solid ${T.border}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 100,
              minWidth: 210, overflow: 'hidden',
              animation: 'fadeIn .15s ease both',
            }}>
              {/* User info */}
              <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.line}`, background: T.pageBg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {getInitials()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 700, color: T.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user ? `${user.firstName} ${user.lastName}` : 'Student'}
                    </p>
                    <p style={{ margin: 0, fontSize: '10.5px', color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.email || ''}
                    </p>
                  </div>
                </div>
                {isDummyStudent && (
                  <div style={{ marginTop: 8, padding: '4px 8px', borderRadius: 6, background: 'rgba(242,119,87,0.10)', border: `1px solid rgba(242,119,87,0.25)` }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: T.orange }}>👁 Viewing as Student</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '6px' }}>
                <button onClick={() => { setUserOpen(false); router.push('/lms/pages/studentdashboard/student/profile') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <User size={13} style={{ color: T.inkMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: T.textMain }}>My Profile</span>
                </button>
                <button onClick={() => setUserOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <Settings size={13} style={{ color: T.inkMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: T.textMain }}>Settings</span>
                </button>
                <button onClick={() => setUserOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <BookOpen size={13} style={{ color: T.inkMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: T.textMain }}>Help & Support</span>
                </button>

                {!isActualStudent() && !isDummyStudent && (
                  <button onClick={handleSwitchToStudent}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(242,119,87,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <Eye size={13} style={{ color: T.orange, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: T.orange }}>View as Student</span>
                  </button>
                )}
                {isDummyStudent && (
                  <button onClick={handleSwitchBack}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(242,119,87,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <Eye size={13} style={{ color: T.orange, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: T.orange }}>Switch Back to {originalRoleInfo?.renameRole || 'Admin'}</span>
                  </button>
                )}
              </div>
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
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TabBar ────────────────────────────────────────────────────────────────────
// Overview tab config
const OVERVIEW_CFG = {
  label: "Overview",
  icon: <img src="/icons/overview.png" alt="Overview"
    style={{
      width: 18,
      height: 18,
      objectFit: 'contain',
      display: 'block',
      background: '#ffffff',
      borderRadius: 4,
      padding: 2,
    }}
    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
  />,
  color: T.orange,         // orange — blends with site theme
  bg: "rgba(242,119,87,0.10)",
  shadow: "rgba(242,119,87,0.30)",
} as const
const TAB_CFG = {
  I_Do: {
    label: "I Do",
    icon: <img src="/icons/ido.png" alt="I Do" style={{
      width: 18, height: 18, objectFit: 'contain', display: 'block',
      background: '#ffffff', borderRadius: 4, padding: 2,
    }} />,
    color: "#F27757",
    bg: "rgba(242,119,87,0.10)",
    shadow: "rgba(242,119,87,0.30)"
  },
  We_Do: {
    label: "We Do",
    icon: <img src="/icons/wedo.png" alt="We Do" style={{
      width: 18, height: 18, objectFit: 'contain', display: 'block',
      background: '#ffffff', borderRadius: 4, padding: 2,
    }} />,
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.10)",
    shadow: "rgba(59,130,246,0.30)"
  },
  You_Do: {
    label: "You Do",
    icon: <img src="/icons/youdo.png" alt="You Do" style={{
      width: 18, height: 18, objectFit: 'contain', display: 'block',
      background: '#ffffff', borderRadius: 4, padding: 2,
    }} />,
    color: "#10B981",
    bg: "rgba(16,185,129,0.10)",
    shadow: "rgba(16,185,129,0.30)"
  },
} as const
type TabKey = keyof typeof TAB_CFG
type AnyTabKey = "Overview" | TabKey

interface TabBarProps {
  selectedNode: boolean
  activeTab: string | null           // "Overview" | "I_Do" | "We_Do" | "You_Do"
  activeSubcategory: string
  subcategories: {
    I_Do: Array<{ key: string; label: string; icon?: React.ReactNode; component: any }>
    We_Do: Array<{ key: string; label: string; icon?: React.ReactNode; component: any }>
    You_Do: Array<{ key: string; label: string; icon?: React.ReactNode; component: any }>
  }
  onTabChange: (tab: string) => void
  onSubcategoryChange: (sub: string, component: any) => void
  onOverviewClick?: () => void       // NEW — called when Overview tab is clicked
  rightAction?: React.ReactNode
}

export const TabBar: React.FC<TabBarProps> = ({
  selectedNode, activeTab, activeSubcategory, subcategories,
  onTabChange, onSubcategoryChange, onOverviewClick, rightAction,
}) => {
  // All tabs: Overview first, then the 3 method tabs
  const allTabs: Array<{ key: AnyTabKey; label: string; icon: React.ReactNode; color: string; bg: string; shadow: string }> = [
    { key: "Overview", ...OVERVIEW_CFG },
    ...(Object.entries(TAB_CFG) as [TabKey, typeof TAB_CFG[TabKey]][]).map(([k, v]) => ({ key: k as AnyTabKey, ...v })),
  ]

  const [prevTab, setPrevTab] = React.useState<string | null>(null)
  const [isAnimating, setIsAnimating] = React.useState(false)

  const handleTabClick = (tabKey: string, isOverview: boolean, subs: any[]) => {
    if (tabKey === activeTab) return
    setPrevTab(activeTab)
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)

    if (isOverview) {
      onTabChange("Overview")
      if (onOverviewClick) onOverviewClick()
    } else {
      onTabChange(tabKey)
      if (subs.length > 0) onSubcategoryChange(subs[0].key, subs[0].component)
    }
  }

  return (
    <div style={{
      flexShrink: 0, background: '#f5f9ff',
      borderBottom: `1px solid ${T.border}`,
      fontFamily: FONT_PRIMARY, WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Main navigation tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        justifyContent: 'flex-start',
        padding: '8px 12px 0px 12px',
        position: 'relative',
        background: '#ffffff',
      }}>
        {/* Divider line (aligned with left/right padding) */}
        <div style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 0,
          height: 1,
          background: '#eef2f7',
          pointerEvents: 'none',
        }} />
        {allTabs.map((tab, idx) => {
          const isOverview = tab.key === "Overview"
          const isSel = activeTab === tab.key
          const isDis = !selectedNode && tab.key !== "Overview"
          const isFirstTab = idx === 0
          const subs = isOverview ? [] : (subcategories[tab.key as TabKey] ?? [])

          return (
            <button
              key={tab.key}
              disabled={isDis}
              onClick={() => handleTabClick(tab.key, isOverview, subs)}
              style={{
                flex: '0 0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '0 8px',
                paddingLeft: isFirstTab ? 0 : 8,
                height: 34,
                fontSize: 13,
                fontWeight: isSel ? 700 : 600,
                border: 'none',
                borderBottom: isSel ? '3px solid #2563eb' : '3px solid transparent',
                background: 'transparent',
                color: isSel ? '#2563eb' : isDis ? '#B3BAC5' : '#111827',
                cursor: isDis ? 'not-allowed' : 'pointer',
                opacity: isDis ? 0.45 : 1,
                transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                whiteSpace: 'nowrap',
                borderRadius: 0,
                boxShadow: 'none',
                transform: isAnimating && prevTab === tab.key ? 'scale(0.95)' : 'scale(1)',
              }}
              onMouseEnter={e => {
                if (!isSel && !isDis) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.color = '#2563eb'
                }
              }}
              onMouseLeave={e => {
                if (!isSel) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.color = isDis ? '#B3BAC5' : '#111827'
                }
              }}
            >
              {tab.key !== 'Overview' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 6,
                  background: 'transparent',
                  flexShrink: 0,
                  opacity: isSel ? 1 : 0.6,
                  transition: 'opacity 0.2s ease, transform 0.2s ease',
                  transform: isSel ? 'scale(1.1)' : 'scale(1)',
                }}>
                  {tab.icon}
                </span>
              )}
              <span style={{
                transition: 'transform 0.2s ease',
                display: 'inline-block',
              }}>{tab.label}</span>
            </button>
          )
        })}
        {rightAction && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingBottom: '6px' }}>
            {rightAction}
          </div>
        )}
      </div>

      {/* Subcategory pills */}
      {activeTab && activeTab !== "Overview" && (subcategories[activeTab as TabKey] ?? []).length > 0 && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        overflowX: 'auto', scrollbarWidth: 'none',
        background: '#ffffff',
        animation: 'subcategorySlide 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
          {(subcategories[activeTab as TabKey] ?? []).map((sub, idx) => {
            const tabCfg = TAB_CFG[activeTab as TabKey]
            const isActive = activeSubcategory === sub.key
            return (
<button
  key={sub.key}
  onClick={() => onSubcategoryChange(sub.key, sub.component)}
  style={{
    flexShrink: 0,
    padding: '5px 14px',
    fontSize: 12.5, fontWeight: 600,
    borderRadius: 8,
    border: `1.5px solid ${isActive ? '#2563eb' : '#e2e8f0'}`,
    background: isActive ? '#2563eb' : '#ffffff',
    color: isActive ? '#fff' : '#475569',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
    boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
    animation: `pillSlideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 60}ms both`,
  }}
  onMouseEnter={e => {
    if (!isActive) {
      const el = e.currentTarget as HTMLElement
      el.style.borderColor = '#2563eb'
      el.style.color = '#2563eb'
    }
  }}
  onMouseLeave={e => {
    if (!isActive) {
      const el = e.currentTarget as HTMLElement
      el.style.borderColor = '#e2e8f0'
      el.style.color = '#475569'
    }
  }}
>
  {sub.label}
  {/* Show count badge if available */}
  {sub.component?.subItems?.length > 0 && (
    <span style={{
      marginLeft: 6,
      padding: '1px 6px',
      borderRadius: 10,
      fontSize: '11px', fontWeight: 700,
      background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
      color: isActive ? '#fff' : '#64748b',
    }}>
      {sub.component.subItems.length}
    </span>
  )}
</button>
            )
          })}
        </div>
      )}
    </div>
  )
}