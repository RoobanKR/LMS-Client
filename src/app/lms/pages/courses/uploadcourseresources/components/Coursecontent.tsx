"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Target, Users, BookOpen, FileText,
  Eye, Download, RefreshCw, Trash2, MoreVertical, ExternalLink,
  Search, X, Plus, Folder, Link, Bookmark, Video, FileArchive,
  File, MonitorPlay, Edit2, Layout, ChevronRight, Home, ChevronDown,
  ArrowLeft, Maximize2, Minimize2, Code2,
} from "lucide-react";
import type {
  CourseNode, FolderItem, UploadedFile, ContentData, FileTypeConfig,
  BreadcrumbItem, FolderNavState,
} from "./Types";
import { isFolderItem } from "./Types";
import ProblemSolving from "../../../../component/ProblemSolving";
import TestYourSkills from "./youdo/TestYourSkills";
import Assessment from "./youdo/Assessment";
import SelfWork from "./youdo/SelfWork";
import { PageCreationModal, type PageBlock, type PagesPayload, type HierarchyInfo } from "./Pagecreationmodal";
import { entityApi } from "@/apiServices/coursesData";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  orange: "#F27757",
  orangeDark: "#E0623F",
  orangeDeep: "#C95530",
  orangeGlow: "rgba(242,119,87,0.22)",
  orangeLight: "rgba(242,119,87,0.08)",
  orangeMid: "rgba(242,119,87,0.15)",
  textMain: "#1a1a2e",
  textSub: "#6b6b7e",
  textMuted: "#8b8b9e",
  textHint: "#bcbccc",
  border: "#ece9f1",
  bg: "#ffffff",
  pageBg: "#faf9fc",
  warm: "#fff8f6",
};

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

// ─── Types ────────────────────────────────────────────────────────────────────
interface PageEntry {
  _id: string; title: string; combinedCode: string;
  pageCount?: number; createdAt?: string; isMultiPage?: boolean;
}

interface ViewingPage { code: string; title: string; pageCount?: number }

interface CourseContentProps {
  selectedNode: CourseNode | null;
  activeTab: "I_Do" | "We_Do" | "You_Do" | null;
  activeSubcategory: string;
  subcategories: {
    I_Do: Array<{ key: string; label: string; icon: React.ReactNode; component: string | null }>;
    We_Do: Array<{ key: string; label: string; icon: React.ReactNode; component: string | null }>;
    You_Do: Array<{ key: string; label: string; icon: React.ReactNode; component: string | null }>;
  };
  contentData: Record<string, ContentData>;
  breadcrumbs: BreadcrumbItem[];
  fileTypes: FileTypeConfig[];
  currentFolderContents: { folders: FolderItem[]; files: UploadedFile[] };
  folderNavState: FolderNavState;
  courseId: string;
  courseStructureName: string;
  configuredLanguages?: { coreProgram?: string[]; frontend?: string[]; database?: string[] };
  pedagogy?: Record<string, any>;
  onTabChange: (tab: "I_Do" | "We_Do" | "You_Do") => void;
  onSubcategoryChange: (sub: string, component: string | null) => void;
  onResourceModalOpen: () => void;
  onFileClick: (file: UploadedFile, tab: "I_Do" | "We_Do" | "You_Do" | null, sub: string) => void;
  onNavigateToFolder: (id: string, name: string) => void;
  onNavigateUp: () => void;
  onNavigateToRoot?: () => void;
  onNavigateToFolderLevel?: (folderName: string, index: number) => void;
  onEditFolder: (folder: FolderItem) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  onDeleteFile: (fileId: string, name: string) => void;
  onDeletePage?: (pageId: string, name: string) => void;
  onUpdateFile: (file: UploadedFile, tab: "I_Do" | "We_Do" | "You_Do", sub: string) => void;
  getParentNodeName: (node: CourseNode, type: string) => string;
  getFolderItemCount: (folderId: string) => number;
  onPageCreated?: () => Promise<void>;
  onBulkDelete: (items: Array<{ type: "file" | "folder" | "page"; id: string; name: string; folderItem?: FolderItem }>) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function openPageInNewTab(code: string) {
  const t = window.open("", "_blank");
  if (!t) { alert("Popup blocked."); return; }
  t.document.open(); t.document.write(code); t.document.close();
}

const normKey = (r: string) => r.toLowerCase().replace(/\s+/g, "_");
const fmtSize = (b: number) => {
  if (!b) return "—";
  const k = 1024, s = ["B", "KB", "MB", "GB"], i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(1))} ${s[i]}`;
};

const getFileMeta = (type: string, name?: string, isRef?: boolean) => {
  const lt = (type || "").toLowerCase(), ext = (name || "").split(".").pop()?.toLowerCase();
  if (lt === "page") return { icon: <Layout size={13} />, color: "#6366f1", bg: "rgba(99,102,241,0.10)" };
  if (lt.includes("url") || lt.includes("link")) return { icon: <Link size={13} />, color: "#10b981", bg: "rgba(16,185,129,0.10)" };
  if (isRef === true || String(isRef) === "true") return { icon: <Bookmark size={13} />, color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" };
  if (lt.includes("pdf") || ext === "pdf") return { icon: <FileText size={13} />, color: "#ef4444", bg: "rgba(239,68,68,0.10)" };
  if (lt.includes("ppt") || ["ppt", "pptx","ptx"].includes(ext || "")) return { icon: <MonitorPlay size={13} />, color: "#f97316", bg: "rgba(249,115,22,0.10)" };
  if (lt.includes("video") || ["mp4", "avi", "mov", "mkv", "webm"].includes(ext || "")) return { icon: <Video size={13} />, color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" };
  if (lt.includes("zip") || ["zip", "rar", "7z", "tar", "gz"].includes(ext || "")) return { icon: <FileArchive size={13} />, color: "#f59e0b", bg: "rgba(245,158,11,0.10)" };
  return { icon: <File size={13} />, color: T.textMuted, bg: T.pageBg };
};

// ─── Try it Yourself injector ──────────────────────────────────────────────────
function injectTryItButtonsLocal(html: string): string {
  if (!html || !html.includes('playground-wrapper')) return html

  const injectedScript = `
<script>
(function() {
  function buildEditorPage(htmlCode, cssCode, jsCode, activeTab) {
    var safeHtml = htmlCode.replace(/\\\\/g,'\\\\\\\\').replace(/\`/g,'\\\\' + '\`').replace(/\\$/g,'\\\\$')
    var safeCss  = cssCode.replace(/\\\\/g,'\\\\\\\\').replace(/\`/g,'\\\\' + '\`').replace(/\\$/g,'\\\\$')
    var safeJs   = jsCode.replace(/\\\\/g,'\\\\\\\\').replace(/\`/g,'\\\\' + '\`').replace(/\\$/g,'\\\\$')

    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Try it Yourself</title><style>' +
      '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}' +
      'html,body{height:100%;font-family:Consolas,"Fira Code","Courier New",monospace;background:#1e1e1e;color:#d4d4d4;overflow:hidden}' +
      '.topbar{display:flex;align-items:center;gap:12px;padding:0 16px;background:#252526;border-bottom:2px solid #1a1a1a;height:52px;flex-shrink:0}' +
      '.topbar-left{display:flex;align-items:center;gap:8px;flex:1}' +
      '.topbar-icon{width:28px;height:28px;border-radius:6px;background:#4CAF82;display:flex;align-items:center;justify-content:center}' +
      '.topbar-title{font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#fff}' +
      '.run-btn{display:flex;align-items:center;gap:8px;padding:8px 22px;background:#4CAF82;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;transition:background .15s;flex-shrink:0}' +
      '.run-btn:hover{background:#3d9e6e}' +
      '.size-label{font-family:Arial,sans-serif;font-size:12px;color:#858585;flex-shrink:0}' +
      '.main{display:flex;height:calc(100vh - 52px)}' +
      '.editor-side{width:50%;display:flex;flex-direction:column;border-right:3px solid #1a1a1a;background:#1e1e1e}' +
      '.tabs{display:flex;background:#252526;border-bottom:1px solid #1a1a1a;padding:0 8px}' +
      '.tab{padding:10px 18px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;cursor:pointer;border:none;background:transparent;color:#858585;border-bottom:2px solid transparent;transition:all .15s}' +
      '.tab.active{color:#fff;border-bottom-color:#4CAF82;background:#1e1e1e}' +
      '.tab:hover:not(.active){color:#ccc}' +
      '.editor-area{flex:1;overflow:hidden;position:relative}' +
      'textarea{width:100%;height:100%;background:#1e1e1e;color:#d4d4d4;border:none;outline:none;padding:20px;font-family:Consolas,"Fira Code","Courier New",monospace;font-size:14px;line-height:1.75;resize:none;tab-size:2;position:absolute;top:0;left:0}' +
      '.preview-side{width:50%;display:flex;flex-direction:column;background:#fff}' +
      '.preview-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:#f3f3f3;border-bottom:1px solid #ddd;font-family:Arial,sans-serif;font-size:12px;color:#666;flex-shrink:0}' +
      'iframe#preview{flex:1;border:none;width:100%;background:#fff}' +
      '</style></head><body>' +
      '<div class="topbar">' +
        '<div class="topbar-left">' +
          '<div class="topbar-icon"><svg width="14" height="14" viewBox="0 0 16 16"><polygon points="2,1 14,8 2,15" fill="white"/></svg></div>' +
          '<span class="topbar-title">Try it Yourself</span>' +
        '</div>' +
        '<span class="size-label" id="size-lbl">Result Size: — </span>' +
        '<button class="run-btn" onclick="runCode()"><svg width="12" height="12" viewBox="0 0 16 16"><polygon points="2,1 14,8 2,15" fill="white"/></svg>Run &#9658;</button>' +
      '</div>' +
      '<div class="main">' +
        '<div class="editor-side">' +
          '<div class="tabs">' +
            '<button class="tab" id="tab-html" onclick="switchTab(\'html\')">HTML</button>' +
            '<button class="tab" id="tab-css" onclick="switchTab(\'css\')">CSS</button>' +
            '<button class="tab" id="tab-js" onclick="switchTab(\'js\')">JS</button>' +
          '</div>' +
          '<div class="editor-area">' +
            '<textarea id="ta-html" spellcheck="false"></textarea>' +
            '<textarea id="ta-css" spellcheck="false" style="display:none"></textarea>' +
            '<textarea id="ta-js" spellcheck="false" style="display:none"></textarea>' +
          '</div>' +
        '</div>' +
        '<div class="preview-side">' +
          '<div class="preview-bar"><span>Result</span><span id="size-lbl2"></span></div>' +
          '<iframe id="preview" sandbox="allow-scripts allow-same-origin"></iframe>' +
        '</div>' +
      '</div>' +
      '<script>' +
        'var DATA={html:' + JSON.stringify(htmlCode) + ',css:' + JSON.stringify(cssCode) + ',js:' + JSON.stringify(jsCode) + ',activeTab:' + JSON.stringify(activeTab) + '};' +
        'document.getElementById("ta-html").value=DATA.html||"";' +
        'document.getElementById("ta-css").value=DATA.css||"";' +
        'document.getElementById("ta-js").value=DATA.js||"";' +
        'function switchTab(n){' +
          '["html","css","js"].forEach(function(k){' +
            'document.getElementById("ta-"+k).style.display=k===n?"block":"none";' +
            'document.getElementById("tab-"+k).classList.toggle("active",k===n);' +
          '});' +
        '}' +
        'function buildDoc(){' +
          'var h=document.getElementById("ta-html").value;' +
          'var c=document.getElementById("ta-css").value;' +
          'var j=document.getElementById("ta-js").value;' +
          'if(c.trim()){if(h.indexOf("</head>")!==-1)h=h.replace("</head>","<style>"+c+"</style></head>");else h="<style>"+c+"</style>"+h;}' +
          'if(j.trim()){if(h.indexOf("</body>")!==-1)h=h.replace("</body>","<scr"+"ipt>"+j+"</scr"+"ipt></body>");else h+="<scr"+"ipt>"+j+"</scr"+"ipt>";}' +
          'return h;' +
        '}' +
        'function runCode(){' +
          'var frame=document.getElementById("preview");' +
          'frame.srcdoc=buildDoc();' +
          'frame.onload=function(){' +
            'try{var w=frame.contentWindow.innerWidth,h=frame.contentWindow.innerHeight;' +
            'var s="Result Size: "+w+" x "+h;' +
            'document.getElementById("size-lbl").textContent=s;' +
            'document.getElementById("size-lbl2").textContent=s;}catch(e){}' +
          '};' +
        '}' +
        'document.querySelectorAll("textarea").forEach(function(ta){' +
          'ta.addEventListener("keydown",function(e){' +
            'if(e.key==="Tab"){e.preventDefault();var s=ta.selectionStart;ta.value=ta.value.substring(0,s)+"  "+ta.value.substring(ta.selectionEnd);ta.selectionStart=ta.selectionEnd=s+2;}' +
          '});' +
        '});' +
        'switchTab(DATA.activeTab||"html");' +
        'window.onload=function(){runCode();};' +
      '<\\/script>' +
      '</body></html>'
  }

  function decodeSrcdocAttr(encoded) {
    return encoded
      .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
  }

  function extractParts(fullHtml) {
    var htmlCode = fullHtml
    var cssCode  = ''
    var jsCode   = ''

    var styleRe = /<style[^>]*>([\\s\\S]*?)<\\/style>/gi
    var sm
    while ((sm = styleRe.exec(fullHtml)) !== null) {
      cssCode += sm[1].trim() + '\\n'
    }

    var scriptRe = /<script[^>]*>([\\s\\S]*?)<\\/script>/gi
    var scm
    while ((scm = scriptRe.exec(fullHtml)) !== null) {
      var inner = scm[1].trim()
      if (inner) jsCode += inner + '\\n'
    }

    var cleanHtml = fullHtml
      .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '')
      .replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '')
      .trim()

    return { html: cleanHtml || fullHtml, css: cssCode.trim(), js: jsCode.trim() }
  }

  function buildCodeDisplay(code, lang) {
    var escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    var colored = escaped
    if (lang === 'css') {
      colored = escaped
        .replace(/(\\\/\\*[\\s\\S]*?\\*\\\/)/g,'<span style="color:#6a9955">$1</span>')
        .replace(/([.#]?[\\w][\\w-]*)(\\s*\\{)/g,'<span style="color:#d7ba7d">$1</span>$2')
        .replace(/([\\w-]+)(\\s*:)(\\s*)/g,'<span style="color:#9cdcfe">$1</span>$2$3')
        .replace(/(:[ \\s]*)([^;{}\\n<]+)/g, function(m,p1,p2){ return p1+'<span style="color:#ce9178">'+p2+'</span>' })
    } else if (lang === 'html') {
      colored = escaped
        .replace(/(&lt;!--[\\s\\S]*?--&gt;)/g,'<span style="color:#6a9955">$1</span>')
        .replace(/(&lt;\\/?)([\\w]+)/g,'$1<span style="color:#4ec9b0">$2</span>')
        .replace(/([\\w-]+)(=&quot;)/g,'<span style="color:#9cdcfe">$1</span>=&quot;')
        .replace(/=(&quot;[^&]*&quot;)/g,'=<span style="color:#ce9178">$1</span>')
    } else {
      colored = escaped
        .replace(/(\\\/\\/[^\\n]*)/g,'<span style="color:#6a9955">$1</span>')
        .replace(/\\b(var|let|const|function|return|if|else|for|while|new|typeof)\\b/g,'<span style="color:#c586c0">$1</span>')
        .replace(/(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g,'<span style="color:#ce9178">$1</span>')
    }
    return colored
  }

  function processPlaygrounds() {
    var wrappers = document.querySelectorAll('.playground-wrapper')
    wrappers.forEach(function(wrapper) {
      var iframe = wrapper.querySelector('iframe[srcdoc]')
      if (!iframe) return

      var rawSrcdoc = iframe.getAttribute('srcdoc') || ''
      var decoded   = decodeSrcdocAttr(rawSrcdoc)
      var parts     = extractParts(decoded)

      var _stampedTab = wrapper.getAttribute('data-active-tab') || ''
      var _primaryTab = wrapper.getAttribute('data-primary-tab') || 'auto'
      var activeTab = _stampedTab || (_primaryTab !== 'auto' ? _primaryTab : 'html')
      var activeCode = activeTab === 'css' ? parts.css : activeTab === 'js' ? parts.js : parts.html
      var displayLang = activeTab

      var displayCode = buildCodeDisplay(activeCode || parts.html, displayLang)
      var langLabel   = activeTab.toUpperCase()
      var langColor   = activeTab==='css'?'#264de4':activeTab==='js'?'#f7df1e':activeTab==='html'?'#e44d26':'#888'
      var langBg      = activeTab==='css'?'rgba(38,77,228,.12)':activeTab==='js'?'rgba(247,223,30,.15)':'rgba(228,77,38,.12)'

      var newHtml = '<div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;font-family:inherit;margin:0">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0">' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span style="width:10px;height:10px;border-radius:50%;background:#ff5f57;display:inline-block"></span>' +
            '<span style="width:10px;height:10px;border-radius:50%;background:#ffbd2e;display:inline-block"></span>' +
            '<span style="width:10px;height:10px;border-radius:50%;background:#28c840;display:inline-block"></span>' +
          '</div>' +
          '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:'+langBg+';color:'+langColor+'">'+langLabel+'</span>' +
        '</div>' +
        '<div style="background:#1e1e1e;overflow-x:auto;border-left:4px solid '+langColor+'">' +
          '<pre style="margin:0;padding:20px 24px;font-family:Consolas,Fira Code,Courier New,monospace;font-size:13.5px;line-height:1.8;color:#d4d4d4;white-space:pre-wrap;word-break:break-all">' +
            '<code>' + displayCode + '</code>' +
          '</pre>' +
        '</div>' +
        '<div style="padding:12px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between">' +
          '<span style="font-size:11px;color:#9ca3af">Interactive Playground</span>' +
          '<button class="try-it-btn" style="display:inline-flex;align-items:center;gap:7px;padding:9px 20px;background:#4CAF82;color:#fff;border:none;border-radius:7px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif;transition:background .15s;box-shadow:0 2px 8px rgba(76,175,130,.3)">' +
            '<svg width="11" height="11" viewBox="0 0 16 16"><polygon points="2,1 14,8 2,15" fill="white"/></svg>' +
            'Try it Yourself &raquo;' +
          '</button>' +
        '</div>' +
      '</div>'

      var div = document.createElement('div')
      div.style.cssText = 'margin:1.5rem 0;border-radius:12px;overflow:hidden;background:#f0f0f0;padding:20px;'
      div.innerHTML = newHtml
      wrapper.parentNode.replaceChild(div, wrapper)

      var btn = div.querySelector('.try-it-btn')
      if (btn) {
        btn.addEventListener('mouseenter', function() { btn.style.background='#3d9e6e' })
        btn.addEventListener('mouseleave', function() { btn.style.background='#4CAF82' })
        btn.addEventListener('click', function() {
          var editorPage = buildEditorPage(parts.html, parts.css, parts.js, activeTab)
          var t = window.open('', '_blank')
          if (!t) { alert('Popup blocked. Please allow popups for this site.'); return }
          t.document.open()
          t.document.write(editorPage)
          t.document.close()
        })
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processPlaygrounds)
  } else {
    processPlaygrounds()
  }
})();
<\/script>
`

  if (html.includes('</body>')) {
    return html.replace('</body>', injectedScript + '</body>')
  }
  return html + injectedScript
}

// ─── Inline Page Viewer ────────────────────────────────────────────────────────
const InlinePageViewer: React.FC<{
  page: ViewingPage;
  onBack: () => void;
  onNewTab: () => void;
}> = ({ page, onBack, onNewTab }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const hasCodeBlocks = page.code.includes("playground-wrapper") || page.code.includes("allow-scripts");

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: T.bg,
        position: isFullscreen ? "fixed" : "relative",
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : undefined,
      }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 gap-3"
        style={{
          borderBottom: `1px solid ${T.border}`,
          background: T.bg,
          borderLeft: `3px solid #6366f1`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{ background: T.pageBg, color: T.textSub, border: `1px solid ${T.border}` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.orange; (e.currentTarget as HTMLElement).style.color = T.orange; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.textSub; }}
          >
            <ArrowLeft size={12} strokeWidth={2.5} />
            Back
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.18)" }}
            >
              <Layout size={13} style={{ color: "#6366f1" }} />
            </div>
            <span className="text-[12.5px] font-bold truncate" style={{ color: T.textMain }}>
              {page.title}
            </span>
            {page.pageCount && page.pageCount > 1 && (
              <span
                className="flex-shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                style={{ background: "rgba(99,102,241,0.10)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.18)" }}
              >
                {page.pageCount} pages
              </span>
            )}
            {hasCodeBlocks && (
              <span
                className="flex-shrink-0 flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                style={{ background: "rgba(16,185,129,0.10)", color: "#059669", border: "1px solid rgba(16,185,129,0.20)" }}
              >
                <Code2 size={8} />
                Interactive
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasCodeBlocks && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium"
              style={{ background: "rgba(16,185,129,0.08)", color: "#059669", border: "1px solid rgba(16,185,129,0.18)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Code runners active
            </div>
          )}
          <button
            onClick={() => setIsFullscreen(v => !v)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: T.textHint, background: T.pageBg, border: `1px solid ${T.border}` }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#6366f1"; (e.currentTarget as HTMLElement).style.borderColor = "#6366f1"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.textHint; (e.currentTarget as HTMLElement).style.borderColor = T.border; }}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            onClick={onNewTab}
            title="Open in new tab"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{ background: "rgba(99,102,241,0.09)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.20)" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.18)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.09)"}
          >
            <ExternalLink size={11} />
            New Tab
          </button>
        </div>
      </div>

      {!loaded && (
        <div
          className="absolute inset-x-0 top-[52px] bottom-0 flex flex-col items-center justify-center gap-3 z-10"
          style={{ background: T.bg }}
        >
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "#6366f1",
                  animation: `ivBounce 0.9s ease-in-out ${i * 0.15}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium" style={{ color: T.textHint }}>Loading page…</span>
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={injectTryItButtonsLocal(page.code)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        title={page.title}
        onLoad={() => setLoaded(true)}
        className="flex-1 w-full border-none"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.25s ease",
          background: "#ffffff",
          minHeight: 0,
        }}
      />
    </div>
  );
};

// ─── DropMenu Components ───────────────────────────────────────────────────────
const DropMenu: React.FC<{ children: React.ReactNode; upward?: boolean }> = ({ children, upward }) => (
  <div
    className={`absolute right-0 w-44 z-[200] overflow-hidden ${upward ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
    style={{
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12,
      boxShadow: "0 10px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)",
      padding: 4, animation: "ccDropIn 0.14s cubic-bezier(0.16,1,0.3,1) both",
    }}
    onClick={e => e.stopPropagation()}
  >
    {children}
  </div>
);

const DropItem: React.FC<{
  icon: React.ReactNode; label: string; color?: string; divider?: boolean; onClick: () => void;
}> = ({ icon, label, color, divider, onClick }) => (
  <button
    type="button" onClick={onClick}
    className="flex items-center gap-2 w-full px-2.5 py-2 text-[11px] font-semibold rounded-lg"
    style={{
      color: color || T.textSub, borderTop: divider ? `1px solid ${T.border}` : "none",
      marginTop: divider ? 3 : 0, transition: "all 0.12s", background: "transparent",
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.background = color ? `${color}10` : T.pageBg;
      (e.currentTarget as HTMLElement).style.color = color || T.textMain;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.background = "transparent";
      (e.currentTarget as HTMLElement).style.color = color || T.textSub;
    }}
  >
    {icon}{label}
  </button>
);

// ─── FilterSection Component (Updated - Only show existing file types) ────────
const FilterSection: React.FC<{
  fileTypes: FileTypeConfig[];
  allFiles: UploadedFile[];
  currentFolders: FolderItem[];
  activeFilters: { fileTypes: string[]; searchFilter: string };
  onFilterChange: (f: { fileTypes: string[]; searchFilter: string }) => void;
  onResourceModalOpen: () => void;
}> = ({ fileTypes, allFiles, currentFolders, activeFilters, onFilterChange, onResourceModalOpen }) => {
  const [search, setSearch] = useState(activeFilters.searchFilter);

  useEffect(() => {
    const t = setTimeout(() => onFilterChange({ ...activeFilters, searchFilter: search }), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Get available file types from actual data (only show what exists)
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    
    // Check folders
    if (currentFolders.length > 0) {
      types.add("folder");
    }
    
    // Check files
    allFiles.forEach(file => {
      const lt = (file.type || "").toLowerCase();
      const ln = (file.name || "").toLowerCase();
      const isRef = file.isReference === true || String(file.isReference) === "true";
      const isUrl = lt.includes("url") || lt.includes("link");
      const isPage = lt === "page";
      
      if (isPage) types.add("page");
      else if (isUrl) types.add("url");
      else if (isRef) types.add("reference");
      else if (lt.includes("pdf") || ln.endsWith(".pdf")) types.add("pdf");
else if (lt.includes("ppt") || ln.match(/\.pptx?$/i) || ln.match(/\.ptx$/i)) types.add("ppt");      else if (lt.includes("video") || ln.match(/\.(mp4|avi|mov|mkv|webm)$/i)) types.add("video");
      else if (lt.includes("zip") || ln.match(/\.(zip|rar|7z|tar|gz)$/i)) types.add("zip");
    });
    
    return Array.from(types);
  }, [allFiles, currentFolders]);

  const FM: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    page: { icon: <Layout size={10} />, color: "#6366f1", label: "Pages" },
    folder: { icon: <Folder size={10} />, color: T.orange, label: "Folders" },
    url: { icon: <Link size={10} />, color: "#10b981", label: "URLs" },
    reference: { icon: <Bookmark size={10} />, color: "#8b5cf6", label: "References" },
    pdf: { icon: <FileText size={10} />, color: "#ef4444", label: "PDFs" },
    video: { icon: <Video size={10} />, color: "#8b5cf6", label: "Videos" },
    zip: { icon: <FileArchive size={10} />, color: "#f59e0b", label: "ZIPs" },
    ppt: { icon: <MonitorPlay size={10} />, color: "#f97316", label: "Presentations" },
  };

  const toggleFilter = (t: string) => {
    onFilterChange({
      ...activeFilters,
      fileTypes: activeFilters.fileTypes.includes(t)
        ? activeFilters.fileTypes.filter(x => x !== t)
        : [...activeFilters.fileTypes, t],
    });
  };

  const hasActiveFilters = activeFilters.fileTypes.length > 0;

  // Don't show filter section if no data
  if (availableTypes.length === 0 && allFiles.length === 0 && currentFolders.length === 0) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 w-full">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onResourceModalOpen}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
            style={{ background: T.orange, boxShadow: `0 3px 10px ${T.orangeGlow}`, transition: "all 0.18s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.orangeDark; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.orange; (e.currentTarget as HTMLElement).style.transform = "none"; }}
          >
            <Plus size={12} strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Resource</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 w-full">
      <div className="flex items-center gap-1.5 overflow-x-auto flex-wrap" style={{ scrollbarWidth: "none" }}>
        {/* All button - only show if there are filters */}
        {availableTypes.length > 0 && (
          <button
            onClick={() => onFilterChange({ ...activeFilters, fileTypes: [] })}
            className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all"
            style={
              !hasActiveFilters
                ? { background: T.orange, color: "#fff", border: `1.5px solid ${T.orange}`, boxShadow: `0 2px 8px ${T.orangeGlow}` }
                : { background: T.bg, color: T.textSub, border: `1px solid ${T.border}` }
            }
            onMouseEnter={e => {
              if (hasActiveFilters) {
                (e.currentTarget as HTMLElement).style.borderColor = T.orange;
                (e.currentTarget as HTMLElement).style.color = T.orange;
              }
            }}
            onMouseLeave={e => {
              if (hasActiveFilters) {
                (e.currentTarget as HTMLElement).style.borderColor = T.border;
                (e.currentTarget as HTMLElement).style.color = T.textSub;
              }
            }}
          >
            All
          </button>
        )}
        
        {/* Filter buttons - only show types that exist in data */}
        {availableTypes.map(t => {
          const isActive = activeFilters.fileTypes.includes(t);
          const m = FM[t] || { icon: <File size={10} />, color: T.textMuted, label: t.charAt(0).toUpperCase() + t.slice(1) };
          return (
            <button
              key={t}
              onClick={() => toggleFilter(t)}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all"
              style={
                isActive
                  ? { background: `${m.color}15`, color: m.color, border: `1.5px solid ${m.color}60` }
                  : { background: T.bg, color: T.textSub, border: `1px solid ${T.border}` }
              }
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderColor = m.color;
                  (e.currentTarget as HTMLElement).style.color = m.color;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.borderColor = T.border;
                  (e.currentTarget as HTMLElement).style.color = T.textSub;
                }
              }}
            >
              <span style={{ color: isActive ? m.color : T.textHint }}>{m.icon}</span>
              {m.label}
              {isActive && (
                <span className="ml-0.5 w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
              )}
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
        <div className="relative flex-1 sm:w-52">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: search ? T.orange : T.textHint }} />
          <input
            type="text"
            placeholder="Search files…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-6 py-1.5 text-[11px] font-medium outline-none"
            style={{ background: T.pageBg, border: `1px solid ${T.border}`, borderRadius: 9, color: T.textMain, fontFamily: "inherit" }}
            onFocus={e => { e.currentTarget.style.borderColor = T.orange; e.currentTarget.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; e.currentTarget.style.background = T.bg; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.background = T.pageBg; }}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); onFilterChange({ ...activeFilters, searchFilter: "" }); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded"
              style={{ color: T.textHint }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = T.orange}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T.textHint}
            >
              <X size={10} />
            </button>
          )}
        </div>
        <button
          onClick={onResourceModalOpen}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
          style={{ background: T.orange, boxShadow: `0 3px 10px ${T.orangeGlow}`, transition: "all 0.18s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.orangeDark; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.orange; (e.currentTarget as HTMLElement).style.transform = "none"; }}
        >
          <Plus size={12} strokeWidth={2.5} />
          <span className="hidden sm:inline">Add Resource</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>
    </div>
  );
};

// ─── FileList Component (Updated - Filter hides non-matching items) ───────────
const FileList: React.FC<{
  folders: FolderItem[]; files: UploadedFile[];
  activeTab: "I_Do" | "We_Do" | "You_Do" | null; activeSubcategory: string;
  getFolderItemCount: (id: string) => number;
  onFolderClick: (id: string, name: string) => void;
  onFileClick: (file: UploadedFile, tab: "I_Do" | "We_Do" | "You_Do" | null, sub: string) => void;
  onEditFolder: (f: FolderItem) => void; onDeleteFolder: (f: FolderItem) => void;
  onDeleteFile: (id: string, name: string) => void;
  onUpdateFile: (file: UploadedFile, tab: "I_Do" | "We_Do" | "You_Do", sub: string) => void;
  onNavigateUp: () => void;
  folderNavState: FolderNavState;
  onDeletePage?: (pageId: string, name: string) => void;
  onEditPage: (data: { id: string; title: string; blocks: PageBlock[]; code: string }) => void;
  onPageClick: (page: ViewingPage) => void;
  onBulkDelete: (items: Array<{ type: "file" | "folder" | "page"; id: string; name: string; folderItem?: FolderItem }>) => Promise<void>;
  activeFileTypes?: string[];
  onClearFilters?: () => void; // Add this prop
}> = ({
  folders, files, activeTab, activeSubcategory, getFolderItemCount,
  onFolderClick, onFileClick, onEditFolder, onDeleteFolder, onDeleteFile, onUpdateFile,
  onNavigateUp,
  folderNavState,
  onDeletePage,
  onEditPage,
  onPageClick,
  onBulkDelete,
  activeFileTypes = [],
  onClearFilters, // Add this
}) => {
    const [openDrop, setOpenDrop] = useState<string | null>(null);
    const [dropUpward, setDropUpward] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  useEffect(() => {
      setSelected(new Set());
    }, [folderNavState.currentFolderId]);
    
    // Clear filters when entering a folder
    const handleFolderClick = (id: string, name: string) => {
      // Clear filters before navigating into folder
      if (onClearFilters) {
        onClearFilters();
      }
      onFolderClick(id, name);
    };

    useEffect(() => {
      const h = (e: MouseEvent) => { if (!(e.target as Element).closest(".dd-w")) setOpenDrop(null); };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);

    const tog = (id: string, e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (openDrop === id) { setOpenDrop(null); return; }
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setDropUpward(window.innerHeight - rect.bottom < 200);
      setOpenDrop(id);
    };

    // Helper function to check if a file matches active filters
    const isFileTypeActive = (file: UploadedFile): boolean => {
      if (activeFileTypes.length === 0) return true;
      
      const lt = (file.type || "").toLowerCase();
      const ln = (file.name || "").toLowerCase();
      const isPage = lt === "page";
      const isRef = file.isReference === true || String(file.isReference) === "true";
      const isUrl = lt.includes("url") || lt.includes("link");
      
      return activeFileTypes.some(t => {
        switch (t) {
          case "page": return isPage;
          case "url": return isUrl;
          case "reference": return isRef;
          case "pdf": return lt.includes("pdf") || ln.endsWith(".pdf");
            case "ppt": return lt.includes("ppt") || !!ln.match(/\.pptx?$/i) || !!ln.match(/\.ptx$/i);
          case "video": return lt.includes("video") || !!ln.match(/\.(mp4|avi|mov|mkv|webm)$/i);
          case "zip": return lt.includes("zip") || !!ln.match(/\.(zip|rar|7z|tar|gz)$/i);
          default: return lt.includes(t);
        }
      });
    };

    const isFolderTypeActive = (): boolean => {
      if (activeFileTypes.length === 0) return true;
      return activeFileTypes.includes("folder");
    };

    // Filter files and folders based on active filters - HIDE non-matching items
    const filteredFolders = useMemo(() => {
      if (activeFileTypes.length === 0) return folders;
      const isFolderActive = activeFileTypes.includes("folder");
      return isFolderActive ? folders : [];
    }, [folders, activeFileTypes]);

    const filteredFiles = useMemo(() => {
      if (activeFileTypes.length === 0) return files;
      return files.filter(file => isFileTypeActive(file));
    }, [files, activeFileTypes]);

    const empty = filteredFolders.length === 0 && filteredFiles.length === 0;

    const uniqueFiles = useMemo(() => {
      const fileMap = new Map();
      filteredFiles.forEach(file => {
        if (!fileMap.has(file.id)) {
          fileMap.set(file.id, file);
        }
      });
      return Array.from(fileMap.values());
    }, [filteredFiles]);

    const allIds = [
      ...uniqueFiles.map(f => `file-${f.id}`),
      ...filteredFolders.map(f => `folder-${f.id}`),
    ];
    const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
    const someSelected = allIds.some(id => selected.has(id));

    const toggleSelect = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    };
    const toggleAll = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelected(allSelected ? new Set() : new Set(allIds));
    };

    const handleBulkDelete = async () => {
      setConfirmBulkDelete(false);
      const items = [...selected].map(id => {
        if (id.startsWith("file-")) {
          const realId = id.replace("file-", "");
          const file = uniqueFiles.find(f => f.id === realId);
          if (file) {
            const isPage = (file.type || "").toLowerCase() === "page";
            return { 
              type: isPage ? "page" as const : "file" as const, 
              id: realId, 
              name: file.name 
            };
          }
          return null;
        } else if (id.startsWith("folder-")) {
          const realId = id.replace("folder-", "");
          const folder = filteredFolders.find(f => f.id === realId);
          return folder ? { type: "folder" as const, id: realId, name: folder.name, folderItem: folder } : null;
        }
        return null;
      }).filter(Boolean) as Array<{ type: "file" | "folder" | "page"; id: string; name: string; folderItem?: FolderItem }>;
      await onBulkDelete(items);
      setSelected(new Set());
    };

    const rowBase: React.CSSProperties = {
      display: "grid", gridTemplateColumns: "24px minmax(0,1fr) 90px 70px 72px",
      gap: 8, alignItems: "center", borderBottom: `1px solid ${T.border}`,
      padding: "11px 16px", transition: "all 0.15s", borderLeft: "2.5px solid transparent",
    };

    return (
      <div className="flex flex-col h-full" style={{ background: T.bg }}>
        {someSelected && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2" style={{ background: "rgba(239,68,68,0.06)", borderBottom: `1px solid rgba(239,68,68,0.18)`, borderLeft: "2.5px solid #ef4444" }}>
           <div className="flex items-center gap-2">
  <span className="text-[11px] font-bold" style={{ color: "#ef4444" }}>{selected.size} item{selected.size > 1 ? "s" : ""} selected</span>
  <button 
    type="button" 
    onClick={() => setSelected(new Set())} 
    className="text-[10px] font-semibold px-2 py-0.5 rounded transition-all"
    style={{ 
      color: T.textSub, 
      background: T.pageBg, 
      border: `1px solid ${T.border}`,
      cursor: 'pointer'
    }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLElement).style.background = T.orangeLight;
      (e.currentTarget as HTMLElement).style.color = T.orange;
      (e.currentTarget as HTMLElement).style.borderColor = T.orange;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLElement).style.background = T.pageBg;
      (e.currentTarget as HTMLElement).style.color = T.textSub;
      (e.currentTarget as HTMLElement).style.borderColor = T.border;
    }}
  >
    Clear
  </button>
</div>
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
              style={{ background: "#ef4444", boxShadow: "0 3px 10px rgba(239,68,68,0.25)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#dc2626"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#ef4444"}
            >
              <Trash2 size={12} />
              Delete {selected.size > 1 ? `${selected.size} items` : "1 item"}
            </button>
          </div>
        )}

        {confirmBulkDelete && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)" }} onClick={() => setConfirmBulkDelete(false)}>
            <div className="rounded-2xl p-6 w-[320px] shadow-2xl" style={{ background: T.bg, border: `1px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                  <Trash2 size={18} style={{ color: "#ef4444" }} />
                </div>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: T.textMain }}>Delete {selected.size} item{selected.size > 1 ? "s" : ""}?</p>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: T.textMuted }}>This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setConfirmBulkDelete(false)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold"
                  style={{ background: T.pageBg, color: T.textSub, border: `1px solid ${T.border}` }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.warm}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.pageBg}
                >Cancel</button>
                <button type="button" onClick={handleBulkDelete}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white"
                  style={{ background: "#ef4444" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#dc2626"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "#ef4444"}
                >Yes, Delete</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) 90px 70px 72px", gap: 8, padding: "7px 16px", background: T.pageBg, borderBottom: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-center">
            <div
              onClick={toggleAll}
              className="w-4 h-4 rounded flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ background: allSelected ? T.orange : "transparent", border: `1.5px solid ${allSelected ? T.orange : someSelected ? T.orange : T.border}`, transition: "all 0.15s" }}
            >
              {allSelected && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              {!allSelected && someSelected && <div className="w-2 h-0.5 rounded" style={{ background: T.orange }} />}
            </div>
          </div>
          {[["Name", "text-left"], ["Date", "text-left"], ["Size", "text-left"], ["Actions", "text-center"]].map(([h, a]) => (
            <div key={h} className={`${a} text-[9px] font-medium uppercase tracking-[0.13em] text-black`}>{h}</div>
          ))}
        </div>

<div className="flex-1 min-h-0 overflow-y-auto" style={{ 
  scrollbarWidth: "thin", 
  scrollbarColor: `${T.border} transparent`,
  paddingBottom: "50px",
  maxHeight: "calc(100vh - 200px)", // Adjust based on your layout
  overflowY: "auto",
  overflowX: "hidden"
}}>          {/* Render filtered files - pages and regular files */}
          {uniqueFiles.map(file => {
            const isPage = (file.type || "").toLowerCase() === "page";
            const isRef = file.isReference === true || String(file.isReference) === "true";
            const isUrl = (file.type || "").includes("url") || (file.type || "").includes("link");
            const furl = typeof file.url === "string" ? file.url : (file.url as any)?.base || "";
            
            const combinedCode = isPage ? ((file as any)._combinedCode || "") : "";
            const pageCount = isPage ? ((file as any)._pageCount ?? 1) : 0;
            const hasCode = isPage && (combinedCode.includes("playground-wrapper") || combinedCode.includes("allow-scripts"));
            
            const { icon, color, bg } = getFileMeta(file.type || "", file.name, isRef);
            
            if (isPage) {
              return (
                <div
                  key={file.id}
                  onClick={() => onPageClick({ code: combinedCode, title: file.name, pageCount })}
                  className="group/page cursor-pointer"
                  style={rowBase}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.04)";
                    (e.currentTarget as HTMLElement).style.borderLeftColor = "#6366f1";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = T.bg;
                    (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent";
                  }}
                >
                  <div className="flex items-center justify-center" onClick={e => toggleSelect(`file-${file.id}`, e)}>
                    <div className="w-4 h-4 rounded flex items-center justify-center cursor-pointer flex-shrink-0"
                      style={{ background: selected.has(`file-${file.id}`) ? "#6366f1" : "transparent", border: `1.5px solid ${selected.has(`file-${file.id}`) ? "#6366f1" : T.border}`, transition: "all 0.15s" }}>
                      {selected.has(`file-${file.id}`) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.18)" }}
                    >
                      <Layout size={13} style={{ color: "#6366f1" }} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[12px] font-bold truncate" style={{ color: T.textMain }}>{file.name}</span>
                        <span
                          className="flex-shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                          style={{ background: "rgba(99,102,241,0.10)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.18)" }}
                        >PAGE</span>
                        {hasCode && (
                          <span
                            className="flex-shrink-0 flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                            style={{ background: "rgba(16,185,129,0.09)", color: "#059669", border: "1px solid rgba(16,185,129,0.20)" }}
                          >
                            <Code2 size={7} />
                            Code
                          </span>
                        )}
                      </div>
                      <span className="text-[9.5px] mt-0.5 font-medium" style={{ color: T.textHint }}>
                        Click to view inline
                        {pageCount > 1 && ` · ${pageCount} pages`}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10.5px] font-medium" style={{ color: T.textMuted }}>
                    {file.uploadedAt
                      ? new Date(file.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "—"}
                  </div>

                  <div className="text-[10.5px] font-medium" style={{ color: T.textMuted }}>
                    {pageCount > 1 ? `${pageCount}p` : "1p"}
                  </div>

                  <div className="flex items-center justify-center gap-1 relative dd-w">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onPageClick({ code: combinedCode, title: file.name, pageCount }); }}
                      title="View inline"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{ background: "rgba(99,102,241,0.09)", color: "#6366f1", border: "1px solid rgba(99,102,241,0.20)", transition: "all 0.13s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.18)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.09)"}
                    >
                      <Eye size={11} />View
                    </button>

                    <button
                      type="button"
                      onClick={e => tog(`file-${file.id}`, e)}
                      className="p-1.5 rounded-lg"
                      style={{ color: T.textHint, transition: "all 0.13s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg; (e.currentTarget as HTMLElement).style.color = T.textMain; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = T.textHint; }}
                    >
                      <MoreVertical size={13} />
                    </button>
                    {openDrop === `file-${file.id}` && (
                      <DropMenu upward={dropUpward}>
                        <DropItem
                          icon={<Eye size={12} />}
                          label="View Inline"
                          onClick={() => { onPageClick({ code: combinedCode, title: file.name, pageCount }); setOpenDrop(null); }}
                        />
                        <DropItem
                          icon={<Edit2 size={12} />}
                          label="Edit Page"
                          onClick={() => {
                            onEditPage({
                              id: file.id,
                              title: file.name,
                              blocks: (file as any)._blocks ?? [],
                              code: combinedCode,
                            });
                            setOpenDrop(null);
                          }}
                        />
                        <DropItem
                          icon={<ExternalLink size={12} />}
                          label="Open in New Tab"
                          onClick={() => { openPageInNewTab(combinedCode); setOpenDrop(null); }}
                        />
                        <DropItem
                          icon={<Trash2 size={12} />}
                          label="Delete"
                          color="#ef4444"
                          divider
                          onClick={() => {
                            onDeletePage?.(file.id, file.name);
                            setOpenDrop(null);
                          }}
                        />
                      </DropMenu>
                    )}
                  </div>
                </div>
              );
            }
            
            // Regular file rendering (non-page)
            return (
              <div 
                key={file.id} 
                className="group/file"
                style={rowBase}
                onMouseEnter={e => { 
                  (e.currentTarget as HTMLElement).style.background = T.pageBg; 
                  (e.currentTarget as HTMLElement).style.borderLeftColor = `${color}45`;
                }}
                onMouseLeave={e => { 
                  (e.currentTarget as HTMLElement).style.background = T.bg; 
                  (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent";
                }}
              >
                <div className="flex items-center justify-center" onClick={e => toggleSelect(`file-${file.id}`, e)}>
                  <div className="w-4 h-4 rounded flex items-center justify-center cursor-pointer flex-shrink-0"
                    style={{ background: selected.has(`file-${file.id}`) ? color : "transparent", border: `1.5px solid ${selected.has(`file-${file.id}`) ? color : T.border}`, transition: "all 0.15s" }}>
                    {selected.has(`file-${file.id}`) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg, border: `1px solid ${color}20`, color }}>{icon}</div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="text-[12px] truncate cursor-pointer" 
                        style={{ color: T.textMain, transition: "color 0.13s" }}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onFileClick(file, activeTab, activeSubcategory); }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = color}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T.textMain}
                      >
                        {file.name}
                      </span>
                      {isRef && <span className="flex-shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest" style={{ background: "rgba(139,92,246,0.09)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.18)" }}>REF</span>}
                    </div>
                    {file.tags?.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {file.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[8px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: `${tag.tagColor}10`, color: tag.tagColor, border: `1px solid ${tag.tagColor}20` }}>
                            <span className="w-1 h-1 rounded-full" style={{ background: tag.tagColor }} />{tag.tagName}
                          </span>
                        ))}
                        {file.tags.length > 3 && <span className="text-[9px] font-medium" style={{ color: T.textHint }}>+{file.tags.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[10.5px] font-medium" style={{ color: T.textMuted }}>{file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</div>
                <div className="text-[10.5px] font-medium" style={{ color: T.textMuted }}>{fmtSize(file.size || 0)}</div>
                <div className="flex items-center justify-center relative dd-w">
                  <button 
                    type="button" 
                    onClick={e => tog(`file-${file.id}`, e)} 
                    className="p-1.5 rounded-lg" 
                    style={{ color: T.textHint, transition: "all 0.13s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.pageBg; (e.currentTarget as HTMLElement).style.color = T.textMain; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = T.textHint; }}
                  >
                    <MoreVertical size={13} />
                  </button>
                  {openDrop === `file-${file.id}` && (
                    <DropMenu upward={dropUpward}>
                      <DropItem icon={isUrl ? <ExternalLink size={12} /> : <Eye size={12} />} label={isUrl ? "Open Link" : "Preview"} onClick={() => { onFileClick(file, activeTab, activeSubcategory); setOpenDrop(null); }} />
                      {!isUrl && <DropItem icon={<Download size={12} />} label="Download" onClick={() => { const a = document.createElement("a"); a.href = furl; a.download = file.name || "download"; document.body.appendChild(a); a.click(); document.body.removeChild(a); setOpenDrop(null); }} />}
                      <DropItem icon={<RefreshCw size={12} />} label="Update" color="#f97316" onClick={() => { onUpdateFile(file, activeTab || "I_Do", activeSubcategory); setOpenDrop(null); }} />
                      <DropItem icon={<Trash2 size={12} />} label="Delete" color="#ef4444" divider onClick={() => { onDeleteFile(file.id, file.name); setOpenDrop(null); }} />
                    </DropMenu>
                  )}
                </div>
              </div>
            );
          })}

          {/* Render filtered folders */}
          {filteredFolders.map(folder => {
            return (
              <div 
                key={folder.id} 
                onClick={() => onFolderClick(folder.id, folder.name)}
                className="group/row cursor-pointer"
                style={rowBase}
                onMouseEnter={e => { 
                  (e.currentTarget as HTMLElement).style.background = T.warm; 
                  (e.currentTarget as HTMLElement).style.borderLeftColor = T.orange;
                }}
                onMouseLeave={e => { 
                  (e.currentTarget as HTMLElement).style.background = T.bg; 
                  (e.currentTarget as HTMLElement).style.borderLeftColor = "transparent";
                }}
              >
                <div className="flex items-center justify-center" onClick={e => toggleSelect(`folder-${folder.id}`, e)}>
                  <div className="w-4 h-4 rounded flex items-center justify-center cursor-pointer flex-shrink-0"
                    style={{ background: selected.has(`folder-${folder.id}`) ? T.orange : "transparent", border: `1.5px solid ${selected.has(`folder-${folder.id}`) ? T.orange : T.border}`, transition: "all 0.15s" }}>
                    {selected.has(`folder-${folder.id}`) && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.orangeLight, border: `1px solid ${T.orange}20` }}>
                    <Folder size={14} style={{ color: T.orange }} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[12px] truncate" style={{ color: T.textMain }}>{folder.name}</span>
                    {folder.tags?.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {folder.tags.map((tag, i) => (
                          <span key={i} className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${tag.tagColor}12`, color: tag.tagColor, border: `1px solid ${tag.tagColor}25` }}>{tag.tagName}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[10.5px] font-medium" style={{ color: T.textMuted }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                <div><span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold" style={{ background: T.pageBg, color: T.textSub, border: `1px solid ${T.border}` }}>{getFolderItemCount(folder.id)} items</span></div>
                <div className="flex items-center justify-center relative dd-w">
                  <button 
                    type="button" 
                    onClick={e => tog(`folder-${folder.id}`, e)} 
                    className="p-1.5 rounded-lg" 
                    style={{ color: T.textHint, transition: "all 0.13s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.orangeLight; (e.currentTarget as HTMLElement).style.color = T.orange; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = T.textHint; }}
                  >
                    <MoreVertical size={13} />
                  </button>
                  {openDrop === `folder-${folder.id}` && (
                    <DropMenu upward={dropUpward}>
                      <DropItem icon={<Edit2 size={12} />} label="Edit Folder" onClick={() => { onEditFolder(folder); setOpenDrop(null); }} />
                      <DropItem icon={<Trash2 size={12} />} label="Delete" color="#ef4444" divider onClick={() => { onDeleteFolder(folder); setOpenDrop(null); }} />
                    </DropMenu>
                  )}
                </div>
              </div>
            );
          })}

          {empty && (
            <div className="flex flex-col items-center justify-center py-20 text-center" style={{ animation: "ccFadeIn 0.3s ease-out both" }}>
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: T.orangeLight, border: `1.5px dashed ${T.orange}40` }}>
                <FileText size={22} style={{ color: T.orange }} strokeWidth={1.5} />
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: T.orange, color: "#fff" }}><Plus size={9} strokeWidth={3} /></div>
              </div>
              <p className="text-[14px] font-bold" style={{ color: T.textMain }}>No content yet</p>
              <p className="text-[11px] mt-1.5 font-medium max-w-[220px] leading-relaxed" style={{ color: T.textMuted }}>Upload files or create folders to organise your course materials</p>
            </div>
          )}
        </div>
      </div>
    );
  };

// ─── TabBar Component ──────────────────────────────────────────────────────────
const TabBar: React.FC<{
  selectedNode: CourseNode | null;
  activeTab: "I_Do" | "We_Do" | "You_Do" | null;
  activeSubcategory: string;
  subcategories: CourseContentProps["subcategories"];
  onTabChange: (tab: "I_Do" | "We_Do" | "You_Do") => void;
  onSubcategoryChange: (sub: string, component: string | null) => void;
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
    setPillColor(TAB_META[activeTab].color);
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

  const handleTabClick = (tabKey: "I_Do" | "We_Do" | "You_Do") => {
    if (!selectedNode) return;
    setHoveredTab("");
    if (activeTab !== tabKey) {
      onTabChange(tabKey);
      const subs = subcategories[tabKey] || [];
      if (subs.length > 0) onSubcategoryChange(subs[0].key, subs[0].component);
    }
  };

  const handleSubClick = (
    tabKey: "I_Do" | "We_Do" | "You_Do",
    sub: { key: string; label: string; icon: React.ReactNode; component: string | null }
  ) => {
    setHoveredTab("");
    if (activeTab !== tabKey) onTabChange(tabKey);
    onSubcategoryChange(sub.key, sub.component);
  };

  const activeSub = activeTab ? subcategories[activeTab]?.find(s => s.key === activeSubcategory) : null;

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
                    {subs.map((sub, idx) => {
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
            style={{ background: TAB_META[activeTab].bg, color: TAB_META[activeTab].color, border: `1px solid ${TAB_META[activeTab].color}28`, borderRadius: 6, padding: "3px 9px", fontSize: 10.5, fontWeight: 800 }}>
            <span style={{ display: "flex", alignItems: "center" }}>{activeSub.icon}</span>
            {activeSub.label}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main CourseContent Component ─────────────────────────────────────────────
export const CourseContent: React.FC<CourseContentProps> = ({
  selectedNode, activeTab, activeSubcategory, subcategories, contentData,
  breadcrumbs, fileTypes, currentFolderContents, folderNavState,
  courseId, courseStructureName, pedagogy,
  onTabChange, onSubcategoryChange, onResourceModalOpen, onFileClick,
  onNavigateToFolder, onNavigateUp, onNavigateToRoot, onNavigateToFolderLevel,
  onEditFolder, onDeleteFolder, onDeleteFile, configuredLanguages,
  onDeletePage = (pageId: string, name: string) => {
    console.warn("onDeletePage not implemented by parent. pageId:", pageId, "name:", name)
  },
  onUpdateFile, getParentNodeName, getFolderItemCount, onPageCreated, onBulkDelete
}) => {
  const [activeFilters, setActiveFilters] = useState({ fileTypes: [] as string[], searchFilter: "" });
  const [viewingPage, setViewingPage] = useState<ViewingPage | null>(null);
  const [editingPage, setEditingPage] = useState<{
    id: string; title: string; blocks: PageBlock[]; code: string;
  } | null>(null);
  const [localPageOverrides, setLocalPageOverrides] = useState<Record<string, {
    combinedCode: string;
    title: string;
    blocks: any[];
    pageCount: number;
  }>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Add this function to clear filters
  const clearFilters = useCallback(() => {
    setActiveFilters({ fileTypes: [], searchFilter: "" });
  }, []);

  // Clear filters when folder navigation state changes (entering a folder)
  useEffect(() => {
    // Clear filters when entering a folder
    if (folderNavState.currentFolderId !== null) {
      clearFilters();
    }
  }, [folderNavState.currentFolderId, clearFilters]);

  // Also clear filters when navigating up from a folder
  const handleNavigateUp = useCallback(() => {
    clearFilters();
    onNavigateUp();
  }, [clearFilters, onNavigateUp]);

  useEffect(() => {
    setLocalPageOverrides({});
  }, [activeTab, activeSubcategory, selectedNode?.id]);

  useEffect(() => { setViewingPage(null); }, [activeTab, activeSubcategory, selectedNode?.id]);

  const hierarchyInfo: HierarchyInfo | undefined = selectedNode
    ? {
      courseId,
      courseName: courseStructureName || "",
      moduleId: selectedNode.type === "module" ? selectedNode.id : undefined,
      moduleName: selectedNode.type === "module" ? selectedNode.name : getParentNodeName(selectedNode, "module") || undefined,
      subModuleId: selectedNode.type === "submodule" ? selectedNode.id : undefined,
      subModuleName: selectedNode.type === "submodule" ? selectedNode.name : getParentNodeName(selectedNode, "submodule") || undefined,
      topicId: selectedNode.type === "topic" ? selectedNode.id : undefined,
      topicName: selectedNode.type === "topic" ? selectedNode.name : getParentNodeName(selectedNode, "topic") || undefined,
      subTopicId: selectedNode.type === "subtopic" ? selectedNode.id : undefined,
      subTopicName: selectedNode.type === "subtopic" ? selectedNode.name : getParentNodeName(selectedNode, "subtopic") || undefined,
      tabType: activeTab || undefined,
      subcategory: activeSubcategory || undefined,
      folderPath: folderNavState.currentFolderPath ?? [],
      nodeType: selectedNode.type as HierarchyInfo["nodeType"],
    }
    : undefined;

  const isValidSub = subcategories[activeTab as "I_Do" | "We_Do" | "You_Do"]?.some(s => s.key === activeSubcategory);

  // Get all files including pages from pedagogy
  const allFiles = useMemo(() => {
    const combined = [...currentFolderContents.files];
    
    // Add pages if they exist in pedagogy (for root level)
    if (activeTab && activeSubcategory && pedagogy) {
      const sec = pedagogy[activeTab];
      if (sec) {
        const raw = Object.keys(sec).find(k => normKey(k) === activeSubcategory);
        if (raw && sec[raw]?.pages) {
          const pagesMap = new Map();
          sec[raw].pages.forEach((p: any) => {
            if (p?._id && !pagesMap.has(p._id)) {
              // Check if page belongs to current folder or root
              const pageFolderId = p.folderId || null;
              const currentFolderId = folderNavState.currentFolderId;
              
              // Only add page if it matches current folder context
              if (pageFolderId === currentFolderId || (pageFolderId === null && currentFolderId === null)) {
                pagesMap.set(p._id, {
                  id: p._id,
                  name: p.title || "Untitled Page",
                  type: "page",
                  size: 0,
                  url: "",
                  uploadedAt: p.createdAt || new Date().toISOString(),
                  tags: [],
                  subcategory: activeSubcategory,
                  folderId: pageFolderId,
                  _combinedCode: p.combinedCode || "",
                  _pageCount: p.pageCount || 1,
                  _blocks: p.blocks || [],
                });
              }
            }
          });
          combined.push(...Array.from(pagesMap.values()));
        }
      }
    }
    
    return combined;
  }, [currentFolderContents.files, pedagogy, activeTab, activeSubcategory, folderNavState.currentFolderId]);

  // Filter content based on search ONLY (no file type hiding)
  const filteredContent = useMemo(() => {
    let folders = currentFolderContents.folders;
    let files = allFiles;
    const q = activeFilters.searchFilter.toLowerCase();
    
    // Only apply search filter to hide items
    if (q) { 
      folders = folders.filter(f => f.name.toLowerCase().includes(q)); 
      files = files.filter(f => (f.name || "").toLowerCase().includes(q)); 
    }
    
    // Don't filter by file type - we'll use highlighting instead
    return { folders, files };
  }, [currentFolderContents.folders, allFiles, activeFilters.searchFilter]);

  const { folders: ff, files: ft } = filteredContent;
  const hasContent = ff.length > 0 || ft.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" }}>

      {/* ── Breadcrumbs ── */}
      <div className="flex-shrink-0 px-5" style={{ background: T.bg }}>
        <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <div key={`${crumb.id}-${i}`} className="flex items-center gap-0.5 flex-shrink-0">
                {i > 0 && <ChevronRight size={9} style={{ color: T.textHint, margin: "0 1px" }} />}
                {crumb.path
                  ? <a href={crumb.path} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ color: T.textSub, transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.orange; (e.currentTarget as HTMLElement).style.background = T.orangeLight; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.textSub; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    {i === 0 && <Home size={11} />}
                    <span className="max-w-[130px] truncate">{crumb.label}</span>
                  </a>
                  : <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold max-w-[150px] truncate"
                    style={{ color: isLast ? T.orange : T.textSub, background: isLast ? T.orangeLight : "transparent", border: isLast ? `1px solid ${T.orange}20` : "1px solid transparent" }}>
                    {crumb.label}
                  </span>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <TabBar
        selectedNode={selectedNode} activeTab={activeTab}
        activeSubcategory={activeSubcategory} subcategories={subcategories}
        onTabChange={tab => { setViewingPage(null); onTabChange(tab); }}
        onSubcategoryChange={(s, c) => { setViewingPage(null); onSubcategoryChange(s, c); }}
      />

      {/* ── Folder Breadcrumb ── */}
{(folderNavState.currentFolderId !== null || folderNavState.currentFolderPath.length > 0) && (
  <FolderBreadcrumbBar
    folderNavState={folderNavState}
    onNavigateUp={() => {
      clearFilters();
      onNavigateUp();
    }}
    onNavigateToRoot={() => {
      clearFilters();
      onNavigateToRoot?.();
    }}
    onNavigateToFolderLevel={(folderName, index) => {
      clearFilters();
      onNavigateToFolderLevel?.(folderName, index);
    }}
  />
)}

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ background: T.pageBg }}>
        <div className="h-full flex flex-col overflow-hidden" style={{ background: T.bg }}>

          {!selectedNode ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-10" style={{ animation: "ccFadeIn 0.4s ease-out both" }}>
              <div className="grid grid-cols-3 gap-3 max-w-md w-full">
                {([
                  { icon: <Target size={20} />, color: TAB_META.I_Do.color, bg: TAB_META.I_Do.bg, title: "I Do", desc: "Teacher-led instruction" },
                  { icon: <Users size={20} />, color: TAB_META.We_Do.color, bg: TAB_META.We_Do.bg, title: "We Do", desc: "Guided practice" },
                  { icon: <BookOpen size={20} />, color: TAB_META.You_Do.color, bg: TAB_META.You_Do.bg, title: "You Do", desc: "Independent work" },
                ] as any[]).map(item => (
                  <div key={item.title} className="p-4 rounded-2xl text-center"
                    style={{ background: item.bg, border: `1.5px solid ${item.color}18`, transition: "all 0.22s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${item.color}18`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                    <div className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center" style={{ background: `${item.color}14`, color: item.color }}>{item.icon}</div>
                    <h4 className="text-[12px] font-bold tracking-tight" style={{ color: T.textMain }}>{item.title}</h4>
                    <p className="text-[10.5px] mt-1 font-medium leading-relaxed" style={{ color: T.textMuted }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          ) : !activeTab ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-10" style={{ animation: "ccFadeIn 0.3s ease-out both" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: T.orangeLight, border: `1.5px solid ${T.orange}20` }}>
                <Target size={22} style={{ color: T.orange }} strokeWidth={1.5} />
              </div>
              <h3 className="text-[16px] font-bold mb-1.5 tracking-tight" style={{ color: T.textMain }}>Select a Pedagogy Type</h3>
              <p className="text-[12px] font-medium max-w-xs leading-relaxed" style={{ color: T.textMuted }}>Hover over I Do, We Do, or You Do to choose an activity.</p>
            </div>

          ) : activeTab && !activeSubcategory ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-10" style={{ animation: "ccFadeIn 0.3s ease-out both" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: TAB_META[activeTab].bg, border: `1.5px solid ${TAB_META[activeTab].color}20` }}>
                <span style={{ color: TAB_META[activeTab].color }}>{TAB_META[activeTab].icon}</span>
              </div>
              <h3 className="text-[16px] font-bold mb-1.5 tracking-tight" style={{ color: T.textMain }}>Select an Activity</h3>
              <p className="text-[12px] font-medium max-w-xs leading-relaxed" style={{ color: T.textMuted }}>
                Hover over <span style={{ color: TAB_META[activeTab].color, fontWeight: 800 }}>{activeTab.replace("_", " ")}</span> to pick a subcategory.
              </p>
            </div>

          ) : activeTab === "We_Do" && activeSubcategory && isValidSub ? (
            <ProblemSolving
              key={`${activeTab}-${activeSubcategory}`}
              nodeId={selectedNode!.id}
              nodeName={selectedNode!.name}
              subcategory={activeSubcategory}
              subcategoryLabel={subcategories[activeTab].find(s => s.key === activeSubcategory)?.label || activeSubcategory}
              contentData={contentData[selectedNode!.id]?.[activeTab]?.[activeSubcategory] || []}
              folderNavigationState={folderNavState}
              hierarchyData={{
                courseName: courseStructureName || "",
                moduleName: selectedNode!.type === "module" ? selectedNode!.name : getParentNodeName(selectedNode!, "module"),
                submoduleName: selectedNode!.type === "submodule" ? selectedNode!.name : getParentNodeName(selectedNode!, "submodule"),
                topicName: selectedNode!.type === "topic" ? selectedNode!.name : getParentNodeName(selectedNode!, "topic"),
                subtopicName: selectedNode!.type === "subtopic" ? selectedNode!.name : getParentNodeName(selectedNode!, "subtopic"),
                nodeType: selectedNode!.type,
                level: selectedNode!.level,
              }}
              nodeType={selectedNode!.type}
              activeTab={activeTab}
              courseId={courseId}
              configuredLanguages={configuredLanguages}
            />

          ) : activeTab === "You_Do" && activeSubcategory && isValidSub ? (
            (() => {
              const youDoProps = {
                key: `you_do-${activeSubcategory}`,
                nodeId: selectedNode!.id,
                nodeName: selectedNode!.name,
                subcategory: activeSubcategory,
                subcategoryLabel: subcategories["You_Do"].find(s => s.key === activeSubcategory)?.label || activeSubcategory,
                courseId,
                nodeType: selectedNode!.type,
                hierarchyData: {
                  courseName: courseStructureName || "",
                  moduleName: selectedNode!.type === "module" ? selectedNode!.name : getParentNodeName(selectedNode!, "module"),
                  submoduleName: selectedNode!.type === "submodule" ? selectedNode!.name : getParentNodeName(selectedNode!, "submodule"),
                  topicName: selectedNode!.type === "topic" ? selectedNode!.name : getParentNodeName(selectedNode!, "topic"),
                  subtopicName: selectedNode!.type === "subtopic" ? selectedNode!.name : getParentNodeName(selectedNode!, "subtopic"),
                  nodeType: selectedNode!.type,
                  level: selectedNode!.level,
                },
              };
              if (activeSubcategory === "test_your_skills") return <TestYourSkills {...youDoProps} />;
              if (activeSubcategory === "assesment") return <Assessment {...youDoProps} />;
              if (activeSubcategory === "self_work") return <SelfWork {...youDoProps} />;
              return null;
            })()

          ) : viewingPage ? (
            <InlinePageViewer
              page={viewingPage}
              onBack={() => setViewingPage(null)}
              onNewTab={() => openPageInNewTab(viewingPage.code)}
            />

   ) : hasContent ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-shrink-0 px-4 py-2.5"
                style={{ borderBottom: `1px solid ${T.border}`, background: T.bg, borderLeft: `2.5px solid ${T.orange}` }}>
                <FilterSection 
                  fileTypes={fileTypes} 
                  allFiles={ft} 
                  currentFolders={ff}
                  activeFilters={activeFilters} 
                  onFilterChange={setActiveFilters} 
                  onResourceModalOpen={onResourceModalOpen} 
                />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <FileList
                  folders={ff} 
                  files={ft} 
                  activeTab={activeTab} 
                  activeSubcategory={activeSubcategory}
                  getFolderItemCount={getFolderItemCount} 
                  onFolderClick={(id, name) => {
                    clearFilters(); // Clear filters before navigating into folder
                    onNavigateToFolder(id, name);
                  }}
                  onFileClick={onFileClick} 
                  onEditFolder={onEditFolder} 
                  onDeleteFolder={onDeleteFolder}
                  onDeleteFile={onDeleteFile} 
                  onUpdateFile={onUpdateFile}
                  onNavigateUp={handleNavigateUp}
                  folderNavState={folderNavState}
                  onPageClick={setViewingPage}
                  onEditPage={(data) => {
                    setViewingPage(null);
                    setEditingPage(data);
                  }}
                  onDeletePage={async (pageId, name) => {
                    try {
                      await onDeletePage(pageId, name);
                      await onPageCreated?.();
                      showToast(`"${name}" deleted`);
                    } catch {
                      showToast("Failed to delete page.", "error");
                    }
                  }}
                  onBulkDelete={onBulkDelete}
                  activeFileTypes={activeFilters.fileTypes}
                  onClearFilters={clearFilters} // Pass clear function
                />
              </div>
            </div>

          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center h-full" style={{ animation: "ccFadeIn 0.3s ease-out both" }}>
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: T.orangeLight, border: `1.5px dashed ${T.orange}40` }}>
                <FileText size={22} style={{ color: T.orange }} strokeWidth={1.5} />
              </div>
              <h3 className="text-[16px] font-bold mb-1.5 tracking-tight" style={{ color: T.textMain }}>It's quiet here</h3>
              <p className="text-[12px] font-medium mb-5 max-w-[240px] leading-relaxed" style={{ color: T.textMuted }}>Start by adding resources to organise your course content.</p>
              {activeTab === "I_Do" && (
                <button onClick={onResourceModalOpen}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[11px] font-bold text-white"
                  style={{ background: T.orange, boxShadow: `0 4px 12px ${T.orangeGlow}`, transition: "all 0.18s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.orangeDark; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.orange; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
                  <Plus size={13} strokeWidth={2.5} />Add Resource
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {editingPage && (
        <PageCreationModal
          onBack={() => setEditingPage(null)}
          isEditing={true}
          onConfirm={async (payload) => {
            if (!selectedNode || !activeTab) return;
            try {
              await entityApi.updatePage(
                (selectedNode.type ?? hierarchyInfo?.nodeType) as
                  "module" | "submodule" | "topic" | "subtopic",
                selectedNode.id,
                editingPage.id,
                {
                  title: payload.pages[0]?.name ?? editingPage.title,
                  blocks: payload.pages[0]?.blocks,
                  htmlContent: payload.combinedHtml,
                  pages: payload.pages,
                  tabType: activeTab,
                  subcategory: activeSubcategory,
                  folderPath: folderNavState.currentFolderPath ?? [],
                }
              );

              setLocalPageOverrides(prev => ({
                ...prev,
                [editingPage.id]: {
                  combinedCode: payload.combinedHtml,
                  title: payload.pages[0]?.name ?? editingPage.title,
                  blocks: payload.pages[0]?.blocks ?? [],
                  pageCount: payload.pages.length ?? 1,
                },
              }));

              setEditingPage(null);
              setViewingPage(null);
              onPageCreated?.();
              showToast("Page updated successfully");

            } catch (e) {
              console.error("Failed to update page:", e);
              showToast("Failed to save edits.", "error");
            }
          }}
          initialTitle={editingPage.title}
          initialBlocks={editingPage.blocks}
          hierarchyInfo={hierarchyInfo}
        />
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            borderRadius: 12,
            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: toast.type === "success"
              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
              : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            boxShadow: toast.type === "success"
              ? "0 8px 24px rgba(16,185,129,0.35)"
              : "0 8px 24px rgba(239,68,68,0.35)",
            animation: "toastSlideIn 0.25s cubic-bezier(0.16,1,0.3,1) both",
            minWidth: 220,
            maxWidth: 360,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            {toast.type === "success" ? "✓" : "✕"}
          </div>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              flexShrink: 0,
              background: "rgba(255,255,255,0.20)",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              cursor: "pointer",
              padding: "2px 7px",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.6,
            }}
          >
            ✕
          </button>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              height: 3,
              borderRadius: "0 0 12px 12px",
              background: "rgba(255,255,255,0.45)",
              animation: "toastProgress 3s linear forwards",
            }}
          />
        </div>
      )}

      <style jsx global>{`
        @keyframes ccFadeIn  { from { opacity:0; transform:translateY(8px)  } to { opacity:1; transform:translateY(0)  } }
        @keyframes ccDropIn  { from { opacity:0; transform:scale(.95) translateY(-4px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes ccBadgeUp { from { opacity:0; transform:translateY(3px)  } to { opacity:1; transform:translateY(0)  } }
        @keyframes ivBounce  { from { transform:translateY(0); opacity:0.4  } to { transform:translateY(-5px); opacity:1 } }
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  );
};

// FolderBreadcrumbBar component
const FolderBreadcrumbBar: React.FC<{
  folderNavState: FolderNavState;
  onNavigateUp: () => void;
  onNavigateToRoot?: () => void;
  onNavigateToFolderLevel?: (folderName: string, index: number) => void;
}> = ({ folderNavState, onNavigateUp, onNavigateToRoot, onNavigateToFolderLevel }) => {
  const folderPath = folderNavState.currentFolderPath || [];

  return (
    <div
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 mb-3"
      style={{
        background: T.warm,
        borderBottom: `1px solid ${T.border}`,
        borderLeft: `3px solid ${T.orange}`,
        borderRadius: '8px',
      }}
    >
      <button
        onClick={onNavigateUp}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all"
        style={{
          background: T.bg,
          color: T.textSub,
          border: `1px solid ${T.border}`,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = T.orange;
          (e.currentTarget as HTMLElement).style.color = T.orange;
          (e.currentTarget as HTMLElement).style.background = T.orangeLight;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = T.border;
          (e.currentTarget as HTMLElement).style.color = T.textSub;
          (e.currentTarget as HTMLElement).style.background = T.bg;
        }}
      >
        <ArrowLeft size={12} strokeWidth={2.5} />
        Back
      </button>

      <div className="w-px h-5" style={{ background: T.border }} />
      <Folder size={14} style={{ color: T.orange }} />

      <div className="flex items-center gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => onNavigateToRoot?.()}
          className="flex-shrink-0 text-[10.5px] font-semibold px-1.5 py-0.5 rounded transition-all cursor-pointer"
          style={{
            color: folderPath.length === 0 ? T.orange : T.textHint,
            background: folderPath.length === 0 ? T.orangeLight : 'transparent',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = T.orange;
            (e.currentTarget as HTMLElement).style.background = T.orangeLight;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = folderPath.length === 0 ? T.orange : T.textHint;
            (e.currentTarget as HTMLElement).style.background = folderPath.length === 0 ? T.orangeLight : 'transparent';
          }}
        >
          Root
        </button>

        {folderPath.map((segment, idx) => {
          const isLast = idx === folderPath.length - 1;
          return (
            <div key={idx} className="flex items-center gap-1 flex-shrink-0">
              <ChevronRight size={9} style={{ color: T.textHint }} />
              <button
                onClick={() => !isLast && onNavigateToFolderLevel?.(segment, idx)}
                className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded max-w-[120px] truncate transition-all"
                style={{
                  color: isLast ? T.orange : T.textSub,
                  background: isLast ? T.orangeLight : "transparent",
                  border: isLast ? `1px solid ${T.orange}20` : "1px solid transparent",
                  cursor: isLast ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isLast) {
                    (e.currentTarget as HTMLElement).style.color = T.orange;
                    (e.currentTarget as HTMLElement).style.background = T.orangeLight;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLast) {
                    (e.currentTarget as HTMLElement).style.color = T.textSub;
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }
                }}
              >
                {segment}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex-shrink-0 ml-auto">
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full"
          style={{
            background: T.orangeLight,
            color: T.orange,
          }}
        >
          {folderPath.length > 0 ? 'Folder' : 'Root'}
        </span>
      </div>
    </div>
  );
};