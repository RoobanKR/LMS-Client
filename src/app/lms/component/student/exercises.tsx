"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import ReactDOM from "react-dom"
import {
  Clock, AlertCircle, X, Play, Zap, Trophy, Star,
  CheckSquare, Code2, Layers, HelpCircle, BookOpen,
  Calendar, Hourglass, Lock, CheckCircle, Code,
  Info, Target, Settings, FileText, BarChart2, Shield, Cpu,
  Search, Filter, ChevronDown
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
}

function StartExercisePopup({
  exercise, onConfirm, onClose, availability,
  hasAttempted, limitReached, testSubmissions, submissionAttempts, isRetake,
}: PopupProps) {
  const ex = exercise as any
  const diff = getDifficultyStyle(exercise.exerciseInformation.exerciseLevel)
  const typeInfo = getExerciseTypeInfo(exercise)
  const totalQ = getTotalQuestions(exercise)
  const isPractice = exercise.evaluationSettings?.practiceMode
  const breakdown = getDifficultyBreakdown(exercise)
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
  const scoreSettings = isGraded ? progCfg?.scoreSettings : null
  const levelBasedCounts = progCfg?.levelBasedCounts ?? null

  const markingRows: Array<{ level: string; marks: number | null; count: number; isQSpecific: boolean }> = []
  if (isGraded && scoreSettings?.scoreType === 'levelBasedMarks') {
    const lsc = scoreSettings.levelScoringConfiguration
    const lbm = scoreSettings.levelBasedMarks;
    (['easy', 'medium', 'hard'] as const).forEach(lvl => {
      const cfg = lsc?.[lvl]
      const mpq = cfg?.marksPerQuestion ?? lbm?.[lvl]
      const count = cfg?.questionCount ?? levelBasedCounts?.[lvl] ?? 0
      markingRows.push({ level: lvl, marks: mpq ?? null, count, isQSpecific: cfg?.type === 'question_specific' })
    })
  }

  const evenMarks: number | null =
    isGraded && scoreSettings?.scoreType === 'evenMarks' && scoreSettings?.evenMarks > 0
      ? scoreSettings.evenMarks : null

  const allowCodeExecution = progCfg?.allowCodeExecution ?? false
  const showSampleCases = progCfg?.showSampleCases ?? false
  const questionFlow = progCfg?.questionFlow ?? null
  const shuffleQuestions = exercise.questionBehavior?.shuffleQuestions ?? false

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

  const R = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <tr>
      <td style={{ padding: '5px 0', fontSize: 12, color: '#64748b', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap', paddingRight: 8 }}>{label}</td>
      <td style={{ padding: '5px 0', fontSize: 12, fontWeight: 600, color: '#0f172a', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>{value}</td>
    </tr>
  )

  const SecLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
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
          width: '100%', maxWidth: 600,
          borderRadius: 14, background: '#ffffff',
          boxShadow: '0 20px 50px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)',
          animation: 'popIn .22s cubic-bezier(.34,1.56,.64,1)',
          // ── KEY FIX: fixed height so inner flex children can scroll ──
          height: '90vh',
          maxHeight: 560,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, borderRadius: '14px 14px 0 0', flexShrink: 0, background: isGraded ? '#2563eb' : '#0891b2' }} />

        {/* ── COMPACT HEADER — flexShrink:0 so it never compresses ── */}
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: diff.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            {diff.emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {exercise.exerciseInformation.exerciseName}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: typeInfo.bg, color: typeInfo.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                {typeInfo.icon}{typeInfo.label}
              </span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: diff.bg, color: diff.color, fontWeight: 700 }}>
                {diff.label}
              </span>
              {isGraded
                ? <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#fdf4ff', color: '#7c3aed', fontWeight: 700 }}>Graded</span>
                : <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#ecfeff', color: '#0891b2', fontWeight: 700 }}>Non-Graded</span>
              }
              {isPractice && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#fef9c3', color: '#854d0e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}><Zap className="w-2 h-2" />Practice</span>}
              {limitReached && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#f0fdf4', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}><CheckCircle className="w-2 h-2" />Completed</span>}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 24, height: 24, borderRadius: '50%', border: '1px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* ── SCROLLABLE BODY — flex:1 + minHeight:0 is the scroll fix ── */}
        <div style={{
          flex: 1,
          minHeight: 0,          // ← critical: without this flex children don't shrink
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 190px',
          alignItems: 'start',   // ← so columns don't stretch to equal height
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
        }}>

          {/* LEFT — Questions / Difficulty / Marks */}
          <div style={{ padding: '14px 16px', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <SecLabel>Questions</SecLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <R label="Total questions" value={totalQ || '—'} />
                  <R label="Duration" value={duration ? formatDuration(duration) : '—'} />
                  {shuffleQuestions && <R label="Shuffle" value="Yes" />}
                  {questionFlow && <R label="Flow" value={questionFlow === 'freeFlow' ? 'Free flow' : questionFlow} />}
                  {allowCodeExecution && <R label="Code execution" value={<span style={{ color: '#059669' }}>Allowed</span>} />}
                  {showSampleCases && <R label="Sample cases" value={<span style={{ color: '#059669' }}>Visible</span>} />}
                </tbody>
              </table>
            </div>

            {breakdown && (breakdown.easy > 0 || breakdown.medium > 0 || breakdown.hard > 0) && (
              <div>
                <SecLabel>Difficulty</SecLabel>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {breakdown.easy > 0 && <R label="Easy questions" value={<span style={{ color: '#059669' }}>{breakdown.easy}</span>} />}
                    {breakdown.medium > 0 && <R label="Medium questions" value={<span style={{ color: '#d97706' }}>{breakdown.medium}</span>} />}
                    {breakdown.hard > 0 && <R label="Hard questions" value={<span style={{ color: '#dc2626' }}>{breakdown.hard}</span>} />}
                  </tbody>
                </table>
              </div>
            )}

            {isGraded && (
              <div>
                <SecLabel>Marks</SecLabel>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <R label="Total marks" value={totalMarks ?? '—'} />
                    <R label="Pass mark" value={passMark ?? '—'} />
                    <R label="Attempts used" value={`${testSubmissions ?? 0} / ${submissionAttempts ?? 1}`} />
                    {evenMarks != null && <R label="Per question" value={evenMarks} />}
                    {markingRows.filter(r => r.count > 0).map(r => (
                      <R
                        key={r.level}
                        label={`${r.level.charAt(0).toUpperCase() + r.level.slice(1)} (${r.count}q)`}
                        value={r.isQSpecific ? 'Varies' : (r.marks != null ? `${r.marks} each` : '—')}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!isGraded && (
              <div style={{ fontSize: 12, color: '#0e7490', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 }}>
                No marks assigned — focus on learning at your own pace.
                {isPractice && ' Unlimited attempts in practice mode.'}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <SecLabel>Schedule</SecLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <R label="Opens" value={<span style={{ fontSize: 11 }}>{exercise.availabilityPeriod?.startDate ? formatDateTime(exercise.availabilityPeriod.startDate) : '—'}</span>} />
                  <R label="Closes" value={<span style={{ fontSize: 11 }}>{exercise.availabilityPeriod?.endDate ? formatDateTime(exercise.availabilityPeriod.endDate) : '—'}</span>} />
                  {exercise.availabilityPeriod?.gracePeriodAllowed && exercise.availabilityPeriod?.gracePeriodDate && (
                    <R label="Grace" value={<span style={{ fontSize: 11 }}>{formatDateTime(exercise.availabilityPeriod.gracePeriodDate)}</span>} />
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <SecLabel>Details</SecLabel>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
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
                  {/* <R label="Max attempts" value={
                    (submissionAttempts ?? 1) > 1
                      ? `${submissionAttempts} (${testSubmissions ?? 0} used)`
                      : 'Unlimited'
                  } /> */}
                  <R label="Type" value={typeInfo.label} />
                  <R label="Level" value={<span style={{ color: diff.color, textTransform: 'capitalize' }}>{exercise.exerciseInformation.exerciseLevel}</span>} />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── FOOTER — flexShrink:0 so it stays pinned at bottom ── */}
        <div style={{
          padding: '10px 14px 14px',
          borderTop: '1px solid #f1f5f9',
          background: '#fafafa',
          borderRadius: '0 0 14px 14px',
          flexShrink: 0,
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
  studentAnswers,
}: ExercisesProps) {
  const router = useRouter()
  const filterRef = useRef<HTMLDivElement>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null)
  const [popupExercise, setPopupExercise] = useState<{ exercise: Exercise; isRetake?: boolean } | null>(null)
  const [resumeModalExercise, setResumeModalExercise] = useState<Exercise | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' } | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filterLevel, setFilterLevel] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

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

        if (filterStatus === "completed") return isCompleted
        if (filterStatus === "available") return availability.canStart && !isCompleted
        if (filterStatus === "retake") return isCompleted && !limitReached && availability.canStart
        if (filterStatus === "expired") return availability.status === "expired"
        if (filterStatus === "upcoming") return availability.status === "upcoming"
        return true
      })
    }
    
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },
  [exercises, searchQuery, filterLevel, filterStatus, studentAnswers, method, subcategory]
)

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

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!filteredExercises || filteredExercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center min-h-[300px] rounded-xl bg-white border border-gray-200">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-blue-50 border border-blue-200">
          <BookOpen className="w-6 h-6 text-blue-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">No Exercissssses Yet</h3>
        <p className="text-sm text-gray-500 max-w-xs">Exercises for this section haven't been added yet.</p>
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

      {/* Exercise Cards Grid */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-base font-bold text-gray-900">Exercises ({filteredExercises.length})</h3>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-2 mb-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                <X size={12} className="text-gray-500" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white flex items-center gap-2 text-sm font-medium hover:bg-gray-50"
            >
              <Filter size={14} />
              <span>Filter</span>
              {(filterLevel !== "all" || filterStatus !== "all") && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {(filterLevel !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0)}
                </span>
              )}
              <ChevronDown size={12} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Dropdown */}
            {showFilterDropdown && (
              <div className="absolute top-full right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-50 p-4">
                {/* Level Filter */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-700 mb-2 block">Level</label>
                  <div className="flex flex-wrap gap-2">
                    {["all", "beginner", "intermediate", "advanced", "hard", "medium"].map(level => (
                      <button
                        key={level}
                        onClick={() => setFilterLevel(level)}
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${
                          filterLevel === level
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-2 block">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {["all", "available", "completed", "retake", "expired", "upcoming"].map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${
                          filterStatus === status
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {(filterLevel !== "all" || filterStatus !== "all") && (
                  <button
                    onClick={() => { setFilterLevel("all"); setFilterStatus("all") }}
                    className="w-full mt-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Simple List */}
        <div
          className="exercises-scroll flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#94a3b8 #f1f5f9' }}
        >
          <style>{`
            .exercises-scroll::-webkit-scrollbar { width: 6px; }
            .exercises-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }
            .exercises-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
            .exercises-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
          `}</style>
          
          {/* Column Headers */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg border-b border-gray-200 text-[11px] font-semibold text-gray-600 sticky top-0 z-10">
            <div className="flex-[0.5] text-center">#</div>
            <div className="flex-[1.5] text-center">ID</div>
            <div className="flex-[2] text-left">Exercise Name</div>
            <div className="flex-1 text-center">Level</div>
            <div className="flex-1 text-center">Start Date</div>
            <div className="flex-1 text-center">End Date</div>
            <div className="flex-1 text-center">Status</div>
            <div className="flex-1 text-center">Action</div>
          </div>

          <div className="space-y-1">
            {filteredExercises.map((exercise, index) => {
              const availability = getExerciseAvailability(exercise)
              const attempted = hasExerciseBeenAttempted(exercise, studentAnswers, method, subcategory)
              const totalQ = getTotalQuestions(exercise)
              const isPractice = exercise.evaluationSettings?.practiceMode
              const isGraded = exercise.isGraded !== false

              const submissionAttempts = getSubmissionAttempts(exercise)
              const testSubmissions = getTestSubmissions(exercise, studentAnswers, method, subcategory)
              // ── Once Submit Exercise is clicked, badge always shows "Completed".
              //    Retake stays available while testSubmissions < submissionAttempts.
              const isCompleted = testSubmissions >= 1
              const limitReached = testSubmissions >= submissionAttempts
              const canRetake = isCompleted && !limitReached && availability.canStart
              const canStart = (availability.canStart && !isCompleted) || canRetake

              return (
                <div
                  key={exercise._id}
                  className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {/* Number */}
                  <div className="flex-[0.5] flex justify-center">
                    <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                  </div>

                  {/* ID */}
                  <span className="flex-[1.5] text-xs font-medium text-gray-500 text-center truncate">
                    {exercise.exerciseInformation.exerciseId}
                  </span>

                  {/* Name */}
                  <h4 className="flex-[2] font-medium text-sm text-gray-900 truncate text-left">
                    {exercise.exerciseInformation.exerciseName}
                  </h4>

                  {/* Level Badge */}
                  <div className="flex-1 flex justify-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      exercise.exerciseInformation.exerciseLevel === 'beginner' ? 'bg-green-50 text-green-600 border-green-200'
                      : exercise.exerciseInformation.exerciseLevel === 'intermediate' ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : exercise.exerciseInformation.exerciseLevel === 'advanced' ? 'bg-purple-50 text-purple-600 border-purple-200'
                      : exercise.exerciseInformation.exerciseLevel === 'hard' ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {exercise.exerciseInformation.exerciseLevel.charAt(0).toUpperCase() + exercise.exerciseInformation.exerciseLevel.slice(1)}
                    </span>
                  </div>

                  {/* Start Date */}
                  <div className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500">
                    <Calendar size={11} />
                    <span className="truncate">{exercise.availabilityPeriod?.startDate ? new Date(exercise.availabilityPeriod.startDate).toLocaleDateString() : 'N/A'}</span>
                  </div>

                  {/* End Date */}
                  <div className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-500">
                    <Clock size={11} />
                    <span className="truncate">{exercise.availabilityPeriod?.endDate ? new Date(exercise.availabilityPeriod.endDate).toLocaleDateString() : 'N/A'}</span>
                  </div>

                  {/* Status Badge — Completed once submitted (regardless of retake availability) */}
                  <div className="flex-1 flex justify-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : availability.status === 'expired' ? 'bg-red-50 text-red-600 border-red-200'
                      : availability.status === 'late-attempt' ? 'bg-orange-50 text-orange-700 border-orange-300'
                      : availability.status === 'grace-period' ? 'bg-orange-50 text-orange-600 border-orange-200'
                      : availability.status === 'upcoming' ? 'bg-gray-100 text-gray-600 border-gray-200'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      {isCompleted ? 'Completed'
                      : availability.status === 'expired' ? 'Expired'
                      : availability.status === 'late-attempt' ? 'Late'
                      : availability.status === 'grace-period' ? 'Grace'
                      : availability.status === 'upcoming' ? 'Soon'
                      : 'Ready'}
                    </span>
                  </div>

                  {/* Action Button */}
                  <div className="flex-1 flex justify-center">
                    <button
                      onClick={e => handleStartClick(exercise, e)}
                      disabled={!canStart}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        !canStart
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : canRetake
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : availability.status === 'late-attempt'
                              ? 'bg-orange-500 text-white hover:bg-orange-600'
                              : availability.status === 'grace-period'
                                ? 'bg-orange-500 text-white hover:bg-orange-600'
                                : isGraded
                                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                                  : 'bg-cyan-500 text-white hover:bg-cyan-600'
                      }`}
                    >
                      {canRetake ? 'Retake'
                      : limitReached ? 'View'
                      : !availability.canStart ? 'Locked'
                      : availability.status === 'late-attempt' ? 'Start Late Attempt'
                      : 'Start'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}