"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import {
  Clock, AlertCircle, X, Play, Zap, Trophy, Star,
  CheckSquare, Code2, Layers, HelpCircle, BookOpen,
  Calendar, Hourglass, Lock, CheckCircle
} from "lucide-react"
import { useRouter } from "next/navigation"

// ─── Interfaces (matching actual API shape) ────────────────────────────────────

interface ExerciseInformation {
  exerciseId: string
  exerciseName: string
  description: string
  exerciseLevel: "beginner" | "medium" | "hard" | "intermediate" | "advanced"
  totalDuration?: number
  totalPoints?: number
  totalQuestions?: number
  _id?: string
}

interface McqQuestionConfiguration {
  totalQuestions?: number
  marksPerQuestion?: number
  totalMarks?: number
  easyCount?: number
  mediumCount?: number
  hardCount?: number
  [key: string]: any
}

interface QuestionConfiguration {
  mcqQuestionConfiguration?: McqQuestionConfiguration
  [key: string]: any
}

interface ConfigurationType {
  mcqMode: boolean
  programmingMode: boolean
  combinedMode: boolean
  _id?: string
}

interface LevelConfiguration {
  levelType: "levelBased" | "general"
  levelBased?: { easy: number; medium: number; hard: number }
  general?: number
}

interface ProgrammingSettings {
  selectedModule?: string
  selectedLanguages?: string[]
  _id?: string
  levelConfiguration?: LevelConfiguration
}

interface AvailabilityPeriod {
  startDate: string
  endDate: string
  gracePeriodAllowed: boolean
  gracePeriodDate: string | null
  extendedDays?: number
  _id?: string
}

interface QuestionBehavior {
  shuffleQuestions?: boolean
  allowNext?: boolean
  allowSkip?: boolean
  attemptLimitEnabled?: boolean
  maxAttempts?: number
  _id?: string
}

interface EvaluationSettings {
  practiceMode?: boolean
  manualEvaluation?: { enabled: boolean; submissionNeeded: boolean; _id?: string }
  aiEvaluation?: boolean
  automationEvaluation?: boolean
  _id?: string
}

interface McqQuestion {
  questionType: string
  mcqQuestionTitle?: string
  mcqQuestionDifficulty?: string
  mcqQuestionType?: string
  [key: string]: any
}

interface Exercise {
  _id: string
  exerciseType?: "MCQ" | "Programming" | "Combined" | string
  exerciseInformation: ExerciseInformation
  configurationType?: ConfigurationType
  questionConfiguration?: QuestionConfiguration
  programmingSettings?: ProgrammingSettings
  availabilityPeriod: AvailabilityPeriod
  questionBehavior?: QuestionBehavior
  evaluationSettings?: EvaluationSettings
  questions?: McqQuestion[]
  createdAt: string
  updatedAt: string
  version?: number
  createdBy?: string
}

interface StudentAnswer {
  exerciseId: string
  status: string
  _id: string
}

interface ExercisesProps {
  courseId?: number | string
  exercises: Exercise[]
  onExerciseSelect: (exercise: Exercise) => void
  method?: string
  category?: string
  subcategory?: string
  topic?: string
  module?: string
  nodeType?: string
  hierarchy?: string[]
  selectedItem?: any
  currentHierarchy?: string[]
  // Student answers — drives Completed badges + disables Start button
  studentAnswers?: {
    [section: string]: any
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTotalQuestions(exercise: Exercise): number {
  if (exercise.questions && exercise.questions.length > 0) return exercise.questions.length
  const mcqConfig = exercise.questionConfiguration?.mcqQuestionConfiguration
  if (mcqConfig?.totalQuestions) return mcqConfig.totalQuestions
  if (exercise.exerciseInformation.totalQuestions) return exercise.exerciseInformation.totalQuestions
  const lvl = exercise.programmingSettings?.levelConfiguration
  if (lvl?.levelType === "levelBased" && lvl.levelBased)
    return (lvl.levelBased.easy || 0) + (lvl.levelBased.medium || 0) + (lvl.levelBased.hard || 0)
  if (lvl?.levelType === "general" && lvl.general) return lvl.general
  return 0
}

function getTotalMarks(exercise: Exercise): number | null {
  const mcqConfig = exercise.questionConfiguration?.mcqQuestionConfiguration
  if (mcqConfig?.totalMarks) return mcqConfig.totalMarks
  if (mcqConfig?.marksPerQuestion && exercise.questions?.length)
    return mcqConfig.marksPerQuestion * exercise.questions.length
  if (exercise.exerciseInformation.totalPoints) return exercise.exerciseInformation.totalPoints
  return null
}

function getMarksPerQuestion(exercise: Exercise): number | null {
  return exercise.questionConfiguration?.mcqQuestionConfiguration?.marksPerQuestion ?? null
}

function getExerciseTypeInfo(exercise: Exercise): { label: string; color: string; bg: string; icon: React.ReactNode } {
  const type = exercise.exerciseType?.toLowerCase() || ''
  const cfg = exercise.configurationType
  if (type === 'mcq' || cfg?.mcqMode)
    return { label: 'MCQ', color: '#2563eb', bg: '#eff6ff', icon: <CheckSquare className="w-3 h-3" /> }
  if (type === 'programming' || cfg?.programmingMode)
    return { label: 'Coding', color: '#7c3aed', bg: '#f5f3ff', icon: <Code2 className="w-3 h-3" /> }
  if (type === 'combined' || cfg?.combinedMode)
    return { label: 'Mixed', color: '#0891b2', bg: '#ecfeff', icon: <Layers className="w-3 h-3" /> }
  return { label: 'Exercise', color: '#475569', bg: '#f8fafc', icon: <HelpCircle className="w-3 h-3" /> }
}

function getDifficultyStyle(level: string = 'intermediate') {
  switch (level.toLowerCase()) {
    case 'beginner':     return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981', emoji: '🌱', label: 'Beginner' }
    case 'medium':       return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', emoji: '⚡', label: 'Medium' }
    case 'intermediate': return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', emoji: '⚡', label: 'Intermediate' }
    case 'hard':         return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', emoji: '🔥', label: 'Hard' }
    case 'advanced':     return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', emoji: '🔥', label: 'Advanced' }
    default:             return { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8', emoji: '📝', label: 'General' }
  }
}

function formatDate(dateString: string) {
  if (!dateString) return 'No Date'
  try {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return dateString }
}

function formatDateTime(dateString: string) {
  if (!dateString) return 'No Date'
  try {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return dateString }
}

function formatDuration(minutes?: number): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getDifficultyBreakdown(exercise: Exercise): { easy: number; medium: number; hard: number } | null {
  const mcqCfg = exercise.questionConfiguration?.mcqQuestionConfiguration
  if (mcqCfg?.easyCount !== undefined || mcqCfg?.mediumCount !== undefined || mcqCfg?.hardCount !== undefined)
    return { easy: mcqCfg.easyCount || 0, medium: mcqCfg.mediumCount || 0, hard: mcqCfg.hardCount || 0 }
  if (exercise.questions && exercise.questions.length > 0) {
    const counts = { easy: 0, medium: 0, hard: 0 }
    exercise.questions.forEach(q => {
      const d = q.mcqQuestionDifficulty?.toLowerCase() || ''
      if (d === 'easy') counts.easy++
      else if (d === 'medium') counts.medium++
      else if (d === 'hard') counts.hard++
    })
    if (counts.easy + counts.medium + counts.hard > 0) return counts
  }
  return null
}

// ─── Availability ─────────────────────────────────────────────────────────────
function getExerciseAvailability(exercise: Exercise): {
  status: 'upcoming' | 'available' | 'expired' | 'grace-period'
  message: string
  canStart: boolean
  startTime?: Date
  endTime?: Date
  graceTime?: Date | null
} {
  const now = new Date()
  const startDate = exercise.availabilityPeriod?.startDate ? new Date(exercise.availabilityPeriod.startDate) : null
  const endDate   = exercise.availabilityPeriod?.endDate   ? new Date(exercise.availabilityPeriod.endDate)   : null
  const graceDate = exercise.availabilityPeriod?.gracePeriodAllowed && exercise.availabilityPeriod?.gracePeriodDate
    ? new Date(exercise.availabilityPeriod.gracePeriodDate) : null

  // Not started yet
  if (startDate && now < startDate)
    return { status: 'upcoming', message: `Starts ${formatDateTime(startDate.toISOString())}`, canStart: false, startTime: startDate, endTime: endDate || undefined, graceTime: graceDate }

  // Within grace period (after end, before grace end)
  if (graceDate && now <= graceDate && endDate && now > endDate)
    return { status: 'grace-period', message: `Grace period until ${formatDateTime(graceDate.toISOString())}`, canStart: true, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate }

  // Within normal period
  if (endDate && now <= endDate)
    return { status: 'available', message: `Ends ${formatDateTime(endDate.toISOString())}`, canStart: true, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate }

  // Grace period exists but hasn't started yet (between end and grace)
  if (graceDate && endDate && now > endDate && now < graceDate)
    return { status: 'grace-period', message: `Grace period starts ${formatDateTime(endDate.toISOString())}`, canStart: false, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate }

  // Expired
  return {
    status: 'expired',
    message: graceDate && now > graceDate
      ? `Expired ${formatDateTime(graceDate.toISOString())}`
      : endDate ? `Expired ${formatDateTime(endDate.toISOString())}` : 'Expired',
    canStart: false, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate
  }
}

// ─── Attempt check ────────────────────────────────────────────────────────────
// Returns true if the current student has already submitted this exercise.
// Handles: We_Do.assignments, You_Do.assessments, I_Do nested, direct arrays,
// subcategory-keyed nesting, and a broad fallback key scan.
function hasExerciseBeenAttempted(
  exercise: Exercise,
  studentAnswers?: ExercisesProps['studentAnswers'],
  method?: string,
  subcategory?: string
): boolean {
  if (!studentAnswers || !method) return false

  try {
    const matchId = (a: any) =>
      a?.exerciseId === exercise._id || a?._id === exercise._id || a?.id === exercise._id

    // Helper: deeply scan any object/array for a matching exerciseId
    const deepScan = (node: any): boolean => {
      if (!node || typeof node !== 'object') return false
      if (Array.isArray(node)) return node.some(matchId)
      // Check common arrays inside
      if (Array.isArray(node.assignments) && node.assignments.some(matchId)) return true
      if (Array.isArray(node.assessments) && node.assessments.some(matchId)) return true
      if (Array.isArray(node.exercises)   && node.exercises.some(matchId))   return true
      if (Array.isArray(node.submissions) && node.submissions.some(matchId)) return true
      // Recurse one level into object values
      for (const v of Object.values(node)) {
        if (Array.isArray(v) && v.some(matchId)) return true
      }
      return false
    }

    // Build all candidate section keys to try (handles any casing / separator)
    const ml = method.toLowerCase().replace(/[-_\s]/g, '')
    const candidates: string[] = []
    if (ml.includes('ido'))    candidates.push('I_Do', 'i_do', 'IDo', 'i-do', 'ido')
    if (ml.includes('wedo'))   candidates.push('We_Do', 'we_do', 'WeDo', 'we-do', 'wedo')
    if (ml.includes('youdo'))  candidates.push('You_Do', 'you_do', 'YouDo', 'you-do', 'youdo')
    // Also try the raw method value itself
    candidates.push(method, method.replace(/-/g, '_'), method.replace(/_/g, '-'))
    // Deduplicate
    const tried = new Set<string>()

    for (const key of candidates) {
      if (tried.has(key)) continue
      tried.add(key)
      const sec = studentAnswers[key]
      if (!sec) continue
      if (deepScan(sec)) return true
    }

    // Last resort: scan EVERY key in studentAnswers
    for (const key of Object.keys(studentAnswers)) {
      if (deepScan(studentAnswers[key])) {
        return true
      }
    }

    return false
  } catch (err) {
    console.error('hasExerciseBeenAttempted error:', err)
    return false
  }
}

// ─── Time remaining ───────────────────────────────────────────────────────────
function getTimeRemaining(date: Date): string {
  const diffMs = date.getTime() - Date.now()
  if (diffMs <= 0) return '0m'
  const mins  = Math.floor(diffMs / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

// ═══════════════════════════════════════════════════════════════════════════════
// Start Exercise Popup
// ═══════════════════════════════════════════════════════════════════════════════
interface PopupProps {
  exercise: Exercise
  onConfirm: () => void
  onClose: () => void
  availability: ReturnType<typeof getExerciseAvailability>
  hasAttempted?: boolean  // ← RESTORED
}

function StartExercisePopup({ exercise, onConfirm, onClose, availability, hasAttempted }: PopupProps) {
  const diff       = getDifficultyStyle(exercise.exerciseInformation.exerciseLevel)
  const typeInfo   = getExerciseTypeInfo(exercise)
  const totalQ     = getTotalQuestions(exercise)
  const totalMarks = getTotalMarks(exercise)
  const mpq        = getMarksPerQuestion(exercise)
  const isPractice = exercise.evaluationSettings?.practiceMode
  const breakdown  = getDifficultyBreakdown(exercise)

  // canProceed: window is open AND not yet submitted
  const canProceed = availability.canStart && !hasAttempted

  const tips: string[] = []
  if (exercise.questionBehavior?.shuffleQuestions)  tips.push('Questions will be shuffled randomly')
  if (exercise.questionBehavior?.allowSkip)          tips.push('You can skip and return to questions')
  if (exercise.questionBehavior?.allowNext)          tips.push('Navigate freely between questions')
  if (exercise.questionBehavior?.attemptLimitEnabled && exercise.questionBehavior?.maxAttempts)
    tips.push(`Max ${exercise.questionBehavior.maxAttempts} attempt(s) allowed`)
  if (isPractice) tips.push("Practice mode — won't affect your grade")
  else            tips.push('Your answers will be submitted for grading')
  if (tips.length === 0) tips.push('Read each question carefully before answering')
  if (availability.status === 'grace-period')
    tips.unshift(`⚠️ Grace period active until ${formatDateTime(availability.graceTime?.toISOString() || '')}`)
  // RESTORED: prepend completed message when already attempted
  if (hasAttempted)
    tips.unshift('✅ You have already submitted this exercise')

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(15,23,42,0.60)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-2xl overflow-hidden"
        style={{ background: 'white', boxShadow: '0 30px 70px rgba(0,0,0,0.2),0 0 0 1px rgba(0,0,0,0.06)', animation: 'popIn .28s cubic-bezier(.34,1.56,.64,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent strip */}
        <div style={{ height: 5, background: '#2563eb' }} />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ background: '#f1f5f9', color: '#94a3b8' }}
          onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.background = '#e2e8f0'; t.style.color = '#475569' }}
          onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.background = '#f1f5f9'; t.style.color = '#94a3b8' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="px-6 pt-5 pb-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
              style={{ background: diff.bg, border: `1.5px solid ${diff.dot}40` }}>
              {diff.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: typeInfo.bg, color: typeInfo.color }}>
                  {typeInfo.icon}{typeInfo.label}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: diff.bg, color: diff.color }}>
                  {diff.label}
                </span>
                {isPractice && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-600">
                    <Zap className="w-2.5 h-2.5" />Practice
                  </span>
                )}
                {availability.status === 'grace-period' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600">
                    <Hourglass className="w-2.5 h-2.5" />Grace Period
                  </span>
                )}
                {/* RESTORED: Completed badge in popup header */}
                {hasAttempted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600">
                    <CheckCircle className="w-2.5 h-2.5" />Completed
                  </span>
                )}
              </div>
              <h2 className="text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 pr-6">
                {exercise.exerciseInformation.exerciseName}
              </h2>
              {exercise.exerciseInformation.exerciseId && (
                <p className="text-[10px] text-slate-400 mt-0.5">ID: {exercise.exerciseInformation.exerciseId}</p>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl p-2.5 text-center" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <div className="text-[18px] font-black text-sky-700">{totalQ}</div>
              <div className="text-[9px] text-sky-500 font-semibold mt-0.5 uppercase tracking-wide">Questions</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: '#fdf4ff', border: '1px solid #e9d5ff' }}>
              <div className="text-[18px] font-black text-violet-700">{totalMarks ?? '—'}</div>
              <div className="text-[9px] text-violet-400 font-semibold mt-0.5 uppercase tracking-wide">Marks</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <div className="text-[18px] font-black text-amber-600">{mpq ?? '—'}</div>
              <div className="text-[9px] text-amber-500 font-semibold mt-0.5 uppercase tracking-wide">Per Q</div>
            </div>
          </div>

          {/* Difficulty breakdown */}
          {breakdown && (
            <div className="flex items-center gap-2 flex-wrap mb-4 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Breakdown:</span>
              {breakdown.easy > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  🟢 {breakdown.easy} Easy
                </span>
              )}
              {breakdown.medium > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                  🟡 {breakdown.medium} Medium
                </span>
              )}
              {breakdown.hard > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                  🔴 {breakdown.hard} Hard
                </span>
              )}
            </div>
          )}

          {/* Availability window */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Availability</div>
                <div className="text-[11px] font-semibold text-slate-700">
                  <div>Starts: {exercise.availabilityPeriod?.startDate ? formatDateTime(exercise.availabilityPeriod.startDate) : 'Not set'}</div>
                  <div>Ends: {exercise.availabilityPeriod?.endDate ? formatDateTime(exercise.availabilityPeriod.endDate) : 'Not set'}</div>
                  {exercise.availabilityPeriod?.gracePeriodAllowed && exercise.availabilityPeriod?.gracePeriodDate && (
                    <div className="text-orange-600 mt-1">Grace: {formatDateTime(exercise.availabilityPeriod.gracePeriodDate)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* RESTORED: Status badge — shows "✓ Completed" when attempted */}
            <div className={`p-2 rounded-lg text-center text-[11px] font-semibold
              ${hasAttempted
                ? 'bg-green-50 text-green-700'
                : availability.status === 'available'    ? 'bg-green-50 text-green-700'
                : availability.status === 'grace-period' ? 'bg-orange-50 text-orange-700'
                : availability.status === 'upcoming'     ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'}`}>
              {hasAttempted ? '✓ Completed' : availability.message}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-xl p-3.5 mb-5" style={{ background: '#e6f2ff', border: '1px solid #2563eb40' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Before you start</span>
            </div>
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="text-[11px] text-blue-800 flex items-start gap-1.5">
                  <span className="text-blue-300 mt-0.5 flex-shrink-0">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-slate-500 transition-colors"
              style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f1f5f9'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
            >
              Cancel
            </button>
            {/* RESTORED: Begin button disabled + "Already Completed" text when attempted */}
            <button
              onClick={onConfirm}
              disabled={!canProceed}
              className={`flex-[2] py-2.5 rounded-xl text-[12px] font-black text-white flex items-center justify-center gap-2 transition-all
                ${canProceed ? 'hover:opacity-90 active:scale-[0.97]' : 'opacity-50 cursor-not-allowed'}`}
              style={{
                background: !canProceed
                  ? '#94a3b8'
                  : availability.status === 'grace-period' ? '#f97316' : '#2563eb',
                boxShadow: canProceed ? '0 4px 16px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              {hasAttempted ? (
                <><CheckCircle className="w-3.5 h-3.5" />Already Completed</>
              ) : availability.canStart ? (
                <><Play className="w-3.5 h-3.5 fill-white" />{isPractice ? 'Start Practice Mode' : 'Begin Exercise'}</>
              ) : (
                <><Lock className="w-3.5 h-3.5" />{availability.status === 'upcoming' ? 'Not Started' : 'Expired'}</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity:0; transform:scale(.88) translateY(12px) }
          to   { opacity:1; transform:scale(1)   translateY(0)    }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function Exercises({
  category, subcategory, courseId, exercises, onExerciseSelect,
  method, topic = '', module = '', nodeType = '',
  hierarchy = [], selectedItem = null, currentHierarchy = [],
  studentAnswers,
}: ExercisesProps) {
  const router = useRouter()
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [popupExercise, setPopupExercise]           = useState<Exercise | null>(null)

  const sortedExercises = useMemo(
    () => [...exercises].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [exercises]
  )

  // NOTE: handleExerciseClick is intentionally removed — clicking a row now
  // opens the popup (handleStartClick) instead of directly calling onExerciseSelect.
  // This matches the old codebase behaviour where the popup is the confirmation gate.

  const handleStartClick = (exercise: Exercise, e: React.MouseEvent) => {
    e.stopPropagation()
    setPopupExercise(exercise)
  }

  const handleConfirmStart = () => {
    if (!popupExercise) return
    onExerciseSelect(popupExercise)
    setPopupExercise(null)
  }

  const handleGradeClick = (exercise: Exercise, e: React.MouseEvent) => {
    e.stopPropagation()
    const hierarchyString = encodeURIComponent(JSON.stringify({
      hierarchy: hierarchy.length > 0 ? hierarchy : currentHierarchy,
      topic: topic || selectedItem?.title || '',
      module: module || currentHierarchy[0] || '',
      nodeType: nodeType || selectedItem?.type || ''
    }))
    const queryParams = new URLSearchParams({
      category: category || '', subcategory: subcategory || '',
      courseId: courseId?.toString() || '', exerciseId: exercise._id,
      exerciseName: exercise.exerciseInformation.exerciseName,
      exerciseLevel: exercise.exerciseInformation.exerciseLevel,
      totalPoints: getTotalMarks(exercise)?.toString() || '0',
      totalQuestions: getTotalQuestions(exercise).toString(),
      startDate: exercise.availabilityPeriod?.startDate || '',
      endDate: exercise.availabilityPeriod?.endDate || '',
      practiceMode: exercise.evaluationSettings?.practiceMode?.toString() || 'false',
      method: method || '', hierarchy: hierarchyString,
      topic: encodeURIComponent(topic || selectedItem?.title || ''),
      module: encodeURIComponent(module || currentHierarchy[0] || '')
    })
    router.push(`/lms/pages/courses/coursesdetailedview/exercisegrade?${queryParams.toString()}`)
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!sortedExercises || sortedExercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center min-h-[300px] rounded-2xl"
        style={{ background: 'white', border: '1px solid #e2e8f0' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: '#e6f2ff', border: '1px solid #2563eb40' }}>
          <BookOpen className="w-6 h-6 text-blue-500" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 mb-1">No Exercises Yet</h3>
        <p className="text-xs text-slate-400 max-w-xs">Exercises for this section haven't been added yet.</p>
      </div>
    )
  }

  // ── Table ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Popup — rendered via Portal into document.body so it escapes all overflow:hidden parents */}
      {popupExercise && typeof document !== 'undefined' && ReactDOM.createPortal(
        <StartExercisePopup
          exercise={popupExercise}
          onConfirm={handleConfirmStart}
          onClose={() => setPopupExercise(null)}
          availability={getExerciseAvailability(popupExercise)}
          hasAttempted={hasExerciseBeenAttempted(popupExercise, studentAnswers, method, subcategory)}
        />,
        document.body
      )}

      {/* Main container */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '420px', maxHeight: '400px', minHeight: '300px',
        background: 'white', border: '1px solid #e2e8f0',
        borderRadius: '16px', overflow: 'hidden'
      }}>
        {/* Fixed header */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc', fontWeight: 600, fontSize: '14px',
          flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>Exercises ({sortedExercises.length})</span>
          {sortedExercises.length > 5 && (
            <span style={{ fontSize: '11px', color: '#64748b' }}>↓ Scroll to see all</span>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto',
          position: 'relative', background: 'white',
          scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #e2e8f0',
        }} className="custom-scrollbar">

          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; border: 2px solid #f1f5f9; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
            .custom-scrollbar::-webkit-scrollbar-corner { background: #f1f5f9; }
            .custom-scrollbar::-webkit-scrollbar:horizontal { height: 8px; }
          `}</style>

          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr>
                {['Exercise', 'Type', 'Level', 'Questions', 'Deadline', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: i === 0 ? 'left' : 'center',
                    fontSize: '11px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sortedExercises.map(exercise => {
                const isSelected   = selectedExerciseId === exercise._id
                const availability = getExerciseAvailability(exercise)
                // RESTORED: compute attempted state per row
                const attempted    = hasExerciseBeenAttempted(exercise, studentAnswers, method, subcategory)
                const totalQ       = getTotalQuestions(exercise)
                const diffStyle    = getDifficultyStyle(exercise.exerciseInformation.exerciseLevel)
                const typeInfo     = getExerciseTypeInfo(exercise)
                const isPractice   = exercise.evaluationSettings?.practiceMode
                const endDate      = availability.endTime || (exercise.availabilityPeriod?.endDate ? new Date(exercise.availabilityPeriod.endDate) : null)
                const timeRemaining = endDate && availability.status === 'available' ? getTimeRemaining(endDate) : null

                // Row is startable only when window is open AND not yet submitted
                const canStart = availability.canStart && !attempted

                // RESTORED: deadline pill colour accounts for attempted state
                const deadlineColor = attempted                              ? '#10b981'
                  : availability.status === 'expired'                        ? '#ef4444'
                  : availability.status === 'grace-period'                   ? '#f97316'
                  : availability.status === 'upcoming'                       ? '#f59e0b'
                  : '#10b981'

                const statusLabel = attempted                               ? 'Completed'
                  : availability.status === 'expired'                       ? 'Expired'
                  : availability.status === 'grace-period'                  ? 'Grace Period'
                  : availability.status === 'upcoming'                      ? 'Upcoming'
                  : timeRemaining ? `${timeRemaining} left`                 : 'Available'

                return (
                  <tr
                    key={exercise._id}
                    style={{
                      cursor: 'pointer',
                      // RESTORED: green tint for attempted rows, blue for selected
                      background: isSelected ? '#eff6ff' : attempted ? '#f0fdf4' : 'white',
                      borderLeft: isSelected ? '3px solid #2563eb' : attempted ? '3px solid #10b981' : '3px solid transparent',
                      transition: 'all 0.15s',
                      opacity: attempted ? 0.85 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background     = attempted ? '#dcfce7' : '#f8fafc'
                        e.currentTarget.style.borderLeftColor = attempted ? '#10b981' : '#93c5fd'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background     = attempted ? '#f0fdf4' : 'white'
                        e.currentTarget.style.borderLeftColor = attempted ? '#10b981' : 'transparent'
                      }
                    }}
                  >
                    {/* Exercise name + badges */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isSelected ? '#2563eb' : typeInfo.bg,
                          border: `1.5px solid ${isSelected ? '#2563eb' : typeInfo.color + '40'}`,
                          color: isSelected ? 'white' : typeInfo.color
                        }}>{typeInfo.icon}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#2563eb' : '#0f172a' }}>
                              {exercise.exerciseInformation.exerciseName}
                            </span>
                            {isPractice && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 12, fontSize: '9px', fontWeight: 700, background: '#f5f3ff', color: '#7c3aed' }}>
                                <Zap style={{ width: 8, height: 8 }} />Practice
                              </span>
                            )}
                            {availability.status === 'grace-period' && !attempted && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 12, fontSize: '9px', fontWeight: 700, background: '#fff7ed', color: '#c2410c' }}>
                                <Hourglass style={{ width: 8, height: 8 }} />Grace
                              </span>
                            )}
                            {/* RESTORED: Done badge — green pill shown when exercise submitted */}
                            {attempted && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 12, fontSize: '9px', fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>
                                <CheckCircle style={{ width: 8, height: 8 }} />Done
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 1 }}>{exercise.exerciseInformation.exerciseId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                        background: typeInfo.bg, color: typeInfo.color,
                        border: `1px solid ${typeInfo.color}30`
                      }}>{typeInfo.icon}{typeInfo.label}</span>
                    </td>

                    {/* Level */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: diffStyle.dot, display: 'inline-block' }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: diffStyle.color, textTransform: 'capitalize' }}>
                          {exercise.exerciseInformation.exerciseLevel}
                        </span>
                      </div>
                    </td>

                    {/* Questions */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                        background: '#f0f9ff', color: '#0369a1', textAlign: 'center'
                      }}>{totalQ}</span>
                    </td>

                    {/* Deadline — RESTORED: colour and icon reflect attempted state */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>
                        {exercise.availabilityPeriod?.endDate ? formatDateTime(exercise.availabilityPeriod.endDate) : 'No deadline'}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: deadlineColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 2 }}>
                        {attempted                                         && <CheckCircle style={{ width: 10, height: 10 }} />}
                        {!attempted && availability.status === 'expired'   && <Lock        style={{ width: 10, height: 10 }} />}
                        {!attempted && availability.status === 'grace-period' && <Hourglass style={{ width: 10, height: 10 }} />}
                        {!attempted && availability.status === 'upcoming'  && <Calendar    style={{ width: 10, height: 10 }} />}
                        {!attempted && availability.status === 'available' && <Clock       style={{ width: 10, height: 10 }} />}
                        {statusLabel}
                      </div>
                      {!attempted && availability.status === 'grace-period' && availability.graceTime && (
                        <div style={{ fontSize: '9px', color: '#f97316', marginTop: 1 }}>
                          Until {formatDateTime(availability.graceTime.toISOString())}
                        </div>
                      )}
                    </td>

                    {/* Actions — RESTORED: Grade + Start/Completed buttons */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {/* Grade button — always visible */}
                        <button
                          onClick={e => handleGradeClick(exercise, e)}
                          style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                            background: '#faf5ff', color: '#7c3aed', border: '1px solid #ddd6fe',
                            cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 3
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; e.currentTarget.style.borderColor = '#c4b5fd' }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#faf5ff'; e.currentTarget.style.borderColor = '#ddd6fe' }}
                        >
                          <Trophy style={{ width: 11, height: 11 }} />Grade
                        </button>

                        {/* Start / Completed button — RESTORED */}
                        <button
                          onClick={e => handleStartClick(exercise, e)}
                          disabled={!canStart}
                          style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                            background: !canStart
                              ? '#94a3b8'
                              : availability.status === 'grace-period' ? '#f97316' : '#2563eb',
                            color: 'white', border: 'none',
                            cursor: canStart ? 'pointer' : 'not-allowed',
                            opacity: canStart ? 1 : 0.55,
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 3,
                            boxShadow: canStart ? '0 2px 6px rgba(37,99,235,0.30)' : 'none'
                          }}
                          onMouseEnter={e => { if (canStart) e.currentTarget.style.transform = 'scale(1.04)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          {/* RESTORED: button text changes per state */}
                          {attempted ? (
                            <><CheckCircle style={{ width: 10, height: 10 }} />Completed</>
                          ) : !availability.canStart ? (
                            availability.status === 'upcoming'
                              ? <><Calendar style={{ width: 10, height: 10 }} />Upcoming</>
                              : <><Lock     style={{ width: 10, height: 10 }} />Expired</>
                          ) : availability.status === 'grace-period' ? (
                            <><Play style={{ width: 10, height: 10 }} />Grace Start</>
                          ) : (
                            <><Play style={{ width: 10, height: 10 }} />{isPractice ? 'Practice' : 'Start'}</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}