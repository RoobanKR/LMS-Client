// components/Sidebar.tsx
import React from "react"
import { ChevronRight, Search, Minus, Plus, Layers, FolderOpen, FileText, Hash, Library } from "lucide-react"
import { T, DEPTH_CFG } from "./types/constants"
import { hasChildItems, hasPedagogyData } from "./types/utils"
import { CourseData, SelectedItem, SelectedItemType } from "./types/types"

const DC = (d: number) => DEPTH_CFG[Math.min(d, 3) as 0|1|2|3]

const SBNodeIcon = ({type, size}: {type: string; size: number}) => {
  const p = {size, strokeWidth: 2}
  if(type === 'module') return <Library {...p} />
  if(type === 'submodule') return <FolderOpen {...p} />
  if(type === 'topic') return <FileText {...p} />
  return <Hash {...p} />
}

const SidebarNode = ({title, type, level, isSelected, isExpanded, hasChildren, hasPedagogy, onToggle, onSelect}: {
  title: string; type: string; level: number; isSelected: boolean; isExpanded: boolean;
  hasChildren: boolean; hasPedagogy: boolean; onToggle: () => void; onSelect: () => void;
}) => {
  const cfg = DC(level)
  const lp = 10 + level * 14
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if(hasChildren) onToggle()
    else onSelect()
  }
  return (
    <div style={{position: 'relative'}}>
      {level === 0 && <div style={{height: 1, margin: '1px 0', background: T.line}} />}
      <div className="sb-row" onClick={handleClick} style={{
        display: 'flex', alignItems: 'center', gap: 4, paddingLeft: lp, paddingRight: 10,
        paddingTop: cfg.paddingV, paddingBottom: cfg.paddingV, position: 'relative',
        background: isSelected ? `${cfg.accentColor}08` : 'transparent',
        borderLeft: isSelected ? `2px solid ${cfg.accentColor}` : `1px solid ${cfg.accentColor}18`
      }}>
        {hasChildren ? (
          <div style={{
            flexShrink: 0, width: 16, height: 16, borderRadius: 4, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: isExpanded ? `${cfg.accentColor}12` : isSelected ? `${cfg.accentColor}08` : T.surface,
            border: `1px solid ${isExpanded ? cfg.accentColor + '40' : T.line}`,
            cursor: 'pointer'
          }}>
            {isExpanded ? (
              <Minus size={11} strokeWidth={2.2} style={{
                color: isSelected ? cfg.accentColor : T.inkSub
              }} />
            ) : (
              <Plus size={11} strokeWidth={2.2} style={{
                color: isSelected ? cfg.accentColor : T.inkSub
              }} />
            )}
          </div>
        ) : (
          <div style={{flexShrink: 0, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <span style={{width: 3, height: 3, borderRadius: '50%', display: 'block', background: isSelected ? cfg.accentColor : T.inkFaint}} />
          </div>
        )}
        <div style={{
          flexShrink: 0, width: cfg.iconBox, height: cfg.iconBox, borderRadius: cfg.iconRadius,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isSelected ? cfg.iconBg : 'transparent', color: isSelected ? cfg.iconColor : T.inkMuted,
          border: `1px solid ${isSelected ? cfg.accentColor + '25' : T.line}`
        }}>
          <SBNodeIcon type={type} size={cfg.iconStroke} />
        </div>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{
            fontSize: cfg.textSize, fontWeight: cfg.textWeight, color: isSelected ? cfg.accentColor : cfg.textColor,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2
          }}>{title}</div>
          {level <= 1 && <span style={{
            fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
            color: isSelected ? cfg.accentColor : T.inkFaint
          }}>{type}</span>}
        </div>
        {hasPedagogy && <span style={{
          width: 4, height: 4, borderRadius: '50%', flexShrink: 0, background: isSelected ? cfg.dot : '#10b981',
          boxShadow: isSelected ? `0 0 6px 1px ${cfg.dot}80` : 'none',
          animation: isSelected ? 'sbPulse 2s ease-in-out infinite' : 'none'
        }} />}
      </div>
    </div>
  )
}

interface SidebarProps {
  courseData: CourseData | null
  selectedItem: SelectedItem | null
  expandedModules: Set<string>
  expandedSubModules: Set<string>
  expandedTopics: Set<string>
  sidebarSearch: string
  onItemSelect: (id: string, title: string, type: SelectedItemType, hierarchy: string[], pedagogy?: any) => void
  onToggleModule: (id: string) => void
  onToggleSubModule: (id: string) => void
  onToggleTopic: (id: string) => void
  onSearchChange: (search: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  courseData, selectedItem, expandedModules, expandedSubModules, expandedTopics,
  sidebarSearch, onItemSelect, onToggleModule, onToggleSubModule, onToggleTopic, onSearchChange
}) => {
  if(!courseData?.modules) return null

  const filteredModules = courseData.modules.filter(m => !sidebarSearch ||
    m.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    m.topics?.some(t => t.title.toLowerCase().includes(sidebarSearch.toLowerCase())) ||
    m.subModules?.some(sm => sm.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      sm.topics?.some(t => t.title.toLowerCase().includes(sidebarSearch.toLowerCase()))))

  return (
    <div style={{paddingBottom: 12}}>
      {filteredModules.map(module => {
        const mExp = expandedModules.has(module._id)
        const mSel = selectedItem?.id === module._id
        const mHasKids = hasChildItems(module)
        return (
          <div key={module._id}>
            <SidebarNode
              title={module.title} type="module" level={0} isSelected={mSel} isExpanded={mExp}
              hasChildren={mHasKids} hasPedagogy={hasPedagogyData(module)}
              onToggle={() => onToggleModule(module._id)}
              onSelect={() => onItemSelect(module._id, module.title, "module", [module._id], module.pedagogy)}
            />
            {mExp && (
              <div style={{animation: 'sbSlide .15s ease both'}}>
                {module.subModules?.map(sm => {
                  const sExp = expandedSubModules.has(sm._id)
                  const sSel = selectedItem?.id === sm._id
                  const sHasKids = hasChildItems(sm)
                  return (
                    <div key={sm._id}>
                      <SidebarNode
                        title={sm.title} type="submodule" level={1} isSelected={sSel} isExpanded={sExp}
                        hasChildren={sHasKids} hasPedagogy={hasPedagogyData(sm)}
                        onToggle={() => onToggleSubModule(sm._id)}
                        onSelect={() => onItemSelect(sm._id, sm.title, "submodule", [module._id, sm._id], sm.pedagogy)}
                      />
                      {sExp && (
                        <div style={{animation: 'sbSlide .15s ease both'}}>
                          {sm.topics?.map(t => {
                            const tExp = expandedTopics.has(t._id)
                            const tSel = selectedItem?.id === t._id
                            const tHasKids = hasChildItems(t)
                            return (
                              <div key={t._id}>
                                <SidebarNode
                                  title={t.title} type="topic" level={2} isSelected={tSel} isExpanded={tExp}
                                  hasChildren={tHasKids} hasPedagogy={hasPedagogyData(t)}
                                  onToggle={() => onToggleTopic(t._id)}
                                  onSelect={() => onItemSelect(t._id, t.title, "topic", [module._id, sm._id, t._id], t.pedagogy)}
                                />
                                {tExp && (
                                  <div style={{animation: 'sbSlide .15s ease both'}}>
                                    {t.subTopics?.map(st => (
                                      <SidebarNode
                                        key={st._id} title={st.title} type="subtopic" level={3}
                                        isSelected={selectedItem?.id === st._id} isExpanded={false} hasChildren={false}
                                        hasPedagogy={hasPedagogyData(st)} onToggle={() => {}}
                                        onSelect={() => onItemSelect(st._id, st.title, "subtopic", [module._id, sm._id, t._id, st._id], st.pedagogy)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                {(!module.subModules?.length) && module.topics?.map(t => {
                  const tExp = expandedTopics.has(t._id)
                  const tSel = selectedItem?.id === t._id
                  const tHasKids = hasChildItems(t)
                  return (
                    <div key={t._id}>
                      <SidebarNode
                        title={t.title} type="topic" level={1} isSelected={tSel} isExpanded={tExp}
                        hasChildren={tHasKids} hasPedagogy={hasPedagogyData(t)}
                        onToggle={() => onToggleTopic(t._id)}
                        onSelect={() => onItemSelect(t._id, t.title, "topic", [module._id, t._id], t.pedagogy)}
                      />
                      {tExp && (
                        <div style={{animation: 'sbSlide .15s ease both'}}>
                          {t.subTopics?.map(st => (
                            <SidebarNode
                              key={st._id} title={st.title} type="subtopic" level={2}
                              isSelected={selectedItem?.id === st._id} isExpanded={false} hasChildren={false}
                              hasPedagogy={hasPedagogyData(st)} onToggle={() => {}}
                              onSelect={() => onItemSelect(st._id, st.title, "subtopic", [module._id, t._id, st._id], st.pedagogy)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface SidebarHeaderProps {
  courseName: string
  modulesCount: number
  sidebarSearch: string
  onSearchChange: (search: string) => void
  onExpandAll?: () => void
  onCollapseAll?: () => void
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({ 
  courseName, 
  modulesCount, 
  sidebarSearch, 
  onSearchChange,
  onExpandAll,
  onCollapseAll 
}) => (
  <>
    <div style={{background: 'linear-gradient(145deg,#F27757,#E0623F)', padding: '14px 14px', flexShrink: 0}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <div style={{flex: 1, minWidth: 0}}>
          <p style={{margin: 0, fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,.65)'}}>Course</p>
          <h2 style={{margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2}}>{courseName}</h2>
          <span style={{display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4, padding: '1px 6px', borderRadius: 14, fontSize: 8, fontWeight: 500, color: 'rgba(255,255,255,.85)', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.18)'}}>
            <Layers size={8}/>{modulesCount} modules
          </span>
        </div>
      </div>
    </div>
    <div style={{padding: '8px 10px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, background: T.bg}}>
      <div style={{position: 'relative', marginBottom: 8}}>
        <Search size={11} style={{position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.inkFaint}}/>
        <input className="sb-input" type="text" placeholder="Search topics…" value={sidebarSearch}
          onChange={e => onSearchChange(e.target.value)}
          style={{width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6, fontSize: 11, fontFamily: "'DM Sans',sans-serif", background: T.surface, border: `1px solid ${T.line}`, borderRadius: 8, color: T.ink}}/>
      </div>
      {(onExpandAll || onCollapseAll) && (
        <div style={{display: 'flex', gap: 4}}>
          {onExpandAll && (
            <button 
              onClick={onExpandAll}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 500,
                color: T.ink,
                background: T.surface,
                border: `1px solid ${T.line}`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${T.surface}CC`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.surface
              }}
            >
              <Plus size={10} strokeWidth={2} />
              Expand All
            </button>
          )}
          {onCollapseAll && (
            <button 
              onClick={onCollapseAll}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 500,
                color: T.ink,
                background: T.surface,
                border: `1px solid ${T.line}`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${T.surface}CC`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = T.surface
              }}
            >
              <Minus size={10} strokeWidth={2} />
              Collapse All
            </button>
          )}
        </div>
      )}
    </div>
  </>
)