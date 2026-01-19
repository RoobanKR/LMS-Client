"use client"

import { useState } from "react"
import { Code, Calendar, Target, Hash, ChevronRight, Clock, AlertCircle } from "lucide-react"

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
  exercises: Exercise[]
  onExerciseSelect: (exercise: Exercise) => void
  method?: string 
}

export default function Exercises({ exercises, onExerciseSelect, method }: ExercisesProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)

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

  // --- Render ---

  if (!exercises || exercises.length === 0) {
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
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden">
      
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
                Action
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white">
            {exercises.map((exercise) => {
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

                  {/* Action */}
                  <td className="px-4 py-3 whitespace-nowrap text-right border-b border-slate-100">
                    <button className={`
                      inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200
                      ${isSelected 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-white text-slate-400 border border-slate-200 hover:text-blue-600 hover:border-blue-200 group-hover:bg-blue-50'
                      }
                    `} title={exercise.evaluationSettings?.practiceMode ? 'Start Practice' : 'Start Exercise'}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}