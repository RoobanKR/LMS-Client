"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  ChevronDown, ChevronRight, BookOpen, FileText, GraduationCap,
  Presentation, Folder, Layers, Hash, File, Video, Loader2,
  Target, Rocket, Search, X, Link, Archive, Code, ChevronLeft,
  ChevronRightIcon, ChevronUp, Download, ExternalLink, FolderOpen,
  Layout, BookMarked, LayoutDashboard, Library,
  Bot, Bell, User, LogOut, Settings, Moon, Sun, Sparkles,
  Users, Activity,
} from "lucide-react"
import VideoPlayer from "../../../../component/student/video-player"
import PDFViewer from "../../../../component/student/pdf-viewer"
import PPTViewer from "../../../../component/student/ppt-viewer"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import React from "react"
import NotesPanel from "../../../../component/student/notes-panel"
import AIPanel from "../../../../component/student/ai-panel"
import CodeEditor from "../../../../component/student/code-editor"
import ZipViewer from "../../../../component/student/zipViewer"
import Exercises from "../../../../component/student/exercises"
import { useTheme as useNextTheme } from "next-themes"
import AIChat from "@/app/lms/component/student/ai-chat"
import SummaryChat from "@/app/lms/component/student/summary-chat"
import DBQueryEditor from "@/app/lms/component/student/db-queryEditor"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { userPermission } from "@/apiServices/tokenVerify"
import { injectTryItButtons } from '../../utils/injectTryItButtons'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  orange:      '#F27757',
  orangeDark:  '#E0623F',
  orangeGlow:  'rgba(242,119,87,0.22)',
  orangeLight: 'rgba(242,119,87,0.08)',
  orangeTint:  'rgba(242,119,87,0.06)',
  textMain:    '#1A1A1E',
  textSub:     '#3F3F46',
  textMuted:   '#8F8F9A',
  textHint:    '#D1D1D9',
  border:      '#EDEAF0',
  bg:          '#FFFFFF',
  pageBg:      '#F8F8FA',
  ink:         '#1A1A1E',
  inkSub:      '#3F3F46',
  inkMuted:    '#8F8F9A',
  inkFaint:    '#D1D1D9',
  line:        '#EDEAF0',
  surface:     '#F8F8FA',
}

const TAB_META = {
  I_Do: {
    label: "I Do",
    icon: <Target size={13} strokeWidth={2.5} />,
    color: "#dc2626",
    bg: "rgba(220,38,38,0.09)",
    shadow: "rgba(220,38,38,0.36)",
  },
  We_Do: {
    label: "We Do",
    icon: <Users size={13} strokeWidth={2.5} />,
    color: "#ea580c",
    bg: "rgba(234,88,12,0.09)",
    shadow: "rgba(234,88,12,0.36)",
  },
  You_Do: {
    label: "You Do",
    icon: <BookOpen size={13} strokeWidth={2.5} />,
    color: "#059669",
    bg: "rgba(5,150,105,0.09)",
    shadow: "rgba(5,150,105,0.36)",
  },
} as const;

const DEPTH_CFG = [
  { accentColor:'#F27757', iconColor:'#E0623F', iconBg:'rgba(242,119,87,.10)',
    iconBox:26, iconRadius:8, iconStroke:14,
    textColor:'#18181B', textSize:'12.5px', textWeight:650, paddingV:7, dot:'#F27757' },
  { accentColor:'#7C6FF7', iconColor:'#5C52D9', iconBg:'rgba(124,111,247,.09)',
    iconBox:24, iconRadius:7, iconStroke:13,
    textColor:'#27243D', textSize:'12px', textWeight:550, paddingV:6, dot:'#7C6FF7' },
  { accentColor:'#0EA5A0', iconColor:'#0D8A85', iconBg:'rgba(14,165,160,.08)',
    iconBox:22, iconRadius:6, iconStroke:12,
    textColor:'#1C3534', textSize:'11.5px', textWeight:500, paddingV:5, dot:'#0EA5A0' },
  { accentColor:'#D97706', iconColor:'#B45309', iconBg:'rgba(217,119,6,.07)',
    iconBox:20, iconRadius:5, iconStroke:11,
    textColor:'#3D2A00', textSize:'11px', textWeight:450, paddingV:4, dot:'#D97706' },
] as const
type DepthIdx = 0|1|2|3
const DC = (d: number) => DEPTH_CFG[Math.min(d, 3) as DepthIdx]

const METHOD_CFG = {
  'i-do':   { label:'I Do',   emoji:'🎯', color:'#F27757', dark:'#E0623F', bg:'rgba(242,119,87,.08)',  border:'rgba(242,119,87,.30)',  grad:'linear-gradient(135deg,#F27757,#E0623F)' },
  'we-do':  { label:'We Do',  emoji:'🤝', color:'#7C6FF7', dark:'#5C52D9', bg:'rgba(124,111,247,.08)', border:'rgba(124,111,247,.30)', grad:'linear-gradient(135deg,#7C6FF7,#5C52D9)' },
  'you-do': { label:'You Do', emoji:'🚀', color:'#0EA5A0', dark:'#0D8A85', bg:'rgba(14,165,160,.08)',  border:'rgba(14,165,160,.30)',  grad:'linear-gradient(135deg,#0EA5A0,#0D8A85)' },
} as const
type MethodKey = keyof typeof METHOD_CFG

// ─── TabBar Component ──────────────────────────────────────────────────────────
const TabBar: React.FC<{
  selectedNode: any;
  activeTab: string | null;
  activeSubcategory: string;
  subcategories: any;
  onTabChange: (tab: string) => void;
  onSubcategoryChange: (sub: string, component: any) => void;
}> = ({ selectedNode, activeTab, activeSubcategory, subcategories, onTabChange, onSubcategoryChange }) => {
  const [hoveredTab, setHoveredTab] = useState<string>("");
  const [pillStyle, setPillStyle] = useState<React.CSSProperties>({});
  const [pillVisible, setPillVisible] = useState(false);
  const [pillColor, setPillColor] = useState("");

  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Partial<Record<string, HTMLButtonElement>>>({});
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inDrop = useRef(false);

  const updatePill = useCallback(() => {
    if (!activeTab || !selectedNode || !trackRef.current) { setPillVisible(false); return; }
    const btn = btnRefs.current[activeTab];
    if (!btn) return;
    const tr = trackRef.current.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setPillStyle({ left: br.left - tr.left - 4, width: br.width });
    setPillColor(TAB_META[activeTab as keyof typeof TAB_META].color);
    setPillVisible(true);
  }, [activeTab, selectedNode]);

  useEffect(() => {
    updatePill();
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  const clearLeave = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); };
  const handleTabEnter = (tab: string) => { if (!selectedNode) return; clearLeave(); setHoveredTab(tab); };
  const handleTabLeave = () => { leaveTimer.current = setTimeout(() => { if (!inDrop.current) setHoveredTab(""); }, 120); };
  const handleDropEnter = () => { inDrop.current = true; clearLeave(); };
  const handleDropLeave = () => { inDrop.current = false; leaveTimer.current = setTimeout(() => setHoveredTab(""), 120); };

  const handleTabClick = (tabKey: string) => {
    if (!selectedNode) return;
    setHoveredTab("");
    if (activeTab !== tabKey) {
      onTabChange(tabKey);
      const subs = subcategories[tabKey] || [];
      if (subs.length > 0) onSubcategoryChange(subs[0].key, subs[0].component);
    }
  };

  const handleSubClick = (
    tabKey: string,
    sub: { key: string; label: string; icon: React.ReactNode; component: any }
  ) => {
    setHoveredTab("");
    if (activeTab !== tabKey) onTabChange(tabKey);
    onSubcategoryChange(sub.key, sub.component);
  };

  const activeSub = activeTab ? subcategories[activeTab]?.find((s: any) => s.key === activeSubcategory) : null;

  return (
    <div className="flex-shrink-0 px-3 py-2.5" style={{ background: T.bg, borderBottom: `1px solid ${T.border}`, position: "relative", zIndex: 30 }}>
      <div ref={trackRef} className="flex items-center gap-0.5 w-full"
        style={{ background: "#f1f0f4", border: "1px solid #e6e4ee", borderRadius: 13, padding: 4, position: "relative" }}>

        {pillVisible && (
          <div style={{
            position: "absolute", top: 4, height: "calc(100% - 8px)",
            background: pillColor, borderRadius: 10,
            boxShadow: `0 4px 14px ${pillColor}55`,
            transition: "left 0.24s cubic-bezier(0.34,1.3,0.64,1), width 0.24s cubic-bezier(0.34,1.3,0.64,1), background 0.18s ease",
            zIndex: 1, pointerEvents: "none",
            ...pillStyle,
          }} />
        )}

        {(["I_Do", "We_Do", "You_Do"] as const).map(tabKey => {
          const cfg = TAB_META[tabKey];
          const isSel = activeTab === tabKey;
          const isDis = !selectedNode;
          const subs = subcategories[tabKey] ?? [];
          const showDrop = hoveredTab === tabKey && !isDis && subs.length > 0;

          return (
            <div key={tabKey} className="relative flex-1" style={{ zIndex: 2 }}
              onMouseEnter={() => !isDis && handleTabEnter(tabKey)}
              onMouseLeave={handleTabLeave}>
              <button
                ref={el => { if (el) btnRefs.current[tabKey] = el; }}
                onClick={() => handleTabClick(tabKey)}
                disabled={isDis}
                className="flex items-center justify-center gap-1.5 w-full rounded-[10px] select-none"
                style={{
                  padding: "7px 8px", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.01em",
                  border: "none", background: "transparent",
                  color: isSel ? "#ffffff" : isDis ? "#c4c0cc" : "#5a5a6e",
                  opacity: isDis ? 0.38 : 1,
                  cursor: isDis ? "not-allowed" : "pointer",
                  transition: "color 0.15s", position: "relative", zIndex: 2, whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (!isDis && !isSel) (e.currentTarget as HTMLElement).style.color = cfg.color; }}
                onMouseLeave={e => { if (!isDis && !isSel) (e.currentTarget as HTMLElement).style.color = "#5a5a6e"; }}
              >
                <span style={{ color: isSel ? "rgba(255,255,255,0.88)" : isDis ? "#c4c0cc" : "#9896aa", display: "flex", alignItems: "center", transition: "color 0.15s" }}>
                  {cfg.icon}
                </span>
                {cfg.label}
                {!isDis && subs.length > 0 && (
                  <ChevronDown size={10} style={{
                    color: isSel ? "rgba(255,255,255,0.72)" : "#b8b6c8",
                    transform: showDrop ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.16s, color 0.15s", marginLeft: 1,
                  }} />
                )}
              </button>

              {showDrop && (
                <div className="absolute top-full left-0 right-0" style={{ paddingTop: 6, zIndex: 50 }}
                  onMouseEnter={handleDropEnter} onMouseLeave={handleDropLeave}>
                  <div style={{
                    background: "#fff", border: `1.5px solid ${cfg.color}2e`, borderRadius: 13,
                    boxShadow: `0 10px 28px ${cfg.shadow}, 0 2px 8px rgba(0,0,0,0.06)`,
                    padding: 5, animation: "ccDropIn 0.15s cubic-bezier(0.16,1,0.3,1) both",
                  }}>
                    {subs.map((sub: any, idx: number) => {
                      const isActiveSub = activeSubcategory === sub.key && activeTab === tabKey;
                      return (
                        <button key={sub.key} onClick={() => handleSubClick(tabKey, sub)}
                          className="w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-[10px]"
                          style={{
                            fontSize: 11, fontWeight: 700,
                            background: isActiveSub ? cfg.color : "transparent",
                            color: isActiveSub ? "#ffffff" : "#5a5a6e",
                            marginBottom: idx < subs.length - 1 ? 2 : 0,
                            border: "none", cursor: "pointer", transition: "background 0.12s, color 0.12s",
                          }}
                          onMouseEnter={e => { if (!isActiveSub) { (e.currentTarget as HTMLElement).style.background = cfg.bg; (e.currentTarget as HTMLElement).style.color = cfg.color; } }}
                          onMouseLeave={e => { if (!isActiveSub) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#5a5a6e"; } }}>
                          <span style={{ color: isActiveSub ? "rgba(255,255,255,0.85)" : "#9896aa", display: "flex", alignItems: "center" }}>{sub.icon}</span>
                          <span className="truncate flex-1">{sub.label}</span>
                          {isActiveSub && <span style={{ width: 5, height: 5, background: "#fff", borderRadius: "50%", flexShrink: 0, marginLeft: "auto", boxShadow: "0 0 5px rgba(255,255,255,0.8)" }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeTab && activeSub && selectedNode && (
        <div className="flex items-center gap-1.5 mt-2 px-0.5" style={{ animation: "ccBadgeUp 0.18s ease both" }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#c4c0cc", letterSpacing: "0.07em", textTransform: "uppercase" }}>Viewing</span>
          <span className="flex items-center gap-1"
            style={{ background: TAB_META[activeTab as keyof typeof TAB_META].bg, color: TAB_META[activeTab as keyof typeof TAB_META].color, border: `1px solid ${TAB_META[activeTab as keyof typeof TAB_META].color}28`, borderRadius: 6, padding: "3px 9px", fontSize: 10.5, fontWeight: 800 }}>
            <span style={{ display: "flex", alignItems: "center" }}>{activeSub.icon}</span>
            {activeSub.label}
          </span>
        </div>
      )}
    </div>
  );
};

const RES_COLOR: Record<string,string> = {
  page:'#6366f1', video:'#ef4444', ppt:'#f97316',
  pdf:'#dc2626', zip:'#16a34a', link:'#9333ea', reference:'#64748b',
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PedagogyLink { _id?:string; name:string; url:string; uploadedAt?:string }
interface PedagogyFile {
  _id?:string; fileName:string; fileType:string; size:string; uploadedAt?:string;
  fileUrl: string|{base?:string;[k:string]:string|undefined};
  isReference?:boolean; isVideo?:boolean; isArchive?:boolean;
  availableResolutions?:string[];
  fileSettings?:{showToStudents:boolean;allowDownload:boolean;lastModified?:string};
  tags?:Array<{tagName:string;tagColor:string}>;
}
interface PedagogyFolder { _id?:string; name:string; files:PedagogyFile[]; subfolders?:PedagogyFolder[]; uploadedAt?:string; tags?:Array<{tagName:string;tagColor:string}> }
interface PedagogyPage { _id:string; title:string; combinedCode:string; pageCount?:number; createdAt?:string; isMultiPage?:boolean }
interface PedagogyItem { description?:string; files?:PedagogyFile[]; folders?:PedagogyFolder[]; links?:PedagogyLink[]; pages?:PedagogyPage[]; _id?:string }
interface Pedagogy { I_Do?:Record<string,PedagogyItem>|string[]; We_Do?:Record<string,PedagogyItem>|string[]; You_Do?:Record<string,PedagogyItem>|string[]; _id?:string }
interface SubTopic { _id:string; title:string; description:string; duration?:string; level?:string; subTopics?:SubTopic[]; pedagogy?:Pedagogy }
interface Topic    { _id:string; title:string; description:string; duration?:string; level?:string; subTopics?:SubTopic[]; pedagogy?:Pedagogy }
interface SubModule{ _id:string; title:string; description:string; topics?:Topic[]; pedagogy?:Pedagogy }
interface Module   { _id:string; title:string; description:string; subModules?:SubModule[]; topics?:Topic[]; pedagogy?:Pedagogy }

interface CourseData {
  _id:string; courseName:string; courseDescription:string; courseHierarchy?:string[];
  I_Do?:string[]; We_Do?:string[]; You_Do?:string[]; modules?:Module[];
  singleParticipants?: Array<{
    user?: {
      _id?: string
      courses?: Array<{ courseId: string; answers?: Record<string, any> }>
      [key: string]: any
    }
    [key: string]: any
  }>
}

type ResourceType = "video"|"pdf"|"ppt"|"zip"|"link"|"reference"|"page"
interface Resource {
  id:string; title:string; type:ResourceType;
  fileUrl?:string|{base?:string;[k:string]:string|undefined}; 
  mcqQuestions?:any[];
  isReference?:boolean; externalUrl?:string; fileSize?:string; uploadedAt?:string;
  fileName?:string; isFolder?:boolean; folderContents?:Resource[]; folderType?:"similar"|"mixed";
  fileSettings?:{showToStudents:boolean;allowDownload:boolean};
  isVideo?:boolean; isArchive?:boolean; 
  // Add these properties
  availableResolutions?: string[];
  fileUrlMap?: Record<string, string>;
  _combinedCode?:string; _pageCount?:number; originalFolder?:string; folderName?:string;
  tags?: Array<{tagName:string; tagColor:string}>
}
interface PedagogySubItem { key:string; name:string; description:string; files:PedagogyFile[]; folders?:PedagogyFolder[]; links?:PedagogyLink[] }
type LearningElementType = "i-do"|"we-do"|"you-do"
interface LearningElement { id:string; title:string; type:LearningElementType; icon:React.ComponentType<any>; color:string; subItems:PedagogySubItem[] }
type SelectedItemType = "module"|"submodule"|"topic"|"subtopic"
interface SelectedItem { id:string; title:string; type:SelectedItemType; hierarchy:string[]; pedagogy?:Pedagogy }
type SortField = "name"|"size"|"date"
interface SortConfig { field:SortField; direction:"asc"|"desc" }

// ── Helpers ───────────────────────────────────────────────────────────────────
function openPageInNewTab(html:string){
  const t=window.open("","_blank")
  if(!t){alert("Popup blocked");return}
  t.document.open();t.document.write(html);t.document.close()
}

// ── Also inject data-active-tab from blocks metadata into combinedCode ────────
// This reads the page's blocks to find code_playground blocks and stamps
// data-active-tab="css" (or html/js) onto the .playground-wrapper divs
function stampActiveTabOnPlaygrounds(combinedCode: string, pages: PedagogyPage[]): string {
  if (!combinedCode || !combinedCode.includes('playground-wrapper')) return combinedCode
  // We use a simple approach: find playground-wrapper divs and add data-active-tab
  // Since we have the page blocks, extract active tabs
  const activeTabs: string[] = []
  pages.forEach((page: any) => {
    if (!page?.blocks) return
    page.blocks.forEach((block: any) => {
      if (block.type === 'code_playground') {
        const primary = block.metadata?.playgroundPrimaryTab
        const editing = block.metadata?.playgroundActiveTab
        const tab = (primary && primary !== 'auto') ? primary : (editing || 'html')
        activeTabs.push(tab)
      }
    })
  })
  if (!activeTabs.length) return combinedCode
  // Stamp each playground-wrapper with its active tab
  let idx = 0
  return combinedCode.replace(/class="playground-wrapper"/g, () => {
    const tab = activeTabs[idx] || 'html'
    idx++
    return `class="playground-wrapper" data-active-tab="${tab}"`
  })
}

const getFileType=(fileUrl:string|{base?:string;[k:string]:string|undefined},fileType:string):ResourceType=>{
  const u=typeof fileUrl==='string'?fileUrl:fileUrl.base||''
  if(fileType?.includes("url/link")||fileType?.includes("link"))return"link"
  if(fileType?.includes("zip")||u?.toLowerCase().includes(".zip"))return"zip"
  if(fileType?.includes("pdf"))return"pdf"
  if(fileType?.includes("powerpoint")||fileType?.includes("presentation")||u?.toLowerCase().includes(".ppt"))return"ppt"
  if(fileType?.includes("video")||u?.toLowerCase().includes(".mp4")||u?.toLowerCase().includes(".mov"))return"video"
  if(fileType?.includes("application")||fileType?.includes("document"))return"pdf"
  return"link"
}
const getFileUrlString=(fileUrl?:string|{base?:string}):string=>typeof fileUrl==="string"?fileUrl:fileUrl?.base||""
const detectUrlType=(url:string):"video"|"ppt"|"pdf"|"external"=>{
  const l=url.toLowerCase()
  if(l.match(/\.(mp4|mov|avi|wmv|webm)$/)||l.includes('youtube')||l.includes('youtu.be')||l.includes('vimeo'))return"video"
  if(l.match(/\.(ppt|pptx)$/))return"ppt"
  if(l.match(/\.(pdf)$/)||l.includes('docs.google.com/document'))return"pdf"
  return"external"
}
const getFileUrl=(fileUrl:string|{base?:string;[k:string]:string|undefined}):string=>{
  if(typeof fileUrl==='string')return fileUrl
  if((fileUrl as any).url)return(fileUrl as any).url
  if((fileUrl as any)['720p'])return(fileUrl as any)['720p']
  if(fileUrl.base)return fileUrl.base
  return''
}
const formatSubItemName=(key:string)=>key.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())
const hasChildItems=(item:Module|SubModule|Topic|SubTopic):boolean=>{
  if('subModules' in item&&item.subModules&&item.subModules.length>0)return true
  if('topics' in item&&item.topics&&item.topics.length>0)return true
  if('subTopics' in item&&item.subTopics&&item.subTopics.length>0)return true
  return false
}
const hasPedagogyData=(item:Module|SubModule|Topic|SubTopic):boolean=>
  !!(item.pedagogy&&(
    (item.pedagogy.I_Do&&(Array.isArray(item.pedagogy.I_Do)?item.pedagogy.I_Do.length>0:Object.keys(item.pedagogy.I_Do).length>0))||
    (item.pedagogy.We_Do&&(Array.isArray(item.pedagogy.We_Do)?item.pedagogy.We_Do.length>0:Object.keys(item.pedagogy.We_Do).length>0))||
    (item.pedagogy.You_Do&&(Array.isArray(item.pedagogy.You_Do)?item.pedagogy.You_Do.length>0:Object.keys(item.pedagogy.You_Do).length>0))
  ))
const shouldShowDownload=(r:Resource)=>!!(r.isReference&&(!r.fileSettings||r.fileSettings.allowDownload!==false))
const isResourceVisible=(r:Resource)=>!r.fileSettings||r.fileSettings.showToStudents!==false
const downloadFile=async(resource:Resource)=>{
  let url=resource.externalUrl||''
  if(!url&&resource.fileUrl){if(typeof resource.fileUrl==='object'&&resource.fileUrl.base)url=resource.fileUrl.base;else if(typeof resource.fileUrl==='string')url=resource.fileUrl}
  if(!url)return
  if(resource.type==='link'||resource.type==='reference'){window.open(url,'_blank','noopener,noreferrer');return}
  try{const r=await fetch(url);const b=await r.blob();const a=document.createElement('a');a.href=window.URL.createObjectURL(b);a.download=resource.title||'download';document.body.appendChild(a);a.click();document.body.removeChild(a)}
  catch{window.open(url,'_blank','noopener,noreferrer')}
}

const RES_LABEL:Record<string,string>={all:"All",video:"Videos",pdf:"PDFs",ppt:"Slides",zip:"ZIPs",link:"Links",reference:"Refs",page:"Pages"}
const ResIcon=({type,size=14}:{type:string;size?:number})=>{
  const p={size,strokeWidth:2}
  if(type==="page")return<Layout {...p}/>
  if(type==="video")return<Video {...p}/>
  if(type==="ppt")return<Presentation {...p}/>
  if(type==="pdf")return<FileText {...p}/>
  if(type==="zip")return<Archive {...p}/>
  if(type==="link")return<Link {...p}/>
  if(type==="folder")return<Folder {...p}/>
  return<File {...p}/>
}
const SBNodeIcon=({type,size}:{type:string;size:number})=>{
  const p={size,strokeWidth:2}
  if(type==='module')return<Library {...p}/>
  if(type==='submodule')return<FolderOpen {...p}/>
  if(type==='topic')return<FileText {...p}/>
  return<Hash {...p}/>
}

const ResourceItem = ({resource, index, onClick, onDownload}: {
  resource: Resource; index: number; onClick: (r: Resource) => void; onDownload?: (r: Resource, e: React.MouseEvent) => void
})=>{
  const[tip,setTip]=useState(false)
  if(!isResourceVisible(resource))return null
  const isPage=resource.type==="page"
  const odd=index%2!==0
  const col=resource.isFolder?T.textMuted:RES_COLOR[resource.type]||T.textMuted
  const fmtDate=(d:string)=>{if(!d)return'—';try{return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}catch{return'—'}}
  return(
    <div onClick={()=>onClick(resource)} style={{display:'flex',alignItems:'center',padding:'9px 14px',cursor:'pointer',background:isPage?(odd?'rgba(99,102,241,0.04)':'rgba(99,102,241,0.02)'):(odd?T.surface:T.bg),borderBottom:`1px solid ${T.line}`,transition:'background .12s'}}
      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=isPage?'rgba(99,102,241,0.10)':T.orangeTint}
      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=isPage?(odd?'rgba(99,102,241,0.04)':'rgba(99,102,241,0.02)'):(odd?T.surface:T.bg)}>
      <div style={{flexShrink:0,width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:`${col}14`,marginRight:10}}>
        {resource.isFolder?<Folder size={14} style={{color:T.inkMuted}}/>:<ResIcon type={resource.type} size={14}/>}
      </div>
      <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        <span style={{fontSize:'12.5px',fontWeight:600,color:isPage?'#4f46e5':T.textMain,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {resource.title}
          {resource.isFolder&&<span style={{fontWeight:400,fontSize:'11px',color:T.textMuted,marginLeft:4}}>({resource.folderContents?.length||0} items)</span>}
        </span>
        {isPage&&<span style={{padding:'1px 6px',borderRadius:4,fontSize:'9.5px',fontWeight:700,background:'rgba(99,102,241,.12)',color:'#4f46e5',border:'1px solid rgba(99,102,241,.25)'}}>PAGE</span>}
        
        {/* ⭐ ADD REFERENCE BADGE HERE */}
        {resource.isReference && !isPage && (
          <span style={{
            padding:'1px 8px',
            borderRadius:4,
            fontSize:'9.5px',
            fontWeight:600,
            background:'rgba(59,130,246,0.12)',
            color:'#3b82f6',
            border:'1px solid rgba(59,130,246,0.25)',
            letterSpacing:'0.3px'
          }}>
            Reference
          </span>
        )}
        
        {!resource.isReference && resource.type === "pdf" && !isPage && (
          <span style={{
            padding:'1px 6px',
            borderRadius:4,
            fontSize:'9.5px',
            fontWeight:600,
            background:'rgba(220,38,38,0.08)',
            color:'#dc2626',
            border:'1px solid rgba(220,38,38,0.15)'
          }}>
            PDF
          </span>
        )}
        
        {!resource.isReference && resource.type === "ppt" && !isPage && (
          <span style={{
            padding:'1px 6px',
            borderRadius:4,
            fontSize:'9.5px',
            fontWeight:600,
            background:'rgba(249,115,22,0.08)',
            color:'#f97316',
            border:'1px solid rgba(249,115,22,0.15)'
          }}>
            PPT
          </span>
        )}
        
        {resource.originalFolder&&!resource.isFolder&&!isPage&&<span style={{fontSize:'10px',color:T.textMuted}}>from: {resource.originalFolder}</span>}
        
        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && resource.tags.map((tag, ti) => (
          <span key={ti} style={{
            padding:'1px 7px', borderRadius:20, fontSize:'9.5px', fontWeight:600,
            background: tag.tagColor + '18',
            color: tag.tagColor,
            border: `1px solid ${tag.tagColor}35`,
            flexShrink: 0,
          }}>
            {tag.tagName}
          </span>
        ))}
      </div>
      {isPage&&(
        <button type="button" onClick={e=>{e.stopPropagation();openPageInNewTab(resource._combinedCode||"")}}
          style={{flexShrink:0,display:'flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:7,background:'rgba(99,102,241,.10)',color:'#4f46e5',border:'1px solid rgba(99,102,241,.22)',fontSize:'11px',fontWeight:700,cursor:'pointer',marginRight:8}}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(99,102,241,.20)'}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='rgba(99,102,241,.10)'}>
          <ExternalLink size={11}/><span>Open</span>
        </button>
      )}
      {!resource.isFolder&&!isPage&&shouldShowDownload(resource)&&(
        <div style={{position:'relative',marginRight:4}}>
          <button onClick={e=>{e.stopPropagation();if(onDownload)onDownload(resource,e)}}
            onMouseEnter={()=>setTip(true)} onMouseLeave={()=>setTip(false)}
            style={{padding:5,borderRadius:7,border:'none',background:'transparent',cursor:'pointer',color:T.inkMuted}}>
            <Download size={13}/>
          </button>
          {tip&&<div style={{position:'absolute',top:'100%',right:0,marginTop:2,padding:'2px 8px',borderRadius:5,background:T.ink,color:'#fff',fontSize:'10px',whiteSpace:'nowrap',zIndex:10,pointerEvents:'none'}}>Download</div>}
        </div>
      )}
      <span style={{width:52,textAlign:'right',fontSize:'10.5px',color:T.textMuted,flexShrink:0}}>
        {isPage?(resource._pageCount?`${resource._pageCount} pg`:'1 pg'):(resource.fileSize||'—')}
      </span>
      <span style={{width:90,textAlign:'right',fontSize:'10.5px',color:T.textMuted,flexShrink:0}}>{fmtDate(resource.uploadedAt||"")}</span>
    </div>
  )
}

interface RoleSwitchState { isDummyStudent:boolean; originalRole?:string; originalRenameRole?:string; switchTimestamp?:number }

const TopBar=({items,onAIClick,onSummaryClick,onMenuClick}:{
  items:Array<{label:string;icon?:React.ComponentType<any>;onClick?:()=>void;isLast?:boolean}>;
  onAIClick:()=>void; onSummaryClick:()=>void; onMenuClick:()=>void;
})=>{
  const router=useRouter()
  const[userOpen,setUserOpen]=useState(false)
  const[isDummyStudent,setIsDummyStudent]=useState(false)
  const[originalRoleInfo,setOriginalRoleInfo]=useState<{roleName:string;renameRole:string}|null>(null)
  const[user,setUser]=useState<{firstName:string;lastName:string;email:string;role:{roleName:string;renameRole:string}}|null>(null)
  const[theme,setThemeState]=useState<'light'|'dark'>('light')
  const[isLoggingOut,setIsLoggingOut]=useState(false)
  const userRef=React.useRef<HTMLDivElement>(null)

  const checkDummyStatus=()=>{
    try{
      const raw=localStorage.getItem('smartcliff_roleSwitch')
      if(raw){const d:RoleSwitchState=JSON.parse(raw);setIsDummyStudent(d.isDummyStudent||false);if(d.originalRole||d.originalRenameRole)setOriginalRoleInfo({roleName:d.originalRole||'',renameRole:d.originalRenameRole||''})}
      else{setIsDummyStudent(false);setOriginalRoleInfo(null)}
    }catch{}
  }

  useEffect(()=>{
    try{
      const saved=localStorage.getItem('theme') as 'light'|'dark'
      const sys=window.matchMedia('(prefers-color-scheme: dark)').matches
      const t=saved||(sys?'dark':'light')
      setThemeState(t)
      if(t==='dark')document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }catch{}
    checkDummyStatus()
    try{
      const raw=localStorage.getItem('smartcliff_userData')||localStorage.getItem('smartcliff_user')||localStorage.getItem('currentUser')
      if(raw)setUser(JSON.parse(raw))
    }catch{}
  },[])

  useEffect(()=>{
    const h=()=>checkDummyStatus()
    window.addEventListener('storage',h)
    return()=>window.removeEventListener('storage',h)
  },[])

  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(userRef.current&&!userRef.current.contains(e.target as Node))setUserOpen(false)}
    document.addEventListener('mousedown',h)
    return()=>document.removeEventListener('mousedown',h)
  },[])

  const toggleTheme=()=>{
    const n=theme==='light'?'dark':'light'
    setThemeState(n)
    if(n==='dark')document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme',n)
  }

  const handleLogout=async()=>{
    setIsLoggingOut(true)
    try{localStorage.removeItem('smartcliff_roleSwitch');localStorage.removeItem('smartcliff_isDummyStudent');localStorage.clear();router.push('/login')}
    finally{setIsLoggingOut(false)}
  }

  const handleSwitchToStudent=()=>{
    try{
      const d:RoleSwitchState={isDummyStudent:true,originalRole:user?.role?.roleName||'',originalRenameRole:user?.role?.renameRole||'',switchTimestamp:Date.now()}
      localStorage.setItem('smartcliff_roleSwitch',JSON.stringify(d))
      localStorage.setItem('smartcliff_isDummyStudent','true')
      setIsDummyStudent(true);setOriginalRoleInfo({roleName:user?.role?.roleName||'',renameRole:user?.role?.renameRole||''});setUserOpen(false)
      router.push('/lms/pages/courses')
      setTimeout(()=>window.dispatchEvent(new Event('storage')),100)
    }catch{}
  }

  const handleSwitchBack=()=>{
    try{
      localStorage.removeItem('smartcliff_roleSwitch');localStorage.removeItem('smartcliff_isDummyStudent')
      setIsDummyStudent(false);setOriginalRoleInfo(null);setUserOpen(false)
      const r=originalRoleInfo?.renameRole?.toLowerCase()||''
      if(r.includes('poc'))router.push('/lms/pages/poc/dashboard')
      else if(r.includes('admin'))router.push('/lms/pages/admin/dashboard')
      else router.push('/lms/pages/dashboard')
      setTimeout(()=>window.dispatchEvent(new Event('storage')),100)
    }catch{}
  }

  const isActualStudent=()=>{
    if(user){
      if(user.role?.roleName?.toLowerCase().includes('student')) return true
      if(user.role?.renameRole?.toLowerCase().includes('student')) return true
    }
    try{
      const renameRole=localStorage.getItem('smartcliff_renameRole')
      if(renameRole?.toLowerCase().includes('student')) return true
      const roleVal=localStorage.getItem('smartcliff_roleValue')
      if(roleVal?.toLowerCase().includes('student')) return true
    }catch{}
    return false
  }

  const getInitials=()=>{
    if(!user)return'SC'
    return`${user.firstName?.charAt(0)||''}${user.lastName?.charAt(0)||''}`.toUpperCase()
  }

  return(
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 16px',height:52,borderBottom:`1px solid ${T.border}`,background:T.bg,flexShrink:0,position:'relative'}}>
      <button onClick={onMenuClick} className="lg:hidden"
        style={{padding:6,borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',cursor:'pointer',color:T.textMuted,display:'flex',alignItems:'center',justifyContent:'center',marginRight:4}}>
        <Layout size={15}/>
      </button>
      <div style={{flex:1,display:'flex',alignItems:'center',gap:2,flexWrap:'wrap',minWidth:0,overflow:'hidden'}}>
        {items.map((item,i)=>{
          const isLast=item.isLast||i===items.length-1
          const isNav=i<=1
          return(
            <React.Fragment key={i}>
              <div style={{display:'flex',alignItems:'center',gap:3,cursor:!isLast?'pointer':'default',flexShrink:0}} onClick={!isLast?item.onClick:undefined}>
                {item.icon&&React.createElement(item.icon,{size:12,style:{color:isNav&&!isLast?'#3B82F6':isLast?T.textMain:T.textMuted}})}
                <span style={{fontSize:isLast?'13.5px':'12.5px',fontWeight:isLast?700:600,color:isNav&&!isLast?'#3B82F6':isLast?T.textMain:T.textMuted,whiteSpace:'nowrap',transition:'color .14s'}}
                  onMouseEnter={e=>{if(!isLast)(e.currentTarget as HTMLElement).style.color=T.orange}}
                  onMouseLeave={e=>{if(!isLast)(e.currentTarget as HTMLElement).style.color=isNav?'#3B82F6':T.textMuted}}>
                  {item.label}
                </span>
              </div>
              {!isLast&&<ChevronRight size={10} style={{color:T.textHint,flexShrink:0}}/>}
            </React.Fragment>
          )
        })}
      </div>
      <button onClick={onAIClick}
        style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,border:`1.5px solid ${T.orange}40`,background:T.orangeTint,color:T.orange,fontSize:'11.5px',fontWeight:700,cursor:'pointer',flexShrink:0,transition:'all .15s'}}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.orangeLight}
        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.orangeTint}>
        <Bot size={13}/>Ask AI
      </button>
      <button onClick={onSummaryClick}
        style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,border:`1.5px solid ${T.border}`,background:T.pageBg,color:T.textSub,fontSize:'11.5px',fontWeight:600,cursor:'pointer',flexShrink:0,transition:'all .15s'}}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.border}
        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.pageBg}>
        <Sparkles size={13}/>Summary
      </button>
      <button onClick={toggleTheme}
        style={{padding:6,borderRadius:8,border:`1px solid ${T.border}`,background:'transparent',cursor:'pointer',color:T.textMuted,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.pageBg}
        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
        {theme==='dark'?<Sun size={14}/>:<Moon size={14}/>}
      </button>
      <div style={{width:1,height:20,background:T.border,flexShrink:0}}/>
      <div ref={userRef} style={{position:'relative',flexShrink:0}}>
        <button onClick={()=>setUserOpen(v=>!v)}
          style={{display:'flex',alignItems:'center',gap:7,padding:'4px 8px',borderRadius:10,border:`1.5px solid ${T.border}`,background:userOpen?T.pageBg:'transparent',cursor:'pointer',transition:'all .15s'}}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.pageBg}
          onMouseLeave={e=>{if(!userOpen)(e.currentTarget as HTMLElement).style.background='transparent'}}>
          <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#8b5cf6,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'10px',fontWeight:800,color:'#fff',letterSpacing:'0.02em',boxShadow:'0 1px 4px rgba(139,92,246,0.35)'}}>
            {getInitials()}
          </div>
          <div style={{textAlign:'left',lineHeight:1.25}}>
            <div style={{fontSize:'11.5px',fontWeight:700,color:T.textMain}}>{user?.firstName||'Student'}</div>
            <div style={{fontSize:'9.5px',color:isDummyStudent?'#d97706':T.textMuted,fontWeight:isDummyStudent?600:400}}>
              {isDummyStudent?'⚡ Student View':user?.role?.renameRole||'Account'}
            </div>
          </div>
          <ChevronDown size={11} style={{color:T.textMuted,transform:userOpen?'rotate(180deg)':'none',transition:'transform .2s'}}/>
        </button>

        {userOpen&&(
          <>
            <div style={{position:'fixed',inset:0,zIndex:10}} onClick={()=>setUserOpen(false)}/>
            <div style={{position:'absolute',right:0,top:'calc(100% + 8px)',width:256,borderRadius:12,background:T.bg,border:`1px solid ${T.line}`,boxShadow:'0 10px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06)',zIndex:11,overflow:'hidden',animation:'fadeIn .15s ease both'}}>
              <div style={{padding:'12px 14px',background:T.pageBg,borderBottom:`1px solid ${T.line}`,display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#8b5cf6,#d946ef)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'14px',fontWeight:800,color:'#fff',boxShadow:'0 2px 6px rgba(139,92,246,0.30)'}}>
                  {getInitials()}
                </div>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:700,color:T.textMain,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{fontSize:'11px',color:T.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:1}}>
                    {user?.email}
                  </div>
                  <span style={{display:'inline-flex',alignItems:'center',marginTop:4,padding:'2px 7px',borderRadius:5,fontSize:'10px',fontWeight:600,
                    background:isDummyStudent?'rgba(217,119,6,0.12)':'rgba(139,92,246,0.10)',
                    color:isDummyStudent?'#d97706':'#7c3aed'}}>
                    {isDummyStudent?'⚡ Student View':user?.role?.renameRole||'Account'}
                  </span>
                </div>
              </div>
              <div style={{padding:'6px'}}>
                {!isActualStudent()&&!isDummyStudent&&(
                  <button onClick={handleSwitchToStudent}
                    style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background .12s',marginBottom:2}}
                    onMouseEnter={e=>{const b=e.currentTarget.querySelector('div') as HTMLElement;if(b){b.style.background='#2563eb';b.style.color='#fff'};(e.currentTarget as HTMLElement).style.background='rgba(59,130,246,0.07)'}}
                    onMouseLeave={e=>{const b=e.currentTarget.querySelector('div') as HTMLElement;if(b){b.style.background='rgba(59,130,246,0.10)';b.style.color='#3b82f6'};(e.currentTarget as HTMLElement).style.background='transparent'}}>
                    <div style={{width:28,height:28,borderRadius:7,background:'rgba(59,130,246,0.10)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .12s',color:'#3b82f6'}}>
                      <User size={13}/>
                    </div>
                    <div>
                      <div style={{fontSize:'12px',fontWeight:600,color:'#3b82f6'}}>Switch to Student</div>
                      <div style={{fontSize:'10px',color:T.textMuted}}>Preview student experience</div>
                    </div>
                  </button>
                )}
                {isDummyStudent&&originalRoleInfo&&(
                  <button onClick={handleSwitchBack}
                    style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background .12s',marginBottom:2}}
                    onMouseEnter={e=>{const b=e.currentTarget.querySelector('div') as HTMLElement;if(b){b.style.background='#d97706';b.style.color='#fff'};(e.currentTarget as HTMLElement).style.background='rgba(217,119,6,0.08)'}}
                    onMouseLeave={e=>{const b=e.currentTarget.querySelector('div') as HTMLElement;if(b){b.style.background='rgba(217,119,6,0.10)';b.style.color='#d97706'};(e.currentTarget as HTMLElement).style.background='transparent'}}>
                    <div style={{width:28,height:28,borderRadius:7,background:'rgba(217,119,6,0.10)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .12s',color:'#d97706'}}>
                      <Sparkles size={13}/>
                    </div>
                    <div>
                      <div style={{fontSize:'12px',fontWeight:600,color:'#d97706'}}>Back to {originalRoleInfo.renameRole}</div>
                      <div style={{fontSize:'10px',color:T.textMuted}}>Return to original role</div>
                    </div>
                  </button>
                )}
                <div style={{height:1,background:T.line,margin:'4px 4px 6px'}}/>
                <button onClick={()=>{setUserOpen(false);router.push('/lms/pages/studentdashboard/student/profile')}}
                  style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background .12s'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=T.pageBg}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'}}>
                  <User size={13} style={{color:T.inkMuted,flexShrink:0}}/>
                  <span style={{fontSize:'12px',fontWeight:500,color:T.textMain}}>My Profile</span>
                </button>
                <button onClick={()=>setUserOpen(false)}
                  style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background .12s'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=T.pageBg}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'}}>
                  <Settings size={13} style={{color:T.inkMuted,flexShrink:0}}/>
                  <span style={{fontSize:'12px',fontWeight:500,color:T.textMain}}>Settings</span>
                </button>
                <button onClick={()=>setUserOpen(false)}
                  style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background .12s'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=T.pageBg}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'}}>
                  <BookOpen size={13} style={{color:T.inkMuted,flexShrink:0}}/>
                  <span style={{fontSize:'12px',fontWeight:500,color:T.textMain}}>Help & Support</span>
                </button>
              </div>
              <div style={{padding:'6px',borderTop:`1px solid ${T.line}`}}>
                <button onClick={handleLogout} disabled={isLoggingOut}
                  style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'8px 10px',borderRadius:8,border:'none',background:'transparent',cursor:'pointer',textAlign:'left',transition:'background .12s'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(239,68,68,0.06)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent'}}>
                  <LogOut size={13} style={{color:'#ef4444',flexShrink:0}}/>
                  <span style={{fontSize:'12px',fontWeight:600,color:'#ef4444'}}>{isLoggingOut?'Signing out…':'Sign Out'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const SortHeader=({onSort,cfg}:{onSort:(f:SortField)=>void;cfg:SortConfig})=>{
  const ind=(f:SortField)=>cfg.field!==f
    ?<span style={{display:'inline-flex',flexDirection:'column',marginLeft:2,gap:0}}><ChevronUp size={8} style={{color:T.textHint}}/><ChevronDown size={8} style={{color:T.textHint}}/></span>
    :cfg.direction==='asc'?<ChevronUp size={11} style={{color:T.orange,marginLeft:2}}/>:<ChevronDown size={11} style={{color:T.orange,marginLeft:2}}/>
  const btn=(label:string,f:SortField,extra:React.CSSProperties={})=>(
    <button onClick={()=>onSort(f)} style={{display:'flex',alignItems:'center',background:'none',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:600,color:cfg.field===f?T.orange:T.textMuted,padding:'4px 0',...extra}}>
      {label}{ind(f)}
    </button>
  )
  return(
    <div style={{display:'flex',alignItems:'center',padding:'7px 14px',background:T.surface,borderBottom:`1px solid ${T.line}`,position:'sticky',top:0,zIndex:10}}>
      {btn("Name","name",{flex:1})}
      {btn("Size","size",{width:52,justifyContent:'flex-end'})}
      {btn("Date","date",{width:90,justifyContent:'flex-end'})}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function LMSPage(){
  const params=useParams()
  const router=useRouter()
  const {resolvedTheme}=useNextTheme()
  const courseId=params?.id as string
  const save=(k:string,v:string)=>{if(typeof window!=='undefined')localStorage.setItem(k,v)}
  const load=(k:string)=>{if(typeof window!=='undefined')return localStorage.getItem(k);return null}

  const[courseData,setCourseData]=useState<CourseData|null>(null)
  const[error,setError]=useState<string|null>(null)
  const[selectedItem,setSelectedItem]=useState<SelectedItem|null>(null)
  const[selectedMethod,setSelectedMethod]=useState<string>(()=>load('lms_student_selected_method')||"")
  const[selectedActivity,setSelectedActivity]=useState<string>(()=>load('lms_student_selected_activity')||"")
  const[expandedModules,setExpandedModules]=useState<Set<string>>(new Set())
  const[expandedSubModules,setExpandedSubModules]=useState<Set<string>>(new Set())
  const[expandedTopics,setExpandedTopics]=useState<Set<string>>(new Set())
  const[sidebarOpen,setSidebarOpen]=useState(true)
  const[showNotesPanel,setShowNotesPanel]=useState(false)
  const[showAIPanel,setShowAIPanel]=useState(false)
  const[showAIChat,setShowAIChat]=useState(false)
  const[showSummary,setShowSummary]=useState(false)
  const[currentHierarchy,setCurrentHierarchy]=useState<string[]>([])
  const[activeViewer,setActiveViewer]=useState<{type:"video"|"pdf"|"ppt"|"zip"|null;resource:Resource|null}>({type:null,resource:null})
  const[currentFolder,setCurrentFolder]=useState<Resource|null>(null)
  const[folderPath,setFolderPath]=useState<Resource[]>([])
  const[selectedResourceType,setSelectedResourceType]=useState<ResourceType|"all">("pdf")
  const[selectedDocTypes,setSelectedDocTypes]=useState<Set<ResourceType>>(new Set())
  const[userSelectedResourceType,setUserSelectedResourceType]=useState<boolean>(false)
  const[sortConfig,setSortConfig]=useState<SortConfig>({field:"name",direction:"asc"})
  const[selectedExercise,setSelectedExercise]=useState<any>(null)
  const[isLoading,setIsLoading]=useState(true)
  const[sidebarSearch,setSidebarSearch]=useState("")
  const[inlinePageIndex,setInlinePageIndex]=useState(0)
  const [hoveredMethod,setHoveredMethod]=useState<string|null>(null)
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string>("");
    const normalizeKey=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,'_')

  const learningElements=():LearningElement[]=>{
    const cp={I_Do:courseData?.I_Do,We_Do:courseData?.We_Do,You_Do:courseData?.You_Do}
    if(!cp||(!cp.I_Do&&!cp.We_Do&&!cp.You_Do))return[]
    const create=(type:LearningElementType,ped:Record<string,PedagogyItem>|string[]|undefined):LearningElement=>{
      const subs:PedagogySubItem[]=[]
      if(ped){
        if(Array.isArray(ped)){
          ped.forEach((item,i)=>{
            const key=typeof item==='string'?item.toLowerCase().replace(/\s+/g,'_'):`item_${i}`
            const name=typeof item==='string'?item:`Activity ${i+1}`
            let ar:PedagogySubItem={key,name,description:'',files:[],folders:[],links:[]}
            if(selectedItem?.pedagogy){
              const pk=type==='i-do'?'I_Do':type==='we-do'?'We_Do':'You_Do'
              const tp=selectedItem.pedagogy[pk]
              if(tp&&typeof tp==='object'&&!Array.isArray(tp)){
                const ak=Object.keys(tp).find(k=>normalizeKey(k)===normalizeKey(key))
                if(ak){const ad=tp[ak];if(ad&&typeof ad==='object'&&(ad.files||ad.folders||ad.links))ar={key,name,description:(ad as any).description||'',files:(ad as any).files||[],folders:(ad as any).folders||[],links:(ad as any).links||[]}}
              }
            }
            subs.push(ar)
          })
        }else if(typeof ped==='object'){
          if(type==='we-do'&&Array.isArray(courseData?.We_Do)){courseData!.We_Do.forEach((n:string)=>subs.push({key:n.toLowerCase().replace(/\s+/g,'_'),name:n,description:'',files:[],folders:[],links:[]}))}
          else{Object.entries(ped).forEach(([key,item])=>{if(item)subs.push({key,name:formatSubItemName(key),description:(item as any).description||'',files:(item as any).files||[],folders:(item as any).folders||[],links:(item as any).links||[]})})}
        }
      }
      const mc=METHOD_CFG[type as MethodKey]
      return{id:type,title:mc.label,type,icon:Target,color:mc.color,subItems:subs}
    }
    return[create("i-do",cp.I_Do),create("we-do",cp.We_Do),create("you-do",cp.You_Do)]
  }
  const subcategories = useMemo(() => {
    const elements = learningElements();
    return {
      I_Do: elements.find(e => e.id === "i-do")?.subItems.map(s => ({
        key: s.key,
        label: s.name,
        icon: <Activity size={12} />,
        component: s
      })) || [],
      We_Do: elements.find(e => e.id === "we-do")?.subItems.map(s => ({
        key: s.key,
        label: s.name,
        icon: <Activity size={12} />,
        component: s
      })) || [],
      You_Do: elements.find(e => e.id === "you-do")?.subItems.map(s => ({
        key: s.key,
        label: s.name,
        icon: <Activity size={12} />,
        component: s
      })) || [],
    };
  }, [selectedItem]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const method = tab === "I_Do" ? "i-do" : tab === "We_Do" ? "we-do" : "you-do";
    setSelectedMethod(method);
    setSelectedActivity("");
    setUserSelectedResourceType(false);
  };

  const handleSubcategoryChange = (sub: string, component: any) => {
    setActiveSubcategory(sub);
    setSelectedActivity(sub);
    setUserSelectedResourceType(false);
  };

  useEffect(() => {
    if (selectedMethod) {
      const tab = selectedMethod === "i-do" ? "I_Do" : selectedMethod === "we-do" ? "We_Do" : "You_Do";
      setActiveTab(tab);
    } else {
      setActiveTab(null);
    }
    setActiveSubcategory(selectedActivity);
  }, [selectedMethod, selectedActivity]);

  const closeAllViewers=()=>setActiveViewer({type:null,resource:null})
  const openViewer=(type:"video"|"pdf"|"ppt"|"zip",resource:Resource)=>setActiveViewer({type,resource})

  useEffect(()=>{const h=()=>setShowNotesPanel(true);window.addEventListener('open-notes-panel',h);return()=>window.removeEventListener('open-notes-panel',h)},[])
  useEffect(()=>{const f=()=>setSidebarOpen(window.innerWidth>=1024);f();window.addEventListener('resize',f);return()=>window.removeEventListener('resize',f)},[])
  useEffect(()=>{if(window.innerWidth<1024)setSidebarOpen(false)},[selectedItem])
  useEffect(()=>{if(selectedMethod)save('lms_student_selected_method',selectedMethod)},[selectedMethod])
  useEffect(()=>{if(selectedActivity)save('lms_student_selected_activity',selectedActivity)},[selectedActivity])
  useEffect(()=>{setInlinePageIndex(0)},[selectedMethod,selectedActivity,selectedItem])

  useEffect(()=>{
    if(!courseId){setError("No course ID.");setIsLoading(false);return}
    fetch(`https://lms-server-ym1q.onrender.com/getAll/courses-data/${courseId}`)
      .then(r=>r.json()).then(d=>{
        const info=d.data||d
        setCourseData(info)
        if(!load('lms_student_selected_node_id')){setIsLoading(false);if(info.modules?.length>0)setExpandedModules(new Set([info.modules[0]._id]))}
      }).catch(e=>{setError(e.message||"Error");setIsLoading(false)})
  },[courseId])


  const getStudentAnswers = useCallback((): Record<string, any> | undefined => {
    if (!courseData?.singleParticipants || !Array.isArray(courseData.singleParticipants)) return undefined
    let currentUserId: string | undefined
    try {
      const { valid, user: tokenUser } = userPermission()
      if (valid && tokenUser?._id) currentUserId = tokenUser._id
    } catch {}
    if (!currentUserId) {
      currentUserId = localStorage.getItem('smartcliff_userId') || undefined
    }
    if (!currentUserId) {
      try {
        const raw = localStorage.getItem('smartcliff_userData')
        if (raw) { const u = JSON.parse(raw); currentUserId = u?._id }
      } catch {}
    }
    if (!currentUserId) return undefined
    const participant = courseData.singleParticipants.find(
      (p: any) => p.user?._id === currentUserId
    )
    if (!participant) return undefined
    const courseEntry = participant.user?.courses?.find(
      (c: any) => c.courseId === courseId
    )
    return courseEntry?.answers ?? undefined
  }, [courseData, courseId])

  const handleItemSelect=useCallback((itemId:string,itemTitle:string,itemType:SelectedItemType,hierarchyIds:string[],pedagogy?:Pedagogy)=>{
    if(selectedItem?.id===itemId)return
    save('lms_student_selected_node_id',itemId)
    const findLabel=(id:string):string=>{
      if(!courseData?.modules)return"Unknown"
      for(const m of courseData.modules){
        if(m._id===id)return m.title
        if(m.subModules)for(const sm of m.subModules){if(sm._id===id)return sm.title;if(sm.topics)for(const t of sm.topics){if(t._id===id)return t.title;if(t.subTopics)for(const st of t.subTopics)if(st._id===id)return st.title}}
        if(m.topics)for(const t of m.topics){if(t._id===id)return t.title;if(t.subTopics)for(const st of t.subTopics)if(st._id===id)return st.title}
      }
      return"Unknown"
    }
    setCurrentHierarchy(hierarchyIds.map(findLabel))
    setSelectedItem({id:itemId,title:itemTitle,type:itemType,hierarchy:hierarchyIds,pedagogy})
    if(selectedItem?.hierarchy[0]!==hierarchyIds[0]){setSelectedMethod("");setSelectedActivity("")}
    setCurrentFolder(null);setFolderPath([]);closeAllViewers()
    setSelectedDocTypes(new Set());setUserSelectedResourceType(false);setSortConfig({field:"name",direction:"asc"})
  },[courseData,selectedItem])

  useEffect(()=>{
    if(!courseData?.modules)return
    if(selectedItem){setIsLoading(false);return}
    const nid=load('lms_student_selected_node_id')
    const sm=load('lms_student_selected_method')
    const sa=load('lms_student_selected_activity')
    if(nid){
      const restore=(id:string,title:string,type:SelectedItemType,hier:string[],ped?:Pedagogy)=>{handleItemSelect(id,title,type,hier,ped);if(sm&&sa)setTimeout(()=>{setSelectedMethod(sm);setSelectedActivity(sa)},100)}
      const walk=(modules:Module[]):boolean=>{
        for(const m of modules){
          if(m._id===nid){restore(m._id,m.title,"module",[m._id],m.pedagogy);setExpandedModules(p=>new Set(p).add(m._id));return true}
          if(m.subModules)for(const sub of m.subModules){
            if(sub._id===nid){restore(sub._id,sub.title,"submodule",[m._id,sub._id],sub.pedagogy);setExpandedModules(p=>new Set(p).add(m._id));setExpandedSubModules(p=>new Set(p).add(sub._id));return true}
            if(sub.topics)for(const t of sub.topics){
              if(t._id===nid){restore(t._id,t.title,"topic",[m._id,sub._id,t._id],t.pedagogy);setExpandedModules(p=>new Set(p).add(m._id));setExpandedSubModules(p=>new Set(p).add(sub._id));setExpandedTopics(p=>new Set(p).add(t._id));return true}
              if(t.subTopics)for(const st of t.subTopics)if(st._id===nid){restore(st._id,st.title,"subtopic",[m._id,sub._id,t._id,st._id],st.pedagogy);setExpandedModules(p=>new Set(p).add(m._id));setExpandedSubModules(p=>new Set(p).add(sub._id));setExpandedTopics(p=>new Set(p).add(t._id));return true}
            }
          }
          if(m.topics)for(const t of m.topics){
            if(t._id===nid){restore(t._id,t.title,"topic",[m._id,t._id],t.pedagogy);setExpandedModules(p=>new Set(p).add(m._id));setExpandedTopics(p=>new Set(p).add(t._id));return true}
            if(t.subTopics)for(const st of t.subTopics)if(st._id===nid){restore(st._id,st.title,"subtopic",[m._id,t._id,st._id],st.pedagogy);setExpandedModules(p=>new Set(p).add(m._id));setExpandedTopics(p=>new Set(p).add(t._id));return true}
          }
        }
        return false
      }
      walk(courseData.modules)
    }
    setIsLoading(false)
  },[courseData,handleItemSelect,selectedItem])

  useEffect(()=>{if(selectedItem)closeAllViewers()},[selectedItem])

  const fmtSize=(s:string):string=>{if(!s||s==="-")return"-";try{const n=parseInt(s);if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(1)} MB`}catch{return"-"}}
  const parseSize=(s:string)=>{const sl=s.toLowerCase();if(sl.includes("kb"))return parseFloat(sl)*1024;if(sl.includes("mb"))return parseFloat(sl)*1048576;return parseFloat(sl)||0}
  const parseDate=(d:string)=>{if(!d)return new Date(0);try{return new Date(d)}catch{return new Date(0)}}
  const sortResources=(arr:Resource[])=>[...arr].sort((a,b)=>{
    let av:any,bv:any
    if(sortConfig.field==="name"){av=a.title.toLowerCase();bv=b.title.toLowerCase()}
    else if(sortConfig.field==="size"){av=parseSize(a.fileSize||"-");bv=parseSize(b.fileSize||"-")}
    else{av=parseDate(a.uploadedAt||"");bv=parseDate(b.uploadedAt||"")}
    const c=av<bv?-1:av>bv?1:0
    return sortConfig.direction==="asc"?c:-c
  })

const extractAllFilesFromFolders = (folders: PedagogyFolder[]): Resource[] => {
  const all: Resource[] = []
  const proc = (folder: PedagogyFolder) => {
    folder.files?.forEach(file => {
      const ft = getFileType(file.fileUrl, file.fileType)
      const r: Resource = {
        id: file._id || `f-${Math.random().toString(36).substr(2, 5)}`,
        title: file.fileName || 'Untitled',
        type: file.isReference ? 'reference' : ft,
        fileName: file.fileName,
        fileSize: fmtSize(file.size),
        uploadedAt: file.uploadedAt,
        isReference: file.isReference || false,
        fileSettings: file.fileSettings,
        isVideo: file.isVideo,
        isArchive: file.isArchive,
        // Add these properties for video resolution
        availableResolutions: file.availableResolutions || [],
        fileUrlMap: typeof file.fileUrl === 'object' && file.fileUrl !== null ? file.fileUrl : {},
        mcqQuestions: (file as any).mcqQuestions || [],
        tags: file.tags || [],
      }
      if (ft === 'link') r.externalUrl = getFileUrl(file.fileUrl)
      else r.fileUrl = getFileUrl(file.fileUrl)
      all.push(r)
    })
    folder.subfolders?.forEach(sf => proc(sf))
  }
  folders.forEach(f => proc(f))
  return all
}

const categorizeFolderContents = (folders: PedagogyFolder[]) => {
  if (!folders.length) return { similarType: null as ResourceType | null, resources: [], folderRepresentations: [] }

  const reps: Resource[] = []

  // Only process ROOT-level folders (not subfolders recursively)
  folders.forEach(folder => {
    // Collect all files in this folder AND its subfolders recursively
    const collectFiles = (f: PedagogyFolder, depth = 0): Resource[] => {
      const files: Resource[] = (f.files || [])
        .filter(file => !file.fileSettings || file.fileSettings.showToStudents !== false)
        .map(file => {
          const ft = getFileType(file.fileUrl, file.fileType)
          const r: Resource = {
            id: file._id || `f-${Math.random().toString(36).substr(2, 5)}`,
            title: file.fileName || 'Untitled',
            type: file.isReference ? 'reference' : ft,
            fileName: file.fileName,
            fileSize: fmtSize(file.size),
            uploadedAt: file.uploadedAt,
            isReference: file.isReference || false,
            fileSettings: file.fileSettings,
            isVideo: file.isVideo,
            isArchive: file.isArchive,
            availableResolutions: file.availableResolutions,
            mcqQuestions: (file as any).mcqQuestions || [],
            tags: file.tags || [],
          }
          if (ft === 'link') r.externalUrl = getFileUrl(file.fileUrl)
          else r.fileUrl = getFileUrl(file.fileUrl)
          return r
        })

      // Add subfolder representations (not recursively flattened to root)
      const subFolderReps: Resource[] = (f.subfolders || []).map(sf => {
        const sfFiles = collectFiles(sf)
        const nonRef = sfFiles.filter(x => !x.isReference)
        const same = nonRef.length > 0 && nonRef.every(x => x.type === nonRef[0].type)
        return {
          id: `folder-${sf.name}-${Math.random().toString(36).substr(2, 5)}`,
          title: sf.name,
          type: same ? nonRef[0].type : 'reference' as ResourceType,
          isFolder: true,
          folderType: same ? 'similar' : 'mixed' as 'similar' | 'mixed',
          folderContents: sfFiles,
          fileSize: `${sfFiles.length} items`,
          uploadedAt: sfFiles[0]?.uploadedAt,
          tags: sf.tags || [],
        }
      })

      return depth === 0 ? [...files, ...subFolderReps] : files
    }

    const contents = collectFiles(folder, 0)
    // Also get direct files only for type detection
    const directFiles = (folder.files || [])
      .filter(f => !f.fileSettings || f.fileSettings.showToStudents !== false)
    const nonRef = contents.filter(r => !r.isReference && !r.isFolder)
    const same = nonRef.length > 0 && nonRef.every(r => r.type === nonRef[0].type)

    if (contents.length > 0) {
      reps.push({
        id: `folder-${folder.name}-${Math.random().toString(36).substr(2, 5)}`,
        title: folder.name,
        type: same ? nonRef[0].type : 'reference' as ResourceType,
        isFolder: true,
        folderType: same ? 'similar' : 'mixed' as 'similar' | 'mixed',
        folderContents: contents,
        fileSize: `${contents.length} items`,
        uploadedAt: contents.find(c => c.uploadedAt)?.uploadedAt,
        tags: folder.tags || [],
      })
    }
  })

  const allFiles = reps.flatMap(r => r.folderContents || []).filter(r => !r.isFolder)
  const nonRef = allFiles.filter(r => !r.isReference)

  return {
    similarType: nonRef.length > 0 && nonRef.every(r => r.type === nonRef[0].type) ? nonRef[0].type : null,
    resources: allFiles,
    folderRepresentations: reps,
  }
}

  const getPagesForActivity=():PedagogyPage[]=>{
    if(!selectedMethod||!selectedActivity||!selectedItem?.pedagogy)return[]
    const mk:Record<string,"I_Do"|"We_Do"|"You_Do">={"i-do":"I_Do","we-do":"We_Do","you-do":"You_Do"}
    const tk=mk[selectedMethod];if(!tk)return[]
    const cat=selectedItem.pedagogy[tk]
    if(!cat||typeof cat!=='object'||Array.isArray(cat))return[]
    const fk=Object.keys(cat).find(k=>normalizeKey(k)===normalizeKey(selectedActivity));if(!fk)return[]
    const ad=(cat as any)[fk]
    if(!ad||typeof ad!=='object'||Array.isArray(ad))return[]
    return Array.isArray(ad.pages)?ad.pages.filter((p:PedagogyPage)=>p?._id&&p?.title&&p?.combinedCode):[]
  }



  const getExercisesForActivity=():any[]=>{
    if(!selectedMethod||!selectedActivity||!selectedItem?.pedagogy)return[]
    try{
      const mk:Record<string,"I_Do"|"We_Do"|"You_Do">={"i-do":"I_Do","we-do":"We_Do","you-do":"You_Do"}
      const tk=mk[selectedMethod];if(!tk)return[]
      const cat=selectedItem.pedagogy[tk]
      if(!cat||typeof cat!=='object')return[]
      const tKey=normalizeKey(selectedActivity)
      if(Array.isArray((cat as any)[tKey]))return(cat as any)[tKey]
      const fk=Object.keys(cat).find(k=>normalizeKey(k)===tKey)
      if(fk){const d=(cat as any)[fk];if(Array.isArray(d))return d}
      return[]
    }catch{return[]}
  }

  const handleExerciseSelect=async(exercise:any)=>{
    let qs:any[]=[]
    if(exercise.questions&&Array.isArray(exercise.questions))qs=exercise.questions
    else if(exercise.exerciseInformation?.questions)qs=exercise.exerciseInformation.questions
    else if(exercise.data?.questions)qs=exercise.data.questions
    if(!qs.length){toast.warning("Exercise not yet configured.");return}
    const mk:Record<string,string>={'i-do':'I_Do','we-do':'We_Do','you-do':'You_Do'}
    const catP=mk[selectedMethod]||'We_Do'
    const eid=exercise?._id;const cname=courseData?.courseName||"Course"
    const stored={...exercise,questions:qs,courseId,courseName:cname,context:{courseId,nodeId:selectedItem?.id,nodeTitle:selectedItem?.title,method:selectedMethod,activity:selectedActivity},storedAt:new Date().toISOString()}
    const nav=(path:string,key:string,extra:Record<string,string>={})=>{localStorage.setItem(key,JSON.stringify(stored));router.push(`/lms/pages/courses/coursesdetailedview/${path}?${new URLSearchParams({courseId,courseName:cname,exerciseId:eid||'',subcategory:selectedActivity||'',category:catP,questionCount:qs.length.toString(),...extra})}`)}
    if(exercise.exerciseType==="Combined")nav('combined','currentCombinedExercise',{exerciseName:exercise.exerciseInformation?.exerciseName||'Combined Exercise'})
    else if(exercise.programmingSettings?.selectedModule==='Frontend')nav('frontend','currentFrontendExercise',{exerciseName:exercise.exerciseInformation?.exerciseName||'Frontend Exercise',hierarchy:currentHierarchy.toString()})
    else if(exercise.programmingSettings?.selectedModule==='Database'){toast.info("Opening SQL Exercise...",{autoClose:2000});nav('sql','currentSQLExercise',{exerciseName:exercise.exerciseInformation?.exerciseName||'SQL Exercise'})}
    else if(exercise.exerciseType==="MCQ")nav('mcq','currentMCQExercise',{exerciseName:exercise.exerciseInformation?.exerciseName||'MCQ Exercise',nodeId:selectedItem?.id||'',nodeName:selectedItem?.title||'',nodeType:selectedItem?.type||'',hierarchy:currentHierarchy.join(',')})
    else setSelectedExercise(exercise)
  }

  useEffect(()=>{
    if(selectedMethod&&selectedActivity){const exs=getExercisesForActivity();if(exs.length===0)setSelectedExercise(null)}
    else setSelectedExercise(null)
  },[selectedMethod,selectedActivity,selectedItem])

const getAvailableResourceTypes = (): ResourceType[] => {
  if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
  
  const types: ResourceType[] = []
  
  // Check for pages
  if (getPagesForActivity().length > 0) types.push("page")
  
  // Check for folders
  if (getFolders().length > 0) types.push("folder")
  
  // Check for other resource types
  const resourceTypes: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "reference"]
  resourceTypes.forEach(t => {
    if (getResourcesByType(t).length > 0) types.push(t)
  })
  
  return types
}


const getFolders = (): Resource[] => {
  if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
  
  const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = {
    "i-do": "I_Do",
    "we-do": "We_Do", 
    "you-do": "You_Do",
  }
  const tk = mk[selectedMethod]
  if (!tk) return []
  
  const cat = selectedItem.pedagogy[tk]
  if (!cat || typeof cat !== "object" || Array.isArray(cat)) return []
  
  const fk = Object.keys(cat).find(
    k => normalizeKey(k) === normalizeKey(selectedActivity)
  )
  if (!fk) return []
  
  const ad = (cat as any)[fk] as PedagogyItem
  if (!ad?.folders?.length) return []
  
  // Return all folders as resources
  return ad.folders.map(folder => ({
    id: `folder-${folder.name}-${Math.random().toString(36).substr(2, 5)}`,
    title: folder.name,
    type: "folder" as ResourceType,
    isFolder: true,
    folderContents: extractAllFilesFromFolders([folder]),
    fileSize: `${folder.files?.length || 0} items`,
    uploadedAt: folder.uploadedAt,
    tags: folder.tags || [],
  }))
}


const getResourcesByType = (type: ResourceType): Resource[] => {
  if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []

  if (type === "page") {
    return getPagesForActivity().map(p => ({
      id: p._id,
      title: p.title,
      type: "page" as ResourceType,
      fileUrl: "",
      fileSize: p.pageCount ? `${p.pageCount} pg` : "1 pg",
      uploadedAt: p.createdAt || "",
      _combinedCode: p.combinedCode,
      _pageCount: p.pageCount || 1,
      blocks: p.blocks || p.pagesData?.[0]?.blocks || [],
    }))
  }

  const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = {
    "i-do": "I_Do",
    "we-do": "We_Do",
    "you-do": "You_Do",
  }
  const tk = mk[selectedMethod]
  if (!tk) return []

  const cat = selectedItem.pedagogy[tk]
  if (!cat || typeof cat !== "object" || Array.isArray(cat)) return []

  const fk = Object.keys(cat).find(
    k => normalizeKey(k) === normalizeKey(selectedActivity)
  )
  if (!fk) return []

  const ad = (cat as any)[fk] as PedagogyItem
  if (!ad) return []

  // ── ONLY return direct files, NO folders ───────────────────────────────
  // Direct files only - exclude folders completely
const dfs: Resource[] = (ad.files || [])
  .filter(f =>
    (!f.fileSettings || f.fileSettings.showToStudents !== false) &&
    (type === "reference"
      ? f.isReference === true  
      : getFileType(f.fileUrl, f.fileType) === type && !f.isReference)  
  )  .map(f => {
    const ft = getFileType(f.fileUrl, f.fileType)
    const r: Resource = {
      id: f._id || `f-${Math.random().toString(36).substr(2, 5)}`,
      title: f.fileName || "Untitled",
      type: f.isReference ? "reference" : ft,
      fileName: f.fileName,
      fileSize: fmtSize(f.size),
      uploadedAt: f.uploadedAt,
      isReference: f.isReference || false,
      fileSettings: f.fileSettings,
      isVideo: f.isVideo,
      isArchive: f.isArchive,
      // IMPORTANT: These need to be included
      availableResolutions: f.availableResolutions || [],
      fileUrlMap: typeof f.fileUrl === 'object' && f.fileUrl !== null ? f.fileUrl : {},
      mcqQuestions: (f as any).mcqQuestions || [],
      tags: f.tags || [],
    }
      if (ft === "link") r.externalUrl = getFileUrl(f.fileUrl)
      else r.fileUrl = getFileUrl(f.fileUrl)
      return r
    })

  // ── Links ─────────────────────────────────────────────────
  const links: Resource[] =
    type === "link"
      ? (ad.links || []).map(l => ({
          id: l._id || `l-${Math.random().toString(36).substr(2, 5)}`,
          title: l.name,
          type: "link" as ResourceType,
          externalUrl: l.url,
          uploadedAt: l.uploadedAt,
          fileSettings: { showToStudents: true, allowDownload: true },
        }))
      : []

  if (type === "link") return [...dfs.filter(f => f.type === "link"), ...links]
  
  // ⭐ IMPORTANT: For all file filters (pdf, ppt, video, zip, reference)
  // Return ONLY direct files, NO folders
  return dfs
}
  const getAllResources=():Resource[]=>{const all:Resource[]=[];getAvailableResourceTypes().forEach(t=>all.push(...getResourcesByType(t)));return all}
  const getFilteredResources=():Resource[]=>{const all=getAllResources();if(selectedResourceType==="all")return all;return all.filter(r=>r.type===selectedResourceType)}
  const selectedActivityData=selectedMethod&&selectedActivity?learningElements().find(e=>e.id===selectedMethod)?.subItems.find(i=>i.key===selectedActivity):null

  useEffect(()=>{
    if(!selectedActivityData)return
    const av=getAvailableResourceTypes();if(!av.length)return
    const def=(["page","pdf","ppt","video","zip","link","reference"] as ResourceType[]).find(t=>av.includes(t))
    if(def&&!userSelectedResourceType)setSelectedResourceType(def)
  },[selectedActivityData,userSelectedResourceType])

  useEffect(()=>{
    if(selectedMethod&&selectedActivity){
      const av=getAvailableResourceTypes();if(!av.length)return
      const def=(["page","pdf","ppt","video","zip","link","reference"] as ResourceType[]).find(t=>av.includes(t))
      if(def&&!userSelectedResourceType)setSelectedResourceType(def)
    }else setSelectedResourceType("pdf")
  },[selectedMethod,selectedActivity,userSelectedResourceType])

  const handleFolderNavigation=(folder:Resource)=>{setCurrentFolder(folder);setFolderPath(p=>[...p,folder]);setSortConfig({field:"name",direction:"asc"})}
  const handleFolderBack=()=>{const p=[...folderPath];p.pop();setFolderPath(p);setCurrentFolder(p.length?p[p.length-1]:null)}
  const getFilteredFolderContents=():Resource[]=>{if(!currentFolder?.folderContents)return[];return[...currentFolder.folderContents]}

  const handleResourceClick=async(resource:Resource)=>{
    closeAllViewers()
    if(resource.isFolder&&resource.folderContents){handleFolderNavigation(resource);return}
    if(resource.type==="page"){openPageInNewTab(resource._combinedCode||"");return}
    if(resource.isReference){
      const aft=getFileType(resource.fileUrl||'',resource.fileName||'')
      if(aft==="video"){openViewer("video",resource);return}
      if(aft==="ppt"){openViewer("ppt",resource);return}
      if(aft==="pdf"){openViewer("pdf",resource);return}
      if(aft==="zip"){openViewer("zip",resource);return}
      let u=resource.externalUrl
      if(!u&&resource.fileUrl){if(typeof resource.fileUrl==='object'&&resource.fileUrl.base)u=resource.fileUrl.base;else if(typeof resource.fileUrl==='string')u=resource.fileUrl}
      if(u)window.open(u,'_blank','noopener,noreferrer');return
    }
    if(resource.type==="video"){openViewer("video",resource);return}
    if(resource.type==="ppt"){openViewer("ppt",resource);return}
    if(resource.type==="pdf"){openViewer("pdf",resource);return}
    if(resource.type==="zip"){openViewer("zip",resource);return}
    if(resource.type==="link"){
      let u=resource.externalUrl
      if(!u&&resource.fileUrl){if(typeof resource.fileUrl==='object'&&resource.fileUrl.base)u=resource.fileUrl.base;else if(typeof resource.fileUrl==='string')u=resource.fileUrl}
      if(u){const ut=detectUrlType(u);if(ut==="video")openViewer("video",{...resource,fileUrl:u,type:"video"});else if(ut==="ppt")openViewer("ppt",{...resource,fileUrl:u,type:"ppt"});else if(ut==="pdf")openViewer("pdf",{...resource,fileUrl:u,type:"pdf"});else window.open(u,'_blank','noopener,noreferrer')}
    }
  }
  const handleDownloadClick=async(resource:Resource,e:React.MouseEvent)=>{e.stopPropagation();if(!resource.isReference||resource.fileSettings?.allowDownload===false)return;await downloadFile(resource)}

  const toggleModule=(id:string)=>{const n=new Set(expandedModules);n.has(id)?n.delete(id):n.add(id);setExpandedModules(n)}
  const toggleSubModule=(id:string)=>{const n=new Set(expandedSubModules);n.has(id)?n.delete(id):n.add(id);setExpandedSubModules(n)}
  const toggleTopic=(id:string)=>{const n=new Set(expandedTopics);n.has(id)?n.delete(id):n.add(id);setExpandedTopics(n)}

  const buildBreadcrumbs=()=>{
    const items:Array<{label:string;icon?:React.ComponentType<any>;onClick?:()=>void;isLast?:boolean}>=[]
    const clear=()=>{localStorage.removeItem('lms_student_selected_node_id');localStorage.removeItem('lms_student_selected_method');localStorage.removeItem('lms_student_selected_activity');setSelectedItem(null);setSelectedMethod("");setSelectedActivity("");setCurrentFolder(null);setFolderPath([]);closeAllViewers()}
    items.push({label:"Dashboard",icon:LayoutDashboard,onClick:()=>{clear();router.push('/lms/pages/studentdashboard')}})
    items.push({label:"Courses",icon:BookMarked,onClick:()=>router.push('/lms/pages/courses')})
    if(courseData)items.push({label:courseData.courseName,icon:GraduationCap,onClick:clear})
    if(selectedItem&&courseData){
      const fl=(id:string):string=>{
        for(const m of courseData.modules||[]){
          if(m._id===id)return m.title
          if(m.subModules)for(const sm of m.subModules){if(sm._id===id)return sm.title;if(sm.topics)for(const t of sm.topics){if(t._id===id)return t.title;if(t.subTopics)for(const st of t.subTopics)if(st._id===id)return st.title}}
          if(m.topics)for(const t of m.topics){if(t._id===id)return t.title;if(t.subTopics)for(const st of t.subTopics)if(st._id===id)return st.title}
        }
        return"Unknown"
      }
      selectedItem.hierarchy.forEach((hid,i)=>{const lbl=fl(hid);if(lbl===courseData.courseName)return;items.push({label:lbl,isLast:i===selectedItem.hierarchy.length-1})})
    }
    return items
  }

  const SidebarNode=({title,type,level,isSelected,isExpanded,hasChildren,hasPedagogy,onToggle,onSelect}:{
    title:string;type:string;level:number;isSelected:boolean;isExpanded:boolean;
    hasChildren:boolean;hasPedagogy:boolean;onToggle:()=>void;onSelect:()=>void;
  })=>{
    const cfg=DC(level)
    const lp=10+level*14
    const handleClick=(e:React.MouseEvent)=>{e.stopPropagation();if(hasChildren)onToggle();else onSelect()}
    return(
      <div style={{position:'relative'}}>
        {level===0&&<div style={{height:1,margin:'1px 0',background:T.line}}/>}
        <div className="sb-row" onClick={handleClick} style={{display:'flex',alignItems:'center',gap:4,paddingLeft:lp,paddingRight:10,paddingTop:cfg.paddingV,paddingBottom:cfg.paddingV,position:'relative',background:isSelected?`${cfg.accentColor}08`:'transparent',borderLeft:isSelected?`2px solid ${cfg.accentColor}`:`1px solid ${cfg.accentColor}18`}}>
          {hasChildren?(
            <div style={{flexShrink:0,width:16,height:16,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',background:isExpanded?`${cfg.accentColor}12`:isSelected?`${cfg.accentColor}08`:T.surface,border:`1px solid ${isExpanded?cfg.accentColor+'40':T.line}`}}>
              <ChevronRight size={11} strokeWidth={2.2} style={{color:isExpanded||isSelected?cfg.accentColor:T.inkSub,transform:isExpanded?'rotate(90deg)':'none',transition:'transform .2s'}}/>
            </div>
          ):(
            <div style={{flexShrink:0,width:16,height:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{width:3,height:3,borderRadius:'50%',display:'block',background:isSelected?cfg.accentColor:T.inkFaint}}/>
            </div>
          )}
          <div style={{flexShrink:0,width:cfg.iconBox,height:cfg.iconBox,borderRadius:cfg.iconRadius,display:'flex',alignItems:'center',justifyContent:'center',background:isSelected?cfg.iconBg:'transparent',color:isSelected?cfg.iconColor:T.inkMuted,border:`1px solid ${isSelected?cfg.accentColor+'25':T.line}`}}>
            <SBNodeIcon type={type} size={cfg.iconStroke}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:cfg.textSize,fontWeight:cfg.textWeight,color:isSelected?cfg.accentColor:cfg.textColor,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.2}}>{title}</div>
            {level<=1&&<span style={{fontSize:'8px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em',color:isSelected?cfg.accentColor:T.inkFaint}}>{type}</span>}
          </div>
          {hasPedagogy&&<span style={{width:4,height:4,borderRadius:'50%',flexShrink:0,background:isSelected?cfg.dot:'#10b981',boxShadow:isSelected?`0 0 6px 1px ${cfg.dot}80`:'none',animation:isSelected?'sbPulse 2s ease-in-out infinite':'none'}}/>}
        </div>
      </div>
    )
  }

  const renderHierarchy=()=>{
    if(!courseData?.modules)return null
    const mods=courseData.modules.filter(m=>!sidebarSearch||
      m.title.toLowerCase().includes(sidebarSearch.toLowerCase())||
      m.topics?.some(t=>t.title.toLowerCase().includes(sidebarSearch.toLowerCase()))||
      m.subModules?.some(sm=>sm.title.toLowerCase().includes(sidebarSearch.toLowerCase())||
        sm.topics?.some(t=>t.title.toLowerCase().includes(sidebarSearch.toLowerCase()))))
    return(
      <div style={{paddingBottom:12}}>
        {mods.map(module=>{
          const mExp=expandedModules.has(module._id)
          const mSel=selectedItem?.id===module._id
          const mHasKids=hasChildItems(module)
          return(
            <div key={module._id}>
              <SidebarNode title={module.title} type="module" level={0} isSelected={mSel} isExpanded={mExp} hasChildren={mHasKids} hasPedagogy={hasPedagogyData(module)}
                onToggle={()=>toggleModule(module._id)} onSelect={()=>handleItemSelect(module._id,module.title,"module",[module._id],module.pedagogy)}/>
              {mExp&&(
                <div style={{animation:'sbSlide .15s ease both'}}>
                  {module.subModules?.map(sm=>{
                    const sExp=expandedSubModules.has(sm._id);const sSel=selectedItem?.id===sm._id;const sHasKids=hasChildItems(sm)
                    return(
                      <div key={sm._id}>
                        <SidebarNode title={sm.title} type="submodule" level={1} isSelected={sSel} isExpanded={sExp} hasChildren={sHasKids} hasPedagogy={hasPedagogyData(sm)}
                          onToggle={()=>toggleSubModule(sm._id)} onSelect={()=>handleItemSelect(sm._id,sm.title,"submodule",[module._id,sm._id],sm.pedagogy)}/>
                        {sExp&&(
                          <div style={{animation:'sbSlide .15s ease both'}}>
                            {sm.topics?.map(t=>{
                              const tExp=expandedTopics.has(t._id);const tSel=selectedItem?.id===t._id;const tHasKids=hasChildItems(t)
                              return(
                                <div key={t._id}>
                                  <SidebarNode title={t.title} type="topic" level={2} isSelected={tSel} isExpanded={tExp} hasChildren={tHasKids} hasPedagogy={hasPedagogyData(t)}
                                    onToggle={()=>toggleTopic(t._id)} onSelect={()=>handleItemSelect(t._id,t.title,"topic",[module._id,sm._id,t._id],t.pedagogy)}/>
                                  {tExp&&(
                                    <div style={{animation:'sbSlide .15s ease both'}}>
                                      {t.subTopics?.map(st=>(
                                        <SidebarNode key={st._id} title={st.title} type="subtopic" level={3} isSelected={selectedItem?.id===st._id} isExpanded={false} hasChildren={false} hasPedagogy={hasPedagogyData(st)}
                                          onToggle={()=>{}} onSelect={()=>handleItemSelect(st._id,st.title,"subtopic",[module._id,sm._id,t._id,st._id],st.pedagogy)}/>
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
                  {(!module.subModules?.length)&&module.topics?.map(t=>{
                    const tExp=expandedTopics.has(t._id);const tSel=selectedItem?.id===t._id;const tHasKids=hasChildItems(t)
                    return(
                      <div key={t._id}>
                        <SidebarNode title={t.title} type="topic" level={1} isSelected={tSel} isExpanded={tExp} hasChildren={tHasKids} hasPedagogy={hasPedagogyData(t)}
                          onToggle={()=>toggleTopic(t._id)} onSelect={()=>handleItemSelect(t._id,t.title,"topic",[module._id,t._id],t.pedagogy)}/>
                        {tExp&&(
                          <div style={{animation:'sbSlide .15s ease both'}}>
                            {t.subTopics?.map(st=>(
                              <SidebarNode key={st._id} title={st.title} type="subtopic" level={2} isSelected={selectedItem?.id===st._id} isExpanded={false} hasChildren={false} hasPedagogy={hasPedagogyData(st)}
                                onToggle={()=>{}} onSelect={()=>handleItemSelect(st._id,st.title,"subtopic",[module._id,t._id,st._id],st.pedagogy)}/>
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

const resourcesToDisplay = (() => {
  // If "folder" filter is selected, show only folders
  if (selectedResourceType === "folder") {
    return getFolders()
  }
  // If "all" filter is selected, show files + folders
  if (selectedResourceType === "all") {
    return [...getAllResources(), ...getFolders()]
  }
  // For specific file types (pdf, ppt, video, zip, link, reference, page)
  // Show ONLY files, no folders
  return getResourcesByType(selectedResourceType)
})()
  const SidebarHeader=()=>(
    <>
      <div style={{background:'linear-gradient(145deg,#F27757,#E0623F)',padding:'14px 14px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:'rgba(255,255,255,.65)'}}>Course</p>
            <h2 style={{margin:0,fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.2}}>{courseData?.courseName||"Course"}</h2>
            <span style={{display:'inline-flex',alignItems:'center',gap:3,marginTop:4,padding:'1px 6px',borderRadius:14,fontSize:8,fontWeight:500,color:'rgba(255,255,255,.85)',background:'rgba(255,255,255,.14)',border:'1px solid rgba(255,255,255,.18)'}}>
              <Layers size={8}/>{courseData?.modules?.length||0} modules
            </span>
          </div>
        </div>
      </div>
      <div style={{padding:'8px 10px',borderBottom:`1px solid ${T.border}`,flexShrink:0,background:T.bg}}>
        <div style={{position:'relative'}}>
          <Search size={11} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:T.inkFaint}}/>
          <input className="sb-input" type="text" placeholder="Search topics…" value={sidebarSearch} onChange={e=>setSidebarSearch(e.target.value)}
            style={{width:'100%',paddingLeft:28,paddingRight:sidebarSearch?28:10,paddingTop:6,paddingBottom:6,fontSize:11,fontFamily:"'DM Sans',sans-serif",background:T.surface,border:`1px solid ${T.line}`,borderRadius:8,color:T.ink}}/>
          {sidebarSearch&&<button onClick={()=>setSidebarSearch('')} style={{position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',border:'none',background:'none',cursor:'pointer',color:T.inkFaint}}><X size={9}/></button>}
        </div>
      </div>
    </>
  )

  if(error)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.pageBg,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <div style={{textAlign:'center',padding:32,borderRadius:20,background:T.bg,border:`1.5px solid ${T.border}`,maxWidth:340,boxShadow:'0 4px 20px rgba(0,0,0,0.06)'}}>
        <div style={{width:44,height:44,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',background:'rgba(239,68,68,0.08)'}}><File size={20} style={{color:'#ef4444'}}/></div>
        <p style={{fontWeight:700,marginBottom:8,color:T.textMain,fontSize:14}}>Error Loading Course</p>
        <p style={{color:T.textMuted,fontSize:12,marginBottom:20}}>{error}</p>
        <button onClick={()=>window.location.reload()} style={{padding:'8px 20px',borderRadius:10,background:T.orange,color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>Try Again</button>
      </div>
    </div>
  )
  if(isLoading)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:T.pageBg}}>
      <Loader2 size={36} style={{color:T.orange,animation:'spin 1s linear infinite'}}/>
    </div>
  )

  const EmptyCard=({icon:Icon,title,sub}:{icon:React.ComponentType<any>;title:string;sub:string})=>(
    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',padding:32,borderRadius:20,background:T.bg,border:`1.5px solid ${T.border}`,maxWidth:300}}>
        <div style={{width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',background:T.orangeTint}}><Icon size={18} style={{color:T.orange}}/></div>
        <p style={{fontWeight:700,fontSize:13,color:T.textMain,margin:'0 0 4px'}}>{title}</p>
        <p style={{fontSize:12,color:T.textMuted,margin:0}}>{sub}</p>
      </div>
    </div>
  )

  // ── Prepare page content: stamp active tabs + inject Try it Yourself ────────
  const preparePageContent = (page: PedagogyPage): string => {
    if (!page._combinedCode) return ''
    // Get all pages data to find blocks for this page
    // We look for pages from activity data
    const pagesInActivity = getPagesForActivity()
    // Find matching page's pedagogy page object that has blocks
    // The blocks data is on the raw page stored in the pedagogy
    // We can pass [page] as a simple wrapper with _id matching
    const stamped = stampActiveTabOnPlaygrounds(page._combinedCode, [page as any])
    return injectTryItButtons(stamped)
  }

  return(
    <div style={{background:T.pageBg,fontFamily:"'Plus Jakarta Sans',-apple-system,sans-serif",overflow:'clip',height:'100vh',display:'flex',flexDirection:'column'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500&display=swap');
        *{font-family:'Plus Jakarta Sans',-apple-system,sans-serif!important;box-sizing:border-box}
        .sb-row{transition:background .12s ease,border-left-color .12s ease;cursor:pointer}
        .sb-row:hover{background:rgba(0,0,0,.02)!important}
        .sb-scroll{scrollbar-width:thin;scrollbar-color:#E4E0ED transparent}
        .sb-scroll::-webkit-scrollbar{width:3px}
        .sb-scroll::-webkit-scrollbar-thumb{background:#E4E0ED;border-radius:3px}
        .sb-input:focus{border-color:#F27757!important;box-shadow:0 0 0 2px rgba(242,119,87,.10)!important;outline:none}
        @keyframes sbSlide{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sbPulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .sb-sidebar-inner{transition:opacity .25s cubic-bezier(.4,0,.2,1)}
        .sb-sidebar-inner.collapsed{opacity:0;pointer-events:none}
        .exercises-portal-host{overflow:visible!important;contain:none!important}
        .exercises-portal-host > div{overflow:visible!important;contain:none!important}
      `}</style>

      {sidebarOpen&&(
        <div onClick={()=>setSidebarOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:40}}
          className="lg:hidden"/>
      )}

      <div style={{position:'fixed',inset:'0 auto 0 0',width:280,zIndex:50,transform:sidebarOpen?'none':'translateX(-100%)',transition:'transform .3s cubic-bezier(.4,0,.2,1)',background:T.bg,borderRight:`1.5px solid ${T.border}`,boxShadow:'4px 0 24px rgba(0,0,0,0.10)',display:'flex',flexDirection:'column'}} className="lg:hidden">
        <SidebarHeader/>
        <button onClick={()=>setSidebarOpen(false)} style={{position:'absolute',right:10,top:10,padding:5,borderRadius:8,background:'rgba(255,255,255,.16)',border:'1px solid rgba(255,255,255,.22)',color:'#fff',cursor:'pointer',zIndex:1}}><X size={13}/></button>
        <div className="sb-scroll" style={{flex:1,overflowY:'auto',background:T.bg}}>{renderHierarchy()}</div>
      </div>

      <div style={{display:'flex',flex:1,overflow:'clip'}}>
        {/* Desktop sidebar */}
        <div className="hidden lg:flex" style={{flexDirection:'column',position:'relative',flexShrink:0,width:sidebarOpen?280:0,minWidth:0,transition:'width .3s cubic-bezier(.4,0,.2,1)',overflow:'hidden',background:T.bg,borderRight:`1.5px solid ${T.border}`}}>
          <div className={`sb-sidebar-inner${sidebarOpen?'':' collapsed'}`} style={{width:280,height:'100%',display:'flex',flexDirection:'column',position:'relative'}}>
            <button onClick={()=>setSidebarOpen(false)}
              style={{position:'absolute',right:-12,top:'50%',transform:'translateY(-50%)',zIndex:20,width:24,height:48,borderRadius:'0 8px 8px 0',display:'flex',alignItems:'center',justifyContent:'center',background:T.bg,border:`1.5px solid ${T.border}`,borderLeft:'none',boxShadow:'3px 0 10px rgba(0,0,0,0.08)',cursor:'pointer',color:T.textMuted,transition:'all .2s'}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.orangeTint}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.bg}>
              <ChevronLeft size={13}/>
            </button>
            <SidebarHeader/>
            <div className="sb-scroll" style={{flex:1,overflowY:'auto',background:T.bg}}>{renderHierarchy()}</div>
          </div>
        </div>

        {!sidebarOpen&&(
          <button onClick={()=>setSidebarOpen(true)} className="hidden lg:flex"
            style={{flexShrink:0,alignSelf:'center',width:16,height:56,borderRadius:'0 8px 8px 0',alignItems:'center',justifyContent:'center',background:T.bg,border:`1.5px solid ${T.border}`,borderLeft:'none',boxShadow:'3px 0 8px rgba(0,0,0,0.07)',cursor:'pointer',color:T.textMuted,transition:'all .2s'}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.orangeTint}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.bg}>
            <ChevronRightIcon size={11}/>
          </button>
        )}

        {/* Main content */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'clip',minHeight:0,background:T.pageBg}}>
          <TopBar items={buildBreadcrumbs()} onAIClick={()=>setShowAIChat(v=>!v)} onSummaryClick={()=>setShowSummary(v=>!v)} onMenuClick={()=>setSidebarOpen(v=>!v)}/>

          <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'clip',minHeight:0,padding:16,gap:12}}>

            {!selectedItem?(
              <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{textAlign:'center',maxWidth:480,animation:'fadeIn .4s ease both'}}>
                  <div style={{width:64,height:64,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',background:`linear-gradient(135deg,${T.orange},${T.orangeDark})`,boxShadow:`0 8px 24px ${T.orangeGlow}`}}>
                    <BookOpen size={28} style={{color:'#fff'}}/>
                  </div>
                  <h2 style={{fontWeight:800,fontSize:22,color:T.textMain,margin:'0 0 12px'}}>Welcome to <span style={{color:T.orange}}>{courseData?.courseName}</span></h2>
                  <p style={{fontSize:13,color:T.textMuted,lineHeight:1.7,margin:'0 0 28px'}}>{courseData?.courseDescription||'Select a topic from the sidebar to begin.'}</p>
                  <div style={{display:'flex',justifyContent:'center',gap:12}}>
                    {[{v:courseData?.modules?.length||0,l:"Modules"},{v:courseData?.modules?.reduce((a,m)=>a+(m.topics?.length||0)+(m.subModules?.reduce((s,sm)=>s+(sm.topics?.length||0),0)||0),0)||0,l:"Topics"},{v:"Self-paced",l:"Learning"}].map((s,i)=>(
                      <div key={i} style={{padding:'12px 16px',borderRadius:16,textAlign:'center',background:T.bg,border:`1.5px solid ${T.border}`,minWidth:88,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                        <div style={{fontWeight:800,fontSize:18,color:T.orange,marginBottom:2}}>{s.v}</div>
                        <div style={{fontWeight:600,fontSize:9,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'clip',minHeight:0,gap:12}}>

                {/* I Do / We Do / You Do tabs */}
                {learningElements().length>0&&(
                  <TabBar
                    selectedNode={!!selectedItem}
                    activeTab={activeTab}
                    activeSubcategory={activeSubcategory}
                    subcategories={subcategories}
                    onTabChange={handleTabChange}
                    onSubcategoryChange={handleSubcategoryChange}
                  />
                )}

                {/* Folder nav */}
                {currentFolder&&(
                  <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderRadius:12,background:T.bg,border:`1.5px solid ${T.border}`}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <button onClick={handleFolderBack} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:8,background:T.pageBg,border:`1px solid ${T.border}`,fontSize:'11px',fontWeight:600,color:T.textMuted,cursor:'pointer'}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.orangeTint}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.pageBg}>
                        <ChevronLeft size={12}/>Back
                      </button>
                      <div style={{width:1,height:16,background:T.border}}/>
                      <Folder size={14} style={{color:T.textMuted}}/>
                      <span style={{fontSize:'12.5px',fontWeight:600,color:T.textMain}}>{currentFolder.title}</span>
                    </div>
                    <span style={{fontSize:'11px',color:T.textMuted}}>{getFilteredFolderContents().length} items</span>
                  </div>
                )}

                {/* Activity content */}
                {selectedMethod&&selectedActivity&&!currentFolder&&(
                  <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'clip',minHeight:0}}>
                    {(()=>{
                      const exs=getExercisesForActivity()

                      if(exs.length>0&&selectedExercise){
                        return(
                          <div style={{height:'100%',display:'flex',flexDirection:'column',borderRadius:16,overflow:'clip',background:T.bg,border:`1.5px solid ${T.border}`}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',flexShrink:0,borderBottom:`1px solid ${T.border}`,background:T.surface}}>
                              <button onClick={()=>setSelectedExercise(null)} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:8,background:T.bg,border:`1px solid ${T.border}`,fontSize:'11px',fontWeight:600,color:T.textMuted,cursor:'pointer'}}><ChevronLeft size={12}/>Back</button>
                              <Code size={14} style={{color:T.orange}}/>
                              <span style={{fontWeight:600,fontSize:'12.5px',color:T.textMain}}>{selectedExercise.exerciseInformation.exerciseName}</span>
                            </div>
                            <div style={{flex:1,overflow:'clip'}}>
                              {selectedExercise?.programmingSettings?.selectedModule==='Core Programming'&&<CodeEditor exercise={selectedExercise} theme={resolvedTheme as "light"|"dark"} breadcrumbCollapsed={false} onBreadcrumbCollapseToggle={()=>{}} courseId={courseId} nodeId={selectedItem?.id||""} nodeName={selectedItem?.title||""} nodeType={selectedItem?.type||""} subcategory={selectedActivity} category={selectedMethod==='i-do'?"I_Do":selectedMethod==='we-do'?"We_Do":"You_Do"} onBack={()=>setSelectedExercise(null)} onCloseExercise={()=>setSelectedExercise(null)}/>}
                              {selectedExercise?.programmingSettings?.selectedModule==='Database'&&<DBQueryEditor exercise={selectedExercise} theme={resolvedTheme as "light"|"dark"} courseId={courseId} nodeId={selectedItem?.id||""} nodeName={selectedItem?.title||""} nodeType={selectedItem?.type||""} subcategory={selectedActivity} category={selectedMethod==='i-do'?"I_Do":selectedMethod==='we-do'?"We_Do":"You_Do"} onBack={()=>setSelectedExercise(null)} onCloseExercise={()=>setSelectedExercise(null)}/>}
                            </div>
                          </div>
                        )
                      }

                      if(exs.length>0){
                        return(
                          <div className="exercises-portal-host" style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',overflow:'visible'}}>
                            <Exercises
                              courseId={courseId}
                              exercises={exs}
                              onExerciseSelect={handleExerciseSelect}
                              method={selectedMethod}
                              category={selectedMethod==='i-do'?'I_Do':selectedMethod==='you-do'?'You_Do':'We_Do'}
                              subcategory={selectedActivity||''}
                              topic={selectedItem?.title||''}
                              module={currentHierarchy.length>0?currentHierarchy[0]:selectedItem?.title||''}
                              nodeType={selectedItem?.type||''}
                              hierarchy={currentHierarchy}
                              selectedItem={selectedItem}
                              currentHierarchy={currentHierarchy}
                              studentAnswers={getStudentAnswers()}
                            />
                          </div>
                        )
                      }

                      const avail=getAvailableResourceTypes()
                      if(avail.length===0)return(
                        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:16,background:T.bg,border:`1.5px solid ${T.border}`}}>
                          <div style={{textAlign:'center',padding:32}}><div style={{width:44,height:44,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',background:T.pageBg}}><File size={20} style={{color:T.textMuted}}/></div><p style={{fontWeight:600,fontSize:13,color:T.textMain,margin:'0 0 4px'}}>No resources yet</p><p style={{fontSize:12,color:T.textMuted,margin:0}}>This activity has no content yet.</p></div>
                        </div>
                      )

                      return(
                        <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'clip',minHeight:0,gap:10}}>
                          {/* Resource type tabs */}
                      {/* Resource type tabs - Add "Folder" as a separate filter */}
{/* Resource type tabs */}
<div style={{flexShrink:0,display:'flex',alignItems:'center',gap:3,padding:4,borderRadius:12,background:T.bg,border:`1.5px solid ${T.border}`,overflowX:'auto'}} className="sb-scroll">
  {(["page","folder","pdf","ppt","video","zip","link","reference"] as ResourceType[]).map(type=>{
    // Check if this type has content
    let hasContent = false
    let count = 0
    
    if (type === "folder") {
      count = getFolders().length
      hasContent = count > 0
    } else if (type === "page") {
      count = getPagesForActivity().length
      hasContent = count > 0
    } else {
      count = getResourcesByType(type).length
      hasContent = count > 0
    }
    
    if (!hasContent) return null
    
    const isSel = selectedResourceType === type || (!userSelectedResourceType && type === avail[0])
  // Combined col variable that handles folder, reference, and all other types
const col = type === "folder" 
  ? T.orange 
  : type === "reference" 
    ? "#3b82f6" 
    : (RES_COLOR[type] || T.textMuted)
    return(
      <button key={type} onClick={()=>{setSelectedResourceType(type);setUserSelectedResourceType(true)}}
        style={{display:'flex',alignItems:'center',gap:5,padding:'6px 11px',borderRadius:9,fontSize:'11.5px',fontWeight:600,cursor:'pointer',border:'none',transition:'all .15s',flexShrink:0,background:isSel?`linear-gradient(135deg,${col},${col}cc)`:'transparent',color:isSel?'#fff':T.textSub,boxShadow:isSel?`0 2px 8px ${col}40`:'none'}}
        onMouseEnter={e=>{if(!isSel)(e.currentTarget as HTMLElement).style.background=T.pageBg}}
        onMouseLeave={e=>{if(!isSel)(e.currentTarget as HTMLElement).style.background='transparent'}}>
        {type === "folder" ? <Folder size={12}/> : <ResIcon type={type} size={12}/>}
        {type === "folder" ? "Folders" : RES_LABEL[type]}
        <span style={{padding:'0 4px',borderRadius:5,fontSize:'10px',fontWeight:700,background:isSel?'rgba(255,255,255,.22)':T.pageBg,color:isSel?'#fff':T.textMuted}}>{count}</span>
      </button>
    )
  })}
  
  {/* All button - shows both files and folders */}
  <button onClick={()=>{setSelectedResourceType("all");setUserSelectedResourceType(true)}}
    style={{display:'flex',alignItems:'center',gap:5,padding:'6px 11px',borderRadius:9,fontSize:'11.5px',fontWeight:600,cursor:'pointer',border:'none',transition:'all .15s',flexShrink:0,background:selectedResourceType==="all"?`linear-gradient(135deg,${T.textSub},${T.textMuted})`:'transparent',color:selectedResourceType==="all"?'#fff':T.textSub}}
    onMouseEnter={e=>{if(selectedResourceType!=="all")(e.currentTarget as HTMLElement).style.background=T.pageBg}}
    onMouseLeave={e=>{if(selectedResourceType!=="all")(e.currentTarget as HTMLElement).style.background='transparent'}}>
    <File size={12}/>All
    <span style={{padding:'0 4px',borderRadius:5,fontSize:'10px',fontWeight:700,background:selectedResourceType==="all"?'rgba(255,255,255,.22)':T.pageBg,color:selectedResourceType==="all"?'#fff':T.textMuted}}>
      {getAllResources().length + getFolders().length}
    </span>
  </button>
</div>
                          {/* Resource list / Page viewer */}
                          <div style={{flex:1,overflow:'hidden',borderRadius:16,background:T.bg,border:`1.5px solid ${T.border}`,display:'flex',flexDirection:'column'}}>
                            {selectedResourceType === "page" ? (() => {
                              const pages = getResourcesByType("page")
                              if (!pages.length) return null
                              const page = pages[inlinePageIndex]
                              // ── Prepare page content with Try it Yourself injected ──
                              const processedContent = preparePageContent(page)
                              return (
                                <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',borderBottom:`1px solid ${T.line}`,background:T.surface,flexShrink:0}}>
                                    <button disabled={inlinePageIndex===0}
                                      onClick={()=>setInlinePageIndex(i=>i-1)}
                                      style={{display:'flex',alignItems:'center',gap:4,padding:'4px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:inlinePageIndex===0?T.surface:T.bg,color:inlinePageIndex===0?T.textHint:T.textMain,cursor:inlinePageIndex===0?'not-allowed':'pointer',fontSize:'12px',fontWeight:600}}>
                                      <ChevronLeft size={13}/>Prev
                                    </button>
                                    <span style={{fontSize:'12px',fontWeight:600,color:T.textSub}}>
                                      {page.title}&nbsp;·&nbsp;{inlinePageIndex+1} / {pages.length}
                                    </span>
                                    <button disabled={inlinePageIndex===pages.length-1}
                                      onClick={()=>setInlinePageIndex(i=>i+1)}
                                      style={{display:'flex',alignItems:'center',gap:4,padding:'4px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:inlinePageIndex===pages.length-1?T.surface:T.bg,color:inlinePageIndex===pages.length-1?T.textHint:T.textMain,cursor:inlinePageIndex===pages.length-1?'not-allowed':'pointer',fontSize:'12px',fontWeight:600}}>
                                      Next<ChevronRightIcon size={13}/>
                                    </button>
                                  </div>
                                  {/* ── KEY: use processedContent with injected Try it Yourself ── */}
                                  <iframe
                                    key={page.id}
                                    srcDoc={processedContent}
                                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                                    style={{flex:1,border:'none',width:'100%',background:'#fff'}}
                                    title={page.title}
                                  />
                                </div>
                              )
                            })() : (
                              resourcesToDisplay.length>0?(
                                <div style={{flex:1,overflowY:'auto'}} className="sb-scroll">
                                  <SortHeader onSort={f=>setSortConfig(p=>({field:f,direction:p.field===f&&p.direction==="asc"?"desc":"asc"}))} cfg={sortConfig}/>
                                  {sortResources(resourcesToDisplay).map((r,i)=><ResourceItem key={r.id} resource={r} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick}/>)}
                                </div>
                              ):(
                                <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:32}}>
                                  <div style={{textAlign:'center'}}><div style={{width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',background:T.pageBg}}><File size={18} style={{color:T.textMuted}}/></div><p style={{fontWeight:600,fontSize:'12.5px',color:T.textMain,margin:'0 0 4px'}}>No matching resources</p><p style={{fontSize:'11.5px',color:T.textMuted,margin:0}}>Try a different filter</p></div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Folder contents */}
                {currentFolder&&(
                  <div style={{flex:1,overflow:'hidden',borderRadius:16,background:T.bg,border:`1.5px solid ${T.border}`,display:'flex',flexDirection:'column'}}>
                    {getFilteredFolderContents().length>0?(
                      <div style={{flex:1,overflowY:'auto'}} className="sb-scroll">
                        <SortHeader onSort={f=>setSortConfig(p=>({field:f,direction:p.field===f&&p.direction==="asc"?"desc":"asc"}))} cfg={sortConfig}/>
                        {sortResources(getFilteredFolderContents()).map((r,i)=><ResourceItem key={r.id} resource={r} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick}/>)}
                      </div>
                    ):(
                      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:32,textAlign:'center'}}><div><Folder size={20} style={{color:T.textMuted,margin:'0 auto 10px',display:'block'}}/><p style={{fontWeight:600,fontSize:'12.5px',color:T.textMain,margin:'0 0 4px'}}>Folder is empty</p><p style={{fontSize:'11.5px',color:T.textMuted,margin:0}}>No files here yet</p></div></div>
                    )}
                  </div>
                )}

                {/* Placeholders */}
                {selectedMethod&&!selectedActivity&&!currentFolder&&learningElements().length>0&&<EmptyCard icon={Target} title="Select an Activity" sub="Pick one of the activity pills above to view resources"/>}
                {!selectedMethod&&!selectedActivity&&!currentFolder&&learningElements().length>0&&<EmptyCard icon={Target} title="Choose a Learning Method" sub="Click I Do, We Do, or You Do to get started"/>}
                {learningElements().length===0&&selectedItem&&!currentFolder&&<EmptyCard icon={File} title="No Learning Methods" sub="This topic hasn't been configured yet."/>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panels & Viewers */}
      {showNotesPanel&&<NotesPanel isOpen={showNotesPanel} onClose={()=>setShowNotesPanel(false)} isDraggable={true} defaultPosition={{x:window.innerWidth-400,y:100}}/>}
      <AIPanel isOpen={showAIPanel} onClose={()=>setShowAIPanel(false)} fileUrl={activeViewer.resource?.fileUrl||""} title={activeViewer.resource?.title||selectedItem?.title||""} fileType={activeViewer.type==='video'?'video':activeViewer.type==='ppt'?'ppt':'pdf'} courseContext={!activeViewer.resource&&selectedItem?{topicTitle:selectedItem.title,isDocumentView:false}:undefined}/>
      {activeViewer.type==="zip"&&activeViewer.resource&&<ZipViewer fileUrl={getFileUrl(activeViewer.resource.fileUrl||"")} fileName={activeViewer.resource.title} onClose={closeAllViewers} isOpen={true}/>}
{activeViewer.type==="video"&&activeViewer.resource&&(
  <VideoPlayer 
    isOpen={true} 
    onClose={closeAllViewers} 
    videoUrl={getFileUrlString(activeViewer.resource.fileUrl)} 
    title={activeViewer.resource.title} 
    onNotesClick={()=>setShowNotesPanel(true)} 
    onNotesStateChange={v=>setShowNotesPanel(v)} 
    showNotesPanel={showNotesPanel} 
    hierarchy={currentHierarchy} 
    currentItemTitle={selectedItem?.title} 
    mcqQuestions={activeViewer.resource.mcqQuestions||[]}
    // Add resolution props
    availableResolutions={activeViewer.resource.availableResolutions || []}
    fileUrlMap={activeViewer.resource.fileUrlMap || {}}
    // Add AI feature flags from courseData
    aiChatEnabled={courseData?.resourcesType?.iDo?.video?.aiChat || false}
    aiSummaryEnabled={courseData?.resourcesType?.iDo?.video?.aiSummary || false}
    // Add notes feature flag from courseData
    notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled || false}
    onResolutionChange={(resolution, url) => {
      console.log(`Resolution changed to ${resolution}: ${url}`);
      if (activeViewer.resource) {
        setActiveViewer({
          ...activeViewer,
          resource: {
            ...activeViewer.resource,
            fileUrl: url,
            currentResolution: resolution
          }
        });
      }
    }}
  />
)}

     {activeViewer.type==="ppt"&&activeViewer.resource&&<PPTViewer isOpen={true} onClose={closeAllViewers} pptUrl={getFileUrlString(activeViewer.resource.fileUrl)} title={activeViewer.resource.title} onNotesClick={()=>setShowNotesPanel(true)} onNotesStateChange={v=>setShowNotesPanel(v)} showNotesPanel={showNotesPanel} hierarchy={currentHierarchy} currentItemTitle={selectedItem?.title}/>}
{activeViewer.type==="pdf"&&activeViewer.resource&&(
  <PDFViewer 
    fileUrl={getFileUrlString(activeViewer.resource.fileUrl)} 
    fileName={activeViewer.resource.title||"document.pdf"} 
    onClose={closeAllViewers} 
    initialMcqs={activeViewer.resource.mcqQuestions||[]} 
    entityType="course" 
    entityId={courseId} 
    tabType="pdf" 
    subcategory={selectedActivity} 
    folderPath={currentHierarchy}
    // Add AI feature flags from courseData for PDF
    aiChatEnabled={courseData?.resourcesType?.iDo?.pdf?.aiChat || false}
    aiSummaryEnabled={courseData?.resourcesType?.iDo?.pdf?.aiSummary || false}
    // Add notes feature flag from courseData for PDF
    notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled || false}
    // Add hierarchy and title for context
    hierarchy={currentHierarchy}
    currentItemTitle={selectedItem?.title}
    onNotesClick={()=>setShowNotesPanel(true)}
    onNotesStateChange={v=>setShowNotesPanel(v)}
    showNotesPanel={showNotesPanel}
  />
)}      <AIChat isOpen={showAIChat} onClose={()=>setShowAIChat(false)} context={{topicTitle:selectedItem?.title,fileName:activeViewer.resource?.title,fileType:activeViewer.type,isDocumentView:!!activeViewer.resource}}/>
      <SummaryChat isOpen={showSummary} onClose={()=>setShowSummary(false)} context={{topicTitle:selectedItem?.title,fileName:activeViewer.resource?.title,fileType:activeViewer.type,isDocumentView:!!activeViewer.resource,hierarchy:currentHierarchy}}/>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light"/>
    </div>
  )
}