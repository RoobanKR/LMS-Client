"use client"

import { useState, useMemo } from "react"
import { Code, Calendar, Target, Hash, ChevronRight, Clock, AlertCircle, MoreVertical } from "lucide-react"
import { useRouter } from "next/navigation"

// --- Interfaces ---

interface ExerciseInformation {
  exerciseId: string
  exerciseName: string
  description: string
  exerciseLevel: "beginner" | "medium" | "hard" | "intermediate" | "advanced"
  _id: string
  totalPoints?: number
  totalQuestions?: number
}

interface LevelConfiguration {
  levelType: "levelBased" | "general"
  levelBased?: {
    easy: number
    medium: number
    hard: number
  }
  general?: number
}

interface ProgrammingSettings {
  selectedModule: string
  selectedLanguages: string[]
  _id: string
  levelConfiguration?: LevelConfiguration
}

interface CompilerSettings {
  allowCopyPaste: boolean
  autoSuggestion: boolean
  autoCloseBrackets: boolean
  _id: string
}

interface AvailabilityPeriod {
  startDate: string
  endDate: string
  gracePeriodAllowed: boolean
  gracePeriodDate: string | null
  _id: string
}

interface QuestionBehavior {
  shuffleQuestions: boolean
  allowNext: boolean
  allowSkip: boolean
  attemptLimitEnabled: boolean
  maxAttempts: number
  _id: string
}

interface EvaluationSettings {
  practiceMode: boolean
  manualEvaluation?: {
    enabled: boolean
    submissionNeeded: boolean
    _id: string
  }
  aiEvaluation: boolean
  automationEvaluation: boolean
  _id: string
}

interface GroupSettings {
  groupSettingsEnabled: boolean
  showExistingUsers: boolean
  selectedGroups: any[]
  chatEnabled: boolean
  _id: string
}

interface Exercise {
  _id: string
  exerciseInformation: ExerciseInformation
  programmingSettings?: ProgrammingSettings 
  compilerSettings?: CompilerSettings
  availabilityPeriod: AvailabilityPeriod
  questionBehavior?: QuestionBehavior
  evaluationSettings?: EvaluationSettings
  groupSettings?: GroupSettings
  createdAt: string
  updatedAt: string
}

interface ExercisesProps {
  courseId?: number | string
  exercises: Exercise[]
  onExerciseSelect: (exercise: Exercise) => void
  method?: string
  category?: string
  subcategory?: string
  // NEW: Add hierarchy and topic props
  topic?: string
  module?: string
  nodeType?: string
  hierarchy?: string[]
  selectedItem?: any
  currentHierarchy?: string[]
}

export default function Exercises({ 
  category,
  subcategory,
  courseId,
  exercises, 
  onExerciseSelect, 
  method,
  // NEW: Accept hierarchy and topic props
  topic = '',
  module = '',
  nodeType = '',
  hierarchy = [],
  selectedItem = null,
  currentHierarchy = []
}: ExercisesProps) {
  const router = useRouter()
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [showMenuForId, setShowMenuForId] = useState<string | null>(null)

  // --- Sort exercises by createdAt in descending order (newest/last exercise first) ---
  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [exercises])

  // --- Helper Functions ---

  const calculateTotalQuestions = (exercise: Exercise): number => {
    if (exercise.exerciseInformation.totalQuestions && exercise.exerciseInformation.totalQuestions > 0) {
      return exercise.exerciseInformation.totalQuestions
    }

    const levelConfig = exercise.programmingSettings?.levelConfiguration
    if (!levelConfig) return 0

    if (levelConfig.levelType === "levelBased" && levelConfig.levelBased) {
      return (
        (levelConfig.levelBased.easy || 0) +
        (levelConfig.levelBased.medium || 0) +
        (levelConfig.levelBased.hard || 0)
      )
    } else if (levelConfig.levelType === "general" && levelConfig.general) {
      return levelConfig.general
    }

    return 0
  }

  const getQuestionBreakdown = (exercise: Exercise): string => {
    const levelConfig = exercise.programmingSettings?.levelConfiguration
    if (levelConfig?.levelType === "levelBased" && levelConfig.levelBased) {
      return `Easy: ${levelConfig.levelBased.easy || 0}, Medium: ${levelConfig.levelBased.medium || 0}, Hard: ${levelConfig.levelBased.hard || 0}`
    }
    return ""
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "No Date"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch (e) {
      return dateString
    }
  }

  const getDifficultyColor = (level: string = 'intermediate') => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'medium':
      case 'intermediate':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'hard':
      case 'advanced':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExerciseId(exercise._id)
    onExerciseSelect(exercise)
  }

  const handleGradeClick = (exercise: Exercise, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the row click
    
    // Prepare hierarchy string for URL
    const hierarchyString = encodeURIComponent(JSON.stringify({
      // Use provided hierarchy or fallback to currentHierarchy
      hierarchy: hierarchy.length > 0 ? hierarchy : currentHierarchy,
      topic: topic || (selectedItem?.title || ''),
      module: module || (currentHierarchy[0] || ''),
      nodeType: nodeType || (selectedItem?.type || '')
    }))
    
    // Prepare query parameters
    const queryParams = new URLSearchParams({
      category: category || '',
      subcategory: subcategory || '',
      courseId: courseId?.toString() || '',
      exerciseId: exercise._id,
      exerciseName: exercise.exerciseInformation.exerciseName,
      exerciseLevel: exercise.exerciseInformation.exerciseLevel,
      totalPoints: exercise.exerciseInformation.totalPoints?.toString() || "0",
      totalQuestions: calculateTotalQuestions(exercise).toString(),
      programmingLanguages: exercise.programmingSettings?.selectedLanguages?.join(',') || '',
      startDate: exercise.availabilityPeriod?.startDate || '',
      endDate: exercise.availabilityPeriod?.endDate || '',
      practiceMode: exercise.evaluationSettings?.practiceMode?.toString() || 'false',
      manualEvaluationEnabled: exercise.evaluationSettings?.manualEvaluation?.enabled?.toString() || 'false',
      aiEvaluation: exercise.evaluationSettings?.aiEvaluation?.toString() || 'false',
      method: method || '',
      
      // NEW: Add hierarchy params
      hierarchy: hierarchyString,
      topic: encodeURIComponent(topic || (selectedItem?.title || '')),
      module: encodeURIComponent(module || (currentHierarchy[0] || ''))
    })

    // Navigate to grading page with all necessary data
    router.push(`/lms/pages/courses/coursesdetailedview/exercisegrade?${queryParams.toString()}`)
  }

  const toggleMenu = (exerciseId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the row click
    setShowMenuForId(showMenuForId === exerciseId ? null : exerciseId)
  }

  // Close menu when clicking outside
  const closeMenu = () => {
    setShowMenuForId(null)
  }

  // --- Render ---

  if (!sortedExercises || sortedExercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full min-h-[300px] bg-white border border-slate-200 rounded-xl">
        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
          <Code className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">No Exercises Found</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          There are no exercises available for this section yet.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden" onClick={closeMenu}>
      
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-50 hover:scrollbar-thumb-slate-400">
        <table className="min-w-full border-collapse w-full">
          {/* Sticky Header with border-b instead of shadow */}
          <thead className="bg-slate-50/95 backdrop-blur sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[35%]">
                Exercise
              </th>
              <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[12%]">
                Level
              </th>
              <th scope="col" className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[10%]">
                Q's
              </th>
              <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[18%]">
                Deadline
              </th>
              <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[15%]">
                Stack
              </th>
              <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-[10%]">
                Actions
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white">
            {sortedExercises.map((exercise) => {
              const isSelected = selectedExerciseId === exercise._id
              const endDate = exercise.availabilityPeriod?.endDate ? new Date(exercise.availabilityPeriod.endDate) : new Date()
              const today = new Date()
              const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const totalQuestions = calculateTotalQuestions(exercise)
              const languages = exercise.programmingSettings?.selectedLanguages || []
              const breakdownText = getQuestionBreakdown(exercise)

              return (
                <tr
                  key={exercise._id}
                  onClick={() => handleExerciseClick(exercise)}
                  className={`
                    group cursor-pointer transition-all duration-200 border-l-[3px] last:border-b-0 relative
                    ${isSelected 
                      ? 'bg-blue-50/60 border-l-blue-500' 
                      : 'hover:bg-slate-50 border-l-transparent hover:border-l-blue-300'
                    }
                  `}
                >
                  {/* Exercise Name */}
                  <td className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
                        isSelected 
                          ? 'bg-blue-100 text-blue-600 border-blue-200' 
                          : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-white group-hover:border-blue-100 group-hover:text-blue-500'
                      }`}>
                        <Code className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 max-w-[280px]">
                        <div className={`text-[13px] font-medium leading-tight truncate ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                          {exercise.exerciseInformation.exerciseName}
                        </div>
                        {/* Display topic if available */}
                        {topic && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            Topic: {topic}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Level Badge */}
                  <td className="px-4 py-3 whitespace-nowrap border-b border-slate-100">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border capitalize ${getDifficultyColor(exercise.exerciseInformation.exerciseLevel)}`}>
                      {exercise.exerciseInformation.exerciseLevel}
                    </span>
                  </td>

                  {/* Total Questions */}
                  <td className="px-4 py-3 whitespace-nowrap border-b border-slate-100 text-center">
                    <div className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200" title={breakdownText}>
                      {totalQuestions}
                    </div>
                  </td>

                  {/* Due Date */}
                  <td className="px-4 py-3 whitespace-nowrap border-b border-slate-100">
                    <div className="flex flex-col justify-center">
                      <div className="text-[12px] font-medium text-slate-700">
                        {formatDate(exercise.availabilityPeriod?.endDate)}
                      </div>
                      <div className={`text-[10px] font-medium flex items-center gap-1 ${
                        daysLeft < 0 ? 'text-rose-600' : daysLeft <= 3 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {daysLeft < 0 ? (
                          <>
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Closed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            <span>{daysLeft}d left</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Languages */}
                  <td className="px-4 py-3 border-b border-slate-100">
                    {languages.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {languages.slice(0, 2).map((lang, idx) => (
                          <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            {lang}
                          </span>
                        ))}
                        {languages.length > 2 && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-200" title={languages.slice(2).join(', ')}>
                            +{languages.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap border-b border-slate-100">
                    <div className="flex items-center justify-end gap-1">
                      {/* Start Button */}
                      <button 
                        className={`
                          inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200
                          ${isSelected 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-white text-slate-400 border border-slate-200 hover:text-blue-600 hover:border-blue-200 group-hover:bg-blue-50'
                          }
                        `} 
                        title={exercise.evaluationSettings?.practiceMode ? 'Start Practice' : 'Start Exercise'}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Three Dots Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => toggleMenu(exercise._id, e)}
                          className={`
                            inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200
                            ${isSelected 
                              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                              : 'bg-white text-slate-400 border border-slate-200 hover:text-slate-700 hover:border-slate-300 group-hover:bg-slate-50'
                            }
                            ${showMenuForId === exercise._id ? 'bg-slate-100 text-slate-700 border-slate-300' : ''}
                          `}
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {showMenuForId === exercise._id && (
                          <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 z-20">
                            <div className="py-1">
                              <button
                                onClick={(e) => handleGradeClick(exercise, e)}
                                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Target className="w-3.5 h-3.5" />
                                view grade
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {/* Debug info (optional - remove in production) */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="p-2 border-t border-slate-200 text-xs text-slate-500 bg-slate-50">
          <div>Context: {module} &gt; {topic} | Hierarchy: {hierarchy.length > 0 ? hierarchy.join(' > ') : currentHierarchy.join(' > ')}</div>
        </div>
      )} */}
    </div>
  )
}