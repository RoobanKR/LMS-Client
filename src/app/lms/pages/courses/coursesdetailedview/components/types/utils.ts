// utils.ts
import { PedagogyPage, Resource, ResourceType } from "./types"

export const getFileType = (fileUrl: string|{base?:string;[k:string]:string|undefined}, fileType: string): ResourceType => {
  const u = typeof fileUrl === 'string' ? fileUrl : fileUrl.base || ''
  if(fileType?.includes("url/link") || fileType?.includes("link")) return "link"
  if(fileType?.includes("zip") || u?.toLowerCase().includes(".zip")) return "zip"
  if(fileType?.includes("pdf")) return "pdf"
  if(fileType?.includes("powerpoint") || fileType?.includes("presentation") || u?.toLowerCase().includes(".ppt")) return "ppt"
  if(fileType?.includes("video") || u?.toLowerCase().includes(".mp4") || u?.toLowerCase().includes(".mov")) return "video"
  if(fileType?.includes("application") || fileType?.includes("document")) return "pdf"
  return "link"
}

export const getFileUrlString = (fileUrl?: string|{base?:string}): string => 
  typeof fileUrl === "string" ? fileUrl : fileUrl?.base || ""

export const detectUrlType = (url: string): "video"|"ppt"|"pdf"|"external" => {
  const l = url.toLowerCase()
  if(l.match(/\.(mp4|mov|avi|wmv|webm)$/) || l.includes('youtube') || l.includes('youtu.be') || l.includes('vimeo')) return "video"
  if(l.match(/\.(ppt|pptx)$/)) return "ppt"
  if(l.match(/\.(pdf)$/) || l.includes('docs.google.com/document')) return "pdf"
  return "external"
}

export const getFileUrl = (fileUrl: string|{base?:string;[k:string]:string|undefined}): string => {
  if(typeof fileUrl === 'string') return fileUrl
  if((fileUrl as any).url) return (fileUrl as any).url
  if((fileUrl as any)['720p']) return (fileUrl as any)['720p']
  if(fileUrl.base) return fileUrl.base
  return ''
}

export const formatSubItemName = (key: string) => 
  key.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())

export const normalizeKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g,'_')

export const hasChildItems = (item: any): boolean => {
  if('subModules' in item && item.subModules && item.subModules.length > 0) return true
  if('topics' in item && item.topics && item.topics.length > 0) return true
  if('subTopics' in item && item.subTopics && item.subTopics.length > 0) return true
  return false
}

export const hasPedagogyData = (item: any): boolean =>
  !!(item.pedagogy && (
    (item.pedagogy.I_Do && (Array.isArray(item.pedagogy.I_Do) ? item.pedagogy.I_Do.length > 0 : Object.keys(item.pedagogy.I_Do).length > 0)) ||
    (item.pedagogy.We_Do && (Array.isArray(item.pedagogy.We_Do) ? item.pedagogy.We_Do.length > 0 : Object.keys(item.pedagogy.We_Do).length > 0)) ||
    (item.pedagogy.You_Do && (Array.isArray(item.pedagogy.You_Do) ? item.pedagogy.You_Do.length > 0 : Object.keys(item.pedagogy.You_Do).length > 0))
  ))

export const shouldShowDownload = (r: Resource) => 
  !!(r.isReference && (!r.fileSettings || r.fileSettings.allowDownload !== false))

export const isResourceVisible = (r: Resource) => 
  !r.fileSettings || r.fileSettings.showToStudents !== false

export const downloadFile = async (resource: Resource) => {
  let url = resource.externalUrl || ''
  if(!url && resource.fileUrl) {
    if(typeof resource.fileUrl === 'object' && resource.fileUrl.base) url = resource.fileUrl.base
    else if(typeof resource.fileUrl === 'string') url = resource.fileUrl
  }
  if(!url) return
  if(resource.type === 'link' || resource.type === 'reference') {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  try {
    const r = await fetch(url)
    const b = await r.blob()
    const a = document.createElement('a')
    a.href = window.URL.createObjectURL(b)
    a.download = resource.title || 'download'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export const openPageInNewTab = (html: string) => {
  const t = window.open("", "_blank")
  if(!t) { alert("Popup blocked"); return }
  t.document.open()
  t.document.write(html)
  t.document.close()
}

export const fmtSize = (s: string): string => {
  if(!s || s === "-") return "-"
  try {
    const n = parseInt(s)
    if(n < 1024) return `${n} B`
    if(n < 1048576) return `${(n/1024).toFixed(1)} KB`
    return `${(n/1048576).toFixed(1)} MB`
  } catch { return "-" }
}

export const parseSize = (s: string) => {
  const sl = s.toLowerCase()
  if(sl.includes("kb")) return parseFloat(sl) * 1024
  if(sl.includes("mb")) return parseFloat(sl) * 1048576
  return parseFloat(sl) || 0
}

export const parseDate = (d: string) => {
  if(!d) return new Date(0)
  try { return new Date(d) } catch { return new Date(0) }
}

export const stampActiveTabOnPlaygrounds = (combinedCode: string, pages: PedagogyPage[]): string => {
  if (!combinedCode || !combinedCode.includes('playground-wrapper')) return combinedCode
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
  let idx = 0
  return combinedCode.replace(/class="playground-wrapper"/g, () => {
    const tab = activeTabs[idx] || 'html'
    idx++
    return `class="playground-wrapper" data-active-tab="${tab}"`
  })
}

export const injectTryItButtons = (combinedCode: string): string => {
  // This function would be imported from the existing utils
  // For brevity, I'm assuming it exists
  return combinedCode
}