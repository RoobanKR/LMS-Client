"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Clock, Flag, AlertCircle,
  CheckCircle, LayoutList, Code2, HelpCircle, Send, X,
} from "lucide-react"

import CodeEditor from "./code-editor"
import DbQueryEditor from "./db-queryEditor"
import FrontendCompiler from "./frontendCompiler"
import MCQ from "./mcq"

// ─── EmbeddedMCQ ──────────────────────────────────────────────────────────────
// MCQ's root div is position:fixed / inset:0.  A CSS transform on a parent
// makes it the containing block for fixed descendants (CSS Transforms spec),
// so the MCQ stays inside this box instead of covering the whole viewport.
// overflow:hidden clips LoadingScreen / CompletionScreen's minHeight:100vh.
function EmbeddedMCQ(props: React.ComponentProps<typeof MCQ>) {
  return (
    <div style={{
      position: "relative",
      height: "100%",
      overflow: "hidden",
      transform: "translateZ(0)",   // traps position:fixed children
    }}>
      {/* embedded=true → MCQ skips its own per-question API saves;
          courseId is forwarded so it has it when needed               */}
      <MCQ {...props} embedded={true} />
    </div>
  )
}

// ─── Raw section shape coming from the API ────────────────────────────────────
interface RawSection {
  id?: string
  sectionId?: string
  name?: string
  sectionName?: string
  order?: number
  sectionNumber?: number
  exerciseType?: "MCQ" | "Programming" | "Combined" | "Database" | "Frontend" | string
  totalMarks?: number
  totalDuration?: number
  duration?: number
  questionCount?: number
  marksPerQuestion?: number
  mcqConfig?: any
  programmingConfig?: any
  mcqSectionMarks?: number
  [key: string]: any
}

// ─── Normalised section used internally ───────────────────────────────────────
interface NormSection {
  key: string           // primary lookup key (name, or id if no name)
  name: string          // display name
  id: string            // raw id field (may equal name)
  order: number
  exerciseType: string  // "MCQ" | "Programming" | "Combined" | …
  totalMarks: number
  totalDuration: number
  raw: RawSection       // keep original for passing to child components
}

interface TestQuestion {
  _id: string
  questionType?: string  // "mcq" | "programming" | "database" | …
  sectionId?: string
  sequence?: number
  isActive?: boolean
  [key: string]: any
}

interface SectionBasedExercise {
  _id: string
  // API may provide either an array or Record<string, RawSection>
  sectionConfigs?: RawSection[] | Record<string, RawSection>
  // Legacy field name — some exercises use this instead
  sections?: RawSection[] | Record<string, RawSection>
  exerciseInformation: {
    exerciseId: string
    exerciseName: string
    totalDuration?: number
    totalMarks?: number
    selectedLanguages?: string[]
    selectedModule?: string
    [key: string]: any
  }
  questions?: TestQuestion[]
  programmingSettings?: {
    selectedLanguages?: string[]
    selectedModule?: string
    [key: string]: any
  }
  securitySettings?: {
    shuffleQuestions?: boolean
    [key: string]: any
  }
  [key: string]: any
}

interface SectionTestPageProps {
  exercise: SectionBasedExercise
  onClose: () => void
  onSubmit: (answers: Record<string, any>) => void
  courseId?: string | number
  nodeId?: string
  category?: string
  subcategory?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rawToArray(value: RawSection[] | Record<string, RawSection> | undefined | null): RawSection[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === "object") return Object.values(value)
  return []
}

function normaliseSections(raw: RawSection[]): NormSection[] {
  return raw
    .map((s): NormSection => {
      const name = s.name || s.sectionName || s.id || s.sectionId || ""
      const id   = s.id   || s.sectionId   || name
      return {
        key:           name || id,
        name:          name,
        id:            id,
        order:         s.order ?? s.sectionNumber ?? 0,
        exerciseType:  s.exerciseType || "",
        totalMarks:    s.totalMarks ?? 0,
        totalDuration: s.totalDuration ?? s.duration ?? 0,
        raw:           s,
      }
    })
    .sort((a, b) => a.order - b.order)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SectionBasedTestPage({
  exercise,
  onClose,
  onSubmit,
  courseId: propCourseId,
  nodeId = "",
  category = "Course",
  subcategory = "Assessment",
}: SectionTestPageProps) {
  // Resolve courseId: explicit prop → field on the exercise object → ""
  const courseId = String(propCourseId ?? (exercise as any).courseId ?? "")

  // ── Normalise sections ─────────────────────────────────────────────────────
  const sections: NormSection[] = useMemo(() => {
    const rawArr = rawToArray(exercise.sectionConfigs) || rawToArray((exercise as any).sections)
    return normaliseSections(rawArr)
  }, [exercise])

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  // Per-section answers: { sectionKey: { questionId: answer } }
  const [sectionAnswers, setSectionAnswers] = useState<Record<string, Record<string, any>>>({})
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  // For Combined sections, track which sub-tab is active per section key
  const [combinedSubTab, setCombinedSubTab] = useState<Record<string, "mcq" | "programming">>({})

  // ── Current section ────────────────────────────────────────────────────────
  const currentSection = sections[activeSectionIndex]
  const currentSectionKey = currentSection?.key ?? ""
  const sectionExerciseType = (currentSection?.exerciseType ?? "Programming").toLowerCase()
  const currentAnswers = sectionAnswers[currentSectionKey] ?? {}

  // ── Pre-compute questions per section (for progress badges on tabs) ────────
  const allSectionQuestions = useMemo(() => {
    const map: Record<string, TestQuestion[]> = {}
    for (const sec of sections) {
      const type = (sec.exerciseType ?? "").toLowerCase()
      map[sec.key] = (exercise.questions ?? [])
        .filter(q => {
          if (q.isActive === false) return false
          if (q.sectionId) {
            return q.sectionId === sec.name || q.sectionId === sec.id
          }
          // Fallback: assign by matching questionType to exerciseType
          if (type === "mcq")         return q.questionType === "mcq"
          if (type === "programming") return q.questionType === "programming"
          if (type === "combined")    return q.questionType === "mcq" || q.questionType === "programming"
          if (type === "database")    return q.questionType === "database"
          if (type === "frontend")    return q.questionType === "frontend"
          return false
        })
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
    }
    return map
  }, [sections, exercise.questions])

  // Questions for the currently visible section
  const currentSectionQuestions = allSectionQuestions[currentSectionKey] ?? []

  // ── Answered count per section ────────────────────────────────────────────
  const getAnsweredCount = useCallback(
    (sectionKey: string) => {
      const answers = sectionAnswers[sectionKey] ?? {}
      return (allSectionQuestions[sectionKey] ?? []).filter(q => answers[q._id] !== undefined).length
    },
    [sectionAnswers, allSectionQuestions],
  )

  // ── Progress for current section ──────────────────────────────────────────
  const answeredCount  = getAnsweredCount(currentSectionKey)
  const totalForSection = currentSectionQuestions.length
  const sectionProgress = totalForSection > 0 ? Math.round((answeredCount / totalForSection) * 100) : 0

  // ── Answer handler ────────────────────────────────────────────────────────
  const handleAnswer = useCallback((questionId: string, answer: any) => {
    setSectionAnswers(prev => ({
      ...prev,
      [currentSectionKey]: { ...(prev[currentSectionKey] ?? {}), [questionId]: answer },
    }))
  }, [currentSectionKey])

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToSection = (idx: number) => {
    if (idx >= 0 && idx < sections.length) setActiveSectionIndex(idx)
  }

  // ── Final submit ──────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError]   = useState<string | null>(null)

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    const flatAnswers: Record<string, any> = {}
    for (const sec of sections) {
      Object.assign(flatAnswers, sectionAnswers[sec.key] ?? {})
    }

    const payload = {
      courseId,
      exerciseId:   exercise._id,
      exerciseName: exercise.exerciseInformation?.exerciseName,
      sections:     sectionAnswers,
      answers:      flatAnswers,
      nodeId,
      category,
      subcategory,
    }

    try {
      const token = localStorage.getItem("smartcliff_token") || localStorage.getItem("token") || ""
      const res = await fetch("https://lms-server-ym1q.onrender.com/courses/answers/submit-section", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || `Server error ${res.status}`)
      }

      onSubmit(payload)
      setShowSubmitConfirm(false)
    } catch (e: any) {
      setSubmitError(e?.message ?? "Submission failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Helpers for rendering ─────────────────────────────────────────────────
  const selectedLanguages: string[] =
    exercise.programmingSettings?.selectedLanguages ??
    exercise.exerciseInformation?.selectedLanguages ??
    ["Python"]

  const selectedModule: string =
    exercise.programmingSettings?.selectedModule ??
    exercise.exerciseInformation?.selectedModule ??
    ""

  const buildMcqExercise = (questions: TestQuestion[], sec: NormSection) => ({
    ...exercise,
    questions,
    exerciseInformation: exercise.exerciseInformation,
    questionConfiguration: {
      mcqQuestionConfiguration: {
        totalMcqQuestions: questions.length,
        marksPerQuestion:
          sec.raw.mcqConfig?.scoreSettings?.equalDistribution ??
          sec.raw.marksPerQuestion ??
          10,
        mcqTotalMarks:
          sec.raw.mcqSectionMarks ??
          sec.totalMarks ??
          0,
        attemptLimitEnabled: sec.raw.mcqConfig?.attemptLimitEnabled ?? false,
        submissionAttempts:  sec.raw.mcqConfig?.submissionAttempts  ?? 1,
        shuffleQuestions:    exercise.securitySettings?.shuffleQuestions ?? false,
      },
    },
  })

  const pickProgrammingComponent = () => {
    const mod  = selectedModule.toLowerCase()
    const langs = selectedLanguages.map(l => l.toLowerCase())
    if (mod === "frontend" || langs.some(l => ["html","css","javascript","typescript","react","jsx","tsx"].includes(l)))
      return FrontendCompiler
    if (mod === "database" || langs.some(l => ["sql","mysql","postgresql","mongodb"].includes(l)))
      return DbQueryEditor
    return CodeEditor
  }

  // ── Render section content ────────────────────────────────────────────────
  const renderSectionContent = () => {
    if (currentSectionQuestions.length === 0) {
      return (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:8 }}>
          <HelpCircle size={32} style={{ color:"#cbd5e1" }} />
          <p style={{ fontSize:14, color:"#94a3b8", fontWeight:500 }}>No questions in this section yet.</p>
          <p style={{ fontSize:12, color:"#cbd5e1" }}>Please contact your instructor.</p>
        </div>
      )
    }

    const type = sectionExerciseType

    // ── MCQ ────────────────────────────────────────────────────────────────
    if (type === "mcq") {
      return (
        <EmbeddedMCQ
          exercise={buildMcqExercise(currentSectionQuestions, currentSection) as any}
          courseId={courseId}
          nodeId={nodeId}
          category={category}
          subcategory={subcategory}
        />
      )
    }

    // ── Programming ────────────────────────────────────────────────────────
    if (type === "programming") {
      const ProgComp = pickProgrammingComponent()
      return (
        <ProgComp
          exercise={{ ...exercise, questions: currentSectionQuestions } as any}
        />
      )
    }

    // ── Combined ───────────────────────────────────────────────────────────
    if (type === "combined") {
      const mcqQs  = currentSectionQuestions.filter(q => q.questionType === "mcq")
      const progQs = currentSectionQuestions.filter(q => q.questionType === "programming")
      const ProgComp = pickProgrammingComponent()
      const activeSubTab = combinedSubTab[currentSectionKey] ?? "mcq"

      const tabStyle = (active: boolean, color: string) => ({
        padding: "10px 20px",
        fontWeight: 700 as const,
        fontSize: 13,
        border: "none",
        borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
        background: "transparent",
        color: active ? color : "#94a3b8",
        cursor: "pointer" as const,
        transition: "all 0.15s",
        display: "flex" as const,
        alignItems: "center" as const,
        gap: 6,
      })

      return (
        <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
          {/* Sub-tabs */}
          <div style={{ display:"flex", borderBottom:"1px solid #e2e8f0", background:"#f8fafc", padding:"0 20px", flexShrink:0 }}>
            <button
              style={tabStyle(activeSubTab === "mcq", "#7c3aed")}
              onClick={() => setCombinedSubTab(prev => ({ ...prev, [currentSectionKey]: "mcq" }))}
            >
              <HelpCircle size={13} /> MCQ
              <span style={{ fontSize:11, padding:"1px 7px", borderRadius:10, background: activeSubTab === "mcq" ? "#ede9fe" : "#f1f5f9", color: activeSubTab === "mcq" ? "#7c3aed" : "#64748b" }}>
                {mcqQs.length}
              </span>
            </button>
            <button
              style={tabStyle(activeSubTab === "programming", "#16a34a")}
              onClick={() => setCombinedSubTab(prev => ({ ...prev, [currentSectionKey]: "programming" }))}
            >
              <Code2 size={13} /> Programming
              <span style={{ fontSize:11, padding:"1px 7px", borderRadius:10, background: activeSubTab === "programming" ? "#dcfce7" : "#f1f5f9", color: activeSubTab === "programming" ? "#16a34a" : "#64748b" }}>
                {progQs.length}
              </span>
            </button>
          </div>

          {/* Sub-tab content */}
          <div style={{ flex:1, overflow:"hidden" }}>
            {activeSubTab === "mcq" ? (
              mcqQs.length > 0 ? (
                <EmbeddedMCQ exercise={buildMcqExercise(mcqQs, currentSection) as any} courseId={courseId} nodeId={nodeId} category={category} subcategory={subcategory} />
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
                  <p style={{ fontSize:14, color:"#94a3b8" }}>No MCQ questions in this section.</p>
                </div>
              )
            ) : (
              progQs.length > 0 ? (
                <ProgComp exercise={{ ...exercise, questions: progQs } as any} />
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
                  <p style={{ fontSize:14, color:"#94a3b8" }}>No programming questions in this section.</p>
                </div>
              )
            )}
          </div>
        </div>
      )
    }

    // ── Database ───────────────────────────────────────────────────────────
    if (type === "database") {
      return <DbQueryEditor exercise={{ ...exercise, questions: currentSectionQuestions } as any} />
    }

    // ── Frontend ───────────────────────────────────────────────────────────
    if (type === "frontend") {
      return <FrontendCompiler exercise={{ ...exercise, questions: currentSectionQuestions } as any} />
    }

    // ── Fallback: use CodeEditor ───────────────────────────────────────────
    return <CodeEditor exercise={{ ...exercise, questions: currentSectionQuestions } as any} />
  }

  // ── No sections ────────────────────────────────────────────────────────────
  if (sections.length === 0) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:12 }}>
        <AlertCircle size={40} style={{ color:"#94a3b8" }} />
        <p style={{ fontSize:15, color:"#64748b", fontWeight:500 }}>No sections configured for this exercise.</p>
        <button
          onClick={onClose}
          style={{ padding:"8px 20px", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:13, fontWeight:600, color:"#64748b" }}
        >
          Close
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column",
      background: "#fff",
      fontFamily: "var(--lms-font, 'Inter', sans-serif)",
    }}>

      {/* ── COMPACT HEADER ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 14px",
        borderBottom: "1px solid #e2e8f0",
        background: "#f8fafc",
        flexShrink: 0,
        gap: 10,
        minHeight: 48,
      }}>

        {/* Left: icon + title stack */}
        <div style={{ display:"flex", alignItems:"center", gap:7, minWidth:0, flex:"0 1 auto" }}>
          <LayoutList size={15} style={{ color:"#7c3aed", flexShrink:0 }} />
          <div style={{ minWidth:0 }}>
            <div style={{
              fontSize:13, fontWeight:700, color:"#0f172a",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              maxWidth: 260,
            }}>
              {exercise.exerciseInformation.exerciseName}
            </div>
            <div style={{ fontSize:10, color:"#94a3b8", marginTop:1, whiteSpace:"nowrap" }}>
              {exercise.exerciseInformation.exerciseId}
              {" · "}
              {sections.length} section{sections.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Centre: section select */}
        <div style={{ display:"flex", alignItems:"center", gap:5, flex:"0 0 auto" }}>
          <span style={{ fontSize:10, fontWeight:600, color:"#64748b", whiteSpace:"nowrap" }}>
            Section:
          </span>
          <select
            value={activeSectionIndex}
            onChange={e => goToSection(Number(e.target.value))}
            style={{
              fontSize: 12, fontWeight: 600, color: "#0f172a",
              padding: "4px 6px",
              borderRadius: 6,
              border: "1px solid #c4b5fd",
              background: "#f5f3ff",
              cursor: "pointer",
              maxWidth: 200,
              outline: "none",
            }}
          >
            {sections.map((sec, idx) => {
              const answered = getAnsweredCount(sec.key)
              const total    = (allSectionQuestions[sec.key] ?? []).length
              const typeTag  = sec.exerciseType ? ` [${sec.exerciseType}]` : ""
              const progTag  = total > 0 ? ` · ${answered}/${total}` : ""
              return (
                <option key={sec.key} value={idx}>
                  {idx + 1}. {sec.name || `Section ${idx + 1}`}{typeTag}{progTag}
                </option>
              )
            })}
          </select>
        </div>

        {/* Right: progress pill + timer + submit + exit */}
        <div style={{ display:"flex", alignItems:"center", gap:6, flex:"0 0 auto" }}>

          {/* answered / total pill */}
          {totalForSection > 0 && (
            <span style={{
              fontSize:10, fontWeight:700,
              padding:"2px 7px", borderRadius:10,
              background: answeredCount === totalForSection ? "#dcfce7" : "#f1f5f9",
              color:       answeredCount === totalForSection ? "#16a34a" : "#64748b",
              border:      `1px solid ${answeredCount === totalForSection ? "#bbf7d0" : "#e2e8f0"}`,
              whiteSpace: "nowrap",
            }}>
              {answeredCount}/{totalForSection}
            </span>
          )}

          {/* Timer */}
          <div style={{
            display:"flex", alignItems:"center", gap:4,
            padding:"3px 8px", borderRadius:6,
            background:"#fef9c3", border:"1px solid #fde68a",
          }}>
            <Clock size={11} style={{ color:"#a16207" }} />
            <span style={{ fontSize:11, fontWeight:700, color:"#a16207", fontFamily:"monospace" }}>
              {currentSection?.totalDuration || exercise.exerciseInformation?.totalDuration || 60}:00
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={() => setShowSubmitConfirm(true)}
            style={{
              display:"flex", alignItems:"center", gap:4,
              padding:"4px 10px", borderRadius:6,
              border:"none", background:"#16a34a", color:"#fff",
              cursor:"pointer", fontSize:11, fontWeight:700,
              whiteSpace:"nowrap",
            }}
          >
            <Send size={11} /> Submit
          </button>

          {/* Exit */}
          <button
            onClick={onClose}
            style={{
              display:"flex", alignItems:"center", gap:3,
              padding:"4px 8px", borderRadius:6,
              border:"1px solid #e2e8f0", background:"#fff",
              cursor:"pointer", fontSize:11, fontWeight:600, color:"#64748b",
            }}
          >
            <X size={11} /> Exit
          </button>
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ height:3, background:"#e2e8f0", flexShrink:0 }}>
        <div style={{
          height:"100%", background:"#7c3aed",
          width:`${sectionProgress}%`,
          transition:"width 0.3s ease",
          borderRadius:"0 2px 2px 0",
        }} />
      </div>

      {/* ── SECTION CONTENT (max space) ── */}
      <div style={{ flex:1, overflow:"hidden" }}>
        {renderSectionContent()}
      </div>

      {/* ── SUBMIT CONFIRMATION MODAL ── */}
      {showSubmitConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(15,23,42,0.5)", backdropFilter: "blur(2px)",
        }}>
          <div style={{
            background: "#fff", borderRadius:12, padding:"24px 28px",
            maxWidth:440, width:"90%",
            boxShadow:"0 20px 50px rgba(0,0,0,0.15)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"#fef9c3", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <AlertCircle size={18} style={{ color:"#a16207" }} />
              </div>
              <h3 style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:0 }}>Submit Assessment?</h3>
            </div>

            <p style={{ fontSize:13, color:"#475569", marginBottom:14, lineHeight:1.6 }}>
              Once submitted you cannot change your answers. Review your progress below:
            </p>

            {/* Per-section summary */}
            <div style={{ marginBottom:18, display:"flex", flexDirection:"column", gap:6 }}>
              {sections.map(sec => {
                const answered = getAnsweredCount(sec.key)
                const total    = (allSectionQuestions[sec.key] ?? []).length
                const done     = total > 0 && answered === total
                return (
                  <div key={sec.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderRadius:8, background:"#f8fafc", border:"1px solid #e2e8f0" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {done
                        ? <CheckCircle size={14} style={{ color:"#16a34a" }} />
                        : <Flag size={14} style={{ color:"#f59e0b" }} />
                      }
                      <span style={{ fontSize:13, fontWeight:600, color: done ? "#15803d" : "#0f172a" }}>
                        {sec.name}
                      </span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color: done ? "#16a34a" : "#f59e0b" }}>
                      {answered}/{total} answered
                    </span>
                  </div>
                )
              })}
            </div>

            {submitError && (
              <div style={{ marginBottom:12, padding:"8px 12px", borderRadius:8, background:"#fef2f2", border:"1px solid #fecaca", fontSize:12, color:"#b91c1c", fontWeight:600 }}>
                {submitError}
              </div>
            )}

            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => { setShowSubmitConfirm(false); setSubmitError(null) }}
                disabled={isSubmitting}
                style={{ flex:1, padding:"10px 0", borderRadius:8, border:"1px solid #e2e8f0", background:"#fff", cursor: isSubmitting ? "not-allowed" : "pointer", fontSize:13, fontWeight:600, color:"#64748b", opacity: isSubmitting ? 0.6 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                style={{ flex:1, padding:"10px 0", borderRadius:8, border:"none", background: isSubmitting ? "#86efac" : "#16a34a", color:"#fff", cursor: isSubmitting ? "not-allowed" : "pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
              >
                {isSubmitting
                  ? <><span style={{ width:13, height:13, border:"2px solid #fff", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin .6s linear infinite" }} /> Submitting…</>
                  : <><Send size={13} /> Confirm Submit</>
                }
              </button>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>
      )}
    </div>
  )
}
