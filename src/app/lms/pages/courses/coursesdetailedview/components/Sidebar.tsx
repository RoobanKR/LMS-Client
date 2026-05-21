// components/Sidebar.tsx
// ─── SELF-CONTAINED dark sidebar ──────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import {
  Search, X, ChevronDown, ChevronUp,
  GraduationCap, Home, LayoutDashboard,
  Code2, Braces, Atom, Server, Layers,
  Crown, ArrowRight, ChevronsUpDown, ChevronsDownUp,
  AlertTriangle,
} from "lucide-react"
import { FONT_PRIMARY, FONT_INTER_IMPORT } from "./types/constants"
import { hasChildItems, hasPedagogyData } from "./types/utils"
import { CourseData, SelectedItem, SelectedItemType } from "./types/types"
import { fetchAllPedagogyViews } from "../../../../../../apiServices/pedagogyAndModuleAdd/pedagogy"

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:            "#111827",
  surface:       "#1f2937",
  surfaceHover:  "rgba(148,163,184,0.16)",
  surfaceActive: "rgba(56,189,248,0.20)",
  border:        "#334155",
  borderSub:     "#475569",
  accent:        "#38bdf8",
  accentLight:   "rgba(56,189,248,0.18)",
  text:          "#f8fafc",
  textSub:       "#e2e8f0",
  textMuted:     "#cbd5e1",
  textFaint:     "#94a3b8",
  textGhost:     "#64748b",
  gold:          "#facc15",
 font: FONT_PRIMARY
}

/* ─── Module icon helper ─────────────────────────────────────────────────── */
function getModuleIcon(title: string, size = 11) {
  const k = title.toLowerCase().replace(/[^a-z]/g, "")
  if (k.includes("css"))       return <Braces  size={size} strokeWidth={1.8} />
  if (k.includes("react"))     return <Atom    size={size} strokeWidth={1.8} />
  if (k.includes("node"))      return <Server  size={size} strokeWidth={1.8} />
  if (k.includes("express"))   return <Server  size={size} strokeWidth={1.8} />
  if (k.includes("bootstrap")) return <Layers  size={size} strokeWidth={1.8} />
  return                               <Code2   size={size} strokeWidth={1.8} />
}

/* ─── Pedagogy / Hours types ─────────────────────────────────────────────── */
interface PedagogyActivityItem { type: string; duration: number; _id?: any }
interface Pedagogy {
  _id: any; module: string[]; subModule: string[]; topic: string[]; subTopic: string[]
  iDo: PedagogyActivityItem[]; weDo: PedagogyActivityItem[]; youDo: PedagogyActivityItem[]
}
interface PedagogyView { _id: string; institution: string; courses: string; pedagogies: Pedagogy[] }

export function buildHoursMap(
  pedagogyViews: PedagogyView[],
  courseId?: string,
): Record<string, number> {
  const map: Record<string, number> = {}
  const views = courseId ? pedagogyViews.filter(v => v.courses === courseId) : pedagogyViews
  for (const view of views) {
    for (const ped of view.pedagogies) {
      const h = [...ped.iDo, ...ped.weDo, ...ped.youDo]
        .reduce((s, a) => s + (a.duration || 0), 0)
      if (!h) continue
      for (const id of [...ped.module, ...ped.subModule, ...ped.topic, ...ped.subTopic])
        if (id) map[id] = (map[id] || 0) + h
    }
  }
  return map
}

/* ─── Smooth collapse ────────────────────────────────────────────────────── */
const AnimCollapse: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [h, setH] = useState<number | "auto">(open ? "auto" : 0)
  const [vis, setVis] = useState(open)

  useEffect(() => {
    if (open) {
      setVis(true)
      requestAnimationFrame(() => {
        if (ref.current) setH(ref.current.scrollHeight)
        setTimeout(() => setH("auto"), 270)
      })
    } else {
      if (ref.current) setH(ref.current.scrollHeight)
      requestAnimationFrame(() => requestAnimationFrame(() => setH(0)))
      setTimeout(() => setVis(false), 270)
    }
  }, [open])

  if (!vis && !open) return null
  return (
    <div style={{ overflow: "hidden", height: h, transition: "height 260ms cubic-bezier(0.4,0,0.2,1)" }}>
      <div ref={ref}>{children}</div>
    </div>
  )
}

/* ─── Shared primitives ──────────────────────────────────────────────────── */
const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    fontFamily: C.font, fontSize: 10.5, fontWeight: 700,
    letterSpacing: "0.08em", textTransform: "uppercase",
    color: C.textGhost, padding: "16px 16px 8px",
    marginTop: 4,
  }}>
    {label}
  </div>
)

const Divider = () => (
  <div style={{ height: 1, background: C.surface, margin: "8px 12px 6px" }} />
)

const ToolBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...rest }) => {
  const [hov, setHov] = useState(false)
  return (
    <button
      {...rest}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${hov ? "rgba(78,130,255,0.38)" : C.border}`,
        background: hov ? "rgba(78,130,255,0.12)" : C.surface,
        cursor: "pointer", color: hov ? C.accent : C.textFaint,
        transition: "all 0.15s", fontFamily: C.font,
      }}
    >
      {children}
    </button>
  )
}

/* ─── Flat nav item ──────────────────────────────────────────────────────── */
const NavItem: React.FC<{
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void
}> = ({ icon, label, active, onClick }) => {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 16px", borderRadius: 8, margin: "2px 8px",
        cursor: "pointer", userSelect: "none",
        background: active ? C.surfaceActive : hover ? C.surfaceHover : "transparent",
        transition: "background 0.12s",
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? C.accent : C.textFaint,
      }}>
        {icon}
      </div>
      <span style={{
        fontFamily: C.font, fontSize: 13.5, fontWeight: active ? 600 : 500,
        color: active ? C.text : C.textMuted, flex: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {label}
      </span>
    </div>
  )
}

/* ─── Collapsible tree module row ────────────────────────────────────────── */
const TreeModuleRow: React.FC<{
  icon: React.ReactNode; label: string
  isOpen: boolean; isActive?: boolean; depth?: number; onToggle: () => void
}> = ({ icon, label, isOpen, isActive, depth = 0, onToggle }) => {
  const [hover, setHover] = useState(false)
  const pl = depth === 0 ? "8px 14px 8px 12px" : "7px 14px 7px 10px"
  const iSize = depth === 0 ? 25 : 21
  return (
    <div
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: pl, borderRadius: 6, margin: "0 8px",
        cursor: "pointer", userSelect: "none",
        background: isActive ? "rgba(56,189,248,0.18)" : (hover ? C.surfaceHover : "transparent"),
        border: isActive ? "1px solid rgba(56,189,248,0.38)" : "1px solid transparent",
        boxShadow: isActive ? "inset 3px 0 0 rgba(56,189,248,0.95)" : "none",
        transition: "background 0.12s,border-color 0.12s,box-shadow 0.12s",
      }}
    >
      <div style={{
        width: iSize, height: iSize,
        borderRadius: depth === 0 ? 6 : 5, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isActive || isOpen ? C.accentLight : C.surface,
        transition: "background 0.13s",
      }}>
        <span style={{ color: isActive || isOpen ? C.accent : C.textFaint, display: "flex" }}>
          {icon}
        </span>
      </div>
      <span style={{
        fontFamily: C.font, flex: 1,
        fontSize: depth === 0 ? 13.5 : 12.5, fontWeight: 500,
        color: isOpen || isActive ? C.text : C.textMuted,
        textTransform: depth === 0 ? "uppercase" as const : "none" as const,
        letterSpacing: depth === 0 ? "0.02em" : "0",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "color 0.13s",
      }}>
        {label}
      </span>
      <span style={{ color: isOpen ? C.accent : C.textGhost, display: "flex", flexShrink: 0 }}>
        {isOpen
          ? <ChevronUp size={11} strokeWidth={2} />
          : <ChevronDown size={11} strokeWidth={2} />}
      </span>
    </div>
  )
}

/* ─── Leaf / subtopic row ────────────────────────────────────────────────── */
const SubtopicRow: React.FC<{
  title: string; isSelected: boolean; isCurrentTopic?: boolean; onClick: () => void
}> = ({ title, isSelected, isCurrentTopic, onClick }) => {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        paddingLeft: 14, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
        borderRadius: 6, margin: "0 8px 0 0",
        cursor: "pointer", userSelect: "none",
        background: isSelected ? "rgba(56,189,248,0.18)" : (hover ? C.surfaceHover : "transparent"),
        border: isSelected ? "1px solid rgba(56,189,248,0.38)" : "1px solid transparent",
        boxShadow: isSelected ? "inset 3px 0 0 rgba(56,189,248,0.95)" : "none",
        transition: "background 0.12s,border-color 0.12s,box-shadow 0.12s",
      }}
    >
      <div style={{
        width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginLeft: 2,
        background: isSelected ? C.accent : "#cbd5e1",
        transition: "background 0.13s",
      }} />
      <span style={{
        fontFamily: C.font, fontSize: 12.5, flex: 1,
        fontWeight: isSelected ? 600 : 400,
        color: isSelected ? C.text : C.textFaint,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {title}
      </span>
      {isCurrentTopic && (
        <span style={{
          fontFamily: C.font, fontSize: 10, fontWeight: 600,
          color: C.accent, background: C.accentLight,
          padding: "2px 7px", borderRadius: 4, flexShrink: 0, whiteSpace: "nowrap",
        }}>
          Current Topic
        </span>
      )}
    </div>
  )
}

/* ─── Upgrade banner ─────────────────────────────────────────────────────── */
const UpgradeBanner: React.FC = () => (
  <div style={{
    margin: "6px 8px 8px",
    background: "#1a1f2e",
    border: `1px solid ${C.borderSub}`,
    borderRadius: 10, padding: "12px 14px",
    fontFamily: C.font, flexShrink: 0,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <Crown size={13} color={C.gold} strokeWidth={2} />
      <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>Upgrade to Pro</span>
    </div>
    <p style={{ fontSize: 10.5, color: C.textFaint, lineHeight: 1.5, margin: "0 0 10px" }}>
      Unlock advanced features and boost your learning experience.
    </p>
    <button style={{
      width: "100%",
      background: "linear-gradient(135deg,#4e82ff 0%,#3a6fd8 100%)",
      color: "#fff", fontSize: 11, fontWeight: 600,
      border: "none", borderRadius: 7, padding: "8px 10px",
      cursor: "pointer", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 6, fontFamily: C.font,
    }}>
      Upgrade Now <ArrowRight size={11} />
    </button>
  </div>
)

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR HEADER  (exported — used by page.tsx as before)
   ═══════════════════════════════════════════════════════════════════════════ */
interface SidebarHeaderProps {
  courseName: string
  modulesCount: number
  sidebarSearch: string
  onSearchChange: (v: string) => void
  onExpandAll?: () => void
  onCollapseAll?: () => void
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  courseName, modulesCount, sidebarSearch, onSearchChange, onExpandAll, onCollapseAll,
}) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleSearch = () => {
    const next = !searchOpen
    setSearchOpen(next)
    if (!next) onSearchChange("")
    else setTimeout(() => inputRef.current?.focus(), 60)
  }

  return (
    <div style={{ background: C.bg, flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>

      {/* Course icon + modules count */}
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: "linear-gradient(135deg,#4f8ef7 0%,#3a6fd8 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 6px rgba(78,130,255,0.25)",
        }}>
          <Layers size={12} strokeWidth={2} color="#fff" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: C.font, fontSize: 13, fontWeight: 600,
            color: C.text, overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap", letterSpacing: "-0.01em",
          }}>
            {courseName}
          </div>
        </div>
        <span style={{
          fontFamily: C.font, fontSize: 10, fontWeight: 500,
          color: C.textFaint, background: C.surface,
          border: `1px solid ${C.border}`,
          padding: "2px 7px", borderRadius: 16, flexShrink: 0,
        }}>
          {modulesCount} Modules
        </span>
      </div>

      {/* Search + expand/collapse toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "8px 12px 8px",
      }}>
        <button
          onClick={toggleSearch}
          title="Search"
          style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${searchOpen ? "rgba(78,130,255,0.42)" : C.border}`,
            background: searchOpen ? C.accentLight : C.surface,
            cursor: "pointer", color: searchOpen ? C.accent : C.textFaint,
            transition: "all 0.15s",
          }}
        >
          {searchOpen
            ? <X size={12} strokeWidth={2.5} />
            : <Search size={12} strokeWidth={2.2} />}
        </button>
        <div style={{ flex: 1 }} />
        {onExpandAll && (
          <ToolBtn onClick={onExpandAll} title="Expand all">
            <ChevronsUpDown size={12} strokeWidth={2} />
          </ToolBtn>
        )}
        {onCollapseAll && (
          <ToolBtn onClick={onCollapseAll} title="Collapse all">
            <ChevronsDownUp size={12} strokeWidth={2} />
          </ToolBtn>
        )}
      </div>

      {/* Animated search input */}
      <div style={{
        overflow: "hidden",
        maxHeight: searchOpen ? 52 : 0,
        transition: "max-height 0.24s cubic-bezier(0.4,0,0.2,1)",
        borderTop: searchOpen ? `1px solid ${C.border}` : "1px solid transparent",
        background: C.bg,
      }}>
        <div style={{ padding: "8px 12px" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={11} strokeWidth={2}
              style={{
                position: "absolute", left: 10, top: "50%",
                transform: "translateY(-50%)", color: C.textGhost, pointerEvents: "none",
              }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search topics…"
              value={sidebarSearch}
              onChange={e => onSearchChange(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box" as const,
                paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                fontFamily: C.font, fontSize: 12.5,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 9, color: C.text, outline: "none",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "rgba(78,130,255,0.5)"
                e.currentTarget.style.background = "#1a1f2e"
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = C.border
                e.currentTarget.style.background = C.surface
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SIDEBAR COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
interface SidebarProps {
  courseData: CourseData | null
  selectedItem: SelectedItem | null
  expandedModules: Set<string>
  expandedSubModules: Set<string>
  expandedTopics: Set<string>
  sidebarSearch: string
  onItemSelect: (
    id: string, title: string, type: SelectedItemType,
    hierarchy: string[], pedagogy?: any,
  ) => void
  onToggleModule: (id: string) => void
  onToggleSubModule: (id: string) => void
  onToggleTopic: (id: string) => void
  onSearchChange: (v: string) => void
  onLogout?: () => void
  courseId?: string
  currentTopicId?: string
  studentProgress?: { visitedNodes: string[]; openedResources: string[] } | null
}

export const Sidebar: React.FC<SidebarProps> = ({
  courseData, selectedItem,
  expandedModules, expandedSubModules, expandedTopics,
  sidebarSearch, onItemSelect,
  onToggleModule, onToggleSubModule, onToggleTopic,
  courseId, currentTopicId,
}) => {
  const [pedagogyViews, setPedagogyViews] = useState<PedagogyView[]>([])
  const [courseTreeOpen, setCourseTreeOpen] = useState(true)

  useEffect(() => {
    fetchAllPedagogyViews().then(setPedagogyViews).catch(console.error)
  }, [])

  const hoursMap = useMemo(
    () => buildHoursMap(pedagogyViews, courseId),
    [pedagogyViews, courseId],
  )

  const sel = useCallback(
    (id: string, title: string, type: SelectedItemType, hier: string[], ped?: any) =>
      onItemSelect(id, title, type, hier, ped),
    [onItemSelect],
  )

  if (!courseData?.modules) return null

  const filtered = courseData.modules.filter((m: any) =>
    !sidebarSearch ||
    m.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    m.subModules?.some((sm: any) =>
      sm.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      sm.topics?.some((t: any) => t.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
    ) ||
    m.topics?.some((t: any) => t.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
  )

  return (
    <div style={{ fontFamily: C.font, background: C.bg, paddingBottom: 8 }}>
      <style dangerouslySetInnerHTML={{
        __html: `
${FONT_INTER_IMPORT}          .sbd-scroll::-webkit-scrollbar{width:3px}
          .sbd-scroll::-webkit-scrollbar-track{background:transparent}
          .sbd-scroll::-webkit-scrollbar-thumb{background:#1e2430;border-radius:8px}
          .sbd-scroll::-webkit-scrollbar-thumb:hover{background:#2a3048}
        `
      }} />

      {/* SYLLABUS */}
      <SectionLabel label="Syllabus Overview" />

      {filtered.map((m: any, index: number) => {
        const mExp = expandedModules.has(m._id)
        const mSel = selectedItem?.id === m._id

        return (
          <div key={m._id} style={{ marginBottom: index < filtered.length - 1 ? 12 : 0 }}>
            <TreeModuleRow
              icon={getModuleIcon(m.title)}
              label={m.title}
              isOpen={mExp}
              isActive={mSel}
              depth={1}
              onToggle={() => {
                sel(m._id, m.title, "module", [m._id], m.pedagogy)
                onToggleModule(m._id)
              }}
            />

            <AnimCollapse open={mExp}>
              <div style={{ marginLeft: 12, borderLeft: `1.5px solid ${C.border}` }}>

                {m.subModules?.map((sm: any) => {
                  const sExp = expandedSubModules.has(sm._id)
                  const sSel = selectedItem?.id === sm._id
                  return (
                    <div key={sm._id}>
                      <TreeModuleRow
                        icon={getModuleIcon(sm.title)}
                        label={sm.title}
                        isOpen={sExp}
                        isActive={sSel}
                        depth={2}
                        onToggle={() => {
                          sel(sm._id, sm.title, "submodule", [m._id, sm._id], sm.pedagogy)
                          onToggleSubModule(sm._id)
                        }}
                      />
                      <AnimCollapse open={sExp}>
                        <div style={{ marginLeft: 12, borderLeft: `1.5px solid ${C.border}` }}>
                          {sm.topics?.map((t: any) => {
                            const tExp = expandedTopics.has(t._id)
                            const tSel = selectedItem?.id === t._id
                            return (
                              <div key={t._id}>
                                <TreeModuleRow
                                  icon={getModuleIcon(t.title)}
                                  label={t.title}
                                  isOpen={tExp}
                                  isActive={tSel}
                                  depth={2}
                                  onToggle={() => {
                                    sel(t._id, t.title, "topic",
                                      [m._id, sm._id, t._id], t.pedagogy)
                                    onToggleTopic(t._id)
                                  }}
                                />
                                <AnimCollapse open={tExp}>
                                  <div style={{ marginLeft: 12, borderLeft: `1.5px solid ${C.border}` }}>
                                    {t.subTopics?.map((st: any) => (
                                      <SubtopicRow
                                        key={st._id}
                                        title={st.title}
                                        isSelected={selectedItem?.id === st._id}
                                        isCurrentTopic={st._id === currentTopicId}
                                        onClick={() =>
                                          sel(st._id, st.title, "subtopic",
                                            [m._id, sm._id, t._id, st._id], st.pedagogy)
                                        }
                                      />
                                    ))}
                                  </div>
                                </AnimCollapse>
                              </div>
                            )
                          })}
                        </div>
                      </AnimCollapse>
                    </div>
                  )
                })}

                {!m.subModules?.length && m.topics?.map((t: any) => {
                  const tExp = expandedTopics.has(t._id)
                  const tSel = selectedItem?.id === t._id
                  return (
                    <div key={t._id}>
                      <TreeModuleRow
                        icon={getModuleIcon(t.title)}
                        label={t.title}
                        isOpen={tExp}
                        isActive={tSel}
                        depth={2}
                        onToggle={() => {
                          sel(t._id, t.title, "topic", [m._id, t._id], t.pedagogy)
                          onToggleTopic(t._id)
                        }}
                      />
                      <AnimCollapse open={tExp}>
                        <div style={{ marginLeft: 12, borderLeft: `1.5px solid ${C.border}` }}>
                          {t.subTopics?.map((st: any) => (
                            <SubtopicRow
                              key={st._id}
                              title={st.title}
                              isSelected={selectedItem?.id === st._id}
                              isCurrentTopic={st._id === currentTopicId}
                              onClick={() =>
                                sel(st._id, st.title, "subtopic",
                                  [m._id, t._id, st._id], st.pedagogy)
                              }
                            />
                          ))}
                        </div>
                      </AnimCollapse>
                    </div>
                  )
                })}

              </div>
            </AnimCollapse>
          </div>
        )
      })}
      <div style={{ height: 16 }} />
      {/* <UpgradeBanner /> */}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGOUT MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
export const LogoutModal: React.FC<{
  onConfirm: () => void
  onCancel: () => void
}> = ({ onConfirm, onCancel }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <div style={{
      background: "#161b25", borderRadius: 16, padding: "28px 24px",
      maxWidth: 300, width: "90%",
      border: `1px solid ${C.border}`,
      boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
      textAlign: "center", fontFamily: C.font,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: "rgba(78,130,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 14px",
      }}>
        <AlertTriangle size={20} color={C.accent} />
      </div>
      <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: C.text, fontFamily: C.font }}>
        Logout?
      </h3>
      <p style={{ margin: "0 0 22px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.65, fontFamily: C.font }}>
        Your progress is saved. You can resume anytime.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 9,
            border: `1.5px solid ${C.border}`, background: "transparent",
            color: C.textMuted, fontWeight: 600, fontSize: 13,
            cursor: "pointer", fontFamily: C.font,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
            background: "linear-gradient(135deg,#4e82ff,#3a6fd8)",
            color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: C.font,
          }}
        >
          Yes, Logout
        </button>
      </div>
    </div>
  </div>
)

/* Styling intentionally kept light to match page shell. */