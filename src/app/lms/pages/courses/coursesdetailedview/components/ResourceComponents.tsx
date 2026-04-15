// components/ResourceComponents.tsx
import React, { useState } from "react"
import { File, Folder, Layout, Video, Presentation, FileText, Archive, Link, Download, ChevronUp, ChevronDown } from "lucide-react"
import { T, RES_COLOR, RES_LABEL } from "./types/constants"
import { Resource, ResourceType, SortConfig, SortField } from "./types/types"
import { fmtSize, parseDate, parseSize, shouldShowDownload, isResourceVisible } from "./types/utils"

// Export ResIcon so it can be used in page.tsx
export const ResIcon = ({type, size = 14}: {type: string; size?: number}) => {
  const p = {size, strokeWidth: 2}
  if(type === "page") return <Layout {...p}/>
  if(type === "video") return <Video {...p}/>
  if(type === "ppt") return <Presentation {...p}/>
  if(type === "pdf") return <FileText {...p}/>
  if(type === "zip") return <Archive {...p}/>
  if(type === "link") return <Link {...p}/>
  if(type === "folder") return <Folder {...p}/>
  return <File {...p}/>
}

export const ResourceItem = ({resource, index, onClick, onDownload}: {
  resource: Resource; index: number; onClick: (r: Resource) => void; onDownload?: (r: Resource, e: React.MouseEvent) => void
}) => {
  const [tip, setTip] = useState(false)
  if(!isResourceVisible(resource)) return null
  const isPage = resource.type === "page"
  const odd = index % 2 !== 0
  const col = resource.isFolder ? T.textMuted : RES_COLOR[resource.type] || T.textMuted
  const fmtDate = (d: string) => { if(!d) return '—'; try{ return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) } catch{ return '—' } }
  
  return (
    <div onClick={() => onClick(resource)} style={{display:'flex',alignItems:'center',padding:'9px 14px',cursor:'pointer',background:isPage?(odd?'rgba(99,102,241,0.04)':'rgba(99,102,241,0.02)'):(odd?T.surface:T.bg),borderBottom:`1px solid ${T.line}`,transition:'background .12s'}}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = isPage ? 'rgba(99,102,241,0.10)' : T.orangeTint}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isPage ? (odd?'rgba(99,102,241,0.04)':'rgba(99,102,241,0.02)') : (odd?T.surface:T.bg)}>
      <div style={{flexShrink:0,width:28,height:28,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:`${col}14`,marginRight:10}}>
        {resource.isFolder ? <Folder size={14} style={{color:T.inkMuted}}/> : <ResIcon type={resource.type} size={14}/>}
      </div>
      <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        <span style={{fontSize:'12.5px',fontWeight:600,color:isPage?'#4f46e5':T.textMain,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {resource.title}
          {resource.isFolder && <span style={{fontWeight:400,fontSize:'11px',color:T.textMuted,marginLeft:4}}>({resource.folderContents?.length||0} items)</span>}
        </span>
        {isPage && <span style={{padding:'1px 6px',borderRadius:4,fontSize:'9.5px',fontWeight:700,background:'rgba(99,102,241,.12)',color:'#4f46e5',border:'1px solid rgba(99,102,241,.25)'}}>PAGE</span>}
        {resource.isReference && !isPage && (
          <span style={{padding:'1px 8px',borderRadius:4,fontSize:'9.5px',fontWeight:600,background:'rgba(59,130,246,0.12)',color:'#3b82f6',border:'1px solid rgba(59,130,246,0.25)',letterSpacing:'0.3px'}}>Reference</span>
        )}
        {!resource.isReference && resource.type === "pdf" && !isPage && (
          <span style={{padding:'1px 6px',borderRadius:4,fontSize:'9.5px',fontWeight:600,background:'rgba(220,38,38,0.08)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.15)'}}>PDF</span>
        )}
        {!resource.isReference && resource.type === "ppt" && !isPage && (
          <span style={{padding:'1px 6px',borderRadius:4,fontSize:'9.5px',fontWeight:600,background:'rgba(249,115,22,0.08)',color:'#f97316',border:'1px solid rgba(249,115,22,0.15)'}}>PPT</span>
        )}
        {resource.originalFolder && !resource.isFolder && !isPage && <span style={{fontSize:'10px',color:T.textMuted}}>from: {resource.originalFolder}</span>}
        {resource.tags && resource.tags.length > 0 && resource.tags.map((tag, ti) => (
          <span key={ti} style={{padding:'1px 7px',borderRadius:20,fontSize:'9.5px',fontWeight:600,background: tag.tagColor + '18',color: tag.tagColor,border: `1px solid ${tag.tagColor}35`,flexShrink: 0}}>{tag.tagName}</span>
        ))}
      </div>
      {isPage && (
        <button type="button" onClick={e => { e.stopPropagation(); const t = window.open("", "_blank"); if(t){ t.document.open(); t.document.write(resource._combinedCode || ""); t.document.close() } }}
          style={{flexShrink:0,display:'flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:7,background:'rgba(99,102,241,.10)',color:'#4f46e5',border:'1px solid rgba(99,102,241,.22)',fontSize:'11px',fontWeight:700,cursor:'pointer',marginRight:8}}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,.20)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,.10)'}>
          <Link size={11}/><span>Open</span>
        </button>
      )}
      {!resource.isFolder && !isPage && shouldShowDownload(resource) && (
        <div style={{position:'relative',marginRight:4}}>
          <button onClick={e => { e.stopPropagation(); if(onDownload) onDownload(resource, e) }}
            onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}
            style={{padding:5,borderRadius:7,border:'none',background:'transparent',cursor:'pointer',color:T.inkMuted}}>
            <Download size={13}/>
          </button>
          {tip && <div style={{position:'absolute',top:'100%',right:0,marginTop:2,padding:'2px 8px',borderRadius:5,background:T.ink,color:'#fff',fontSize:'10px',whiteSpace:'nowrap',zIndex:10,pointerEvents:'none'}}>Download</div>}
        </div>
      )}
      <span style={{width:52,textAlign:'right',fontSize:'10.5px',color:T.textMuted,flexShrink:0}}>
        {isPage ? (resource._pageCount ? `${resource._pageCount} pg` : '1 pg') : (resource.fileSize || '—')}
      </span>
      <span style={{width:90,textAlign:'right',fontSize:'10.5px',color:T.textMuted,flexShrink:0}}>{fmtDate(resource.uploadedAt || "")}</span>
    </div>
  )
}

export const SortHeader = ({onSort, cfg}: {onSort: (f: SortField) => void; cfg: SortConfig}) => {
  const ind = (f: SortField) => cfg.field !== f
    ? <span style={{display:'inline-flex',flexDirection:'column',marginLeft:2,gap:0}}><ChevronUp size={8} style={{color:T.textHint}}/><ChevronDown size={8} style={{color:T.textHint}}/></span>
    : cfg.direction === 'asc' ? <ChevronUp size={11} style={{color:T.orange,marginLeft:2}}/> : <ChevronDown size={11} style={{color:T.orange,marginLeft:2}}/>
  
  const btn = (label: string, f: SortField, extra: React.CSSProperties = {}) => (
    <button onClick={() => onSort(f)} style={{display:'flex',alignItems:'center',background:'none',border:'none',cursor:'pointer',fontSize:'11px',fontWeight:600,color:cfg.field===f?T.orange:T.textMuted,padding:'4px 0',...extra}}>
      {label}{ind(f)}
    </button>
  )
  
  return (
    <div style={{display:'flex',alignItems:'center',padding:'7px 14px',background:T.surface,borderBottom:`1px solid ${T.line}`,position:'sticky',top:0,zIndex:10}}>
      {btn("Name","name",{flex:1})}
      {btn("Size","size",{width:52,justifyContent:'flex-end'})}
      {btn("Date","date",{width:90,justifyContent:'flex-end'})}
    </div>
  )
}

export const EmptyCard = ({icon: Icon, title, sub}: {icon: React.ComponentType<any>; title: string; sub: string}) => (
  <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{textAlign:'center',padding:32,borderRadius:20,background:T.bg,border:`1.5px solid ${T.border}`,maxWidth:300}}>
      <div style={{width:40,height:40,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',background:T.orangeTint}}><Icon size={18} style={{color:T.orange}}/></div>
      <p style={{fontWeight:700,fontSize:13,color:T.textMain,margin:'0 0 4px'}}>{title}</p>
      <p style={{fontSize:12,color:T.textMuted,margin:0}}>{sub}</p>
    </div>
  </div>
)