// page.tsx - Complete with Progress Tracking
"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import ReactDOM from "react-dom"
import {
  ChevronLeft, ChevronRightIcon, ChevronRight, Folder, File, Target, BookOpen, Code,
  Loader2, LayoutDashboard, BookMarked, GraduationCap, ChevronLeft as ChevronLeftIcon,
  X, Sparkles, Hash, Layers, Eye, CheckCircle, Clock,
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

// Import progress tracking functions
import {
  recordNodeVisit,
  recordResourceOpen,
  fetchStudentProgress,
  StudentProgress
} from '../../../../../../apiServices/progress';

import { T, METHOD_CFG, RES_COLOR, RES_LABEL } from "../components/types/constants"
import { TopBar } from "../components/TopBar"
import { Sidebar, SidebarHeader, LogoutModal, buildHoursMap } from "../components/Sidebar"
import { TabBar } from "../components/TabBar"
import InlineAIChat from "../components/InlineAIChat"
import InlineSummaryChat from "../components/InlineSummaryChat"
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

import { fetchAllPedagogyViews, fetchPedagogyViewById } from '../.../../../../../../../apiServices/pedagogyAndModuleAdd/pedagogy';

export default function LMSPage() {
  const params = useParams()
  const router = useRouter()
  const { resolvedTheme } = useNextTheme()
  const courseId = params?.id as string
  const save = (k: string, v: string) => { if (typeof window !== 'undefined') localStorage.setItem(k, v) }
  const load = (k: string) => { if (typeof window !== 'undefined') return localStorage.getItem(k); return null }

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
  const [activeViewer, setActiveViewer] = useState<{ type: "video" | "pdf" | "ppt" | "zip" | null; resource: Resource | null }>({ type: null, resource: null })
  const [currentFolder, setCurrentFolder] = useState<Resource | null>(null)
  const [folderPath, setFolderPath] = useState<Resource[]>([])
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType | "all">("all")
  const [userSelectedResourceType, setUserSelectedResourceType] = useState<boolean>(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "name", direction: "asc" })
  const [selectedExercise, setSelectedExercise] = useState<any>(null)
  const [exerciseResetProgress, setExerciseResetProgress] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarSearch, setSidebarSearch] = useState("")
  const [inlinePageIndex, setInlinePageIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<string | null>("Overview")
  const [activeSubcategory, setActiveSubcategory] = useState<string>("")
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [descriptionHasMoreContent, setDescriptionHasMoreContent] = useState(false)

  // Progress tracking state
  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null)

  // Helper function to get current user ID from JWT token
  const getCurrentUserId = (): string | null => {
    try {
      const { valid, user: tokenUser } = userPermission();
      if (valid && tokenUser?._id) {
        return tokenUser._id;
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
    }

    // Fallback to localStorage
    const userId = localStorage.getItem('smartcliff_userId');
    if (userId) return userId;

    try {
      const raw = localStorage.getItem('smartcliff_userData');
      if (raw) {
        const userData = JSON.parse(raw);
        return userData?._id || null;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }

    return null;
  };

  // Helper function to count total nodes in course
  const countTotalNodes = (modules: any[]): number => {
    let count = 0;
    modules.forEach(module => {
      count++; // module itself
      if (module.subModules?.length) {
        module.subModules.forEach((submodule: any) => {
          count++; // submodule
          if (submodule.topics?.length) {
            submodule.topics.forEach((topic: any) => {
              count++; // topic
              if (topic.subTopics?.length) {
                count += topic.subTopics.length; // subtopics
              }
            });
          }
        });
      } else if (module.topics?.length) {
        module.topics.forEach((topic: any) => {
          count++; // topic
          if (topic.subTopics?.length) {
            count += topic.subTopics.length; // subtopics
          }
        });
      }
    });
    return count;
  };

  // Helper function to find node title by ID
  const findNodeTitleById = (nodeId: string, courseData: CourseData | null): string => {
    if (!courseData?.modules) return 'Unknown';

    for (const module of courseData.modules) {
      if (module._id === nodeId) return module.title;
      if (module.subModules) {
        for (const submodule of module.subModules) {
          if (submodule._id === nodeId) return submodule.title;
          if (submodule.topics) {
            for (const topic of submodule.topics) {
              if (topic._id === nodeId) return topic.title;
              if (topic.subTopics) {
                for (const subtopic of topic.subTopics) {
                  if (subtopic._id === nodeId) return subtopic.title;
                }
              }
            }
          }
        }
      }
      if (module.topics) {
        for (const topic of module.topics) {
          if (topic._id === nodeId) return topic.title;
          if (topic.subTopics) {
            for (const subtopic of topic.subTopics) {
              if (subtopic._id === nodeId) return subtopic.title;
            }
          }
        }
      }
    }
    return 'Unknown';
  };

  useEffect(() => {
    if (courseData?.courseDescription) {
      const plainText = courseData.courseDescription.replace(/<[^>]*>/g, '')
      const wordCount = plainText.split(/\s+/).length
      setDescriptionHasMoreContent(plainText.length > 350 || wordCount > 60)
    }
  }, [courseData?.courseDescription])

  // Fetch student progress on page load
  useEffect(() => {
    const loadStudentProgress = async () => {
      if (!courseId) return;

      const userId = getCurrentUserId();
      if (!userId) {
        console.warn('No user ID found, cannot load progress');
        return;
      }

      const progress = await fetchStudentProgress(userId, courseId);
      if (progress) {
        setStudentProgress(progress);
        console.log('📊 Student progress loaded:', progress);
      }
    };

    loadStudentProgress();
  }, [courseId]);

  // ── Pedagogy counter helpers ──────────────────────────────────────────────
  const countPedActivities = (pedagogy: any, method: "I_Do" | "We_Do" | "You_Do"): number => {
    if (!pedagogy?.[method]) return 0
    const cat = pedagogy[method]
    if (Array.isArray(cat)) return cat.length
    if (typeof cat === 'object') return Object.keys(cat).length
    return 0
  }

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
          if (sm.topics) sm.topics.forEach(t => { allTopicIds.add(t._id) })
        })
      }
      if (m.topics) m.topics.forEach(t => { allTopicIds.add(t._id) })
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

  // Add this state to store pedagogy view data
  const [pedagogyViewData, setPedagogyViewData] = useState<any>(null);
  const [selectedPedagogyEntry, setSelectedPedagogyEntry] = useState<any>(null);
  const hoursMap = useMemo(() => {
    if (!pedagogyViewData) return {}
    return buildHoursMap([pedagogyViewData], courseId)
  }, [pedagogyViewData, courseId])

  // Add this useEffect to fetch pedagogy view data
  useEffect(() => {
    const fetchPedagogyView = async () => {
      if (!courseId) return;

      try {
        console.log('=== Fetching Pedagogy View ===');
        console.log('Looking for pedagogy view with courses:', courseId);

        // Fetch all pedagogy views
        const allViews = await fetchAllPedagogyViews();

        // Find the one that matches this course
        const matchingView = allViews.find(view => {
          // Handle both string and ObjectId formats
          const viewCourseId = typeof view.courses === 'string'
            ? view.courses
            : view.courses?.toString();
          return viewCourseId === courseId;
        });

        if (matchingView) {
          console.log('✅ Found pedagogy view:', matchingView._id);

          // Fetch detailed data
          const detailedView = await fetchPedagogyViewById(matchingView._id);
          setPedagogyViewData(detailedView);

          console.log('=== Pedagogy View Data ===');
          console.log('Total pedagogy entries:', detailedView.pedagogies?.length);
        } else {
          console.log('⚠️ No pedagogy view found for this course');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchPedagogyView();
  }, [courseId]);

  // ── FIXED: Find description for any node (module, submodule, topic, subtopic) ──
  const findNodeDescription = useCallback((nodeId: string): string | null => {
    if (!courseData?.modules) return null

    for (const module of courseData.modules) {
      // Check module
      if (module._id === nodeId) {
        return module.description || null
      }

      // Check submodules
      if (module.subModules) {
        for (const submodule of module.subModules) {
          if (submodule._id === nodeId) {
            return submodule.description || null
          }

          // Check topics in submodule
          if (submodule.topics) {
            for (const topic of submodule.topics) {
              if (topic._id === nodeId) {
                return topic.description || null
              }

              // Check subtopics
              if (topic.subTopics) {
                for (const subtopic of topic.subTopics) {
                  if (subtopic._id === nodeId) {
                    return subtopic.description || null
                  }
                }
              }
            }
          }
        }
      }

      // Check direct topics in module
      if (module.topics) {
        for (const topic of module.topics) {
          if (topic._id === nodeId) {
            return topic.description || null
          }

          // Check subtopics
          if (topic.subTopics) {
            for (const subtopic of topic.subTopics) {
              if (subtopic._id === nodeId) {
                return subtopic.description || null
              }
            }
          }
        }
      }
    }

    return null
  }, [courseData])

  const learningElements = (): LearningElement[] => {
    const cp = { I_Do: courseData?.I_Do, We_Do: courseData?.We_Do, You_Do: courseData?.You_Do }
    if (!cp || (!cp.I_Do && !cp.We_Do && !cp.You_Do)) return []
    const create = (type: "i-do" | "we-do" | "you-do", ped: Record<string, any> | string[] | undefined): LearningElement => {
      const subs: PedagogySubItem[] = []
      if (ped) {
        if (Array.isArray(ped)) {
          ped.forEach((item, i) => {
            const key = typeof item === 'string' ? item.toLowerCase().replace(/\s+/g, '_') : `item_${i}`
            const name = typeof item === 'string' ? item : `Activity ${i + 1}`
            let ar: PedagogySubItem = { key, name, description: '', files: [], folders: [], links: [] }
            if (selectedItem?.pedagogy) {
              const pk = type === 'i-do' ? 'I_Do' : type === 'we-do' ? 'We_Do' : 'You_Do'
              const tp = selectedItem.pedagogy[pk]
              if (tp && typeof tp === 'object' && !Array.isArray(tp)) {
                const ak = Object.keys(tp).find(k => normalizeKey(k) === normalizeKey(key))
                if (ak) {
                  const ad = tp[ak]
                  if (ad && typeof ad === 'object' && (ad.files || ad.folders || ad.links)) {
                    ar = { key, name, description: ad.description || '', files: ad.files || [], folders: ad.folders || [], links: ad.links || [] }
                  }
                }
              }
            }
            subs.push(ar)
          })
        } else if (typeof ped === 'object') {
          if (type === 'we-do' && Array.isArray(courseData?.We_Do)) {
            courseData!.We_Do.forEach((n: string) => subs.push({ key: n.toLowerCase().replace(/\s+/g, '_'), name: n, description: '', files: [], folders: [], links: [] }))
          } else {
            Object.entries(ped).forEach(([key, item]) => {
              if (item) subs.push({ key, name: formatSubItemName(key), description: item.description || '', files: item.files || [], folders: item.folders || [], links: item.links || [] })
            })
          }
        }
      }
      const mc = METHOD_CFG[type]
      return { id: type, title: mc.label, type, icon: Target, color: mc.color, subItems: subs }
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
    if (tab === "Overview") { setSelectedMethod(""); setSelectedActivity(""); return }
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
    if (selectedMethod) {
      const tab = selectedMethod === "i-do" ? "I_Do" : selectedMethod === "we-do" ? "We_Do" : "You_Do"
      setActiveTab(tab)
    } else {
      setActiveTab(prev => prev === "Overview" ? "Overview" : null)
    }
    setActiveSubcategory(selectedActivity)
  }, [selectedMethod, selectedActivity])

  const closeAllViewers = () => setActiveViewer({ type: null, resource: null })
  const openViewer = (type: "video" | "pdf" | "ppt" | "zip", resource: Resource) => setActiveViewer({ type, resource })

  useEffect(() => {
    if (!courseId) { setError("No course ID."); setIsLoading(false); return }
    fetch(`http://localhost:5533/getAll/courses-data/${courseId}`)
      .then(r => r.json()).then(d => {
        const info = d.data || d
        setCourseData(info)
        if (!load('lms_student_selected_node_id')) {
          setIsLoading(false)
          if (info.modules?.length > 0) setExpandedModules(new Set([info.modules[0]._id]))
        }
      }).catch(e => { setError(e.message || "Error"); setIsLoading(false) })
  }, [courseId])

  const getStudentAnswers = useCallback((): Record<string, any> | undefined => {
    if (!courseData?.singleParticipants || !Array.isArray(courseData.singleParticipants)) return undefined
    let currentUserId: string | undefined
    try {
      const { valid, user: tokenUser } = userPermission()
      if (valid && tokenUser?._id) currentUserId = tokenUser._id
    } catch { }
    if (!currentUserId) currentUserId = localStorage.getItem('smartcliff_userId') || undefined
    if (!currentUserId) {
      try {
        const raw = localStorage.getItem('smartcliff_userData')
        if (raw) { const u = JSON.parse(raw); currentUserId = u?._id }
      } catch { }
    }
    if (!currentUserId) return undefined
    const participant = courseData.singleParticipants.find((p: any) => p.user?._id === currentUserId)
    if (!participant) return undefined
    const courseEntry = participant.user?.courses?.find((c: any) => c.courseId === courseId)
    return courseEntry?.answers ?? undefined
  }, [courseData, courseId])

  // UPDATED: handleItemSelect with progress tracking
  const handleItemSelect = useCallback(async (itemId: string, itemTitle: string, itemType: SelectedItemType, hierarchyIds: string[], pedagogy?: any) => {
    if (selectedItem?.id === itemId) return
    save('lms_student_selected_node_id', itemId)
    const findLabel = (id: string): string => {
      if (!courseData?.modules) return "Unknown"
      for (const m of courseData.modules) {
        if (m._id === id) return m.title
        if (m.subModules) for (const sm of m.subModules) { if (sm._id === id) return sm.title; if (sm.topics) for (const t of sm.topics) { if (t._id === id) return t.title; if (t.subTopics) for (const st of t.subTopics) if (st._id === id) return st.title } }
        if (m.topics) for (const t of m.topics) { if (t._id === id) return t.title; if (t.subTopics) for (const st of t.subTopics) if (st._id === id) return st.title }
      }
      return "Unknown"
    }
    setCurrentHierarchy(hierarchyIds.map(findLabel))
    setSelectedItem({ id: itemId, title: itemTitle, type: itemType, hierarchy: hierarchyIds, pedagogy })
    if (selectedItem?.hierarchy[0] !== hierarchyIds[0]) { setSelectedMethod(""); setSelectedActivity("") }
    setActiveTab("Overview")
    setCurrentFolder(null)
    setFolderPath([])
    closeAllViewers()
    setUserSelectedResourceType(false)
    setSortConfig({ field: "name", direction: "asc" })

    // ── PROGRESS TRACKING: Record node visit ──────────────────────────────
    const userId = getCurrentUserId()
    if (userId && courseId && itemId) {
      // Fire and forget - don't await to avoid blocking UI
      recordNodeVisit(userId, courseId, itemId).then(result => {
        if (result.success) {
          // Update local state to show visual feedback immediately
          setStudentProgress(prev => {
            if (!prev) return prev
            const updatedVisitedNodes = prev.visitedNodes.includes(itemId)
              ? prev.visitedNodes
              : [...prev.visitedNodes, itemId]
            return {
              ...prev,
              visitedNodes: updatedVisitedNodes,
              lastVisitedNode: itemId,
              lastVisitedAt: new Date()
            }
          })
        }
      })
    }
  }, [courseData, selectedItem, courseId])

  // UPDATED: handleResourceClick with progress tracking
  const handleResourceClick = async (resource: Resource) => {
    closeAllViewers()
    if (resource.isFolder && resource.folderContents) {
      setFolderPath(p => [...p, resource])
      setCurrentFolder(resource)
      return
    }
    if (resource.type === "page") { openPageInNewTab(resource._combinedCode || ""); return }
    if (resource.isReference) {
      const aft = getFileType(resource.fileUrl || '', resource.fileName || '')
      if (aft === "video") { openViewer("video", resource); }
      else if (aft === "ppt") { openViewer("ppt", resource); }
      else if (aft === "pdf") { openViewer("pdf", resource); }
      else if (aft === "zip") { openViewer("zip", resource); }
      else {
        let u = resource.externalUrl
        if (!u && resource.fileUrl) {
          if (typeof resource.fileUrl === 'object' && resource.fileUrl.base) u = resource.fileUrl.base
          else if (typeof resource.fileUrl === 'string') u = resource.fileUrl
        }
        if (u) window.open(u, '_blank', 'noopener,noreferrer')
      }
    } else {
      if (resource.type === "video") { openViewer("video", resource); }
      else if (resource.type === "ppt") { openViewer("ppt", resource); }
      else if (resource.type === "pdf") { openViewer("pdf", resource); }
      else if (resource.type === "zip") { openViewer("zip", resource); }
      else if (resource.type === "link") {
        let u = resource.externalUrl
        if (!u && resource.fileUrl) {
          if (typeof resource.fileUrl === 'object' && resource.fileUrl.base) u = resource.fileUrl.base
          else if (typeof resource.fileUrl === 'string') u = resource.fileUrl
        }
        if (u) {
          const ut = detectUrlType(u)
          if (ut === "video") openViewer("video", { ...resource, fileUrl: u, type: "video" })
          else if (ut === "ppt") openViewer("ppt", { ...resource, fileUrl: u, type: "ppt" })
          else if (ut === "pdf") openViewer("pdf", { ...resource, fileUrl: u, type: "pdf" })
          else window.open(u, '_blank', 'noopener,noreferrer')
        }
      }
    }

    // ── PROGRESS TRACKING: Record resource open (for non-exercise resources) ──
    // Don't track exercises here - they have their own answer submission system
    if (resource.id && resource.type !== 'exercise') {
      const userId = getCurrentUserId()
      if (userId && courseId && resource.id) {
        // Fire and forget
        recordResourceOpen(userId, courseId, resource.id).then(result => {
          if (result.success) {
            // Update local state
            setStudentProgress(prev => {
              if (!prev) return prev
              const updatedOpenedResources = prev.openedResources.includes(resource.id)
                ? prev.openedResources
                : [...prev.openedResources, resource.id]
              return {
                ...prev,
                openedResources: updatedOpenedResources
              }
            })
          }
        })
      }
    }
  }

  useEffect(() => {
    if (!courseData?.modules) return
    if (selectedItem) { setIsLoading(false); return }
    const nid = load('lms_student_selected_node_id')
    const sm = load('lms_student_selected_method')
    const sa = load('lms_student_selected_activity')
    if (nid) {
      const restore = (id: string, title: string, type: SelectedItemType, hier: string[], ped?: any) => {
        handleItemSelect(id, title, type, hier, ped)
        if (sm && sa) setTimeout(() => { setSelectedMethod(sm); setSelectedActivity(sa) }, 100)
      }
      const walk = (modules: any[]): boolean => {
        for (const m of modules) {
          if (m._id === nid) { restore(m._id, m.title, "module", [m._id], m.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); return true }
          if (m.subModules) for (const sub of m.subModules) {
            if (sub._id === nid) { restore(sub._id, sub.title, "submodule", [m._id, sub._id], sub.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); return true }
            if (sub.topics) for (const t of sub.topics) {
              if (t._id === nid) { restore(t._id, t.title, "topic", [m._id, sub._id, t._id], t.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
              if (t.subTopics) for (const st of t.subTopics) if (st._id === nid) { restore(st._id, st.title, "subtopic", [m._id, sub._id, t._id, st._id], st.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
            }
          }
          if (m.topics) for (const t of m.topics) {
            if (t._id === nid) { restore(t._id, t.title, "topic", [m._id, t._id], t.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
            if (t.subTopics) for (const st of t.subTopics) if (st._id === nid) { restore(st._id, st.title, "subtopic", [m._id, t._id, st._id], st.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
          }
        }
        return false
      }
      walk(courseData.modules as any)
    }
    setIsLoading(false)
  }, [courseData, handleItemSelect, selectedItem])

  useEffect(() => {
    if (selectedMethod && selectedActivity && selectedItem?.pedagogy) {
      if (!userSelectedResourceType) setSelectedResourceType("all")
    }
  }, [selectedMethod, selectedActivity, selectedItem?.pedagogy])

  const getFolders = (): Resource[] => {
    if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    const mk: Record<string, 'I_Do' | 'We_Do' | 'You_Do'> = {
      'i-do': 'I_Do',
      'we-do': 'We_Do',
      'you-do': 'You_Do',
    }
    const tk = mk[selectedMethod]
    if (!tk) return []
    const cat = selectedItem.pedagogy[tk]
    if (!cat || typeof cat !== 'object' || Array.isArray(cat)) return []
    const fk = Object.keys(cat).find(
      k => normalizeKey(k) === normalizeKey(selectedActivity)
    )
    if (!fk) return []
    const ad = (cat as any)[fk] as any
    if (!ad?.folders?.length) return []

    return ad.folders.map((folder: any) => {
      const directFiles = folder.files?.length || 0
      const directSubfolders = folder.subfolders?.length || 0
      const totalItems = directFiles + directSubfolders

      return {
        id: `folder-${folder.name}-${Math.random().toString(36).substr(2, 5)}`,
        title: folder.name,
        type: 'folder' as ResourceType,
        isFolder: true,
        folderContents: extractAllFilesFromFolders([folder]),
        fileSize: `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`,
        uploadedAt: folder.uploadedAt,
        tags: folder.tags || [],
      }
    })
  }

  const extractAllFilesFromFolders = (folders: any[]): Resource[] => {
    const all: Resource[] = []

    const proc = (folder: any) => {
      // Process subfolders
      if (folder.subfolders?.length) {
        folder.subfolders.forEach((sf: any) => {
          const sfId = sf._id || `sf-${Math.random().toString(36).substr(2, 5)}`

          // Recursively build THIS subfolder's contents separately
          // DO NOT call proc(sf) — that was leaking sf's files into parent
          const sfContents = extractAllFilesFromFolders([sf])

          const sfItem: Resource = {
            id: sfId,
            title: sf.name,
            type: 'folder' as ResourceType,
            isFolder: true,
            folderContents: sfContents,
            fileSize: `${(sf.files?.length || 0) + (sf.subfolders?.length || 0)} items`,
            uploadedAt: sf.uploadedAt,
            tags: sf.tags || [],
          }
          // Only push the FOLDER item, not its contents into parent
          all.push(sfItem)
        })
      }

      // Only push files that belong DIRECTLY to this folder
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
        if (ft === 'link') r.externalUrl = getFileUrl(file.fileUrl)
        else r.fileUrl = getFileUrl(file.fileUrl)
        all.push(r)
      })
    }

    folders.forEach(f => proc(f))
    return all
  }

  const getResourcesByType = (type: ResourceType): Resource[] => {
    if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    if (type === "page") {
      return getPagesForActivity().map(p => ({
        id: p._id, title: p.title, type: "page" as ResourceType, fileUrl: "",
        fileSize: p.pageCount ? `${p.pageCount} pg` : "1 pg",
        uploadedAt: p.createdAt || "", _combinedCode: p.combinedCode, _pageCount: p.pageCount || 1,
      }))
    }
    const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = { "i-do": "I_Do", "we-do": "We_Do", "you-do": "You_Do" }
    const tk = mk[selectedMethod]
    if (!tk) return []
    const cat = selectedItem.pedagogy[tk]
    if (!cat || typeof cat !== "object" || Array.isArray(cat)) return []
    const fk = Object.keys(cat).find(k => normalizeKey(k) === normalizeKey(selectedActivity))
    if (!fk) return []
    const ad = (cat as any)[fk] as any
    if (!ad) return []
    const dfs: Resource[] = (ad.files || [])
      .filter((f: any) => (!f.fileSettings || f.fileSettings.showToStudents !== false) && (type === "reference" ? f.isReference === true : getFileType(f.fileUrl, f.fileType) === type && !f.isReference))
      .map((f: any) => {
        const ft = getFileType(f.fileUrl, f.fileType)
        const r: Resource = {
          id: f._id || `f-${Math.random().toString(36).substr(2, 5)}`,
          title: f.fileName || "Untitled", type: f.isReference ? "reference" : ft,
          fileName: f.fileName, fileSize: fmtSize(f.size), uploadedAt: f.uploadedAt,
          isReference: f.isReference || false, fileSettings: f.fileSettings,
          isVideo: f.isVideo, isArchive: f.isArchive,
          availableResolutions: f.availableResolutions || [],
          fileUrlMap: typeof f.fileUrl === 'object' && f.fileUrl !== null ? f.fileUrl : {},
          mcqQuestions: (f as any).mcqQuestions || [], tags: f.tags || [],
          groupId: (f as any).groupId || undefined,
          groupName: (f as any).groupName || undefined,
        }
        if (ft === "link") r.externalUrl = getFileUrl(f.fileUrl)
        else r.fileUrl = getFileUrl(f.fileUrl)
        return r
      })
    const links: Resource[] = type === "link" ? (ad.links || []).map((l: any) => ({
      id: l._id || `l-${Math.random().toString(36).substr(2, 5)}`, title: l.name, type: "link" as ResourceType,
      externalUrl: l.url, uploadedAt: l.uploadedAt, fileSettings: { showToStudents: true, allowDownload: true },
    })) : []
    if (type === "link") return [...dfs.filter(f => f.type === "link"), ...links]
    return dfs
  }

  const getPagesForActivity = (): PedagogyPage[] => {
    if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = { "i-do": "I_Do", "we-do": "We_Do", "you-do": "You_Do" }
    const tk = mk[selectedMethod]; if (!tk) return []
    const cat = selectedItem.pedagogy[tk]
    if (!cat || typeof cat !== 'object' || Array.isArray(cat)) return []
    const fk = Object.keys(cat).find(k => normalizeKey(k) === normalizeKey(selectedActivity))
    if (!fk) return []
    const ad = (cat as any)[fk]
    if (!ad || typeof ad !== 'object' || Array.isArray(ad)) return []
    return Array.isArray(ad.pages) ? ad.pages.filter((p: PedagogyPage) => p?._id && p?.title && p?.combinedCode) : []
  }

  const getExercisesForActivity = (): any[] => {
    if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    try {
      const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = { "i-do": "I_Do", "we-do": "We_Do", "you-do": "You_Do" }
      const tk = mk[selectedMethod]; if (!tk) return []
      const cat = selectedItem.pedagogy[tk]
      if (!cat || typeof cat !== 'object') return []
      const tKey = normalizeKey(selectedActivity)
      if (Array.isArray((cat as any)[tKey])) return (cat as any)[tKey]
      const fk = Object.keys(cat).find(k => normalizeKey(k) === tKey)
      if (fk) { const d = (cat as any)[fk]; if (Array.isArray(d)) return d }
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
    if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    const types: ResourceType[] = []
    if (getPagesForActivity().length > 0) types.push("page")
    if (getFolders().length > 0) types.push("folder")
    const resourceTypes: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "reference"]
    resourceTypes.forEach(t => { if (getResourcesByType(t).length > 0) types.push(t) })
    return types
  }

  const resourcesToDisplay = (() => {
    if (selectedResourceType === "folder") return getFolders()
    if (selectedResourceType === "all") return [...getAllResources(), ...getFolders()]
    return getResourcesByType(selectedResourceType)
  })()

  const getFilteredFolderContents = (): Resource[] => {
    if (!currentFolder?.folderContents) return []
    return [...currentFolder.folderContents]
  }

  const handleDownloadClick = async (resource: Resource, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!resource.isReference || resource.fileSettings?.allowDownload === false) return
    await downloadFile(resource)
  }

  const handleExerciseSelect = async (exercise: any, options?: { resetProgress?: boolean }) => {
    let qs: any[] = []
    if (exercise.questions && Array.isArray(exercise.questions)) qs = exercise.questions
    else if (exercise.exerciseInformation?.questions) qs = exercise.exerciseInformation.questions
    else if (exercise.data?.questions) qs = exercise.data.questions
    if (!qs.length) { toast.warning("Exercise not yet configured."); return }
    const mk: Record<string, string> = { 'i-do': 'I_Do', 'we-do': 'We_Do', 'you-do': 'You_Do' }
    const catP = mk[selectedMethod] || 'We_Do'
    const eid = exercise?._id
    const cname = courseData?.courseName || "Course"
    const stored = { ...exercise, questions: qs, courseId, courseName: cname, context: { courseId, nodeId: selectedItem?.id, nodeTitle: selectedItem?.title, method: selectedMethod, activity: selectedActivity }, storedAt: new Date().toISOString() }
    const nav = (path: string, key: string, extra: Record<string, string> = {}) => {
      localStorage.setItem(key, JSON.stringify(stored))
      router.push(`/lms/pages/courses/coursesdetailedview/${path}?${new URLSearchParams({ courseId, courseName: cname, exerciseId: eid || '', subcategory: selectedActivity || '', category: catP, questionCount: qs.length.toString(), ...extra })}`)
    }
    if (exercise.exerciseType === "Combined") nav('combined', 'currentCombinedExercise', { exerciseName: exercise.exerciseInformation?.exerciseName || 'Combined Exercise' })
    else if (exercise.programmingSettings?.selectedModule === 'Frontend') nav('frontend', 'currentFrontendExercise', { exerciseName: exercise.exerciseInformation?.exerciseName || 'Frontend Exercise', hierarchy: currentHierarchy.toString() })
    else if (exercise.programmingSettings?.selectedModule === 'Database') { toast.info("Opening SQL Exercise...", { autoClose: 2000 }); nav('sql', 'currentSQLExercise', { exerciseName: exercise.exerciseInformation?.exerciseName || 'SQL Exercise' }) }
    else if (exercise.exerciseType === "MCQ") nav('mcq', 'currentMCQExercise', { exerciseName: exercise.exerciseInformation?.exerciseName || 'MCQ Exercise', nodeId: selectedItem?.id || '', nodeName: selectedItem?.title || '', nodeType: selectedItem?.type || '', hierarchy: currentHierarchy.join(',') })
    else if (exercise.exerciseType === "Other") nav('others', 'currentOthersExercise', { exerciseName: exercise.exerciseInformation?.exerciseName || 'Other Exercise', nodeId: selectedItem?.id || '', nodeName: selectedItem?.title || '', nodeType: selectedItem?.type || '', hierarchy: currentHierarchy.join(',') })
    else {
      setExerciseResetProgress(options?.resetProgress ?? false)
      setSelectedExercise(exercise)
    }
  }

  const handleFolderBack = () => {
    const p = [...folderPath]
    p.pop()
    setFolderPath(p)
    if (p.length === 0) {
      setCurrentFolder(null)
    } else {
      setCurrentFolder(p[p.length - 1])
    }
  }

  const buildBreadcrumbs = () => {
    const items: Array<{ label: string; icon?: React.ComponentType<any>; onClick?: () => void; isLast?: boolean }> = []
    const clear = () => {
      localStorage.removeItem('lms_student_selected_node_id')
      localStorage.removeItem('lms_student_selected_method')
      localStorage.removeItem('lms_student_selected_activity')
      setSelectedItem(null); setSelectedMethod(""); setSelectedActivity("")
      setCurrentFolder(null); setFolderPath([]); closeAllViewers()
    }
    items.push({ label: "Dashboard", icon: LayoutDashboard, onClick: () => { clear(); router.push('/lms/pages/studentdashboard') } })
    items.push({ label: "Courses", icon: BookMarked, onClick: () => router.push('/lms/pages/courses') })
    if (courseData) items.push({ label: courseData.courseName, icon: GraduationCap, onClick: clear })
    // if (selectedItem && courseData) {
    //   const fl = (id: string): string => {
    //     for (const m of courseData.modules || []) {
    //       if (m._id === id) return m.title
    //       if (m.subModules) for (const sm of m.subModules) { if (sm._id === id) return sm.title; if (sm.topics) for (const t of sm.topics) { if (t._id === id) return t.title; if (t.subTopics) for (const st of t.subTopics) if (st._id === id) return st.title } }
    //       if (m.topics) for (const t of m.topics) { if (t._id === id) return t.title; if (t.subTopics) for (const st of t.subTopics) if (st._id === id) return st.title }
    //     }
    //     return "Unknown"
    //   }
    //   selectedItem.hierarchy.forEach((hid, i) => {
    //     const lbl = fl(hid)
    //     if (lbl === courseData.courseName) return
    //     items.push({ label: lbl, isLast: i === selectedItem.hierarchy.length - 1 })
    //   })
    // }
    return items
  }

  const toggleModule = (id: string) => { const n = new Set(expandedModules); n.has(id) ? n.delete(id) : n.add(id); setExpandedModules(n) }
  const toggleSubModule = (id: string) => { const n = new Set(expandedSubModules); n.has(id) ? n.delete(id) : n.add(id); setExpandedSubModules(n) }
  const toggleTopic = (id: string) => { const n = new Set(expandedTopics); n.has(id) ? n.delete(id) : n.add(id); setExpandedTopics(n) }

  const preparePageContent = (page: PedagogyPage): string => {
    if (!page._combinedCode) return ''
    const stamped = stampActiveTabOnPlaygrounds(page._combinedCode, [page as any])
    return injectTryItButtons(stamped)
  }

  // ── PedBadge ────────────────────────────────────────────────────────────────
  const PedBadge = ({ val, variant }: { val: number; variant: "ido" | "wedo" | "ydo" }) => {
    if (!val || val === 0) {
      return (
        <span className="inline-flex items-center justify-center min-w-[28px] h-[22px] px-2.5 rounded-md text-[11.5px] font-bold bg-black/[0.03] text-gray-300 border border-black/5">
          —
        </span>
      )
    }
    const cls = {
      ido: "bg-orange-100 text-orange-600 border-orange-200",
      wedo: "bg-blue-100 text-blue-600 border-blue-200",
      ydo: "bg-emerald-100 text-emerald-600 border-emerald-200",
    }[variant]
    return (
      <span className={`inline-flex items-center justify-center min-w-[28px] h-[22px] px-2.5 rounded-md text-[11.5px] font-bold border ${cls}`}>
        {val}
      </span>
    )
  }

  // ── Table header helper ───────────────────────────────────────────────────
  const thCls = "px-3.5 py-2.5 font-bold text-[11px] uppercase tracking-[0.04em] border-b-[1.5px] border-gray-200 whitespace-nowrap text-gray-400"

  // ── countPedResources / countPedExercises ─────────────────────────────────
  const countPedResources = (pedagogy: any, method: "I_Do" | "We_Do" | "You_Do"): number => {
    if (!pedagogy?.[method]) return 0
    const cat = pedagogy[method]
    if (typeof cat !== 'object' || Array.isArray(cat)) return 0
    let n = 0
    Object.values(cat).forEach((act: any) => {
      if (act && typeof act === 'object') n += (act.files?.length || 0) + (act.folders?.length || 0) + (act.pages?.length || 0) + (act.links?.length || 0)
    })
    return n
  }

  const countPedExercises = (pedagogy: any, method: "I_Do" | "We_Do" | "You_Do"): number => {
    if (!pedagogy?.[method]) return 0
    const cat = pedagogy[method]
    if (Array.isArray(cat)) return cat.length
    if (typeof cat === 'object') {
      let exerciseCount = 0
      Object.values(cat).forEach((act: any) => {
        if (act) {
          const hasExerciseFiles = act.files?.some((f: any) => f.exerciseType || f.isExercise) || false
          const hasExercisePages = act.pages?.some((p: any) => p.exerciseType || p.isExercise) || false
          const dedicatedExercises = act.exercises?.length || 0
          if (hasExerciseFiles || hasExercisePages) exerciseCount += 1
          exerciseCount += dedicatedExercises
        }
      })
      return exerciseCount
    }
    return 0
  }

  // ── NEW: Filtered Hierarchy Table Renderer ──────────────────────────────────
  const renderFilteredHierarchyTable = () => {
    if (!selectedItem || !courseData?.modules) return null

    const baseTdCls = "align-middle px-4 py-3 border-b border-gray-100 text-[13px]"

    // Helper to find node by ID
    const findNodeById = (id: string): any => {
      for (const m of courseData.modules) {
        if (m._id === id) return { ...m, type: 'module', module: m }
        if (m.subModules) {
          for (const sm of m.subModules) {
            if (sm._id === id) return { ...sm, type: 'submodule', module: m, submodule: sm }
            if (sm.topics) {
              for (const t of sm.topics) {
                if (t._id === id) return { ...t, type: 'topic', module: m, submodule: sm, topic: t }
                if (t.subTopics) {
                  for (const st of t.subTopics) {
                    if (st._id === id) return { ...st, type: 'subtopic', module: m, submodule: sm, topic: t, subtopic: st }
                  }
                }
              }
            }
          }
        }
        if (m.topics) {
          for (const t of m.topics) {
            if (t._id === id) return { ...t, type: 'topic', module: m, topic: t }
            if (t.subTopics) {
              for (const st of t.subTopics) {
                if (st._id === id) return { ...st, type: 'subtopic', module: m, topic: t, subtopic: st }
              }
            }
          }
        }
      }
      return null
    }

    const selectedNode = findNodeById(selectedItem.id)
    if (!selectedNode) return null

    // Generate rows based on selection type
    const generateRows = (): JSX.Element[] => {
      const rows: JSX.Element[] = []
      let rowIndex = 0

      if (selectedItem.type === 'module') {
        // Show only the selected module's hierarchy
        const module = selectedNode.module
        const moduleTotalRows = (() => {
          let count = 0
          if (module.subModules?.length) {
            module.subModules.forEach((sm: any) => {
              if (sm.topics?.length) sm.topics.forEach((t: any) => { count += t.subTopics?.length || 1 })
              else count += 1
            })
          } else if (module.topics?.length) {
            module.topics.forEach((t: any) => { count += t.subTopics?.length || 1 })
          } else { count = 1 }
          return count
        })()

        if (module.subModules?.length) {
          module.subModules.forEach((submodule: any) => {
            const topics = submodule.topics || []
            if (topics.length) {
              const submoduleTotalRows = topics.reduce((acc: number, t: any) => acc + (t.subTopics?.length || 1), 0)
              topics.forEach((topic: any) => {
                const subtopics = topic.subTopics || []
                const topicRowSpan = subtopics.length || 1
                if (subtopics.length) {
                  subtopics.forEach((subtopic: any, stIdx: number) => {
                    const currentRowIndex = rowIndex++
                    const isFirstRowOfModule = currentRowIndex === 0
                    const isFirstRowOfSubmodule = topics.indexOf(topic) === 0 && stIdx === 0
                    const isFirstRowOfTopic = stIdx === 0
                    const rowBg = currentRowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                    rows.push(
                      <tr key={`${module._id}-${submodule._id}-${topic._id}-${subtopic._id || stIdx}`} className={`ov-tr ${rowBg}`}>
                        {isFirstRowOfModule && (
                          <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                            <div className="flex items-center gap-1.5">
                              {module.title}
                              {(() => {
                                const hrs = hoursMap[module._id] || 0
                                if (!hrs) return null
                                return (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    minWidth: 28, height: 16, padding: '0 4px',
                                    borderRadius: 4, fontSize: '9px', fontWeight: 700,
                                    background: 'rgba(242,119,87,0.12)', color: '#F27757',
                                    border: '1px solid rgba(242,119,87,0.3)',
                                  }}>{hrs} hours</span>
                                )
                              })()}
                            </div>
                          </td>
                        )}
                        {isFirstRowOfSubmodule && (
                          <td rowSpan={submoduleTotalRows} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-500 bg-gray-50/80 border-r border-r-gray-100`}>
                            <div className="flex items-center gap-1.5">
                              {submodule.title}
                              {(() => {
                                const hrs = hoursMap[submodule._id] || 0
                                if (!hrs) return null
                                return (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    minWidth: 28, height: 16, padding: '0 4px',
                                    borderRadius: 4, fontSize: '9px', fontWeight: 700,
                                    background: 'rgba(99,102,241,0.10)', color: '#6366f1',
                                    border: '1px solid rgba(99,102,241,0.25)',
                                  }}>{hrs} hours</span>
                                )
                              })()}
                            </div>
                          </td>
                        )}
                        {isFirstRowOfTopic && (
                          <td rowSpan={topicRowSpan} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>
                            {topic.title}
                          </td>
                        )}
                        <td className={`${baseTdCls} text-[12px] text-gray-500`}>{subtopic.title}</td>
                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "I_Do")} variant="ido" /></td>
                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(subtopic.pedagogy, "We_Do")} variant="wedo" /></td>
                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "You_Do")} variant="ydo" /></td>
                      </tr>
                    )
                  })
                } else {
                  const currentRowIndex = rowIndex++
                  const isFirstRowOfModule = currentRowIndex === 0
                  const isFirstRowOfSubmodule = topics.indexOf(topic) === 0
                  const rowBg = currentRowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                  rows.push(
                    <tr key={`${module._id}-${submodule._id}-${topic._id}`} className={`ov-tr ${rowBg}`}>
                      {isFirstRowOfModule && (
                        <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                          {module.title}
                        </td>
                      )}
                      {isFirstRowOfSubmodule && (
                        <td rowSpan={submoduleTotalRows} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-500 bg-gray-50/80 border-r border-r-gray-100`}>
                          {submodule.title}
                        </td>
                      )}
                      <td className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>{topic.title}</td>
                      <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                      <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "I_Do")} variant="ido" /></td>
                      <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(topic.pedagogy, "We_Do")} variant="wedo" /></td>
                      <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "You_Do")} variant="ydo" /></td>
                    </tr>
                  )
                }
              })
            } else {
              const currentRowIndex = rowIndex++
              const rowBg = currentRowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
              rows.push(
                <tr key={`${module._id}-${submodule._id}`} className={`ov-tr ${rowBg}`}>
                  {currentRowIndex === 0 && (
                    <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                      {module.title}
                    </td>
                  )}
                  <td className={`${baseTdCls} font-semibold text-[12.5px] text-gray-500 bg-gray-50/80 border-r border-r-gray-100`}>{submodule.title}</td>
                  <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                  <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(submodule.pedagogy, "I_Do")} variant="ido" /></td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(submodule.pedagogy, "We_Do")} variant="wedo" /></td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(submodule.pedagogy, "You_Do")} variant="ydo" /></td>
                </tr>
              )
            }
          })
        } else if (module.topics?.length) {
          module.topics.forEach((topic: any) => {
            const subtopics = topic.subTopics || []
            const topicRowSpan = subtopics.length || 1
            if (subtopics.length) {
              subtopics.forEach((subtopic: any, stIdx: number) => {
                const currentRowIndex = rowIndex++
                const isFirstRowOfTopic = stIdx === 0
                const rowBg = currentRowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                rows.push(
                  <tr key={`${module._id}-${topic._id}-${subtopic._id || stIdx}`} className={`ov-tr ${rowBg}`}>
                    {currentRowIndex === 0 && (
                      <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                        {module.title}
                      </td>
                    )}
                    <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                    {isFirstRowOfTopic && (
                      <td rowSpan={topicRowSpan} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>
                        {topic.title}
                      </td>
                    )}
                    <td className={`${baseTdCls} text-[12px] text-gray-500`}>{subtopic.title}</td>
                    <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "I_Do")} variant="ido" /></td>
                    <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(subtopic.pedagogy, "We_Do")} variant="wedo" /></td>
                    <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "You_Do")} variant="ydo" /></td>
                  </tr>
                )
              })
            } else {
              const currentRowIndex = rowIndex++
              const rowBg = currentRowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
              rows.push(
                <tr key={`${module._id}-${topic._id}`} className={`ov-tr ${rowBg}`}>
                  {currentRowIndex === 0 && (
                    <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                      {module.title}
                    </td>
                  )}
                  <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                  <td className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>{topic.title}</td>
                  <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "I_Do")} variant="ido" /></td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(topic.pedagogy, "We_Do")} variant="wedo" /></td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "You_Do")} variant="ydo" /></td>
                </tr>
              )
            }
          })
        }
      } else if (selectedItem.type === 'submodule') {
        // Show only the selected submodule's hierarchy
        const submodule = selectedNode.submodule

        if (submodule.topics?.length) {
          submodule.topics.forEach((topic: any) => {
            const subtopics = topic.subTopics || []
            if (subtopics.length) {
              subtopics.forEach((subtopic: any, stIdx: number) => {
                const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                rowIndex++
                rows.push(
                  <tr key={`${submodule._id}-${topic._id}-${subtopic._id || stIdx}`} className={`ov-tr ${rowBg}`}>
                    {stIdx === 0 && (
                      <td rowSpan={subtopics.length} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>
                        {topic.title}
                      </td>
                    )}
                    <td className={`${baseTdCls} text-[12px] text-gray-500`}>{subtopic.title}</td>
                    <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "I_Do")} variant="ido" /></td>
                    <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(subtopic.pedagogy, "We_Do")} variant="wedo" /></td>
                    <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "You_Do")} variant="ydo" /></td>
                  </tr>
                )
              })
            } else {
              const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
              rowIndex++
              rows.push(
                <tr key={`${submodule._id}-${topic._id}`} className={`ov-tr ${rowBg}`}>
                  <td className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>{topic.title}</td>
                  <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "I_Do")} variant="ido" /></td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(topic.pedagogy, "We_Do")} variant="wedo" /></td>
                  <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "You_Do")} variant="ydo" /></td>
                </tr>
              )
            }
          })
        }
      } else if (selectedItem.type === 'topic') {
        // Show only the selected topic's subtopics
        const topic = selectedNode.topic
        const subtopics = topic.subTopics || []

        if (subtopics.length) {
          subtopics.forEach((subtopic: any) => {
            const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
            rowIndex++
            rows.push(
              <tr key={`${topic._id}-${subtopic._id}`} className={`ov-tr ${rowBg}`}>
                <td className={`${baseTdCls} text-[12px] text-gray-500`}>{subtopic.title}</td>
                <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "I_Do")} variant="ido" /></td>
                <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(subtopic.pedagogy, "We_Do")} variant="wedo" /></td>
                <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "You_Do")} variant="ydo" /></td>
              </tr>
            )
          })
        } else {
          // Show just the topic itself
          const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
          rows.push(
            <tr key={topic._id} className={`ov-tr ${rowBg}`}>
              <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
              <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "I_Do")} variant="ido" /></td>
              <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(topic.pedagogy, "We_Do")} variant="wedo" /></td>
              <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "You_Do")} variant="ydo" /></td>
            </tr>
          )
        }
      } else if (selectedItem.type === 'subtopic') {
        // Show just the subtopic itself
        const subtopic = selectedNode.subtopic
        rows.push(
          <tr key={subtopic._id} className="ov-tr bg-white">
            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "I_Do")} variant="ido" /></td>
            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(subtopic.pedagogy, "We_Do")} variant="wedo" /></td>
            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "You_Do")} variant="ydo" /></td>
          </tr>
        )
      }

      return rows
    }

    const rows = generateRows()

    // Render table headers based on selection type
    const renderTableHeaders = () => {
      if (selectedItem.type === 'module') {
        return (
          <tr className="bg-gray-50">
            <th className={`${thCls} text-left pl-4`}>Module</th>
            <th className={`${thCls} text-left`}>Submodule</th>
            <th className={`${thCls} text-left`}>Topic</th>
            <th className={`${thCls} text-left`}>Sub-topic</th>
            <th className={`${thCls} text-center text-orange-400`}>📚 I Do  (Resources)</th>
            <th className={`${thCls} text-center text-blue-400`}>✏️ We Do (Exercises)</th>
            <th className={`${thCls} text-center text-emerald-500`}>🎯 You Do </th>
          </tr>
        )
      } else if (selectedItem.type === 'submodule') {
        return (
          <tr className="bg-gray-50">
            <th className={`${thCls} text-left pl-4`}>Topic</th>
            <th className={`${thCls} text-left`}>Sub-topic</th>
            <th className={`${thCls} text-center text-orange-400`}>📚 I Do (Resources)</th>
            <th className={`${thCls} text-center text-blue-400`}>✏️ We Do (Exercises)</th>
            <th className={`${thCls} text-center text-emerald-500`}>🎯 You Do</th>
          </tr>
        )
      } else if (selectedItem.type === 'topic') {
        return (
          <tr className="bg-gray-50">
            <th className={`${thCls} text-left pl-4`}>Sub-topic</th>
            <th className={`${thCls} text-center text-orange-400`}>📚 I Do (Resources)</th>
            <th className={`${thCls} text-center text-blue-400`}>✏️ We Do (Exercises)</th>
            <th className={`${thCls} text-center text-emerald-500`}>🎯 You Do</th>
          </tr>
        )
      } else {
        return (
          <tr className="bg-gray-50">
            <th className={`${thCls} text-center text-orange-400`}>📚 I Do (Resources)</th>
            <th className={`${thCls} text-center text-blue-400`}>✏️ We Do (Exercises)</th>
            <th className={`${thCls} text-center text-emerald-500`}>🎯 You Do</th>
          </tr>
        )
      }
    }

    return (
      <div className="rounded-xl border-[1.5px] border-gray-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            {renderTableHeaders()}
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Logout button (reused in both sidebars) ───────────────────────────────
  const LogoutBtn = ({ onClick }: { onClick: () => void }) => (
    <div
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 border-t border-gray-100 bg-white cursor-pointer text-[#F27757] hover:text-[#C94F2A] transition-colors"
    >
      <div className="w-[26px] h-[26px] rounded-lg flex-shrink-0 flex items-center justify-center bg-orange-50">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </div>
      <span className="text-[12.5px] font-semibold">Logout</span>
    </div>
  )

  if (error) return <div className="p-6 text-red-500">Error: {error}</div>
  if (isLoading) return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="animate-spin text-orange-400" size={36} />
    </div>
  )

  return (
    <div
      className="bg-[#f1f2f6] overflow-clip h-screen flex flex-col"
      style={{ fontFamily: "'Inter','Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", WebkitFontSmoothing: 'antialiased' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .sb-row{transition:background .12s ease;cursor:pointer}
        .sb-row:not([data-selected="true"]):hover{background:rgba(0,0,0,.02)}
        .sb-scroll{scrollbar-width:thin;scrollbar-color:#E4E0ED transparent}
        .sb-scroll::-webkit-scrollbar{width:3px}
        .sb-scroll::-webkit-scrollbar-thumb{background:#E4E0ED;border-radius:3px}
        @keyframes sbSlide{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ov-tr:hover td{background:rgba(242,119,87,0.05)!important}
        @media(min-width:1024px){.mobile-sidebar-overlay,.mobile-sidebar{display:none!important}}
        @media(max-width:1023px){.desktop-sidebar{display:none!important}}
      `}</style>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/35 z-40 mobile-sidebar-overlay"
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`mobile-sidebar fixed inset-y-0 left-0 w-[280px] z-50 flex flex-col bg-white border-r-[1.5px] border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.10)] transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
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
          className="absolute right-2.5 top-2.5 w-7 h-7 flex items-center justify-center rounded-lg bg-white/16 border border-white/22 text-white cursor-pointer z-10"
        >
          <ChevronLeftIcon size={16} strokeWidth={2.5} />
        </button>
        <div className="sb-scroll flex-1 min-h-0 overflow-y-auto bg-white">
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
            courseId={courseId}
            studentProgress={studentProgress}
          />
        </div>
        <LogoutBtn onClick={() => { setSidebarOpen(false); setShowLogoutModal(true) }} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Desktop sidebar */}
        <div
          className="desktop-sidebar flex flex-col relative flex-shrink-0 self-stretch bg-white border border-gray-200 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_18px_rgba(17,24,39,0.04)] overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: sidebarOpen ? 280 : 0, minWidth: 0 }}
        >
          <div className="w-[280px] flex-1 min-h-0 flex flex-col relative">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-[14px] top-1/2 -translate-y-1/2 z-20 w-6 h-12 rounded-r-[10px] flex items-center justify-center bg-white border border-gray-200 border-l-0 shadow-[3px_0_10px_rgba(0,0,0,0.07)] cursor-pointer text-slate-400 hover:bg-orange-50 hover:text-orange-400 transition-all duration-200"
            >
              <ChevronLeftIcon size={14} strokeWidth={2.5} />
            </button>
            <SidebarHeader
              courseName={courseData?.courseName || "Course"}
              modulesCount={courseData?.modules?.length || 0}
              sidebarSearch={sidebarSearch}
              onSearchChange={setSidebarSearch}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
            />
            <div className="sb-scroll flex-1 min-h-0 overflow-y-auto bg-white">
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
                courseId={courseId}
                studentProgress={studentProgress}
              />
            </div>
            <LogoutBtn onClick={() => setShowLogoutModal(true)} />
          </div>
        </div>

        {/* Sidebar open toggle button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="desktop-sidebar flex flex-shrink-0 self-center w-5 h-13 rounded-[10px] items-center justify-center bg-white border border-gray-200 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_18px_rgba(17,24,39,0.04)] cursor-pointer text-slate-400 hover:bg-orange-50 hover:text-orange-400 hover:w-6 transition-all duration-200"
          >
            <ChevronRightIcon size={13} strokeWidth={2.5} />
          </button>
        )}

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-clip min-h-0 bg-white border border-gray-200 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_18px_rgba(17,24,39,0.04)]">
       <TopBar
  items={buildBreadcrumbs()}
  onAIClick={() => setShowAIChat(v => !v)}
  onSummaryClick={() => setShowSummary(v => !v)}
  onMenuClick={() => setSidebarOpen(v => !v)}
  onNotesClick={() => setShowNotesPanel(v => !v)}  // ADD THIS LINE
  showAIChat={showAIChat}
  showSummary={showSummary}
/>

          {/* 3-column split row */}
          <div className="flex-1 flex overflow-clip min-h-0">

            {/* Main content column */}
            <div className="flex-1 flex flex-col overflow-clip min-h-0">
              <div className="flex flex-col flex-1 overflow-clip min-h-0">

                {/* TabBar always on top */}
                <TabBar
                  selectedNode={!!selectedItem}
                  activeTab={activeTab}
                  activeSubcategory={activeSubcategory}
                  subcategories={subcategories}
                  onTabChange={handleTabChange}
                  onSubcategoryChange={handleSubcategoryChange}
                  onOverviewClick={() => { setSelectedMethod(""); setSelectedActivity("") }}
                />

                {/* ── COURSE-LEVEL OVERVIEW ── */}
                {!selectedItem && (
                  <div className="sb-scroll flex-1 overflow-y-auto px-7 py-6 animate-[fadeIn_.4s_ease_both]">

                    {/* {studentProgress && courseData?.modules && (
                      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-700 mb-1">📊 Your Progress</h3>
                            <p className="text-2xl font-bold text-orange-500">
                              {((studentProgress.visitedNodes.length / countTotalNodes(courseData.modules)) * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {studentProgress.visitedNodes.length} of {countTotalNodes(courseData.modules)} nodes completed
                            </p>
                          </div>
                          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                            <CheckCircle size={32} className="text-orange-500" />
                          </div>
                        </div>

                        <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${(studentProgress.visitedNodes.length / countTotalNodes(courseData.modules)) * 100}%`
                            }}
                          />
                        </div>

                        {studentProgress.lastVisitedNode && (
                          <div className="mt-3 pt-3 border-t border-orange-200">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={12} />
                              Last visited: <span className="font-semibold text-gray-700">
                                {findNodeTitleById(studentProgress.lastVisitedNode, courseData)}
                              </span>
                              {studentProgress.lastVisitedAt && (
                                <span className="text-gray-400 text-[11px]">
                                  {new Date(studentProgress.lastVisitedAt).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )} */}

                    {/* Course header row */}
                    <div className="flex items-start justify-between gap-15 mb-5 flex-wrap">
                      <div className="flex items-center gap-3.5">
                        <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_8px_24px_rgba(242,119,87,0.35)] flex-shrink-0">
                          <BookOpen size={24} className="text-white" />
                        </div>
                        <div>
                          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400">Course Overview</p>
                          <div className="flex items-center gap-2">
                            <h2 className="m-0 text-xl font-extrabold text-gray-900 leading-tight">{courseData?.courseName}</h2>
                            {(() => {
                              const totalHrs = courseData?.modules?.reduce((sum: number, m: any) => {
                                return sum + (hoursMap[m._id] || 0)
                              }, 0) || 0
                              if (!totalHrs) return null
                              return (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  minWidth: 40, height: 24, paddingLeft: 10, paddingRight: 10,
                                  borderRadius: 7, fontSize: '12px', fontWeight: 700,
                                  background: 'rgba(242,119,87,0.12)', color: '#F27757',
                                  border: '1px solid rgba(242,119,87,0.3)',
                                }}>
                                  {totalHrs} hours
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      {(() => {
                        const modCount = courseData?.modules?.length || 0
                        const topicCount = courseData?.modules?.reduce((a: number, m: any) =>
                          a + (m.topics?.length || 0) + (m.subModules?.reduce((b: number, sm: any) => b + (sm.topics?.length || 0), 0) || 0), 0) || 0
                        const subModCount = courseData?.modules?.reduce((a: number, m: any) => a + (m.subModules?.length || 0), 0) || 0
                        const stats = [
                          { label: 'Modules', val: modCount, cls: "bg-orange-50 border-orange-200 text-orange-500" },
                          ...(subModCount > 0 ? [{ label: 'Sub-modules', val: subModCount, cls: "bg-violet-50 border-violet-200 text-violet-500" }] : []),
                          { label: 'Topics', val: topicCount, cls: "bg-blue-50 border-blue-200 text-blue-500" },
                        ]
                        return (
                          <div className="flex gap-2">
                            {stats.map(s => (
                              <div key={s.label} className={`px-3 py-2 rounded-xl border text-center min-w-[70px] ${s.cls}`}>
                                <p className="m-0 text-lg font-extrabold leading-tight">{s.val}</p>
                                <p className="m-0 mt-0.5 text-[9px] font-semibold text-gray-400 tracking-[0.02em]">{s.label}</p>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Description */}
                    <h3 className="mt-2.5 mb-2.5 text-base font-bold text-gray-900">Course Description</h3>
                    {courseData?.courseDescription && (
                      <>
                        <div
                          className="mb-3 text-[13.5px] text-gray-500 leading-[1.8] rounded-xl transition-all duration-300"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: isDescriptionExpanded ? 'unset' : 4,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                          dangerouslySetInnerHTML={{ __html: courseData.courseDescription }}
                        />
                        {descriptionHasMoreContent && (
                          <button
                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                            className="bg-transparent border-none text-orange-400 text-[13px] font-semibold cursor-pointer py-1 mb-5 inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                          >
                            {isDescriptionExpanded ? 'View less' : 'View more'}
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: isDescriptionExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}

                    {/* Course Hierarchy table */}
                    <h3 className="mt-2.5 mb-2.5 text-base font-bold text-gray-900">Course Hierarchy</h3>

                    <div className="rounded-xl border-[1.5px] border-gray-200 overflow-hidden mb-6">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className={`${thCls} text-left pl-4`}>Module</th>
                            <th className={`${thCls} text-left`}>Submodule</th>
                            <th className={`${thCls} text-left`}>Topic</th>
                            <th className={`${thCls} text-left`}>Sub-topic</th>
                            <th className={`${thCls} text-center text-orange-400`}>📚 I Do (Resources)</th>
                            <th className={`${thCls} text-center text-blue-400`}>✏️ We Do (Exercises)</th>
                            <th className={`${thCls} text-center text-emerald-500`}>🎯 You Do</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseData?.modules?.map((module: any) => {
                            const moduleRows: JSX.Element[] = []
                            let moduleRowIndex = 0

                            const moduleTotalRows = (() => {
                              let count = 0
                              if (module.subModules?.length) {
                                module.subModules.forEach((sm: any) => {
                                  if (sm.topics?.length) sm.topics.forEach((t: any) => { count += t.subTopics?.length || 1 })
                                  else count += 1
                                })
                              } else if (module.topics?.length) {
                                module.topics.forEach((t: any) => { count += t.subTopics?.length || 1 })
                              } else { count = 1 }
                              return count
                            })()

                            const baseTdCls = "align-middle px-4 py-3 border-b border-gray-100 text-[13px]"

                            // Case 1: Module has submodules
                            if (module.subModules?.length) {
                              module.subModules.forEach((submodule: any) => {
                                const topics = submodule.topics || []
                                if (topics.length) {
                                  const submoduleTotalRows = topics.reduce((acc: number, t: any) => acc + (t.subTopics?.length || 1), 0)
                                  topics.forEach((topic: any) => {
                                    const subtopics = topic.subTopics || []
                                    const topicRowSpan = subtopics.length || 1
                                    if (subtopics.length) {
                                      subtopics.forEach((subtopic: any, stIdx: number) => {
                                        const rowIndex = moduleRowIndex++
                                        const isFirstRowOfModule = rowIndex === 0
                                        const isFirstRowOfSubmodule = topics.indexOf(topic) === 0 && stIdx === 0
                                        const isFirstRowOfTopic = stIdx === 0
                                        const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                                        moduleRows.push(
                                          <tr key={`${module._id}-${submodule._id}-${topic._id}-${subtopic._id || stIdx}`} className={`ov-tr ${rowBg}`}>
                                            {isFirstRowOfModule && (
                                              <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                                                {module.title}
                                              </td>
                                            )}
                                            {isFirstRowOfSubmodule && (
                                              <td rowSpan={submoduleTotalRows} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-500 bg-gray-50/80 border-r border-r-gray-100`}>
                                                {submodule.title}
                                              </td>
                                            )}
                                            {isFirstRowOfTopic && (
                                              <td rowSpan={topicRowSpan} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>
                                                {topic.title}
                                              </td>
                                            )}
                                            <td className={`${baseTdCls} text-[12px] text-gray-500`}>{subtopic.title}</td>
                                            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "I_Do")} variant="ido" /></td>
                                            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(subtopic.pedagogy, "We_Do")} variant="wedo" /></td>
                                            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "You_Do")} variant="ydo" /></td>
                                          </tr>
                                        )
                                      })
                                    } else {
                                      (() => {
                                        const rowIndex = moduleRowIndex++
                                        const isFirstRowOfModule = rowIndex === 0
                                        const isFirstRowOfSubmodule = topics.indexOf(topic) === 0
                                        const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                                        moduleRows.push(
                                          <tr key={`${module._id}-${submodule._id}-${topic._id}`} className={`ov-tr ${rowBg}`}>
                                            {isFirstRowOfModule && (
                                              <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                                                {module.title}
                                              </td>
                                            )}
                                            {isFirstRowOfSubmodule && (
                                              <td rowSpan={submoduleTotalRows} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-500 bg-gray-50/80 border-r border-r-gray-100`}>
                                                {submodule.title}
                                              </td>
                                            )}
                                            <td className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>{topic.title}</td>
                                            <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                                            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "I_Do")} variant="ido" /></td>
                                            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(topic.pedagogy, "We_Do")} variant="wedo" /></td>
                                            <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "You_Do")} variant="ydo" /></td>
                                          </tr>
                                        )
                                      })()
                                    }
                                  })
                                } else {
                                  const rowIndex = moduleRowIndex++
                                  const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                                  moduleRows.push(
                                    <tr key={`${module._id}-${submodule._id}`} className={`ov-tr ${rowBg}`}>
                                      {rowIndex === 0 && (
                                        <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                                          {module.title}
                                        </td>
                                      )}
                                      <td className={`${baseTdCls} font-semibold text-[12.5px] text-gray-500 bg-gray-50/80 border-r border-r-gray-100`}>{submodule.title}</td>
                                      <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                                      <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                                      <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(submodule.pedagogy, "I_Do")} variant="ido" /></td>
                                      <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(submodule.pedagogy, "We_Do")} variant="wedo" /></td>
                                      <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(submodule.pedagogy, "You_Do")} variant="ydo" /></td>
                                    </tr>
                                  )
                                }
                              })
                            }
                            // Case 2: Module has direct topics
                            else if (module.topics?.length) {
                              module.topics.forEach((topic: any) => {
                                const subtopics = topic.subTopics || []
                                const topicRowSpan = subtopics.length || 1
                                if (subtopics.length) {
                                  subtopics.forEach((subtopic: any, stIdx: number) => {
                                    const rowIndex = moduleRowIndex++
                                    const isFirstRowOfTopic = stIdx === 0
                                    const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                                    moduleRows.push(
                                      <tr key={`${module._id}-${topic._id}-${subtopic._id || stIdx}`} className={`ov-tr ${rowBg}`}>
                                        {rowIndex === 0 && (
                                          <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                                            {module.title}
                                          </td>
                                        )}
                                        <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                                        {isFirstRowOfTopic && (
                                          <td rowSpan={topicRowSpan} className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>
                                            {topic.title}
                                          </td>
                                        )}
                                        <td className={`${baseTdCls} text-[12px] text-gray-500`}>{subtopic.title}</td>
                                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "I_Do")} variant="ido" /></td>
                                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(subtopic.pedagogy, "We_Do")} variant="wedo" /></td>
                                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(subtopic.pedagogy, "You_Do")} variant="ydo" /></td>
                                      </tr>
                                    )
                                  })
                                } else {
                                  (() => {
                                    const rowIndex = moduleRowIndex++
                                    const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                                    moduleRows.push(
                                      <tr key={`${module._id}-${topic._id}`} className={`ov-tr ${rowBg}`}>
                                        {rowIndex === 0 && (
                                          <td rowSpan={moduleTotalRows} className={`${baseTdCls} font-bold text-gray-800 bg-gray-50 border-r-2 border-r-gray-200 pl-4`}>
                                            {module.title}
                                          </td>
                                        )}
                                        <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                                        <td className={`${baseTdCls} font-semibold text-[12.5px] text-gray-800 border-r border-dashed border-r-gray-200`}>{topic.title}</td>
                                        <td className={`${baseTdCls} text-[12px] text-gray-400 text-center`}>—</td>
                                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "I_Do")} variant="ido" /></td>
                                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedExercises(topic.pedagogy, "We_Do")} variant="wedo" /></td>
                                        <td className={`${baseTdCls} text-center`}><PedBadge val={countPedResources(topic.pedagogy, "You_Do")} variant="ydo" /></td>
                                      </tr>
                                    )
                                  })()
                                }
                              })
                            }
                            return moduleRows
                          })}
                        </tbody>
                      </table>
                    </div>

                    <p className="m-0 text-[12px] text-gray-400 text-center">
                      Select a module from the sidebar to dive in →
                    </p>
                  </div>
                )}

                {/* ── ITEM SELECTED — Overview tab ── */}
                {selectedItem && activeTab === "Overview" && (
                  <div className="sb-scroll flex-1 overflow-y-auto px-6 py-5 animate-[fadeIn_.3s_ease_both]">

                    {/* Header with title */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-[46px] h-[46px] rounded-2xl flex items-center justify-center shadow-[0_4px_14px_rgba(242,119,87,0.28)] flex-shrink-0 ${selectedItem.type === 'module' ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                          selectedItem.type === 'submodule' ? 'bg-gradient-to-br from-violet-500 to-violet-700' :
                            selectedItem.type === 'topic' ? 'bg-gradient-to-br from-teal-500 to-teal-700' :
                              'bg-gradient-to-br from-indigo-500 to-indigo-700'
                        }`}>
                        {selectedItem.type === 'module' ? <BookOpen size={20} className="text-white" /> :
                          selectedItem.type === 'submodule' ? <Layers size={20} className="text-white" /> :
                            <Hash size={20} className="text-white" />}
                      </div>
                      <div>
                        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400">
                          {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
                        </p>
                        <div className="flex items-center gap-2">
                          <h2 className="m-0 text-lg font-extrabold text-gray-900 leading-tight">{selectedItem.title}</h2>
                          {(() => {
                            const hrs = hoursMap[selectedItem.id] || 0
                            if (!hrs) return null
                            return (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: 36, height: 22, paddingLeft: 8, paddingRight: 8,
                                borderRadius: 6, fontSize: '12px', fontWeight: 700,
                                background: 'rgba(242,119,87,0.12)', color: '#F27757',
                                border: '1px solid rgba(242,119,87,0.3)',
                              }}>
                                {hrs} hours
                              </span>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Course Overview Button */}
                      <button
                        onClick={() => {
                          setSelectedItem(null)
                          setSelectedMethod("")
                          setSelectedActivity("")
                          setCurrentFolder(null)
                          setFolderPath([])
                          closeAllViewers()
                          localStorage.removeItem('lms_student_selected_node_id')
                          localStorage.removeItem('lms_student_selected_method')
                          localStorage.removeItem('lms_student_selected_activity')
                        }}
                        className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-500 text-[12px] font-semibold hover:bg-orange-100 transition-colors cursor-pointer"
                      >
                        <BookOpen size={13} />
                        Course Overview
                      </button>
                    </div>

                    {/* Description display */}
                    {(() => {
                      const desc = findNodeDescription(selectedItem.id)

                      const escapeHtml = (text: string) => {
                        return text
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                      }

                      const getDescriptionHeading = () => {
                        switch (selectedItem.type) {
                          case 'module': return 'Module Description'
                          case 'submodule': return 'Submodule Description'
                          case 'topic': return 'Topic Description'
                          case 'subtopic': return 'Subtopic Description'
                          default: return 'Description'
                        }
                      }

                      return desc ? (
                        <>
                          <h3 className="mt-2.5 mb-2.5 text-base font-bold text-gray-900">{getDescriptionHeading()}</h3>
                          <div
                            className="mb-3 text-[13.5px] text-gray-500 leading-[1.8] rounded-xl whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{ __html: escapeHtml(desc) }}
                          />
                        </>
                      ) : (
                        <>
                          <h3 className="mt-2.5 mb-2.5 text-base font-bold text-gray-900">{getDescriptionHeading()}</h3>
                          <div className="mb-3 text-[13.5px] text-gray-400 leading-[1.8] rounded-xl italic">
                            No description available for this {selectedItem.type}.
                          </div>
                        </>
                      )
                    })()}

                    {/* Filtered Hierarchy Table */}
                    <h3 className="mt-2.5 mb-2.5 text-base font-bold text-gray-900">
                      {selectedItem.type === 'module' ? 'Module Hierarchy' :
                        selectedItem.type === 'submodule' ? 'Submodule Hierarchy' :
                          selectedItem.type === 'topic' ? 'Topic Hierarchy' : 'Subtopic Details'}
                    </h3>
                    {renderFilteredHierarchyTable()}

                    {/* Empty state for subtopic with no resources */}
                    {selectedItem.type === 'subtopic' &&
                      countPedResources(selectedItem.pedagogy, "I_Do") === 0 &&
                      countPedExercises(selectedItem.pedagogy, "We_Do") === 0 &&
                      countPedResources(selectedItem.pedagogy, "You_Do") === 0 && (
                        <div className="text-center px-5 py-8 bg-gray-50 rounded-xl border border-gray-200 mt-4">
                          <Hash size={28} className="text-gray-300 mx-auto mb-2.5 block" />
                          <p className="m-0 mb-1 font-semibold text-[13px] text-gray-800">No resources configured</p>
                          <p className="m-0 text-[12px] text-gray-400">Content will appear here once the instructor adds resources.</p>
                        </div>
                      )}
                  </div>
                )}

                {/* ── ITEM SELECTED — I Do / We Do / You Do tab content ── */}
                {selectedItem && activeTab !== "Overview" && (
                  <div className="flex-1 overflow-clip min-h-0 flex flex-col p-3.5 gap-3">

                    {currentFolder && (
                      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border-[1.5px] border-gray-200">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleFolderBack}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-semibold text-gray-400 cursor-pointer hover:bg-orange-50 transition-colors"
                          >
                            <ChevronLeft size={12} />Back
                          </button>
                          <div className="w-px h-4 bg-gray-200" />
                          <Folder size={14} className="text-gray-400" />
                          <span className="text-[12.5px] font-semibold text-gray-800">{currentFolder.title}</span>
                        </div>
                        <span className="text-[11px] text-gray-400">{getFilteredFolderContents().length} items</span>
                      </div>
                    )}

                    {selectedMethod && selectedActivity && !currentFolder && (
                      <div className="flex flex-col flex-1 overflow-clip min-h-0">
                        {(() => {
                          const exs = getExercisesForActivity()
                          if (exs.length > 0 && selectedExercise) {
                            // Render as a fixed fullscreen overlay via portal — hides sidebar + nav completely
                            return ReactDOM.createPortal(
                              <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {selectedExercise?.programmingSettings?.selectedModule === 'Core Programming' && (
                                  <CodeEditor exercise={selectedExercise} theme={resolvedTheme as "light" | "dark"} breadcrumbCollapsed={false} onBreadcrumbCollapseToggle={() => {}} courseId={courseId} nodeId={selectedItem?.id || ""} nodeName={selectedItem?.title || ""} nodeType={selectedItem?.type || ""} subcategory={selectedActivity} category={selectedMethod === 'i-do' ? "I_Do" : selectedMethod === 'we-do' ? "We_Do" : "You_Do"} onBack={() => setSelectedExercise(null)} onCloseExercise={() => setSelectedExercise(null)} courseName={courseData?.courseName || ''} hierarchy={currentHierarchy} resetProgress={exerciseResetProgress} onNavigateToBreadcrumb={(level) => { setSelectedExercise(null); if (level === 'course') { setSelectedItem(null); setSelectedMethod(''); setSelectedActivity(''); } else if (level === 'hierarchy') { setSelectedMethod(''); setSelectedActivity(''); } }} />
                                )}
                                {selectedExercise?.programmingSettings?.selectedModule === 'Database' && (
                                  <DBQueryEditor exercise={selectedExercise} theme={resolvedTheme as "light" | "dark"} courseId={courseId} nodeId={selectedItem?.id || ""} nodeName={selectedItem?.title || ""} nodeType={selectedItem?.type || ""} subcategory={selectedActivity} category={selectedMethod === 'i-do' ? "I_Do" : selectedMethod === 'we-do' ? "We_Do" : "You_Do"} onBack={() => setSelectedExercise(null)} onCloseExercise={() => setSelectedExercise(null)} />
                                )}
                              </div>,
                              document.body
                            )
                          }
                          if (exs.length > 0) {
                            return (
                              <div className="exercises-portal-host flex-1 min-h-0 flex flex-col overflow-visible">
                                <Exercises
                                  courseId={courseId} exercises={exs} onExerciseSelect={handleExerciseSelect}
                                  method={selectedMethod} category={selectedMethod === 'i-do' ? 'I_Do' : selectedMethod === 'you-do' ? 'You_Do' : 'We_Do'}
                                  subcategory={selectedActivity || ''} topic={selectedItem?.title || ''}
                                  module={currentHierarchy.length > 0 ? currentHierarchy[0] : selectedItem?.title || ''}
                                  nodeType={selectedItem?.type || ''} hierarchy={currentHierarchy}
                                  selectedItem={selectedItem} currentHierarchy={currentHierarchy}
                                  studentAnswers={getStudentAnswers()}
                                />
                              </div>
                            )
                          }
                          const avail = getAvailableResourceTypes()
                          if (avail.length === 0) return <EmptyCard icon={File} title="No resources yet" sub="This activity has no content yet." />
                          return (
                            <div className="flex flex-col flex-1 overflow-clip min-h-0 gap-2.5">
                              {(() => {
                                const FILTER_PNG: Record<string, string> = {
                                  page: '/icons/page.png', folder: '/icons/folder.png',
                                  pdf: '/icons/pdf.png', ppt: '/icons/ppt.png', link: '/icons/link.png',
                                }
                                const FilterIcon = ({ type, sel }: { type: string; sel: boolean }) => {
                                  const src = FILTER_PNG[type]
                                  if (src) return <img src={src} alt={type} className="w-[15px] h-[15px] object-contain block flex-shrink-0 transition-[filter]" style={{ filter: sel ? 'brightness(0) invert(1)' : 'none' }} />
                                  return <ResIcon type={type} size={13} />
                                }
                                return (
                                  <div className="sb-scroll flex-shrink-0 flex items-center gap-[3px] p-1 rounded-xl bg-gray-50 border-[1.5px] border-gray-200 overflow-x-auto">
                                    {/* All button — always first */}
                                    <button
                                      onClick={() => { setSelectedResourceType("all"); setUserSelectedResourceType(true) }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[11.5px] font-semibold cursor-pointer border-none transition-all flex-shrink-0"
                                      style={{ background: selectedResourceType === "all" ? `linear-gradient(135deg,${T.textSub},${T.textMuted})` : 'transparent', color: selectedResourceType === "all" ? '#fff' : T.textSub }}
                                      onMouseEnter={e => { if (selectedResourceType !== "all") (e.currentTarget as HTMLElement).style.background = '#f8f8fa' }}
                                      onMouseLeave={e => { if (selectedResourceType !== "all") (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                                    >
                                      <File size={13} />All
                                      <span className="px-1 rounded-[5px] text-[10px] font-bold" style={{ background: selectedResourceType === "all" ? 'rgba(255,255,255,.22)' : '#f3f4f6', color: selectedResourceType === "all" ? '#fff' : T.textMuted }}>{getAllResources().length + getFolders().length}</span>
                                    </button>
                                    {(["page", "folder", "pdf", "ppt", "video", "zip", "link", "reference"] as ResourceType[]).map(type => {
                                      let hasContent = false, count = 0
                                      if (type === "folder") { count = getFolders().length; hasContent = count > 0 }
                                      else if (type === "page") { count = getPagesForActivity().length; hasContent = count > 0 }
                                      else { count = getResourcesByType(type).length; hasContent = count > 0 }
                                      if (!hasContent) return null
                                      const isSel = selectedResourceType === type
                                      const col = type === "folder" ? T.orange : type === "reference" ? "#3b82f6" : (RES_COLOR[type] || T.textMuted)
                                      return (
                                        <button
                                          key={type}
                                          onClick={() => { setSelectedResourceType(type); setUserSelectedResourceType(true) }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[11.5px] font-semibold cursor-pointer border-none transition-all flex-shrink-0"
                                          style={{
                                            background: isSel ? `linear-gradient(135deg,${col},${col}cc)` : 'transparent',
                                            color: isSel ? '#fff' : T.textSub,
                                            boxShadow: isSel ? `0 2px 8px ${col}40` : 'none',
                                          }}
                                          onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '#f8f8fa' }}
                                          onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                                        >
                                          <FilterIcon type={type} sel={isSel} />
                                          {type === "folder" ? "Folders" : RES_LABEL[type]}
                                          <span className="px-1 rounded-[5px] text-[10px] font-bold" style={{ background: isSel ? 'rgba(255,255,255,.22)' : '#f3f4f6', color: isSel ? '#fff' : T.textMuted }}>{count}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )
                              })()}
                              <div className="flex-1 overflow-hidden rounded-2xl bg-gray-50 border-[1.5px] border-gray-200 flex flex-col">
                                {selectedResourceType === "page" ? (() => {
                                  const pages = getResourcesByType("page")
                                  if (!pages.length) return null
                                  const page = pages[inlinePageIndex]
                                  const processedContent = preparePageContent(page)
                                  return (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                      <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 bg-white flex-shrink-0">
                                        <button
                                          disabled={inlinePageIndex === 0}
                                          onClick={() => setInlinePageIndex(i => i - 1)}
                                          className="flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-200 text-[12px] font-semibold disabled:cursor-not-allowed disabled:text-gray-300 disabled:bg-gray-50 cursor-pointer"
                                        >
                                          <ChevronLeft size={13} />Prev
                                        </button>
                                        <span className="text-[12px] font-semibold text-gray-500">{page.title}&nbsp;·&nbsp;{inlinePageIndex + 1} / {pages.length}</span>
                                        <button
                                          disabled={inlinePageIndex === pages.length - 1}
                                          onClick={() => setInlinePageIndex(i => i + 1)}
                                          className="flex items-center gap-1 px-3 py-1 rounded-lg border border-gray-200 text-[12px] font-semibold disabled:cursor-not-allowed disabled:text-gray-300 disabled:bg-gray-50 cursor-pointer"
                                        >
                                          Next<ChevronRightIcon size={13} />
                                        </button>
                                      </div>
                                      <iframe key={page.id} srcDoc={processedContent} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" className="flex-1 border-none w-full bg-white" title={page.title} />
                                    </div>
                                  )
                                })() : (
                                  resourcesToDisplay.length > 0 ? (
                                    <div className="sb-scroll flex-1 overflow-y-auto">
                                      <SortHeader onSort={f => setSortConfig(p => ({ field: f, direction: p.field === f && p.direction === "asc" ? "desc" : "asc" }))} cfg={sortConfig} />
                                      {(() => {
                                        const animType = selectedMethod === "i-do" ? "resource" : selectedMethod === "we-do" ? "wedo" : "none"
                                        const sorted = [...resourcesToDisplay].sort((a, b) => {
                                          let av: any, bv: any
                                          if (sortConfig.field === "name") { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
                                          else if (sortConfig.field === "size") { av = parseSize(a.fileSize || "-"); bv = parseSize(b.fileSize || "-") }
                                          else { av = parseDate(a.uploadedAt || ""); bv = parseDate(b.uploadedAt || "") }
                                          const c = av < bv ? -1 : av > bv ? 1 : 0
                                          return sortConfig.direction === "asc" ? c : -c
                                        })
                                        // Separate standalone files from grouped files
                                        const standalones = sorted.filter(r => !r.groupId)
                                        const groupMap = sorted.filter(r => !!r.groupId).reduce((acc, r) => {
                                          const gid = r.groupId!
                                          if (!acc[gid]) acc[gid] = { groupId: gid, groupName: r.groupName || 'File Group', files: [] }
                                          acc[gid].files.push(r)
                                          return acc
                                        }, {} as Record<string, { groupId: string; groupName: string; files: Resource[] }>)
                                        const groupList = Object.values(groupMap)
                                        return (
                                          <>
                                            {standalones.map((r, i) => (
                                              <ResourceItem key={r.id} resource={r} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick} animType={animType} />
                                            ))}
                                            {groupList.map(group => {
                                              const isExpanded = expandedGroups.has(group.groupId)
                                              const toggleGroup = () => setExpandedGroups(prev => {
                                                const next = new Set(prev)
                                                if (next.has(group.groupId)) next.delete(group.groupId)
                                                else next.add(group.groupId)
                                                return next
                                              })
                                              return (
                                                <div key={group.groupId}>
                                                  {/* Group header row */}
                                                  <div
                                                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none border-b border-gray-100 hover:bg-orange-50 transition-colors"
                                                    style={{ background: isExpanded ? 'rgba(242,119,87,0.04)' : undefined }}
                                                    onClick={toggleGroup}
                                                  >
                                                    <ChevronRight size={13} style={{ color: T.orange, flexShrink: 0, transition: 'transform 0.18s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                                                    <Folder size={14} style={{ color: T.orange, flexShrink: 0 }} />
                                                    <span className="text-[12px] font-bold flex-1 truncate" style={{ color: '#1a1a2e' }}>{group.groupName}</span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: 'rgba(242,119,87,0.1)', color: T.orange }}>
                                                      {group.files.length} {group.files.length === 1 ? 'file' : 'files'}
                                                    </span>
                                                  </div>
                                                  {/* Expanded child rows */}
                                                  {isExpanded && (
                                                    <div style={{ borderLeft: `2px solid rgba(242,119,87,0.2)`, marginLeft: 14 }}>
                                                      {group.files.map((r, i) => (
                                                        <ResourceItem key={r.id} resource={r} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick} animType={animType} />
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </>
                                        )
                                      })()}
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex items-center justify-center p-8">
                                      <div className="text-center">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2.5 bg-gray-100">
                                          <File size={18} className="text-gray-400" />
                                        </div>
                                        <p className="font-semibold text-[12.5px] text-gray-800 m-0 mb-1">No matching resources</p>
                                        <p className="text-[11.5px] text-gray-400 m-0">Try a different filter</p>
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
                      <div className="flex-1 overflow-hidden rounded-2xl bg-gray-50 border-[1.5px] border-gray-200 flex flex-col">
                        {getFilteredFolderContents().length > 0 ? (
                          <div className="sb-scroll flex-1 overflow-y-auto">
                            <SortHeader onSort={f => setSortConfig(p => ({ field: f, direction: p.field === f && p.direction === "asc" ? "desc" : "asc" }))} cfg={sortConfig} />
                            {[...getFilteredFolderContents()].sort((a, b) => {
                              let av: any, bv: any
                              if (sortConfig.field === "name") { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
                              else if (sortConfig.field === "size") { av = parseSize(a.fileSize || "-"); bv = parseSize(b.fileSize || "-") }
                              else { av = parseDate(a.uploadedAt || ""); bv = parseDate(b.uploadedAt || "") }
                              const c = av < bv ? -1 : av > bv ? 1 : 0
                              return sortConfig.direction === "asc" ? c : -c
                            }).map((r, i) => <ResourceItem key={r.id} resource={r} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick} animType={selectedMethod === "i-do" ? "resource" : selectedMethod === "we-do" ? "wedo" : "none"} />)}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center p-8 text-center">
                            <div>
                              <Folder size={20} className="text-gray-400 mx-auto mb-2.5 block" />
                              <p className="font-semibold text-[12.5px] text-gray-800 m-0 mb-1">Folder is empty</p>
                              <p className="text-[11.5px] text-gray-400 m-0">No files here yet</p>
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

            {/* Ask AI side panel */}
            {showAIChat && (
              <div className="w-[380px] flex-shrink-0 flex flex-col overflow-clip border-l border-gray-200 animate-[fadeIn_.22s_ease_both]">
                <InlineAIChat
                  onClose={() => setShowAIChat(false)}
                  context={{ topicTitle: selectedItem?.title, fileName: activeViewer.resource?.title }}
                />
              </div>
            )}

            {/* Summary side panel */}
            {showSummary && (
              <div className="w-[380px] flex-shrink-0 flex flex-col overflow-clip border-l border-gray-200 animate-[fadeIn_.22s_ease_both]">
                <InlineSummaryChat
                  onClose={() => setShowSummary(false)}
                  context={{ topicTitle: selectedItem?.title, fileName: activeViewer.resource?.title, hierarchy: currentHierarchy }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panels and Viewers */}
<NotesPanel 
  isOpen={showNotesPanel} 
  onClose={() => setShowNotesPanel(false)} 
  isDraggable={true} 
/>      <AIPanel isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} fileUrl={activeViewer.resource?.fileUrl || ""} title={activeViewer.resource?.title || selectedItem?.title || ""} fileType={activeViewer.type === 'video' ? 'video' : activeViewer.type === 'ppt' ? 'ppt' : 'pdf'} courseContext={!activeViewer.resource && selectedItem ? { topicTitle: selectedItem.title, isDocumentView: false } : undefined} />
      {activeViewer.type === "zip" && activeViewer.resource && <ZipViewer fileUrl={getFileUrl(activeViewer.resource.fileUrl || "")} fileName={activeViewer.resource.title} onClose={closeAllViewers} isOpen={true} />}
      {activeViewer.type === "video" && activeViewer.resource && (
        <VideoPlayer isOpen={true} onClose={closeAllViewers} videoUrl={getFileUrlString(activeViewer.resource.fileUrl)} title={activeViewer.resource.title} onNotesClick={() => setShowNotesPanel(true)} onNotesStateChange={v => setShowNotesPanel(v)} showNotesPanel={showNotesPanel} hierarchy={currentHierarchy} currentItemTitle={selectedItem?.title} mcqQuestions={activeViewer.resource.mcqQuestions || []} availableResolutions={activeViewer.resource.availableResolutions || []} fileUrlMap={activeViewer.resource.fileUrlMap || {}} aiChatEnabled={courseData?.resourcesType?.iDo?.video?.aiChat || false} aiSummaryEnabled={courseData?.resourcesType?.iDo?.video?.aiSummary || false} notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled || false} onResolutionChange={(resolution, url) => { if (activeViewer.resource) setActiveViewer({ ...activeViewer, resource: { ...activeViewer.resource, fileUrl: url, currentResolution: resolution } }) }} />
      )}
      {activeViewer.type === "ppt" && activeViewer.resource && <PPTViewer isOpen={true} onClose={closeAllViewers} pptUrl={getFileUrlString(activeViewer.resource.fileUrl)} title={activeViewer.resource.title} onNotesClick={() => setShowNotesPanel(true)} onNotesStateChange={v => setShowNotesPanel(v)} showNotesPanel={showNotesPanel} hierarchy={currentHierarchy}
        currentItemTitle={selectedItem?.title} />}
      {activeViewer.type === "pdf" && activeViewer.resource && (
        <PDFViewer
          fileUrl={getFileUrlString(activeViewer.resource.fileUrl)} fileName={activeViewer.resource.title || "document.pdf"} onClose={closeAllViewers} initialMcqs={activeViewer.resource.mcqQuestions || []} entityType="course" entityId={courseId} tabType="pdf" subcategory={selectedActivity} folderPath={currentHierarchy} aiChatEnabled={courseData?.resourcesType?.iDo?.pdf?.aiChat || false} aiSummaryEnabled={courseData?.resourcesType?.iDo?.pdf?.aiSummary || false} notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled || false} hierarchy={[courseData?.courseName, ...currentHierarchy].filter(Boolean)} currentItemTitle={selectedItem?.title} onNotesClick={() => setShowNotesPanel(true)} onNotesStateChange={v => setShowNotesPanel(v)}
          showNotesPanel={true}
        />
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />

      {showLogoutModal && (
        <LogoutModal
          onConfirm={() => {
            setShowLogoutModal(false)
            localStorage.removeItem('smartcliff_roleSwitch')
            localStorage.removeItem('smartcliff_isDummyStudent')
            localStorage.removeItem('lms_student_selected_node_id')
            localStorage.removeItem('lms_student_selected_method')
            localStorage.removeItem('lms_student_selected_activity')
            localStorage.clear()
            router.push('/login')
          }}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  )
}