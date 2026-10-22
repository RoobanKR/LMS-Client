// components/TopBar.tsx
import React, { useState, useEffect } from "react"
import {
  CircleNotch,
  List,
  NotePencil,
} from "@phosphor-icons/react"
import { T } from "./types/constants"
import { NotificationBell } from "@/app/lms/component/NotificationBell"

interface TopBarProps {
  items: Array<{ label: string; icon?: React.ComponentType<any>; onClick?: () => void; isLast?: boolean }>
  onAIClick: () => void
  onSummaryClick: () => void
  onMenuClick: () => void
  onNotesClick?: () => void
  /** Left slot — the pedagogy MainTabs render here so header + tabs are ONE row. */
  tabs?: React.ReactNode
}

// The course view's tab row. Notes and Notifications live at the end of the
// breadcrumb row above it (CourseHeaderActions, below).
export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, tabs }) => {
  // The account/profile menu lives at the bottom of the course sidebar
  // (CourseSidebar.tsx).
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme') as 'light' | 'dark'
      const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
      const t = saved || (sys ? 'dark' : 'light')
      if (t === 'dark') document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch { }
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      // Shared responsive gutter — Overview + Assignment tab + search
      // toolbar all begin on the same vertical guideline. `clamp` gives
      // 16px on mobile, ~2vw on tablet, 32px on wide desktop. No fixed
      // max-width — the container fills the viewport width.
      paddingInline: 'clamp(16px, 2vw, 32px)',
      height: 48, width: '100%', boxSizing: 'border-box',
      background: T.bg, flexShrink: 0,
      position: 'relative', borderBottom: `1px solid ${T.border}`
    }} className="max-sm:!gap-1.5">

      {/* Course menu — opens the slide-in course sidebar below lg (the
          desktop sidebar has its own collapse/expand controls). */}
      <button
        type="button"
        onClick={onMenuClick}
        title="Course menu"
        aria-label="Open course menu"
        className="lg:hidden flex items-center justify-center flex-shrink-0 rounded-[9px] border-0 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
        style={{ width: 36, height: 36, cursor: 'pointer', marginLeft: -6 }}
      >
        <List size={20} weight="regular" />
      </button>

      {/* The pedagogy tabs fill this 48px row. Stretch so the active
          underline sits on the bar's own bottom border. */}
      <div style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'stretch' }}>
        {tabs}
      </div>
    </div>
  )
}

/** Notes and Notifications — the course view's page actions, at the end of
 *  the breadcrumb row. The bell is the app's shared NotificationBell, the
 *  same round control Upload Resources shows. */
export const CourseHeaderActions: React.FC<{ onNotesClick?: () => void }> = ({ onNotesClick }) => {
  const [notesLoading, setNotesLoading] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

      {/* Notes — a labelled pill in the brand tint, sized to the breadcrumb
          text beside it. */}
      <button
        type="button"
        onClick={() => {
          if (!onNotesClick || notesLoading) return
          setNotesLoading(true)
          onNotesClick()
          setTimeout(() => setNotesLoading(false), 1200)
        }}
        title="Open your notes"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
          height: 32, padding: '0 12px', borderRadius: 8,
          border: '1px solid #FED7AA', background: '#FFF7ED', color: '#C2410C',
          fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif",
          fontSize: 12.5, fontWeight: 600, lineHeight: 1,
          cursor: 'pointer', transition: 'background .15s, border-color .15s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = '#FFEDD5'; el.style.borderColor = '#FDBA74'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.background = '#FFF7ED'; el.style.borderColor = '#FED7AA'
        }}
      >
        {notesLoading
          ? <CircleNotch size={15} weight="bold" style={{ animation: 'spin 0.7s linear infinite' }} />
          : <NotePencil size={15} weight="bold" />}
        Notes
      </button>

      <NotificationBell />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
