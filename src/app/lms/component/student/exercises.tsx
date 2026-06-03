"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import {
  Clock, AlertCircle, X, Play, Zap, Trophy, Star,
  CheckSquare, Code2, Layers, HelpCircle, BookOpen,
  Calendar, Hourglass, Lock, CheckCircle, Code,
  Info, Target, Settings, FileText, BarChart2, Shield, Cpu,
  Search, Filter, ChevronDown, ChevronLeft, ChevronRight, Eye
} from "lucide-react"
import { useRouter } from "next/navigation"

// ─── Interfaces ────────────────────────────────────────────────────────────────

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
  submissionAttempts?: number
  [key: string]: any
}

interface QuestionConfiguration {
  mcqQuestionConfiguration?: McqQuestionConfiguration
  programmingQuestionConfiguration?: {
    submissionAttempts?: number
    [key: string]: any
  }
  othersQuestionConfiguration?: {
    submissionAttempts?: number
    [key: string]: any
  }
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
  cutOffEnabled?: boolean
  cutOffDate?: string | null
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
  isGraded?: boolean
}

interface StudentAnswer {
  exerciseId: string
  status: string
  _id: string
}

interface ExerciseSelectOptions {
  resetProgress?: boolean
}

interface ExercisesProps {
  courseId?: number | string
  exercises: Exercise[]
  onExerciseSelect: (exercise: Exercise, options?: ExerciseSelectOptions) => void
  method?: string
  category?: string
  subcategory?: string
  topic?: string
  module?: string
  nodeType?: string
  hierarchy?: string[]
  selectedItem?: any
  currentHierarchy?: string[]
  studentAnswers?: { [section: string]: any }
  isHeaderHidden?: boolean
  onShowHeader?: () => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getTotalQuestions(exercise: Exercise): number {
  if (exercise.questions && exercise.questions.length > 0) return exercise.questions.length
  return getConfiguredQuestionCount(exercise)
}
function getConfiguredQuestionCount(exercise: Exercise): number {
  const qc = exercise.questionConfiguration as any
  const progCfg = qc?.programmingQuestionConfiguration
  const mcqCfg = qc?.mcqQuestionConfiguration
  const othersCfg = qc?.othersQuestionConfiguration

  const countFromLevelCfg = (cfg: any): number => {
    if (!cfg) return 0
    const configType = cfg.questionConfigType

    if (configType === 'levelBased') {
      const lbc = cfg.levelBasedCounts
      return (lbc?.easy || 0) + (lbc?.medium || 0) + (lbc?.hard || 0)
    }
    if (configType === 'general') {
      return cfg.generalQuestionCount || 0
    }
    // backend uses 'selectionLevel'; keep 'selection' for back-compat
    if (configType === 'selectionLevel' || configType === 'selection') {
      const slc = cfg.selectionLevelCounts
      return (slc?.easy || 0) + (slc?.medium || 0) + (slc?.hard || 0)
    }

    // fallback: try all three and take whichever is non-zero
    const lbc = cfg.levelBasedCounts
    const levelSum = (lbc?.easy || 0) + (lbc?.medium || 0) + (lbc?.hard || 0)
    if (levelSum > 0) return levelSum
    const slc = cfg.selectionLevelCounts
    const selSum = (slc?.easy || 0) + (slc?.medium || 0) + (slc?.hard || 0)
    if (selSum > 0) return selSum
    if (cfg.generalQuestionCount > 0) return cfg.generalQuestionCount
    return 0
  }

  const progCount = countFromLevelCfg(progCfg)
  const othersCount = countFromLevelCfg(othersCfg)
  // backend stores MCQ count as totalMcqQuestions; keep totalQuestions as fallback
  const mcqCount = mcqCfg?.totalMcqQuestions || mcqCfg?.totalQuestions || 0

  const sum = progCount + othersCount + mcqCount
  if (sum > 0) return sum

  if (exercise.exerciseInformation?.totalQuestions) return exercise.exerciseInformation.totalQuestions

  return 0
}

// Compute how many questions of a given level-based config are allocated.
function levelConfigCount(cfg: any): number {
  if (!cfg) return 0
  const t = cfg.questionConfigType
  if (t === 'general') return cfg.generalQuestionCount || 0
  if (t === 'levelBased') {
    const c = cfg.levelBasedCounts
    return (c?.easy || 0) + (c?.medium || 0) + (c?.hard || 0)
  }
  if (t === 'selectionLevel' || t === 'selection') {
    const c = cfg.selectionLevelCounts
    return (c?.easy || 0) + (c?.medium || 0) + (c?.hard || 0)
  }
  // fallback: any populated bucket
  const lbc = cfg.levelBasedCounts
  const lvl = (lbc?.easy || 0) + (lbc?.medium || 0) + (lbc?.hard || 0)
  if (lvl > 0) return lvl
  const slc = cfg.selectionLevelCounts
  const sel = (slc?.easy || 0) + (slc?.medium || 0) + (slc?.hard || 0)
  if (sel > 0) return sel
  return cfg.generalQuestionCount || 0
}

// An exercise is listed only when every configured bucket (mcq / programming /
// others) has questions[] actually filled per its allocation. For Combined,
// BOTH the mcq side and the programming side must be filled.
function isExerciseFullyConfigured(exercise: Exercise): boolean {
  const qc = exercise.questionConfiguration as any
  const mcqCfg = qc?.mcqQuestionConfiguration
  const progCfg = qc?.programmingQuestionConfiguration
  const othersCfg = qc?.othersQuestionConfiguration

  const mcqConfigured =
    mcqCfg?.totalMcqQuestions ||
    mcqCfg?.totalQuestions ||
    ((mcqCfg?.easyCount || 0) + (mcqCfg?.mediumCount || 0) + (mcqCfg?.hardCount || 0)) ||
    0
  const progConfigured = levelConfigCount(progCfg)
  const othersConfigured = levelConfigCount(othersCfg)

  // No allocation at all → nothing to show.
  if (!mcqConfigured && !progConfigured && !othersConfigured) return false

  // Bucket the actual questions by type (case-insensitive). Unknown/missing
  // questionType is treated as "programming" for back-compat with older data.
  const buckets = { mcq: 0, programming: 0, others: 0 }
  for (const q of exercise.questions || []) {
    const t = String((q as any)?.questionType || '').toLowerCase()
    if (t === 'mcq') buckets.mcq++
    else if (t === 'others' || t === 'other') buckets.others++
    else if (t === 'programming') buckets.programming++
    else buckets.programming++  // fallback
  }

  // Each configured bucket must be fully filled.
  if (mcqConfigured && buckets.mcq < mcqConfigured) return false
  if (progConfigured && buckets.programming < progConfigured) return false
  if (othersConfigured && buckets.others < othersConfigured) return false

  return true
}

function getTotalMarks(exercise: Exercise): number | null {
  if (exercise.isGraded === false) return null
  const mcqConfig = exercise.questionConfiguration?.mcqQuestionConfiguration
  if (mcqConfig?.totalMarks) return mcqConfig.totalMarks
  if (mcqConfig?.marksPerQuestion && exercise.questions?.length)
    return mcqConfig.marksPerQuestion * exercise.questions.length
  if (exercise.exerciseInformation.totalPoints) return exercise.exerciseInformation.totalPoints
  return null
}

function getMarksPerQuestion(exercise: Exercise): number | null {
  if (exercise.isGraded === false) return null
  return exercise.questionConfiguration?.mcqQuestionConfiguration?.marksPerQuestion ?? null
}

function getSubmissionAttempts(exercise: Exercise): number {
  return (
    exercise.questionConfiguration?.programmingQuestionConfiguration?.submissionAttempts ??
    exercise.questionConfiguration?.mcqQuestionConfiguration?.submissionAttempts ??
    (exercise.questionConfiguration as any)?.othersQuestionConfiguration?.submissionAttempts ??
    1
  )
}

function getTestSubmissions(
  exercise: Exercise,
  studentAnswers?: ExercisesProps['studentAnswers'],
  method?: string,
  subcategory?: string
): number {
  if (!studentAnswers || !method) return 0
  try {
    const matchId = (a: any) =>
      a?.exerciseId === exercise._id || a?._id === exercise._id || a?.id === exercise._id
    const deepFind = (node: any): number => {
      if (!node || typeof node !== 'object') return 0
      if (Array.isArray(node)) {
        const found = node.find(matchId)
        if (found) return found.testSubmissions ?? 0
        for (const item of node) { const r = deepFind(item); if (r > 0) return r }
        return 0
      }
      for (const arr of ['assignments', 'assessments', 'exercises', 'submissions']) {
        if (Array.isArray(node[arr])) {
          const found = node[arr].find(matchId)
          if (found) return found.testSubmissions ?? 0
        }
      }
      for (const v of Object.values(node)) {
        if (v && typeof v === 'object') { const r = deepFind(v); if (r > 0) return r }
      }
      return 0
    }
    const ml = method.toLowerCase().replace(/[-_\s]/g, '')
    const candidates: string[] = []
    if (ml.includes('ido')) candidates.push('I_Do', 'i_do', 'IDo', 'i-do', 'ido')
    if (ml.includes('wedo')) candidates.push('We_Do', 'we_do', 'WeDo', 'we-do', 'wedo')
    if (ml.includes('youdo')) candidates.push('You_Do', 'you_do', 'YouDo', 'you-do', 'youdo')
    candidates.push(method, method.replace(/-/g, '_'), method.replace(/_/g, '-'))
    const tried = new Set<string>()
    for (const key of candidates) {
      if (tried.has(key)) continue
      tried.add(key)
      const sec = studentAnswers[key]
      if (!sec) continue
      const r = deepFind(sec)
      if (r > 0) return r
    }
    for (const key of Object.keys(studentAnswers)) {
      const r = deepFind(studentAnswers[key])
      if (r > 0) return r
    }
    return 0
  } catch (err) {
    console.error('getTestSubmissions error:', err)
    return 0
  }
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
  if (type === 'other' || cfg?.otherMode)
    return { label: 'Other', color: '#0d9488', bg: '#f0fdfa', icon: <HelpCircle className="w-3 h-3" /> }
  return { label: 'Exercise', color: '#475569', bg: '#f8fafc', icon: <HelpCircle className="w-3 h-3" /> }
}

function getDifficultyStyle(level: string = 'intermediate') {
  switch (level.toLowerCase()) {
    case 'beginner': return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981', emoji: '🌱', label: 'Beginner' }
    case 'medium': return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', emoji: '⚡', label: 'Medium' }
    case 'intermediate': return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b', emoji: '⚡', label: 'Intermediate' }
    case 'hard': return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', emoji: '🔥', label: 'Hard' }
    case 'advanced': return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444', emoji: '🔥', label: 'Advanced' }
    default: return { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8', emoji: '📝', label: 'General' }
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
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60); const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getDifficultyBreakdown(exercise: Exercise): { easy: number; medium: number; hard: number } | null {
  const mcqCfg = exercise.questionConfiguration?.mcqQuestionConfiguration
  if (mcqCfg?.easyCount !== undefined || mcqCfg?.mediumCount !== undefined || mcqCfg?.hardCount !== undefined)
    return { easy: mcqCfg.easyCount || 0, medium: mcqCfg.mediumCount || 0, hard: mcqCfg.hardCount || 0 }

  // Try levelBasedCounts from programming config
  const progCfg = (exercise.questionConfiguration as any)?.programmingQuestionConfiguration
  const lbc = progCfg?.levelBasedCounts
  if (lbc && (lbc.easy > 0 || lbc.medium > 0 || lbc.hard > 0))
    return { easy: lbc.easy || 0, medium: lbc.medium || 0, hard: lbc.hard || 0 }

  if (exercise.questions && exercise.questions.length > 0) {
    const counts = { easy: 0, medium: 0, hard: 0 }
    exercise.questions.forEach(q => {
      const d = (q.mcqQuestionDifficulty || q.difficulty || '').toLowerCase()
      if (d === 'easy') counts.easy++
      else if (d === 'medium') counts.medium++
      else if (d === 'hard') counts.hard++
    })
    if (counts.easy + counts.medium + counts.hard > 0) return counts
  }
  return null
}

function getExerciseAvailability(exercise: Exercise): {
  status: 'upcoming' | 'available' | 'expired' | 'grace-period' | 'late-attempt'
  message: string
  canStart: boolean
  startTime?: Date
  endTime?: Date
  graceTime?: Date | null
  cutOffTime?: Date | null
} {
  const now = new Date()
  const startDate = exercise.availabilityPeriod?.startDate ? new Date(exercise.availabilityPeriod.startDate) : null
  const endDate = exercise.availabilityPeriod?.endDate ? new Date(exercise.availabilityPeriod.endDate) : null
  const graceDate = exercise.availabilityPeriod?.gracePeriodAllowed && exercise.availabilityPeriod?.gracePeriodDate
    ? new Date(exercise.availabilityPeriod.gracePeriodDate) : null
  const cutOffDate = exercise.availabilityPeriod?.cutOffEnabled && exercise.availabilityPeriod?.cutOffDate
    ? new Date(exercise.availabilityPeriod.cutOffDate) : null

  if (startDate && now < startDate)
    return { status: 'upcoming', message: `Starts ${formatDateTime(startDate.toISOString())}`, canStart: false, startTime: startDate, endTime: endDate || undefined, graceTime: graceDate, cutOffTime: cutOffDate }
  if (graceDate && now <= graceDate && endDate && now > endDate)
    return { status: 'grace-period', message: `Grace period until ${formatDateTime(graceDate.toISOString())}`, canStart: true, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate, cutOffTime: cutOffDate }
  if (endDate && now <= endDate)
    return { status: 'available', message: `Ends ${formatDateTime(endDate.toISOString())}`, canStart: true, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate, cutOffTime: cutOffDate }
  // ── Late-attempt window: end < now ≤ cutOffDate ──
  if (cutOffDate && endDate && now > endDate && now <= cutOffDate)
    return { status: 'late-attempt', message: `Late submission allowed until ${formatDateTime(cutOffDate.toISOString())}`, canStart: true, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate, cutOffTime: cutOffDate }
  if (graceDate && endDate && now > endDate && now < graceDate)
    return { status: 'grace-period', message: `Grace period starts ${formatDateTime(endDate.toISOString())}`, canStart: false, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate, cutOffTime: cutOffDate }
  return {
    status: 'expired',
    message: cutOffDate && now > cutOffDate
      ? `Expired ${formatDateTime(cutOffDate.toISOString())}`
      : graceDate && now > graceDate
        ? `Expired ${formatDateTime(graceDate.toISOString())}`
        : endDate ? `Expired ${formatDateTime(endDate.toISOString())}` : 'Expired',
    canStart: false, startTime: startDate || undefined, endTime: endDate || undefined, graceTime: graceDate, cutOffTime: cutOffDate
  }
}

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
    const deepScan = (node: any): boolean => {
      if (!node || typeof node !== 'object') return false
      if (Array.isArray(node)) return node.some(matchId)
      if (Array.isArray(node.assignments) && node.assignments.some(matchId)) return true
      if (Array.isArray(node.assessments) && node.assessments.some(matchId)) return true
      if (Array.isArray(node.exercises) && node.exercises.some(matchId)) return true
      if (Array.isArray(node.submissions) && node.submissions.some(matchId)) return true
      for (const v of Object.values(node)) { if (Array.isArray(v) && v.some(matchId)) return true }
      return false
    }
    const ml = method.toLowerCase().replace(/[-_\s]/g, '')
    const candidates: string[] = []
    if (ml.includes('ido')) candidates.push('I_Do', 'i_do', 'IDo', 'i-do', 'ido')
    if (ml.includes('wedo')) candidates.push('We_Do', 'we_do', 'WeDo', 'we-do', 'wedo')
    if (ml.includes('youdo')) candidates.push('You_Do', 'you_do', 'YouDo', 'you-do', 'youdo')
    candidates.push(method, method.replace(/-/g, '_'), method.replace(/_/g, '-'))
    const tried = new Set<string>()
    for (const key of candidates) {
      if (tried.has(key)) continue
      tried.add(key)
      const sec = studentAnswers[key]
      if (!sec) continue
      if (deepScan(sec)) return true
    }
    for (const key of Object.keys(studentAnswers)) { if (deepScan(studentAnswers[key])) return true }
    return false
  } catch (err) {
    console.error('hasExerciseBeenAttempted error:', err)
    return false
  }
}

function getTimeRemaining(date: Date): string {
  const diffMs = date.getTime() - Date.now()
  if (diffMs <= 0) return '0m'
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  return `${mins}m`
}

function getExerciseAttemptData(exerciseId: string): { inProgress: boolean } {
  if (typeof window === 'undefined') return { inProgress: false }
  return { inProgress: localStorage.getItem('ex_in_progress_' + exerciseId) === '1' }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Start Exercise Popup — fully rebuilt
// ═══════════════════════════════════════════════════════════════════════════════

interface PopupProps {
  exercise: Exercise
  onConfirm: () => void
  onClose: () => void
  availability: ReturnType<typeof getExerciseAvailability>
  hasAttempted?: boolean
  limitReached?: boolean
  testSubmissions?: number
  submissionAttempts?: number
  isRetake?: boolean
  breadcrumb?: string[]
}

function StartExercisePopup({
  exercise, onConfirm, onClose, availability,
  hasAttempted, limitReached, testSubmissions, submissionAttempts, isRetake, breadcrumb,
}: PopupProps) {
  const ex = exercise as any
  const typeInfo = getExerciseTypeInfo(exercise)
  const totalQ = getTotalQuestions(exercise)
  const isPractice = exercise.evaluationSettings?.practiceMode
  const canProceed = availability.canStart && !limitReached
  const isGraded = exercise.isGraded !== false

  const totalMarks: number | null = isGraded
    ? (ex.exerciseInformation?.totalMarksProgramming ||
       ex.exerciseInformation?.totalMarks ||
       ex.exerciseInformation?.totalPoints || null)
    : null

  const passMark: number | null = isGraded
    ? (ex.gradeSettings?.programmingGradeToPass ??
       ex.gradeSettings?.combinedGradeToPass ??
       ex.gradeSettings?.mcqGradeToPass ?? null)
    : null

  const duration: number | null = ex.exerciseInformation?.totalDuration ?? null
  const languages: string[] = ex.programmingSettings?.selectedLanguages ?? []
  const selectedModule: string | null = ex.programmingSettings?.selectedModule ?? null

  const progCfg = ex.questionConfiguration?.programmingQuestionConfiguration
  const allowCodeExecution = progCfg?.allowCodeExecution ?? false
  const showSampleCases = progCfg?.showSampleCases ?? false
  const questionFlow = progCfg?.questionFlow ?? null

  const statusConfig = limitReached
    ? { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', text: `All ${submissionAttempts} attempt${(submissionAttempts ?? 1) > 1 ? 's' : ''} used — completed` }
    : availability.status === 'available'
    ? { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', text: availability.message }
    : availability.status === 'late-attempt'
    ? { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', text: `⚠ ${availability.message}` }
    : availability.status === 'grace-period'
    ? { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', text: availability.message }
    : availability.status === 'upcoming'
    ? { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', text: availability.message }
    : { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', text: availability.message }

  // Simple key-value row
  const R = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '7px 0', borderBottom: '1px solid #f1f5f9',
    }}>
      <span style={{ fontSize: 12, color: '#64748b', width: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{value}</span>
    </div>
  )

  // Section divider label
  const Sec = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      fontSize: 10, fontWeight: 700, color: '#94a3b8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      paddingTop: 12, paddingBottom: 2,
    }}>
      {children}
    </div>
  )

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 440,
          borderRadius: 14, background: '#ffffff',
          boxShadow: '0 20px 50px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',
          animation: 'popIn .22s cubic-bezier(.34,1.56,.64,1)',
          maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, borderRadius: '14px 14px 0 0', flexShrink: 0, background: isGraded ? '#2563eb' : '#0891b2' }} />

        {/* Header — breadcrumb + title + close */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            {breadcrumb && breadcrumb.filter(Boolean).length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                gap: 3, marginBottom: 5, overflow: 'hidden',
              }}>
                {breadcrumb.filter(Boolean).map((crumb, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {i > 0 && <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 700, lineHeight: 1 }}>&gt;</span>}
                    <span style={{ fontSize: 10, color: '#1e293b', fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>{crumb}</span>
                  </span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
              {exercise.exerciseInformation.exerciseName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: '50%', border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 10,
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Scrollable body — single column */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
          padding: '0 16px 8px',
          scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent',
        }}>
          <R label="Assignment ID" value={exercise.exerciseInformation.exerciseId || exercise._id} />
          <R label="Assignment Name" value={exercise.exerciseInformation.exerciseName} />
          <R label="Graded" value={isGraded ? 'Graded' : 'Non-Graded'} />

          {/* Questions & Duration */}
          <Sec>Questions</Sec>
          <R label="Total Questions" value={totalQ || '—'} />
          <R label="Duration" value={duration ? formatDuration(duration) : '—'} />

          {/* Schedule */}
          <Sec>Schedule</Sec>
          <R label="Start Date" value={<span style={{ fontSize: 11 }}>{exercise.availabilityPeriod?.startDate ? formatDateTime(exercise.availabilityPeriod.startDate) : '—'}</span>} />
          <R label="End Date" value={<span style={{ fontSize: 11 }}>{exercise.availabilityPeriod?.endDate ? formatDateTime(exercise.availabilityPeriod.endDate) : '—'}</span>} />
          {exercise.availabilityPeriod?.gracePeriodAllowed && exercise.availabilityPeriod?.gracePeriodDate && (
            <R label="Grace Period" value={<span style={{ fontSize: 11 }}>{formatDateTime(exercise.availabilityPeriod.gracePeriodDate)}</span>} />
          )}

          {/* Details */}
          <Sec>Details</Sec>
          {selectedModule && <R label="Module" value={selectedModule} />}
          {languages.length > 0 && (
            <R label="Languages" value={
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'flex-end' }}>
                {languages.map(l => (
                  <span key={l} style={{ padding: '1px 5px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#2563eb' }}>
                    {l.toUpperCase()}
                  </span>
                ))}
              </span>
            } />
          )}
          {/* <R label="Question Flow" value={questionFlow === 'freeFlow' || !questionFlow ? 'Free Flow' : questionFlow} />
          <R label="Code Execution" value={allowCodeExecution ? 'Allowed' : 'Not allowed'} />
          <R label="Sample Cases" value={showSampleCases ? 'Visible' : 'Hidden'} />
          {isGraded && <R label="Total Marks" value={totalMarks ?? '—'} />}
          {isGraded && passMark != null && <R label="Pass Mark" value={passMark} />}
          {isGraded && <R label="Attempts Used" value={`${testSubmissions ?? 0} / ${submissionAttempts ?? 1}`} />} */}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px 14px', borderTop: '1px solid #f1f5f9',
          background: '#fafafa', borderRadius: '0 0 14px 14px', flexShrink: 0,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textAlign: 'center',
            padding: '5px 10px', borderRadius: 6, marginBottom: 8,
            background: statusConfig.bg, color: statusConfig.color, border: `1px solid ${statusConfig.border}`,
          }}>
            {statusConfig.text}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                color: '#64748b', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canProceed}
              style={{
                flex: 3, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, border: 'none', cursor: canProceed ? 'pointer' : 'not-allowed',
                opacity: canProceed ? 1 : 0.5,
                background: !canProceed ? '#94a3b8'
                  : availability.status === 'late-attempt' ? '#f97316'
                  : availability.status === 'grace-period' ? '#f97316'
                  : isGraded ? '#2563eb' : '#0891b2',
              }}
            >
              {limitReached
                ? <><CheckCircle className="w-3.5 h-3.5" />Already Completed</>
                : availability.status === 'late-attempt' && availability.canStart
                ? <><Play className="w-3.5 h-3.5" style={{ fill: 'white' }} />Start Late Attempt</>
                : availability.canStart
                ? <><Play className="w-3.5 h-3.5" style={{ fill: 'white' }} />{isRetake ? (isPractice ? 'Retake Practice' : isGraded ? 'Retake Graded Exercise' : 'Retake Exercise') : (isPractice ? 'Start Practice' : isGraded ? 'Begin Graded Exercise' : 'Start Exercise')}</>
                : availability.status === 'upcoming'
                ? <><Calendar className="w-3.5 h-3.5" />Not Yet Open</>
                : <><Lock className="w-3.5 h-3.5" />Expired</>
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity:0; transform:scale(.92) translateY(8px) }
          to   { opacity:1; transform:scale(1) translateY(0) }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Resume / Start Fresh Modal
// ═══════════════════════════════════════════════════════════════════════════════

interface ResumeModalProps {
  exercise: Exercise
  onResume: () => void
  onStartFresh: () => void
  onClose: () => void
}

function ResumeModal({ exercise, onResume, onStartFresh, onClose }: ResumeModalProps) {
  const typeInfo = getExerciseTypeInfo(exercise)
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 420,
          borderRadius: 20, overflow: 'hidden', background: 'white',
          boxShadow: '0 30px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
          animation: 'popIn .28s cubic-bezier(.34,1.56,.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg,#f59e0b,#f97316)' }} />
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: typeInfo.bg, color: typeInfo.color, flexShrink: 0,
            }}>
              {typeInfo.icon}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {exercise.exerciseInformation.exerciseName}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Resume or start over?</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '14px 16px', borderRadius: 12,
            background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 20,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>💾</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>Saved progress found</div>
              <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
                You have in-progress code for this exercise. Resume from where you left off or clear it and start fresh.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={onResume}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
              }}
            >
              <Play style={{ width: 14, height: 14, fill: 'white' }} />
              Resume Where I Left Off
            </button>
            <button
              onClick={onStartFresh}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: '#fff7ed', color: '#c2410c', border: '1.5px solid #fed7aa',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Star style={{ width: 14, height: 14 }} />
              Start Fresh (Clear Saved Code)
            </button>
            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 12, fontSize: 12, fontWeight: 600,
                background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
        <style>{`@keyframes popIn{from{opacity:0;transform:scale(.88) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Exercises Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function Exercises({
  category, subcategory, courseId, exercises, onExerciseSelect,
  method, topic = '', module = '', nodeType = '',
  hierarchy = [], selectedItem = null, currentHierarchy = [],
  studentAnswers, isHeaderHidden = false, onShowHeader,
}: ExercisesProps) {
  const router = useRouter()
  const filterRef    = useRef<HTMLDivElement>(null)
  const cardRef      = useRef<HTMLDivElement>(null)
  const tableAreaRef = useRef<HTMLDivElement>(null)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [popupExercise, setPopupExercise] = useState<{ exercise: Exercise; isRetake?: boolean } | null>(null)
  const [resumeModalExercise, setResumeModalExercise] = useState<Exercise | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' } | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterLevel, setFilterLevel] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false)
      }
    }
    if (showFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterDropdown])

const showToast = (message: string, type: 'error' | 'warning' = 'error') => {
  setToast({ message, type })
  setTimeout(() => setToast(null), 3500)
}

const filteredExercises = useMemo(
  () => {
    let result = [...exercises].filter(ex => isExerciseFullyConfigured(ex))
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(ex =>
        ex.exerciseInformation.exerciseName.toLowerCase().includes(query) ||
        ex.exerciseInformation.exerciseId.toLowerCase().includes(query)
      )
    }
    
    // Apply level filter
    if (filterLevel !== "all") {
      result = result.filter(ex => ex.exerciseInformation.exerciseLevel === filterLevel)
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter(ex => {
        const availability = getExerciseAvailability(ex)
        const submissionAttempts = getSubmissionAttempts(ex)
        const testSubmissions = getTestSubmissions(ex, studentAnswers, method, subcategory)
        const isCompleted = testSubmissions >= 1
        const limitReached = testSubmissions >= submissionAttempts

        if (filterStatus.length > 0) {
          const checks: boolean[] = []
          if (filterStatus.includes("active"))       checks.push(availability.canStart)
          if (filterStatus.includes("inactive"))     checks.push(!availability.canStart)
          if (filterStatus.includes("submitted"))    checks.push(isCompleted)
          if (filterStatus.includes("not-submitted"))checks.push(!isCompleted)
          return checks.some(Boolean)
        }
        return true
      })
    }
    
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },
  [exercises, searchQuery, filterLevel, filterStatus, studentAnswers, method, subcategory]
)

// Dynamically compute rows per page from the actual table-body area height
useEffect(() => {
  const el = tableAreaRef.current
  if (!el) return
  const ROW_H = 49  // py-3 rows ≈ 49px (24px padding + ~24px content + 1px border)
  const compute = () => {
    setItemsPerPage(Math.max(5, Math.floor(el.clientHeight / ROW_H)))
  }
  compute()
  const ro = new ResizeObserver(compute)
  ro.observe(el)
  return () => ro.disconnect()
}, [])

// Reset to page 1 when filters change
useEffect(() => { setCurrentPage(1) }, [searchQuery, filterLevel, filterStatus.join(',')])

const ITEMS_PER_PAGE = itemsPerPage
const totalPages   = Math.max(1, Math.ceil(filteredExercises.length / ITEMS_PER_PAGE))
const safePage     = Math.min(currentPage, totalPages)
const startIdx     = (safePage - 1) * ITEMS_PER_PAGE
const pagedExercises = filteredExercises.slice(startIdx, startIdx + ITEMS_PER_PAGE)

const getPageNums = (): (number | '...')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const p: (number | '...')[] = []
  if (safePage <= 4) p.push(1, 2, 3, 4, 5, '...', totalPages)
  else if (safePage >= totalPages - 3) p.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  else p.push(1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages)
  return p
}

const handleStartClick = (exercise: Exercise, e: React.MouseEvent) => {
  e.stopPropagation()
  
  // ← ADD THIS BLOCK
  const totalQ = getTotalQuestions(exercise)
  if (totalQ === 0) {
    showToast('This exercise has not been configured yet. Please contact your instructor.')
    return
  }
  
  const submissionAttempts = getSubmissionAttempts(exercise)
  const testSubmissions = getTestSubmissions(exercise, studentAnswers, method, subcategory)
  const isCompleted = testSubmissions >= 1
  const limitReached = testSubmissions >= submissionAttempts
  const isRetake = isCompleted && !limitReached

  if (limitReached) {
    // All attempts used — no more starts.
    return
  }

  if (isRetake) {
    setPopupExercise({ exercise, isRetake: true })
  } else {
    const { inProgress } = getExerciseAttemptData(exercise._id)
    if (inProgress) {
      setResumeModalExercise(exercise)
    } else {
      setPopupExercise({ exercise, isRetake: false })
    }
  }
}

  const handleConfirmStart = () => {
    if (!popupExercise) return
    if (popupExercise.isRetake) {
      onExerciseSelect(popupExercise.exercise, { resetProgress: true })
    } else {
      const { inProgress } = getExerciseAttemptData(popupExercise.exercise._id)
      if (inProgress) {
        setResumeModalExercise(popupExercise.exercise)
        setPopupExercise(null)
        return
      }
      onExerciseSelect(popupExercise.exercise)
    }
    setPopupExercise(null)
  }

  const handleConfirmResume = (resetProgress: boolean) => {
    if (!resumeModalExercise) return
    onExerciseSelect(resumeModalExercise, { resetProgress })
    setResumeModalExercise(null)
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

  // ── Empty state (no exercises at all, before any filter) ─────────────────────
  if (!exercises || exercises.filter(ex => isExerciseFullyConfigured(ex)).length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 p-5 rounded-2xl" style={{ background: 'rgba(37,99,235,0.05)', border: '1.5px dashed rgba(37,99,235,0.2)' }}>
          <BookOpen size={28} style={{ color: 'rgba(37,99,235,0.35)' }} />
        </div>
        <h3 className="text-[14px] font-bold mb-1" style={{ color: '#1a1a2e' }}>No Exercises Yet</h3>
        <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: '#8b8b9e' }}>
          Exercises for this section haven't been added yet.
        </p>
      </div>
    )
  }

  // ── Table ────────────────────────────────────────────────────────────────────
  return (
    <> {/* Toast notification */}
   {toast && (
  <div style={{
    position: 'fixed', top: 24, right: 24,          // ← top-right
    // remove: bottom: 24, left: '50%', transform: 'translateX(-50%)'
    zIndex: 999999, padding: '12px 20px', borderRadius: 12,
    background: toast.type === 'error' ? '#fef2f2' : '#fffbeb',
    border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#fde68a'}`,
    color: toast.type === 'error' ? '#b91c1c' : '#92400e',
    fontSize: 13, fontWeight: 600,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    display: 'flex', alignItems: 'center', gap: 8,
    animation: 'slideDown 0.3s cubic-bezier(.34,1.56,.64,1)',  // ← slideDown
    whiteSpace: 'nowrap',
  }}>
    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
    {toast.message}
  </div>
)}

      {/* Start popup portal */}
      {popupExercise && typeof document !== 'undefined' && ReactDOM.createPortal(
        <StartExercisePopup
          exercise={popupExercise.exercise}
          onConfirm={handleConfirmStart}
          onClose={() => setPopupExercise(null)}
          availability={getExerciseAvailability(popupExercise.exercise)}
          hasAttempted={hasExerciseBeenAttempted(popupExercise.exercise, studentAnswers, method, subcategory)}
          limitReached={
            getTestSubmissions(popupExercise.exercise, studentAnswers, method, subcategory) >=
            getSubmissionAttempts(popupExercise.exercise)
          }
          testSubmissions={getTestSubmissions(popupExercise.exercise, studentAnswers, method, subcategory)}
          submissionAttempts={getSubmissionAttempts(popupExercise.exercise)}
          isRetake={popupExercise.isRetake}
          breadcrumb={[
            ...(hierarchy.length > 0 ? hierarchy : currentHierarchy),
            method ? method.replace(/_/g, ' ') : undefined,
            subcategory || undefined,
          ].filter(Boolean) as string[]}
        />,
        document.body
      )}

      {/* Resume modal portal */}
      {resumeModalExercise && typeof document !== 'undefined' && ReactDOM.createPortal(
        <ResumeModal
          exercise={resumeModalExercise}
          onResume={() => handleConfirmResume(false)}
          onStartFresh={() => handleConfirmResume(true)}
          onClose={() => setResumeModalExercise(null)}
        />,
        document.body
      )}

      {/* Exercise List */}
      <div ref={cardRef} className="flex flex-col h-full" style={{
        fontFamily: "'Inter','Roboto',system-ui,-apple-system,BlinkMacSystemFont,sans-serif",
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 1px 6px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.02)',
        overflow: 'hidden',
        background: '#ffffff',
        margin: '0 2px',
      }}>

        {/* ── Search & Filter bar ── */}
        <div className="flex-none flex items-center gap-2 px-4 py-2.5 bg-white" style={{ borderBottom: '1.5px solid #e8eaf0' }}>

          {/* Search */}
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#bcbccc' }} />
            <input
              type="text"
              placeholder="Search Assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-7 h-7 text-[12px] rounded-lg outline-none transition-all"
              style={{ background: '#fafafa', border: '1.5px solid #e4e4ed', color: '#1a1a2e' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; e.currentTarget.style.background = '#fff' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#e4e4ed'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#fafafa' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#bcbccc', cursor: 'pointer', lineHeight: 0, border: 'none', background: 'none', padding: 0 }}>
                <X size={11} />
              </button>
            )}
          </div>

          <div className="h-4 w-px" style={{ background: '#e4e4ed' }} />

          {/* Filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-[12px] font-medium transition-all"
              style={{
                border: (filterLevel !== "all" || filterStatus.length > 0) ? '1.5px solid rgba(37,99,235,0.35)' : '1.5px solid #e4e4ed',
                background: (filterLevel !== "all" || filterStatus.length > 0) ? 'rgba(37,99,235,0.06)' : '#fafafa',
                color: (filterLevel !== "all" || filterStatus.length > 0) ? '#2563eb' : '#8b8b9e',
                cursor: 'pointer',
              }}>
              <Filter size={12} />
              <span>Filter</span>
              {(filterLevel !== "all" || filterStatus.length > 0) && (
                <span className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: '#2563eb' }}>
                  {(filterLevel !== "all" ? 1 : 0) + filterStatus.length}
                </span>
              )}
              <ChevronDown size={11} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-1.5 w-60 rounded-xl bg-white z-50 p-3 space-y-3"
                style={{ border: '1px solid #e4e4ed', boxShadow: '0 8px 24px rgba(26,26,46,0.12)' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#8b8b9e' }}>Level</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["all", "beginner", "intermediate", "advanced", "hard", "medium"].map(level => (
                      <button key={level} onClick={() => setFilterLevel(level)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all"
                        style={filterLevel === level
                          ? { background: '#2563eb', color: '#fff', borderColor: '#2563eb', cursor: 'pointer' }
                          : { background: '#fff', color: '#6b6b7e', borderColor: '#e4e4ed', cursor: 'pointer' }}>
                        {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#8b8b9e' }}>Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { val: "active",        label: "Active" },
                      { val: "inactive",      label: "Inactive" },
                      { val: "submitted",     label: "Submitted" },
                      { val: "not-submitted", label: "Not Submitted" },
                    ].map(({ val, label }) => {
                      const selected = filterStatus.includes(val)
                      return (
                        <button key={val}
                          onClick={() => setFilterStatus(prev =>
                            selected ? prev.filter(s => s !== val) : [...prev, val]
                          )}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all"
                          style={selected
                            ? { background: '#2563eb', color: '#fff', borderColor: '#2563eb', cursor: 'pointer' }
                            : { background: '#fff', color: '#6b6b7e', borderColor: '#e4e4ed', cursor: 'pointer' }}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {(filterLevel !== "all" || filterStatus.length > 0) && (
                  <button onClick={() => { setFilterLevel("all"); setFilterStatus([]) }}
                    className="w-full py-1.5 rounded-lg text-[11px] font-medium transition-all"
                    style={{ border: '1px solid #e4e4ed', color: '#6b6b7e', background: '#fafafa', cursor: 'pointer' }}>
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Show Header — appears next to Filter when TopBar is hidden */}
          {isHeaderHidden && onShowHeader && (
            <button
              onClick={onShowHeader}
              title="Show header"
              style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #bbf7d0', background: '#f0fdf4',
                color: '#16a34a', cursor: 'pointer', transition: 'all .15s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = '#dcfce7'; el.style.borderColor = '#86efac'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = '#f0fdf4'; el.style.borderColor = '#bbf7d0'
              }}
            >
              <Eye size={13} />
            </button>
          )}

          {/* Count */}
          <span className="text-[11px] flex-shrink-0" style={{ color: '#8b8b9e' }}>
            {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Active filters chips ── */}
        {(searchQuery || filterLevel !== "all" || filterStatus.length > 0) && (
          <div className="flex-none flex flex-wrap items-center gap-2 px-4 py-1.5"
            style={{ background: 'rgba(37,99,235,0.04)', borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#2563eb' }}>Filters:</span>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-all"
                style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)', cursor: 'pointer' }}>
                "{searchQuery}" <X size={9} />
              </button>
            )}
            {filterLevel !== "all" && (
              <button onClick={() => setFilterLevel("all")}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full capitalize transition-all"
                style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)', cursor: 'pointer' }}>
                {filterLevel} <X size={9} />
              </button>
            )}
            {filterStatus.map(s => (
              <button key={s} onClick={() => setFilterStatus(prev => prev.filter(x => x !== s))}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full capitalize transition-all"
                style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)', cursor: 'pointer' }}>
                {s === 'not-submitted' ? 'Not Submitted' : s.charAt(0).toUpperCase() + s.slice(1)} <X size={9} />
              </button>
            ))}
          </div>
        )}

        {/* ── Table area ── */}
        <div ref={tableAreaRef} className="flex-1 bg-white" style={{ overflowX: 'auto' }}>
          {filteredExercises.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 p-5 rounded-2xl" style={{ background: 'rgba(37,99,235,0.05)', border: '1.5px dashed rgba(37,99,235,0.2)' }}>
                <BookOpen size={28} style={{ color: 'rgba(37,99,235,0.35)' }} />
              </div>
              <h3 className="text-[14px] font-bold mb-1" style={{ color: '#1a1a2e' }}>No exercises found</h3>
              <p className="text-[12px] max-w-xs leading-relaxed" style={{ color: '#8b8b9e' }}>
                Try adjusting your search or clearing the filters.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm table-fixed">
              <thead>
                <tr style={{ background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)', borderBottom: '2px solid #e2e8f0' }}>
                  {[
                    { label: '#',               cls: 'w-9 pl-4 pr-2' },
                    { label: 'ID',              cls: 'w-[72px] px-3' },
                    { label: 'Assignment Name', cls: 'px-3' },
                    { label: 'Start Date',      cls: 'w-[150px] pl-0 pr-2' },
                    { label: 'End Date',        cls: 'w-[150px] pl-0 pr-2' },
                    { label: 'Level',           cls: 'w-[100px] pl-0 pr-2' },
                    { label: 'Status',          cls: 'w-[85px] pl-0 pr-2 text-center' },
                    { label: 'Action',          cls: 'w-[95px] px-3 text-center' },
                  ].map(h => (
                    <th key={h.label}
                      className={`py-3 text-left select-none ${h.cls}`}
                      style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.03em', color: '#475569' }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedExercises.map((exercise, idx) => {
                  const availability = getExerciseAvailability(exercise)
                  const isGraded = exercise.isGraded !== false
                  const typeInfo = getExerciseTypeInfo(exercise)
                  const diff = getDifficultyStyle(exercise.exerciseInformation.exerciseLevel)
                  const submissionAttempts = getSubmissionAttempts(exercise)
                  const testSubmissions = getTestSubmissions(exercise, studentAnswers, method, subcategory)
                  const isCompleted = testSubmissions >= 1
                  const limitReached = testSubmissions >= submissionAttempts
                  const canRetake = isCompleted && !limitReached && availability.canStart
                  const canStart = (availability.canStart && !isCompleted) || canRetake
                  const rowNum = startIdx + idx + 1
                  const isHovered = hoveredRow === exercise._id

                  return (
                    <tr key={exercise._id}
                      style={{
                        borderBottom: '1px solid #e8edf2',
                        background: isHovered
                          ? 'linear-gradient(90deg, rgba(37,99,235,0.04) 0%, rgba(37,99,235,0.01) 100%)'
                          : '#ffffff',
                        transition: 'background 0.15s ease, box-shadow 0.15s ease',
                        boxShadow: isHovered ? 'inset 3px 0 0 #2563eb' : 'none',
                      }}
                      onMouseEnter={() => setHoveredRow(exercise._id)}
                      onMouseLeave={() => setHoveredRow(null)}>

                      {/* # */}
                      <td className="pl-4 pr-2 py-3 align-middle">
                        <span className="text-[11px] font-mono"
                          style={{ color: isHovered ? '#2563eb' : '#bcbccc', fontWeight: isHovered ? 600 : 400, transition: 'color 0.15s' }}>
                          {rowNum}
                        </span>
                      </td>

                      {/* ID */}
                      <td className="px-3 py-3 align-middle">
                        <span className="text-[11px] font-mono truncate block" style={{ color: '#8b8b9e' }}>
                          {exercise.exerciseInformation.exerciseId}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="px-3 py-3 align-middle min-w-0">
                        <div className="flex flex-col justify-center">
                          <span className="text-[12px] font-semibold truncate block"
                            title={exercise.exerciseInformation.exerciseName}
                            style={{ color: isHovered ? '#1d4ed8' : '#1a1a2e', transition: 'color 0.15s' }}>
                            {exercise.exerciseInformation.exerciseName}
                          </span>
                          {exercise.exerciseInformation.description && (
                            <span className="text-[10px] truncate block mt-0.5" style={{ color: '#8b8b9e' }}>
                              {exercise.exerciseInformation.description.replace(/<[^>]*>/g, '').substring(0, 80)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Start Date */}
                      <td className="pl-0 pr-2 py-3 align-middle">
                        <span className="text-[11px] flex items-center gap-1 whitespace-nowrap" style={{ color: '#6b7280' }}>
                          <Calendar size={10} style={{ flexShrink: 0, color: '#94a3b8' }} />
                          {exercise.availabilityPeriod?.startDate
                            ? `${new Date(exercise.availabilityPeriod.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(exercise.availabilityPeriod.startDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                            : '—'}
                        </span>
                      </td>

                      {/* End Date */}
                      <td className="pl-0 pr-2 py-3 align-middle">
                        <span className="text-[11px] flex items-center gap-1 whitespace-nowrap" style={{ color: '#6b7280' }}>
                          <Clock size={10} style={{ flexShrink: 0, color: '#94a3b8' }} />
                          {exercise.availabilityPeriod?.endDate
                            ? `${new Date(exercise.availabilityPeriod.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${new Date(exercise.availabilityPeriod.endDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                            : '—'}
                        </span>
                      </td>

                      {/* Level */}
                      <td className="pl-0 pr-2 py-3 align-middle">
                        <span className="inline-flex items-center text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full border"
                          style={{ background: diff.bg, color: diff.color, borderColor: diff.border }}>
                          {diff.label}
                        </span>
                      </td>

                      {/* Status — Active / Inactive only */}
                      <td className="pl-0 pr-2 py-3 align-middle text-center">
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                          style={availability.canStart
                            ? { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }
                            : { background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }}>
                          {availability.canStart ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3 align-middle text-center">
                        {/* Inactive: text only */}
                        {!availability.canStart ? (
                          <span className="text-[10px] font-semibold" style={{ color: isCompleted ? '#15803d' : '#94a3b8' }}>
                            {isCompleted ? 'Submitted' : 'Not Submitted'}
                          </span>
                        ) : limitReached ? (
                          /* Active, all attempts used */
                          <span className="text-[10px] font-semibold" style={{ color: '#15803d' }}>Submitted</span>
                        ) : canRetake ? (
                          /* Active, submitted, retake available */
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              onClick={e => handleStartClick(exercise, e)}
                              className="px-3 py-1 text-[11px] font-semibold rounded-lg transition-all"
                              style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '0.82' }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                              Re Submit
                            </button>
                            <span className="text-[9px] font-medium" style={{ color: '#15803d' }}>Submitted</span>
                          </div>
                        ) : (
                          /* Active, not submitted yet */
                          <button
                            onClick={e => handleStartClick(exercise, e)}
                            className="px-3 py-1 text-[11px] font-semibold rounded-lg transition-all"
                            style={isGraded
                              ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer' }
                              : { background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.82' }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                            Start
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {filteredExercises.length > 0 && (
          <div className="flex-none px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1.5px solid #e8eaf0', background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)' }}>
            <div className="text-[11px]" style={{ color: '#8b8b9e' }}>
              Showing{' '}
              <span className="font-semibold" style={{ color: '#1a1a2e' }}>{startIdx + 1}</span>
              {' '}–{' '}
              <span className="font-semibold" style={{ color: '#1a1a2e' }}>{Math.min(startIdx + ITEMS_PER_PAGE, filteredExercises.length)}</span>
              {' '}of{' '}
              <span className="font-semibold" style={{ color: '#1a1a2e' }}>{filteredExercises.length}</span>
              {' '}exercises
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="h-6 w-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ color: '#8b8b9e', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (safePage !== 1) { e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.background = 'rgba(37,99,235,0.08)' } }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent' }}>
                  <ChevronLeft size={13} />
                </button>
                <div className="flex gap-0.5">
                  {getPageNums().map((p, i) =>
                    p === '...' ? (
                      <span key={`e-${i}`} className="px-1 text-[11px] self-center" style={{ color: '#bcbccc' }}>…</span>
                    ) : (
                      <button key={p} onClick={() => setCurrentPage(p as number)}
                        className="h-6 w-6 rounded-md text-[11px] font-semibold transition-all"
                        style={safePage === p
                          ? { background: '#2563eb', color: '#fff', boxShadow: '0 2px 6px rgba(37,99,235,0.3)', cursor: 'default' }
                          : { color: '#6b6b7e', cursor: 'pointer' }}
                        onMouseEnter={e => { if (safePage !== p) { e.currentTarget.style.background = 'rgba(37,99,235,0.08)'; e.currentTarget.style.color = '#2563eb' } }}
                        onMouseLeave={e => { if (safePage !== p) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b6b7e' } }}>
                        {p}
                      </button>
                    )
                  )}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="h-6 w-6 rounded-md flex items-center justify-center transition-all disabled:opacity-30"
                  style={{ color: '#8b8b9e', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={e => { if (safePage !== totalPages) { e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.background = 'rgba(37,99,235,0.08)' } }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#8b8b9e'; e.currentTarget.style.background = 'transparent' }}>
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}