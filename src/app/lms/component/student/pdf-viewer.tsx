"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  X, Download, ZoomIn, ZoomOut, Maximize, Minimize,
  FileText, HelpCircle, Check, ChevronRight, ChevronLeft,
  Sparkles, MessageCircle, Menu, Settings, BookOpen
} from "lucide-react"
import NotesPanel from "./notes-panel"
import SummaryChat from "./summary-chat"
import AIChat from "./ai-chat"

// ─── MCQ DISPLAY OVERLAY — student interactive quiz (mirrors video player) ─────
function MCQDisplayOverlay({
  questions,
  pageNumber,
  onResume,
  onDismiss,
}: {
  questions: any[]
  pageNumber: number
  onResume: () => void
  onDismiss: () => void
}) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [allDone, setAllDone] = useState(false)

  // Extract fields from the current question
  const { questionTitle, options, explanation } = React.useMemo(() => {
    const q = questions[currentIdx]
    if (!q) return { questionTitle: "", options: [], explanation: "" }

    const inner = q.mcqQuestion || q
    const title = (inner.questionTitle || inner.mcqQuestionTitle || inner.title || "")
      .replace(/<[^>]*>/g, "").trim()
    const expl = inner.explanation || inner.mcqQuestionDescription || ""
    const raw: any[] = inner.options || inner.mcqQuestionOptions || []

    const opts = raw.map((opt: any) => {
      if (typeof opt.text === "string") return opt
      const chars = Object.entries(opt)
        .filter(([k]) => !isNaN(Number(k)))
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, v]) => v as string)
        .join("")
      return { ...opt, text: chars }
    })

    return { questionTitle: title, options: opts, explanation: expl }
  }, [questions, currentIdx])

  const isCorrect = submitted && selectedOption !== null && options[selectedOption]?.isCorrect

  const handleSubmit = () => {
    if (selectedOption === null) return
    if (options[selectedOption]?.isCorrect) setScore(s => s + 1)
    setSubmitted(true)
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
      setSelectedOption(null)
      setSubmitted(false)
    } else {
      setAllDone(true)
    }
  }

  if (!questions[currentIdx] && !allDone) return null

  // ── All done screen ────────────────────────────────────────────────────────
  if (allDone) {
    const pct = Math.round((score / questions.length) * 100)
    const passed = pct >= 60
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 100,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(6px)",
      }}>
        <div style={{
          backgroundColor: "white", borderRadius: "20px",
          width: "min(420px, 92vw)", padding: "40px 32px",
          textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 20px",
            backgroundColor: passed ? "#ecfdf5" : "#fef2f2",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
          }}>
            {passed ? "🎉" : "📚"}
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "#111827" }}>
            {passed ? "Great job!" : "Keep studying!"}
          </h2>
          <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px" }}>
            Page {pageNumber} · {score} of {questions.length} correct
          </p>
          <div style={{ width: "100%", height: 10, backgroundColor: "#f3f4f6", borderRadius: "999px", marginBottom: 24, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "999px", width: `${pct}%`, backgroundColor: passed ? "#10b981" : "#f59e0b", transition: "width 0.6s ease" }} />
          </div>
          <p style={{ margin: "0 0 28px", fontSize: "28px", fontWeight: 900, color: passed ? "#059669" : "#d97706" }}>{pct}%</p>
          <button onClick={onResume} style={{
            width: "100%", padding: "14px", borderRadius: "12px",
            backgroundColor: "#7c3aed", color: "white", border: "none",
            fontSize: "15px", fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
          }}>
            Continue Reading →
          </button>
        </div>
      </div>
    )
  }

  // ── Question screen ────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 100,
      backgroundColor: "rgba(0,0,0,0.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(5px)",
    }}>
      <div style={{
        backgroundColor: "white", borderRadius: "20px",
        width: "min(540px, 94vw)", maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        overflow: "hidden",
        animation: "mcqSlideIn 0.25s ease-out",
      }}>
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          color: "white", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HelpCircle size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>Quiz · Page {pageNumber}</p>
              <p style={{ margin: 0, fontSize: "11px", opacity: 0.75 }}>Question {currentIdx + 1} of {questions.length}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 5, alignItems: "center", flex: 1, justifyContent: "center" }}>
            {questions.map((_, i) => (
              <div key={i} style={{
                width: i === currentIdx ? 20 : 7, height: 7, borderRadius: "999px",
                backgroundColor: i < currentIdx ? "rgba(255,255,255,0.9)" : i === currentIdx ? "white" : "rgba(255,255,255,0.35)",
                transition: "all 0.25s",
              }} />
            ))}
          </div>

          <button onClick={onDismiss} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px",
            color: "white", cursor: "pointer", padding: "6px 10px",
            fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
          }}>
            Skip <X size={12} />
          </button>
        </div>

        <div style={{ height: 3, backgroundColor: "#f3f4f6", flexShrink: 0 }}>
          <div style={{ height: "100%", width: `${(currentIdx / questions.length) * 100}%`, backgroundColor: "#7c3aed", transition: "width 0.3s ease" }} />
        </div>

        <div style={{ overflowY: "auto", padding: "24px 24px 0", flex: 1 }}>
          <p style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 700, color: "#111827", lineHeight: 1.55 }}>
            {questionTitle || "Untitled question"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {options.map((opt: any, oi: number) => {
              let bg = "white", border = "1.5px solid #e5e7eb", color = "#374151"
              let labelBg = "#f3f4f6", labelColor = "#6b7280"

              if (submitted) {
                if (opt.isCorrect) {
                  bg = "#ecfdf5"; border = "1.5px solid #6ee7b7"; color = "#065f46"
                  labelBg = "#10b981"; labelColor = "white"
                } else if (oi === selectedOption) {
                  bg = "#fef2f2"; border = "1.5px solid #fca5a5"; color = "#991b1b"
                  labelBg = "#ef4444"; labelColor = "white"
                }
              } else if (oi === selectedOption) {
                bg = "#f5f3ff"; border = "1.5px solid #7c3aed"; color = "#4c1d95"
                labelBg = "#7c3aed"; labelColor = "white"
              }

              return (
                <button key={oi} disabled={submitted} onClick={() => setSelectedOption(oi)} style={{
                  width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: "12px",
                  backgroundColor: bg, border, color, cursor: submitted ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "all 0.15s ease", outline: "none",
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%", backgroundColor: labelBg, color: labelColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700, flexShrink: 0, transition: "all 0.15s",
                  }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: oi === selectedOption ? 600 : 400, flex: 1 }}>
                    {opt.text || (opt.imageUrl
                      ? <img src={opt.imageUrl} alt="" style={{ maxWidth: 120, borderRadius: 6 }} />
                      : "(empty)")}
                  </span>
                  {submitted && opt.isCorrect && <Check size={16} style={{ color: "#10b981", flexShrink: 0 }} />}
                  {submitted && oi === selectedOption && !opt.isCorrect && <X size={16} style={{ color: "#ef4444", flexShrink: 0 }} />}
                </button>
              )
            })}
          </div>

          {submitted && explanation && (
            <div style={{ margin: "16px 0 0", padding: "12px 14px", backgroundColor: "#fffbeb", borderRadius: "10px", border: "1px solid #fde68a", display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
              <p style={{ margin: 0, fontSize: "12px", color: "#92400e", lineHeight: 1.55 }}>{explanation}</p>
            </div>
          )}

          {submitted && (
            <div style={{ margin: "14px 0 0", padding: "10px 14px", borderRadius: "10px", backgroundColor: isCorrect ? "#ecfdf5" : "#fef2f2", border: `1px solid ${isCorrect ? "#a7f3d0" : "#fecaca"}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{isCorrect ? "✅" : "❌"}</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: isCorrect ? "#065f46" : "#991b1b" }}>
                {isCorrect ? "Correct! Well done." : "Incorrect — check the highlighted answer above."}
              </span>
            </div>
          )}

          <div style={{ height: 20 }} />
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, backgroundColor: "#fafafa" }}>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Score: {score}/{currentIdx + (submitted ? 1 : 0)}</span>
          {!submitted ? (
            <button onClick={handleSubmit} disabled={selectedOption === null} style={{
              padding: "10px 28px", borderRadius: "10px",
              backgroundColor: selectedOption !== null ? "#7c3aed" : "#e5e7eb",
              color: selectedOption !== null ? "white" : "#9ca3af",
              border: "none", fontSize: "13px", fontWeight: 700,
              cursor: selectedOption !== null ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              boxShadow: selectedOption !== null ? "0 4px 12px rgba(124,58,237,0.3)" : "none",
            }}>
              Submit Answer
            </button>
          ) : (
            <button onClick={handleNext} style={{
              padding: "10px 28px", borderRadius: "10px",
              backgroundColor: "#7c3aed", color: "white",
              border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
            }}>
              {currentIdx < questions.length - 1 ? "Next Question →" : "See Results →"}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes mcqSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── PDF VIEWER PROPS ──────────────────────────────────────────────────────────
interface PDFViewerProps {
  fileUrl: string | { base: string }
  fileName: string
  fileId?: string
  entityType?: string
  entityId?: string
  tabType?: string
  subcategory?: string
  folderPath?: string[]
  apiBaseUrl?: string
  onClose: () => void
  initialMcqs?: any[]
  
  // AI feature flags from resourcesType
  aiChatEnabled?: boolean
  aiSummaryEnabled?: boolean
  
  // Notes feature flag from resourcesType
  notesEnabled?: boolean
  
  hierarchy?: string[]
  currentItemTitle?: string
  onNotesClick?: () => void
  showNotesPanel?: boolean
  onNotesStateChange?: (isOpen: boolean) => void
}

// ─── SINGLE PAGE CANVAS ───────────────────────────────────────────────────────
function PdfPageCanvas({
  pdfDoc, pageNum, scale,
}: { pdfDoc: any; pageNum: number; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const taskRef = useRef<any>(null)

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let cancelled = false
    ;(async () => {
      if (taskRef.current) { try { taskRef.current.cancel() } catch {} taskRef.current = null }
      try {
        const page = await pdfDoc.getPage(pageNum)
        if (cancelled) return
        const vp = page.getViewport({ scale })
        const canvas = canvasRef.current!
        canvas.width = vp.width
        canvas.height = vp.height
        const task = page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp })
        taskRef.current = task
        await task.promise
      } catch (e: any) {
        if (e?.name !== "RenderingCancelledException") console.error("page render error", e)
      }
    })()
    return () => { cancelled = true }
  }, [pdfDoc, pageNum, scale])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", boxShadow: "0 2px 16px rgba(0,0,0,0.4)", borderRadius: 3, maxWidth: "100%" }}
    />
  )
}

// ─── PDF VIEWER ────────────────────────────────────────────────────────────────
export default function PDFViewer({
  fileUrl,
  fileName,
  onClose,
  initialMcqs = [],
  aiChatEnabled = false,
  aiSummaryEnabled = false,
  notesEnabled = false,
  hierarchy = [],
  currentItemTitle = "",
  onNotesClick,
  showNotesPanel = false,
  onNotesStateChange,
}: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.4)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Panel states
  const [showAISubmenu, setShowAISubmenu] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [splitPosition, setSplitPosition] = useState(60)
  const [shouldLoadSavedNote, setShouldLoadSavedNote] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  const isResizingRef = useRef(false)

  // Determine which AI features are enabled
  const showAIButton = aiChatEnabled || aiSummaryEnabled
  const showAIChatOption = aiChatEnabled
  const showAISummaryOption = aiSummaryEnabled
  const showNotesButton = notesEnabled

  // Debug: Log feature flags
  useEffect(() => {
    console.log("PDFViewer - Feature Flags:", {
      aiChatEnabled,
      aiSummaryEnabled,
      notesEnabled,
      showAIButton,
      showAIChatOption,
      showAISummaryOption,
      showNotesButton
    });
  }, [aiChatEnabled, aiSummaryEnabled, notesEnabled]);

  // ── MCQ — videoTimestamp is used as the page number ──────────────────────
  const mcqQuestions = React.useMemo(
    () => (initialMcqs || []).filter((q: any) => q.isActive !== false),
    []
  )
  const getMcqPage = (q: any): number => {
    const raw = q.videoTimestamp ?? q.pageNumber ?? q.timestamp ?? 0
    return typeof raw === "number" ? Math.round(raw) : parseInt(String(raw)) || 0
  }
  const pagesWithMcqs = new Set(mcqQuestions.map((q: any) => getMcqPage(q)))

  const [activeMcqGroup, setActiveMcqGroup] = useState<{ page: number; questions: any[] } | null>(null)
  const triggeredPages = useRef<Set<number>>(new Set())

  // ─── Normalize URL ─────────────────────────────────────────────────────────
  const normalizedUrl = React.useMemo(() => {
    if (!fileUrl) return ""
    if (typeof fileUrl === "string") return fileUrl
    if (typeof fileUrl === "object" && (fileUrl as any).base) return (fileUrl as any).base
    if (typeof fileUrl === "object") {
      return (Object.values(fileUrl).find(v => typeof v === "string" && (v as string).startsWith("http")) as string) || ""
    }
    return ""
  }, [fileUrl])

  // ─── Load pdf.js + document ────────────────────────────────────────────────
  useEffect(() => {
    if (!normalizedUrl) return
    let cancelled = false
    setIsLoading(true); setLoadError(null); setPdfDoc(null); setTotalPages(0)

    const load = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement("script")
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
            s.onload = () => res()
            s.onerror = () => rej(new Error("pdf.js CDN unavailable"))
            document.head.appendChild(s)
          })
        }
        const lib = (window as any).pdfjsLib
        lib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        const doc = await lib.getDocument({ url: normalizedUrl, withCredentials: false }).promise
        if (cancelled) return
        setPdfDoc(doc)
        setTotalPages(doc.numPages)
        setCurrentPage(1)
        pageRefs.current = new Array(doc.numPages).fill(null)
        setIsLoading(false)
      } catch (e: any) {
        if (!cancelled) { setLoadError(e?.message || "Failed to load"); setIsLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [normalizedUrl])

  // ─── IntersectionObserver — detect which page is most visible ─────────────
  useEffect(() => {
    if (!pdfDoc || totalPages === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        let best = entries[0]
        entries.forEach(e => { if (e.intersectionRatio > (best?.intersectionRatio ?? 0)) best = e })
        if (best?.isIntersecting) {
          const pg = parseInt((best.target as HTMLElement).dataset.page || "1")
          if (!isNaN(pg)) setCurrentPage(pg)
        }
      },
      { root: scrollRef.current, threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
    )
    pageRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [pdfDoc, totalPages, scale])

  // ─── MCQ TRIGGER — fires when currentPage changes, exactly like video ──────
  useEffect(() => {
    if (activeMcqGroup) return
    const pageQuestions = mcqQuestions.filter(q => getMcqPage(q) === currentPage)
    if (pageQuestions.length > 0 && !triggeredPages.current.has(currentPage)) {
      triggeredPages.current.add(currentPage)
      setActiveMcqGroup({ page: currentPage, questions: pageQuestions })
    }
  }, [currentPage])

  // ─── Scroll to page programmatically ──────────────────────────────────────
  const scrollToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages || 1, p))
    if (next < currentPage) {
      triggeredPages.current.forEach(pg => { if (pg >= next) triggeredPages.current.delete(pg) })
    }
    const el = pageRefs.current[next - 1]
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    else setCurrentPage(next)
  }

  const handleMcqResume = () => setActiveMcqGroup(null)
  const handleMcqDismiss = () => setActiveMcqGroup(null)

  // ─── Panel handlers ─────────────────────────────────────────────────────────
  const handleNotesClick = () => {
    const newNotesOpenState = !notesOpen
    setNotesOpen(newNotesOpenState)
    setAiOpen(false)
    setSummaryOpen(false)
    setShowAISubmenu(false)
    setSidebarOpen(false)
    onNotesClick?.()
    onNotesStateChange?.(newNotesOpenState)
  }

  const handleNotesPanelClose = () => {
    setNotesOpen(false)
    onNotesStateChange?.(false)
  }

  const handleAISubmenuClick = (type: 'summary' | 'chat') => {
    if (type === 'summary') {
      setSummaryOpen(true)
      setAiOpen(false)
    } else {
      setAiOpen(true)
      setSummaryOpen(false)
    }
    setShowAISubmenu(false)
    setNotesOpen(false)
    onNotesStateChange?.(false)
  }

  const handleAIClose = () => {
    setAiOpen(false)
  }

  const handleSummaryClose = () => {
    setSummaryOpen(false)
  }

  const handleMenuClick = () => {
    setSidebarOpen(prev => !prev)
    setNotesOpen(false)
    setAiOpen(false)
    setSummaryOpen(false)
    setShowAISubmenu(false)
    onNotesStateChange?.(false)
  }

  // ─── Resize handlers for split screen ───────────────────────────────────────
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizingRef.current = true
    document.addEventListener('mousemove', handleResize)
    document.addEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizingRef.current || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100
    const clampedPosition = Math.max(30, Math.min(70, newPosition))
    setSplitPosition(clampedPosition)
  }

  const handleResizeEnd = () => {
    isResizingRef.current = false
    document.removeEventListener('mousemove', handleResize)
    document.removeEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  const handleSplitPreset = (position: number) => {
    setSplitPosition(position)
  }

  // ─── Keyboard nav ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeMcqGroup) return
      if (e.key === "Escape" && isFullscreen) document.exitFullscreen?.()
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); scrollToPage(currentPage + 1) }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); scrollToPage(currentPage - 1) }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [currentPage, totalPages, isFullscreen, activeMcqGroup])

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", fn)
    return () => document.removeEventListener("fullscreenchange", fn)
  }, [])

  // ─── Force open notes from external event ───────────────────────────────────
  useEffect(() => {
    const handleForceOpenNotes = () => {
      setNotesOpen(true)
      setAiOpen(false)
      setSummaryOpen(false)
      setShowAISubmenu(false)
      setSidebarOpen(false)
      onNotesStateChange?.(true)
      const savedNote = localStorage.getItem('lastCreatedNote')
      if (savedNote) {
        setShouldLoadSavedNote(true)
        setTimeout(() => setShouldLoadSavedNote(false), 500)
      }
    }
    window.addEventListener('force-open-notes-in-viewer', handleForceOpenNotes)
    return () => window.removeEventListener('force-open-notes-in-viewer', handleForceOpenNotes)
  }, [onNotesStateChange])

  // ─── Sync with parent state when showNotesPanel prop changes ───────────────
  useEffect(() => {
    setNotesOpen(showNotesPanel)
  }, [showNotesPanel])

  const handleDownload = () => {
    if (!normalizedUrl) return
    const a = document.createElement("a"); a.href = normalizedUrl
    a.download = fileName; a.target = "_blank"
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const handleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
      setIsFullscreen(!isFullscreen)
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "#111827",
        zIndex: isFullscreen ? 2000 : 1000,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* ── Header with Download on LEFT and Notes on RIGHT ── */}
      {!isFullscreen && (
        <div style={{
          backgroundColor: "#1f2937", color: "white",
          padding: "8px 14px", borderBottom: "1px solid #374151",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, flexShrink: 0, flexWrap: "wrap", minHeight: 48,
        }}>
          {/* LEFT SECTION: File name and Download button */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <FileText size={15} style={{ flexShrink: 0, color: "#a78bfa" }} />
            <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fileName}>
              {fileName}
            </span>
            
            {/* Download button on the left side */}
            <button 
              onClick={handleDownload}
              style={{
                padding: "4px 10px", 
                backgroundColor: "#10b981", 
                color: "white", 
                border: "none", 
                borderRadius: 6, 
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#059669"
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "#10b981"
              }}
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          </div>

          {/* CENTER: Page indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#111827", borderRadius: 8, padding: "4px 8px", border: "1px solid #374151" }}>
              <button onClick={() => scrollToPage(currentPage - 1)} disabled={currentPage <= 1 || !!activeMcqGroup}
                style={{ background: "none", border: "none", color: currentPage <= 1 ? "#374151" : "#9ca3af", cursor: currentPage <= 1 ? "not-allowed" : "pointer", padding: 2, display: "flex" }}>
                <ChevronLeft size={14} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {pagesWithMcqs.has(currentPage) && (
                  <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#a78bfa" }} title="Quiz on this page" />
                )}
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Page</span>
                <span style={{
                  minWidth: 28, padding: "1px 6px", backgroundColor: "#111827",
                  border: "1px solid #4b5563", borderRadius: 4,
                  color: "white", fontSize: 13, fontWeight: 700, textAlign: "center",
                }}>
                  {currentPage}
                </span>
                {totalPages > 0 && <span style={{ fontSize: 11, color: "#4b5563" }}>/ {totalPages}</span>}
              </div>

              <button onClick={() => scrollToPage(currentPage + 1)} disabled={currentPage >= totalPages || !!activeMcqGroup}
                style={{ background: "none", border: "none", color: currentPage >= totalPages ? "#374151" : "#9ca3af", cursor: currentPage >= totalPages ? "not-allowed" : "pointer", padding: 2, display: "flex" }}>
                <ChevronRight size={14} />
              </button>
            </div>

            {activeMcqGroup && (
              <span style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", backgroundColor: "#7c3aed", borderRadius: 6,
                fontSize: 11, fontWeight: 700, color: "white",
                animation: "quizPulse 1.5s ease-in-out infinite",
              }}>
                <HelpCircle size={12} /> Quiz in progress…
              </span>
            )}
          </div>

          {/* RIGHT SECTION: Notes and other controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {/* Notes Button - Only show if notesEnabled is true */}
            {showNotesButton && (
              <button 
                onClick={handleNotesClick}
                style={{
                  padding: "5px 12px",
                  backgroundColor: notesOpen ? "#3b82f6" : "#374151",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = notesOpen ? "#2563eb" : "#4b5563"
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = notesOpen ? "#3b82f6" : "#374151"
                }}
              >
                <BookOpen size={14} />
                <span>Notes</span>
              </button>
            )}

            {/* Zoom controls */}
            <button onClick={() => setScale(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              style={{ padding: 5, backgroundColor: "#374151", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><ZoomOut size={14} /></button>
            <span style={{ fontSize: 11, color: "#d1d5db", minWidth: 38, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(z => Math.min(3, +(z + 0.25).toFixed(2)))}
              style={{ padding: 5, backgroundColor: "#374151", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><ZoomIn size={14} /></button>
            
            {/* Fullscreen button */}
            <button onClick={handleFullscreen}
              style={{ padding: 5, backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><Maximize size={14} /></button>
            
            {/* Menu button */}
            <button onClick={handleMenuClick}
              style={{ padding: 5, backgroundColor: "#374151", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><Menu size={14} /></button>
            
            {/* Close button */}
            <button onClick={onClose}
              style={{ padding: 5, backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Main Content Area with Split Screen ── */}
      <div className="flex-1 flex bg-white" style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 48px)' }}>
        {/* PDF Viewer Area - Adjusts based on notes visibility */}
        <div
          className="flex items-center justify-center bg-gray-100 transition-all duration-200 relative"
          style={{
            width: notesOpen ? `${splitPosition}%` : '100%',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Scrollable pages */}
          <div
            ref={scrollRef}
            style={{
              width: "100%", height: "100%",
              overflowY: activeMcqGroup ? "hidden" : "auto",
              overflowX: "auto",
              backgroundColor: "#374151",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 12,
              padding: "16px 0 24px",
            }}
          >
            {/* Loading state */}
            {isLoading && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "white", textAlign: "center" }}>
                <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.15)", borderTop: "3px solid #a78bfa", borderRadius: "50%", animation: "pdfSpin 0.8s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading PDF…</p>
              </div>
            )}

            {/* Error state */}
            {loadError && !isLoading && (
              <div style={{ color: "white", textAlign: "center", padding: 40 }}>
                <FileText size={44} style={{ color: "#ef4444", margin: "0 auto 12px", display: "block" }} />
                <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Could not load PDF</p>
                <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 16 }}>{loadError}</p>
                <button onClick={handleDownload} style={{ padding: "8px 18px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                  Download instead
                </button>
              </div>
            )}

            {/* All pages */}
            {pdfDoc && Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
              <div
                key={pg}
                data-page={pg}
                ref={el => { pageRefs.current[pg - 1] = el }}
                style={{ position: "relative", flexShrink: 0 }}
              >
                <PdfPageCanvas pdfDoc={pdfDoc} pageNum={pg} scale={scale} />

                <div style={{
                  position: "absolute", bottom: 8, right: 8,
                  backgroundColor: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.7)",
                  fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
                  pointerEvents: "none",
                }}>
                  {pg}
                </div>

                {pagesWithMcqs.has(pg) && (
                  <div style={{
                    position: "absolute", top: 10, right: 10,
                    width: 10, height: 10, borderRadius: "50%",
                    backgroundColor: "#a78bfa",
                    boxShadow: "0 0 6px rgba(167,139,250,0.8)",
                    pointerEvents: "none",
                  }} title="Quiz on this page" />
                )}
              </div>
            ))}
          </div>

          {/* MCQ Overlay */}
          {activeMcqGroup && (
            <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
              <MCQDisplayOverlay
                questions={activeMcqGroup.questions}
                pageNumber={activeMcqGroup.page}
                onResume={handleMcqResume}
                onDismiss={handleMcqDismiss}
              />
            </div>
          )}
        </div>

        {/* Resize Handle */}
        {notesOpen && (
          <div
            className="w-2 bg-gray-300 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize transition-colors duration-200 flex items-center justify-center relative"
            onMouseDown={handleResizeStart}
            style={{ zIndex: 40 }}
          >
            <div className="flex flex-col gap-1">
              <div className="w-1 h-3 bg-gray-500 rounded" />
              <div className="w-1 h-3 bg-gray-500 rounded" />
              <div className="w-1 h-3 bg-gray-500 rounded" />
            </div>
          </div>
        )}

        {/* Notes Panel */}
        {notesOpen && (
          <div
            className="bg-white transition-all duration-200 overflow-hidden"
            style={{ width: `${100 - splitPosition}%` }}
          >
            <NotesPanel
              isOpen={true}
              onClose={handleNotesPanelClose}
              isDraggable={false}
              initialNoteData={shouldLoadSavedNote ? localStorage.getItem('lastCreatedNote') : null}
            />
          </div>
        )}
      </div>

      {/* Sidebar Menu */}
      {sidebarOpen && (
        <div
          className="fixed top-0 right-0 h-full w-80 bg-white/95 backdrop-blur-lg shadow-2xl z-50 p-6 border-l border-gray-200"
          style={{ marginTop: isFullscreen ? '0' : '48px', height: isFullscreen ? '100vh' : 'calc(100vh - 48px)' }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 shadow-md hover:bg-gray-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>

          <div className="mt-3 mb-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <Settings className="w-5 h-5 text-gray-700" />
              <h2 className="text-base font-semibold text-gray-800">PDF Control</h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">Adjust view, zoom & layout options</p>
          </div>

          <div className="mt-8 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              View Control
            </h3>

            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-3 w-full shadow-sm border border-gray-200">
              <button
                onClick={() => setScale(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                disabled={scale <= 0.5}
                className="p-2 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-40 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>

              <div className="flex items-center gap-2">
                {[0.5, 1, 1.5, 2].map((z) => (
                  <button
                    key={z}
                    onClick={() => setScale(z)}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-all cursor-pointer ${Math.abs(scale - z) < 0.05
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white hover:bg-blue-500 hover:text-white border border-gray-200'
                      }`}
                  >
                    {z * 100}%
                  </button>
                ))}
              </div>

              <button
                onClick={() => setScale(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                disabled={scale >= 3}
                className="p-2 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-40 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          <div className="mt-6 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">
              Layout
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">PDF/Notes Split</span>
                <span className="text-sm font-semibold text-blue-600">
                  {Math.round(splitPosition)}/{Math.round(100 - splitPosition)}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-white/60 rounded-xl p-2">
                {[70, 60, 50].map(preset => (
                  <button
                    key={preset}
                    onClick={() => handleSplitPreset(preset)}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${splitPosition === preset
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    {preset}/{100 - preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">Display</h3>
            <div className="flex items-center justify-center bg-white/60 rounded-2xl p-3 shadow-inner">
              <button onClick={handleFullscreen}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all cursor-pointer">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                <span className="text-sm">{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</span>
              </button>
            </div>
          </div>

          <div className="mt-6 w-full">
            <h3 className="font-semibold mb-3 text-sm uppercase text-gray-600 border-b border-gray-300 pb-1">File Options</h3>
            <div className="flex items-center justify-center bg-white/60 rounded-2xl p-3 shadow-inner">
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all cursor-pointer">
                <Download className="w-4 h-4" />
                <span className="text-sm">Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat - Only show if enabled */}
      {showAIChatOption && (
        <AIChat
          isOpen={aiOpen}
          onClose={handleAIClose}
          context={{
            topicTitle: currentItemTitle || fileName,
            fileName: fileName,
            fileType: "pdf",
            isDocumentView: true,
            hierarchy: hierarchy.length > 0 ? hierarchy : [fileName],
            fileUrl: normalizedUrl,
            isPDF: true,
          }}
        />
      )}

      {/* Summary Chat - Only show if enabled */}
      {showAISummaryOption && (
        <SummaryChat
          isOpen={summaryOpen}
          onClose={handleSummaryClose}
          context={{
            topicTitle: currentItemTitle || fileName,
            fileName: fileName,
            fileType: "pdf",
            isDocumentView: true,
            hierarchy: hierarchy.length > 0 ? hierarchy : [fileName],
            pdfUrl: normalizedUrl,
            isPDF: true,
          }}
        />
      )}

      {isFullscreen && (
        <button onClick={() => document.exitFullscreen?.()}
          style={{ position: "fixed", top: 16, right: 16, zIndex: 2100, padding: "7px 14px", backgroundColor: "rgba(0,0,0,0.7)", color: "white", border: "1px solid #374151", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Minimize size={15} /> Exit Fullscreen
        </button>
      )}

      {/* Floating AI Button for when sidebar is closed */}
      {!sidebarOpen && showAIButton && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className="relative"
            onMouseEnter={() => setShowAISubmenu(true)}
            onMouseLeave={() => setShowAISubmenu(false)}
          >
            <button
              onClick={() => setShowAISubmenu(!showAISubmenu)}
              className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center border-2 border-white"
            >
              <Sparkles size={20} />
            </button>

            {showAISubmenu && (
              <div
                className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                onMouseEnter={() => setShowAISubmenu(true)}
                onMouseLeave={() => setShowAISubmenu(false)}
              >
                {showAISummaryOption && (
                  <button
                    onClick={() => handleAISubmenuClick('summary')}
                    className="w-full justify-start h-10 px-4 rounded-none transition-all duration-200 hover:bg-purple-50 text-gray-700 hover:text-purple-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Summary</span>
                  </button>
                )}
                {showAIChatOption && (
                  <button
                    onClick={() => handleAISubmenuClick('chat')}
                    className="w-full justify-start h-10 px-4 rounded-none transition-all duration-200 hover:bg-purple-50 text-gray-700 hover:text-purple-700 flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Chat</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pdfSpin   { to { transform: rotate(360deg) } }
        @keyframes quizPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
    </div>
  )
}