"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import ExerciseInfoModals, { ExerciseInfoButtons } from './ExerciseInfoModals'
import dynamic from "next/dynamic"
import Script from "next/script"
import axios from "axios"
import {
  Play, Loader2, CheckCircle, X, ChevronRight, ChevronDown, ChevronLeft,
  FolderPlus, FilePlus, Trash2, Edit3, Files, Terminal as TerminalIcon,
  FileCode, Folder, FolderOpen, Trophy, AlertCircle, Maximize2, Minimize2,
  FileText, BarChart3, Award, Clock, Menu, Search, ArrowUpDown, X as XIcon,
} from "lucide-react"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    </div>
  ),
})

// ─── Types ────────────────────────────────────────────────────────────────────
interface FileNode {
  id: string
  filename: string
  content: string
  language: "python" | "text"
  path: string
  folderPath: string
  isEntryPoint?: boolean
  lastModified?: Date
}

interface FolderNode {
  id: string
  name: string
  path: string
  parentPath: string
  depth: number
}

interface TerminalLog {
  id: string
  kind: "stdout" | "stderr" | "system" | "success" | "error" | "info"
  message: string
}

interface MultiFileCodeEditorProps {
  exercise?: any
  theme?: "light" | "dark"
  courseId?: string
  nodeId?: string
  nodeName?: string
  nodeType?: string
  subcategory?: string
  category?: string
  onBack?: () => void
  onCloseExercise?: () => void
  onNavigateToBreadcrumb?: (level: "course" | "hierarchy" | "category") => void
  courseName?: string
  hierarchy?: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const joinPath = (parent: string, name: string): string =>
  parent === "/" || parent === "" ? `/${name}` : `${parent}/${name}`

const getExt = (filename: string): string =>
  filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : ""

const detectLanguage = (filename: string): "python" | "text" =>
  getExt(filename) === "py" ? "python" : "text"

const uid = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"

const formatExerciseTime = (seconds: number | null): string => {
  if (seconds === null) return "--:--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const getQuestionHtml = (q: any): string => {
  if (!q) return ""
  if (typeof q.description === "string") return q.description
  if (q.description?.text) return q.description.text
  return ""
}

const STARTER_PY = `# Write your solution here
# Tip: create other .py files and use \`import\` to call them.
#
# Example:
#   from utils import greet
#   greet("World")

def main():
    print("Hello from main.py")

if __name__ == "__main__":
    main()
`

const createStarterWorkspace = (): { files: FileNode[]; folders: FolderNode[] } => ({
  folders: [],
  files: [
    {
      id: uid("file"),
      filename: "main.py",
      content: STARTER_PY,
      language: "python",
      path: "/main.py",
      folderPath: "/",
      isEntryPoint: true,
      lastModified: new Date(),
    },
  ],
})

// ─── Tree builder ─────────────────────────────────────────────────────────────
interface TreeFolder { type: "folder"; folder: FolderNode; children: TreeNode[] }
interface TreeFile { type: "file"; file: FileNode }
type TreeNode = TreeFolder | TreeFile

const buildTree = (files: FileNode[], folders: FolderNode[]): TreeNode[] => {
  const childrenOf: Record<string, TreeNode[]> = { "/": [] }
  folders.forEach((f) => { childrenOf[f.path] = [] })
  folders.forEach((f) => {
    const parent = childrenOf[f.parentPath] ?? (childrenOf[f.parentPath] = [])
    parent.push({ type: "folder", folder: f, children: childrenOf[f.path] })
  })
  files.forEach((file) => {
    const parent = childrenOf[file.folderPath] ?? (childrenOf[file.folderPath] = [])
    parent.push({ type: "file", file })
  })
  Object.values(childrenOf).forEach((arr) => {
    arr.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      const an = a.type === "folder" ? a.folder.name : a.file.filename
      const bn = b.type === "folder" ? b.folder.name : b.file.filename
      return an.localeCompare(bn)
    })
  })
  return childrenOf["/"]
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function MultiFileCodeEditor({
  exercise,
  theme = "light",
  courseId,
  nodeId = "",
  nodeName = "",
  nodeType = "",
  subcategory = "",
  category = "",
  onBack,
  onCloseExercise,
  onNavigateToBreadcrumb,
  courseName,
  hierarchy = [],
}: MultiFileCodeEditorProps) {
  const isDark = theme === "dark"

  // ─── Workspace state ────────────────────────────────────────────────────────
  const [files, setFiles] = useState<FileNode[]>([])
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [openTabIds, setOpenTabIds] = useState<string[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["/"]))
  // The folder that new files/folders will be created inside.
  // Clicking a folder row sets this; clicking a file row sets it to that file's folderPath.
  const [activeFolderPath, setActiveFolderPath] = useState<string>("/")
  const [showExplorer, setShowExplorer] = useState(true)
  const [explorerWidth, setExplorerWidth] = useState(220)
  const [questionWidth, setQuestionWidth] = useState(380)
  const [terminalHeight, setTerminalHeight] = useState(200)

  // ─── Question state ─────────────────────────────────────────────────────────
  const questions = useMemo(() => exercise?.questions ?? [], [exercise])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const currentQuestion = questions[currentQuestionIndex] || null

  // ─── Sidebar (problems list) state ──────────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDifficulty, setFilterDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all")
  const [sortBy, setSortBy] = useState<"default" | "difficulty" | "title">("default")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [solvedQuestions, setSolvedQuestions] = useState<Set<number>>(new Set())

  // ─── Difficulty map (first index + count per difficulty) ────────────────────
  const difficultyMap = useMemo<Record<string, { firstIndex: number; count: number }>>(() => {
    const map: Record<string, { firstIndex: number; count: number }> = {}
    questions.forEach((q: any, i: number) => {
      const d = (q?.difficulty || "").toLowerCase()
      if (!d) return
      if (!map[d]) map[d] = { firstIndex: i, count: 0 }
      map[d].count += 1
    })
    return map
  }, [questions])

  const availableDifficulties = useMemo(
    () => (["easy", "medium", "hard"] as const).filter((d) => !!difficultyMap[d]),
    [difficultyMap],
  )

  const jumpToDifficulty = (diff: string) => {
    const entry = difficultyMap[diff]
    if (entry) setCurrentQuestionIndex(entry.firstIndex)
  }

  const getFilteredAndSortedQuestions = useCallback(() => {
    let filtered = questions.map((q: any, i: number) => ({ ...q, _originalIndex: i }))
    if (filterDifficulty !== "all") {
      filtered = filtered.filter((q: any) => (q.difficulty || "").toLowerCase() === filterDifficulty)
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((q: any) =>
        (q.title || "").toLowerCase().includes(query) ||
        (typeof q.description === "string" && q.description.toLowerCase().includes(query)),
      )
    }
    if (sortBy === "difficulty") {
      const order: Record<string, number> = { easy: 1, medium: 2, hard: 3 }
      filtered.sort((a: any, b: any) => (order[(a.difficulty || "").toLowerCase()] || 4) - (order[(b.difficulty || "").toLowerCase()] || 4))
    } else if (sortBy === "title") {
      filtered.sort((a: any, b: any) => (a.title || "").localeCompare(b.title || ""))
    } else {
      filtered.sort((a: any, b: any) => a._originalIndex - b._originalIndex)
    }
    return filtered
  }, [questions, filterDifficulty, searchQuery, sortBy])

  const cycleSortOption = () => {
    const opts: Array<"default" | "difficulty" | "title"> = ["default", "difficulty", "title"]
    setSortBy(opts[(opts.indexOf(sortBy) + 1) % opts.length])
  }

  const getSortIcon = () => sortBy === "difficulty" ? "🟢🟡🔴" : sortBy === "title" ? "A-Z" : "123"

  const goPrev = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex((i) => i - 1) }
  const goNext = () => { if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex((i) => i + 1) }
  const selectQuestion = (idx: number) => setCurrentQuestionIndex(idx)

  // ─── Execution state ────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false)
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([])
  const [pyodideReady, setPyodideReady] = useState(false)
  const pyodideRef = useRef<any>(null)
  const isSubmitGuardRef = useRef(false)
  const isSubmitQuestionGuardRef = useRef(false)

  // ─── Modals ─────────────────────────────────────────────────────────────────
  const [showBackConfirm, setShowBackConfirm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showOverviewModal, setShowOverviewModal] = useState(false)
  const [pendingNavLevel, setPendingNavLevel] = useState<null | "course" | "hierarchy" | "category">(null)

  // ─── File ops state ─────────────────────────────────────────────────────────
  const [createMode, setCreateMode] = useState<null | { type: "file" | "folder"; parentPath: string }>(null)
  const [createName, setCreateName] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [ctxMenu, setCtxMenu] = useState<null | { x: number; y: number; target: { type: "file" | "folder"; id: string } | { type: "root" } }>(null)

  // ─── Full exercise (re-fetched to get totalMarks etc.) ──────────────────────
  const [fullExercise, setFullExercise] = useState<any>(exercise || null)
  useEffect(() => {
    setFullExercise(exercise || null)
    if (!exercise?._id) return
    const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || ''
    fetch(`http://localhost:5533/exercise/${exercise._id}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const full = data.data || data.exercise || data
        if (full?._id) setFullExercise({ ...full, questions: exercise.questions ?? full.questions })
      })
      .catch(() => {})
  }, [exercise?._id])
  const exData = fullExercise ?? exercise

  // ─── Timer ──────────────────────────────────────────────────────────────────
  const [exerciseTimeLeft, setExerciseTimeLeft] = useState<number | null>(null)

  // ─── Resize refs ────────────────────────────────────────────────────────────
  const resizing = useRef<null | "explorer" | "question" | "terminal">(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ─── Logging ────────────────────────────────────────────────────────────────
  const addLog = useCallback((kind: TerminalLog["kind"], message: string) => {
    setTerminalLogs((prev) => [...prev, { id: uid("log"), kind, message }])
  }, [])
  const clearTerminal = useCallback(() => setTerminalLogs([]), [])

  // ─── Derived ────────────────────────────────────────────────────────────────
  const activeFile = useMemo(() => files.find((f) => f.id === activeFileId) || null, [files, activeFileId])
  const openTabs = useMemo(
    () => openTabIds.map((id) => files.find((f) => f.id === id)).filter(Boolean) as FileNode[],
    [openTabIds, files],
  )
  const tree = useMemo(() => buildTree(files, folders), [files, folders])

  // ─── Timer effect (totalDuration in minutes) ────────────────────────────────
  useEffect(() => {
    const totalDuration = exData?.exerciseInformation?.totalDuration
    if (!totalDuration || totalDuration <= 0) { setExerciseTimeLeft(null); return }
    setExerciseTimeLeft(totalDuration * 60)
    const timer = setInterval(() => {
      setExerciseTimeLeft((prev) => {
        if (prev === null || prev <= 0) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [exData?.exerciseInformation?.totalDuration])

  // ═════════════════════════════════════════════════════════════════════════════
  // Load previous submission on mount / question change
  // ═════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const exerciseId = exercise?._id
    const questionId = currentQuestion?._id
    if (!exerciseId || !questionId || !courseId || !category) {
      const starter = createStarterWorkspace()
      setFiles(starter.files); setFolders(starter.folders)
      setActiveFileId(starter.files[0].id); setOpenTabIds([starter.files[0].id])
      return
    }
    const loadPrevious = async () => {
      try {
        const token = localStorage.getItem("smartcliff_token") || localStorage.getItem("token") || ""
        const res = await fetch(
          `http://localhost:5533/courses/answers/previous-submission?courseId=${courseId}&exerciseId=${exerciseId}&questionId=${questionId}&category=${category}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) throw new Error("no-previous")
        const data = await res.json()
        if (!data?.success || !data?.data?.files?.length) throw new Error("empty")

        const restoredFiles: FileNode[] = (data.data.files as any[]).map((f, i) => ({
          id: f.id || uid("file"),
          filename: f.filename || `file${i}.py`,
          content: f.content || "",
          language: detectLanguage(f.filename || "") as "python" | "text",
          path: f.path || `/${f.filename}`,
          folderPath: f.folderPath || "/",
          isEntryPoint: !!f.isEntryPoint,
          lastModified: f.lastModified ? new Date(f.lastModified) : new Date(),
        }))
        const restoredFolders: FolderNode[] = (data.data.folders as any[] || []).map((f, i) => ({
          id: f.id || uid("folder"),
          name: f.name || `folder${i}`,
          path: f.path,
          parentPath: f.parentPath || "/",
          depth: f.depth ?? (f.path?.split("/").filter(Boolean).length - 1) ?? 0,
        }))

        setFiles(restoredFiles); setFolders(restoredFolders)
        const entry = restoredFiles.find((f) => f.isEntryPoint) || restoredFiles[0]
        setActiveFileId(entry.id); setOpenTabIds([entry.id])
        setExpandedFolders(new Set(["/", ...restoredFolders.map((f) => f.path)]))
        addLog("system", `Restored ${restoredFiles.length} file(s) from your last save.`)
      } catch {
        const starter = createStarterWorkspace()
        setFiles(starter.files); setFolders(starter.folders)
        setActiveFileId(starter.files[0].id); setOpenTabIds([starter.files[0].id])
      }
    }
    loadPrevious()
  }, [exercise?._id, currentQuestion?._id, courseId, category, addLog])

  // ═════════════════════════════════════════════════════════════════════════════
  // Pyodide  (uses a window-level shared promise so multiple mounts share one runtime)
  // ═════════════════════════════════════════════════════════════════════════════
  const initPyodide = useCallback(async () => {
    if (pyodideRef.current) { setPyodideReady(true); return }
    const w = window as any
    if (!w.loadPyodide) return  // script not loaded yet — polling effect below will retry
    try {
      if (!w.__pyodidePromise) {
        addLog("system", "Loading Python runtime…")
        w.__pyodidePromise = w.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/",
        })
      }
      const pyodide = await w.__pyodidePromise
      pyodideRef.current = pyodide
      setPyodideReady(true)
      addLog("success", "Python runtime ready.")
    } catch (e: any) {
      addLog("error", `Failed to load Python runtime: ${e?.message || e}`)
    }
  }, [addLog])

  // Poll for window.loadPyodide — covers the case where the <Script> is already
  // in the DOM from a prior single-file CodeEditor mount and onLoad won't refire.
  useEffect(() => {
    if (pyodideReady) return
    if ((window as any).loadPyodide) { initPyodide(); return }
    const id = setInterval(() => {
      if ((window as any).loadPyodide) {
        clearInterval(id)
        initPyodide()
      }
    }, 300)
    return () => clearInterval(id)
  }, [pyodideReady, initPyodide])

  const mountFilesToPyodide = useCallback(() => {
    const pyodide = pyodideRef.current
    if (!pyodide) return
    try {
      pyodide.runPython(`
import shutil, os
if os.path.exists('/workspace'):
    shutil.rmtree('/workspace')
os.makedirs('/workspace', exist_ok=True)
`)
    } catch { /* */ }

    folders.slice().sort((a, b) => a.depth - b.depth).forEach((folder) => {
      try { pyodide.FS.mkdir(`/workspace${folder.path}`) } catch { /* */ }
    })
    files.forEach((f) => {
      const fsPath = `/workspace${f.path}`
      try {
        pyodide.FS.writeFile(fsPath, f.content, { encoding: "utf8" })
      } catch {
        try { pyodide.FS.mkdir(`/workspace${f.folderPath}`) } catch { /* */ }
        pyodide.FS.writeFile(fsPath, f.content, { encoding: "utf8" })
      }
    })

    pyodide.runPython(`
import sys, os
os.chdir('/workspace')
if '/workspace' not in sys.path:
    sys.path.insert(0, '/workspace')
`)
  }, [files, folders])

  const findEntryFile = (): FileNode | null => {
    const explicit = files.find((f) => f.isEntryPoint && f.language === "python")
    if (explicit) return explicit
    const mainPy = files.find((f) => f.path === "/main.py")
    if (mainPy) return mainPy
    return files.find((f) => f.language === "python") || null
  }

  const runCode = async () => {
    if (!pyodideReady || !pyodideRef.current) { addLog("error", "Python runtime is not ready yet."); return }
    const entry = findEntryFile()
    if (!entry) { addLog("error", "No Python entry file found. Mark a .py file as entry point."); return }
    if (isRunning) return

    setIsRunning(true)
    clearTerminal()
    addLog("system", `Running ${entry.filename}…`)
    const pyodide = pyodideRef.current
    try {
      pyodide.setStdout({ batched: (msg: string) => addLog("stdout", msg) })
      pyodide.setStderr({ batched: (msg: string) => addLog("stderr", msg) })
      mountFilesToPyodide()
      pyodide.runPython(`
import sys
for _m in list(sys.modules.keys()):
    if _m.startswith('__main__'):
        continue
    mod = sys.modules.get(_m)
    f = getattr(mod, '__file__', None)
    if isinstance(f, str) and f.startswith('/workspace'):
        sys.modules.pop(_m, None)
`)
      await pyodide.runPythonAsync(`
import runpy
runpy.run_path(${JSON.stringify(`/workspace${entry.path}`)}, run_name="__main__")
`)
      addLog("success", "Program finished.")
    } catch (e: any) {
      addLog("error", String(e?.message || e))
    } finally {
      setIsRunning(false)
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Submit (shared payload builder + post)
  // ═════════════════════════════════════════════════════════════════════════════
  const postSubmission = async (isTestSubmission: boolean): Promise<{ ok: boolean; message?: string }> => {
    const exerciseId = exercise?._id
    const questionId = currentQuestion?._id
    if (!exerciseId || !questionId || !courseId) {
      return { ok: false, message: "Missing exercise context." }
    }
    const token = localStorage.getItem("smartcliff_token") || localStorage.getItem("token") || ""
    const payload = {
      courseId, exerciseId, questionId,
      questionTitle: currentQuestion?.title || `Question ${currentQuestionIndex + 1}`,
      exerciseName: exercise?.exerciseInformation?.exerciseName,
      category, subcategory,
      selectedProgrammingLanguage: "python",
      nodeId, nodeName, nodeType,
      files: files.map((f) => ({
        id: f.id, filename: f.filename, content: f.content, language: f.language,
        path: f.path, folderPath: f.folderPath, isEntryPoint: !!f.isEntryPoint,
        lastModified: f.lastModified || new Date(),
      })),
      folders: folders.map((f) => ({ id: f.id, name: f.name, path: f.path, parentPath: f.parentPath, depth: f.depth })),
      // Question-level status — enum is ['solved','attempted','skipped','submitted','evaluated'].
      // Exercise-level "completed" is set by the server when isTestSubmission=true.
      status: "submitted",
      score: 0,
      isTestSubmission,
    }
    const res = await axios.post(
      "http://localhost:5533/courses/answers/submit-multiple-files",
      payload,
      { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } },
    )
    return res.data?.success ? { ok: true } : { ok: false, message: res.data?.message || "unknown" }
  }

  // Per-question submit (saves progress, no userAttempts increment, stays open)
  const submitQuestion = async () => {
    if (isSubmitQuestionGuardRef.current) return
    isSubmitQuestionGuardRef.current = true
    setIsSubmittingQuestion(true)
    try {
      const result = await postSubmission(false)
      if (result.ok) {
        addLog("success", `Question ${currentQuestionIndex + 1} saved.`)
        setSolvedQuestions((prev) => new Set(prev).add(currentQuestionIndex))
      } else {
        addLog("error", `Save failed: ${result.message}`)
      }
    } catch (e: any) {
      addLog("error", `Save error: ${e?.message || e}`)
    } finally {
      setIsSubmittingQuestion(false)
      isSubmitQuestionGuardRef.current = false
    }
  }

  // Full exercise submit (increments userAttempts, closes after)
  const submitExercise = async () => {
    if (isSubmitGuardRef.current) return
    isSubmitGuardRef.current = true
    setIsSubmitting(true)
    try {
      const result = await postSubmission(true)
      if (result.ok) {
        addLog("success", `Exercise submitted (${files.length} file${files.length !== 1 ? "s" : ""}).`)
        setSolvedQuestions((prev) => new Set(prev).add(currentQuestionIndex))
        if (exercise?._id) localStorage.removeItem("ex_in_progress_" + exercise._id)
        setTimeout(() => { if (onCloseExercise) onCloseExercise(); else if (onBack) onBack() }, 1200)
      } else {
        addLog("error", `Submission failed: ${result.message}`)
        isSubmitGuardRef.current = false
      }
    } catch (e: any) {
      addLog("error", `Submission error: ${e?.message || e}`)
      isSubmitGuardRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // File/Folder operations
  // ═════════════════════════════════════════════════════════════════════════════
  const validateName = (name: string): string | null => {
    const trimmed = name.trim()
    if (!trimmed) return "Name cannot be empty."
    if (/[/\\:*?"<>|]/.test(trimmed)) return "Invalid characters in name."
    return null
  }

  const createFile = (parentPath: string, name: string) => {
    const err = validateName(name); if (err) return addLog("error", err)
    const finalName = name.includes(".") ? name : `${name}.py`
    const newPath = joinPath(parentPath, finalName)
    if (files.some((f) => f.path === newPath)) return addLog("error", `File ${newPath} already exists.`)
    const newFile: FileNode = {
      id: uid("file"), filename: finalName, content: "",
      language: detectLanguage(finalName), path: newPath, folderPath: parentPath,
      lastModified: new Date(),
    }
    setFiles((prev) => [...prev, newFile])
    setActiveFileId(newFile.id)
    setOpenTabIds((prev) => prev.includes(newFile.id) ? prev : [...prev, newFile.id])
    // Auto-expand parent folder so the new file is visible
    if (parentPath !== "/") setExpandedFolders((prev) => new Set(prev).add(parentPath))
    addLog("success", `Created ${newPath}`)
  }

  const createFolder = (parentPath: string, name: string) => {
    const err = validateName(name); if (err) return addLog("error", err)
    const newPath = joinPath(parentPath, name.trim())
    if (folders.some((f) => f.path === newPath)) return addLog("error", `Folder ${newPath} already exists.`)
    const depth = newPath.split("/").filter(Boolean).length - 1
    setFolders((prev) => [...prev, { id: uid("folder"), name: name.trim(), path: newPath, parentPath, depth }])
    // Auto-expand both the new folder AND its parent
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      next.add(newPath)
      if (parentPath !== "/") next.add(parentPath)
      return next
    })
    // Make the newly created folder the target for further nested creates
    setActiveFolderPath(newPath)
    addLog("success", `Created folder ${newPath}`)
  }

  const deleteFile = (fileId: string) => {
    const file = files.find((f) => f.id === fileId); if (!file) return
    if (!confirm(`Delete ${file.filename}?`)) return
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    setOpenTabIds((prev) => prev.filter((id) => id !== fileId))
    if (activeFileId === fileId) {
      const remaining = openTabIds.filter((id) => id !== fileId)
      setActiveFileId(remaining[0] || null)
    }
  }

  const deleteFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId); if (!folder) return
    if (!confirm(`Delete folder ${folder.name} and all its contents?`)) return
    const prefix = folder.path
    const isInside = (p: string) => p === prefix || p.startsWith(prefix + "/")
    const removedFileIds = new Set(files.filter((f) => isInside(f.folderPath)).map((f) => f.id))
    setFiles((prev) => prev.filter((f) => !removedFileIds.has(f.id)))
    setFolders((prev) => prev.filter((f) => !isInside(f.path)))
    setOpenTabIds((prev) => prev.filter((id) => !removedFileIds.has(id)))
    if (activeFileId && removedFileIds.has(activeFileId)) {
      const remaining = openTabIds.filter((id) => !removedFileIds.has(id))
      setActiveFileId(remaining[0] || null)
    }
  }

  const renameFile = (fileId: string, newName: string) => {
    const err = validateName(newName); if (err) return addLog("error", err)
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f
        const finalName = newName.includes(".") ? newName : `${newName}.py`
        const newPath = joinPath(f.folderPath, finalName)
        return { ...f, filename: finalName, path: newPath, language: detectLanguage(finalName), lastModified: new Date() }
      }),
    )
  }

  const renameFolder = (folderId: string, newName: string) => {
    const err = validateName(newName); if (err) return addLog("error", err)
    const folder = folders.find((f) => f.id === folderId); if (!folder) return
    const trimmed = newName.trim()
    const newPath = joinPath(folder.parentPath, trimmed)
    if (folders.some((f) => f.id !== folderId && f.path === newPath))
      return addLog("error", `Folder ${newPath} already exists.`)
    const oldPrefix = folder.path
    const remap = (p: string) =>
      p === oldPrefix ? newPath : p.startsWith(oldPrefix + "/") ? newPath + p.slice(oldPrefix.length) : p

    setFolders((prev) => prev.map((f) => ({
      ...f, name: f.id === folderId ? trimmed : f.name,
      path: remap(f.path), parentPath: remap(f.parentPath),
    })))
    setFiles((prev) => prev.map((f) => ({ ...f, folderPath: remap(f.folderPath), path: remap(f.path) })))
    setExpandedFolders((prev) => {
      const next = new Set<string>(); prev.forEach((p) => next.add(remap(p))); return next
    })
  }

  const setEntryPoint = (fileId: string) => {
    setFiles((prev) => prev.map((f) => ({ ...f, isEntryPoint: f.id === fileId })))
    addLog("info", `Entry point set: ${files.find((f) => f.id === fileId)?.filename}`)
  }

  const updateFileContent = (fileId: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content, lastModified: new Date() } : f)))
  }

  const openFile = (fileId: string) => {
    setActiveFileId(fileId)
    setOpenTabIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]))
  }

  const closeTab = (fileId: string) => {
    setOpenTabIds((prev) => {
      const next = prev.filter((id) => id !== fileId)
      if (activeFileId === fileId) setActiveFileId(next[next.length - 1] || null)
      return next
    })
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path); else next.add(path)
      return next
    })
  }

  // ─── Resize handlers ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!resizing.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (resizing.current === "question") {
        const w = Math.max(220, Math.min(640, e.clientX - rect.left))
        setQuestionWidth(w)
      } else if (resizing.current === "explorer") {
        const w = Math.max(160, Math.min(420, e.clientX - rect.left - questionWidth - 4))
        setExplorerWidth(w)
      } else if (resizing.current === "terminal") {
        const h = Math.max(80, Math.min(500, rect.bottom - e.clientY))
        setTerminalHeight(h)
      }
    }
    const handleUp = () => { resizing.current = null }
    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleUp)
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp) }
  }, [questionWidth])

  // Close context menu on outside click
  useEffect(() => {
    const close = () => setCtxMenu(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [])

  // ═════════════════════════════════════════════════════════════════════════════
  // Render: file tree node
  // ═════════════════════════════════════════════════════════════════════════════
  const renderTreeNode = (node: TreeNode, depth: number): React.ReactNode => {
    if (node.type === "folder") {
      const isOpen = expandedFolders.has(node.folder.path)
      const isActiveTarget = activeFolderPath === node.folder.path
      return (
        <div key={node.folder.id}>
          <div
            className={`flex items-center gap-1 px-2 py-1 text-xs cursor-pointer group ${
              isActiveTarget ? "bg-amber-50 text-amber-800" : "hover:bg-gray-100"
            }`}
            style={{
              paddingLeft: 8 + depth * 12,
              color: isActiveTarget ? "#92400e" : "#374151",
              fontFamily: FONT,
              borderLeft: isActiveTarget ? "2px solid #f59e0b" : "2px solid transparent",
            }}
            onClick={() => {
              setActiveFolderPath(node.folder.path)
              toggleFolder(node.folder.path)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              setActiveFolderPath(node.folder.path)
              setCtxMenu({ x: e.clientX, y: e.clientY, target: { type: "folder", id: node.folder.id } })
            }}
            title={`Path: ${node.folder.path}`}
          >
            {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            {isOpen ? <FolderOpen size={13} color="#d97706" /> : <Folder size={13} color="#d97706" />}
            {renamingId === node.folder.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => { if (renameValue.trim()) renameFolder(node.folder.id, renameValue); setRenamingId(null) }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { renameFolder(node.folder.id, renameValue); setRenamingId(null) }
                  if (e.key === "Escape") setRenamingId(null)
                }}
                className="bg-white text-gray-900 text-xs px-1 rounded outline-none border border-blue-500 flex-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{node.folder.name}</span>
            )}
          </div>
          {isOpen && node.children.map((c) => renderTreeNode(c, depth + 1))}
        </div>
      )
    }
    const isActive = activeFileId === node.file.id
    return (
      <div
        key={node.file.id}
        className={`flex items-center gap-1 px-2 py-1 text-xs cursor-pointer group ${
          isActive ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100 text-gray-700"
        }`}
        style={{ paddingLeft: 8 + depth * 12 + 12, fontFamily: FONT }}
        onClick={() => {
          setActiveFolderPath(node.file.folderPath)
          openFile(node.file.id)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          setActiveFolderPath(node.file.folderPath)
          setCtxMenu({ x: e.clientX, y: e.clientY, target: { type: "file", id: node.file.id } })
        }}
        title={`Path: ${node.file.path}`}
      >
        <FileCode size={12} color={node.file.language === "python" ? "#3776ab" : "#888"} />
        {renamingId === node.file.id ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => { if (renameValue.trim()) renameFile(node.file.id, renameValue); setRenamingId(null) }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { renameFile(node.file.id, renameValue); setRenamingId(null) }
              if (e.key === "Escape") setRenamingId(null)
            }}
            className="bg-white text-gray-900 text-xs px-1 rounded outline-none border border-blue-500 flex-1"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="flex-1 truncate">{node.file.filename}</span>
            {node.file.isEntryPoint && (
              <span className="text-[9px] px-1 py-0 rounded bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
                ENTRY
              </span>
            )}
          </>
        )}
      </div>
    )
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"
        onLoad={initPyodide}
        strategy="afterInteractive"
      />

      <div
        ref={containerRef}
        className="flex flex-col h-full w-full"
        style={{
          background: "#fff",
          color: "#111827",
          fontFamily: FONT,
          userSelect: resizing.current ? "none" : "auto",
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TOP CHROME — matches code-editor.tsx                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {exercise && (
          <div style={{ flexShrink: 0, borderBottom: `1px solid #e5e7eb` }}>
            {/* Row 1 — Back + Breadcrumb + Submit Exercise + Close */}
            <div style={{
              display: "flex", alignItems: "center",
              padding: "6px 12px", gap: 8,
              borderBottom: `1px solid #f0f0f0`,
              background: "#f8f9fa",
            }}>
              <button
                onClick={() => setShowBackConfirm(true)}
                title="Go back"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 26, height: 26, flexShrink: 0,
                  borderRadius: 6, border: `1px solid #d1d5db`,
                  background: "#fff", color: "#6b7280", cursor: "pointer",
                }}
              >
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ width: 1, height: 16, background: "#e5e7eb", flexShrink: 0 }} />

              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => setPendingNavLevel("course")}
                  style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                >
                  {courseName || "Course"}
                </button>
                {hierarchy.map((seg, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <ChevronRight style={{ width: 12, height: 12, color: "#c0c4cc", flexShrink: 0 }} />
                    <button
                      onClick={() => setPendingNavLevel("hierarchy")}
                      style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                    >
                      {seg}
                    </button>
                  </span>
                ))}
                {category && (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <ChevronRight style={{ width: 12, height: 12, color: "#c0c4cc", flexShrink: 0 }} />
                    <button
                      onClick={() => setPendingNavLevel("category")}
                      style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 500, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                    >
                      {category === "We_Do" ? "We Do" : category === "I_Do" ? "I Do" : category === "You_Do" ? "You Do" : category}
                    </button>
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <ChevronRight style={{ width: 12, height: 12, color: "#c0c4cc", flexShrink: 0 }} />
                  <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {exercise?.exerciseInformation?.exerciseName || "Exercise"}
                  </span>
                </span>
              </div>

              {/* Submit Exercise + Close */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                <button
                  onClick={submitExercise}
                  disabled={isSubmitting || isRunning}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 6, border: "none",
                    background: (isSubmitting || isRunning) ? "#6b7280" : "#10b981",
                    color: "white", fontSize: 13, fontWeight: 500,
                    cursor: (isSubmitting || isRunning) ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    opacity: (isSubmitting || isRunning) ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isSubmitting && !isRunning) e.currentTarget.style.background = "#059669" }}
                  onMouseLeave={(e) => { if (!isSubmitting && !isRunning) e.currentTarget.style.background = "#10b981" }}
                >
                  {isSubmitting
                    ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                    : <CheckCircle style={{ width: 14, height: 14 }} />}
                  Submit Exercise
                </button>

                <button
                  onClick={() => setShowBackConfirm(true)}
                  title="Close exercise"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 28, height: 28, flexShrink: 0,
                    borderRadius: 6, border: "1px solid #fca5a5",
                    background: "#fef2f2", color: "#dc2626", cursor: "pointer",
                  }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </div>
            </div>

            {/* Row 2 — Total marks badge + Details/Overview buttons + Timer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 14px", background: "#f9fafb", gap: 10, flexWrap: "wrap",
            }}>
              {/* Left — Difficulty jump dropdown + Total marks + Files badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {availableDifficulties.length > 0 && (
                  <>
                    <span style={{ fontSize: 11, color: "#6b7280", fontFamily: FONT, fontWeight: 400 }}>
                      Difficulty
                    </span>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <select
                        value={selectedDifficulty}
                        onChange={(e) => {
                          setSelectedDifficulty(e.target.value)
                          if (e.target.value !== "all") jumpToDifficulty(e.target.value)
                        }}
                        style={{
                          appearance: "none", WebkitAppearance: "none",
                          height: 28, padding: "0 28px 0 10px", borderRadius: 99,
                          border: `1px solid ${
                            selectedDifficulty === "easy" ? "#16a34a" :
                            selectedDifficulty === "medium" ? "#d97706" :
                            selectedDifficulty === "hard" ? "#dc2626" : "#d1d5db"
                          }`,
                          background: "#ffffff",
                          color: selectedDifficulty === "easy" ? "#16a34a" :
                            selectedDifficulty === "medium" ? "#d97706" :
                            selectedDifficulty === "hard" ? "#dc2626" : "#6b7280",
                          fontFamily: FONT, fontSize: 12, fontWeight: 500,
                          cursor: "pointer", outline: "none",
                          transition: "border-color 0.15s, color 0.15s",
                        }}
                      >
                        <option value="all">All difficulties</option>
                        {availableDifficulties.map((diff) => (
                          <option key={diff} value={diff}>
                            {diff.charAt(0).toUpperCase() + diff.slice(1)} ({difficultyMap[diff].count})
                          </option>
                        ))}
                      </select>
                      <svg
                        viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                        style={{
                          position: "absolute", right: 9, pointerEvents: "none",
                          width: 12, height: 12,
                          color: selectedDifficulty === "easy" ? "#16a34a" :
                            selectedDifficulty === "medium" ? "#d97706" :
                            selectedDifficulty === "hard" ? "#dc2626" : "#6b7280",
                        }}
                      >
                        <path d="M2 4l4 4 4-4" />
                      </svg>
                    </div>
                  </>
                )}
                {exData?.isGraded !== false && (() => {
                  const _ss = exData?.questionConfiguration?.programmingQuestionConfiguration?.scoreSettings
                  const _progCalc = _ss
                    ? _ss.scoreType === 'evenMarks' && _ss.evenMarks
                      ? _ss.evenMarks * (questions.length || 1)
                      : (['easy', 'medium', 'hard'] as const).reduce(
                          (s, d) => s + ((_ss.levelScoringConfiguration as any)?.[d]?.totalMarks || 0), 0
                        )
                    : 0
                  const tm =
                    exData?.exerciseInformation?.totalMarksProgramming ||
                    exData?.exerciseInformation?.totalMarks ||
                    exData?.exerciseInformation?.totalPoints ||
                    exData?.questionConfiguration?.mcqQuestionConfiguration?.mcqTotalMarks ||
                    _progCalc || 0
                  return (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                      background: '#dcfce7', color: '#15803d',
                      display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT, whiteSpace: 'nowrap' }}>
                      <Award style={{ width: 12, height: 12 }} />
                      Total marks: {tm}
                    </span>
                  )
                })()}
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 10px", borderRadius: 99, background: "#eff6ff" }}>
                  <FileCode style={{ width: 12, height: 12, color: "#2563eb" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#2563eb" }}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Center — Details + Overview */}
              <ExerciseInfoButtons
                onDetailsClick={() => setShowDetailsModal(true)}
                onOverviewClick={() => setShowOverviewModal(true)}
                isGraded={exData?.isGraded !== false}
                detailsActive={showDetailsModal}
                overviewActive={showOverviewModal}
              />

              {/* Right — Timer */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {exerciseTimeLeft !== null && (exData?.exerciseInformation?.totalDuration || 0) > 0 && (() => {
                  const totalSecs = (exData?.exerciseInformation?.totalDuration || 0) * 60
                  const pct = totalSecs > 0 ? Math.max(0, (exerciseTimeLeft / totalSecs) * 100) : 0
                  const isDanger = exerciseTimeLeft < 60
                  const isWarning = exerciseTimeLeft < 300 && !isDanger
                  const tcol = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#F27757'
                  return (
                    <div style={{ minWidth: 130 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock style={{ width: 12, height: 12, color: tcol }} />
                          <span style={{ fontSize: 11, color: '#9b9bae', fontWeight: 600, fontFamily: FONT }}>Time Left</span>
                        </div>
                        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 800, color: tcol, animation: isDanger ? 'pulse 1s ease-in-out infinite' : 'none' }}>
                          {formatExerciseTime(exerciseTimeLeft)}
                        </span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: '#f4f4f7', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: tcol, borderRadius: 99, transition: 'width 1s linear' }} />
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Row 3 — Sidebar toggle + Prev/Next problem navigation */}
            <div
              className="flex items-center justify-between p-2.5 border-b"
              style={{ background: "#fff", borderColor: "#e5e7eb" }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="flex items-center justify-center w-7 h-7 rounded transition-colors hover:bg-gray-200 text-gray-700"
                  title={showSidebar ? "Hide problems list" : "Show problems list"}
                >
                  {showSidebar ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>

                {questions.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={goPrev}
                      disabled={currentQuestionIndex === 0}
                      className="px-2.5 h-7 flex items-center justify-center gap-1 border rounded text-xs font-medium transition-colors border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Previous Problem"
                    >
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </button>
                    <span className="text-xs font-semibold min-w-[40px] text-center text-emerald-600">
                      {currentQuestionIndex + 1}/{questions.length}
                    </span>
                    <button
                      onClick={goNext}
                      disabled={currentQuestionIndex === questions.length - 1}
                      className="px-2.5 h-7 flex items-center justify-center gap-1 border rounded text-xs font-medium transition-colors border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 disabled:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Next Problem"
                    >
                      Next <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99,
                  background: "#f3f4f6", color: "#4b5563",
                  fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap",
                }}>
                  python
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MAIN BODY                                                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ─── Problems Sidebar ─────────────────────────────────────── */}
          {showSidebar && (
            <div
              className="w-80 border-r overflow-hidden flex flex-col flex-shrink-0"
              style={{ borderColor: "#e5e7eb", background: "#fff" }}
            >
              <div className="p-3 border-b" style={{ borderColor: "#e5e7eb" }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Problems ({getFilteredAndSortedQuestions().length}/{questions.length})
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowSearch(!showSearch)}
                      className={`p-1 ml-1 rounded transition-colors ${
                        showSearch ? "bg-blue-500" : "hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      {showSearch
                        ? <XIcon className="w-3.5 h-3.5 text-white" />
                        : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {showSearch && (
                  <div className="relative mb-3">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search problems..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-6 py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-500"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2"
                      >
                        <XIcon className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                )}

                {/* Filter and Sort */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <select
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value as any)}
                      className="w-full text-xs border rounded px-2 py-1.5 bg-white border-gray-300 text-gray-900"
                    >
                      <option value="all">All Difficulties</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <button
                    onClick={cycleSortOption}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded transition-colors border-gray-300 hover:bg-gray-100"
                    title={`Sort by: ${sortBy === "default" ? "Default Order" : sortBy === "difficulty" ? "Difficulty" : "Title"}. Click to change.`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-600" />
                    <span className="font-medium text-gray-600">
                      {sortBy === "default" ? "Default" : sortBy === "difficulty" ? "Difficulty" : "Title"}
                    </span>
                  </button>
                </div>

                <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
                  <span>
                    {filterDifficulty !== "all"
                      ? `Filtered: ${filterDifficulty.charAt(0).toUpperCase() + filterDifficulty.slice(1)}`
                      : "Showing all difficulties"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Sort:</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100">{getSortIcon()}</span>
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {getFilteredAndSortedQuestions().length === 0 ? (
                  <div className="p-4 text-center">
                    <div className="text-sm text-gray-400">
                      No problems found
                      {filterDifficulty !== "all" && ` for "${filterDifficulty}" difficulty`}
                      {searchQuery && ` matching "${searchQuery}"`}
                    </div>
                  </div>
                ) : (
                  getFilteredAndSortedQuestions().map((q: any) => {
                    const originalIndex = q._originalIndex
                    const isActive = currentQuestionIndex === originalIndex
                    const diff = (q.difficulty || "").toLowerCase()
                    const isGraded = exercise?.isGraded !== false
                    const qMarks = q?.score ?? q?.points ?? null
                    return (
                      <button
                        key={originalIndex}
                        onClick={() => selectQuestion(originalIndex)}
                        className={`w-full p-3 text-left transition-colors border-b border-gray-100 ${
                          isActive ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium truncate flex-1 text-gray-900">
                            {originalIndex + 1}. {q.title || `Question ${originalIndex + 1}`}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            {diff && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                diff === "easy" ? "bg-green-100 text-green-800"
                                : diff === "medium" ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                              }`}>
                                {diff.charAt(0).toUpperCase() + diff.slice(1)}
                              </span>
                            )}
                            {isGraded && qMarks != null && (
                              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "#dcfce7", color: "#15803d", fontWeight: 600, whiteSpace: "nowrap" }}>
                                {qMarks} {qMarks === 1 ? "mark" : "marks"}
                              </span>
                            )}
                            {solvedQuestions.has(originalIndex) && (
                              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "#dcfce7", color: "#166534", fontWeight: 600, border: "1px solid #86efac", whiteSpace: "nowrap" }}>
                                Submitted
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Question Panel */}
          <div
            className="flex flex-col flex-shrink-0 overflow-hidden border-r"
            style={{ width: questionWidth, background: "#fff", borderColor: "#e5e7eb" }}
          >
            <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "#e5e7eb", background: "#f8f9fa" }}>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Problem</div>
              <span className="text-[10px] text-gray-500 font-mono">
                Q {currentQuestionIndex + 1}/{questions.length || 1}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed text-gray-800">
              <h2 className="text-sm font-bold mb-2 text-gray-900">
                {currentQuestion?.title || exercise?.exerciseInformation?.exerciseName || "Exercise"}
              </h2>
              {currentQuestion?.difficulty && (
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded mb-3 font-semibold ${
                  currentQuestion.difficulty === "easy" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  currentQuestion.difficulty === "medium" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
              )}
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{
                  __html: getQuestionHtml(currentQuestion) ||
                    exercise?.exerciseInformation?.description ||
                    "<p>Solve the problem below using multiple Python files.</p>",
                }}
              />
              {currentQuestion?.sampleInput && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 font-semibold">Sample Input</div>
                  <pre className="bg-gray-50 border border-gray-200 p-2 rounded text-[11px] overflow-x-auto">{currentQuestion.sampleInput}</pre>
                </div>
              )}
              {currentQuestion?.sampleOutput && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 font-semibold">Sample Output</div>
                  <pre className="bg-gray-50 border border-gray-200 p-2 rounded text-[11px] overflow-x-auto">{currentQuestion.sampleOutput}</pre>
                </div>
              )}
              {currentQuestion?.constraints?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1 font-semibold">Constraints</div>
                  <ul className="list-disc pl-4 text-[11px]">
                    {currentQuestion.constraints.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Question/Explorer resize handle */}
          <div
            onMouseDown={() => { resizing.current = "question" }}
            className="w-1 cursor-col-resize hover:bg-blue-400 transition-colors flex-shrink-0"
            style={{ background: "#e5e7eb" }}
          />

          {/* VS-Code-like activity bar (explorer toggle) */}
          <div
            className="flex flex-col items-center py-2 flex-shrink-0 border-r"
            style={{ width: 40, background: "#f3f4f6", borderColor: "#e5e7eb" }}
          >
            <button
              onClick={() => setShowExplorer((v) => !v)}
              title={showExplorer ? "Hide Explorer" : "Show Explorer"}
              className={`p-2 rounded ${
                showExplorer ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-200"
              }`}
              style={{ borderLeft: showExplorer ? "2px solid #2563eb" : "2px solid transparent" }}
            >
              <Files size={18} />
            </button>
          </div>

          {/* File Explorer */}
          {showExplorer && (
            <>
              <div
                className="flex flex-col flex-shrink-0 overflow-hidden border-r"
                style={{ width: explorerWidth, background: "#fafafa", borderColor: "#e5e7eb" }}
              >
                <div
                  className="px-3 py-2 border-b flex items-center justify-between"
                  style={{ borderColor: "#e5e7eb", background: "#f3f4f6" }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    Explorer
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      title={`New File in ${activeFolderPath === "/" ? "root" : activeFolderPath}`}
                      onClick={() => { setCreateMode({ type: "file", parentPath: activeFolderPath }); setCreateName("") }}
                      className="p-1 rounded text-gray-500 hover:bg-gray-200"
                    >
                      <FilePlus size={12} />
                    </button>
                    <button
                      title={`New Folder in ${activeFolderPath === "/" ? "root" : activeFolderPath}`}
                      onClick={() => { setCreateMode({ type: "folder", parentPath: activeFolderPath }); setCreateName("") }}
                      className="p-1 rounded text-gray-500 hover:bg-gray-200"
                    >
                      <FolderPlus size={12} />
                    </button>
                  </div>
                </div>

                {/* Active-folder context strip — shows where new items go */}
                <div
                  className="px-3 py-1 border-b flex items-center justify-between gap-2 text-[10px]"
                  style={{ background: activeFolderPath === "/" ? "#fafafa" : "#fff7ed", borderColor: "#e5e7eb" }}
                >
                  <div className="flex items-center gap-1 truncate" title={activeFolderPath}>
                    <span className="text-gray-500">Creating in:</span>
                    <span className="font-semibold truncate" style={{ color: activeFolderPath === "/" ? "#6b7280" : "#92400e" }}>
                      {activeFolderPath === "/" ? "/ (root)" : activeFolderPath}
                    </span>
                  </div>
                  {activeFolderPath !== "/" && (
                    <button
                      onClick={() => setActiveFolderPath("/")}
                      className="px-1.5 py-0.5 rounded hover:bg-gray-200 text-gray-600 text-[10px] font-medium flex-shrink-0"
                      title="Reset target to root"
                    >
                      ↑ Root
                    </button>
                  )}
                </div>

                <div
                  className="flex-1 overflow-y-auto py-1"
                  onClick={(e) => {
                    // Click on empty area resets to root
                    if (e.target === e.currentTarget) setActiveFolderPath("/")
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setActiveFolderPath("/")
                    setCtxMenu({ x: e.clientX, y: e.clientY, target: { type: "root" } })
                  }}
                >
                  {tree.length === 0 ? (
                    <div className="text-[11px] text-gray-500 px-3 py-2">No files yet. Click + to add one.</div>
                  ) : (
                    tree.map((n) => renderTreeNode(n, 0))
                  )}
                </div>
              </div>
              <div
                onMouseDown={() => { resizing.current = "explorer" }}
                className="w-1 cursor-col-resize hover:bg-blue-400 transition-colors flex-shrink-0"
                style={{ background: "#e5e7eb" }}
              />
            </>
          )}

          {/* Editor + Terminal */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Tabs + Run button */}
            <div
              className="flex items-center justify-between flex-shrink-0 border-b"
              style={{ background: "#f3f4f6", borderColor: "#e5e7eb", minHeight: 34 }}
            >
              <div className="flex items-center overflow-x-auto flex-1">
                {openTabs.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-gray-500">No file open</div>
                ) : (
                  openTabs.map((tab) => (
                    <div
                      key={tab.id}
                      onClick={() => setActiveFileId(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer border-r flex-shrink-0 ${
                        tab.id === activeFileId ? "bg-white text-gray-900" : "text-gray-600 hover:bg-gray-200"
                      }`}
                      style={{ borderColor: "#e5e7eb" }}
                    >
                      <FileCode size={11} color={tab.language === "python" ? "#3776ab" : "#888"} />
                      <span>{tab.filename}</span>
                      {tab.isEntryPoint && (
                        <span className="text-[8px] px-1 rounded bg-blue-100 text-blue-700 font-semibold">ENTRY</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                        className="ml-1 p-0.5 rounded hover:bg-gray-300"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-1 pr-2">
                <button
                  onClick={runCode}
                  disabled={!pyodideReady || isRunning}
                  className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: !pyodideReady || isRunning ? "#9ca3af" : "#3b82f6" }}
                >
                  {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  {!pyodideReady ? "Loading…" : isRunning ? "Running" : "Run"}
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 min-h-0 overflow-hidden" style={{ background: "#fff" }}>
              {activeFile ? (
                <MonacoEditor
                  key={activeFile.id}
                  height="100%"
                  language={activeFile.language}
                  theme={isDark ? "vs-dark" : "vs-light"}
                  value={activeFile.content}
                  onChange={(val) => updateFileContent(activeFile.id, val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: 'ui-monospace, "Fira Code", Consolas, monospace',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    tabSize: 4,
                    insertSpaces: true,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  Select or create a file to start editing.
                </div>
              )}
            </div>

            {/* Terminal resize handle */}
            <div
              onMouseDown={() => { resizing.current = "terminal" }}
              className="h-1 cursor-row-resize hover:bg-blue-400 transition-colors flex-shrink-0"
              style={{ background: "#e5e7eb" }}
            />

            {/* Terminal */}
            <div
              className="flex flex-col flex-shrink-0 overflow-hidden"
              style={{ height: terminalHeight, background: "#fff" }}
            >
              <div className="flex items-center justify-between px-3 py-1 border-b" style={{ background: "#f3f4f6", borderColor: "#e5e7eb" }}>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-gray-600">
                  <TerminalIcon size={11} />
                  Output
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={submitQuestion}
                    disabled={isRunning || isSubmittingQuestion || isSubmitting}
                    title="Save this question's files (does not close the exercise)"
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      height: 26, padding: "0 12px",
                      fontSize: 11, fontFamily: FONT, fontWeight: 600,
                      borderRadius: 6, border: "none",
                      background: (isRunning || isSubmittingQuestion || isSubmitting) ? "#9ca3af" : "#22c55e",
                      color: "#fff",
                      cursor: (isRunning || isSubmittingQuestion || isSubmitting) ? "not-allowed" : "pointer",
                      opacity: (isRunning || isSubmittingQuestion || isSubmitting) ? 0.7 : 1,
                    }}
                  >
                    {isSubmittingQuestion
                      ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />
                      : <CheckCircle style={{ width: 12, height: 12 }} />}
                    Submit Question
                  </button>
                  <button
                    onClick={clearTerminal}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                    title="Clear console"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 font-mono text-[12px] leading-relaxed" style={{ background: "#fafafa" }}>
                {terminalLogs.length === 0 ? (
                  <span className="text-gray-400 italic text-[11px]">Click Run to execute your program…</span>
                ) : (
                  terminalLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        color: log.kind === "stderr" || log.kind === "error" ? "#dc2626"
                          : log.kind === "success" ? "#15803d"
                          : log.kind === "system" || log.kind === "info" ? "#2563eb"
                          : "#374151",
                        whiteSpace: "pre-wrap", wordBreak: "break-word",
                      }}
                    >
                      {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODALS                                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {/* Back confirmation */}
        {showBackConfirm && (
          <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", border: "1px solid #e5e7eb" }}>
              <p style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Leave Exercise?</p>
              <p style={{ fontFamily: FONT, fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
                Your code is saved, but unsaved progress may be lost. Where would you like to go?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => { setShowBackConfirm(false); onNavigateToBreadcrumb?.("category") }} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", textAlign: "left" }}>
                  Back to {category === "We_Do" ? "We Do" : category === "I_Do" ? "I Do" : category === "You_Do" ? "You Do" : "exercise list"}
                </button>
                {hierarchy.length > 0 && (
                  <button onClick={() => { setShowBackConfirm(false); onNavigateToBreadcrumb?.("hierarchy") }} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "none", color: "#374151", cursor: "pointer", textAlign: "left" }}>
                    Back to {hierarchy.slice(-1)[0] || "Topic"}
                  </button>
                )}
                <button onClick={() => { setShowBackConfirm(false); onNavigateToBreadcrumb?.("course") }} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "none", color: "#374151", cursor: "pointer", textAlign: "left" }}>
                  Back to {courseName || "Course"}
                </button>
                <button onClick={() => setShowBackConfirm(false)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 8, border: "none", background: "none", color: "#9ca3af", cursor: "pointer" }}>
                  Stay in Exercise
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Breadcrumb leave-confirm */}
        {pendingNavLevel !== null && (
          <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", borderRadius: 12, padding: "28px 32px", width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", border: "1px solid #e5e7eb" }}>
              <p style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Leave Exercise?</p>
              <p style={{ fontFamily: FONT, fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
                Your progress may not be saved if you leave now.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => setPendingNavLevel(null)} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, padding: "11px 16px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", cursor: "pointer", textAlign: "center" }}>
                  Stay in Exercise
                </button>
                <button onClick={() => { onNavigateToBreadcrumb?.(pendingNavLevel); setPendingNavLevel(null) }} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "none", color: "#6b7280", cursor: "pointer", textAlign: "center" }}>
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exercise Details + Overview Modals */}
        {exData && (
          <ExerciseInfoModals
            exercise={exData}
            showDetailsModal={showDetailsModal}
            setShowDetailsModal={setShowDetailsModal}
            showOverviewModal={showOverviewModal}
            setShowOverviewModal={setShowOverviewModal}
            solvedQuestions={solvedQuestions}
          />
        )}

        {false && showDetailsModal && exercise && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,15,30,0.45)", backdropFilter: "blur(2px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDetailsModal(false) }}
          >
            <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 20px 56px rgba(0,0,0,0.20)", width: 360, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1.5px solid #e4e4ed", fontFamily: FONT }}>
              <div style={{ padding: "13px 16px", borderBottom: "1.5px solid #e4e4ed", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f7f7fb", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <FileText size={14} style={{ color: "#3a3a52" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Exercise Details</span>
                </div>
                <button onClick={() => setShowDetailsModal(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#9a9ab0", display: "flex", padding: 4, borderRadius: 6 }}>
                  <X size={15} />
                </button>
              </div>
              <div className="modal-dark-scroll" style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
                {[
                  ["Exercise Name", exercise.exerciseInformation?.exerciseName],
                  ["Level", exercise.exerciseInformation?.exerciseLevel ? exercise.exerciseInformation.exerciseLevel.charAt(0).toUpperCase() + exercise.exerciseInformation.exerciseLevel.slice(1) : null],
                  ["Duration", exercise.exerciseInformation?.totalDuration != null ? `${exercise.exerciseInformation.totalDuration} min` : null],
                  ["Total Marks", exercise.exerciseInformation?.totalMarksProgramming ?? exercise.exerciseInformation?.totalMarks ?? exercise.exerciseInformation?.totalPoints ?? null],
                  ["Questions", exercise.questions?.length ?? 0],
                  ["Exercise Type", exercise.exerciseType],
                  ["File Mode", "Multiple Files"],
                  ["Languages", exercise.programmingSettings?.selectedLanguages?.length > 0 ? exercise.programmingSettings.selectedLanguages.map((l: string) => l.charAt(0).toUpperCase() + l.slice(1)).join(", ") : null],
                  ["From", exercise.availabilityPeriod?.startDate ? new Date(exercise.availabilityPeriod.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null],
                  ["Until", exercise.availabilityPeriod?.endDate ? new Date(exercise.availabilityPeriod.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null],
                ].filter(([_, v]) => v != null && v !== "").map(([label, value], i, arr) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 16px", borderBottom: i < arr.length - 1 ? "1px solid #f0f0f7" : "none" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#3a3a52" }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: label === "Exercise Name" ? "#F27757" : "#1a1a2e", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textTransform: label === "Level" || label === "Exercise Type" ? "capitalize" : "none" }}>
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "10px 16px", borderTop: "1.5px solid #e4e4ed", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                <button onClick={() => setShowDetailsModal(false)} style={{ padding: "6px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, border: "1.5px solid #e4e4ed", background: "#f7f7fb", color: "#3a3a52", cursor: "pointer" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question and Marks Overview Modal — matches code-editor.tsx */}
        {false && showOverviewModal && exercise && (() => {
          const configuredDiffs = (["easy", "medium", "hard"] as const).filter((d) => difficultyMap[d])
          const totalSlotsAll = configuredDiffs.length > 0
            ? configuredDiffs.reduce((s, d) => s + (difficultyMap[d]?.count ?? 0), 0)
            : questions.length
          const solvedAll = solvedQuestions.size
          const remainingAll = Math.max(0, totalSlotsAll - solvedAll)
          const totalMarksAll =
            exercise.exerciseInformation?.totalMarksProgramming ??
            exercise.exerciseInformation?.totalMarks ??
            exercise.exerciseInformation?.totalPoints ?? 0
          const qConfig = exercise.questionConfiguration?.programmingQuestionConfiguration
          const ss = qConfig?.scoreSettings
          const isGeneral = !configuredDiffs.length || qConfig?.questionConfigType === "general"

          return (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,15,30,0.45)", backdropFilter: "blur(2px)" }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowOverviewModal(false) }}
            >
              <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 20px 56px rgba(0,0,0,0.20)", width: 400, maxHeight: "86vh", display: "flex", flexDirection: "column", overflow: "hidden", border: "1.5px solid #e4e4ed", fontFamily: FONT }}>
                <div style={{ padding: "13px 16px", borderBottom: "1.5px solid #e4e4ed", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#eff6ff", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <BarChart3 size={14} style={{ color: "#2563eb" }} />
                    <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Question and Marks details</span>
                  </div>
                  <button type="button" onClick={() => setShowOverviewModal(false)} style={{ border: "none", background: "none", cursor: "pointer", color: "#9a9ab0", display: "flex", padding: 4, borderRadius: 6 }}>
                    <X size={15} />
                  </button>
                </div>

                <div className="modal-dark-scroll" style={{ flex: 1, overflowY: "auto" }}>
                  {/* Overall Questions */}
                  <div style={{ padding: "12px 16px", borderBottom: "1.5px solid #e4e4ed" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#F27757", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: FONT }}>Overall Questions</span>
                    </div>
                    {[
                      { label: "Total Questions", value: totalSlotsAll, denom: undefined as number | undefined, color: "#1a1a2e" },
                      { label: "Solved", value: solvedAll, denom: totalSlotsAll, color: "#7c3aed" },
                      { label: "Remaining", value: remainingAll, denom: undefined as number | undefined, color: remainingAll === 0 ? "#16a34a" : "#d97706" },
                    ].map(({ label, value, denom, color }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#3a3a52", fontFamily: FONT }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: FONT }}>
                          {value}{denom != null ? <span style={{ color: "#9a9ab0", fontWeight: 400, fontSize: 10 }}>/{denom}</span> : ""}
                        </span>
                      </div>
                    ))}
                    {totalSlotsAll > 0 && (
                      <div style={{ height: 6, background: "#f0f0f7", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
                        <div style={{ height: "100%", borderRadius: 3, background: remainingAll === 0 ? "#16a34a" : "#F27757", width: `${Math.min(100, (solvedAll / totalSlotsAll) * 100)}%`, transition: "width 0.4s" }} />
                      </div>
                    )}
                    {!isGeneral && configuredDiffs.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
                        {configuredDiffs.map((d) => {
                          const count = difficultyMap[d]?.count ?? 0
                          const solvedD = [...solvedQuestions].filter((idx) => (questions[idx]?.difficulty || "").toLowerCase() === d).length
                          const rem = count - solvedD
                          const diffColor = d === "easy" ? "#16a34a" : d === "medium" ? "#d97706" : "#e53e3e"
                          return (
                            <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, borderLeft: `2px solid ${diffColor}`, marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: diffColor, textTransform: "capitalize", fontFamily: FONT }}>{d}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT }}>
                                <span style={{ color: "#7c3aed" }}>{solvedD}</span>
                                <span style={{ color: "#9a9ab0", fontWeight: 400 }}>/{count}</span>
                                <span style={{ color: rem <= 0 ? "#16a34a" : "#9a9ab0", fontSize: 10, marginLeft: 6, fontWeight: 500 }}>{rem <= 0 ? "✓" : `${rem} left`}</span>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Overall Marks */}
                  {totalMarksAll > 0 && (
                    <div style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <Award size={12} style={{ color: "#7c3aed" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: FONT }}>Overall Marks</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#3a3a52", fontFamily: FONT }}>Total Marks</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", fontFamily: FONT }}>{totalMarksAll}</span>
                      </div>
                      {!isGeneral && configuredDiffs.length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
                          {configuredDiffs.map((d) => {
                            const lsc = ss?.levelScoringConfiguration?.[d]
                            const count = difficultyMap[d]?.count ?? 0
                            const perQ = lsc?.marksPerQuestion ?? ss?.evenMarks ?? null
                            const total = lsc?.totalMarks ?? (perQ != null ? perQ * count : null)
                            const diffColor = d === "easy" ? "#16a34a" : d === "medium" ? "#d97706" : "#e53e3e"
                            return (
                              <div key={d} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, borderLeft: `2px solid ${diffColor}`, marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: diffColor, textTransform: "capitalize", fontFamily: FONT }}>{d}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT, color: "#1a1a2e" }}>
                                  {total != null ? `${total} marks` : "—"}
                                  {perQ != null && <span style={{ color: "#9a9ab0", fontSize: 10, marginLeft: 6 }}>{perQ}/q</span>}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {ss?.scoreType === "evenMarks" && ss.evenMarks != null && (
                        <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "#eff6ff", border: "1.5px solid #bfdbfe" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600, fontFamily: FONT }}>Marks per question</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#1e40af", fontFamily: FONT }}>{ss.evenMarks}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ padding: "10px 16px", borderTop: "1.5px solid #e4e4ed", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                  <button type="button" onClick={() => setShowOverviewModal(false)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 16px", borderRadius: 10, fontFamily: FONT, fontSize: 12, fontWeight: 600, border: "1.5px solid #e4e4ed", background: "#f7f7fb", color: "#3a3a52", cursor: "pointer" }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Create file/folder modal */}
        {createMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreateMode(null)}>
            <div className="bg-white border border-gray-200 rounded-lg p-4 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="text-sm font-semibold mb-1 text-gray-900">
                New {createMode.type === "file" ? "File" : "Folder"}
              </div>
              <div className="mb-3 px-2.5 py-1.5 rounded text-[11px] flex items-center gap-1.5" style={{ background: "#fff7ed", color: "#92400e", border: "1px solid #fed7aa" }}>
                <Folder size={11} />
                <span>Location:</span>
                <span className="font-mono font-semibold">{createMode.parentPath === "/" ? "/ (root)" : createMode.parentPath}</span>
              </div>
              <input
                autoFocus
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={createMode.type === "file" ? "filename.py" : "folder-name"}
                className="w-full bg-white text-gray-900 text-sm px-3 py-2 rounded border border-gray-300 focus:border-blue-500 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && createName.trim()) {
                    if (createMode.type === "file") createFile(createMode.parentPath, createName.trim())
                    else createFolder(createMode.parentPath, createName.trim())
                    setCreateMode(null); setCreateName("")
                  }
                  if (e.key === "Escape") { setCreateMode(null); setCreateName("") }
                }}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => { setCreateMode(null); setCreateName("") }} className="px-3 py-1 text-xs rounded text-gray-600 hover:bg-gray-100">Cancel</button>
                <button
                  onClick={() => {
                    if (!createName.trim()) return
                    if (createMode.type === "file") createFile(createMode.parentPath, createName.trim())
                    else createFolder(createMode.parentPath, createName.trim())
                    setCreateMode(null); setCreateName("")
                  }}
                  className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {ctxMenu && (
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded shadow-xl py-1 min-w-[180px] text-xs"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {ctxMenu.target.type === "root" && (
              <>
                <button className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 flex items-center gap-2" onClick={() => { setCreateMode({ type: "file", parentPath: "/" }); setCreateName(""); setCtxMenu(null) }}>
                  <FilePlus size={12} /> New File
                </button>
                <button className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 flex items-center gap-2" onClick={() => { setCreateMode({ type: "folder", parentPath: "/" }); setCreateName(""); setCtxMenu(null) }}>
                  <FolderPlus size={12} /> New Folder
                </button>
              </>
            )}
            {ctxMenu.target.type === "folder" && (() => {
              const folder = folders.find((f) => f.id === (ctxMenu.target as any).id)
              if (!folder) return null
              return (
                <>
                  <button className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 flex items-center gap-2" onClick={() => { setCreateMode({ type: "file", parentPath: folder.path }); setCreateName(""); setCtxMenu(null) }}>
                    <FilePlus size={12} /> New File
                  </button>
                  <button className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 flex items-center gap-2" onClick={() => { setCreateMode({ type: "folder", parentPath: folder.path }); setCreateName(""); setCtxMenu(null) }}>
                    <FolderPlus size={12} /> New Folder
                  </button>
                  <div className="h-px bg-gray-200 my-1" />
                  <button className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 flex items-center gap-2" onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name); setCtxMenu(null) }}>
                    <Edit3 size={12} /> Rename
                  </button>
                  <button className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2" onClick={() => { deleteFolder(folder.id); setCtxMenu(null) }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              )
            })()}
            {ctxMenu.target.type === "file" && (() => {
              const file = files.find((f) => f.id === (ctxMenu.target as any).id)
              if (!file) return null
              return (
                <>
                  <button className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 flex items-center gap-2" onClick={() => { setEntryPoint(file.id); setCtxMenu(null) }}>
                    <Trophy size={12} /> {file.isEntryPoint ? "Entry point ✓" : "Set as entry point"}
                  </button>
                  <div className="h-px bg-gray-200 my-1" />
                  <button className="w-full text-left px-3 py-1.5 hover:bg-gray-100 text-gray-700 flex items-center gap-2" onClick={() => { setRenamingId(file.id); setRenameValue(file.filename); setCtxMenu(null) }}>
                    <Edit3 size={12} /> Rename
                  </button>
                  <button className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2" onClick={() => { deleteFile(file.id); setCtxMenu(null) }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              )
            })()}
          </div>
        )}

        <style>{`
          .modal-dark-scroll { scrollbar-width: thin; scrollbar-color: #4b5563 #1f2937; }
          .modal-dark-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
          .modal-dark-scroll::-webkit-scrollbar-track { background: #1f2937; border-radius: 4px; }
          .modal-dark-scroll::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
          .modal-dark-scroll::-webkit-scrollbar-thumb:hover { background: #6b7280; }
        `}</style>
      </div>
    </>
  )
}
