"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronRight, ChevronLeft,
  BookOpen, Library, FolderOpen, FileText,
  File as FileIcon, Search, X, Layers, ArrowLeft, Loader2
} from "lucide-react";
import type { CourseNode } from "./Types";
import { useRouter } from "next/navigation";

/* ─── Google Fonts ─────────────────────────────────────────────────────────── */
const FontImport = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');

    .sb * { box-sizing: border-box; }
    .sb   { font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
    .sbH  { font-family: 'Plus Jakarta Sans', sans-serif; }

    @keyframes sbSlide { from { opacity:0; transform:translateY(-3px) } to { opacity:1; transform:translateY(0) } }
    @keyframes sbFade  { from { opacity:0 } to { opacity:1 } }
    @keyframes sbPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes sbSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    .sb-row {
      transition: background .12s ease, border-left-color .12s ease;
      cursor: pointer;
    }
    .sb-row:hover { background: rgba(0,0,0,.02) !important; }

    .sb-scroll { scrollbar-width: thin; scrollbar-color: #e4e0ed transparent; }
    .sb-scroll::-webkit-scrollbar { width: 3px; }
    .sb-scroll::-webkit-scrollbar-thumb { background: #e4e0ed; border-radius: 3px; }

    .sb-resize:hover .sb-rbar { background:#F27757 !important; height:60px !important; }

    .sb-input { outline:none; transition: border-color .15s, box-shadow .15s; }
    .sb-input:focus { border-color:#F27757 !important; box-shadow:0 0 0 2px rgba(242,119,87,.08) !important; }

    .back-button {
      transition: all .15s ease;
      cursor: pointer;
    }
    .back-button:hover {
      background: rgba(255,255,255,.25) !important;
      transform: scale(1.05);
    }
  `}</style>
);

/* ─── Tokens ───────────────────────────────────────────────────────────────── */
const T = {
  orange:     '#F27757',
  orangeDeep: '#D95830',
  orangeTint: 'rgba(242,119,87,.06)',
  ink:        '#1A1A1E',
  inkSub:     '#3F3F46',
  inkMuted:   '#8F8F9A',
  inkFaint:   '#D1D1D9',
  line:       '#EDEAF0',
  bg:         '#FFFFFF',
  surface:    '#F8F8FA',
};

/* ─── Per-depth config — more compact sizes ───────────────────────────── */
const DEPTH = [
  /* 0 · Module */
  {
    accentColor: '#F27757',
    iconColor:   '#E0623F',
    iconBg:      'rgba(242,119,87,.10)',
    iconBox:     26, iconRadius: 8, iconStroke: 14,
    textColor:   '#18181B',
    textSize:    '12.5px', textWeight: 650,
    paddingV:    7,
    connector:   '#F27757',
    dot:         '#F27757',
  },
  /* 1 · Submodule */
  {
    accentColor: '#7C6FF7',
    iconColor:   '#5C52D9',
    iconBg:      'rgba(124,111,247,.09)',
    iconBox:     24, iconRadius: 7, iconStroke: 13,
    textColor:   '#27243D',
    textSize:    '12px', textWeight: 550,
    paddingV:    6,
    connector:   '#9D98F5',
    dot:         '#7C6FF7',
  },
  /* 2 · Topic */
  {
    accentColor: '#0EA5A0',
    iconColor:   '#0D8A85',
    iconBg:      'rgba(14,165,160,.08)',
    iconBox:     22, iconRadius: 6, iconStroke: 12,
    textColor:   '#1C3534',
    textSize:    '11.5px', textWeight: 500,
    paddingV:    5,
    connector:   '#5ECFCB',
    dot:         '#0EA5A0',
  },
  /* 3 · Subtopic */
  {
    accentColor: '#D97706',
    iconColor:   '#B45309',
    iconBg:      'rgba(217,119,6,.07)',
    iconBox:     20, iconRadius: 5, iconStroke: 11,
    textColor:   '#3D2A00',
    textSize:    '11px', textWeight: 450,
    paddingV:    4,
    connector:   '#FBBF24',
    dot:         '#D97706',
  },
] as const;

type DepthIdx = 0 | 1 | 2 | 3;
const D = (d: number) => DEPTH[Math.min(d, 3) as DepthIdx];

const NodeIcon = ({ type, size }: { type: string; size: number }) => {
  const p = { size, strokeWidth: 2 };
  if (type === 'module')    return <Library    {...p} />;
  if (type === 'submodule') return <FolderOpen {...p} />;
  if (type === 'topic')     return <FileText   {...p} />;
  return <FileIcon {...p} />;
};

const typeDepth: Record<string, number> = { module: 0, submodule: 1, topic: 2, subtopic: 3 };

const OPEN_W   = 300;
const PAD_BASE = 10;
const STEP     = 14;

/* ─── Loading Component ─────────────────────────────────────────────────── */
const LoadingSidebar: React.FC<{ width: number }> = ({ width }) => (
  <div className="sb" style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100%', 
    background: T.bg, 
    borderRight: `1px solid ${T.line}`, 
    width: width,
    position: 'relative'
  }}>
    <FontImport />
    
    {/* Header skeleton */}
    <div style={{
      flexShrink: 0,
      background: `linear-gradient(145deg, #F27757 0%, #E55A3A 100%)`,
      padding: '14px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,.18)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '50px', height: '8px', background: 'rgba(255,255,255,.4)', borderRadius: '4px', marginBottom: '8px' }} />
          <div style={{ width: '120px', height: '13px', background: 'rgba(255,255,255,.3)', borderRadius: '4px' }} />
        </div>
      </div>
    </div>

    {/* Search skeleton */}
    <div style={{ flexShrink: 0, padding: '8px 10px', background: T.bg }}>
      <div style={{ width: '100%', height: '29px', background: T.surface, borderRadius: '8px', border: `1px solid ${T.line}` }} />
    </div>

    {/* Loading spinner */}
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <Loader2 size={28} style={{ 
        color: T.orange, 
        animation: 'sbSpin 0.8s linear infinite' 
      }} />
      <p className="sbH" style={{ 
        fontSize: '12px', 
        color: T.inkMuted, 
        margin: 0,
        fontWeight: 500
      }}>
        Loading course content...
      </p>
    </div>
  </div>
);

/* ─── Props ─────────────────────────────────────────────────────────────────── */
interface CourseSidebarProps {
  courseData:           CourseNode[];
  selectedNode:         CourseNode | null;
  expandedNodes:        Set<string>;
  sidebarWidth:         number;
  searchQuery:          string;
  courseName:           string;
  moduleCount:          number;
  onNodeSelect:         (n: CourseNode) => void;
  onToggleNode:         (id: string) => void;
  onSidebarWidthChange: (w: number) => void;
  onSearchChange:       (q: string) => void;
  onMouseDown:          (e: React.MouseEvent) => void;
  isLoading?:           boolean;  // Add loading prop
}

/* ═══════════════════════════════════════════════════════════════════════════
   TreeNode
═══════════════════════════════════════════════════════════════════════════ */
interface TNProps {
  node: CourseNode; depth: number;
  selectedNode: CourseNode | null; expandedNodes: Set<string>;
  onNodeSelect: (n: CourseNode) => void; onToggleNode: (id: string) => void;
}

const TreeNode: React.FC<TNProps> = ({ node, depth, selectedNode, expandedNodes, onNodeSelect, onToggleNode }) => {
  const hasKids = !!(node.children?.length);
  const isExp   = expandedNodes.has(node.id);
  const isSel   = selectedNode?.id === node.id;
  const cfg     = D(depth);
  const leftPad = PAD_BASE + depth * STEP;

  return (
    <div style={{ position: 'relative' }}>

      {/* Subtle divider above root modules */}
      {depth === 0 && (
        <div style={{ height: '1px', margin: '1px 0', background: T.line }} />
      )}

      {/* ── Row ──────────────────────────────────────────────────────────── */}
      <div
        className="sb-row"
        onClick={() => hasKids ? onToggleNode(node.id) : onNodeSelect(node)}
        style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          paddingLeft: `${leftPad}px`, paddingRight: '10px',
          paddingTop: `${cfg.paddingV}px`, paddingBottom: `${cfg.paddingV}px`,
          position: 'relative',
          background: isSel ? `${cfg.accentColor}08` : 'transparent',
          borderLeft: isSel
            ? `2px solid ${cfg.accentColor}`
            : `1px solid ${cfg.accentColor}18`,
        }}
      >
        {/* ── Chevron / leaf ── */}
        {hasKids ? (
          <div style={{
            flexShrink: 0,
            width: '16px', height: '16px',
            borderRadius: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isExp
              ? `${cfg.accentColor}12`
              : isSel ? `${cfg.accentColor}08` : T.surface,
            border: `1px solid ${isExp ? cfg.accentColor + '40' : T.line}`,
          }}>
            <ChevronRight
              size={11}
              strokeWidth={2.2}
              style={{
                color: isExp ? cfg.accentColor : isSel ? cfg.accentColor : T.inkSub,
                transform: isExp ? 'rotate(90deg)' : 'none',
                transition: 'transform .2s',
              }}
            />
          </div>
        ) : (
          <div style={{ flexShrink: 0, width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: isSel ? cfg.accentColor : T.inkFaint }} />
          </div>
        )}

        {/* Icon */}
        <div style={{
          flexShrink: 0,
          width: `${cfg.iconBox}px`, height: `${cfg.iconBox}px`,
          borderRadius: `${cfg.iconRadius}px`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isSel ? cfg.iconBg : 'transparent',
          color: isSel ? cfg.iconColor : T.inkMuted,
          border: `1px solid ${isSel ? cfg.accentColor + '25' : T.line}`,
        }}>
          <NodeIcon type={node.type} size={cfg.iconStroke} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="sbH"
            style={{
              fontSize: cfg.textSize, fontWeight: cfg.textWeight,
              color: isSel ? cfg.accentColor : cfg.textColor,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {node.name}
          </div>
          {/* Type label */}
          {depth <= 1 && (
            <span style={{
              fontSize: '8px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: isSel ? cfg.accentColor : T.inkFaint,
            }}>
              {node.type}
            </span>
          )}
        </div>

        {/* Active dot */}
        {isSel && (
          <span style={{
            width: '4px', height: '4px', borderRadius: '50%', flexShrink: 0,
            background: cfg.dot,
            boxShadow: `0 0 6px 1px ${cfg.dot}80`,
            animation: 'sbPulse 2s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* ── Children ───────────────────────────────────────────────────── */}
      {hasKids && isExp && (
        <div style={{ animation: 'sbSlide .15s ease both' }}>
          {node.children!.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1}
              selectedNode={selectedNode} expandedNodes={expandedNodes}
              onNodeSelect={onNodeSelect} onToggleNode={onToggleNode} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   SearchResultNode
═══════════════════════════════════════════════════════════════════════════ */
const SearchResultNode: React.FC<{
  node: CourseNode; onSelect: (n: CourseNode) => void;
  isSelected: boolean; selectedNode: CourseNode | null;
}> = ({ node, onSelect, isSelected, selectedNode }) => {
  const [open, setOpen] = useState(false);
  const hasKids = !!(node.children?.length);
  const cfg = D(node.level ?? 0);

  return (
    <div style={{ marginBottom: '2px' }}>
      <div
        className="sb-row"
        onClick={() => onSelect(node)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: `5px 8px`, borderRadius: '6px',
          background: isSelected ? `${cfg.accentColor}08` : T.bg,
          border: `1px solid ${isSelected ? cfg.accentColor + '30' : T.line}`,
          marginLeft: `${(node.level ?? 0) * 6}px`,
        }}
      >
        <div style={{ flexShrink: 0, width: `${cfg.iconBox}px`, height: `${cfg.iconBox}px`, borderRadius: `${cfg.iconRadius}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.iconBg, color: cfg.iconColor }}>
          <NodeIcon type={node.type} size={cfg.iconStroke} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sbH" style={{ fontSize: cfg.textSize, fontWeight: cfg.textWeight, color: isSelected ? cfg.accentColor : cfg.textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{node.name}</div>
          <span style={{ fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: cfg.accentColor + 'AA' }}>{node.type}</span>
        </div>
        {hasKids && (
          <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
            style={{ padding: '2px', borderRadius: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: T.inkFaint }}
          >
            <ChevronRight size={10} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
          </button>
        )}
      </div>
      {hasKids && open && (
        <div style={{ marginLeft: '12px', marginTop: '2px', animation: 'sbSlide .15s ease both' }}>
          {node.children!.map(c => (
            <SearchResultNode key={c.id} node={c} onSelect={onSelect} isSelected={selectedNode?.id === c.id} selectedNode={selectedNode} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   CourseSidebar
═══════════════════════════════════════════════════════════════════════════ */
export const CourseSidebar: React.FC<CourseSidebarProps> = ({
  courseData, selectedNode, expandedNodes, sidebarWidth, searchQuery,
  courseName, moduleCount, onNodeSelect, onToggleNode,
  onSidebarWidthChange, onSearchChange, onMouseDown,
  isLoading = false,  // Default to false
}) => {
  const router = useRouter();
  const isCollapsed = sidebarWidth <= 70;

  const handleBackToCourses = () => {
    router.push('/lms/pages/courses');
  };

  // Show loading state
  if (isLoading) {
    return <LoadingSidebar width={sidebarWidth} />;
  }

  /* ── Collapsed rail ──────────────────────────────────────────────────────── */
  if (isCollapsed) return (
    <div className="sb" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 4px', gap: '10px', background: T.bg, borderRight: `1px solid ${T.line}` }}>
      <FontImport />
      <button
        onClick={() => onSidebarWidthChange(OPEN_W)}
        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', background: T.orangeTint, color: T.orange, border: `1px solid ${T.line}` }}
      >
        <ChevronRight size={13} />
      </button>
      {selectedNode && (() => {
        const cfg = D(typeDepth[selectedNode.type] ?? 0);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cfg.iconBg, color: cfg.iconColor, border: `1px solid ${cfg.accentColor}25` }}>
              <NodeIcon type={selectedNode.type} size={12} />
            </div>
            <span style={{ fontSize: '7px', fontWeight: 600, color: T.inkMuted, textAlign: 'center', maxWidth: '48px', lineHeight: 1.2 }}>{selectedNode.name}</span>
          </div>
        );
      })()}
    </div>
  );

  /* ── Search results ───────────────────────────────────────────────────────── */
  const results: CourseNode[] = searchQuery.trim() ? (() => {
    const out: CourseNode[] = [];
    const q = searchQuery.toLowerCase();
    const walk = (ns: CourseNode[]) => { for (const n of ns) { if (n.name.toLowerCase().includes(q)) out.push(n); else if (n.children) walk(n.children); } };
    walk(courseData);
    return out;
  })() : [];

  return (
    <div className="sb" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: T.bg, borderRight: `1px solid ${T.line}`, width: sidebarWidth }}>
      <FontImport />

      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <div style={{
        flexShrink: 0,
        background: `linear-gradient(145deg, #F27757 0%, #E55A3A 100%)`,
        padding: '14px 14px',
      }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Back button */}
          <button
            className="back-button"
            onClick={handleBackToCourses}
            style={{
              width: '36px', height: '36px',
              borderRadius: '10px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,.18)',
              border: '1px solid rgba(255,255,255,.22)',
              color: 'white',
              cursor: 'pointer',
            }}
            title="Back to Courses"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,.65)' }}>Course</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <h2 className="sbH" style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                {courseName || 'Course'}
              </h2>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '4px', padding: '1px 6px', borderRadius: '14px', fontSize: '8px', fontWeight: 500, color: 'rgba(255,255,255,.85)', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.18)' }}>
              <Layers size={8} />{moduleCount}
            </span>
          </div>

          <button
            onClick={() => onSidebarWidthChange(sidebarWidth > 70 ? 60 : OPEN_W)}
            style={{ padding: '5px', borderRadius: '8px', flexShrink: 0, background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.22)', color: 'white', cursor: 'pointer' }}
          >
            {sidebarWidth > 70 ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* ══ Search ══════════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, padding: '8px 10px', background: T.bg }}>
        <div style={{ position: 'relative' }}>
          <Search size={11} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: T.inkFaint }} />
          <input
            className="sb-input"
            type="text" placeholder="Search…"
            value={searchQuery} onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%', paddingLeft: '28px', paddingRight: searchQuery ? '28px' : '10px',
              paddingTop: '6px', paddingBottom: '6px',
              fontSize: '11px', fontFamily: "'DM Sans', sans-serif",
              background: T.surface, border: `1px solid ${T.line}`,
              borderRadius: '8px', color: T.ink,
            }}
          />
          {searchQuery && (
            <button onClick={() => onSearchChange('')}
              style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', cursor: 'pointer', color: T.inkFaint, border: 'none' }}
            >
              <X size={9} />
            </button>
          )}
        </div>
      </div>

      {/* ══ Tree / Results ══════════════════════════════════════════════════ */}
      <div className="sb-scroll" style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
        {searchQuery.trim() ? (
          <div style={{ animation: 'sbFade .15s ease both' }}>
            {/* Results header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: `1px solid ${T.line}`, background: T.surface }}>
              <span className="sbH" style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.inkMuted }}>Results</span>
              <span className="sbH" style={{ fontSize: '9px', fontWeight: 600, padding: '1px 6px', borderRadius: '14px', background: T.orangeTint, color: T.orange, border: `1px solid ${T.orange}20` }}>{results.length}</span>
            </div>
            <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {results.length === 0 ? (
                <div style={{ padding: '40px 12px', textAlign: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', background: T.surface, border: `1px dashed ${T.line}` }}>
                    <Search size={14} style={{ color: T.inkFaint }} />
                  </div>
                  <p className="sbH" style={{ fontSize: '11px', fontWeight: 600, color: T.ink, margin: 0 }}>No results</p>
                </div>
              ) : results.map(n => (
                <SearchResultNode key={n.id} node={n} onSelect={onNodeSelect} isSelected={selectedNode?.id === n.id} selectedNode={selectedNode} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ paddingBottom: '10px' }}>
            {courseData[0]?.children?.map(mod => (
              <TreeNode key={mod.id} node={mod} depth={0}
                selectedNode={selectedNode} expandedNodes={expandedNodes}
                onNodeSelect={onNodeSelect} onToggleNode={onToggleNode} />
            ))}
            {courseData.length === 0 && (
              <div style={{ padding: '60px 16px', textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', margin: '0 auto 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.orangeTint, border: `1px dashed ${T.orange}30` }}>
                  <BookOpen size={16} style={{ color: T.orange }} />
                </div>
                <p className="sbH" style={{ fontSize: '12px', fontWeight: 600, color: T.ink, margin: 0 }}>No content yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ Resize handle ══════════════════════════════════════════════════ */}
      <div
        className="sb-resize"
        style={{ position: 'absolute', right: '-4px', top: 0, width: '8px', height: '100%', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
        onMouseDown={onMouseDown}
      >
        <div className="sb-rbar" style={{ width: '2px', height: '40px', borderRadius: '2px', background: T.line, transition: 'background .15s, height .15s' }} />
      </div>
    </div>
  );
};