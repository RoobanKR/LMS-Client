"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  X, Download, ZoomIn, ZoomOut, Maximize, Minimize, FileText,
  HelpCircle, Save, Loader, AlertCircle, Plus, Trash2,
  Copy, ChevronUp, ChevronDown, List, CheckSquare, AlignLeft,
  Image, Check, SlidersHorizontal,
  ChevronRight, BookOpen, ChevronLeft, Hash,
  MousePointer, Link, Zap, ExternalLink, Share2, QrCode,
} from "lucide-react"

// ─── HELPERS ──────────────────────────────────────────────────────────────────
let _uid = 0
const uid = (prefix = "id") => `${prefix}-${++_uid}-${Math.random().toString(36).slice(2, 7)}`

// ─── GENERATED LINK POPUP ────────────────────────────────────────────────────
function GeneratedLinkPopup({
  link,
  pageNumber,
  questionCount,
  fileName,
  onClose,
}: {
  link: string;
  pageNumber: number;
  questionCount: number;
  fileName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 20000,
      backgroundColor: "rgba(0,0,0,0.75)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease-out",
    }}>
      <div style={{
        backgroundColor: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: 16,
        padding: 32,
        maxWidth: 520,
        width: "90%",
        boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
        animation: "slideUp 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48,
              backgroundColor: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Share2 size={22} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ color: "white", fontWeight: 700, fontSize: 16, margin: 0 }}>
                Live MCQ Link Generated
              </h3>
              <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 0" }}>
                {questionCount} question{questionCount !== 1 ? "s" : ""} · Page {pageNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#475569", padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* File info */}
        <div style={{
          backgroundColor: "#1e293b",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <FileText size={14} color="#64748b" />
          <span style={{ fontSize: 12, color: "#94a3b8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fileName}
          </span>
          <span style={{
            fontSize: 10, color: "#f59e0b",
            backgroundColor: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            padding: "2px 8px", borderRadius: 99, fontWeight: 700,
          }}>
            Page {pageNumber}
          </span>
        </div>

        {/* Link box */}
        <div style={{
          backgroundColor: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Shareable Link
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              flex: 1, fontSize: 12, color: "#94a3b8",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "monospace",
            }}>
              {link}
            </span>
            <button
              onClick={handleCopy}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px",
                backgroundColor: copied ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
                borderRadius: 6, cursor: "pointer",
                color: copied ? "#10b981" : "#f59e0b",
                fontSize: 11, fontWeight: 700,
                flexShrink: 0,
                transition: "all 0.2s",
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Open link button */}
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "11px 0",
            backgroundColor: "#f59e0b",
            borderRadius: 8,
            color: "#0f172a",
            fontWeight: 700, fontSize: 13,
            textDecoration: "none",
            transition: "background-color 0.15s",
            marginBottom: 12,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d97706")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f59e0b")}
        >
          <ExternalLink size={14} />
          Open Live MCQ Page
        </a>

        {/* Info note */}
        <p style={{ fontSize: 11, color: "#475569", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
          Anyone with this link can answer the MCQ questions for page {pageNumber}.
          <br />Share it with your students to let them respond in real time.
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

// ─── RIGHT-CLICK CONTEXT MENU ────────────────────────────────────────────────
function ContextMenu({
  x, y, pageNumber,
  onAddMcq, onLiveAddMcq, onClose,
}: {
  x: number; y: number; pageNumber: number;
  onAddMcq: (page: number) => void;
  onLiveAddMcq: (page: number) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const out = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [onClose]);

  return (
    <div ref={menuRef} style={{
      position: "fixed", left: x, top: y, zIndex: 10000,
      minWidth: 240, backgroundColor: "#1f2937",
      border: "1px solid #374151", borderRadius: 10,
      boxShadow: "0 10px 30px rgba(0,0,0,0.6)", padding: "4px 0",
      animation: "ctxFade 0.12s ease-out",
    }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #374151", fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 6 }}>
        <Hash size={12} color="#a78bfa" /> Page {pageNumber}
      </div>

      {/* Option 1 — Add MCQ (default) */}
      <button onClick={() => { onAddMcq(pageNumber); onClose(); }}
        style={{ width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "none", color: "#f3f4f6", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background-color 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#374151")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
        <HelpCircle size={14} color="#a78bfa" />
        <span style={{ flex: 1, textAlign: "left" }}>Add MCQ Question</span>
        <span style={{ fontSize: 10, color: "#a78bfa", backgroundColor: "rgba(124,58,237,0.15)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>default</span>
      </button>

      {/* Option 2 — Live Add MCQ (link) */}
      <button onClick={() => { onLiveAddMcq(pageNumber); onClose(); }}
        style={{ width: "100%", padding: "10px 12px", backgroundColor: "transparent", border: "none", color: "#f3f4f6", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "background-color 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#374151")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}>
        <Zap size={14} color="#f59e0b" />
        <span style={{ flex: 1, textAlign: "left" }}>Live Add MCQ Question</span>
        <span style={{ fontSize: 10, color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.15)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>link</span>
      </button>

      <div style={{ padding: "8px 12px", fontSize: 10, color: "#6b7280", borderTop: "1px solid #374151", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <MousePointer size={10} color="#6b7280" /> Right-click any page to add questions
      </div>
    </div>
  );
}

// ─── TYPE CONFIG ──────────────────────────────────────────────────────────────
const typeConfig = {
  "multiple-choice": { label: "Multiple Choice", icon: <List className="h-3.5 w-3.5" />, color: "text-violet-600", bg: "bg-violet-50" },
  "checkboxes":      { label: "Checkboxes",      icon: <CheckSquare className="h-3.5 w-3.5" />, color: "text-blue-600", bg: "bg-blue-50" },
  "short-answer":    { label: "Short Answer",     icon: <AlignLeft className="h-3.5 w-3.5" />, color: "text-orange-600", bg: "bg-orange-50" },
  "paragraph":       { label: "Paragraph",        icon: <BookOpen className="h-3.5 w-3.5" />, color: "text-teal-600", bg: "bg-teal-50" },
}

// ─── OPTIONS PER ROW PICKER ───────────────────────────────────────────────────
function OptionsPerRowPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-slate-400">Layout:</span>
      {[1, 2, 3, 4].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${value === n ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600"}`}>
          {n}
        </button>
      ))}
      <span className="text-[10px] text-slate-400">per row</span>
    </div>
  )
}

// ─── SETTINGS MENU ────────────────────────────────────────────────────────────
function SettingsMenu({ isOpen, onClose, onCollapseAll, onExpandAll }: any) {
  if (!isOpen) return null
  return (
    <div className="absolute top-full right-0 mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
      <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">View</p>
      {([["Collapse All", <ChevronRight className="h-3.5 w-3.5 text-slate-400" />, onCollapseAll],
        ["Expand All", <ChevronDown className="h-3.5 w-3.5 text-slate-400" />, onExpandAll]] as any[]).map(([label, icon, handler]) => (
        <button key={label} onClick={() => { handler(); onClose() }}
          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-xs text-slate-700">
          {icon}{label}
        </button>
      ))}
    </div>
  )
}

// ─── IMAGE TOOLBAR ────────────────────────────────────────────────────────────
function ImageToolbar({ alignment, sizePercent, onAlignmentChange, onSizeChange, onRemove, onClose }: any) {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 flex items-stretch divide-x divide-slate-100" style={{ minWidth: 260 }}>
      <div className="flex flex-col items-center justify-center px-3 py-2 gap-1">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Align</span>
        <div className="flex gap-0.5">
          {["left", "center", "right"].map(a => (
            <button key={a} onClick={() => onAlignmentChange(a)}
              className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${alignment === a ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-violet-50 hover:text-violet-600"}`}>
              {a[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-center px-3 py-2 gap-1 flex-1">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Size {sizePercent}%</span>
        <div className="flex items-center gap-1.5">
          <ZoomOut className="h-3 w-3 text-slate-300" />
          <input type="range" min={10} max={100} step={5} value={sizePercent} onChange={e => onSizeChange(parseInt(e.target.value))} className="flex-1 h-1.5 accent-violet-600 cursor-pointer" />
          <ZoomIn className="h-3 w-3 text-slate-300" />
        </div>
      </div>
      <div className="flex items-center gap-0.5 px-2 py-2">
        <button onClick={onRemove} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

// ─── SINGLE PAGE CANVAS ──────────────────────────────────────────────────────
function PdfPageCanvas({ pdfDoc, pageNum, scale, onContextMenu, onClick, showMcqMarker, mcqCount }: {
  pdfDoc: any; pageNum: number; scale: number;
  onContextMenu?: (e: React.MouseEvent, page: number) => void;
  onClick?: (e: React.MouseEvent, page: number) => void;
  showMcqMarker?: boolean; mcqCount?: number;
}) {
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
        canvas.width = vp.width; canvas.height = vp.height
        const task = page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp })
        taskRef.current = task
        await task.promise
      } catch (e: any) { if (e?.name !== "RenderingCancelledException") console.error(e) }
    })()
    return () => { cancelled = true }
  }, [pdfDoc, pageNum, scale])

  return (
    <div style={{ position: "relative" }}>
      <canvas ref={canvasRef}
        onContextMenu={e => { e.preventDefault(); onContextMenu?.(e, pageNum); }}
        onClick={e => onClick?.(e, pageNum)}
        style={{ display: "block", boxShadow: "0 2px 16px rgba(0,0,0,0.4)", borderRadius: 3, maxWidth: "100%", cursor: onContextMenu ? "cell" : "default" }}
      />
      {showMcqMarker && (
        <div style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(124,58,237,0.9)", color: "white", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
          <HelpCircle size={11} /> {mcqCount || 1} MCQ{(mcqCount || 1) !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}

// ─── MCQ QUESTION FORM ────────────────────────────────────────────────────────
function MCQQuestionForm({
  onClose, onSave,
  initialPageNumber = 1,
  fileId, fileName, entityType, entityId, tabType, subcategory, folderPath = [],
  apiBaseUrl = "http://localhost:5533",
  mcqMode = "default",
  sampleLink = "",
  onLinkGenerated, // NEW: callback to show link popup
}: any) {

  const makeBlock = () => ({
    id: uid("block"), isActive: true, sequence: 0, pageNumber: initialPageNumber,
    mcqQuestion: {
      questionTitle: "",
      options: [
        { id: uid("opt"), text: "", isCorrect: false, imageUrl: null, imageAlignment: "left", imageSizePercent: 100 },
        { id: uid("opt"), text: "", isCorrect: false, imageUrl: null, imageAlignment: "left", imageSizePercent: 100 },
      ],
      correctAnswers: [], explanation: "",
    },
    type: "multiple-choice", hasExplanation: false, optionsPerRow: 1, isRequired: false,
    questionImage: { imageUrl: "", alignment: "center", sizePercent: 60 }, explanationImageUrl: "",
  })

  const [blocks, setBlocks] = useState([makeBlock()])
  const [errors, setErrors] = useState<Record<string, any>>({})
  const [collapsedState, setCollapsed] = useState<Record<string, boolean>>({})
  const [showTypeMenu, setShowTypeMenu] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [activeImgToolbar, setActiveImgToolbar] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [linkValue, setLinkValue] = useState(sampleLink || "https://example.com/live-mcq-sample")
  const isLinkMode = mcqMode === "link"

  const updateBlock = (id: string, patch: any) => setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...patch } : b))
  const updateMcqQuestion = (id: string, patch: any) => setBlocks(bs => bs.map(b => b.id === id ? { ...b, mcqQuestion: { ...b.mcqQuestion, ...patch } } : b))
  const updateOption = (bid: string, oid: string, patch: any) => setBlocks(bs => bs.map(b => b.id === bid ? { ...b, mcqQuestion: { ...b.mcqQuestion, options: b.mcqQuestion.options.map((o: any) => o.id === oid ? { ...o, ...patch } : o) } } : b))
  const addBlock = () => { const nb = makeBlock(); setBlocks(bs => [...bs, nb]); setCollapsed(p => ({ ...p, [nb.id]: false })) }
  const removeBlock = (id: string) => { if (blocks.length === 1) { const nb = makeBlock(); setBlocks([nb]); setCollapsed({ [nb.id]: false }) } else { setBlocks(bs => bs.filter(b => b.id !== id)); setCollapsed(p => { const n = { ...p }; delete n[id]; return n }) } }
  const moveBlock = (id: string, dir: "up" | "down") => { const idx = blocks.findIndex(b => b.id === id); if (dir === "up" && idx === 0) return; if (dir === "down" && idx === blocks.length - 1) return; const nb = [...blocks]; const ni = dir === "up" ? idx - 1 : idx + 1; [nb[idx], nb[ni]] = [nb[ni], nb[idx]]; setBlocks(nb) }
  const duplicateBlock = (id: string) => { const src = blocks.find(b => b.id === id); if (!src) return; const nid = uid("block"); const dup = { ...src, id: nid, mcqQuestion: { ...src.mcqQuestion, options: src.mcqQuestion.options.map((o: any) => ({ ...o, id: uid("opt"), imageUrl: o.imageUrl?.startsWith("data:") ? "" : o.imageUrl })), correctAnswers: [] } }; setBlocks(bs => [...bs, dup]); setCollapsed(p => ({ ...p, [nid]: false })) }
  const collapseAll = () => { const s: any = {}; blocks.forEach(b => (s[b.id] = true)); setCollapsed(s) }
  const expandAll = () => { const s: any = {}; blocks.forEach(b => (s[b.id] = false)); setCollapsed(s) }

  const addOption = (bid: string) => setBlocks(bs => bs.map(b => b.id === bid ? { ...b, mcqQuestion: { ...b.mcqQuestion, options: [...b.mcqQuestion.options, { id: uid("opt"), text: "", isCorrect: false, imageUrl: null, imageAlignment: "left", imageSizePercent: 100 }] } } : b))
  const removeOption = (bid: string, oid: string) => setBlocks(bs => bs.map(b => { if (b.id !== bid) return b; const opt = b.mcqQuestion.options.find((o: any) => o.id === oid); const newOpts = b.mcqQuestion.options.filter((o: any) => o.id !== oid); let newCA = [...b.mcqQuestion.correctAnswers]; if (opt?.isCorrect) newCA = newCA.filter((a: string) => a !== opt.text); return { ...b, mcqQuestion: { ...b.mcqQuestion, options: newOpts, correctAnswers: newCA } } }))
  const setCorrect = (bid: string, oid: string) => setBlocks(bs => bs.map(b => { if (b.id !== bid) return b; const updated = b.mcqQuestion.options.map((o: any) => ({ ...o, isCorrect: o.id === oid })); const correct = updated.find((o: any) => o.id === oid); return { ...b, mcqQuestion: { ...b.mcqQuestion, options: updated, correctAnswers: correct?.text ? [correct.text] : [] } } }))
  const toggleCorrect = (bid: string, oid: string) => setBlocks(bs => bs.map(b => { if (b.id !== bid) return b; const updated = b.mcqQuestion.options.map((o: any) => o.id === oid ? { ...o, isCorrect: !o.isCorrect } : o); const newCA = updated.filter((o: any) => o.isCorrect).map((o: any) => o.text).filter((t: string) => t.trim()); return { ...b, mcqQuestion: { ...b.mcqQuestion, options: updated, correctAnswers: newCA } } }))
  const updateOptionText = (bid: string, oid: string, newText: string) => setBlocks(bs => bs.map(b => { if (b.id !== bid) return b; const old = b.mcqQuestion.options.find((o: any) => o.id === oid); const updated = b.mcqQuestion.options.map((o: any) => o.id === oid ? { ...o, text: newText } : o); let newCA = [...b.mcqQuestion.correctAnswers]; if (old?.isCorrect) { newCA = newCA.filter((a: string) => a !== old.text); if (newText.trim()) newCA.push(newText) } return { ...b, mcqQuestion: { ...b.mcqQuestion, options: updated, correctAnswers: newCA } } }))

  const uploadQuestionImage = (bid: string, file: File) => { const r = new FileReader(); r.onload = e => { updateBlock(bid, { questionImage: { ...blocks.find(b => b.id === bid)?.questionImage, imageUrl: (e.target as any).result } }); setActiveImgToolbar({ type: "question", blockId: bid }) }; r.readAsDataURL(file) }
  const uploadOptionImage = (bid: string, oid: string, file: File) => { const r = new FileReader(); r.onload = e => { updateOption(bid, oid, { imageUrl: (e.target as any).result }); setActiveImgToolbar({ type: "option", blockId: bid, optionId: oid }) }; r.readAsDataURL(file) }
  const uploadExplanationImage = (bid: string, file: File) => { const r = new FileReader(); r.onload = e => { updateBlock(bid, { explanationImageUrl: (e.target as any).result }); setActiveImgToolbar({ type: "explanation", blockId: bid }) }; r.readAsDataURL(file) }

  const isQImgActive = (bid: string) => activeImgToolbar?.type === "question" && activeImgToolbar.blockId === bid
  const isOptImgActive = (bid: string, oid: string) => activeImgToolbar?.type === "option" && activeImgToolbar.blockId === bid && activeImgToolbar.optionId === oid
  const isExpImgActive = (bid: string) => activeImgToolbar?.type === "explanation" && activeImgToolbar.blockId === bid

  const validate = () => {
    const errs: any = {}; let valid = true
    blocks.forEach(b => {
      const be: any = {}
      const cleanTitle = b.mcqQuestion?.questionTitle?.replace(/<[^>]*>/g, "").trim() || ""
      if (!cleanTitle) { be.questionTitle = "Question title is required"; valid = false }
      if (b.mcqQuestion.options.length < 2) { be.options = "At least 2 options are required"; valid = false }
      const nonEmpty = b.mcqQuestion.options.filter((o: any) => o.text.trim())
      if (nonEmpty.length < 2) { be.options = "At least 2 non-empty options are required"; valid = false }
      if (b.mcqQuestion.correctAnswers.length === 0) { be.correctAnswer = "Mark at least one correct answer"; valid = false }
      if (Object.keys(be).length) errs[b.id] = be
    })
    setErrors(errs); return valid
  }

  const base64ToFile = (b64: string, name: string) => {
    try {
      const m = b64.match(/^data:([^;]+);base64,(.+)$/); if (!m) return null
      const bytes = atob(m[2]); const buf = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i)
      return new File([buf], name, { type: m[1] })
    } catch { return null }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSaving(true)

    const missing: string[] = []
    if (!tabType) missing.push("tabType")
    if (!subcategory) missing.push("subcategory")
    if (!fileId) missing.push("fileId")
    if (!entityType) missing.push("entityType")
    if (!entityId) missing.push("entityId")
    if (missing.length > 0) { setIsSaving(false); alert(`Missing required props: ${missing.join(", ")}`); return }

    try {
      const formData = new FormData()
      formData.append("tabType", tabType)
      formData.append("subcategory", subcategory)
      formData.append("folderPath", JSON.stringify(Array.isArray(folderPath) && folderPath.length > 0 ? folderPath : []))
      formData.append("fileId", fileId)
      formData.append("type", isLinkMode ? "link" : "default")
      if (isLinkMode) formData.append("link", linkValue)

      const questionsData = blocks.map((b, idx) => {
        const cleanQuestionTitle = b.mcqQuestion?.questionTitle?.replace(/<[^>]*>/g, "").trim() || ""
        const options = b.mcqQuestion.options.map((o: any, oi: number) => {
          const option: any = { text: o.text.trim(), isCorrect: o.isCorrect, imageAlignment: o.imageAlignment || "left", imageSizePercent: o.imageSizePercent || 100 }
          if (o.imageUrl?.startsWith("data:")) {
            const imageKey = `question_${idx}_option_${oi}_image`
            const file = base64ToFile(o.imageUrl, `option_${b.id}_${o.id}_${Date.now()}.jpg`)
            if (file) { formData.append(imageKey, file); option.imageUrl = imageKey }
          } else { option.imageUrl = o.imageUrl || null }
          return option
        })
        const correctAnswers = b.mcqQuestion.correctAnswers.filter((a: string) => a && a.trim())
        const questionData: any = {
          mcqQuestionTitle: cleanQuestionTitle,
          mcqQuestionType: "multiple_choice",
          mcqQuestionOptionsPerRow: b.optionsPerRow || 1,
          mcqQuestionOptions: options,
          mcqQuestionCorrectAnswers: correctAnswers,
          mcqQuestionRequired: b.isRequired || false,
          mcqQuestionDescription: b.hasExplanation ? (b.explanation || "") : "",
          isActive: true, sequence: idx,
          pageNumber: initialPageNumber,
          timestamp: initialPageNumber,
          type: isLinkMode ? "link" : "default",
          ...(isLinkMode ? { link: linkValue } : {}),
        }
        if (b.questionImage?.imageUrl) {
          if (b.questionImage.imageUrl.startsWith("data:")) {
            const imageKey = `question_${idx}_image`
            const file = base64ToFile(b.questionImage.imageUrl, `question_${b.id}_${Date.now()}.jpg`)
            if (file) { formData.append(imageKey, file); questionData.mcqQuestionImageUrl = imageKey; questionData.mcqQuestionImageAlignment = b.questionImage.alignment || "center"; questionData.mcqQuestionImageSizePercent = b.questionImage.sizePercent || 60 }
          } else { questionData.mcqQuestionImageUrl = b.questionImage.imageUrl; questionData.mcqQuestionImageAlignment = b.questionImage.alignment || "center"; questionData.mcqQuestionImageSizePercent = b.questionImage.sizePercent || 60 }
        }
        if (b.hasExplanation && b.explanationImageUrl) {
          if (b.explanationImageUrl.startsWith("data:")) {
            const imageKey = `question_${idx}_explanation_image`
            const file = base64ToFile(b.explanationImageUrl, `explanation_${b.id}_${Date.now()}.jpg`)
            if (file) { formData.append(imageKey, file); questionData.explanationImageUrl = imageKey }
          } else { questionData.explanationImageUrl = b.explanationImageUrl }
        }
        return questionData
      })

      formData.append("questionsData", JSON.stringify(questionsData))
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("smartcliff_token") : ""
      const headers: any = token ? { Authorization: `Bearer ${token}` } : {}

      
      const response = await fetch(`${apiBaseUrl}/file-mcq-add/${entityType}/${entityId}`, {
        method: "POST", headers, body: formData,
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message?.[0]?.value || `API error ${response.status}`)
      }

      const savedQuestions = blocks.map(b => ({
        id: b.id, questionTitle: b.mcqQuestion?.questionTitle,
        options: b.mcqQuestion?.options, explanation: b.explanation,
        pageNumber: initialPageNumber,
        type: isLinkMode ? "link" : "default",
        ...(isLinkMode ? { link: linkValue } : {}),
      }))

      onSave(savedQuestions)

      // ── For "link" mode: build the shareable URL and show the popup ──────
      if (isLinkMode && onLinkGenerated) {
        // Build URL: /live-mcq?fileId=X&entityType=Y&entityId=Z&page=N&tabType=T&subcategory=S
        const base = typeof window !== "undefined" ? window.location.origin : ""
        const params = new URLSearchParams({
          fileId,
          entityType,
          entityId,
          page: String(initialPageNumber),
          tabType,
          subcategory,
        })
        const generatedUrl = `${base}/live-mcq?${params.toString()}`
        onLinkGenerated(generatedUrl, blocks.length)
        // Don't close the form yet; popup will show on top
        return
      }

      onClose()
    } catch (err: any) {
      console.error("Failed to save MCQ:", err)
      alert("Failed to save questions: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const renderOptions = (block: any) => {
    const cols = block.optionsPerRow || 1
    const gridCls = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"][cols - 1]
    return (
      <div className={`grid ${gridCls} gap-2`}>
        {block.mcqQuestion.options.map((opt: any, idx: number) => (
          <div key={opt.id} className="group/opt relative">
            <div className={`flex flex-col rounded-lg border transition-all overflow-hidden ${opt.isCorrect ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              {opt.imageUrl && (
                <div className="px-2 pt-2 relative">
                  {isOptImgActive(block.id, opt.id) && <ImageToolbar alignment={opt.imageAlignment || "left"} sizePercent={opt.imageSizePercent || 100} onAlignmentChange={(a: string) => updateOption(block.id, opt.id, { imageAlignment: a })} onSizeChange={(v: number) => updateOption(block.id, opt.id, { imageSizePercent: v })} onRemove={() => { updateOption(block.id, opt.id, { imageUrl: null }); setActiveImgToolbar(null) }} onClose={() => setActiveImgToolbar(null)} />}
                  <div style={{ display: "flex", justifyContent: opt.imageAlignment === "left" ? "flex-start" : opt.imageAlignment === "right" ? "flex-end" : "center", marginTop: isOptImgActive(block.id, opt.id) ? 64 : 0 }}>
                    <div style={{ width: `${opt.imageSizePercent || 100}%` }} className="cursor-pointer" onClick={() => setActiveImgToolbar(isOptImgActive(block.id, opt.id) ? null : { type: "option", blockId: block.id, optionId: opt.id })}>
                      <img src={opt.imageUrl} alt="" className={`w-full h-auto rounded-md border-2 transition-all ${isOptImgActive(block.id, opt.id) ? "border-violet-400 ring-2 ring-violet-100" : "border-transparent hover:border-violet-200"}`} />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <button type="button" className="flex-shrink-0" onClick={() => block.type === "checkboxes" ? toggleCorrect(block.id, opt.id) : setCorrect(block.id, opt.id)}>
                  {block.type === "checkboxes" ? (
                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${opt.isCorrect ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-violet-400"}`}>{opt.isCorrect && <svg className="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 010 1.414l-8 8a1 1 01-1.414 0l-4-4a1 1 011.414-1.414L8 12.586l7.293-7.293a1 1 011.414 0z" clipRule="evenodd" /></svg>}</div>
                  ) : (
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${opt.isCorrect ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-violet-400"}`}>{opt.isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}</div>
                  )}
                </button>
                <input type="text" value={opt.text} onChange={e => updateOptionText(block.id, opt.id, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + idx)}`} className={`flex-1 text-xs outline-none bg-transparent placeholder:text-slate-300 ${opt.isCorrect ? "text-emerald-700 font-semibold" : "text-slate-700"}`} />
                <div className="opacity-0 group-hover/opt:opacity-100 flex items-center gap-0.5 transition-opacity">
                  {!opt.imageUrl && (<label className="cursor-pointer p-1 hover:bg-slate-100 rounded-md transition-colors"><Image className="h-3 w-3 text-slate-400" /><input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadOptionImage(block.id, opt.id, f) }} /></label>)}
                  {block.mcqQuestion.options.length > 2 && (<button onClick={() => removeOption(block.id, opt.id)} className="p-1 hover:bg-red-50 rounded-md transition-colors"><X className="h-3 w-3 text-slate-300 hover:text-red-400" /></button>)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderQuestionContent = (block: any) => {
    if (collapsedState[block.id]) return null
    return (
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <OptionsPerRowPicker value={block.optionsPerRow || 1} onChange={v => updateBlock(block.id, { optionsPerRow: v })} />
          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${typeConfig[block.type as keyof typeof typeConfig]?.bg || "bg-slate-50"} ${typeConfig[block.type as keyof typeof typeConfig]?.color || "text-slate-600"}`}>
            {block.type === "multiple-choice" ? "Single correct" : block.type === "checkboxes" ? "Multiple correct" : "Dropdown"}
          </span>
        </div>
        {renderOptions(block)}
        <button onClick={() => addOption(block.id)} className="text-[11px] text-violet-500 hover:text-violet-700 font-semibold">+ Add option</button>
        {errors[block.id]?.options && <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg"><AlertCircle className="h-3.5 w-3.5" />{errors[block.id].options}</div>}
        {errors[block.id]?.correctAnswer && <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg"><AlertCircle className="h-3.5 w-3.5" />{errors[block.id].correctAnswer}</div>}
      </div>
    )
  }

  const qTypeConfig = (type: string) => typeConfig[type as keyof typeof typeConfig] || typeConfig["multiple-choice"]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${isLinkMode ? "bg-amber-500" : "bg-violet-600"}`}>
            {isLinkMode ? <Zap className="h-4 w-4 text-white" /> : <HelpCircle className="h-4 w-4 text-white" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {isLinkMode ? "Live Add MCQ Questions" : "Add MCQ Questions"}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isLinkMode ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                {isLinkMode ? "link" : "default"}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              On page <span className="font-mono text-violet-600">#{initialPageNumber}</span>
              &nbsp;·&nbsp;{blocks.length} question{blocks.length !== 1 ? "s" : ""}
              {fileName && <span className="ml-2">· {fileName}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button onClick={() => setShowSettings(s => !s)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><SlidersHorizontal className="h-4 w-4 text-slate-500" /></button>
            <SettingsMenu isOpen={showSettings} onClose={() => setShowSettings(false)} onCollapseAll={collapseAll} onExpandAll={expandAll} />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-4 w-4 text-slate-400" /></button>
        </div>
      </div>

      {/* LINK BANNER */}
      {isLinkMode && (
        <div style={{ padding: "10px 20px", backgroundColor: "#fffbeb", borderBottom: "1px solid #fcd34d", display: "flex", alignItems: "center", gap: 10 }}>
          <Link size={15} color="#d97706" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
              Live Link — sent as <code style={{ backgroundColor: "#fef3c7", padding: "0 4px", borderRadius: 3 }}>type: "link"</code> in payload
            </div>
            <input type="url" value={linkValue} onChange={e => setLinkValue(e.target.value)}
              placeholder="https://example.com/live-mcq-sample"
              style={{ width: "100%", fontSize: 12, border: "1px solid #fcd34d", borderRadius: 8, padding: "6px 10px", outline: "none", backgroundColor: "white", color: "#1f2937" }} />
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="flex-1 overflow-y-auto bg-slate-50/80 px-4 py-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {blocks.map((block, idx) => {
            const collapsed = collapsedState[block.id] || false
            const hasErr = !!errors[block.id]
            const qtype = qTypeConfig(block.type)
            return (
              <div key={block.id} className={`bg-white rounded-xl border shadow-sm transition-all ${hasErr ? "border-red-300 shadow-red-100" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-2">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white mt-0.5 ${isLinkMode ? "bg-amber-500" : "bg-violet-600"}`}>{idx + 1}</div>
                  <button onClick={() => setCollapsed(p => ({ ...p, [block.id]: !p[block.id] }))} className="flex-shrink-0 p-1 hover:bg-slate-100 rounded-md transition-colors mt-0.5">
                    {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    {collapsed ? (
                      <p className="text-xs text-slate-500 py-0.5 truncate">{block.mcqQuestion?.questionTitle?.replace(/<[^>]*>/g, "").trim() || <span className="italic text-slate-300">Empty question</span>}</p>
                    ) : (
                      <>
                        {!block.questionImage?.imageUrl && (
                          <label className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-violet-600 cursor-pointer transition-colors mb-1.5">
                            <Image className="h-2.5 w-2.5" /><span>Add image to question</span>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadQuestionImage(block.id, f) }} />
                          </label>
                        )}
                        <input type="text" value={block.mcqQuestion?.questionTitle || ""} onChange={e => updateMcqQuestion(block.id, { questionTitle: e.target.value })} placeholder="Type your question here..." className="w-full text-sm font-medium outline-none border-b-2 border-slate-200 focus:border-violet-400 pb-1.5 mb-2" />
                        {block.questionImage?.imageUrl && (
                          <div className="mt-2 relative">
                            {isQImgActive(block.id) && <ImageToolbar alignment={block.questionImage.alignment || "center"} sizePercent={block.questionImage.sizePercent || 60} onAlignmentChange={(a: string) => updateBlock(block.id, { questionImage: { ...block.questionImage, alignment: a } })} onSizeChange={(v: number) => updateBlock(block.id, { questionImage: { ...block.questionImage, sizePercent: v } })} onRemove={() => { updateBlock(block.id, { questionImage: { imageUrl: "", alignment: "center", sizePercent: 60 } }); setActiveImgToolbar(null) }} onClose={() => setActiveImgToolbar(null)} />}
                            <div style={{ display: "flex", justifyContent: block.questionImage.alignment === "left" ? "flex-start" : block.questionImage.alignment === "right" ? "flex-end" : "center", marginTop: isQImgActive(block.id) ? 64 : 0 }}>
                              <div style={{ width: `${block.questionImage.sizePercent || 60}%` }} className="cursor-pointer" onClick={() => setActiveImgToolbar(isQImgActive(block.id) ? null : { type: "question", blockId: block.id })}>
                                <img src={block.questionImage.imageUrl} alt="" className={`w-full h-auto rounded-lg border-2 transition-all ${isQImgActive(block.id) ? "border-violet-400 ring-2 ring-violet-100" : "border-transparent hover:border-violet-200"}`} />
                              </div>
                            </div>
                          </div>
                        )}
                        {hasErr && errors[block.id]?.questionTitle && <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg"><AlertCircle className="h-3.5 w-3.5" />{errors[block.id].questionTitle}</div>}
                        <div className="mt-2.5">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={block.hasExplanation} onChange={() => updateBlock(block.id, { hasExplanation: !block.hasExplanation })} className="w-3.5 h-3.5 rounded border-slate-300 accent-violet-600" />
                            <span className="text-[11px] text-slate-400 hover:text-violet-600 transition-colors flex items-center gap-1"><HelpCircle className="h-3 w-3" />Add explanation</span>
                          </label>
                          {block.hasExplanation && (
                            <div className="mt-1.5 ml-5 pl-3 border-l-2 border-violet-200 space-y-2">
                              <textarea value={block.explanation || ""} onChange={e => updateBlock(block.id, { explanation: e.target.value })} placeholder="Explain the correct answer…" className="w-full text-sm border border-slate-200 rounded-lg p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-violet-400" />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setShowTypeMenu(showTypeMenu === block.id ? null : block.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${qtype.bg} ${qtype.color} border-transparent hover:border-current/20`}>
                      {qtype.icon}<span className="max-w-[80px] truncate">{qtype.label}</span><ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                    {showTypeMenu === block.id && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50">
                        <p className="px-3 py-1 text-[9px] font-bold text-slate-300 uppercase tracking-widest">Question Type</p>
                        {Object.entries(typeConfig).map(([t, cfg]) => (
                          <button key={t} onClick={() => { updateBlock(block.id, { type: t }); setShowTypeMenu(null) }} className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-xs ${block.type === t ? `${cfg.color} font-semibold` : "text-slate-700"}`}>
                            <span className={block.type === t ? cfg.color : "text-slate-400"}>{cfg.icon}</span>{cfg.label}{block.type === t && <Check className="h-3 w-3 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {renderQuestionContent(block)}
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => duplicateBlock(block.id)} title="Duplicate" className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-slate-700 transition-all"><Copy className="h-3.5 w-3.5" /></button>
                    <button onClick={() => removeBlock(block.id)} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <button onClick={() => moveBlock(block.id, "up")} disabled={idx === 0} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition-all"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => moveBlock(block.id, "down")} disabled={idx === blocks.length - 1} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed transition-all"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] font-semibold text-slate-500">Required</span>
                    <button type="button" onClick={() => updateBlock(block.id, { isRequired: !block.isRequired })} className={`relative rounded-full transition-colors ${block.isRequired ? "bg-violet-600" : "bg-slate-200"}`} style={{ width: 32, height: 18 }}>
                      <div className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${block.isRequired ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                </div>
              </div>
            )
          })}
        </div>
        <div className="max-w-3xl mx-auto mt-3">
          <button onClick={addBlock} className="w-full border-2 border-dashed border-slate-300 hover:border-violet-400 py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition-all">
            <Plus className="h-5 w-5" />Add another question
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-white flex-shrink-0">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <div className={`w-1.5 h-1.5 rounded-full ${isLinkMode ? "bg-amber-400" : "bg-emerald-400"}`} />
          {blocks.length} question{blocks.length !== 1 ? "s" : ""} ready
          {isLinkMode && <span className="ml-1 text-amber-600 font-semibold">· will generate shareable link</span>}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-all">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className={`px-5 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50 shadow-sm transition-all ${isLinkMode ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
            {isSaving ? <><Loader className="h-3.5 w-3.5 animate-spin" />Saving…</> : isLinkMode ? <><Share2 className="h-3.5 w-3.5" />Save & Generate Link</> : <><Save className="h-3.5 w-3.5" />Save Questions</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PDF VIEWER PROPS ─────────────────────────────────────────────────────────
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
  isTeacher?: boolean
  isStudent?: boolean
  sampleLiveLink?: string
}

// ─── PDF VIEWER ───────────────────────────────────────────────────────────────
export default function PDFViewer({
  fileUrl, fileName,
  fileId = "", entityType = "", entityId = "",
  tabType = "", subcategory = "", folderPath = [],
  apiBaseUrl = "http://localhost:5533",
  onClose,
  initialMcqs = [],
  isTeacher = true, isStudent = false,
  sampleLiveLink = "https://example.com/live-mcq-sample",
}: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.4)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  const [savedMcqs, setSavedMcqs] = useState<any[]>(initialMcqs || [])
  const [showMcqForm, setShowMcqForm] = useState(false)
  const [mcqPageNumber, setMcqPageNumber] = useState(1)
  const [mcqMode, setMcqMode] = useState<"default" | "link">("default")
  const [showMcqList, setShowMcqList] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageNumber: number } | null>(null)

  // ── NEW: generated link popup state ─────────────────────────────────────────
  const [generatedLinkData, setGeneratedLinkData] = useState<{
    link: string; pageNumber: number; questionCount: number
  } | null>(null)

  const getMcqPage = (q: any): number => { const raw = q.videoTimestamp ?? q.pageNumber ?? q.timestamp ?? 0; return typeof raw === "number" ? Math.round(raw) : parseInt(String(raw)) || 0 }

  const mcqsByPage = React.useMemo(() => {
    const map = new Map<number, any[]>()
    savedMcqs.forEach(mcq => { const page = getMcqPage(mcq); if (!map.has(page)) map.set(page, []); map.get(page)!.push(mcq) })
    return map
  }, [savedMcqs])

  const pagesWithMcqs = new Set(Array.from(mcqsByPage.keys()))

  const normalizedUrl = React.useMemo(() => {
    if (!fileUrl) return ""
    if (typeof fileUrl === "string") return fileUrl
    if (typeof fileUrl === "object" && (fileUrl as any).base) return (fileUrl as any).base
    if (typeof fileUrl === "object") return (Object.values(fileUrl).find(v => typeof v === "string" && (v as string).startsWith("http")) as string) || ""
    return ""
  }, [fileUrl])

  useEffect(() => {
    if (!normalizedUrl) return
    let cancelled = false
    setIsLoading(true); setLoadError(null); setPdfDoc(null); setTotalPages(0)
    const load = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((res, rej) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"; s.onload = () => res(); s.onerror = () => rej(new Error("pdf.js CDN unavailable")); document.head.appendChild(s) })
        }
        const lib = (window as any).pdfjsLib
        lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        const doc = await lib.getDocument({ url: normalizedUrl, withCredentials: false }).promise
        if (cancelled) return
        setPdfDoc(doc); setTotalPages(doc.numPages); setCurrentPage(1)
        pageRefs.current = new Array(doc.numPages).fill(null)
        setIsLoading(false)
      } catch (e: any) { if (!cancelled) { setLoadError(e?.message || "Failed to load"); setIsLoading(false) } }
    }
    load()
    return () => { cancelled = true }
  }, [normalizedUrl])

  useEffect(() => {
    if (!pdfDoc || totalPages === 0) return
    const observer = new IntersectionObserver(
      entries => { let best = entries[0]; entries.forEach(e => { if (e.intersectionRatio > (best?.intersectionRatio ?? 0)) best = e }); if (best?.isIntersecting) { const pg = parseInt((best.target as HTMLElement).dataset.page || "1"); if (!isNaN(pg)) setCurrentPage(pg) } },
      { root: scrollRef.current, threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
    )
    pageRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [pdfDoc, totalPages, scale])

  const openMcqForm = (page: number, mode: "default" | "link" = "default") => { setMcqPageNumber(page); setMcqMode(mode); setShowMcqForm(true) }
  const handleCanvasContextMenu = (e: React.MouseEvent, pageNum: number) => { e.preventDefault(); if (isStudent || !isTeacher) return; setContextMenu({ x: e.clientX, y: e.clientY, pageNumber: pageNum }) }
  const handleCanvasClick = (e: React.MouseEvent, pageNum: number) => { if (isStudent || !isTeacher) return; if (e.ctrlKey || e.metaKey) { e.preventDefault(); openMcqForm(pageNum, "default") } }
  const scrollToPage = (p: number) => { const next = Math.max(1, Math.min(totalPages || 1, p)); const el = pageRefs.current[next - 1]; if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); else setCurrentPage(next) }

  const handleMcqSave = (questions: any[]) => {
    setSavedMcqs(prev => [...prev, ...questions.map(q => ({ ...q, savedAt: new Date() }))])
    // Only close form if not link mode (link mode stays open until popup is closed)
    if (mcqMode !== "link") setShowMcqForm(false)
  }

  const handleLinkGenerated = (link: string, questionCount: number) => {
    setGeneratedLinkData({ link, pageNumber: mcqPageNumber, questionCount })
    setShowMcqForm(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (showMcqForm || generatedLinkData) return; if (e.key === "Escape" && isFullscreen) document.exitFullscreen?.(); if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); scrollToPage(currentPage + 1) } if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); scrollToPage(currentPage - 1) } }
    document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey)
  }, [currentPage, totalPages, isFullscreen, showMcqForm, generatedLinkData])

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", fn); return () => document.removeEventListener("fullscreenchange", fn)
  }, [])

  const handleDownload = () => { if (!normalizedUrl) return; const a = document.createElement("a"); a.href = normalizedUrl; a.download = fileName; a.target = "_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a) }
  const mcqsOnCurrentPage = mcqsByPage.get(currentPage) || []

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, backgroundColor: "#111827", zIndex: isFullscreen ? 2000 : 1000, display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      {!isFullscreen && (
        <div style={{ backgroundColor: "#1f2937", color: "white", padding: "8px 14px", borderBottom: "1px solid #374151", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexShrink: 0, flexWrap: "wrap", minHeight: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <FileText size={15} style={{ flexShrink: 0, color: "#a78bfa" }} />
            <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fileName}>{fileName}</span>
            {!isStudent && isTeacher && <span style={{ fontSize: 10, backgroundColor: "#7c3aed", padding: "2px 6px", borderRadius: 4, color: "white", fontWeight: 600, marginLeft: 4 }}>Teacher Mode</span>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: "#111827", borderRadius: 8, padding: "4px 8px", border: "1px solid #374151" }}>
              <button onClick={() => scrollToPage(currentPage - 1)} disabled={currentPage <= 1 || isLoading} style={{ background: "none", border: "none", color: currentPage <= 1 ? "#374151" : "#9ca3af", cursor: currentPage <= 1 ? "not-allowed" : "pointer", padding: 2, display: "flex" }}><ChevronLeft size={14} /></button>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {pagesWithMcqs.has(currentPage) && <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#a78bfa" }} />}
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Page</span>
                <span style={{ minWidth: 28, padding: "1px 6px", backgroundColor: "#111827", border: "1px solid #4b5563", borderRadius: 4, color: "white", fontSize: 13, fontWeight: 700, textAlign: "center" }}>{currentPage}</span>
                {totalPages > 0 && <span style={{ fontSize: 11, color: "#4b5563" }}>/ {totalPages}</span>}
              </div>
              <button onClick={() => scrollToPage(currentPage + 1)} disabled={currentPage >= totalPages || isLoading} style={{ background: "none", border: "none", color: currentPage >= totalPages ? "#374151" : "#9ca3af", cursor: currentPage >= totalPages ? "not-allowed" : "pointer", padding: 2, display: "flex" }}><ChevronRight size={14} /></button>
            </div>

            {!isStudent && isTeacher && (
              <>
                <button onClick={() => openMcqForm(currentPage, "default")} disabled={isLoading || !pdfDoc} title="Add MCQ (default)" style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", backgroundColor: "#7c3aed", border: "none", borderRadius: 6, color: "white", fontSize: 12, fontWeight: 700, cursor: pdfDoc ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                  <HelpCircle size={13} />+ MCQ<span style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>pg {currentPage}</span>
                </button>
                <button onClick={() => openMcqForm(currentPage, "link")} disabled={isLoading || !pdfDoc} title="Live Add MCQ (link)" style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", backgroundColor: "#d97706", border: "none", borderRadius: 6, color: "white", fontSize: 12, fontWeight: 700, cursor: pdfDoc ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>
                  <Zap size={13} />Live MCQ<span style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>pg {currentPage}</span>
                </button>
              </>
            )}

            {mcqsOnCurrentPage.length > 0 && (
              <span style={{ backgroundColor: "#059669", color: "white", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 999, display: "flex", alignItems: "center", gap: 3 }}>
                <Check size={10} /> {mcqsOnCurrentPage.length} MCQ{mcqsOnCurrentPage.length !== 1 ? "s" : ""} on this page
              </span>
            )}

            {savedMcqs.length > 0 && (
              <button onClick={() => setShowMcqList(!showMcqList)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", backgroundColor: showMcqList ? "#6d28d9" : "#374151", border: "none", borderRadius: 6, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                <Hash size={12} />{savedMcqs.length} total MCQ{savedMcqs.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <button onClick={() => setScale(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} style={{ padding: 5, backgroundColor: "#374151", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><ZoomOut size={14} /></button>
            <span style={{ fontSize: 11, color: "#d1d5db", minWidth: 38, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(z => Math.min(3, +(z + 0.25).toFixed(2)))} style={{ padding: 5, backgroundColor: "#374151", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><ZoomIn size={14} /></button>
            <button onClick={() => { if (!isFullscreen) containerRef.current?.requestFullscreen?.(); else document.exitFullscreen?.() }} style={{ padding: 5, backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><Maximize size={14} /></button>
            <button onClick={handleDownload} style={{ padding: 5, backgroundColor: "#10b981", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><Download size={14} /></button>
            <button onClick={onClose} style={{ padding: 5, backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: 4, cursor: "pointer", display: "flex" }}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div ref={scrollRef} style={{ width: "100%", height: "100%", overflowY: "auto", overflowX: "auto", backgroundColor: "#374151", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 0 24px" }}>
          {isLoading && (
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "white", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.15)", borderTop: "3px solid #a78bfa", borderRadius: "50%", animation: "pdfSpin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading PDF…</p>
            </div>
          )}
          {loadError && !isLoading && (
            <div style={{ color: "white", textAlign: "center", padding: 40 }}>
              <FileText size={44} style={{ color: "#ef4444", margin: "0 auto 12px", display: "block" }} />
              <p style={{ margin: "0 0 8px", fontWeight: 700 }}>Could not load PDF</p>
              <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 16 }}>{loadError}</p>
              <button onClick={handleDownload} style={{ padding: "8px 18px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>Download instead</button>
            </div>
          )}
          {!isStudent && isTeacher && !isLoading && pdfDoc && (
            <div style={{ position: "sticky", top: 10, zIndex: 10, backgroundColor: "rgba(0,0,0,0.7)", color: "#9ca3af", fontSize: 10, padding: "6px 12px", borderRadius: 20, border: "1px solid #374151", display: "flex", alignItems: "center", gap: 6, marginBottom: 10, pointerEvents: "none" }}>
              <MousePointer size={10} color="#a78bfa" />
              Right-click: <span style={{ color: "#a78bfa" }}>Add MCQ</span> (default) or <span style={{ color: "#f59e0b" }}>Live Add MCQ</span> (link + generates shareable URL)
            </div>
          )}
          {pdfDoc && Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => {
            const mcqsOnPage = mcqsByPage.get(pg) || []
            return (
              <div key={pg} data-page={pg} ref={el => { pageRefs.current[pg - 1] = el }} style={{ position: "relative", flexShrink: 0 }}>
                <PdfPageCanvas pdfDoc={pdfDoc} pageNum={pg} scale={scale}
                  onContextMenu={!isStudent && isTeacher ? handleCanvasContextMenu : undefined}
                  onClick={!isStudent && isTeacher ? handleCanvasClick : undefined}
                  showMcqMarker={mcqsOnPage.length > 0} mcqCount={mcqsOnPage.length} />
                <div style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 99, pointerEvents: "none" }}>{pg}</div>
              </div>
            )
          })}
        </div>

        {/* MCQ list side panel */}
        {showMcqList && savedMcqs.length > 0 && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 290, backgroundColor: "#1f2937", borderLeft: "1px solid #374151", display: "flex", flexDirection: "column", zIndex: 20 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #374151", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "white", fontWeight: 600, fontSize: 13 }}>All MCQs ({savedMcqs.length})</span>
              <button onClick={() => setShowMcqList(false)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 2 }}><X size={15} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {savedMcqs.map((mcq, i) => {
                const page = getMcqPage(mcq)
                const isLink = mcq.type === "link"
                return (
                  <div key={mcq.id + i} onClick={() => scrollToPage(page)} style={{ padding: 10, borderRadius: 7, border: `1px solid ${page === currentPage ? "#7c3aed" : "#374151"}`, marginBottom: 6, backgroundColor: page === currentPage ? "rgba(124,58,237,0.1)" : "#111827", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      <Hash size={11} color="#a78bfa" />
                      <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>Page {page}</span>
                      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700, backgroundColor: isLink ? "rgba(245,158,11,0.2)" : "rgba(124,58,237,0.2)", color: isLink ? "#f59e0b" : "#a78bfa" }}>{isLink ? "link" : "default"}</span>
                      {page === currentPage && <span style={{ marginLeft: "auto", fontSize: 9, backgroundColor: "#7c3aed", color: "white", padding: "1px 5px", borderRadius: 3 }}>current</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "#e5e7eb", fontWeight: 500, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mcq.questionTitle?.replace(/<[^>]*>/g, "").trim() || "Untitled"}</p>
                    {isLink && mcq.link && <p style={{ fontSize: 9, color: "#f59e0b", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔗 {mcq.link}</p>}
                    <p style={{ fontSize: 9, color: "#4b5563", margin: "4px 0 0" }}>Click to jump to page</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && !isStudent && isTeacher && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} pageNumber={contextMenu.pageNumber}
          onAddMcq={page => { openMcqForm(page, "default"); setContextMenu(null) }}
          onLiveAddMcq={page => { openMcqForm(page, "link"); setContextMenu(null) }}
          onClose={() => setContextMenu(null)} />
      )}

      {isFullscreen && (
        <button onClick={() => document.exitFullscreen?.()} style={{ position: "fixed", top: 16, right: 16, zIndex: 2100, padding: "7px 14px", backgroundColor: "rgba(0,0,0,0.7)", color: "white", border: "1px solid #374151", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Minimize size={15} /> Exit Fullscreen
        </button>
      )}

      {/* MCQ Form */}
      {showMcqForm && (
        <MCQQuestionForm
          initialPageNumber={mcqPageNumber}
          onClose={() => setShowMcqForm(false)}
          onSave={handleMcqSave}
          onLinkGenerated={handleLinkGenerated}
          fileId={fileId} fileName={fileName}
          entityType={entityType} entityId={entityId}
          tabType={tabType} subcategory={subcategory}
          folderPath={folderPath} apiBaseUrl={apiBaseUrl}
          mcqMode={mcqMode} sampleLink={sampleLiveLink}
        />
      )}

      {/* Generated Link Popup */}
      {generatedLinkData && (
        <GeneratedLinkPopup
          link={generatedLinkData.link}
          pageNumber={generatedLinkData.pageNumber}
          questionCount={generatedLinkData.questionCount}
          fileName={fileName}
          onClose={() => setGeneratedLinkData(null)}
        />
      )}

      <style>{`
        @keyframes pdfSpin { to { transform: rotate(360deg) } }
        @keyframes ctxFade { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  )
}