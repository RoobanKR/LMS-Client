// page.tsx - Complete with Progress Tracking
"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import ReactDOM from "react-dom"
import {
  ChevronLeft, ChevronRightIcon, ChevronRight, Folder, File, Target, BookOpen, Code,
  Loader2, LayoutDashboard, BookMarked, GraduationCap, ChevronLeft as ChevronLeftIcon,
  X, Sparkles, Hash, Layers, Eye, CheckCircle, Clock, Search, Filter, LayoutGrid, List, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown, Calendar, Type, FileDigit, FolderOpen, Users, Zap,
} from "lucide-react"
import VideoPlayer from "../../../../component/student/video-player"
import PDFViewer from "../../../../component/student/pdf-viewer"
import PPTViewer from "../../../../component/student/ppt-viewer"
import { useParams, useRouter } from "next/navigation"
import React from "react"
import NotesPanel from "../../../../component/student/notes-panel"
import AIPanel from "../../../../component/student/ai-panel"
import CodeEditor from "../../../../component/student/code-editor"
import MultiFileCodeEditor from "../../../../component/student/multi-file-code-editor"
import ZipViewer from "../../../../component/student/zipViewer"
import ImageViewer from "../../../../component/student/ImageViewer"
import WordViewer from "../../../../component/student/word-viewer"
import Exercises from "../../../../component/student/exercises"
import { useTheme as useNextTheme } from "next-themes"
import AIChat from "@/app/lms/component/student/ai-chat"
import SummaryChat from "@/app/lms/component/student/summary-chat"
import DBQueryEditor from "@/app/lms/component/student/db-queryEditor"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { userPermission } from "@/apiServices/tokenVerify"
import { injectTryItButtons } from '../../utils/injectTryItButtons'
import SectionBasedAssessments from "../../../../component/student/section-based-assessments"
import TxtViewer from "../../../../component/student/textdoc"

// Import progress tracking functions
import {
  recordNodeVisit,
  recordResourceOpen,
  fetchStudentProgress,
  StudentProgress
} from '../../../../../../apiServices/progress';

import { T, METHOD_CFG, RES_LABEL, FONT_PRIMARY, FONT_INTER_IMPORT } from "../components/types/constants"
import { TopBar } from "../components/TopBar"
import { Sidebar, SidebarHeader, LogoutModal, buildHoursMap } from "../components/Sidebar"
import { TabBar } from "../components/TabBar"
import InlineAIChat from "../components/InlineAIChat"
import InlineSummaryChat from "../components/InlineSummaryChat"
import { ResourceCard, ResourceSkeleton, ResourceItem, ResourceGroupRow, EmptyCard, ResIcon, ResourceTableHeader, SidebarSkeleton, TableSkeleton } from "../components/ResourceComponents"
import {
  CourseData, SelectedItem, SelectedItemType, Resource, ResourceType,
  PedagogyPage, PedagogyFolder, PedagogyFile, LearningElement,
  PedagogySubItem
} from "../components/types/types"
import {
  getFileType, getFileUrl, getFileUrlString, formatSubItemName, normalizeKey,
  hasChildItems, hasPedagogyData, shouldShowDownload, downloadFile, openPageInNewTab,
  groupResources,
  fmtSize, parseSize, parseDate, stampActiveTabOnPlaygrounds, detectUrlType
} from "../components/types/utils"


import { fetchAllPedagogyViews, fetchPedagogyViewById } from '../.../../../../../../../apiServices/pedagogyAndModuleAdd/pedagogy';
import StudentTestYourSkillsMCQQuestion from "@/app/lms/component/student/YouDo/testYourSkillMcqquestion"

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
  const [activeViewer, setActiveViewer] = useState<{
    type: "video" | "pdf" | "ppt" | "zip" | "image" | "word" | "txt" | null;
    resource: Resource | null
  }>({ type: null, resource: null })
  const [imagePlaylist, setImagePlaylist] = useState<Array<{ id: string; title: string; fileUrl: string }>>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [currentFolder, setCurrentFolder] = useState<Resource | null>(null)
  const [folderPath, setFolderPath] = useState<Resource[]>([])
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType | "all">("all")
  const [userSelectedResourceType, setUserSelectedResourceType] = useState<boolean>(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
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
  const [resourceSearch, setResourceSearch] = useState("")
  const [showResourceFilters, setShowResourceFilters] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [resourceView, setResourceView] = useState<"grid" | "list">("list")
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "name_asc" | "name_desc" | "size_desc" | "size_asc">("newest")
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)
  const canToggleHeader = activeTab !== "Overview"
const sortDropdownRef = useRef<HTMLDivElement>(null)
const [showTestComponent, setShowTestComponent] = useState(false);
const [testQuestions, setTestQuestions] = useState<any[]>([]);
const [testConfig, setTestConfig] = useState<any>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  // Add this temporarily in your student view render section
useEffect(() => {
  if (selectedMethod && selectedActivity) {
    const folders = getFolders();
    console.log('🔍 FOLDERS DEBUG:', {
      totalFolders: folders.length,
      foldersWithGroupId: folders.filter(f => f.groupId).map(f => ({ name: f.title, groupId: f.groupId })),
      allFolders: folders.map(f => ({ name: f.title, hasGroupId: !!f.groupId, groupId: f.groupId }))
    });
  }
}, [selectedMethod, selectedActivity, selectedItem]);
const handleCloseQuiz = () => {
  setShowTestComponent(false);
  setTestQuestions([]);
  setTestConfig(null);
  // No additional navigation - just close the modal/component
};
const handleOpenTestYourSkills = useCallback(async (testData: any) => {
  if (!testData?.questions || testData.questions.length === 0) {
    toast.warning("No questions available for this test");
    return;
  }

  // Transform the test data to match what StudentTestYourSkillsMCQQuestion expects
  const transformedQuestions = testData.questions.map((q: any, idx: number) => ({
    id: q._id,
    testItemKey: q._id,
    title: q.mcqQuestionTitle,
    type: q.mcqQuestionType || "multiple_choice",
    duration: testData.timeLimit || 60,
    marks: q.mcqQuestionScore || testData.pointsPerQuestion || 1,
    level: q.mcqQuestionDifficulty || "medium",
    status: "active",
    createdAt: q.createdAt || new Date().toISOString(),
    sequence: q.sequence || idx,
    questionData: q,
  }));

  setTestQuestions(transformedQuestions);
  setTestConfig({
    timeLimit: testData.timeLimit || 60,
    passingScore: testData.passingScore || 70,
    attemptLimit: testData.attemptLimit || 1,
    shuffleQuestions: testData.shuffleQuestions || false,
    showResults: testData.showResults !== false,
    totalPoints: testData.totalPoints || transformedQuestions.length,
  });
  setShowTestComponent(true);
}, []);
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
      setShowSortDropdown(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
  // Progress tracking state
  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null)

  // Loading states
  const [isLoadingResources, setIsLoadingResources] = useState(false)

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
  const youDoSubItems = elements.find(e => e.id === "you-do")?.subItems || []
  
  // Add test_your_skills if it exists in the pedagogy
  if (selectedItem?.pedagogy?.You_Do?.test_your_skills) {
    const existingTestSkill = youDoSubItems.find(s => s.key === "test_your_skills")
    if (!existingTestSkill) {
      youDoSubItems.push({
        key: "test_your_skills",
        name: "Test Your Skills",
        description: "",
        files: [],
        folders: [],
        links: []
      })
    }
  }
  
  return {
    I_Do: elements.find(e => e.id === "i-do")?.subItems.map(s => ({ 
      key: s.key, 
      label: s.name, 
      icon: <div />, 
      component: s 
    })) || [],
    We_Do: elements.find(e => e.id === "we-do")?.subItems.map(s => ({ 
      key: s.key, 
      label: s.name, 
      icon: <div />, 
      component: s 
    })) || [],
    You_Do: youDoSubItems.map(s => ({ 
      key: s.key, 
      label: s.name, 
      icon: <div />, 
      component: s 
    })),
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

  useEffect(() => {
    setResourceSearch("")
    setShowResourceFilters(false)
    setShowSortDropdown(false)
  }, [selectedMethod, selectedActivity, selectedItem?.id])

  useEffect(() => {
    if (!canToggleHeader && isHeaderCollapsed) setIsHeaderCollapsed(false)
  }, [canToggleHeader, isHeaderCollapsed])

  const closeAllViewers = () => {
    setActiveViewer({ type: null, resource: null })
    setShowNotesPanel(false)   // ← ADD THIS
  }
  const openViewer = (type: "video" | "pdf" | "ppt" | "zip" | "image" | "word", resource: Resource) => setActiveViewer({ type, resource })

  const refreshCourseData = useCallback(() => {
    if (!courseId) return
    fetch(`https://lms-server-ym1q.onrender.com/getAll/courses-data/${courseId}`)
      .then(r => r.json()).then(d => { setCourseData(d.data || d) })
      .catch(() => { })
  }, [courseId])

  useEffect(() => {
    if (!courseId) { setError("No course ID."); setIsLoading(false); return }
    fetch(`https://lms-server-ym1q.onrender.com/getAll/courses-data/${courseId}`)
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
    setSortOption("newest")

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
      // If navigating from root, always start a fresh path to prevent stale accumulation
      setFolderPath(currentFolder ? (p => [...p, resource]) : [resource])
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
      else if (aft === "image") {
        const playlist = getResourcesByType("image").map(r => ({ id: r.id, title: r.title, fileUrl: getFileUrl(r.fileUrl || '') }))
        const idx = playlist.findIndex(p => p.id === resource.id)
        setImagePlaylist(playlist)
        setCurrentImageIndex(Math.max(0, idx))
        openViewer("image", resource)
      }
      else if (aft === "word") { openViewer("word", resource) }
      else if (aft === "txt") { openViewer("txt", resource) }  // ← ADD THIS

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
      else if (resource.type === "image") {
        const playlist = getResourcesByType("image").map(r => ({ id: r.id, title: r.title, fileUrl: getFileUrl(r.fileUrl || '') }))
        const idx = playlist.findIndex(p => p.id === resource.id)
        setImagePlaylist(playlist)
        setCurrentImageIndex(Math.max(0, idx))
        openViewer("image", resource)
      }
      else if (resource.type === "word") { openViewer("word", resource) }
      else if (resource.type === "txt") { openViewer("txt", resource) }  // ← ADD THIS

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
    // Note: Removed auto-restoration of selected item - students see Course Overview by default
    // const nid = load('lms_student_selected_node_id')
    // const sm = load('lms_student_selected_method')
    // const sa = load('lms_student_selected_activity')
    // if (nid) {
    //   const restore = (id: string, title: string, type: SelectedItemType, hier: string[], ped?: any) => {
    //     handleItemSelect(id, title, type, hier, ped)
    //     if (sm && sa) setTimeout(() => { setSelectedMethod(sm); setSelectedActivity(sa) }, 100)
    //   }
    //   const walk = (modules: any[]): boolean => {
    //     for (const m of modules) {
    //       if (m._id === nid) { restore(m._id, m.title, "module", [m._id], m.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); return true }
    //       if (m.subModules) for (const sub of m.subModules) {
    //         if (sub._id === nid) { restore(sub._id, sub.title, "submodule", [m._id, sub._id], sub.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); return true }
    //         if (sub.topics) for (const t of sub.topics) {
    //           if (t._id === nid) { restore(t._id, t.title, "topic", [m._id, sub._id, t._id], t.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
    //           if (t.subTopics) for (const st of t.subTopics) if (st._id === nid) { restore(st._id, st.title, "subtopic", [m._id, sub._id, t._id, st._id], st.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedSubModules(p => new Set(p).add(sub._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
    //         }
    //       }
    //       if (m.topics) for (const t of m.topics) {
    //         if (t._id === nid) { restore(t._id, t.title, "topic", [m._id, t._id], t.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
    //         if (t.subTopics) for (const st of t.subTopics) if (st._id === nid) { restore(st._id, st.title, "subtopic", [m._id, t._id, st._id], st.pedagogy); setExpandedModules(p => new Set(p).add(m._id)); setExpandedTopics(p => new Set(p).add(t._id)); return true }
    //       }
    //     }
    //     return false
    //   }
    //   walk(courseData.modules as any)
    // }
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

  const toIso = (value: any): string => {
    if (!value) return ""
    if (typeof value === "string") return value
    if (value instanceof Date) return value.toISOString()
    if (typeof value === "object" && value.$date) return value.$date
    return ""
  }

  return ad.folders
    .filter((folder: any) => !folder.parentId)  // only root-level folders
    .map((folder: any) => {
      const directFiles = folder.files?.length || 0
      const directSubfolders = folder.subfolders?.length || 0
      const directPages = folder.pages?.length || 0
      const totalItems = directFiles + directSubfolders + directPages

      return {
        id: folder._id || `folder-${folder.name}-${Math.random().toString(36).substr(2, 5)}`,
        title: folder.name,
        type: 'folder' as ResourceType,
        isFolder: true,
        folderContents: extractAllFilesFromFolders([folder]),
        fileSize: `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`,
        uploadedAt: toIso(folder.uploadedAt) || toIso(folder.updatedAt) || toIso(folder.createdAt),
        tags: folder.tags || [],
        // CRITICAL: Preserve group properties from the API response.
        // Folders inside a group carry `parentGroupId` (set by the teacher upload flow,
        // see Coursecontent.tsx:978) — files use `groupId`. Accept either for safety.
        groupId: folder.parentGroupId || folder.groupId || undefined,
        groupName: folder.groupName || undefined,
      } as Resource
    })
}
const extractAllFilesFromFolders = (folders: any[]): Resource[] => {
  const all: Resource[] = []

  const proc = (folder: any) => {
    // Process subfolders — only carry their OWN group membership.
    // CRITICAL: Do NOT inherit `folder.parentGroupId` here. Group membership is
    // a root-level concept (depth = 1) — nested subfolders are plain folders
    // inside their parent. Inheriting would make children re-render under the
    // parent group accordion when the user drills past Level 1, matching the
    // teacher-side rule in FileUploadModal.tsx (`isTopLevelGroupMember = relPath.length === 1`).
    if (folder.subfolders?.length) {
      folder.subfolders.forEach((sf: any) => {
        const sfId = sf._id || `sf-${Math.random().toString(36).substr(2, 5)}`
        const sfContents = extractAllFilesFromFolders([sf])

        const sfItem: Resource = {
          id: sfId,
          title: sf.name,
          type: 'folder' as ResourceType,
          isFolder: true,
          folderContents: sfContents,
          fileSize: `${(sf.files?.length || 0) + (sf.subfolders?.length || 0) + (sf.pages?.length || 0)} items`,
          uploadedAt: (typeof sf.uploadedAt === 'object' && sf.uploadedAt?.$date) ? sf.uploadedAt.$date : (sf.uploadedAt || sf.updatedAt || sf.createdAt || ""),
          tags: sf.tags || [],
          // Only the subfolder's OWN parentGroupId/groupId — never inherited from the wrapping folder.
          groupId: sf.parentGroupId || sf.groupId || undefined,
          groupName: sf.groupName || undefined,
        }
        all.push(sfItem)
      })
    }

    // Process files — only carry their OWN group membership.
    // Same reasoning as above: a file nested inside a folder inside a group is
    // NOT directly in the group. The teacher-side upload flow only stamps
    // parentGroupId on files when they sit at group root (path.length === 0),
    // so inheriting from folder.groupId here would re-introduce the leak.
    folder.files?.forEach((file: any) => {
      const ft = getFileType(file.fileUrl, file.fileType, file.fileName)
      const r: Resource = {
        id: file._id || `f-${Math.random().toString(36).substr(2, 5)}`,
        title: file.fileName || 'Untitled',
        type: file.isReference ? 'reference' : ft,
        fileName: file.fileName,
        fileSize: fmtSize(file.size),
        uploadedAt: (typeof file.uploadedAt === 'object' && file.uploadedAt?.$date) ? file.uploadedAt.$date : (file.uploadedAt || file.updatedAt || ""),
        isReference: file.isReference || false,
        fileSettings: file.fileSettings,
        isVideo: file.isVideo,
        isArchive: file.isArchive,
        availableResolutions: file.availableResolutions || [],
        fileUrlMap: typeof file.fileUrl === 'object' && file.fileUrl !== null ? file.fileUrl : {},
        mcqQuestions: (file as any).mcqQuestions || [],
        tags: file.tags || [],
        // Only the file's OWN groupId — never inherited from the wrapping folder.
        groupId: file.groupId || undefined,
        groupName: file.groupName || undefined,
      }
      if (ft === 'link') r.externalUrl = getFileUrl(file.fileUrl)
      else r.fileUrl = getFileUrl(file.fileUrl)
      all.push(r)
    })

    // Process pages stored inside this folder (pages[])
    folder.pages?.forEach((page: any) => {
      if (!page?.combinedCode) return
      const rawId = page._id
      const pid = (typeof rawId === 'object' && rawId?.$oid) ? rawId.$oid : rawId ? String(rawId) : `p-${Math.random().toString(36).substr(2, 5)}`
      const r: Resource = {
        id: pid,
        title: page.title || 'Untitled Page',
        type: 'page' as ResourceType,
        fileUrl: '',
        fileSize: page.pageCount ? `${page.pageCount} pg` : '1 pg',
        uploadedAt: (typeof page.createdAt === 'object' && page.createdAt?.$date) ? page.createdAt.$date : (page.createdAt || ''),
        _combinedCode: page.combinedCode,
        _pageCount: page.pageCount || 1,
        groupId: page.groupId || undefined,
        groupName: page.groupName || undefined,
        tags: page.tags || [],
      }
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
        uploadedAt: (typeof p.createdAt === 'object' && (p.createdAt as any)?.$date) ? (p.createdAt as any).$date : (p.createdAt || ""),
        _combinedCode: p.combinedCode, _pageCount: p.pageCount || 1,
        groupId: p.groupId || undefined,
        groupName: p.groupName || undefined,
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
      .filter((f: any) => !f.folderId &&  // files inside folders surface via getFolders(), not at root
        (!f.fileSettings || f.fileSettings.showToStudents !== false) &&
        (type === "reference" ? f.isReference === true : getFileType(f.fileUrl, f.fileType, f.fileName) === type && !f.isReference)).map((f: any) => {
          const ft = getFileType(f.fileUrl, f.fileType, f.fileName)
          const r: Resource = {
            id: f._id || `f-${Math.random().toString(36).substr(2, 5)}`,
            title: f.fileName || "Untitled", type: f.isReference ? "reference" : ft,
            fileName: f.fileName,
            fileSize: fmtSize(f.size),
            uploadedAt: (typeof f.uploadedAt === 'object' && f.uploadedAt?.$date) ? f.uploadedAt.$date : (f.uploadedAt || f.updatedAt || ""),
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
      externalUrl: l.url,
      uploadedAt: (typeof l.uploadedAt === 'object' && l.uploadedAt?.$date) ? l.uploadedAt.$date : (l.uploadedAt || l.updatedAt || ""),
      fileSettings: { showToStudents: true, allowDownload: true },
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
    const mk: Record<string, "I_Do" | "We_Do" | "You_Do"> = { 
      "i-do": "I_Do", 
      "we-do": "We_Do", 
      "you-do": "You_Do" 
    }
    const tk = mk[selectedMethod]
    if (!tk) return []
    const cat = selectedItem.pedagogy[tk]
    if (!cat || typeof cat !== 'object') return []
    
    const tKey = normalizeKey(selectedActivity)
    
    // Check if it's "test_your_skills" in You Do
    if (tk === "You_Do" && tKey === "test_your_skills") {
      const testData = (cat as any)["test_your_skills"]
      if (testData && testData.questions && testData.questions.length) {
        return [{ 
          _id: "test_your_skills",
          exerciseType: "TestYourSkills",
          testData: testData,
          isTestYourSkills: true
        }]
      }
      return []
    }
    
    if (Array.isArray((cat as any)[tKey])) return (cat as any)[tKey]
    const fk = Object.keys(cat).find(k => normalizeKey(k) === tKey)
    if (fk) { 
      const d = (cat as any)[fk]
      if (Array.isArray(d)) return d
      // Check for test_your_skills in the activity object
      if (d && d.test_your_skills) {
        return [{ 
          _id: "test_your_skills",
          exerciseType: "TestYourSkills", 
          testData: d.test_your_skills,
          isTestYourSkills: true
        }]
      }
      return []
    }
    return []
  } catch { return [] }
}


  const getAllResources = (): Resource[] => {
    const all: Resource[] = []
    const types: ResourceType[] = ["page", "pdf", "ppt", "video", "zip", "link", "image", "word", "reference", "txt"]
    types.forEach(t => all.push(...getResourcesByType(t)))
    return all
  }

  const getAvailableResourceTypes = (): ResourceType[] => {
    if (!selectedMethod || !selectedActivity || !selectedItem?.pedagogy) return []
    const types: ResourceType[] = []
    if (getPagesForActivity().length > 0) types.push("page")
    if (getFolders().length > 0) types.push("folder")
    const resourceTypes: ResourceType[] = ["pdf", "ppt", "video", "zip", "link", "image", "word", "reference", "txt"]
    resourceTypes.forEach(t => { if (getResourcesByType(t).length > 0) types.push(t) })
    return types
  }

 const resourcesToDisplay = (() => {
  if (selectedResourceType === "folder") return getFolders()
  if (selectedResourceType === "all") {
    // Merge files and folders together so groupResources handles grouping for both
    const allFiles = getAllResources()
    const allFolders = getFolders()
    // Folders without groupId go at the end; folders with groupId merge in with files
    // so groupResources can bucket them correctly
    return [...allFiles, ...allFolders]
  }
  return getResourcesByType(selectedResourceType)
})()
  const normalizedResourceSearch = resourceSearch.trim().toLowerCase()
  const matchesResourceSearch = (resource: Resource) => {
    if (!normalizedResourceSearch) return true
    const title = (resource.title || "").toLowerCase()
    const type = (resource.type || "").toLowerCase()
    return title.includes(normalizedResourceSearch) || type.includes(normalizedResourceSearch)
  }

  const filteredResourcesToDisplay = resourcesToDisplay.filter(matchesResourceSearch)
  const filteredPages = getResourcesByType("page").filter(matchesResourceSearch)
  const selectedFilterCount = selectedResourceType === "all" ? 0 : 1

  const sortResources = useCallback((items: Resource[]) => {
    return [...items].sort((a, b) => {
      if (sortOption === "name_asc") return a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      if (sortOption === "name_desc") return b.title.toLowerCase().localeCompare(a.title.toLowerCase())
      if (sortOption === "size_desc") return parseSize(b.fileSize || "-") - parseSize(a.fileSize || "-")
      if (sortOption === "size_asc") return parseSize(a.fileSize || "-") - parseSize(b.fileSize || "-")
      const aDate = parseDate(a.uploadedAt || "")
      const bDate = parseDate(b.uploadedAt || "")
      return sortOption === "newest" ? bDate - aDate : aDate - bDate
    })
  }, [sortOption])

  useEffect(() => {
    if (inlinePageIndex > 0 && inlinePageIndex >= filteredPages.length) setInlinePageIndex(0)
  }, [inlinePageIndex, filteredPages.length])

  const getFilteredFolderContents = (): Resource[] => {
    if (!currentFolder?.folderContents) return []
    return [...currentFolder.folderContents].filter(matchesResourceSearch)
  }

  const handleDownloadClick = async (resource: Resource, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!resource.isReference || resource.fileSettings?.allowDownload === false) return
    await downloadFile(resource)
  }

  const handleExerciseSelect = async (exercise: any, options?: { resetProgress?: boolean }) => {
    let qs: any[] = []
     if (exercise.isTestYourSkills || exercise.exerciseType === "TestYourSkills") {
    handleOpenTestYourSkills(exercise.testData);
    return;
  }
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
      // Programming/Core exercise — fetch the full exercise document so all
      // exerciseInformation fields (totalMarks, totalMarksProgramming, etc.)
      // are available in CodeEditor (the course-data embed only stores a partial snapshot).
      setExerciseResetProgress(options?.resetProgress ?? false)
      try {
        const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || ''
        const res = await fetch(`https://lms-server-ym1q.onrender.com/exercise/${exercise._id}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
        if (res.ok) {
          const data = await res.json()
          const full = data.data || data.exercise || data
          if (full?._id) {
            // Merge: full overrides partial, but keep the already-resolved questions array
            setSelectedExercise({ ...full, questions: qs })
            return
          }
        }
      } catch {
        // Fall through to use the partial exercise object
      }
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

  /** Navigate directly to a specific level in the folder path.
   *  index = -1 → go back to root (no folder open)
   *  index = 0..n-1 → go to that folder in folderPath */
  const handleFolderNavigateToLevel = (index: number) => {
    if (index < 0) {
      setCurrentFolder(null)
      setFolderPath([])
    } else {
      const newPath = folderPath.slice(0, index + 1)
      setFolderPath(newPath)
      setCurrentFolder(newPath[newPath.length - 1])
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
  function isSectionBasedEx(ex: any): boolean {
    return ex?.exerciseType === "SectionBased" || ex?.isSectionBased === true
  }
  // ── Logout button (reused in both sidebars) ───────────────────────────────
  const LogoutBtn = ({ onClick }: { onClick: () => void }) => (
    <div
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 border-t border-[#1e2430] bg-[#111827] cursor-pointer text-white hover:text-[#c8cdd6] transition-colors"
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
      style={{ fontFamily: FONT_PRIMARY, WebkitFontSmoothing: 'antialiased' }}
    >
      <style>{`
        ${FONT_INTER_IMPORT}
        .sb-row{transition:background .12s ease;cursor:pointer}
        .sb-row:not([data-selected="true"]):hover{background:rgba(0,0,0,.02)}
        .sb-scroll{scrollbar-width:thin;scrollbar-color:#2a3048 transparent}
        .sb-scroll::-webkit-scrollbar-thumb{background:#2a3048;border-radius:3px}
        @keyframes sbSlide{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sbPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @keyframes filterContainerSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes chipSlideIn{from{opacity:0;transform:scale(0.9) translateY(-10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes subcategorySlide{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pillSlideIn{from{opacity:0;transform:scale(0.85) translateX(-15px)}to{opacity:1;transform:scale(1) translateX(0)}}
        @keyframes gridCardIn{from{opacity:0;transform:scale(0.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .ov-tr:hover td{background:rgba(242,119,87,0.05)!important}
        @media(min-width:1024px){.mobile-sidebar-overlay,.mobile-sidebar{display:none!important}}
        @media(max-width:1023px){.desktop-sidebar{display:none!important}}
        /* Custom Toast Styling */
        .Toastify__toast-container--top-right{top:16px;right:16px}
        .Toastify__toast{background:#fff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 10px 40px rgba(0,0,0,0.12);padding:0;min-height:64px;font-family:${FONT_PRIMARY}}
        .Toastify__toast--success{background:linear-gradient(135deg,#eff6ff 0%,#fff 100%);border-left:4px solid #2563eb}
        .Toastify__toast--error{background:linear-gradient(135deg,#fef2f2 0%,#fff 100%);border-left:4px solid #dc2626}
        .Toastify__toast--warning{background:linear-gradient(135deg,#fffbeb 0%,#fff 100%);border-left:4px solid #f59e0b}
        .Toastify__toast--info{background:linear-gradient(135deg,#eff6ff 0%,#fff 100%);border-left:4px solid #2563eb}
        .Toastify__toast-body{padding:14px 16px;font-size:13px;font-weight:500;color:#1e293b;gap:10px}
        .Toastify__toast-icon{width:22px;height:22px}
        .Toastify__toast--success .Toastify__toast-icon{color:#2563eb}
        .Toastify__toast--info .Toastify__toast-icon{color:#2563eb}
        .Toastify__close-button{opacity:0.4;transition:opacity 0.2s;padding:8px}
        .Toastify__close-button:hover{opacity:1}
        .Toastify__progress-bar{height:3px;border-radius:0 0 0 2px}
        .Toastify__progress-bar--success{background:#2563eb}
        .Toastify__progress-bar--info{background:#2563eb}
        /* Mobile Experience Improvements */
        @media(max-width:1023px){
          .mobile-touch-target{min-height:44px;min-width:44px}
          .mobile-card{padding:16px}
          .mobile-text-base{font-size:14px}
          .mobile-grid{grid-template-columns:1fr!important}
          .mobile-swipe-hint{animation:swipeHint 2s ease-in-out 3}
        }
        @keyframes swipeHint{0%,100%{transform:translateX(0)}50%{transform:translateX(10px)}}
        .touch-friendly{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
        .touch-friendly:active{transform:scale(0.98)}
        .mobile-bottom-sheet{border-radius:20px 20px 0 0;max-height:85vh}
        .mobile-sidebar-swipe{position:absolute;right:0;top:50%;transform:translateY(-50%);width:20px;height:60px;background:rgba(255,255,255,0.1);border-radius:10px 0 0 10px;display:flex;align-items:center;justify-content:center}
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
        className={`mobile-sidebar fixed inset-y-0 left-0 w-[280px] z-50 flex flex-col bg-[#111827] border-r-[1.5px] border-[#1e2430] shadow-[4px_0_24px_rgba(0,0,0,0.10)] transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Swipe indicator */}
        <div className="mobile-sidebar-swipe lg:hidden">
          <div className="w-1 h-8 bg-white/30 rounded-full" />
        </div>
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
        <div className="sb-scroll flex-1 min-h-0 overflow-y-auto bg-[#111827]">
          {isLoading || !courseData ? (
            <SidebarSkeleton />
          ) : (
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
          )}
        </div>
        <LogoutBtn onClick={() => { setSidebarOpen(false); setShowLogoutModal(true) }} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Desktop sidebar */}
        <div
          className="desktop-sidebar flex flex-col relative flex-shrink-0 self-stretch bg-[#111827] border border-[#1e2430] shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_18px_rgba(17,24,39,0.04)] overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: sidebarOpen ? 280 : 0, minWidth: 0 }}
        >
          <div className="w-[280px] flex-1 min-h-0 flex flex-col relative">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-[100] w-10 h-10 rounded-full flex items-center justify-center bg-white border-2 border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.25)] cursor-pointer text-slate-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-300 hover:scale-110 transition-all duration-200"
              title="Close sidebar"
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>
            <SidebarHeader
              courseName={courseData?.courseName || "Course"}
              modulesCount={courseData?.modules?.length || 0}
              sidebarSearch={sidebarSearch}
              onSearchChange={setSidebarSearch}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
            />
            <div className="sb-scroll flex-1 min-h-0 overflow-y-auto bg-[#111827]">
              {isLoading || !courseData ? (
                <SidebarSkeleton />
              ) : (
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
              )}
            </div>
            <LogoutBtn onClick={() => setShowLogoutModal(true)} />
          </div>
        </div>

        {/* Sidebar open toggle button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] w-10 h-10 rounded-full flex items-center justify-center bg-white border-2 border-gray-300 shadow-[0_4px_20px_rgba(0,0,0,0.25)] cursor-pointer text-slate-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-300 hover:scale-110 transition-all duration-200 -translate-x-1/2"
            title="Open sidebar"
          >
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        )}

        {/* Right panel */}
        <div className="relative flex-1 flex flex-col overflow-clip min-h-0 border border-gray-200 shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_18px_rgba(17,24,39,0.04)]">
          {!isHeaderCollapsed && (
            <TopBar
              items={buildBreadcrumbs()}
              onAIClick={() => setShowAIChat(v => !v)}
              onSummaryClick={() => setShowSummary(v => !v)}
              onMenuClick={() => setSidebarOpen(v => !v)}
              onNotesClick={() => setShowNotesPanel(v => !v)}
              onHideHeader={canToggleHeader ? () => setIsHeaderCollapsed(true) : undefined}
            />
          )}

          {/* 3-column split row */}
          <div className="flex-1 flex overflow-clip min-h-0">

            {/* Main content column - full white solid background */}
            <div className="flex-1 flex flex-col overflow-clip min-h-0 bg-white">
              {/* TabBar always on top with Hide Header button as right action */}
              {!isHeaderCollapsed && (
                <TabBar
                  selectedNode={!!selectedItem}
                  activeTab={activeTab}
                  activeSubcategory={activeSubcategory}
                  subcategories={subcategories}
                  onTabChange={handleTabChange}
                  onSubcategoryChange={handleSubcategoryChange}
                  onOverviewClick={() => { setSelectedMethod(""); setSelectedActivity("") }}
                  rightAction={undefined}
                />
              )}

              {/* ── COURSE-LEVEL OVERVIEW ── */}
              {!selectedItem && (
                <div className="sb-scroll flex-1 overflow-y-auto px-8 py-8 animate-[fadeIn_.4s_ease_both]">
                  {/* Course Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-200">
                        Course Overview
                      </span>
                      {(() => {
                        const totalHrs = courseData?.modules?.reduce((sum: number, m: any) => {
                          return sum + (hoursMap[m._id] || 0)
                        }, 0) || 0
                        if (!totalHrs) return null
                        return (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                            <Clock size={12} className="mr-1.5" />
                            {totalHrs} hours
                          </span>
                        )
                      })()}
                    </div>
                    <h2 className="m-0 text-xl font-bold text-gray-900 leading-tight mb-2">{courseData?.courseName}</h2>
                    <p className="m-0 text-sm text-gray-500">Complete learning path with structured modules and interactive content</p>
                  </div>

                  {/* Stats Cards */}
                  {(() => {
                    const modCount = courseData?.modules?.length || 0
                    const topicCount = courseData?.modules?.reduce((a: number, m: any) =>
                      a + (m.topics?.length || 0) + (m.subModules?.reduce((b: number, sm: any) => b + (sm.topics?.length || 0), 0) || 0), 0) || 0
                    const subModCount = courseData?.modules?.reduce((a: number, m: any) => a + (m.subModules?.length || 0), 0) || 0
                    const subTopicCount = courseData?.modules?.reduce((a: number, m: any) =>
                      a + (m.topics?.reduce((b: number, t: any) => b + (t.subTopics?.length || 0), 0) || 0) +
                      (m.subModules?.reduce((b: number, sm: any) => b + (sm.topics?.reduce((c: number, t: any) => c + (t.subTopics?.length || 0), 0) || 0), 0) || 0), 0) || 0

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                          <Layers size={20} className="text-orange-600 flex-shrink-0" />
                          <div>
                            <p className="m-0 text-lg font-bold text-gray-900">{modCount}</p>
                            <p className="m-0 text-xs text-gray-600">Modules</p>
                          </div>
                        </div>
                        {subModCount > 0 && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                            <FolderOpen size={20} className="text-purple-600 flex-shrink-0" />
                            <div>
                              <p className="m-0 text-lg font-bold text-gray-900">{subModCount}</p>
                              <p className="m-0 text-xs text-gray-600">Sub-modules</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <BookOpen size={20} className="text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="m-0 text-lg font-bold text-gray-900">{topicCount}</p>
                            <p className="m-0 text-xs text-gray-600">Topics</p>
                          </div>
                        </div>
                        {subTopicCount > 0 && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <Hash size={20} className="text-emerald-600 flex-shrink-0" />
                            <div>
                              <p className="m-0 text-lg font-bold text-gray-900">{subTopicCount}</p>
                              <p className="m-0 text-xs text-gray-600">Sub-topics</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Description */}
                  <h3 className="mt-2.5 mb-2.5 text-sm font-bold text-gray-900">Course Description</h3>
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

                  {/* Course Structure - Enhanced Hierarchy Table */}
                  <div className="mb-6">
                    <h3 className="m-0 text-2xl font-extrabold text-gray-900 mb-2">Course Structure</h3>
                    <p className="m-0 text-sm text-gray-500 mb-6">Click any row to explore content and resources</p>
                  </div>

                  {isLoading || !courseData ? (
                    <TableSkeleton />
                  ) : (
                    <>
                      <div className="rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-sm">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className={`${thCls} text-left pl-5 py-4 font-bold text-gray-700 text-sm`}>
                                Module
                              </th>
                              <th className={`${thCls} text-left py-4 font-bold text-gray-700 text-sm`}>
                                Submodule
                              </th>
                              <th className={`${thCls} text-left py-4 font-bold text-gray-700 text-sm`}>
                                Topic
                              </th>
                              <th className={`${thCls} text-left py-4 font-bold text-gray-700 text-sm`}>
                                Sub-topic
                              </th>
                              <th className={`${thCls} text-center py-4 font-bold text-orange-600 text-sm`}>
                                I Do
                              </th>
                              <th className={`${thCls} text-center py-4 font-bold text-blue-600 text-sm`}>
                                We Do
                              </th>
                              <th className={`${thCls} text-center py-4 font-bold text-emerald-600 text-sm`}>
                                You Do
                              </th>
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
                    </>
                  )}

                  <p className="m-0 text-[12px] text-gray-400 text-center">
                    Select a module from the sidebar to dive in →
                  </p>
                </div>
              )}

              {/* ── ITEM SELECTED — Overview tab ── */}
              {selectedItem && activeTab === "Overview" && (
                <div className="sb-scroll flex-1 overflow-y-auto px-8 py-8 animate-[fadeIn_.3s_ease_both]">

                  {/* Header with title */}
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200">
                          {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
                        </span>
                        {(() => {
                          const hrs = hoursMap[selectedItem.id] || 0
                          if (!hrs) return null
                          return (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                              <Clock size={12} className="mr-1.5" />
                              {hrs} hours
                            </span>
                          )
                        })()}
                      </div>
                      <h2 className="m-0 text-xl font-bold text-gray-900 leading-tight mb-1">{selectedItem.title}</h2>
                      <p className="m-0 text-sm text-gray-500">Detailed overview with hierarchy and resources</p>
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
                      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-sm font-semibold hover:bg-orange-100 transition-colors cursor-pointer"
                    >
                      <BookOpen size={14} />
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
                        <h3 className="mt-6 mb-3 text-xl font-extrabold text-gray-900">{getDescriptionHeading()}</h3>
                        <div
                          className="mb-6 text-[14px] text-gray-600 leading-[1.8] whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: escapeHtml(desc) }}
                        />
                      </>
                    ) : (
                      <>
                        <h3 className="mt-6 mb-3 text-xl font-extrabold text-gray-900">{getDescriptionHeading()}</h3>
                        <div className="mb-6 text-[14px] text-gray-400 leading-[1.8] italic">
                          No description available for this {selectedItem.type}.
                        </div>
                      </>
                    )
                  })()}

                  {/* Filtered Hierarchy Table */}
                  <div className="mb-6">
                    <h3 className="m-0 text-xl font-extrabold text-gray-900 mb-2">
                      {selectedItem.type === 'module' ? 'Module Hierarchy' :
                        selectedItem.type === 'submodule' ? 'Submodule Hierarchy' :
                          selectedItem.type === 'topic' ? 'Topic Hierarchy' : 'Subtopic Details'}
                    </h3>
                    <p className="m-0 text-sm text-gray-500">View the structure and content of this {selectedItem.type}</p>
                  </div>
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
                  {currentFolder && (() => {
                    // If the root folder of this path belongs to a group, inject a group crumb
                    const rootGroupId   = folderPath[0]?.groupId
                    const rootGroupName = folderPath[0]?.groupName

                    const crumbBtn = (label: string, onClick: () => void, key: string) => (
                      <button
                        key={key}
                        type="button"
                        onClick={onClick}
                        className="text-[11.5px] font-semibold leading-snug transition-colors cursor-pointer"
                        style={{ color: '#2563eb', background: 'transparent', border: 'none', padding: 0 }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#1d4ed8'; (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2563eb'; (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
                        title={label}
                      >{label}</button>
                    )

                    const sep = (key: string) => (
                      <span key={key} className="text-[11px] flex-shrink-0 select-none" style={{ color: '#cbd5e1' }}>{'>'}</span>
                    )

                    return (
                      <div
                        className="flex-shrink-0 flex flex-wrap items-center gap-1.5 px-4 py-2"
                        style={{
                          borderBottom: '1px solid #eef0f4',
                          background: '#fafafb',
                          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
                        }}
                      >
                        {/* Root crumb = subcategory */}
                        {crumbBtn(
                          (selectedActivity || '').replace(/_/g, ' '),
                          () => handleFolderNavigateToLevel(-1),
                          'crumb-root'
                        )}

                        {/* Group crumb — only when root folder belongs to a group */}
                        {rootGroupId && rootGroupName && (
                          <>
                            {sep('sep-grp')}
                            {crumbBtn(
                              rootGroupName,
                              () => {
                                // Navigate back to root resource list and auto-expand this group
                                handleFolderNavigateToLevel(-1)
                                setExpandedGroups(prev => new Set([...prev, rootGroupId]))
                              },
                              'crumb-grp'
                            )}
                          </>
                        )}

                        {/* Folder path crumbs */}
                        {folderPath.map((f, i) => {
                          const isLast = i === folderPath.length - 1
                          return (
                            <React.Fragment key={`${f.id}-${i}`}>
                              {sep(`sep-${i}`)}
                              {!isLast
                                ? crumbBtn(f.title, () => handleFolderNavigateToLevel(i), `crumb-f-${i}`)
                                : <span className="text-[11.5px] font-semibold leading-snug" style={{ color: '#1a1a2e' }} title={f.title}>{f.title}</span>
                              }
                            </React.Fragment>
                          )
                        })}
                      </div>
                    )
                  })()}

{selectedMethod && selectedActivity && !currentFolder && (
  <div className="flex flex-col flex-1 overflow-clip min-h-0">
    {(() => {
      const exs = getExercisesForActivity()
      // Check if it's Test Your Skills
      const testSkillExercise = exs.find(e => e.isTestYourSkills)
      
      if (testSkillExercise) {
        // Show a special card for Test Your Skills
        return (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div 
              className="max-w-md w-full p-8 text-center rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white cursor-pointer hover:shadow-xl transition-all duration-300"
              onClick={() => handleOpenTestYourSkills(testSkillExercise.testData)}
            >
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Target size={36} className="text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Test Your Skills</h3>
              <p className="text-gray-500 mb-4">
                {testSkillExercise.testData?.questions?.length || 0} questions • {testSkillExercise.testData?.timeLimit || 60} minutes
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Passing score: {testSkillExercise.testData?.passingScore || 70}%
              </p>
              <button className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors">
                Start Test
              </button>
            </div>
          </div>
        )
      }

                        // ── Full-screen code editor overlay (unchanged) ─────────────────────────
                        if (exs.length > 0 && selectedExercise) {
                          return ReactDOM.createPortal(
                            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                              {selectedExercise?.programmingSettings?.selectedModule === 'Core Programming' && (
                                (selectedExercise?.questionConfiguration?.programmingQuestionConfiguration?.compilerFileMode === 'multiple')
                                  ? <MultiFileCodeEditor exercise={selectedExercise} theme={resolvedTheme as "light" | "dark"} courseId={courseId} nodeId={selectedItem?.id || ""} nodeName={selectedItem?.title || ""} nodeType={selectedItem?.type || ""} subcategory={selectedActivity} category={selectedMethod === 'i-do' ? "I_Do" : selectedMethod === 'we-do' ? "We_Do" : "You_Do"} onBack={() => { setSelectedExercise(null); refreshCourseData() }} onCloseExercise={() => { setSelectedExercise(null); refreshCourseData() }} courseName={courseData?.courseName || ''} hierarchy={currentHierarchy} onNavigateToBreadcrumb={(level) => { setSelectedExercise(null); refreshCourseData(); if (level === 'course') { setSelectedItem(null); setSelectedMethod(''); setSelectedActivity(''); } else if (level === 'hierarchy') { setSelectedMethod(''); setSelectedActivity(''); } }} />
                                  : <CodeEditor exercise={selectedExercise} theme={resolvedTheme as "light" | "dark"} breadcrumbCollapsed={false} onBreadcrumbCollapseToggle={() => { }} courseId={courseId} nodeId={selectedItem?.id || ""} nodeName={selectedItem?.title || ""} nodeType={selectedItem?.type || ""} subcategory={selectedActivity} category={selectedMethod === 'i-do' ? "I_Do" : selectedMethod === 'we-do' ? "We_Do" : "You_Do"} onBack={() => { setSelectedExercise(null); refreshCourseData() }} onCloseExercise={() => { setSelectedExercise(null); refreshCourseData() }} courseName={courseData?.courseName || ''} hierarchy={currentHierarchy} resetProgress={exerciseResetProgress} onNavigateToBreadcrumb={(level) => { setSelectedExercise(null); refreshCourseData(); if (level === 'course') { setSelectedItem(null); setSelectedMethod(''); setSelectedActivity(''); } else if (level === 'hierarchy') { setSelectedMethod(''); setSelectedActivity(''); } }} />
                              )}
                              {selectedExercise?.programmingSettings?.selectedModule === 'Database' && (
                                <DBQueryEditor exercise={selectedExercise} theme={resolvedTheme as "light" | "dark"} courseId={courseId} nodeId={selectedItem?.id || ""} nodeName={selectedItem?.title || ""} nodeType={selectedItem?.type || ""} subcategory={selectedActivity} category={selectedMethod === 'i-do' ? "I_Do" : selectedMethod === 'we-do' ? "We_Do" : "You_Do"} onBack={() => { setSelectedExercise(null); refreshCourseData() }} onCloseExercise={() => { setSelectedExercise(null); refreshCourseData() }} />
                              )}
                            </div>,
                            document.body
                          )
                        }

                        // ── Exercise list ───────────────────────────────────────────────────────
                        if (exs.length > 0) {
                          const sectionExercises = exs.filter((ex: any) => ex?.exerciseType === 'SectionBased' || ex?.isSectionBased === true)
                          const regularExercises = exs.filter((ex: any) => ex?.exerciseType !== 'SectionBased' && !ex?.isSectionBased)

                          return (
                            <div className="exercises-portal-host flex-1 min-h-0 flex flex-col overflow-visible gap-4">
                              {regularExercises.length > 0 && (
                                <Exercises
                                  courseId={courseId}
                                  exercises={regularExercises}
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
                              )}
                              {sectionExercises.length > 0 && (
                                <SectionBasedAssessments
                                  courseId={courseId}
                                  exercises={sectionExercises}
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
                              )}
                            </div>
                          )
                        }

                        // ── Resource list fallback (unchanged) ──────────────────────────────────
                        const avail = getAvailableResourceTypes()
                        if (avail.length === 0) return <EmptyCard icon={File} title="No resources yet" sub="This activity has no content yet." color="gray" />
                        return (
                          <div className="flex flex-col flex-1 overflow-clip min-h-0 gap-2.5">
                            <div className="flex items-center gap-2 justify-between flex-wrap">
                              <div
                                className={`flex items-center gap-2 h-9 px-3 w-full max-w-[380px] rounded-lg border bg-white transition-all duration-200 ${isSearchFocused ? 'border-orange-400 shadow-[0_0_0_3px_rgba(251,146,60,0.15)]' : 'border-gray-200 hover:border-gray-300'
                                  }`}
                              >
                                <Search size={14} className={`flex-shrink-0 transition-colors ${isSearchFocused ? 'text-orange-400' : 'text-gray-400'}`} />
                                <input
                                  value={resourceSearch}
                                  onChange={(e) => setResourceSearch(e.target.value)}
                                  onFocus={() => setIsSearchFocused(true)}
                                  onBlur={() => setIsSearchFocused(false)}
                                  placeholder="Search files and folders..."
                                  className="w-full bg-transparent border-none outline-none text-[12px] text-gray-700 placeholder:text-gray-400"
                                />
                                {resourceSearch && (
                                  <button
                                    onClick={() => setResourceSearch("")}
                                    className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Clear search"
                                  >
                                    <X size={12} className="text-gray-500" />
                                  </button>
                                )}
                                {isLoadingResources && (
                                  <Loader2 size={14} className="flex-shrink-0 text-orange-400 animate-spin" />
                                )}
                              </div>

                              <div className="flex items-center gap-2 ml-auto">
                                {canToggleHeader && isHeaderCollapsed && (
                                  <button
                                    onClick={() => setIsHeaderCollapsed(false)}
                                    className="h-9 px-3 rounded-lg border border-[#e3e8f2] bg-white flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-colors"
                                    title="Show header"
                                  >
                                    <ChevronDown size={14} />
                                    <span>Show</span>
                                  </button>
                                )}

                                <div className="h-9 rounded-lg border border-[#e3e8f2] bg-[#f8fafc] p-0.5 inline-flex items-center gap-0.5">
                                  <button
                                    onClick={() => setResourceView("grid")}
                                    className="w-8 h-8 rounded-md inline-flex items-center justify-center border-none cursor-pointer touch-friendly mobile-touch-target"
                                    style={{ background: resourceView === "grid" ? '#ffffff' : 'transparent', color: resourceView === "grid" ? '#4f46e5' : '#64748b' }}
                                    title="Grid view"
                                  >
                                    <LayoutGrid size={14} />
                                  </button>
                                  <button
                                    onClick={() => setResourceView("list")}
                                    className="w-8 h-8 rounded-md inline-flex items-center justify-center border-none cursor-pointer touch-friendly mobile-touch-target"
                                    style={{ background: resourceView === "list" ? '#ffffff' : 'transparent', color: resourceView === "list" ? '#4f46e5' : '#64748b' }}
                                    title="List view"
                                  >
                                    <List size={14} />
                                  </button>
                                </div>

                                <div style={{ position: 'relative' } } ref={sortDropdownRef}>
                                  <button
                                    onClick={() => {
                                      setShowSortDropdown(v => !v)
                                    }}
                                    className="h-9 px-3 rounded-lg border border-[#e3e8f2] bg-white flex items-center gap-1.5 text-[11px] font-medium cursor-pointer touch-friendly"
                                    style={{ color: showSortDropdown ? '#4f46e5' : '#475569' }}
                                  >
                                    <ArrowUpDown size={13} />
                                    <span>Sort by:</span>
                                    <span className="font-semibold text-[#334155]">
                                      {sortOption === "newest" && "Newest"}
                                      {sortOption === "oldest" && "Oldest"}
                                      {sortOption === "name_asc" && "Name A-Z"}
                                      {sortOption === "name_desc" && "Name Z-A"}
                                      {sortOption === "size_desc" && "Size Large-Small"}
                                      {sortOption === "size_asc" && "Size Small-Large"}
                                    </span>
                                    <ChevronDown size={12} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                                  </button>

                                  {showSortDropdown && (
                                    <div
                                      className="absolute top-full left-0 mt-1 w-[180px] rounded-lg border border-[#e3e8f2] bg-white shadow-lg overflow-hidden z-50"
                                      style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}
                                    >
                                      {[
                                        { value: "newest", label: "Newest", icon: Calendar },
                                        { value: "oldest", label: "Oldest", icon: Calendar },
                                        { value: "name_asc", label: "Name A-Z", icon: ArrowDown },
                                        { value: "name_desc", label: "Name Z-A", icon: ArrowUp },
                                        { value: "size_desc", label: "Size Large-Small", icon: FileDigit },
                                        { value: "size_asc", label: "Size Small-Large", icon: FileDigit },
                                      ].map((opt) => {
                                        const Icon = opt.icon
                                        const isSelected = sortOption === opt.value
                                        return (
                                          <button
                                            key={opt.value}
                                            onClick={() => {
                                              setSortOption(opt.value as any)
                                              setShowSortDropdown(false)
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-medium transition-colors hover:bg-gray-50 cursor-pointer"
                                            style={{
                                              color: isSelected ? '#4f46e5' : '#475569',
                                              background: isSelected ? '#f5f5ff' : 'transparent',
                                            }}
                                          >
                                            <Icon size={14} style={{ color: isSelected ? '#4f46e5' : '#94a3b8' }} />
                                            <span>{opt.label}</span>
                                            {isSelected && (
                                              <CheckCircle size={12} className="ml-auto" style={{ color: '#4f46e5' }} />
                                            )}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => {
                                    setShowResourceFilters(v => !v)
                                    setShowSortDropdown(false)
                                  }}
                                  className="h-9 px-3 rounded-lg border border-[#e3e8f2] bg-white flex items-center gap-1.5 text-[11px] font-medium cursor-pointer touch-friendly"
                                  style={{ color: showResourceFilters ? '#4f46e5' : '#475569' }}
                                >
                                  <Filter size={13} />
                                  <span>Filters</span>
                                  {selectedFilterCount > 0 && (
                                    <span className="px-1.5 h-[16px] rounded-full text-[10px] font-bold inline-flex items-center justify-center bg-[#4f46e5] text-white">
                                      {selectedFilterCount}
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>

                            {(() => {
                              const FILTER_PNG: Record<string, string> = {
                                page: '/icons/page.png', folder: '/icons/folder.png',
                                pdf: '/active-images/pdfFile.png', ppt: '/icons/ppt.png', link: '/icons/link.png',
                              }
                              const FilterIcon = ({ type, sel }: { type: string; sel: boolean }) => {
                                const src = FILTER_PNG[type]
                                if (src) {
                                  const isPdf = type === "pdf"
                                  return (
                                    <img
                                      src={src}
                                      alt={type}
                                      className={`${isPdf ? 'w-[17px] h-[17px]' : 'w-[14px] h-[14px]'} object-contain block flex-shrink-0 transition-[filter]`}
                                      style={{ filter: sel ? 'brightness(0) saturate(100%) invert(33%) sepia(79%) saturate(1954%) hue-rotate(207deg) brightness(98%) contrast(94%)' : 'grayscale(1) brightness(0.55)' }}
                                    />
                                  )
                                }
                                return <ResIcon type={type} size={12} />
                              }
                              const chipBase = (delay: number) => ({
                                className: `flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[11px] font-medium cursor-pointer transition-all flex-shrink-0 border filter-chip`,
                                style: {
                                  animation: showResourceFilters ? `chipSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both` : 'none',
                                }
                              })
                              if (!showResourceFilters) return null
                              const types = ["page", "folder", "pdf", "ppt", "video", "zip", "link", "image", "word", "reference"] as ResourceType[]
                              const visibleTypes = types.filter(type => {
                                if (type === "folder") return getFolders().length > 0
                                else if (type === "page") return getPagesForActivity().length > 0
                                else return getResourcesByType(type).length > 0
                              })
                              return (
                                <div
                                  className="sb-scroll flex-shrink-0 flex items-center gap-1 py-0 overflow-x-auto"
                                  style={{ animation: 'filterContainerSlide 0.3s cubic-bezier(0.22, 1, 0.36, 1)' }}
                                >
                                  <button
                                    onClick={() => { setSelectedResourceType("all"); setUserSelectedResourceType(true) }}
                                    {...chipBase(0)}
                                    style={{
                                      background: '#ffffff',
                                      borderColor: selectedResourceType === "all" ? '#cbd5e1' : '#e2e8f0',
                                      color: selectedResourceType === "all" ? '#2563eb' : '#334155',
                                      boxShadow: selectedResourceType === "all" ? 'inset 0 -2px 0 #2563eb' : 'none',
                                    }}
                                  >
                                    <File size={12} />
                                    All
                                    <span
                                      className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                                      style={{ background: '#f1f5f9', color: selectedResourceType === "all" ? '#2563eb' : '#64748b' }}
                                    >
                                      {getAllResources().length + getFolders().length}
                                    </span>
                                  </button>
                                  {visibleTypes.map((type, idx) => {
                                    const isSel = selectedResourceType === type
                                    let count = 0
                                    if (type === "folder") count = getFolders().length
                                    else if (type === "page") count = getPagesForActivity().length
                                    else count = getResourcesByType(type).length
                                    return (
                                      <button
                                        key={type}
                                        onClick={() => { setSelectedResourceType(type); setUserSelectedResourceType(true) }}
                                        {...chipBase((idx + 1) * 50)}
                                        style={{
                                          background: '#ffffff',
                                          borderColor: isSel ? '#cbd5e1' : '#e2e8f0',
                                          color: isSel ? '#2563eb' : '#334155',
                                          boxShadow: isSel ? 'inset 0 -2px 0 #2563eb' : 'none',
                                        }}
                                      >
                                        <FilterIcon type={type} sel={isSel} />
                                        {type === "folder" ? "Folders" : RES_LABEL[type]}
                                        <span
                                          className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
                                          style={{ background: '#f1f5f9', color: isSel ? '#2563eb' : '#64748b' }}
                                        >
                                          {count}
                                        </span>
                                      </button>
                                    )
                                  })}
                                </div>
                              )
                            })()}

                            <div className="flex-1 overflow-hidden rounded-2xl bg-gray-50 border-[1.5px] border-gray-200 flex flex-col">
                              {selectedResourceType === "page" ? (() => {
                                const pages = filteredPages
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
                                isLoadingResources ? (
                                  <div className="sb-scroll flex-1 overflow-y-auto">
                                    <ResourceTableHeader />
                                    {[...Array(6)].map((_, i) => (
                                      <ResourceSkeleton key={`skeleton-${i}`} />
                                    ))}
                                  </div>
                                ) : filteredResourcesToDisplay.length > 0 ? (
                                  resourceView === "grid" ? (
                                    <div className="sb-scroll flex-1 overflow-y-auto p-3">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {sortResources(filteredResourcesToDisplay).map((r, idx) => (
                                          <div
                                            key={r.id}
                                            className="group relative rounded-xl border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-300 hover:border-orange-300 hover:shadow-lg hover:-translate-y-1 touch-friendly mobile-card"
                                            style={{ animation: `gridCardIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 80}ms both` }}
                                            onClick={() => handleResourceClick(r)}
                                          >
                                            <div className="flex items-start gap-3 mb-3">
                                              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 touch-friendly"
                                                style={{
                                                  background: r.type === 'pdf' ? 'rgba(239,68,68,0.1)' :
                                                    r.type === 'video' ? 'rgba(37,99,235,0.1)' :
                                                      r.type === 'ppt' ? 'rgba(245,158,11,0.1)' :
                                                        r.type === 'folder' ? 'rgba(100,116,139,0.1)' :
                                                          'rgba(16,185,129,0.1)',
                                                }}
                                              >
                                                <ResIcon type={r.type} size={20} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="m-0 text-[13px] font-bold text-gray-800 truncate leading-tight">{r.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                    style={{
                                                      background: r.type === 'pdf' ? '#fef2f2' : r.type === 'video' ? '#eff6ff' : r.type === 'ppt' ? '#fffbeb' : r.type === 'folder' ? '#f1f5f9' : '#f0fdf4',
                                                      color: r.type === 'pdf' ? '#dc2626' : r.type === 'video' ? '#2563eb' : r.type === 'ppt' ? '#d97706' : r.type === 'folder' ? '#64748b' : '#16a34a',
                                                    }}
                                                  >
                                                    {r.type === 'folder' ? 'Folder' : RES_LABEL[r.type] || r.type.toUpperCase()}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between text-[10.5px] text-gray-500 mt-2">
                                              <span>{r.fileSize}</span>
                                              <span>{new Date(r.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="sb-scroll flex-1 overflow-y-auto">
                                      <ResourceTableHeader />
                                      {(() => {
                                        const animType = selectedMethod === "i-do" ? "resource" : selectedMethod === "we-do" ? "wedo" : "none"
                                        const sorted = sortResources(filteredResourcesToDisplay)
                                        const grouped = groupResources(sorted)
                                        return grouped.map((row, i) => row.kind === "group"
                                          ? <ResourceGroupRow key={`g-${row.groupId}`} groupId={row.groupId} groupName={row.groupName} items={row.items} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick} animType={animType} defaultExpanded={expandedGroups.has(row.groupId)} />
                                          : <ResourceItem key={row.resource.id} resource={row.resource} index={i} onClick={handleResourceClick} onDownload={handleDownloadClick} animType={animType} />
                                        )
                                      })()}
                                    </div>
                                  )
                                ) : (
                                  <div className="flex-1 flex items-center justify-center p-8">
                                    <div className="text-center" style={{ padding: '36px 44px', borderRadius: 24, background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)', border: '1.5px solid #e2e8f0', maxWidth: 280, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                                      <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'linear-gradient(135deg, rgba(251,146,60,0.12) 0%, rgba(251,146,60,0.25) 100%)', border: '1px solid rgba(251,146,60,0.25)', boxShadow: '0 2px 8px rgba(251,146,60,0.12)' }}>
                                        <Search size={24} style={{ color: '#f97316' }} />
                                      </div>
                                      <p className="font-bold text-[14px] text-gray-800 m-0 mb-1.5">No matching resources</p>
                                      <p className="text-[12.5px] text-gray-500 m-0 mb-3">Try adjusting your search or filters</p>
                                      <button
                                        onClick={() => { setResourceSearch(""); setSelectedResourceType("all"); }}
                                        className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-all cursor-pointer"
                                        style={{ boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}
                                      >
                                        Clear filters
                                      </button>
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
                    <div className="flex-1 overflow-hidden rounded-xl bg-white flex flex-col" style={{ border: '1px solid #eef0f4' }}>
                      {getFilteredFolderContents().length > 0 ? (
                        <div className="sb-scroll flex-1 overflow-y-auto">
                          {resourceView === "list" && <ResourceTableHeader />}
                          {resourceView === "grid" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                              {sortResources(getFilteredFolderContents()).map((r, idx) => (
                                <div
                                  key={r.id}
                                  className="group relative rounded-xl border border-gray-200 bg-white p-4 cursor-pointer transition-all duration-300 hover:border-orange-300 hover:shadow-lg hover:-translate-y-1 touch-friendly mobile-card"
                                  style={{
                                    animation: `gridCardIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${idx * 80}ms both`,
                                  }}
                                  onClick={() => handleResourceClick(r)}
                                >
                                  {/* Top section with icon and title */}
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 touch-friendly"
                                      style={{
                                        background: r.type === 'pdf' ? 'rgba(239,68,68,0.1)' :
                                          r.type === 'video' ? 'rgba(37,99,235,0.1)' :
                                            r.type === 'ppt' ? 'rgba(245,158,11,0.1)' :
                                              r.type === 'folder' ? 'rgba(100,116,139,0.1)' :
                                                'rgba(16,185,129,0.1)',
                                      }}
                                    >
                                      <ResIcon type={r.type} size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="m-0 text-[13px] font-bold text-gray-800 truncate leading-tight">{r.title}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                          style={{
                                            background: r.type === 'pdf' ? '#fef2f2' :
                                              r.type === 'video' ? '#eff6ff' :
                                                r.type === 'ppt' ? '#fffbeb' :
                                                  r.type === 'folder' ? '#f1f5f9' :
                                                    '#f0fdf4',
                                            color: r.type === 'pdf' ? '#dc2626' :
                                              r.type === 'video' ? '#2563eb' :
                                                r.type === 'ppt' ? '#d97706' :
                                                  r.type === 'folder' ? '#64748b' :
                                                    '#16a34a',
                                          }}
                                        >
                                          {r.type === 'folder' ? 'Folder' : RES_LABEL[r.type] || r.type.toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* File info */}
                                  <div className="flex items-center justify-between text-[10.5px] text-gray-500 mt-2">
                                    <span>{r.fileSize}</span>
                                    <span>{new Date(r.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                  </div>

                                  {/* Hover action overlay */}
                                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            (() => {
                              const animType = selectedMethod === "i-do" ? "resource" : selectedMethod === "we-do" ? "wedo" : "none"
                              const sorted = sortResources(getFilteredFolderContents())
                              // INSIDE A FOLDER: render direct children as flat list.
                              // Groups are a ROOT-LEVEL concept only — never render a group accordion
                              // inside a folder, otherwise the parent group leaks into the folder view
                              // (mirrors the teacher-side `isAtRootLevel` guard in Coursecontent.tsx).
                              return sorted.map((r, i) => (
                                <ResourceItem
                                  key={r.id}
                                  resource={r}
                                  index={i}
                                  onClick={handleResourceClick}
                                  onDownload={handleDownloadClick}
                                  animType={animType}
                                />
                              ))
                            })()
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-8 text-center">
                          <div style={{
                            padding: '36px 44px',
                            borderRadius: 24,
                            background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
                            border: '1.5px solid #e2e8f0',
                            maxWidth: 280,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                          }}>
                            <div style={{
                              width: 56, height: 56, borderRadius: 16,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              margin: '0 auto 16px',
                              background: 'linear-gradient(135deg, rgba(100,116,139,0.08) 0%, rgba(100,116,139,0.2) 100%)',
                              border: '1px solid rgba(100,116,139,0.2)',
                              boxShadow: '0 2px 8px rgba(100,116,139,0.1)',
                            }}>
                              <Folder size={24} style={{ color: '#64748b' }} />
                            </div>
                            <p className="font-bold text-[14px] text-gray-800 m-0 mb-1.5">Folder is empty</p>
                            <p className="text-[12.5px] text-gray-500 m-0 mb-3">No files in this folder yet</p>
                            <button
                              onClick={() => setCurrentFolder(null)}
                              className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white bg-gray-500 hover:bg-gray-600 transition-all cursor-pointer"
                              style={{ boxShadow: '0 2px 8px rgba(100,116,139,0.25)' }}
                            >
                              Go back
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedMethod && !selectedActivity && !currentFolder && learningElements().length > 0 && <EmptyCard icon={Target} title="Select an Activity" sub="Pick one of the activity pills above to view resources" color="orange" />}
                  {!selectedMethod && !selectedActivity && !currentFolder && learningElements().length > 0 && <EmptyCard icon={Target} title="Choose a Learning Method" sub="Click I Do, We Do, or You Do to get started" color="blue" />}
                  {learningElements().length === 0 && selectedItem && !currentFolder && <EmptyCard icon={File} title="No Learning Methods" sub="This topic hasn't been configured yet." color="gray" />}
                </div>
              )}

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
      </div>

      {/* Panels and Viewers */}
      <NotesPanel
        isOpen={showNotesPanel}
        onClose={() => setShowNotesPanel(false)}
        isDraggable={true}
      />
      <AIPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        fileUrl={activeViewer.resource?.fileUrl || ""}
        title={activeViewer.resource?.title || selectedItem?.title || ""}
        fileType={activeViewer.type === 'video' ? 'video' : activeViewer.type === 'ppt' ? 'ppt' : 'pdf'}
        courseContext={!activeViewer.resource && selectedItem ? { topicTitle: selectedItem.title, isDocumentView: false } : undefined}
      />
      {activeViewer.type === "zip" && activeViewer.resource && (
        <ZipViewer
          fileUrl={getFileUrl(activeViewer.resource.fileUrl || "")}
          fileName={activeViewer.resource.title}
          onClose={closeAllViewers}
          isOpen={true}
        />
      )}
      {activeViewer.type === "word" && activeViewer.resource && (
        <WordViewer
          isOpen={true}
          fileUrl={getFileUrl(activeViewer.resource.fileUrl || '')}
          fileName={activeViewer.resource.title}
          onClose={closeAllViewers}
          aiChatEnabled={courseData?.resourcesType?.iDo?.word?.aiChat ?? true}
          aiSummaryEnabled={courseData?.resourcesType?.iDo?.word?.aiSummary ?? true}
          notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled ?? true}
          hierarchy={[courseData?.courseName, ...currentHierarchy].filter(Boolean)}
          currentItemTitle={selectedItem?.title}
          onNotesClick={() => setShowNotesPanel(true)}
          onNotesStateChange={v => setShowNotesPanel(v)}
          showNotesPanel={showNotesPanel}
        />
      )}


      {activeViewer.type === "txt" && activeViewer.resource && (
        <TxtViewer
          isOpen={true}
          fileUrl={getFileUrlString(activeViewer.resource.fileUrl || '')}
          fileName={activeViewer.resource.title}
          onClose={closeAllViewers}
          notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled ?? true}

          hierarchy={[courseData?.courseName, ...currentHierarchy].filter(Boolean)}
          currentItemTitle={selectedItem?.title}
          onNotesClick={() => setShowNotesPanel(true)}
          onNotesStateChange={v => setShowNotesPanel(v)}
          showNotesPanel={showNotesPanel}
        />
      )}


      {activeViewer.type === "image" && activeViewer.resource && (
        <ImageViewer
          isOpen={true}
          imageUrl={getFileUrl(activeViewer.resource.fileUrl || '')}
          title={activeViewer.resource.title}
          fileId={activeViewer.resource.id}
          onClose={closeAllViewers}
          
          hierarchy={[courseData?.courseName, ...currentHierarchy].filter(Boolean)}
          allImages={imagePlaylist}
          currentImageIndex={currentImageIndex}
          onImageChange={idx => {
            setCurrentImageIndex(idx)
            const img = imagePlaylist[idx]
            if (img) setActiveViewer({ type: "image", resource: { ...activeViewer.resource!, id: img.id, title: img.title, fileUrl: img.fileUrl } })
          }}
        />
      )}
      {activeViewer.type === "video" && activeViewer.resource && (
        <VideoPlayer
          isOpen={true}
          onClose={closeAllViewers}
          videoUrl={getFileUrlString(activeViewer.resource.fileUrl)}
          title={activeViewer.resource.title}
          onNotesClick={() => setShowNotesPanel(true)}
          onNotesStateChange={v => setShowNotesPanel(v)}
          showNotesPanel={showNotesPanel}
          hierarchy={currentHierarchy}
          currentItemTitle={selectedItem?.title}
          mcqQuestions={activeViewer.resource.mcqQuestions || []}
          availableResolutions={activeViewer.resource.availableResolutions || []}
          fileUrlMap={activeViewer.resource.fileUrlMap || {}}
          aiChatEnabled={courseData?.resourcesType?.iDo?.video?.aiChat || false}
          aiSummaryEnabled={courseData?.resourcesType?.iDo?.video?.aiSummary || false}
          notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled || false}
          onResolutionChange={(resolution, url) => {
            if (activeViewer.resource) setActiveViewer({ ...activeViewer, resource: { ...activeViewer.resource, fileUrl: url, currentResolution: resolution } })
          }}
        />
      )}
      {activeViewer.type === "ppt" && activeViewer.resource && (
        <PPTViewer
          isOpen={true}
          onClose={closeAllViewers}
          pptUrl={getFileUrlString(activeViewer.resource.fileUrl)}
          title={activeViewer.resource.title}
          onNotesClick={() => setShowNotesPanel(true)}
          onNotesStateChange={v => setShowNotesPanel(v)}
          showNotesPanel={showNotesPanel}
          hierarchy={currentHierarchy}
          currentItemTitle={selectedItem?.title}
        />
      )}
      {activeViewer.type === "pdf" && activeViewer.resource && (
        <PDFViewer
          fileUrl={getFileUrlString(activeViewer.resource.fileUrl)}
          fileName={activeViewer.resource.title || "document.pdf"}
          onClose={closeAllViewers}
          initialMcqs={activeViewer.resource.mcqQuestions || []}
          entityType="course"
          entityId={courseId}
          tabType="pdf"
          subcategory={selectedActivity}
          folderPath={currentHierarchy}
          aiChatEnabled={courseData?.resourcesType?.iDo?.pdf?.aiChat || false}
          aiSummaryEnabled={courseData?.resourcesType?.iDo?.pdf?.aiSummary || false}
          notesEnabled={courseData?.resourcesType?.iDo?.notes?.enabled || false}
          hierarchy={[courseData?.courseName, ...currentHierarchy].filter(Boolean)}
          currentItemTitle={selectedItem?.title}
          onNotesClick={() => setShowNotesPanel(true)}
          onNotesStateChange={v => setShowNotesPanel(v)}
          showNotesPanel={true}
        />
      )}

      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        toastStyle={{
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 500,
        }}
      />


      {showTestComponent && testQuestions.length > 0 && ReactDOM.createPortal(
  <div className="fixed inset-0 z-[9999]">
    <StudentTestYourSkillsMCQQuestion
      nodeId={selectedItem?.id || ""}
      nodeName={selectedItem?.title || "Test Your Skills"}
      subcategory="test_your_skills"
      subcategoryLabel="Test Your Skills"
      nodeType={selectedItem?.type || "topic"}
      studentId={getCurrentUserId() || ""}
      onCloseExercise={handleCloseQuiz}
      studentName={(() => {
        try {
          const { user: tokenUser } = userPermission();
          if (tokenUser?.name) return tokenUser.name;
        } catch {}
        return localStorage.getItem('smartcliff_userName') || "Student";
      })()}
      testTitle="Test Your Skills"
      onComplete={(results) => {
        console.log("Test completed:", results);
        toast.success("Test submitted successfully!");
        handleCloseQuiz(); // Use the same close function
        refreshCourseData();
      }}
      onClose={handleCloseQuiz}
      onBack={handleCloseQuiz}
      hierarchyData={{
        courseName: courseData?.courseName || "",
        moduleName: currentHierarchy[0] || "",
        submoduleName: currentHierarchy[1] || "",
        topicName: currentHierarchy[2] || "",
        subtopicName: currentHierarchy[3] || "",
        nodeType: selectedItem?.type || "",
        level: currentHierarchy.length,
      }}
    />
  </div>,
  document.body
)}
    </div>
  )
}