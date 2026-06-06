// page.tsx - Main component
"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  ChevronLeft, ChevronRightIcon, Folder, File, Target, BookOpen, Code,
  Loader2, LayoutDashboard, BookMarked, GraduationCap, ChevronLeft as ChevronLeftIcon,
} from "lucide-react"
import VideoPlayer from "../../../../component/student/video-player"
import PDFViewer from "../../../../component/student/pdf-viewer"
import PPTViewer from "../../../../component/student/ppt-viewer"
import { useParams, useRouter } from "next/navigation"
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

// Import all split components and types
import { T, METHOD_CFG, RES_COLOR, RES_LABEL } from "../components/types/constants"
import { TopBar } from "../components/TopBar"
import { Sidebar, SidebarHeader } from "../components/Sidebar"
import { TabBar } from "../components/TabBar"
import { ResourceItem, SortHeader, EmptyCard, ResIcon } from "../components/ResourceComponents"
import { 
  CourseData, SelectedItem, SelectedItemType, Resource, ResourceType, 
  SortConfig, PedagogyPage, PedagogyFolder, PedagogyFile, LearningElement,
  PedagogySubItem
} from "../components/types/types"
import {
  getFileType, getFileUrl, getFileUrlString, formatSubItemName, normalizeKey,
  hasChildItems, hasPedagogyData, shouldShowDownload, downloadFile, openPageInNewTab,
  fmtSize, parseSize, parseDate, stampActiveTabOnPlaygrounds, detectUrlType
} from "../components/types/utils"

// Main component
export default function LMSPage() {
  const params = useParams()
  const router = useRouter()
  const { resolvedTheme } = useNextTheme()
  const courseId = params?.id as string
  const save = (k: string, v: string) => { if(typeof window !== 'undefined') localStorage.setItem(k, v) }
  const load = (k: string) => { if(typeof window !== 'undefined') return localStorage.getItem(k); return null }

  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>(() => load('lms_student_selected_method') || "")
  const [selectedActivity, setSelectedActivity] = useState<string>(() => load('lms_student_selected_activity') || "")
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedSubModules, setExpandedSubModules] = useState<Set<string>>(new Set())
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [currentHierarchy, setCurrentHierarchy] = useState<string[]>([])
  const [activeViewer, setActiveViewer] = useState<{type:"video"|"pdf"|"ppt"|"zip"|null; resource: Resource | null}>({type:null, resource:null})
  const [currentFolder, setCurrentFolder] = useState<Resource | null>(null)
  const [folderPath, setFolderPath] = useState<Resource[]>([])
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType | "all">("pdf")
  const [userSelectedResourceType, setUserSelectedResourceType] = useState<boolean>(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({field:"name", direction:"asc"})
  const [selectedExercise, setSelectedExercise] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarSearch, setSidebarSearch] = useState("")
  const [inlinePageIndex, setInlinePageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [activeSubcategory, setActiveSubcategory] = useState<string>("")

  // Expand/Collapse All functions
  const expandAll = useCallback(() => {
    if (!courseData?.modules) return
    
    const allModuleIds = new Set<string>()
    const allSubModuleIds = new Set<string>()
    const allTopicIds = new Set<string>()
    
    courseData.modules.forEach(m => {
      allModuleIds.add(m._id)
      if (m.subModules) {
        m.subModules.forEach(sm => {
          allSubModuleIds.add(sm._id)
          if (sm.topics) {
            sm.topics.forEach(t => {
              allTopicIds.add(t._id)
            })
          }
        })
      }
      if (m.topics) {
        m.topics.forEach(t => {
          allTopicIds.add(t._id)
        })
      }
    })
    
    setExpandedModules(allModuleIds)
    setExpandedSubModules(allSubModuleIds)
    setExpandedTopics(allTopicIds)
  }, [courseData])

  const collapseAll = useCallback(() => {
    setExpandedModules(new Set())
    setExpandedSubModules(new Set())
    setExpandedTopics(new Set())
  }, [])

  // Helper functions (same as original)
  const learningElements = (): LearningElement[] => {
    const cp = { I_Do: courseData?.I_Do, We_Do: courseData?.We_Do, You_Do: courseData?.You_Do }
    if(!cp || (!cp.I_Do && !cp.We_Do && !cp.You_Do)) return []
    const create = (type: "i-do"|"we-do"|"you-do", ped: Record<string, any> | string[] | undefined): LearningElement => {
      const subs: PedagogySubItem[] = []
      if(ped) {
        if(Array.isArray(ped)) {
          ped.forEach((item, i) => {
            const key = typeof item === 'string' ? item.toLowerCase().replace(/\s+/g,'_') : `item_${i}`
            const name = typeof item === 'string' ? item : `Activity ${i+1}`
            let ar: PedagogySubItem = {key, name, description:'', files:[], folders:[], links:[]}
            if(selectedItem?.pedagogy) {
              const pk = type === 'i-do' ? 'I_Do' : type === 'we-do' ? 'We_Do' : 'You_Do'
              const tp = selectedItem.pedagogy[pk]
              if(tp && typeof tp === 'object' && !Array.isArray(tp)) {
                const ak = Object.keys(tp).find(k => normalizeKey(k) === normalizeKey(key))
                if(ak) {
                  const ad = tp[ak]
                  if(ad && typeof ad === 'object' && (ad.files || ad.folders || ad.links)) {
                    ar = {key, name, description: ad.description || '', files: ad.files || [], folders: ad.folders || [], links: ad.links || []}
                  }
                }
              }
            }
            subs.push(ar)
          })
        } else if(typeof ped === 'object') {
          if(type === 'we-do' && Array.isArray(courseData?.We_Do)) {
            courseData!.We_Do.forEach((n: string) => subs.push({key: n.toLowerCase().replace(/\s+/g,'_'), name:n, description:'', files:[], folders:[], links:[]}))
          } else {
            Object.entries(ped).forEach(([key, item]) => {
              if(item) subs.push({key, name: formatSubItemName(key), description: item.description || '', files: item.files || [], folders: item.folders || [], links: item.links || []})
            })
          }
        }
      }
      const mc = METHOD_CFG[type]
      return {id: type, title: mc.label, type, icon: Target, color: mc.color, subItems: subs}
    }
    return [create("i-do", cp.I_Do), create("we-do", cp.We_Do), create("you-do", cp.You_Do)]
  }

  const subcategories = useMemo(() => {
    const elements = learningElements()
    return {
      I_Do: elements.find(e => e.id === "i-do")?.subItems.map(s => ({ key: s.key, label: s.name, icon: <div />, component: s })) || [],
      We_Do: elements.find(e => e.id === "we-do")?.subItems.map(s => ({ key: s.key, label: s.name, icon: <div />, component: s })) || [],
      You_Do: elements.find(e => e.id === "you-do")?.subItems.map(s => ({ key: s.key, label: s.name, icon: <div />, component: s })) || [],
    }
  }, [selectedItem])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const method = tab === "I_Do" ? "i-do" : tab === "We_Do" ? "we-do" : "you-do"
    setSelectedMethod(method)
    setSelectedActivity("")
    setUserSelectedResourceType(false)
  }

  const handleSubcategoryChange = (sub: string, component: any) => {
    setActiveSubcategory(sub)
    setSelectedActivity(sub)
    setUserSelectedResourceType(false)
  }

  useEffect(() => {
    if(selectedMethod) {
      const tab = selectedMethod === "i-do" ? "I_Do" : selectedMethod === "we-do" ? "We_Do" : "You_Do"
      setActiveTab(tab)
    } else {
      setActiveTab(null)
    }
    setActiveSubcategory(selectedActivity)
  }, [selectedMethod, selectedActivity])

  const closeAllViewers = () => setActiveViewer({type: null, resource: null})
  const openViewer = (type: "video"|"pdf"|"ppt"|"zip", resource: Resource) => setActiveViewer({type, resource})

  // Data fetching
  useEffect(() => {
    if(!courseId) { setError("No course ID."); setIsLoading(false); return }
    fetch(`https://lms-server-ym1q.onrender.com/getAll/courses-data/${courseId}`)
      .then(r => r.json()).then(d => {
        const info = d.data || d
        setCourseData(info)
        if(!load('lms_student_selected_node_id')) {
          setIsLoading(false)
          if(info.modules?.length > 0) setExpandedModules(new Set([info.modules[0]._id]))
        }
      }).catch(e => { setError(e.message || "Error"); setIsLoading(false) })
  }, [courseId])

  const getStudentAnswers = useCallback((): Record<string, any> | undefined => {
    if(!courseData?.singleParticipants || !Array.isArray(courseData.singleParticipants)) return undefined
    let currentUserId: string | undefined
    try {
      const { valid, user: tokenUser } = userPermission()
      if(valid && tokenUser?._id) currentUserId = tokenUser._id
    } catch {}
    if(!currentUserId) {
      currentUserId = localStorage.getItem('smartcliff_userId') || undefined
    }
    if(!currentUserId) {
      try {
        const raw = localStorage.getItem('smartcliff_userData')
        if(raw) { const u = JSON.parse(raw); currentUserId = u?._id }
      } catch {}
    }
    if(!currentUserId) return undefined
    const participant = courseData.singleParticipants.find((p: any) => p.user?._id === currentUserId)
    if(!participant) return undefined
    const courseEntry = participant.user?.courses?.find((c: any) => c.courseId === courseId)
    return courseEntry?.answers ?? undefined
  }, [courseData, courseId])

  const handleItemSelect = useCallback((itemId: string, itemTitle: string, itemType: SelectedItemType, hierarchyIds: string[], pedagogy?: any) => {
    if(selectedItem?.id === itemId) return
    save('lms_student_selected_node_id', itemId)
    const findLabel = (id: string): string => {
      if(!courseData?.modules) return "Unknown"
      for(const m of courseData.modules) {
        if(m._id === id) return m.title
        if(m.subModules) for(const sm of m.subModules) { if(sm._id === id) return sm.title; if(sm.topics) for(const t of sm.topics) { if(t._id === id) return t.title; if(t.subTopics) for(const st of t.subTopics) if(st._id === id) return st.title } }
        if(m.topics) for(const t of m.topics) { if(t._id === id) return t.title; if(t.subTopics) for(const st of t.subTopics) if(st._id === id) return st.title }
      }
      return "Unknown"
    }
    setCurrentHierarchy(hierarchyIds.map(findLabel))
    setSelectedItem({id: itemId, title: itemTitle, type: itemType, hierarchy: hierarchyIds, pedagogy})
    if(selectedItem?.hierarchy[0] !== hierarchyIds[0]) { setSelectedMethod(""); setSelectedActivity("") }
    setCurrentFolder(null)
    setFolderPath([])
    closeAllViewers()
    setUserSelectedResourceType(false)
    setSortConfig({field:"name", direction:"asc"})
  }, [courseData, selectedItem])

  // Restore selected node from localStorage
  useEffect(() => {
    if(!courseData?.modules) return
    if(selectedItem) { setIsLoading(false); return }
    const nid = load('lms_student_selected_node_id')
    const sm = load('lms_student_selected_method')
    const sa = load('lms_student_selected_activity')
    if(nid) {
      const restore = (id: string, title: string, type: SelectedItemType, hier: string[], ped?: any) => {
        handleItemSelect(id, title, type, hier, ped)
        if(sm && sa) setTimeout(() => { setSelectedMethod(sm); setSelectedActivity(sa) }, 100)
      }
      const walk = (modules: Module[]): boolean => {
        for(const m of modules) {
          if(m._id === nid) { restore(m._id, m.title, "module", [m._id], m.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); return true }
          if(m.subModules) for(const sub of m.subModules) {
            if(sub._id === nid) { restore(sub._id, sub.title, "submodule", [m._id, sub._id], sub.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); return true }
            if(sub.topics) for(const t of sub.topics) {
              if(t._id === nid) { restore(t._id, t.title, "topic", [m._id, sub._id, t._id], t.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
              if(t.subTopics) for(const st of t.subTopics) if(st._id === nid) { restore(st._id, st.title, "subtopic", [m._id, sub._id, t._id, st._id], st.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
            }
          }
          if(m.topics) for(const t of m.topics) {
            if(t._id === nid) { restore(t._id, t.title, "topic", [m._id, t._id], t.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
            if(t.subTopics) for(const st of t.subTopics) if(st._id === nid) { restore(st._id, st.title, "subtopic", [m._id, t._id, st._id], st.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
          }
        }
        return false
      }
      walk(courseData.modules as any)
    }
    setIsLoading(false)
  }, [courseData, handleItemSelect, selectedItem])
// Find this section where selectedMethod and selectedActivity changes are handled
// Add a useEffect to automatically select the first available resource type

useEffect(() => {
  if (selectedMethod && selectedActivity && selectedItem?.pedagogy) {
    // Reset resource type selection when activity changes
    const avail = getAvailableResourceTypes();
    if (avail.length > 0 && !userSelectedResourceType) {
      // Auto-select the first available resource type
      setSelectedResourceType(avail[0]);
    } else if (avail.length === 0) {
      setSelectedResourceType("all");
    }
  }
}, [selectedMethod, selectedActivity, selectedItem?.pedagogy]);
  // Resource extraction functions
  const getFolders = (): Resource[] => {
    if(!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = { "i-do": "I_Do", "we-do": "We_Do", "you-do": "You_Do" }
    const tk = mk[selectedMethod]
    if(!tk) return []
    const cat = selectedItem.pedagogy[tk]
    if(!cat || typeof cat !== "object" || Array.isArray(cat)) return []
    const fk = Object.keys(cat).find(k => normalizeKey(k) === normalizeKey(selectedActivity))
    if(!fk) return []
    const ad = (cat as any)[fk] as any
    if(!ad?.folders?.length) return []
    return ad.folders.map((folder: any) => ({
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

  const extractAllFilesFromFolders = (folders: any[]): Resource[] => {
    const all: Resource[] = []
    const proc = (folder: any) => {
      folder.files?.forEach((file: any) => {
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
          availableResolutions: file.availableResolutions || [],
          fileUrlMap: typeof file.fileUrl === 'object' && file.fileUrl !== null ? file.fileUrl : {},
          mcqQuestions: (file as any).mcqQuestions || [],
          tags: file.tags || [],
        }
        if(ft === 'link') r.externalUrl = getFileUrl(file.fileUrl)
        else r.fileUrl = getFileUrl(file.fileUrl)
        all.push(r)
      })
      folder.subfolders?.forEach((sf: any) => proc(sf))
    }
    folders.forEach(f => proc(f))
    return all
  }

  const getResourcesByType = (type: ResourceType): Resource[] => {
    if(!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    if(type === "page") {
      return getPagesForActivity().map(p => ({
        id: p._id,
        title: p.title,
        type: "page" as ResourceType,
        fileUrl: "",
        fileSize: p.pageCount ? `${p.pageCount} pg` : "1 pg",
        uploadedAt: p.createdAt || "",
        _combinedCode: p.combinedCode,
        _pageCount: p.pageCount || 1,
      }))
    }
    const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = { "i-do": "I_Do", "we-do": "We_Do", "you-do": "You_Do" }
    const tk = mk[selectedMethod]
    if(!tk) return []
    const cat = selectedItem.pedagogy[tk]
    if(!cat || typeof cat !== "object" || Array.isArray(cat)) return []
    const fk = Object.keys(cat).find(k => normalizeKey(k) === normalizeKey(selectedActivity))
    if(!fk) return []
    const ad = (cat as any)[fk] as any
    if(!ad) return []
    const dfs: Resource[] = (ad.files || [])
      .filter((f: any) => (!f.fileSettings || f.fileSettings.showToStudents !== false) && (type === "reference" ? f.isReference === true : getFileType(f.fileUrl, f.fileType) === type && !f.isReference))
      .map((f: any) => {
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
          availableResolutions: f.availableResolutions || [],
          fileUrlMap: typeof f.fileUrl === 'object' && f.fileUrl !== null ? f.fileUrl : {},
          mcqQuestions: (f as any).mcqQuestions || [],
          tags: f.tags || [],
        }
        if(ft === "link") r.externalUrl = getFileUrl(f.fileUrl)
        else r.fileUrl = getFileUrl(f.fileUrl)
        return r
      })
    const links: Resource[] = type === "link" ? (ad.links || []).map((l: any) => ({
      id: l._id || `l-${Math.random().toString(36).substr(2, 5)}`,
      title: l.name,
      type: "link" as ResourceType,
      externalUrl: l.url,
      uploadedAt: l.uploadedAt,
      fileSettings: { showToStudents: true, allowDownload: true },
    })) : []
    if(type === "link") return [...dfs.filter(f => f.type === "link"), ...links]
    return dfs
  }

  const getPagesForActivity = (): PedagogyPage[] => {
    if(!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = { "i-do": "I_Do", "we-do": "We_Do", "you-do": "You_Do" }
    const tk = mk[selectedMethod]
    if(!tk) return []
    const cat = selectedItem.pedagogy[tk]
    if(!cat || typeof cat !== 'object' || Array.isArray(cat)) return []
    const fk = Object.keys(cat).find(k => normalizeKey(k) === normalizeKey(selectedActivity))
    if(!fk) return []
    const ad = (cat as any)[fk]
    if(!ad || typeof ad !== 'object' || Array.isArray(ad)) return []
    return Array.isArray(ad.pages) ? ad.pages.filter((p: PedagogyPage) => p?._id && p?.title && p?.combinedCode) : []
  }

  const getExercisesForActivity = (): any[] => {
    if(!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    try {
      const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = { "i-do": "I_Do", "we-do": "We_Do", "you-do": "You_Do" }
      const tk = mk[selectedMethod]
      if(!tk) return []
      const cat = selectedItem.pedagogy[tk]
      if(!cat || typeof cat !== 'object') return []
      const tKey = normalizeKey(selectedActivity)
      if(Array.isArray((cat as any)[tKey])) return (cat as any)[tKey]
      const fk = Object.keys(cat).find(k => normalizeKey(k) === tKey)
      if(fk) { const d = (cat as any)[fk]; if(Array.isArray(d)) return d }
      return []
    } catch { return [] }
  }

  const getAllResources = (): Resource[] => {
    const all: Resource[] = []
    const types: ResourceType[] = ["page", "pdf", "ppt", "video", "zip", "link", "reference"]
    types.forEach(t => all.push(...getResourcesByType(t)))
    return all
  }

  const getAvailableResourceTypes = (): ResourceType[] => {
    if(!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    const types: ResourceType[] = []
    if(getPagesForActivity().length > 0) types.push("page")
    if(getFolders().length > 0) types.push("folder")
    const resourceTypes: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "reference"]
    resourceTypes.forEach(t => { if(getResourcesByType(t).length > 0) types.push(t) })
    return types
  }

  const resourcesToDisplay = (() => {
    if(selectedResourceType === "folder") return getFolders()
    if(selectedResourceType === "all") return [...getAllResources(), ...getFolders()]
    return getResourcesByType(selectedResourceType)
  })()

  const getFilteredFolderContents = (): Resource[] => {
    if(!currentFolder?.folderContents) return []
    return [...currentFolder.folderContents]
  }

  const handleResourceClick = async (resource: Resource) => {
    closeAllViewers()
    if(resource.isFolder && resource.folderContents) {
      setCurrentFolder(resource)
      setFolderPath(p => [...p, resource])
      return
    }
    if(resource.type === "page") { openPageInNewTab(resource._combinedCode || ""); return }
    if(resource.isReference) {
      const aft = getFileType(resource.fileUrl || '', resource.fileName || '')
      if(aft === "video") { openViewer("video", resource); return }
      if(aft === "ppt") { openViewer("ppt", resource); return }
      if(aft === "pdf") { openViewer("pdf", resource); return }
      if(aft === "zip") { openViewer("zip", resource); return }
      let u = resource.externalUrl
      if(!u && resource.fileUrl) {
        if(typeof resource.fileUrl === 'object' && resource.fileUrl.base) u = resource.fileUrl.base
        else if(typeof resource.fileUrl === 'string') u = resource.fileUrl
      }
      if(u) window.open(u, '_blank', 'noopener,noreferrer')
      return
    }
    if(resource.type === "video") { openViewer("video", resource); return }
    if(resource.type === "ppt") { openViewer("ppt", resource); return }
    if(resource.type === "pdf") { openViewer("pdf", resource); return }
    if(resource.type === "zip") { openViewer("zip", resource); return }
    if(resource.type === "link") {
      let u = resource.externalUrl
      if(!u && resource.fileUrl) {
        if(typeof resource.fileUrl === 'object' && resource.fileUrl.base) u = resource.fileUrl.base
        else if(typeof resource.fileUrl === 'string') u = resource.fileUrl
      }
      if(u) {
        const ut = detectUrlType(u)
        if(ut === "video") openViewer("video", {...resource, fileUrl: u, type: "video"})
        else if(ut === "ppt") openViewer("ppt", {...resource, fileUrl: u, type: "ppt"})
        else if(ut === "pdf") openViewer("pdf", {...resource, fileUrl: u, type: "pdf"})
        else window.open(u, '_blank', 'noopener,noreferrer')
      }
    }
  }

  const handleDownloadClick = async (resource: Resource, e: React.MouseEvent) => {
    e.stopPropagation()
    if(!resource.isReference || resource.fileSettings?.allowDownload === false) return
    await downloadFile(resource)
  }

  const handleExerciseSelect = async (exercise: any) => {
    let qs: any[] = []
    if(exercise.questions && Array.isArray(exercise.questions)) qs = exercise.questions
    else if(exercise.exerciseInformation?.questions) qs = exercise.exerciseInformation.questions
    else if(exercise.data?.questions) qs = exercise.data.questions
    if(!qs.length) { toast.warning("Exercise not yet configured."); return }
    const mk: Record<string,string> = {'i-do':'I_Do','we-do':'We_Do','you-do':'You_Do'}
    const catP = mk[selectedMethod] || 'We_Do'
    const eid = exercise?._id
    const cname = courseData?.courseName || "Course"
    const stored = {...exercise, questions: qs, courseId, courseName: cname, context: {courseId, nodeId: selectedItem?.id, nodeTitle: selectedItem?.title, method: selectedMethod, activity: selectedActivity}, storedAt: new Date().toISOString()}
    const nav = (path: string, key: string, extra: Record<string,string> = {}) => {
      localStorage.setItem(key, JSON.stringify(stored))
      router.push(`/lms/pages/courses/coursesdetailedview/${path}?${new URLSearchParams({courseId, courseName: cname, exerciseId: eid || '', subcategory: selectedActivity || '', category: catP, questionCount: qs.length.toString(), ...extra})}`)
    }
    if(exercise.exerciseType === "Combined") nav('combined','currentCombinedExercise',{exerciseName: exercise.exerciseInformation?.exerciseName || 'Combined Exercise'})
    else if(exercise.programmingSettings?.selectedModule === 'Frontend') nav('frontend','currentFrontendExercise',{exerciseName: exercise.exerciseInformation?.exerciseName || 'Frontend Exercise', hierarchy: currentHierarchy.toString()})
    else if(exercise.programmingSettings?.selectedModule === 'Database') { toast.info("Opening SQL Exercise...",{autoClose:2000}); nav('sql','currentSQLExercise',{exerciseName: exercise.exerciseInformation?.exerciseName || 'SQL Exercise'}) }
    else if(exercise.exerciseType === "MCQ") nav('mcq','currentMCQExercise',{exerciseName: exercise.exerciseInformation?.exerciseName || 'MCQ Exercise', nodeId: selectedItem?.id || '', nodeName: selectedItem?.title || '', nodeType: selectedItem?.type || '', hierarchy: currentHierarchy.join(',')})
    else if(exercise.exerciseType === "Other") nav('others','currentOthersExercise',{exerciseName: exercise.exerciseInformation?.exerciseName || 'Other Exercise', nodeId: selectedItem?.id || '', nodeName: selectedItem?.title || '', nodeType: selectedItem?.type || '', hierarchy: currentHierarchy.join(',')})
    else setSelectedExercise(exercise)
  }

  const handleFolderBack = () => {
    const p = [...folderPath]
    p.pop()
    setFolderPath(p)
    setCurrentFolder(p.length ? p[p.length - 1] : null)
  }

  const buildBreadcrumbs = () => {
    const items: Array<{label: string; icon?: React.ComponentType<any>; onClick?: () => void; isLast?: boolean}> = []
    const clear = () => {
      localStorage.removeItem('lms_student_selected_node_id')
      localStorage.removeItem('lms_student_selected_method')
      localStorage.removeItem('lms_student_selected_activity')
      setSelectedItem(null)
      setSelectedMethod("")
      setSelectedActivity("")
      setCurrentFolder(null)
      setFolderPath([])
      closeAllViewers()
    }
    items.push({label: "Dashboard", icon: LayoutDashboard, onClick: () => { clear(); router.push('/lms/pages/studentdashboard') }})
    items.push({label: "Courses", icon: BookMarked, onClick: () => router.push('/lms/pages/courses')})
    if(courseData) items.push({label: courseData.courseName, icon: GraduationCap, onClick: clear})
    if(selectedItem && courseData) {
      const fl = (id: string): string => {
        for(const m of courseData.modules || []) {
          if(m._id === id) return m.title
          if(m.subModules) for(const sm of m.subModules) { if(sm._id === id) return sm.title; if(sm.topics) for(const t of sm.topics) { if(t._id === id) return t.title; if(t.subTopics) for(const st of t.subTopics) if(st._id === id) return st.title } }
          if(m.topics) for(const t of m.topics) { if(t._id === id) return t.title; if(t.subTopics) for(const st of t.subTopics) if(st._id === id) return st.title }
        }
        return "Unknown"
      }
      selectedItem.hierarchy.forEach((hid, i) => {
        const lbl = fl(hid)
        if(lbl === courseData.courseName) return
        items.push({label: lbl, isLast: i === selectedItem.hierarchy.length - 1})
      })
    }
    return items
  }

  const toggleModule = (id: string) => {
    const n = new Set(expandedModules)
    n.has(id) ? n.delete(id) : n.add(id)
    setExpandedModules(n)
  }
  const toggleSubModule = (id: string) => {
    const n = new Set(expandedSubModules)
    n.has(id) ? n.delete(id) : n.add(id)
    setExpandedSubModules(n)
  }
  const toggleTopic = (id: string) => {
    const n = new Set(expandedTopics)
    n.has(id) ? n.delete(id) : n.add(id)
    setExpandedTopics(n)
  }

  const preparePageContent = (page: PedagogyPage): string => {
    if(!page._combinedCode) return ''
    const pagesInActivity = getPagesForActivity()
    const stamped = stampActiveTabOnPlaygrounds(page._combinedCode, [page as any])
    return injectTryItButtons(stamped)
  }

  if(error) return <div>Error: {error}</div>
  if(isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" size={36} style={{color: T.orange}}/></div>

  return (
    <div style={{background: T.pageBg, fontFamily: "'Inter',-apple-system,sans-serif", overflow: 'clip', height: '100vh', display: 'flex', flexDirection: 'column'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sb-row{transition:background .12s ease;cursor:pointer}
        .sb-row:hover{background:rgba(0,0,0,.02)!important}
        .sb-scroll{scrollbar-width:thin;scrollbar-color:#E4E0ED transparent}
        .sb-scroll::-webkit-scrollbar{width:3px}
        .sb-scroll::-webkit-scrollbar-thumb{background:#E4E0ED;border-radius:3px}
        @keyframes sbSlide{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40}} className="lg:hidden"/>
      )}

      {/* Mobile sidebar */}
      <div style={{position: 'fixed', inset: '0 auto 0 0', width: 280, zIndex: 50, transform: sidebarOpen ? 'none' : 'translateX(-100%)', transition: 'transform .3s cubic-bezier(.4,0,.2,1)', background: T.bg, borderRight: `1.5px solid ${T.border}`, boxShadow: '4px 0 24px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column'}} className="lg:hidden">
        <SidebarHeader 
          courseName={courseData?.courseName || "Course"} 
          modulesCount={courseData?.modules?.length || 0} 
          sidebarSearch={sidebarSearch} 
          onSearchChange={setSidebarSearch}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
        />
        <button 
          onClick={() => setSidebarOpen(false)} 
          style={{
            position: 'absolute', 
            right: 10, 
            top: 10, 
            padding: 5, 
            borderRadius: 8, 
            background: 'rgba(255,255,255,.16)', 
            border: '1px solid rgba(255,255,255,.22)', 
            color: '#fff', 
            cursor: 'pointer', 
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28
          }}
        >
          <ChevronLeftIcon size={16} strokeWidth={2.5} />
        </button>
        <div className="sb-scroll" style={{flex: 1, overflowY: 'auto', background: T.bg}}>
          <Sidebar 
            courseData={courseData} 
            selectedItem={selectedItem} 
            expandedModules={expandedModules} 
            expandedSubModules={expandedSubModules} 
            expandedTopics={expandedTopics} 
            sidebarSearch={sidebarSearch} 
            onItemSelect={handleItemSelect} 
            onToggleModule={toggleModule} 
            onToggleSubModule={toggleSubModule} 
            onToggleTopic={toggleTopic} 
            onSearchChange={setSidebarSearch} 
          />
        </div>
      </div>

      {/* Main content area */}
      <div style={{display: 'flex', flex: 1, overflow: 'clip'}}>
        {/* Desktop sidebar */}
        <div className="hidden lg:flex" style={{flexDirection: 'column', position: 'relative', flexShrink: 0, width: sidebarOpen ? 280 : 0, minWidth: 0, transition: 'width .3s cubic-bezier(.4,0,.2,1)', overflow: 'hidden', background: T.bg, borderRight: `1.5px solid ${T.border}`}}>
          <div className={`sb-sidebar-inner${sidebarOpen ? '' : ' collapsed'}`} style={{width: 280, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative'}}>
            <button 
              onClick={() => setSidebarOpen(false)} 
              style={{
                position: 'absolute', 
                right: -12, 
                top: '50%', 
                transform: 'translateY(-50%)', 
                zIndex: 20, 
                width: 28, 
                height: 56, 
                borderRadius: '0 10px 10px 0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: T.bgRightSidebar, 
                border: `1.5px solid ${T.border}`, 
                borderLeft: 'none', 
                boxShadow: '3px 0 10px rgba(0,0,0,0.08)', 
                cursor: 'pointer', 
                color: T.textMuted,
                transition: 'all 0.2s ease'
              }} 
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = T.orangeTint
                ;(e.currentTarget as HTMLElement).style.color = T.orange
              }} 
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = T.bgRightSidebar
                ;(e.currentTarget as HTMLElement).style.color = T.textMuted
              }}
            >
              <ChevronLeftIcon size={16} strokeWidth={2.5} />
            </button>
            <SidebarHeader 
              courseName={courseData?.courseName || "Course"} 
              modulesCount={courseData?.modules?.length || 0} 
              sidebarSearch={sidebarSearch} 
              onSearchChange={setSidebarSearch}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
            />
            <div className="sb-scroll" style={{flex: 1, overflowY: 'auto', background: T.bg}}>
              <Sidebar 
                courseData={courseData} 
                selectedItem={selectedItem} 
                expandedModules={expandedModules} 
                expandedSubModules={expandedSubModules} 
                expandedTopics={expandedTopics} 
                sidebarSearch={sidebarSearch} 
                onItemSelect={handleItemSelect} 
                onToggleModule={toggleModule} 
                onToggleSubModule={toggleSubModule} 
                onToggleTopic={toggleTopic} 
                onSearchChange={setSidebarSearch} 
              />
            </div>
          </div>
        </div>

        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="hidden lg:flex"
            style={{
              flexShrink: 0, 
              alignSelf: 'center', 
              width: 20, 
              height: 64, 
              borderRadius: '0 12px 12px 0', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: T.bgRightSidebar, 
              border: `1.5px solid ${T.border}`, 
              borderLeft: 'none', 
              boxShadow: '3px 0 8px rgba(0,0,0,0.07)', 
              cursor: 'pointer', 
              color: T.textMuted,
              transition: 'all 0.2s ease',
              marginLeft: -1
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = T.orangeTint
              ;(e.currentTarget as HTMLElement).style.color = T.orange
              ;(e.currentTarget as HTMLElement).style.width = '24px'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = T.bgRightSidebar
              ;(e.currentTarget as HTMLElement).style.color = T.textMuted
              ;(e.currentTarget as HTMLElement).style.width = '20px'
            }}
          >
            <ChevronRightIcon size={14} strokeWidth={2.5} />
          </button>
        )}

        {/* Right panel */}
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'clip', minHeight: 0, background: T.pageBg}}>
          <TopBar 
            items={buildBreadcrumbs()} 
            onAIClick={() => setShowAIChat(v => !v)} 
            onSummaryClick={() => setShowSummary(v => !v)} 
            onMenuClick={() => setSidebarOpen(v => !v)} 
          />

          <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'clip', minHeight: 0, padding: 16, gap: 12}}>
            {!selectedItem ? (
              <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{textAlign: 'center', maxWidth: 480, animation: 'fadeIn .4s ease both'}}>
                  <div style={{width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', background: `linear-gradient(135deg,${T.orange},${T.orangeDark})`, boxShadow: `0 8px 24px ${T.orangeGlow}`}}>
                    <BookOpen size={28} style={{color: '#fff'}}/>
                  </div>
                  <h2 style={{fontWeight: 800, fontSize: 22, color: T.textMain, margin: '0 0 12px'}}>Welcome to <span style={{color: T.orange}}>{courseData?.courseName}</span></h2>
                  <p style={{fontSize: 13, color: T.textMuted, lineHeight: 1.7, margin: '0 0 28px'}}>{courseData?.courseDescription || 'Select a topic from the sidebar to begin.'}</p>
                </div>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'clip', minHeight: 0, gap: 12}}>
                {learningElements().length > 0 && (
                  <TabBar 
                    selectedNode={!!selectedItem} 
                    activeTab={activeTab} 
                    activeSubcategory={activeSubcategory} 
                    subcategories={subcategories} 
                    onTabChange={handleTabChange} 
                    onSubcategoryChange={handleSubcategoryChange} 
                  />
                )}

                {currentFolder && (
                  <div style={{flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, background: T.bg, border: `1.5px solid ${T.border}`}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <button 
                        onClick={handleFolderBack} 
                        style={{display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: T.pageBg, border: `1px solid ${T.border}`, fontSize: '11px', fontWeight: 600, color: T.textMuted, cursor: 'pointer'}} 
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.orangeTint} 
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = T.pageBg}
                      >
                        <ChevronLeft size={12}/>Back
                      </button>
                      <div style={{width: 1, height: 16, background: T.border}}/>
                      <Folder size={14} style={{color: T.textMuted}}/>
                      <span style={{fontSize: '12.5px', fontWeight: 600, color: T.textMain}}>{currentFolder.title}</span>
                    </div>
                    <span style={{fontSize: '11px', color: T.textMuted}}>{getFilteredFolderContents().length} items</span>
                  </div>
                )}

                {selectedMethod && selectedActivity && !currentFolder && (
                  <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'clip', minHeight: 0}}>
                    {(() => {
                      const exs = getExercisesForActivity()
                      if(exs.length > 0 && selectedExercise) {
                        return (
                          <div style={{height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'clip', background: T.bg, border: `1.5px solid ${T.border}`}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', flexShrink: 0, borderBottom: `1px solid ${T.border}`, background: T.surface}}>
                              <button onClick={() => setSelectedExercise(null)} style={{display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, background: T.bg, border: `1px solid ${T.border}`, fontSize: '11px', fontWeight: 600, color: T.textMuted, cursor: 'pointer'}}><ChevronLeft size={12}/>Back</button>
                              <Code size={14} style={{color: T.orange}}/>
                              <span style={{fontWeight: 600, fontSize: '12.5px', color: T.textMain}}>{selectedExercise.exerciseInformation.exerciseName}</span>
                            </div>
                            <div style={{flex: 1, overflow: 'clip'}}>
                              {selectedExercise?.programmingSettings?.selectedModule === 'Core Programming' && <CodeEditor exercise={selectedExercise} theme={resolvedTheme as "light"|"dark"} breadcrumbCollapsed={false} onBreadcrumbCollapseToggle={() => {}} courseId={courseId} nodeId={selectedItem?.id || ""} nodeName={selectedItem?.title || ""} nodeType={selectedItem?.type || ""} subcategory={selectedActivity} category={selectedMethod === 'i-do' ? "I_Do" : selectedMethod === 'we-do' ? "We_Do" : "You_Do"} onBack={() => setSelectedExercise(null)} onCloseExercise={() => setSelectedExercise(null)}/>}
                              {selectedExercise?.programmingSettings?.selectedModule === 'Database' && <DBQueryEditor exercise={selectedExercise} theme={resolvedTheme as "light"|"dark"} courseId={courseId} nodeId={selectedItem?.id || ""} nodeName={selectedItem?.title || ""} nodeType={selectedItem?.type || ""} subcategory={selectedActivity} category={selectedMethod === 'i-do' ? "I_Do" : selectedMethod === 'we-do' ? "We_Do" : "You_Do"} onBack={() => setSelectedExercise(null)} onCloseExercise={() => setSelectedExercise(null)}/>}
                            </div>
                          </div>
                        )
                      }
                      if(exs.length > 0) {
                        return (
                          <div className="exercises-portal-host" style={{flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'visible'}}>
                            <Exercises 
                              courseId={courseId} 
                              exercises={exs} 
                              onExerciseSelect={handleExerciseSelect} 
                              method={selectedMethod} 
                              category={selectedMethod === 'i-do' ? 'I_Do' : selectedMethod === 'you-do' ? 'You_Do' : 'We_Do'} 
                              subcategory={selectedActivity || ''} 
                              topic={selectedItem?.title || ''} 
                              module={currentHierarchy.length > 0 ? currentHierarchy[0] : selectedItem?.title || ''} 
                              nodeType={selectedItem?.type || ''} 
                              hierarchy={currentHierarchy} 
                              selectedItem={selectedItem} 
                              currentHierarchy={currentHierarchy} 
                              studentAnswers={getStudentAnswers()} 
                            />
                          </div>
                        )
                      }
                      const avail = getAvailableResourceTypes()
                      if(avail.length === 0) return <EmptyCard icon={File} title="No resources yet" sub="This activity has no content yet." />
                      return (
                        <div style={{display: 'flex', flexDirection: 'column', flex: 1, overflow: 'clip', minHeight: 0, gap: 10}}>
                          <div style={{flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3, padding: 4, borderRadius: 12, background: T.bg, border: `1.5px solid ${T.border}`, overflowX: 'auto'}} className="sb-scroll">
                            {(["page","folder","pdf","ppt","video","zip","link","reference"] as ResourceType[]).map(type => {
                              let hasContent = false, count = 0
                              if(type === "folder") { count = getFolders().length; hasContent = count > 0 }
                              else if(type === "page") { count = getPagesForActivity().length; hasContent = count > 0 }
                              else { count = getResourcesByType(type).length; hasContent = count > 0 }
                              if(!hasContent) return null
                              const isSel = selectedResourceType === type || (!userSelectedResourceType && type === avail[0])
                              const col = type === "folder" ? T.orange : type === "reference" ? "#3b82f6" : (RES_COLOR[type] || T.textMuted)
                              return (
                                <button 
                                  key={type} 
                                  onClick={() => { setSelectedResourceType(type); setUserSelectedResourceType(true) }}
                                  style={{display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .15s', flexShrink: 0, background: isSel ? `linear-gradient(135deg,${col},${col}cc)` : 'transparent', color: isSel ? '#fff' : T.textSub, boxShadow: isSel ? `0 2px 8px ${col}40` : 'none' }}
                                  onMouseEnter={e => { if(!isSel) (e.currentTarget as HTMLElement).style.background = T.pageBg }} 
                                  onMouseLeave={e => { if(!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                                >
                                  {type === "folder" ? <Folder size={12}/> : <ResIcon type={type} size={12}/>}
                                  {type === "folder" ? "Folders" : RES_LABEL[type]}
                                  <span style={{padding: '0 4px', borderRadius: 5, fontSize: '10px', fontWeight: 700, background: isSel ? 'rgba(255,255,255,.22)' : T.pageBg, color: isSel ? '#fff' : T.textMuted}}>{count}</span>
                                </button>
                              )
                            })}
                            <button 
                              onClick={() => { setSelectedResourceType("all"); setUserSelectedResourceType(true) }}
                              style={{display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .15s', flexShrink: 0, background: selectedResourceType === "all" ? `linear-gradient(135deg,${T.textSub},${T.textMuted})` : 'transparent', color: selectedResourceType === "all" ? '#fff' : T.textSub }}
                            >
                              <File size={12}/>All
                              <span style={{padding: '0 4px', borderRadius: 5, fontSize: '10px', fontWeight: 700, background: selectedResourceType === "all" ? 'rgba(255,255,255,.22)' : T.pageBg, color: selectedResourceType === "all" ? '#fff' : T.textMuted}}>{getAllResources().length + getFolders().length}</span>
                            </button>
                          </div>
                          <div style={{flex: 1, overflow: 'hidden', borderRadius: 16, background: T.bg, border: `1.5px solid ${T.border}`, display: 'flex', flexDirection: 'column'}}>
                            {selectedResourceType === "page" ? (() => {
                              const pages = getResourcesByType("page")
                              if(!pages.length) return null
                              const page = pages[inlinePageIndex]
                              const processedContent = preparePageContent(page)
                              return (
                                <div style={{flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
                                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${T.line}`, background: T.surface, flexShrink: 0}}>
                                    <button 
                                      disabled={inlinePageIndex === 0} 
                                      onClick={() => setInlinePageIndex(i => i - 1)} 
                                      style={{display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: inlinePageIndex === 0 ? T.surface : T.bg, color: inlinePageIndex === 0 ? T.textHint : T.textMain, cursor: inlinePageIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600}}
                                    >
                                      <ChevronLeft size={13}/>Prev
                                    </button>
                                    <span style={{fontSize: '12px', fontWeight: 600, color: T.textSub}}>{page.title}&nbsp;·&nbsp;{inlinePageIndex + 1} / {pages.length}</span>
                                    <button 
                                      disabled={inlinePageIndex === pages.length - 1} 
                                      onClick={() => setInlinePageIndex(i => i + 1)} 
                                      style={{display: 'flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: inlinePageIndex === pages.length - 1 ? T.surface : T.bg, color: inlinePageIndex === pages.length - 1 ? T.textHint : T.textMain, cursor: inlinePageIndex === pages.length - 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600}}
                                    >
                                      Next<ChevronRightIcon size={13}/>
                                    </button>
                                  </div>
                                  <iframe 
                                    key={page.id} 
                                    srcDoc={processedContent} 
                                    sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" 
                                    style={{flex: 1, border: 'none', width: '100%', background: '#fff'}} 
                                    title={page.title} 
                                  />
                                </div>
                              )
                            })() : (
                              resourcesToDisplay.length > 0 ? (
                                <div style={{flex: 1, overflowY: 'auto'}} className="sb-scroll">
                                  <SortHeader onSort={f => setSortConfig(p => ({field: f, direction: p.field === f && p.direction === "asc" ? "desc" : "asc"}))} cfg={sortConfig} />
                                  {[...resourcesToDisplay].sort((a, b) => {
                                    let av: any, bv: any
                                    if(sortConfig.field === "name") { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
                                    else if(sortConfig.field === "size") { av = parseSize(a.fileSize || "-"); bv = parseSize(b.fileSize || "-") }
                                    else { av = parseDate(a.uploadedAt || ""); bv = parseDate(b.uploadedAt || "") }
                                    const c = av < bv ? -1 : av > bv ? 1 : 0
                                    return sortConfig.direction === "asc" ? c : -c
                                  }).map((r, i) => <ResourceCard key={r.id} resource={r} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick} />)}
                                </div>
                              ) : (
                                <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32}}>
                                  <div style={{textAlign: 'center'}}>
                                    <div style={{width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', background: T.pageBg}}>
                                      <File size={18} style={{color: T.textMuted}}/>
                                    </div>
                                    <p style={{fontWeight: 600, fontSize: '12.5px', color: T.textMain, margin: '0 0 4px'}}>No matching resources</p>
                                    <p style={{fontSize: '11.5px', color: T.textMuted, margin: 0}}>Try a different filter</p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {currentFolder && (
                  <div style={{flex: 1, overflow: 'hidden', borderRadius: 16, background: T.bg, border: `1.5px solid ${T.border}`, display: 'flex', flexDirection: 'column'}}>
                    {getFilteredFolderContents().length > 0 ? (
                      <div style={{flex: 1, overflowY: 'auto'}} className="sb-scroll">
                        <SortHeader onSort={f => setSortConfig(p => ({field: f, direction: p.field === f && p.direction === "asc" ? "desc" : "asc"}))} cfg={sortConfig} />
                        {[...getFilteredFolderContents()].sort((a, b) => {
                          let av: any, bv: any
                          if(sortConfig.field === "name") { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
                          else if(sortConfig.field === "size") { av = parseSize(a.fileSize || "-"); bv = parseSize(b.fileSize || "-") }
                          else { av = parseDate(a.uploadedAt || ""); bv = parseDate(b.uploadedAt || "") }
                          const c = av < bv ? -1 : av > bv ? 1 : 0
                          return sortConfig.direction === "asc" ? c : -c
                        }).map((r, i) => <ResourceCard key={r.id} resource={r} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick} />)}
                      </div>
                    ) : (
                      <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center'}}>
                        <div>
                          <Folder size={20} style={{color: T.textMuted, margin: '0 auto 10px', display: 'block'}}/>
                          <p style={{fontWeight: 600, fontSize: '12.5px', color: T.textMain, margin: '0 0 4px'}}>Folder is empty</p>
                          <p style={{fontSize: '11.5px', color: T.textMuted, margin: 0}}>No files here yet</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedMethod && !selectedActivity && !currentFolder && learningElements().length > 0 && <EmptyCard icon={Target} title="Select an Activity" sub="Pick one of the activity pills above to view resources" />}
                {!selectedMethod && !selectedActivity && !currentFolder && learningElements().length > 0 && <EmptyCard icon={Target} title="Choose a Learning Method" sub="Click I Do, We Do, or You Do to get started" />}
                {learningElements().length === 0 && selectedItem && !currentFolder && <EmptyCard icon={File} title="No Learning Methods" sub="This topic hasn't been configured yet." />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panels and Viewers */}
      {showNotesPanel && <NotesPanel isOpen={showNotesPanel} onClose={() => setShowNotesPanel(false)} isDraggable={true} defaultPosition={{x: window.innerWidth - 400, y: 100}} />}
      <AIPanel isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} fileUrl={activeViewer.resource?.fileUrl || ""} title={activeViewer.resource?.title || selectedItem?.title || ""} fileType={activeViewer.type === 'video' ? 'video' : activeViewer.type === 'ppt' ? 'ppt' : 'pdf'} courseContext={!activeViewer.resource && selectedItem ? {topicTitle: selectedItem.title, isDocumentView: false} : undefined} />
      {activeViewer.type === "zip" && activeViewer.resource && <ZipViewer fileUrl={getFileUrl(activeViewer.resource.fileUrl || "")} fileName={activeViewer.resource.title} onClose={closeAllViewers} isOpen={true} />}
      {activeViewer.type === "video" && activeViewer.resource && (
        <VideoPlayer isOpen={true} onClose={closeAllViewers} videoUrl={getFileUrlString(activeViewer.resource.fileUrl)} title={activeViewer.resource.title} onNotesClick={() => setShowNotesPanel(true)} onNotesStateChange={v => setShowNotesPanel(v)} showNotesPanel={showNotesPanel} hierarchy={currentHierarchy} currentItemTitle={selectedItem?.title} mcqQuestions={activeViewer.resource.mcqQuestions || []} availableResolutions={activeViewer.resource.availableResolutions || []} fileUrlMap={activeViewer.resource.fileUrlMap || {}} aiChatEnabled={courseData?.resourcesType?.iDo?.video?.aiChat || false} aiSummaryEnabled={courseData?.resourcesType?.iDo?.video?.aiSummary || false} notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled || false} onResolutionChange={(resolution, url) => { if(activeViewer.resource) setActiveViewer({...activeViewer, resource: {...activeViewer.resource, fileUrl: url, currentResolution: resolution}}) }} />
      )}
      {activeViewer.type === "ppt" && activeViewer.resource && <PPTViewer isOpen={true} onClose={closeAllViewers} pptUrl={getFileUrlString(activeViewer.resource.fileUrl)} title={activeViewer.resource.title} onNotesClick={() => setShowNotesPanel(true)} onNotesStateChange={v => setShowNotesPanel(v)} showNotesPanel={showNotesPanel} hierarchy={currentHierarchy} currentItemTitle={selectedItem?.title} />}
      {activeViewer.type === "pdf" && activeViewer.resource && (
        <PDFViewer fileUrl={getFileUrlString(activeViewer.resource.fileUrl)} fileName={activeViewer.resource.title || "document.pdf"} onClose={closeAllViewers} initialMcqs={activeViewer.resource.mcqQuestions || []} entityType="course" entityId={courseId} tabType="pdf" subcategory={selectedActivity} folderPath={currentHierarchy} aiChatEnabled={courseData?.resourcesType?.iDo?.pdf?.aiChat || false} aiSummaryEnabled={courseData?.resourcesType?.iDo?.pdf?.aiSummary || false} notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled || false} hierarchy={currentHierarchy} currentItemTitle={selectedItem?.title} onNotesClick={() => setShowNotesPanel(true)} onNotesStateChange={v => setShowNotesPanel(v)} showNotesPanel={showNotesPanel} />
      )}
      <AIChat isOpen={showAIChat} onClose={() => setShowAIChat(false)} context={{topicTitle: selectedItem?.title, fileName: activeViewer.resource?.title, fileType: activeViewer.type, isDocumentView: !!activeViewer.resource}} />
      <SummaryChat isOpen={showSummary} onClose={() => setShowSummary(false)} context={{topicTitle: selectedItem?.title, fileName: activeViewer.resource?.title, fileType: activeViewer.type, isDocumentView: !!activeViewer.resource, hierarchy: currentHierarchy}} />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
    </div>
  )
}