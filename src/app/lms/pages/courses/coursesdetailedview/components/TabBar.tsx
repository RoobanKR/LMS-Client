// components/TabBar.tsx
import React, { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown, Activity } from "lucide-react"
import { T } from "./types/constants"
import { TAB_META } from "./tabMeta"

interface SubcategoryItem {
  key: string
  label: string
  icon: React.ReactNode
  component: any
}

interface TabBarProps {
  selectedNode: any
  activeTab: string | null
  activeSubcategory: string
  subcategories: {
    I_Do: SubcategoryItem[]
    We_Do: SubcategoryItem[]
    You_Do: SubcategoryItem[]
  }
  onTabChange: (tab: string) => void
  onSubcategoryChange: (sub: string, component: any) => void
}

export const TabBar: React.FC<TabBarProps> = ({
  selectedNode, 
  activeTab, 
  activeSubcategory, 
  subcategories,
  onTabChange, 
  onSubcategoryChange
}) => {
  const [hoveredTab, setHoveredTab] = useState<string>("")
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({})
  const [pillVisible, setPillVisible] = useState(false)
  const [pillColor, setPillColor] = useState("")

  const trackRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Partial<Record<string, HTMLButtonElement>>>({})
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inDrop = useRef(false)

  const updatePill = useCallback(() => {
    if (!activeTab || !selectedNode || !trackRef.current) {
      setPillVisible(false)
      return
    }
    const btn = btnRefs.current[activeTab]
    if (!btn) return
    const tr = trackRef.current.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    setPillStyle({ left: br.left - tr.left - 4, width: br.width })
    setPillColor(TAB_META[activeTab as keyof typeof TAB_META].color)
    setPillVisible(true)
  }, [activeTab, selectedNode])

  useEffect(() => {
    updatePill()
    window.addEventListener("resize", updatePill)
    return () => window.removeEventListener("resize", updatePill)
  }, [updatePill])

  const clearLeave = () => { 
    if (leaveTimer.current) clearTimeout(leaveTimer.current) 
  }
  
  const handleTabEnter = (tab: string) => { 
    if (!selectedNode) return
    clearLeave()
    setHoveredTab(tab)
  }
  
  const handleTabLeave = () => { 
    leaveTimer.current = setTimeout(() => { 
      if (!inDrop.current) setHoveredTab("") 
    }, 120)
  }
  
  const handleDropEnter = () => { 
    inDrop.current = true
    clearLeave()
  }
  
  const handleDropLeave = () => { 
    inDrop.current = false
    leaveTimer.current = setTimeout(() => setHoveredTab(""), 120)
  }

  const handleTabClick = (tabKey: string) => {
    if (!selectedNode) return
    setHoveredTab("")
    if (activeTab !== tabKey) {
      onTabChange(tabKey)
      const subs = subcategories[tabKey as keyof typeof subcategories] || []
      if (subs.length > 0) onSubcategoryChange(subs[0].key, subs[0].component)
    }
  }

  const handleSubClick = (tabKey: string, sub: SubcategoryItem) => {
    setHoveredTab("")
    if (activeTab !== tabKey) onTabChange(tabKey)
    onSubcategoryChange(sub.key, sub.component)
  }

  const activeSub = activeTab ? subcategories[activeTab as keyof typeof subcategories]?.find(s => s.key === activeSubcategory) : null

  return (
    <div className="flex-shrink-0 px-3 py-2.5" style={{ 
      background: T.bg, 
      borderBottom: `1px solid ${T.border}`, 
      position: "relative", 
      zIndex: 30 
    }}>
      <div ref={trackRef} className="flex items-center gap-0.5 w-full"
        style={{ 
          background: "#f1f0f4", 
          border: "1px solid #e6e4ee", 
          borderRadius: 13, 
          padding: 4, 
          position: "relative" 
        }}>

        {pillVisible && (
          <div style={{
            position: "absolute", 
            top: 4, 
            height: "calc(100% - 8px)",
            background: pillColor, 
            borderRadius: 10,
            boxShadow: `0 4px 14px ${pillColor}55`,
            transition: "left 0.24s cubic-bezier(0.34,1.3,0.64,1), width 0.24s cubic-bezier(0.34,1.3,0.64,1), background 0.18s ease",
            zIndex: 1, 
            pointerEvents: "none",
            ...pillStyle,
          }} />
        )}

        {(["I_Do", "We_Do", "You_Do"] as const).map(tabKey => {
          const cfg = TAB_META[tabKey]
          const isSel = activeTab === tabKey
          const isDis = !selectedNode
          const subs = subcategories[tabKey] ?? []
          const showDrop = hoveredTab === tabKey && !isDis && subs.length > 0

          return (
            <div key={tabKey} className="relative flex-1" style={{ zIndex: 2 }}
              onMouseEnter={() => !isDis && handleTabEnter(tabKey)}
              onMouseLeave={handleTabLeave}>
              <button
                ref={el => { if (el) btnRefs.current[tabKey] = el }}
                onClick={() => handleTabClick(tabKey)}
                disabled={isDis}
                className="flex items-center justify-center gap-1.5 w-full rounded-[10px] select-none"
                style={{
                  padding: "7px 8px", 
                  fontSize: 11.5, 
                  fontWeight: 800, 
                  letterSpacing: "0.01em",
                  border: "none", 
                  background: "transparent",
                  color: isSel ? "#ffffff" : isDis ? "#c4c0cc" : "#5a5a6e",
                  opacity: isDis ? 0.38 : 1,
                  cursor: isDis ? "not-allowed" : "pointer",
                  transition: "color 0.15s", 
                  position: "relative", 
                  zIndex: 2, 
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { 
                  if (!isDis && !isSel) (e.currentTarget as HTMLElement).style.color = cfg.color 
                }}
                onMouseLeave={e => { 
                  if (!isDis && !isSel) (e.currentTarget as HTMLElement).style.color = "#5a5a6e" 
                }}
              >
                <span style={{ 
                  color: isSel ? "rgba(255,255,255,0.88)" : isDis ? "#c4c0cc" : "#9896aa", 
                  display: "flex", 
                  alignItems: "center", 
                  transition: "color 0.15s" 
                }}>
                  {cfg.icon}
                </span>
                {cfg.label}
                {!isDis && subs.length > 0 && (
                  <ChevronDown size={10} style={{
                    color: isSel ? "rgba(255,255,255,0.72)" : "#b8b6c8",
                    transform: showDrop ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.16s, color 0.15s", 
                    marginLeft: 1,
                  }} />
                )}
              </button>

              {showDrop && (
                <div className="absolute top-full left-0 right-0" style={{ paddingTop: 6, zIndex: 50 }}
                  onMouseEnter={handleDropEnter} 
                  onMouseLeave={handleDropLeave}>
                  <div style={{
                    background: "#fff", 
                    border: `1.5px solid ${cfg.color}2e`, 
                    borderRadius: 13,
                    boxShadow: `0 10px 28px ${cfg.shadow}, 0 2px 8px rgba(0,0,0,0.06)`,
                    padding: 5, 
                    animation: "ccDropIn 0.15s cubic-bezier(0.16,1,0.3,1) both",
                  }}>
                    {subs.map((sub, idx) => {
                      const isActiveSub = activeSubcategory === sub.key && activeTab === tabKey
                      return (
                        <button key={sub.key} onClick={() => handleSubClick(tabKey, sub)}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-[10px]"
                          style={{
                            fontSize: 11, 
                            fontWeight: 700,
                            background: isActiveSub ? cfg.color : "transparent",
                            color: isActiveSub ? "#ffffff" : "#5a5a6e",
                            marginBottom: idx < subs.length - 1 ? 2 : 0,
                            border: "none", 
                            cursor: "pointer", 
                            transition: "background 0.12s, color 0.12s",
                          }}
                          onMouseEnter={e => { 
                            if (!isActiveSub) { 
                              (e.currentTarget as HTMLElement).style.background = cfg.bg
                              ;(e.currentTarget as HTMLElement).style.color = cfg.color 
                            } 
                          }}
                          onMouseLeave={e => { 
                            if (!isActiveSub) { 
                              (e.currentTarget as HTMLElement).style.background = "transparent"
                              ;(e.currentTarget as HTMLElement).style.color = "#5a5a6e" 
                            } 
                          }}>
                          <span style={{ 
                            color: isActiveSub ? "rgba(255,255,255,0.85)" : "#9896aa", 
                            display: "flex", 
                            alignItems: "center" 
                          }}>
                            {sub.icon}
                          </span>
                          <span className="truncate flex-1">{sub.label}</span>
                          {isActiveSub && (
                            <span style={{ 
                              width: 5, 
                              height: 5, 
                              background: "#fff", 
                              borderRadius: "50%", 
                              flexShrink: 0, 
                              marginLeft: "auto", 
                              boxShadow: "0 0 5px rgba(255,255,255,0.8)" 
                            }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {activeTab && activeSub && selectedNode && (
        <div className="flex items-center gap-1.5 mt-2 px-0.5" style={{ animation: "ccBadgeUp 0.18s ease both" }}>
          <span style={{ 
            fontSize: 9, 
            fontWeight: 800, 
            color: "#c4c0cc", 
            letterSpacing: "0.07em", 
            textTransform: "uppercase" 
          }}>
            Viewing
          </span>
          <span className="flex items-center gap-1"
            style={{ 
              background: TAB_META[activeTab as keyof typeof TAB_META].bg, 
              color: TAB_META[activeTab as keyof typeof TAB_META].color, 
              border: `1px solid ${TAB_META[activeTab as keyof typeof TAB_META].color}28`, 
              borderRadius: 6, 
              padding: "3px 9px", 
              fontSize: 10.5, 
              fontWeight: 800 
            }}>
            <span style={{ display: "flex", alignItems: "center" }}>{activeSub.icon}</span>
            {activeSub.label}
          </span>
        </div>
      )}
    </div>
  )
}