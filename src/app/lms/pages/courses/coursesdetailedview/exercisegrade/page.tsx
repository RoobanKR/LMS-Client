"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Trophy, Target, Clock, CheckCircle, XCircle,
  TrendingUp, Calendar, ChevronRight, Home,
  Play, Zap, Brain, AlertCircle, ArrowRight,
  Loader2, RefreshCw, BarChart3, FileText,
  Percent, Hash, Award, Check, X, Circle, ExternalLink,
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown,
  ArrowLeft, ChevronLeft, Folder, File, FolderOpen, Layers, Activity,
  BookOpen, GraduationCap
} from "lucide-react"

// Import Google Fonts
import { Montserrat, Inter } from 'next/font/google'

// Configure Google Fonts
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
})

// --- Interfaces ---
interface User {
  _id: string
  name: string
  email: string
}

interface Exercise {
  _id: string
  name: string
  totalQuestions: number
  foundInCategory: string
  foundInSubcategory: string
  entity: {
    type: string
    id: string
    title: string
  }
}

interface Summary {
  totalQuestions: number
  attemptedQuestions: number
  evaluatedQuestions: number
  correctQuestions: number
  totalScore: string
  maxPossibleScore: number
  overallPercentage: string
  completionRate: string
  averageScore: string
}

interface UserAttempt {
  status: string
  attempts: number
  score: number
  totalScore: number
  feedback: string
  language: string
  submittedAt: string
  matchedBy: string
}

interface Question {
  _id: string
  sequence: number
  title: string
  difficulty: "easy" | "medium" | "hard"
  maxScore: number
  userScore: number
  totalScore: number
  percentage: string
  isCorrect: boolean
  userAttempt: UserAttempt | null
}

interface Grade {
  obtained: number
  outOf: number
  percentage: string
  letterGrade: string
  isPassing: boolean
}

// API Response Interface
interface ApiResponse {
  success: boolean
  data?: {
    user: User
    exercise: Exercise
    summary: Summary
    questions: Question[]
    grade: Grade
    debug?: any
  }
  message?: string
}

type SortKey = 'userScore' | 'maxScore' | 'difficulty' | 'sequence';
type SortDirection = 'asc' | 'desc';

export default function ExerciseGradeDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [apiData, setApiData] = useState<ApiResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all")
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null)

  // Hierarchy state from URL params
  const [hierarchyData, setHierarchyData] = useState<any>(null)
  const [contextInfo, setContextInfo] = useState<any>(null)

  // Parse hierarchy from URL params
  useEffect(() => {
    if (searchParams) {
      // Get hierarchy from URL params
      const hierarchyParam = searchParams.get('hierarchy')
      const topicParam = searchParams.get('topic')
      const moduleParam = searchParams.get('module')
      
      if (hierarchyParam) {
        try {
          const decodedHierarchy = JSON.parse(decodeURIComponent(hierarchyParam))
          setHierarchyData(decodedHierarchy)
        } catch (error) {
          console.error('Error parsing hierarchy:', error)
        }
      }
      
      // Set context information
      setContextInfo({
        topic: decodeURIComponent(topicParam || ''),
        module: decodeURIComponent(moduleParam || ''),
        category: searchParams.get('category'),
        subcategory: searchParams.get('subcategory'),
        courseId: searchParams.get('courseId'),
        courseName: searchParams.get('courseName'),
        exerciseId: searchParams.get('exerciseId'),
        exerciseName: searchParams.get('exerciseName'),
        exerciseLevel: searchParams.get('exerciseLevel'),
        method: searchParams.get('method'),
        nodeType: searchParams.get('nodeType')
      })
    }
  }, [searchParams])

  let questionNumber = 1;

  // Fetch Data
  const fetchExerciseAnalytics = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    else if (!apiData) setLoading(true)

    try {
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || ''
      const courseId = searchParams.get("courseId")
      const category = searchParams.get("category")
      const subcategory = searchParams.get("subcategory")
      const exerciseId = searchParams.get("exerciseId")

      if (!exerciseId) {
        throw new Error('Exercise ID is required')
      }

      const params = new URLSearchParams()
      if (courseId) params.append('courseId', courseId)
      if (category) params.append('category', category || '')
      if (subcategory) params.append('subcategory', subcategory || '')
      
      const response = await fetch(
        `http://localhost:5533/analytics/exercise/${exerciseId}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ApiResponse = await response.json()

      if (data.success && data.data) {
        setApiData(data.data)
        setError(null)
      } else {
        throw new Error(data.message || 'Failed to fetch exercise analytics')
      }
    } catch (err) {
      console.error("Failed to fetch exercise analytics:", err)
      setError(err instanceof Error ? err.message : 'Failed to load exercise analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchExerciseAnalytics()
  }, [])

  // Updated breadcrumb function with hierarchy
  const renderBreadcrumb = () => {
    const breadcrumbItems: Array<{
      title: string;
      icon: React.ComponentType<any>;
      onClick: (() => void) | null;
      color: string;
      isActive?: boolean;
    }> = []



    // 1. Dashboard/Home link
    breadcrumbItems.push({
      title: "Dashboard",
      icon: Home,
      onClick: () => router.push('/lms/pages/studentdashboard'),
      color: "text-blue-600 hover:text-blue-700"
    })

    // 2. Course link
    if (contextInfo?.courseId) {
      breadcrumbItems.push({
        title: contextInfo.courseName || "Course",
        icon: GraduationCap,
        onClick: () => {
          // Clear persistence and go to course
          localStorage.removeItem('lms_student_selected_node_id')
          localStorage.removeItem('lms_student_selected_method')
          localStorage.removeItem('lms_student_selected_activity')
          router.push(`/lms/pages/courses/coursesdetailedview/${contextInfo.courseId}`)
        },
        color: "text-gray-600 hover:text-blue-600"
      })
    }

    // 3. Hierarchy items from URL params
    if (hierarchyData?.hierarchy && Array.isArray(hierarchyData.hierarchy)) {
      hierarchyData.hierarchy.forEach((item: string, index: number) => {
        breadcrumbItems.push({
          title: item,
          icon: index === 0 ? BookOpen : File,
          onClick: null,
          color: "text-gray-600",
          isActive: false
        })
      })
    }

    // 4. Topic (if available)
    // if (hierarchyData?.topic) {
    //   breadcrumbItems.push({
    //     title: hierarchyData.topic,
    //     icon: File,
    //     onClick: null,
    //     color: "text-gray-600",
    //     isActive: false
    //   })
    // }

    // 5. Learning Method (category)
    if (contextInfo?.category) {
      const methodName = contextInfo.category === "I_Do" ? "I Do" : 
                         contextInfo.category === "We_Do" ? "We Do" : 
                         contextInfo.category === "You_Do" ? "You Do" : 
                         contextInfo.category.replace(/_/g, " ")
      
      breadcrumbItems.push({
        title: methodName,
        icon: Target,
        onClick: null,
        color: "text-blue-600",
        isActive: false
      })
    }

    // 6. Activity (subcategory)
    if (contextInfo?.subcategory) {
      breadcrumbItems.push({
        title: contextInfo.subcategory.replace(/_/g, " "),
        icon: Activity,
        onClick: null,
        color: "text-blue-600",
        isActive: false
      })
    }

    // 7. Exercise Name
    if (contextInfo?.exerciseName) {
      breadcrumbItems.push({
        title: contextInfo.exerciseName,
        icon: FileText,
        onClick: null,
        color: "text-gray-600",
        isActive: false
      })
    }

    // 8. Grade (current page)
    breadcrumbItems.push({
      title: "Grade",
      icon: Trophy,
      onClick: null,
      color: "text-blue-600 font-semibold",
      isActive: true
    })

    // Function to truncate long text
    const truncateText = (text: string, maxLength: number = 20) => {
      if (text.length <= maxLength) return text
      return text.substring(0, maxLength) + "..."
    }

    return (
      <div className="bg-white rounded-lg p-2 ">
      
        <nav className="flex items-center gap-1 text-xs px-1 overflow-x-auto custom-scrollbar">
          {/* Back Button (Mobile/Alternative) */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all duration-200"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Exercises
          </button>
          
          {/* Context Info Chip */}
          {/* {contextInfo?.method && (
            <div className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
              {contextInfo.method === "I_Do" ? "I Do" : 
               contextInfo.method === "We_Do" ? "We Do" : 
               contextInfo.method === "You_Do" ? "You Do" : "Exercise"}
            </div>
          )} */}
        </div>
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center">
              {/* Separator */}
              {index > 0 && (
                <ChevronRight className="w-3 h-3 text-gray-400 mx-1 flex-shrink-0" />
              )}

              {/* Breadcrumb Item */}
              <div
                onClick={item.onClick || undefined}
                className={`
                  flex items-center gap-1 px-2 py-1.5 rounded-md transition-all duration-200 whitespace-nowrap flex-shrink-0
                  ${item.onClick 
                    ? "hover:bg-blue-50 hover:text-blue-700 cursor-pointer" 
                    : "cursor-default"
                  }
                  ${item.color}
                  ${item.isActive ? "bg-blue-50 border border-blue-200" : ""}
                `}
              >
                <item.icon className="w-3 h-3" />
                <span className="font-medium">{truncateText(item.title)}</span>
              </div>
            </div>
          ))}
        </nav>
        
      
      </div>
    )
  }

  // --- Statistics Logic ---
  const detailedStats = useMemo(() => {
    if (!apiData?.questions) return null;

    const stats = {
      easy: { total: 0, solved: 0 },
      medium: { total: 0, solved: 0 },
      hard: { total: 0, solved: 0 },
      totalSolved: 0,
      totalQuestions: apiData.questions.length,
      attempting: 0
    };

    apiData.questions.forEach(q => {
      const diff = q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
      
      if (stats[diff]) {
        stats[diff].total++;
      }

      if (q.isCorrect) {
        if (stats[diff]) stats[diff].solved++;
        stats.totalSolved++;
      } else if (q.userAttempt) {
        stats.attempting++;
      }
    });

    return stats;
  }, [apiData]);

  // --- Filtering & Sorting Logic ---
  const processedQuestions = useMemo(() => {
    if (!apiData?.questions) return [];
    
    let result = [...apiData.questions];

    // 1. Filter by Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(q => 
        q.title.toLowerCase().includes(lowerQuery)
      );
    }

    // 2. Filter by Difficulty
    if (difficultyFilter !== 'all') {
      result = result.filter(q => 
        q.difficulty.toLowerCase() === difficultyFilter
      );
    }

    // 3. Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Question];
        let bValue: any = b[sortConfig.key as keyof Question];

        // Special handling for difficulty string sorting if needed
        if (sortConfig.key === 'difficulty') {
          const order = { easy: 1, medium: 2, hard: 3 };
          aValue = order[a.difficulty as keyof typeof order] || 0;
          bValue = order[b.difficulty as keyof typeof order] || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [apiData, searchQuery, difficultyFilter, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // --- UI Helpers ---
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-emerald-600'
    if (percentage >= 60) return 'text-amber-600'
    return 'text-rose-600'
  }

  const getAttemptStatus = (question: Question) => {
    if (question.userAttempt === null) {
      return { 
        text: 'Not Attempted', 
        color: 'text-slate-500', 
        bg: 'bg-slate-100', 
        icon: <Circle className="w-3.5 h-3.5" />,
        border: 'border-slate-200'
      }
    }
    return { 
      text: 'Attempted', 
      color: question.userScore > 0 ? 'text-emerald-700' : 'text-rose-700',
      bg: question.userScore > 0 ? 'bg-emerald-50' : 'bg-rose-50',
      border: question.userScore > 0 ? 'border-emerald-100' : 'border-rose-100',
      icon: question.userScore > 0 ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />
    }
  }

  const getAccuracy = () => {
    if (!apiData?.summary) return "0.00"
    const attempted = apiData.summary.attemptedQuestions
    const correct = apiData.summary.correctQuestions
    if (attempted === 0) return "0.00"
    return ((correct / attempted) * 100).toFixed(2)
  }

  // --- Components for Sort Headers ---
  const SortIcon = ({ active, direction }: { active: boolean, direction: SortDirection }) => {
    if (!active) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1" />
    return direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600 ml-1" /> 
      : <ArrowDown className="w-3 h-3 text-blue-600 ml-1" />
  }

  // --- Loading / Error States ---
  if (loading) return (
    <div className={`h-screen w-screen flex items-center justify-center bg-slate-50 ${inter.variable} font-sans`}>
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  )

  if (error || !apiData) return (
    <div className={`h-screen w-screen flex flex-col items-center justify-center bg-slate-50 ${inter.variable} font-sans`}>
      <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
      <p className="text-lg text-slate-600">{error || 'No data available'}</p>
      <button onClick={() => fetchExerciseAnalytics(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
    </div>
  )

  const accuracy = getAccuracy()

  return (
    <div className={`h-screen flex flex-col bg-slate-50 ${montserrat.variable} ${inter.variable} font-sans overflow-hidden`}>
      <style jsx global>{`
        :root {
          --font-montserrat: ${montserrat.style.fontFamily};
          --font-inter: ${inter.style.fontFamily};
        }
        h1, h2, h3, h4, h5, h6, .font-heading { font-family: var(--font-montserrat); }
        body, .font-body { font-family: var(--font-inter); }

        /* Custom Scrollbar Styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #94a3b8;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #64748b;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 transparent;
        }
      `}</style>

      {/* --- Fixed Top Navigation with Breadcrumb --- */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          {/* Breadcrumb */}
          <div className="mb-3">
            {renderBreadcrumb()}
          </div>
          
          {/* Page Title and Refresh */}
          <div className="flex items-center justify-between mt-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Exercise Grade Analysis
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {contextInfo?.exerciseName || 'Exercise'} • {contextInfo?.module && `${contextInfo.module} • `}{contextInfo?.topic}
              </p>
            </div>
            <button 
              onClick={() => fetchExerciseAnalytics(true)} 
              disabled={refreshing} 
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-4 md:px-6 py-4">
          
          {/* Context Information Card (Optional) */}
          {/* {hierarchyData && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {contextInfo?.module && (
                  <div>
                    <span className="text-blue-600 font-medium">Module:</span> {contextInfo.module}
                  </div>
                )}
                {contextInfo?.topic && (
                  <div>
                    <span className="text-blue-600 font-medium">Topic:</span> {contextInfo.topic}
                  </div>
                )}
                {contextInfo?.method && (
                  <div>
                    <span className="text-blue-600 font-medium">Method:</span> 
                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {contextInfo.method === "I_Do" ? "I Do" : 
                       contextInfo.method === "We_Do" ? "We Do" : 
                       contextInfo.method === "You_Do" ? "You Do" : contextInfo.method}
                    </span>
                  </div>
                )}
                {contextInfo?.subcategory && (
                  <div>
                    <span className="text-blue-600 font-medium">Activity:</span> {contextInfo.subcategory.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            </div>
          )} */}
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            
            {/* LEFT COLUMN: Table (Takes up 3/4 width) */}
            <div className="lg:col-span-3 flex flex-col h-full order-2 lg:order-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Toolbar (Header + Filter + Search) */}
              <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">Question Details</h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Showing {processedQuestions.length} of {apiData.questions.length} questions
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Difficulty Filter */}
                  <div className="flex bg-slate-100 rounded-lg p-1">
                    {(['all', 'easy', 'medium', 'hard'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDifficultyFilter(filter)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                          difficultyFilter === filter 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search questions..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-48 bg-slate-50"
                    />
                  </div>
                </div>
              </div>
              
              {/* Table Body - Scrollable Area */}
              <div className="flex-1 overflow-auto min-h-0 custom-scrollbar">
                <table className="w-full text-left font-body">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
                    <tr className="text-xs font-semibold text-slate-600 uppercase">
                      <th className="px-6 py-3.5 w-16">#</th>
                      <th className="px-6 py-3.5 w-32">Status</th>
                      <th className="px-6 py-3.5">Question</th>
                      <th className="px-6 py-3.5 w-24">Difficulty</th>
                      
                      {/* Sortable Header: My Mark */}
                      <th 
                        className="px-6 py-3.5 w-24 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('userScore')}
                      >
                        <div className="flex items-center">
                          My Mark
                          <SortIcon active={sortConfig?.key === 'userScore'} direction={sortConfig?.direction || 'asc'} />
                        </div>
                      </th>

                      {/* Sortable Header: Possible */}
                      <th 
                        className="px-6 py-3.5 w-24 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        onClick={() => handleSort('maxScore')}
                      >
                        <div className="flex items-center">
                          Possible
                          <SortIcon active={sortConfig?.key === 'maxScore'} direction={sortConfig?.direction || 'asc'} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedQuestions.length > 0 ? (
                      processedQuestions.map((question) => {
                        const attemptStatus = getAttemptStatus(question)
                        return (
                          <tr key={question._id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-slate-900 font-mono bg-slate-100 w-8 h-8 rounded-md flex items-center justify-center">
                                {questionNumber++}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${attemptStatus.bg} ${attemptStatus.color} ${attemptStatus.border}`}>
                                {attemptStatus.icon}
                                <span className="font-semibold">{attemptStatus.text}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                              {question.title}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold capitalize border ${
                                question.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                question.difficulty === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {question.difficulty}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm font-bold ${getScoreColor(question.userScore, question.maxScore)}`}>
                                {question.userScore}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-slate-500 font-medium">
                                {question.maxScore}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <Search className="w-8 h-8 text-slate-300 mb-2" />
                            <p>No questions found matching your filters.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT COLUMN: The Stats Card (Takes up 1/4 width) */}
            <div className="lg:col-span-1 h-full overflow-y-auto custom-scrollbar order-1 lg:order-2 space-y-4 pb-4">
              {/* Stats Card */}
              {detailedStats && (
                <SolvedStatsCard stats={detailedStats} />
              )}

              {/* Additional Mini Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Accuracy</div>
                  <div className="text-xl font-bold text-slate-900">{accuracy}%</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Score</div>
                  <div className="text-xl font-bold text-slate-900">{apiData.summary.totalScore}</div>
                </div>
              </div>

              {/* Context Summary Card */}
              {/* {contextInfo && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs text-slate-500 font-semibold uppercase mb-2">Context</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Method:</span>
                      <span className="font-medium text-blue-600">
                        {contextInfo.method === "I_Do" ? "I Do" : 
                         contextInfo.method === "We_Do" ? "We Do" : 
                         contextInfo.method === "You_Do" ? "You Do" : contextInfo.method}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Activity:</span>
                      <span className="font-medium">{contextInfo.subcategory?.replace(/_/g, " ") || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Difficulty:</span>
                      <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                        contextInfo.exerciseLevel === "beginner" ? "bg-emerald-100 text-emerald-700" :
                        contextInfo.exerciseLevel === "intermediate" ? "bg-amber-100 text-amber-700" :
                        contextInfo.exerciseLevel === "advanced" ? "bg-rose-100 text-rose-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {contextInfo.exerciseLevel || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              )} */}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// --- Helper Component: The Circular Stats Card ---
const SolvedStatsCard = ({ stats }: { stats: any }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const total = stats.totalQuestions || 1;
  
  const easyStroke = (stats.easy.solved / total) * circumference;
  const mediumStroke = (stats.medium.solved / total) * circumference;
  const hardStroke = (stats.hard.solved / total) * circumference;

  const easyOffset = 0;
  const mediumOffset = -easyStroke;
  const hardOffset = -(easyStroke + mediumStroke);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 font-body">
      <h3 className="text-slate-500 text-xs font-semibold uppercase mb-4 tracking-wider">Solved Problems</h3>
      
      <div className="flex gap-4 items-center">
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
            
            {stats.easy.solved > 0 && (
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#10b981" strokeWidth="6"
                strokeDasharray={`${easyStroke} ${circumference}`} strokeDashoffset={easyOffset} strokeLinecap="round" />
            )}
            
            {stats.medium.solved > 0 && (
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#f59e0b" strokeWidth="6"
                strokeDasharray={`${mediumStroke} ${circumference}`} strokeDashoffset={mediumOffset} strokeLinecap="round" />
            )}

            {stats.hard.solved > 0 && (
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#f43f5e" strokeWidth="6"
                strokeDasharray={`${hardStroke} ${circumference}`} strokeDashoffset={hardOffset} strokeLinecap="round" />
            )}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-0 cursor-default">
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold text-slate-900 font-heading leading-none">
                {stats.totalSolved}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                /{stats.totalQuestions}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Check className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Solved</span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-emerald-600 font-medium">Easy</span>
              <span className="text-[10px] text-slate-400">{stats.easy.solved}/{stats.easy.total}</span>
            </div>
            <div className="text-sm font-bold text-slate-700 font-heading">
              {stats.easy.total > 0 ? ((stats.easy.solved / stats.easy.total) * 100).toFixed(0) : 0}%
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-amber-500 font-medium">Med.</span>
              <span className="text-[10px] text-slate-400">{stats.medium.solved}/{stats.medium.total}</span>
            </div>
            <div className="text-sm font-bold text-slate-700 font-heading">
              {stats.medium.total > 0 ? ((stats.medium.solved / stats.medium.total) * 100).toFixed(0) : 0}%
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-rose-500 font-medium">Hard</span>
              <span className="text-[10px] text-slate-400">{stats.hard.solved}/{stats.hard.total}</span>
            </div>
            <div className="text-sm font-bold text-slate-700 font-heading">
              {stats.hard.total > 0 ? ((stats.hard.solved / stats.hard.total) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>
      </div>
      
      {stats.attempting > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-medium">Attempting</span>
          <span className="text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-full">{stats.attempting}</span>
        </div>
      )}
    </div>
  )
}