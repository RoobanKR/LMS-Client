// components/TopBar.tsx
import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, Layout, Bot, Sparkles, Sun, Moon, User, Settings, LogOut, BookOpen, ChevronDown } from "lucide-react"
import { T } from "./types/constants"
import { userPermission } from "@/apiServices/tokenVerify"
import { RoleSwitchState } from "./types/types"

interface TopBarProps {
  items: Array<{label: string; icon?: React.ComponentType<any>; onClick?: () => void; isLast?: boolean}>
  onAIClick: () => void
  onSummaryClick: () => void
  onMenuClick: () => void
}

export const TopBar: React.FC<TopBarProps> = ({ items, onAIClick, onSummaryClick, onMenuClick }) => {
  const router = useRouter()
  const [userOpen, setUserOpen] = useState(false)
  const [isDummyStudent, setIsDummyStudent] = useState(false)
  const [originalRoleInfo, setOriginalRoleInfo] = useState<{roleName: string; renameRole: string} | null>(null)
  const [user, setUser] = useState<{firstName: string; lastName: string; email: string; role: {roleName: string; renameRole: string}} | null>(null)
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  const checkDummyStatus = () => {
    try {
      const raw = localStorage.getItem('smartcliff_roleSwitch')
      if(raw) {
        const d: RoleSwitchState = JSON.parse(raw)
        setIsDummyStudent(d.isDummyStudent || false)
        if(d.originalRole || d.originalRenameRole) {
          setOriginalRoleInfo({roleName: d.originalRole || '', renameRole: d.originalRenameRole || ''})
        }
      } else {
        setIsDummyStudent(false)
        setOriginalRoleInfo(null)
      }
    } catch {}
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as 'light' | 'dark'
      const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
      const t = saved || (sys ? 'dark' : 'light')
      setThemeState(t)
      if(t === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch {}
    checkDummyStatus()
    try {
      const raw = localStorage.getItem('smartcliff_userData') || localStorage.getItem('smartcliff_user') || localStorage.getItem('currentUser')
      if(raw) setUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    const h = () => checkDummyStatus()
    window.addEventListener('storage', h)
    return () => window.removeEventListener('storage', h)
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if(userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggleTheme = () => {
    const n = theme === 'light' ? 'dark' : 'light'
    setThemeState(n)
    if(n === 'dark') document.documentElement.classList.add('dark')
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
      setOriginalRoleInfo({roleName: user?.role?.roleName || '', renameRole: user?.role?.renameRole || ''})
      setUserOpen(false)
      router.push('/lms/pages/courses')
      setTimeout(() => window.dispatchEvent(new Event('storage')), 100)
    } catch {}
  }

  const handleSwitchBack = () => {
    try {
      localStorage.removeItem('smartcliff_roleSwitch')
      localStorage.removeItem('smartcliff_isDummyStudent')
      setIsDummyStudent(false)
      setOriginalRoleInfo(null)
      setUserOpen(false)
      const r = originalRoleInfo?.renameRole?.toLowerCase() || ''
      if(r.includes('poc')) router.push('/lms/pages/poc/dashboard')
      else if(r.includes('admin')) router.push('/lms/pages/admin/dashboard')
      else router.push('/lms/pages/dashboard')
      setTimeout(() => window.dispatchEvent(new Event('storage')), 100)
    } catch {}
  }

  const isActualStudent = () => {
    if(user) {
      if(user.role?.roleName?.toLowerCase().includes('student')) return true
      if(user.role?.renameRole?.toLowerCase().includes('student')) return true
    }
    try {
      const renameRole = localStorage.getItem('smartcliff_renameRole')
      if(renameRole?.toLowerCase().includes('student')) return true
      const roleVal = localStorage.getItem('smartcliff_roleValue')
      if(roleVal?.toLowerCase().includes('student')) return true
    } catch {}
    return false
  }

  const getInitials = () => {
    if(!user) return 'SC'
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
  }

  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 52, borderBottom: `1px solid ${T.border}`, background: T.bg, flexShrink: 0, position: 'relative'}}>
      <button onClick={onMenuClick} className="lg:hidden"
        style={{padding: 6, borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 4}}>
        <Layout size={15}/>
      </button>
      <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0, overflow: 'hidden'}}>
        {items.map((item, i) => {
          const isLast = item.isLast || i === items.length - 1
          const isNav = i <= 1
          return (
            <React.Fragment key={i}>
              <div style={{display: 'flex', alignItems: 'center', gap: 3, cursor: !isLast ? 'pointer' : 'default', flexShrink: 0}}
                onClick={!isLast ? item.onClick : undefined}>
                {item.icon && React.createElement(item.icon, {size: 12, style: {color: isNav && !isLast ? '#3B82F6' : isLast ? T.textMain : T.textMuted}})}
                <span style={{fontSize: isLast ? '13.5px' : '12.5px', fontWeight: isLast ? 700 : 600, color: isNav && !isLast ? '#3B82F6' : isLast ? T.textMain : T.textMuted, whiteSpace: 'nowrap', transition: 'color .14s'}}
                  onMouseEnter={e => { if(!isLast) (e.currentTarget as HTMLElement).style.color = T.orange }}
                  onMouseLeave={e => { if(!isLast) (e.currentTarget as HTMLElement).style.color = isNav ? '#3B82F6' : T.textMuted }}>
                  {item.label}
                </span>
              </div>
              {!isLast && <ChevronRight size={10} style={{color: T.textHint, flexShrink: 0}}/>}
            </React.Fragment>
          )
        })}
      </div>
      <button onClick={onAIClick}
        style={{display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${T.orange}40`, background: T.orangeTint, color: T.orange, fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'all .15s'}}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.orangeLight}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.orangeTint}>
        <Bot size={13}/>Ask AI
      </button>
      <button onClick={onSummaryClick}
        style={{display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${T.border}`, background: T.pageBg, color: T.textSub, fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all .15s'}}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.border}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.pageBg}>
        <Sparkles size={13}/>Summary
      </button>
      <button onClick={toggleTheme}
        style={{padding: 6, borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', cursor: 'pointer', color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s'}}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.pageBg}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
        {theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
      </button>
      <div style={{width: 1, height: 20, background: T.border, flexShrink: 0}}/>
      <div ref={userRef} style={{position: 'relative', flexShrink: 0}}>
        <button onClick={() => setUserOpen(v => !v)}
          style={{display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', borderRadius: 10, border: `1.5px solid ${T.border}`, background: userOpen ? T.pageBg : 'transparent', cursor: 'pointer', transition: 'all .15s'}}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.pageBg}
          onMouseLeave={e => { if(!userOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <div style={{width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em', boxShadow: '0 1px 4px rgba(139,92,246,0.35)'}}>
            {getInitials()}
          </div>
          <div style={{textAlign: 'left', lineHeight: 1.25}}>
            <div style={{fontSize: '11.5px', fontWeight: 700, color: T.textMain}}>{user?.firstName || 'Student'}</div>
            <div style={{fontSize: '9.5px', color: isDummyStudent ? '#d97706' : T.textMuted, fontWeight: isDummyStudent ? 600 : 400}}>
              {isDummyStudent ? '⚡ Student View' : user?.role?.renameRole || 'Account'}
            </div>
          </div>
          <ChevronDown size={11} style={{color: T.textMuted, transform: userOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s'}}/>
        </button>

        {userOpen && (
          <>
            <div style={{position: 'fixed', inset: 0, zIndex: 10}} onClick={() => setUserOpen(false)}/>
            <div style={{position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 256, borderRadius: 12, background: T.bg, border: `1px solid ${T.line}`, boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', zIndex: 11, overflow: 'hidden', animation: 'fadeIn .15s ease both'}}>
              <div style={{padding: '12px 14px', background: T.pageBg, borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px', fontWeight: 800, color: '#fff', boxShadow: '0 2px 6px rgba(139,92,246,0.30)'}}>
                  {getInitials()}
                </div>
                <div style={{minWidth: 0, flex: 1}}>
                  <div style={{fontSize: '13px', fontWeight: 700, color: T.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{fontSize: '11px', color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1}}>
                    {user?.email}
                  </div>
                  <span style={{display: 'inline-flex', alignItems: 'center', marginTop: 4, padding: '2px 7px', borderRadius: 5, fontSize: '10px', fontWeight: 600,
                    background: isDummyStudent ? 'rgba(217,119,6,0.12)' : 'rgba(139,92,246,0.10)',
                    color: isDummyStudent ? '#d97706' : '#7c3aed'}}>
                    {isDummyStudent ? '⚡ Student View' : user?.role?.renameRole || 'Account'}
                  </span>
                </div>
              </div>
              <div style={{padding: '6px'}}>
                {!isActualStudent() && !isDummyStudent && (
                  <button onClick={handleSwitchToStudent}
                    style={{display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s', marginBottom: 2}}
                    onMouseEnter={e => { const b = e.currentTarget.querySelector('div') as HTMLElement; if(b){ b.style.background = '#2563eb'; b.style.color = '#fff' }; (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.07)' }}
                    onMouseLeave={e => { const b = e.currentTarget.querySelector('div') as HTMLElement; if(b){ b.style.background = 'rgba(59,130,246,0.10)'; b.style.color = '#3b82f6' }; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <div style={{width: 28, height: 28, borderRadius: 7, background: 'rgba(59,130,246,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .12s', color: '#3b82f6'}}>
                      <User size={13}/>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', fontWeight: 600, color: '#3b82f6'}}>Switch to Student</div>
                      <div style={{fontSize: '10px', color: T.textMuted}}>Preview student experience</div>
                    </div>
                  </button>
                )}
                {isDummyStudent && originalRoleInfo && (
                  <button onClick={handleSwitchBack}
                    style={{display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s', marginBottom: 2}}
                    onMouseEnter={e => { const b = e.currentTarget.querySelector('div') as HTMLElement; if(b){ b.style.background = '#d97706'; b.style.color = '#fff' }; (e.currentTarget as HTMLElement).style.background = 'rgba(217,119,6,0.08)' }}
                    onMouseLeave={e => { const b = e.currentTarget.querySelector('div') as HTMLElement; if(b){ b.style.background = 'rgba(217,119,6,0.10)'; b.style.color = '#d97706' }; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <div style={{width: 28, height: 28, borderRadius: 7, background: 'rgba(217,119,6,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .12s', color: '#d97706'}}>
                      <Sparkles size={13}/>
                    </div>
                    <div>
                      <div style={{fontSize: '12px', fontWeight: 600, color: '#d97706'}}>Back to {originalRoleInfo.renameRole}</div>
                      <div style={{fontSize: '10px', color: T.textMuted}}>Return to original role</div>
                    </div>
                  </button>
                )}
                <div style={{height: 1, background: T.line, margin: '4px 4px 6px'}}/>
                <button onClick={() => { setUserOpen(false); router.push('/lms/pages/studentdashboard/student/profile') }}
                  style={{display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s'}}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <User size={13} style={{color: T.inkMuted, flexShrink: 0}}/>
                  <span style={{fontSize: '12px', fontWeight: 500, color: T.textMain}}>My Profile</span>
                </button>
                <button onClick={() => setUserOpen(false)}
                  style={{display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s'}}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <Settings size={13} style={{color: T.inkMuted, flexShrink: 0}}/>
                  <span style={{fontSize: '12px', fontWeight: 500, color: T.textMain}}>Settings</span>
                </button>
                <button onClick={() => setUserOpen(false)}
                  style={{display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s'}}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <BookOpen size={13} style={{color: T.inkMuted, flexShrink: 0}}/>
                  <span style={{fontSize: '12px', fontWeight: 500, color: T.textMain}}>Help & Support</span>
                </button>
              </div>
              <div style={{padding: '6px', borderTop: `1px solid ${T.line}`}}>
                <button onClick={handleLogout} disabled={isLoggingOut}
                  style={{display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background .12s'}}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.06)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  <LogOut size={13} style={{color: '#ef4444', flexShrink: 0}}/>
                  <span style={{fontSize: '12px', fontWeight: 600, color: '#ef4444'}}>{isLoggingOut ? 'Signing out…' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}