"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X, FileText, Video, FileArchive, Link2, BookOpen, FolderPlus,
  Search, ChevronRight, File, Presentation, FilePlus2,
} from "lucide-react";
import type { FileTypeConfig, CourseNode } from "./Types";
import { PageCreationModal, type PageBlock, type HierarchyInfo, type PagesPayload } from "./Pagecreationmodal";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  orange:      '#F27757',
  orangeDark:  '#E0623F',
  orangeDeep:  '#C95530',
  orangeGlow:  'rgba(242,119,87,0.22)',
  orangeLight: 'rgba(242,119,87,0.08)',
  orangeMid:   'rgba(242,119,87,0.15)',
  textMain:    '#1a1a2e',
  textSub:     '#6b6b7e',
  textMuted:   '#8b8b9e',
  textHint:    '#bcbccc',
  border:      '#ece9f1',
  bg:          '#ffffff',
  pageBg:      '#faf9fc',
  warm:        '#fff8f6',
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface NotionResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileTypes: FileTypeConfig[];
  selectedNode: CourseNode | null;
  activeTab: "I_Do" | "We_Do" | "You_Do" | null;
  activeSubcategory: string;
  currentFolderPath: string[];
  onSelectType: (typeKey: string) => void;
  onCreateFolder: () => void;
  onCreatePage?: (blocks: PageBlock[], title: string, hierarchyInfo?: HierarchyInfo) => void;
  hierarchyInfo?: HierarchyInfo;
  onPageCreated?: () => Promise<void>;
}

// Type descriptions for each resource type
const TYPE_META: Record<string, { description: string; badge?: string }> = {
  folder:        { description: "Organise resources into named collections" },
  pdf:           { description: "Lecture notes, readings, or handouts" },
  ppt:           { description: "Slideshow presentations for class" },
  video:         { description: "Video lessons, recordings, or tutorials" },
  zip:           { description: "Compressed files and project archives" },
  url:           { description: "External websites, articles, or tools" },
  reference:     { description: "Reference materials and supplementary docs" },
  page_creation: { description: "Build rich content pages with editable blocks", badge: "Live Edit" },
};

// ─── Helper functions ────────────────────────────────────────────────────────
function getResourceIcon(key: string, size = 20): React.ReactNode {
  const map: Record<string, React.ReactNode> = {
    folder:       <FolderPlus  size={size}/>,
    pdf:          <FileText    size={size}/>,
    ppt:          <Presentation size={size}/>,
    video:        <Video       size={size}/>,
    zip:          <FileArchive size={size}/>,
    url:          <Link2       size={size}/>,
    reference:    <BookOpen    size={size}/>,
    page_creation:<FilePlus2   size={size}/>,
  };
  return map[key] || <File size={size}/>;
}

// ─── NotionResourceModal ──────────────────────────────────────────────────────
export const NotionResourceModal: React.FC<NotionResourceModalProps> = ({
  isOpen, onClose, fileTypes, selectedNode, activeTab, activeSubcategory,
  currentFolderPath, onSelectType, onCreateFolder, onCreatePage, hierarchyInfo,
  onPageCreated,
}) => {
  const [search,        setSearch]        = useState("");
  const [hoveredKey,    setHoveredKey]    = useState<string|null>(null);
  const [showPageModal, setShowPageModal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

const sortedFileTypes = React.useMemo(() => {
  // Define order categories
  const folderType = fileTypes.find(ft => ft.key === "folder");
  const dynamicTypes = fileTypes.filter(ft => 
    ft.key !== "folder" && 
    ft.key !== "zip" && 
    ft.key !== "reference" && 
    ft.key !== "page_creation"
  );
  const staticTypes = fileTypes.filter(ft => 
    ft.key === "zip" || ft.key === "reference" || ft.key === "page_creation"
  );
  
  // Combine in the desired order
  return [
    ...(folderType ? [folderType] : []),
    ...dynamicTypes,
    ...staticTypes
  ];
}, [fileTypes]);

  useEffect(() => {
    if(isOpen){ 
      setSearch(""); 
      setTimeout(() => searchRef.current?.focus(), 150); 
    }
  }, [isOpen]);

  useEffect(() => {
    if(!isOpen) return;
    const onKey = (e: KeyboardEvent) => { 
      if(e.key === "Escape") onClose(); 
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if(!isOpen) return null;

  // Filter file types based on search
  const filtered = sortedFileTypes.filter(ft =>
    ft.label.toLowerCase().includes(search.toLowerCase()) ||
    (TYPE_META[ft.key]?.description || "").toLowerCase().includes(search.toLowerCase())
  );

  // Build location breadcrumbs
  const locationParts = [
    selectedNode?.name, 
    activeTab?.replace("_", " "),
    activeSubcategory?.replace(/_/g, " "), 
    ...currentFolderPath,
  ].filter(Boolean);

  // Handle resource selection
 const handleSelect = (key: string) => {
  if(key === "folder") { 
    onClose(); 
    onCreateFolder(); 
  }
  else if(key === "page_creation") { 
    setShowPageModal(true); 
  }
  else { 
    onClose(); 
    onSelectType(key); 
  }
};

  // Handle page creation confirmation
  const handlePageConfirm = async (payload: PagesPayload) => {
    setShowPageModal(false);
    onClose();
    const firstPage = payload.pages?.[0];
    onCreatePage?.(firstPage?.blocks ?? [], firstPage?.name ?? "Untitled", hierarchyInfo);
    await onPageCreated?.();
  };

  // Color mapping for breadcrumbs
  const CRUMB_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    course:    { bg: T.orangeLight, text: T.orangeDeep, dot: T.orange },
    module:    { bg: T.orangeLight, text: T.orange,     dot: T.orange },
    submodule: { bg: 'rgba(99,102,241,0.08)', text: '#4338ca', dot: '#818cf8' },
    topic:     { bg: 'rgba(16,185,129,0.08)', text: '#047857', dot: '#34d399' },
    subtopic:  { bg: 'rgba(245,158,11,0.08)', text: '#b45309', dot: '#fbbf24' },
    tab:       { bg: T.orangeLight, text: T.orange,     dot: T.orange },
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ animation: "nrmFadeIn 0.18s ease-out both" }}>
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onClose}/>

        <div className="relative w-full mx-4 flex flex-col overflow-hidden"
          style={{ 
            maxWidth: "680px", 
            maxHeight: "85vh", 
            background: T.bg, 
            borderRadius: "22px", 
            border: `1.5px solid ${T.border}`, 
            boxShadow: `0 24px 60px rgba(0,0,0,0.18)`, 
            animation: "nrmSlideUp 0.22s cubic-bezier(0.16,1,0.3,1) both",
            fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" 
          }}
          onClick={e => e.stopPropagation()}>

          {/* ── Orange hero header ─────────────────────────────────────────── */}
          <div className="relative overflow-hidden flex-shrink-0"
            style={{ 
              background: `linear-gradient(140deg, #F27757 0%, #E86440 48%, #D95830 100%)`, 
              padding: "10px 15px 18px", 
              borderRadius: "20px 20px 0 0" 
            }}>
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} viewBox="0 0 680 100" fill="none">
              <circle cx="640" cy="-10" r="80"  stroke="rgba(255,255,255,0.18)" strokeWidth="1.2"/>
              <circle cx="640" cy="-10" r="140" stroke="rgba(255,255,255,0.08)" strokeWidth="1.2"/>
              <circle cx="40"  cy="120" r="65"  stroke="rgba(255,255,255,0.12)" strokeWidth="1.2"/>
            </svg>
            <div style={{ position: "relative", zIndex: 1 }}>
              {/* Location breadcrumb pill */}
              {locationParts.length > 0 && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl mb-3 text-[11px] font-medium"
                  style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.28)", color: "rgba(255,255,255,0.85)" }}>
                  {locationParts.map((p, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span style={{ color: "rgba(255,255,255,0.45)" }}>›</span>}
                      <span>{p}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] font-bold text-white leading-tight tracking-tight">Add a new resource</h2>
                  <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>Choose what you'd like to create or upload</p>
                </div>
                <button onClick={onClose}
                  className="flex-shrink-0 p-1.5 rounded-xl transition-all"
                  style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.85)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.30)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.18)"}>
                  <X size={16}/>
                </button>
              </div>
            </div>
          </div>

          {/* ── Hierarchy crumbs ────────────────────────────────────────────── */}
          {hierarchyInfo && (
            <div className="flex flex-wrap gap-1.5 px-5 pt-3 pb-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${T.border}`, background: T.pageBg }}>
              {[
                hierarchyInfo.courseName    && { label: `Course: ${hierarchyInfo.courseName}`, type: 'course' },
                hierarchyInfo.moduleName    && { label: `Module: ${hierarchyInfo.moduleName}`, type: 'module' },
                hierarchyInfo.subModuleName && { label: `SubModule: ${hierarchyInfo.subModuleName}`, type: 'submodule' },
                hierarchyInfo.topicName     && { label: `Topic: ${hierarchyInfo.topicName}`, type: 'topic' },
                hierarchyInfo.subTopicName  && { label: `SubTopic: ${hierarchyInfo.subTopicName}`, type: 'subtopic' },
                hierarchyInfo.tabType       && { label: `${hierarchyInfo.tabType.replace('_', ' ')}${hierarchyInfo.subcategory ? ` › ${hierarchyInfo.subcategory.replace(/_/g, ' ')}` : ''}`, type: 'tab' },
              ].filter(Boolean).map((crumb: any, i) => {
                const c = CRUMB_COLORS[crumb.type] || { bg: T.pageBg, text: T.textSub, dot: T.border };
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: c.bg, color: c.text, border: `1px solid ${c.dot}25` }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }}/>
                    {crumb.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* ── Search ──────────────────────────────────────────────────────── */}
          <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}`, background: T.bg }}>
            <div className="relative">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.textHint }}/>
              <input 
                ref={searchRef} 
                type="text" 
                placeholder="Search resource types…" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-[13px] outline-none transition-all"
                style={{ background: T.pageBg, border: `1.5px solid ${T.border}`, borderRadius: "10px", color: T.textMain, fontFamily: "inherit" }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = T.orange;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}`;
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {search && (
                <button 
                  onClick={() => setSearch("")} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded" 
                  style={{ color: T.textHint }}>
                  <X size={12}/>
                </button>
              )}
            </div>
          </div>

          {/* ── Resource grid ────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin", scrollbarColor: `${T.border} transparent` }}>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: T.orangeLight }}>
                  <Search size={20} style={{ color: T.orange }}/>
                </div>
                <p className="text-[13px] font-bold" style={{ color: T.textMain }}>No matches for "{search}"</p>
                <p className="text-[12px] mt-1" style={{ color: T.textMuted }}>Try a different keyword</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filtered.map(ft => {
                  const meta = TYPE_META[ft.key] || { description: `Upload ${ft.label} files` };
                  const isHov = hoveredKey === ft.key;
                  return (
                    <button 
                      key={ft.key} 
                      onClick={() => handleSelect(ft.key)}
                      onMouseEnter={() => setHoveredKey(ft.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      className="group relative flex items-center gap-1.5 p-2 rounded-2xl text-left select-none overflow-hidden"
                      style={{
                        background: isHov ? T.warm : T.pageBg,
                        border: `1.5px solid ${isHov ? T.orange : T.border}`,
                        boxShadow: isHov ? `0 6px 24px ${T.orangeGlow}` : 'none',
                        transform: isHov ? 'translateY(-2px)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                      }}>

                      {/* Glow strip left edge */}
                      {isHov && <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl" style={{ background: ft.color }}/>}

                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: isHov ? `${ft.color}15` : T.bg,
                          border: `1.5px solid ${isHov ? ft.color + '35' : T.border}`,
                          color: ft.color,
                          transform: isHov ? 'scale(1.07)' : 'scale(1)',
                          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                          boxShadow: isHov ? `0 4px 12px ${ft.color}20` : 'none',
                        }}>
                        {getResourceIcon(ft.key, 21)}
                      </div>

                      {/* Label & desc */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold flex items-center gap-1.5 flex-wrap" style={{ color: isHov ? T.orange : T.textMain, transition: "color 0.15s" }}>
                          {ft.label}
                          {meta.badge && (
                            <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                              style={{ background: T.orangeLight, color: T.orange, border: `1px solid ${T.orange}20` }}>{meta.badge}</span>
                          )}
                        </div>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: T.textMuted }}>{meta.description}</p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight size={14} className="flex-shrink-0"
                        style={{ color: isHov ? T.orange : T.textHint, transform: isHov ? "translateX(3px)" : "none", transition: "all 0.2s" }}/>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${T.border}`, background: T.pageBg }}>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.textMuted, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>ESC</kbd>
              <span className="text-[11px] font-medium" style={{ color: T.textMuted }}>to close</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg"
              style={{ color: T.textHint, background: T.bg, border: `1px solid ${T.border}` }}>
              {filtered.length} option{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <style jsx global>{`
          @keyframes nrmFadeIn  { from{opacity:0} to{opacity:1} }
          @keyframes nrmSlideUp { from{opacity:0;transform:scale(.97) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        `}</style>
      </div>

      {/* Page Creation Modal */}
     {showPageModal && (
  <PageCreationModal 
    onBack={() => setShowPageModal(false)} 
    onConfirm={handlePageConfirm} 
    hierarchyInfo={hierarchyInfo}
  />
)}
    </>
  );
};

export default NotionResourceModal;